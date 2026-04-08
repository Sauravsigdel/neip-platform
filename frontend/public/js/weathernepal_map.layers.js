// ══════════════════════════════════════════
// ⚙️ CONFIG — paste your API keys here
// ══════════════════════════════════════════
const DEV_FRONTEND_PORTS = new Set(["3000", "4173", "5173", "5174", "5175"]);
const DEFAULT_API_BASE = DEV_FRONTEND_PORTS.has(window.location.port)
  ? `${window.location.protocol}//${window.location.hostname}:5000/api`
  : `${window.location.origin}/api`;
const CFG = {
  OWM: "", // key removed — tiles now proxied through backend
  API: window.WEATHER_NEPAL_CFG?.API || DEFAULT_API_BASE,
};

// ══════════════════════════════════════════
// AQI HELPERS
// ══════════════════════════════════════════
const LEVELS = [
  {
    max: 50,
    c: "#22c55e",
    bg: "rgba(34,197,94,0.15)",
    lbl: "Good",
    adv: "Air quality is satisfactory. Safe for all outdoor activities.",
  },
  {
    max: 100,
    c: "#eab308",
    bg: "rgba(234,179,8,0.15)",
    lbl: "Moderate",
    adv: "Acceptable for most people. Unusually sensitive individuals should limit prolonged outdoor exertion.",
  },
  {
    max: 150,
    c: "#f97316",
    bg: "rgba(249,115,22,0.15)",
    lbl: "Unhealthy (Sens.)",
    adv: "Sensitive groups may experience effects. Wear a mask if you have respiratory issues.",
  },
  {
    max: 200,
    c: "#ef4444",
    bg: "rgba(239,68,68,0.15)",
    lbl: "Unhealthy",
    adv: "Everyone may experience health effects. Wear N95 mask outdoors. Limit time outside.",
  },
  {
    max: 300,
    c: "#a855f7",
    bg: "rgba(168,85,247,0.15)",
    lbl: "Very Unhealthy",
    adv: "Health alert. Avoid all outdoor activity. Keep windows closed.",
  },
  {
    max: 500,
    c: "#7f1d1d",
    bg: "rgba(127,29,29,0.15)",
    lbl: "Hazardous",
    adv: "Emergency conditions. Stay indoors. Seal windows and doors.",
  },
];
const HERO_GRADS = {
  Good: "linear-gradient(135deg,#14532d,#15803d)",
  Moderate: "linear-gradient(135deg,#713f12,#b45309)",
  "Unhealthy (Sens.)": "linear-gradient(135deg,#7c2d12,#c2410c)",
  Unhealthy: "linear-gradient(135deg,#7f1d1d,#b91c1c)",
  "Very Unhealthy": "linear-gradient(135deg,#4a1d96,#7e22ce)",
  Hazardous: "linear-gradient(135deg,#1c1917,#450a0a)",
  "AQI Unavailable": "linear-gradient(135deg,#334155,#475569)",
};
function gl(a) {
  return LEVELS.find((l) => a <= l.max) || LEVELS[5];
}
function hasValidAqiValue(aqi) {
  return Number.isFinite(aqi) && aqi > 0;
}
function getCityAqiOrNull(city) {
  return hasValidAqiValue(city?.aqi) ? city.aqi : null;
}
function getVisualAqi(city) {
  return getCityAqiOrNull(city) ?? 0;
}
function p2a(v) {
  const B = [
    [0, 12, 0, 50],
    [12.1, 35.4, 51, 100],
    [35.5, 55.4, 101, 150],
    [55.5, 150.4, 151, 200],
    [150.5, 250.4, 201, 300],
    [250.5, 350.4, 301, 400],
  ];
  const t = Math.floor(v * 10) / 10;
  for (const [cl, ch, il, ih] of B)
    if (t >= cl && t <= ch)
      return Math.round(((ih - il) / (ch - cl)) * (t - cl) + il);
  return 500;
}

// ══════════════════════════════════════════
// SIMULATION
// ══════════════════════════════════════════
function rng(seed) {
  let s = (seed * 9301 + 49297) % 233280;
  return s / 233280;
}
function simAQI(zone, i) {
  const m = new Date().getMonth();
  const w = m >= 10 || m <= 1 ? 1.42 : m >= 3 && m <= 5 ? 1.16 : 1.0;
  const r = rng(i * 7919 + 42);
  const base =
    {
      valley: 62 + r * 68,
      terai: 28 + r * 52,
      hill: 10 + r * 26,
      rural: 7 + r * 18,
      mountain: 4 + r * 13,
    }[zone] || 18;
  const pm = base * w;
  return {
    aqi: Math.round(p2a(pm)),
    pm25: +pm.toFixed(1),
    pm10: +(pm * (1.45 + r * 0.5)).toFixed(1),
    pm1: +(pm * 0.6).toFixed(1),
  };
}
function simWX(zone, lat, i) {
  const m = new Date().getMonth();
  const isW = m >= 11 || m <= 1,
    isS = m >= 5 && m <= 8,
    isMon = m >= 6 && m <= 9;
  const r = rng(i * 1664525 + 1),
    r2 = rng(i * 22695477 + 2);
  const base =
    {
      valley: 22,
      terai: 27,
      hill: 17,
      rural: 14,
      mountain: -2 + (lat - 27) * 1.4,
    }[zone] || 19;
  const temp = Math.round(base + (isS ? 6 : isW ? -9 : 0) + (r - 0.5) * 6);
  const snow =
    zone === "mountain" && (isW || m === 9 || m === 10)
      ? (r * 9).toFixed(1)
      : "0";
  const rain = isMon
    ? (r * 13).toFixed(1)
    : isS
      ? (r * 4).toFixed(1)
      : (r * 0.8).toFixed(1);
  const WI = ["☀️", "⛅", "🌤️", "🌥️", "🌦️", "🌧️", "🌨️", "⛈️"];
  const CN = [
    "Clear",
    "Partly Cloudy",
    "Mostly Clear",
    "Overcast",
    "Light Rain",
    "Heavy Rain",
    "Snow",
    "Thunderstorm",
  ];
  const wi = isMon
    ? 4 + Math.floor(r2 * 3)
    : isW && zone === "mountain"
      ? 6
      : Math.floor(r2 * 4);
  return {
    temp,
    feelsLike: temp - Math.round(r * 4),
    humidity: Math.round((isMon ? 76 : isW ? 34 : 54) + r * 21),
    wind: Math.round(4 + r * 24),
    windDir: ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.floor(r2 * 8)],
    cloud: Math.round(r * 100),
    rain,
    snow,
    visibility: Math.round(4 + r * 24),
    pressure: Math.round(1013 - (zone === "mountain" ? 145 : 0) - r * 18),
    uv: Math.round(1 + r * 10),
    icon: WI[wi] || "⛅",
    cond: CN[wi] || "Clear",
  };
}
function gen24(temp, i) {
  return Array.from({ length: 24 }, (_, h) => ({
    h: `${h}:00`,
    t:
      temp +
      Math.round(
        Math.sin(((h - 6) * Math.PI) / 12) * 5 + (rng(i + h * 17) - 0.5) * 3,
      ),
  }));
}
function gen7(aqi, temp, i) {
  const DN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const IC = ["☀️", "⛅", "🌤️", "🌥️", "🌦️", "🌧️"];
  return Array.from({ length: 7 }, (_, d) => {
    const r = rng(i + d * 13);
    const a = Math.max(5, Math.round(aqi + (r - 0.5) * 48));
    const hi = temp + Math.round((r - 0.3) * 7);
    return {
      day: d === 0 ? "Today" : DN[(new Date().getDay() + d) % 7],
      icon: IC[Math.floor(r * IC.length)],
      hi,
      lo: hi - Math.round(5 + r * 7),
      aqi: a,
    };
  });
}

// ══════════════════════════════════════════
// 77 DISTRICT DATA
// ══════════════════════════════════════════
const { RAW, PROVINCE_OF, PROVINCE_NAMES, PROVINCE_COLORS } =
  window.WEATHER_NEPAL_MAP_DATA || {
    RAW: [],
    PROVINCE_OF: {},
    PROVINCE_NAMES: {},
    PROVINCE_COLORS: {},
  };
let activeProvince = 0;
const seen = new Set();
const CITIES = RAW.filter((c) => {
  const k = c.city + c.d;
  if (seen.has(k)) return false;
  seen.add(k);
  return true;
}).map((c, i) => {
  // Start with AQI unavailable and fill from internal AQI endpoint.
  const aqSeed = simAQI(c.zone, i);
  const wx = simWX(c.zone, c.lat, i);
  const prov = PROVINCE_OF[c.d] || 0;
  return {
    ...c,
    aqi: null,
    pm25: null,
    pm10: null,
    pm1: null,
    co: null,
    o3: null,
    wx,
    h24: gen24(wx.temp, i),
    fc7: gen7(aqSeed.aqi, wx.temp, i),
    realData: false,
    hasAqi: false,
    aqiSource: "internal-pending",
    province: prov,
  };
});

// ── REAL DATA FETCH SYSTEM ──────────────────────────────────────
const OPEN_METEO = "https://api.open-meteo.com/v1/forecast";
const WEATHER_CACHE_TTL_MS = 10 * 60 * 1000;
const WEATHER_BACKOFF_MS = 3 * 60 * 1000;
let weatherBackoffUntil = 0;
const weatherCache = new Map();

// WMO code → condition string
function wmoToStr(code) {
  const m = {
    0: "Clear",
    1: "Mainly Clear",
    2: "Partly Cloudy",
    3: "Overcast",
    45: "Foggy",
    51: "Light Drizzle",
    61: "Light Rain",
    63: "Rain",
    65: "Heavy Rain",
    71: "Light Snow",
    73: "Snow",
    75: "Heavy Snow",
    80: "Rain Showers",
    95: "Thunderstorm",
  };
  const i = {
    0: "☀️",
    1: "🌤️",
    2: "⛅",
    3: "☁️",
    45: "🌫️",
    51: "🌦️",
    61: "🌧️",
    63: "🌧️",
    65: "🌧️",
    71: "🌨️",
    73: "🌨️",
    75: "❄️",
    80: "🌦️",
    95: "⛈️",
  };
  return { cond: m[code] || "Clear", icon: i[code] || "⛅" };
}

// Fetch real weather for one city from Open-Meteo
async function fetchRealWeather(city) {
  try {
    const cacheKey = `${city.lat},${city.lon}`;
    const cached = weatherCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < WEATHER_CACHE_TTL_MS) {
      return cached.data;
    }
    if (Date.now() < weatherBackoffUntil) {
      return cached?.data || null;
    }

    const r = await fetch(
      `${OPEN_METEO}?latitude=${city.lat}&longitude=${city.lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,snowfall,wind_speed_10m,wind_direction_10m,cloud_cover,surface_pressure,uv_index,weather_code,visibility&hourly=temperature_2m,precipitation_probability,precipitation,snowfall,uv_index&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,snowfall_sum,wind_speed_10m_max,uv_index_max,weather_code&timezone=Asia%2FKathmandu&forecast_days=7`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (r.status === 429) {
      weatherBackoffUntil = Math.max(
        weatherBackoffUntil,
        Date.now() + WEATHER_BACKOFF_MS,
      );
      return cached?.data || null;
    }
    if (!r.ok) return null;
    const d = await r.json();
    const c = d.current;
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
    const windDir = dirs[Math.round((c.wind_direction_10m || 0) / 22.5) % 16];
    const wmo = wmoToStr(c.weather_code);
    const wx = {
      temp: Math.round(c.temperature_2m),
      feelsLike: Math.round(c.apparent_temperature),
      humidity: c.relative_humidity_2m,
      wind: Math.round(c.wind_speed_10m),
      windDir,
      rain: (c.precipitation || 0).toFixed(1),
      snow: (c.snowfall || 0).toFixed(1),
      cloud: c.cloud_cover,
      pressure: Math.round(c.surface_pressure),
      uv: c.uv_index || 0,
      visibility: c.visibility ? Math.round(c.visibility / 1000) : 10,
      cond: wmo.cond,
      icon: wmo.icon,
      h24: d.hourly
        ? d.hourly.time.slice(0, 24).map((t, i) => ({
            h: t.slice(11, 16),
            t: d.hourly.temperature_2m[i],
          }))
        : [],
      fc7: d.daily
        ? d.daily.time.map((t, i) => {
            const wmo7 = wmoToStr(d.daily.weather_code[i]);
            return {
              day:
                i === 0
                  ? "Today"
                  : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][
                      new Date(t).getDay()
                    ],
              icon: wmo7.icon,
              hi: Math.round(d.daily.temperature_2m_max[i]),
              lo: Math.round(d.daily.temperature_2m_min[i]),
              aqi: null,
            };
          })
        : [],
    };
    weatherCache.set(cacheKey, { data: wx, ts: Date.now() });
    return wx;
  } catch (e) {
    return null;
  }
}

