const express = require('express');
const router = express.Router();

// POST /api/advisory/generate
router.post('/generate', async (req, res) => {
  const { district, aqi, risk_level, rainfall } = req.body;
  // To be implemented: call Claude API to generate advisory
  res.json({
    advisory: `[Mock] Health advisory for ${district}: Maintain precautions due to ${risk_level} risk.`
  });
});

module.exports = router;
