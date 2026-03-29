require("dotenv").config(); // ← MUST be first line before any imports
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const initDataSync = require("./services/dataSync");
const adminMiddleware = require("./routes/adminMiddleware");

// Route imports
const aqiRoutes = require("./routes/aqiRoutes");
const weatherRoutes = require("./routes/weatherRoutes");
const riskRoutes = require("./routes/riskRoutes");
const mapRoutes = require("./routes/mapRoutes");
const advisoryRoutes = require("./routes/advisoryRoutes");
const alertRoutes = require("./routes/alertRoutes");
const { router: authRoutes } = require("./routes/authRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const fireRoutes = require("./routes/fireRoutes");
const owmProxy = require("./routes/owmProxy");

const app = express();

const allowedOrigins = (
  process.env.CORS_ORIGINS ||
  "http://localhost:5173,http://localhost:5174,http://localhost:5175"
)
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("CORS origin not allowed"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json({ limit: "1mb" }));

connectDB();

// Background services
initDataSync();
// Legacy user-email scheduler removed.

// Routes
app.use("/api/aqi", aqiRoutes);
app.use("/api/weather", weatherRoutes);
app.use("/api/risk", riskRoutes);
app.use("/api/map", mapRoutes);
app.use("/api/advisory", advisoryRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/fire", fireRoutes);
app.use("/api/owm-tile", owmProxy);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Test email (admin-only)
app.post("/api/test-email", adminMiddleware, async (req, res) => {
  const email = String(req.body?.email || "")
    .trim()
    .toLowerCase();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailPattern.test(email)) {
    return res.status(400).json({ error: "A valid email is required" });
  }
  try {
    const { sendTestEmail } = require("./services/emailService");
    await sendTestEmail(email);
    res.json({ success: true, message: `Test email sent to ${email}` });
  } catch {
    res.status(500).json({ error: "Failed to send test email" });
  }
});

// Global error handler (must be after routes and before app.listen)
app.use((err, req, res, next) => {
  console.error("[Error]", err.message);
  res.status(err.status || 500).json({ error: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`WeatherNepal backend running on port ${PORT}`);
});
