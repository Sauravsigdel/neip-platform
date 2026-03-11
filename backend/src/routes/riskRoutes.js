const express = require('express');
const router = express.Router();
const DisasterRisk = require('../models/DisasterRisk');

// GET /api/risk/latest
router.get('/latest', async (req, res) => {
  try {
    const districts = ['Kathmandu', 'Kaski', 'Lalitpur', 'Morang', 'Parsa'];
    const results = await Promise.all(
      districts.map(d => DisasterRisk.findOne({ district: d }).sort({ timestamp: -1 }))
    );
    res.json(results.filter(Boolean));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/risk/history/:district
router.get('/history/:district', async (req, res) => {
  try {
    const data = await DisasterRisk.find({ district: req.params.district })
      .sort({ timestamp: -1 }).limit(10);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
