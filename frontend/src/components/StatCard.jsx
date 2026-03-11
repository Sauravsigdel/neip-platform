import React from 'react';

const StatCard = ({ title, value, trend, status }) => {
  const statusColors = {
    good: 'text-emerald-500',
    moderate: 'text-amber-500',
    unhealthy: 'text-orange-500',
    critical: 'text-red-600'
  };

  const color = statusColors[status] || 'text-slate-800';

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition">
      <h3 className="text-slate-500 font-medium text-sm mb-2">{title}</h3>
      <div className="flex items-baseline justify-between mb-2">
        <span className={`text-4xl font-extrabold ${color}`}>{value}</span>
      </div>
      <div className="text-sm">
         <span className={trend.startsWith('+') ? 'text-red-500 font-medium' : 'text-emerald-500 font-medium'}>
           {trend}
         </span>
         <span className="text-slate-400 ml-1">vs yesterday</span>
      </div>
    </div>
  );
};

export default StatCard;
