// CATS Transport Dashboard - Next.js Page
// This is the main dashboard page

import { useEffect, useState } from 'react';

export default function Dashboard() {
  const [teams, setTeams] = useState({});
  const [lastUpdate, setLastUpdate] = useState(null);

  // Hospital locations
  const hospitals = [
    { name: "GOSH", lat: 51.5243, lon: -0.1135, type: "PICU" },
    { name: "King's College", lat: 51.4613, lon: -0.0936, type: "PICU" },
    { name: "Royal Brompton", lat: 51.4897, lon: -0.1758, type: "PICU" },
    { name: "St Mary's", lat: 51.5172, lon: -0.1762, type: "PICU" },
    { name: "Northampton", lat: 52.2334, lon: -0.8907, type: "PICU" },
    { name: "Oxford", lat: 51.7548, lon: -1.2544, type: "PICU" },
    { name: "Cambridge", lat: 52.1899, lon: 0.1423, type: "PICU" },
    { name: "Bristol", lat: 51.4545, lon: -2.5879, type: "PICU" },
  ];

  // Fetch team locations
  const fetchLocations = async () => {
    try {
      const res = await fetch('/api/locations');
      const data = await res.json();
      if (data.teams) {
        setTeams(data.teams);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.log('Error fetching locations:', error);
    }
  };

  // Calculate distance-based ETA
  const calculateETA = (team) => {
    if (!team.destination) return null;
    const dest = hospitals.find(h => h.name === team.destination);
    if (!dest) return null;
    
    const distance = getDistance(team.lat, team.lon, dest.lat, dest.lon);
    const mins = Math.round(distance / 0.8);
    return `~${mins} min`;
  };

  // Haversine distance
  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'moving': return 'En Route';
      case 'scene': return 'On Scene';
      case 'hospital': return 'At Hospital';
      case 'available': return 'Available';
      default: return 'Offline';
    }
  };

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return 'unknown';
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return Math.floor(seconds/60) + ' min ago';
    return Math.floor(seconds/3600) + ' hours ago';
  };

  // Poll every 30 minutes
  useEffect(() => {
    fetchLocations();
    const interval = setInterval(fetchLocations, 1800000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', margin: 0, padding: 0 }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1a73e8 0%, #0d47a1 100%)',
        color: 'white',
        padding: '15px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
      }}>
        <h1 style={{ fontSize: '20px', margin: 0 }}>🚑 CATS Transport Dashboard</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={fetchLocations}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: 'white',
              padding: '6px 12px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            🔄 Refresh
          </button>
          <div style={{
            background: 'rgba(255,255,255,0.15)',
            padding: '6px 12px',
            borderRadius: '20px',
            fontSize: '13px'
          }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#4CAF50', borderRadius: '50%', marginRight: '6px' }}></span>
            LIVE
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.15)',
            padding: '6px 12px',
            borderRadius: '20px',
            fontSize: '13px'
          }}>
            Teams: {Object.keys(teams).length}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 60px)' }}>
        {/* Sidebar */}
        <div style={{
          width: '100%',
          height: '45%',
          overflowY: 'auto',
          background: '#f8f9fa',
          padding: '15px'
        }}>
          <h2 style={{ fontSize: '14px', color: '#666', textTransform: 'uppercase', marginBottom: '15px' }}>🚑 Team Locations</h2>
          
          {Object.keys(teams).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
              <div style={{ fontSize: '48px' }}>📍</div>
              <div>No teams online</div>
              <div style={{ fontSize: '12px', marginTop: '5px' }}>Configure OwnTracks to see locations</div>
            </div>
          ) : (
            Object.entries(teams).map(([id, team]) => (
              <div key={id} style={{
                background: 'white',
                borderRadius: '12px',
                padding: '15px',
                marginBottom: '10px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                borderLeft: team.status === 'moving' ? '4px solid #2196F3' : 
                           team.status === 'scene' ? '4px solid #FF9800' : 
                           '4px solid #4CAF50'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontWeight: 'bold', color: '#1a73e8', fontSize: '16px' }}>{id}</span>
                  <span style={{
                    fontSize: '11px',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    background: '#e8f5e9',
                    color: '#2e7d32'
                  }}>
                    {getStatusText(team.status)}
                  </span>
                </div>
                <div style={{ fontSize: '13px', color: '#555' }}>
                  <div>📍 {team.lat?.toFixed(4)}, {team.lon?.toFixed(4)}</div>
                  {team.destination && <div>🏥 → {team.destination}</div>}
                </div>
                {calculateETA(team) && (
                  <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #eee', fontSize: '14px', fontWeight: '600', color: '#1a73e8' }}>
                    🚗 {calculateETA(team)}
                  </div>
                )}
                <div style={{ fontSize: '11px', color: '#999', marginTop: '8px' }}>
                  Updated {getTimeAgo(team.lastUpdate)}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Map Placeholder */}
        <div style={{
          width: '100%',
          height: '55%',
          background: '#e0e0e0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '10px' }}>🗺️</div>
          <div style={{ color: '#666' }}>Map loads in production build</div>
          <div style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>
            Mapbox integration available in static version
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        background: 'white',
        padding: '12px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
        fontSize: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0' }}>
          <div style={{ width: '10px', height: '10px', background: '#f44336', borderRadius: '50%' }}></div>
          <span>Hospital (PICU)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0' }}>
          <div style={{ width: '10px', height: '10px', background: '#1a73e8', borderRadius: '50%' }}></div>
          <span>CATS Team</span>
        </div>
      </div>
    </div>
  );
}
