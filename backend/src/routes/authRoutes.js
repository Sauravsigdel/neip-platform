require("dotenv").config({
  path: require("path").resolve(__dirname, "../../.env"),
});

const express = require("express");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const authMiddleware = require("./authMiddleware");
const { sendAlertEmail } = require("../services/emailService");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("Missing JWT_SECRET environment variable");
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidLatLon(lat, lon) {
  if (lat == null || lon == null) return true;
  const nLat = Number(lat);
  const nLon = Number(lon);
  return (
    Number.isFinite(nLat) &&
    Number.isFinite(nLon) &&
    nLat >= -90 &&
    nLat <= 90 &&
    nLon >= -180 &&
    nLon <= 180
  );
}

function createRateLimiter({ keyPrefix, windowMs, max }) {
  const store = new Map();
  return (req, res, next) => {
    const ip = req.ip || req.headers["x-forwarded-for"] || "unknown";
    const key = `${keyPrefix}:${ip}`;
    const now = Date.now();
    const row = store.get(key);

    if (!row || now > row.expiresAt) {
      store.set(key, { count: 1, expiresAt: now + windowMs });
      return next();
    }

    row.count += 1;
    if (row.count > max) {
      const retryAfter = Math.ceil((row.expiresAt - now) / 1000);
      res.set("Retry-After", String(retryAfter));
      return res
        .status(429)
        .json({ error: "Too many requests. Try again later." });
    }

    return next();
  };
}

const loginLimiter = createRateLimiter({
  keyPrefix: "auth-login",
  windowMs: 15 * 60 * 1000,
  max: 20,
});

const alertEmailRateLimiter = createRateLimiter({
  keyPrefix: "alert-email",
  windowMs: 60 * 60 * 1000,
  max: 10,
});

// POST /api/auth/login
// Admin-only login endpoint.
router.post("/login", loginLimiter, async (req, res) => {
  const { email, password } = req.body || {};
  const safeEmail = String(email || "")
    .trim()
    .toLowerCase();

  if (!safeEmail || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }
  if (!EMAIL_PATTERN.test(safeEmail)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  try {
    const user = await User.findOne({ email: safeEmail });
    if (!user) {
      return res
        .status(401)
        .json({ error: "No account found with this email" });
    }
    if (!user.isVerified) {
      return res.status(401).json({ error: "Admin account is not verified" });
    }
    if (user.role !== "admin") {
      return res.status(403).json({
        error:
          "Admin login only. Regular users can send alerts via the alert button.",
        code: "NOT_ADMIN",
      });
    }

    const passwordMatch = await user.comparePassword(password);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Incorrect password" });
    }

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, {
      expiresIn: "30d",
    });

    return res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        location: user.location,
        district: user.district,
        lat: user.lat,
        lon: user.lon,
        avatarColor: user.avatarColor,
        avatarIndex: user.avatarIndex || 1,
        initials: user.getInitials(),
        role: user.role,
        alerts: user.alerts,
      },
    });
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Login failed", details: err.message });
  }
});

