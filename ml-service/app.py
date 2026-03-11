from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
from models.predictor import predict_aqi, predict_disaster_risk

app = Flask(__name__)
CORS(app)

@app.route('/predict/aqi', methods=['POST'])
def aqi_prediction():
    data = request.json
    try:
        district = data.get('district')
        weather_features = data.get('weather_features', {})
        historical_aqi = data.get('historical_aqi', [])
        
        # Call ML Module 1: AQI Prediction
        forecast, confidence_interval = predict_aqi(district, weather_features, historical_aqi)
        
        return jsonify({
            'district': district,
            'forecast': forecast,
            'confidence_interval': confidence_interval,
            'model_used': 'Linear Regression & ARIMA'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/predict/disaster-risk', methods=['POST'])
def disaster_risk_prediction():
    data = request.json
    try:
        district = data.get('district')
        features = {
            'rainfall': data.get('rainfall', 0),
            'elevation_factor': data.get('elevation_factor', 0),
            'historical_disaster_index': data.get('historical_disaster_index', 0)
        }
        
        # Call ML Module 2: Disaster Risk Classification
        risk_score, risk_category = predict_disaster_risk(district, features)
        
        return jsonify({
            'district': district,
            'risk_score': risk_score,
            'risk_category': risk_category
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 400

if __name__ == '__main__':
    app.run(port=5001, debug=True)
