# WeatherNepal Troubleshooting & Setup Guide

## Issue 1: Light Theme - Nepal Districts Overlay Not Visible

**FIXED** ✓ Updated layer styling for light theme visibility

### What was wrong:

- Light theme boundaries had nearly-white fill color (#f8fafc) against light background
- District borders were too thin/transparent

### What was fixed:

- Changed light theme fill colors to darker shades (#475569)
- Increased opacity and weight for visibility
- Updated boundary stroke colors appropriately

**No action needed** - the fix has been applied to `frontend/public/js/weathernepal_map.layers.js`

---

## Issue 2: Create Admin User

Since you deleted all user data, follow these steps:

### Quick Start (Recommended):

```bash
cd backend
npm install  # if not done yet
node scripts/seed-admin.js
```

**Credentials created:**

- Email: `sauravsigdel00000@gmail.com`
- Password: `Admin@123456`
- ⚠️ **IMPORTANT**: Change password after first login!

### What the script does:

1. Connects to MongoDB (using MONGO_URI from .env)
2. Checks if admin already exists (won't duplicate)
3. Creates verified admin user with role="admin"
4. Confirms creation with output

### If you need to create manually in MongoDB:

```javascript
// Connection string: mongodb://127.0.0.1:27017/weathernepal

// Document:
{
  "name": "Admin User",
  "email": "sauravsigdel00000@gmail.com",
  "password": "$2a$12$YOUR_BCRYPT_HASH",  // Use bcrypt.hash("Admin@123456", 12)
  "location": "Kathmandu",
  "district": "Kathmandu",
  "lat": 27.7172,
  "lon": 85.324,
  "avatarIndex": 1,
  "avatarColor": "#2563eb",
  "isVerified": true,
  "role": "admin",
  "alerts": {
    "aqi": true,
    "rain": true,
    "wind": false,
    "snow": false,
    "temp": false,
    "daily": true
  },
  "createdAt": new Date()
}
```

---

## Issue 3: OpenWeather (OWM) Map Overlays Not Showing

### Root Cause:

OWM Tile layers require:

1. OpenWeather API key configured
2. Backend proxy endpoint working
3. Tiles to be manually enabled (they default to OFF)

### Prerequisites - Set Environment Variables:

In `backend/.env`:

```env
OWM_KEY=your_openweather_api_key_here
# Get a free key at: https://openweathermap.org/api
```

### Step-by-Step:

1. **Get OpenWeather API Key**
   - Visit: https://openweathermap.org/api
   - Sign up for free (5-day free tier included)
   - Copy your API key

2. **Add to backend/.env**

   ```env
   OWM_KEY=5a1b2c3d4e5f6a7b8c9d0e1f
   ```

3. **Restart Backend**

   ```bash
   cd backend
   npm start
   ```

4. **Enable Layers on Map**
   - Click the **Filter** icon (top-right) to open **MAP LAYERS** panel
   - Toggle ON:
     - ☁️ Clouds (OWM)
     - 🌦️ Precip (OWM)
     - 🌀 Wind (OWM)
     - 🔥 Temp (OWM)

### How it Works:

- Backend proxy at `/api/owm-tile/:layer/:z/:x/:y.png` fetches tiles from OpenWeather
- Frontend calls your backend instead of OpenWeather directly
- Cache-Control header (600s) prevents excessive requests

### Troubleshooting OWM:

**Tiles not loading?**

- Check browser Network tab for 5xx errors on `/api/owm-tile/`
- Ensure OWM_KEY is valid and in `.env`
- Check backend logs: `[owmProxy]` or `[Tile fetch failed]`

**Rate limiting?**

- OpenWeather free tier: 60 calls/min, 1M/month
- Each tile load = 1 API call
- Zoom out to reduce tile requests
- Use a paid tier for higher limits

---

## Issue 4: NASA Fire Hotspots Not Showing

### Root Cause:

Fire hotspots require NASA FIRMS data sync and proper configuration

### Prerequisites - Set Environment Variables:

In `backend/.env`:

```env
# NASA FIRMS does not require API key - uses public data
# But you need internet access for the backend to fetch
NASA_FIRMS_ENABLED=true  # optional, defaults to enabled
```

### Step-by-Step:

1. **Ensure Backend is Running**

   ```bash
   cd backend
   npm start
   ```

2. **Enable Fire Layer on Map**
   - Click the **Filter** icon to open **MAP LAYERS** panel
   - Toggle ON: 🔥 **Fire Hotspots**

3. **Data Sync Schedule**
   - Fires sync every **3 hours**
   - Last sync time is shown at bottom of map
   - Manual refresh: The backend data sync runs on startup

### How it Works:

- Backend fetches fire data every 3 hours from NASA FIRMS
- Data is stored in `FireHotspot` collection with 3-hour TTL
- API endpoint: `/api/fire/hotspots` returns latest detections
- Map renders each hotspot as a colored marker (confidence-based:red=high, orange=nominal, yellow=low)

### Troubleshooting Fire Data:

**No hotspots showing?**

- Check backend logs for `[Fire]` or `[DataSync]` messages
- Verify backend has internet access (needed for NASA fetch)
- Check MongoDB: `db.firehotspots.find()` should have recent documents
- Manual refresh via backend: restart with `npm start`

**Data is old?**

- Fire data has 3-hour TTL, older records auto-delete
- If map hasn't updated in 3+ hours, data sync might be stalled
- Check backend logs for sync errors
- Restart backend to trigger immediate sync

---

## Verify Everything is Working

### Quick Health Check:

1. **Backend API** (should return 200):

   ```bash
   curl http://localhost:5000/api/health
   # Expected: {"status":"ok","time":"2026-03-27..."}
   ```

2. **Admin Login**:
   - Visit map, click "Admin Log in"
   - Enter: `sauravsigdel00000@gmail.com` / `Admin@123456`
   - Should see green "LIVE" indicator on map header

3. **OWM Tiles** (if key configured):

   ```bash
   curl http://localhost:5000/api/owm-tile/clouds_new/2/2/1.png
   # Should return PNG image, not error
   ```

4. **Fire Data**:

   ```bash
   curl http://localhost:5000/api/fire/hotspots
   # Expected: {"hotspots":[...]}
   ```

5. **Map Features**:
   - City pins visible ✓
   - Wind particles animating ✓
   - Stats bar at bottom shows data ✓
   - Layer toggles respond to clicks ✓

---

## Common Issues & Solutions

| Issue                              | Solution                                        |
| ---------------------------------- | ----------------------------------------------- |
| Admin login fails                  | Run `node scripts/seed-admin.js` to create user |
| No districts overlay in light mode | Browser cache - hard refresh (Ctrl+Shift+R)     |
| OWM layers stay blank              | Check OWM_KEY in `.env`, restart backend        |
| 503 error on OWM tiles             | OWM API key missing or invalid                  |
| Fire hotspots never update         | Check backend logs, ensure internet access      |
| Map layers toggles don't respond   | Refresh page, check browser console for errors  |

---

## Next Steps (Optional)

1. **Change Admin Password**
   - Log in with credentials above
   - Go to profile settings
   - Update password to something secure

2. **Configure AQI Data**
   - Set `WAQI_API_TOKEN` for live WAQI data
   - Or set `OWM_KEY` for OpenWeather AQI
   - Or use simulated fallback (default)

3. **Enable Public Signup**
   - Backend: set `ALLOW_PUBLIC_SIGNUP=true` in `.env`
   - Frontend: will show "Sign up" button instead of "Admin Log in"

---

**All fixes applied.** Reload the map in your browser to see light theme improvements. 🎉
