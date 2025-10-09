import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import RotatingText from "../components/RotatingText";
import Particles from "../components/Particles";
import { LifeLine } from "react-loading-indicators";
import ShinyText from "../components/ShinyText";

const Analyzer: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const files = location.state?.files;
  const link = location.state?.link;

  // State for backend files and viewer
  const [backendFiles, setBackendFiles] = useState<{ post_file: string; comments_file: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewerContent, setViewerContent] = useState<string | null>(null);
  const [viewerTitle, setViewerTitle] = useState<string | null>(null);

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

  // Show RotatingText only after files or backendFiles are loaded, then hide after 5 seconds and show View Results
  useEffect(() => {
    if ((files && files.length > 0) || backendFiles) {
      setShowRotating(true);
      setShowViewResults(false);
      const timer = setTimeout(() => {
        setShowRotating(false);
        setShowViewResults(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [files, backendFiles]);

  // Fetch backend files if link is present
  useEffect(() => {
    if (link) {
      setLoading(true);
      setError(null);
      fetch("http://localhost:8000/fetch-reddit-data/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: link }),
      })
        .then(async (res) => {
          if (!res.ok) throw new Error(await res.text());
          return res.json();
        })
        .then((data) => {
          setBackendFiles(data);
        })
        .catch((err) => {
          setError(typeof err === "string" ? err : err.message);
        })
        .finally(() => setLoading(false));
    }
  }, [link]);

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

        {/* Show RotatingText only after files or backendFiles are loaded, then hide after 5 seconds */}
        {(showRotating && ((files && files.length > 0) || backendFiles)) && (
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
        {showViewResults && ((files && files.length > 0) || backendFiles) && (
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
                  files: files,
                  backendFiles: backendFiles,
                }
              });
            }}
          >
            <ShinyText text="View Results" speed={2} className="text-lg" />
          </button>
        )}

        {/* Results Section */}
        {(files && files.length > 0) && (
          <div id="results-section" style={{ color: "#fff", fontSize: "1.2rem", marginTop: "1rem" }}>
            <strong>Files:</strong>
            <ul>
              {files.map((file: any, idx: number) => (
                <li key={idx}>
                  <button
                    style={{
                      background: "#5227FF",
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      padding: "0.3rem 1rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      marginBottom: "0.5rem",
                    }}
                    onClick={() => handleFileClick(`http://127.0.0.1:8000/download/?filename=${encodeURIComponent(file.name)}`, file.name)}
                  >
                    {file.name} (View)
                  </button>
                  <button
                    style={{
                      background: "#fff",
                      color: "#5227FF",
                      border: "none",
                      borderRadius: "8px",
                      padding: "0.3rem 1rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      marginLeft: "1rem",
                    }}
                    onClick={() => downloadFile(file.name)}
                  >
                    Download
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {backendFiles && (
          <div id="results-section" style={{ color: "#fff", fontSize: "1.2rem", marginTop: "1rem" }}>
            <strong>Backend Files:</strong>
            <ul>
              <li>
                <button
                  style={{
                    background: "#5227FF",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "0.3rem 1rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    marginBottom: "0.5rem",
                  }}
                  onClick={() => handleFileClick(`http://127.0.0.1:8000/download/?filename=${encodeURIComponent(backendFiles.post_file)}`, "Post File")}
                >
                  Post File (View)
                </button>
                <button
                  style={{
                    background: "#fff",
                    color: "#5227FF",
                    border: "none",
                    borderRadius: "8px",
                    padding: "0.3rem 1rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    marginLeft: "1rem",
                  }}
                  onClick={() => downloadFile(backendFiles.post_file)}
                >
                  Download
                </button>
              </li>
              <li>
                <button
                  style={{
                    background: "#5227FF",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "0.3rem 1rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                  onClick={() => handleFileClick(`http://127.0.0.1:8000/download/?filename=${encodeURIComponent(backendFiles.comments_file)}`, "Comments File")}
                >
                  Comments File (View)
                </button>
                <button
                  style={{
                    background: "#fff",
                    color: "#5227FF",
                    border: "none",
                    borderRadius: "8px",
                    padding: "0.3rem 1rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    marginLeft: "1rem",
                  }}
                  onClick={() => downloadFile(backendFiles.comments_file)}
                >
                  Download
                </button>
              </li>
            </ul>
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
    </div>
  );
};

export default Analyzer;