require("dotenv").config({
  path: require("path").resolve(__dirname, "../../.env"),
});

const cron = require("node-cron");
const axios = require("axios");

const WeatherData = require("../models/WeatherData");
const Notification = require("../models/Notification");
const NEPAL_CITIES = require("../../../nepal_cities");
const { syncFireHotspots } = require("./nasaFirms");

const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";
const WEATHER_NOTIFICATION_WINDOW_MS = 60 * 60 * 1000;

function getWeatherSeverity({ temperature, rainfall, snowfall, windSpeed }) {
  const rain = Number(rainfall || 0);
  const snow = Number(snowfall || 0);
  const wind = Number(windSpeed || 0);
  const temp = Number(temperature || 0);

  if (rain > 20 || snow > 5 || wind > 50 || temp < 0 || temp > 38) {
    return "high";
  }

  if (rain > 5 || snow > 0 || wind > 30 || temp < 5 || temp > 35) {
    return "warning";
  }

  return "info";
}

function buildWeatherAlertMessage(city, weather) {
  const parts = [];
  if (Number(weather.rainfall || 0) > 5) {
    parts.push(`Rainfall ${Number(weather.rainfall).toFixed(1)} mm`);
  }
  if (Number(weather.snowfall || 0) > 0) {
    parts.push(`Snowfall ${Number(weather.snowfall).toFixed(1)} cm`);
  }
  if (Number(weather.windSpeed || 0) > 30) {
    parts.push(`Wind ${Math.round(Number(weather.windSpeed || 0))} km/h`);
  }
  if (Number(weather.temperature || 0) < 5) {
    parts.push(`Cold ${Math.round(Number(weather.temperature || 0))}°C`);
  }
  if (Number(weather.temperature || 0) > 35) {
    parts.push(`Heat ${Math.round(Number(weather.temperature || 0))}°C`);
  }

  return parts.length
    ? `Weather alert for ${city.city}: ${parts.join(" • ")}`
    : null;
}

async function maybeCreatePublicWeatherNotification(city, weather) {
  const severity = getWeatherSeverity(weather);
  const message = buildWeatherAlertMessage(city, weather);
  if (!message || severity === "info") return;

  const title = `Weather Alert: ${city.city}`;
  const recent = await Notification.findOne({
    isPublic: true,
    type: "alert",
    location: city.city,
    title,
    createdAt: { $gte: new Date(Date.now() - WEATHER_NOTIFICATION_WINDOW_MS) },
  }).lean();

  if (recent) return;

  await Notification.create({
    isPublic: true,
    title,
    message,
    details: message,
    advisory: message,
    source: "weather-sync",
    type: "alert",
    severity,
    location: city.city,
  });
}

async function fetchWeatherData() {
  console.log("[DataSync] Fetching weather data from Open-Meteo...");

  for (const city of NEPAL_CITIES) {
    try {
      let temperature = 25;
      let windSpeed = 10;
      let rainfall = 0;
      let snowfall = 0;
      let humidity = 60;

      try {
        const res = await axios.get(OPEN_METEO_URL, {
          params: {
            latitude: city.lat,
            longitude: city.lon,
            current:
              "temperature_2m,relative_humidity_2m,precipitation,snowfall,wind_speed_10m",
            timezone: "Asia/Kathmandu",
          },
          timeout: 8000,
        });

        temperature = res.data.current?.temperature_2m ?? temperature;
        windSpeed = res.data.current?.wind_speed_10m ?? windSpeed;
        rainfall = res.data.current?.precipitation ?? rainfall;
        snowfall = res.data.current?.snowfall ?? snowfall;
        humidity = res.data.current?.relative_humidity_2m ?? humidity;
      } catch {
        // Keep non-blocking fallback values if provider is unavailable.
      }

      await WeatherData.create({
        district: city.district,
        temperature,
        wind_speed: windSpeed,
        rainfall,
        snowfall,
        humidity,
      });

      try {
        await maybeCreatePublicWeatherNotification(city, {
          temperature,
          windSpeed,
          rainfall,
          snowfall,
        });
      } catch (notificationErr) {
        console.error(
          `[DataSync] Notification error for ${city.city}: ${notificationErr.message}`,
        );
      }
    } catch (err) {
      console.error(
        `[DataSync] Weather error for ${city.city}: ${err.message}`,
      );
    }
  }

  console.log("[DataSync] Weather sync complete");
}

function initDataSync() {
  console.log("[DataSync] Initializing weather + fire sync");

  // Run immediately on startup.
  fetchWeatherData();
  syncFireHotspots();

  // Weather every 5 minutes.
  cron.schedule("*/5 * * * *", async () => {
    await fetchWeatherData();
  });

  // NASA FIRMS fire hotspots every 3 hours.
  cron.schedule("0 */3 * * *", async () => {
    console.log("[DataSync] NASA FIRMS fire sync...");
    await syncFireHotspots();
  });
}

module.exports = initDataSync;
