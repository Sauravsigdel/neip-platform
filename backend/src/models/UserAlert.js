const mongoose = require("mongoose");

const UserAlertSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  location: { type: String, required: true },
  district: { type: String },
  lat: { type: Number },
  lon: { type: Number },
  alerts: {
    aqi: { type: Boolean, default: true }, // AQI > 150
    rain: { type: Boolean, default: true }, // Heavy rain
    wind: { type: Boolean, default: false }, // Strong wind > 40 km/h
    snow: { type: Boolean, default: false }, // Snowfall detected
    temp: { type: Boolean, default: false }, // Temp below 0°C
    daily: { type: Boolean, default: true }, // Daily morning summary
  },
  active: { type: Boolean, default: true },
  lastAlertSent: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

// Prevent duplicate subscriptions for same email + location
UserAlertSchema.index({ email: 1, location: 1 }, { unique: true });

module.exports = mongoose.model("UserAlert", UserAlertSchema);
