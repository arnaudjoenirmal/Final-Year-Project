import json
import os
import numpy as np
from typing import List, Dict, Tuple
from sentence_transformers import SentenceTransformer, util

# Initialize the multilingual sentence transformer model
# This model supports 50+ languages including English and Tamil
MODEL_NAME = "paraphrase-multilingual-MiniLM-L12-v2"


class SemanticPHQ9Analyzer:
    """
    Analyzes text utterances for PHQ-9 depression indicators using semantic similarity.
    
    PHQ-9 Questions:
    Q1: Anhedonia (loss of interest/pleasure)
    Q2: Depressed mood
    Q3: Sleep problems
    Q4: Fatigue/low energy
    Q5: Appetite changes
    Q6: Guilt/worthlessness
    Q7: Concentration problems
    Q8: Psychomotor changes
    Q9: Suicidal ideation
    """
    
    def __init__(self, templates_path: str = None, model_name: str = MODEL_NAME):
        # Step 1: Load PHQ-9 templates from JSON
        if templates_path is None:
            base_dir = os.path.abspath(os.path.dirname(__file__) if '__file__' in locals() else os.getcwd())
            templates_path = os.path.join(base_dir, 'phq_templates.json')
            

            if not os.path.exists(templates_path) and '__file__' in locals():
                 script_dir = os.path.dirname(os.path.abspath(__file__))
                 templates_path = os.path.join(script_dir, 'phq_templates.json')
            elif not os.path.exists(templates_path):
                 templates_path = 'phq_templates.json'

        
        print(f"Loading PHQ-9 templates from: {templates_path}")
        try:
            with open(templates_path, 'r', encoding='utf-8') as f:
                self.templates = json.load(f)
        except FileNotFoundError:
            print(f"CRITICAL ERROR: Could not find templates file at {templates_path}")
            print("Please ensure 'phq_templates.json' is in the same directory as this script.")
            raise
        
        # Validate that all 9 questions + difficulty are present
        expected_keys = [f'Q{i}' for i in range(1, 10)] + ['Difficulty']
        for key in expected_keys:
            if key not in self.templates:
                raise ValueError(f"Missing template key: {key}")
        
        print(f"Loaded templates for {len(self.templates)} PHQ-9 items")
        
        # Step 2: Load sentence transformer model
        print(f"Loading sentence transformer model: {model_name}")
        self.model = SentenceTransformer(model_name)
        print("Model loaded successfully")
        
        # Step 3: Pre-compute embeddings for all template phrases
        print("Pre-computing template embeddings...")
        self.template_embeddings = {}
        
        for question_id, phrases in self.templates.items():
            # **FIXED**: Removed the 'continue' for 'Difficulty'
            # Now all templates, including Difficulty, are encoded.
            
            # Encode all template phrases for this question
            embeddings = self.model.encode(
                phrases, 
                convert_to_tensor=True,
                show_progress_bar=False
            )
            self.template_embeddings[question_id] = embeddings
            print(f"  {question_id}: {len(phrases)} templates encoded")
        
        print("Template embeddings ready")
    
    def analyze_utterances(
        self, 
        utterances: List[str], 
        normalize: bool = True,
        phq_scale: bool = False
    ) -> Dict[str, float]:
        if not utterances:
            raise ValueError("No utterances provided")
        
        print(f"\nAnalyzing {len(utterances)} utterances...")
        
        print("Encoding utterances...")
        utterance_embeddings = self.model.encode(
            utterances, 
            convert_to_tensor=True,
            show_progress_bar=False
        )
        print(f"Encoded {len(utterances)} utterances")
        
        # Step 5: Compute similarity scores for each PHQ-9 question
        question_scores = {}
        
        for question_id in self.template_embeddings.keys():
            
            template_embeds = self.template_embeddings[question_id]
            
            similarities = util.cos_sim(utterance_embeddings, template_embeds)
            
        
            max_similarities_per_utterance = similarities.max(dim=1).values
            
            # Step 8: **KEY FIX**
            # Take the *maximum* score across all utterances.
            # This finds the single strongest signal for this question.
            # Original: avg_score = max_similarities_per_utterance.mean().item()
            max_score = max_similarities_per_utterance.max().item()
            
            question_scores[question_id] = max_score
            
            print(f"  {question_id}: {max_score:.4f} (Found strongest signal)")
        
        # Step 9: Normalize scores to 0-1 range (cosine similarity is already -1 to 1)
        # Convert from [-1, 1] to [0, 1] range
        if normalize:
            question_scores = {
                q: (score + 1) / 2  # Map [-1, 1] → [0, 1]
                for q, score in question_scores.items()
            }
            print("\nNormalized scores to [0, 1] range")
        
        # Step 10: Optionally convert to PHQ-9 scale (0-3)
        if phq_scale:
            question_scores = {
                q: score * 3  # Map [0, 1] → [0, 3]
                for q, score in question_scores.items()
            }
            print("Converted to PHQ-9 scale [0, 3]")
        
        return question_scores
    
    def get_phq9_total(self, scores: Dict[str, float]) -> float:
        """
        Calculate total PHQ-9 score (sum of Q1-Q9).
        
        Args:
            scores: Dictionary of question scores
        
        Returns:
            Total PHQ-9 score
        """
        total = sum(v for k, v in scores.items() if k.startswith('Q'))
        return total
    
    def interpret_severity(self, total_score: float, phq_scale: bool = False) -> str:
        """
        Interpret PHQ-9 total score severity level.
        
        Args:
            total_score: Total PHQ-9 score (from Q1-Q9)
            phq_scale: If True, score is on 0-27 scale; if False, on 0-9 scale
        
        Returns:
            Severity interpretation string
        """
        # PHQ-9 severity thresholds (0-27 scale)
        # 0-4: Minimal depression
        # 5-9: Mild depression
        # 10-14: Moderate depression
        # 15-19: Moderately severe depression
        # 20-27: Severe depression
        
        if phq_scale:
            # Score is on 0-27 scale
            if total_score < 5:
                return "Minimal"
            elif total_score < 10:
                return "Mild"
            elif total_score < 15:
                return "Moderate"
            elif total_score < 20:
                return "Moderately Severe"
            else:
                return "Severe"
        else:
            
            if total_score < (5/3):
                return "Minimal"
            elif total_score < (10/3):
                return "Mild"
            elif total_score < (15/3):
                return "Moderate"
            elif total_score < (20/3):
                return "Moderately Severe"
            else:
                return "Severe"
    
    def get_radar_data(self, scores: Dict[str, float]) -> Dict[str, any]:
        metric_labels = {
            'Q1': 'Anhedonia',
            'Q2': 'Depressed Mood',
            'Q3': 'Sleep Issues',
            'Q4': 'Fatigue',
            'Q5': 'Appetite Changes',
            'Q6': 'Guilt/Worthlessness',
            'Q7': 'Concentration',
            'Q8': 'Psychomotor',
            'Q9': 'Suicidal Ideation',
        }
        
        q_scores = {k: v for k, v in scores.items() if k in metric_labels}
        
        metrics = [metric_labels[q] for q in sorted(q_scores.keys())]
        values = [q_scores[q] for q in sorted(q_scores.keys())]
        
        total = sum(values)
        
        is_phq_scale = any(v > 1.0 for v in values)
        
        return {
            'metrics': metrics,
            'values': values,
            'total': total,
            'severity': self.interpret_severity(total, phq_scale=is_phq_scale)
        }
