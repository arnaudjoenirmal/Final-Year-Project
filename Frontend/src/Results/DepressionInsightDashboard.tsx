import { useState } from "react";
import {
  LineChart,
  PieChart,
  BarChart,
  RadarChart,
  ScatterChart,
} from "@mui/x-charts";

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

  // Count severity levels for bar chart
  const severityCounts = depressionScoresData.reduce((acc, item) => {
    acc[item.severity] = (acc[item.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const intensityLevels = [
    { level: "Minimal", count: severityCounts["Minimal"] || 0 },
    { level: "Mild", count: severityCounts["Mild"] || 0 },
    { level: "Moderate", count: severityCounts["Moderate"] || 0 },
    { level: "Severe", count: severityCounts["Severe"] || 0 },
  ];

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

  const radarDataVAD = [
    avgVAD.valence,
    avgVAD.arousal,
    avgVAD.dominance,
    avgDepressionScore / 100, // Normalized depression score
    1 - avgVAD.arousal, // Fatigue (inverse of arousal)
    1 - avgVAD.dominance, // Anxiety (inverse of dominance)
  ];

  const radarDataPHQ9 = [0.5, 0.6, 0.5, 0.7, 0.6, 0.4]; // Placeholder - can be replaced with actual PHQ-9
  const radarMetrics = [
    "Valence", "Arousal", "Dominance", "Depression", "Fatigue", "Anxiety",
  ];

  // Scatter Chart Data - VAD correlation
  const scatterData = depressionScoresData.map(d => ({
    x: normalizeVAD(d.arousal),
    y: normalizeVAD(d.valence),
    confidence: d.depressionScore / 100,
  }));

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
      key: "bar",
      label: "Depression Severity Distribution",
      render: () => (
        <BarChart
          dataset={intensityLevels}
          xAxis={[{ scaleType: "band", dataKey: "level", label: "Severity Level" }]}
          series={[{ dataKey: "count", label: "Count", color: "#1976d2" }]}
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
    {
      key: "scatter",
      label: "Valence vs Arousal (Depression Intensity)",
      render: () => (
        <ScatterChart
          xAxis={[{ label: "Arousal Level", min: 0, max: 1 }]}
          yAxis={[{ label: "Valence Level", min: 0, max: 1 }]}
          series={[{
            data: scatterData.length > 0 ? scatterData.map((d) => ({ 
              x: d.x, 
              y: d.y, 
              size: d.confidence * 30 // Bubble size = depression score
            })) : [
              { x: 0.3, y: 0.4, size: 20 },
              { x: 0.5, y: 0.6, size: 25 },
              { x: 0.7, y: 0.5, size: 15 },
            ],
            label: "Depression Intensity",
            color: "#ff7043",
          }]}
          height={400}
        />
      ),
    },
  ];

  const [enlargedChart, setEnlargedChart] = useState<string | null>(null);

  return (
    <div style={{ width: "100%" }}>
      {/* Depression Score Summary */}
      {depressionScoresData.length > 0 && (
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
          <h2 style={{ margin: 0, fontSize: "2rem", fontWeight: 700 }}>
            Average Depression Score
          </h2>
          <p style={{ fontSize: "4rem", fontWeight: 900, margin: "16px 0" }}>
            {avgDepressionScore.toFixed(1)}
          </p>
          <p style={{ fontSize: "1.5rem", fontWeight: 600, margin: 0 }}>
            Severity: {getDepressionSeverity(avgDepressionScore)}
          </p>
          <p style={{ fontSize: "1rem", opacity: 0.9, marginTop: "12px" }}>
            Based on {depressionScoresData.length} analyzed utterances
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
        {chartConfigs.map((chart) => (
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
              {chartConfigs.find((c) => c.key === enlargedChart)?.label}
            </h2>
            <div
              style={{
                background: "#f5f7fa",
                borderRadius: "16px",
                padding: "16px",
              }}
            >
              {chartConfigs.find((c) => c.key === enlargedChart)?.render()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}