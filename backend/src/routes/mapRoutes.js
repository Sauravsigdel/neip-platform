const express = require("express");
const router = express.Router();
const axios = require("axios");
const AirQuality = require("../models/AirQuality");
const AQIPrediction = require("../models/AQIPrediction");
const WeatherData = require("../models/WeatherData");
const FireHotspot = require("../models/FireHotspot");
const adminMiddleware = require("./adminMiddleware");
const NEPAL_CITIES = require("../../../nepal_cities");

const WAQI_TOKEN = process.env.WAQI_API_TOKEN || "";
const WAQI_CACHE_TTL_MS = 15 * 60 * 1000;
let waqiCache = { ts: 0, data: [] };
const NEWS_CACHE_TTL_MS = 5 * 60 * 1000;
let newsCache = { ts: 0, data: [] };

function getNumericOrNull(value) {
  return Number.isFinite(value) ? value : null;
}

function coerceOptionalNumber(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!text || text === "-") return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

const OFFICIAL_AQI_STATIONS = [
  { stationName: "Shankapark", city: "Kathmandu" },
  { stationName: "Ratnapark", city: "Kathmandu" },
  { stationName: "Bhaisipati", city: "Lalitpur" },
  { stationName: "Bhaktapur", city: "Bhaktapur" },
  { stationName: "Khumaltar", city: "Lalitpur" },
  { stationName: "TU Kirtipur", city: "Kathmandu" },
  { stationName: "Dhankuta", city: "Dhankuta" },
  { stationName: "Dhulikhel", city: "Dhulikhel" },
  { stationName: "Surkhet", city: "Birendranagar" },
  { stationName: "Deukhuri, Dang", city: "Ghorahi" },
  { stationName: "Mustang", city: "Jomsom" },
  { stationName: "Achaam", city: "Sanfebagar" },
  { stationName: "Bharatpur", city: "Bharatpur" },
  { stationName: "Bhimdatta (Mahendranagar)", city: "Mahendranagar" },
  { stationName: "Biratnagar", city: "Biratnagar" },
  { stationName: "DHM, Pkr", city: "Pokhara" },
  { stationName: "Damak", city: "Birtamod" },
  { stationName: "Dang", city: "Ghorahi" },
  { stationName: "Dhangadhi", city: "Dhangadhi" },
  { stationName: "GBS, Pkr", city: "Pokhara" },
  { stationName: "Hetauda", city: "Hetauda" },
  { stationName: "Ilam", city: "Ilam" },
  { stationName: "Janakpur", city: "Janakpur" },
  { stationName: "Jhumka", city: "Itahari" },
  { stationName: "Lumbini", city: "Bhairahawa" },
  { stationName: "Nepalgunj", city: "Nepalgunj" },
  { stationName: "PU Pkr", city: "Pokhara" },
  { stationName: "Pulchowk", city: "Lalitpur" },
  { stationName: "Rara", city: "Gamgadhi" },
  { stationName: "Sauraha", city: "Bharatpur" },
  { stationName: "Simara", city: "Birgunj" },
];

function normalizeStationName(name) {
  return String(name || "")
    .trim()
    .toLowerCase();
}

const OFFICIAL_STATION_BY_KEY = new Map(
  OFFICIAL_AQI_STATIONS.map((s) => [normalizeStationName(s.stationName), s]),
);

