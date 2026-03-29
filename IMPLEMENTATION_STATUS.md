# Implementation Complete: Admin-Only Login + Public Alert Emails

## ✅ What Was Done

### Backend (`backend/src/routes/authRoutes.js`)

1. **Admin-Only Login**
   - Modified POST `/api/auth/login` endpoint
   - Added role check: Only `user.role === "admin"` can login
   - Returns 403 Forbidden with message: "Admin login only. Regular users can send alerts via the alert button."

2. **Public Alert Email Endpoint**
   - New POST `/api/auth/send-alert-email` endpoint
   - No authentication required (public endpoint)
   - Rate limited: 10 requests per hour per IP
   - Accepts: email, name, location, message, severity
   - Sends HTML-formatted alert email to user
   - Returns 200 with success message on completion

### Frontend (`frontend/public/js/weathernepal_map.auth.js`)

1. **Alert Modal Functions**
   - `openAlert()` - Opens alert form for non-logged-in users
   - `closeAlert()` - Closes alert modal
   - `submitAlert()` - Submits form to public endpoint with validation

2. **Alert Form Integration**
   - User enters name and email
   - Selects alert preferences (AQI, Rain, Wind, Snow, Temp, Daily)
   - Submits to `/api/auth/send-alert-email`
   - Shows success feedback

## 🧪 How to Test

### Test 1: Admin Login (Should Work)

```bash
URL: http://localhost:5000/api/auth/login
Method: POST
Body: {
  "email": "admin@weathernepal.com",
  "password": "admin_password"
}
Expected: 200 OK + JWT token
```

### Test 2: Non-Admin Login (Should Fail)

```bash
URL: http://localhost:5000/api/auth/login
Method: POST
Body: {
  "email": "user@weathernepal.com",
  "password": "user_password"
}
Expected: 403 Forbidden
Response: {
  "error": "Admin login only. Regular users can send alerts via the alert button.",
  "code": "NOT_ADMIN"
}
```

### Test 3: Public Alert Email (No Auth Required)

```bash
URL: http://localhost:5000/api/auth/send-alert-email
Method: POST
Headers: Content-Type: application/json
Body: {
  "email": "visitor@example.com",
  "name": "John Doe",
  "location": "Kathmandu",
  "message": "Alert for heavy rain and strong winds",
  "severity": "high"
}
Expected: 200 OK
Response: {
  "success": true,
  "message": "Alert sent to visitor@example.com"
}
User receives HTML email with alert details
```

### Test 4: Frontend - Non-Logged-In User Alert

1. Open http://localhost:5175 in browser
2. Click on any city pin on the map
3. Button "🔔 Set Weather Alert for This Location" appears
4. Click the button → Alert modal opens
5. Fill in name: "Test User"
6. Fill in email: "test@example.com"
7. Check/uncheck alert preferences
8. Click "Activate Alerts →"
9. Should send to public endpoint and show success message

### Test 5: Frontend - Admin Login

1. Click "Admin Log In" button
2. Enter admin email and password
3. If user IS admin: Login succeeds, dashboard opens
4. If user IS NOT admin: Shows error "Admin login only..."

## 📊 Files Modified

### Backend

- `backend/src/routes/authRoutes.js` - Login role check + new public endpoint

### Frontend

- `frontend/public/js/weathernepal_map.auth.js` - Alert modal functions

## 🔒 Security Features

✅ Admin-only login enforced at endpoint level
✅ Public alerts rate-limited (10/hour/IP)
✅ Email validation on both auth and public endpoints
✅ Message validation (min 5 chars)
✅ Severity validation (critical/high/moderate/low only)
✅ HTML email escaping to prevent injection
✅ Bearer token auth on protected endpoints

## 🚀 Running the System

```bash
# Terminal 1: Start backend
cd backend
npm start

# Terminal 2: Start frontend
cd frontend
npm run dev

# Access at:
# Frontend: http://localhost:5175
# Backend API: http://localhost:5000
```

## 📝 Server Status

✅ Backend: Running on port 5000
✅ Frontend: Running on port 5175 (or 5173/5174 if in use)
✅ MongoDB: Connected
✅ Email Service: Ready (SMTP configured)

---

**Note**: Deploy with environment variables:

- `JWT_SECRET` - For token signing (min 32 chars)
- `CORS_ORIGINS` - Comma-separated allowed origins
- `MONGO_URI` - MongoDB connection string
- `GMAIL_USER` & `GMAIL_APP_PASSWORD` - SMTP credentials

Public endpoint URL for frontend: `${API}/auth/send-alert-email`
