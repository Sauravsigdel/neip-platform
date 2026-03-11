import React from 'react';
import AlertBanner from '../components/AlertBanner';
import StatCard from '../components/StatCard';
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div className="space-y-6">
      {/* Alert Banner for serious issues */}
      <AlertBanner type="warning" message="High AQI detected in Kathmandu (>150). Recommended to wear N95 mask outdoors." />
      
      <section className="bg-white rounded-2xl p-8 shadow-sm">
        <h1 className="text-4xl font-extrabold text-slate-800 mb-4">Nepal Environmental Intelligence Platform</h1>
        <p className="text-slate-600 text-lg max-w-3xl leading-relaxed">
          Monitor real-time Air Quality metrics, Weather data, and receive AI-driven Disaster Risk predictions
          across all 77 districts of Nepal. Protect yourself and communities with actionable insights.
        </p>
        <div className="mt-8 flex space-x-4">
          <Link to="/map" className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition">View Live Map</Link>
          <Link to="/advisory" className="px-6 py-3 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition">Get Advisory</Link>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-slate-800 mb-4">Latest Insights (Mock Data)</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard title="Kathmandu AQI" value="165" trend="+12" status="unhealthy" />
          <StatCard title="Pokhara AQI" value="45" trend="-5" status="good" />
          <StatCard title="Sindhupalchok Risk" value="High" trend="increasing" status="critical" />
        </div>
      </section>
    </div>
  );
};

export default Home;
