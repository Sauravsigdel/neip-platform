const express = require("express");
const router = express.Router();
const { getHotspots, syncFireHotspots } = require("../services/nasaFirms");
const FireHotspot = require("../models/FireHotspot");

// GET /api/fire/hotspots — get all current fire hotspots
router.get("/hotspots", async (req, res) => {
  try {
    const hotspots = await getHotspots();
    res.json({
      count: hotspots.length,
      hotspots: hotspots.map((h) => ({
        lat: h.lat,
        lon: h.lon,
        confidence: h.confidence,
        frp: h.frp,
        brightness: h.brightness,
        satellite: h.satellite,
        acqDate: h.acqDate,
        acqTime: h.acqTime,
      })),
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/fire/stats — summary stats
router.get("/stats", async (req, res) => {
  try {
    const total = await FireHotspot.countDocuments();
    const high = await FireHotspot.countDocuments({ confidence: "high" });
    const nominal = await FireHotspot.countDocuments({ confidence: "nominal" });
    const low = await FireHotspot.countDocuments({ confidence: "low" });
    res.json({ total, high, nominal, low });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/fire/refresh — manually trigger a refresh
router.post("/refresh", async (req, res) => {
  try {
    const count = await syncFireHotspots();
    res.json({ success: true, count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
