// Vercel API route for getting team locations
// Access at: /api/locations

// In-memory storage for team locations
const teamLocations = new Map();

// Hospital locations for geofencing
const hospitals = {
    'GOSH': { lat: 51.5243, lon: -0.1135 },
    'KCH': { lat: 51.4613, lon: -0.0936 },
    'RBH': { lat: 51.4897, lon: -0.1758 },
    'StMarys': { lat: 51.5172, lon: -0.1762 }
};

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Handle different endpoints
    const path = req.url.split('?')[0];
    
    if (path === '/api/owntracks' && req.method === 'POST') {
        // Receive location from OwnTracks
        return handleOwnTracks(req, res);
    }
    
    if (path === '/api/locations' && req.method === 'GET') {
        // Return all team locations
        return getLocations(res);
    }
    
    if (path === '/api/clear' && req.method === 'POST') {
        // Clear all locations (for testing)
        teamLocations.clear();
        return res.status(200).json({ success: true });
    }
    
    return res.status(404).json({ error: 'Not found' });
}

function handleOwnTracks(req, res) {
    const { lat, lon, tid, tst, acc, vel } = req.body;
    
    if (!tid) {
        return res.status(400).json({ error: 'No device ID (tid) provided' });
    }
    
    const location = {
        lat: lat,
        lon: lon,
        tid: tid,
        timestamp: tst || Math.floor(Date.now() / 1000),
        accuracy: acc || 0,
        velocity: vel || 0,
        lastSeen: Date.now()
    };
    
    // Store location
    teamLocations.set(tid, location);
    
    // Check if near hospital (geofencing)
    const nearHospital = checkGeofence(lat, lon);
    if (nearHospital) {
        location.destination = nearHospital.name;
        location.status = 'scene';
    } else if (location.destination) {
        location.status = 'moving';
    } else {
        location.status = 'available';
    }
    
    console.log(`📍 ${tid} updated:`, location);
    
    return res.status(200).json({ 
        success: true, 
        location: location 
    });
}

function getLocations(res) {
    const teams = {};
    
    teamLocations.forEach((location, tid) => {
        // Check if stale (more than 5 minutes)
        if (Date.now() - location.lastSeen > 5 * 60 * 1000) {
            location.status = 'offline';
        }
        
        teams[tid] = {
            lat: location.lat,
            lon: location.lon,
            status: location.status || 'available',
            destination: location.destination || null,
            lastUpdate: location.timestamp * 1000,
            accuracy: location.accuracy,
            velocity: location.velocity
        };
    });
    
    return res.status(200).json({ teams });
}

function checkGeofence(lat, lon) {
    const radius = 0.5; // km
    
    for (const [name, hospital] of Object.entries(hospitals)) {
        const distance = getDistance(lat, lon, hospital.lat, hospital.lon);
        if (distance < radius) {
            return { name, distance };
        }
    }
    
    return null;
}

function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}
