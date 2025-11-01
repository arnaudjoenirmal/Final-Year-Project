from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
import io
import os
import sys
import pandas as pd
import re
import unicodedata
import json
import logging
import time
from datetime import datetime

# Make the project src directory importable (so we reuse existing modules)
PROJECT_ROOT = os.path.dirname(os.path.dirname(__file__))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from tanglish_to_tamil import (
    tanglish_to_tamil, 
    normalize_tamil_word, 
    correct_transliteration_tokens
)
from tamil_pipeline import clean_tamil_pipeline
from vad import aggregate_vad, get_vad_from_tamil, per_token_vad

from reddit_crawler import fetch_submission_text

app = FastAPI(title="Tamil Transliteration + VAD API")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('tamil_pipeline.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Add CORS middleware to handle OPTIONS preflight requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins - restrict in production
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods including OPTIONS
    allow_headers=["*"],  # Allows all headers
)

def pretty_json_response(data):
    """Return a pretty-printed JSON response for better readability"""
    return JSONResponse(
        content=data,
        media_type="application/json; charset=utf-8"
    )


def contains_tamil(text: str) -> bool:
    """Return True if the string contains at least one character from the Tamil script."""
    for ch in text:
        try:
            if 'TAMIL' in unicodedata.name(ch):
                return True
        except ValueError:
            # Some control chars may not have a name
            continue
    return False

class CrawlRequest(BaseModel):
    url: Optional[str] = None


@app.post("/crawl")
async def crawl_and_process(url: str = Form(None), 
                           apply_corrections: bool = Form(True),
                           use_pipeline: bool = Form(True),
                           debug: bool = Form(False)):
    """Crawl reddit by URL, return cleaned text, VAD per sentence, and transliteration samples.
    
    Args:
        url: Reddit URL to crawl
        apply_corrections: If True, apply dictionary-based corrections to transliteration (default: True)
        use_pipeline: If True, use unified pipeline with English translation (default: True)
        debug: If True, print detailed processing steps (default: False)
    """
    start_time = time.time()
    request_id = f"crawl_{int(time.time() * 1000)}"
    
    logger.info(f"[{request_id}] Starting /crawl request")
    logger.info(f"[{request_id}] URL: {url}, pipeline: {use_pipeline}, corrections: {apply_corrections}")
    
    if not url:
        logger.error(f"[{request_id}] No URL provided")
        return {"error": "url is required"}

    # Step 1: Fetch Reddit data
    fetch_start = time.time()
    logger.info(f"[{request_id}] Fetching Reddit submission...")
    submission = fetch_submission_text(url)
    fetch_time = time.time() - fetch_start
    logger.info(f"[{request_id}] Reddit fetch completed in {fetch_time:.2f}s - {len(submission['comments'])} comments")

    # combine post body and all comments into one text blob
    texts = []
    post_body = submission["post"].get("body", "")
    if post_body:
        texts.append(post_body)
    for c in submission["comments"]:
        b = c.get("body")
        if b:
            texts.append(b)

    combined_text = "\n".join(texts)
    text_length = len(combined_text)
    logger.info(f"[{request_id}] Combined text length: {text_length} characters")

    # Step 2: Process text (transliteration/translation)
    process_start = time.time()
    logger.info(f"[{request_id}] Starting text processing (pipeline={use_pipeline})...")
    
    # Use unified pipeline or legacy transliteration
    if use_pipeline:
        translit, metadata = clean_tamil_pipeline(
            combined_text,
            apply_corrections=apply_corrections,
            apply_normalization=True,
            debug=debug
        )
    else:
        # Legacy: transliteration: convert the raw combined text from tanglish to tamil
        translit = tanglish_to_tamil(combined_text)
        
        # Optionally correct transliteration using dictionary matching
        if apply_corrections:
            corrected_translit, _ = correct_transliteration_tokens(translit, debug=False)
            translit = corrected_translit
    
    process_time = time.time() - process_start
    logger.info(f"[{request_id}] Text processing completed in {process_time:.2f}s")

    # Step 3: Compute VAD scores
    vad_start = time.time()
    logger.info(f"[{request_id}] Computing VAD scores...")
    vad_results = aggregate_vad(translit, get_vad_from_tamil)
    vad_time = time.time() - vad_start
    logger.info(f"[{request_id}] VAD computation completed in {vad_time:.2f}s")

    total_time = time.time() - start_time
    logger.info(f"[{request_id}] Total request completed in {total_time:.2f}s")

    result = {
        "post": submission["post"],
        "num_comments": len(submission["comments"]),
        "vad": vad_results,
        "transliteration_sample": translit[:500],
        "pipeline_used": "unified" if use_pipeline else "legacy",
        "processing_time": {
            "fetch_time_seconds": round(fetch_time, 3),
            "process_time_seconds": round(process_time, 3),
            "vad_time_seconds": round(vad_time, 3),
            "total_time_seconds": round(total_time, 3)
        },
        "stats": {
            "input_length": text_length,
            "output_length": len(translit),
            "num_comments": len(submission["comments"]),
            "timestamp": datetime.now().isoformat()
        }
    }
    
    # Add utterances if using pipeline
    if use_pipeline and metadata.get('utterances'):
        result["utterances"] = metadata['utterances']
        result["utterance_count"] = len(metadata['utterances'])
        logger.info(f"[{request_id}] Generated {len(metadata['utterances'])} utterances")
    
    return pretty_json_response(result)


