const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification");
const authMiddleware = require("./authMiddleware");

// ── GET /api/notifications ───────────────────────────────────────
// Get all notifications for logged-in user
router.get("/", authMiddleware, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(50);
    const unreadCount = await Notification.countDocuments({
      userId: req.userId,
      read: false,
    });
    res.json({ notifications, unreadCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/notifications/:id/read ─────────────────────────────
router.put("/:id/read", authMiddleware, async (req, res) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { read: true },
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/notifications/read-all ─────────────────────────────
router.put("/read-all", authMiddleware, async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.userId, read: false },
      { read: true },
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/notifications/:id ───────────────────────────────
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    await Notification.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/notifications/clear-all ─────────────────────────
router.delete("/clear-all", authMiddleware, async (req, res) => {
  try {
    await Notification.deleteMany({ userId: req.userId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
