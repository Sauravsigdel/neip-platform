# WeatherNepal - Setup & Troubleshooting Guide

**Last Updated**: April 8, 2026  
**System Status**: ✅ Production Ready

## Quick Start

### Prerequisites

- Node.js 20+
- npm 10+
- MongoDB on localhost:27017 (Docker or local)
- Git

### 1. Start MongoDB

**Option A: Docker** (Recommended)
```bash
cd docker
docker-compose up -d
# MongoDB runs on port 27017
```

**Option B: Local MongoDB**
```bash
# Ensure MongoDB service is running on port 27017
mongod
```

### 2. Start Backend

```bash
cd backend
npm install
npm run dev
# Backend runs on http://localhost:5000
```

### 3. Start Frontend

```bash
cd frontend
npm install
npm run dev
# Frontend runs on http://localhost:5173 (or 5174/5175 if in use)
```

### 4. Create Admin User

```bash
cd backend
node scripts/seed-admin.js
```

**Credentials created**:
- Email: `sauravsigdel00000@gmail.com`
- Password: `Admin@123456`
- ⚠️ **Change password after first login!**

---

## Environment Setup

### Backend Configuration (backend/.env)

```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGO_URI=mongodb://localhost:27017/neip_db

# Security
JWT_SECRET=your-secret-key-min-32-chars-for-production

# Email (Gmail SMTP)
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-password

# External APIs
NASA_FIRMS_KEY=your_nasa_firms_key

# Optional
ALLOW_PUBLIC_SIGNUP=false
WAQI_ONLY_AQI_MODE=false
```

**Gmail App Password Setup**:
1. Enable 2-factor authentication on Gmail
2. Go to https://myaccount.google.com/apppasswords
3. Generate app-specific password
4. Use in GMAIL_APP_PASSWORD field

### Frontend Configuration (frontend/.env)

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

---

## Common Issues & Solutions

### Issue 1: Backend won't start - "Port 5000 in use"

**Symptom**: `Error: listen EADDRINUSE :::5000`

**Solution**:
```bash
# Windows: Find and kill process on port 5000
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# macOS/Linux:
lsof -ti:5000 | xargs kill -9
```

### Issue 2: Frontend won't compile - "Module not found"

**Symptom**: `Cannot find module '@vite/...'`

**Solution**:
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Issue 3: MongoDB connection fails - "ECONNREFUSED"

**Symptom**: `MongoError: connect ECONNREFUSED 127.0.0.1:27017`

**Solution**:

**Check if MongoDB is running**:
```bash
# Docker
docker ps | grep mongo
docker logs <container_id>

# Local
mongosh  # This connects to local MongoDB
```

**Start MongoDB if needed**:
```bash
# Via Docker
cd docker
docker-compose up -d mongo

# Via local service
# macOS: brew services start mongodb-community
# Linux: sudo systemctl start mongod
# Windows: net start MongoDB
```

### Issue 4: Email alerts not sending

**Symptom**: Alert endpoint returns 500 or emails not arriving

**Solution**:
1. Verify Gmail credentials in `.env`
2. Check if 2FA is enabled and app password is correct
3. Check if Gmail account has "Less secure apps" access enabled
4. Review backend logs: `npm run dev`

```bash
# Test email directly
curl -X POST http://localhost:5000/api/auth/send-alert-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "name": "Test",
    "location": "Kathmandu",
    "message": "test message",
    "severity": "high"
  }'
```

### Issue 5: Map not loading / City pins disappearing

**Symptom**: Map loads but no city pins or layers visible

**Solution**:
1. Check browser console (F12) for errors
2. Verify backend is running: `curl http://localhost:5000/api/health`
3. Check MongoDB has data: 
   ```bash
   mongosh
   > use neip_db
   > db.aircqualities.countDocuments()  # Should show data
   ```
4. Hard refresh browser: **Ctrl+Shift+R** (Windows) or **Cmd+Shift+R** (Mac)

### Issue 6: News ticker empty / not loading

**Symptom**: News ticker appears but has no headlines

**Solution**:
1. Frontend should load from backend `/api/map/live-news` (primary)
2. If backend fails, falls back to local computation
3. Verify endpoint exists: 
   ```bash
   curl http://localhost:5000/api/map/live-news
   # Should return: { "headlines": [...] }
   ```
4. Check if WeatherData collection has records
5. Open browser console to see if backend request succeeds or fails

### Issue 7: Admin login fails - "Admin login only"

**Symptom**: Non-admin user tries to login, gets: `"Admin login only"`

**Solution**:
- This is expected! Only admin users (role="admin") can login
- Use public alert endpoint instead: `POST /api/auth/send-alert-email`
- Or create a new admin user via `node scripts/seed-admin.js`

