import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import RotatingText from "../components/RotatingText";
import Particles from "../components/Particles";
import { LifeLine } from "react-loading-indicators";
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
  const receivedCrawlData = location.state?.crawlData as CrawlResponse | undefined;

  // State for backend files and viewer
  const [crawlData, setCrawlData] = useState<CrawlResponse | null>(receivedCrawlData || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewerContent, setViewerContent] = useState<string | null>(null);
  const [viewerTitle, setViewerTitle] = useState<string | null>(null);
  const [showDataViewer, setShowDataViewer] = useState(false);

  // Animation state for RotatingText and View Results button
  const [showRotating, setShowRotating] = useState(false);
  const [showViewResults, setShowViewResults] = useState(false);

  // Helper to download file from backend
  const downloadFile = async (filename: string) => {
    const url = `http://127.0.0.1:8000/download/?filename=${encodeURIComponent(filename)}`;
    const response = await fetch(url);
    const blob = await response.blob();
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Show RotatingText only after files or crawlData are loaded, then hide after 5 seconds and show View Results
  useEffect(() => {
    if ((files && files.length > 0) || crawlData || uploadedData) {
      setShowRotating(true);
      setShowViewResults(false);
      const timer = setTimeout(() => {
        setShowRotating(false);
        setShowViewResults(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [files, crawlData, uploadedData]);

  // Log crawlData when it changes
  useEffect(() => {
    if (crawlData) {
      console.log("CrawlData in Analyzer:", crawlData);
      console.log("VAD data:", crawlData.vad);
      console.log("Post data:", crawlData.post);
    }
  }, [crawlData]);

  // Function to fetch and show file content
  const handleFileClick = async (fileUrl: string, title: string) => {
    setViewerTitle(title);
    setViewerContent("Loading...");
    try {
      const res = await fetch(fileUrl);
      const text = await res.text();
      setViewerContent(text);
    } catch (err) {
      setViewerContent("Failed to load file.");
    }
  };

  // Function to close viewer
  const closeViewer = () => {
    setViewerContent(null);
    setViewerTitle(null);
  };

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

      {/* Centered Static + Rotating Text or View Results Button */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {/* Loading Animation */}
        {loading && (
          <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <LifeLine color="#32cd32" size="medium" text="Loading" textColor="#fff" />
          </div>
        )}
        {error && (
          <div style={{ color: "#ff6b6b", marginTop: "1rem" }}>Error: {error}</div>
        )}

        {/* Show RotatingText only after files or crawlData are loaded, then hide after 5 seconds */}
        {(showRotating && ((files && files.length > 0) || crawlData || uploadedData)) && (
          <div style={{ display: "flex", alignItems: "center", marginBottom: "2rem" }}>
            <span
              style={{
                fontSize: "3rem",
                fontWeight: 700,
                color: "rgba(255,255,255,0.85)",
                marginRight: "1rem",
                letterSpacing: "1px",
                lineHeight: "1",
              }}
            >
              Text
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                background: "#5227FF",
                color: "#fff",
                borderRadius: "16px",
                padding: "0.5rem 1.5rem",
                fontWeight: 700,
                fontSize: "3rem",
                minWidth: "220px",
                height: "3.5rem",
                lineHeight: "1",
                justifyContent: "center",
                transition: "width 0.3s",
                overflow: "hidden",
              }}
            >
              <RotatingText
                texts={["Reading", "Processing", "Analyzing"]}
                splitBy="words"
                mainClassName=""
                staggerFrom={"last"}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                staggerDuration={0}
                splitLevelClassName=""
                transition={{ type: "spring", damping: 30, stiffness: 400 }}
                rotationInterval={2000}
                auto={true}
              />
            </span>
          </div>
        )}

        {/* Show View Results button after 5 seconds */}
        {showViewResults && ((files && files.length > 0) || crawlData || uploadedData) && (
          <button
            style={{
              background: "#5227FF",
              color: "#fff",
              border: "none",
              borderRadius: "16px",
              padding: "0.75rem 2rem",
              fontWeight: 700,
              fontSize: "2rem",
              cursor: "pointer",
              marginBottom: "2rem",
              boxShadow: "0 2px 8px rgba(82,39,255,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={() => {
              navigate("/results", {
                state: {
                  crawlData: crawlData,
                  uploadedData: uploadedData,
                }
              });
            }}
          >
            <ShinyText text="View Results" speed={2} className="text-lg" />
          </button>
        )}

        {/* Results Section - Removed old file viewer UI */}
        {crawlData?.post && (
          <div id="crawl-info" style={{ color: "#fff", fontSize: "1.2rem", marginTop: "1rem", maxWidth: "800px" }}>
            <strong>Reddit Post Info:</strong>
            <div style={{ 
              background: "rgba(255,255,255,0.1)", 
              padding: "1rem", 
              borderRadius: "12px", 
              marginTop: "0.5rem",
              backdropFilter: "blur(10px)" 
            }}>
              <p><strong>Title:</strong> {crawlData.post.title}</p>
              <p><strong>Subreddit:</strong> r/{crawlData.post.subreddit}</p>
              <p><strong>Author:</strong> u/{crawlData.post.author}</p>
              <p><strong>Comments:</strong> {crawlData.num_comments ?? 0}</p>
              <p><strong>VAD Sentences Analyzed:</strong> {crawlData.vad?.length ?? 0}</p>
              
              <button
                onClick={() => setShowDataViewer(true)}
                style={{
                  marginTop: "1rem",
                  background: "#5227FF",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "0.6rem 1.5rem",
                  fontWeight: 700,
                  fontSize: "1rem",
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(82,39,255,0.3)",
                  transition: "all 0.2s",
                }}
                onMouseOver={(e) => e.currentTarget.style.background = "#6b3fff"}
                onMouseOut={(e) => e.currentTarget.style.background = "#5227FF"}
              >
                📄 View Full Data Report
              </button>
            </div>
          </div>
        )}
        {crawlData && !crawlData.post && (
          <div id="crawl-info" style={{ color: "#fff", fontSize: "1.2rem", marginTop: "1rem", maxWidth: "800px" }}>
            <strong>Analysis Info:</strong>
            <div style={{ 
              background: "rgba(255,255,255,0.1)", 
              padding: "1rem", 
              borderRadius: "12px", 
              marginTop: "0.5rem",
              backdropFilter: "blur(10px)" 
            }}>
              <p><strong>VAD Sentences Analyzed:</strong> {crawlData.vad?.length ?? 0}</p>
              <p><strong>Pipeline Used:</strong> {crawlData.pipeline_used ?? 'N/A'}</p>
              
              <button
                onClick={() => setShowDataViewer(true)}
                style={{
                  marginTop: "1rem",
                  background: "#5227FF",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "0.6rem 1.5rem",
                  fontWeight: 700,
                  fontSize: "1rem",
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(82,39,255,0.3)",
                  transition: "all 0.2s",
                }}
                onMouseOver={(e) => e.currentTarget.style.background = "#6b3fff"}
                onMouseOut={(e) => e.currentTarget.style.background = "#5227FF"}
              >
                📄 View Full Data Report
              </button>
            </div>
          </div>
        )}
        {!crawlData && uploadedData && uploadedData.length > 0 && (
          <div id="upload-info" style={{ color: "#fff", fontSize: "1.2rem", marginTop: "1rem", maxWidth: "800px" }}>
            <strong>Uploaded Files Analysis:</strong>
            <div style={{ 
              background: "rgba(255,255,255,0.1)", 
              padding: "1rem", 
              borderRadius: "12px", 
              marginTop: "0.5rem",
              backdropFilter: "blur(10px)" 
            }}>
              <p><strong>Files Analyzed:</strong> {uploadedData.length}</p>
              <p><strong>Total VAD Sentences:</strong> {uploadedData.reduce((acc, data) => acc + (data.vad?.length ?? 0), 0)}</p>
              
              <button
                onClick={() => setShowDataViewer(true)}
                style={{
                  marginTop: "1rem",
                  background: "#5227FF",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "0.6rem 1.5rem",
                  fontWeight: 700,
                  fontSize: "1rem",
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(82,39,255,0.3)",
                  transition: "all 0.2s",
                }}
                onMouseOver={(e) => e.currentTarget.style.background = "#6b3fff"}
                onMouseOut={(e) => e.currentTarget.style.background = "#5227FF"}
              >
                📄 View Full Data Report
              </button>
            </div>
          </div>
        )}
      </div>

      {/* File Viewer Modal */}
      {viewerContent !== null && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.3)",
            zIndex: 1000,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
          onClick={closeViewer}
        >
          <div
            style={{
              minWidth: "340px",
              maxWidth: "90vw",
              maxHeight: "80vh",
              borderRadius: "24px",
              background: "rgba(255, 255, 255, 0.18)",
              boxShadow: "0px 8px 32px 0px rgba(31, 38, 135, 0.37)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              border: "1px solid rgba(255, 255, 255, 0.28)",
              padding: "32px 32px 24px 32px",
              position: "relative",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              overflowY: "auto",
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3
              style={{
                fontSize: 20,
                letterSpacing: 2,
                color: "#3d4852",
                fontWeight: 700,
                textAlign: "center",
                marginBottom: 24,
              }}
            >
              {viewerTitle}
            </h3>
            <pre
              style={{
                width: "100%",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                color: "#222",
                background: "rgba(255,255,255,0.7)",
                borderRadius: "8px",
                padding: "1rem",
                fontSize: "1rem",
                maxHeight: "60vh",
                overflowY: "auto",
              }}
            >
              {viewerContent}
            </pre>
            <button
              style={{
                marginTop: "1rem",
                background: "#5227FF",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                padding: "0.5rem 1.2rem",
                fontWeight: 700,
                fontSize: "1rem",
                cursor: "pointer",
              }}
              onClick={closeViewer}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Data Viewer Modal - PDF-like format */}
      {showDataViewer && (crawlData || uploadedData) && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.85)",
            zIndex: 2000,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "2rem",
          }}
          onClick={() => setShowDataViewer(false)}
        >
          <div
            style={{
              width: "90%",
              maxWidth: "900px",
              maxHeight: "90vh",
              background: "#ffffff",
              borderRadius: "12px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                background: "linear-gradient(135deg, #5227FF 0%, #7b52ff 100%)",
                padding: "1.5rem 2rem",
                color: "#fff",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h2 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700 }}>
                📊 Analysis Data Report
              </h2>
              <button
                onClick={() => setShowDataViewer(false)}
                style={{
                  background: "rgba(255,255,255,0.2)",
                  border: "none",
                  color: "#fff",
                  borderRadius: "6px",
                  padding: "0.5rem 1rem",
                  cursor: "pointer",
                  fontSize: "1rem",
                  fontWeight: 600,
                  transition: "background 0.2s",
                }}
                onMouseOver={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.3)"}
                onMouseOut={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.2)"}
              >
                ✕ Close
              </button>
            </div>

            {/* Content Area */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "2rem",
                background: "#f8f9fa",
              }}
            >
              {/* Post Information */}
              {crawlData?.post && (
                <div
                  style={{
                    background: "#fff",
                    borderRadius: "8px",
                    padding: "1.5rem",
                    marginBottom: "1.5rem",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  }}
                >
                  <h3 style={{ 
                    margin: "0 0 1rem 0", 
                    color: "#5227FF", 
                    fontSize: "1.25rem",
                    borderBottom: "2px solid #5227FF",
                    paddingBottom: "0.5rem"
                  }}>
                    📝 Post Information
                  </h3>
                  <div style={{ lineHeight: 1.8, color: "#333" }}>
                    <p><strong>Title:</strong> {crawlData.post.title}</p>
                    <p><strong>Subreddit:</strong> r/{crawlData.post.subreddit}</p>
                    <p><strong>Author:</strong> u/{crawlData.post.author}</p>
                    <p><strong>Post ID:</strong> {crawlData.post.post_id}</p>
                    <p><strong>Score:</strong> {crawlData.post.score}</p>
                    <p><strong>Comments:</strong> {crawlData.post.num_comments}</p>
                    <p><strong>URL:</strong> <a href={crawlData.post.url} target="_blank" rel="noopener noreferrer" style={{ color: "#5227FF" }}>{crawlData.post.url}</a></p>
                    {crawlData.post.body && (
                      <div style={{ marginTop: "1rem" }}>
                        <strong>Body:</strong>
                        <div style={{ 
                          background: "#f8f9fa", 
                          padding: "1rem", 
                          borderRadius: "6px", 
                          marginTop: "0.5rem",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word"
                        }}>
                          {crawlData.post.body}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* VAD Analysis */}
              {crawlData?.vad && crawlData.vad.length > 0 && (
                <div
                  style={{
                    background: "#fff",
                    borderRadius: "8px",
                    padding: "1.5rem",
                    marginBottom: "1.5rem",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  }}
                >
                  <h3 style={{ 
                    margin: "0 0 1rem 0", 
                    color: "#5227FF", 
                    fontSize: "1.25rem",
                    borderBottom: "2px solid #5227FF",
                    paddingBottom: "0.5rem"
                  }}>
                    📈 VAD Analysis ({crawlData.vad.length} sentences)
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {crawlData.vad.map((item, index) => (
                      <div
                        key={index}
                        style={{
                          background: "#f8f9fa",
                          borderRadius: "6px",
                          padding: "1rem",
                          borderLeft: "4px solid #5227FF",
                        }}
                      >
                        <p style={{ margin: "0 0 0.5rem 0", fontWeight: 600, color: "#333" }}>
                          Sentence {index + 1}:
                        </p>
                        <p style={{ 
                          margin: "0 0 1rem 0", 
                          color: "#555", 
                          fontStyle: "italic",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word"
                        }}>
                          "{item.sentence}"
                        </p>
                        <div style={{ 
                          display: "grid", 
                          gridTemplateColumns: "repeat(3, 1fr)", 
                          gap: "0.5rem",
                          fontSize: "0.9rem"
                        }}>
                          <div style={{ background: "#e8f5e9", padding: "0.5rem", borderRadius: "4px" }}>
                            <strong>Valence:</strong> {item.valence.toFixed(3)}
                          </div>
                          <div style={{ background: "#fff3e0", padding: "0.5rem", borderRadius: "4px" }}>
                            <strong>Arousal:</strong> {item.arousal.toFixed(3)}
                          </div>
                          <div style={{ background: "#e3f2fd", padding: "0.5rem", borderRadius: "4px" }}>
                            <strong>Dominance:</strong> {item.dominance.toFixed(3)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Uploaded Files VAD Analysis */}
              {uploadedData && uploadedData.length > 0 && (
                <div
                  style={{
                    background: "#fff",
                    borderRadius: "8px",
                    padding: "1.5rem",
                    marginBottom: "1.5rem",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  }}
                >
                  <h3 style={{ 
                    margin: "0 0 1rem 0", 
                    color: "#5227FF", 
                    fontSize: "1.25rem",
                    borderBottom: "2px solid #5227FF",
                    paddingBottom: "0.5rem"
                  }}>
                    📁 Uploaded Files Analysis
                  </h3>
                  {uploadedData.map((fileData, fileIndex) => (
                    <div key={fileIndex} style={{ marginBottom: "1.5rem" }}>
                      <h4 style={{ color: "#333", marginBottom: "0.5rem" }}>File {fileIndex + 1}</h4>
                      {fileData.vad && fileData.vad.length > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                          {fileData.vad.map((item, index) => (
                            <div
                              key={index}
                              style={{
                                background: "#f8f9fa",
                                borderRadius: "6px",
                                padding: "1rem",
                                borderLeft: "4px solid #ff9800",
                              }}
                            >
                              <p style={{ margin: "0 0 0.5rem 0", fontWeight: 600, color: "#333" }}>
                                Sentence {index + 1}:
                              </p>
                              <p style={{ 
                                margin: "0 0 1rem 0", 
                                color: "#555", 
                                fontStyle: "italic",
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word"
                              }}>
                                "{item.sentence}"
                              </p>
                              <div style={{ 
                                display: "grid", 
                                gridTemplateColumns: "repeat(3, 1fr)", 
                                gap: "0.5rem",
                                fontSize: "0.9rem"
                              }}>
                                <div style={{ background: "#e8f5e9", padding: "0.5rem", borderRadius: "4px" }}>
                                  <strong>Valence:</strong> {item.valence.toFixed(3)}
                                </div>
                                <div style={{ background: "#fff3e0", padding: "0.5rem", borderRadius: "4px" }}>
                                  <strong>Arousal:</strong> {item.arousal.toFixed(3)}
                                </div>
                                <div style={{ background: "#e3f2fd", padding: "0.5rem", borderRadius: "4px" }}>
                                  <strong>Dominance:</strong> {item.dominance.toFixed(3)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {fileData.transliteration_sample && (
                        <div style={{ marginTop: "1rem" }}>
                          <strong>Transliteration:</strong>
                          <div style={{ 
                            background: "#f8f9fa", 
                            padding: "0.5rem", 
                            borderRadius: "4px",
                            marginTop: "0.5rem",
                            fontFamily: "monospace",
                            fontSize: "0.9rem"
                          }}>
                            {fileData.transliteration_sample}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Transliteration Sample */}
              {crawlData?.transliteration_sample && (
                <div
                  style={{
                    background: "#fff",
                    borderRadius: "8px",
                    padding: "1.5rem",
                    marginBottom: "1.5rem",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  }}
                >
                  <h3 style={{ 
                    margin: "0 0 1rem 0", 
                    color: "#5227FF", 
                    fontSize: "1.25rem",
                    borderBottom: "2px solid #5227FF",
                    paddingBottom: "0.5rem"
                  }}>
                    🔤 Transliteration Sample
                  </h3>
                  <div style={{ 
                    background: "#f8f9fa", 
                    padding: "1rem", 
                    borderRadius: "6px",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    fontFamily: "monospace",
                    fontSize: "0.95rem",
                    lineHeight: 1.6
                  }}>
                    {crawlData.transliteration_sample}
                  </div>
                </div>
              )}

              {/* Pipeline Info */}
              {crawlData?.pipeline_used && (
                <div
                  style={{
                    background: "#fff",
                    borderRadius: "8px",
                    padding: "1.5rem",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  }}
                >
                  <h3 style={{ 
                    margin: "0 0 1rem 0", 
                    color: "#5227FF", 
                    fontSize: "1.25rem",
                    borderBottom: "2px solid #5227FF",
                    paddingBottom: "0.5rem"
                  }}>
                    ⚙️ Pipeline Information
                  </h3>
                  <p style={{ margin: 0, color: "#333" }}>
                    <strong>Pipeline Used:</strong> {crawlData.pipeline_used}
                  </p>
                </div>
              )}
            </div>

            {/* Footer with Download Button */}
            <div
              style={{
                background: "#f8f9fa",
                padding: "1rem 2rem",
                borderTop: "1px solid #e0e0e0",
                display: "flex",
                justifyContent: "flex-end",
                gap: "1rem",
              }}
            >
              <button
                onClick={() => {
                  const dataToDownload = crawlData || uploadedData;
                  const dataStr = JSON.stringify(dataToDownload, null, 2);
                  const blob = new Blob([dataStr], { type: 'application/json' });
                  const url = window.URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `analysis-data-${Date.now()}.json`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  window.URL.revokeObjectURL(url);
                }}
                style={{
                  background: "#5227FF",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  padding: "0.6rem 1.5rem",
                  cursor: "pointer",
                  fontSize: "1rem",
                  fontWeight: 600,
                  transition: "background 0.2s",
                }}
                onMouseOver={(e) => e.currentTarget.style.background = "#6b3fff"}
                onMouseOut={(e) => e.currentTarget.style.background = "#5227FF"}
              >
                💾 Download as JSON
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analyzer;