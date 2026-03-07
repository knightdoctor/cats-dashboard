// API with free KV storage using kvdb.io
const KVDB_URL = 'https://kvdb.io/workspaces/DX4h5WrifNiSxTx64FzKir/buckets/cats-locations';

const hospitals = {
    'GOSH': { lat: 51.5243, lon: -0.1135 },
    'KCH': { lat: 51.4613, lon: -0.0936 },
    'RBH': { lat: 51.4897, lon: -0.1758 },
    'StMarys': { lat: 51.5172, lon: -0.1762 }
};

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    const url = req.url || '';
    
    // POST - receive location
    if (url.includes('owntracks') && req.method === 'POST') {
        const { lat, lon, tid, tst, acc, vel } = req.body || {};
        
        if (!tid) {
            return res.status(400).json({ error: 'No device ID' });
        }
        
        const location = {
            lat, lon, tid,
            timestamp: tst || Math.floor(Date.now() / 1000),
            lastSeen: Date.now()
        };
        
        // Check geofence
        const near = checkGeofence(lat, lon);
        if (near) {
            location.destination = near.name;
            location.status = 'scene';
        } else {
            location.status = 'available';
        }
        
        // Save to KVDB
        try {
            await fetch(KVDB_URL + '/' + tid, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(location)
            });
            console.log('📍', tid, 'saved to KVDB');
        } catch (e) {
            console.log('KVDB error:', e.message);
        }
        
        return res.status(200).json({ success: true, location });
    }
    
    // GET - return locations
    if (url.includes('locations') && req.method === 'GET') {
        const teams = {};
        
        try {
            // Get all keys
            const res2 = await fetch(KVDB_URL + '/keys');
            const keys = await res2.json();
            
            for (const key of keys) {
                if (key && !key.includes('/')) {
                    const res3 = await fetch(KVDB_URL + '/' + key);
                    const loc = await res3.json();
                    
                    if (loc && loc.lat) {
                        if (Date.now() - loc.lastSeen > 5 * 60 * 1000) {
                            loc.status = 'offline';
                        }
                        teams[key] = {
                            lat: loc.lat,
                            lon: loc.lon,
                            status: loc.status || 'available',
                            destination: loc.destination || null,
                            lastUpdate: (loc.timestamp || Date.now()/1000) * 1000
                        };
                    }
                }
            }
        } catch (e) {
            console.log('KVDB get error:', e.message);
        }
        
        return res.status(200).json({ teams });
    }
    
    return res.status(404).json({ error: 'Not found' });
}

function checkGeofence(lat, lon) {
    if (!lat || !lon) return null;
    for (const [name, h] of Object.entries(hospitals)) {
        if (getDistance(lat, lon, h.lat, h.lon) < 0.5) {
            return { name };
        }
    }
    return null;
}

function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
