const mongoose = require('mongoose');

const AirQualitySchema = new mongoose.Schema({
  city: { type: String, required: true },
  district: { type: String, required: true },
  pm25: { type: Number },
  pm10: { type: Number },
  no2: { type: Number },
  co: { type: Number },
  o3: { type: Number },
  aqi: { type: Number, required: true },
  data_source: { type: String, default: 'simulated' },
  station_name: { type: String },
  lat: { type: Number },
  lon: { type: Number },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AirQuality', AirQualitySchema);
