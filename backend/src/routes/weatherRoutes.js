const express = require('express');
const router = express.Router();
const WeatherData = require('../models/WeatherData');

// GET /api/weather/latest
router.get('/latest', async (req, res) => {
  try {
    const weatherData = await WeatherData.find().sort({ timestamp: -1 }).limit(10);
    res.json(weatherData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