// Update one city with real data
function applyRealData(idx, wx) {
  if (!wx) return;
  const c = CITIES[idx];
  c.wx = { ...c.wx, ...wx };
  c.h24 = wx.h24.length ? wx.h24 : c.h24;
  c.fc7 = wx.fc7.length ? wx.fc7.map((f) => ({ ...f, aqi: null })) : c.fc7;
  c.realData = true;
}

// Rebuild heatmap layers with current CITIES data
function rebuildHeatLayers() {
  const layers = [
    [
      aqiH,
      () =>
        hPtsF(
          (c) => getVisualAqi(c) / 300,
          -1,
          (c) => hasValidAqiValue(c.aqi),
        ),
    ],
    [tmpH, () => hPts((c) => Math.max(0, (c.wx.temp + 10) / 50))],
    [wnH, () => hPtsF((c) => c.wx.wind / 50, 0.06)],
    [
      rnH,
      () =>
        hPtsF(
          (c) => parseFloat(c.wx.rain || 0) / RAIN_HEAT_SCALE_MM,
          RAIN_DETECTION_MM / RAIN_HEAT_SCALE_MM,
          (c) => c.realData === true,
        ),
    ],
    [snH, () => hPtsF((c) => parseFloat(c.wx.snow) / 10, 0)],
    [uvH, () => hPts((c) => c.wx.uv / 11)],
  ];
  layers.forEach(([layer, getFn]) => {
    if (!layer) return;
    const def = LAYER_DEFS.find((l) => l.lyr === layer);
    const wasOn = def?.on && map.hasLayer(layer);
    if (wasOn) map.removeLayer(layer);
    const pts = getFn();
    if (pts.length > 0) layer.setLatLngs(pts);
    if (wasOn && pts.length > 0) layer.addTo(map);
  });
  allMarkers.forEach((m, i) => {
    if (CITIES[i]) m.setIcon(mkPin(CITIES[i].aqi));
  });
  refreshEventPins();
  renderTempPins();
  updateStats();
}

// Fetch real data in batches of 10 to avoid rate limiting
async function loadRealData() {
  const BATCH = 3;
  for (let i = 0; i < CITIES.length; i += BATCH) {
    if (Date.now() < weatherBackoffUntil) break;
    const batch = CITIES.slice(i, i + BATCH);
    for (let j = 0; j < batch.length; j++) {
      if (Date.now() < weatherBackoffUntil) break;
      const wx = await fetchRealWeather(batch[j]);
      applyRealData(i + j, wx);
      await new Promise((r) => setTimeout(r, 250));
    }
    // Small delay between batches
    if (i + BATCH < CITIES.length) await new Promise((r) => setTimeout(r, 900));
  }
  rebuildHeatLayers();
}

// Shared layer state used by news feed and fire overlay logic.
let fireMarkers = [];

// ══════════════════════════════════════════
// HEADER STATS
// ══════════════════════════════════════════
function updateStats() {
  const scoped =
    activeProvince === 0
      ? CITIES
      : CITIES.filter((c) => c.province === activeProvince);
  const aqis = scoped.map((c) => getCityAqiOrNull(c)).filter((a) => a !== null);
  const avg = aqis.length
    ? Math.round(aqis.reduce((a, b) => a + b, 0) / aqis.length)
    : null;
  const avgT = Math.round(
    scoped.reduce((a, c) => a + c.wx.temp, 0) / Math.max(1, scoped.length),
  );
  const raining = scoped.filter(
    (c) =>
      c.realData === true && parseFloat(c.wx.rain || 0) >= RAIN_DETECTION_MM,
  ).length;
  const snowing = scoped.filter((c) => parseFloat(c.wx.snow) > 0).length;
  document.getElementById("sbAvgAqi").textContent = avg === null ? "—" : avg;
  document.getElementById("sbAvgAqi").style.color =
    avg === null ? "#94a3b8" : gl(avg).c;
  document.getElementById("sbAvgTemp").textContent = avgT + "°C";
  document.getElementById("sbRaining").textContent = String(raining);
  document.getElementById("sbGood").textContent = aqis.filter(
    (a) => a <= 50,
  ).length;
  document.getElementById("sbMod").textContent = aqis.filter(
    (a) => a > 50 && a <= 100,
  ).length;
  document.getElementById("sbSens").textContent = aqis.filter(
    (a) => a > 100 && a <= 150,
  ).length;
  document.getElementById("sbUnh").textContent = aqis.filter(
    (a) => a > 150 && a <= 200,
  ).length;
  document.getElementById("sbSnow").textContent = snowing;
  const now = new Date();
  document.getElementById("sbUpd").textContent = now.toLocaleTimeString(
    "en-US",
    { hour: "2-digit", minute: "2-digit" },
  );
  requestNewsFeed(scoped);
}

var fireHotspotCount = 0;
var fireHotspotLastFetch = 0;
var tickerItems = [];
var tickerIndex = 0;
var tickerTimer = null;
var newsFromBackendLoaded = false;
var syncDebugState = {
  rainyCities: 0,
  snowyCities: 0,
  windyCities: 0,
  highAqiCities: 0,
};

function updateSyncDebug(scopedCities, rainingCount) {
  // Sync debug panel removed from UI.
}

function requestNewsFeed(sourceCities) {
  if (newsFromBackendLoaded) {
    if (tickerItems.length) rotateTicker(tickerItems);
    return;
  }

  if (newsLoadPromise) return newsLoadPromise;

  newsLoadPromise = loadLiveNewsFromBackend()
    .then((loaded) => {
      if (!loaded) updateNewsFeed(sourceCities);
      return loaded;
    })
    .catch(() => {
      updateNewsFeed(sourceCities);
      return false;
    })
    .finally(() => {
      newsLoadPromise = null;
    });

  return newsLoadPromise;
}

// Run initial stats only after syncDebugState is initialized.
updateStats();
requestNewsFeed(CITIES);

async function refreshFireHotspotCount(force = false) {
  if (!force && Date.now() - fireHotspotLastFetch < 120000) return;
  fireHotspotLastFetch = Date.now();
  try {
    const res = await fetch(`${CFG.API}/fire/hotspots`);
    if (!res.ok) return;
    const data = await res.json();
    fireHotspotCount = Array.isArray(data?.hotspots) ? data.hotspots.length : 0;
  } catch {
    // Keep previous count on fetch failure.
  }
}

function rotateTicker(items) {
  const el = document.getElementById("hdrTickerMsg");
  if (!el || !items.length) return;
  tickerItems = items;
  tickerIndex = tickerIndex % tickerItems.length;
  el.textContent = tickerItems[tickerIndex];
  if (tickerTimer) clearInterval(tickerTimer);
  tickerTimer = setInterval(() => {
    tickerIndex = (tickerIndex + 1) % tickerItems.length;
    el.classList.remove("slide-in", "slide-out");
    void el.offsetWidth;
    el.classList.add("slide-out");
    setTimeout(() => {
      el.textContent = tickerItems[tickerIndex];
      el.classList.remove("slide-out");
      el.classList.add("slide-in");
      setTimeout(() => el.classList.remove("slide-in"), 320);
    }, 210);
  }, 30000);
}

function updateNewsFeed(sourceCities) {
  if (newsFromBackendLoaded) {
    if (tickerItems.length) rotateTicker(tickerItems);
    return;
  }
  const cities = sourceCities?.length ? sourceCities : CITIES;
  const feed = [];
  refreshFireHotspotCount();

  const highAQICities = cities
    .filter((c) => hasValidAqiValue(c.aqi) && c.aqi >= 150)
    .sort((a, b) => b.aqi - a.aqi);
  highAQICities
    .slice(0, 2)
    .forEach((c) => feed.push(`😷 High AQI for ${c.city}: ${c.aqi}`));

  const rainyCities = cities.filter(
    (c) =>
      c.realData === true && parseFloat(c.wx.rain || 0) >= RAIN_DETECTION_MM,
  );
  const snowyCities = cities.filter((c) => parseFloat(c.wx.snow || 0) > 0);
  const windyCities = cities.filter((c) => parseFloat(c.wx.wind || 0) > 15);
  syncDebugState = {
    rainyCities: rainyCities.length,
    snowyCities: snowyCities.length,
    windyCities: windyCities.length,
    highAqiCities: highAQICities.length,
  };

  if (rainyCities.length > 0) {
    const heaviestRain = rainyCities
      .slice()
      .sort(
        (a, b) => parseFloat(b.wx.rain || 0) - parseFloat(a.wx.rain || 0),
      )[0];
    feed.push(
      `🌧️ Rainfall in ${rainyCities.length} districts. Highest near ${heaviestRain.city} (${heaviestRain.wx.rain} mm)`,
    );
  }

  if (snowyCities.length > 0) {
    const heaviestSnow = snowyCities
      .slice()
      .sort(
        (a, b) => parseFloat(b.wx.snow || 0) - parseFloat(a.wx.snow || 0),
      )[0];
    feed.push(
      `❄️ Snowfall in ${snowyCities.length} districts. Highest near ${heaviestSnow.city} (${heaviestSnow.wx.snow} cm)`,
    );
  }

  windyCities
    .slice()
    .sort((a, b) => parseFloat(b.wx.wind || 0) - parseFloat(a.wx.wind || 0))
    .slice(0, 2)
    .forEach((c) => {
      const kmh = Math.round(parseFloat(c.wx.wind || 0) * 3.6);
      feed.push(`💨 High Wind in ${c.city}: ${kmh} km/h`);
    });

  if (fireHotspotCount > 0) {
    feed.push(
      `🔥 ${fireHotspotCount} active fire hotspots detected by satellite feed`,
    );
  } else if (fireMarkers && fireMarkers.length > 0) {
    feed.push(`🔥 Active fire hotspots detected near monitored cities`);
  }

  if (!feed.length) {
    feed.push(
      activeProvince === 0
        ? "✅ No critical alerts right now across Nepal."
        : `✅ No critical alerts right now in ${PROVINCE_NAMES[activeProvince]}.`,
    );
  }

  rotateTicker(feed);
}

async function loadLiveNewsFromBackend() {
  try {
    const res = await fetch(`${CFG.API}/map/live-news`);
    if (!res.ok) return false;
    const data = await res.json();
    if (!data?.success || !Array.isArray(data.data) || !data.data.length) {
      return false;
    }
    const decorated = data.data.map((line) => {
      if (/AQI/i.test(line)) return `😷 ${line}`;
      if (/rain/i.test(line)) return `🌧️ ${line}`;
      if (/snow/i.test(line)) return `❄️ ${line}`;
      if (/wind/i.test(line)) return `💨 ${line}`;
      if (/fire|hotspot/i.test(line)) return `🔥 ${line}`;
      return `📰 ${line}`;
    });
    newsFromBackendLoaded = true;
    rotateTicker(decorated);
    return true;
  } catch (_) {
    // Fallback remains local computation if backend news is unavailable.
    return false;
  }
}

