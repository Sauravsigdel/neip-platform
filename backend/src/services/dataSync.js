const cron = require('node-cron');
const axios = require('axios');
const AirQuality = require('../models/AirQuality');
const WeatherData = require('../models/WeatherData');

const OPEN_AQ_URL = 'https://api.openaq.org/v2/latest';
const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';

// Cities to track
const cities = [
  { city: 'Kathmandu', district: 'Kathmandu', coordinates: { lat: 27.7172, lon: 85.3240 } },
  { city: 'Pokhara', district: 'Kaski', coordinates: { lat: 28.2096, lon: 83.9856 } },
  { city: 'Lalitpur', district: 'Lalitpur', coordinates: { lat: 27.6588, lon: 85.3247 } },
  { city: 'Biratnagar', district: 'Morang', coordinates: { lat: 26.4525, lon: 87.2718 } },
  { city: 'Birgunj', district: 'Parsa', coordinates: { lat: 27.0122, lon: 84.8773 } }
];

const calculateAQI = (measurements) => {
  // Mock simplified AQI calculation based on max value for demo purposes
  if (!measurements || measurements.length === 0) return 50;
  const pm25 = measurements.find(m => m.parameter === 'pm25')?.value || 0;
  const pm10 = measurements.find(m => m.parameter === 'pm10')?.value || 0;
  return Math.round(Math.max(pm25 * 2, pm10, 50)); 
};

const fetchAirQualityData = async () => {
  console.log('Fetching OpenAQ Data...');
  try {
    for (const location of cities) {
      try {
        const response = await axios.get(OPEN_AQ_URL, {
          params: { city: location.city, limit: 100 }
        });
        
        let measurements = [];
        if (response.data && response.data.results && response.data.results.length > 0) {
           measurements = response.data.results[0].measurements;
        }

        const aqi = calculateAQI(measurements);
        const pm25 = measurements.find(m => m.parameter === 'pm25')?.value;
        const pm10 = measurements.find(m => m.parameter === 'pm10')?.value;
        const no2 = measurements.find(m => m.parameter === 'no2')?.value;
        const co = measurements.find(m => m.parameter === 'co')?.value;
        const o3 = measurements.find(m => m.parameter === 'o3')?.value;

        const aqRecord = new AirQuality({
          city: location.city,
          district: location.district,
          pm25, pm10, no2, co, o3, aqi
        });

        await aqRecord.save();
        console.log(`Saved AQ data for ${location.city}`);
      } catch (err) {
        console.error(`Error fetching AQ data for ${location.city}: ${err.message}`);
      }
    }
  } catch (error) {
    console.error('Data Sync Error (OpenAQ):', error);
  }
};

const fetchWeatherData = async () => {
  console.log('Fetching Open-Meteo Data...');
  try {
    for (const location of cities) {
      try {
         const response = await axios.get(OPEN_METEO_URL, {
           params: {
             latitude: location.coordinates.lat,
             longitude: location.coordinates.lon,
             current_weather: true,
             hourly: 'temperature_2m,relativehumidity_2m,precipitation,windspeed_10m'
           }
         });

         const currentWeather = response.data.current_weather;
         const hourly = response.data.hourly;
         
         const weatherRecord = new WeatherData({
           district: location.district,
           temperature: currentWeather.temperature,
           wind_speed: currentWeather.windspeed,
           rainfall: hourly.precipitation[0] || 0,
           humidity: hourly.relativehumidity_2m[0] || 50
         });

         await weatherRecord.save();
         console.log(`Saved Weather data for ${location.district}`);
      } catch(err) {
         console.error(`Error fetching Weather data for ${location.district}: ${err.message}`);
      }
    }
  } catch(error) {
    console.error('Data Sync Error (Open-Meteo):', error);
  }
}

// Ensure the cron runs every 30 minutes
const initDataSync = () => {
  console.log('Initializing Data Sync Cron Jobs...');
  cron.schedule('*/30 * * * *', async () => {
    console.log('Running scheduled data sync...');
    await fetchAirQualityData();
    await fetchWeatherData();
  });
  
  // Also run immediately on startup
  fetchAirQualityData();
  fetchWeatherData();
};

module.exports = initDataSync;
