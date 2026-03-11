const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });

// POST /api/advisory/generate
router.post('/generate', async (req, res) => {
  const { district, aqi, risk_level, rainfall, temperature } = req.body;

  if (!district) {
    return res.status(400).json({ error: 'District is required' });
  }

  try {
    const prompt = `You are an environmental health advisor for Nepal. Based on the following real-time data for ${district} district, provide a concise safety advisory in 3 sections:

Environmental Data:
- Air Quality Index (AQI): ${aqi ?? 'N/A'} ${aqi > 150 ? '(Unhealthy)' : aqi > 100 ? '(Moderate)' : '(Good)'}
- Disaster Risk Level: ${risk_level ?? 'N/A'}
- Current Rainfall: ${rainfall ?? 0} mm
- Temperature: ${temperature ?? 'N/A'}°C

Provide advisory in exactly this format:
1. HEALTH PRECAUTIONS: (2-3 specific sentences about air quality health impacts and masks/indoor advice)
2. OUTDOOR ACTIVITY GUIDANCE: (2-3 sentences about what activities are safe or should be avoided)
3. DISASTER PREPAREDNESS: (2-3 sentences about flood/landslide risk and what precautions to take)

Be specific, actionable, and relevant to Nepal's context. Keep it concise.`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });

    res.json({
      district,
      advisory: message.content[0].text,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Claude API Error:', error.message);
    res.status(500).json({ error: 'Failed to generate advisory', details: error.message });
  }
});

module.exports = router;
