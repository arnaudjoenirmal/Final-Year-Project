import { useState } from "react";
import {
  LineChart,
  PieChart,
  BarChart,
  RadarChart,
  ScatterChart,
} from "@mui/x-charts";

export default function DepressionInsightDashboard() {
  // VAD Data (Valence, Arousal, Dominance)
  const vadData = [
    { utterance: 1, valence: 0.6, arousal: 0.5, dominance: 0.7 },
    { utterance: 2, valence: 0.4, arousal: 0.6, dominance: 0.5 },
    { utterance: 3, valence: 0.7, arousal: 0.8, dominance: 0.6 },
    { utterance: 4, valence: 0.5, arousal: 0.4, dominance: 0.5 },
  ];

  // Calculate Depression Trajectory from the VAD data
  // A higher score indicates a more negative emotional state.
  const depressionTrajectoryData = vadData.map((d) => ({
    utterance: d.utterance,
    depressionScore:
      ((1 - d.valence) + (1 - d.arousal) + (1 - d.dominance)) / 3,
  }));

  // Depression type distribution (Pie)
  const depressionType = [
    { label: "Melancholic", value: 35 },
    { label: "Atypical", value: 25 },
    { label: "Psychotic", value: 20 },
    { label: "Situational", value: 20 },
  ];

  // Intensity Level Analysis (Bar)
  const intensityLevels = [
    { level: "Mild", count: 10 },
    { level: "Moderate", count: 20 },
    { level: "Severe", count: 8 },
  ];

  // Radar Data
  const radarDataVAD = [0.6, 0.5, 0.7, 0.4, 0.5, 0.6];
  const radarDataPHQ9 = [0.5, 0.6, 0.5, 0.7, 0.6, 0.4];
  const radarMetrics = [
    "Valence", "Arousal", "Dominance", "Hopelessness", "Fatigue", "Anxiety",
  ];

  // Scatter Chart Data
  const scatterData = [
    { x: 0.3, y: 0.4, confidence: 0.8 },
    { x: 0.5, y: 0.6, confidence: 0.9 },
    { x: 0.7, y: 0.5, confidence: 0.6 },
    { x: 0.9, y: 0.8, confidence: 0.7 },
  ];

  // All chart configurations
  const chartConfigs = [
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
      key: "bar",
      label: "Intensity Level Analysis",
      render: () => (
        <BarChart
          dataset={intensityLevels}
          xAxis={[{ scaleType: "band", dataKey: "level", label: "Intensity Level" }]}
          series={[{ dataKey: "count", label: "Count", color: "#1976d2" }]}
          height={400}
        />
      ),
    },
    {
      key: "radar",
      label: "VAD vs PHQ-9 Radar Map",
      render: () => (
        <RadarChart
          height={400}
          series={[
            { label: "VAD Scores", data: radarDataVAD, color: "#ab47bc" },
            { label: "PHQ-9 Indicators", data: radarDataPHQ9, color: "#26a69a" },
          ]}
          radar={{ max: 1.0, metrics: radarMetrics }}
        />
      ),
    },
    {
      key: "scatter",
      label: "Confidence vs Arousal Scatter",
      render: () => (
        <ScatterChart
          xAxis={[{ label: "Arousal Level" }]}
          yAxis={[{ label: "Valence Level" }]}
          series={[{
            data: scatterData.map((d) => ({ x: d.x, y: d.y, size: d.confidence * 20 })),
            label: "Confidence",
            color: "#ff7043",
          }]}
          height={400}
        />
      ),
    },
    {
      key: "trajectory",
      label: "Depression Trajectory from VAD",
      render: () => (
        <LineChart
          dataset={depressionTrajectoryData}
          xAxis={[{ dataKey: "utterance", label: "Utterance Index" }]}
          yAxis={[{ label: "Depression Score" }]}
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
  ];

  const [enlargedChart, setEnlargedChart] = useState<string | null>(null);

  return (
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