const express = require('express');
const router = express.Router();
const AirQuality = require('../models/AirQuality');

// GET /api/aqi/latest
router.get('/latest', async (req, res) => {
  try {
    const aqiData = await AirQuality.find().sort({ timestamp: -1 }).limit(10);
    res.json(aqiData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
