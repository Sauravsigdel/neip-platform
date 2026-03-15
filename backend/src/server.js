require("dotenv").config(); // ← MUST be first line before any imports
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const initDataSync = require("./services/dataSync");
const initAlertScheduler = require("./services/alertScheduler");
const initNotificationScheduler = require("./services/notificationScheduler");

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

app.use(cors());
app.use(express.json());

connectDB();

// Background services
initDataSync();
initAlertScheduler();
initNotificationScheduler();

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

// Test email
app.post("/api/test-email", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "email is required" });
  try {
    const { sendTestEmail } = require("./services/emailService");
    await sendTestEmail(email);
    res.json({ success: true, message: `Test email sent to ${email}` });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to send test email", details: err.message });
  }
});

// Global error handler (must be after routes and before app.listen)
app.use((err, req, res, next) => {
  console.error('[Error]', err.message);
  res.status(err.status || 500).json({ error: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`WeatherNepal backend running on port ${PORT}`);
});
