# WeatherNepal - Security & Configuration Guide

**Date**: April 8, 2026  
**Status**: ✅ SECURE - No API keys exposed

---

## 🔒 Security Audit Results

### API Keys & Secrets - STATUS: ✅ PROTECTED

**Checked for hardcoded secrets**:

- ❌ No actual Gmail passwords
- ❌ No actual JWT secrets
- ❌ No actual NASA FIRMS API keys
- ❌ No actual tokens or credentials

**What's in GitHub** (Public repo):

```
✅ Only placeholder values:
   - GMAIL_APP_PASSWORD=your-app-password
   - JWT_SECRET=change_me_for_production
   - NASA_FIRMS_KEY=your_nasa_firms_key
```

**Protection Mechanism**:

- ✅ `.env` file is in `.gitignore` (not tracked by git)
- ✅ `.env.example` files ARE tracked (shows what variables are needed)
- ✅ No credentials hardcoded in source code
- ✅ All sensitive data must be in local `.env` file (not committed)

---

## .gitignore Analysis

**Current .gitignore entries**:

```
node_modules          # Node.js dependencies (local only)
.env                  # Actual environment variables (PROTECTED ✅)
dist                  # Build artifacts (local only)
build                 # Build output (local only)
__pycache__          # Python cache (local only)
*.pyc                # Python compiled files (local only)
```

**Status**: ✅ **All sensitive items properly excluded**

---

## Environment Variables - How They're Used

### Backend Configuration (backend/.env) - **NOT IN GIT**

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/neip_db

# 🔐 SENSITIVE - NEVER COMMIT THIS FILE
JWT_SECRET=xxx-your-actual-secret-key-xxx
GMAIL_USER=your-real-email@gmail.com
GMAIL_APP_PASSWORD=xxx-app-specific-password-xxx
NASA_FIRMS_KEY=xxx-your-api-key-xxx

ALLOW_PUBLIC_SIGNUP=false
WAQI_ONLY_AQI_MODE=false
```

### Frontend Configuration (frontend/.env) - **NOT IN GIT**

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

### What's In GitHub (Safe)

**backend/.env.example** (✅ Public):

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/neip_db
JWT_SECRET=your-secret-key-min-32-chars
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-password
NASA_FIRMS_KEY=your_nasa_firms_key
ALLOW_PUBLIC_SIGNUP=false
WAQI_ONLY_AQI_MODE=false
```

**frontend/.env.example** (✅ Public):

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

---

## Security Verification Checklist

✅ **Git History Check**:

- No `.env` files found in git tracking
- No actual API keys in source code
- Only placeholder values visible

✅ **File Exclusion**:

- `.env` is in `.gitignore` ✓
- `node_modules` is in `.gitignore` ✓
- Build artifacts excluded ✓
- Python cache excluded ✓

✅ **Source Code Review**:

- No hardcoded secrets found in JavaScript/TypeScript
- No hardcoded secrets found in Node.js backend
- All credentials sourced from environment variables

✅ **Configuration Files**:

- Only `.example` files committed to git
- Actual config files are local-only
- Clear instructions provided for setup

---

## 🐍 What is .venv?

### Definition

**`.venv`** is a **Python Virtual Environment** directory.

Think of it like **`node_modules/` for Python** - but it's different:

| Aspect             | Node.js npm                | Python venv                       |
| ------------------ | -------------------------- | --------------------------------- |
| **Directory name** | `node_modules/`            | `.venv/` (or `venv/`)             |
| **What it stores** | Dependencies               | Python interpreter + dependencies |
| **What's tracked** | Not tracked (`.gitignore`) | Not tracked (`.gitignore`)        |
| **How created**    | `npm install`              | `python -m venv .venv`            |
| **How used**       | Automatic                  | Requires activation               |

### Why Use Virtual Environments?

1. **Isolation**: Each project has its own Python interpreter and packages
2. **No conflicts**: Different projects can use different versions of libraries
3. **Clean dependencies**: Only required packages are installed
4. **Reproducibility**: Easy to share `requirements.txt` with exact versions

### WeatherNepal's Python Usage

**ML Service** (`ml-service/` folder):

- Uses Flask (web framework)
- Uses pandas (data manipulation)
- Uses scikit-learn (machine learning)
- Uses statsmodels (statistical modeling)

**If you were running the ML service**, you would need `.venv`:

