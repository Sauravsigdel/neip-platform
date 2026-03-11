import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchMapData } from '../services/api';

// AQI color scale
const getAQIColor = (aqi) => {
  if (!aqi) return '#94a3b8';
  if (aqi > 200) return '#7e22ce';
  if (aqi > 150) return '#ef4444';
  if (aqi > 100) return '#f97316';
  if (aqi > 50) return '#eab308';
  return '#22c55e';
};

const getRiskColor = (level) => {
  switch(level) {
    case 'Critical': return '#ef4444';
    case 'High': return '#f97316';
    case 'Moderate': return '#eab308';
    default: return '#22c55e';
  }
};

const districtCoords = {
  'Kathmandu': { lat: 27.7172, lng: 85.3240 },
  'Kaski': { lat: 28.2096, lng: 83.9856 },
  'Lalitpur': { lat: 27.6588, lng: 85.3247 },
  'Morang': { lat: 26.4525, lng: 87.2718 },
  'Parsa': { lat: 27.0122, lng: 84.8773 }
};

const MapPage = () => {
  const [mapData, setMapData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('aqi'); // 'aqi' or 'risk'
  const nepalCenter = [28.3949, 84.1240];

  useEffect(() => {
    fetchMapData()
      .then(res => setMapData(res.data))
      .catch(() => setMapData([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold text-slate-800">Interactive Environmental Map</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('aqi')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${viewMode === 'aqi' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'}`}
          >AQI View</button>
          <button
            onClick={() => setViewMode('risk')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${viewMode === 'risk' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'}`}
          >Risk View</button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mb-3 text-xs font-medium text-slate-600">
        {viewMode === 'aqi' ? (
          <>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500 inline-block"></span>Good (&lt;50)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-400 inline-block"></span>Moderate (50-100)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-orange-500 inline-block"></span>Unhealthy (100-150)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span>Very Unhealthy (&gt;150)</span>
          </>
        ) : (
          <>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500 inline-block"></span>Low</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-400 inline-block"></span>Moderate</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-orange-500 inline-block"></span>High</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span>Critical</span>
          </>
        )}
      </div>

      <div className="flex-1 rounded-2xl overflow-hidden shadow-lg border border-slate-200">
        {loading ? (
          <div className="h-full flex items-center justify-center bg-slate-50">
            <p className="text-slate-500">Loading map data...</p>
          </div>
        ) : (
          <MapContainer center={nepalCenter} zoom={7} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {mapData.map((d) => {
              const coords = districtCoords[d.district];
              if (!coords) return null;
              const color = viewMode === 'aqi' ? getAQIColor(d.aqi) : getRiskColor(d.risk_level);
              return (
                <CircleMarker
                  key={d.district}
                  center={[coords.lat, coords.lng]}
                  radius={20}
                  fillColor={color}
                  color="#fff"
                  weight={2}
                  opacity={1}
                  fillOpacity={0.8}
                >
                  <Popup>
                    <div className="p-1 min-w-[150px]">
                      <h3 className="font-bold text-base mb-2">{d.district}</h3>
                      <div className="space-y-1 text-sm">
                        <p><span className="font-semibold">AQI:</span> <span className="font-bold" style={{color: getAQIColor(d.aqi)}}>{d.aqi ?? 'N/A'}</span></p>
                        <p><span className="font-semibold">Disaster Risk:</span> <span style={{color: getRiskColor(d.risk_level)}}>{d.risk_level ?? 'N/A'}</span></p>
                        <p><span className="font-semibold">Risk Score:</span> {d.risk_score ?? 'N/A'}</p>
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        )}
      </div>
    </div>
  );
};

export default MapPage;