@app.post("/upload-file")
async def upload_file(file: UploadFile = File(...), 
                     apply_corrections: bool = Form(True),
                     use_pipeline: bool = Form(True),
                     debug: bool = Form(False)):
    """Accepts uploaded CSV/ TXT with a column named 'body' or plain text. Processes similarly to /crawl.
    
    Args:
        file: Uploaded file (CSV or text)
        apply_corrections: If True, apply dictionary-based corrections to transliteration (default: True)
        use_pipeline: If True, use unified pipeline with English translation (default: True)
        debug: If True, print detailed processing steps (default: False)
    """
    start_time = time.time()
    request_id = f"upload_{int(time.time() * 1000)}"
    
    logger.info(f"[{request_id}] Starting /upload-file request")
    logger.info(f"[{request_id}] File: {file.filename}, pipeline: {use_pipeline}, corrections: {apply_corrections}")
    
    # Step 1: Read and parse file
    read_start = time.time()
    content = await file.read()
    text = ""
    name = file.filename.lower()
    
    if name.endswith('.csv'):
        try:
            df = pd.read_csv(io.BytesIO(content))
            if 'body' in df.columns:
                text = "\n".join(df['body'].dropna().astype(str).tolist())
            else:
                # try first text column
                text = df.iloc[:,0].dropna().astype(str).tolist()
                if isinstance(text, list):
                    text = "\n".join(text)
            logger.info(f"[{request_id}] Parsed CSV with {len(df)} rows")
        except Exception as e:
            logger.error(f"[{request_id}] CSV parsing failed: {e}")
            return {"error": f"failed to parse csv: {e}"}
    else:
        try:
            text = content.decode('utf-8')
        except Exception:
            text = content.decode('latin-1', errors='ignore')
    
    read_time = time.time() - read_start
    logger.info(f"[{request_id}] File read completed in {read_time:.2f}s - {len(text)} characters")

    if not text:
        logger.error(f"[{request_id}] No textual content found")
        return {"error": "no textual content found in file"}

    # Step 2: Process text
    process_start = time.time()
    logger.info(f"[{request_id}] Starting text processing (pipeline={use_pipeline})...")
    
    # Use unified pipeline or legacy mode
    if use_pipeline:
        translit, metadata = clean_tamil_pipeline(
            text,
            apply_corrections=apply_corrections,
            apply_normalization=True,
            debug=debug
        )
        correction_info = []
        for step in metadata.get('steps', []):
            if step['step'] == 'dictionary_correction':
                correction_info = step.get('corrections', [])
    else:
        # Legacy: if input already contains Tamil characters, skip transliteration
        if contains_tamil(text):
            translit = text
            correction_info = []
        else:
            translit = tanglish_to_tamil(text)
            
            # Optionally correct transliteration using dictionary matching
            if apply_corrections:
                corrected_translit, correction_info = correct_transliteration_tokens(translit, debug=False)
                translit = corrected_translit
            else:
                correction_info = []
    
    process_time = time.time() - process_start
    logger.info(f"[{request_id}] Text processing completed in {process_time:.2f}s")

    # Step 3: Run VAD on final Tamil text
    vad_start = time.time()
    logger.info(f"[{request_id}] Computing VAD scores...")
    vad_results = aggregate_vad(translit, get_vad_from_tamil)
    tokens = per_token_vad(translit)
    vad_time = time.time() - vad_start
    logger.info(f"[{request_id}] VAD computation completed in {vad_time:.2f}s - {len(tokens)} tokens")

    total_time = time.time() - start_time
    logger.info(f"[{request_id}] Total request completed in {total_time:.2f}s")

    result = {
        "vad": vad_results, 
        "per_token": tokens, 
        "transliteration_sample": translit[:500],
        "corrections_applied": len([c for c in correction_info if c.get('matched', False)]) if correction_info else 0,
        "pipeline_used": "unified" if use_pipeline else "legacy",
        "processing_time": {
            "read_time_seconds": round(read_time, 3),
            "process_time_seconds": round(process_time, 3),
            "vad_time_seconds": round(vad_time, 3),
            "total_time_seconds": round(total_time, 3)
        },
        "stats": {
            "input_length": len(text),
            "output_length": len(translit),
            "num_tokens": len(tokens),
            "timestamp": datetime.now().isoformat()
        }
    }
    
    # Add utterances if using pipeline
    if use_pipeline and metadata.get('utterances'):
        result["utterances"] = metadata['utterances']
        result["utterance_count"] = len(metadata['utterances'])
        logger.info(f"[{request_id}] Generated {len(metadata['utterances'])} utterances")
    
    return pretty_json_response(result)



