import json
import os
import re

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

def tanglish_to_tamil(text):
    text = text.lower().strip()
    result = ""
    i = 0
    debug_steps = []
    while i < len(text):
        match = None
        #check every key, substring the text
        for key in latin_keys:
            
            if text[i:i+len(key)] == key:
                tamil_char = reverse_map[key]
                result += tamil_char
                debug_steps.append(f"Matched '{key}' → '{tamil_char}' (rule: {find_rule_for_key(key)})")
                i += len(key)
                match = True
                break
        if not match:
            debug_steps.append(f"Unmatched '{text[i]}' → skipped")
            i += 1
    print("\nDebug steps:")
    for step in debug_steps:
        print(step)
    print(f"Final Tamil output: {result}\n")
    return result

def find_rule_for_key(key):
    for rule_name in ['letter_rule', 'ka_rule', 'sa_rule', 'ta_rule', 'pa_rule', 'tha_rule', 'special_case']:
        rule = RULES.get(rule_name, {})
        for tamil, latin in rule.items():
            if latin == key:
                return rule_name
    return 'unknown'

if __name__ == "__main__":
    examples = ["pakka", "thambi", "naan", "enakku", "seri", "kaai", "thaa", "pattu", "chennai", "bayanthu" , "bi" , "ki"]
    for ex in examples:
        print(f"Tanglish: {ex} -> Tamil: {tanglish_to_tamil(ex)}")