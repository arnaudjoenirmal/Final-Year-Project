# index.py - Entry point for Tamil Phonetic Transliterator (Python)
from olipeyappu import olipeyarppu
from rules import letter_rule, special_case
import re

def escape_regexp(text):
    return re.escape(text)

def replace_word(match):
    return special_case.get(match.group(0), "")

def translite(tamil_text):
    roman_text = ""
    word_start = True
    i = 0
    pattern = "|".join([escape_regexp(k) for k in special_case.keys()])
    if pattern:
        tamil_text = re.sub(pattern, replace_word, tamil_text)
    while i < len(tamil_text):
        if i + 1 < len(tamil_text) and tamil_text[i:i+2] in letter_rule:
            tam_word = tamil_text[i:i+2]
            prev_comb = tamil_text[i-2:i]
            next_next_char = tamil_text[i+2] if i+2 < len(tamil_text) else ""
            next_char = tamil_text[i+1] if i+1 < len(tamil_text) else ""
            roman_text += olipeyarppu(word_start, tam_word, prev_comb, next_next_char, next_char)
            i += 1
            word_start = False
        elif tamil_text[i] in letter_rule:
            tam_word = tamil_text[i]
            next_char = tamil_text[i+1] if i+1 < len(tamil_text) else ""
            prev_comb = tamil_text[i-2:i]
            next_next_char = tamil_text[i+2] if i+2 < len(tamil_text) else ""
            roman_text += olipeyarppu(word_start, tam_word, prev_comb, next_next_char, next_char)
        else:
            roman_text += tamil_text[i]
        i += 1
    return roman_text

def convert_tamil_object_to_english(obj):
    if isinstance(obj, dict):
        return {k: translite(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [translite(v) for v in obj]
    elif isinstance(obj, str):
        return translite(obj)
    return obj
