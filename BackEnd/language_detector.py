"""
Language Detection and Classification Module
Detects whether text is Tamil, Tanglish, or English
"""

import re
import unicodedata
from typing import Literal, Tuple

# Common English words that are unlikely to be Tanglish
COMMON_ENGLISH_WORDS = {
    'i', 'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should',
    'can', 'could', 'may', 'might', 'must', 'shall',
    'the', 'a', 'an', 'and', 'or', 'but', 'if', 'then', 'so',
    'in', 'on', 'at', 'to', 'from', 'with', 'by', 'for', 'of',
    'my', 'your', 'his', 'her', 'its', 'our', 'their',
    'this', 'that', 'these', 'those', 'what', 'which', 'who', 'when', 'where', 'why', 'how',
    'very', 'too', 'much', 'many', 'some', 'any', 'all', 'no', 'not',
    'good', 'bad', 'happy', 'sad', 'big', 'small', 'new', 'old',
    'today', 'tomorrow', 'yesterday', 'now', 'here', 'there',
    'love', 'hate', 'like', 'want', 'need', 'think', 'know', 'see', 'look',
    'go', 'come', 'get', 'give', 'take', 'make', 'put', 'say', 'tell'
}

# Common Tanglish patterns (Tamil words in Latin script)
TANGLISH_PATTERNS = {
    'vanakam', 'vanakkam', 'mapla', 'mappillai', 'thambi', 'thangai',
    'anna', 'akka', 'amma', 'appa', 'naan', 'nan', 'neengal', 'neenga',
    'enna', 'ethu', 'eppo', 'enga', 'yen', 'yeppadi',
    'seri', 'saree', 'illai', 'illa', 'ila', 'iruka', 'irunthu', 'irundu',
    'sogam', 'sogama', 'santosam', 'bayam', 'kovam',
    'theni', 'madurai', 'chennai', 'coimbatore',
    'da', 'di', 'pa', 'po', 'va', 've', 'la', 'le'
}


def is_tamil_char(char: str) -> bool:
    """Check if a character is from Tamil Unicode block"""
    try:
        return 'TAMIL' in unicodedata.name(char, '')
    except (ValueError, TypeError):
        return False


def contains_tamil(text: str) -> bool:
    """Check if text contains any Tamil characters"""
    return any(is_tamil_char(ch) for ch in text)


def detect_word_language(word: str, debug: bool = False) -> Literal['tamil', 'tanglish', 'english', 'unknown']:
    """
    Detect the language of a single word.
    
    Returns:
        - 'tamil': Contains Tamil Unicode characters
        - 'tanglish': Romanized Tamil (Latin script but Tamil word)
        - 'english': English word
        - 'unknown': Unable to determine
    """
    word_lower = word.lower().strip()
    
    # Skip empty or punctuation-only
    if not word_lower or not re.search(r'[a-zA-Z\u0B80-\u0BFF]', word_lower):
        return 'unknown'
    
    # Check for Tamil Unicode
    if contains_tamil(word):
        if debug:
            print(f"[DETECT] '{word}' → Tamil (contains Tamil characters)")
        return 'tamil'
    
    # Check if it's a known Tanglish word
    if word_lower in TANGLISH_PATTERNS:
        if debug:
            print(f"[DETECT] '{word}' → Tanglish (known pattern)")
        return 'tanglish'
    
    # Check if it's a common English word
    if word_lower in COMMON_ENGLISH_WORDS:
        if debug:
            print(f"[DETECT] '{word}' → English (common word)")
        return 'english'
    
    # Heuristics for Tanglish vs English
    # Tanglish often has repeated consonants and specific patterns
    tanglish_score = 0
    english_score = 0
    
    # Patterns that suggest Tanglish
    if re.search(r'(aa|ee|oo|ai|au)', word_lower):  # Tamil vowel patterns
        tanglish_score += 2
    if re.search(r'(th|dh|ng|nj|zh)', word_lower):  # Tamil consonant patterns
        tanglish_score += 2
    if re.search(r'(kk|pp|tt|ll|nn|mm)', word_lower):  # Doubled consonants
        tanglish_score += 1
    if word_lower.endswith(('am', 'um', 'an', 'en', 'a', 'u', 'i')):  # Tamil endings
        tanglish_score += 1
    
    # Patterns that suggest English
    if re.search(r'(tion|sion|ing|ed|ly|ness)', word_lower):  # English suffixes
        english_score += 3
    if re.search(r'^(un|re|pre|post|anti)', word_lower):  # English prefixes
        english_score += 2
    if len(word_lower) > 8 and not re.search(r'[aeiou]{2,}', word_lower):  # Long words without vowel pairs
        english_score += 1
    
    # Decide based on scores
    if tanglish_score > english_score:
        if debug:
            print(f"[DETECT] '{word}' → Tanglish (score: {tanglish_score} vs {english_score})")
        return 'tanglish'
    elif english_score > tanglish_score:
        if debug:
            print(f"[DETECT] '{word}' → English (score: {english_score} vs {tanglish_score})")
        return 'english'
    
    # Default: assume Tanglish if mixed, English if not
    if debug:
        print(f"[DETECT] '{word}' → Unknown (defaulting to English)")
    return 'english'


def detect_language_segment(text: str, debug: bool = False) -> list[Tuple[str, str]]:
    """
    Detect language for each word/segment in the text.
    
    Returns:
        List of (word, language) tuples where language is 'tamil', 'tanglish', or 'english'
    """
    # Tokenize by whitespace and punctuation
    words = re.findall(r'\b[\w\u0B80-\u0BFF]+\b', text)
    
    results = []
    for word in words:
        lang = detect_word_language(word, debug=debug)
        if lang != 'unknown':
            results.append((word, lang))
    
    return results


if __name__ == "__main__":
    # Test the detection
    test_cases = [
        "vanakam da mapla",
        "i am very happy today",
        "vanakam i am happy da",
        "வணக்கம் நண்பா",
        "chennai la irunthu vanthuten",
        "love you da",
        "sogama iruka"
    ]
    
    print("Language Detection Test\n" + "=" * 80)
    
    for test in test_cases:
        print(f"\nInput: {test}")
        segments = detect_language_segment(test, debug=True)
        print(f"Result: {segments}")
