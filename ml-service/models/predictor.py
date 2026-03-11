import numpy as np

# ML MODULE 1 — AQI Prediction
def predict_aqi(district, weather_features, historical_aqi):
    """
    Mock implementation of Linear Regression and ARIMA.
    Real implementation would require training data.
    """
    # Simulate a 7-day forecast
    base_aqi = np.mean(historical_aqi) if historical_aqi else 100
    temp_factor = weather_features.get('temperature', 25) * 0.5
    
    forecast = []
    confidence_interval = []
    
    for i in range(7):
        pred = max(0, base_aqi + temp_factor + np.random.normal(0, 10))
        forecast.append(round(pred, 2))
        confidence_interval.append([round(pred - 15, 2), round(pred + 15, 2)])
        
    return forecast, confidence_interval

# ML MODULE 2 — Disaster Risk Classification
def predict_disaster_risk(district, features):
    """
    Mock implementation of RandomForestClassifier.
    Outputs: Low, Moderate, High, Critical
    """
    rainfall = features.get('rainfall', 0)
    elevation = features.get('elevation_factor', 1)
    historical_index = features.get('historical_disaster_index', 1)
    
    # Simple heuristic to simulate ML model prediction
    risk_score = (rainfall * 0.5) + (elevation * 0.3) + (historical_index * 20)
    
    if risk_score > 150:
        category = 'Critical'
    elif risk_score > 100:
        category = 'High'
    elif risk_score > 50:
        category = 'Moderate'
    else:
        category = 'Low'
        
    return round(risk_score, 2), category

# ML MODULE 3 — K-Means Clustering (To be used offline or grouped occasionally)
def cluster_districts(district_data_list):
    """
    Simulates K-Means clustering for risk groups
    """
    clusters = {
        'Urban pollution': [],
        'Flood-prone': [],
        'Mountain landslide': [],
        'Low risk': []
    }
    # Logic to cluster districts goes here
    pass

# ML MODULE 4 — Anomaly Detection
def detect_anomaly(value, mean, std_dev):
    """
    Z-score Anomaly Detection
    """
    if std_dev == 0: return False
    z_score = abs(value - mean) / std_dev
    return z_score > 2.5
