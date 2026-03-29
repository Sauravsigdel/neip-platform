require("dotenv").config({
  path: require("path").resolve(__dirname, "../../.env"),
});
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const OTP = require("../models/OTP");
const Notification = require("../models/Notification");
const axios = require("axios");
const nodemailer = require("nodemailer");
const { sendAlertEmail } = require("../services/emailService");

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("Missing JWT_SECRET environment variable");
}
const OPEN_METEO = "https://api.open-meteo.com/v1/forecast";
const ALLOW_PUBLIC_SIGNUP = process.env.ALLOW_PUBLIC_SIGNUP === "true";

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

const signupLimiter = createRateLimiter({
  keyPrefix: "auth-signup",
  windowMs: 60 * 60 * 1000,
  max: 8,
});
const loginLimiter = createRateLimiter({
  keyPrefix: "auth-login",
  windowMs: 15 * 60 * 1000,
  max: 20,
});
const otpLimiter = createRateLimiter({
  keyPrefix: "auth-otp",
  windowMs: 10 * 60 * 1000,
  max: 12,
});
const resendOtpLimiter = createRateLimiter({
  keyPrefix: "auth-resend-otp",
  windowMs: 30 * 60 * 1000,
  max: 8,
});

// ── Send welcome + AI report notifications after signup ──────────
async function sendWelcomeNotifications(user) {
  try {
    // 1. Welcome notification
    await Notification.create({
      userId: user._id,
      title: "🌏 Welcome to WeatherNepal!",
      message: `Hi ${user.name.split(" ")[0]}! WeatherNepal gives you real-time AQI tracking across all 77 Nepal districts, live weather layers (rain, wind, snow, temperature), AI-powered advisories by Claude, and smart alerts sent to your email when conditions get dangerous. Your location is set to ${user.location}. Click any district pin on the map to explore!`,
      type: "system",
      severity: "info",
      location: user.location,
    });

    // 2. Location weather report using real Open-Meteo data
    if (user.lat && user.lon) {
      try {
        const wxRes = await axios.get(OPEN_METEO, {
          params: {
            latitude: user.lat,
            longitude: user.lon,
            current:
              "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,snowfall,wind_speed_10m,uv_index,weather_code",
            timezone: "Asia/Kathmandu",
          },
          timeout: 8000,
        });
        const wx = wxRes.data.current;
        const month = new Date().toLocaleString("en", { month: "long" });
        const isSpring = [2, 3, 4].includes(new Date().getMonth());

        // Smart local advisory based on real conditions
        const tips = [];
        if (wx.precipitation > 5)
          tips.push(
            `Heavy rain (${wx.precipitation}mm) — carry umbrella and avoid steep roads.`,
          );
        if (wx.snowfall > 0)
          tips.push(
            `Snowfall detected (${wx.snowfall}cm) — dress warmly and check road conditions.`,
          );
        if (wx.wind_speed_10m > 30)
          tips.push(
            `Strong winds (${wx.wind_speed_10m}km/h) — secure loose items.`,
          );
        if (wx.uv_index >= 6)
          tips.push(
            `High UV (${wx.uv_index}/11) — apply sunscreen before going out.`,
          );
        if (wx.temperature_2m < 5)
          tips.push(
            `Cold temperature (${wx.temperature_2m}°C) — layer up warmly.`,
          );
        if (wx.temperature_2m > 33)
          tips.push(
            `Very hot (${wx.temperature_2m}°C) — stay hydrated and avoid midday sun.`,
          );
        if (isSpring && user.location)
          tips.push(
            `March-April burning season — air quality may be affected by agricultural fires.`,
          );
        if (!tips.length)
          tips.push(
            `Conditions look favorable. Enjoy your day in ${user.location}!`,
          );

        const message = `Current conditions in ${user.location}: ${wx.temperature_2m}°C (feels ${wx.apparent_temperature}°C), humidity ${wx.relative_humidity_2m}%, wind ${wx.wind_speed_10m}km/h. ${tips[0]}`;

        await Notification.create({
          userId: user._id,
          title: `🌤️ Your ${user.location} Weather Report`,
          message,
          type: "daily",
          severity: "info",
          location: user.location,
          aqi: 0,
        });
      } catch (wxErr) {
        await Notification.create({
          userId: user._id,
          title: `📍 Your Location: ${user.location}`,
          message: `WeatherNepal is now monitoring weather and air quality for ${user.location}. You will receive daily summaries and instant alerts when conditions become dangerous. Stay safe!`,
          type: "daily",
          severity: "info",
          location: user.location,
        });
      }
    }
    console.log(`[Auth] Welcome notifications sent for ${user.email}`);
  } catch (err) {
    console.error("[Auth] Welcome notification error:", err.message);
  }
}

