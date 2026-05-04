const express = require("express");
const router = express.Router();

const adminMiddleware = require("./adminMiddleware");
const Notification = require("../models/Notification");
const { syncEonetNews, isEonetNewsStale } = require("../services/eonetSync");

// GET /api/admin/news/eonet/status
// Shows current EONET news sync status for admin panel.
router.get("/eonet/status", adminMiddleware, async (req, res) => {
  try {
    const latest = await Notification.findOne({
      isPublic: true,
      type: "news",
      source: "nasa-eonet",
    })
      .sort({ createdAt: -1 })
      .select("createdAt")
      .lean();

    const total = await Notification.countDocuments({
      isPublic: true,
      type: "news",
      source: "nasa-eonet",
    });

    const stale = await isEonetNewsStale();

    res.json({
      source: "nasa-eonet",
      total,
      stale,
      latestSyncedAt: latest?.createdAt || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/news/eonet/sync
// Manual admin trigger to force-refresh NASA EONET news.
router.post("/eonet/sync", adminMiddleware, async (req, res) => {
  try {
    const result = await syncEonetNews({ force: true });
    if (!result.updated && result.reason === "error") {
      return res.status(502).json({
        success: false,
        error: "NASA EONET sync failed",
        details: result.error || "Unknown sync error",
      });
    }

    return res.json({
      success: true,
      source: "nasa-eonet",
      syncedCount: result.count || 0,
      message: "NASA EONET news refreshed",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

module.exports = router;
