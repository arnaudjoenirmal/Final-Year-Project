"""
Semantic PHQ-9 Analyzer
-----------------------
Computes PHQ-9 depression screening scores from text utterances using 
sentence embeddings and cosine similarity matching against template phrases.

Uses multilingual sentence transformers to compare user utterances with 
PHQ-9 question templates in both English and Tamil/Tanglish.
"""

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
        """
        Initialize the analyzer with PHQ-9 templates and sentence transformer model.
        
        Args:
            templates_path: Path to phq_templates.json file
            model_name: Name of sentence-transformers model to use
        """
        # Step 1: Load PHQ-9 templates from JSON
        if templates_path is None:
            # Default to phq folder in same directory as this script
            script_dir = os.path.dirname(os.path.abspath(__file__))
            templates_path = os.path.join(script_dir, 'phq_templates.json')
        
        print(f"Loading PHQ-9 templates from: {templates_path}")
        with open(templates_path, 'r', encoding='utf-8') as f:
            self.templates = json.load(f)
        
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
        # This speeds up analysis by avoiding redundant encoding
        print("Pre-computing template embeddings...")
        self.template_embeddings = {}
        
        for question_id, phrases in self.templates.items():
            if question_id == 'Difficulty':
                continue  # Skip difficulty templates for now
            
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
        """
        Analyze a list of utterances and compute PHQ-9 scores.
        
        Args:
            utterances: List of text utterances (e.g., Reddit comments, chat messages)
            normalize: If True, normalize scores to 0-1 range
            phq_scale: If True, convert to PHQ-9's 0-3 scale (0=not at all, 3=nearly every day)
        
        Returns:
            Dictionary mapping question IDs (Q1-Q9) to scores
        """
        if not utterances:
            raise ValueError("No utterances provided")
        
        print(f"\nAnalyzing {len(utterances)} utterances...")
        
        # Step 4: Encode all utterances
        print("Encoding utterances...")
        utterance_embeddings = self.model.encode(
            utterances, 
            convert_to_tensor=True,
            show_progress_bar=False
        )
        print(f"Encoded {len(utterances)} utterances")
        
        # Step 5: Compute similarity scores for each PHQ-9 question
        question_scores = {}
        
        for question_id in [f'Q{i}' for i in range(1, 10)]:
            # Get pre-computed template embeddings for this question
            template_embeds = self.template_embeddings[question_id]
            
            # Step 6: Compute cosine similarity between each utterance and each template
            # Shape: (num_utterances, num_templates)
            similarities = util.cos_sim(utterance_embeddings, template_embeds)
            
            # Step 7: For each utterance, take the maximum similarity across all templates
            # This captures the best match for this question
            max_similarities_per_utterance = similarities.max(dim=1).values
            
            # Step 8: Average across all utterances
            avg_score = max_similarities_per_utterance.mean().item()
            
            question_scores[question_id] = avg_score
            
            print(f"  {question_id}: {avg_score:.4f}")
        
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
        return sum(scores.values())
    
    def interpret_severity(self, total_score: float, phq_scale: bool = False) -> str:
        """
        Interpret PHQ-9 total score severity level.
        
        Args:
            total_score: Total PHQ-9 score
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
            # Score is on 0-9 normalized scale, adjust thresholds
            normalized_thresholds = {
                'Minimal': 5/27,
                'Mild': 10/27,
                'Moderate': 15/27,
                'Moderately Severe': 20/27,
            }
            
            if total_score < normalized_thresholds['Minimal']:
                return "Minimal"
            elif total_score < normalized_thresholds['Mild']:
                return "Mild"
            elif total_score < normalized_thresholds['Moderate']:
                return "Moderate"
            elif total_score < normalized_thresholds['Moderately Severe']:
                return "Moderately Severe"
            else:
                return "Severe"
    
    def get_radar_data(self, scores: Dict[str, float]) -> Dict[str, any]:
        """
        Format scores for radar chart visualization.
        
        Args:
            scores: Dictionary of question scores (Q1-Q9)
        
        Returns:
            Dictionary with metrics labels and values for radar chart
        """
        # Map PHQ-9 questions to readable metric names
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
        
        metrics = [metric_labels[q] for q in sorted(scores.keys())]
        values = [scores[q] for q in sorted(scores.keys())]
        
        return {
            'metrics': metrics,
            'values': values,
            'total': sum(values),
            'severity': self.interpret_severity(sum(values), phq_scale=False)
        }


# Example usage (optional - can be commented out)
if __name__ == "__main__":
    print("="*60)
    print("PHQ-9 Semantic Analyzer - Ready")
    print("="*60)
    print("\nTo use this analyzer:")
    print("1. Import: from semantic_phq9_analyzer import SemanticPHQ9Analyzer")
    print("2. Initialize: analyzer = SemanticPHQ9Analyzer()")
    print("3. Analyze: scores = analyzer.analyze_utterances(utterances)")
    print("\nOr use the FastAPI endpoint: POST /analyze-phq9")
    print("="*60)