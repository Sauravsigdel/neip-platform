const express = require("express");
const router = express.Router();
const axios = require("axios");

// GET /api/owm-tile/:layer/:z/:x/:y.png
router.get("/:layer/:z/:x/:y.png", async (req, res) => {
  const { layer, z, x, y } = req.params;
  const key = process.env.OWM_KEY;
  if (!key) return res.status(503).json({ error: "OWM key not configured" });
  try {
    const url = `https://tile.openweathermap.org/map/${layer}/${z}/${x}/${y}.png?appid=${key}`;
    const tileRes = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 8000,
    });
    res.set("Content-Type", "image/png");
    res.set("Cache-Control", "public, max-age=600");
    res.send(tileRes.data);
  } catch (err) {
    res.status(502).json({ error: "Tile fetch failed" });
  }
});

module.exports = router;
