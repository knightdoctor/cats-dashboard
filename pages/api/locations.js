// API route for getting locations - redirects to owntracks handler logic

const hospitals = {
    'GOSH': { lat: 51.5243, lon: -0.1135 },
    'KCH': { lat: 51.4613, lon: -0.0936 },
    'RBH': { lat: 51.4897, lon: -0.1758 },
    'StMarys': { lat: 51.5172, lon: -0.1762 }
};

// Shared cache - in production use a database
let cache = {};

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // GET - return all locations
    if (req.method === 'GET') {
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
    
    return res.status(404).json({ error: 'Use POST to update location' });
}

// Export cache for sharing between routes
module.exports = { cache, hospitals };
