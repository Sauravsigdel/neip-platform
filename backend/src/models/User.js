const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: { type: String, required: true, minlength: 6 },
  location: { type: String, required: true },
  district: { type: String },
  lat: { type: Number },
  lon: { type: Number },
  avatarIndex: { type: Number, default: 1, min: 1, max: 9 }, // 1-9 avatar image index
  avatarColor: { type: String, default: "#2563eb" }, // fallback color if no image
  isVerified: { type: Boolean, default: false },
  alerts: {
    aqi: { type: Boolean, default: true },
    rain: { type: Boolean, default: true },
    wind: { type: Boolean, default: false },
    snow: { type: Boolean, default: false },
    temp: { type: Boolean, default: false },
    daily: { type: Boolean, default: true },
  },
  lastNotificationSent: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

// Hash password before saving — only if not already hashed
UserSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  // Don't re-hash if already a bcrypt hash
  if (this.password.startsWith("$2b$") || this.password.startsWith("$2a$"))
    return;
  this.password = await bcrypt.hash(this.password, 12);
});

// Compare password
UserSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Get initials
UserSchema.methods.getInitials = function () {
  return this.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

module.exports = mongoose.model("User", UserSchema);