// ══════════════════════════════════════════
// MAP
// ══════════════════════════════════════════
const REGION_BOUNDS = [
  [5.0, 60.0],
  [55.0, 150.0],
];
const NEPAL_BOUNDS = [
  [26.2, 80.0],
  [30.6, 88.3],
];

const map = L.map("wnMap", {
  zoomControl: true,
  minZoom: 4,
  maxZoom: 11,
  preferCanvas: true,
  maxBounds: REGION_BOUNDS,
  maxBoundsViscosity: 1.0,
});
const darkTile = L.tileLayer(
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  { attribution: "© CARTO © OpenStreetMap", maxZoom: 19, noWrap: true },
);
const lightTile = L.tileLayer(
  "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
  { attribution: "© CARTO © OpenStreetMap", maxZoom: 19, noWrap: true },
);
const fallbackTile = L.tileLayer(
  "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  {
    attribution: "© OpenStreetMap contributors",
    maxZoom: 19,
    noWrap: true,
  },
);

let usingFallbackTile = false;
function ensureFallbackTiles() {
  if (usingFallbackTile) return;
  usingFallbackTile = true;
  if (map.hasLayer(darkTile)) map.removeLayer(darkTile);
  if (map.hasLayer(lightTile)) map.removeLayer(lightTile);
  if (!map.hasLayer(fallbackTile)) fallbackTile.addTo(map);
}

darkTile.on("tileerror", ensureFallbackTiles);
lightTile.on("tileerror", ensureFallbackTiles);

fallbackTile.addTo(map);
usingFallbackTile = true;
darkTile.addTo(map);
map.fitBounds(NEPAL_BOUNDS);
setTimeout(() => map.invalidateSize(), 80);

// ══════════════════════════════════════════
// WEATHER LAYERS
// ══════════════════════════════════════════
// OWM tile layers
function owm(l) {
  const isLight = document.body.classList.contains("light");
  let lightOpacity = 0.9;
  if (l === "clouds_new") lightOpacity = 1.0;
  if (l === "wind_new") lightOpacity = 1.0;
  return L.tileLayer(
    `${CFG.API.replace("/api", "")}/api/owm-tile/${l}/{z}/{x}/{y}.png`,
    {
      opacity: isLight ? lightOpacity : 0.7,
      maxZoom: 19,
      attribution: "© OWM",
      className: `owm-tile owm-${l}`,
    },
  );
}

// Local heatmap layers — built from CITIES data after map is ready
const mkHeat = (pts, grad, opts = {}) =>
  L.heatLayer(pts, {
    radius: opts.radius || 48,
    blur: opts.blur || 32,
    maxZoom: 10,
    gradient: grad,
    minOpacity: opts.minOpacity || 0.4,
  });

// ── HEATMAP HELPERS ─────────────────────────────────────────────
function hPts(fn) {
  return CITIES.map((c) => {
    const v = fn(c);
    return [c.lat, c.lon, isNaN(v) ? 0 : Math.max(0, Math.min(1, v))];
  });
}
function hPtsF(fn, min, predicate) {
  return CITIES.filter(
    (c) => (!predicate || predicate(c)) && (fn(c) || 0) > min,
  ).map((c) => [c.lat, c.lon, Math.min(1, fn(c) || 0)]);
}
const RAIN_DETECTION_MM = 0.8;
const RAIN_HEAT_SCALE_MM = 20;
const HO = { radius: 34, blur: 26, minOpacity: 0.55 }; // tight — prevents cross-country bleed
const HOS = { radius: 42, blur: 30, minOpacity: 0.45 }; // sparse data

// AQI — all cities
const aqiH = mkHeat(
  hPtsF(
    (c) => getVisualAqi(c) / 300,
    -1,
    (c) => hasValidAqiValue(c.aqi),
  ),
  {
    0.0: "#22c55e",
    0.2: "#86efac",
    0.4: "#eab308",
    0.6: "#f97316",
    0.8: "#ef4444",
    1.0: "#7f1d1d",
  },
  HO,
);
// Temperature — -10°C to 40°C
const tmpH = mkHeat(
  hPts((c) => Math.max(0, (c.wx.temp + 10) / 50)),
  {
    0.0: "#1e40af",
    0.3: "#38bdf8",
    0.5: "#22c55e",
    0.75: "#f97316",
    1.0: "#7f1d1d",
  },
  HO,
);
// Wind — only where wind > 3 km/h
const wnH = mkHeat(
  hPtsF((c) => c.wx.wind / 50, 0.06),
  { 0.0: "#bfdbfe", 0.4: "#3b82f6", 0.8: "#1e3a8a", 1.0: "#0f172a" },
  HO,
);
// Rainfall — measurable rain only (>= RAIN_DETECTION_MM)
const rnH = mkHeat(
  hPtsF(
    (c) => parseFloat(c.wx.rain || 0) / RAIN_HEAT_SCALE_MM,
    RAIN_DETECTION_MM / RAIN_HEAT_SCALE_MM,
    (c) => c.realData === true,
  ),
  { 0.0: "#bfdbfe", 0.4: "#38bdf8", 0.7: "#0284c7", 1.0: "#1e3a8a" },
  { radius: 24, blur: 14, minOpacity: 0.62 },
);
// Snowfall — only cities with actual snow > 0 (mountain only)
const snH = mkHeat(
  hPtsF((c) => parseFloat(c.wx.snow) / 10, 0),
  { 0.0: "#bae6fd", 0.5: "#e0f2fe", 1.0: "#ffffff" },
  { radius: 36, blur: 22, minOpacity: 0.55 },
);
// UV Index — all cities 0-11
const uvH = mkHeat(
  hPts((c) => c.wx.uv / 11),
  {
    0.0: "#22c55e",
    0.3: "#a3e635",
    0.5: "#eab308",
    0.75: "#f97316",
    1.0: "#7f1d1d",
  },
  HO,
);
// Pressure — 870-1030 hPa range
const prH = mkHeat(
  hPts((c) => Math.max(0, (c.wx.pressure - 870) / 160)),
  { 0.0: "#1e3a8a", 0.4: "#38bdf8", 0.7: "#a7f3d0", 1.0: "#fef9c3" },
  HO,
);

// ── WIND PARTICLES (leaflet-velocity + Open-Meteo) ──────────────
const VELOCITY_ASIA_BOUNDS = {
  LA1: 55.0,
  LA2: 5.0,
  LO1: 60.0,
  LO2: 150.0,
};
const VELOCITY_MODES = {
  low: { NY: 6, NX: 9, batchSize: 6 },
  high: { NY: 8, NX: 12, batchSize: 8 },
};
const VELOCITY_CACHE_TTL_MS = 10 * 60 * 1000;
const VELOCITY_FETCH_DELAY_MS = 220;
const VELOCITY_BACKOFF_MS = 3 * 60 * 1000;
const velocityDatasetCache = new Map();
let velocityQualityMode = null;
let velocityQualityRefreshTimer = null;
let velocityLoadSeq = 0;
let velocityBackoffUntil = 0;

function getVelocityModeForZoom() {
  return map.getZoom() >= 6 ? "high" : "low";
}

function scheduleVelocityQualityRefresh() {
  const def = LAYER_DEFS.find((x) => x.id === "velocity");
  if (!def?.on) return;
  if (velocityQualityRefreshTimer) {
    clearTimeout(velocityQualityRefreshTimer);
  }
  velocityQualityRefreshTimer = setTimeout(() => {
    const nextMode = getVelocityModeForZoom();
    if (nextMode !== velocityQualityMode) {
      loadVelocityLayer();
    }
  }, 180);
}

function buildVelocityDatasetFromCities({ LA1, LA2, LO1, LO2, NY, NX }) {
  const DY = (LA1 - LA2) / (NY - 1);
  const DX = (LO2 - LO1) / (NX - 1);
  const header = {
    parameterCategory: 2,
    la1: LA1,
    la2: LA2,
    lo1: LO1,
    lo2: LO2,
    nx: NX,
    ny: NY,
    dx: DX,
    dy: DY,
    refTime: new Date().toISOString(),
  };

  const dirDeg = {
    N: 0,
    NNE: 22.5,
    NE: 45,
    ENE: 67.5,
    E: 90,
    ESE: 112.5,
    SE: 135,
    SSE: 157.5,
    S: 180,
    SSW: 202.5,
    SW: 225,
    WSW: 247.5,
    W: 270,
    WNW: 292.5,
    NW: 315,
    NNW: 337.5,
  };

  const uData = [];
  const vData = [];

  for (let r = 0; r < NY; r++) {
    const lat = LA1 - r * DY;
    for (let c = 0; c < NX; c++) {
      const lon = LO1 + c * DX;

      let sumU = 0;
      let sumV = 0;
      let sumW = 0;

      for (const city of CITIES) {
        const speedKmh = city?.wx?.wind;
        const wd = city?.wx?.windDir;
        if (!Number.isFinite(speedKmh) || !wd) continue;

        const deg = dirDeg[wd] ?? 0;
        const rad = (deg * Math.PI) / 180;
        const speed = speedKmh / 3.6;
        const u = -speed * Math.sin(rad);
        const v = -speed * Math.cos(rad);

        const dLat = lat - city.lat;
        const dLon = lon - city.lon;
        const w = 1 / (dLat * dLat + dLon * dLon + 0.2);

        sumU += u * w;
        sumV += v * w;
        sumW += w;
      }

      uData.push(sumW ? sumU / sumW : 0);
      vData.push(sumW ? sumV / sumW : 0);
    }
  }

  return [
    { header: { ...header, parameterNumber: 2 }, data: uData },
    { header: { ...header, parameterNumber: 3 }, data: vData },
  ];
}

