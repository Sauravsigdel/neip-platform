# WeatherNepal - Change Log & Migration Guide

**Last Updated**: April 8, 2026

## Overview

This document tracks major changes to WeatherNepal throughout its development and provides migration guidance for outdated documentation.

---

## Recent Major Changes (April 2026)

### Refactoring: Hybrid Architecture Implementation

**Completed**: April 8, 2026  
**Commits**: `0bab667` (core refactoring), `ea53408` (documentation)

**What Changed**:

#### ✅ Added - New Features

- Persistent notification storage (MongoDB)
- Private + public notification routing based on severity
- Backend-driven news system (backend-first priority)
- Weather-triggered automatic alerts
- New API endpoints: `/api/notifications/*`

#### ✅ Removed - Legacy Features

- Legacy schedulers: `alertScheduler.js`, `notificationScheduler.js`
- Unused models: `DisasterRisk.js`, `OTP.js`, `UserAlert.js`
- Unused routes: `riskRoutes.js`
- ML service integration (not implemented)
- Disaster risk scoring (not implemented)

#### ✅ Updated - Architecture Clarity

- AQI `data_source` default: "simulated" → "internal-db"
- Forecast AQI: `0` placeholder → `null`
- News loading: enforces backend-first with local fallback
- Data source priority rule enforced throughout code

**Impact**: 20 files changed, 478 insertions, 1,874 deletions (-1,396 net lines)

**Tests**:

- Backend smoke test: ✅ 22/22 files passing
- Frontend linting: ✅ 0 warnings

---

## Obsolete Documentation

### ❌ ERROR_FIXES_APPLIED.md

**Status**: Obsolete - describes fixes from earlier development phases

**Was About**:

- `loadRealAQI is not defined` error
- `provinceBoundaryLayer` temporal dead zone
- Network error handling

**Why Obsolete**:

- Script loading issues have been resolved in current codebase
- Temporal dead zone fixes are now standard practice
- Error documentation only relevant to specific point-in-time bugs

**Replaced By**: See [TROUBLESHOOTING_SETUP.md](TROUBLESHOOTING_SETUP.md) for current debugging tips

---

### ❌ MAP_FIXES_APPLIED.md

**Status**: Partially Obsolete - describes UI fixes from earlier phases

**Was About**:

- City pins visibility improvements
- District boundary styling fixes
- Temperature pin interactivity
- Light theme overlay enhancements

**Why Partially Obsolete**:

- Map layer fixes are now standard (not temporary patches)
- UI improvements have been integrated into main code
- No longer need separate documentation for applied fixes

**Replaced By**: See [TROUBLESHOOTING_SETUP.md](TROUBLESHOOTING_SETUP.md) and [FINAL_ARCHITECTURE.md](FINAL_ARCHITECTURE.md) for current system state

---

### ❌ TECHNICAL_SYSTEM_REPORT.md

**Status**: Obsolete - describes pre-refactoring architecture

**Was About**:

- ML service integration (Flask + scikit-learn)
- Disaster risk scoring system
- Legacy alert scheduler
- Legacy notification scheduler
- OWM integration notes

**Why Obsolete**:

- ML service and disaster risk system were not implemented
- Alert/notification schedulers replaced by event-driven architecture
- OWM references removed from active codebase
- System report is now superseded by complete specification

**Replaced By**: See [FINAL_ARCHITECTURE.md](FINAL_ARCHITECTURE.md) for current architecture

---

## Current Documentation Structure

Where to find information:

### System Design & Architecture

📄 **[FINAL_ARCHITECTURE.md](FINAL_ARCHITECTURE.md)**

- Complete system specification
- Data flow diagrams
- API endpoints with examples
- Database schema
- Data source priority rules
- Notification system details
- Deployment checklist

### Quick Start & Setup

📄 **[../README.md](../README.md)**

- Project overview
- Tech stack
- Prerequisites
- Quick start guide
- Environment variables
- API reference summary
- Troubleshooting basics

### Setup & Troubleshooting

📄 **[TROUBLESHOOTING_SETUP.md](TROUBLESHOOTING_SETUP.md)**

- Detailed setup instructions
- Common issues and solutions
- Testing endpoints (curl examples)
- Database management
- Debugging tips
- Performance optimization
- Production deployment checklist

### Admin Features

📄 **[../ADMIN_ONLY_CHANGES.md](../ADMIN_ONLY_CHANGES.md)**

- Admin authentication system
- Alert endpoint documentation
- Notification persistence flow
- Public alert feature
- Security implementation
- Testing procedures

### Implementation Status

📄 **[IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md)**

- Current refactoring status
- All implemented features
- Validation results
- Git deployment info
- Architecture summary
- Next steps

---

## Migration Guide: From Old To New Documentation

### If You Were Reading...

