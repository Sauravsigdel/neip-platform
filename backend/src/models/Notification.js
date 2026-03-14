const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: {
    type: String,
    enum: ["aqi", "rain", "wind", "snow", "temp", "daily", "system"],
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

module.exports = mongoose.model("Notification", NotificationSchema);
