const express = require("express");
const router = express.Router();
const UserAlert = require("../models/UserAlert");
const axios = require("axios");
const authMiddleware = require("./authMiddleware");
const adminMiddleware = require("./adminMiddleware");
const User = require("../models/User");
const {
  sendAlertEmail,
  sendConfirmationEmail,
} = require("../services/emailService");

const OPEN_METEO = "https://api.open-meteo.com/v1/forecast";

// ── POST /api/alerts/subscribe ───────────────────────────────────
// Subscribe to weather alerts for a location
router.post("/subscribe", async (req, res) => {
  return res.status(503).json({
    success: false,
    paused: true,
    error: "Subscription-based email alerts are temporarily paused.",
    message:
      "Please use direct alerts for now. AQI may be unavailable in some locations; alerts will rely on temperature, wind, rain, and snow conditions with advisory guidance.",
  });
});

// ── GET /api/alerts/subscriptions?email= ────────────────────────
// Get all subscriptions for an email
router.get("/subscriptions", async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: "email is required" });

  try {
    const subs = await UserAlert.find({
      email: email.toLowerCase(),
      active: true,
    });
    res.json(subs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/alerts/unsubscribe ───────────────────────────────
// Unsubscribe from alerts
router.delete("/unsubscribe", async (req, res) => {
  const { email, location } = req.body;
  if (!email) return res.status(400).json({ error: "email is required" });

  try {
    const query = { email: email.toLowerCase() };
    if (location) query.location = location;
    await UserAlert.updateMany(query, { active: false });
    res.json({ success: true, message: "Unsubscribed successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/alerts/all ──────────────────────────────────────────
// Admin: get all active subscriptions
router.get("/all", adminMiddleware, async (req, res) => {
  try {
    const all = await UserAlert.find({ active: true }).sort({ createdAt: -1 });
    res.json({ count: all.length, subscriptions: all });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/alerts/send-direct ────────────────────────────────
// Logged-in user sends themselves an alert for any city
router.post("/send-direct", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const { city, district, lat, lon, aqi, weather } = req.body;

    const targetLat = lat ?? user.lat;
    const targetLon = lon ?? user.lon;
    const targetDistrict = district ?? user.district;
    const targetCity = city ?? user.location ?? "Unknown";

    let currentWeather = {
      temp: weather?.temp,
      feelsLike: weather?.feelsLike,
      humidity: weather?.humidity,
      wind: weather?.wind,
      rain: weather?.rain,
      snow: weather?.snow,
    };

    if (
      (currentWeather.temp == null || currentWeather.humidity == null) &&
      targetLat != null &&
      targetLon != null
    ) {
      const wxRes = await axios.get(OPEN_METEO, {
        params: {
          latitude: targetLat,
          longitude: targetLon,
          current:
            "temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,snowfall,wind_speed_10m",
          timezone: "Asia/Kathmandu",
        },
        timeout: 10000,
      });

      const c = wxRes.data?.current || {};
      currentWeather = {
        temp: c.temperature_2m,
        feelsLike: c.apparent_temperature,
        humidity: c.relative_humidity_2m,
        wind: c.wind_speed_10m,
        rain: c.precipitation,
        snow: c.snowfall,
      };
    }

    const safeAqi = Number.isFinite(Number(aqi)) ? Number(aqi) : null;

    // Transparent local advisory when AQI is unavailable.
    const tips = [];
    if (safeAqi == null) {
      tips.push(
        "AQI data is currently unavailable for this location. Advisory is based on weather conditions.",
      );
    } else if (safeAqi > 150) {
      tips.push(`AQI ${safeAqi} is unhealthy — wear N95 mask outdoors.`);
    } else {
      tips.push(`Air quality (AQI ${safeAqi}) is acceptable today.`);
    }
    if (parseFloat(currentWeather.rain || 0) > 5)
      tips.push(
        `Heavy rain ${currentWeather.rain}mm — risk of flooding, stay safe.`,
      );
    if (parseFloat(currentWeather.snow || 0) > 0)
      tips.push(`Snowfall detected — check road conditions before travel.`);
    if ((currentWeather.wind || 0) > 30)
      tips.push(
        `Strong winds ${currentWeather.wind}km/h — secure loose items.`,
      );
    const advisory = tips.join(" ");

    await sendAlertEmail({
      to: user.email,
      name: user.name,
      location: targetCity,
      district: targetDistrict,
      weather: {
        temperature: currentWeather.temp,
        feelsLike: currentWeather.feelsLike,
        humidity: currentWeather.humidity,
        windSpeed: currentWeather.wind,
        rainfall: currentWeather.rain,
        snowfall: currentWeather.snow,
      },
      aqi: safeAqi,
      alerts: {
        aqi: safeAqi != null && safeAqi > 150,
        aqiUnavailable: safeAqi == null,
        rain: parseFloat(currentWeather.rain || 0) > 5,
        wind: (currentWeather.wind || 0) > 30,
        snow: parseFloat(currentWeather.snow || 0) > 0,
      },
      advisory,
    });

    res.json({ success: true, message: `Alert sent to ${user.email}` });
  } catch (err) {
    console.error("[Alerts] Send direct error:", err.message);
    res
      .status(500)
      .json({ error: "Failed to send alert", details: err.message });
  }
});

module.exports = router;
