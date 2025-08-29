# Tamil Phonetic Transliterator (Python)

A Python library for converting Tamil text to English transliteration. This package provides accurate and context-aware transliteration of Tamil characters to their English equivalents.

## Features
- Converts Tamil text to English transliteration
- Handles complex Tamil grammar rules
- Supports special cases and compound characters
- Context-aware transliteration
- Object-level conversion support

## Installation
```bash
pip install tamil-phonetic-transliterator-python
```

## Usage
### Basic Text Transliteration
```python
from tamil_phonetic_transliterator import translite

tamil_text = "வணக்கம்"
english_text = translite(tamil_text)
print(english_text)  # Output: "vanakkam"
```

### Converting Objects
```python
from tamil_phonetic_transliterator import convert_tamil_object_to_english

tamil_object = {
    "greeting": "வணக்கம்",
    "name": "ராஜா",
    "message": "நல்வரவு"
}
english_object = convert_tamil_object_to_english(tamil_object)
print(english_object)
```
