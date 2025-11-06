import json
import regex as re
import time
from google import genai
# Note: If your Python environment still gives an ImportError for 'APIError', 
# you can comment out the line below and rely on the general Exception handler.
# from google.genai.errors import APIError # Using general exception for maximum compatibility

# -------------------------------
# CONFIG
# -------------------------------
API_KEY = "AIzaSyBW00EHywIr4pNV8YGBUXjqUeuU1bzV2Os" 
CACHE_FILE = "tanglish_to_tamil.json"
GEMINI_MODEL = "gemini-2.5-flash" 

# -------------------------------
# INITIALIZE GEMINI CLIENT
# -------------------------------
try:
    # We pass the API key explicitly here.
    client = genai.Client(api_key=API_KEY)
    print("Gemini Client Initialized successfully.")
except Exception as e:
    print(f"Error initializing Gemini client: {e}")
    print("Please check your API key and network connection.")
    exit()

# -------------------------------
# LOAD CACHE
# -------------------------------
try:
    with open(CACHE_FILE, "r", encoding="utf-8") as f:
        cache = json.load(f)
    print(f"Cache loaded with {len(cache)} unique words.")
except FileNotFoundError:
    cache = {}
    print("Cache file not found. Starting with an empty cache.")
except json.JSONDecodeError:
    cache = {}
    print("Cache file corrupted. Starting with an empty cache.")

# -------------------------------
# CLEAN TAMIL TEXT
# -------------------------------
def clean_tamil(text):
    """Keep only Tamil characters, discarding any numbering or commentary."""
    # This regex range covers most common Tamil characters and ligatures
    return re.sub(r"[^ஂ-௺]", "", text).strip()

# -------------------------------
# API CALL: TRANSLITERATE ENTIRE SENTENCE
# -------------------------------
def transliterate_sentence_api(sentence):
    """
    Sends the entire sentence to the Gemini API in a single call.
    This is highly efficient for the low RPM limit.
    """
    # The prompt instructs the model to return ONLY the translated text.
    prompt = (
        "Transliterate the following Tanglish text block into continuous Tamil script. "
        "Maintain all punctuation and spacing between words. "
        "Output ONLY the transliterated Tamil text block. Do not add any commentary or notes."
        f"\n\nTanglish: '{sentence}'"
    )
    
    try:
        # Use a low temperature for high reliability and consistent transliteration
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config={'temperature': 0.1}
        )
        
        # We return the raw, spaced text from the model
        return response.text.strip()
        
    except Exception as e:
        # Catches APIError, Quota errors, and general exceptions
        print(f"\n[x] GEMINI API ERROR for block: {e}")
        # Add a short delay to respect potential rate limits if it was a RESOURCE_EXHAUSTED error
        time.sleep(2) 
        return sentence # Return original sentence on API failure

# -------------------------------
# MAIN ENGINE (Checks Cache, Calls API, Updates Cache)
# -------------------------------
def transliterate_text_block(sentence):
    """
    Handles the entire transliteration process for a large text block.
    """
    original_words = sentence.split()
    
    # 1. Check if all words are already in the cache
    all_cached = all(word in cache for word in original_words)

    if all_cached:
        # Use local cache for all words (0 API calls!)
        tamil_words = [cache[word] for word in original_words]
        print("✅ Entire block reconstructed from cache (0 API calls).")
        full_sentence = " ".join(tamil_words)
    else:
        # 2. Call the API for the whole sentence (1 API call!)
        print(f"🌍 Calling Gemini API for text block ({len(original_words)} words)...")
        full_sentence = transliterate_sentence_api(sentence)
        
        # 3. Process API result locally and update cache
        
        # This is a heuristic: we assume the word count is preserved.
        translated_words = full_sentence.split()
        
        if len(original_words) == len(translated_words):
            print("💾 Updating cache based on API response...")
            for orig_word, tamil_word in zip(original_words, translated_words):
                # Clean the Tamil word to ensure the cache is clean
                cleaned_tamil_word = clean_tamil(tamil_word)
                
                # Only cache if the word was successfully translated (i.e., not empty, not the original word, etc.)
                if cleaned_tamil_word: 
                    cache[orig_word] = cleaned_tamil_word

        else:
            # This happens if the model adds/removes words or punctuation changes splitting behavior
            print(f"⚠️ Warning: Original word count ({len(original_words)}) != Translated word count ({len(translated_words)}).")
            print("Cache was NOT updated for this text block to prevent mis-mapping words.")


    # Save updated cache to disk
    try:
        with open(CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(cache, f, ensure_ascii=False, indent=4, ensure_ascii=False)
    except Exception as e:
        print(f"[x] Error saving cache: {e}")

    # Show final result
    print("\n🈺 Tamil Translation:")
    print(full_sentence)
    return full_sentence

# -------------------------------
# RUN
# -------------------------------
if __name__ == "__main__":
    text = input("Enter Tanglish sentence/text block: ").strip()
    if text:
        transliterate_text_block(text)
    else:
        print("No input provided.")