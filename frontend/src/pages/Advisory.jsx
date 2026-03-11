import React, { useState } from 'react';

const Advisory = () => {
  const [district, setDistrict] = useState('Kathmandu');
  const [loading, setLoading] = useState(false);
  const [advisory, setAdvisory] = useState(null);

  const generateAdvisory = () => {
    setLoading(true);
    // Simulate API call to backend AI service
    setTimeout(() => {
      setAdvisory(`[AI Generated Advisory for ${district}]\n\n1. Health Precautions:\nDue to the current AQI levels, sensitive groups should reduce outdoor exertion.\n\n2. Outdoor Activity:\nLimit prolonged outdoor physical activities.\n\n3. Disaster Preparedness:\nRisk of landslide is currently LOW. Avoid steep unpaved roads during heavy monsoon downpours.`);
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-extrabold text-slate-800 mb-4">AI Safety Advisory</h1>
        <p className="text-slate-600 text-lg">
          Get real-time, Claude AI-generated health and safety recommendations based on your local environmental metrics.
        </p>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex flex-col md:flex-row gap-4 items-end mb-8">
          <div className="flex-1 w-full">
            <label className="block text-sm font-semibold text-slate-700 mb-2">Select District</label>
            <select 
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-lg p-3 outline-none focus:ring-2 focus:ring-emerald-500 transition"
            >
              <option value="Kathmandu">Kathmandu</option>
              <option value="Pokhara">Pokhara</option>
              <option value="Lalitpur">Lalitpur</option>
              <option value="Biratnagar">Biratnagar</option>
              <option value="Birgunj">Birgunj</option>
            </select>
          </div>
          <button 
            onClick={generateAdvisory}
            disabled={loading}
            className="w-full md:w-auto px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition disabled:opacity-50"
          >
            {loading ? 'Generating...' : 'Generate Advisory'}
          </button>
        </div>

        {advisory && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center mr-3">
                <span className="text-emerald-700 text-xl">🤖</span>
              </div>
              <h3 className="font-bold text-lg text-slate-800">Claude AI Recommendation</h3>
            </div>
            <div className="prose prose-slate max-w-none whitespace-pre-line text-slate-700">
              {advisory}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Advisory;
