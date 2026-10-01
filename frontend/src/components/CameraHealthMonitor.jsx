/**
 * CameraHealthMonitor.jsx
 * SafeguardIQ Enterprise — Camera Health Monitoring Dashboard
 * Shows online/offline status, last seen, violations per camera
 * Place in: frontend/src/components/CameraHealthMonitor.jsx
 */
import { useState, useEffect } from 'react';
import axios from 'axios';

const T = {
  bg:"#05080F", card:"#0C1422", card2:"#101828",
  border:"#1A2540", orange:"#FF5B18", teal:"#00D4B4",
  white:"#EDF2FF", g1:"#8899BB", g2:"#3A4E72",
  green:"#22D468", red:"#FF3D3D", amber:"#FFB400", blue:"#2D8EFF",
};

const AI_URL = '/api/v1/ai'

function StatusDot({ status, animate = false }) {
  const color = status === 'online'    ? T.green
    : status === 'analysing'           ? T.teal
    : status === 'connecting'          ? T.amber
    : status === 'error'               ? T.red
    : T.g2;
  return (
    <span style={{ position:"relative", display:"inline-flex",
      width:10, height:10, flexShrink:0 }}>
      {animate && (
        <span style={{ position:"absolute", inset:0, borderRadius:"50%",
          background:color, animation:"ping 1.5s infinite", opacity:0.6 }}/>
      )}
      <span style={{ width:10, height:10, borderRadius:"50%",
        background:color, display:"block", position:"relative" }}/>
    </span>
  );
}

