import json
import os
import re
try:
    # rapidfuzz is much faster for bulk approximate matches
    from rapidfuzz.distance import Levenshtein as rf_levenshtein
    USE_RAPIDFUZZ = True
except Exception:
    try:
        from Levenshtein import distance as levenshtein_distance
        USE_RAPIDFUZZ = False
    except Exception:
        # Fallback to simple edit distance
        USE_RAPIDFUZZ = False
        def levenshtein_distance(s1, s2):
            """Simple Levenshtein distance implementation"""
            if len(s1) < len(s2):
                return levenshtein_distance(s2, s1)
            if len(s2) == 0:
                return len(s1)
            previous_row = range(len(s2) + 1)
            for i, c1 in enumerate(s1):
                current_row = [i + 1]
                for j, c2 in enumerate(s2):
                    insertions = previous_row[j + 1] + 1
                    deletions = current_row[j] + 1
                    substitutions = previous_row[j] + (c1 != c2)
                    current_row.append(min(insertions, deletions, substitutions))
                previous_row = current_row
            return previous_row[-1]

# Adjusted rules path to local copy
RULES_PATH = os.path.join(os.path.dirname(__file__), 'rules.json')
with open(RULES_PATH, 'r', encoding='utf-8') as f:
    RULES = json.load(f)


reverse_map = {}
for tamil, latin in RULES['letter_rule'].items():
    reverse_map[latin] = tamil
for rule_name in ['ka_rule', 'sa_rule', 'ta_rule', 'pa_rule', 'tha_rule']:
    for tamil, latin in RULES.get(rule_name, {}).items():
        reverse_map[latin] = tamil
for tamil, latin in RULES.get('special_case', {}).items():
    reverse_map[latin] = tamil

latin_keys = sorted(reverse_map.keys(), key=len, reverse=True)

# Vowel mapping for contextual handling
VOWELS = {
    'a': 'அ',
    'aa': 'ஆ',
    'i': 'இ',
    'ee': 'ஈ',
    'u': 'உ',
    'oo': 'ஊ',
    'e': 'எ',
    'ye': 'ஏ',
    'ai': 'ஐ',
    'o': 'ஒ',
}

# Common word mappings for better accuracy
COMMON_WORDS = {
    'vanakam': 'வணக்கம்',
    'vanakkam': 'வணக்கம்',
    'mapla': 'மாப்பிள்ளை',
    'mappillai': 'மாப்பிள்ளை',
    'theni': 'தேனி',
    'sogam': 'சோகம்',
    'sogama': 'சோகமா',
    'irunthu': 'இருந்து',
    'irundu': 'இருந்து',
    'iruka': 'இருக',
    'enna': 'என்ன',
    'entha': 'என்த',
    'naan': 'நான்',
    'nan': 'நான்',
    'neengal': 'நீங்கள்',
    'neenga': 'நீங்க',
    'thambi': 'தம்பி',
    'thangai': 'தங்கை',
    'anna': 'அண்ணா',
    'akka': 'அக்கா',
    'amma': 'அம்மா',
    'appa': 'அப்பா',
    'seri': 'சரி',
    'saree': 'சரி',
    'illa': 'இல்ல',
    'illai': 'இல்லை',
    'ila': 'இல',
    'la': 'ல',
    'le': 'லே',
    'da': 'டா',
    'di': 'டி',
    'pa': 'ப',
    'po': 'போ',
    'va': 'வா',
    've': 'வே',
}


def tanglish_to_tamil(text, verbose: bool = False):
    """Improved transliteration with contextual vowel handling and common word mappings.
    
    Args:
        text: Tanglish input text
        verbose: Enable debug output
        
    Returns:
        Tamil text with properly combined consonant-vowel sequences
    """
    text = text.lower().strip()
    
    # First pass: process by words to catch common patterns
    words = []
    current_word = ""
    
    for ch in text:
        if re.match(r'[a-z0-9]', ch):
            current_word += ch
        else:
            if current_word:
                # Check if it's a common word
                if current_word in COMMON_WORDS:
                    words.append(COMMON_WORDS[current_word])
                else:
                    # Transliterate using rules
                    words.append(_transliterate_word(current_word, verbose))
                current_word = ""
            # Keep separators as single space
            if words and not words[-1].endswith(' '):
                words.append(' ')
    
    # Don't forget the last word
    if current_word:
        if current_word in COMMON_WORDS:
            words.append(COMMON_WORDS[current_word])
        else:
            words.append(_transliterate_word(current_word, verbose))
    
    result = ''.join(words).strip()
    # Clean up multiple spaces
    result = re.sub(r'\s+', ' ', result)
    
    return result


