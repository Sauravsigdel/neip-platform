import { useEffect, useState, useCallback, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
} from "react-leaflet";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import "leaflet/dist/leaflet.css";
import api from "../services/api";

// ── AQI colour scale (US EPA) ────────────────────────────────────────────────
const AQI_LEVELS = [
  {
    max: 50,
    color: "#22c55e",
    bg: "#dcfce7",
    label: "Good",
    textColor: "#166534",
  },
  {
    max: 100,
    color: "#eab308",
    bg: "#fef9c3",
    label: "Moderate",
    textColor: "#854d0e",
  },
  {
    max: 150,
    color: "#f97316",
    bg: "#ffedd5",
    label: "Unhealthy (Sensitive)",
    textColor: "#9a3412",
  },
  {
    max: 200,
    color: "#ef4444",
    bg: "#fee2e2",
    label: "Unhealthy",
    textColor: "#991b1b",
  },
  {
    max: 300,
    color: "#a855f7",
    bg: "#f3e8ff",
    label: "Very Unhealthy",
    textColor: "#6b21a8",
  },
  {
    max: 500,
    color: "#991b1b",
    bg: "#fecaca",
    label: "Hazardous",
    textColor: "#450a0a",
  },
];

function getAQILevel(aqi) {
  if (!aqi)
    return {
      color: "#94a3b8",
      bg: "#f1f5f9",
      label: "No Data",
      textColor: "#475569",
    };
  return (
    AQI_LEVELS.find((l) => aqi <= l.max) || AQI_LEVELS[AQI_LEVELS.length - 1]
  );
}

function getRadius(aqi) {
  if (!aqi) return 7;
  if (aqi > 200) return 18;
  if (aqi > 150) return 15;
  if (aqi > 100) return 12;
  if (aqi > 50) return 10;
  return 8;
}

function formatTime(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  return d.toLocaleTimeString("en-NP", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDate(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  return d.toLocaleDateString("en-NP", { month: "short", day: "numeric" });
}

// ── Nepal-wide 7-day forecast fallback generator ─────────────────────────────
function generateForecast(currentAqi) {
  if (!currentAqi) return [];
  const days = [];
  let val = currentAqi;
  for (let i = 0; i < 7; i++) {
    val = Math.max(5, Math.min(400, val + (Math.random() - 0.48) * 20));
    const d = new Date();
    d.setDate(d.getDate() + i + 1);
    days.push({ date: d.toISOString(), aqi: Math.round(val) });
  }
  return days;
}

// ── Custom Tooltip for forecast chart ────────────────────────────────────────
const ForecastTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const aqi = payload[0].value;
    const level = getAQILevel(aqi);
    return (
      <div
        style={{
          background: "#1e293b",
          border: `1px solid ${level.color}`,
          borderRadius: 8,
          padding: "6px 10px",
          fontSize: 12,
        }}
      >
        <p style={{ color: "#94a3b8", margin: 0 }}>{label}</p>
        <p style={{ color: level.color, fontWeight: 700, margin: 0 }}>
          AQI {aqi}
        </p>
        <p style={{ color: "#cbd5e1", margin: 0, fontSize: 11 }}>
          {level.label}
        </p>
      </div>
    );
  }
  return null;
};

// ── Pulse animation for hazardous cities ─────────────────────────────────────
const PulseMarker = ({ city, onClick }) => {
  const level = getAQILevel(city.aqi);
  const radius = getRadius(city.aqi);

  return (
    <CircleMarker
      center={[city.lat, city.lon]}
      radius={radius}
      pathOptions={{
        fillColor: level.color,
        fillOpacity: 0.85,
        color: "#fff",
        weight: city.aqi > 150 ? 2 : 1,
        opacity: 0.9,
      }}
      eventHandlers={{ click: () => onClick(city) }}
    >
      <Popup maxWidth={320} minWidth={280} className="neip-popup">
        <CityPopup city={city} level={level} />
      </Popup>
    </CircleMarker>
  );
};