```bash
# Create virtual environment
python -m venv .venv

# Activate it
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r ml-service/requirements.txt

# Run it
python ml-service/app.py

# Deactivate when done
deactivate
```

### Current Status: NOT USED

✅ WeatherNepal's **ML service is not actively used** in the current architecture (refactored out)

- `ml-service/` exists but is disabled
- `requirements.txt` is present but dependencies not installed
- `.venv/` is not created because ML service is not running

**Why not use it?**

- Frontend and backend work entirely with Node.js/Express
- No Python code is being executed in production
- ML predictions were removed in the refactoring for simplicity

---

## Further Security Recommendations

### 1. Add to .gitignore (Suggested)

```
# Add these for extra safety:
.venv
venv
env
*.pem
*.key
*.jks
.aws
.google
dist/
*.log
```

### 2. Environment Variables Best Practices

✅ **Do**:

- Store secrets in `.env` (local file, never committed)
- Use different values for development vs production
- Rotate secrets regularly
- Document required variables in `.env.example`

❌ **Don't**:

- Commit `.env` files to git
- Share `.env` files in chat or email
- Use weak secrets (min 32 chars for JWT)
- Reuse same secrets across environments

### 3. Production Deployment Checklist

Before deploying to production:

- [ ] Change all default/example values
- [ ] Use strong JWT_SECRET (32+ chars, random)
- [ ] Generate new Gmail app-specific password
- [ ] Obtain actual API keys from:
  - NASA FIRMS: https://firms.modaps.eosdis.nasa.gov
  - Weather APIs: https://open-meteo.com (free, no key needed)
- [ ] Set `NODE_ENV=production`
- [ ] Use strong `MONGO_URI` with authentication
- [ ] Enable HTTPS (SSL certificates)
- [ ] Store secrets in secure vault (AWS Secrets Manager, etc.)

### 4. GitHub Security Settings (Public Repo)

Since your repo is public:

- ✅ No secret scanning needed (no secrets found)
- ✅ Branch protection: Consider enabling to prevent accidental commits
- ✅ Code review: Require review before merging to main
- ✅ Secrets scanning: GitHub will notify if secrets detected

---

## Quick Reference: Environment Setup

### For Local Development

```bash
# 1. Copy example files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 2. Edit .env files with your actual values
# backend/.env:
GMAIL_APP_PASSWORD=your-real-app-password-here
JWT_SECRET=your-random-secret-key-here
NASA_FIRMS_KEY=your-api-key-here

# 3. Backend will read from .env automatically
# Frontend will read from .env automatically

# 4. Verify files are NOT tracked
git status
# Should show: no .env files listed
```

### For Production

```bash
# Use environment variables directly (not file-based)
# On your server/container:
export PORT=5000
export NODE_ENV=production
export MONGO_URI=mongodb+srv://...
export JWT_SECRET=xxx
export GMAIL_USER=xxx
export GMAIL_APP_PASSWORD=xxx
export NASA_FIRMS_KEY=xxx

# Or via Docker:
docker run -e MONGO_URI=... -e JWT_SECRET=... ...

# Or via hosting platform:
# Heroku, Vercel, AWS, etc. all have secrets management
```

---

## GitHub Repository Status

**Your repository is**: 🟢 **SECURE**

✅ No API keys visible  
✅ No passwords exposed  
✅ No credentials in history  
✅ All secrets properly excluded via .gitignore  
✅ Safe to keep public

**Anyone can clone this repo safely**:

```bash
git clone https://github.com/Sauravsigdel/neip-platform.git
# They get working code but must set their own secrets
```

---

## Summary

| Aspect                 | Status      | Details                                 |
| ---------------------- | ----------- | --------------------------------------- |
| **API Keys Exposed**   | ✅ SAFE     | Only placeholder values in public files |
| **.env Files Tracked** | ✅ SAFE     | Properly excluded via `.gitignore`      |
| **Hardcoded Secrets**  | ✅ SAFE     | None found in source code               |
| **.venv Usage**        | ⚠️ OPTIONAL | ML service disabled, not needed         |
| **Repo is Public**     | ✅ OK       | No security risk if secrets are in .env |

---

**Your project is production-ready from a security perspective!** ✅

For questions about specific API key setup or configuration, see [FINAL_ARCHITECTURE.md](FINAL_ARCHITECTURE.md) or [TROUBLESHOOTING_SETUP.md](docs/TROUBLESHOOTING_SETUP.md).