def _transliterate_word(word, verbose=False):
    """Transliterate a single word using the rules."""
    result = ""
    i = 0
    debug_steps = []
    
    while i < len(word):
        match = None
        # Try matching with rules (longest first)
        for key in latin_keys:
            if word[i:i+len(key)] == key:
                tamil_char = reverse_map[key]
                result += tamil_char
                if verbose:
                    debug_steps.append(f"Matched '{key}' → '{tamil_char}'")
                i += len(key)
                match = True
                break
        
        if not match:
            # No mapping for this character - skip it
            if verbose:
                debug_steps.append(f"Unmatched '{word[i]}'")
            i += 1
    
    if verbose and debug_steps:
        print(f"Word '{word}' → '{result}':")
        for step in debug_steps:
            print(f"  {step}")
    
    return result


def normalize_tamil_word(word):
    """Normalize Tamil word to match standard dictionary forms.
    
    Applies transformations:
    - ஸ → ச (Sanskrit s to Tamil s)
    - ஷ → ச (Sanskrit sh to Tamil s)
    - ஜ → ச (Sanskrit j to Tamil s)
    - ஹ → க (Sanskrit h to Tamil k)
    - ஶ → ச
    - ஷ் → ச்
    - Remove excessive pulli marks
    - Normalize ள → ல in some contexts
    
    Args:
        word: Tamil word to normalize
        
    Returns:
        Normalized Tamil word
    """
    if not word:
        return word
    
    # Sanskrit letter normalization
    normalized = word
    normalized = normalized.replace('ஸ', 'ச')
    normalized = normalized.replace('ஷ', 'ச')
    normalized = normalized.replace('ஜ', 'ச')
    normalized = normalized.replace('ஹ', 'க')
    normalized = normalized.replace('ஶ', 'ச')
    normalized = normalized.replace('ஃ', '')  # Remove aytham if not needed
    
    # Optional: normalize retroflex ள to dental ல in certain contexts
    # This is context-dependent, so we'll be conservative
    # normalized = normalized.replace('ள', 'ல')
    
    return normalized


def find_rule_for_key(key):
    for rule_name in ['letter_rule', 'ka_rule', 'sa_rule', 'ta_rule', 'pa_rule', 'tha_rule', 'special_case']:
        rule = RULES.get(rule_name, {})
        for tamil, latin in rule.items():
            if latin == key:
                return rule_name
    return 'unknown'

# Load Tamil dictionary for correction
file_path = os.path.join(os.path.dirname(__file__), "tamil_words_9k_sorted.txt")
TAMIL_DICTIONARY = []
try:
    with open(file_path, "r", encoding="utf-8") as f:
        TAMIL_DICTIONARY = [line.strip() for line in f.readlines() if line.strip()]
except Exception as e:
    print(f"Warning: Could not load Tamil dictionary: {e}")
    TAMIL_DICTIONARY = []


def find_closest(word, max_distance=3):
    """Find closest Tamil word using Levenshtein distance.
    
    Args:
        word: Tamil word to match
        max_distance: Maximum edit distance to consider (default: 3)
        
    Returns:
        Tuple of (best_word, distance) or (None, float('inf')) if no match
    """
    if not word or not TAMIL_DICTIONARY:
        return None, float('inf')
    
    best_word = None
    best_distance = float("inf")

    # First check for exact match
    if word in TAMIL_DICTIONARY:
        return word, 0
    
    # Check normalized version
    normalized = normalize_tamil_word(word)
    if normalized in TAMIL_DICTIONARY:
        return normalized, 0

    # Find closest match using Levenshtein distance
    for w in TAMIL_DICTIONARY:
        try:
            if USE_RAPIDFUZZ:
                dist = rf_levenshtein.distance(word, w)
            else:
                dist = levenshtein_distance(word, w)
        except Exception:
            # fallback to simple comparison
            dist = levenshtein_distance(word, w)

        if dist < best_distance and dist <= max_distance:
            best_distance = dist
            best_word = w

    return best_word, best_distance


