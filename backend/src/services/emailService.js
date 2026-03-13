const nodemailer = require("nodemailer");

// ── Transporter setup (Gmail) — created lazily so env vars are loaded ──
function getTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

// ── AQI color helper ─────────────────────────────────────────────
function aqiColor(aqi) {
  if (aqi <= 50) return { bg: "#16a34a", text: "Good" };
  if (aqi <= 100) return { bg: "#ca8a04", text: "Moderate" };
  if (aqi <= 150) return { bg: "#ea580c", text: "Unhealthy (Sensitive)" };
  if (aqi <= 200) return { bg: "#dc2626", text: "Unhealthy" };
  if (aqi <= 300) return { bg: "#9333ea", text: "Very Unhealthy" };
  return { bg: "#7f1d1d", text: "Hazardous" };
}

// ── Weather condition emoji ──────────────────────────────────────
function weatherEmoji(rain, snow, wind, temp) {
  if (snow > 0) return "❄️";
  if (rain > 5) return "🌧️";
  if (rain > 0) return "🌦️";
  if (wind > 40) return "💨";
  if (temp < 5) return "🥶";
  if (temp > 32) return "🔥";
  return "🌤️";
}

// ── Main HTML email template ─────────────────────────────────────
function buildAlertEmail({
  name,
  location,
  district,
  weather,
  aqi,
  alerts,
  advisory,
}) {
  const aqiInfo = aqiColor(aqi);
  const emoji = weatherEmoji(
    parseFloat(weather.rainfall || 0),
    parseFloat(weather.snowfall || 0),
    weather.windSpeed || 0,
    weather.temperature || 0,
  );

  // Build alert badges
  const alertBadges = [];
  if (alerts.aqi && aqi > 150)
    alertBadges.push(
      `<span style="background:#dc2626;color:#fff;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;margin:3px;display:inline-block;">🏭 AQI Alert: ${aqi}</span>`,
    );
  if (alerts.rain && parseFloat(weather.rainfall || 0) > 5)
    alertBadges.push(
      `<span style="background:#1d4ed8;color:#fff;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;margin:3px;display:inline-block;">🌧️ Heavy Rain: ${weather.rainfall}mm</span>`,
    );
  if (alerts.snow && parseFloat(weather.snowfall || 0) > 0)
    alertBadges.push(
      `<span style="background:#0891b2;color:#fff;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;margin:3px;display:inline-block;">❄️ Snowfall: ${weather.snowfall}cm</span>`,
    );
  if (alerts.wind && (weather.windSpeed || 0) > 40)
    alertBadges.push(
      `<span style="background:#7c3aed;color:#fff;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;margin:3px;display:inline-block;">💨 Strong Wind: ${weather.windSpeed}km/h</span>`,
    );
  if (alerts.temp && (weather.temperature || 0) < 0)
    alertBadges.push(
      `<span style="background:#0369a1;color:#fff;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;margin:3px;display:inline-block;">🥶 Freezing: ${weather.temperature}°C</span>`,
    );

  const now = new Date().toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kathmandu",
  });

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:24px 0;">
<tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;">

  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#0f172a,#1e3a8a);border-radius:16px 16px 0 0;padding:28px 32px;text-align:center;">
    <div style="font-size:28px;margin-bottom:8px;">🌏</div>
    <div style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px;">Weather<span style="color:#38bdf8;">Nepal</span></div>
    <div style="font-size:11px;color:rgba(255,255,255,0.5);letter-spacing:2px;text-transform:uppercase;margin-top:2px;">Live Weather Intelligence</div>
  </td></tr>

  <!-- Alert Banner -->
  <tr><td style="background:${aqiInfo.bg};padding:16px 32px;text-align:center;">
    <div style="font-size:13px;font-weight:800;color:#fff;text-transform:uppercase;letter-spacing:1px;">
      ⚠️ Weather Alert — ${location}, Nepal
    </div>
    <div style="font-size:11px;color:rgba(255,255,255,0.8);margin-top:4px;">${now} (NST)</div>
  </td></tr>

  <!-- Main Card -->
  <tr><td style="background:#ffffff;padding:28px 32px;">

    <!-- Greeting -->
    <p style="font-size:15px;color:#1e293b;margin:0 0 20px;">Hi <strong>${name}</strong>,</p>
    <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 24px;">
      Here is your WeatherNepal alert for <strong>${location}${district ? ", " + district + " District" : ""}</strong>.
      ${alertBadges.length > 0 ? "The following conditions have been detected:" : "Here is your daily weather summary:"}
    </p>

    <!-- Alert Badges -->
    ${alertBadges.length > 0 ? `<div style="text-align:center;margin-bottom:24px;">${alertBadges.join("")}</div>` : ""}

    <!-- Weather Grid -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td width="50%" style="padding:4px;">
          <div style="background:#f8fafc;border-radius:12px;padding:16px;text-align:center;border:1px solid #e2e8f0;">
            <div style="font-size:28px;margin-bottom:4px;">${emoji}</div>
            <div style="font-size:24px;font-weight:800;color:#0f172a;">${weather.temperature}°C</div>
            <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Temperature</div>
            <div style="font-size:11px;color:#64748b;margin-top:2px;">Feels like ${weather.feelsLike || weather.temperature}°C</div>
          </div>
        </td>
        <td width="50%" style="padding:4px;">
          <div style="background:${aqiInfo.bg};border-radius:12px;padding:16px;text-align:center;">
            <div style="font-size:28px;font-weight:900;color:#fff;">${aqi}</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.8);text-transform:uppercase;letter-spacing:1px;">AQI</div>
            <div style="font-size:12px;font-weight:700;color:#fff;margin-top:2px;">${aqiInfo.text}</div>
          </div>
        </td>
      </tr>
    </table>

    <!-- Stats Row -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="padding:4px;text-align:center;">
          <div style="background:#f8fafc;border-radius:10px;padding:12px 8px;border:1px solid #e2e8f0;">
            <div style="font-size:16px;">💧</div>
            <div style="font-size:14px;font-weight:700;color:#0f172a;">${weather.humidity}%</div>
            <div style="font-size:9px;color:#94a3b8;text-transform:uppercase;">Humidity</div>
          </div>
        </td>
        <td style="padding:4px;text-align:center;">
          <div style="background:#f8fafc;border-radius:10px;padding:12px 8px;border:1px solid #e2e8f0;">
            <div style="font-size:16px;">💨</div>
            <div style="font-size:14px;font-weight:700;color:#0f172a;">${weather.windSpeed} km/h</div>
            <div style="font-size:9px;color:#94a3b8;text-transform:uppercase;">Wind</div>
          </div>
        </td>
        <td style="padding:4px;text-align:center;">
          <div style="background:#f8fafc;border-radius:10px;padding:12px 8px;border:1px solid #e2e8f0;">
            <div style="font-size:16px;">🌧️</div>
            <div style="font-size:14px;font-weight:700;color:#0f172a;">${weather.rainfall || 0} mm</div>
            <div style="font-size:9px;color:#94a3b8;text-transform:uppercase;">Rainfall</div>
          </div>
        </td>
        <td style="padding:4px;text-align:center;">
          <div style="background:#f8fafc;border-radius:10px;padding:12px 8px;border:1px solid #e2e8f0;">
            <div style="font-size:16px;">❄️</div>
            <div style="font-size:14px;font-weight:700;color:#0f172a;">${weather.snowfall || 0} cm</div>
            <div style="font-size:9px;color:#94a3b8;text-transform:uppercase;">Snowfall</div>
          </div>
        </td>
      </tr>
    </table>

    <!-- AI Advisory -->
    ${
      advisory
        ? `
    <div style="background:linear-gradient(135deg,#eff6ff,#f0f9ff);border-radius:12px;padding:18px;border:1px solid #bfdbfe;margin-bottom:24px;">
      <div style="display:flex;align-items:center;margin-bottom:10px;">
        <span style="font-size:16px;margin-right:8px;">🤖</span>
        <span style="font-size:11px;font-weight:700;color:#1d4ed8;text-transform:uppercase;letter-spacing:1px;">Claude AI Advisory</span>
      </div>
      <p style="font-size:13px;color:#334155;line-height:1.7;margin:0;">${advisory}</p>
    </div>`
        : ""
    }

    <!-- Safety Tips -->
    <div style="background:#fefce8;border-radius:12px;padding:16px;border:1px solid #fde047;margin-bottom:24px;">
      <div style="font-size:12px;font-weight:700;color:#854d0e;margin-bottom:8px;">⚡ Quick Safety Tips for Nepal</div>
      <ul style="margin:0;padding-left:18px;font-size:12px;color:#713f12;line-height:1.8;">
        ${aqi > 150 ? "<li>Wear N95 mask when outdoors — AQI is unhealthy</li>" : ""}
        ${parseFloat(weather.rainfall || 0) > 5 ? "<li>Avoid river banks and steep slopes — landslide risk</li>" : ""}
        ${parseFloat(weather.snowfall || 0) > 0 ? "<li>Check road conditions before mountain travel</li>" : ""}
        ${(weather.windSpeed || 0) > 30 ? "<li>Secure loose objects — strong winds expected</li>" : ""}
        <li>Stay updated via WeatherNepal for real-time conditions</li>
      </ul>
    </div>

    <!-- CTA Button -->
    <div style="text-align:center;margin-bottom:8px;">
      <a href="http://localhost:5173" style="background:linear-gradient(135deg,#1d4ed8,#0284c7);color:#fff;padding:13px 32px;border-radius:25px;text-decoration:none;font-size:13px;font-weight:700;display:inline-block;">
        🌏 View Live Map
      </a>
    </div>

  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#f8fafc;border-radius:0 0 16px 16px;padding:20px 32px;text-align:center;border-top:1px solid #e2e8f0;">
    <p style="font-size:11px;color:#94a3b8;margin:0 0 6px;">
      You're receiving this because you subscribed to WeatherNepal alerts for <strong>${location}</strong>.
    </p>
    <p style="font-size:11px;color:#94a3b8;margin:0;">
      WeatherNepal · Nepal Environmental Intelligence Platform
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

