const mongoose = require("mongoose");

const OTPSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true },
  otp: { type: String, required: true },
  type: { type: String, enum: ["verify", "reset"], default: "verify" },
  attempts: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now, expires: 600 }, // auto-delete after 10 minutes
});

module.exports = mongoose.model("OTP", OTPSchema);
