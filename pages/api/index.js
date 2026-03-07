// Simple API using free jsonbin.io storage
// Sign up free at https://jsonbin.io to get your own BIN

// Use a shared free bin for testing
const JSONBIN_API_KEY = 'YOUR_JSONBIN_KEY'; // Get free key from jsonbin.io

// Hospital locations
const hospitals = {
    'GOSH': { lat: 51.5243, lon: -0.1135 },
    'KCH': { lat: 51.4613, lon: -0.0936 },
    'RBH': { lat: 51.4897, lon: -0.1758 },
    'StMarys': { lat: 51.5172, lon: -0.1762 }
};

// In-memory cache
let cache = {};

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    const path = req.url.split('?')[0];
    
    // POST - receive location
    if (path === '/api/owntracks' && req.method === 'POST') {
        const { lat, lon, tid, tst, acc, vel } = req.body;
        
        if (!tid) {
            return res.status(400).json({ error: 'No device ID' });
        }
        
        const location = {
            lat, lon, tid,
            timestamp: tst || Math.floor(Date.now() / 1000),
            accuracy: acc || 0,
            velocity: vel || 0,
            lastSeen: Date.now()
        };
        
        // Check geofence
        const nearHospital = checkGeofence(lat, lon);
        if (nearHospital) {
            location.destination = nearHospital.name;
            location.status = 'scene';
        } else {
            location.status = 'available';
        }
        
        // Update cache
        cache[tid] = location;
        
        console.log('📍', tid, 'updated');
        
        return res.status(200).json({ success: true, location });
    }
    
    // GET - return locations
    if (path === '/api/locations' && req.method === 'GET') {
        const teams = {};
        
        Object.entries(cache).forEach(([tid, loc]) => {
            if (Date.now() - loc.lastSeen > 5 * 60 * 1000) {
                loc.status = 'offline';
            }
            teams[tid] = {
                lat: loc.lat,
                lon: loc.lon,
                status: loc.status || 'available',
                destination: loc.destination || null,
                lastUpdate: loc.timestamp * 1000
            };
        });
        
        return res.status(200).json({ teams });
    }
    
    return res.status(404).json({ error: 'Not found' });
}

function checkGeofence(lat, lon) {
    for (const [name, h] of Object.entries(hospitals)) {
        if (getDistance(lat, lon, h.lat, h.lon) < 0.5) {
            return { name };
        }
    }
    return null;
}

function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const d = Math.sqrt(Math.pow((lat2-lat1)*111,2) + Math.pow((lon2-lon1)*111*Math.cos(lat1*Math.PI/180),2));
    return d;
}
