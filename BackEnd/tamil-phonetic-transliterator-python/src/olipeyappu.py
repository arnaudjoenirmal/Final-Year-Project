# olipeyappu.py - Tamil Phonetic Transliterator core logic (Python)
from rules import letter_rule, ka_rule, sa_rule, ta_rule, pa_rule, tha_rule, extras

vallinam = ["க", "ச", "ட", "த", "ப", "ற"]
mellinam = ["ங", "ஞ", "ண", "ந", "ம", "ன"]
idaiyinam = ["ய", "ர", "ல", "வ", "ழ", "ள"]

def extras_comb(letter):
    return [letter + constant for constant in extras.keys()]

def olipeyarppu(word_start, tam_word, prev_comb, next_next_char=None, next_char=None):
    roman_text = ""
    if word_start:
        if tam_word in extras_comb("க"):
            roman_text += ka_rule.get(tam_word, "")
        elif tam_word in extras_comb("த"):
            roman_text += tha_rule.get(tam_word, "")
        elif tam_word in extras_comb("ட"):
            roman_text += ta_rule.get(tam_word, "")
        elif tam_word in extras_comb("ப"):
            roman_text += pa_rule.get(tam_word, "")
        else:
            roman_text += letter_rule.get(tam_word, "")
    elif tam_word == "க" and prev_comb == "று":
        roman_text += "ka"
    elif any(prev_comb == letter + "்" for letter in vallinam + idaiyinam + mellinam + ["ஸ", "ஷ"]):
        if prev_comb == "ன்":
            if tam_word == "று":
                roman_text += "dru"
            elif tam_word == "றி":
                roman_text += "dri"
            elif tam_word == "ற":
                roman_text += "dra"
            elif tam_word == "றை":
                roman_text += "drai"
            elif tam_word in extras_comb("ப"):
                roman_text += letter_rule.get(tam_word, "")
        if roman_text == "" and prev_comb in ["க்", "ச்", "ட்", "த்", "ப்", "ற்", "ஷ்", "ஸ்"]:
            roman_text += ka_rule.get(tam_word, "")
            roman_text += sa_rule.get(tam_word, "")
            roman_text += ta_rule.get(tam_word, "")
            roman_text += tha_rule.get(tam_word, "")
            roman_text += pa_rule.get(tam_word, "")
        if prev_comb in ["ஞ்", "ங்"]:
            for key, value in extras.items():
                if any(tam_word == letter + key for letter in vallinam):
                    roman_text += value
        if roman_text == "":
            roman_text += letter_rule.get(tam_word, "")
    elif tam_word == "ற்" and next_next_char == "ற":
        roman_text += "t"
    else:
        roman_text += letter_rule.get(tam_word, "")
    return roman_text
