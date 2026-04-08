# WeatherNepal

WeatherNepal is an environmental intelligence platform focused on Nepal, with real-time weather and AQI data, AI-generated advisories, alerting, and an interactive map with animated wind particles.

The workspace includes three runtime services:

- Frontend (React + Vite)
- Backend API (Node.js + Express + MongoDB)
- ML Service (Flask + scikit-learn)

## Table of Contents

- Overview
- Project Structure
- Tech Stack
- Prerequisites
- Quick Start
- Environment Variables
- Run Commands
- API Reference
- Wind Animation Notes
- Troubleshooting

## Overview

Key capabilities:

- **Live weather data** from Open-Meteo API (temperature, wind, rainfall, AQI)
- **Real-time AQI** from MongoDB (internal database or manual uploads)
- **Notifications system** with persistent storage, alert type classification, and severity levels
- **News ticker** with backend-first architecture and local fallback
- **Real-time fire hotspot tracking** from NASA FIRMS
- **Interactive Nepal map** with AQI, weather, fire hotspot layers, and animated wind particles
- **Admin authentication** and direct alert emailing with automatic notification persistence
- **Weather and AQI advisory generation** with severity-based public alerts

## Project Structure

```text
WeatherNepal/
	backend/              # Express API + data sync + Mongo models
	frontend/             # React app (Vite) + vanilla JS map
	docker/               # docker-compose for MongoDB
	nepal_cities.js       # city metadata source
	README.md             # this file
```

## Tech Stack

- Frontend: React 19, Vite 7, Leaflet, Axios (React SPA) + Vanilla JS (public map)
- Backend: Node.js, Express 5, Mongoose, Axios, JWT, Nodemailer, node-cron
- Data/Infra: MongoDB (local or Docker)

## Prerequisites

- Node.js 20+
- npm 10+
- MongoDB on localhost:27017 (or Docker)

## Quick Start

### 1) Start MongoDB

Option A: Docker

```bash
cd docker
docker-compose up -d
```

Option B: Local MongoDB service on port 27017

### 2) Start Backend (port 5000)

```bash
cd backend
npm install
npm run dev
```

### 3) Start Frontend (port 5173)

```bash
cd frontend
npm install
npm run dev
```

## Environment Variables

Sample files are provided:

- backend/.env.example
- frontend/.env.example

Copy them first:

```bash
cd backend && copy .env.example .env
cd ..\frontend && copy .env.example .env
```

Backend .env values:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/neip_db

# Security/Auth
JWT_SECRET=change_me_for_production

# Email for alerts
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-password

