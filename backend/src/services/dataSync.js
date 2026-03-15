require("dotenv").config({
  path: require("path").resolve(__dirname, "../../.env"),
});
const cron = require("node-cron");
const axios = require("axios");
const AirQuality = require("../models/AirQuality");
const WeatherData = require("../models/WeatherData");
const DisasterRisk = require("../models/DisasterRisk");
const AQIPrediction = require("../models/AQIPrediction");
const NEPAL_CITIES = require("../../../nepal_cities");
const { syncFireHotspots } = require("./nasaFirms");

const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";
const OWM_AIR_URL = "https://api.openweathermap.org/data/2.5/air_pollution";
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:5001";

// ── US EPA AQI breakpoints for PM2.5 ────────────────────────────
const PM25_BREAKPOINTS = [
  { cLow: 0.0, cHigh: 12.0, iLow: 0, iHigh: 50 },
  { cLow: 12.1, cHigh: 35.4, iLow: 51, iHigh: 100 },
  { cLow: 35.5, cHigh: 55.4, iLow: 101, iHigh: 150 },
  { cLow: 55.5, cHigh: 150.4, iLow: 151, iHigh: 200 },
  { cLow: 150.5, cHigh: 250.4, iLow: 201, iHigh: 300 },
  { cLow: 250.5, cHigh: 350.4, iLow: 301, iHigh: 400 },
  { cLow: 350.5, cHigh: 500.4, iLow: 401, iHigh: 500 },
];

function pm25ToAQI(pm25) {
  if (pm25 == null || isNaN(pm25) || pm25 < 0) return null;
  const t = Math.floor(pm25 * 10) / 10;
  for (const bp of PM25_BREAKPOINTS) {
    if (t >= bp.cLow && t <= bp.cHigh) {
      return Math.round(
        ((bp.iHigh - bp.iLow) / (bp.cHigh - bp.cLow)) * (t - bp.cLow) + bp.iLow,
      );
    }
  }
  return 500;
}

// ── PM10 AQI breakpoints ─────────────────────────────────────────
const PM10_BREAKPOINTS = [
  { cLow: 0, cHigh: 54, iLow: 0, iHigh: 50 },
  { cLow: 55, cHigh: 154, iLow: 51, iHigh: 100 },
  { cLow: 155, cHigh: 254, iLow: 101, iHigh: 150 },
  { cLow: 255, cHigh: 354, iLow: 151, iHigh: 200 },
  { cLow: 355, cHigh: 424, iLow: 201, iHigh: 300 },
  { cLow: 425, cHigh: 504, iLow: 301, iHigh: 400 },
  { cLow: 505, cHigh: 604, iLow: 401, iHigh: 500 },
];

function pm10ToAQI(pm10) {
  if (pm10 == null || isNaN(pm10) || pm10 < 0) return null;
  const t = Math.floor(pm10);
  for (const bp of PM10_BREAKPOINTS) {
    if (t >= bp.cLow && t <= bp.cHigh) {
      return Math.round(
        ((bp.iHigh - bp.iLow) / (bp.cHigh - bp.cLow)) * (t - bp.cLow) + bp.iLow,
      );
    }
  }
  return 500;
}

// ── Z-Score anomaly detection ────────────────────────────────────
function detectAnomaly(value, historicalValues) {
  if (!historicalValues || historicalValues.length < 3) return false;
  const mean =
    historicalValues.reduce((a, b) => a + b, 0) / historicalValues.length;
  const stdDev = Math.sqrt(
    historicalValues.map((v) => (v - mean) ** 2).reduce((a, b) => a + b, 0) /
      historicalValues.length,
  );
  if (stdDev === 0) return false;
  return Math.abs((value - mean) / stdDev) > 2.5;
}