// ── Nodemailer transporter ───────────────────────────────────────
function getTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

// ── Generate 6-digit OTP ─────────────────────────────────────────
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ── Auth middleware ──────────────────────────────────────────────
const authMiddleware = require("./authMiddleware");

// ── OTP email template ───────────────────────────────────────────
function otpEmailHTML(name, otp) {
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;">
<tr><td align="center">
<table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;">
  <tr><td style="background:linear-gradient(135deg,#0f172a,#1e3a8a);border-radius:16px 16px 0 0;padding:28px 32px;text-align:center;">
    <div style="font-size:28px;margin-bottom:8px;">🌏</div>
    <div style="font-size:22px;font-weight:800;color:#fff;">Weather<span style="color:#38bdf8;">Nepal</span></div>
    <div style="font-size:10px;color:rgba(255,255,255,0.5);letter-spacing:2px;text-transform:uppercase;margin-top:3px;">Nepal Weather Intelligence Platform</div>
  </td></tr>
  <tr><td style="background:#fff;padding:32px;border-radius:0 0 16px 16px;">
    <p style="font-size:16px;color:#1e293b;margin:0 0 8px;font-weight:700;">Welcome, ${name}! 🎉</p>
    <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 20px;">You are one step away from joining WeatherNepal. Verify your email with the code below to get started.</p>
    <div style="text-align:center;margin:20px 0;">
      <div style="display:inline-block;background:#f8fafc;border:2px dashed #3b82f6;border-radius:14px;padding:20px 40px;">
        <div style="font-size:36px;font-weight:900;color:#0f172a;letter-spacing:10px;font-family:'Courier New',monospace;">${otp}</div>
        <div style="font-size:11px;color:#94a3b8;margin-top:6px;">Expires in 10 minutes</div>
      </div>
    </div>
    <div style="background:#f0f9ff;border-radius:12px;padding:16px;margin:20px 0;border:1px solid #bae6fd;">
      <div style="font-size:12px;font-weight:700;color:#0369a1;margin-bottom:10px;">What you get with WeatherNepal:</div>
      <div style="font-size:12px;color:#334155;line-height:2.0;">
        🗺️ Live AQI map for all 77 Nepal districts<br/>
        🌧️ Real-time rain, wind, snow and temperature layers<br/>
        🤖 AI-powered advisories by Claude<br/>
        🔔 Smart alerts when conditions are dangerous<br/>
        📧 Daily weather summaries for your location
      </div>
    </div>
    <p style="font-size:12px;color:#94a3b8;text-align:center;margin:0;">If you did not create this account, please ignore this email.</p>
  </td></tr>
  <tr><td style="text-align:center;padding:16px;">
    <p style="font-size:11px;color:#94a3b8;margin:0;">WeatherNepal - Nepal Environmental Intelligence Platform</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

// ── POST /api/auth/signup ────────────────────────────────────────
router.post("/signup", signupLimiter, async (req, res) => {
  if (!ALLOW_PUBLIC_SIGNUP) {
    return res.status(403).json({
      error: "Public signup is disabled. Admin login only.",
      code: "SIGNUP_DISABLED",
    });
  }
  const { name, email, password, location, district, lat, lon } = req.body;
  const safeEmail = String(email || "")
    .trim()
    .toLowerCase();
  if (!name || !safeEmail || !password || !location)
    return res
      .status(400)
      .json({ error: "name, email, password and location are required" });
  if (!EMAIL_PATTERN.test(safeEmail)) {
    return res.status(400).json({ error: "Invalid email format" });
  }
  if (String(password).length < 6)
    return res
      .status(400)
      .json({ error: "Password must be at least 6 characters" });
  if (!isValidLatLon(lat, lon)) {
    return res.status(400).json({ error: "Invalid latitude/longitude" });
  }

  try {
    const existing = await User.findOne({ email: safeEmail });
    if (existing && existing.isVerified)
      return res.status(409).json({ error: "Email already registered" });

    // Use provided avatarColor or generate random one
    const colors = [
      "#2563eb",
      "#0891b2",
      "#059669",
      "#7c3aed",
      "#db2777",
      "#ea580c",
    ];
    const avatarColor = colors[Math.floor(Math.random() * colors.length)];
    const avatarIndex = req.body.avatarIndex || 1;

    // Create or update unverified user
    let user =
      existing ||
      new User({
        name,
        email: safeEmail,
        password,
        location,
        district,
        lat,
        lon,
        avatarColor,
        avatarIndex,
      });
    if (existing) {
      user.name = name;
      user.password = password;
      user.location = location;
      user.district = district;
      user.lat = lat;
      user.lon = lon;
      user.avatarIndex = avatarIndex;
    }
    await user.save();

    // Generate and save OTP
    await OTP.deleteMany({ email: safeEmail });
    const otp = generateOTP();
    await OTP.create({ email: safeEmail, otp, type: "verify" });

    // Send OTP email
    await getTransporter().sendMail({
      from: `"WeatherNepal" <${process.env.GMAIL_USER}>`,
      to: safeEmail,
      subject: `${otp} — Your WeatherNepal Verification Code`,
      html: otpEmailHTML(name, otp),
    });

    res.json({
      success: true,
      message: `Verification code sent to ${safeEmail}`,
    });
  } catch (err) {
    console.error("[Auth] Signup error:", err.message);
    res.status(500).json({ error: "Signup failed", details: err.message });
  }
});

// ── POST /api/auth/verify-otp ────────────────────────────────────
router.post("/verify-otp", otpLimiter, async (req, res) => {
  if (!ALLOW_PUBLIC_SIGNUP) {
    return res.status(403).json({
      error: "OTP verification is disabled. Admin login only.",
      code: "OTP_DISABLED",
    });
  }
  const { email, otp } = req.body;
  const safeEmail = String(email || "")
    .trim()
    .toLowerCase();
  if (!safeEmail || !otp)
    return res.status(400).json({ error: "email and otp are required" });
  if (!EMAIL_PATTERN.test(safeEmail)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  try {
    // Atomically increment attempts and get the updated record
    // If attempts was already >= 5, the query won't match and returns null
    const otpRecord = await OTP.findOneAndUpdate(
      { email: safeEmail, type: "verify", attempts: { $lt: 5 } },
      { $inc: { attempts: 1 } },
      { new: true },
    );
    if (!otpRecord)
      return res.status(400).json({
        error: "Too many attempts or OTP expired. Please request a new one.",
      });

    if (otpRecord.otp !== otp.toString()) {
      return res.status(400).json({
        error: "Incorrect OTP",
        attemptsLeft: 5 - otpRecord.attempts,
      });
    }

    // Verify user
    const user = await User.findOneAndUpdate(
      { email: safeEmail },
      { isVerified: true },
      { new: true },
    );
    await OTP.deleteOne({ _id: otpRecord._id });

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, {
      expiresIn: "30d",
    });

    // Send welcome + AI report notifications (non-blocking)
    sendWelcomeNotifications(user).catch((e) =>
      console.error("Welcome notif error:", e.message),
    );

    res.json({
      success: true,
      message: "Email verified successfully!",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        location: user.location,
        avatarColor: user.avatarColor,
        avatarIndex: user.avatarIndex || 1,
        initials: user.getInitials(),
      },
    });
  } catch (err) {
    console.error("[Auth] OTP verify error:", err.message);
    res
      .status(500)
      .json({ error: "Verification failed", details: err.message });
  }
});