### Issue 8: Notifications not appearing

**Symptom**: Send alert via `/api/alerts/send-direct` but no notification appears

**Solution**:
1. Verify alert was sent successfully (check logs)
2. Fetch notifications: 
   ```bash
   curl http://localhost:5000/api/notifications/public
   # Should return array with alert
   ```
3. Check MongoDB:
   ```bash
   mongosh > db.notifications.find().pretty()
   ```
4. In UI, refresh `/api/notifications/public` or user's notifications

---

## Testing Endpoints

### Health Check
```bash
curl http://localhost:5000/api/health
# Expected: { "status": "ok" }
```

### Get All Cities
```bash
curl http://localhost:5000/api/map/all-cities?limit=10
```

### Get AQI Data
```bash
curl "http://localhost:5000/api/aqi/latest"
```

### Get Weather
```bash
curl "http://localhost:5000/api/weather/current?city=Kathmandu"
```

### Get News
```bash
curl http://localhost:5000/api/map/live-news
```

### Get Public Notifications
```bash
curl http://localhost:5000/api/notifications/public
```

### Send Public Alert Email
```bash
curl -X POST http://localhost:5000/api/auth/send-alert-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "name": "Test User",
    "location": "Kathmandu",
    "message": "Heavy rain warning",
    "severity": "high"
  }'
```

### Admin Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "sauravsigdel00000@gmail.com",
    "password": "Admin@123456"
  }'
# Returns JWT token
```

### Send Direct Alert (Admin Only)
```bash
# First get the token from login, then:
curl -X POST http://localhost:5000/api/alerts/send-direct \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "recipients": ["user@example.com"],
    "location": "Kathmandu",
    "district": "Kathmandu",
    "safeAqi": 160,
    "currentWeather": {"temperature": 25}
  }'
```

---

## Database Management

### View Database State
```bash
mongosh
> use neip_db
> show collections
> db.aircqualities.countDocuments()
> db.weatherdatas.countDocuments()
> db.notifications.countDocuments()
> db.users.countDocuments()
```

### Clean Up Test Data
```bash
# In backend folder:
node scripts/cleanup-db.js
# Removes old/test collections and expired notifications
```

### Reset Database Completely
```bash
mongosh
> db.dropDatabase()
# Then re-run: node scripts/seed-admin.js
```

---

## Debugging Tips

### Enable Verbose Logging

**Backend**:
```bash
# Edit backend/.env
DEBUG=*
npm run dev
```

### Check Backend Logs
```bash
# Terminal where backend is running - logs appear here
[Backend] Express server listening on port 5000
[Backend] MongoDB connected
[DataSync] Weather sync started
```

### Browser Developer Console (F12)

**Check Network Tab**:
- Click Network tab
- Refresh page
- Look for failed requests (red X)
- Click on request to see response/error

**Check Console Tab**:
- Errors appear in red
- Warnings in yellow
- info messages in white
- Click to expand error stack

### Monitor Database Changes
```bash
# Watch MongoDB changes in real-time
mongosh
> use neip_db
> db.notifications.watch()
# New notifications will appear here in real-time
```

---

## Performance Tips

### Optimize Frontend
1. Hard refresh (Ctrl+Shift+R) to clear cache
2. Close other browser tabs to free memory
3. Use Chrome DevTools Performance tab to profile

### Optimize Backend
1. Monitor database indexes: `db.collection.getIndexes()`
2. Check query performance: Use MongoDB Compass GUI
3. Monitor memory: Check `npm` process in Task Manager

### Optimize Database
1. Create indexes on frequently queried fields
2. Archive old notifications (older than 3 days auto-delete via TTL)
3. Monitor collection sizes

---

## Production Deployment

**Before Deploying**:

```bash
# Verify tests pass
cd backend && npm test
cd ../frontend && npm run lint

# Verify environment
# - MongoDB production URL set
# - JWT_SECRET is strong (32+ chars)
# - Gmail credentials are correct
# - API_BASE_URL points to production server
# - MONGO_URI uses production database

# Build frontend
npm run build
```

**Deploy Checklist**:
- [ ] MongoDB running and accessible
- [ ] All environment variables set
- [ ] Backend smoke test passing
- [ ] Frontend linting passing
- [ ] SSL/HTTPS configured (if production)
- [ ] Rate limiting verified (admin login protected)
- [ ] Email alerts tested end-to-end
- [ ] Notification persistence verified

---

## Related Documentation

- See [FINAL_ARCHITECTURE.md](FINAL_ARCHITECTURE.md) for complete system spec
- See [README.md](../README.md) for API reference
- See [ADMIN_ONLY_CHANGES.md](../ADMIN_ONLY_CHANGES.md) for authentication details
- See [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) for refactoring details

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
