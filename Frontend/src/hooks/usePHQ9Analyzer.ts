import { useState } from 'react';

/**
 * PHQ-9 Analysis Result Interface
 * Matches the backend response structure from /analyze-phq9 endpoint
 */
interface PHQ9Result {
  phq9_scores: Record<string, number>;
  phq9_total: number;
  phq9_severity: string;
  radar_data: {
    metrics: string[];
    values: number[];
    total: number;
    severity: string;
  };
  scale: string;
  processing_time?: {
    analysis_time_seconds: number;
    total_time_seconds: number;
  };
  stats?: {
    num_utterances: number;
    timestamp: string;
  };
}

/**
 * PHQ-9 Analyzer Hook State
 */
interface UsePHQ9AnalyzerState {
  analyzePHQ9: (utterances: string[], normalize?: boolean, phqScale?: boolean) => Promise<PHQ9Result | null>;
  loading: boolean;
  error: string | null;
  result: PHQ9Result | null;
  clearResult: () => void;
}

/**
 * Custom hook for PHQ-9 semantic analysis
 * 
 * Sends text utterances to backend for PHQ-9 depression screening analysis
 * using sentence transformers and cosine similarity matching.
 * 
 * @example
 * const { analyzePHQ9, loading, error, result } = usePHQ9Analyzer();
 * 
 * const utterances = [
 *   "எதுவும் சுவாரஸ்யமா இல்ல",
 *   "can't sleep properly",
 *   "always tired"
 * ];
 * 
 * await analyzePHQ9(utterances);
 * if (result) {
 *   console.log('Severity:', result.phq9_severity);
 *   console.log('Total Score:', result.phq9_total);
 * }
 */
export const usePHQ9Analyzer = (): UsePHQ9AnalyzerState => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PHQ9Result | null>(null);

  // Backend URL from environment variable or default to localhost
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000';

  /**
   * Analyze utterances for PHQ-9 depression indicators
   * 
   * @param utterances - Array of text strings to analyze
   * @param normalize - If true, normalize scores to 0-1 range (default: true)
   * @param phqScale - If true, convert to PHQ-9's 0-3 scale (default: false)
   * @returns PHQ9Result object or null if error occurs
   */
  const analyzePHQ9 = async (
    utterances: string[],
    normalize: boolean = true,
    phqScale: boolean = false
  ): Promise<PHQ9Result | null> => {
    // Step 1: Validate input
    if (!utterances || utterances.length === 0) {
      const errorMsg = 'No utterances provided for PHQ-9 analysis';
      console.error(errorMsg);
      setError(errorMsg);
      return null;
    }

    // Filter out empty strings
    const validUtterances = utterances.filter(u => u && u.trim().length > 0);
    if (validUtterances.length === 0) {
      const errorMsg = 'All utterances are empty';
      console.error(errorMsg);
      setError(errorMsg);
      return null;
    }

    // Step 2: Set loading state and clear previous errors
    setLoading(true);
    setError(null);
    setResult(null);

    console.log(`[PHQ-9] Analyzing ${validUtterances.length} utterances...`);
    console.log(`[PHQ-9] Backend URL: ${BACKEND_URL}/analyze-phq9`);

    try {
      // Step 3: Prepare FormData (backend expects Form data, not JSON)
      const formData = new FormData();
      
      // Append each utterance as a separate form field
      validUtterances.forEach(utterance => {
        formData.append('utterances', utterance);
      });
      
      formData.append('normalize', normalize.toString());
      formData.append('phq_scale', phqScale.toString());

      // Step 4: Send POST request to backend
      const startTime = Date.now();
      const response = await fetch(`${BACKEND_URL}/analyze-phq9`, {
        method: 'POST',
        body: formData,
        mode: 'cors',
      });

      const requestTime = Date.now() - startTime;
      console.log(`[PHQ-9] Request completed in ${requestTime}ms`);

      // Step 5: Handle HTTP errors
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      // Step 6: Parse JSON response
      const data: PHQ9Result = await response.json();
      
      console.log('[PHQ-9] Analysis complete:', {
        total: data.phq9_total,
        severity: data.phq9_severity,
        scale: data.scale,
      });

      // Step 7: Update state with result
      setResult(data);
      setLoading(false);
      
      return data;

    } catch (err) {
      // Step 8: Handle errors
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('[PHQ-9] Analysis failed:', errorMessage);
      
      setError(errorMessage);
      setLoading(false);
      setResult(null);
      
      return null;
    }
  };

  /**
   * Clear the current result and error state
   */
  const clearResult = () => {
    setResult(null);
    setError(null);
  };

  return {
    analyzePHQ9,
    loading,
    error,
    result,
    clearResult,
  };
};