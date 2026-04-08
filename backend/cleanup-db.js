require("dotenv").config({
  path: require("path").resolve(__dirname, ".env"),
});

const mongoose = require("mongoose");

async function cleanup() {
  try {
    const mongoUri =
      process.env.MONGO_URI || "mongodb://localhost:27017/weathernepal";
    console.log(`Connecting to MongoDB: ${mongoUri}...`);

    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");

    const db = mongoose.connection.db;

    // Drop collections
    const collections = ["otps", "useralerts", "disasterrisks"];
    for (const col of collections) {
      try {
        await db.dropCollection(col);
        console.log(`✓ Dropped collection: ${col}`);
      } catch (err) {
        if (err.codeName === "NamespaceNotFound") {
          console.log(`ℹ Collection does not exist: ${col}`);
        } else {
          console.log(`✗ Error dropping ${col}: ${err.message}`);
        }
      }
    }

    console.log("\n✓ Database cleanup completed");
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

cleanup();