**ERROR_FIXES_APPLIED.md**

- Script loading issues? → See TROUBLESHOOTING_SETUP.md "Issue 2: Module not found"
- JavaScript errors? → See TROUBLESHOOTING_SETUP.md "Debugging Tips"
- Network errors? → See TROUBLESHOOTING_SETUP.md "Issue 5: Map not loading"

**MAP_FIXES_APPLIED.md**

- Map styling questions? → See FINAL_ARCHITECTURE.md "Frontend Architecture"
- City pins not showing? → See TROUBLESHOOTING_SETUP.md "Issue 5: Map not loading"
- District boundaries? → See README.md or interactive map documentation

**TECHNICAL_SYSTEM_REPORT.md**

- System architecture? → See FINAL_ARCHITECTURE.md (completely rewritten)
- Data flow? → See FINAL_ARCHITECTURE.md "Data Flow Architecture"
- Database schema? → See FINAL_ARCHITECTURE.md "Database Schema"
- API endpoints? → See README.md or FINAL_ARCHITECTURE.md

---

## Key Concept Changes

### Data Model Evolution

**Before** (Pre-Refactoring):

```
Weather → Live API only, not stored
AQI → Database stored with "simulated" label (misleading)
News → Local generation only
Notifications → Read-only system, never written to
Alerts → Email only, no persistence
```

**After** (Current):

```
Weather → Always live, never cached from DB
AQI → Database stored with "internal-db" label (clear)
News → Backend-first (API) with local fallback
Notifications → Full read+write persistence
Alerts → Email + MongoDB storage, private+public routing
```

### Architecture Philosophy Shift

**Before**:

- Mixed data sources with unclear priority
- Ambiguous "simulated" vs "real" labels
- Read-only notifications
- Multiple scheduler services

**After**:

- Explicit backend-first priority rule
- Clear data source labels
- Full notification persistence
- Event-driven notification creation

---

## Breaking Changes

### For Frontend Developers

- Forecast AQI is now `null` instead of `0` (handle null in rendering)
- News load handler expects `boolean` return from `loadLiveNewsFromBackend()`
- Notification type now includes "alert" (update UI filters if needed)

### For Backend Developers

- Remove usage of `alertScheduler` and `notificationScheduler`
- Use event-driven notification creation instead
- Don't reference `DisasterRisk` or `UserAlert` models
- Use notification type "alert" and severity "high" for new alerts

### For Database

- OTP, UserAlert, DisasterRisk collections no longer used (can archive)
- Notification model extended (add indexes if upgrading existing DB)
- AirQuality.data_source changed from "simulated" to "internal-db"

---

## Backward Compatibility

### Existing Frontend Code

✅ **Compatible** - Frontend can use old code with new backend

- Old news loading will now try backend first (automatic improvement)
- AQI changes (null instead of 0) may show UI differently but still functional
- Public notifications now available (optional reading)

### Existing API Calls

✅ **Compatible** - All existing endpoints still work

- New Notification endpoints are additions (don't break old code)
- Alert endpoint now creates notifications (internal behavior change, same API)
- Weather/AQI endpoints unchanged

### Existing Database Data

✅ **Compatible** - Old data can be migrated

- Old AQI records with "simulated" still work (can re-label if desired)
- Old collections (OTP, UserAlert) can be archived separately
- Existing notifications will still query/display correctly

---

## System Timeline

### Phase 1: Admin Features (Earlier)

- Admin-only login
- Public alert emails
- Basic notification read system
- Email service setup

### Phase 2: Architecture Clarity (April 2026)

- Implement hybrid architecture
- Add notification persistence
- Backend-first news loading
- Remove misleading terminology
- Clean up legacy code

### Phase 3: Production Deployment (Next)

- Staging environment testing
- Integration testing
- Monitor alert creation
- User feedback collection

---

## Future Improvements

Potential enhancements (not yet implemented):

1. **Notification Batching**: Combine multiple events into daily digest
2. **Advanced Filtering**: User preferences for notification types/severity
3. **Webhook Support**: External systems can subscribe to alerts
4. **Real-time Push**: WebSocket notifications instead of polling
5. **Alert History**: Long-term archive for audit trail
6. **Multi-language**: Localization for different languages
7. **Disaster Risk**: Re-implement with current architecture (if needed)
8. **ML Predictions**: AQI forecasting if needed

---

## For Questions or Issues

- Check [TROUBLESHOOTING_SETUP.md](TROUBLESHOOTING_SETUP.md) first
- Review [FINAL_ARCHITECTURE.md](FINAL_ARCHITECTURE.md) for system design
- See [../README.md](../README.md) for quick reference
- Check [ADMIN_ONLY_CHANGES.md](../ADMIN_ONLY_CHANGES.md) for admin features
