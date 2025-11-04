import { useState, useEffect } from "react";
import {
  LineChart,
  PieChart,
  BarChart,
  RadarChart,
} from "@mui/x-charts";
import { usePHQ9Analyzer } from "../hooks/usePHQ9Analyzer";

interface VADData {
  sentence: string;
  valence: number;
  arousal: number;
  dominance: number;
}

interface CrawlResponse {
  post?: {
    post_id: string;
    title: string;
    body: string;
    subreddit: string;
    author: string;
    created_utc: number;
    score: number;
    num_comments: number;
    url: string;
  };
  num_comments?: number;
  vad?: VADData[];
  transliteration_sample?: string;
  pipeline_used?: string;
}

interface UploadResponse {
  vad?: VADData[];
  per_token?: Array<{
    token: string;
    valence: number;
    arousal: number;
    dominance: number;
    in_cache: boolean;
  }>;
  transliteration_sample?: string;
  corrections_applied?: number;
  pipeline_used?: string;
}

interface Props {
  crawlData?: CrawlResponse;
  uploadedData?: UploadResponse[];
}

export default function DepressionInsightDashboard({ crawlData, uploadedData }: Props) {
  // PHQ-9 Analyzer Hook
  const { analyzePHQ9, loading: phq9Loading, error: phq9Error, result: phq9Result } = usePHQ9Analyzer();
  const [showPHQ9Analysis, setShowPHQ9Analysis] = useState(false);

  // Depression anchor vectors (rescaled to 1-9 range)
  const ANCHORS = [
    { label: "sadness", v: 1.416, a: 3.304, d: 2.312 },
    { label: "depressed", v: 1.192, a: 4.560, d: 2.088 },
    { label: "sorrowful", v: 1.392, a: 4.376, d: 2.304 },
  ];

  const D_MIN = 0.7892;
  const D_MAX = 9.7557;

  /**
   * Calculate Depression Score from VAD values (1-9 scale)
   * Returns a score from 0-100 where higher = more depressive
   */
  const calculateDepressionScore = (v: number, a: number, d: number): number => {
    // Step 1: Compute Euclidean distance to each anchor
    const distances = ANCHORS.map(anchor => {
      const distSquared = 
        Math.pow(v - anchor.v, 2) +
        Math.pow(a - anchor.a, 2) +
        Math.pow(d - anchor.d, 2);
      return Math.sqrt(distSquared);
    });

    // Step 2: Average the distances (D_mult)
    const D_mult = distances.reduce((sum, dist) => sum + dist, 0) / 3;

    // Step 3: Normalize the average distance to 0-100 scale
    const s = ((D_mult - D_MIN) / (D_MAX - D_MIN)) * 100;

    // Step 4: Invert the score (closer distance = higher depression)
    const depressionScore = 100 - s;

    // Clamp to 0-100 range
    return Math.max(0, Math.min(100, depressionScore));
  };

  /**
   * Categorize depression severity based on score
   */
  const getDepressionSeverity = (score: number): string => {
    if (score >= 70) return "Severe";
    if (score >= 50) return "Moderate";
    if (score >= 30) return "Mild";
    return "Minimal";
  };

  // Combine VAD data from all sources
  const getAllVADData = (): VADData[] => {
    const allVAD: VADData[] = [];
    
    if (crawlData?.vad) {
      allVAD.push(...crawlData.vad);
    }
    
    if (uploadedData) {
      uploadedData.forEach(data => {
        if (data?.vad) {
          allVAD.push(...data.vad);
        }
      });
    }
    
    return allVAD;
  };

  const allVAD = getAllVADData();

  // Calculate depression scores for each VAD entry
  const depressionScoresData = allVAD.length > 0
    ? allVAD.map((item, index) => {
        const depScore = calculateDepressionScore(item.valence, item.arousal, item.dominance);
        return {
          utterance: index + 1,
          depressionScore: depScore,
          severity: getDepressionSeverity(depScore),
          valence: item.valence,
          arousal: item.arousal,
          dominance: item.dominance,
        };
      })
    : [];

  // Calculate average depression score
  const avgDepressionScore = depressionScoresData.length > 0
    ? depressionScoresData.reduce((sum, d) => sum + d.depressionScore, 0) / depressionScoresData.length
    : 0;
  // Normalize VAD values to 0-1 range for charts
  const normalizeVAD = (value: number) => (value - 1) / 8;

  const vadData = allVAD.length > 0 
    ? allVAD.map((item, index) => ({
        utterance: index + 1,
        valence: normalizeVAD(item.valence),
        arousal: normalizeVAD(item.arousal),
        dominance: normalizeVAD(item.dominance),
      }))
    : [
        { utterance: 1, valence: 0.6, arousal: 0.5, dominance: 0.7 },
        { utterance: 2, valence: 0.4, arousal: 0.6, dominance: 0.5 },
        { utterance: 3, valence: 0.7, arousal: 0.8, dominance: 0.6 },
        { utterance: 4, valence: 0.5, arousal: 0.4, dominance: 0.5 },
      ];

  // Depression type distribution (Pie) - can be enhanced later with ML classification
  const depressionType = [
    { label: "Melancholic", value: 35 },
    { label: "Atypical", value: 25 },
    { label: "Psychotic", value: 20 },
    { label: "Situational", value: 20 },
  ];

  // Radar Data - using average VAD values
  const avgVAD = allVAD.length > 0 
    ? {
        valence: normalizeVAD(allVAD.reduce((sum, d) => sum + d.valence, 0) / allVAD.length),
        arousal: normalizeVAD(allVAD.reduce((sum, d) => sum + d.arousal, 0) / allVAD.length),
        dominance: normalizeVAD(allVAD.reduce((sum, d) => sum + d.dominance, 0) / allVAD.length),
      }
    : { valence: 0.6, arousal: 0.5, dominance: 0.7 };

  // Extract all utterances for PHQ-9 analysis
  const getAllUtterances = (): string[] => {
    const utterances: string[] = [];
    
    // From crawl data
    if (crawlData?.vad) {
      utterances.push(...crawlData.vad.map(v => v.sentence));
    }
    
    // From uploaded files
    if (uploadedData) {
      uploadedData.forEach(data => {
        if (data?.vad) {
          utterances.push(...data.vad.map(v => v.sentence));
        }
      });
    }
    
    return utterances.filter(u => u && u.trim().length > 0);
  };

  // Auto-analyze PHQ-9 on component mount if data is available
  useEffect(() => {
    const utterances = getAllUtterances();
    if (utterances.length > 0 && !phq9Result && !phq9Loading) {
      console.log('[Dashboard] Auto-analyzing PHQ-9 scores...');
      analyzePHQ9(utterances);
    }
  }, [crawlData, uploadedData]); // Re-run if data changes

  // Update radar data when PHQ-9 results are available
  const radarMetrics = phq9Result?.radar_data.metrics || [
    "Valence", "Arousal", "Dominance", "Depression", "Fatigue", "Anxiety",
  ];

  const radarDataVAD = phq9Result?.radar_data.values || [
    avgVAD.valence,
    avgVAD.arousal,
    avgVAD.dominance,
    avgDepressionScore / 100,
    1 - avgVAD.arousal,
    1 - avgVAD.dominance,
  ];

  // PHQ-9 baseline data (normalized healthy baseline values)
  const radarDataPHQ9 = phq9Result ? radarMetrics.map(() => 0.5) : [0.5, 0.5, 0.5, 0.2, 0.3, 0.3];


  // All chart configurations
  const chartConfigs = [
    {
      key: "depression-trajectory",
      label: "Depression Score Trajectory",
      render: () => (
        <LineChart
          dataset={depressionScoresData.length > 0 ? depressionScoresData : [
            { utterance: 1, depressionScore: 45 },
            { utterance: 2, depressionScore: 60 },
            { utterance: 3, depressionScore: 35 },
            { utterance: 4, depressionScore: 55 },
          ]}
          xAxis={[{ dataKey: "utterance", label: "Utterance Index" }]}
          yAxis={[{ label: "Depression Score (0-100)", min: 0, max: 100 }]}
          series={[
            {
              dataKey: "depressionScore",
              label: "Depression Score",
              color: "#f44336",
              curve: "monotoneX",
            },
          ]}
          height={400}
        />
      ),
    },
    {
      key: "line",
      label: "VAD Trajectory",
      render: () => (
        <LineChart
          dataset={vadData}
          xAxis={[{ dataKey: "utterance", label: "Utterance Index" }]}
          series={[
            { dataKey: "valence", label: "Valence", color: "#4caf50" },
            { dataKey: "arousal", label: "Arousal", color: "#ff9800" },
            { dataKey: "dominance", label: "Dominance", color: "#2196f3" },
          ]}
          height={400}
        />
      ),
    },
    {
      key: "pie",
      label: "Depression Type Distribution",
      render: () => (
        <PieChart
          series={[{ data: depressionType.map((d) => ({ id: d.label, value: d.value, label: d.label })) }]}
          height={400}
        />
      ),
    },
    {
      key: "radar",
      label: "Psychological Profile (VAD + Depression)",
      render: () => (
        <RadarChart
          height={400}
          series={[
            { label: "Current Profile", data: radarDataVAD, color: "#ab47bc" },
            { label: "PHQ-9 Baseline", data: radarDataPHQ9, color: "#26a69a" },
          ]}
          radar={{ max: 1.0, metrics: radarMetrics }}
        />
      ),
    },
  ];

  // Add PHQ-9 specific chart
  const phq9ChartConfigs = phq9Result ? [
    {
      key: "phq9-scores",
      label: "PHQ-9 Question Scores",
      render: () => (
        <BarChart
          dataset={Object.entries(phq9Result.phq9_scores).map(([q, score]) => ({
            question: q,
            score: score,
          }))}
          xAxis={[{ scaleType: "band", dataKey: "question", label: "PHQ-9 Question" }]}
          yAxis={[{ label: "Score (0-1)", min: 0, max: 1 }]}
          series={[{ dataKey: "score", label: "Score", color: "#9c27b0" }]}
          height={400}
        />
      ),
    },
  ] : [];

  // Combine all charts
  const allChartConfigs = [...chartConfigs, ...phq9ChartConfigs];

  const [enlargedChart, setEnlargedChart] = useState<string | null>(null);

  return (
    <div style={{ width: "100%" }}>
      {/* PHQ-9 Loading/Error State */}
      {phq9Loading && (
        <div
          style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            borderRadius: "16px",
            padding: "24px",
            marginBottom: "24px",
            color: "#fff",
            textAlign: "center",
          }}
        >
          <h3>🧠 Analyzing PHQ-9 Scores...</h3>
          <p>Computing semantic similarity with depression indicators...</p>
        </div>
      )}

      {phq9Error && (
        <div
          style={{
            background: "#f44336",
            borderRadius: "16px",
            padding: "24px",
            marginBottom: "24px",
            color: "#fff",
            textAlign: "center",
          }}
        >
          <h3>❌ PHQ-9 Analysis Error</h3>
          <p>{phq9Error}</p>
        </div>
      )}

      {/* Score Summary Cards - Now in 2-column grid matching chart layout */}
      {(phq9Result || depressionScoresData.length > 0) && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "24px",
            padding: "24px",
            background: "rgba(255,255,255,0.05)",
            borderRadius: "16px",
            marginBottom: "24px",
          }}
        >
          {/* PHQ-9 Score Summary - Left Column */}
          {phq9Result && (
            <div
              style={{
                background: "linear-gradient(135deg, #9c27b0 0%, #673ab7 100%)",
                borderRadius: "16px",
                padding: "32px 24px",
                color: "#fff",
                textAlign: "center",
                cursor: "pointer",
                transition: "transform 0.2s, box-shadow 0.2s",
                boxShadow: "0 2px 8px rgba(31,38,135,0.12)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                minHeight: "300px",
              }}
              onClick={() => setShowPHQ9Analysis(!showPHQ9Analysis)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 8px 16px rgba(156,39,176,0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(31,38,135,0.12)";
              }}
            >
              <h2 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700 }}>
                🧠 PHQ-9 Semantic Analysis
              </h2>
              <p style={{ fontSize: "4rem", fontWeight: 900, margin: "24px 0" }}>
                {phq9Result.phq9_total.toFixed(2)}
              </p>
              <p style={{ fontSize: "1.5rem", fontWeight: 600, margin: 0 }}>
                Severity: {phq9Result.phq9_severity}
              </p>
              <p style={{ fontSize: "0.9rem", opacity: 0.9, marginTop: "16px" }}>
                Based on semantic similarity with {phq9Result.stats?.num_utterances} utterances
              </p>
              <p style={{ fontSize: "0.8rem", opacity: 0.7, marginTop: "12px" }}>
                Click to {showPHQ9Analysis ? 'hide' : 'show'} detailed scores
              </p>
            </div>
          )}

          {/* VAD-Based Depression Score - Right Column */}
          {depressionScoresData.length > 0 && (
            <div
              style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                borderRadius: "16px",
                padding: "32px 24px",
                color: "#fff",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                minHeight: "300px",
                boxShadow: "0 2px 8px rgba(31,38,135,0.12)",
              }}
            >
              <h2 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700 }}>
                📊 VAD-Based Depression Score
              </h2>
              <p style={{ fontSize: "4rem", fontWeight: 900, margin: "24px 0" }}>
                {avgDepressionScore.toFixed(1)}
              </p>
              <p style={{ fontSize: "1.5rem", fontWeight: 600, margin: 0 }}>
                Severity: {getDepressionSeverity(avgDepressionScore)}
              </p>
              <p style={{ fontSize: "1rem", opacity: 0.9, marginTop: "16px" }}>
                Based on {depressionScoresData.length} analyzed utterances
              </p>
            </div>
          )}

          {/* If only one score card exists, center it */}
          {!phq9Result && depressionScoresData.length > 0 && (
            <div></div> // Empty spacer to maintain grid
          )}
          {phq9Result && depressionScoresData.length === 0 && (
            <div></div> // Empty spacer to maintain grid
          )}
        </div>
      )}

      {/* PHQ-9 Detailed Scores (Collapsible) */}
      {showPHQ9Analysis && phq9Result && (
        <div
          style={{
            background: "#fff",
            borderRadius: "16px",
            padding: "24px",
            marginBottom: "24px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
          }}
        >
          <h3 style={{ color: "#333", marginBottom: "16px" }}>
            PHQ-9 Question Scores
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
            {Object.entries(phq9Result.phq9_scores).map(([question, score]) => (
              <div
                key={question}
                style={{
                  background: "#f5f5f5",
                  borderRadius: "8px",
                  padding: "16px",
                  textAlign: "center",
                }}
              >
                <p style={{ color: "#666", margin: "0 0 8px 0", fontSize: "0.9rem" }}>
                  {question}
                </p>
                <p style={{ color: "#9c27b0", fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>
                  {(score * 100).toFixed(1)}%
                </p>
              </div>
            ))}
          </div>
          <p style={{ color: "#666", fontSize: "0.85rem", marginTop: "16px", textAlign: "center" }}>
            Scores represent semantic similarity to PHQ-9 depression indicators (0-100%)
          </p>
        </div>
      )}

      {/* Charts Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "24px",
          padding: "24px",
          background: "rgba(255,255,255,0.05)",
          borderRadius: "16px",
          position: "relative",
        }}
      >
        {allChartConfigs.map((chart) => (
          <div
            key={chart.key}
            style={{
              background: "#f5f7fa",
              borderRadius: "16px",
              padding: "16px",
              cursor: "pointer",
              transition: "box-shadow 0.2s",
              boxShadow: "0 2px 8px rgba(31,38,135,0.12)",
            }}
            onClick={() => setEnlargedChart(chart.key)}
            title={`Click to enlarge ${chart.label}`}
          >
            {chart.render()}
          </div>
        ))}
      </div>

      {/* Enlarged Chart Modal */}
      {enlargedChart && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.7)",
            zIndex: 9999,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
          onClick={() => setEnlargedChart(null)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "24px",
              padding: "32px",
              boxShadow: "0 8px 32px 0 rgba(31,38,135,0.37)",
              minWidth: "800px",
              maxWidth: "95vw",
              maxHeight: "90vh",
              overflow: "auto",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setEnlargedChart(null)}
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                background: "#5227FF",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                padding: "0.3rem 1rem",
                fontWeight: 700,
                fontSize: "1rem",
                cursor: "pointer",
                zIndex: 2,
              }}
            >
              Close
            </button>
            <h2 style={{ color: "#222", marginBottom: "1rem" }}>
              {allChartConfigs.find((c) => c.key === enlargedChart)?.label}
            </h2>
            <div
              style={{
                background: "#f5f7fa",
                borderRadius: "16px",
                padding: "16px",
              }}
            >
              {allChartConfigs.find((c) => c.key === enlargedChart)?.render()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}