async function getLatestOfficialManualRecords() {
  const docs = await AirQuality.aggregate([
    {
      $match: {
        data_source: "nepal-gov-manual",
      },
    },
    { $sort: { timestamp: -1 } },
    { $group: { _id: "$station_name", doc: { $first: "$$ROOT" } } },
    { $replaceRoot: { newRoot: "$doc" } },
  ]);

  // Reduce to one value per city for map pins; pick worst AQI among active stations.
  const byCity = new Map();
  docs.forEach((d) => {
    const key = String(d.city || "").toLowerCase();
    if (!key) return;
    const existing = byCity.get(key);
    if (!existing) {
      byCity.set(key, d);
      return;
    }
    const candAqi = Number.isFinite(d.aqi) ? d.aqi : null;
    const prevAqi = Number.isFinite(existing.aqi) ? existing.aqi : null;
    if (candAqi !== null && (prevAqi === null || candAqi > prevAqi)) {
      byCity.set(key, d);
    }
  });

  return Array.from(byCity.values()).map((d) => ({
    city: d.city,
    district: d.district,
    lat: d.lat,
    lon: d.lon,
    aqi: Number.isFinite(d.aqi) ? d.aqi : null,
    pm1: Number.isFinite(d.pm1) ? d.pm1 : null,
    pm25: Number.isFinite(d.pm25) ? d.pm25 : null,
    pm10: Number.isFinite(d.pm10) ? d.pm10 : null,
    no2: Number.isFinite(d.no2) ? d.no2 : null,
    co: Number.isFinite(d.co) ? d.co : null,
    o3: Number.isFinite(d.o3) ? d.o3 : null,
    hasAqi: Number.isFinite(d.aqi),
    source: "nepal-gov-manual",
    stationName: d.station_name || d.city,
    time: d.timestamp,
  }));
}

function mergeByPriority(primaryRecords, fallbackRecords) {
  const map = new Map();
  primaryRecords.forEach((r) => {
    const key = String(r.city || "").toLowerCase();
    if (key) map.set(key, r);
  });

  fallbackRecords.forEach((r) => {
    const key = String(r.city || "").toLowerCase();
    if (!key || map.has(key)) return;
    map.set(key, r);
  });

  return Array.from(map.values());
}

async function fetchWAQIForCity(city) {
  if (!WAQI_TOKEN) {
    return {
      city: city.city,
      district: city.district,
      lat: city.lat,
      lon: city.lon,
      aqi: null,
      hasAqi: false,
      source: "waqi-unconfigured",
    };
  }
  try {
    const url = `https://api.waqi.info/feed/geo:${city.lat};${city.lon}/?token=${WAQI_TOKEN}`;
    const response = await axios.get(url, { timeout: 9000 });
    const payload = response.data;
    if (payload?.status !== "ok" || !payload?.data) {
      return {
        ...city,
        aqi: null,
        hasAqi: false,
        source: "waqi",
      };
    }

    const data = payload.data;
    const aqiRaw = Number(data.aqi);
    const iaqi = data.iaqi || {};

    return {
      city: city.city,
      district: city.district,
      lat: city.lat,
      lon: city.lon,
      aqi: Number.isFinite(aqiRaw) ? Math.round(aqiRaw) : null,
      pm25: getNumericOrNull(iaqi.pm25?.v),
      pm10: getNumericOrNull(iaqi.pm10?.v),
      no2: getNumericOrNull(iaqi.no2?.v),
      co: getNumericOrNull(iaqi.co?.v),
      o3: getNumericOrNull(iaqi.o3?.v),
      hasAqi: Number.isFinite(aqiRaw),
      source: "waqi",
      stationName: data.city?.name || city.city,
      time: data.time?.s || null,
      dominentpol: data.dominentpol || null,
    };
  } catch (error) {
    return {
      city: city.city,
      district: city.district,
      lat: city.lat,
      lon: city.lon,
      aqi: null,
      pm25: null,
      pm10: null,
      no2: null,
      hasAqi: false,
      source: "waqi",
      error: "fetch_failed",
    };
  }
}

async function getCachedWAQI(forceRefresh = false) {
  const now = Date.now();
  const cacheAge = now - waqiCache.ts;
  if (!forceRefresh && waqiCache.data.length && cacheAge < WAQI_CACHE_TTL_MS) {
    return waqiCache.data;
  }

  const batchSize = 10;
  const aggregated = [];

  for (let i = 0; i < NEPAL_CITIES.length; i += batchSize) {
    const batch = NEPAL_CITIES.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(fetchWAQIForCity));
    aggregated.push(...batchResults);
    if (i + batchSize < NEPAL_CITIES.length) {
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
  }

  waqiCache = { ts: now, data: aggregated };
  return aggregated;
}

function pushUnique(feed, text) {
  if (!text || feed.includes(text)) return;
  feed.push(text);
}

