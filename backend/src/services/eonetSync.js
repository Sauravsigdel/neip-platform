const axios = require("axios");
const Notification = require("../models/Notification");

const EONET_EVENTS_URL = "https://eonet.gsfc.nasa.gov/api/v3/events";
const EONET_SOURCE = "nasa-eonet";
const NEWS_REFRESH_WINDOW_MS = 24 * 60 * 60 * 1000; // 1 day

function getCategoryTitles(categories) {
  if (!Array.isArray(categories)) return [];
  return categories.map((c) => String(c?.title || "").trim()).filter(Boolean);
}

function inferSeverity(categoryTitles) {
  const joined = categoryTitles.join(" ").toLowerCase();
  if (/(wildfire|volcano|severe\s*storm|earthquake|tsunami)/.test(joined)) {
    return "danger";
  }
  if (/(flood|landslide|drought|dust|smoke|storm)/.test(joined)) {
    return "warning";
  }
  return "info";
}

function getLatestGeometryDate(geometry) {
  if (!Array.isArray(geometry) || geometry.length === 0) return null;
  const latest = geometry[geometry.length - 1]?.date;
  if (!latest) return null;
  const parsed = new Date(latest);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toNotificationDoc(event) {
  const title = String(event?.title || "NASA EONET Event").trim();
  const categories = getCategoryTitles(event?.categories);
  const severity = inferSeverity(categories);
  const latestDate = getLatestGeometryDate(event?.geometry);
  const categoryText = categories.length
    ? categories.join(", ")
    : "Global event";
  const sourceUrl = event?.sources?.[0]?.url || EONET_EVENTS_URL;

  const detailsParts = [`Categories: ${categoryText}`];
  if (latestDate) {
    detailsParts.push(`Latest update: ${latestDate.toISOString()}`);
  }

  return {
    isPublic: true,
    title,
    message: `${categoryText} tracked by NASA EONET.`,
    details: detailsParts.join(" | "),
    advisory: `Source: ${sourceUrl}`,
    source: EONET_SOURCE,
    type: "news",
    severity,
  };
}

async function isEonetNewsStale() {
  const latest = await Notification.findOne({
    isPublic: true,
    type: "news",
    source: EONET_SOURCE,
  })
    .sort({ createdAt: -1 })
    .select("createdAt")
    .lean();

  if (!latest) return true;
  return (
    Date.now() - new Date(latest.createdAt).getTime() >= NEWS_REFRESH_WINDOW_MS
  );
}

async function fetchEonetEvents() {
  const response = await axios.get(EONET_EVENTS_URL, {
    params: {
      status: "open",
      limit: 100,
    },
    timeout: 15000,
  });

  return Array.isArray(response.data?.events) ? response.data.events : [];
}

async function syncEonetNews({ force = false } = {}) {
  try {
    console.log(`[EONET] Sync requested (force=${force})`);
    if (!force) {
      const stale = await isEonetNewsStale();
      if (!stale) {
        const latest = await Notification.findOne({
          isPublic: true,
          type: "news",
          source: EONET_SOURCE,
        })
          .sort({ createdAt: -1 })
          .select("createdAt")
          .lean();
        console.log(
          `[EONET] Skipped refresh (fresh cache). Last sync at ${latest?.createdAt || "unknown"}`,
        );
        return { updated: false, reason: "fresh" };
      }
    }

    console.log("[EONET] Fetching events from NASA EONET API...");
    const events = await fetchEonetEvents();
    console.log(`[EONET] Received ${events.length} events from NASA API`);
    const docs = events.map(toNotificationDoc);

    // Replace existing EONET news set so each refresh fully overrides older data.
    await Notification.deleteMany({
      isPublic: true,
      type: "news",
      source: EONET_SOURCE,
    });

    if (docs.length > 0) {
      await Notification.insertMany(docs);
    }

    console.log(`[EONET] Saved ${docs.length} events to DB`);

    return { updated: true, count: docs.length };
  } catch (err) {
    console.error("[EONET] Sync error:", err.message);
    return { updated: false, reason: "error", error: err.message };
  }
}

module.exports = {
  syncEonetNews,
  isEonetNewsStale,
};
