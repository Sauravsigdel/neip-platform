const cron = require("node-cron");
const axios = require("axios");
const AirQuality = require("../models/AirQuality");
const WeatherData = require("../models/WeatherData");
const DisasterRisk = require("../models/DisasterRisk");
const AQIPrediction = require("../models/AQIPrediction");
const NEPAL_CITIES = require("../../../nepal_cities");

const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:5001";

// ── US EPA AQI breakpoints for PM2.5 (µg/m³) ─────────────────────────────────
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
  const truncated = Math.floor(pm25 * 10) / 10;
  for (const bp of PM25_BREAKPOINTS) {
    if (truncated >= bp.cLow && truncated <= bp.cHigh) {
      return Math.round(
        ((bp.iHigh - bp.iLow) / (bp.cHigh - bp.cLow)) * (truncated - bp.cLow) +
          bp.iLow,
      );
    }
  }
  return 500;
}

// ── PM10 AQI breakpoints ──────────────────────────────────────────────────────
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
  const truncated = Math.floor(pm10);
  for (const bp of PM10_BREAKPOINTS) {
    if (truncated >= bp.cLow && truncated <= bp.cHigh) {
      return Math.round(
        ((bp.iHigh - bp.iLow) / (bp.cHigh - bp.cLow)) * (truncated - bp.cLow) +
          bp.iLow,
      );
    }
  }
  return 500;
}

// ── Z-Score anomaly detection ─────────────────────────────────────────────────
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

// ── Realistic Nepal AQI simulation per city type ──────────────────────────────
function simulateAQIForCity(city) {
  // Valley cities (Kathmandu valley) — higher pollution
  const valleyDistricts = [
    "Kathmandu",
    "Lalitpur",
    "Bhaktapur",
    "Kavrepalanchok",
  ];
  // Terai (flatland) border cities — moderate-high
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
  // Hill/mountain — lower
  const hillDistricts = [
    "Kaski",
    "Makwanpur",
    "Palpa",
    "Baglung",
    "Tanahun",
    "Syangja",
    "Dang",
    "Dailekh",
    "Doti",
  ];

  let basePM25, noise;
  if (valleyDistricts.includes(city.district)) {
    basePM25 = 60 + Math.random() * 80; // 60-140 µg/m³
  } else if (teraiDistricts.includes(city.district)) {
    basePM25 = 30 + Math.random() * 60; // 30-90 µg/m³
  } else {
    basePM25 = 10 + Math.random() * 30; // 10-40 µg/m³
  }

  // Seasonal factor — Nepal pollution peaks Nov-Feb
  const month = new Date().getMonth(); // 0-11
  const winterFactor = month >= 10 || month <= 1 ? 1.4 : 1.0;

  const pm25 = basePM25 * winterFactor;
  const pm10 = pm25 * (1.5 + Math.random() * 0.5);
  const no2 = 10 + Math.random() * 40;
  const co = 0.3 + Math.random() * 1.5;
  const o3 = 20 + Math.random() * 60;

  const aqiFromPM25 = pm25ToAQI(pm25);
  const aqiFromPM10 = pm10ToAQI(pm10);
  const aqi = Math.max(aqiFromPM25 || 0, aqiFromPM10 || 0);

  return {
    pm25: Math.round(pm25 * 10) / 10,
    pm10: Math.round(pm10 * 10) / 10,
    no2: Math.round(no2 * 10) / 10,
    co: Math.round(co * 100) / 100,
    o3: Math.round(o3 * 10) / 10,
    aqi,
  };
}

