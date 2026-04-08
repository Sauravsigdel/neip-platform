# ⚠️ DEPRECATED - See FINAL_ARCHITECTURE.md

**This file is obsolete** and describes the pre-refactoring system architecture with outdated components.

This document referenced:
- ❌ ML service (Flask + scikit-learn) - Not implemented
- ❌ Disaster risk scoring - Not implemented  
- ❌ Legacy alert scheduler - Replaced by event-driven
- ❌ Legacy notification scheduler - Replaced by event-driven
- ❌ OWM integration - Removed from active code

---

## Current System Documentation

For complete, up-to-date system specification, see:

**[FINAL_ARCHITECTURE.md](FINAL_ARCHITECTURE.md)** (Primary Reference)
- Complete system overview
- Data flow architecture with diagrams
- Backend services
- Frontend architecture
- Database schema (current)
- API endpoints (current)
- Data source priority rules
- Notification system details
- Deployment checklist

**Additional Resources:**
- [README.md](../README.md) - Quick start and API reference
- [TROUBLESHOOTING_SETUP.md](TROUBLESHOOTING_SETUP.md) - Setup and debugging
- [ADMIN_ONLY_CHANGES.md](../ADMIN_ONLY_CHANGES.md) - Admin features
- [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) - Refactoring details
- [CHANGELOG.md](CHANGELOG.md) - What has changed

---

### Quick Architecture Summary (Current)

**Hybrid Model:**
- Weather: Always live from Open-Meteo
- AQI: Database-backed (internal-db source)
- News: Backend-first with local fallback
- Notifications: Fully persistent (MongoDB)
- Alerts: Email + database storage with private/public routing

**No longer includes:**
- Disaster risk system
- ML predictions
- Legacy schedulers
- OWM tile layers
- initNotificationScheduler()

### 3.2 Auth and Access Control

- JWT auth is used via auth middleware for protected routes.
- User role exists as enum user/admin in User schema.
- Admin-only protections are enforced for specific routes (for example official AQI ingestion/history and all-alert subscriptions endpoint).
- Public signup is feature-gated by ALLOW_PUBLIC_SIGNUP env flag.

## 4. Database Schema (MongoDB/Mongoose)

## 4.1 AirQuality

Collection purpose:

- Stores AQI and pollutant observations from multiple sources (owm-copernicus, simulated, waqi, nepal-gov-manual).

Key fields:

- city, district
- pm1, pm25, pm10, no2, co, o3, aqi
- data_source, station_name
- lat, lon
- timestamp

Notes:

- Official manual station uploads are persisted in this same collection with data_source = nepal-gov-manual.

## 4.2 WeatherData

Collection purpose:

- Stores weather snapshots per district.

Key fields:

- district
- rainfall
- snowfall
- temperature
- humidity
- wind_speed
- timestamp

## 4.3 DisasterRisk

Collection purpose:

- Stores disaster risk score and class by district.

Key fields:

- district
- risk_score
- risk_level (Low, Moderate, High, Critical)
- rainfall, elevation_factor, historical_disaster_index
- timestamp

## 4.4 AQIPrediction

Collection purpose:

- Stores predicted AQI outputs from ML service.

Key fields:

- district
- date
- predicted_aqi
- model_used
- confidence_interval
- createdAt

## 4.5 User

Collection purpose:

- Auth identity, profile and personal alert preferences.

Key fields:

- name, email, password
- location, district, lat, lon
- avatarIndex, avatarColor
- isVerified
- role (user/admin)
- alerts object (aqi/rain/wind/snow/temp/daily)
- lastNotificationSent, createdAt

Behavior:

- Password hashing with bcrypt pre-save (avoids double hashing).

## 4.6 OTP

Collection purpose:

- Email OTP verification/reset tokens.

Key fields:

- email, otp, type, attempts, createdAt

Lifecycle:

- TTL expires after 600 seconds (10 minutes).

## 4.7 Notification

Collection purpose:

- In-app notifications.

Key fields:

