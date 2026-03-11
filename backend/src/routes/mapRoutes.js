const express = require('express');
const router = express.Router();

// GET /api/map/geojson
router.get('/geojson', async (req, res) => {
  // To be implemented: return GeoJSON data for Nepal map
  res.json({ message: "GeoJSON data will be served here" });
});

module.exports = router;