// ── Send alert email ─────────────────────────────────────────────
async function sendAlertEmail({
  to,
  name,
  location,
  district,
  weather,
  aqi,
  alerts,
  advisory,
}) {
  const aqiInfo = aqiColor(aqi);
  const isDaily =
    !alerts.aqi && !alerts.rain && !alerts.wind && !alerts.snow && !alerts.temp;
  const subject = isDaily
    ? `🌅 WeatherNepal Daily Summary — ${location} — ${new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}`
    : `⚠️ WeatherNepal Alert — ${location} — AQI ${aqi} (${aqiInfo.text})`;

  const html = buildAlertEmail({
    name,
    location,
    district,
    weather,
    aqi,
    alerts,
    advisory,
  });

  await getTransporter().sendMail({
    from: `"WeatherNepal Alerts" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html,
  });

  console.log(`[Email] Sent alert to ${to} for ${location}`);
}

// ── Send test email ──────────────────────────────────────────────
async function sendTestEmail(to) {
  await sendAlertEmail({
    to,
    name: "Test User",
    location: "Kathmandu",
    district: "Kathmandu",
    weather: {
      temperature: 22,
      feelsLike: 20,
      humidity: 65,
      windSpeed: 12,
      rainfall: 0,
      snowfall: 0,
    },
    aqi: 172,
    alerts: { aqi: true, rain: false, wind: false, snow: false, temp: false },
    advisory:
      "Air quality in Kathmandu is unhealthy today. Wear an N95 mask if going outdoors. Keep windows closed to reduce indoor pollution.",
  });
}

module.exports = { sendAlertEmail, sendTestEmail };
