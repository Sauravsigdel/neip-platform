const express = require('express');
const router = express.Router();
const WeatherData = require('../models/WeatherData');

// GET /api/weather/latest
router.get('/latest', async (req, res) => {
  try {
    const districts = ['Kathmandu', 'Kaski', 'Lalitpur', 'Morang', 'Parsa'];
    const results = await Promise.all(
      districts.map(d => WeatherData.findOne({ district: d }).sort({ timestamp: -1 }))
    );
    res.json(results.filter(Boolean));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
