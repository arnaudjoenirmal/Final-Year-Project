import React, { useRef, useState } from "react";
import Progress from "../components/Progress";
import PrismaticBurst from "../components/PrismaticBurst";
import Hyperspeed from "../components/Hyperspeed";
import { useNavigate } from "react-router-dom";
import StaggeredMenu from "../components/StaggeredMenu";
import ShinyText from "../components/ShinyText";
import Magnet from "../components/Magnet";

const menuItems = [
  { label: "Home", ariaLabel: "Go to home page", link: "/" },
  { label: "About", ariaLabel: "Learn about us", link: "/about" },
  { label: "LogOut", ariaLabel: "Log out of your account", link: "/login" },
];

const socialItems = [{ label: "GitHub", link: "https://github.com" }];

interface FileInfo {
  name: string;
  icon: string;
  file?: File; // Store actual file object
}

function getIconType(ext: string | undefined): string {
  if (!ext) return "UNKNOWN";
  const normalized = ext.toUpperCase();
  return normalized === "TXT" ? "TXT" : "UNKNOWN";
}

const Home: React.FC = () => {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [filenames, setNames] = useState<FileInfo[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [uploadingStatus, setUploadingStatus] = useState<boolean[]>([]);
  const [showLinkBox, setShowLinkBox] = useState(false);
  const [linkValue, setLinkValue] = useState("");
  const [linkProcessing, setLinkProcessing] = useState(false);

  React.useEffect(() => {
    if (sessionStorage.getItem("isAuthenticated") !== "true") {
      navigate("/login");
    }
  }, [navigate]);

  
  const handleMenuItemClick = (item: any) => {
    if (item.label === "LogOut") {
      sessionStorage.removeItem("isAuthenticated");
      navigate("/login");
    } else if (item.link) {
      navigate(item.link);
    }
  };


  const removeFile = (index: number) => {
    setNames(prev => prev.filter((_, i) => i !== index));
    setUploadingStatus(prev => prev.filter((_, i) => i !== index));
  };

  const fileHandler = (files: FileList | File[]) => {
    const fileArr = Array.from(files);
    if (fileArr.length === 0) return;

    const fNames = fileArr
      .filter(file => file.name.split(".").pop()?.toLowerCase() === "txt")
      .map((file) => ({
        name: file.name,
        icon: getIconType(file.name.split(".").pop()),
        file: file, // Store the actual file
      }));

    if (fNames.length === 0) {
      alert("Only .txt files are allowed.");
      return;
    }

    setNames((prev) => [...prev, ...fNames]);
    setUploadingStatus((prev) => [...prev, ...fNames.map(() => true)]);
  };

  const filePicker = () => inputRef.current?.click();

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      fileHandler(e.dataTransfer.files);
    }
  };

  const handleProgressComplete = (index: number) => {
    setUploadingStatus(prev => {
      const updated = [...prev];
      updated[index] = false;
      return updated;
    });
  };

  const isUploading = uploadingStatus.some(status => status);

  const handleAnalyze = async () => {
    if (filenames.length === 0) {
      alert("Please upload at least one file before analyzing.");
      return;
    }

    // Upload all files to backend and collect responses
    const uploadPromises = filenames.map(async (fileInfo) => {
      if (!fileInfo.file) return null;
      
      const formData = new FormData();
      formData.append("file", fileInfo.file);

      try {
        const response = await fetch("http://127.0.0.1:8000/upload-file", {
          method: "POST",
          body: formData,
          mode: 'cors', // Explicitly set CORS mode
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to upload ${fileInfo.name}: ${response.status} ${errorText}`);
        }

        return await response.json();
      } catch (error: any) {
        console.error(`Error uploading ${fileInfo.name}:`, error);
        // Show specific error message
        if (error.message.includes('NetworkError') || error.message.includes('fetch')) {
          alert(`Backend server error: Cannot connect to http://127.0.0.1:8000\n\nPlease ensure:\n1. Backend server is running\n2. CORS is enabled in FastAPI\n\nError: ${error.message}`);
        }
        return null;
      }
    });

    const results = await Promise.all(uploadPromises);
    const validResults = results.filter(r => r !== null);

    console.log("Upload results:", validResults);

    if (validResults.length === 0) {
      alert("Failed to upload files. Please check:\n1. Backend server is running on port 8000\n2. CORS middleware is configured\n3. Check browser console for details");
      return;
    }

    navigate("/analyzer", { state: { files: filenames, uploadedData: validResults } });
  };

  const handleLinkAnalyze = async () => {
    if (!linkValue.trim()) {
      alert("Please enter a link before analyzing.");
      return;
    }

    setLinkProcessing(true);

    try {
      // Create FormData instead of JSON
      const formData = new FormData();
      formData.append("url", linkValue.trim());

      const response = await fetch("http://127.0.0.1:8000/crawl", {
        method: "POST",
        body: formData, // Send as FormData, not JSON
        mode: 'cors', // Explicitly set CORS mode
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to process link");
      }

      const crawlData = await response.json();
      console.log("Crawl data from Home:", crawlData);

      setShowLinkBox(false);
      setLinkValue("");
      setLinkProcessing(false);

      // Navigate to analyzer with the crawl data directly
      navigate("/analyzer", { state: { crawlData: crawlData } });
    } catch (error: any) {
      setLinkProcessing(false);
      alert(`Error: ${error.message}`);
    }
  };

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Sidebar Menu - render first */}
      <StaggeredMenu
        position="right"
        items={menuItems}
        socialItems={socialItems}
        displaySocials={true}
        displayItemNumbering={true}
        menuButtonColor="#fff"
        openMenuButtonColor="#0c0101ff"
        changeMenuColorOnOpen={true}
        colors={["#B19EEF", "#5227FF"]}
        logoUrl="./Logo.png"
        accentColor="#ff6b6b"
        onMenuOpen={() => console.log("Menu opened")}
        onMenuClose={() => console.log("Menu closed")}
        onItemClick={handleMenuItemClick}
      />

      {/* Conditional Background Animation */}
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
        {isUploading || linkProcessing ? (
          <Hyperspeed effectOptions={{ /* ... */ }} />
        ) : (
          <PrismaticBurst
            animationType="rotate3d"
            intensity={2}
            speed={0.5}
            distort={1.0}
            paused={false}
            offset={{ x: 0, y: 0 }}
            hoverDampness={0.25}
            rayCount={24}
            mixBlendMode="lighten"
          />
        )}
      </div>

      {/* Upload Card */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 10,
        }}
      >
        <div
          className="container"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: "370px",
            minHeight: "410px",
            borderRadius: "24px",
            background: "rgba(255, 255, 255, 0.18)",
            boxShadow: "0px 8px 32px 0px rgba(31, 38, 135, 0.37)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            border: "1px solid rgba(255, 255, 255, 0.28)",
            padding: "32px 32px 24px 32px",
            position: "relative",
          }}
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
            UPLOAD FILE
          </h3>

          {/* Uploaded File Progress */}
          <div style={{ width: "100%", marginBottom: 24 }}>
            {filenames.map((file, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
                <Progress
                  name={file.name}
                  icon={file.icon}
                  onComplete={() => handleProgressComplete(i)}
                />
                <button
                  style={{
                    marginLeft: 8,
                    background: "#ff6b6b",
                    color: "#fff",
                    border: "none",
                    borderRadius: "4px",
                    padding: "4px 8px",
                    cursor: "pointer",
                    fontSize: "14px"
                  }}
                  onClick={() => removeFile(i)}
                  aria-label={`Remove ${file.name}`}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          {/* File Drop / Click Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={filePicker}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
              width: "270px",
              height: "180px",
              borderRadius: "18px",
              border: `2px dashed ${
                isDragging ? "#0057ff" : isHovered ? "#688ee8" : "#688ee8"
              }`,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              background: isDragging ? "#eef3ff" : "#fff",
              cursor: "pointer",
              transition: "all 0.25s ease",
              transform: isDragging ? "scale(1.03)" : "scale(1)",
            }}
          >
            <p
              style={{
                fontSize: "17px",
                letterSpacing: "2px",
                color: "#3d4852",
                fontWeight: 500,
                textAlign: "center",
                margin: 0,
                userSelect: "none",
              }}
            >
              DRAG FILE HERE <br /> OR{" "}
              <span
                style={{
                  color: "#688ee8",
                  fontWeight: 600,
                  textDecoration: "underline",
                }}
              >
                BROWSE
              </span>
            </p>
          </div>

          {/* Hidden File Input */}
          <input
            accept=".txt"
            style={{ display: "none" }}
            ref={inputRef}
            multiple
            type="file"
            onChange={(e) => fileHandler(e.target.files as FileList)}
          />

          {/* Start Analyzing Button - only show if files are uploaded */}
          {filenames.length > 0 && (
            <button
              className="w-full py-2 rounded flex items-center justify-center btn-animate"
              style={{
                background: "#060010",
                color: "white",
                fontWeight: "bold",
                marginTop: "1.5rem",
                cursor: "pointer",
                fontSize: "1.1rem",
                border: "none",
                outline: "none",
                transition: "background 0.2s",
              }}
              onClick={handleAnalyze}
            >
              <ShinyText text="START ANALYZING" speed={2} className="text-lg" />
            </button>
          )}

          {/* Drop Links Magnet Button - centered under the box */}
          <div style={{ width: "100%", display: "flex", justifyContent: "center", marginTop: "2rem" }}>
            <Magnet padding={100} disabled={false} magnetStrength={100}>
              <button
                style={{
                  width: "180px",
                  padding: "0.75rem 0",
                  background: "rgba(82,39,255,0.18)",
                  color: "#fff",
                  fontWeight: "bold",
                  fontSize: "1.1rem",
                  border: "1px solid rgba(255,255,255,0.28)",
                  borderRadius: "12px",
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(82,39,255,0.15)",
                  backdropFilter: "blur(14px)",
                  WebkitBackdropFilter: "blur(14px)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  transition: "background 0.2s",
                }}
                onClick={() => setShowLinkBox(true)}
              >
                <ShinyText text="Drop Links" speed={2} className="text-lg" />
              </button>
            </Magnet>
          </div>
        </div>
      </div>

      {/* Glassmorphism Link Box Modal */}
      {showLinkBox && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.2)",
            zIndex: 100,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
          onClick={() => !linkProcessing && setShowLinkBox(false)}
        >
          <div
            style={{
              minWidth: "340px",
              maxWidth: "90vw",
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
              Add your Reddit link here
            </h3>
            <input
              type="text"
              value={linkValue}
              onChange={e => setLinkValue(e.target.value)}
              placeholder="Paste your Reddit link..."
              disabled={linkProcessing}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid #688ee8",
                fontSize: "16px",
                marginBottom: "1.5rem",
                background: linkProcessing ? "#e0e0e0" : "#f8faff",
                color: "#3d4852",
                cursor: linkProcessing ? "not-allowed" : "text",
              }}
            />
            <button
              className="w-full py-2 rounded flex items-center justify-center btn-animate"
              style={{
                background: "#060010",
                color: "white",
                fontWeight: "bold",
                marginTop: "0.5rem",
                cursor: (linkValue.trim() && !linkProcessing) ? "pointer" : "not-allowed",
                fontSize: "1.1rem",
                border: "none",
                outline: "none",
                transition: "background 0.2s",
                opacity: (linkValue.trim() && !linkProcessing) ? 1 : 0.6,
              }}
              onClick={handleLinkAnalyze}
              disabled={!linkValue.trim() || linkProcessing}
            >
              <ShinyText 
                text={linkProcessing ? "PROCESSING..." : "START ANALYZING"} 
                speed={2} 
                className="text-lg" 
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