async function loadVelocityLayer() {
  const def = LAYER_DEFS.find((x) => x.id === "velocity");
  if (!def) return;
  const loadSeq = ++velocityLoadSeq;
  const previousLayer = def.lyr || null;
  try {
    // Full Asia coverage in both modes; only density changes with zoom.
    const mode = getVelocityModeForZoom();
    velocityQualityMode = mode;
    const modeCfg = VELOCITY_MODES[mode];
    const { LA1, LA2, LO1, LO2 } = VELOCITY_ASIA_BOUNDS;
    const { NY, NX, batchSize } = modeCfg;
    const DY = (LA1 - LA2) / (NY - 1);
    const DX = (LO2 - LO1) / (NX - 1);
    const lats = Array.from({ length: NY }, (_, r) => LA1 - r * DY);
    const lons = Array.from({ length: NX }, (_, c) => LO1 + c * DX);

    // Reuse recent data to avoid heavy API traffic when users toggle layers.
    const cached = velocityDatasetCache.get(mode);
    let dataset = cached?.dataset || null;
    const cacheAge = cached ? Date.now() - cached.ts : Infinity;

    const canFetchRemote = Date.now() >= velocityBackoffUntil;
    if ((!dataset || cacheAge > VELOCITY_CACHE_TTL_MS) && canFetchRemote) {
      const points = lats.flatMap((lat) => lons.map((lon) => ({ lat, lon })));

      // Batch requests so browser/API isn't flooded at Asia scale.
      const results = [];
      for (let i = 0; i < points.length; i += batchSize) {
        if (Date.now() < velocityBackoffUntil) {
          break;
        }
        const batch = points.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(({ lat, lon }) =>
            fetch(
              `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(3)}&longitude=${lon.toFixed(3)}&current=wind_speed_10m,wind_direction_10m`,
            )
              .then((r) => {
                if (r.status === 429) {
                  velocityBackoffUntil = Math.max(
                    velocityBackoffUntil,
                    Date.now() + VELOCITY_BACKOFF_MS,
                  );
                  return null;
                }
                return r.ok ? r.json() : null;
              })
              .catch(() => null),
          ),
        );
        results.push(...batchResults);
        // Light pacing prevents temporary API throttling on browser clients.
        if (i + batchSize < points.length) {
          await new Promise((r) => setTimeout(r, VELOCITY_FETCH_DELAY_MS));
        }
      }

      // Build U/V arrays (m/s). Met convention: direction is "from", so negate.
      const uData = [],
        vData = [];
      let validSamples = 0;
      for (const res of results) {
        const speedRaw = res?.current?.wind_speed_10m;
        const dirRaw = res?.current?.wind_direction_10m;
        const hasValidSample =
          Number.isFinite(speedRaw) && Number.isFinite(dirRaw);
        const speed = hasValidSample ? speedRaw / 3.6 : 0; // km/h → m/s
        const dir = hasValidSample ? (dirRaw * Math.PI) / 180 : 0;
        if (hasValidSample) validSamples++;
        uData.push(-speed * Math.sin(dir)); // eastward component
        vData.push(-speed * Math.cos(dir)); // northward component
      }

      const minValid = Math.max(20, Math.floor(points.length * 0.25));
      if (validSamples < minValid) {
        console.warn(
          `Wind samples too sparse (${validSamples}/${points.length}), using fallback cache`,
        );
        dataset = null;
      } else {
        const header = {
          parameterCategory: 2,
          la1: LA1,
          la2: LA2,
          lo1: LO1,
          lo2: LO2,
          nx: NX,
          ny: NY,
          dx: DX,
          dy: DY,
          refTime: new Date().toISOString(),
        };

        dataset = [
          { header: { ...header, parameterNumber: 2 }, data: uData },
          { header: { ...header, parameterNumber: 3 }, data: vData },
        ];
        velocityDatasetCache.set(mode, { dataset, ts: Date.now() });
      }
    }

    // If active mode cache is missing, fallback to last good dataset from other mode.
    if (!dataset) {
      const altMode = mode === "high" ? "low" : "high";
      dataset = velocityDatasetCache.get(altMode)?.dataset || null;
    }

    if (!dataset) {
      // Final fallback when API is throttled: derive vector field from city weather data.
      dataset = buildVelocityDatasetFromCities({
        LA1,
        LA2,
        LO1,
        LO2,
        NY,
        NX,
      });
    }

    if (!dataset) {
      console.warn("Wind particle layer unavailable: no valid dataset yet");
      return;
    }

    const isLightTheme = document.body.classList.contains("light");
    const nextLayer = L.velocityLayer({
      displayValues: true,
      displayOptions: {
        velocityType: "Wind",
        position: "bottomleft",
        emptyString: "Loading wind...",
        angleConvention: "meteoCW",
        showCardinal: true,
        speedUnit: "m/s",
      },
      data: dataset,
      maxVelocity: 10,
      colorScale: isLightTheme
        ? ["#0f172a", "#1e3a8a", "#1d4ed8", "#0284c7", "#0b3a78"]
        : ["#ffffcc", "#a1dab4", "#41b6c4", "#2c7fb8", "#253494"],
    });

    const getVelocityEl = (layer) =>
      layer?._canvas || layer?._container || null;

    // If another reload started after this one, discard this layer.
    if (loadSeq !== velocityLoadSeq) {
      return;
    }

    // If user toggled layer off while loading, keep it detached.
    if (!def.on) {
      return;
    }

    // Smooth swap: fade-in new layer, then fade-out/remove old layer.
    nextLayer.addTo(map);
    const nextEl = getVelocityEl(nextLayer);
    if (nextEl) {
      if (isLightTheme) {
        nextEl.style.mixBlendMode = "multiply";
        nextEl.style.filter = "contrast(1.45) saturate(1.35) brightness(0.88)";
      } else {
        nextEl.style.mixBlendMode = "screen";
        nextEl.style.filter = "contrast(1.05) saturate(1.05)";
      }
      nextEl.style.opacity = "0";
      nextEl.style.transition = "opacity 260ms ease";
      requestAnimationFrame(() => {
        nextEl.style.opacity = "1";
      });
    }

    if (previousLayer && map.hasLayer(previousLayer)) {
      const previousEl = getVelocityEl(previousLayer);
      if (previousEl) {
        previousEl.style.transition = "opacity 200ms ease";
        previousEl.style.opacity = "0";
        setTimeout(() => {
          if (map.hasLayer(previousLayer)) map.removeLayer(previousLayer);
        }, 210);
      } else {
        map.removeLayer(previousLayer);
      }
    }
    def.lyr = nextLayer;
  } catch (e) {
    console.warn("Wind particle layer error:", e);
  }
}

let rainEventMarkers = [];
let snowEventMarkers = [];
let tempPinMarkers = [];

const LEGEND_FILTER_STATE = {
  pins: null,
  tempPins: null,
  rainPins: null,
  snowPins: null,
};
window.__aqiLegendBandIndex = null;

const TEMP_SCALE_BANDS = [
  {
    label: "Freezing (↓ 0°C)",
    color: "#3b82f6",
    match: (t) => Number.isFinite(t) && t <= 0,
  },
  {
    label: "Cold (1-10°C)",
    color: "#2563eb",
    match: (t) => Number.isFinite(t) && t >= 1 && t <= 10,
  },
  {
    label: "Mild (11-20°C)",
    color: "#22c55e",
    match: (t) => Number.isFinite(t) && t >= 11 && t <= 20,
  },
  {
    label: "Warm (21-30°C)",
    color: "#f97316",
    match: (t) => Number.isFinite(t) && t >= 21 && t <= 30,
  },
  {
    label: "Hot (↑ 30°C)",
    color: "#ef4444",
    match: (t) => Number.isFinite(t) && t > 30,
  },
];

const RAIN_SCALE_BANDS = [
  {
    label: "Light (0.8-2 mm)",
    color: "#38bdf8",
    match: (r) => Number.isFinite(r) && r >= RAIN_DETECTION_MM && r < 2,
  },
  {
    label: "Moderate (2-5 mm)",
    color: "#0ea5e9",
    match: (r) => Number.isFinite(r) && r >= 2 && r < 5,
  },
  {
    label: "Heavy (5-10 mm)",
    color: "#0284c7",
    match: (r) => Number.isFinite(r) && r >= 5 && r < 10,
  },
  {
    label: "Extreme (↑ 10 mm)",
    color: "#1e3a8a",
    match: (r) => Number.isFinite(r) && r >= 10,
  },
];

const SNOW_SCALE_BANDS = [
  {
    label: "Light (0.1-2 cm)",
    color: "#e0f2fe",
    match: (s) => Number.isFinite(s) && s > 0 && s <= 2,
  },
  {
    label: "Moderate (2-5 cm)",
    color: "#bae6fd",
    match: (s) => Number.isFinite(s) && s > 2 && s <= 5,
  },
  {
    label: "Heavy (↑ 5 cm)",
    color: "#7dd3fc",
    match: (s) => Number.isFinite(s) && s > 5,
  },
];

function inLegendBand(layerId, idx, city) {
  if (!Number.isInteger(idx)) return true;
  if (!city) return false;

  if (layerId === "pins") {
    const aqi = getCityAqiOrNull(city);
    if (aqi === null) return false;
    const min = idx === 0 ? 0 : LEVELS[idx - 1].max + 1;
    const max = LEVELS[idx]?.max ?? 500;
    return aqi >= min && aqi <= max;
  }

  if (layerId === "tempPins") {
    return TEMP_SCALE_BANDS[idx]?.match(Number(city?.wx?.temp)) || false;
  }

  if (layerId === "rainPins") {
    return (
      RAIN_SCALE_BANDS[idx]?.match(parseFloat(city?.wx?.rain || 0)) || false
    );
  }

  if (layerId === "snowPins") {
    return (
      SNOW_SCALE_BANDS[idx]?.match(parseFloat(city?.wx?.snow || 0)) || false
    );
  }

  return true;
}

function getPrimaryLegendLayerId() {
  const active = LAYER_DEFS.find((x) => x.id !== "velocity" && x.on);
  return active?.id || "pins";
}

function applyLegendFilter(layerId, idx) {
  if (!(layerId in LEGEND_FILTER_STATE)) return;
  LEGEND_FILTER_STATE[layerId] =
    LEGEND_FILTER_STATE[layerId] === idx ? null : idx;
  if (layerId === "pins") {
    window.__aqiLegendBandIndex = LEGEND_FILTER_STATE[layerId];
    if (typeof window.__onAqiLegendFilterChange === "function") {
      window.__onAqiLegendFilterChange(LEGEND_FILTER_STATE[layerId]);
    }
  }

  if (layerId === "pins") applyPinVisibility();
  if (layerId === "tempPins") renderTempPins();
  if (layerId === "rainPins") renderEventMarkers("rain");
  if (layerId === "snowPins") renderEventMarkers("snow");

  refreshLegendForActiveLayers();
}

function clearLegendFilter(layerId) {
  if (!(layerId in LEGEND_FILTER_STATE)) return;
  LEGEND_FILTER_STATE[layerId] = null;
  if (layerId === "pins") {
    window.__aqiLegendBandIndex = null;
    if (typeof window.__onAqiLegendFilterChange === "function") {
      window.__onAqiLegendFilterChange(null);
    }
  }

  if (layerId === "pins") applyPinVisibility();
  if (layerId === "tempPins") renderTempPins();
  if (layerId === "rainPins") renderEventMarkers("rain");
  if (layerId === "snowPins") renderEventMarkers("snow");

  refreshLegendForActiveLayers();
}

function clearEventMarkers(type) {
  const list = type === "rain" ? rainEventMarkers : snowEventMarkers;
  list.forEach((m) => map.removeLayer(m));
  if (type === "rain") rainEventMarkers = [];
  else snowEventMarkers = [];
}

function renderEventMarkers(type) {
  clearEventMarkers(type);
  const def = LAYER_DEFS.find(
    (x) => x.id === (type === "rain" ? "rainPins" : "snowPins"),
  );
  if (!def?.on) return;
  const inScope =
    activeProvince === 0
      ? CITIES
      : CITIES.filter((c) => c.province === activeProvince);
  const filtered = inScope.filter((c) =>
    type === "rain"
      ? c.realData === true && parseFloat(c.wx.rain || 0) >= RAIN_DETECTION_MM
      : parseFloat(c.wx.snow || 0) > 0,
  );
  const layerId = type === "rain" ? "rainPins" : "snowPins";
  const selectedBand = LEGEND_FILTER_STATE[layerId];
  const filteredByLegend = filtered.filter((c) =>
    inLegendBand(layerId, selectedBand, c),
  );
  const target = type === "rain" ? rainEventMarkers : snowEventMarkers;
  filteredByLegend.forEach((c) => {
    const icon = L.divIcon({
      className: "",
      iconSize: [30, 30],
      iconAnchor: [15, 28],
      html:
        type === "rain"
          ? '<div style="width:26px;height:26px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,#0369a1,#38bdf8);border:2px solid rgba(255,255,255,0.85);color:white;font-size:14px;box-shadow:0 6px 14px rgba(2,132,199,0.45)">🌧️</div>'
          : '<div style="width:26px;height:26px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,#0ea5e9,#e0f2fe);border:2px solid rgba(255,255,255,0.9);color:#083344;font-size:14px;box-shadow:0 6px 14px rgba(186,230,253,0.5)">❄️</div>',
    });
    const value = type === "rain" ? `${c.wx.rain} mm` : `${c.wx.snow} cm`;
    const marker = L.marker([c.lat, c.lon], { icon, interactive: false });
    marker.bindTooltip(
      `${type === "rain" ? "Rainfall" : "Snowfall"}: ${value}<br>${c.city}`,
      {
        direction: "top",
        opacity: 0.9,
      },
    );
    marker.addTo(map);
    target.push(marker);
  });
}

function refreshEventPins() {
  renderEventMarkers("rain");
  renderEventMarkers("snow");
}

