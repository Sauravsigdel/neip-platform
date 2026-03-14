const mongoose = require("mongoose");

const FireHotspotSchema = new mongoose.Schema({
  lat: { type: Number, required: true },
  lon: { type: Number, required: true },
  brightness: { type: Number }, // brightness temperature (Kelvin)
  confidence: {
    type: String,
    enum: ["low", "nominal", "high"],
    default: "nominal",
  },
  frp: { type: Number }, // fire radiative power (MW)
  satellite: { type: String, default: "MODIS" }, // MODIS or VIIRS
  district: { type: String },
  province: { type: Number },
  acqDate: { type: String }, // acquisition date YYYY-MM-DD
  acqTime: { type: String }, // acquisition time HHMM
  fetchedAt: { type: Date, default: Date.now, expires: 10800 }, // auto-delete after 3 hours
});

FireHotspotSchema.index({ lat: 1, lon: 1 });

module.exports = mongoose.model("FireHotspot", FireHotspotSchema);
