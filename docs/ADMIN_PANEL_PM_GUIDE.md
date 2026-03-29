# 🌏 WeatherNepal Admin Panel - PM Data Upload Guide

## 📍 Admin Panel URL

```
http://localhost:5173/admin-panel.html
```

OR in production (when running on deployed frontend):

```
https://your-domain.com/admin-panel.html
```

## 🔐 Login

1. **Access the Admin Panel URL**
2. **Enter your admin credentials:**
   - Email: Your admin email address
   - Password: Your admin password
3. **Click "Login"** - You'll be authenticated via the WeatherNepal auth system

## 📊 Uploading PM Values Manually

### Required Fields:

- **Air Quality Station** ✓ Select from dropdown (Kathmandu, Pokhara, Bhaktapur, etc.)
- **PM2.5 (µg/m³)** ✓ Fine particulate matter (e.g., 45.5)
- **PM10 (µg/m³)** ✓ Coarse particulate matter (e.g., 89.2)
- **PM1 (µg/m³)** ✓ Ultra-fine particulate matter (e.g., 25.3)

### Optional Fields:

- **AQI** - Air Quality Index (0-500)
- **CO** - Carbon Monoxide (ppm)
- **O3** - Ozone (ppb)

### Step-by-Step Upload:

1. **Select Station** from the dropdown
2. **Enter PM2.5, PM10, and PM1 values** (minimum required)
3. **Optionally enter AQI, CO, and O3** if you have them
4. **Click "📤 Upload Data"**
5. **Success message confirms the upload**
6. **Data appears in "Recent Uploads" table within 1 minute**

## 📋 Viewing Recent Uploads

The admin panel displays a history of the last 120 uploads showing:

- Station name
- PM2.5, PM10, PM1 values
- AQI value (if entered)
- Upload timestamp (in Nepal Time)

History refreshes automatically every 60 seconds.

## 🔄 API Endpoint (Advanced)

If integrating with external systems:

```bash
POST /api/map/admin/official-aqi-manual
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "records": [
    {
      "stationName": "Kathmandu",
      "pm25": 45.5,
      "pm10": 89.2,
      "pm1": 25.3,
      "aqi": 150,
      "co": 1.5,
      "o3": 50.5
    }
  ]
}
```

### Response:

```json
{
  "success": true,
  "source": "nepal-gov-manual",
  "matched": 1,
  "modified": 1,
  "upserted": 0
}
```

## 📍 Supported Stations

- Kathmandu
- Pokhara
- Bhaktapur
- Lalitpur
- Ghorahi
- Birgunj
- Janakpur
- Nepalgunj
- Dharan
- Biratnagar

Add more stations by editing the admin-panel.html `<select>` options.

## 🎯 Understanding PM Values

| PM Type   | Size      | Source                          | Health Impact                         |
| --------- | --------- | ------------------------------- | ------------------------------------- |
| **PM1**   | <1 µm     | Combustion, ultrafine pollution | Deeply penetrates lungs & bloodstream |
| **PM2.5** | 1-2.5 µm  | Dust, smoke, industrial         | Chronic respiratory & cardiovascular  |
| **PM10**  | 2.5-10 µm | Dust, pollen, construction      | Upper respiratory irritation          |

## ✅ Troubleshooting

**Login Failed:**

- Ensure you're using valid admin credentials
- Check that the backend is running on port 5000

**Upload Failed - "Invalid Station":**

- Make sure the station name matches exactly from the dropdown

**Upload Failed - "Not authenticated":**

- Your session may have expired
- Click Logout and log back in

**No Recent Uploads Shown:**

- Wait 1-2 minutes for data to sync
- Check the backend logs for errors
- Try refreshing the page

## 🚀 Features

✅ **Real-time Upload** - Data posted immediately  
✅ **Browser-based** - No installation needed  
✅ **Responsive Design** - Works on desktop & tablet  
✅ **Session Persistence** - Token saved in browser  
✅ **Auto-refresh History** - See latest uploads automatically  
✅ **Error Handling** - Clear error messages for troubleshooting  
✅ **AQI Auto-calculation** - System calculates AQI from PM values

## 📝 Notes

- PM values are stored with timezone Asia/Kathmandu
- Historical data is retained for audit purposes
- PM1 replaces NO₂ in the air quality display
- All uploads are timestamped automatically
- Data is synced to the map display within 30 seconds

---

For issues, check the browser console for detailed error logs or review backend logs at `npm start` output.
