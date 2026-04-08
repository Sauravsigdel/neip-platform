const express = require("express");
const axios = require("axios");

const authMiddleware = require("./authMiddleware");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { sendAlertEmail } = require("../services/emailService");

const router = express.Router();
const OPEN_METEO = "https://api.open-meteo.com/v1/forecast";

function getAlertSeverity({ safeAqi, currentWeather }) {
  const rain = parseFloat(currentWeather.rain || 0);
  const snow = parseFloat(currentWeather.snow || 0);
  const wind = Number(currentWeather.wind || 0);
  const temp = Number(currentWeather.temp || 0);

  if (
    (safeAqi != null && safeAqi > 200) ||
    rain > 20 ||
    snow > 5 ||
    wind > 50 ||
    temp < 0 ||
    temp > 38
  ) {
    return "high";
  }

  if (
    (safeAqi != null && safeAqi > 150) ||
    rain > 5 ||
    snow > 0 ||
    wind > 30 ||
    temp < 5 ||
    temp > 35
  ) {
    return "warning";
  }

  return "info";
}

function buildAlertSummary({ safeAqi, currentWeather }) {
  const pieces = [];
  if (safeAqi == null) pieces.push("AQI unavailable");
  else pieces.push(`AQI ${safeAqi}`);

  const rain = parseFloat(currentWeather.rain || 0);
  const snow = parseFloat(currentWeather.snow || 0);
  const wind = Number(currentWeather.wind || 0);
  const temp = Number(currentWeather.temp || 0);

  if (rain > 0) pieces.push(`rain ${rain.toFixed(1)} mm`);
  if (snow > 0) pieces.push(`snow ${snow.toFixed(1)} cm`);
  if (wind > 0) pieces.push(`wind ${Math.round(wind)} km/h`);
  if (temp !== 0) pieces.push(`temp ${Math.round(temp)}°C`);

  return pieces.join(" • ");
}

async function storeAlertNotification({
  userId,
  location,
  district,
  safeAqi,
  currentWeather,
  tips,
  advisory,
}) {
  const severity = getAlertSeverity({ safeAqi, currentWeather });
  const summary = buildAlertSummary({ safeAqi, currentWeather });
  const message = tips.length ? tips.join(" ") : advisory;
  const place = district || location;

  await Notification.create({
    userId,
    isPublic: false,
    title: "Weather Alert",
    message,
    details: summary,
    advisory,
    source: "alert-route",
    type: "alert",
    severity,
    location,
    aqi: safeAqi,
  });

  if (severity === "high" || (safeAqi != null && safeAqi > 150)) {
    await Notification.create({
      isPublic: true,
      title: `Public Weather Alert: ${place}`,
      message: summary,
      details: message,
      advisory,
      source: "alert-route",
      type: "alert",
      severity,
      location,
      aqi: safeAqi,
    });
  }
}

// POST /api/alerts/send-direct
// Admin sends a direct alert email to their own inbox for selected map location.
router.post("/send-direct", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select(
      "name email role location district lat lon",
    );
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { city, district, lat, lon, aqi, weather } = req.body || {};

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

    const tips = [];
    if (safeAqi == null) {
      tips.push(
        "AQI data is currently unavailable for this location. Advisory is based on weather conditions.",
      );
    } else if (safeAqi > 150) {
      tips.push(`AQI ${safeAqi} is unhealthy - wear N95 mask outdoors.`);
    } else {
      tips.push(`Air quality (AQI ${safeAqi}) is acceptable today.`);
    }

    if (parseFloat(currentWeather.rain || 0) > 5) {
      tips.push(`Heavy rain ${currentWeather.rain}mm - risk of flooding.`);
    }
    if (parseFloat(currentWeather.snow || 0) > 0) {
      tips.push("Snowfall detected - check road conditions before travel.");
    }
    if ((currentWeather.wind || 0) > 30) {
      tips.push(
        `Strong winds ${currentWeather.wind}km/h - secure loose items.`,
      );
    }

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
      advisory: tips.join(" "),
    });

    try {
      await storeAlertNotification({
        userId: user._id,
        location: targetCity,
        district: targetDistrict,
        safeAqi,
        currentWeather,
        tips,
        advisory: tips.join(" "),
      });
    } catch (notificationErr) {
      console.error(
        "[Alerts] Notification write error:",
        notificationErr.message,
      );
    }

    return res.json({ success: true, message: `Alert sent to ${user.email}` });
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Failed to send alert", details: err.message });
  }
});

module.exports = router;
