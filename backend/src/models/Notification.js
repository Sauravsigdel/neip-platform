const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  isPublic: { type: Boolean, default: false },
  title: { type: String, required: true },
  message: { type: String, required: true },
  details: { type: String },
  advisory: { type: String },
  source: { type: String, default: "system" },
  type: {
    type: String,
    enum: ["aqi", "rain", "wind", "snow", "temp", "daily", "system", "news"],
    default: "system",
  },
  severity: {
    type: String,
    enum: ["info", "warning", "danger"],
    default: "info",
  },
  location: { type: String },
  aqi: { type: Number },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now, expires: 259200 }, // auto-delete after 3 days (72hrs)
});

// Index for fast per-user queries
NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, read: 1 });
NotificationSchema.index({ isPublic: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", NotificationSchema);
