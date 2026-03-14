const cron = require("node-cron");
const axios = require("axios");
const UserAlert = require("../models/UserAlert");
const { sendAlertEmail } = require("./emailService");

const OPEN_METEO = "https://api.open-meteo.com/v1/forecast";
const API_BASE = `http://localhost:${process.env.PORT || 5000}/api`;

// ── Fetch real weather for a location ───────────────────────────
async function fetchWeatherForLocation(lat, lon) {
  try {
    const res = await axios.get(OPEN_METEO, {
      params: {
        latitude: lat,
        longitude: lon,
        current: [
          "temperature_2m",
          "apparent_temperature",
          "relative_humidity_2m",
          "precipitation",
          "snowfall",
          "wind_speed_10m",
          "wind_direction_10m",
          "weather_code",
        ].join(","),
        timezone: "Asia/Kathmandu",
      },
      timeout: 8000,
    });
    const c = res.data.current;
    return {
      temperature: c.temperature_2m,
      feelsLike: c.apparent_temperature,
      humidity: c.relative_humidity_2m,
      rainfall: c.precipitation,
      snowfall: c.snowfall,
      windSpeed: c.wind_speed_10m,
      windDirection: c.wind_direction_10m,
      weatherCode: c.weather_code,
    };
  } catch (err) {
    console.error(
      `[Scheduler] Weather fetch failed for ${lat},${lon}:`,
      err.message,
    );
    return null;
  }
}

// ── Fetch AQI for a location from our backend ────────────────────
async function fetchAQIForLocation(district) {
  try {
    const AirQuality = require("../models/AirQuality");
    const latest = await AirQuality.findOne({ district }).sort({
      timestamp: -1,
    });
    return latest?.aqi || null;
  } catch {
    return null;
  }
}

// ── Get AI advisory for conditions ──────────────────────────────
async function getAdvisory(city, aqi, weather) {
  try {
    const res = await axios.post(
      `${API_BASE}/advisory/quick`,
      {
        city,
        aqi,
        weather: {
          temp: weather.temperature,
          humidity: weather.humidity,
          wind: weather.windSpeed,
          rain: weather.rainfall,
          snow: weather.snowfall,
        },
      },
      { timeout: 15000 },
    );
    return res.data?.advisory || null;
  } catch {
    return null;
  }
}

// ── Check if alert conditions are triggered ──────────────────────
function checkConditions(weather, aqi, alertPrefs) {
  const triggered = [];

  if (alertPrefs.aqi && aqi > 150)
    triggered.push({ type: "aqi", msg: `AQI ${aqi} — Unhealthy air quality` });

  if (alertPrefs.rain && parseFloat(weather.rainfall || 0) > 5)
    triggered.push({
      type: "rain",
      msg: `Heavy rainfall: ${weather.rainfall}mm`,
    });

  if (alertPrefs.wind && (weather.windSpeed || 0) > 40)
    triggered.push({
      type: "wind",
      msg: `Strong winds: ${weather.windSpeed}km/h`,
    });

  if (alertPrefs.snow && parseFloat(weather.snowfall || 0) > 0)
    triggered.push({
      type: "snow",
      msg: `Snowfall detected: ${weather.snowfall}cm`,
    });

  if (alertPrefs.temp && (weather.temperature || 0) < 0)
    triggered.push({
      type: "temp",
      msg: `Below freezing: ${weather.temperature}°C`,
    });

  return triggered;
}

// ── Check if enough time has passed since last alert ─────────────
function shouldSendAlert(lastSent, isDailyOnly) {
  if (!lastSent) return true;
  const hoursSince =
    (Date.now() - new Date(lastSent).getTime()) / (1000 * 60 * 60);
  // Daily summaries: send once per day
  if (isDailyOnly) return hoursSince >= 23;
  // Condition alerts: send at most every 3 hours
  return hoursSince >= 3;
}

// ── Process one subscriber ───────────────────────────────────────
async function processSubscriber(sub) {
  try {
    if (!sub.lat || !sub.lon) {
      console.log(`[Scheduler] Skipping ${sub.email} — no coordinates`);
      return;
    }

    const weather = await fetchWeatherForLocation(sub.lat, sub.lon);
    if (!weather) return;

    const aqi = (await fetchAQIForLocation(sub.district)) || 0;
    const triggered = checkConditions(weather, aqi, sub.alerts);
    const isDailyOnly = sub.alerts.daily && triggered.length === 0;

    // Skip if no conditions triggered and not daily summary
    if (!isDailyOnly && triggered.length === 0) return;

    // Skip if sent too recently
    if (!shouldSendAlert(sub.lastAlertSent, isDailyOnly)) return;

    // Get AI advisory
    const advisory = await getAdvisory(sub.location, aqi, weather);

    // Send email
    await sendAlertEmail({
      to: sub.email,
      name: sub.name,
      location: sub.location,
      district: sub.district,
      weather,
      aqi,
      alerts: triggered.reduce((acc, t) => ({ ...acc, [t.type]: true }), {}),
      advisory,
    });

    // Update last sent time
    await UserAlert.findByIdAndUpdate(
      sub._id,
      { lastAlertSent: new Date() },
      { returnDocument: "after" },
    );

    console.log(
      `[Scheduler] Alert sent to ${sub.email} for ${sub.location} — triggers: ${triggered.map((t) => t.type).join(", ") || "daily"}`,
    );
  } catch (err) {
    console.error(`[Scheduler] Error processing ${sub.email}:`, err.message);
  }
}

// ── Main scheduler ───────────────────────────────────────────────
function initAlertScheduler() {
  console.log("[Scheduler] Alert scheduler initialized");

  // Run every hour at :00
  cron.schedule("0 * * * *", async () => {
    console.log("[Scheduler] Running hourly alert check...");
    try {
      const subscribers = await UserAlert.find({ active: true });
      console.log(`[Scheduler] Checking ${subscribers.length} subscribers...`);

      // Process in batches of 5 to avoid rate limits
      for (let i = 0; i < subscribers.length; i += 5) {
        const batch = subscribers.slice(i, i + 5);
        await Promise.all(batch.map(processSubscriber));
        // Small delay between batches
        if (i + 5 < subscribers.length) {
          await new Promise((r) => setTimeout(r, 2000));
        }
      }
      console.log("[Scheduler] Hourly check complete");
    } catch (err) {
      console.error("[Scheduler] Error:", err.message);
    }
  });

  // Daily summary at 7:00 AM Nepal time (1:15 AM UTC)
  cron.schedule("15 1 * * *", async () => {
    console.log("[Scheduler] Running daily summary emails...");
    try {
      const subscribers = await UserAlert.find({
        active: true,
        "alerts.daily": true,
      });
      console.log(
        `[Scheduler] Sending daily summaries to ${subscribers.length} subscribers...`,
      );
      for (const sub of subscribers) {
        await processSubscriber(sub);
        await new Promise((r) => setTimeout(r, 1000));
      }
    } catch (err) {
      console.error("[Scheduler] Daily summary error:", err.message);
    }
  });
}

module.exports = initAlertScheduler;
