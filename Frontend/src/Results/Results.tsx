import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

const Results: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Get files or backendFiles from navigation state
  const files = location.state?.files;
  const backendFiles = location.state?.backendFiles;

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "#060010",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
      }}
    >
      <button
        onClick={() => navigate(-1)}
        style={{
          position: "absolute",
          top: "32px",
          left: "32px",
          background: "#5227FF",
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          padding: "0.5rem 1.2rem",
          fontWeight: 700,
          fontSize: "1.1rem",
          cursor: "pointer",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        }}
      >
        Back
      </button>
      <h1 style={{ marginBottom: "2rem" }}>Results</h1>
      {files && files.length > 0 && (
        <div>
          <strong>Files:</strong>
          <ul>
            {files.map((file: any, idx: number) => (
              <li key={idx}>{file.name}</li>
            ))}
          </ul>
        </div>
      )}
      {backendFiles && (
        <div>
          <strong>Backend Files:</strong>
          <ul>
            <li>{backendFiles.post_file}</li>
            <li>{backendFiles.comments_file}</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default Results;