# External data sources
NASA_FIRMS_KEY=your_nasa_firms_key
```

Frontend .env values:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

Note: the map page at `frontend/public/weathernepal_map.html` contains a CFG object with API endpoints. Keep the backend URL aligned with your deployment. All data sources are now configured through the backend API.

Admin AQI upload is available inside the existing user profile menu on the map page under "Admin AQI Upload" (no separate admin upload page required).

## Run Commands

Backend:

```bash
cd backend
npm run dev      # development with hot reload
npm test         # run smoke tests
```

Frontend:

```bash
cd frontend
npm run dev      # development with hot reload
npm run build    # production build
```

Mongo via Docker:

```bash
cd docker
docker-compose up -d
```

## API Reference

Base URL: http://localhost:5000/api

Health:

- GET /api/health

AQI:

- GET /api/aqi/latest
- GET /api/aqi/history/:district

Weather:

- GET /api/weather/current?lat=&lon=&city=&district=
- GET /api/weather/forecast?lat=&lon=
- GET /api/weather/latest
- GET /api/weather/all-districts

Map:

- GET /api/map/all-cities
- GET /api/map/city/:cityName
- GET /api/map/summary
- GET /api/map/waqi-live-cities (internal AQI data)

Fire:

- GET /api/fire/hotspots
- GET /api/fire/stats
- POST /api/fire/refresh

Advisory:

- POST /api/advisory/generate (admin only)
- POST /api/advisory/quick (admin only)

Alerts:

- POST /api/alerts/send-direct (admin only) - Send weather alert, creates notification persistently
- POST /api/auth/send-alert-email (public, rate-limited)

Notifications:

- GET /api/notifications (authenticated) - Get user's personal notifications
- GET /api/notifications/public (public) - Get system-wide public alerts
- PUT /api/notifications/:id/read (authenticated) - Mark notification as read
- DELETE /api/notifications/:id (authenticated) - Delete a notification

News:

- GET /api/map/live-news - Get news headlines from stored weather/AQI data (backend-first source)

Auth:

- POST /api/auth/login
- POST /api/auth/send-alert-email
- PUT /api/auth/change-password
- PUT /api/auth/avatar
- PUT /api/auth/update-location

## Data Architecture (Hybrid Model)

WeatherNepal uses a hybrid architecture that prioritizes different data sources based on type and availability:

### Weather Data

- **Source**: Live Open-Meteo API (primary)
- **Flow**: Frontend calls Open-Meteo directly via CORS proxy
- **Components**: Temperature pins, 24-hour chart, detail panel
- **Strategy**: Always live (not cached in MongoDB)

### Air Quality (AQI) Data

- **Sources**:
  - `nepal-gov-manual` (priority if available)
  - `internal-db` (fallback from database or Open-Meteo)
- **Storage**: MongoDB `AirQuality` collection
- **Read Path**: Backend endpoint `/api/map/waqi-live-cities` provides city AQI values
- **Sync**: Backend syncs every 5 minutes via `dataSync.js`
- **Display**: City markers show AQI with color scale; forecast does NOT populate AQI

### News Ticker

- **Primary Source**: Backend endpoint `/api/map/live-news` generates headlines from stored weather/AQI
- **Fallback Source**: Frontend local generation if backend unavailable
- **Deduplication**: Promise-based to prevent duplicate requests
- **Priority Rule**: Backend-first (code enforces via orchestration)

### Notifications

- **Storage**: MongoDB `Notification` collection with 3-day TTL
- **Types**: `alert`, `aqi`, `rain`, `wind`, `snow`, `temp`, `daily`, `system`, `news`
- **Severity Levels**: `high`, `warning`, `danger`, `info`
- **Write Paths**:
  1. Admin sends direct alert → private + public (if severe)
  2. Weather sync detects severe conditions → creates public alert
- **Read Endpoints**:
  - `/api/notifications` (user-specific)
  - `/api/notifications/public` (system-wide)
- **Deduplication**: 1-hour window for public weather alerts

### Data Source Priority Rule

Enforced throughout the codebase:

1. **Backend API** (primary): Always try backend endpoint first
2. **Fallback/Local** (secondary): Use local computation only if backend fails or times out
3. **Live API** (special): Keep weather always live, never cache

## Wind Animation Notes

- Wind particles are rendered with leaflet-velocity.
- Data source: Open-Meteo current wind speed and direction sampled on a grid.
- Coverage: Asia-wide bounds are used for particle generation.
- Quality mode is automatic by zoom level:
  - Zoomed out: lower-density grid for performance
  - Zoomed in: higher-density grid for detail
- Layer reloads are smoothed with fade transition and safe async cancellation.

## Troubleshooting

If npm run dev exits with code 1:

- Verify dependencies are installed in that folder (npm install)
- Check Node.js version (node -v)
- Check port conflicts (5000, 5173)
- Confirm backend .env values are set and valid

If map layers do not load:

- Confirm backend is running on port 5000
- Confirm MongoDB is running and reachable
- Verify backend has internet access to Open-Meteo and NASA FIRMS APIs

If wind particles are missing:

- Ensure internet access to cdn.jsdelivr.net and api.open-meteo.com
- Wait for the first dataset fetch to complete
- Zoom in/out once to trigger quality refresh

## License

No license file is currently defined in this repository.
