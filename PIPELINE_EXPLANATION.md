# Final-Year-Project: Mental Health Analysis System Pipeline

## Project Overview
This is a **Tamil/English Mental Health Analysis System** that detects depression indicators and mental health patterns from social media text (Reddit) using natural language processing and affective computing. The system consists of:
- **Backend**: Python (FastAPI) with NLP pipelines
- **Frontend**: React + TypeScript (Vite) web application
- **Data**: Reddit posts/comments in Tamil, Tanglish (romanized Tamil), and English

---

## Complete System Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                      DATA COLLECTION LAYER                      │
├─────────────────────────────────────────────────────────────────┤
│  Reddit Crawler (reddit_crawler.py)                             │
│  ↓                                                              │
│  Raw Posts & Comments (multiple scraping runs)                 │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│                    DATA CLEANING & STORAGE                      │
├─────────────────────────────────────────────────────────────────┤
│  Web Scraping/ folder processes raw data                       │
│  ↓                                                              │
│  Cleaned CSVs: cleaned.csv, cleaned1-5.csv                    │
│  Datasets folder: reddit_tamil_vad_dataset.csv, etc.          │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────────┐
│                    USER INPUT / API ENDPOINT                     │
├──────────────────────────────────────────────────────────────────┤
│  Frontend sends text input to backend /analyze endpoint         │
└──────────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────────┐
│            1. TEXT PREPROCESSING & NORMALIZATION                 │
├──────────────────────────────────────────────────────────────────┤
│  Input: Mixed Tamil/Tanglish/English text                       │
│                                                                  │
│  Split into utterances (split_into_utterances_tamil):          │
│  • Remove noise (URLs, media links, Reddit usernames)          │
│  • Split on sentence delimiters (., !, ?, :, ;, ,)            │
│  • Split on Tamil conjunctions                                 │
│  • Chunk long utterances (max 20 words each)                   │
│  • Filter out fragments < 2 words                              │
│                                                                  │
│  Output: List of normalized utterances                         │
└──────────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────────┐
│           2. LANGUAGE DETECTION & CONVERSION                     │
├──────────────────────────────────────────────────────────────────┤
│  Detect Language Segments (language_detector.py):              │
│  • Identify Tamil characters (Unicode check)                   │
│  • Identify Tanglish (romanized Tamil patterns)               │
│  • Identify English words/phrases                              │
│                                                                  │
│  For each segment:                                             │
│  ┌─ TAMIL SEGMENT ─────────────────────────────────────────┐  │
│  │ Already in Tamil script, normalize characters            │  │
│  │ (e.g., ஸ→ச, ணு→ஐ variations)                           │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌─ TANGLISH SEGMENT ──────────────────────────────────────┐  │
│  │ Convert Tanglish (romanized) → Tamil script             │  │
│  │ Uses: tanglish_to_tamil.json mapping                    │  │
│  │ Example: "summa iruka" → "சும்ம இருக"                 │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌─ ENGLISH SEGMENT ───────────────────────────────────────┐  │
│  │ Translate English → Tamil using Google Translate        │  │
│  │ Cached to avoid repeated API calls                      │  │
│  │ Example: "depression" → "மனச்சோர்வு"                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Output: Pure Tamil text                                       │
└──────────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────────┐
│        3. TAMIL TEXT NORMALIZATION & DICTIONARY CORRECTION       │
├──────────────────────────────────────────────────────────────────┤
│  normalize_tamil_word():                                        │
│  • Standardize Tamil character variations                       │
│  • Handle compound characters and diacritics                    │
│                                                                  │
│  correct_transliteration_tokens() (Levenshtein distance):      │
│  • Check against Tamil dictionary (tamil_dic_cleaned.txt)      │
│  • Fix typos/misspellings using edit distance                  │
│  • Find closest match from 9k Tamil words                       │
│                                                                  │
│  Output: Clean, standardized Tamil text                        │
└──────────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────────┐
│           4. AFFECTIVE LEXICON SCORING (VAD METRICS)             │
├──────────────────────────────────────────────────────────────────┤
│  VAD = Valence, Arousal, Dominance (affective computing)       │
│                                                                  │
│  For each word/token:                                          │
│                                                                  │
│  ┌─ TAMIL WORDS ────────────────────────────────────────────┐  │
│  │ Lookup in Tamil_anew_combined.json                       │  │
│  │ Gets (Valence, Arousal, Dominance) scores              │  │
│  │ Fallback: Get English translation, look up in ANEW      │  │
│  │ Default values if not found: (5.0, 5.0, 5.0) - neutral  │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌─ ENGLISH WORDS ────────────────────────────────────────────┐  │
│  │ Lookup in English ANEW dictionary (english_anew.csv)     │  │
│  │ Gets (Valence, Arousal, Dominance) scores              │  │
│  │ Default: (5.0, 5.0, 5.0) - neutral if not found        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Valence:   0-10 (negative ← → positive)                      │
│  Arousal:   0-10 (calm ← → excited)                           │
│  Dominance: 0-10 (submissive ← → dominant)                    │
│                                                                  │
│  Output: Per-token VAD scores                                  │
└──────────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────────┐
│         5. AGGREGATE METRICS COMPUTATION                         │
├──────────────────────────────────────────────────────────────────┤
│  aggregate_vad():                                               │
│  • Average Valence across all tokens                            │
│  • Average Arousal across all tokens                            │
│  • Average Dominance across all tokens                          │
│                                                                  │
│  Interpretations:                                              │
│  • Low Valence (< 4-5):  Negative, depressive sentiment        │
│  • Low Arousal (< 4-5):  Low energy, fatigue                   │
│  • Low Dominance (< 4-5): Weakness, lack of control            │
│                                                                  │
│  Output: Aggregated affective metrics for text                 │
└──────────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────────┐
│    6. PHQ-9 SEMANTIC ANALYSIS (DEPRESSION INDICATORS)            │
├──────────────────────────────────────────────────────────────────┤
│  SemanticPHQ9Analyzer (semantic_phq9_analyzer.py):             │
│                                                                  │
│  PHQ-9 = Patient Health Questionnaire-9 (Clinical Tool)        │
│  Maps 9 depression symptom dimensions:                         │
│                                                                  │
│  Q1: Anhedonia (loss of interest/pleasure)                     │
│  Q2: Depressed mood                                            │
│  Q3: Sleep problems (insomnia/hypersomnia)                     │
│  Q4: Fatigue / low energy                                      │
│  Q5: Appetite / weight changes                                 │
│  Q6: Guilt / worthlessness                                     │
│  Q7: Concentration problems                                    │
│  Q8: Psychomotor changes (slowness/agitation)                  │
│  Q9: Suicidal ideation                                         │
│                                                                  │
│  Technical Process:                                            │
│  1. Load PHQ-9 templates.json (symptom phrases in Tamil/English)│
│  2. Use multilingual sentence transformer embeddings           │
│     (paraphrase-multilingual-MiniLM-L12-v2)                   │
│  3. Encode user utterance to embedding vector                  │
│  4. Compute semantic similarity between user text and          │
│     each template phrase (cosine similarity)                   │
│  5. Aggregate similarity scores to get Q1-Q9 scores (0-3)     │
│  6. Total PHQ-9 Score = Sum of Q1-Q9 (0-27)                  │
│                                                                  │
│  Severity Interpretation:                                      │
│  • 0-4:   Minimal/No depression                               │
│  • 5-9:   Mild depression                                     │
│  • 10-14: Moderate depression                                 │
│  • 15-19: Moderately severe depression                        │
│  • 20-27: Severe depression                                   │
│                                                                  │
│  Output: PHQ-9 scores (Q1-Q9) + Total score                   │
└──────────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────────┐
│              7. COMBINED ANALYSIS & RESULTS                      │
├──────────────────────────────────────────────────────────────────┤
│  Aggregate all metrics:                                         │
│  • Affective metrics (Valence, Arousal, Dominance)            │
│  • PHQ-9 depression scores                                    │
│  • Individual symptom dimensions (Q1-Q9)                       │
│  • Difficulty/severity level                                   │
│                                                                  │
│  Generate insight text explaining results                      │
│  Package as JSON response                                      │
└──────────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────────┐
│            8. FRONTEND VISUALIZATION & DASHBOARD                 │
├──────────────────────────────────────────────────────────────────┤
│  Frontend Components (React/TypeScript):                        │
│                                                                  │
│  src/Analyzer/Analyzer.tsx:                                    │
│  • Input form for user text                                    │
│  • Send request to backend /analyze endpoint                   │
│  • Display loading state                                       │
│                                                                  │
│  src/hooks/usePHQ9Analyzer.ts:                                 │
│  • Custom React hook manages API communication                │
│  • Fetches results from backend                               │
│  • Manages analysis state                                      │
│                                                                  │
│  src/Results/DepressionInsightDashboard.tsx:                  │
│  • Visualize VAD metrics (charts)                              │
│  • Display PHQ-9 scores and severity                           │
│  • Show individual symptom breakdown                           │
│  • Provide clinical interpretation                             │
│                                                                  │
│  src/Results/Results.tsx:                                      │
│  • Overall results page                                        │
│  • Integration with dashboard and visualizations               │
│                                                                  │
│  src/Login/ components:                                        │
│  • User authentication (login/register)                        │
│  • Session management                                          │
│                                                                  │
│  UI Polish:                                                    │
│  • Aurora, Particles, Prism components (animations)           │
│  • Responsive design                                           │
│  • Visual feedback and insights                                │
└──────────────────────────────────────────────────────────────────┘
```

---

## Data Files & Resources

### Language & Lexicon Resources
| File | Purpose |
|------|---------|
| `tamil_dic_cleaned.txt` | Tamil dictionary (9k+ words) for spell checking |
| `Tamil_anew_combined.json` | Tamil affective lexicon (Valence/Arousal/Dominance) |
| `english_anew.csv` | English ANEW dictionary (Affective Norms for English Words) |
| `tanglish_to_tamil.json` | Phonetic mapping: Tanglish (romanized) → Tamil script |
| `tamil_words_9k_sorted.txt` | Sorted Tamil vocabulary |

### Datasets
| File | Purpose |
|------|---------|
| `cleaned*.csv` | Cleaned Reddit posts/comments (multiple runs) |
| `reddit_tamil_vad_dataset.csv` | Labeled dataset with VAD scores |
| `vad_cleaned*.csv` | Iteratively cleaned dataset with VAD analysis |
| `uploaded_tamil_vad_dataset_*.csv` | User-provided datasets |

### Models & Weights
| File | Purpose |
|------|---------|
| `vad_bert_model.pt` | Pre-trained PyTorch model for Voice Activity Detection |
| (implicit) `paraphrase-multilingual-MiniLM-L12-v2` | Transformer model (loaded from Hugging Face) for PHQ-9 semantic similarity |

### Configuration Files
| File | Purpose |
|------|---------|
| `phq_templates.json` | Templates for PHQ-9 questions in Tamil/English |
| `rules.json` | Processing rules and heuristics |

---

## Core Python Modules

### Backend API (`app.py`)
- **Framework**: FastAPI (async, CORS-enabled)
- **Main Endpoints**:
  - `POST /analyze` - Main analysis endpoint
  - `POST /crawl` - Fetch Reddit posts
  - Other utility endpoints

### Text Processing Pipeline (`tamil_pipeline.py`)
**Function**: `clean_tamil_pipeline(text, apply_corrections=True, apply_normalization=True)`
- Input: Mixed Tamil/Tanglish/English text
- Output: Clean Tamil text + metadata
- Handles all stages: language detection, transliteration, translation, normalization, correction

### Language Detection (`language_detector.py`)
- Per-word/token language detection
- Classifies: Tamil, Tanglish, English

### Tanglish Conversion (`tanglish_to_tamil.py`)
- Phonetic transliteration from romanized Tamil to Tamil script
- Uses `tanglish_to_tamil.json` mapping
- Normalizes transliteration variations

### Affective Scoring (`vad.py`)
- `get_vad_from_tamil(word)` - Lookup Tamil word VAD scores
- `get_vad_from_english(word)` - Lookup English word VAD scores
- `batch_translate_and_update(words)` - Batch translation with caching
- `aggregate_vad(utterances)` - Compute average VAD metrics

### PHQ-9 Analysis (`phq/semantic_phq9_analyzer.py`)
- `SemanticPHQ9Analyzer` class
- Uses sentence transformers for semantic similarity
- Maps text to 9 depression symptom dimensions
- Computes severity scores (0-27 range)

---

## Frontend Architecture (React/TypeScript)

### Key Components
- **Analyzer**: Input form and analysis trigger
- **Results Dashboard**: Visualization of PHQ-9 scores, VAD metrics
- **Login System**: User authentication and session management
- **UI Components**: Aurora, Particles, Prism (visual polish)

### Data Flow
```
User Input → Analyzer → API Call (backend) → Results → Dashboard Visualization
```

---

## Key Processing Characteristics

### 1. **Multi-lingual Support**
- Detects Tamil, Tanglish (romanized Tamil), and English
- Converts all to Tamil for uniform processing
- Uses translation APIs and phonetic mappings

### 2. **Affective Computing**
- Scoring system based on VAD (Valence-Arousal-Dominance)
- Combined with affective lexicons (ANEW for English, custom for Tamil)
- Maps emotional content numerically

### 3. **Clinical Assessment**
- PHQ-9 semantic mapping (not traditional questionnaire)
- Detects 9 depression symptom dimensions in text
- Provides severity classification (minimal → severe)

### 4. **Robustness Features**
- Spell-checking with Levenshtein distance
- Handles noisy data (URLs, Reddit artifacts)
- Translation caching to minimize API calls
- Utterance segmentation for chunk-wise processing

### 5. **Offline Capability**
- Pre-trained models and dictionaries (no online dependency except translation)
- Saved VAD BERT model for inference

---

## Execution Flow Summary

```
1. User submits text via Frontend
   ↓
2. Backend receives request → clean_tamil_pipeline()
   ↓
3. Split into utterances → Detect language → Convert to Tamil
   ↓
4. Normalize & correct text → Apply VAD scoring
   ↓
5. Run PHQ-9 semantic analyzer → Map to 9 symptom dimensions
   ↓
6. Aggregate metrics (valence, arousal, dominance, PHQ-9 scores)
   ↓
7. Return JSON response with analysis results
   ↓
8. Frontend renders dashboard with visualizations & insights
   ↓
9. User sees depression severity assessment + detailed breakdown
```

---

## Technologies Used
- **Backend**: Python, FastAPI, NLTK, Transformers, PyTorch, Google Translate API
- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **NLP**: Sentence Transformers (multilingual embeddings), NLTK tokenization
- **Data**: Pandas, JSON, CSV
- **Language**: Tamil, English, Tanglish (Tamil romanized)