// ── POST /api/auth/login ─────────────────────────────────────────
router.post("/login", loginLimiter, async (req, res) => {
  const { email, password } = req.body;
  const safeEmail = String(email || "")
    .trim()
    .toLowerCase();
  if (!safeEmail || !password)
    return res.status(400).json({ error: "email and password are required" });
  if (!EMAIL_PATTERN.test(safeEmail)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  try {
    const user = await User.findOne({ email: safeEmail });
    if (!user)
      return res
        .status(401)
        .json({ error: "No account found with this email" });
    if (!user.isVerified)
      return res.status(401).json({ error: "Please verify your email first" });

    // Admin-only login restriction
    if (user.role !== "admin") {
      return res.status(403).json({
        error:
          "Admin login only. Regular users can send alerts via the alert button.",
        code: "NOT_ADMIN",
      });
    }

    const match = await user.comparePassword(password);
    if (!match) return res.status(401).json({ error: "Incorrect password" });

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, {
      expiresIn: "30d",
    });
    res.json({
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
    console.error("[Auth] Login error:", err.message);
    res.status(500).json({ error: "Login failed", details: err.message });
  }
});

// ── GET /api/auth/me ─────────────────────────────────────────────
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user: { ...user.toObject(), initials: user.getInitials() } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/auth/alerts ─────────────────────────────────────────
router.put("/alerts", authMiddleware, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.userId,
      { alerts: req.body.alerts },
      { new: true },
    );
    res.json({ success: true, alerts: user.alerts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/auth/change-password ───────────────────────────────
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
    if (!ok)
      return res.status(401).json({ error: "Current password is incorrect" });

    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/auth/avatar ────────────────────────────────────────
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
    res.json({
      success: true,
      user: {
        ...user.toObject(),
        initials: user.getInitials(),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/auth/resend-otp ────────────────────────────────────
router.post("/resend-otp", resendOtpLimiter, async (req, res) => {
  if (!ALLOW_PUBLIC_SIGNUP) {
    return res.status(403).json({
      error: "OTP resend is disabled. Admin login only.",
      code: "OTP_DISABLED",
    });
  }
  const { email } = req.body;
  const safeEmail = String(email || "")
    .trim()
    .toLowerCase();
  if (!safeEmail) return res.status(400).json({ error: "email is required" });
  if (!EMAIL_PATTERN.test(safeEmail)) {
    return res.status(400).json({ error: "Invalid email format" });
  }
  try {
    const user = await User.findOne({ email: safeEmail });
    if (!user)
      return res
        .status(404)
        .json({ error: "No account found with this email" });
    await OTP.deleteMany({ email: safeEmail });
    const otp = generateOTP();
    await OTP.create({ email: safeEmail, otp, type: "verify" });
    await getTransporter().sendMail({
      from: `"WeatherNepal" <${process.env.GMAIL_USER}>`,
      to: safeEmail,
      subject: `${otp} — Your WeatherNepal Verification Code`,
      html: otpEmailHTML(user.name, otp),
    });
    res.json({ success: true, message: "New OTP sent" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/auth/update-location ───────────────────────────────
// Updates user's lat/lon from their location string
router.put("/update-location", authMiddleware, async (req, res) => {
  const { location, district, lat, lon } = req.body;
  if (!isValidLatLon(lat, lon)) {
    return res.status(400).json({ error: "Invalid latitude/longitude" });
  }
  try {
    const user = await User.findByIdAndUpdate(
      req.userId,
      { location, district, lat, lon },
      { new: true },
    );
    res.json({
      success: true,
      user: {
        location: user.location,
        district: user.district,
        lat: user.lat,
        lon: user.lon,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Helper: Generate AI Weather Advisory ──
function generateWeatherAdvisory(weather, location) {
  const advisories = [];

  // Temperature assessment
  if (weather.temp < 0) {
    advisories.push(
      `❄️ Freezing conditions in ${location}: ${weather.temp}°C. Stay indoors if possible. If traveling, wear heavy winter gear and check road conditions.`,
    );
  } else if (weather.temp < 5) {
    advisories.push(
      `🥶 Cold weather alert for ${location}: ${weather.temp}°C. Keep warm and limit outdoor exposure. At-risk groups should stay indoors.`,
    );
  } else if (weather.temp > 35) {
    advisories.push(
      `🔥 Heat advisory for ${location}: ${weather.temp}°C feels like ${weather.feelsLike}°C. Stay hydrated, avoid prolonged sun exposure, and check on vulnerable individuals.`,
    );
  }

  // Wind assessment
  if (weather.wind > 50) {
    advisories.push(
      `💨 Severe wind warning for ${location}: ${weather.wind} km/h. Secure loose objects, avoid outdoor activities, and exercise caution while driving.`,
    );
  } else if (weather.wind > 40) {
    advisories.push(
      `🌪️ Strong wind advisory for ${location}: ${weather.wind} km/h. Use extra caution outdoors and avoid exposed areas.`,
    );
  }

  // Humidity assessment
  if (weather.humidity > 80) {
    advisories.push(
      `💧 High humidity in ${location}: ${weather.humidity}%. Heat combined with high humidity increases health risks. Stay cool and hydrated.`,
    );
  } else if (weather.humidity < 30) {
    advisories.push(
      `🏜️ Low humidity in ${location}: ${weather.humidity}%. Increased wildfire risk. Avoid burning and be cautious with dry vegetation.`,
    );
  }

  // Rainfall assessment
  if (weather.rain > 20) {
    advisories.push(
      `🌧️ Heavy rainfall warning for ${location}: ${weather.rain}mm expected. Risk of landslides and flooding. Avoid river banks and low-lying areas.`,
    );
  } else if (weather.rain > 5) {
    advisories.push(
      `🌧️ Moderate rain in ${location}: ${weather.rain}mm. Exercise caution on mountain roads; landslide risk increases in hilly areas.`,
    );
  }

  // Snowfall assessment
  if (weather.snow > 10) {
    advisories.push(
      `❄️ Heavy snow warning for ${location}: ${weather.snow}cm. Travel is not recommended. If necessary, check avalanche forecasts and use winter tires.`,
    );
  } else if (weather.snow > 0) {
    advisories.push(
      `❄️ Snowfall expected in ${location}: ${weather.snow}cm. Roads may become slippery. Use winter tires and reduce speed.`,
    );
  }

  // Return advisory
  if (advisories.length === 0) {
    return `🌤️ Generally stable weather conditions in ${location}. Temperature: ${weather.temp}°C, Humidity: ${weather.humidity}%, Wind: ${weather.wind} km/h. Stay updated with WeatherNepal for real-time changes.`;
  }

  return (
    advisories.join(" ") ||
    `Weather update for ${location}: Monitor conditions closely.`
  );
}

// ── POST /api/auth/send-alert-email (PUBLIC - no auth required) ──
// Allows any user to send themselves an alert email without logging in
const alertEmailRateLimiter = createRateLimiter({
  keyPrefix: "alert-email",
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Max 10 alert emails per hour per IP
});

function alertEmailHTML(name, location, message, severity) {
  const colors = {
    critical: "#ef4444",
    high: "#f97316",
    moderate: "#eab308",
    low: "#22c55e",
  };
  const color = colors[severity] || colors.moderate;

  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;">
<tr><td align="center">
<table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;">
  <tr><td style="background:linear-gradient(135deg,#0f172a,#1e3a8a);border-radius:16px 16px 0 0;padding:28px 32px;text-align:center;">
    <div style="font-size:28px;margin-bottom:8px;">🌏</div>
    <div style="font-size:22px;font-weight:800;color:#fff;">Weather<span style="color:#38bdf8;">Nepal</span></div>
    <div style="font-size:10px;color:rgba(255,255,255,0.5);letter-spacing:2px;text-transform:uppercase;margin-top:3px;">Nepal Weather Intelligence Platform</div>
  </td></tr>
  <tr><td style="background:#fff;padding:32px;border-radius:0 0 16px 16px;">
    <div style="display:inline-block;background:${color};color:#fff;padding:6px 12px;border-radius:6px;font-size:11px;font-weight:700;margin-bottom:16px;">${severity.toUpperCase()} ALERT</div>
    <p style="font-size:18px;color:#1e293b;margin:0 0 8px;font-weight:700;">📍 Alert for ${location}</p>
    <div style="background:#f8fafc;border-left:4px solid ${color};border-radius:4px;padding:16px;margin:16px 0;">
      <p style="font-size:14px;color:#475569;line-height:1.6;margin:0;">${message}</p>
    </div>
    <p style="font-size:12px;color:#94a3b8;margin:16px 0 0;text-align:center;">Sent at ${new Date().toLocaleString("en", { timeZone: "Asia/Kathmandu" })} (Nepal Time)</p>
  </td></tr>
  <tr><td style="text-align:center;padding:16px;">
    <p style="font-size:11px;color:#94a3b8;margin:0;">WeatherNepal - Nepal Environmental Intelligence Platform</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

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

  // Validation
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

    // Generate AI Advisory based on weather conditions
    const aiAdvisory = generateWeatherAdvisory(safeWeather, safeLocation);

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

    // Do not block HTTP response on SMTP latency.
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

    res.status(202).json({
      success: true,
      queued: true,
      message: `Alert queued for ${safeEmail}. Delivery may take up to 1 minute.`,
    });
  } catch (err) {
    console.error("[Auth] Send alert email error:", err.message);
    res.status(500).json({
      error: "Failed to send alert email",
      details: err.message,
    });
  }
});

module.exports = { router, authMiddleware };
