import json
import pandas as pd
import nltk
from nltk.tokenize import sent_tokenize, word_tokenize
from googletrans import Translator
import os

nltk.download('punkt')
try:
    nltk.download('punkt_tab')
except Exception:
    pass

# Use repo-level data files (parent directory)
TAMIL_JSON_PATH = os.path.join("Tamil_anew_combined.json")
ENGLISH_ANEW_PATH = os.path.join("english_anew.csv")

with open(TAMIL_JSON_PATH, 'r', encoding='utf-8') as f:
    tamil_anew = json.load(f)

english_anew = pd.read_csv(ENGLISH_ANEW_PATH)
english_dict = {
    str(row['word']).strip().lower(): {
        "valence": float(row['valence']),
        "arousal": float(row['arousal']),
        "dominance": float(row['dominance'])
    }
    for _, row in english_anew.iterrows()
    if pd.notna(row['word']) and isinstance(row['word'], str)
}

translator = Translator()


def tamil_to_english(word):
    try:
        result = translator.translate(word, src='ta', dest='en')
        return result.text.strip().lower()
    except Exception:
        return None


def _persist_tamil_anew():
    """Persist the in-memory tamil_anew to disk atomically."""
    try:
        with open(TAMIL_JSON_PATH + '.tmp', 'w', encoding='utf-8') as f:
            json.dump(tamil_anew, f, ensure_ascii=False, indent=2)
        os.replace(TAMIL_JSON_PATH + '.tmp', TAMIL_JSON_PATH)
    except Exception:
        # best-effort: ignore persistence failures but keep in-memory cache
        pass


def get_vad_from_tamil(word):
    """Fetch Tamil VAD synchronously from the in-memory cache.

    This function *does not* perform network translations. Use
    `batch_translate_and_update` to translate missing Tamil words in bulk
    before calling aggregate_vad to avoid per-word network calls.
    """
    if word in tamil_anew:
        rec = tamil_anew[word]
        return (rec["valence"], rec["arousal"], rec["dominance"])
    # Unknown word: return neutral default; caller should batch-translate later
    return (5.0, 5.0, 5.0)


def get_vad_from_english(word):
    """Fetch VAD from English ANEW dictionary."""
    w = word.lower()
    if w in english_dict:
        v = english_dict[w]
        return (v["valence"], v["arousal"], v["dominance"])
    return (5.0, 5.0, 5.0)


def batch_translate_and_update(words):
    """Batch-translate a list of Tamil words (or tokens) to English and update tamil_anew.

    Args:
        words: iterable of strings (Tamil tokens). Only missing words are translated.

    This reduces repeated network calls by translating many words in one translator
    invocation (googletrans supports a list input which it will translate, though
    it may still perform multiple HTTP requests internally). After collecting
    translations, updates are persisted to disk once.
    """
    words = list(words)
    missing = [w for w in words if w not in tamil_anew]
    if not missing:
        return

    # translate in bulk (googletrans accepts list input)
    try:
        translations = translator.translate(missing, src='ta', dest='en')
    except Exception:
        translations = []

    # when translating a list, googletrans returns a list of objects; when
    # single string passed, returns a single object; normalize to list
    if translations and not isinstance(translations, list):
        translations = [translations]

    # Collect diagnostic info for what was translated and whether it matched
    diagnostics = []
    for orig, trans_obj in zip(missing, translations if translations else []):
        try:
            translated = trans_obj.text.strip().lower()
        except Exception:
            translated = None

        matched = False
        if translated and translated in english_dict:
            vals = english_dict[translated]
            tamil_anew[orig] = {
                "English": translated,
                "valence": vals["valence"],
                "arousal": vals["arousal"],
                "dominance": vals["dominance"]
            }
            matched = True

        diagnostics.append({
            "tamil": orig,
            "translated": translated,
            "matched_in_english_anew": matched
        })

    # Persist all updates once
    _persist_tamil_anew()

    # Lightweight diagnostic logging to help debugging translation misses
    try:
        # Print only a short summary to avoid blowing up logs
        matched_count = sum(1 for d in diagnostics if d.get('matched_in_english_anew'))
        total = len(diagnostics)
        if total > 0:
            print(f"batch_translate_and_update: translated {total} tokens, matched {matched_count} in english_anew")
            # show examples of unmatched translations (up to 10)
            unmatched = [d for d in diagnostics if not d.get('matched_in_english_anew')]
            for d in unmatched[:10]:
                print(f"  - {d['tamil']} -> {d['translated']}")
    except Exception:
        pass


def aggregate_vad(text, func, prebatch=True):
    """Compute mean VAD for each sentence using func.

    If prebatch is True, collect all unique tokens first and perform a
    bulk translation/update for any missing Tamil words to avoid per-word
    network calls.
    """
    sentences = sent_tokenize(text)
    sentence_vads = []

    # optionally pre-batch translate missing words to fill cache
    if prebatch:
        tokens = set()
        for sent in sentences:
            for w in word_tokenize(sent):
                tokens.add(w)
        # perform bulk translate/update for tokens not in cache
        batch_translate_and_update(tokens)

    for sent in sentences:
        words = word_tokenize(sent)
        vad_scores = [func(w) for w in words]
        if not vad_scores:
            continue
        v = sum(v[0] for v in vad_scores)/len(vad_scores)
        a = sum(v[1] for v in vad_scores)/len(vad_scores)
        d = sum(v[2] for v in vad_scores)/len(vad_scores)
        sentence_vads.append({
            "sentence": sent,
            "valence": v,
            "arousal": a,
            "dominance": d
        })
    return sentence_vads


def per_token_vad(text, func=get_vad_from_tamil, prebatch=True):
    """Return per-token VAD info for `text`.

    This will pre-batch translate missing tokens (if prebatch=True) and then
    return a list of dicts: {token, valence, arousal, dominance, in_cache}.
    """
    tokens = [w for w in word_tokenize(text) if w.strip()]
    # pre-batch to ensure cache is populated
    if prebatch:
        batch_translate_and_update(set(tokens))

    out = []
    for t in tokens:
        in_cache = t in tamil_anew
        v, a, d = get_vad_from_tamil(t)
        out.append({
            "token": t,
            "valence": v,
            "arousal": a,
            "dominance": d,
            "in_cache": in_cache
        })
    return out


