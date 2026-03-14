const axios = require("axios");
const FireHotspot = require("../models/FireHotspot");

// Nepal bounding box with buffer
const NEPAL_BBOX = "79.5,26.0,88.5,30.5"; // west,south,east,north
const FIRMS_BASE = "https://firms.modaps.eosdis.nasa.gov/api/area/csv";

// ── Parse CSV response from NASA FIRMS ──────────────────────────
function parseCSV(csv) {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
  return lines
    .slice(1)
    .map((line) => {
      const values = line.split(",").map((v) => v.trim().replace(/"/g, ""));
      const obj = {};
      headers.forEach((h, i) => {
        obj[h] = values[i];
      });
      return obj;
    })
    .filter((r) => r.latitude && r.longitude);
}

// ── Map confidence string ────────────────────────────────────────
function mapConfidence(val) {
  if (!val) return "nominal";
  const v = val.toString().toLowerCase();
  if (v === "h" || v === "high" || parseInt(v) >= 80) return "high";
  if (v === "l" || v === "low" || parseInt(v) < 40) return "low";
  return "nominal";
}

// ── Fetch MODIS fire hotspots ────────────────────────────────────
async function fetchMODISHotspots() {
  const key = process.env.NASA_FIRMS_KEY;
  if (!key) {
    console.warn("[FIRMS] NASA_FIRMS_KEY not set");
    return [];
  }

  try {
    // Fetch last 1 day of MODIS data for Nepal
    const url = `${FIRMS_BASE}/${key}/MODIS_NRT/${NEPAL_BBOX}/1`;
    const res = await axios.get(url, { timeout: 15000, responseType: "text" });
    const records = parseCSV(res.data);
    console.log(`[FIRMS] MODIS: ${records.length} hotspots found`);
    return records.map((r) => ({
      lat: parseFloat(r.latitude),
      lon: parseFloat(r.longitude),
      brightness: parseFloat(r.brightness) || 0,
      confidence: mapConfidence(r.confidence),
      frp: parseFloat(r.frp) || 0,
      satellite: "MODIS",
      acqDate: r.acq_date || "",
      acqTime: r.acq_time || "",
    }));
  } catch (err) {
    console.error("[FIRMS] MODIS fetch error:", err.message);
    return [];
  }
}

// ── Fetch VIIRS fire hotspots (higher resolution) ────────────────
async function fetchVIIRSHotspots() {
  const key = process.env.NASA_FIRMS_KEY;
  if (!key) return [];

  try {
    const url = `${FIRMS_BASE}/${key}/VIIRS_SNPP_NRT/${NEPAL_BBOX}/1`;
    const res = await axios.get(url, { timeout: 15000, responseType: "text" });
    const records = parseCSV(res.data);
    console.log(`[FIRMS] VIIRS: ${records.length} hotspots found`);
    return records.map((r) => ({
      lat: parseFloat(r.latitude),
      lon: parseFloat(r.longitude),
      brightness: parseFloat(r.bright_ti4) || parseFloat(r.brightness) || 0,
      confidence: mapConfidence(r.confidence),
      frp: parseFloat(r.frp) || 0,
      satellite: "VIIRS",
      acqDate: r.acq_date || "",
      acqTime: r.acq_time || "",
    }));
  } catch (err) {
    console.error("[FIRMS] VIIRS fetch error:", err.message);
    return [];
  }
}

// ── Main: fetch all hotspots and save to MongoDB ─────────────────
async function syncFireHotspots() {
  console.log("[FIRMS] Syncing fire hotspots for Nepal...");
  try {
    const [modis, viirs] = await Promise.all([
      fetchMODISHotspots(),
      fetchVIIRSHotspots(),
    ]);

    const all = [...modis, ...viirs];
    if (all.length === 0) {
      console.log("[FIRMS] No hotspots detected in Nepal region");
      return 0;
    }

    // Clear old hotspots and insert fresh
    await FireHotspot.deleteMany({});
    await FireHotspot.insertMany(all);
    console.log(`[FIRMS] Saved ${all.length} fire hotspots to DB`);
    return all.length;
  } catch (err) {
    console.error("[FIRMS] Sync error:", err.message);
    return 0;
  }
}

// ── Get all current hotspots ─────────────────────────────────────
async function getHotspots() {
  return FireHotspot.find({}).lean();
}

module.exports = { syncFireHotspots, getHotspots };
