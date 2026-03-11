const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const teams = {};
const hospitals = {'GOSH':{lat:51.5243,lon:-0.1135},'KCH':{lat:51.4613,lon:-0.0936},'RBH':{lat:51.4897,lon:-0.1758},'StMarys':{lat:51.5172,lon:-0.1762}};

app.post('/api/owntracks',(req,res)=>{
  const{lat,lon,tid,tst}=req.body;
  if(!tid)return res.status(400).json({error:'No device ID'});
  const loc={lat,lon,tid,timestamp:tst||Math.floor(Date.now()/1000),lastSeen:Date.now()};
  for(const[n,h]of Object.entries(hospitals)){
    if(getDistance(lat,lon,h.lat,h.lon)<0.5){loc.destination=n;loc.status='scene';break;}
  }
  if(!loc.status)loc.status='available';
  teams[tid]=loc;
  console.log('📍',tid,loc);
  res.json({success:true,location:loc});
});

app.get('/api/locations',(req,res)=>{
  const result={};
  for(const[tid,loc]of Object.entries(teams)){
    const stale=Date.now()-loc.lastSeen>300000;
    result[tid]={lat:loc.lat,lon:loc.lon,status:stale?'offline':(loc.status||'available'),destination:loc.destination||null,lastUpdate:loc.timestamp*1000};
  }
  res.json({teams:result});
});

app.get('/',(req,res)=>{
  res.send('<!DOCTYPE html><html><head><title>CATS</title><meta name="viewport"content="width=device-width"><style>body{font-family:system-ui;padding:20px;max-width:600px;margin:0 auto}.team{background:#f5f5f5;padding:15px;margin:10px 0;border-radius:8px;border-left:4px solid #4CAF50}.status{display:inline-block;padding:4px 8px;border-radius:4px;font-size:12px;background:#e8f5e9;color:#2e7d32}h1{color:#1a73e8}</style></head><body><h1>🚑 CATS Dashboard</h1><button onclick="refresh()"style="background:#1a73e8;color:white;border:none;padding:10px 20px;border-radius:8px;cursor:pointer">🔄 Refresh</button><div id="teams"></div><script>async function refresh(){const r=await fetch("/api/locations");const d=await r.json();document.getElementById("teams").innerHTML=Object.entries(d.teams).map(([id,t])=>`<div class="team"><strong>${id}</strong> <span class="status">${t.status}</span><br>📍 ${t.lat?.toFixed(4)}, ${t.lon?.toFixed(4)}<br>${t.destination?"🏥 → "+t.destination:""}</div>`).join("")||"<p>No teams</p>"}refresh();setInterval(refresh,10000);</script></body></html>');
});

function getDistance(a,b,c,d){
  const R=6371;
  const e=(c-a)*Math.PI/180;
  const f=(d-b)*Math.PI/180;
  return R*2*Math.atan2(Math.sqrt(Math.sin(e/2)**2+Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin(f/2)**2),Math.sqrt(1-Math.sin(e/2)**2-Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin(f/2)**2));
}

app.listen(3000,()=>console.log('CATS running on port 3000'));
