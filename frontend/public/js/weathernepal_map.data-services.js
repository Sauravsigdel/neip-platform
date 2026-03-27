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
      async function loadRealAQI() {
        const applyAqiRecords = (
          records,
          sourceLabel = "waqi",
          opts = { skipIfManual: false },
        ) => {
          let updatedCount = 0;
          records.forEach((record) => {
            const idx = CITIES.findIndex(
              (c) => c.city === record.city || c.d === record.district,
            );
            if (idx >= 0) {
              if (
                opts.skipIfManual &&
                CITIES[idx].aqiSource === "nepal-gov-manual"
              ) {
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

          const waqiRes = await fetch(`${CFG.API}/map/waqi-live-cities`);
          if (waqiRes.ok) {
            const waqiData = await waqiRes.json();
            if (waqiData?.success && Array.isArray(waqiData.data)) {
              updated += applyAqiRecords(waqiData.data, "waqi", {
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
