const express = require('express');
const router = express.Router();
const DisasterRisk = require('../models/DisasterRisk');

// GET /api/risk/latest
router.get('/latest', async (req, res) => {
  try {
    const riskData = await DisasterRisk.find().sort({ timestamp: -1 }).limit(10);
    res.json(riskData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
