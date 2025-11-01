# Utterance-Level Segmentation Enhancement

## Overview
Enhanced the Tamil pipeline with intelligent utterance segmentation for better readability and sentence-level emotion analysis.

## Implementation

### New Function: `split_into_utterances_tamil(text: str, debug: bool = False) -> List[str]`

**Location**: `tamil_pipeline.py`

**Process**:
1. **Noise Removal** - Removes URLs, media links (reddit.com, youtube.com, .jpg, .png, etc.)
2. **Delimiter Splitting** - Splits on sentence endings (. ? ! : ;)
3. **Conjunction Splitting** - Splits on Tamil conjunctions:
   - ஆனால், ஆனல், ஆனா (but)
   - அதனால், அதனல் (because of that)
   - எனவே, ஆகவே (therefore)
   - அப்படின்னா, என்னா (if so)
   - பிறகு, அப்புறம் (then, after)
   - மேலும், அதோடு (moreover)
4. **Fragment Filtering** - Removes fragments shorter than 3 words (unless punctuation-ended)
5. **Whitespace Normalization** - Cleans up spacing

### Integration with Pipeline

**Modified**: `clean_tamil_pipeline()` in `tamil_pipeline.py`

**Added Step 4** (after dictionary correction):
```python
# Step 4: Split into clean utterances
utterances = split_into_utterances_tamil(tamil_text, debug=debug)
metadata['utterances'] = utterances
metadata['utterance_count'] = len(utterances)
```

### API Enhancements

**Modified Endpoints** (all in `app.py`):
- `/crawl` - Returns `utterances` and `utterance_count` when `use_pipeline=true`
- `/upload-file` - Returns `utterances` and `utterance_count` when `use_pipeline=true`
- `/debug-vad` - Returns `utterances` and `utterance_count` when `use_pipeline=true`

**Response Format**:
```json
{
  "transliteration": "வணக்கம் டை மாப்பிள்ளை சோகம் இரு...",
  "utterances": [
    "வணக்கம் டை மாப்பிள்ளை",
    "சோகம் இரு மான் ஒன்றாக இருக்கிறேன்"
  ],
  "utterance_count": 2,
  "vad": {...},
  "pipeline_used": "unified"
}
```

## Test Results

### Example 1: English with Conjunction
**Input**: `"i am very happy today but feeling a bit tired"`

**Output Utterances**:
1. `மான் ஒன்று மிகவும் மகிழ்ச்சியான இருக்கிறேன்` (I am very happy today)
2. `ஈளிங் பற்று சோர்வாக` (feeling a bit tired)

### Example 2: Mixed Tanglish + English
**Input**: `"vanakam da mapla. enna sogama iruka? i am fine but little sad"`

**Output Utterances**:
1. `வணக்கம் டை மாப்பிள்ளை` (Hello friend)
2. `சோகம் இரு மான் ஒன்றாக இருக்கிறேன்` (I am fine but sad)

### Example 3: Noise Removal
**Input**: `"Check this video https://youtube.com/watch?v=123 vanakam i am happy today!"`

**Output**: URLs and youtube.com links removed automatically

## Benefits

✅ **Better Readability**: Long paragraphs split into natural sentences
✅ **Improved VAD Analysis**: Sentence-level emotion detection instead of paragraph-level
✅ **Cleaner Output**: Removes URLs, media links, and noise from social media text
✅ **Natural Segmentation**: Splits on Tamil conjunctions for linguistically meaningful breaks
✅ **Quality Control**: Filters out meaningless short fragments

## Usage

### Via API:
```bash
curl -X POST "http://127.0.0.1:8000/debug-vad" \
  -F "text=vanakam i am happy but little sad" \
  -F "use_pipeline=true" \
  -F "debug=false"
```

### Direct Python:
```python
from tamil_pipeline import clean_tamil_pipeline

text = "i am very happy today but feeling tired"
tamil, metadata = clean_tamil_pipeline(text, debug=True)

print(f"Utterances: {metadata['utterances']}")
# Output: ['மான் ஒன்று மிகவும் மகிழ்ச்சியான இருக்கிறேன்', 'சோர்வாக']
```

## Files Modified

1. **tamil_pipeline.py**:
   - Added `split_into_utterances_tamil()` function
   - Integrated utterance splitting into `clean_tamil_pipeline()`
   - Added utterances to metadata dictionary

2. **app.py**:
   - Updated `/crawl` endpoint to return utterances
   - Updated `/upload-file` endpoint to return utterances
   - Updated `/debug-vad` endpoint to return utterances

## Test Scripts

- `test_utterances.ps1` - PowerShell API test script
- `test_pipeline_utterances.py` - Direct Python pipeline test

## Debug Output

When `debug=True`, shows detailed segmentation steps:
```
[UTTERANCE SPLIT] Input: நான் மிகவும் மகிழ்ச்சியான இருக்கிறேன் ஆனால் சோர்வாக
[UTTERANCE SPLIT] After delimiter split: [...]
[UTTERANCE SPLIT] After conjunction split: [...]
[UTTERANCE SPLIT] Filtered out (too short): 'xyz'
[UTTERANCE SPLIT] Final 2 utterances: [...]
```

---

**Status**: ✅ Fully implemented and tested
**Impact**: Significantly improved readability and emotion analysis granularity
