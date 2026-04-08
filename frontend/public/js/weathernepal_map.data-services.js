// ── FIRE HOTSPOT LAYER ────────────────────────────────────────
fireMarkers = [];
async function loadFireLayer() {
  // Remove existing
  fireMarkers.forEach((m) => map.removeLayer(m));
  fireMarkers = [];
  const l = LAYER_DEFS.find((x) => x.id === "fire");
  if (!l || !l.on) return;
  try {
    const res = await fetch(`${CFG.API}/fire/hotspots`);
    if (!res.ok) return;
    const data = await res.json();
    if (!data.hotspots || !data.hotspots.length) {
      return;
    }
    data.hotspots.forEach((h) => {
      const col =
        h.confidence === "high"
          ? "#ef4444"
          : h.confidence === "nominal"
            ? "#f97316"
            : "#eab308";
      const size = h.frp > 50 ? 18 : h.frp > 20 ? 14 : 10;
      const icon = L.divIcon({
        html: `<svg width="${size}" height="${size}" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <circle cx="10" cy="10" r="9" fill="${col}" opacity="0.85" stroke="white" stroke-width="1.5"/>
              <text x="10" y="14" text-anchor="middle" font-size="10" fill="white">🔥</text>
            </svg>`,
        className: "",
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });
      const m = L.marker([h.lat, h.lon], {
        icon,
        title: `Fire (${h.confidence} confidence, FRP:${h.frp}MW)`,
      });
      m.bindPopup(`<div style="font-family:DM Sans,sans-serif;padding:6px;min-width:160px;background:#111827;color:#fff;border-radius:8px;">
            <div style="font-size:13px;font-weight:700;margin-bottom:4px;">🔥 Fire Hotspot</div>
            <div style="font-size:11px;color:#94a3b8;">Satellite: ${h.satellite}</div>
            <div style="font-size:11px;color:#94a3b8;">Confidence: <span style="color:${col};font-weight:700;">${h.confidence}</span></div>
            <div style="font-size:11px;color:#94a3b8;">FRP: ${h.frp} MW</div>
            <div style="font-size:11px;color:#94a3b8;">Detected: ${h.acqDate} ${h.acqTime}</div>
          </div>`);
      m.addTo(map);
      fireMarkers.push(m);
    });
  } catch (e) {
    console.error("[Fire] Load error:", e);
  }
}

// ── FETCH REAL AQI FROM BACKEND ────────────────────────────────
let officialStationMarkers = [];
let officialStationRecords = [];

function parseAqiValue(rawValue) {
  if (rawValue === null || rawValue === undefined) return null;
  const text = String(rawValue).trim();
  if (!text || text === "-" || text.toLowerCase() === "n/a") return null;
  const parsed = Number(text);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.round(parsed);
}

function inAqiLegendBand(aqi, idx) {
  if (!Number.isFinite(aqi) || aqi <= 0) return false;
  if (!Number.isInteger(idx)) return true;
  const min = idx === 0 ? 0 : LEVELS[idx - 1].max + 1;
  const max = LEVELS[idx]?.max ?? 500;
  return aqi >= min && aqi <= max;
}

function getActiveAqiBandIndex() {
  return Number.isInteger(window.__aqiLegendBandIndex)
    ? window.__aqiLegendBandIndex
    : null;
}

