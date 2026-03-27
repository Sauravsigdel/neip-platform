#!/usr/bin/env node
/**
 * Seed script: Create admin user in MongoDB
 * Usage: node backend/scripts/seed-admin.js
 */
require("dotenv").config({
  path: require("path").resolve(__dirname, "../.env"),
});

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../src/models/User");

const ADMIN_EMAIL = "sauravsigdel00000@gmail.com";
const ADMIN_PASSWORD = "Admin@123456"; // Change this to a strong password after first login
const ADMIN_NAME = "Admin User";

async function seedAdmin() {
  try {
    console.log("[Seed] Connecting to MongoDB...");
    const mongoUri =
      process.env.MONGO_URI || "mongodb://127.0.0.1:27017/weathernepal";
    await mongoose.connect(mongoUri);
    console.log("[Seed] Connected to MongoDB");

    // Check if admin already exists
    const existing = await User.findOne({ email: ADMIN_EMAIL.toLowerCase() });
    if (existing) {
      console.log(`[Seed] Admin user ${ADMIN_EMAIL} already exists`);
      await mongoose.connection.close();
      return;
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);
    const admin = new User({
      name: ADMIN_NAME,
      email: ADMIN_EMAIL.toLowerCase(),
      password: hashedPassword, // Will not be re-hashed due to pre-save check
      location: "Kathmandu",
      district: "Kathmandu",
      lat: 27.7172,
      lon: 85.324,
      avatarIndex: 1,
      avatarColor: "#2563eb",
      isVerified: true,
      role: "admin",
      alerts: {
        aqi: true,
        rain: true,
        wind: false,
        snow: false,
        temp: false,
        daily: true,
      },
    });

    await admin.save();
    console.log(`[Seed] ✓ Admin user created successfully!`);
    console.log(`[Seed] Email: ${ADMIN_EMAIL}`);
    console.log(`[Seed] Password: ${ADMIN_PASSWORD}`);
    console.log(`[Seed] ⚠️ IMPORTANT: Change the password after first login!`);

    await mongoose.connection.close();
    console.log("[Seed] Done");
  } catch (err) {
    console.error("[Seed] Error:", err.message);
    process.exit(1);
  }
}

seedAdmin();
