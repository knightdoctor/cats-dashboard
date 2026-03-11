const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Store data
const teams = {};
const requestLog = [];
const hospitals = {
  'GOSH': { lat: 51.5243, lon: -0.1135 },
  'KCH': { lat: 51.4613, lon: -0.0936 },
  'RBH': { lat: 51.4897, lon: -0.1758 },
  'StMarys': { lat: 51.5172, lon: -0.1762 }
};

// Log ALL requests for debugging
app.use((req, res, next) => {
  const entry = {
    time: new Date().toISOString(),
    method: req.method,
    path: req.path,
    headers: req.headers,
    body: req.body,
    query: req.query,
    ip: req.ip || req.headers['x-forwarded-for'] || 'unknown'
  };
  requestLog.unshift(entry);
  if (requestLog.length > 50) requestLog.pop();
  console.log(`[${entry.time}] ${req.method} ${req.path}`, JSON.stringify(req.body || {}));
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), teams: Object.keys(teams).length });
});

// Debug endpoint - see all recent requests
app.get('/debug', (req, res) => {
  res.json({
    recentRequests: requestLog.slice(0, 20),
    currentTeams: teams,
    serverTime: new Date().toISOString()
  });
});

// OwnTracks webhook - handles multiple payload formats
app.post('/api/owntracks', (req, res) => {
  console.log('📍 OwnTracks payload received:', JSON.stringify(req.body));
  
  const body = req.body;
  
  // OwnTracks can send: { _type: "location", lat, lon, tid, tst, ... }
  // Or simplified: { lat, lon, tid, tst }
  const lat = body.lat;
  const lon = body.lon;
  const tid = body.tid || body.topic?.split('/').pop() || 'unknown';
  const tst = body.tst || Math.floor(Date.now() / 1000);
  
  if (lat === undefined || lon === undefined) {
    console.log('❌ Missing lat/lon in payload');
    return res.status(400).json({ error: 'Missing lat/lon', received: body });
  }
  
  const loc = {
    lat: parseFloat(lat),
    lon: parseFloat(lon),
    tid,
    timestamp: tst,
    lastSeen: Date.now(),
    raw: body // Keep raw payload for debugging
  };
  
  // Check proximity to hospitals
  for (const [name, h] of Object.entries(hospitals)) {
    const dist = getDistance(loc.lat, loc.lon, h.lat, h.lon);
    if (dist < 0.5) {
      loc.destination = name;
      loc.status = 'scene';
      loc.distance = dist;
      break;
    }
  }
  
  if (!loc.status) loc.status = 'available';
  
  teams[tid] = loc;
  console.log('✅ Updated team:', tid, loc.status, loc.destination || '');
  
  // OwnTracks expects empty array response
  res.json([]);
});

// Also support POST to root (some OwnTracks configs use this)
app.post('/', (req, res) => {
  console.log('📍 Root POST received, forwarding to /api/owntracks');
  req.url = '/api/owntracks';
  app.handle(req, res);
});

// Get all team locations
app.get('/api/locations', (req, res) => {
  const result = {};
  const now = Date.now();
  
  for (const [tid, loc] of Object.entries(teams)) {
    const stale = now - loc.lastSeen > 300000; // 5 min
    result[tid] = {
      lat: loc.lat,
      lon: loc.lon,
      status: stale ? 'offline' : (loc.status || 'available'),
      destination: loc.destination || null,
      lastUpdate: loc.timestamp * 1000,
      lastSeen: loc.lastSeen
    };
  }
  
  res.json({ teams: result, serverTime: new Date().toISOString() });
});

// Dashboard HTML
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html>
<head>
  <title>🚑 CATS Dashboard</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; background: #f8f9fa; }
    h1 { color: #1a73e8; margin-bottom: 20px; }
    .controls { margin-bottom: 20px; display: flex; gap: 10px; flex-wrap: wrap; }
    button { background: #1a73e8; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 14px; }
    button:hover { background: #1557b0; }
    button.secondary { background: #6c757d; }
    .team { background: white; padding: 15px; margin: 10px 0; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border-left: 4px solid #4CAF50; }
    .team.offline { border-left-color: #9e9e9e; opacity: 0.7; }
    .team.scene { border-left-color: #ff9800; }
    .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
    .status.available { background: #e8f5e9; color: #2e7d32; }
    .status.scene { background: #fff3e0; color: #e65100; }
    .status.offline { background: #eeeeee; color: #616161; }
    .coords { color: #666; font-size: 13px; margin-top: 8px; }
    .destination { color: #1a73e8; font-weight: 500; }
    .empty { text-align: center; padding: 40px; color: #666; }
    .debug { background: #263238; color: #aed581; padding: 15px; border-radius: 8px; font-family: monospace; font-size: 12px; white-space: pre-wrap; max-height: 300px; overflow: auto; margin-top: 20px; }
    .last-update { font-size: 12px; color: #999; margin-top: 10px; }
  </style>
</head>
<body>
  <h1>🚑 CATS Dashboard</h1>
  <div class="controls">
    <button onclick="refresh()">🔄 Refresh</button>
    <button class="secondary" onclick="showDebug()">🔧 Debug Info</button>
    <button class="secondary" onclick="testLocation()">📍 Send Test Location</button>
  </div>
  <div id="teams"></div>
  <div id="debug" class="debug" style="display:none"></div>
  
  <script>
    async function refresh() {
      try {
        const r = await fetch('/api/locations');
        const d = await r.json();
        const teams = Object.entries(d.teams || {});
        
        if (teams.length === 0) {
          document.getElementById('teams').innerHTML = '<div class="empty">📭 No teams reporting yet.<br><br>Configure OwnTracks to POST to:<br><code>' + location.origin + '/api/owntracks</code></div>';
        } else {
          document.getElementById('teams').innerHTML = teams.map(([id, t]) => {
            const ago = Math.round((Date.now() - t.lastSeen) / 1000);
            const agoStr = ago < 60 ? ago + 's ago' : Math.round(ago/60) + 'm ago';
            return '<div class="team ' + t.status + '">' +
              '<strong>' + id + '</strong> <span class="status ' + t.status + '">' + t.status + '</span>' +
              '<div class="coords">📍 ' + (t.lat?.toFixed(5) || '?') + ', ' + (t.lon?.toFixed(5) || '?') + '</div>' +
              (t.destination ? '<div class="destination">🏥 → ' + t.destination + '</div>' : '') +
              '<div class="last-update">Updated ' + agoStr + '</div>' +
            '</div>';
          }).join('');
        }
      } catch (e) {
        document.getElementById('teams').innerHTML = '<div class="empty">❌ Error: ' + e.message + '</div>';
      }
    }
    
    async function showDebug() {
      const el = document.getElementById('debug');
      if (el.style.display === 'none') {
        const r = await fetch('/debug');
        const d = await r.json();
        el.textContent = JSON.stringify(d, null, 2);
        el.style.display = 'block';
      } else {
        el.style.display = 'none';
      }
    }
    
    async function testLocation() {
      const r = await fetch('/api/owntracks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: 51.5074, lon: -0.1278, tid: 'TEST1', tst: Math.floor(Date.now()/1000) })
      });
      alert('Test location sent! Refreshing...');
      refresh();
    }
    
    refresh();
    setInterval(refresh, 10000);
  </script>
</body>
</html>`);
});

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) ** 2 + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLon/2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚑 CATS Dashboard running on port ${PORT}`);
  console.log(`📍 OwnTracks webhook: POST /api/owntracks`);
  console.log(`🔧 Debug endpoint: GET /debug`);
});
