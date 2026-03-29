import React from "react";
import { Link } from "react-router-dom";

function NotFoundPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background:
          "radial-gradient(circle at 20% 20%, #0f172a 0%, #020617 45%, #000 100%)",
        color: "#e2e8f0",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "min(640px, 100%)",
          border: "1px solid #1e293b",
          borderRadius: "16px",
          padding: "28px",
          background: "rgba(15, 23, 42, 0.8)",
          boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "56px", fontWeight: 900, color: "#38bdf8" }}>
          404
        </div>
        <h1 style={{ margin: "10px 0 8px", fontSize: "28px", color: "#fff" }}>
          Page Not Found
        </h1>
        <p style={{ margin: "0 0 22px", color: "#94a3b8", lineHeight: 1.6 }}>
          The page you are looking for does not exist or may have been moved.
        </p>
        <Link
          to="/"
          style={{
            display: "inline-block",
            textDecoration: "none",
            color: "#fff",
            background: "linear-gradient(135deg, #1d4ed8, #0284c7)",
            padding: "12px 20px",
            borderRadius: "10px",
            fontWeight: 700,
          }}
        >
          Back to Weather Map
        </Link>
      </div>
    </div>
  );
}

export default NotFoundPage;
