"""
Unified Tamil Pipeline
Handles Tanglish → Tamil transliteration + English → Tamil translation
"""

import re
from typing import Tuple, List, Dict
from googletrans import Translator
import unicodedata

from language_detector import detect_language_segment, contains_tamil
from tanglish_to_tamil import (
    tanglish_to_tamil,
    normalize_tamil_word,
    correct_transliteration_tokens,
    find_closest
)

# Initialize translator
translator = Translator()

# Cache for translations to avoid repeated API calls
_translation_cache = {}


def split_into_utterances_tamil(text: str, debug: bool = False) -> List[str]:
    """
    More aggressive utterance segmentation:
    - treat newlines and commas as sentence boundaries
    - split on common Tamil conjunctions
    - chunk long segments into max_words
    - allow short utterances >= 2 words
    """
    import re

    if not text or not text.strip():
        return []

    if debug:
        print(f"\n[UTTERANCE SPLIT] Input: {text}")

    # Step 1: Remove noisy tokens (URLs, media links, file extensions)
    noise_patterns = [
        r'https?://[^\s]+',           # URLs
        r'www\.[^\s]+',                # www links
        r'reddit\.com[^\s]*',          # Reddit links
        r'youtube\.com[^\s]*',         # YouTube links
        r'youtu\.be[^\s]*',            # Short YouTube links
        r'\S+\.(jpg|jpeg|png|gif|mp4|webm|pdf|doc|docx)[^\s]*',  # File extensions
        r'v\.redd\.it[^\s]*',          # Reddit video links
        r'i\.redd\.it[^\s]*',          # Reddit image links
        r'u/[^\s]+',                   # Reddit usernames
        r'r/[^\s]+',                   # Reddit subreddits
    ]

    cleaned_text = text
    for pattern in noise_patterns:
        cleaned_text = re.sub(pattern, '', cleaned_text, flags=re.IGNORECASE)

    # Normalize whitespace and treat newlines as sentence breaks
    cleaned_text = cleaned_text.replace('\r', ' ')
    cleaned_text = re.sub(r'\n+', '. ', cleaned_text)
    cleaned_text = re.sub(r'\s+', ' ', cleaned_text).strip()

    # Step 2: Define Tamil conjunctions and delimiters
    tamil_conjunctions = [
        'ஆனால்', 'அதனால்', 'எனவே', 'அப்படின்னா', 'அப்புறம்',
        'பிறகு', 'மேலும்', 'அதோடு', 'அதுமட்டுமல்லாமல்',
        'ஆனா', 'அதான்', 'அப்போ', 'இப்போ', 'சரி',
        'ஆனல', 'அதனல', 'பறக', 'மலம',
        'ஆகவே', 'அதுதான்', 'என்றால்', 'என்ன', 'என்னா',
        'ஆனலம', 'அதானலம', 'இல்ல', 'இல்லன்னா',
    ]

    # Step 3: Split on sentence delimiters and commas
    delimiter_pattern = r'([.?!:;,]+)'
    segments = re.split(delimiter_pattern, cleaned_text)

    # Recombine segments with their delimiters
    combined_segments = []
    i = 0
    while i < len(segments):
        seg = segments[i].strip()
        if seg:
            if i + 1 < len(segments) and re.match(delimiter_pattern, segments[i + 1]):
                seg += segments[i + 1]
                i += 2
            else:
                i += 1
            combined_segments.append(seg)
        else:
            i += 1

    if debug:
        print(f"[UTTERANCE SPLIT] After delimiter split: {combined_segments}")

    # Step 4: Further split on Tamil conjunctions
    utterances = []
    for segment in combined_segments:
        temp_utterances = [segment]
        for conjunction in tamil_conjunctions:
            new_temp = []
            for utt in temp_utterances:
                if conjunction in utt:
                    parts = utt.split(conjunction)
                    for i, part in enumerate(parts):
                        part = part.strip()
                        if not part:
                            continue
                        new_temp.append(part)
                else:
                    new_temp.append(utt)
            temp_utterances = new_temp
        utterances.extend(temp_utterances)

    if debug:
        print(f"[UTTERANCE SPLIT] After conjunction split: {utterances}")

    # Step 5: Chunk very long utterances into smaller ones (max_words)
    max_words = 20
    chunked_utterances = []
    for seg in utterances:
        words = seg.split()
        if len(words) <= max_words:
            chunked_utterances.append(seg)
        else:
            for i in range(0, len(words), max_words):
                chunk = ' '.join(words[i:i + max_words]).strip()
                if chunk:
                    chunked_utterances.append(chunk)

    # Step 6: Filter out fragments shorter than 2 words (unless punctuation ends it)
    filtered_utterances = []
    for utt in chunked_utterances:
        utt = utt.strip()
        if not utt:
            continue
        words = utt.split()
        if len(words) >= 2 or re.search(r'[.?!;:,]$', utt):
            filtered_utterances.append(utt)
        elif debug:
            print(f"[UTTERANCE SPLIT] Filtered out (too short): '{utt}'")

    # Step 7: Final cleanup - normalize whitespace
    final_utterances = []
    for utt in filtered_utterances:
        utt = re.sub(r'\s+', ' ', utt).strip()
        if utt:
            final_utterances.append(utt)

    if debug:
        print(f"[UTTERANCE SPLIT] Final {len(final_utterances)} utterances: {final_utterances}")

    return final_utterances


