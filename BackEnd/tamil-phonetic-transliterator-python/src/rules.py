# rules.py - Contains transliteration rules (Python)
import json
import os

RULES_PATH = os.path.join(os.path.dirname(__file__), 'rules.json')
with open(RULES_PATH, 'r', encoding='utf-8') as f:
    RULES = json.load(f)

letter_rule = RULES.get('letter_rule', {})
ka_rule = RULES.get('ka_rule', {})
sa_rule = RULES.get('sa_rule', {})
ta_rule = RULES.get('ta_rule', {})
pa_rule = RULES.get('pa_rule', {})
tha_rule = RULES.get('tha_rule', {})
extras = RULES.get('extras', {})
special_case = RULES.get('special_case', {})
