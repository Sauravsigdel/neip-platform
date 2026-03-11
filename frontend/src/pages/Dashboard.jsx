import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

const Dashboard = () => {
  // Mock trend data
  const aqiTrend = [
    { name: 'Mon', Kathmandu: 120, Pokhara: 45 },
    { name: 'Tue', Kathmandu: 132, Pokhara: 48 },
    { name: 'Wed', Kathmandu: 145, Pokhara: 52 },
    { name: 'Thu', Kathmandu: 165, Pokhara: 60 },
    { name: 'Fri', Kathmandu: 155, Pokhara: 55 },
    { name: 'Sat', Kathmandu: 142, Pokhara: 50 },
    { name: 'Sun', Kathmandu: 130, Pokhara: 45 },
  ];

  const rainfallData = [
    { name: 'Kathmandu', rainfall: 12 },
    { name: 'Pokhara', rainfall: 45 },
    { name: 'Biratnagar', rainfall: 25 },
    { name: 'Birgunj', rainfall: 5 },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-slate-800">Environmental Analytics</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* AQI Trend Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-xl font-bold text-slate-700 mb-6">7-Day AQI Trend</h2>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={aqiTrend} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0"/>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748B'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748B'}} />
                <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}/>
                <Legend />
                <Line type="monotone" dataKey="Kathmandu" stroke="#f59e0b" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                <Line type="monotone" dataKey="Pokhara" stroke="#10b981" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Rainfall Bar Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-xl font-bold text-slate-700 mb-6">Current Rainfall (mm)</h2>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rainfallData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0"/>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748B'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748B'}} />
                <Tooltip cursor={{fill: '#F1F5F9'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}/>
                <Bar dataKey="rainfall" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default Dashboard;
