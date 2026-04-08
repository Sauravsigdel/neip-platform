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

- Live AQI and weather data for Nepal districts and cities
- Real-time fire hotspot tracking from NASA FIRMS
- Nepal map layers (AQI, weather, fire hotspots)
- Animated wind particles on Leaflet map using Open-Meteo + leaflet-velocity
- Admin authentication and direct alert emailing
- Weather and AQI advisory generation

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

Note: the map page at frontend/public/weathernepal_map.html currently contains a CFG object with API endpoints and OWM key fallback. Keep those values aligned with your backend URL and key strategy.

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

- POST /api/alerts/send-direct (admin only)
- POST /api/auth/send-alert-email (public, rate-limited)

Auth:

- POST /api/auth/login
- POST /api/auth/send-alert-email
- PUT /api/auth/change-password
- PUT /api/auth/avatar
- PUT /api/auth/update-location

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
- Verify OWM key if using OpenWeatherMap tile layers

If wind particles are missing:

- Ensure internet access to cdn.jsdelivr.net and api.open-meteo.com
- Wait for the first dataset fetch to complete
- Zoom in/out once to trigger quality refresh

## License

No license file is currently defined in this repository.
