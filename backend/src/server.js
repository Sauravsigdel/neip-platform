const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const initDataSync = require('./services/dataSync');

// Route imports
const aqiRoutes = require('./routes/aqiRoutes');
const weatherRoutes = require('./routes/weatherRoutes');
const riskRoutes = require('./routes/riskRoutes');
const mapRoutes = require('./routes/mapRoutes');
const advisoryRoutes = require('./routes/advisoryRoutes');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection
connectDB();

// Initialize Background Data Sync
initDataSync();

// API Routes
app.use('/api/aqi', aqiRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/risk', riskRoutes);
app.use('/api/map', mapRoutes);
app.use('/api/advisory', advisoryRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