def translate_english_to_tamil(text: str, debug: bool = False) -> str:
    """
    Translate English text to Tamil using Google Translate.
    
    Args:
        text: English text to translate
        debug: Enable debug logging
        
    Returns:
        Tamil translation
    """
    if not text or not text.strip():
        return ""
    
    # Check cache first
    cache_key = text.lower().strip()
    if cache_key in _translation_cache:
        if debug:
            print(f"[TRANSLATE] '{text}' → '{_translation_cache[cache_key]}' (cached)")
        return _translation_cache[cache_key]
    
    try:
        result = translator.translate(text, src='en', dest='ta')
        tamil_text = result.text.strip()
        
        # Cache the result
        _translation_cache[cache_key] = tamil_text
        
        if debug:
            print(f"[TRANSLATE] '{text}' (English) → '{tamil_text}' (Tamil)")
        
        return tamil_text
    except Exception as e:
        if debug:
            print(f"[TRANSLATE ERROR] '{text}': {e}")
        return text


def process_mixed_language_text(text: str, debug: bool = False) -> str:
    """
    Process text that may contain Tamil, Tanglish, and English.
    Converts everything to Tamil.
    
    Args:
        text: Input text (mixed language)
        debug: Enable debug logging
        
    Returns:
        Clean Tamil text
    """
    if not text:
        return ""
    
    # Detect language for each segment
    segments = detect_language_segment(text, debug=debug)
    
    # Group consecutive words of the same language
    grouped_segments = []
    current_group = []
    current_lang = None
    
    for word, lang in segments:
        if lang == current_lang:
            current_group.append(word)
        else:
            if current_group:
                grouped_segments.append((current_lang, ' '.join(current_group)))
            current_group = [word]
            current_lang = lang
    
    # Don't forget the last group
    if current_group:
        grouped_segments.append((current_lang, ' '.join(current_group)))
    
    # Process each group
    tamil_parts = []
    
    for lang, segment in grouped_segments:
        if lang == 'tamil':
            # Already Tamil - just normalize
            tamil_parts.append(segment)
            if debug:
                print(f"[KEEP] '{segment}' (already Tamil)")
                
        elif lang == 'tanglish':
            # Transliterate Tanglish to Tamil
            tamil = tanglish_to_tamil(segment)
            tamil_parts.append(tamil)
            if debug:
                print(f"[TRANSLITERATE] '{segment}' (Tanglish) → '{tamil}' (Tamil)")
                
        elif lang == 'english':
            # Translate English to Tamil
            tamil = translate_english_to_tamil(segment, debug=debug)
            tamil_parts.append(tamil)
    
    # Combine all parts
    combined = ' '.join(tamil_parts)
    
    return combined