async function buildLiveNewsFeed() {
  const now = Date.now();
  const cacheAge = now - newsCache.ts;
  if (newsCache.data.length && cacheAge < NEWS_CACHE_TTL_MS) {
    return { cached: true, ageMs: cacheAge, items: newsCache.data };
  }

  const feed = [];

  // WAQI AQI headline(s)
  try {
    const waqi = await getCachedWAQI(false);
    const highAqi = waqi
      .filter((r) => Number.isFinite(r?.aqi) && r.aqi >= 150)
      .sort((a, b) => b.aqi - a.aqi)
      .slice(0, 2);
    highAqi.forEach((r) =>
      pushUnique(feed, `High AQI in ${r.city}: ${r.aqi} (WAQI live)`),
    );
  } catch (_) {
    // Keep news generation resilient even if WAQI is temporarily unavailable.
  }

  // Weather headlines from stored WeatherData (latest per district)
  const latestWeather = await WeatherData.aggregate([
    { $sort: { timestamp: -1 } },
    {
      $group: {
        _id: "$district",
        rainfall: { $first: "$rainfall" },
        snowfall: { $first: "$snowfall" },
        wind_speed: { $first: "$wind_speed" },
        timestamp: { $first: "$timestamp" },
      },
    },
  ]);

  const rainy = latestWeather.filter((w) => (w.rainfall || 0) > 0.1);
  if (rainy.length) {
    const topRain = rainy.slice().sort((a, b) => b.rainfall - a.rainfall)[0];
    pushUnique(
      feed,
      `Rainfall active in ${rainy.length} districts. Highest near ${topRain._id} (${topRain.rainfall.toFixed(1)} mm)`,
    );
  }

  const windy = latestWeather.filter((w) => (w.wind_speed || 0) > 15);
  windy
    .slice()
    .sort((a, b) => b.wind_speed - a.wind_speed)
    .slice(0, 2)
    .forEach((w) => {
      const kmh = Math.round((w.wind_speed || 0) * 3.6);
      pushUnique(feed, `High wind in ${w._id}: ${kmh} km/h`);
    });

  const snowy = latestWeather.filter((w) => (w.snowfall || 0) > 0);
  if (snowy.length) {
    const topSnow = snowy.slice().sort((a, b) => b.snowfall - a.snowfall)[0];
    pushUnique(
      feed,
      `Snowfall active in ${snowy.length} districts. Highest near ${topSnow._id} (${Number(topSnow.snowfall).toFixed(1)} cm)`,
    );
  }

  // Fire headlines from stored hotspot data
  const fireCount = await FireHotspot.countDocuments({});
  if (fireCount > 0) {
    pushUnique(feed, `${fireCount} fire hotspots detected by satellite feed`);
  }

  if (!feed.length) {
    feed.push("No critical alerts right now across Nepal.");
  }

  const items = feed.slice(0, 8);
  newsCache = { ts: now, data: items };
  return { cached: false, ageMs: 0, items };
}