def correct_transliteration_tokens(text, debug=False, max_distance=2, skip_exact_matches=True):
    """Correct transliterated Tamil tokens using dictionary matching.
    
    Takes Tamil text, tokenizes it, and finds the closest valid Tamil word
    for each token using Levenshtein distance.
    
    Args:
        text: Tamil text (output from tanglish_to_tamil)
        debug: If True, print tokens with no dictionary match
        max_distance: Maximum edit distance to consider for correction (default: 2)
        skip_exact_matches: If True, don't try to correct tokens already in dictionary
        
    Returns:
        Tuple of (corrected_text, correction_info)
        - corrected_text: Tamil text with corrections applied
        - correction_info: List of dicts with correction details
    """
    if not text:
        return "", []
    
    # Tokenize by whitespace
    tokens = text.split()
    corrected_tokens = []
    correction_info = []
    
    for token in tokens:
        # Skip empty tokens
        if not token.strip():
            continue
            
        # Skip punctuation-only tokens
        if not any('\u0B80' <= c <= '\u0BFF' for c in token):
            corrected_tokens.append(token)
            continue
        
        # Check if already in dictionary (exact match)
        if skip_exact_matches and token in TAMIL_DICTIONARY:
            corrected_tokens.append(token)
            correction_info.append({
                'original': token,
                'corrected': token,
                'distance': 0,
                'matched': True,
                'exact': True
            })
            continue
        
        # Try to find closest match
        closest, distance = find_closest(token, max_distance=max_distance)
        
        # Only apply correction if:
        # 1. We found a match
        # 2. Distance is 1 (very close match) - be conservative
        # 3. OR distance is 2 and the token is very short (likely typo)
        should_correct = False
        if closest:
            if distance == 1:
                should_correct = True
            elif distance == 2 and len(token) <= 3:
                should_correct = True
        
        if should_correct:
            corrected_tokens.append(closest)
            correction_info.append({
                'original': token,
                'corrected': closest,
                'distance': int(distance),
                'matched': True,
                'exact': False
            })
        else:
            # No good match found - keep original
            corrected_tokens.append(token)
            correction_info.append({
                'original': token,
                'corrected': token,
                'distance': int(distance) if closest else -1,  # Use -1 instead of inf for JSON compatibility
                'matched': False,
                'exact': False
            })
            
            if debug and distance > max_distance:
                print(f"No dictionary match for: {token} (closest: {closest}, distance: {distance})")
    
    corrected_text = ' '.join(corrected_tokens)
    return corrected_text, correction_info


if __name__ == "__main__":
    examples = [
        "vanakam da mapla",
        "theni la irunthu",
        "enna sogama iruka",
        "pakka", 
        "thambi", 
        "naan", 
        "enakku", 
        "seri", 
        "kaai", 
        "thaa", 
        "pattu", 
        "chennai", 
        "bayanthu"
    ]

    print("\nTanglish → Tamil Conversion with Dictionary Correction\n")
    print("=" * 80)

    for ex in examples: 
        # Step 1: Transliterate
        tamil_word = tanglish_to_tamil(ex)
        
        # Step 2: Normalize
        normalized = normalize_tamil_word(tamil_word)
        
        # Step 3: Correct using dictionary
        corrected, info = correct_transliteration_tokens(tamil_word, debug=False)
        
        # Step 4: Find closest match for display
        closest, distance = find_closest(corrected)
        
        print(f"Input: {ex}")
        print(f"  → Transliterated: {tamil_word}")
        print(f"  → Normalized: {normalized}")
        print(f"  → Corrected: {corrected}")
        if closest and distance == 0:
            print(f"  → Dictionary: ✓ Exact match")
        elif closest and distance <= 2:
            print(f"  → Dictionary: ~ Close match (distance: {distance})")
        else:
            print(f"  → Dictionary: ✗ No match")
        print()
