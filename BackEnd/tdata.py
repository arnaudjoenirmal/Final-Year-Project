"""
generate_dataset_from_file.py
-------------------------------------
Automatically builds a VAD dataset from an uploaded CSV/TXT file.
Each entry: text, cleaned_tamil, valence, arousal, dominance, depression_type
-------------------------------------
"""

import os
import csv
import pandas as pd
from datetime import datetime
import numpy as np

from tamil_pipeline import clean_tamil_pipeline
from vad import analyze_vad_text   # or aggregate_vad depending on your setup



# 🔹 CONFIGURATION
# Remove the global OUTPUT_FILE definition


# 🔹 Depression Type Inference (Rule-Based)
def infer_depression_type(valence, arousal, dominance, stats):
    """Adaptive thresholding based on dataset statistics."""
    val_m, aro_m, dom_m = stats["mean"]
    val_s, aro_s, dom_s = stats["std"]

    v_z = (valence - val_m) / (val_s if val_s else 1)
    a_z = (arousal - aro_m) / (aro_s if aro_s else 1)
    d_z = (dominance - dom_m) / (dom_s if dom_s else 1)

    # Relative-deviation-based classification
    if v_z < -0.7 and a_z > 0.3 and d_z < -0.3:
        return "Melancholic"
    elif v_z < -0.7 and a_z < -0.3 and d_z > 0.3:
        return "Atypical"
    elif v_z < -1.0 and a_z > 0.6 and d_z > 0.6:
        return "Psychotic"
    elif abs(v_z) < 0.3 and abs(a_z) < 0.3 and abs(d_z) < 0.3:
        return "Stable/Neutral"
    else:
        return "Situational"