- userId, title, message
- type (aqi/rain/wind/snow/temp/daily/system)
- severity (info/warning/danger)
- location, aqi, read, createdAt

Lifecycle and performance:

- TTL expires after 259200 seconds (72 hours / 3 days).
- indexes: { userId, createdAt } and { userId, read }.

## 4.8 UserAlert

Collection purpose:

- Email subscriber alert profiles (separate from authenticated User alerts).

Key fields:

- name, email, location, district, lat, lon
- alerts object (aqi/rain/wind/snow/temp/daily)
- active, lastAlertSent, createdAt

Constraints:

- unique index on { email, location } to prevent duplicate subscriptions.

## 4.9 FireHotspot

Collection purpose:

- Near-real-time satellite fire events.

Key fields:

- lat, lon, brightness, confidence, frp
- satellite, district, province, acqDate, acqTime
- fetchedAt

Lifecycle and performance:

- TTL expires after 10800 seconds (3 hours).
- index on { lat, lon }.

## 5. Data Sync and Scheduler Behavior

## 5.1 Data Sync Service (backend/src/services/dataSync.js)

On startup:

- weather sync starts immediately
- fire hotspot sync starts immediately
- AQI sync starts immediately unless WAQI_ONLY_AQI_MODE=true

Cron jobs:

- AQI sync (if enabled): at minute 5 of every hour
- Weather sync: every 5 minutes
- Fire hotspot sync: every 3 hours

AQI strategy:

- primary source: OWM air pollution endpoint (if OWM_KEY exists)
- fallback source: simulated AQI model when provider unavailable
- optional mode WAQI_ONLY_AQI_MODE=true skips OWM AQI ingestion

ML integration during sync:

- calls ML /predict/aqi using recent district history
- writes first forecast step to AQIPrediction
- calls ML /predict/disaster-risk for risk classification and score
- if ML unavailable, backend computes fallback risk score/category

## 5.2 Notification Scheduler (backend/src/services/notificationScheduler.js)

Cron jobs:

- hourly user checks
- daily cleanup of older notifications (belt-and-suspenders alongside TTL)

Behavior:

- loads verified users
- computes weather + AQI by user district/location
- builds condition alerts or daily summary
- writes in-app Notification
- sends corresponding email
- enforces one-notification-per-day via lastNotificationSent

## 5.3 Alert Scheduler (backend/src/services/alertScheduler.js)

Cron jobs:

- hourly condition checks for UserAlert subscriptions
- daily summary run at 07:00 Nepal time equivalent cron slot

Behavior:

- checks weather and AQI against per-subscriber alert prefs
- throttles condition alerts (~3 hours) and daily summaries (~23 hours)
- generates quick advisory text
- sends email and updates lastAlertSent

## 6. API Inventory (Current)

All paths below are relative to /api.

## 6.1 AQI Routes

- GET /aqi/latest
- GET /aqi/history/:district
- GET /aqi/predictions/:district

## 6.2 Weather Routes

- GET /weather/current
- GET /weather/forecast
- GET /weather/latest
- GET /weather/all-districts

## 6.3 Risk Routes

- GET /risk/latest
- GET /risk/history/:district

## 6.4 Map Routes

- GET /map/waqi-live-cities
- GET /map/official-aqi-latest
- POST /map/admin/official-aqi-manual (admin)
- GET /map/admin/official-aqi-history (admin)
- GET /map/live-news
- GET /map/all-cities
- GET /map/city/:cityName
- GET /map/summary

## 6.5 Advisory Routes

- POST /advisory/generate
- POST /advisory/quick

## 6.6 Alerts Routes

- POST /alerts/subscribe
- GET /alerts/subscriptions
- DELETE /alerts/unsubscribe
- GET /alerts/all (admin)
- POST /alerts/send-direct (auth)

## 6.7 Auth Routes

- POST /auth/signup
- POST /auth/verify-otp
- POST /auth/login
- GET /auth/me (auth)
- PUT /auth/alerts (auth)
- PUT /auth/change-password (auth)
- POST /auth/resend-otp
- PUT /auth/update-location (auth)

## 6.8 Notification Routes

