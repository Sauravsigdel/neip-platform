const mongoose = require('mongoose');

const DisasterRiskSchema = new mongoose.Schema({
  district: { type: String, required: true },
  risk_score: { type: Number },
  risk_level: { type: String, enum: ['Low', 'Moderate', 'High', 'Critical'] },
  rainfall: { type: Number },
  elevation_factor: { type: Number },
  historical_disaster_index: { type: Number },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('DisasterRisk', DisasterRiskSchema);
