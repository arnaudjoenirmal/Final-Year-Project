import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Particles from "../components/Particles";
import ShinyText from "../components/ShinyText";

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

const Analyzer: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const files = location.state?.files;
  const uploadedData = location.state?.uploadedData as UploadResponse[] | undefined;
  const crawlData = location.state?.crawlData as CrawlResponse | undefined;

  const [showDataViewer, setShowDataViewer] = useState(false);

  // Log data when component mounts
  useEffect(() => {
    console.log("Analyzer mounted with data:", { files, crawlData, uploadedData });
  }, []);

  const hasData = (files && files.length > 0) || crawlData || uploadedData;

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#060010",
      }}
    >
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        style={{
          position: "absolute",
          top: "32px",
          left: "32px",
          zIndex: 2,
          background: "#5227FF",
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          padding: "0.5rem 1.2rem",
          fontWeight: 700,
          fontSize: "1.1rem",
          cursor: "pointer",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          transition: "background 0.2s",
          display: "flex",
          alignItems: "center",
        }}
        aria-label="Go Back"
      >
        <ShinyText text="← Back" speed={2} className="text-lg" />
      </button>

      {/* Particles background */}
      <div
        style={{
          width: "100vw",
          height: "100vh",
          position: "absolute",
          top: 0,
          left: 0,
          zIndex: 0,
        }}
      >
        <Particles
          particleColors={['#ffffff', '#ffffff']}
          particleCount={200}
          particleSpread={10}
          speed={0.1}
          particleBaseSize={100}
          moveParticlesOnHover={true}
          alphaParticles={false}
          disableRotation={false}
        />
      </div>

      {/* Centered Content */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          maxWidth: "900px",
          padding: "2rem",
        }}
      >
        {/* Show View Results button immediately when data exists */}
        {hasData && (
          <>
            <h1 style={{
              fontSize: "3rem",
              fontWeight: 700,
              color: "rgba(255,255,255,0.95)",
              marginBottom: "2rem",
              textAlign: "center",
              letterSpacing: "1px",
            }}>
              Analysis Complete!
            </h1>
            
            <button
              style={{
                background: "#5227FF",
                color: "#fff",
                border: "none",
                borderRadius: "16px",
                padding: "1rem 3rem",
                fontWeight: 700,
                fontSize: "2rem",
                cursor: "pointer",
                marginBottom: "2rem",
                boxShadow: "0 4px 16px rgba(82,39,255,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.3s ease",
              }}
              onClick={() => {
                navigate("/results", {
                  state: {
                    crawlData: crawlData,
                    uploadedData: uploadedData,
                  }
                });
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = "scale(1.05)";
                e.currentTarget.style.boxShadow = "0 6px 24px rgba(82,39,255,0.4)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "0 4px 16px rgba(82,39,255,0.3)";
              }}
            >
              <ShinyText text="📊 View Results" speed={2} className="text-2xl" />
            </button>

            {/* Quick Info Card */}
            {crawlData?.post && (
              <div style={{ 
                color: "#fff", 
                fontSize: "1.2rem", 
                maxWidth: "800px",
                background: "rgba(255,255,255,0.1)",
                padding: "1.5rem",
                borderRadius: "12px",
                backdropFilter: "blur(10px)",
                boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
              }}>
                <p style={{ margin: "0.5rem 0" }}><strong>Title:</strong> {crawlData.post.title}</p>
                <p style={{ margin: "0.5rem 0" }}><strong>Subreddit:</strong> r/{crawlData.post.subreddit}</p>
                <p style={{ margin: "0.5rem 0" }}><strong>Author:</strong> u/{crawlData.post.author}</p>
                <p style={{ margin: "0.5rem 0" }}><strong>Comments:</strong> {crawlData.num_comments ?? 0}</p>
                <p style={{ margin: "0.5rem 0" }}><strong>VAD Sentences Analyzed:</strong> {crawlData.vad?.length ?? 0}</p>
              </div>
            )}

            {!crawlData && uploadedData && uploadedData.length > 0 && (
              <div style={{ 
                color: "#fff", 
                fontSize: "1.2rem", 
                maxWidth: "800px",
                background: "rgba(255,255,255,0.1)",
                padding: "1.5rem",
                borderRadius: "12px",
                backdropFilter: "blur(10px)",
                boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
              }}>
                <p style={{ margin: "0.5rem 0" }}><strong>Files Analyzed:</strong> {uploadedData.length}</p>
                <p style={{ margin: "0.5rem 0" }}>
                  <strong>Total VAD Sentences:</strong> {uploadedData.reduce((acc, data) => acc + (data.vad?.length ?? 0), 0)}
                </p>
              </div>
            )}
          </>
        )}

        {/* No Data Message */}
        {!hasData && (
          <div style={{
            color: "#fff",
            fontSize: "1.5rem",
            textAlign: "center",
          }}>
            <p>No data to analyze. Please go back and upload files or enter a Reddit URL.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Analyzer;