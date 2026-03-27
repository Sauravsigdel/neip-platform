const express = require("express");
const router = express.Router();
const axios = require("axios");
const WeatherData = require("../models/WeatherData");

const OPEN_METEO = "https://api.open-meteo.com/v1/forecast";

// ── Helper: fetch full weather from Open-Meteo ──────────────────
async function fetchOpenMeteo(lat, lon) {
  const res = await axios.get(OPEN_METEO, {
    params: {
      latitude: lat,
      longitude: lon,
      current: [
        "temperature_2m",
        "relative_humidity_2m",
        "apparent_temperature",
        "precipitation",
        "snowfall",
        "cloud_cover",
        "wind_speed_10m",
        "wind_direction_10m",
        "surface_pressure",
        "uv_index",
        "weather_code",
        "visibility",
      ].join(","),
      hourly: [
        "temperature_2m",
        "precipitation_probability",
        "precipitation",
        "snowfall",
        "uv_index",
      ].join(","),
      daily: [
        "temperature_2m_max",
        "temperature_2m_min",
        "precipitation_sum",
        "snowfall_sum",
        "wind_speed_10m_max",
        "uv_index_max",
        "weather_code",
        "sunrise",
        "sunset",
      ].join(","),
      timezone: "Asia/Kathmandu",
      forecast_days: 7,
    },
    timeout: 10000,
  });
  return res.data;
}

// ── WMO weather code → description + emoji ───────────────────────
function wmoToDesc(code) {
  const map = {
    0: ["Clear Sky", "☀️"],
    1: ["Mainly Clear", "🌤️"],
    2: ["Partly Cloudy", "⛅"],
    3: ["Overcast", "☁️"],
    45: ["Foggy", "🌫️"],
    48: ["Icy Fog", "🌫️"],
    51: ["Light Drizzle", "🌦️"],
    53: ["Drizzle", "🌦️"],
    55: ["Heavy Drizzle", "🌧️"],
    61: ["Light Rain", "🌧️"],
    63: ["Rain", "🌧️"],
    65: ["Heavy Rain", "🌧️"],
    71: ["Light Snow", "🌨️"],
    73: ["Snow", "🌨️"],
    75: ["Heavy Snow", "❄️"],
    77: ["Snow Grains", "❄️"],
    80: ["Rain Showers", "🌦️"],
    81: ["Rain Showers", "🌧️"],
    82: ["Heavy Showers", "🌧️"],
    85: ["Snow Showers", "🌨️"],
    86: ["Heavy Snow Showers", "❄️"],
    95: ["Thunderstorm", "⛈️"],
    96: ["Thunderstorm + Hail", "⛈️"],
    99: ["Thunderstorm + Hail", "⛈️"],
  };
  return map[code] || ["Unknown", "🌡️"];
}

// ── Wind direction degrees → compass ────────────────────────────
function degToCompass(deg) {
  const dirs = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ];
  return dirs[Math.round(deg / 22.5) % 16];
}

// ── GET /api/weather/current?lat=&lon=&city=&district= ───────────
// Returns real-time weather from Open-Meteo
router.get("/current", async (req, res) => {
  const { lat, lon, city, district } = req.query;
  if (!lat || !lon)
    return res.status(400).json({ error: "lat and lon are required" });

  try {
    const data = await fetchOpenMeteo(parseFloat(lat), parseFloat(lon));
    const c = data.current;
    const [condDesc, condIcon] = wmoToDesc(c.weather_code);

    const result = {
      city: city || "Unknown",
      district: district || "Unknown",
      lat: parseFloat(lat),
      lon: parseFloat(lon),
      current: {
        temperature: c.temperature_2m,
        feelsLike: c.apparent_temperature,
        humidity: c.relative_humidity_2m,
        precipitation: c.precipitation,
        snowfall: c.snowfall,
        cloudCover: c.cloud_cover,
        windSpeed: c.wind_speed_10m,
        windDirection: c.wind_direction_10m,
        windCompass: degToCompass(c.wind_direction_10m),
        pressure: c.surface_pressure,
        uvIndex: c.uv_index,
        visibility: c.visibility ? Math.round(c.visibility / 1000) : null,
        conditionCode: c.weather_code,
        condition: condDesc,
        conditionIcon: condIcon,
        timestamp: data.current_units
          ? new Date().toISOString()
          : new Date().toISOString(),
      },
      hourly: {
        time: data.hourly.time.slice(0, 24),
        temperature: data.hourly.temperature_2m.slice(0, 24),
        precipProbability: data.hourly.precipitation_probability.slice(0, 24),
        precipitation: data.hourly.precipitation.slice(0, 24),
        snowfall: data.hourly.snowfall.slice(0, 24),
        uvIndex: data.hourly.uv_index.slice(0, 24),
      },
      daily: {
        time: data.daily.time,
        tempMax: data.daily.temperature_2m_max,
        tempMin: data.daily.temperature_2m_min,
        precipSum: data.daily.precipitation_sum,
        snowfallSum: data.daily.snowfall_sum,
        windMax: data.daily.wind_speed_10m_max,
        uvMax: data.daily.uv_index_max,
        weatherCode: data.daily.weather_code,
        sunrise: data.daily.sunrise,
        sunset: data.daily.sunset,
        conditions: data.daily.weather_code.map(wmoToDesc),
      },
      source: "open-meteo",
    };

    // Optionally save to MongoDB
    try {
      await WeatherData.create({
        district: district || "Unknown",
        temperature: c.temperature_2m,
        humidity: c.relative_humidity_2m,
        wind_speed: c.wind_speed_10m,
        rainfall: c.precipitation,
        snowfall: c.snowfall,
      });
    } catch (_) {
      /* non-critical */
    }

    res.json(result);
  } catch (err) {
    console.error("[Weather] Open-Meteo error:", err.message);
    res
      .status(500)
      .json({ error: "Failed to fetch weather data", details: err.message });
  }
});

// ── GET /api/weather/forecast?lat=&lon= ─────────────────────────
// Returns 7-day forecast only
router.get("/forecast", async (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon)
    return res.status(400).json({ error: "lat and lon are required" });

  try {
    const data = await fetchOpenMeteo(parseFloat(lat), parseFloat(lon));
    res.json({
      daily: {
        time: data.daily.time,
        tempMax: data.daily.temperature_2m_max,
        tempMin: data.daily.temperature_2m_min,
        precipSum: data.daily.precipitation_sum,
        snowfallSum: data.daily.snowfall_sum,
        windMax: data.daily.wind_speed_10m_max,
        uvMax: data.daily.uv_index_max,
        conditions: data.daily.weather_code.map(wmoToDesc),
      },
      source: "open-meteo",
    });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to fetch forecast", details: err.message });
  }
});

// ── GET /api/weather/latest ──────────────────────────────────────
// Existing endpoint — kept for backwards compatibility
router.get("/latest", async (req, res) => {
  try {
    const districts = ["Kathmandu", "Kaski", "Lalitpur", "Morang", "Parsa"];
    const results = await Promise.all(
      districts.map((d) =>
        WeatherData.findOne({ district: d }).sort({ timestamp: -1 }),
      ),
    );
    res.json(results.filter(Boolean));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/weather/all-districts ──────────────────────────────
// Returns latest weather for all districts from MongoDB
router.get("/all-districts", async (req, res) => {
  try {
    const districts = await WeatherData.aggregate([
      { $sort: { timestamp: -1 } },
      { $group: { _id: "$district", doc: { $first: "$$ROOT" } } },
      { $replaceRoot: { newRoot: "$doc" } },
    ]);
    res.json(districts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
