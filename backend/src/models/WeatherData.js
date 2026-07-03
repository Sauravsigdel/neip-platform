const mongoose = require("mongoose");

// Expanded schema to match report: include location, source, and syncedAt
const WeatherDataSchema = new mongoose.Schema({
  city: { type: String },
  district: { type: String, required: true },
  lat: { type: Number },
  lon: { type: Number },
  temperature: { type: Number },
  humidity: { type: Number },
  wind_speed: { type: Number },
  precipitation: { type: Number },
  snowfall: { type: Number },
  source: { type: String, default: "open-meteo" },
  syncedAt: { type: Date, default: Date.now },
});

// Indexes for efficient queries by district and recent data
WeatherDataSchema.index({ district: 1, syncedAt: -1 });

module.exports = mongoose.model("WeatherData", WeatherDataSchema);