// ── Fetch from OpenAQ v3 API ──────────────────────────────────────────────────
async function fetchOpenAQForCity(city) {
  try {
    // Try OpenAQ v3: search by radius around city coordinates
    const response = await axios.get("https://api.openaq.org/v3/locations", {
      params: {
        coordinates: `${city.lat},${city.lon}`,
        radius: 25000, // 25km radius
        limit: 5,
        order_by: "distance",
      },
      headers: { "X-API-Key": process.env.OPENAQ_API_KEY || "" },
      timeout: 8000,
    });

    const locations = response.data?.results;
    if (!locations || locations.length === 0) return null;

    // Find the closest location with recent data
    for (const loc of locations) {
      if (!loc.sensors || loc.sensors.length === 0) continue;
      const pm25Sensor = loc.sensors.find(
        (s) => s.name === "pm25" || s.parameter?.name === "pm25",
      );
      const pm10Sensor = loc.sensors.find(
        (s) => s.name === "pm10" || s.parameter?.name === "pm10",
      );

      if (pm25Sensor || pm10Sensor) {
        // Fetch latest measurements for this location
        const measRes = await axios.get(
          `https://api.openaq.org/v3/locations/${loc.id}/latest`,
          {
            headers: { "X-API-Key": process.env.OPENAQ_API_KEY || "" },
            timeout: 8000,
          },
        );

        const measurements = measRes.data?.results || [];
        const pm25Meas = measurements.find((m) => m.parameter === "pm25");
        const pm10Meas = measurements.find((m) => m.parameter === "pm10");
        const no2Meas = measurements.find((m) => m.parameter === "no2");

        if (pm25Meas || pm10Meas) {
          const pm25 = pm25Meas?.value;
          const pm10 = pm10Meas?.value;
          const no2 = no2Meas?.value;

          const aqiFromPM25 = pm25 ? pm25ToAQI(pm25) : null;
          const aqiFromPM10 = pm10 ? pm10ToAQI(pm10) : null;
          const aqi = Math.max(aqiFromPM25 || 0, aqiFromPM10 || 0);

          return {
            pm25: pm25 ? Math.round(pm25 * 10) / 10 : null,
            pm10: pm10 ? Math.round(pm10 * 10) / 10 : null,
            no2: no2 ? Math.round(no2 * 10) / 10 : null,
            co: null,
            o3: null,
            aqi,
            stationName: loc.name,
            dataSource: "openaq",
          };
        }
      }
    }
    return null;
  } catch (err) {
    // OpenAQ unavailable or rate-limited
    return null;
  }
}

// ── Main: fetch AQI for all 40+ cities ───────────────────────────────────────
const fetchAirQualityData = async () => {
  console.log(
    `[DataSync] Fetching AQI for ${NEPAL_CITIES.length} Nepal cities...`,
  );
  const allAQIs = [];

  for (const city of NEPAL_CITIES) {
    try {
      let airData = await fetchOpenAQForCity(city);

      if (!airData || !airData.aqi || airData.aqi === 0) {
        // Fallback: realistic simulation
        airData = simulateAQIForCity(city);
        airData.dataSource = "simulated";
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
        data_source: airData.dataSource || "simulated",
        station_name: airData.stationName || city.city,
        lat: city.lat,
        lon: city.lon,
      });

      console.log(
        `[DataSync] ${city.city}: AQI=${airData.aqi} (${airData.dataSource || "simulated"})`,
      );

      // Anomaly detection
      if (allAQIs.length > 3) {
        if (detectAnomaly(airData.aqi, allAQIs.slice(0, -1))) {
          console.warn(`[ALERT] Anomalous AQI in ${city.city}: ${airData.aqi}`);
        }
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
        /* ML service optional */
      }
    } catch (err) {
      console.error(`[DataSync] Error for ${city.city}: ${err.message}`);
    }
  }
  console.log(
    `[DataSync] AQI sync complete for ${NEPAL_CITIES.length} cities.`,
  );
};

// ── Fetch weather for all cities ──────────────────────────────────────────────
const fetchWeatherData = async () => {
  console.log("[DataSync] Fetching weather data...");

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
              "temperature_2m,relativehumidity_2m,precipitation,windspeed_10m",
            forecast_days: 1,
          },
          timeout: 8000,
        });
        temperature = res.data.current_weather?.temperature ?? 25;
        windSpeed = res.data.current_weather?.windspeed ?? 10;
        rainfall = res.data.hourly?.precipitation?.[0] ?? 0;
        humidity = res.data.hourly?.relativehumidity_2m?.[0] ?? 60;
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
};

const initDataSync = () => {
  console.log(
    "[DataSync] Initializing — Nepal AQI Live Dashboard (5-min refresh)",
  );
  // Run immediately on startup
  fetchAirQualityData();
  fetchWeatherData();
  // Every 5 minutes
  cron.schedule("*/5 * * * *", async () => {
    console.log("[DataSync] 5-min refresh triggered...");
    await fetchAirQualityData();
    await fetchWeatherData();
  });
};

module.exports = initDataSync;
