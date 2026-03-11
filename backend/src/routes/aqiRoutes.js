const express = require('express');
const router = express.Router();
const AirQuality = require('../models/AirQuality');
const AQIPrediction = require('../models/AQIPrediction');

// GET /api/aqi/latest — latest reading per district
router.get('/latest', async (req, res) => {
  try {
    const districts = ['Kathmandu', 'Kaski', 'Lalitpur', 'Morang', 'Parsa'];
    const results = await Promise.all(
      districts.map(d => AirQuality.findOne({ district: d }).sort({ timestamp: -1 }))
    );
    res.json(results.filter(Boolean));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/aqi/history/:district — last 30 readings for a district
router.get('/history/:district', async (req, res) => {
  try {
    const data = await AirQuality.find({ district: req.params.district })
      .sort({ timestamp: -1 }).limit(30);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/aqi/predictions/:district
router.get('/predictions/:district', async (req, res) => {
  try {
    const data = await AQIPrediction.find({ district: req.params.district })
      .sort({ createdAt: -1 }).limit(7);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
