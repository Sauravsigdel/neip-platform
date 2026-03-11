const express = require('express');
const router = express.Router();
const AirQuality = require('../models/AirQuality');
const DisasterRisk = require('../models/DisasterRisk');

// GET /api/map/district-data — combined AQI + risk per district for map overlay
router.get('/district-data', async (req, res) => {
  try {
    const districts = ['Kathmandu', 'Kaski', 'Lalitpur', 'Morang', 'Parsa'];
    const results = await Promise.all(districts.map(async (d) => {
      const aqi = await AirQuality.findOne({ district: d }).sort({ timestamp: -1 });
      const risk = await DisasterRisk.findOne({ district: d }).sort({ timestamp: -1 });
      return { district: d, aqi: aqi?.aqi ?? null, risk_level: risk?.risk_level ?? null, risk_score: risk?.risk_score ?? null };
    }));
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