function clearTempPins() {
  tempPinMarkers.forEach((m) => map.removeLayer(m));
  tempPinMarkers = [];
}

function renderTempPins() {
  clearTempPins();
  const def = LAYER_DEFS.find((x) => x.id === "tempPins");
  if (!def?.on) return;

  const inScope =
    activeProvince === 0
      ? CITIES
      : CITIES.filter((c) => c.province === activeProvince);

  const selectedBand = LEGEND_FILTER_STATE.tempPins;

  inScope.forEach((c) => {
    if (
      Number.isInteger(searchFocusCityIndex) &&
      CITIES[searchFocusCityIndex] !== c
    )
      return;
    const tempVal = Number.isFinite(c?.wx?.temp) ? Math.round(c.wx.temp) : null;
    if (tempVal === null) return;
    if (!inLegendBand("tempPins", selectedBand, c)) return;
    const pinColor =
      tempVal <= 0
        ? "#3b82f6"
        : tempVal <= 10
          ? "#2563eb"
          : tempVal <= 20
            ? "#22c55e"
            : tempVal <= 30
              ? "#f97316"
              : "#ef4444";
    const label = `${tempVal}°`;
    const fontSize = label.length >= 4 ? 8.5 : 10;
    const pinSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="48" viewBox="0 0 36 48">
      <defs>
        <filter id="ft${tempVal}"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.55)"/></filter>
        <radialGradient id="gt${tempVal}" cx="38%" cy="30%">
          <stop offset="0%" stop-color="${pinColor}" stop-opacity="1"/>
          <stop offset="100%" stop-color="${pinColor}" stop-opacity="0.75"/>
        </radialGradient>
      </defs>
      <path d="M18,2 C9,2 2,9 2,18 C2,30.5 18,46 18,46 C18,46 34,30.5 34,18 C34,9 27,2 18,2 Z"
        fill="url(#gt${tempVal})" filter="url(#ft${tempVal})" stroke="white" stroke-width="1.9"/>
      <ellipse cx="14" cy="12" rx="4" ry="3" fill="white" opacity="0.2"/>
      <text x="18" y="23.5" text-anchor="middle" font-size="${fontSize}" font-weight="800"
        font-family="DM Sans,sans-serif" fill="white">${label}</text>
    </svg>`;
    const icon = L.divIcon({
      className: "wn-pin",
      iconSize: [36, 48],
      iconAnchor: [18, 48],
      popupAnchor: [0, -48],
      html: pinSvg,
    });
    const m = L.marker([c.lat, c.lon], {
      icon,
      interactive: true,
      riseOnHover: true,
    });
    m.cityData = c;
    m.bindTooltip(`${c.city}<br>Temperature: ${tempVal}°C`, {
      direction: "top",
      opacity: 0.9,
    });
    m.on("click", (e) => {
      L.DomEvent.stopPropagation(e);
      openDetail(c);
    });
    m.addTo(map);
    tempPinMarkers.push(m);
  });
}

const LAYER_DEFS = [
  {
    id: "pins",
    ico: "📍",
    name: "Air AQI Pins",
    lyr: null,
    on: true,
    type: "pins",
  },
  {
    id: "rainPins",
    ico: "🌧️",
    name: "Rainfall Pins",
    lyr: null,
    on: false,
    type: "event",
    group: "eventRain",
  },
  {
    id: "snowPins",
    ico: "❄️",
    name: "Snowfall Pins",
    lyr: null,
    on: false,
    type: "event",
    group: "eventSnow",
  },
  {
    id: "tempPins",
    ico: "🌡️",
    name: "Temperature Pins",
    lyr: null,
    on: false,
    type: "tempPins",
  },
  // Fire layer
  {
    id: "fire",
    ico: "🔥",
    name: "Fire Hotspots",
    lyr: null,
    on: false,
    type: "fire",
  },
  // OWM layers (need API key in CFG.OWM above)
  {
    id: "owmCl",
    ico: "☁️",
    name: "Clouds (OWM)",
    lyr: null,
    owmName: "clouds_new",
    on: false,
    type: "owm",
  },
  {
    id: "owmRn",
    ico: "🌦️",
    name: "Precip (OWM)",
    lyr: null,
    owmName: "precipitation_new",
    on: false,
    type: "owm",
  },
  {
    id: "owmWn",
    ico: "🌀",
    name: "Wind (OWM)",
    lyr: null,
    owmName: "wind_new",
    on: false,
    type: "owm",
  },
  {
    id: "owmTm",
    ico: "🔥",
    name: "Temp (OWM)",
    lyr: null,
    owmName: "temp_new",
    on: false,
    type: "owm",
  },
  {
    id: "velocity",
    ico: "🌬️",
    name: "Wind Particles",
    lyr: null,
    on: true,
    type: "velocity",
    group: "owm",
  },
];
// Build OWM layers lazily so API key is read at toggle time
LAYER_DEFS.filter((l) => l.type === "owm").forEach((l) => {
  l.lyr = owm(l.owmName);
});

const LEGENDS = {
  pins: {
    t: "AQI Scale",
    rows: LEVELS.map((l) => [
      l.c,
      l.lbl.replace("Unhealthy (Sens.)", "Sensitive"),
    ]),
  },
  tempPins: {
    t: "Temperature Scale",
    rows: TEMP_SCALE_BANDS.map((r) => [r.color, r.label]),
  },
  rainPins: {
    t: "Rainfall Scale",
    rows: RAIN_SCALE_BANDS.map((r) => [r.color, r.label]),
  },
  snowPins: {
    t: "Snowfall Scale",
    rows: SNOW_SCALE_BANDS.map((r) => [r.color, r.label]),
  },
  fire: {
    t: "Fire Risk Scale",
    rows: [
      ["#f59e0b", "Low Confidence"],
      ["#f97316", "Moderate Confidence"],
      ["#ef4444", "High Confidence"],
      ["#b91c1c", "Extreme Confidence"],
    ],
  },
  owmCl: {
    t: "Cloud Cover Scale",
    rows: [
      ["#dbeafe", "0-10% Clear"],
      ["#93c5fd", "10-40% Light Clouds"],
      ["#60a5fa", "40-70% Cloudy"],
      ["#1d4ed8", "70-100% Overcast"],
    ],
  },
  owmRn: {
    t: "Precipitation Scale",
    rows: [
      ["#7dd3fc", "Light Rain"],
      ["#38bdf8", "Moderate Rain"],
      ["#0ea5e9", "Heavy Rain"],
      ["#0369a1", "Intense Rain"],
    ],
  },
  owmWn: {
    t: "Wind Intensity Scale",
    rows: [
      ["#bae6fd", "Calm"],
      ["#7dd3fc", "Breezy"],
      ["#38bdf8", "Windy"],
      ["#0284c7", "Strong Wind"],
    ],
  },
  owmTm: {
    t: "Temperature Band",
    rows: [
      ["#3b82f6", "Very Cold"],
      ["#22c55e", "Mild"],
      ["#facc15", "Warm"],
      ["#ef4444", "Hot"],
    ],
  },
};

function isFilterableLegendLayer(layerId) {
  return layerId in LEGEND_FILTER_STATE;
}

function renderLegendRows(layerId, rows) {
  const filterable = isFilterableLegendLayer(layerId);
  return rows
    .map(([c, t], idx) =>
      filterable
        ? `<button class="lg-row${LEGEND_FILTER_STATE[layerId] === idx ? " active" : ""}" onclick="applyLegendFilter('${layerId}',${idx})" title="Filter by ${t}"><span class="lg-dot" style="background:${c};border:1px solid rgba(255,255,255,0.15)"></span><span class="lg-lbl">${t}</span></button>`
        : `<div class="lg-row" title="${t}"><span class="lg-dot" style="background:${c};border:1px solid rgba(255,255,255,0.15)"></span><span class="lg-lbl">${t}</span></div>`,
    )
    .join("");
}

function refreshLegendForActiveLayers() {
  const legendEl = document.getElementById("legend");
  const layerId = getPrimaryLegendLayerId();

  if (["owmCl", "owmRn", "owmWn", "owmTm"].includes(layerId)) {
    if (legendEl) legendEl.style.display = "none";
    return;
  }

  if (legendEl) legendEl.style.display = "block";

  if (searchLegendDisabled) {
    document.getElementById("lgTitle").innerHTML =
      '<span class="lg-title-text">Scale Unavailable</span>';
    document.getElementById("lgContent").innerHTML =
      '<div class="lg-row"><span class="lg-dot" style="background:#64748b;border:1px solid rgba(255,255,255,0.15)"></span><span class="lg-lbl">No AQI or temperature data for this location</span></div>';
    return;
  }
  const lg = LEGENDS[layerId] || LEGENDS.pins;
  const selected = LEGEND_FILTER_STATE[layerId];
  const filterable = isFilterableLegendLayer(layerId);
  const hasSelection = Number.isInteger(selected);
  const titleEl = document.getElementById("lgTitle");
  titleEl.innerHTML = `<span class="lg-title-text">${lg.t}</span>${filterable ? `<button class="lg-clear-top${hasSelection ? "" : " disabled"}" onclick="clearLegendFilter('${layerId}')" title="Clear filter" ${hasSelection ? "" : "disabled"}>Clear filter</button>` : ""}`;
  document.getElementById("lgContent").innerHTML = renderLegendRows(
    layerId,
    lg.rows,
  );
}

function ensurePrimaryPinsVisibility() {
  const activeNonVelocity = LAYER_DEFS.filter(
    (x) => x.id !== "velocity" && x.on,
  );
  if (!activeNonVelocity.length) {
    const pinLayer = LAYER_DEFS.find((x) => x.id === "pins");
    if (pinLayer && !pinLayer.on) {
      setLayerOn(pinLayer, true);
    }
  }
}

// Build layer list UI
const lpList = document.getElementById("lpList");
let satelliteHeaderAdded = false;
let owmHeaderAdded = false;
LAYER_DEFS.forEach((l) => {
  if (!satelliteHeaderAdded && l.id === "fire") {
    satelliteHeaderAdded = true;
    lpList.innerHTML +=
      '<div class="lp-div"></div><div class="lp-sec">🛰️ Satellite Data</div>';
  }
  if (!owmHeaderAdded && l.type === "owm") {
    owmHeaderAdded = true;
    lpList.innerHTML +=
      '<div class="lp-div"></div><div class="lp-sec">OpenWeatherMap</div>';
  }
  const d = document.createElement("div");
  d.className = "lp-item" + (l.on ? " active" : "");
  d.id = "li_" + l.id;
  d.innerHTML = `<span class="lp-ico">${l.ico}</span><span class="lp-name">${l.name}</span><button class="lp-tog${l.on ? " on" : ""}" id="lt_${l.id}" onclick="event.stopPropagation();toggleLayer('${l.id}')"></button>`;
  d.onclick = () => toggleLayer(l.id);
  lpList.appendChild(d);
});

function toggleLayerPanel() {
  document.getElementById("lyPnl").classList.toggle("open");
  const isOpen = document.getElementById("lyPnl").classList.contains("open");
  document.getElementById("lyFab").style.opacity = isOpen ? "0" : "1";
  document.getElementById("lyFab").style.pointerEvents = isOpen
    ? "none"
    : "auto";
  // Hide/show province FAB based on layer panel state
  const provFab = document.getElementById("provFab");
  if (provFab) {
    provFab.style.opacity = isOpen ? "0" : "1";
    provFab.style.pointerEvents = isOpen ? "none" : "auto";
  }
  // Close province panel if open
  if (isOpen) {
    const provPnl = document.getElementById("provPnl");
    if (provPnl) provPnl.classList.remove("open");
  }
}

function setLayerOn(l, on) {
  l.on = on;
  const btn = document.getElementById("lt_" + l.id);
  const item = document.getElementById("li_" + l.id);
  if (btn) {
    btn.classList.toggle("on", on);
  }
  if (item) {
    item.classList.toggle("active", on);
  }
  if (l.id === "pins") {
    applyPinVisibility();
    return;
  }
  if (on) {
    if (l.id === "rainPins") {
      if (!map.hasLayer(rnH)) rnH.addTo(map);
      renderEventMarkers("rain");
      return;
    }
    if (l.id === "snowPins") {
      if (!map.hasLayer(snH)) snH.addTo(map);
      renderEventMarkers("snow");
      return;
    }
    if (l.id === "tempPins") {
      renderTempPins();
      return;
    }
    if (l.type === "velocity") {
      loadVelocityLayer();
      return;
    }
    // Fire layer — fetch from backend
    if (l.id === "fire") {
      loadFireLayer();
      return;
    }
    // For OWM layers, always rebuild to ensure fresh tile URL
    if (l.type === "owm" && l.owmName) {
      if (l.lyr && map.hasLayer(l.lyr)) map.removeLayer(l.lyr);
      l.lyr = owm(l.owmName);
    }
    if (l.lyr) {
      try {
        if (!map.hasLayer(l.lyr)) l.lyr.addTo(map);
      } catch (e) {
        console.warn("Layer add error:", e);
      }
    }
  } else {
    if (l.type === "velocity") {
      velocityLoadSeq++;
      if (velocityQualityRefreshTimer) {
        clearTimeout(velocityQualityRefreshTimer);
      }
      if (l.lyr && map.hasLayer(l.lyr)) map.removeLayer(l.lyr);
      return;
    }
    if (l.id === "fire") {
      fireMarkers.forEach((m) => map.removeLayer(m));
      fireMarkers = [];
      return;
    }
    if (l.id === "rainPins") {
      if (map.hasLayer(rnH)) map.removeLayer(rnH);
      clearEventMarkers("rain");
      return;
    }
    if (l.id === "snowPins") {
      if (map.hasLayer(snH)) map.removeLayer(snH);
      clearEventMarkers("snow");
      return;
    }
    if (l.id === "tempPins") {
      clearTempPins();
      return;
    }
    if (l.lyr) {
      try {
        if (map.hasLayer(l.lyr)) map.removeLayer(l.lyr);
      } catch (e) {
        console.warn("Layer remove error:", e);
      }
    }
  }
}

function toggleLayer(id) {
  const l = LAYER_DEFS.find((x) => x.id === id);
  if (!l) return;

  // Wind Particles stays independent.
  if (l.id === "velocity") {
    setLayerOn(l, !l.on);
    ensurePrimaryPinsVisibility();
    refreshLegendForActiveLayers();
    return;
  }

  const newState = !l.on;

  // All non-velocity layers are mutually exclusive.
  if (newState) {
    // Keep wind particles independent while forcing a single active non-wind layer.
    LAYER_DEFS.filter(
      (x) => x.id !== id && x.id !== "velocity" && x.on,
    ).forEach((x) => setLayerOn(x, false));
  }

  setLayerOn(l, newState);
  ensurePrimaryPinsVisibility();
  refreshLegendForActiveLayers();
}

// Auto-start wind particle layer on page load
loadVelocityLayer();
map.on("zoomend", scheduleVelocityQualityRefresh);

// ══════════════════════════════════════════
// PIN ICONS
// ══════════════════════════════════════════
function mkPin(aqi, sel = false) {
  const hasAqi = hasValidAqiValue(aqi);
  const drawAqi = hasAqi ? aqi : 0;
  const lv = hasAqi
    ? gl(drawAqi)
    : { c: "#64748b", bg: "rgba(100,116,139,0.2)", lbl: "Unavailable" };
  const s = sel ? 46 : 36;
  const pinLabel = hasAqi ? String(drawAqi) : "—";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${Math.round(s * 1.32)}" viewBox="0 0 36 48">
        <defs>
          <filter id="f${drawAqi}${sel ? 1 : 0}"><feDropShadow dx="0" dy="2" stdDeviation="${sel ? 3 : 2}" flood-color="rgba(0,0,0,0.55)"/></filter>
          <radialGradient id="g${drawAqi}${sel ? 1 : 0}" cx="38%" cy="30%">
            <stop offset="0%" stop-color="${lv.c}" stop-opacity="1"/>
            <stop offset="100%" stop-color="${lv.c}" stop-opacity="0.72"/>
          </radialGradient>
        </defs>
        <path d="M18,2 C9,2 2,9 2,18 C2,30.5 18,46 18,46 C18,46 34,30.5 34,18 C34,9 27,2 18,2 Z"
          fill="url(#g${drawAqi}${sel ? 1 : 0})" filter="url(#f${drawAqi}${sel ? 1 : 0})" stroke="white" stroke-width="${sel ? 2.5 : 1.8}"/>
        <ellipse cx="14" cy="12" rx="4" ry="3" fill="white" opacity="0.2"/>
        <text x="18" y="${drawAqi > 99 ? 23 : 24}" text-anchor="middle" font-size="${drawAqi > 99 ? 9 : 11}" font-weight="800"
          font-family="DM Sans,sans-serif" fill="white">${pinLabel}</text>
        ${sel ? `<circle cx="18" cy="18" r="16" fill="none" stroke="white" stroke-width="1.5" opacity="0.3"/>` : ""}
      </svg>`;
  return L.divIcon({
    html: svg,
    className: "wn-pin",
    iconSize: [s, Math.round(s * 1.32)],
    iconAnchor: [s / 2, Math.round(s * 1.32)],
    popupAnchor: [0, -Math.round(s * 1.32)],
  });
}

// ══════════════════════════════════════════
// MARKERS
// ══════════════════════════════════════════
let activeCity = null,
  allMarkers = [],
  dp24ch = null;
let searchFocusCityIndex = null;
let searchLegendDisabled = false;

function hasCityHomeData(city) {
  return hasValidAqiValue(city?.aqi);
}

function shouldShowCityPin(city) {
  if (!city) return false;
  if (!hasCityHomeData(city)) return false;
  if (
    Number.isInteger(searchFocusCityIndex) &&
    CITIES[searchFocusCityIndex] !== city
  )
    return false;
  const selectedAqiBand = LEGEND_FILTER_STATE.pins;
  if (!inLegendBand("pins", selectedAqiBand, city)) return false;
  return activeProvince === 0 || city.province === activeProvince;
}

function applyPinVisibility() {
  const pinsOn = LAYER_DEFS.find((l) => l.id === "pins")?.on;
  const useOfficialStationPins = Boolean(window.__useOfficialStationPins);
  allMarkers.forEach((m, i) => {
    const city = CITIES[i];
    const show = pinsOn && !useOfficialStationPins && shouldShowCityPin(city);
    if (show && !map.hasLayer(m)) m.addTo(map);
    if (!show && map.hasLayer(m)) map.removeLayer(m);
  });
}

CITIES.forEach((c) => {
  const m = L.marker([c.lat, c.lon], {
    icon: mkPin(c.aqi),
    title: c.city,
    riseOnHover: true,
  });
  m.cityData = c;
  m.on("click", (e) => {
    L.DomEvent.stopPropagation(e);
    openDetail(c);
  });
  allMarkers.push(m);
});
applyPinVisibility();
map.on("click", () => closeDetail());

// ══════════════════════════════════════════
// DETAIL PANEL
// ══════════════════════════════════════════
function openDetail(c) {
  activeCity = c;
  const aqi = getCityAqiOrNull(c);
  const lv =
    aqi === null
      ? {
          c: "#94a3b8",
          bg: "rgba(148,163,184,0.16)",
          lbl: "AQI Unavailable",
          adv: "No internal AQI reading is available for this city right now.",
        }
      : gl(aqi);
  // Don't pollute search bar — only update if user explicitly searched
  document.getElementById("dpHBg").style.background =
    HERO_GRADS[lv.lbl] || HERO_GRADS["Good"];
  document.getElementById("dpZone").textContent =
    c.zone.charAt(0).toUpperCase() +
    c.zone.slice(1) +
    " Zone" +
    (c.realData ? " · 🟢 Live" : " · 🟡 Est.");
  document.getElementById("dpCity").textContent = c.city;
  document.getElementById("dpDist").textContent =
    c.d +
    " District · " +
    (PROVINCE_NAMES[c.province] || "Nepal") +
    " Province";
  document.getElementById("dpAqiN").textContent = aqi === null ? "N/A" : aqi;
  document.getElementById("dpAqiL").textContent = lv.lbl;
  document.getElementById("dpAqiL").style.cssText =
    `background:${lv.bg};color:${lv.c}`;
  document.getElementById("dpAqiA").textContent = lv.adv;

  // Conditions
  const W = c.wx;
  document.getElementById("dTemp").textContent = W.temp + "°C";
  document.getElementById("dFeel").textContent = W.feelsLike + "°C";
  document.getElementById("dHum").textContent = W.humidity + "%";
  document.getElementById("dWind").textContent = W.wind + " km/h";
  document.getElementById("dWDir").textContent = W.windDir;
  document.getElementById("dCloud").textContent = W.cloud + "%";
  document.getElementById("dRain").textContent = W.rain + " mm";
  document.getElementById("dSnow").textContent =
    parseFloat(W.snow) > 0 ? W.snow + " cm" : "None";
  document.getElementById("dVis").textContent = W.visibility + " km";
  document.getElementById("dPress").textContent = W.pressure + " hPa";
  document.getElementById("dUV").textContent = W.uv + "/11";
  document.getElementById("dCond").textContent = W.icon;
  document.getElementById("dPm25").textContent = c.pm25 ?? "N/A";
  document.getElementById("dPm10").textContent = c.pm10 ?? "N/A";
  document.getElementById("dPm1").textContent = c.pm1 ?? "N/A";

  // 24hr chart
  if (dp24ch) dp24ch.destroy();
  dp24ch = new Chart(document.getElementById("dp24c").getContext("2d"), {
    type: "line",
    data: {
      labels: c.h24.map((h) => h.h),
      datasets: [
        {
          data: c.h24.map((h) => h.t),
          borderColor: "#38bdf8",
          backgroundColor: "rgba(56,189,248,0.08)",
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          ticks: {
            color: "rgba(255,255,255,0.25)",
            font: { size: 7 },
            maxTicksLimit: 8,
          },
          grid: { display: false },
          border: { display: false },
        },
        y: {
          ticks: {
            color: "rgba(255,255,255,0.25)",
            font: { size: 7 },
            callback: (v) => v + "°",
          },
          grid: { color: "rgba(255,255,255,0.05)" },
          border: { display: false },
        },
      },
    },
  });

  // 7-day forecast
  const forecastAqiValues = c.fc7.map((f) =>
    Number.isFinite(f.aqi) ? f.aqi : 0,
  );
  const mx = Math.max(...forecastAqiValues, 1);
  document.getElementById("dpFc").innerHTML = c.fc7
    .map((f) => {
      const aqiValue = Number.isFinite(f.aqi) ? f.aqi : null;
      const fl =
        aqiValue === null ? { c: "#64748b", lbl: "Unavailable" } : gl(aqiValue);
      const p = aqiValue === null ? 0 : Math.round((aqiValue / mx) * 100);
      return `<div class="fc-row"><div class="fc-day">${f.day.slice(0, 3)}</div><div class="fc-ico">${f.icon}</div><div class="fc-lo">${f.lo}°</div><div class="fc-bw"><div class="fc-bf" style="width:${p}%;background:${fl.c}"></div></div><div class="fc-hi">${f.hi}°</div><div class="fc-adot" style="background:${fl.c}" title="${aqiValue === null ? "AQI unavailable" : `AQI ${aqiValue}`}"></div></div>`;
    })
    .join("");

  // AI Advisory
  genAdvisory(c);
  document.getElementById("amSub").textContent = `Alerts for ${c.city}, ${c.d}`;
  document.getElementById("dpPnl").classList.add("open");
  map.flyTo([c.lat, c.lon], 11, { animate: true, duration: 0.9 });
}

function closeDetail() {
  document.getElementById("dpPnl").classList.remove("open");
  activeCity = null;
}

// ══════════════════════════════════════════
// AI ADVISORY
// ══════════════════════════════════════════
async function genAdvisory(c) {
  const el = document.getElementById("aiBody");
  el.innerHTML =
    '<div class="ai-spin"><div class="spinner"></div>Analyzing conditions…</div>';
  // Use enhanced local advisory (no API key needed)
  setTimeout(() => {
    el.textContent = localAdvisory(c);
  }, 600);
}

function localAdvisory(c) {
  const t = [];
  const month = new Date().getMonth();
  const isMonsoon = month >= 5 && month <= 8;
  const isWinter = month >= 11 || month <= 1;
  const isSpring = month >= 2 && month <= 4;
  const rain = parseFloat(c.wx.rain || 0);
  const snow = parseFloat(c.wx.snow || 0);

  // AQI advisory
  if (!hasValidAqiValue(c.aqi))
    t.push(
      `ℹ️ Live AQI is currently unavailable for ${c.city}. Weather alerts remain active and AQI will appear automatically when internal records are updated.`,
    );
  else if (c.aqi > 300)
    t.push(
      `⚠️ Hazardous air quality (AQI ${c.aqi}) — stay indoors, seal windows, use air purifier if available.`,
    );
  else if (c.aqi > 200)
    t.push(
      `🏭 Very unhealthy air (AQI ${c.aqi}) — avoid all outdoor activity, wear N95 mask if going out.`,
    );
  else if (c.aqi > 150)
    t.push(
      `😷 Unhealthy air (AQI ${c.aqi}) — wear N95 mask outdoors, limit physical activity.`,
    );
  else if (c.aqi > 100)
    t.push(
      `🌫️ Moderate air quality (AQI ${c.aqi}) — sensitive groups should reduce outdoor time.`,
    );
  else
    t.push(
      `✅ Good air quality (AQI ${c.aqi}) — safe for outdoor activities today.`,
    );

  // Weather advisory
  if (snow > 5)
    t.push(
      `❄️ Heavy snowfall ${snow}cm — mountain roads likely blocked, carry warm gear and emergency supplies.`,
    );
  else if (snow > 0)
    t.push(
      `🌨️ Light snow ${snow}cm — roads may be slippery, drive carefully in ${c.d} district.`,
    );

  if (rain > 10)
    t.push(
      `🌧️ Heavy rain ${rain}mm — high risk of flash floods and landslides${isMonsoon ? " during monsoon" : ""}, avoid river banks.`,
    );
  else if (rain > 3)
    t.push(
      `🌦️ Moderate rain ${rain}mm — carry umbrella, be cautious on steep roads.`,
    );

  if (c.wx.wind > 40)
    t.push(
      `💨 Strong winds ${c.wx.wind}km/h ${c.wx.windDir} — secure loose items, avoid exposed ridges.`,
    );
  if (c.wx.temp < 0)
    t.push(
      `🥶 Freezing ${c.wx.temp}°C — risk of frostbite, wear thermal layers and avoid prolonged exposure.`,
    );
  else if (c.wx.temp < 5)
    t.push(`🧥 Cold ${c.wx.temp}°C — dress warmly in layers.`);
  else if (c.wx.temp > 35)
    t.push(
      `🔥 Very hot ${c.wx.temp}°C — stay hydrated, avoid midday sun exposure.`,
    );

  if (c.wx.uv >= 9)
    t.push(
      `☀️ Extreme UV ${c.wx.uv}/11 — apply SPF50+, wear hat and protective clothing.`,
    );
  else if (c.wx.uv >= 6)
    t.push(`🌤️ High UV ${c.wx.uv}/11 — apply sunscreen before going outdoors.`);

  // Zone-specific advice
  if (c.zone === "mountain" && (snow > 0 || c.wx.temp < 5))
    t.push(
      `🏔️ Mountain zone: check trail conditions before trekking, inform someone of your route.`,
    );
  if (c.zone === "terai" && isMonsoon && rain > 0)
    t.push(`🌿 Terai: mosquito activity high during monsoon, use repellent.`);

  // Seasonal context
  if (isSpring && c.aqi > 100)
    t.push(
      `🔥 Burning season: agricultural fires in Terai are likely contributing to current air quality.`,
    );

  if (t.length === 1)
    t.push(
      `Current conditions in ${c.city}: ${c.wx.temp}°C, humidity ${c.wx.humidity}%, wind ${c.wx.wind}km/h ${c.wx.windDir}. ${c.wx.cond}.`,
    );
  return t.slice(0, 3).join(" ");
}

// ══════════════════════════════════════════
// SEARCH
// ══════════════════════════════════════════
function resetMapFiltersForSearch() {
  searchFocusCityIndex = null;
  searchLegendDisabled = false;
  filterProvince(0);
  LAYER_DEFS.forEach((layer) => {
    if (layer.id !== "pins" && layer.on) {
      setLayerOn(layer, false);
    }
  });
  const pinLayer = LAYER_DEFS.find((layer) => layer.id === "pins");
  if (pinLayer && !pinLayer.on) {
    setLayerOn(pinLayer, true);
  }
  refreshLegendForActiveLayers();
}

function applySearchSelection(city) {
  searchFocusCityIndex = CITIES.indexOf(city);
  searchLegendDisabled = false;

  filterProvince(0);
  Object.keys(LEGEND_FILTER_STATE).forEach((key) => {
    LEGEND_FILTER_STATE[key] = null;
  });
  window.__aqiLegendBandIndex = null;

  const hasAqi = hasCityHomeData(city);
  const hasTemp = Number.isFinite(city?.wx?.temp);

  // Keep velocity independent; turn off all other layers then enable only target layer.
  LAYER_DEFS.forEach((layer) => {
    if (layer.id !== "velocity" && layer.on) {
      setLayerOn(layer, false);
    }
  });

  if (hasAqi) {
    const pinLayer = LAYER_DEFS.find((layer) => layer.id === "pins");
    if (pinLayer && !pinLayer.on) {
      setLayerOn(pinLayer, true);
    }
    applyPinVisibility();
  } else if (hasTemp) {
    const tempLayer = LAYER_DEFS.find((layer) => layer.id === "tempPins");
    if (tempLayer && !tempLayer.on) {
      setLayerOn(tempLayer, true);
    }
    renderTempPins();
  } else {
    searchLegendDisabled = true;
  }

  refreshLegendForActiveLayers();
}

const srchIn = document.getElementById("srchInput");
const srchDrop = document.getElementById("srchDrop");
const srchClr = document.getElementById("srchClr");
function clearSearchUi() {
  srchIn.value = "";
  srchDrop.style.display = "none";
  srchClr.style.display = "none";
}
// Keep search clean on normal load and browser page restore.
clearSearchUi();
window.addEventListener("pageshow", clearSearchUi);

srchIn.addEventListener("input", () => {
  const q = srchIn.value.trim().toLowerCase();
  srchClr.style.display = q ? "block" : "none";
  if (q.length < 2) {
    srchDrop.style.display = "none";
    return;
  }
  const hits = CITIES.filter(
    (c) => c.city.toLowerCase().includes(q) || c.d.toLowerCase().includes(q),
  ).slice(0, 7);
  if (!hits.length) {
    srchDrop.style.display = "none";
    return;
  }
  srchDrop.innerHTML = hits
    .map((c) => {
      const aqi = getCityAqiOrNull(c);
      const lv = aqi === null ? { c: "#64748b" } : gl(aqi);
      const badgeText = aqi === null ? "N/A" : String(aqi);
      return `<div class="si" data-city="${c.city}"><div class="si-badge" style="background:${lv.c}">${badgeText}</div><div><div class="si-name">${c.city}</div><div class="si-meta">${c.d} · ${c.zone} · ${c.wx.icon} ${c.wx.cond}</div></div><div class="si-tmp">${c.wx.temp}°</div></div>`;
    })
    .join("");
  srchDrop.style.display = "block";
  srchDrop.querySelectorAll(".si").forEach((el) => {
    el.onclick = () => {
      const city = CITIES.find((c) => c.city === el.dataset.city);
      if (city) {
        srchDrop.style.display = "none";
        srchIn.value = city.city;
        srchClr.style.display = "block";
        applySearchSelection(city);
        openDetail(city);
      }
    };
  });
});
srchClr.onclick = () => {
  srchIn.value = "";
  srchDrop.style.display = "none";
  srchClr.style.display = "none";
  resetMapFiltersForSearch();
};
document.addEventListener("click", (e) => {
  if (!e.target.closest("#srchWrap")) srchDrop.style.display = "none";
});

// ══════════════════════════════════════════
// ALERT MODAL
// ══════════════════════════════════════════
function openAlert() {
  document.getElementById("alrtModal").classList.add("show");
  document.getElementById("amForm").style.display = "block";
  document.getElementById("amOk").style.display = "none";
}
function closeAlert() {
  document.getElementById("alrtModal").classList.remove("show");
}

async function submitAlert() {
  const name = document.getElementById("aName").value.trim();
  const email = document.getElementById("aEmail").value.trim();
  if (!name || !email) {
    alert("Please fill in your name and email.");
    return;
  }
  if (!/\S+@\S+\.\S+/.test(email)) {
    alert("Please enter a valid email address.");
    return;
  }
  document.getElementById("amForm").style.display = "none";
  document.getElementById("amOk").style.display = "block";
  document.getElementById("amOkTxt").textContent =
    `Email subscription alerts are temporarily paused. AQI may be unavailable in some locations. Please log in and use \"Send Alert to My Email\" for on-demand advice based on temperature, wind, rain, and snow (plus AQI when available).`;
}

// ══════════════════════════════════════════
// THEME TOGGLE
// ══════════════════════════════════════════
function toggleTheme() {
  const isLight = document.body.classList.toggle("light");
  const btn = document.getElementById("themeBtn");
  const thumb = document.getElementById("themeThumb");
  const iconInner = document.getElementById("themeIconInner");
  const lbl = document.getElementById("themeLbl");
  const mapEl = document.getElementById("wnMap");
  if (isLight) {
    btn.style.border = "1.5px solid rgba(234,179,8,0.6)";
    btn.style.background = "rgba(251,191,36,0.1)";
    btn.style.color = "#92400e";
  } else {
    btn.style.border = "1.5px solid rgba(255,255,255,0.25)";
    btn.style.background = "rgba(255,255,255,0.08)";
    btn.style.color = "#e2e8f0";
  }
  refreshProvinceBoundaryStyles();
  refreshDistrictBoundaryStyles();
  syncSelectedProvinceOverlay();

  // Fade map during tile switch to avoid flicker
  if (mapEl) mapEl.style.opacity = "0.7";

  setTimeout(() => {
    if (isLight) {
      // Slide to right, show sun
      thumb.setAttribute("cx", "23");
      thumb.style.fill = "#f59e0b";
      iconInner.setAttribute("transform", "translate(9,9)");
      iconInner.innerHTML =
        '<circle r="4" fill="#f59e0b" opacity="0.9"/><line x1="0" y1="-7" x2="0" y2="-5.5" stroke="#f59e0b" stroke-width="1.5"/><line x1="0" y1="5.5" x2="0" y2="7" stroke="#f59e0b" stroke-width="1.5"/><line x1="-7" y1="0" x2="-5.5" y2="0" stroke="#f59e0b" stroke-width="1.5"/><line x1="5.5" y1="0" x2="7" y2="0" stroke="#f59e0b" stroke-width="1.5"/><line x1="-5" y1="-5" x2="-4" y2="-4" stroke="#f59e0b" stroke-width="1.5"/><line x1="4" y1="4" x2="5" y2="5" stroke="#f59e0b" stroke-width="1.5"/><line x1="5" y1="-5" x2="4" y2="-4" stroke="#f59e0b" stroke-width="1.5"/><line x1="-4" y1="4" x2="-5" y2="5" stroke="#f59e0b" stroke-width="1.5"/>';
      lbl.textContent = "Light";
      btn.style.background = "rgba(251,191,36,0.12)";
      btn.style.borderColor = "rgba(251,191,36,0.3)";
      usingFallbackTile = true;
      if (map.hasLayer(darkTile)) map.removeLayer(darkTile);
      if (!map.hasLayer(fallbackTile)) fallbackTile.addTo(map);
      if (!map.hasLayer(lightTile)) lightTile.addTo(map);
    } else {
      // Slide to left, show moon
      thumb.setAttribute("cx", "9");
      thumb.style.fill = "";
      iconInner.setAttribute("transform", "translate(23,9)");
      iconInner.innerHTML =
        '<path d="M3,-5 A6,6 0 1,0 3,5 A4,4 0 1,1 3,-5 Z" fill="currentColor" opacity="0.8" transform="scale(0.7)"/>';
      lbl.textContent = "Dark";
      btn.style.background = "rgba(128,128,128,0.1)";
      btn.style.borderColor = "";
      if (!map.hasLayer(fallbackTile)) fallbackTile.addTo(map);
      usingFallbackTile = true;
      if (map.hasLayer(lightTile)) map.removeLayer(lightTile);
      if (!map.hasLayer(darkTile)) darkTile.addTo(map);
    }

    // Rebuild active OWM overlays so theme-specific tile opacity/classes apply.
    LAYER_DEFS.filter((l) => l.type === "owm" && l.on).forEach((l) => {
      if (l.lyr && map.hasLayer(l.lyr)) map.removeLayer(l.lyr);
      l.lyr = owm(l.owmName);
      l.lyr.addTo(map);
    });

    // Rebuild velocity layer so particle contrast/colors adapt to theme.
    const velocityLayer = LAYER_DEFS.find((l) => l.id === "velocity");
    if (velocityLayer?.on) {
      loadVelocityLayer();
    }

    if (mapEl) mapEl.style.opacity = "1";
  }, 150);
}

// ══════════════════════════════════════════
// LOAD REAL WEATHER DATA ON STARTUP
// ══════════════════════════════════════════
// Show loading indicator
const loadingDiv = document.createElement("div");
loadingDiv.id = "realDataLoader";
loadingDiv.style.cssText =
  "position:fixed;bottom:72px;left:50%;transform:translateX(-50%);z-index:2000;background:rgba(15,22,41,0.95);border:1px solid rgba(59,130,246,0.3);border-radius:10px;padding:8px 16px;display:flex;align-items:center;gap:8px;backdrop-filter:blur(10px);";
loadingDiv.innerHTML =
  '<div style="width:10px;height:10px;border:2px solid rgba(59,130,246,0.3);border-top-color:#3b82f6;border-radius:50%;animation:spin 0.8s linear infinite"></div><span style="font-size:11px;color:#94a3b8;font-family:DM Sans,sans-serif;">Fetching real weather data…</span>';
document.body.appendChild(loadingDiv);

loadRealData()
  .then(() => {
    const el = document.getElementById("realDataLoader");
    if (el) {
      el.innerHTML =
        '<span style="font-size:11px;color:#22c55e;font-family:DM Sans,sans-serif;">✓ Live weather data loaded</span>';
      setTimeout(() => el.remove(), 2500);
    }
  })
  .catch(() => {
    const el = document.getElementById("realDataLoader");
    if (el) setTimeout(() => el.remove(), 1000);
  });

// Refresh real data every 10 minutes
setInterval(() => loadRealData().catch(() => {}), 10 * 60 * 1000);

// Load real AQI from backend immediately and every 15 min
let aqiSyncIntervalId = null;
function startAqiSyncWhenReady(attempt = 0) {
  if (typeof loadRealAQI === "function") {
    loadRealAQI().catch(() => {});
    if (!aqiSyncIntervalId) {
      aqiSyncIntervalId = setInterval(
        () => loadRealAQI().catch(() => {}),
        15 * 60 * 1000,
      );
    }
    return;
  }
  if (attempt >= 40) return;
  setTimeout(() => startAqiSyncWhenReady(attempt + 1), 250);
}
startAqiSyncWhenReady();
// Keep alerts/ticker consistent with map stats and active layers.
refreshFireHotspotCount(true).then(() => updateStats());
setInterval(
  () => refreshFireHotspotCount(true).then(() => updateStats()),
  2 * 60 * 1000,
);

// ══════════════════════════════════════════
// PROVINCE BOUNDARIES
// ══════════════════════════════════════════
let provinceBoundaryLayer = null;
let districtBoundaryLayer = null;
let selectedProvinceOverlay = null;

function normalizeProvinceName(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/province|pradesh|prades|state/gi, "")
    .replace(/[^a-z]/g, "")
    .trim();
}