@app.post('/debug-vad')
async def debug_vad(file: UploadFile = File(None), 
                   text: str = Form(None), 
                   debug: bool = Form(False), 
                   apply_corrections: bool = Form(True),
                   use_pipeline: bool = Form(True)):
    """Return per-token VAD diagnostics for a file or text without persisting.

    Useful to see which tokens are in cache and which are neutral.
    
    Args:
        file: Optional file upload
        text: Optional text input
        debug: If True, print detailed processing steps (default: False)
        apply_corrections: If True, apply dictionary-based corrections (default: True)
        use_pipeline: If True, use unified pipeline with English translation (default: True)
    """
    start_time = time.time()
    request_id = f"debug_vad_{int(time.time() * 1000)}"
    
    logger.info(f"[{request_id}] Starting /debug-vad request")
    logger.info(f"[{request_id}] pipeline: {use_pipeline}, corrections: {apply_corrections}, debug: {debug}")
    
    # Step 1: Read input
    read_start = time.time()
    content = ''
    if file is not None:
        raw = await file.read()
        try:
            content = raw.decode('utf-8')
        except Exception:
            content = raw.decode('latin-1', errors='ignore')
        logger.info(f"[{request_id}] Input from file: {file.filename}")
    elif text is not None:
        content = text
        logger.info(f"[{request_id}] Input from text parameter")

    read_time = time.time() - read_start

    if not content:
        logger.error(f"[{request_id}] No input provided")
        return {"error": "no input provided"}
    
    logger.info(f"[{request_id}] Input length: {len(content)} characters")

    # Step 2: Process text
    process_start = time.time()
    logger.info(f"[{request_id}] Starting text processing (pipeline={use_pipeline})...")
    
    # Use the unified pipeline for better results
    if use_pipeline:
        translit, metadata = clean_tamil_pipeline(
            content,
            apply_corrections=apply_corrections,
            apply_normalization=True,
            debug=debug
        )
        correction_info = []
        for step in metadata.get('steps', []):
            if step['step'] == 'dictionary_correction':
                correction_info = step.get('corrections', [])
    else:
        # Legacy mode: skip transliteration if already Tamil
        if contains_tamil(content):
            translit = content
            correction_info = []
        else:
            translit = tanglish_to_tamil(content)
            
            # Optionally apply dictionary correction with optional debug output
            if apply_corrections:
                corrected_translit, correction_info = correct_transliteration_tokens(translit, debug=debug)
                translit = corrected_translit
            else:
                correction_info = []
    
    process_time = time.time() - process_start
    logger.info(f"[{request_id}] Text processing completed in {process_time:.2f}s")
    
    # Step 3: Compute VAD
    vad_start = time.time()
    logger.info(f"[{request_id}] Computing VAD scores...")
    tokens = per_token_vad(translit)
    vad_time = time.time() - vad_start
    logger.info(f"[{request_id}] VAD computation completed in {vad_time:.2f}s - {len(tokens)} tokens")
    
    total_time = time.time() - start_time
    logger.info(f"[{request_id}] Total request completed in {total_time:.2f}s")
    
    result = {
        "original": content, 
        "transliteration": translit, 
        "per_token": tokens,
        "correction_info": correction_info if correction_info else [],
        "corrections_applied": len([c for c in correction_info if c.get('matched', False)]) if correction_info else 0,
        "unmatched_tokens": [c['original'] for c in correction_info if not c.get('matched', False)] if correction_info else [],
        "pipeline_used": "unified" if use_pipeline else "legacy",
        "processing_time": {
            "read_time_seconds": round(read_time, 3),
            "process_time_seconds": round(process_time, 3),
            "vad_time_seconds": round(vad_time, 3),
            "total_time_seconds": round(total_time, 3)
        },
        "stats": {
            "input_length": len(content),
            "output_length": len(translit),
            "num_tokens": len(tokens),
            "timestamp": datetime.now().isoformat()
        }
    }
    
    # Add utterances if using pipeline
    if use_pipeline and metadata.get('utterances'):
        result["utterances"] = metadata['utterances']
        result["utterance_count"] = len(metadata['utterances'])
        logger.info(f"[{request_id}] Generated {len(metadata['utterances'])} utterances")
    
    return pretty_json_response(result)


