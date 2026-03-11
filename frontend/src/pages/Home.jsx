import React, { useState, useEffect } from 'react';
import AlertBanner from '../components/AlertBanner';
import StatCard from '../components/StatCard';
import { Link } from 'react-router-dom';
import { fetchLatestAQI, fetchLatestRisk } from '../services/api';

const Home = () => {
  const [aqiData, setAqiData] = useState([]);
  const [riskData, setRiskData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [aqiRes, riskRes] = await Promise.all([fetchLatestAQI(), fetchLatestRisk()]);
        setAqiData(aqiRes.data);
        setRiskData(riskRes.data);
      } catch (err) {
        console.error('Home page load error:', err);
        setError('Could not load live data. Showing cached values.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const ktmAQI = aqiData.find(d => d.district === 'Kathmandu');
  const pokharaAQI = aqiData.find(d => d.district === 'Kaski');
  const highRisk = riskData.find(d => d.risk_level === 'Critical' || d.risk_level === 'High');

  const getAQIStatus = (aqi) => {
    if (!aqi) return 'moderate';
    if (aqi > 200) return 'critical';
    if (aqi > 150) return 'unhealthy';
    if (aqi > 100) return 'moderate';
    return 'good';
  };

  return (
    <div className="space-y-6">
      {ktmAQI?.aqi > 150 && (
        <AlertBanner type="warning" message={`High AQI detected in Kathmandu (${ktmAQI.aqi}). Recommended to wear N95 mask outdoors.`} />
      )}
      {highRisk && (
        <AlertBanner type="critical" message={`${highRisk.district} district has ${highRisk.risk_level} disaster risk. Stay alert.`} />
      )}
      {error && <AlertBanner type="info" message={error} />}

      <section className="bg-white rounded-2xl p-8 shadow-sm">
        <h1 className="text-4xl font-extrabold text-slate-800 mb-4">Nepal Environmental Intelligence Platform</h1>
        <p className="text-slate-600 text-lg max-w-3xl leading-relaxed">
          Monitor real-time Air Quality metrics, Weather data, and receive AI-driven Disaster Risk predictions across Nepal's districts.
        </p>
        <div className="mt-8 flex space-x-4">
          <Link to="/map" className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition">View Live Map</Link>
          <Link to="/advisory" className="px-6 py-3 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition">Get AI Advisory</Link>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-slate-800 mb-4">{loading ? 'Loading Live Data...' : 'Live Environmental Insights'}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            title="Kathmandu AQI"
            value={ktmAQI ? String(ktmAQI.aqi) : '—'}
            trend={ktmAQI?.aqi > 100 ? '+High' : '-Normal'}
            status={getAQIStatus(ktmAQI?.aqi)}
          />
          <StatCard
            title="Pokhara AQI"
            value={pokharaAQI ? String(pokharaAQI.aqi) : '—'}
            trend={pokharaAQI?.aqi > 100 ? '+High' : '-Normal'}
            status={getAQIStatus(pokharaAQI?.aqi)}
          />
          <StatCard
            title="Highest Risk District"
            value={highRisk?.risk_level ?? 'Low'}
            trend={highRisk ? 'increasing' : 'stable'}
            status={highRisk?.risk_level?.toLowerCase() === 'critical' ? 'critical' : highRisk?.risk_level?.toLowerCase() === 'high' ? 'unhealthy' : 'good'}
          />
        </div>
      </section>
    </div>
  );
};

export default Home;