function provinceIdFromFeature(feature) {
  const p = feature?.properties || {};
  const rawName =
    p.PROVINCE ||
    p.province ||
    p.PROV_NAME ||
    p.NAME_1 ||
    p.name ||
    p.ADMIN ||
    "";
  const n = normalizeProvinceName(rawName);
  const mapNameToId = {
    koshi: 1,
    madhesh: 2,
    bagmati: 3,
    gandaki: 4,
    lumbini: 5,
    karnali: 6,
    sudurpashchim: 7,
    sudurpaschim: 7,
    sudur: 7,
  };
  return mapNameToId[n] || Number(p.id) || 0;
}

function refreshProvinceBoundaryStyles() {
  if (!provinceBoundaryLayer) return;
  const isLight = document.body.classList.contains("light");
  provinceBoundaryLayer.eachLayer((layer) => {
    const provinceId = layer.feature?.properties?._wnProvinceId || 0;
    const selected = activeProvince !== 0 && provinceId === activeProvince;
    const color = PROVINCE_COLORS[provinceId] || "#2563eb";
    // Light theme: use darker fill; dark theme: use light outline
    layer.setStyle({
      fillColor: selected ? color : isLight ? "#475569" : "#1e3a5f",
      fillOpacity: selected ? (isLight ? 0.22 : 0.26) : isLight ? 0.08 : 0.08,
      color: selected ? color : isLight ? "#60a5fa" : "#60a5fa",
      weight: selected ? (isLight ? 2.4 : 2.6) : isLight ? 1.6 : 1.4,
      opacity: selected ? 0.96 : isLight ? 0.58 : 0.42,
    });
    if (selected) layer.bringToFront();
  });
  syncSelectedProvinceOverlay();
}

