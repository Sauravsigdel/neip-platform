require("dotenv").config({
  path: require("path").resolve(__dirname, "../../.env"),
});
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const OTP = require("../models/OTP");
const Notification = require("../models/Notification");
const axios = require("axios");
const nodemailer = require("nodemailer");

const JWT_SECRET = process.env.JWT_SECRET || "weathernepal_secret_2026";
const OPEN_METEO = "https://api.open-meteo.com/v1/forecast";

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
router.post("/signup", async (req, res) => {
  const { name, email, password, location, district, lat, lon } = req.body;
  if (!name || !email || !password || !location)
    return res
      .status(400)
      .json({ error: "name, email, password and location are required" });
  if (password.length < 6)
    return res
      .status(400)
      .json({ error: "Password must be at least 6 characters" });

  try {
    const existing = await User.findOne({ email: email.toLowerCase() });
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
        email,
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
    await OTP.deleteMany({ email: email.toLowerCase() });
    const otp = generateOTP();
    await OTP.create({ email: email.toLowerCase(), otp, type: "verify" });

    // Send OTP email
    await getTransporter().sendMail({
      from: `"WeatherNepal" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: `${otp} — Your WeatherNepal Verification Code`,
      html: otpEmailHTML(name, otp),
    });

    res.json({ success: true, message: `Verification code sent to ${email}` });
  } catch (err) {
    console.error("[Auth] Signup error:", err.message);
    res.status(500).json({ error: "Signup failed", details: err.message });
  }
});

// ── POST /api/auth/verify-otp ────────────────────────────────────
router.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp)
    return res.status(400).json({ error: "email and otp are required" });

  try {
    // Atomically increment attempts and get the updated record
    // If attempts was already >= 5, the query won't match and returns null
    const otpRecord = await OTP.findOneAndUpdate(
      { email: email.toLowerCase(), type: "verify", attempts: { $lt: 5 } },
      { $inc: { attempts: 1 } },
      { new: true },
    );
    if (!otpRecord)
      return res
        .status(400)
        .json({ error: "Too many attempts or OTP expired. Please request a new one." });

    if (otpRecord.otp !== otp.toString()) {
      return res.status(400).json({
        error: "Incorrect OTP",
        attemptsLeft: 5 - otpRecord.attempts,
      });
    }

    // Verify user
    const user = await User.findOneAndUpdate(
      { email: email.toLowerCase() },
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
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "email and password are required" });

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user)
      return res
        .status(401)
        .json({ error: "No account found with this email" });
    if (!user.isVerified)
      return res.status(401).json({ error: "Please verify your email first" });

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

// ── POST /api/auth/resend-otp ────────────────────────────────────
router.post("/resend-otp", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "email is required" });
  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user)
      return res
        .status(404)
        .json({ error: "No account found with this email" });
    await OTP.deleteMany({ email: email.toLowerCase() });
    const otp = generateOTP();
    await OTP.create({ email: email.toLowerCase(), otp, type: "verify" });
    await getTransporter().sendMail({
      from: `"WeatherNepal" <${process.env.GMAIL_USER}>`,
      to: email,
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

module.exports = { router, authMiddleware };
