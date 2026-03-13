const express = require("express");
const router = express.Router();
const UserAlert = require("../models/UserAlert");

// ── POST /api/alerts/subscribe ───────────────────────────────────
// Subscribe to weather alerts for a location
router.post("/subscribe", async (req, res) => {
  const { name, email, location, district, lat, lon, alerts } = req.body;

  if (!name || !email || !location) {
    return res
      .status(400)
      .json({ error: "name, email, and location are required" });
  }
  if (!/\S+@\S+\.\S+/.test(email)) {
    return res.status(400).json({ error: "Invalid email address" });
  }

  try {
    // Upsert — update if same email+location already exists
    const alert = await UserAlert.findOneAndUpdate(
      { email: email.toLowerCase(), location },
      {
        name,
        email: email.toLowerCase(),
        location,
        district,
        lat,
        lon,
        alerts,
        active: true,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    res.json({
      success: true,
      message: `Alert subscription activated for ${location}`,
      id: alert._id,
    });
  } catch (err) {
    console.error("[Alerts] Subscribe error:", err.message);
    res.status(500).json({
      error: "Failed to save alert subscription",
      details: err.message,
    });
  }
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
router.get("/all", async (req, res) => {
  try {
    const all = await UserAlert.find({ active: true }).sort({ createdAt: -1 });
    res.json({ count: all.length, subscriptions: all });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