function normalizeDistrictName(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/district|jilla|zilla/gi, "")
    .replace(/[^a-z]/g, "")
    .trim();
}

const DISTRICT_ALIAS = {
  kavre: "kavrepalanchok",
  nawalpureast: "nawalpur",
  rukumeast: "rukumeast",
  rukumwest: "rukum",
  parsinawal: "parasi",
};

function districtIdFromFeature(feature) {
  const p = feature?.properties || {};
  const rawName =
    p.DISTRICT || p.district || p.NAME_2 || p.NAME || p.name || p.ADM2_EN || "";
  const n = normalizeDistrictName(rawName);
  const canonical = DISTRICT_ALIAS[n] || n;
  for (const [district, provinceId] of Object.entries(PROVINCE_OF)) {
    if (normalizeDistrictName(district) === canonical) return provinceId;
  }
  return 0;
}

function refreshDistrictBoundaryStyles() {
  if (!districtBoundaryLayer) return;
  const isLight = document.body.classList.contains("light");
  districtBoundaryLayer.eachLayer((layer) => {
    const provinceId = layer.feature?.properties?._wnProvinceId || 0;
    const selected =
      activeProvince !== 0 && provinceId && provinceId === activeProvince;
    layer.setStyle({
      fillOpacity: 0,
      color: selected
        ? isLight
          ? "#2563eb"
          : "#f8fafc"
        : isLight
          ? "#60a5fa"
          : "#cbd5e1",
      weight: selected ? (isLight ? 2.1 : 1.6) : isLight ? 1.2 : 0.9,
      opacity: selected ? (isLight ? 0.9 : 0.7) : isLight ? 0.45 : 0.3,
    });
    if (selected) layer.bringToFront();
  });
}

