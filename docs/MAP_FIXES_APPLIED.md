# WeatherNepal Map Issues - Complete Fix Guide

## Issues Fixed in This Update

### 1. ✅ City Pins Now Show (Even Without AQI)

**Problem:** City pins only appeared if they had valid AQI data, making the map look empty on startup while data was loading.

**Fix Applied:** Modified `shouldShowCityPin()` function to show pins for all cities in the active province, regardless of AQI status. Pins update dynamically as real data arrives.

**File:** [frontend/public/js/weathernepal_map.layers.js](frontend/public/js/weathernepal_map.layers.js#L1524)

---

### 2. ✅ District Boundaries Now Visible

**Problem:** District overlay lines were nearly invisible due to:

- Wrong color (#cbd5e1 = too light gray)
- Too thin weight (0.9)
- Too low opacity (0.3)

**Fixes Applied:**

- Increased color to #e2e8f0 (slightly darker)
- Increased weight to 1.2
- Increased opacity to 0.5
- Light theme: color #1e293b, weight 1.8, opacity 0.7

**Files:** [frontend/public/js/weathernepal_map.layers.js](frontend/public/js/weathernepal_map.layers.js#L2110-L2130)

---

### 3. ✅ Light Theme Province/District Overlays Enhanced

**Problem:** Light theme made overlays hard to distinguish from light map background.

**Fixes Applied:**

- Province boundaries: darker fill (#475569 → matching district approach) when not selected
- Better contrast colors for both selected and unselected states
- Increased weight and opacity for visibility

**Files:** [frontend/public/js/weathernepal_map.layers.js](frontend/public/js/weathernepal_map.layers.js#L2053-L2075)

---

### 4. ✅ Temperature Pins Now Interactive with Full Forecast

**Problem:** Temperature pins were non-interactive (`interactive: false`) and couldn't show forecast details.

**Fixes Applied:**

- Changed `interactive: true`
- Added click event listener to call `openDetail(city)` - same as AQI pins
- Added cursor pointer to template
- Added `riseOnHover` for visual feedback
- Now displays same detailed forecast panel as AQI/City pins

**Result:** Click any temperature pin to see:

- 24-hour temperature chart
- 7-day forecast
- Current AQI & weather data
- Advisory text

**Files:** [frontend/public/js/weathernepal_map.layers.js](frontend/public/js/weathernepal_map.layers.js#L1150-L1187)

---

## What You Need to Do Now

### 1. Hard Refresh Browser

- Windows: `Ctrl + Shift + R`
- Mac: `Cmd + Shift + R`

This clears cached JavaScript and ensures new pin logic loads.

### 2. Wait for Data to Load

- City pins should appear within ~5 seconds (unfilled/gray while awaiting AQI data)
- Districts overlay should be visible in both themes
- Watch the map status bar at bottom-right for "Real weather data loaded"

### 3. Test Features

**City Pins:**

- ✓ Pins should be visible even before real data loads
- ✓ Click any pin → sees full forecast + weather data
- ✓ Pin color updates as real AQI data arrives

**District Overlay:**

- ✓ Dark theme: light blue lines on dark map
- ✓ Light theme: dark gray lines on light map
- ✓ Line weight is clearly visible
- ✓ Province selection highlights correctly

**Temperature Pins:**

- ✓ Toggle "Temperature Pins" in layers panel
- ✓ Pink/blue/green badges appear on map
- ✓ **Click any temperature pin** → Forecast detail panel opens
- ✓ Shows same info as AQI pins (24h chart, 7-day forecast)

---

## If Light Theme Still Shows Dark Map

This happens when lightweight tiles fail to load. Solution:

**Option A: Use Fallback Tiles (Recommended)**

- Map will auto-switch to OpenStreetMap fallback
- Overlays remain visible
- No action needed; happens automatically

**Option B: Add OWM_KEY for Light Tiles**
In `backend/.env`:

```env
OWM_KEY=your_key_here
```

Then restart backend: `npm start`

Light tiles will then load directly from OpenWeather in light mode.

---

## Code Changes Summary

Three core modifications were made:

### Change 1: Show All City Pins

```javascript
// Before: Only showed pins with valid AQI
if (!hasCityHomeData(city)) return false;

// After: Show all pins, let them fill in as data arrives
// (removed AQI requirement)
```

### Change 2: Better District Boundaries

```javascript
// Initial style (when loading from GeoJSON):
style: {
  color: "#e2e8f0",    // was: #cbd5e1 (too light)
  weight: 1.2,         // was: 0.9   (too thin)
  opacity: 0.5,        // was: 0.3   (too faded)
}

// Light theme refresh:
color: isLight ? "#1e293b" : "#cbd5e1",    // darker for light BG
weight: isLight ? 1.8 : 0.9,               // thicker in light mode
opacity: isLight ? 0.7 : 0.3,              // more opaque in light mode
```

### Change 3: Interactive Temperature Pins

```javascript
// Before: interactive: false
// After:
const m = L.marker([c.lat, c.lon], {
  icon,
  interactive: true, // NOW CLICKABLE
  riseOnHover: true,
});
m.on("click", (e) => {
  // NEW: Click handler
  L.DomEvent.stopPropagation(e);
  openDetail(c); // Shows forecast panel
});
```

---

## Troubleshooting

### City pins still not showing?

1. Check browser console (F12) for loading errors
2. Verify backend is running: `curl http://localhost:5000/api/health`
3. Hard refresh page again
4. Check backend logs for data load errors

### Temperature pins lag when clicking?

- Normal if forecast data is generating (first time)
- Should be instant on second click
- Check backend: `/api/weather/latest` endpoint responds quickly

### Light theme shows dark map tiles?

- Fallback tiles auto-activate if OWM unavailable
- This is expected behavior
- District overlays remain visible over fallback

### District lines barely visible?

- Try zooming in/out to trigger Leaflet redraw
- Toggle layer on/off in Map Layers panel
- Hard refresh and try again

---

## Feature Verification Checklist

Use this to verify everything works:

- [ ] Hard refreshed (Ctrl+Shift+R)
- [ ] City pins visible on map load
- [ ] Click city pin → detail panel opens
- [ ] Switch to light theme → overlays visible
- [ ] Toggle "Temperature Pins" in layers panel
- [ ] Click temperature pin → shows forecast (same as AQI)
- [ ] District lines clearly visible in both themes
- [ ] Province selection highlights correctly
- [ ] All stats at bottom-right show real data

If ALL boxes are checked, all fixes are working! 🎉

---

**Questions?** Check the main [TROUBLESHOOTING_SETUP.md](TROUBLESHOOTING_SETUP.md) for admin setup, data configuration, and API key setup.
