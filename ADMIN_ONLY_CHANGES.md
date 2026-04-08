# Admin Features & Authentication System

## Overview

**Last Updated**: April 8, 2026  
**Status**: ✅ Complete with notification persistence

Administrative dashboard with role-based access, direct weather alerts, and automatic notification storage.

## Authentication System

### Two-Tier Access Control

**Admin Users** (role="admin"):
- Access to admin dashboard (`/api/advisory`, `/api/alerts/send-direct`)
- Direct alert sending with automatic notification persistence
- JWT token based authentication

**Public Users**:
- Can subscribe for email alerts via public endpoint
- No authentication required
- Rate-limited to prevent abuse

## Admin Dashboard Features

### 1. Authentication Endpoint: `/api/auth/login`

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@weathernepal.com",
  "password": "admin_password"
}
```

**Response (if admin)**:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "user_id",
    "name": "Admin User",
    "email": "admin@weathernepal.com",
    "role": "admin"
  }
}
```

**Response (if not admin)**:
```json
{
  "success": false,
  "error": "Admin login only. Regular users can send alerts via the alert button.",
  "code": "NOT_ADMIN"
}
```

### 2. Direct Alert Endpoint: `POST /api/alerts/send-direct`

**Authentication**: Required (JWT token)  
**Authorization**: Admin only  
**Rate Limit**: None (authenticated)

```bash
POST /api/alerts/send-direct
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "recipients": ["user@email.com", "admin@email.com"],
  "location": "Kathmandu",
  "district": "Kathmandu",
  "safeAqi": 150,
  "currentWeather": {
    "temperature": 28,
    "rainfall": 5,
    "windSpeed": 25
  },
  "advisory": "Heavy rainfall and strong winds expected"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Alert sent to 2 recipients",
  "notificationsCreated": 2
}
```

**Behavior**:
- Sends formatted HTML email to all recipients
- Creates **private Notification** record for each user
- Creates **public Notification** if severity is "high" or AQI > 150
- Email includes current weather, advisory, and color-coded severity
- All notifications stored in MongoDB with 3-day TTL

### 3. Notification Persistence (NEW)

When admin sends direct alert:

```
POST /api/alerts/send-direct
    ↓
Evaluate alert severity
    ↓
Send email to recipients
    ↓
Create private Notification (for each user)
    ├─ userId: user's ID
    ├─ type: "alert"
    ├─ severity: "high"/"warning"/"info"
    ├─ message: alert content
    └─ isPublic: false
    ↓
If severity="high" OR aqi > 150:
    └─ Create public Notification
        ├─ isPublic: true
        ├─ type: "alert"
        ├─ message: alert summary
        └─ visibility: ALL USERS
```

## Public Alert System

### Public Endpoint: `POST /api/auth/send-alert-email`

**Authentication**: None (publicly accessible)  
**Rate Limit**: 10 requests per hour per IP address

```bash
POST /api/auth/send-alert-email
Content-Type: application/json

{
  "email": "visitor@email.com",
  "name": "John Doe",
  "location": "Kathmandu",
  "message": "Alert for heavy rain and strong winds",
  "severity": "high"  // critical, high, moderate, low
}
```

**Response**:
```json
{
  "success": true,
  "message": "Alert sent to visitor@email.com"
}
```

**Features**:
- No authentication required
- Rate-limited per IP to prevent spam
- HTML-formatted email with color-coded severity
- Responsive email template
- Success/error feedback to client

## Frontend Integration

### Admin Dashboard (After Login)

- Weather advisory generator: `POST /api/advisory/generate`
- Quick advisory: `POST /api/advisory/quick`
- Direct alert sender: `POST /api/alerts/send-direct`
- Monitor public notifications: `GET /api/notifications/public`

### Public Alert Modal

**Available to all visitors** (no login required):

1. Click on city pin on map
2. "🔔 Set Weather Alert for This Location" button appears
3. Opens modal with fields:
   - Name
   - Email
   - Location (pre-filled)
   - Alert type selection
4. Submit → Sends to `/api/auth/send-alert-email`
5. Success message displayed

## Security Implementation

✅ **Authentication**:
- JWT token validation on admin endpoints
- Role-based authorization (admin role required)
- Password hashing with bcrypt

✅ **Rate Limiting**:
- Public endpoint: 10 requests/hour/IP
- Prevents abuse of email system

✅ **Validation**:
- Email format validation
- Location verification against nepal_cities.js
- Message length validation (min 5 chars, max 1000)
- Severity enum validation (critical/high/moderate/low)

✅ **Data Protection**:
- HTML email escaping (prevents injection)
- Rate limit enforced per IP (using request IP detection)
- Notifications auto-expire after 3 days (TTL index)

## Testing Checklist

**For Admin Features**:

```bash
# 1. Login as admin
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@weathernepal.com",
    "password": "admin_password"
  }'
# Save the returned token

# 2. Send direct alert (with token)
curl -X POST http://localhost:5000/api/alerts/send-direct \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "recipients": ["test@example.com"],
    "location": "Kathmandu",
    "district": "Kathmandu",
    "safeAqi": 160,
    "currentWeather": {"temperature": 25}
  }'

# 3. Verify notification was created
curl -X GET "http://localhost:5000/api/notifications/public"

# Expected: Array with alert notification
```

**For Public Features**:

```bash
# 1. Send public alert (NO auth needed)
curl -X POST http://localhost:5000/api/auth/send-alert-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "visitor@example.com",
    "name": "Test User",
    "location": "Kathmandu",
    "severity": "high",
    "message": "Heavy rain warning"
  }'
# Then check visitor@example.com inbox

# 2. Try multiple requests rapidly (should hit rate limit)
# After 10 successful requests in 1 hour, you'll get:
{
  "error": "Rate limit exceeded. Max 10 requests per hour."
}
```

## Configuration

**Required Environment Variables** (backend/.env):

```env
# Email service
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-password

# JWT signing
JWT_SECRET=your-secret-key-min-32-chars

# Public signup (optional)
ALLOW_PUBLIC_SIGNUP=false
```

## Related Documentation

- See [FINAL_ARCHITECTURE.md](docs/FINAL_ARCHITECTURE.md) for complete system spec
- See [README.md](README.md) for API reference and setup
- See [TROUBLESHOOTING_SETUP.md](docs/TROUBLESHOOTING_SETUP.md) for common issues
- Message length validation (min 5 chars)
- Severity validated against allowed values
- Backend validates all inputs before sending emails
