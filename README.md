# NEIP — Nepal Environmental Intelligence Platform

## Prerequisites
- Node.js >= 20
- Python >= 3.10
- MongoDB running on localhost:27017 (or Docker)

## Quick Start

### 1. Start MongoDB (Docker)
```bash
cd docker && docker-compose up -d
```

### 2. Start ML Service
```bash
cd ml-service
pip install -r requirements.txt
python app.py
# Runs on http://localhost:5001
```

### 3. Start Backend
```bash
cd backend
npm install
# Add your CLAUDE_API_KEY to .env
npm run dev
# Runs on http://localhost:5000
```

### 4. Start Frontend
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

## Environment Variables

### backend/.env
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/neip_db
CLAUDE_API_KEY=sk-ant-...your key here...
ML_SERVICE_URL=http://localhost:5001
```

### frontend/.env
```
VITE_API_BASE_URL=http://localhost:5000/api
```

## API Endpoints
- `GET /api/aqi/latest` — Latest AQI per district
- `GET /api/aqi/history/:district` — Historical AQI
- `GET /api/aqi/predictions/:district` — ML predictions
- `GET /api/risk/latest` — Disaster risk levels
- `GET /api/weather/latest` — Weather data
- `GET /api/map/district-data` — Combined map data
- `POST /api/advisory/generate` — Claude AI advisory

## ML Service Endpoints
- `GET /health`
- `POST /predict/aqi`
- `POST /predict/disaster-risk`
- `POST /cluster/districts`
- `POST /detect/anomaly`