def clean_tamil_pipeline(text: str, 
                        apply_corrections: bool = True, 
                        apply_normalization: bool = True,
                        debug: bool = False) -> Tuple[str, Dict]:
    """
    Unified pipeline to convert any input (Tamil/Tanglish/English) to clean Tamil.
    
    Process:
        1. Detect language segments (Tamil/Tanglish/English)
        2. Transliterate Tanglish → Tamil (phonetic)
        3. Translate English → Tamil (semantic)
        4. Normalize Tamil characters (ஸ→ச, etc.)
        5. Correct against Tamil dictionary using Levenshtein distance
    
    Args:
        text: Input text (can be mixed Tamil/Tanglish/English)
        apply_corrections: Apply dictionary-based corrections
        apply_normalization: Apply Tamil character normalization
        debug: Enable debug logging
        
    Returns:
        Tuple of (cleaned_tamil_text, metadata_dict)
    """
    if debug:
        print("\n" + "=" * 80)
        print("CLEAN TAMIL PIPELINE")
        print("=" * 80)
        print(f"Input: {text}")
        print()
    
    metadata = {
        'original': text,
        'steps': []
    }
    
    # Step 1: Process mixed language text
    if debug:
        print("[STEP 1] Processing mixed language text...")
    
    tamil_text = process_mixed_language_text(text, debug=debug)
    metadata['steps'].append({
        'step': 'language_processing',
        'output': tamil_text
    })
    
    # Step 2: Normalize Tamil characters
    if apply_normalization:
        if debug:
            print(f"\n[STEP 2] Normalizing Tamil characters...")
        
        tokens = tamil_text.split()
        normalized_tokens = []
        
        for token in tokens:
            if contains_tamil(token):
                normalized = normalize_tamil_word(token)
                normalized_tokens.append(normalized)
                if debug and normalized != token:
                    print(f"  [NORMALIZE] '{token}' → '{normalized}'")
            else:
                normalized_tokens.append(token)
        
        tamil_text = ' '.join(normalized_tokens)
        metadata['steps'].append({
            'step': 'normalization',
            'output': tamil_text
        })
    
    # Step 3: Dictionary-based correction
    if apply_corrections:
        if debug:
            print(f"\n[STEP 3] Applying dictionary corrections...")
        
        corrected_text, correction_info = correct_transliteration_tokens(
            tamil_text, 
            debug=debug,
            max_distance=2
        )
        
        tamil_text = corrected_text
        metadata['steps'].append({
            'step': 'dictionary_correction',
            'output': tamil_text,
            'corrections': correction_info
        })
        metadata['corrections_applied'] = len([c for c in correction_info if c.get('matched')])
    
    # Step 4: Split into clean utterances
    if debug:
        print(f"\n[STEP 4] Splitting into utterances...")
    
    utterances = split_into_utterances_tamil(tamil_text, debug=debug)
    
    # If no utterances found (all filtered out), keep original
    if not utterances:
        utterances = [tamil_text]
        if debug:
            print(f"[WARNING] No valid utterances found, keeping original text")
    
    metadata['steps'].append({
        'step': 'utterance_segmentation',
        'utterances': utterances,
        'count': len(utterances)
    })
    
    # Rejoin utterances with proper spacing
    tamil_text = ' '.join(utterances)
    
    # Final output
    metadata['final_output'] = tamil_text
    metadata['utterances'] = utterances
    
    if debug:
        print(f"\n[FINAL OUTPUT] {len(utterances)} utterance(s):")
        for i, utt in enumerate(utterances, 1):
            print(f"  {i}. {utt}")
        print("=" * 80 + "\n")
    
    return tamil_text, metadata


if __name__ == "__main__":
    # Test the pipeline
    test_cases = [
        "vanakam da mapla enna sogama iruka",
        "i am very happy today",
        "vanakam i am happy da",
        "love you da",
        "chennai la irunthu today vanthuten",
        "very sad and lonely",
    ]
    
    print("\n" + "🎯 " * 40)
    print("TESTING UNIFIED TAMIL PIPELINE")
    print("🎯 " * 40 + "\n")
    
    for test in test_cases:
        print(f"\n{'='*80}")
        print(f"INPUT: {test}")
        print('='*80)
        
        tamil, metadata = clean_tamil_pipeline(test, debug=True)
        
        print(f"\n✅ OUTPUT: {tamil}\n")
