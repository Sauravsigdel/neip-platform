const express = require("express");
const router = express.Router();
// Smart local advisory — no API key needed

// ── Shared advisory logic (exported for internal use) ────────────
function generateQuickAdvisory({ city, aqi, weather }) {
  const tips = [];
  const month = new Date().getMonth();
  const isSpring = month >= 2 && month <= 4;
  const isMonsoon = month >= 5 && month <= 8;
  const rain = parseFloat(weather?.rain || 0);
  const snow = parseFloat(weather?.snow || 0);
  const temp = weather?.temp || 20;
  const wind = weather?.wind || 0;
  const uv = weather?.uv || 0;
  const aqiVal = aqi || 0;

  if (aqiVal > 200)
    tips.push(
      `Very unhealthy air (AQI ${aqiVal}) — wear N95 mask, avoid outdoor activity.`,
    );
  else if (aqiVal > 150)
    tips.push(
      `Unhealthy air (AQI ${aqiVal}) — wear mask outdoors, limit physical activity.`,
    );
  else if (aqiVal > 100)
    tips.push(
      `Moderate air quality (AQI ${aqiVal}) — sensitive groups reduce outdoor time.`,
    );
  else
    tips.push(
      `Good air quality (AQI ${aqiVal}) — safe for outdoor activities.`,
    );

  if (snow > 5)
    tips.push(
      `Heavy snowfall ${snow}cm — mountain roads likely blocked, carry emergency gear.`,
    );
  else if (snow > 0)
    tips.push(`Light snow ${snow}cm — roads may be slippery, drive carefully.`);
  if (rain > 10)
    tips.push(
      `Heavy rain ${rain}mm — risk of flash floods${isMonsoon ? " during monsoon" : ""}, avoid river banks.`,
    );
  else if (rain > 3)
    tips.push(
      `Moderate rain ${rain}mm — carry umbrella, be cautious on steep roads.`,
    );
  if (wind > 40)
    tips.push(
      `Strong winds ${wind}km/h — secure loose items, avoid exposed ridges.`,
    );
  if (temp < 0)
    tips.push(`Freezing ${temp}°C — risk of frostbite, wear thermal layers.`);
  else if (temp > 35)
    tips.push(`Very hot ${temp}°C — stay hydrated, avoid midday sun.`);
  if (uv >= 8) tips.push(`Extreme UV ${uv}/11 — apply SPF50+ sunscreen.`);
  if (isSpring && aqiVal > 100)
    tips.push(
      `Burning season: agricultural fires contributing to poor air quality.`,
    );
  if (isMonsoon && rain > 0)
    tips.push(`Monsoon season: mosquito activity high, use repellent.`);

  return tips.slice(0, 3).join(" ");
}

// ── POST /api/advisory/generate ─────────────────────────────────
// Original endpoint — kept for backwards compatibility
router.post("/generate", async (req, res) => {
  const { district, aqi, risk_level, rainfall, temperature } = req.body;
  if (!district) return res.status(400).json({ error: "District is required" });

  try {
    // Smart local advisory
    const tips = [];
    if ((aqi || 0) > 150)
      tips.push(
        `1. HEALTH PRECAUTIONS: AQI is ${aqi} (Unhealthy). Wear N95 mask outdoors. Keep windows closed. Sensitive groups should stay indoors.`,
      );
    else
      tips.push(
        `1. HEALTH PRECAUTIONS: Air quality is acceptable (AQI ${aqi || "N/A"}). Safe for most outdoor activities.`,
      );
    if ((rainfall || 0) > 5)
      tips.push(
        `2. OUTDOOR ACTIVITY GUIDANCE: Heavy rainfall expected. Avoid river banks and steep slopes. Risk of flash floods and landslides.`,
      );
    else
      tips.push(
        `2. OUTDOOR ACTIVITY GUIDANCE: Weather conditions are suitable for outdoor activities. Carry an umbrella as a precaution.`,
      );
    const riskTip =
      risk_level === "Critical" || risk_level === "High"
        ? `High disaster risk detected. Prepare emergency kit. Monitor local alerts.`
        : `Disaster risk is ${risk_level || "Low"}. Stay informed via local authorities.`;
    tips.push(`3. DISASTER PREPAREDNESS: ${riskTip}`);

    res.json({
      district,
      advisory: tips.join("\n"),
      generated_at: new Date().toISOString(),
      source: "local-engine",
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to generate advisory", details: error.message });
  }
});

// ── POST /api/advisory/quick ─────────────────────────────────────
// Smart local advisory based on real weather conditions
router.post("/quick", async (req, res) => {
  const { city, aqi, weather } = req.body;
  if (!city) return res.status(400).json({ error: "city is required" });

  const advisory = generateQuickAdvisory({ city, aqi, weather });
  res.json({
    city,
    advisory,
    generated_at: new Date().toISOString(),
    source: "local-engine",
  });
});

module.exports = router;
module.exports.generateQuickAdvisory = generateQuickAdvisory;
