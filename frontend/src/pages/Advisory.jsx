import React, { useState, useEffect } from 'react';
import { generateAdvisory, fetchLatestAQI, fetchLatestRisk, fetchLatestWeather } from '../services/api';

const Advisory = () => {
  const [district, setDistrict] = useState('Kathmandu');
  const [loading, setLoading] = useState(false);
  const [advisory, setAdvisory] = useState(null);
  const [liveData, setLiveData] = useState({});

  const districtMap = {
    'Kathmandu': 'Kathmandu',
    'Pokhara': 'Kaski',
    'Lalitpur': 'Lalitpur',
    'Biratnagar': 'Morang',
    'Birgunj': 'Parsa'
  };

  useEffect(() => {
    const loadLiveData = async () => {
      try {
        const [aqiRes, riskRes, weatherRes] = await Promise.all([
          fetchLatestAQI(), fetchLatestRisk(), fetchLatestWeather()
        ]);
        const combined = {};
        aqiRes.data.forEach(d => { combined[d.district] = { ...combined[d.district], aqi: d.aqi }; });
        riskRes.data.forEach(d => { combined[d.district] = { ...combined[d.district], risk_level: d.risk_level }; });
        weatherRes.data.forEach(d => { combined[d.district] = { ...combined[d.district], rainfall: d.rainfall, temperature: d.temperature }; });
        setLiveData(combined);
      } catch (err) {
        console.error('Failed to load live data for advisory', err);
      }
    };
    loadLiveData();
  }, []);

  const handleGenerate = async () => {
    setLoading(true);
    setAdvisory(null);
    try {
      const dbDistrict = districtMap[district];
      const data = liveData[dbDistrict] || {};
      const res = await generateAdvisory({
        district,
        aqi: data.aqi ?? 100,
        risk_level: data.risk_level ?? 'Moderate',
        rainfall: data.rainfall ?? 0,
        temperature: data.temperature ?? 25
      });
      setAdvisory(res.data);
    } catch (err) {
      console.error('Advisory generation error:', err);
      setAdvisory({ advisory: 'Failed to generate advisory. Please check your API key and backend connection.', error: true });
    } finally {
      setLoading(false);
    }
  };

  const dbDistrict = districtMap[district];
  const currentData = liveData[dbDistrict] || {};

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-extrabold text-slate-800 mb-4">AI Safety Advisory</h1>
        <p className="text-slate-600 text-lg">Real-time Claude AI health and safety recommendations based on live environmental data.</p>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
        {/* Live data preview */}
        {Object.keys(currentData).length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-slate-50 rounded-xl">
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-500">{currentData.aqi ?? '—'}</div>
              <div className="text-xs text-slate-500 mt-1">Current AQI</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-500">{currentData.rainfall ?? '—'} mm</div>
              <div className="text-xs text-slate-500 mt-1">Rainfall</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${currentData.risk_level === 'Critical' ? 'text-red-600' : currentData.risk_level === 'High' ? 'text-orange-500' : 'text-emerald-500'}`}>
                {currentData.risk_level ?? '—'}
              </div>
              <div className="text-xs text-slate-500 mt-1">Disaster Risk</div>
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-4 items-end mb-8">
          <div className="flex-1 w-full">
            <label className="block text-sm font-semibold text-slate-700 mb-2">Select District</label>
            <select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-lg p-3 outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {Object.keys(districtMap).map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full md:w-auto px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition disabled:opacity-50"
          >
            {loading ? 'Generating with Claude AI...' : 'Generate Advisory'}
          </button>
        </div>

        {advisory && (
          <div className={`border rounded-xl p-6 ${advisory.error ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center mr-3">
                <span className="text-emerald-700 text-xl">🤖</span>
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-800">Claude AI Recommendation</h3>
                {advisory.generated_at && (
                  <p className="text-xs text-slate-400">Generated: {new Date(advisory.generated_at).toLocaleString()}</p>
                )}
              </div>
            </div>
            <div className="whitespace-pre-line text-slate-700 leading-relaxed">{advisory.advisory}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Advisory;