@app.post('/debug-transliterate')
async def debug_transliterate(file: UploadFile = File(None), text: str = Form(None), debug: bool = Form(False)):
    """Return tokenized input and transliteration per token for debugging.

    Accepts either a file upload (plain text or csv) or a form field `text`.
    Does not persist anything — helpful to inspect how tokens map to Tamil.
    Optionally enable debug flag to see tokens with no dictionary match.
    """
    content = ''
    if file is not None:
        raw = await file.read()
        try:
            content = raw.decode('utf-8')
        except Exception:
            content = raw.decode('latin-1', errors='ignore')
    elif text is not None:
        content = text

    if not content:
        return {"error": "no input provided"}

    # simple whitespace tokenization on the original Latin text
    tokens = [t for t in content.replace('\n', ' ').split(' ') if t.strip()]
    per_token = []
    for t in tokens:
        # transliterate per token only if it's tanglish
        if contains_tamil(t):
            per_token.append({
                "original": t, 
                "transliteration": t,
                "corrected": t,
                "matched": True
            })
        else:
            trans = tanglish_to_tamil(t)
            corrected, info = correct_transliteration_tokens(trans, debug=False)
            per_token.append({
                "original": t, 
                "transliteration": trans,
                "corrected": corrected,
                "matched": info[0]['matched'] if info else False,
                "distance": info[0]['distance'] if info else float('inf')
            })

    # full transliteration as well (skip if already Tamil)
    if contains_tamil(content):
        full = content
        full_corrected = content
        correction_info = []
    else:
        full = tanglish_to_tamil(content)
        full_corrected, correction_info = correct_transliteration_tokens(full, debug=debug)
    
    result = {
        "original": content, 
        "tokens": tokens, 
        "per_token": per_token, 
        "full_transliteration": full,
        "full_corrected": full_corrected,
        "corrections_applied": len([c for c in correction_info if c.get('matched', False)]),
        "unmatched_tokens": [c['original'] for c in correction_info if not c.get('matched', False)]
    }
    
    return pretty_json_response(result)


def contains_tamil(text: str) -> bool:
    """Return True if the string contains at least one character from the Tamil script."""
    for ch in text:
        try:
            if 'TAMIL' in unicodedata.name(ch):
                return True
        except ValueError:
            # Some control chars may not have a name
            continue
    return False
