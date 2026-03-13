const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const initDataSync = require("./services/dataSync");
const initAlertScheduler = require("./services/alertScheduler");

// Route imports
const aqiRoutes = require("./routes/aqiRoutes");
const weatherRoutes = require("./routes/weatherRoutes");
const riskRoutes = require("./routes/riskRoutes");
const mapRoutes = require("./routes/mapRoutes");
const advisoryRoutes = require("./routes/advisoryRoutes");
const alertRoutes = require("./routes/alertRoutes");

dotenv.config();
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection
connectDB();

// Initialize Background Services
initDataSync();
initAlertScheduler();

// API Routes
app.use("/api/aqi", aqiRoutes);
app.use("/api/weather", weatherRoutes);
app.use("/api/risk", riskRoutes);
app.use("/api/map", mapRoutes);
app.use("/api/advisory", advisoryRoutes);
app.use("/api/alerts", alertRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Test email endpoint — send yourself a test alert
// POST /api/test-email  { "email": "you@gmail.com" }
app.post("/api/test-email", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "email is required" });
  try {
    const { sendTestEmail } = require("./services/emailService");
    await sendTestEmail(email);
    res.json({ success: true, message: `Test email sent to ${email}` });
  } catch (err) {
    console.error("[Test Email] Error:", err.message);
    res
      .status(500)
      .json({ error: "Failed to send test email", details: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`WeatherNepal backend running on port ${PORT}`);
});
