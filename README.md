# CATS Transport Dashboard - with OwnTracks & Real-time ETA

## What's New

### 🚀 Version 2.1 Features
1. **Better Maps** - Mapbox integration (professional, clean look)
2. **30-minute polling** - Updates every 30 min (stays within free API limits)
3. **Manual Refresh button** - Update anytime with one click
4. **Team Location Tracking** - OwnTracks integration
5. **Geofencing** - Auto-detect arrival at hospitals
6. **Distance-based ETA** - No external traffic API needed (free!)

---

## Quick Start

### 1. Get Mapbox Token (Free)

**Mapbox** (for the map):
- Go to: https://account.mapbox.com/
- Sign up free
- Copy your "Default public token"
- Replace in index.html (already done!)

---

## OwnTracks Setup

### Step 1: Install OwnTracks
On each team phone:
1. Install "OwnTracks" from App Store (iOS) or Play Store (Android)
2. Open app → Allow "Always" location access

### Step 2: Configure OwnTracks
In OwnTracks app:
1. **Settings** → **Connection**
2. **Mode**: HTTP
3. **URL**: `https://your-vercel-app.vercel.app/api/owntracks`
4. **Device ID**: `CATS1`, `CATS2`, `CATS3` (unique per phone)

### Step 3: Adjust Settings
1. **Settings** → **Location**
2. **Update interval**: 60 seconds
3. **Distance filter**: 50-100m

### Step 4: Test
Tap the location button in OwnTracks. You should see the team appear on the dashboard!

---

## Deployment to Vercel (Next.js)

### Option 1: Deploy from GitHub (Recommended)
1. Push this code to GitHub
2. Go to https://vercel.com
3. Import the repository
4. Deploy!

### Option 2: Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Navigate to project
cd CATS-Transport-Dashboard

# Login
vercel login

# Deploy
vercel
```

### First Deploy
1. Go to Vercel dashboard → Your project → Settings → Environment Variables
2. Add:
   - `MAPBOX_TOKEN` = your Mapbox token
3. Redeploy

---

## OwnTracks Setup

### Step 1: Install OwnTracks
On each team phone:
1. Install "OwnTracks" from App Store (iOS) or Play Store (Android)
2. Open app → Allow "Always" location access

### Step 2: Configure OwnTracks
In OwnTracks app:
1. **Settings** → **Connection**
2. **Mode**: HTTP
3. **URL**: `https://your-vercel-app.vercel.app/api/owntracks`
4. **Device ID**: `CATS1`, `CATS2` (unique per phone)

### Step 3: Adjust Settings
1. **Settings** → **Location**
2. **Update interval**: 30 minutes (1800 seconds)
3. **Distance filter**: 100-200m

### Step 4: Test
Tap the location button in OwnTracks. You should see the team appear on the dashboard!

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/owntracks` | POST | Receive location from OwnTracks |
| `/api/locations` | GET | Get all team locations |
| `/api/clear` | POST | Clear all locations (testing) |

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/owntracks` | POST | Receive location from OwnTracks |
| `/api/locations` | GET | Get all team locations |
| `/api/clear` | POST | Clear all locations (testing) |

### OwnTracks Payload Format
```json
{
  "lat": 51.5234,
  "lon": -0.1234,
  "tid": "CATS1",
  "tst": 1710000000,
  "acc": 10,
  "vel": 30
}
```

---

## Geofencing

The API automatically detects when a team is near a hospital:
- GOSH (Great Ormond Street)
- KCH (King's College)
- RBH (Royal Brom Mary's

Statuspton)
- St changes to "scene" automatically when within 500m.

---

## Troubleshooting

**Teams not showing?**
- Check browser console for errors
- Verify OwnTracks is sending to correct URL
- Check /api/locations directly in browser

**Map not loading?**
- Add your Mapbox token
- Falls back to OpenStreetMap if no token

**ETA not showing?**
- Add your HERE API key
- Falls back to straight-line estimate

---

## Files

- `html/index.html` - Main dashboard
- `api/owntracks.js` - API for OwnTracks webhook
- `README.md` - This file

---

## Credits

- Maps: Mapbox / OpenStreetMap
- Routing: HERE API / OSRM
- Location: OwnTracks
