from flask import Flask, request, jsonify
from flask_cors import CORS
from models.predictor import predict_aqi, predict_disaster_risk, cluster_districts, detect_anomaly

app = Flask(__name__)
CORS(app)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ML Service running', 'version': '1.0'})

@app.route('/predict/aqi', methods=['POST'])
def aqi_prediction():
    data = request.json
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    try:
        district = data.get('district', 'Unknown')
        weather_features = data.get('weather_features', {})
        historical_aqi = data.get('historical_aqi', [])
        forecast, confidence_interval = predict_aqi(district, weather_features, historical_aqi)
        return jsonify({
            'district': district,
            'forecast': forecast,
            'confidence_interval': confidence_interval,
            'model_used': 'Linear Regression + EMA Smoothing'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/predict/disaster-risk', methods=['POST'])
def disaster_risk_prediction():
    data = request.json
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    try:
        district = data.get('district', 'Unknown')
        features = {
            'rainfall': data.get('rainfall', 0),
            'elevation_factor': data.get('elevation_factor', 1.0),
            'historical_disaster_index': data.get('historical_disaster_index', 2.0)
        }
        risk_score, risk_category = predict_disaster_risk(district, features)
        return jsonify({
            'district': district,
            'risk_score': risk_score,
            'risk_category': risk_category
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/cluster/districts', methods=['POST'])
def cluster():
    data = request.json
    if not data or 'districts' not in data:
        return jsonify({'error': 'districts array required'}), 400
    try:
        result = cluster_districts(data['districts'])
        return jsonify({'clusters': result})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/detect/anomaly', methods=['POST'])
def anomaly():
    data = request.json
    try:
        value = data.get('value')
        historical = data.get('historical_values', [])
        is_anomaly, z_score = detect_anomaly(value, historical)
        return jsonify({'is_anomaly': is_anomaly, 'z_score': z_score})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

if __name__ == '__main__':
    app.run(port=5001, debug=True)