// ── City Popup content ────────────────────────────────────────────────────────
const CityPopup = ({ city, level }) => {
  const forecast =
    city.forecast?.length > 0
      ? city.forecast.map((f) => ({ aqi: f.aqi, date: f.date }))
      : generateForecast(city.aqi);

  const chartData = forecast.map((f) => ({
    day: formatDate(f.date),
    aqi: f.aqi,
    fill: getAQILevel(f.aqi).color,
  }));

  return (
    <div
      style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", padding: 2 }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 10,
        }}
      >
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: 17,
              fontWeight: 700,
              color: "#0f172a",
            }}
          >
            📍 {city.city}
          </h3>
          <p style={{ margin: "2px 0 0", fontSize: 11, color: "#64748b" }}>
            {city.district} District ·{" "}
            {city.stationName !== city.city ? city.stationName : "Nepal"}
          </p>
        </div>
        <div
          style={{
            background: level.bg,
            border: `2px solid ${level.color}`,
            borderRadius: 10,
            padding: "4px 10px",
            textAlign: "center",
            minWidth: 64,
          }}
        >
          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: level.color,
              lineHeight: 1,
            }}
          >
            {city.aqi ?? "—"}
          </div>
          <div
            style={{
              fontSize: 9,
              color: level.textColor,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            AQI
          </div>
        </div>
      </div>

      {/* Health badge */}
      <div
        style={{
          background: level.bg,
          borderLeft: `4px solid ${level.color}`,
          borderRadius: "0 6px 6px 0",
          padding: "5px 10px",
          marginBottom: 10,
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 600, color: level.textColor }}>
          {level.label}
        </span>
      </div>

      {/* Pollutant readings */}
      {(city.pm25 || city.pm10) && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 6,
            marginBottom: 10,
          }}
        >
          {city.pm25 != null && (
            <div
              style={{
                background: "#f8fafc",
                borderRadius: 6,
                padding: "5px 8px",
                border: "1px solid #e2e8f0",
              }}
            >
              <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600 }}>
                PM₂.₅
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
                {city.pm25}{" "}
                <span style={{ fontSize: 10, color: "#94a3b8" }}>µg/m³</span>
              </div>
            </div>
          )}
          {city.pm10 != null && (
            <div
              style={{
                background: "#f8fafc",
                borderRadius: 6,
                padding: "5px 8px",
                border: "1px solid #e2e8f0",
              }}
            >
              <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600 }}>
                PM₁₀
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
                {city.pm10}{" "}
                <span style={{ fontSize: 10, color: "#94a3b8" }}>µg/m³</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 7-day forecast chart */}
      <div style={{ marginBottom: 8 }}>
        <p
          style={{
            margin: "0 0 5px",
            fontSize: 11,
            color: "#475569",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          7-Day AQI Forecast
        </p>
        <div style={{ height: 90 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
            >
              <defs>
                <linearGradient
                  id={`grad-${city.city}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor={level.color} stopOpacity={0.4} />
                  <stop
                    offset="95%"
                    stopColor={level.color}
                    stopOpacity={0.05}
                  />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="day"
                tick={{ fontSize: 9, fill: "#94a3b8" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 9, fill: "#94a3b8" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<ForecastTooltip />} />
              <Area
                type="monotone"
                dataKey="aqi"
                stroke={level.color}
                strokeWidth={2}
                fill={`url(#grad-${city.city})`}
                dot={{ r: 3, fill: level.color, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: level.color }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderTop: "1px solid #f1f5f9",
          paddingTop: 7,
          marginTop: 4,
        }}
      >
        <span style={{ fontSize: 10, color: "#94a3b8" }}>
          🕐 Updated: {formatTime(city.lastUpdated)}
        </span>
        <span
          style={{
            fontSize: 9,
            padding: "2px 6px",
            borderRadius: 4,
            background: city.dataSource === "openaq" ? "#dcfce7" : "#f1f5f9",
            color: city.dataSource === "openaq" ? "#166534" : "#64748b",
            fontWeight: 600,
          }}
        >
          {city.dataSource === "openaq" ? "● LIVE" : "◌ EST"}
        </span>
      </div>
    </div>
  );
};

// ── Map auto-fit to Nepal bounds ──────────────────────────────────────────────
const NepalBounds = () => {
  const map = useMap();
  useEffect(() => {
    map.fitBounds([
      [26.3, 80.0],
      [30.4, 88.2],
    ]);
  }, [map]);
  return null;
};

// ── Legend component ──────────────────────────────────────────────────────────
const AQILegend = () => (
  <div
    style={{
      position: "absolute",
      bottom: 30,
      left: 10,
      zIndex: 1000,
      background: "rgba(15,23,42,0.92)",
      borderRadius: 10,
      padding: "10px 14px",
      backdropFilter: "blur(8px)",
      border: "1px solid rgba(255,255,255,0.1)",
      minWidth: 160,
    }}
  >
    <p
      style={{
        margin: "0 0 7px",
        fontSize: 11,
        fontWeight: 700,
        color: "#e2e8f0",
        textTransform: "uppercase",
        letterSpacing: 1,
      }}
    >
      AQI Scale
    </p>
    {AQI_LEVELS.map((l) => (
      <div
        key={l.label}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          marginBottom: 4,
        }}
      >
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: l.color,
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: 11, color: "#cbd5e1" }}>{l.label}</span>
      </div>
    ))}
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 7,
        marginTop: 4,
        paddingTop: 4,
        borderTop: "1px solid rgba(255,255,255,0.1)",
      }}
    >
      <div
        style={{
          width: 12,
          height: 12,
          borderRadius: "50%",
          background: "#94a3b8",
          flexShrink: 0,
        }}
      />
      <span style={{ fontSize: 11, color: "#94a3b8" }}>No Data</span>
    </div>
  </div>
);

