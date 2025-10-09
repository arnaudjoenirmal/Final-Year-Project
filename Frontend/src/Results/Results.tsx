import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import LightRays from "../components/LightRays";
import DepressionInsightDashboard from "./DepressionInsightDashboard";

const Results: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const files = location.state?.files;
  const backendFiles = location.state?.backendFiles;

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        background: "#060010",
        position: "relative",
        overflowX: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        color: "#fff",
      }}
    >
      {/* Background Light Rays */}
      <div
        style={{
          width: "100vw",
          height: "100vh",
          position: "fixed",
          top: 0,
          left: 0,
          zIndex: 0,
          pointerEvents: "none",
        }}
      >
        <LightRays
          raysOrigin="top-center"
          raysColor="#00ffff"
          raysSpeed={1.5}
          lightSpread={0.8}
          rayLength={1.2}
          followMouse={true}
          mouseInfluence={0.1}
          noiseAmount={0.1}
          distortion={0.05}
          className="custom-rays"
        />
      </div>

      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        style={{
          position: "fixed",
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
          zIndex: 2,
        }}
      >
        Back
      </button>

      {/* Scrollable Content */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: "1200px",
          padding: "100px 24px 64px 24px",
          // No overflow style needed here, the browser default is correct
        }}
      >
        {/* Animated Header */}
        <motion.h1
          initial={{ opacity: 0, y: -40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          viewport={{ once: true }}
          style={{
            textAlign: "center",
            marginBottom: "2.5rem",
            fontSize: "3.5rem",
            fontWeight: 900,
            letterSpacing: "2px",
            fontFamily: "'Inter', 'Segoe UI', 'Arial', sans-serif",
            background: "linear-gradient(90deg, #00ffff 0%, #5227FF 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            textShadow: "0 4px 32px rgba(82,39,255,0.18), 0 1px 2px #00ffff",
            transition: "font-size 0.3s",
          }}
        >
          Results
        </motion.h1>

        {/* Dashboard Section */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.4 }}
          viewport={{ once: true }}
          style={{
            width: "100%",
            background: "rgba(255,255,255,0.08)",
            borderRadius: "24px",
            boxShadow: "0 8px 32px 0 rgba(31,38,135,0.37)",
            padding: "32px",
            marginBottom: "4rem",
          }}
        >
          <DepressionInsightDashboard />
        </motion.div>

      </div>
    </div>
  );
};

export default Results;