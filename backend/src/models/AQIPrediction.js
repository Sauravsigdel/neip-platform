const mongoose = require("mongoose");

// Prediction schema used by ML microservice. Stores the prediction and metadata.
const AQIPredictionsSchema = new mongoose.Schema({
  district: { type: String, required: true },
  date: { type: Date, required: true },
  predicted_aqi: { type: Number, required: true },
  model_version: { type: String, default: "rf-v1" },
  features: { type: Object },
  confidence_interval: { type: [Number] },
  createdAt: { type: Date, default: Date.now },
});

AQIPredictionsSchema.index({ district: 1, date: -1 });

module.exports = mongoose.model("AQIPrediction", AQIPredictionsSchema);