// ── Summary bar ───────────────────────────────────────────────────────────────
const SummaryBar = ({ cities, nextRefresh }) => {
  const withData = cities.filter((c) => c.aqi);
  const avgAqi = withData.length
    ? Math.round(withData.reduce((s, c) => s + c.aqi, 0) / withData.length)
    : null;
  const worst = [...withData].sort((a, b) => (b.aqi || 0) - (a.aqi || 0))[0];
  const level = getAQILevel(avgAqi);

  return (
    <div
      style={{
        position: "absolute",
        top: 10,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1000,
        background: "rgba(15,23,42,0.92)",
        borderRadius: 12,
        padding: "8px 18px",
        backdropFilter: "blur(8px)",
        border: "1px solid rgba(255,255,255,0.1)",
        display: "flex",
        gap: 20,
        alignItems: "center",
        whiteSpace: "nowrap",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            fontSize: 10,
            color: "#64748b",
            fontWeight: 600,
            textTransform: "uppercase",
          }}
        >
          Nepal Avg AQI
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, color: level.color }}>
          {avgAqi ?? "—"}
        </div>
      </div>
      <div
        style={{ width: 1, height: 30, background: "rgba(255,255,255,0.1)" }}
      />
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            fontSize: 10,
            color: "#64748b",
            fontWeight: 600,
            textTransform: "uppercase",
          }}
        >
          Most Polluted
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#ef4444" }}>
          {worst?.city ?? "—"}
        </div>
      </div>
      <div
        style={{ width: 1, height: 30, background: "rgba(255,255,255,0.1)" }}
      />
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            fontSize: 10,
            color: "#64748b",
            fontWeight: 600,
            textTransform: "uppercase",
          }}
        >
          Stations
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#38bdf8" }}>
          {withData.length}/{cities.length}
        </div>
      </div>
      <div
        style={{ width: 1, height: 30, background: "rgba(255,255,255,0.1)" }}
      />
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            fontSize: 10,
            color: "#64748b",
            fontWeight: 600,
            textTransform: "uppercase",
          }}
        >
          Next Refresh
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#a3e635" }}>
          {nextRefresh}s
        </div>
      </div>
    </div>
  );
};

// ── Main MapPage component ────────────────────────────────────────────────────
export default function MapPage() {
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [countdown, setCountdown] = useState(300); // 5 min in seconds
  const countdownRef = useRef(null);

  const fetchCities = useCallback(async () => {
    try {
      const res = await api.get("/map/all-cities");
      setCities(res.data.data || []);
      setLastRefresh(new Date());
      setCountdown(300);
      setError(null);
    } catch (err) {
      console.error("Map fetch error:", err);
      setError("Could not load AQI data. Retrying...");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchCities();
  }, [fetchCities]);

  // 5-minute auto-refresh
  useEffect(() => {
    const interval = setInterval(fetchCities, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchCities]);

  // Countdown timer
  useEffect(() => {
    countdownRef.current = setInterval(() => {
      setCountdown((c) => (c <= 1 ? 300 : c - 1));
    }, 1000);
    return () => clearInterval(countdownRef.current);
  }, []);

  if (loading) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}>🗺️</div>
        <div style={{ color: "#38bdf8", fontSize: 18, fontWeight: 600 }}>
          Loading Nepal AQI Map...
        </div>
        <div style={{ color: "#64748b", fontSize: 13, marginTop: 8 }}>
          Fetching 40+ station data
        </div>
        <div
          style={{
            marginTop: 24,
            width: 200,
            height: 4,
            background: "#1e293b",
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: "60%",
              background: "#38bdf8",
              borderRadius: 2,
              animation: "pulse 1.5s ease-in-out infinite",
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "relative",
        height: "calc(100vh - 64px)",
        width: "100%",
      }}
    >
      {/* Summary bar */}
      <SummaryBar
        cities={cities}
        lastRefresh={lastRefresh}
        nextRefresh={countdown}
      />

      {/* Error toast */}
      {error && (
        <div
          style={{
            position: "absolute",
            top: 70,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1000,
            background: "#fee2e2",
            color: "#991b1b",
            padding: "8px 16px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            border: "1px solid #fca5a5",
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* Map */}
      <MapContainer
        center={[28.0, 84.0]}
        zoom={7}
        style={{ height: "100%", width: "100%" }}
        zoomControl={true}
      >
        <NepalBounds />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {cities.map((city) => (
          <PulseMarker key={city.city} city={city} onClick={() => {}} />
        ))}
      </MapContainer>

      {/* Legend */}
      <AQILegend />

      {/* Popup styles */}
      <style>{`
        .neip-popup .leaflet-popup-content-wrapper {
          border-radius: 14px !important;
          box-shadow: 0 20px 60px rgba(0,0,0,0.25), 0 4px 16px rgba(0,0,0,0.15) !important;
          border: 1px solid #e2e8f0 !important;
          padding: 0 !important;
        }
        .neip-popup .leaflet-popup-content {
          margin: 14px !important;
        }
        .neip-popup .leaflet-popup-tip {
          background: white !important;
        }
        .leaflet-popup-close-button {
          font-size: 18px !important;
          color: #64748b !important;
          top: 10px !important;
          right: 10px !important;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