# 🔹 Main Builder
def build_vad_dataset_from_file(file_path: str):
    os.makedirs("datasets", exist_ok=True)
    rows = []
    
    # Generate unique output filename based on input file
    input_basename = os.path.splitext(os.path.basename(file_path))[0]
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    output_file = f"vad_{input_basename}_{timestamp}.csv"

    # Step 1️⃣ Read the uploaded file
    if file_path.endswith(".csv"):
        try:
            # Try reading with proper CSV handling - use quoting to handle commas in text
            df = pd.read_csv(
                file_path,
                encoding='utf-8',
                engine='python',
                quotechar='"',
                escapechar='\\',
                doublequote=True
            )
            if 'body' in df.columns:
                texts = df['body'].dropna().astype(str).tolist()
            else:
                # Revert to column 0 if 'body' not found
                texts = df.iloc[:, 0].dropna().astype(str).tolist()
        except Exception as e:
            print(f"⚠️ CSV parsing failed with pandas: {e}")
            print("📝 Attempting manual CSV parsing with proper quoting...")
            # Fallback: manual CSV reading with QUOTE_ALL to handle embedded commas
            texts = []
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                csv_reader = csv.reader(
                    f, 
                    quotechar='"',
                    delimiter=',',
                    quoting=csv.QUOTE_ALL,
                    skipinitialspace=True
                )
                headers = next(csv_reader, None)  # Skip header if present
                
                # Find 'body' column index if headers exist
                body_idx = 0
                if headers and 'body' in headers:
                    body_idx = headers.index('body')
                
                for line_num, row in enumerate(csv_reader, start=2):
                    try:
                        if row and len(row) > body_idx:
                            text = row[body_idx].strip()
                            if len(text) > 10:
                                texts.append(text)
                    except Exception as row_error:
                        print(f"⚠️ Error on line {line_num}: {row_error}")
                        print(f"   Row content: {row}")
                        continue
    else:
        # Read plain text file, ignoring very short lines
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            texts = [line.strip() for line in f if len(line.strip()) > 10]

    print(f"\n{'='*60}")
    print(f"📄 Processing: {file_path}")
    print(f"📄 Total entries to process: {len(texts)}")
    print(f"{'='*60}")

    # Step 2️⃣ First pass: collect VAD scores to compute statistics
    vad_data = []
    for i, text in enumerate(texts, 1):
        print(f"\n⚙️ Processing {i}/{len(texts)}")

        try:
            # Clean + transliterate
            tamil_text, meta = clean_tamil_pipeline(text, debug=False)
            utterances = meta.get("utterances", [tamil_text])

            vad_entries = []
            for utt in utterances:
                result = analyze_vad_text(utt)
                if result and all(k in result for k in ["valence", "arousal", "dominance"]):
                    vad_entries.append(result)

            if not vad_entries:
                continue

            avg_valence = sum(v["valence"] for v in vad_entries) / len(vad_entries)
            avg_arousal = sum(v["arousal"] for v in vad_entries) / len(vad_entries)
            avg_dominance = sum(v["dominance"] for v in vad_entries) / len(vad_entries)

            vad_data.append({
                "original_text": text,
                "cleaned_tamil": tamil_text,
                "valence": round(avg_valence, 3),
                "arousal": round(avg_arousal, 3),
                "dominance": round(avg_dominance, 3),
                "utterance_count": len(utterances)
            })

        except Exception as e:
            print(f"❌ Error processing entry {i}: {e}")
            import traceback
            traceback.print_exc()

    if not vad_data:
        print("\n⚠️ No valid data processed.")
        return

    # Step 3️⃣ Compute statistics
    valences = [item["valence"] for item in vad_data]
    arousals = [item["arousal"] for item in vad_data]
    dominances = [item["dominance"] for item in vad_data]

    stats = {
        "mean": (np.mean(valences), np.mean(arousals), np.mean(dominances)),
        "std": (np.std(valences) if np.std(valences) > 0 else 1, 
                np.std(arousals) if np.std(arousals) > 0 else 1, 
                np.std(dominances) if np.std(dominances) > 0 else 1)
    }

    print(f"\n📊 VAD Statistics:")
    print(f"   Valence: mean={stats['mean'][0]:.2f}, std={stats['std'][0]:.2f}")
    print(f"   Arousal: mean={stats['mean'][1]:.2f}, std={stats['std'][1]:.2f}")
    print(f"   Dominance: mean={stats['mean'][2]:.2f}, std={stats['std'][2]:.2f}")

    # Step 4️⃣ Second pass: assign depression types
    for item in vad_data:
        depression_type = infer_depression_type(
            item["valence"], 
            item["arousal"], 
            item["dominance"], 
            stats
        )
        item["depression_type"] = depression_type
        rows.append(item)

    # Step 5️⃣ Write to CSV with proper quoting to preserve text with commas
    if rows:
        csv_path = os.path.join("datasets", output_file)
        with open(csv_path, mode="w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(
                f, 
                fieldnames=list(rows[0].keys()),
                quoting=csv.QUOTE_NONNUMERIC  # Quote all non-numeric fields
            )
            writer.writeheader()
            writer.writerows(rows)
        print(f"\n✅ Dataset saved successfully → {csv_path}")
        print(f"🧾 Total samples: {len(rows)}")
        
        # Print depression type distribution
        from collections import Counter
        type_counts = Counter(row["depression_type"] for row in rows)
        print(f"\n📈 Depression Type Distribution:")
        for dtype, count in type_counts.items():
            print(f"   {dtype}: {count}")
    else:
        print("\n⚠️ No valid data processed.")


# 🔹 Run it manually
if __name__ == "__main__":
    # example usage
    test_files = ["cleaned1.csv", "cleaned2.csv", "cleaned3.csv", "cleaned4.csv", "cleaned5.csv"]
    
    print(f"🚀 Starting batch processing of {len(test_files)} files...\n")
    
    for i, f in enumerate(test_files, 1):
        print(f"\n{'#'*60}")
        print(f"# Processing file {i}/{len(test_files)}: {f}")
        print(f"{'#'*60}")
        
        try:
            build_vad_dataset_from_file(f)
        except Exception as e:
            print(f"\n❌ Failed to process {f}: {e}")
            import traceback
            traceback.print_exc()
            continue
    
    print(f"\n{'='*60}")
    print("🎉 Batch processing complete!")
    print(f"{'='*60}")
