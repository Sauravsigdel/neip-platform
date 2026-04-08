# WeatherNepal Final Architecture Documentation

**Last Updated**: April 8, 2026
**Status**: Complete hybrid model with notification persistence and backend-first data flow

## Table of Contents

1. [System Overview](#system-overview)
2. [Data Flow Architecture](#data-flow-architecture)
3. [Backend Services](#backend-services)
4. [Frontend Architecture](#frontend-architecture)
5. [Database Schema](#database-schema)
6. [API Endpoints](#api-endpoints)
7. [Data Source Priority Rules](#data-source-priority-rules)
8. [Notification System](#notification-system)

---

## System Overview

WeatherNepal is a hybrid architecture environmental intelligence platform for Nepal featuring:

- **Live weather data** from Open-Meteo API
- **Real-time AQI** from MongoDB (internal database with manual uploads)
- **Backend-driven news system** with local generation fallback
- **Comprehensive notification system** with persistent MongoDB storage
- **Real-time fire hotspot tracking** from NASA FIRMS
- **Interactive map** with weather, AQI, fire layers and animated wind particles
- **Admin alerting system** with automatic notification persistence

### Key Design Principles

1. **Backend-First Architecture**: System endpoints are primary; local computation is fallback-only
2. **Data Transparency**: All data sources clearly labeled and documented in code
3. **Notification Persistence**: All alerts create permanent MongoDB records
4. **Hybrid Model**: Live API for weather, database-backed for AQI and notifications
5. **No Misleading Terminology**: Removed "simulated" and placeholder values

---

## Data Flow Architecture

### Weather Data Flow

```
Open-Meteo API
    ↓
Frontend (direct CORS call)
    ├─ Temperature pins
    ├─ 24-hour weather chart
    ├─ Weather detail panel
    └─ 7-day forecast (weather only, no AQI)

Backend (also syncs for logging/reference)
    └─ POST /api/weather/sync (internal)
```

**Priority Rule**: Always live, never cached  
**Storage**: No MongoDB persistence (real-time only)  
**Update Frequency**: Live on demand

### AQI Data Flow

```
Open-Meteo API / Manual Upload
    ↓
Backend dataSync Service
    ├─ Validates and transforms
    ├─ Checks data_source priority
    └─ Stores in MongoDB
    
MongoDB AirQuality Collection
    ↓
Backend /api/map/waqi-live-cities
    ↓
Frontend city markers (color scale)

Data Sources (Priority Order):
1. nepal-gov-manual (highest - manual uploads)
2. internal-db (fallback - from API or computed)
```

**Update Frequency**: Every 5 minutes via dataSync  
**Storage**: Persistent in MongoDB  
**Display**: City marker colors, AQI detail tooltip

### News Ticker Flow

```
Backend /api/map/live-news (PRIMARY)
    ├─ Generates from WeatherData + AirQuality
    ├─ Returns headline array
    └─ Response: { headlines: [...] }
        ↓
Frontend newsLoadPromise
    ├─ Tries backend first
    ├─ Deduplicates requests (Promise-based)
    └─ Falls back to local only if backend fails
        ↓
Local headline generation (FALLBACK)
    └─ Computed from weather data in browser
        ↓
News Ticker UI
    └─ Rotates headlines every N seconds
```

**Priority Rule**: Backend-first (enforced with Promise deduplication)  
**Fallback**: Local generation only if backend times out or errors  
**Deduplication**: Prevents duplicate API calls via `newsLoadPromise` variable

### Notification Flow

```
WRITE PATHS:

1. Admin Direct Alert:
   POST /api/alerts/send-direct (admin auth required)
       ├─ Fetches live weather
       ├─ Evaluates severity
       ├─ Sends email to admin-specified recipients
       └─ Creates Notification(s):
           ├─ Private: userId-specific alert
           └─ Public: System-wide if severity="high" OR aqi > 150

2. Weather Sync Triggered Public Alert:
   dataSync.js fetchWeatherData()
       └─ Calls maybeCreatePublicWeatherNotification()
           ├─ Checks if weather meets severity threshold
           ├─ 1-hour deduplication (prevents duplicates)
           └─ Creates public notification

READ PATHS:

/api/notifications (authenticated)
    └─ Returns user's personal notifications

/api/notifications/public (public)
    └─ Returns all system-wide public alerts
```

**Persistence**: All alerts create permanent DB records  
**Deduplication**: 1-hour window for public weather alerts  
**TTL**: 3 days (259200 seconds) auto-expiration

### Fire Hotspot Flow

```
NASA FIRMS API
    ↓
Backend dataSync Service (every 3 hours)
    ├─ Fetches recent hotspots
    ├─ Geocodes to Nepal districts
    └─ Stores in MongoDB (TTL: 3 hours)
        ↓
MongoDB FireHotspot Collection
    ↓
Backend /api/fire/hotspots
    ↓
Frontend map layer
    └─ Red circles marking active fire locations
```

**Update Frequency**: Every 3 hours  
**Storage**: TTL-based (3 hours) auto-expiration  
**Display**: Map layer with real-time markers

---

## Backend Services

### Core Services

**backend/src/server.js**
- Express API entry point
- CORS middleware configured
- Routes mounted at `/api/*`
- Background services initialized on startup
- Database connection on port 27017 (MongoDB)

**backend/src/services/dataSync.js**
- Runs on startup and via cron every 5 minutes (weather) and 3 hours (fire)
- `fetchWeatherData()` → calls Open-Meteo, stores in MongoDB, triggers notification check
- `maybeCreatePublicWeatherNotification()` → creates alerts for severe weather
- Does NOT use ML service (removed in refactoring)

**backend/src/routes/alertRoutes.js**
- `POST /api/alerts/send-direct` → Admin-only weather alert endpoint
- Creates both private user notifications and public (if severe)
- Severity evaluated via `getAlertSeverity()` function
- Emails sent via emailService with nodemailer

### Removed Services

✅ `backend/src/services/alertScheduler.js` - Removed (notification writes now triggered by events)  
✅ `backend/src/services/notificationScheduler.js` - Removed (notification writes now triggered by events)

### Active Routes

- `/api/aqi/*` - AQI data endpoints
- `/api/weather/*` - Weather data endpoints
- `/api/map/*` - Map layer data
- `/api/alerts/*` - Alert creation and management
- `/api/notifications/*` - Notification read/delete
- `/api/auth/*` - Authentication
- `/api/fire/*` - Fire hotspot data
- `/api/health` - Health check

---

## Frontend Architecture

### Vanilla JS Public Map (frontend/public/weathernepal_map.html)

**Key Modules:**
- `weathernepal_map.js` - Core map initialization and layer management
- `weathernepal_map.layers.js` - Layer rendering (temperature, news, forecast, AQI)
- `weathernepal_map.auth.js` - Authentication, notifications panel, user profile
- `weathernepal_map.data-services.js` - API data fetching and local computation

**News Loading Flow (weathernepal_map.layers.js):**
```javascript
function requestNewsFeed(sourceCities) {
  if (newsFromBackendLoaded) {
    // Already loaded, just rotate
    if (tickerItems.length) rotateTicker(tickerItems);
    return;
  }
  
  // Prevent concurrent requests via Promise deduplication
  if (newsLoadPromise) return newsLoadPromise;
  
  newsLoadPromise = loadLiveNewsFromBackend()
    .then((loaded) => {
      if (!loaded) updateNewsFeed(sourceCities);  // Fallback to local
      return loaded;
    })
    .finally(() => { newsLoadPromise = null; });
  
  return newsLoadPromise;
}
```

**AQI Handling:**
- Forecast AQI set to `null` (not `0`) - no attempt to populate for future dates
- City marker AQI populated from `/api/map/waqi-live-cities`
- Null values rendered gracefully (gray bar, "AQI unavailable" tooltip)

### React App (frontend/src)

**Components:**
- `pages/MapPage.jsx` - Map viewer
- `pages/NotFoundPage.jsx` - 404 handler
- Main app shell with routing and authentication

---

## Database Schema

### Active Collections

**AirQuality**
```javascript
{
  _id: ObjectId,
  city: String,
  district: String,
  pm1, pm25, pm10: Number,
  no2, co, o3: Number,
  aqi: Number,
  data_source: String (Enum: ["nepal-gov-manual", "internal-db"]),
  station_name: String,
  lat, lon: Number,
  timestamp: Date,
  createdAt: Date
}
```
**Note**: `data_source` default is now `"internal-db"` (formerly "simulated")

**WeatherData**
```javascript
{
  _id: ObjectId,
  district: String,
  rainfall: Number,
  snowfall: Number,
  temperature: Number,
  humidity: Number,
  wind_speed: Number,
  wind_direction: Number,
  timestamp: Date,
  createdAt: Date
}
```

**Notification** (Enhanced)
```javascript
{
  _id: ObjectId,
  userId: ObjectId (optional if isPublic),
  isPublic: Boolean,
  title: String,
  message: String,
  details: String,
  type: String (Enum: ["alert", "aqi", "rain", "wind", "snow", "temp", "daily", "system", "news"]),
  severity: String (Enum: ["high", "warning", "danger", "info"]),
  location: String,
  district: String,
  aqi: Number,
  read: Boolean (default: false),
  createdAt: Date,
  expiresAt: Date (TTL: 3 days)
}
```
**Indexes**: `{ userId, createdAt }`, `{ userId, read }`, `{ isPublic, createdAt }`  
**New Fields**: `type: "alert"`, `severity: "high"`, `details` field for alert metadata

**FireHotspot**
```javascript
{
  _id: ObjectId,
  lat, lon: Number,
  brightness: Number,
  confidence: Number,
  frp: Number,
  satellite: String,
  district: String,
  province: String,
  acqDate: String,
  acqTime: String,
  fetchedAt: Date,
  expiresAt: Date (TTL: 3 hours)
}
```

**User**
```javascript
{
  _id: ObjectId,
  name: String,
  email: String,
  password: String (hashed with bcrypt),
  location: String,
  district: String,
  lat, lon: Number,
  avatarIndex: Number,
  avatarColor: String,
  isVerified: Boolean,
  role: String (Enum: ["user", "admin"]),
  alerts: {
    aqi: Boolean,
    rain: Boolean,
    wind: Boolean,
    snow: Boolean,
    temp: Boolean,
    daily: Boolean
  },
  lastNotificationSent: Date,
  createdAt: Date
}
```

**AQIPrediction**
```javascript
{
  _id: ObjectId,
  district: String,
  date: String,
  predicted_aqi: Number,
  model_used: String,
  confidence_interval: Number,
  createdAt: Date
}
```

### Removed Collections

✅ `OTP` - Removed (email OTP verification no longer used)  
✅ `UserAlert` - Removed (consolidated into Notification system)  
✅ `DisasterRisk` - Removed (disaster risk prediction disabled)

---

## API Endpoints

### Base URL
`http://localhost:5000/api`

### Health
- `GET /api/health` - Server status

### AQI
- `GET /api/aqi/latest` - Latest AQI for all cities
- `GET /api/aqi/history/:district` - Historical AQI data

### Weather
- `GET /api/weather/current` - Current weather (query: lat, lon, city, district)
- `GET /api/weather/forecast` - 7-day forecast (query: lat, lon)
- `GET /api/weather/latest` - Latest weather for all districts
- `GET /api/weather/all-districts` - Weather data aggregated by district

### Map
- `GET /api/map/all-cities` - All city metadata and coordinates
- `GET /api/map/city/:cityName` - Specific city data
- `GET /api/map/summary` - Overview of weather and AQI
- `GET /api/map/waqi-live-cities` - **PRIMARY** AQI source for map markers
- `GET /api/map/live-news` - **PRIMARY** source for news ticker

### Fire
- `GET /api/fire/hotspots` - Active fire locations
- `GET /api/fire/stats` - Fire statistics
- `POST /api/fire/refresh` - Force refresh hotspots

### Alerts
- `POST /api/alerts/send-direct` - **Admin only** - Send weather alert with notification persistence
- `POST /api/auth/send-alert-email` - Public rate-limited alert signup

### Notifications (NEW ENDPOINTS)
- `GET /api/notifications` - Get user's personal notifications (authenticated)
- `GET /api/notifications/public` - Get system-wide public alerts (public)
- `PUT /api/notifications/:id/read` - Mark notification as read (authenticated)
- `DELETE /api/notifications/:id` - Delete a notification (authenticated)

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/send-alert-email` - Subscribe for email alerts
- `PUT /api/auth/change-password` - Change password (authenticated)
- `PUT /api/auth/avatar` - Update avatar (authenticated)
- `PUT /api/auth/update-location` - Update location (authenticated)

### Advisory
- `POST /api/advisory/generate` - **Admin only** - Generate weather advisory
- `POST /api/advisory/quick` - **Admin only** - Quick advisory

---

## Data Source Priority Rules

### Rule 1: Backend-First for Aggregated Data
When frontend needs data like news, AQI, or notifications:
1. Call backend endpoint first (e.g., `/api/map/live-news`)
2. If backend succeeds, use that data
3. If backend times out or errors, fall back to local computation

**Code Example (News)**:
```javascript
async function requestNewsFeed(sourceCities) {
  try {
    const loaded = await loadLiveNewsFromBackend();
    if (!loaded) {
      // Fallback to local only if backend failed
      updateNewsFeed(sourceCities);
    }
  } catch (e) {
    // Fallback on error
    updateNewsFeed(sourceCities);
  }
}
```

### Rule 2: Live API for Weather
Weather data is ALWAYS live:
- Never cache weather in MongoDB for display
- Always call Open-Meteo at request time
- Backend can sync weather for reference/logging, but frontend gets live data

### Rule 3: Persistent Storage for Alerts and Notifications
Every alert or notification event creates a permanent MongoDB record:
- Admin direct alert → creates Notification(s)
- Severe weather detected → creates public Notification
- All records have timestamps and can be queried historically

### Rule 4: Deduplication and Rate Limiting
- News loading uses Promise deduplication to prevent duplicate calls
- Public weather alerts dedup within 1-hour windows
- Email alerts are rate-limited per subscriber

---

## Notification System

### Quick Reference

**Write Triggers:**
1. Admin sends direct alert → private + public (if severe)
2. Weather sync detects severity → public alert

**Read Endpoints:**
- `/api/notifications` (user-specific, authenticated)
- `/api/notifications/public` (system-wide, public)

**Delete Endpoint:**
- `DELETE /api/notifications/:id` (authenticated)

**Mark as Read:**
- `PUT /api/notifications/:id/read` (authenticated)

### Notification Types

| Type | Source | Example |
|------|--------|---------|
| `alert` | Admin or auto | Weather alert, severe condition |
| `aqi` | System | AQI reaches unhealthy level |
| `rain` | System | Heavy rainfall detected |
| `wind` | System | High wind speed |
| `snow` | System | Snowfall detected |
| `temp` | System | Temperature extreme |
| `daily` | System | Daily digest |
| `system` | System | System announcements |
| `news` | System | News updates |

### Notification Severity

| Level | Use Case | Persistence |
|-------|----------|-------------|
| `high` | Critical alerts (severe weather) | Public + User |
| `warning` | Important alerts | Usually private |
| `danger` | Critical condition | Both paths |
| `info` | General info | Private only |

### Notification UI Display

- Alert type shows icon: `alert: "⚠️"`
- Severity high maps to CSS class `danger` (red styling)
- TTL auto-expiration: 3 days, then auto-deleted from DB

---

## Deployment Checklist

- [ ] Verify MongoDB connection on port 27017
- [ ] Set required backend .env variables (JWT_SECRET, GMAIL credentials)
- [ ] Run `npm test` in backend to verify syntax
- [ ] Run `npm run build` in frontend for production build
- [ ] Verify `/api/health` returns 200
- [ ] Test `/api/notifications/public` returns array
- [ ] Send test alert via `/api/alerts/send-direct` and verify Notification created
- [ ] Verify news ticker loads from `/api/map/live-news`
- [ ] Confirm map loads with city AQI from `/api/map/waqi-live-cities`
- [ ] Test frontend falls back to local news if backend unavailable

---

## Future Improvements

1. **Batch Notification Creation**: Combine multiple event notifications into single digest
2. **Advanced Filtering**: User preferences for notification types and severity
3. **Webhook Support**: External systems can subscribe to alerts
4. **Notification Archives**: Long-term storage for alert history
5. **Real-time Websockets**: Push notifications instead of polling

---

**Document Status**: ✅ Complete  
**Last Validation**: All tests passing, all files error-free  
**Architecture Validation**: Hybrid model fully implemented  
