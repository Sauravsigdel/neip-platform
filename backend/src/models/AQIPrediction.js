const mongoose = require('mongoose');

const AQIPredictionsSchema = new mongoose.Schema({
  district: { type: String, required: true },
  date: { type: Date, required: true },
  predicted_aqi: { type: Number, required: true },
  model_used: { type: String, default: 'Linear Regression' },
  confidence_interval: { type: [Number] },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AQIPrediction', AQIPredictionsSchema);