// GET /api/map/waqi-live-cities - Live WAQI AQI values for Nepal cities
router.get("/waqi-live-cities", async (req, res) => {
  try {
    const official = await getLatestOfficialManualRecords();
    if (!WAQI_TOKEN) {
      return res.json({
        success: true,
        cached: false,
        count: official.length,
        prioritySource: "nepal-gov-manual",
        data: official,
        warning:
          "WAQI_API_TOKEN is not configured; returning official manual AQI only.",
      });
    }
    const now = Date.now();
    const cacheAge = now - waqiCache.ts;
    if (waqiCache.data.length && cacheAge < WAQI_CACHE_TTL_MS) {
      const mergedCached = mergeByPriority(official, waqiCache.data);
      return res.json({
        success: true,
        cached: true,
        ageMs: cacheAge,
        count: mergedCached.length,
        prioritySource: "nepal-gov-manual",
        data: mergedCached,
      });
    }

    const aggregated = await getCachedWAQI(true);
    const merged = mergeByPriority(official, aggregated);
    res.json({
      success: true,
      cached: false,
      count: merged.length,
      data: merged,
      source: "nepal-gov-manual>waqi",
      prioritySource: "nepal-gov-manual",
      fetchedAt: new Date(now).toISOString(),
    });
  } catch (err) {
    console.error("[mapRoutes] WAQI fetch error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/map/official-aqi-latest - latest official/manual AQI values entered by admin
router.get("/official-aqi-latest", async (req, res) => {
  try {
    const data = await getLatestOfficialManualRecords();
    res.json({
      success: true,
      source: "nepal-gov-manual",
      count: data.length,
      data,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/map/admin/official-aqi-manual - admin bulk upsert of official AQI records
router.post("/admin/official-aqi-manual", adminMiddleware, async (req, res) => {
  try {
    const records = Array.isArray(req.body?.records) ? req.body.records : [];
    if (!records.length) {
      return res
        .status(400)
        .json({ success: false, error: "records array is required" });
    }

    const cityMetaByName = new Map(
      NEPAL_CITIES.map((c) => [String(c.city || "").toLowerCase(), c]),
    );

    let rejectedStations = 0;

    const ops = records
      .map((r) => {
        const inputStation = String(
          r.stationName || r.station_name || "",
        ).trim();
        const stationCfg = OFFICIAL_STATION_BY_KEY.get(
          normalizeStationName(inputStation),
        );
        if (!stationCfg) {
          rejectedStations += 1;
          return null;
        }

        const stationName = stationCfg.stationName;
        const city = stationCfg.city;
        const meta = cityMetaByName.get(city.toLowerCase());

        return {
          updateOne: {
            filter: {
              station_name: stationName,
              data_source: "nepal-gov-manual",
            },
            update: {
              $set: {
                city,
                district: String(r.district || meta?.district || city).trim(),
                station_name: stationName,
                aqi: coerceOptionalNumber(r.aqi),
                pm1: coerceOptionalNumber(r.pm1),
                pm25: coerceOptionalNumber(r.pm25),
                pm10: coerceOptionalNumber(r.pm10),
                no2: coerceOptionalNumber(r.no2),
                co: coerceOptionalNumber(r.co),
                o3: coerceOptionalNumber(r.o3),
                lat: Number.isFinite(Number(r.lat)) ? Number(r.lat) : meta?.lat,
                lon: Number.isFinite(Number(r.lon)) ? Number(r.lon) : meta?.lon,
                data_source: "nepal-gov-manual",
                timestamp: new Date(),
              },
            },
            upsert: true,
          },
        };
      })
      .filter(Boolean);

    if (!ops.length) {
      return res
        .status(400)
        .json({ success: false, error: "No valid records to upsert" });
    }

    const result = await AirQuality.bulkWrite(ops, { ordered: false });
    await AirQuality.deleteMany({
      data_source: "nepal-gov-manual",
      station_name: { $nin: OFFICIAL_AQI_STATIONS.map((s) => s.stationName) },
    });
    waqiCache = { ts: 0, data: [] };
    newsCache = { ts: 0, data: [] };

    res.json({
      success: true,
      source: "nepal-gov-manual",
      matched: result.matchedCount || 0,
      modified: result.modifiedCount || 0,
      upserted: result.upsertedCount || 0,
      rejectedStations,
      total: ops.length,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/map/admin/official-aqi-history - recent manual AQI entries
router.get("/admin/official-aqi-history", adminMiddleware, async (req, res) => {
  try {
    const rows = await AirQuality.find({ data_source: "nepal-gov-manual" })
      .sort({ timestamp: -1 })
      .limit(120)
      .select("station_name city district aqi pm25 pm10 pm1 timestamp");

    res.json({
      success: true,
      count: rows.length,
      data: rows.map((r) => ({
        stationName: r.station_name,
        city: r.city,
        district: r.district,
        aqi: Number.isFinite(r.aqi) ? r.aqi : null,
        pm25: Number.isFinite(r.pm25) ? r.pm25 : null,
        pm10: Number.isFinite(r.pm10) ? r.pm10 : null,
        pm1: Number.isFinite(r.pm1) ? r.pm1 : null,
        timestamp: r.timestamp,
      })),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/map/live-news - Cached live ticker headlines from stored datasets
router.get("/live-news", async (req, res) => {
  try {
    const result = await buildLiveNewsFeed();
    res.json({
      success: true,
      source: "stored-data",
      cached: result.cached,
      ageMs: result.ageMs,
      count: result.items.length,
      data: result.items,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

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
      .filter((v) => Number.isFinite(v));
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
