from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List
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
from phq.semantic_phq9_analyzer import SemanticPHQ9Analyzer

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

# Initialize PHQ-9 analyzer (do this once at startup)
try:
    # Get the correct path to phq_templates.json
    BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
    PHQ_TEMPLATES_PATH = os.path.join(BACKEND_DIR, 'phq', 'phq_templates.json')
    
    # Verify the file exists
    if not os.path.exists(PHQ_TEMPLATES_PATH):
        logger.error(f"PHQ-9 templates file not found at: {PHQ_TEMPLATES_PATH}")
        logger.error(f"Current working directory: {os.getcwd()}")
        logger.error(f"Backend directory: {BACKEND_DIR}")
        raise FileNotFoundError(f"phq_templates.json not found")
    
    logger.info(f"Loading PHQ-9 analyzer from: {PHQ_TEMPLATES_PATH}")
    phq9_analyzer = SemanticPHQ9Analyzer(templates_path=PHQ_TEMPLATES_PATH)
    logger.info("PHQ-9 analyzer initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize PHQ-9 analyzer: {e}")
    import traceback
    logger.error(traceback.format_exc())
    phq9_analyzer = None

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
    """Crawl reddit by URL, return cleaned text, VAD per sentence, and transliteration samples."""
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

    # Store ORIGINAL text for PHQ-9 analysis (before transliteration)
    original_texts = []
    post_body = submission["post"].get("body", "")
    if post_body:
        original_texts.append(post_body)
    for c in submission["comments"]:
        b = c.get("body")
        if b:
            original_texts.append(b)

    combined_original_text = "\n".join(original_texts)
    
    # combine for transliteration/VAD processing
    texts = []
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
    
    if use_pipeline:
        translit, metadata = clean_tamil_pipeline(
            combined_text,
            apply_corrections=apply_corrections,
            apply_normalization=True,
            debug=debug
        )
    else:
        translit = tanglish_to_tamil(combined_text)
        
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

    # Step 4: PHQ-9 analysis using ORIGINAL text (not transliterated)
    phq9_data = None
    if phq9_analyzer and original_texts:
        try:
            logger.info(f"[{request_id}] Computing PHQ-9 scores from {len(original_texts)} original utterances...")
            phq9_start = time.time()
            
            # Use ORIGINAL text, not transliterated
            phq9_scores = phq9_analyzer.analyze_utterances(
                original_texts,  # Changed from utterances_for_phq9
                normalize=True,
                phq_scale=False
            )
            
            phq9_total = phq9_analyzer.get_phq9_total(phq9_scores)
            phq9_severity = phq9_analyzer.interpret_severity(phq9_total, phq_scale=False)
            phq9_radar = phq9_analyzer.get_radar_data(phq9_scores)
            
            phq9_time = time.time() - phq9_start
            
            phq9_data = {
                "scores": phq9_scores,
                "total": phq9_total,
                "severity": phq9_severity,
                "radar_data": phq9_radar,
                "processing_time_seconds": round(phq9_time, 3)
            }
            
            logger.info(f"[{request_id}] PHQ-9 analysis completed: {phq9_severity} ({phq9_total:.2f})")
        except Exception as e:
            logger.error(f"[{request_id}] PHQ-9 analysis failed: {e}")
            import traceback
            logger.error(traceback.format_exc())
            phq9_data = None

    total_time = time.time() - start_time
    logger.info(f"[{request_id}] Total request completed in {total_time:.2f}s")

    result = {
        "post": submission["post"],
        "num_comments": len(submission["comments"]),
        "vad": vad_results,
        "phq9": phq9_data,
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
    
    # Handle utterances
    if use_pipeline and metadata.get('utterances'):
        utterances = metadata['utterances']
        vad_results = [aggregate_vad(utt, get_vad_from_tamil, prebatch=True)[0] for utt in utterances]
        result["vad"] = vad_results
        result["utterances"] = utterances
        result["utterance_count"] = len(utterances)
        logger.info(f"[{request_id}] Generated {len(utterances)} utterances")
    else:
        utterances = [translit]
        vad_results = aggregate_vad(translit, get_vad_from_tamil, prebatch=True)
        result["vad"] = vad_results
        result["utterances"] = utterances
        result["utterance_count"] = 1
        logger.info(f"[{request_id}] Only one utterance (fallback)")

    return pretty_json_response(result)


@app.post("/upload-file")
async def upload_file(file: UploadFile = File(...), 
                     apply_corrections: bool = Form(True),
                     use_pipeline: bool = Form(True),
                     debug: bool = Form(False)):
    """Accepts uploaded CSV/TXT with a column named 'body' or plain text."""
    start_time = time.time()
    request_id = f"upload_{int(time.time() * 1000)}"
    
    logger.info(f"[{request_id}] Starting /upload-file request")
    logger.info(f"[{request_id}] File: {file.filename}, pipeline: {use_pipeline}, corrections: {apply_corrections}")
    
    # Step 1: Read and parse file
    read_start = time.time()
    content = await file.read()
    text = ""
    original_text = ""  # Store original for PHQ-9
    name = file.filename.lower()
    
    if name.endswith('.csv'):
        try:
            df = pd.read_csv(io.BytesIO(content))
            if 'body' in df.columns:
                text = "\n".join(df['body'].dropna().astype(str).tolist())
                original_text = text  # Keep original
            else:
                text = df.iloc[:,0].dropna().astype(str).tolist()
                if isinstance(text, list):
                    original_text = "\n".join(text)
                    text = original_text
            logger.info(f"[{request_id}] Parsed CSV with {len(df)} rows")
        except Exception as e:
            logger.error(f"[{request_id}] CSV parsing failed: {e}")
            return {"error": f"failed to parse csv: {e}"}
    else:
        try:
            text = content.decode('utf-8')
            original_text = text  # Keep original
        except Exception:
            text = content.decode('latin-1', errors='ignore')
            original_text = text
    
    read_time = time.time() - read_start
    logger.info(f"[{request_id}] File read completed in {read_time:.2f}s - {len(text)} characters")

    if not text:
        logger.error(f"[{request_id}] No textual content found")
        return {"error": "no textual content found in file"}

    # Step 2: Process text
    process_start = time.time()
    logger.info(f"[{request_id}] Starting text processing (pipeline={use_pipeline})...")
    
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
        if contains_tamil(text):
            translit = text
            correction_info = []
        else:
            translit = tanglish_to_tamil(text)
            
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

    # Step 4: PHQ-9 analysis using ORIGINAL text
    phq9_data = None
    if phq9_analyzer and original_text:
        try:
            # Split original text into sentences/utterances
            original_utterances = [s.strip() for s in original_text.split('\n') if s.strip()]
            
            if original_utterances:
                logger.info(f"[{request_id}] Computing PHQ-9 scores from {len(original_utterances)} original utterances...")
                phq9_start = time.time()
                
                # Use ORIGINAL text, not transliterated
                phq9_scores = phq9_analyzer.analyze_utterances(
                    original_utterances,
                    normalize=True,
                    phq_scale=False
                )
                
                phq9_total = phq9_analyzer.get_phq9_total(phq9_scores)
                phq9_severity = phq9_analyzer.interpret_severity(phq9_total, phq_scale=False)
                phq9_radar = phq9_analyzer.get_radar_data(phq9_scores)
                
                phq9_time = time.time() - phq9_start
                
                phq9_data = {
                    "scores": phq9_scores,
                    "total": phq9_total,
                    "severity": phq9_severity,
                    "radar_data": phq9_radar,
                    "processing_time_seconds": round(phq9_time, 3)
                }
                
                logger.info(f"[{request_id}] PHQ-9 analysis completed: {phq9_severity} ({phq9_total:.2f})")
        except Exception as e:
            logger.error(f"[{request_id}] PHQ-9 analysis failed: {e}")
            import traceback
            logger.error(traceback.format_exc())
            phq9_data = None

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
        utterances = metadata['utterances']
        # Compute VAD for each utterance using aggregate_vad:
        vad_results = aggregate_vad('\n'.join(utterances), get_vad_from_tamil, prebatch=True)

        # Add utterances and VAD results to your response:
        result["vad"] = vad_results
        result["utterances"] = utterances
        result["utterance_count"] = len(utterances)
        logger.info(f"[{request_id}] Generated {len(utterances)} utterances")
        
        # If you have utterances, always use them for VAD
        if use_pipeline and metadata.get('utterances'):
            utterances = metadata['utterances']
            vad_results = aggregate_vad('\n'.join(utterances), get_vad_from_tamil, prebatch=True)
            result["utterances"] = utterances
            result["utterance_count"] = len(utterances)
            logger.info(f"[{request_id}] Generated {len(utterances)} utterances")
        else:
            # Fallback: treat the whole text as one utterance
            utterances = [translit]
            vad_results = aggregate_vad(translit, get_vad_from_tamil, prebatch=True)
            result["utterances"] = utterances
            result["utterance_count"] = 1
            logger.info(f"[{request_id}] Only one utterance (fallback)")
        result["vad"] = vad_results
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


@app.post("/analyze-phq9")
async def analyze_phq9_endpoint(
    utterances: List[str] = Form(...),
    normalize: bool = Form(True),
    phq_scale: bool = Form(False)
):
    """
    Analyze utterances for PHQ-9 depression indicators using semantic similarity.
    
    Args:
        utterances: List of text utterances (JSON array as string or actual list)
        normalize: If True, normalize scores to 0-1 range (default: True)
        phq_scale: If True, convert to PHQ-9's 0-3 scale (default: False)
    
    Returns:
        JSON with PHQ-9 scores, total score, severity, and radar chart data
    """
    start_time = time.time()
    request_id = f"phq9_{int(time.time() * 1000)}"
    
    logger.info(f"[{request_id}] Starting /analyze-phq9 request")
    logger.info(f"[{request_id}] Utterances: {len(utterances)}, normalize: {normalize}, phq_scale: {phq_scale}")
    
    if not phq9_analyzer:
        logger.error(f"[{request_id}] PHQ-9 analyzer not initialized")
        return {"error": "PHQ-9 analyzer not available"}
    
    if not utterances:
        logger.error(f"[{request_id}] No utterances provided")
        return {"error": "utterances are required"}
    
    try:
        # Analyze utterances
        analysis_start = time.time()
        scores = phq9_analyzer.analyze_utterances(
            utterances,
            normalize=normalize,
            phq_scale=phq_scale
        )
        analysis_time = time.time() - analysis_start
        
        # Calculate total and severity
        total_score = phq9_analyzer.get_phq9_total(scores)
        severity = phq9_analyzer.interpret_severity(total_score, phq_scale=phq_scale)
        
        # Get radar data (always use normalized for radar)
        if phq_scale:
            # Convert back to normalized for radar
            normalized_scores = {q: s/3 for q, s in scores.items()}
        else:
            normalized_scores = scores
        
        radar_data = phq9_analyzer.get_radar_data(normalized_scores)
        
        total_time = time.time() - start_time
        logger.info(f"[{request_id}] PHQ-9 analysis completed in {total_time:.2f}s")
        logger.info(f"[{request_id}] Total score: {total_score:.2f}, Severity: {severity}")
        
        result = {
            "phq9_scores": scores,
            "phq9_total": total_score,
            "phq9_severity": severity,
            "radar_data": radar_data,
            "scale": "phq9" if phq_scale else "normalized",
            "processing_time": {
                "analysis_time_seconds": round(analysis_time, 3),
                "total_time_seconds": round(total_time, 3)
            },
            "stats": {
                "num_utterances": len(utterances),
                "timestamp": datetime.now().isoformat()
            }
        }
        
        return pretty_json_response(result)
        
    except Exception as e:
        logger.error(f"[{request_id}] Error during PHQ-9 analysis: {e}")
        return {"error": str(e)}
