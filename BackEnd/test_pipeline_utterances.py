# Direct test of tamil_pipeline with utterance segmentation

from tamil_pipeline import clean_tamil_pipeline
import sys

# Set UTF-8 encoding
sys.stdout.reconfigure(encoding='utf-8')

test_cases = [
    "நான் மிகவும் சந்தோஷம் இன்று ஆனல் சிறிது சோர்வாக இருக்கிறேன்!",
    "i am very happy today but feeling a bit tired",
    "vanakam da mapla. enna sogama iruka? i am fine but little sad",
]

print("\n" + "🎯 " * 40)
print("UTTERANCE SEGMENTATION - DIRECT TEST")
print("🎯 " * 40 + "\n")

for i, test in enumerate(test_cases, 1):
    print(f"\n{'='*80}")
    print(f"TEST {i}: {test}")
    print('='*80)
    
    tamil, metadata = clean_tamil_pipeline(test, debug=True)
    
    print(f"\n✅ Final Output: {tamil}")
    
    if metadata.get('utterances'):
        print(f"\n📝 Utterances ({len(metadata['utterances'])}):")
        for j, utt in enumerate(metadata['utterances'], 1):
            print(f"  {j}. {utt}")
    
    print()