function CameraCard({ cam, streamInfo, onTest }) {
  const status   = streamInfo?.status || cam.status || 'offline';
  const isOnline = status === 'online' || status === 'analysing' || status === 'running';
  const isAnalysing = status === 'analysing' || status === 'running';

  const statusColor = isOnline ? T.green : status === 'connecting' ? T.amber
    : status === 'error' ? T.red : T.g2;
  const statusLabel = isAnalysing ? 'ANALYSING' : isOnline ? 'ONLINE'
    : status === 'connecting' ? 'CONNECTING' : status === 'error' ? 'ERROR' : 'OFFLINE';

  const viols    = streamInfo?.violations_today || 0;
  const persons  = streamInfo?.persons_detected || 0;
  const risk     = streamInfo?.risk_level || 'safe';
  const riskColor = risk === 'critical' ? '#FF0000' : risk === 'high' ? T.red
    : risk === 'medium' ? T.amber : T.green;

  const lastSeen = streamInfo?.last_detection
    ? new Date(streamInfo.last_detection).toLocaleTimeString('en-IN',
        { hour:'2-digit', minute:'2-digit', hour12:true })
    : cam.last_seen
    ? new Date(cam.last_seen).toLocaleTimeString('en-IN',
        { hour:'2-digit', minute:'2-digit', hour12:true })
    : "Never";

  return (
    <div style={{ background:T.card2,
      border:`1px solid ${isOnline ? statusColor+'40' : T.border}`,
      borderRadius:12, padding:14,
      borderTop:`3px solid ${statusColor}` }}>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
        <StatusDot status={isOnline ? 'online' : status} animate={isAnalysing}/>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:12, fontWeight:800, color:T.white,
            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            📹 {cam.cam_label || cam.camera_id || cam.id}
          </div>
          <div style={{ fontSize:9, color:T.g2, marginTop:1,
            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            {cam.rtsp_url || streamInfo?.rtsp_url || 'No stream URL'}
          </div>
        </div>
        <div style={{ fontSize:9, fontWeight:800, color:statusColor,
          background:`${statusColor}15`, border:`1px solid ${statusColor}30`,
          padding:"2px 8px", borderRadius:4, flexShrink:0 }}>
          {statusLabel}
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6, marginBottom:10 }}>
        {[
          { label:"PERSONS",    val:persons, color:persons>0?T.blue:T.g2 },
          { label:"VIOLATIONS", val:viols,   color:viols>0?T.red:T.green },
          { label:"RISK",       val:risk.toUpperCase(), color:riskColor },
        ].map(({ label, val, color }) => (
          <div key={label} style={{ textAlign:"center", padding:"6px 4px",
            background:T.card, border:`1px solid ${T.border}`, borderRadius:6 }}>
            <div style={{ fontSize:13, fontWeight:800, color,
              fontFamily:"'Bebas Neue',sans-serif" }}>{val}</div>
            <div style={{ fontSize:8, color:T.g2, letterSpacing:0.5 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ fontSize:9, color:T.g2 }}>
          Last seen: <span style={{ color:T.g1 }}>{lastSeen}</span>
        </div>
        <div style={{ display:"flex", gap:6 }}>
          {cam.ip_address && (
            <a
              href={`http://${cam.ip_address}:${cam.port || 80}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background:"none", border:`1px solid ${T.teal}40`,
                borderRadius:6, padding:"3px 8px", color:T.teal,
                fontSize:9, fontWeight:700, cursor:"pointer",
                textDecoration:"none", display:"inline-flex", alignItems:"center", gap:3
              }}>
              📷 Open Camera
            </a>
          )}
          <button onClick={() => onTest(cam)} style={{
            background:"none", border:`1px solid ${T.border}`,
            borderRadius:6, padding:"3px 8px", color:T.g1,
            fontSize:9, fontWeight:700, cursor:"pointer" }}>
            Test ↗
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CameraHealthMonitor() {
  const [cameras,   setCameras]   = useState([]);
  const [streams,   setStreams]    = useState({});
  const [loading,   setLoading]   = useState(true);
  const [expanded,  setExpanded]  = useState(true);
  const [testResult,setTestResult]= useState(null);
  const [lastUpdate,setLastUpdate]= useState(null);

  const token = localStorage.getItem('safeg_token') || '';

  const fetchCameras = async () => {
    try {
      const res = await axios.get('/api/v1/cameras', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const allCams = res.data.data || res.data.cameras || [];
      const camLimit = parseInt(localStorage.getItem('safeg_cam_limit')) || 999;
      setCameras(allCams.slice(0, camLimit));
    } catch(e) {
      setCameras([]);
    }
  };

  const fetchStreams = async () => {
    try {
      const r = await fetch(`${AI_URL}/stream/status`);
      const d = await r.json();
      setStreams(d.streams || {});
      setLastUpdate(new Date().toLocaleTimeString('en-IN',
        { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:true }));
    } catch {}
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchCameras(), fetchStreams()]);
      setLoading(false);
    };
    init();
    const interval = setInterval(fetchStreams, 10000);
    return () => clearInterval(interval);
  }, []);

  const testCamera = async (cam) => {
    setTestResult({ id: cam.id, status: 'testing' });
    try {
      const res = await axios.post(`/api/v1/cameras/${cam.id}/test-connection`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTestResult({ id:cam.id, status:'success', msg:'Camera reachable ✓' });
    } catch(e) {
      setTestResult({ id:cam.id, status:'error',
        msg: e.response?.data?.message || 'Connection failed' });
    }
    setTimeout(() => setTestResult(null), 3000);
  };

  // Merge DB cameras with AI stream data
  const allCameras = cameras.length > 0 ? cameras : Object.keys(streams).map(id => ({
    id, cam_label: id, camera_id: id,
    rtsp_url: streams[id]?.rtsp_url,
  }));

  const onlineCount  = allCameras.filter(c =>
    ['online','running','analysing'].includes(streams[c.cam_label]?.status ||
    streams[c.camera_id]?.status || '')).length;
  const offlineCount = allCameras.length - onlineCount;
  const totalViols   = Object.values(streams).reduce((s,v) => s+(v.violations_today||0), 0);

  return (
    <div style={{ fontFamily:"'Nunito',sans-serif", marginBottom:16 }}>
      <div style={{ background:T.card, border:`1px solid ${T.border}`,
        borderRadius:16, overflow:"hidden" }}>

        {/* Header */}
        <div style={{ background:T.bg, padding:"16px 20px",
          borderBottom:`1px solid ${T.border}`,
          display:"flex", alignItems:"center", gap:12, cursor:"pointer" }}
          onClick={() => setExpanded(e => !e)}>
          <span style={{ fontSize:20 }}>📷</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14, fontWeight:800, color:T.white }}>
              Camera Health Monitor
            </div>
            <div style={{ fontSize:11, color:T.g1 }}>
              Live status · Auto-refreshes every 10 seconds
              {lastUpdate && ` · Updated ${lastUpdate}`}
            </div>
          </div>

          {/* Summary badges */}
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <div style={{ fontSize:10, fontWeight:700, color:T.green,
              background:`${T.green}15`, border:`1px solid ${T.green}30`,
              padding:"3px 10px", borderRadius:6 }}>
              {onlineCount} ONLINE
            </div>
            {offlineCount > 0 && (
              <div style={{ fontSize:10, fontWeight:700, color:T.red,
                background:`${T.red}15`, border:`1px solid ${T.red}30`,
                padding:"3px 10px", borderRadius:6 }}>
                {offlineCount} OFFLINE
              </div>
            )}
            <div style={{ fontSize:10, fontWeight:700, color:T.amber,
              background:`${T.amber}15`, border:`1px solid ${T.amber}30`,
              padding:"3px 10px", borderRadius:6 }}>
              {totalViols} VIOLATIONS
            </div>
            <button onClick={(e) => { e.stopPropagation(); fetchStreams(); fetchCameras(); }}
              style={{ background:"none", border:`1px solid ${T.border}`,
                borderRadius:6, padding:"4px 10px", color:T.g1,
                fontSize:10, cursor:"pointer" }}>↻</button>
            <span style={{ color:T.g1, fontSize:14 }}>{expanded?"▲":"▼"}</span>
          </div>
        </div>

        {expanded && (
          <div style={{ padding:16 }}>
            {testResult && (
              <div style={{ marginBottom:12, padding:"10px 14px",
                background: testResult.status==='success' ? `${T.green}10`
                  : testResult.status==='testing' ? `${T.amber}10` : `${T.red}10`,
                border:`1px solid ${testResult.status==='success'?T.green:testResult.status==='testing'?T.amber:T.red}30`,
                borderRadius:8, fontSize:12,
                color: testResult.status==='success' ? T.green
                  : testResult.status==='testing' ? T.amber : T.red }}>
                {testResult.status==='testing' ? '⏳ Testing connection...' : testResult.msg}
              </div>
            )}

            {loading ? (
              <div style={{ textAlign:"center", padding:"30px 0", color:T.g1 }}>
                <div style={{ width:28, height:28, border:`2px solid ${T.border}`,
                  borderTopColor:T.orange, borderRadius:"50%",
                  animation:"spin .8s linear infinite", margin:"0 auto 10px" }}/>
                Loading cameras...
              </div>
            ) : allCameras.length === 0 ? (
              <div style={{ textAlign:"center", padding:"40px 0", color:T.g2 }}>
                <div style={{ fontSize:32, marginBottom:8 }}>📷</div>
                <div style={{ fontSize:13, color:T.g1 }}>
                  No cameras configured · Start AI monitoring to see camera status
                </div>
              </div>
            ) : (
              <>
                {/* Overall health bar */}
                <div style={{ marginBottom:16 }}>
                  <div style={{ display:"flex", justifyContent:"space-between",
                    fontSize:10, color:T.g1, marginBottom:4 }}>
                    <span>Overall Network Health</span>
                    <span style={{ color:T.green, fontWeight:700 }}>
                      {allCameras.length > 0
                        ? Math.round((onlineCount/allCameras.length)*100) : 0}%
                    </span>
                  </div>
                  <div style={{ height:8, background:T.border, borderRadius:4,
                    overflow:"hidden" }}>
                    <div style={{ height:"100%", borderRadius:4,
                      width:`${allCameras.length>0?(onlineCount/allCameras.length)*100:0}%`,
                      background:`linear-gradient(90deg,${T.green},${T.teal})`,
                      transition:"width .5s" }}/>
                  </div>
                </div>

                {/* Camera grid */}
                <div style={{ display:"grid",
                  gridTemplateColumns:"repeat(auto-fill, minmax(260px, 1fr))",
                  gap:10 }}>
                  {allCameras.map(cam => {
                    const streamKey = cam.cam_label || cam.camera_id || cam.id;
                    const streamInfo = streams[streamKey] || streams[cam.id] || null;
                    return (
                      <CameraCard
                        key={cam.id || streamKey}
                        cam={cam}
                        streamInfo={streamInfo}
                        onTest={testCamera}
                      />
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes ping{0%{transform:scale(1);opacity:1}75%,100%{transform:scale(2);opacity:0}}
      `}</style>
    </div>
  );
}
