import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { fetchAQIHistory, fetchLatestWeather } from '../services/api';

const Dashboard = () => {
  const [aqiHistory, setAqiHistory] = useState([]);
  const [weatherData, setWeatherData] = useState([]);
  const [selectedDistrict, setSelectedDistrict] = useState('Kathmandu');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [aqiRes, weatherRes] = await Promise.all([
          fetchAQIHistory(selectedDistrict),
          fetchLatestWeather()
        ]);
        // Format AQI history for chart (reverse to chronological order)
        const formatted = aqiRes.data.slice().reverse().map((item, idx) => ({
          name: `T-${aqiRes.data.length - 1 - idx}`,
          AQI: item.aqi,
          PM25: item.pm25 ? Math.round(item.pm25) : null
        }));
        setAqiHistory(formatted);
        const rainfallChart = weatherRes.data.map(w => ({
          name: w.district,
          rainfall: w.rainfall ?? 0,
          humidity: w.humidity ?? 0
        }));
        setWeatherData(rainfallChart);
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedDistrict]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-800">Environmental Analytics</h1>
        <select
          value={selectedDistrict}
          onChange={e => setSelectedDistrict(e.target.value)}
          className="border border-slate-200 rounded-lg px-4 py-2 text-slate-700 bg-white"
        >
          <option value="Kathmandu">Kathmandu</option>
          <option value="Kaski">Kaski (Pokhara)</option>
          <option value="Lalitpur">Lalitpur</option>
          <option value="Morang">Morang (Biratnagar)</option>
          <option value="Parsa">Parsa (Birgunj)</option>
        </select>
      </div>

      {loading && <p className="text-slate-500">Loading analytics data...</p>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-xl font-bold text-slate-700 mb-6">AQI History — {selectedDistrict}</h2>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={aqiHistory} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0"/>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748B'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748B'}} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="AQI" stroke="#f59e0b" strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="PM25" stroke="#ef4444" strokeWidth={2} dot={false} strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-xl font-bold text-slate-700 mb-6">Current Rainfall by District (mm)</h2>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weatherData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0"/>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748B'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748B'}} />
                <Tooltip />
                <Bar dataKey="rainfall" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Rainfall (mm)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
