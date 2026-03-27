const mongoose = require("mongoose");

const WeatherDataSchema = new mongoose.Schema({
  district: { type: String, required: true },
  rainfall: { type: Number },
  snowfall: { type: Number },
  temperature: { type: Number },
  humidity: { type: Number },
  wind_speed: { type: Number },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("WeatherData", WeatherDataSchema);
