import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default Leaflet icon issue in React
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow
});
L.Marker.prototype.options.icon = DefaultIcon;

const MapPage = () => {
  // Mock data for Nepal
  const nepalCenter = [28.3949, 84.1240];
  
  const mockDistricts = [
    { name: 'Kathmandu', lat: 27.7172, lng: 85.3240, aqi: 165, risk: 'High', advisory: 'Wear N95 Mask' },
    { name: 'Pokhara', lat: 28.2096, lng: 83.9856, aqi: 45, risk: 'Low', advisory: 'Status Good' },
    { name: 'Biratnagar', lat: 26.4525, lng: 87.2718, aqi: 120, risk: 'Moderate', advisory: 'Limit outdoor exertion' }
  ];

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <h1 className="text-3xl font-bold text-slate-800 mb-4">Interactive Environmental Map</h1>
      
      <div className="flex-1 rounded-2xl overflow-hidden shadow-lg border border-slate-200">
        <MapContainer center={nepalCenter} zoom={7} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {mockDistricts.map((district, idx) => (
            <Marker 
              key={idx} 
              position={[district.lat, district.lng]}
            >
              <Popup>
                <div className="p-2">
                  <h3 className="font-bold text-lg mb-2">{district.name}</h3>
                  <div className="space-y-1">
                    <p><span className="font-semibold text-slate-600">AQI:</span> <span className={district.aqi > 100 ? 'text-red-500 font-bold' : 'text-emerald-500 font-bold'}>{district.aqi}</span></p>
                    <p><span className="font-semibold text-slate-600">Disaster Risk:</span> {district.risk}</p>
                    <p><span className="font-semibold text-slate-600">AI Advisory:</span> {district.advisory}</p>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
};

export default MapPage;