// ── REAL: Fetch AQI from OWM Air Pollution API (Copernicus) ─────
async function fetchOWMAirPollution(city) {
  const key = process.env.OWM_KEY;
  if (!key) return null;

  try {
    const res = await axios.get(OWM_AIR_URL, {
      params: { lat: city.lat, lon: city.lon, appid: key },
      timeout: 8000,
    });

    const data = res.data?.list?.[0];
    if (!data) return null;

    const comp = data.components;
    const pm25 = comp.pm2_5;
    const pm10 = comp.pm10;
    const no2 = comp.no2;
    const o3 = comp.o3;
    const co = comp.co;
    const so2 = comp.so2;
    const nh3 = comp.nh3;

    const aqiFromPM25 = pm25ToAQI(pm25);
    const aqiFromPM10 = pm10ToAQI(pm10);
    const aqi = Math.max(aqiFromPM25 || 0, aqiFromPM10 || 0);

    return {
      pm25: pm25 ? +pm25.toFixed(1) : null,
      pm10: pm10 ? +pm10.toFixed(1) : null,
      no2: no2 ? +no2.toFixed(1) : null,
      o3: o3 ? +o3.toFixed(1) : null,
      co: co ? +co.toFixed(2) : null,
      so2: so2 ? +so2.toFixed(1) : null,
      nh3: nh3 ? +nh3.toFixed(1) : null,
      aqi,
      dataSource: "owm-copernicus",
    };
  } catch (err) {
    return null;
  }
}

// ── FALLBACK: Realistic simulation if OWM unavailable ───────────
function simulateAQIForCity(city) {
  const valleyDistricts = [
    "Kathmandu",
    "Lalitpur",
    "Bhaktapur",
    "Kavrepalanchok",
  ];
  const teraiDistricts = [
    "Parsa",
    "Morang",
    "Sunsari",
    "Jhapa",
    "Rupandehi",
    "Chitwan",
    "Banke",
    "Bardiya",
    "Kailali",
    "Kanchanpur",
    "Dhanusha",
    "Saptari",
    "Siraha",
    "Rautahat",
  ];
  let basePM25;
  if (valleyDistricts.includes(city.district))
    basePM25 = 60 + Math.random() * 80;
  else if (teraiDistricts.includes(city.district))
    basePM25 = 30 + Math.random() * 60;
  else basePM25 = 10 + Math.random() * 30;
  const month = new Date().getMonth();
  const winterFactor = month >= 10 || month <= 1 ? 1.4 : 1.0;
  const pm25 = basePM25 * winterFactor;
  const pm10 = pm25 * (1.5 + Math.random() * 0.5);
  const no2 = 10 + Math.random() * 40;
  const co = 0.3 + Math.random() * 1.5;
  const o3 = 20 + Math.random() * 60;
  const aqi = Math.max(pm25ToAQI(pm25) || 0, pm10ToAQI(pm10) || 0);
  return {
    pm25: +pm25.toFixed(1),
    pm10: +pm10.toFixed(1),
    no2: +no2.toFixed(1),
    co: +co.toFixed(2),
    o3: +o3.toFixed(1),
    aqi,
    dataSource: "simulated",
  };
}

// ── Fetch AQI for all cities ─────────────────────────────────────
const fetchAirQualityData = async () => {
  console.log(
    `[DataSync] Fetching AQI for ${NEPAL_CITIES.length} cities via OWM Copernicus...`,
  );
  const allAQIs = [];
  const owmKey = process.env.OWM_KEY;
  if (!owmKey)
    console.warn("[DataSync] OWM_KEY not set — using simulated AQI fallback");

  for (const city of NEPAL_CITIES) {
    try {
      let airData = null;

      // Try real OWM Air Pollution API first
      if (owmKey) {
        airData = await fetchOWMAirPollution(city);
      }

      // Fallback to simulation if OWM fails
      if (!airData || !airData.aqi) {
        airData = simulateAQIForCity(city);
      }

      allAQIs.push(airData.aqi);

      await AirQuality.create({
        city: city.city,
        district: city.district,
        pm25: airData.pm25,
        pm10: airData.pm10,
        no2: airData.no2,
        co: airData.co,
        o3: airData.o3,
        aqi: airData.aqi,
        data_source: airData.dataSource,
        station_name:
          airData.dataSource === "owm-copernicus"
            ? "Copernicus Satellite"
            : city.city,
        lat: city.lat,
        lon: city.lon,
      });

      console.log(
        `[DataSync] ${city.city}: AQI=${airData.aqi} (${airData.dataSource})`,
      );

      // Anomaly detection
      if (
        allAQIs.length > 3 &&
        detectAnomaly(airData.aqi, allAQIs.slice(0, -1))
      ) {
        console.warn(`[ALERT] Anomalous AQI in ${city.city}: ${airData.aqi}`);
      }

      // AQI prediction via ML service
      try {
        const recent = await AirQuality.find({ district: city.district })
          .sort({ timestamp: -1 })
          .limit(30)
          .select("aqi");
        const historicalAqi = recent.map((r) => r.aqi);
        const mlRes = await axios.post(
          `${ML_SERVICE_URL}/predict/aqi`,
          {
            district: city.district,
            weather_features: { temperature: 25 },
            historical_aqi: historicalAqi,
          },
          { timeout: 5000 },
        );
        if (mlRes.data?.forecast) {
          await AQIPrediction.create({
            district: city.district,
            date: new Date(),
            predicted_aqi: mlRes.data.forecast[0],
            model_used: mlRes.data.model_used || "Linear Regression",
            confidence_interval: mlRes.data.confidence_interval?.[0] || [],
          });
        }
      } catch (_) {
        /* ML optional */
      }

      // Small delay to respect OWM rate limits (60 calls/min free tier)
      if (owmKey) await new Promise((r) => setTimeout(r, 1100));
    } catch (err) {
      console.error(`[DataSync] Error for ${city.city}: ${err.message}`);
    }
  }
  console.log(`[DataSync] AQI sync complete for ${NEPAL_CITIES.length} cities`);
};

