import React from "react";
import { useNavigate } from "react-router-dom";
import RotatingText from "../components/RotatingText";
import Particles from "../components/Particles";

const Analyzer: React.FC = () => {
  const navigate = useNavigate();

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
        }}
        aria-label="Go Back"
      >
        ← Back
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

      {/* Centered Static + Rotating Text */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
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
    </div>
  );
};

export default Analyzer;