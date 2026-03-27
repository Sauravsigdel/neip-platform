import axios from "axios";

const runtimeBase =
  typeof window !== "undefined"
    ? `${window.location.origin}/api`
    : "http://localhost:5000/api";
const BASE_URL = import.meta.env.VITE_API_BASE_URL || runtimeBase;

const api = axios.create({ baseURL: BASE_URL, timeout: 10000 });

export const fetchLatestAQI = () => api.get("/aqi/latest");
export const fetchAQIHistory = (district) =>
  api.get(`/aqi/history/${district}`);
export const fetchAQIPredictions = (district) =>
  api.get(`/aqi/predictions/${district}`);
export const fetchLatestRisk = () => api.get("/risk/latest");
export const fetchMapData = () => api.get("/map/all-cities");
export const fetchLatestWeather = () => api.get("/weather/latest");
export const generateAdvisory = (payload) =>
  api.post("/advisory/generate", payload);

export default api;
