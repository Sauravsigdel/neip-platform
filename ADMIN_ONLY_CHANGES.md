# Admin-Only Login + Public Alert Email System

## Overview

Implemented two-tier authentication system:

- **Admin-only login**: Only users with `role="admin"` can access the admin dashboard
- **Public alert emails**: Non-logged-in users can send themselves alert emails for any location

## Backend Changes

### 1. Modified `/api/auth/login` endpoint

- Added role check: returns `403 Forbidden` if user.role !== "admin"
- Error message: "Admin login only. Regular users can send alerts via the alert button."
- File: `backend/src/routes/authRoutes.js`

### 2. New Public Endpoint: `POST /api/auth/send-alert-email`

- **No authentication required** - publicly accessible
- **Rate limited**: Max 10 requests per hour per IP address
- **Parameters**:
  ```json
  {
    "email": "user@email.com",
    "name": "User Name",
    "location": "Kathmandu",
    "message": "Weather alert condition description",
    "severity": "moderate" // critical, high, moderate, low
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "Alert sent to user@email.com"
  }
  ```
- Sends formatted HTML email with alert details
- Color-coded by severity level

## Frontend Changes

### Alert Modal Functions (Public)

- `openAlert()` - Opens the alert modal for non-logged-in users
- `closeAlert()` - Closes the alert modal
- `submitAlert()` - Submits the alert form to the new endpoint

### Alert Flow

1. Guest user clicks on a city pin on the map
2. "🔔 Set Weather Alert for This Location" button appears
3. User clicks button → Alert modal opens
4. User enters name, email, and selects alert preferences
5. User clicks "Activate Alerts" → Sends to `/api/auth/send-alert-email`
6. Backend sends formatted email to user's email address
7. Success message shown

### Key Features

- Alert modal shows selected location
- Checkbox preferences for multiple alert types
- HTML email template with color-coded severity
- Success/error feedback to user
- Auto-closes modal after 3 seconds on success

## Testing the System

### For Admins:

```bash
# Login with admin credentials
POST /api/auth/login
{
  "email": "admin@weathernepal.com",
  "password": "admin_password"
}
# Returns: 200 OK with JWT token (if admin role)
```

### For Regular Users (Non-Logged-In):

```bash
# Send alert email (no auth needed)
POST /api/auth/send-alert-email
{
  "email": "visitor@email.com",
  "name": "John Doe",
  "location": "Kathmandu",
  "message": "Alert preferences for weather notifications",
  "severity": "moderate"
}
# Returns: 200 OK with email sent confirmation
```

## Security Notes

- Public endpoint is rate-limited to prevent abuse
- Email validation enforced on both endpoints
- Message length validation (min 5 chars)
- Severity validated against allowed values
- Backend validates all inputs before sending emails