// ── Fetch weather for all cities ─────────────────────────────────
const fetchWeatherData = async () => {
  console.log("[DataSync] Fetching weather data from Open-Meteo...");
  for (const city of NEPAL_CITIES) {
    try {
      let temperature = 25,
        windSpeed = 10,
        rainfall = 0,
        humidity = 60;
      try {
        const res = await axios.get(OPEN_METEO_URL, {
          params: {
            latitude: city.lat,
            longitude: city.lon,
            current_weather: true,
            hourly:
              "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m",
            forecast_days: 1,
          },
          timeout: 8000,
        });
        temperature = res.data.current_weather?.temperature ?? 25;
        windSpeed = res.data.current_weather?.windspeed ?? 10;
        rainfall = res.data.hourly?.precipitation?.[0] ?? 0;
        humidity = res.data.hourly?.relative_humidity_2m?.[0] ?? 60;
      } catch (_) {
        rainfall = Math.random() * 15;
        temperature = 18 + Math.random() * 15;
        humidity = 50 + Math.random() * 40;
      }

      await WeatherData.create({
        district: city.district,
        temperature,
        wind_speed: windSpeed,
        rainfall,
        humidity,
      });

      // Disaster risk
      try {
        const riskRes = await axios.post(
          `${ML_SERVICE_URL}/predict/disaster-risk`,
          {
            district: city.district,
            rainfall,
            elevation_factor: city.elevation_factor,
            historical_disaster_index: city.historical_disaster_index,
          },
          { timeout: 5000 },
        );
        if (riskRes.data?.risk_category) {
          await DisasterRisk.create({
            district: city.district,
            risk_score: riskRes.data.risk_score,
            risk_level: riskRes.data.risk_category,
            rainfall,
            elevation_factor: city.elevation_factor,
            historical_disaster_index: city.historical_disaster_index,
          });
        }
      } catch (_) {
        const riskScore =
          rainfall * 0.4 +
          city.elevation_factor * 15 +
          city.historical_disaster_index * 8;
        const riskLevel =
          riskScore > 80
            ? "Critical"
            : riskScore > 50
              ? "High"
              : riskScore > 25
                ? "Moderate"
                : "Low";
        await DisasterRisk.create({
          district: city.district,
          risk_score: Math.round(riskScore),
          risk_level: riskLevel,
          rainfall,
          elevation_factor: city.elevation_factor,
          historical_disaster_index: city.historical_disaster_index,
        });
      }
    } catch (err) {
      console.error(
        `[DataSync] Weather error for ${city.city}: ${err.message}`,
      );
    }
  }
  console.log("[DataSync] Weather sync complete");
};

// ── Init all data sync services ──────────────────────────────────
const initDataSync = () => {
  console.log("[DataSync] Initializing WeatherNepal data sync");

  // Run immediately on startup
  fetchAirQualityData();
  fetchWeatherData();
  syncFireHotspots();

  // AQI every 60 min (OWM free tier: 60 calls/min, 1M/month)
  cron.schedule("5 * * * *", async () => {
    console.log("[DataSync] Hourly AQI sync...");
    await fetchAirQualityData();
  });

  // Weather every 5 min
  cron.schedule("*/5 * * * *", async () => {
    await fetchWeatherData();
  });

  // NASA FIRMS fire hotspots every 3 hours
  cron.schedule("0 */3 * * *", async () => {
    console.log("[DataSync] NASA FIRMS fire sync...");
    await syncFireHotspots();
  });
};

module.exports = initDataSync;
