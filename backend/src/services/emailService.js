const nodemailer = require("nodemailer");

// ── IMPORTANT: Transporter created lazily inside function ────────
// This ensures process.env variables are loaded before use
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

function weatherEmoji(rain, snow, wind, temp) {
  if (snow > 0) return "❄️";
  if (rain > 5) return "🌧️";
  if (rain > 0) return "🌦️";
  if (wind > 40) return "💨";
  if (temp < 5) return "🥶";
  if (temp > 32) return "🔥";
  return "🌤️";
}

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
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:24px 0;">
<tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;">
  <tr><td style="background:linear-gradient(135deg,#0f172a,#1e3a8a);border-radius:16px 16px 0 0;padding:28px 32px;text-align:center;">
    <div style="font-size:28px;margin-bottom:8px;">🌏</div>
    <div style="font-size:22px;font-weight:800;color:#fff;">Weather<span style="color:#38bdf8;">Nepal</span></div>
    <div style="font-size:10px;color:rgba(255,255,255,0.5);letter-spacing:2px;text-transform:uppercase;margin-top:2px;">Live Weather Intelligence</div>
  </td></tr>
  <tr><td style="background:${aqiInfo.bg};padding:14px 32px;text-align:center;">
    <div style="font-size:13px;font-weight:800;color:#fff;text-transform:uppercase;letter-spacing:1px;">Weather Alert — ${location}, Nepal</div>
    <div style="font-size:11px;color:rgba(255,255,255,0.8);margin-top:4px;">${now} (NST)</div>
  </td></tr>
  <tr><td style="background:#ffffff;padding:28px 32px;">
    <p style="font-size:15px;color:#1e293b;margin:0 0 20px;">Hi <strong>${name}</strong>,</p>
    ${alertBadges.length > 0 ? `<div style="text-align:center;margin-bottom:24px;">${alertBadges.join("")}</div>` : ""}
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td width="50%" style="padding:4px;">
          <div style="background:#f8fafc;border-radius:12px;padding:16px;text-align:center;border:1px solid #e2e8f0;">
            <div style="font-size:28px;margin-bottom:4px;">${emoji}</div>
            <div style="font-size:24px;font-weight:800;color:#0f172a;">${weather.temperature}°C</div>
            <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Temperature</div>
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
    ${
      advisory
        ? `
    <div style="background:#eff6ff;border-radius:12px;padding:18px;border:1px solid #bfdbfe;margin-bottom:24px;">
      <div style="font-size:11px;font-weight:700;color:#1d4ed8;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">🌤️ Weather Advisory</div>
      <p style="font-size:13px;color:#334155;line-height:1.7;margin:0;">${advisory}</p>
    </div>`
        : ""
    }
    <div style="background:#fefce8;border-radius:12px;padding:16px;border:1px solid #fde047;margin-bottom:24px;">
      <div style="font-size:12px;font-weight:700;color:#854d0e;margin-bottom:8px;">⚡ Safety Tips</div>
      <ul style="margin:0;padding-left:18px;font-size:12px;color:#713f12;line-height:1.8;">
        ${aqi > 150 ? "<li>Wear N95 mask when outdoors</li>" : ""}
        ${parseFloat(weather.rainfall || 0) > 5 ? "<li>Avoid river banks — landslide risk</li>" : ""}
        ${parseFloat(weather.snowfall || 0) > 0 ? "<li>Check road conditions before mountain travel</li>" : ""}
        <li>Stay updated via WeatherNepal for real-time conditions</li>
      </ul>
    </div>
    <div style="text-align:center;margin-bottom:8px;">
      <a href="http://localhost:5173" style="background:linear-gradient(135deg,#1d4ed8,#0284c7);color:#fff;padding:13px 32px;border-radius:25px;text-decoration:none;font-size:13px;font-weight:700;display:inline-block;">🌏 View Live Map</a>
    </div>
  </td></tr>
  <tr><td style="background:#f8fafc;border-radius:0 0 16px 16px;padding:20px 32px;text-align:center;border-top:1px solid #e2e8f0;">
    <p style="font-size:11px;color:#94a3b8;margin:0 0 6px;">You are receiving this because you subscribed to WeatherNepal alerts for <strong>${location}</strong>.</p>
    <p style="font-size:11px;color:#94a3b8;margin:0;">WeatherNepal - Nepal Environmental Intelligence Platform</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

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
    alerts: { aqi: true },
    advisory:
      "Air quality in Kathmandu is unhealthy today. Wear an N95 mask if going outdoors.",
  });
}

async function sendConfirmationEmail({ to, name, location, alerts }) {
  const selected = [];
  if (alerts?.aqi) selected.push("AQI (Unhealthy air)");
  if (alerts?.rain) selected.push("Heavy rain");
  if (alerts?.wind) selected.push("Strong wind");
  if (alerts?.snow) selected.push("Snowfall");
  if (alerts?.temp) selected.push("Freezing temperature");
  if (alerts?.daily) selected.push("Daily summary");

  const alertList = selected.length
    ? selected.map((item) => `<li>${item}</li>`).join("")
    : "<li>No alert types selected</li>";

  const html = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
  <tr><td style="background:linear-gradient(135deg,#0f172a,#1e3a8a);border-radius:16px 16px 0 0;padding:24px 28px;text-align:center;">
    <div style="font-size:24px;color:#fff;font-weight:800;">WeatherNepal</div>
    <div style="font-size:12px;color:rgba(255,255,255,0.8);margin-top:6px;">Subscription Confirmed</div>
  </td></tr>
  <tr><td style="background:#fff;border-radius:0 0 16px 16px;padding:24px 28px;">
    <p style="font-size:15px;color:#0f172a;margin:0 0 12px;">Hi <strong>${name || "there"}</strong>,</p>
    <p style="font-size:14px;color:#334155;line-height:1.6;margin:0 0 14px;">
      Your WeatherNepal alert subscription is now active for <strong>${location}</strong>.
    </p>
    <p style="font-size:13px;color:#475569;margin:0 0 8px;">Selected alerts:</p>
    <ul style="font-size:13px;color:#1e293b;line-height:1.7;margin:0 0 16px;padding-left:18px;">${alertList}</ul>
    <p style="font-size:12px;color:#64748b;margin:0;">You will receive emails when selected conditions are triggered.</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  await getTransporter().sendMail({
    from: `"WeatherNepal Alerts" <${process.env.GMAIL_USER}>`,
    to,
    subject: `WeatherNepal subscription confirmed - ${location}`,
    html,
  });

  console.log(
    `[Email] Sent subscription confirmation to ${to} for ${location}`,
  );
}

module.exports = { sendAlertEmail, sendTestEmail, sendConfirmationEmail };