function resolveStationCity(record) {
  if (!record || !Array.isArray(CITIES) || !CITIES.length) return null;

  const cityName = String(record.city || "")
    .trim()
    .toLowerCase();
  const districtName = String(record.district || "")
    .trim()
    .toLowerCase();
  if (cityName) {
    const byCity = CITIES.find(
      (c) =>
        String(c.city || "")
          .trim()
          .toLowerCase() === cityName,
    );
    if (byCity) return byCity;
  }
  if (districtName) {
    const byDistrict = CITIES.find(
      (c) =>
        String(c.d || "")
          .trim()
          .toLowerCase() === districtName,
    );
    if (byDistrict) return byDistrict;
  }

  const lat = Number(record.lat);
  const lon = Number(record.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  let nearest = null;
  let bestDistSq = Number.POSITIVE_INFINITY;
  CITIES.forEach((c) => {
    const dLat = Number(c.lat) - lat;
    const dLon = Number(c.lon) - lon;
    const distSq = dLat * dLat + dLon * dLon;
    if (distSq < bestDistSq) {
      bestDistSq = distSq;
      nearest = c;
    }
  });
  return nearest;
}

function shouldShowOfficialStationPin(marker) {
  if (!marker) return false;

  if (!Number.isFinite(marker.stationAqi) || marker.stationAqi <= 0) {
    return false;
  }

  const selectedAqiBand = getActiveAqiBandIndex();
  const showByAqi = inAqiLegendBand(marker.stationAqi, selectedAqiBand);
  if (!showByAqi) return false;

  const cityRef = marker.cityRef || null;
  if (activeProvince !== 0 && cityRef?.province !== activeProvince)
    return false;

  if (Number.isInteger(searchFocusCityIndex)) {
    const focusedCity = CITIES[searchFocusCityIndex];
    if (!cityRef || focusedCity !== cityRef) return false;
  }

  return true;
}

function clearOfficialStationPins() {
  officialStationMarkers.forEach((m) => {
    if (map.hasLayer(m)) map.removeLayer(m);
  });
  officialStationMarkers = [];
}

function syncOfficialStationPinsVisibility() {
  const pinsOn = LAYER_DEFS.find((l) => l.id === "pins")?.on;
  officialStationMarkers.forEach((m) => {
    const show = pinsOn && shouldShowOfficialStationPin(m);
    if (show && !map.hasLayer(m)) m.addTo(map);
    if (!show && map.hasLayer(m)) map.removeLayer(m);
  });
}

function renderOfficialStationPins(records) {
  officialStationRecords = Array.isArray(records) ? records.slice() : [];
  clearOfficialStationPins();
  if (!Array.isArray(records) || !records.length) return;

  records.forEach((r) => {
    if (!Number.isFinite(Number(r.lat)) || !Number.isFinite(Number(r.lon)))
      return;
    const aqi = parseAqiValue(r.aqi);
    if (!Number.isFinite(aqi) || aqi <= 0) return;
    if (!inAqiLegendBand(aqi, getActiveAqiBandIndex())) return;
    const cityRef = resolveStationCity(r);
    const marker = L.marker([Number(r.lat), Number(r.lon)], {
      icon: mkPin(aqi),
      title: r.stationName || r.city || "AQI Station",
      riseOnHover: true,
    });
    marker.stationAqi = aqi;
    marker.cityRef = cityRef;
    marker.on("click", (e) => {
      L.DomEvent.stopPropagation(e);
      if (cityRef && typeof openDetail === "function") {
        openDetail(cityRef);
      }
    });
    officialStationMarkers.push(marker);
  });

  syncOfficialStationPinsVisibility();
}

if (typeof applyPinVisibility === "function" && !window.__officialPinsHooked) {
  const originalApplyPinVisibility = applyPinVisibility;
  applyPinVisibility = function () {
    originalApplyPinVisibility();
    syncOfficialStationPinsVisibility();
  };
  window.__officialPinsHooked = true;
}

if (!window.__officialAqiLegendCallbackBound) {
  window.__onAqiLegendFilterChange = function () {
    renderOfficialStationPins(officialStationRecords);
  };
  window.__officialAqiLegendCallbackBound = true;
}

if (
  typeof refreshLegendForActiveLayers === "function" &&
  !window.__officialLegendRefreshHooked
) {
  const originalRefreshLegendForActiveLayers = refreshLegendForActiveLayers;
  refreshLegendForActiveLayers = function () {
    originalRefreshLegendForActiveLayers();
    syncOfficialStationPinsVisibility();
  };
  window.__officialLegendRefreshHooked = true;
}

async function loadRealAQI() {
  const applyAqiRecords = (
    records,
    sourceLabel = "internal-db",
    opts = { skipIfManual: false },
  ) => {
    let updatedCount = 0;
    records.forEach((record) => {
      const idx = CITIES.findIndex(
        (c) => c.city === record.city || c.d === record.district,
      );
      if (idx >= 0) {
        if (opts.skipIfManual && CITIES[idx].aqiSource === "nepal-gov-manual") {
          return;
        }
        CITIES[idx].aqi = hasValidAqiValue(record.aqi)
          ? Math.round(record.aqi)
          : null;
        CITIES[idx].pm1 = record.pm1 ?? null;
        CITIES[idx].pm25 = record.pm25 ?? null;
        CITIES[idx].pm10 = record.pm10 ?? null;
        CITIES[idx].no2 = record.no2 ?? null;
        CITIES[idx].co = record.co ?? null;
        CITIES[idx].o3 = record.o3 ?? null;
        CITIES[idx].aqiSource = sourceLabel;
        CITIES[idx].hasAqi = hasValidAqiValue(CITIES[idx].aqi);
        updatedCount++;
      }
    });
    return updatedCount;
  };

  try {
    let updated = 0;

    const officialRes = await fetch(`${CFG.API}/map/official-aqi-latest`);
    if (officialRes.ok) {
      const officialData = await officialRes.json();
      if (officialData?.success && Array.isArray(officialData.data)) {
        updated += applyAqiRecords(officialData.data, "nepal-gov-manual");
      }
    }

    const stationRes = await fetch(
      `${CFG.API}/map/official-aqi-stations-latest`,
    );
    if (stationRes.ok) {
      const stationData = await stationRes.json();
      if (stationData?.success && Array.isArray(stationData.data)) {
        const visibleStationCount = stationData.data.filter((row) =>
          Number.isFinite(parseAqiValue(row?.aqi)),
        ).length;
        window.__useOfficialStationPins = visibleStationCount > 0;
        renderOfficialStationPins(stationData.data);
      } else {
        window.__useOfficialStationPins = false;
      }
    } else {
      window.__useOfficialStationPins = false;
    }

    const internalAqiRes = await fetch(`${CFG.API}/map/waqi-live-cities`);
    if (internalAqiRes.ok) {
      const internalAqiData = await internalAqiRes.json();
      if (internalAqiData?.success && Array.isArray(internalAqiData.data)) {
        updated += applyAqiRecords(internalAqiData.data, "internal-db", {
          skipIfManual: true,
        });
      }
    }

    if (updated > 0) {
      aqiH.setLatLngs(
        CITIES.filter((c) => hasValidAqiValue(c.aqi)).map((c) => [
          c.lat,
          c.lon,
          Math.min(getVisualAqi(c) / 300, 1),
        ]),
      );
      allMarkers.forEach((m, i) => {
        if (CITIES[i]) m.setIcon(mkPin(CITIES[i].aqi));
      });
      applyPinVisibility();
      updateStats();
    }
  } catch (e) {
    console.error("[AQI] Real data load error:", e);
  }
}

// ══════════════════════════════════════════
// PROVINCE FILTER
// ══════════════════════════════════════════
const PROVINCE_BBOX = {
  1: [
    [26.3, 86.5],
    [28.5, 88.2],
  ],
  2: [
    [26.2, 85.0],
    [27.2, 87.0],
  ],
  3: [
    [26.9, 84.5],
    [28.5, 86.5],
  ],
  4: [
    [27.8, 82.9],
    [29.2, 85.2],
  ],
  5: [
    [27.4, 82.0],
    [28.8, 84.5],
  ],
  6: [
    [28.2, 81.1],
    [30.1, 83.2],
  ],
  7: [
    [28.6, 79.9],
    [30.4, 82.3],
  ],
};

function toggleProvPanel() {
  const pnl = document.getElementById("provPnl");
  const fab = document.getElementById("provFab");
  const isOpen = pnl.classList.toggle("open");
  fab.style.opacity = isOpen ? "0" : "1";
  fab.style.pointerEvents = isOpen ? "none" : "auto";
  // Close map layer panel if open
  if (isOpen) {
    document.getElementById("lyPnl").classList.remove("open");
    document.getElementById("lyFab").style.opacity = "1";
    document.getElementById("lyFab").style.pointerEvents = "auto";
  }
}

function filterProvince(p) {
  activeProvince = p;

  // Update button styles with proper province colors
  for (let i = 0; i <= 7; i++) {
    const btn = document.getElementById("prov-" + i);
    if (!btn) continue;
    if (i === p) {
      btn.classList.add("active");
      if (p === 0) {
        btn.style.background = "rgba(59,130,246,0.25)";
        btn.style.color = "var(--text)";
      } else {
        const col = PROVINCE_COLORS[p];
        btn.style.background = col;
        btn.style.color = "#fff";
      }
    } else {
      btn.classList.remove("active");
      btn.style.background = "transparent";
      btn.style.color = "var(--text)";
    }
  }

  // Show/hide markers
  applyPinVisibility();

  refreshEventPins();
  renderTempPins();
  refreshProvinceBoundaryStyles();
  refreshDistrictBoundaryStyles();
  syncSelectedProvinceOverlay();

  // Fly to province bounds
  if (p === 0) {
    map.fitBounds(
      [
        [26.2, 80.0],
        [30.4, 88.2],
      ],
      { animate: true, duration: 0.8 },
    );
  } else if (PROVINCE_BBOX[p]) {
    map.fitBounds(PROVINCE_BBOX[p], {
      animate: true,
      duration: 0.8,
      padding: [20, 20],
    });
  }
  updateStats();
}
// Auto-login if token exists
(async () => {
  if (!authToken) return;
  try {
    const res = await fetch(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (res.ok) {
      const data = await res.json();
      if ((data?.user?.role || "user") !== "admin") {
        localStorage.removeItem("wn_token");
        authToken = null;
        return;
      }
      setLoggedIn({
        ...data.user,
        initials: data.user.name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2),
      });
    } else {
      localStorage.removeItem("wn_token");
      authToken = null;
    }
  } catch {}
})();
