require("dotenv").config({
  path: require("path").resolve(__dirname, "../.env"),
});

const mongoose = require("mongoose");
const Notification = require("../src/models/Notification");

async function run() {
  const uri = process.env.MONGO_URI || "mongodb://localhost:27017/neip_db";
  await mongoose.connect(uri);
  console.log("[cleanup] Connected to MongoDB");

  const summary = {
    advisoryToNews: 0,
    titleFixed: 0,
    publicFlagFixed: 0,
    detailsBackfilled: 0,
    advisoryBackfilled: 0,
  };

  // 1) Legacy type normalization: advisory -> news
  const advisoryResult = await Notification.collection.updateMany(
    { type: "advisory" },
    {
      $set: {
        type: "news",
        source: "legacy-migration",
      },
    },
  );
  summary.advisoryToNews = advisoryResult.modifiedCount || 0;

  // 2) Fix malformed titles with trailing quote artifacts (e.g. ..."" )
  const badTitleDocs = await Notification.collection
    .find({ title: { $regex: '"+$' } }, { projection: { _id: 1, title: 1 } })
    .toArray();

  if (badTitleDocs.length) {
    const titleOps = badTitleDocs.map((doc) => ({
      updateOne: {
        filter: { _id: doc._id },
        update: {
          $set: { title: String(doc.title).replace(/"+$/g, "").trim() },
        },
      },
    }));
    const titleResult = await Notification.collection.bulkWrite(titleOps);
    summary.titleFixed = titleResult.modifiedCount || 0;
  }

  // 3) Public flag backfill for records with no owner
  const publicResult = await Notification.collection.updateMany(
    {
      userId: { $exists: false },
      isPublic: { $ne: true },
    },
    {
      $set: {
        isPublic: true,
        read: true,
      },
    },
  );
  summary.publicFlagFixed = publicResult.modifiedCount || 0;

  // 4) Backfill details from message for public records
  const missingDetails = await Notification.collection
    .find(
      {
        isPublic: true,
        $or: [
          { details: { $exists: false } },
          { details: null },
          { details: "" },
        ],
      },
      { projection: { _id: 1, message: 1 } },
    )
    .toArray();

  if (missingDetails.length) {
    const detailOps = missingDetails.map((doc) => ({
      updateOne: {
        filter: { _id: doc._id },
        update: { $set: { details: doc.message || "No details available." } },
      },
    }));
    const detailsResult = await Notification.collection.bulkWrite(detailOps);
    summary.detailsBackfilled = detailsResult.modifiedCount || 0;
  }

  // 5) Backfill advisory text for public records
  const missingAdvisory = await Notification.collection
    .find(
      {
        isPublic: true,
        $or: [
          { advisory: { $exists: false } },
          { advisory: null },
          { advisory: "" },
        ],
      },
      { projection: { _id: 1 } },
    )
    .toArray();

  if (missingAdvisory.length) {
    const advisoryOps = missingAdvisory.map((doc) => ({
      updateOne: {
        filter: { _id: doc._id },
        update: {
          $set: {
            advisory:
              "Follow local weather bulletins, check AQI before outdoor activity, and take protective measures when conditions worsen.",
          },
        },
      },
    }));
    const advisoryBackfillResult =
      await Notification.collection.bulkWrite(advisoryOps);
    summary.advisoryBackfilled = advisoryBackfillResult.modifiedCount || 0;
  }

  console.log("[cleanup] Notification cleanup completed:");
  console.log(JSON.stringify(summary, null, 2));

  await mongoose.disconnect();
  console.log("[cleanup] Disconnected");
}

run().catch(async (err) => {
  console.error("[cleanup] Failed:", err);
  try {
    await mongoose.disconnect();
  } catch (_) {
    // ignore disconnect errors
  }
  process.exit(1);
});
