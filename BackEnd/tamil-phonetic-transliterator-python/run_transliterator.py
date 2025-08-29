# run_transliterator.py
# Script to run Tamil Phonetic Transliterator for a given input


import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))
from index import translite


# --- Tanglish normalization and fuzzy matching ---
import re
try:
    from Levenshtein import distance as levenshtein_distance
except ImportError:
    levenshtein_distance = None

def regex_cleanup(word):
    word = re.sub(r"h$", "", word)
    word = re.sub(r"(.)\1{2,}", r"\1\1", word)
    return word

canonical_words = ["pakka", "thambi", "naan", "enakku", "seri"]

def tanglish_to_phonetic(word):
    return word.lower()

def normalize_tanglish(word):
    w = word.lower().strip()
    phonetic = tanglish_to_phonetic(w)
    phonetic = regex_cleanup(phonetic)

    best_word, best_score = None, float("inf")
    if levenshtein_distance:
        for c in canonical_words:
            d = levenshtein_distance(phonetic, c)
            if d < best_score:
                best_word, best_score = c, d
    else:
        best_word = phonetic  
    return best_word

if __name__ == "__main__":
    input_text = "சும்மா"
    output = translite(input_text)
    print(f"Input: {input_text}")
    print(f"Transliterated: {output}")

    print("--- Tanglish normalization examples ---")
    print(normalize_tanglish("phakkah"))   
    print(normalize_tanglish("pakkaa"))    
    print(normalize_tanglish("thamby"))   
