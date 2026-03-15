const express = require("express");
const router = express.Router();
const AirQuality = require("../models/AirQuality");
const AQIPrediction = require("../models/AQIPrediction");
const NEPAL_CITIES = require("../../../nepal_cities");

// GET /api/map/all-cities - Returns latest AQI for all Nepal cities
router.get("/all-cities", async (req, res) => {
  try {
    const results = [];

    for (const city of NEPAL_CITIES) {
      // Get the latest AQI reading for this city
      const latest = await AirQuality.findOne({ city: city.city })
        .sort({ timestamp: -1 })
        .select("aqi pm25 pm10 no2 co o3 timestamp data_source station_name");

      // Get 7-day forecast from AQIPrediction collection
      const forecasts = await AQIPrediction.find({
        district: city.district,
        date: { $gte: new Date() },
      })
        .sort({ date: 1 })
        .limit(7)
        .select("predicted_aqi date confidence_interval");

      // Get last 24h readings for sparkline
      const last24h = await AirQuality.find({
        city: city.city,
        timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      })
        .sort({ timestamp: 1 })
        .select("aqi timestamp");

      results.push({
        city: city.city,
        district: city.district,
        lat: city.lat,
        lon: city.lon,
        aqi: latest?.aqi ?? null,
        pm25: latest?.pm25 ?? null,
        pm10: latest?.pm10 ?? null,
        no2: latest?.no2 ?? null,
        lastUpdated: latest?.timestamp ?? null,
        dataSource: latest?.data_source ?? "pending",
        stationName: latest?.station_name ?? city.city,
        forecast: forecasts.map((f) => ({
          date: f.date,
          aqi: f.predicted_aqi,
          ci: f.confidence_interval,
        })),
        history24h: last24h.map((h) => ({ aqi: h.aqi, time: h.timestamp })),
      });
    }

    res.json({ success: true, count: results.length, data: results });
  } catch (err) {
    console.error("[mapRoutes] Error fetching all cities:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/map/city/:cityName - Get detailed data for a single city
router.get("/city/:cityName", async (req, res) => {
  try {
    const cityName = req.params.cityName;
    const cityMeta = NEPAL_CITIES.find(
      (c) => c.city.toLowerCase() === cityName.toLowerCase(),
    );
    if (!cityMeta)
      return res.status(404).json({ success: false, error: "City not found" });

    const latest = await AirQuality.findOne({ city: cityMeta.city }).sort({
      timestamp: -1,
    });

    const forecasts = await AQIPrediction.find({
      district: cityMeta.district,
      date: { $gte: new Date() },
    })
      .sort({ date: 1 })
      .limit(7);

    const history7d = await AirQuality.find({
      city: cityMeta.city,
      timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    })
      .sort({ timestamp: 1 })
      .select("aqi pm25 pm10 timestamp");

    res.json({
      success: true,
      data: {
        ...cityMeta,
        current: latest,
        forecast: forecasts,
        history: history7d,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/map/summary - Nepal-wide AQI summary stats
router.get("/summary", async (req, res) => {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recent = await AirQuality.find({
      timestamp: { $gte: oneDayAgo },
    }).sort({ timestamp: -1 });

    // Keep only latest per city
    const cityMap = {};
    for (const r of recent) {
      if (!cityMap[r.city]) cityMap[r.city] = r;
    }

    const aqiValues = Object.values(cityMap)
      .map((r) => r.aqi)
      .filter(Boolean);
    const avg = aqiValues.length
      ? Math.round(aqiValues.reduce((a, b) => a + b, 0) / aqiValues.length)
      : 0;
    const max = aqiValues.length ? Math.max(...aqiValues) : 0;
    const min = aqiValues.length ? Math.min(...aqiValues) : 0;

    const worstCity = Object.values(cityMap).sort(
      (a, b) => (b.aqi || 0) - (a.aqi || 0),
    )[0];

    res.json({
      success: true,
      data: {
        totalCities: NEPAL_CITIES.length,
        citiesWithData: aqiValues.length,
        avgAQI: avg,
        maxAQI: max,
        minAQI: min,
        worstCity: worstCity?.city,
        worstAQI: worstCity?.aqi,
        lastUpdated: new Date(),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