- GET /notifications/ (auth)
- PUT /notifications/:id/read (auth)
- PUT /notifications/read-all (auth)
- DELETE /notifications/clear-all (auth)
- DELETE /notifications/:id (auth)

## 6.9 Fire Routes

- GET /fire/hotspots
- GET /fire/stats
- POST /fire/refresh

## 6.10 OWM Tile Proxy Route

- GET /owm-tile/:layer/:z/:x/:y.png

## 6.11 Utility Routes

- GET /health
- POST /test-email

## 7. Email System and Messaging Workflows

## 7.1 Outbound Email Service

Core mailer:

- backend/src/services/emailService.js
- nodemailer transporter using Gmail credentials

Templates and message classes:

- rich HTML alert emails with AQI/weather cards and safety guidance
- daily summary vs incident alert subject line logic
- subscription confirmation email support
- test email helper used by /api/test-email

Trigger points:

- alert scheduler subscription dispatch
- notification scheduler user alert dispatch
- auth signup/otp verification flow (OTP email via auth route transport)

## 7.2 OTP Flow

1. /auth/signup creates or refreshes unverified user and generates OTP
2. OTP stored in OTP collection with 10-minute TTL and attempt counting
3. OTP email sent through Gmail transporter
4. /auth/verify-otp validates code, verifies user, returns JWT
5. welcome notifications are generated after successful verification

## 8. AI/ML Capabilities

## 8.1 ML Service Endpoints (ml-service/app.py)

- GET /health
- POST /predict/aqi
- POST /predict/disaster-risk
- POST /cluster/districts
- POST /detect/anomaly

## 8.2 Model Logic (ml-service/models/predictor.py)

1. AQI Forecast

- LinearRegression over recent history
- weather-factor adjustment + noise term
- returns 7-step forecast and confidence intervals

2. Disaster Risk

- RandomForestClassifier trained on synthetic feature matrix
- also calculates composite weighted risk_score
- returns risk category and score

3. Clustering

- KMeans (k=4) over district feature vectors
- maps clusters to named profile labels

4. Anomaly Detection

- Z-score thresholding (|z| > 2.5)

## 8.3 Advisory Engine

Advisory generation in backend/src/routes/advisoryRoutes.js:

- local rule-based engine (generateQuickAdvisory)
- no external LLM call required
- consumed by schedulers to enrich notifications/emails

## 9. Frontend and Map Runtime Notes

Frontend contains two layers:

1. React app (frontend/src)

- app shell, pages, API service integration
- frontend/src/services/api.js uses dynamic API base and points map queries to /map/all-cities

2. Public map runtime (frontend/public)

- weathernepal_map.html with split JS/CSS implementation
- modular scripts include data service, auth bridge, layer logic, and loader orchestration

Linting:

- ESLint scope updated so browser-global public scripts do not break module-oriented lint rules.

## 10. Cleanup Outcomes Reflected in Code

The following key cleanup outcomes are present in the current implementation:

- role-aware auth payload and admin middleware use on sensitive endpoints
- map API expanded with official manual AQI ingest/history and live-news
- WAQI token handling and cache strategy improved with fallback behavior
- WeatherData and email flows include snowfall consistently
- AirQuality schema includes pm1 and supports optional AQI semantics
- frontend API path alignment to /map/all-cities
- frontend lint pass restored by excluding non-module public map scripts

## 11. Known Operational Considerations

- Some README endpoint descriptions may lag behind current route set (especially newly added map admin/manual endpoints).
- Data source mode flags (for example WAQI_ONLY_AQI_MODE) change ingestion behavior and should be documented in deployment runbooks.
- Email delivery depends on Gmail app-password configuration and provider limits.

## 12. Recommended Next Actions

1. Update README API section to exactly match current route inventory in this report.
2. Add route-level request/response examples (especially map admin bulk upsert payloads).
3. Add automated integration tests for admin-protected routes and scheduler trigger logic.
4. Add minimal OpenAPI/Swagger generation for long-term API maintenance.

---

Generated from workspace code inspection in the current branch state.
