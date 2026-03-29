require("dotenv").config({
  path: require("path").resolve(__dirname, "../../.env"),
});
const cron = require("node-cron");
const axios = require("axios");
const User = require("../models/User");
const Notification = require("../models/Notification");
const AirQuality = require("../models/AirQuality");
const WeatherData = require("../models/WeatherData");
const { sendAlertEmail } = require("./emailService");
const { generateQuickAdvisory } = require("../routes/advisoryRoutes");

const OPEN_METEO = "https://api.open-meteo.com/v1/forecast";

// ── AQI level helper ─────────────────────────────────────────────
function aqiLevel(aqi) {
  if (!Number.isFinite(aqi)) return { label: "Unavailable", severity: "info" };
  if (aqi <= 50) return { label: "Good", severity: "info" };
  if (aqi <= 100) return { label: "Moderate", severity: "info" };
  if (aqi <= 150)
    return { label: "Unhealthy for Sensitive Groups", severity: "warning" };
  if (aqi <= 200) return { label: "Unhealthy", severity: "danger" };
  if (aqi <= 300) return { label: "Very Unhealthy", severity: "danger" };
  return { label: "Hazardous", severity: "danger" };
}

// ── Fetch real weather ───────────────────────────────────────────
async function fetchWeather(lat, lon) {
  try {
    const res = await axios.get(OPEN_METEO, {
      params: {
        latitude: lat,
        longitude: lon,
        current:
          "temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,snowfall,wind_speed_10m",
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
    };
  } catch {
    return null;
  }
}

// ── Check if user already got a notification today ───────────────
function gotNotificationToday(user) {
  if (!user.lastNotificationSent) return false;
  const last = new Date(user.lastNotificationSent);
  const now = new Date();
  return last.toDateString() === now.toDateString();
}

// ── Build notification content ───────────────────────────────────
function buildNotification(user, weather, aqi) {
  const alerts = [];

  if (user.alerts.aqi) {
    if (!Number.isFinite(aqi)) {
      alerts.push({
        type: "aqiUnavailable",
        severity: "info",
        title: `ℹ️ AQI Data Unavailable — ${user.location}`,
        message: `AQI data is currently unavailable in ${user.location}. Advisory and alerts are based on weather signals (temperature, wind, rainfall, snowfall).`,
      });
    } else if (aqi > 150) {
      const lvl = aqiLevel(aqi);
      alerts.push({
        type: "aqi",
        severity: lvl.severity,
        title: `⚠️ Air Quality Alert — ${user.location}`,
        message: `AQI is ${aqi} (${lvl.label}) in ${user.location}. ${aqi > 200 ? "Avoid all outdoor activity. Stay indoors." : "Wear N95 mask if going outdoors."}`,
      });
    }
  }
  if (user.alerts.rain && weather && parseFloat(weather.rainfall) > 5) {
    alerts.push({
      type: "rain",
      severity: "warning",
      title: `🌧️ Heavy Rain Alert — ${user.location}`,
      message: `Heavy rainfall of ${weather.rainfall}mm detected. Risk of flash floods and landslides. Avoid river banks and steep slopes.`,
    });
  }
  if (user.alerts.snow && weather && parseFloat(weather.snowfall) > 0) {
    alerts.push({
      type: "snow",
      severity: "warning",
      title: `❄️ Snowfall Alert — ${user.location}`,
      message: `Snowfall of ${weather.snowfall}cm detected in ${user.location}. Check road conditions before travel. Dress warmly.`,
    });
  }
  if (user.alerts.wind && weather && weather.windSpeed > 40) {
    alerts.push({
      type: "wind",
      severity: "warning",
      title: `💨 Strong Wind Alert — ${user.location}`,
      message: `Wind speeds of ${weather.windSpeed}km/h in ${user.location}. Secure loose objects. Avoid exposed ridges.`,
    });
  }
  if (user.alerts.temp && weather && weather.temperature < 0) {
    alerts.push({
      type: "temp",
      severity: "danger",
      title: `🥶 Freezing Temperature — ${user.location}`,
      message: `Temperature dropped to ${weather.temperature}°C in ${user.location}. Risk of frostbite. Wear thermal clothing.`,
    });
  }

  // Daily summary if enabled and no alerts triggered
  if (user.alerts.daily && alerts.length === 0 && weather) {
    const aqiText = Number.isFinite(aqi)
      ? `AQI ${aqi} (${aqiLevel(aqi).label})`
      : "AQI unavailable";
    alerts.push({
      type: "daily",
      severity: "info",
      title: `🌅 Daily Weather — ${user.location}`,
      message: `Today in ${user.location}: ${weather.temperature}°C, ${aqiText}. Humidity ${weather.humidity}%, Wind ${weather.windSpeed}km/h.`,
    });
  }

  return alerts;
}

async function createPublicNewsNotification() {
  try {
    const latestAqi = await AirQuality.findOne()
      .sort({ timestamp: -1, aqi: -1 })
      .select("city district aqi timestamp");
    const latestWeather = await WeatherData.findOne()
      .sort({ timestamp: -1, rainfall: -1, snowfall: -1, wind_speed: -1 })
      .select(
        "district rainfall snowfall temperature wind_speed humidity timestamp",
      );

    if (!latestAqi && !latestWeather) return;

    const location = latestWeather?.district || latestAqi?.district || "Nepal";
    const aqi = Number.isFinite(latestAqi?.aqi) ? latestAqi.aqi : null;
    const rain = Number(latestWeather?.rainfall || 0);
    const snow = Number(latestWeather?.snowfall || 0);
    const temp = Number(latestWeather?.temperature || 0);
    const wind = Number(latestWeather?.wind_speed || 0);
    const humidity = Number(latestWeather?.humidity || 0);

    const headlineParts = [];
    if (Number.isFinite(aqi)) headlineParts.push(`AQI ${aqi}`);
    if (rain > 0) headlineParts.push(`Rain ${rain}mm`);
    if (snow > 0) headlineParts.push(`Snow ${snow}cm`);
    if (wind > 0) headlineParts.push(`Wind ${wind}km/h`);
    if (!headlineParts.length) headlineParts.push("Conditions stable");

    const title = `📰 Public Weather News — ${location}`;
    const message = `${location}: ${headlineParts.join(" • ")}`;

    const advisory = generateQuickAdvisory({
      city: location,
      aqi,
      weather: { temp, rain, snow, wind },
    });

    const details = [
      `Regional conditions in ${location} were updated at ${new Date().toLocaleString("en-US", { timeZone: "Asia/Kathmandu" })}.`,
      Number.isFinite(aqi)
        ? `Latest air quality estimate is AQI ${aqi}.`
        : "Latest air quality estimate is currently unavailable.",
      `Weather snapshot: temperature ${temp}°C, humidity ${humidity}%, rainfall ${rain}mm, snowfall ${snow}cm, wind ${wind}km/h.`,
      `Suggestion: ${advisory}`,
    ].join(" ");

    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const existing = await Notification.findOne({
      isPublic: true,
      title,
      createdAt: { $gte: thirtyMinutesAgo },
    }).select("_id");
    if (existing) return;

    await Notification.create({
      isPublic: true,
      title,
      message,
      details,
      advisory,
      type: "news",
      severity: Number.isFinite(aqi) && aqi > 150 ? "warning" : "info",
      location,
      source: "local-ai-engine",
      aqi: Number.isFinite(aqi) ? aqi : undefined,
      read: true,
    });
  } catch (err) {
    console.error(
      "[NotifScheduler] Public news generation failed:",
      err.message,
    );
  }
}

// ── Process one user ─────────────────────────────────────────────
async function processUser(user) {
  try {
    // Skip if no location coords
    if (!user.lat || !user.lon) return;

    // Skip if already notified today (1 per day limit)
    if (gotNotificationToday(user)) return;

    // Get AQI from DB
    const aqiRecord = await AirQuality.findOne({
      district: user.district,
    }).sort({ timestamp: -1 });
    const aqi = Number.isFinite(aqiRecord?.aqi) ? aqiRecord.aqi : null;

    // Get real weather
    const weather = await fetchWeather(user.lat, user.lon);

    // Build notifications
    const alerts = buildNotification(user, weather, aqi);
    if (alerts.length === 0) return;

    // Only send if conditions are actually bad (or daily is enabled)
    const hasDanger = alerts.some(
      (a) => a.severity === "danger" || a.severity === "warning",
    );
    const hasDaily = alerts.some((a) => a.type === "daily");

    // Check hour — only send daily at 8 AM Nepal time
    const nepalDate = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Kathmandu" }),
    );
    const nepalHour = nepalDate.getHours();
    if (hasDaily && !hasDanger && nepalHour !== 8) return;

    // Use only the most severe/first alert
    const mainAlert = alerts[0];

    // Save to DB (will show in-app when user logs in)
    await Notification.create({
      userId: user._id,
      title: mainAlert.title,
      message: mainAlert.message,
      type: mainAlert.type,
      severity: mainAlert.severity,
      location: user.location,
      aqi,
    });

    // Send email
    try {
      const advisory = generateQuickAdvisory({
        city: user.location,
        aqi,
        weather: {
          temp: weather?.temperature,
          humidity: weather?.humidity,
          wind: weather?.windSpeed,
          rain: weather?.rainfall,
          snow: weather?.snowfall,
        },
      });

      await sendAlertEmail({
        to: user.email,
        name: user.name,
        location: user.location,
        district: user.district,
        weather: {
          temperature: weather?.temperature,
          feelsLike: weather?.feelsLike,
          humidity: weather?.humidity,
          windSpeed: weather?.windSpeed,
          rainfall: weather?.rainfall,
          snowfall: weather?.snowfall,
        },
        aqi,
        alerts: { [mainAlert.type]: true },
        advisory,
      });
    } catch (emailErr) {
      console.error(
        `[NotifScheduler] Email failed for ${user.email}:`,
        emailErr.message,
      );
    }

    // Update last notification sent
    await User.findByIdAndUpdate(user._id, {
      lastNotificationSent: new Date(),
    });

    console.log(
      `[NotifScheduler] Notified ${user.email} — ${mainAlert.type} in ${user.location}`,
    );
  } catch (err) {
    console.error(`[NotifScheduler] Error for ${user.email}:`, err.message);
  }
}

// ── Main scheduler ───────────────────────────────────────────────
function initNotificationScheduler() {
  console.log("[NotifScheduler] Initialized");

  // Run every hour
  cron.schedule("0 * * * *", async () => {
    console.log("[NotifScheduler] Hourly check running...");
    try {
      await createPublicNewsNotification();
      const users = await User.find({ isVerified: true });
      console.log(`[NotifScheduler] Checking ${users.length} users...`);
      for (let i = 0; i < users.length; i += 5) {
        const batch = users.slice(i, i + 5);
        await Promise.all(batch.map(processUser));
        if (i + 5 < users.length) await new Promise((r) => setTimeout(r, 2000));
      }
    } catch (err) {
      console.error("[NotifScheduler] Error:", err.message);
    }
  });

  // Clean up old read notifications older than 3 days (belt and suspenders)
  cron.schedule("0 0 * * *", async () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    await Notification.deleteMany({ createdAt: { $lt: threeDaysAgo } });
    console.log("[NotifScheduler] Old notifications cleaned up");
  });
}

module.exports = initNotificationScheduler;
