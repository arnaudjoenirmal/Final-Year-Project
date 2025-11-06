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

from tamil_pipeline import clean_tamil_pipeline
from vad import analyze_vad_text   # or aggregate_vad depending on your setup

# 🔹 CONFIGURATION
OUTPUT_FILE = f"uploaded_tamil_vad_dataset_{datetime.now().strftime('%Y%m%d_%H%M')}.csv"


# 🔹 Depression Type Inference (Rule-Based)
def infer_depression_type(valence, arousal, dominance):
    """Infer depression type based on average VAD values."""
    if valence < 4 and arousal > 5 and dominance < 4:
        return "Melancholic"
    elif valence < 4 and arousal < 4 and dominance > 5:
        return "Atypical"
    elif valence < 3 and arousal > 6 and dominance > 6:
        return "Psychotic"
    else:
        return "Situational"


# 🔹 Main Builder
def build_vad_dataset_from_file(file_path: str):
    os.makedirs("datasets", exist_ok=True)
    rows = []

    # Step 1️⃣ Read the uploaded file
    if file_path.endswith(".csv"):
        df = pd.read_csv(file_path)
        if 'body' in df.columns:
            texts = df['body'].dropna().astype(str).tolist()
        else:
            texts = df.iloc[:, 0].dropna().astype(str).tolist()
    else:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            texts = [line.strip() for line in f if len(line.strip()) > 10]

    print(f"📄 Total entries to process: {len(texts)}")

    # Step 2️⃣ Process each text entry
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

            depression_type = infer_depression_type(avg_valence, avg_arousal, avg_dominance)

            rows.append({
                "original_text": text,
                "cleaned_tamil": tamil_text,
                "valence": round(avg_valence, 3),
                "arousal": round(avg_arousal, 3),
                "dominance": round(avg_dominance, 3),
                "depression_type": depression_type,
                "utterance_count": len(utterances)
            })

        except Exception as e:
            print(f"❌ Error processing entry {i}: {e}")

    # Step 3️⃣ Write to CSV
    if rows:
        csv_path = os.path.join("datasets", OUTPUT_FILE)
        with open(csv_path, mode="w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
            writer.writeheader()
            writer.writerows(rows)
        print(f"\n✅ Dataset saved successfully → {csv_path}")
        print(f"🧾 Total samples: {len(rows)}")
    else:
        print("\n⚠️ No valid data processed.")


# 🔹 Run it manually
if __name__ == "__main__":
    # example usage
    test_file = ["cleaned.csv" ]  # update path
    build_vad_dataset_from_file(test_file)