function syncSelectedProvinceOverlay() {
  if (selectedProvinceOverlay) {
    map.removeLayer(selectedProvinceOverlay);
    selectedProvinceOverlay = null;
  }
  if (!provinceBoundaryLayer || activeProvince === 0) return;

  let selectedFeature = null;
  provinceBoundaryLayer.eachLayer((layer) => {
    if ((layer.feature?.properties?._wnProvinceId || 0) === activeProvince) {
      selectedFeature = layer.feature;
    }
  });
  if (!selectedFeature) return;

  const isLight = document.body.classList.contains("light");
  const color = PROVINCE_COLORS[activeProvince] || "#2563eb";
  selectedProvinceOverlay = L.geoJSON(selectedFeature, {
    interactive: false,
    style: {
      fillColor: color,
      fillOpacity: isLight ? 0.14 : 0.2,
      color: isLight ? "#2563eb" : color,
      weight: isLight ? 3.2 : 2.8,
      opacity: isLight ? 0.9 : 0.96,
    },
  }).addTo(map);
  selectedProvinceOverlay.bringToFront();
}

(async () => {
  try {
    const urls = [
      "https://raw.githubusercontent.com/mesaugat/geoJSON-Nepal/master/nepal-states.geojson",
      "https://mesaugat.github.io/geoJSON-Nepal/nepal-states.geojson",
    ];
    let geo = null;
    for (const url of urls) {
      try {
        const r = await fetch(url);
        if (r.ok) {
          geo = await r.json();
          break;
        }
      } catch (e) {
        continue;
      }
    }
    if (!geo) return;

    provinceBoundaryLayer = L.geoJSON(geo, {
      style: {
        fillColor: "#1e3a5f",
        fillOpacity: 0.08,
        color: "#60a5fa",
        weight: 1.4,
        opacity: 0.42,
      },
      onEachFeature: (f, layer) => {
        const provinceId = provinceIdFromFeature(f);
        if (!f.properties) f.properties = {};
        f.properties._wnProvinceId = provinceId;
        layer.on("mouseover", () => {
          const selected =
            activeProvince !== 0 && provinceId === activeProvince;
          layer.setStyle({
            fillOpacity: selected ? 0.3 : 0.2,
            weight: selected ? 2.8 : 2.1,
          });
        });
        layer.on("mouseout", () => refreshProvinceBoundaryStyles());
      },
    }).addTo(map);

    refreshProvinceBoundaryStyles();
  } catch {}
})();

// Initialize legend on page load
refreshLegendForActiveLayers();

(async () => {
  try {
    const urls = [
      "https://raw.githubusercontent.com/mesaugat/geoJSON-Nepal/master/nepal-districts-new.geojson",
      "https://raw.githubusercontent.com/mesaugat/geoJSON-Nepal/master/nepal-districts.geojson",
      "https://mesaugat.github.io/geoJSON-Nepal/nepal-districts-new.geojson",
      "https://mesaugat.github.io/geoJSON-Nepal/nepal-districts.geojson",
    ];
    let geo = null;
    for (const url of urls) {
      try {
        const r = await fetch(url);
        if (r.ok) {
          geo = await r.json();
          break;
        }
      } catch (e) {
        continue;
      }
    }
    if (!geo) return;

    districtBoundaryLayer = L.geoJSON(geo, {
      interactive: false,
      style: {
        fillOpacity: 0,
        color: "#e2e8f0",
        weight: 1.2,
        opacity: 0.5,
      },
      onEachFeature: (f, layer) => {
        const provinceId = districtIdFromFeature(f);
        if (!f.properties) f.properties = {};
        f.properties._wnProvinceId = provinceId;
      },
    }).addTo(map);

    refreshDistrictBoundaryStyles();
  } catch {}
})();
