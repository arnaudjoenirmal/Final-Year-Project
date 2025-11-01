# Logging and Processing Time Enhancement

## Overview
Added comprehensive logging and processing time tracking to all API endpoints for monitoring, debugging, and performance optimization.

## Features Added

### 1. Structured Logging
- **Log File**: `tamil_pipeline.log` (created automatically)
- **Console Output**: Real-time logs in terminal
- **Format**: `timestamp - name - level - message`
- **Request IDs**: Unique identifier for tracking each request

### 2. Processing Time Tracking
All endpoints now track:
- **Read Time**: File/input reading duration
- **Process Time**: Translation/transliteration duration  
- **VAD Time**: Emotion scoring duration
- **Total Time**: End-to-end request duration

### 3. Statistics
Each response includes:
- Input/output character counts
- Number of tokens processed
- Number of utterances generated
- ISO timestamp

## API Response Format

All endpoints now return additional fields:

```json
{
  "transliteration": "வணக்கம்...",
  "vad": {...},
  "per_token": [...],
  "utterances": [...],
  
  "processing_time": {
    "read_time_seconds": 0.001,
    "process_time_seconds": 0.523,
    "vad_time_seconds": 0.042,
    "total_time_seconds": 0.566
  },
  
  "stats": {
    "input_length": 125,
    "output_length": 98,
    "num_tokens": 15,
    "timestamp": "2025-10-31T14:23:45.123456"
  }
}
```

## Log Output Examples

### /debug-vad Endpoint:
```
2025-10-31 14:23:45 - __main__ - INFO - [debug_vad_1698764625123] Starting /debug-vad request
2025-10-31 14:23:45 - __main__ - INFO - [debug_vad_1698764625123] pipeline: True, corrections: True, debug: False
2025-10-31 14:23:45 - __main__ - INFO - [debug_vad_1698764625123] Input from text parameter
2025-10-31 14:23:45 - __main__ - INFO - [debug_vad_1698764625123] Input length: 42 characters
2025-10-31 14:23:45 - __main__ - INFO - [debug_vad_1698764625123] Starting text processing (pipeline=True)...
2025-10-31 14:23:45 - __main__ - INFO - [debug_vad_1698764625123] Text processing completed in 0.52s
2025-10-31 14:23:45 - __main__ - INFO - [debug_vad_1698764625123] Computing VAD scores...
2025-10-31 14:23:45 - __main__ - INFO - [debug_vad_1698764625123] VAD computation completed in 0.04s - 8 tokens
2025-10-31 14:23:45 - __main__ - INFO - [debug_vad_1698764625123] Generated 2 utterances
2025-10-31 14:23:45 - __main__ - INFO - [debug_vad_1698764625123] Total request completed in 0.57s
```

### /crawl Endpoint:
```
2025-10-31 14:25:12 - __main__ - INFO - [crawl_1698764712345] Starting /crawl request
2025-10-31 14:25:12 - __main__ - INFO - [crawl_1698764712345] URL: https://reddit.com/..., pipeline: True, corrections: True
2025-10-31 14:25:12 - __main__ - INFO - [crawl_1698764712345] Fetching Reddit submission...
2025-10-31 14:25:14 - __main__ - INFO - [crawl_1698764712345] Reddit fetch completed in 2.15s - 47 comments
2025-10-31 14:25:14 - __main__ - INFO - [crawl_1698764712345] Combined text length: 3524 characters
2025-10-31 14:25:14 - __main__ - INFO - [crawl_1698764712345] Starting text processing (pipeline=True)...
2025-10-31 14:25:16 - __main__ - INFO - [crawl_1698764712345] Text processing completed in 1.85s
2025-10-31 14:25:16 - __main__ - INFO - [crawl_1698764712345] Computing VAD scores...
2025-10-31 14:25:17 - __main__ - INFO - [crawl_1698764712345] VAD computation completed in 0.23s
2025-10-31 14:25:17 - __main__ - INFO - [crawl_1698764712345] Generated 12 utterances
2025-10-31 14:25:17 - __main__ - INFO - [crawl_1698764712345] Total request completed in 4.23s
```

### /upload-file Endpoint:
```
2025-10-31 14:26:30 - __main__ - INFO - [upload_1698764790456] Starting /upload-file request
2025-10-31 14:26:30 - __main__ - INFO - [upload_1698764790456] File: comments.csv, pipeline: True, corrections: True
2025-10-31 14:26:30 - __main__ - INFO - [upload_1698764790456] Parsed CSV with 234 rows
2025-10-31 14:26:30 - __main__ - INFO - [upload_1698764790456] File read completed in 0.12s - 8956 characters
2025-10-31 14:26:30 - __main__ - INFO - [upload_1698764790456] Starting text processing (pipeline=True)...
2025-10-31 14:26:33 - __main__ - INFO - [upload_1698764790456] Text processing completed in 2.54s
2025-10-31 14:26:33 - __main__ - INFO - [upload_1698764790456] Computing VAD scores...
2025-10-31 14:26:34 - __main__ - INFO - [upload_1698764790456] VAD computation completed in 0.67s - 156 tokens
2025-10-31 14:26:34 - __main__ - INFO - [upload_1698764790456] Generated 34 utterances
2025-10-31 14:26:34 - __main__ - INFO - [upload_1698764790456] Total request completed in 3.33s
```

## Error Logging

Errors are also logged:
```
2025-10-31 14:27:45 - __main__ - ERROR - [crawl_1698764865567] No URL provided
2025-10-31 14:28:12 - __main__ - ERROR - [upload_1698764892678] CSV parsing failed: No columns found
```

## Benefits

✅ **Performance Monitoring**: Track slow operations and bottlenecks
✅ **Debugging**: Trace requests end-to-end with unique IDs
✅ **Analytics**: Analyze processing times, text lengths, token counts
✅ **Error Tracking**: Log file captures all errors with context
✅ **Audit Trail**: Complete history of API usage with timestamps
✅ **Production Ready**: Structured logs suitable for log aggregation tools

## Usage

### View Logs in Real-Time:
```bash
# Windows PowerShell
Get-Content tamil_pipeline.log -Tail 50 -Wait

# Or simply open the file
notepad tamil_pipeline.log
```

### Test Processing Time:
```bash
curl -X POST "http://127.0.0.1:8000/debug-vad" \
  -F "text=vanakam i am happy" \
  -F "use_pipeline=true"
```

**Response includes**:
```json
{
  "processing_time": {
    "read_time_seconds": 0.001,
    "process_time_seconds": 0.423,
    "vad_time_seconds": 0.035,
    "total_time_seconds": 0.459
  }
}
```

## Files Modified

1. **app.py**:
   - Added `logging`, `time`, `datetime` imports
   - Configured logging with file + console handlers
   - Added timing to all 4 endpoints (`/crawl`, `/upload-file`, `/debug-vad`, `/debug-transliterate`)
   - Added request IDs for correlation
   - Added processing_time and stats to responses

## Log File Location

📁 **Path**: `c:\Users\purus\Downloads\fastapi_backend\tamil_pipeline.log`

The log file is automatically created on first request and appends new entries.

---

**Status**: ✅ Fully implemented
**Impact**: Complete visibility into system performance and request flow