// GET /api/auth/me
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });

    return res.json({
      user: { ...user.toObject(), initials: user.getInitials() },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT /api/auth/change-password
router.put("/change-password", authMiddleware, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    return res
      .status(400)
      .json({ error: "currentPassword and newPassword are required" });
  }
  if (String(newPassword).length < 6) {
    return res
      .status(400)
      .json({ error: "New password must be at least 6 characters" });
  }
  if (currentPassword === newPassword) {
    return res
      .status(400)
      .json({ error: "New password must be different from current password" });
  }

  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const ok = await user.comparePassword(currentPassword);
    if (!ok) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    user.password = newPassword;
    await user.save();

    return res.json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT /api/auth/avatar
router.put("/avatar", authMiddleware, async (req, res) => {
  const avatarIndex = Number(req.body?.avatarIndex);
  if (!Number.isInteger(avatarIndex) || avatarIndex < 1 || avatarIndex > 9) {
    return res
      .status(400)
      .json({ error: "avatarIndex must be between 1 and 9" });
  }

  try {
    const user = await User.findByIdAndUpdate(
      req.userId,
      { avatarIndex },
      { new: true },
    ).select(
      "name email avatarIndex avatarColor role location district lat lon",
    );

    if (!user) return res.status(404).json({ error: "User not found" });

    return res.json({
      success: true,
      user: {
        ...user.toObject(),
        initials: user.getInitials(),
      },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT /api/auth/update-location
router.put("/update-location", authMiddleware, async (req, res) => {
  const { location, district, lat, lon } = req.body || {};

  if (!isValidLatLon(lat, lon)) {
    return res.status(400).json({ error: "Invalid latitude/longitude" });
  }

  try {
    const user = await User.findByIdAndUpdate(
      req.userId,
      { location, district, lat, lon },
      { new: true },
    );

    if (!user) return res.status(404).json({ error: "User not found" });

    return res.json({
      success: true,
      user: {
        location: user.location,
        district: user.district,
        lat: user.lat,
        lon: user.lon,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/send-alert-email (public)
router.post("/send-alert-email", alertEmailRateLimiter, async (req, res) => {
  const { email, name, location, message, severity, weather, alertPrefs } =
    req.body || {};

  const safeEmail = String(email || "")
    .trim()
    .toLowerCase();
  const safeName = String(name || "User").trim();
  const safeLocation = String(location || "Nepal").trim();
  const safeMessage = String(message || "Alert from WeatherNepal").trim();

  const safeSeverity = ["critical", "high", "moderate", "low"].includes(
    String(severity || "").toLowerCase(),
  )
    ? String(severity).toLowerCase()
    : "moderate";

  if (!safeEmail) {
    return res.status(400).json({ error: "email is required" });
  }
  if (!EMAIL_PATTERN.test(safeEmail)) {
    return res.status(400).json({ error: "Invalid email format" });
  }
  if (safeMessage.length < 5) {
    return res
      .status(400)
      .json({ error: "Message must be at least 5 characters" });
  }

  try {
    const fallbackWeather = {
      temp: 20,
      feelsLike: 20,
      humidity: 60,
      wind: 10,
      rain: 0,
      snow: 0,
    };

    const safeWeather = {
      temp: Number.isFinite(Number(weather?.temp))
        ? Number(weather.temp)
        : fallbackWeather.temp,
      feelsLike: Number.isFinite(Number(weather?.feelsLike))
        ? Number(weather.feelsLike)
        : fallbackWeather.feelsLike,
      humidity: Number.isFinite(Number(weather?.humidity))
        ? Number(weather.humidity)
        : fallbackWeather.humidity,
      wind: Number.isFinite(Number(weather?.wind))
        ? Number(weather.wind)
        : fallbackWeather.wind,
      rain: Number.isFinite(Number(weather?.rain))
        ? Number(weather.rain)
        : fallbackWeather.rain,
      snow: Number.isFinite(Number(weather?.snow))
        ? Number(weather.snow)
        : fallbackWeather.snow,
    };

    const prefs = {
      aqi: Boolean(alertPrefs?.aqi),
      rain: Boolean(alertPrefs?.rain),
      wind: Boolean(alertPrefs?.wind),
      snow: Boolean(alertPrefs?.snow),
      temp: Boolean(alertPrefs?.temp),
      daily: Boolean(alertPrefs?.daily),
      aqiUnavailable: true,
    };

    const aiAdvisory = `${safeMessage} Severity: ${safeSeverity}.`;

    const emailPayload = {
      to: safeEmail,
      name: safeName,
      location: safeLocation,
      district: safeLocation,
      weather: {
        temperature: safeWeather.temp,
        feelsLike: safeWeather.feelsLike,
        humidity: safeWeather.humidity,
        windSpeed: safeWeather.wind,
        rainfall: safeWeather.rain,
        snowfall: safeWeather.snow,
      },
      aqi: null,
      alerts: prefs,
      advisory: aiAdvisory,
    };

    setImmediate(async () => {
      try {
        await sendAlertEmail(emailPayload);
      } catch (sendErr) {
        console.error(
          "[Auth] Background send alert email error:",
          sendErr.message,
        );
      }
    });

    return res.status(202).json({
      success: true,
      queued: true,
      message: `Alert queued for ${safeEmail}. Delivery may take up to 1 minute.`,
    });
  } catch (err) {
    return res.status(500).json({
      error: "Failed to send alert email",
      details: err.message,
    });
  }
});

module.exports = { router, authMiddleware };
