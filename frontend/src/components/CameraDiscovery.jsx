/**
 * CameraDiscovery.jsx
 * SafeguardIQ Enterprise — Camera Onboarding
 * Three methods:
 *  1. Auto Discovery (ONVIF + port scan)
 *  2. IP Address Direct Entry
 *  3. Manual / Full Form
 */

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const T = {
  bg:"#05080F", bg2:"#080D18", card:"#0C1422", card2:"#101828",
  border:"#1A2540", border2:"#243452",
  orange:"#FF5B18", teal:"#00D4B4", blue:"#2D8EFF",
  white:"#EDF2FF", g1:"#8899BB", g2:"#3A4E72",
  green:"#22D468", red:"#FF3D3D", amber:"#FFB400",
};

const inp  = { width:"100%", background:"#06090F", border:`1px solid ${T.border}`, borderRadius:10, padding:"12px 14px", color:T.white, fontSize:13, fontFamily:"'Nunito'", outline:"none" };
const inpM = { ...inp, fontFamily:"'DM Mono'", fontSize:12 };
const lbl  = { fontSize:11, color:T.g1, letterSpacing:1.5, fontWeight:700, display:"block", marginBottom:6 };
const sel  = { ...inp, cursor:"pointer" };

const PPE_TYPES  = ["Helmet","Safety Vest","Gloves","Safety Boots","Goggles","Face Mask"];
const BRANDS     = ["CP Plus","Hikvision","Dahua","Axis","Bosch","Godrej","Honeywell","Generic / Other"];
const RESOLUTIONS= ["720p","1080p","2MP","4MP","8MP / 4K"];
const toggle     = (arr, v) => arr.includes(v) ? arr.filter(x=>x!==v) : [...arr, v];

/* RTSP patterns per brand */
const RTSP_PATTERNS = {
  "cp plus":   ["rtsp://{u}:{p}@{ip}:554/stream0","rtsp://{u}:{p}@{ip}:554/stream1"],
  hikvision:   ["rtsp://{u}:{p}@{ip}:554/Streaming/Channels/101","rtsp://{u}:{p}@{ip}:554/Streaming/Channels/1"],
  dahua:       ["rtsp://{u}:{p}@{ip}:554/cam/realmonitor?channel=1&subtype=0","rtsp://{u}:{p}@{ip}:554/cam/realmonitor?channel=1&subtype=1"],
  axis:        ["rtsp://{u}:{p}@{ip}:554/axis-media/media.amp"],
  bosch:       ["rtsp://{u}:{p}@{ip}:554/rtsp_tunnel"],
  generic:     ["rtsp://{u}:{p}@{ip}:554/stream1","rtsp://{u}:{p}@{ip}:554/live","rtsp://{u}:{p}@{ip}:554/1"],
};

function buildRtsp(brand, ip, user, pass) {
  const key = brand.toLowerCase().replace(" / other","").trim();
  const patterns = RTSP_PATTERNS[key] || RTSP_PATTERNS.generic;
  return patterns.map(p =>
    p.replace(/{u}/g, encodeURIComponent(user||"admin"))
     .replace(/{p}/g, encodeURIComponent(pass||""))
     .replace(/{ip}/g, ip)
  );
}

/* ── PPE selector ── */
function PpeSelector({ value, onChange }) {
  return (
    <div style={{display:"flex",flexWrap:"wrap",gap:7,marginTop:4}}>
      {PPE_TYPES.map(p => {
        const on = value.includes(p);
        return (
          <button key={p} type="button" onClick={()=>onChange(toggle(value,p))} style={{
            padding:"5px 13px", borderRadius:20,
            border:`1px solid ${on?T.orange:T.border}`,
            background:on?`${T.orange}20`:T.card,
            color:on?T.orange:T.g1, fontSize:12, fontWeight:700,
            cursor:"pointer", fontFamily:"'Nunito'", transition:"all .2s",
          }}>{on?"✓ ":""}{p}</button>
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════════
   METHOD TAB — selector
══════════════════════════════════════ */
function MethodTabs({ active, onChange }) {
  const tabs = [
    { id:"ip",        icon:"🔌", label:"IP Address" },
    { id:"discover",  icon:"🔍", label:"Auto Discover" },
    { id:"manual",    icon:"✏️", label:"Manual Entry" },
  ];
  return (
    <div style={{display:"flex",gap:8,marginBottom:24,flexWrap:"wrap"}}>
      {tabs.map(t => (
        <button key={t.id} onClick={()=>onChange(t.id)} style={{
          flex:1, minWidth:120, padding:"12px 16px", borderRadius:12,
          border:`2px solid ${active===t.id?T.orange:T.border}`,
          background:active===t.id?`${T.orange}15`:T.card2,
          color:active===t.id?T.orange:T.g1,
          fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"'Nunito'",
          transition:"all .2s", display:"flex", alignItems:"center",
          justifyContent:"center", gap:8,
        }}>
          <span>{t.icon}</span>{t.label}
        </button>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════
   METHOD 1 — IP Address Direct Entry
══════════════════════════════════════ */
function IpOnboarding({ zones, onAdd }) {
  const [ip,      setIp]      = useState('');
  const [brand,   setBrand]   = useState('CP Plus');
  const [user,    setUser]    = useState('admin');
  const [pass,    setPass]    = useState('');
  const [name,    setName]    = useState('');
  const [zone,    setZone]    = useState(zones[0]?.id||'');
  const [res,     setRes]     = useState('1080p');
  const [ppe,     setPpe]     = useState(['Helmet','Safety Vest']);
  const [rtsp,    setRtsp]    = useState('');
  const [testing, setTesting] = useState(false);
  const [testRes, setTestRes] = useState(null); // null | true | false
  const [suggestions, setSugg] = useState([]);
  const [port,    setPort]    = useState('554');
  const [httpPort,setHttpPort]= useState('80');

  /* Auto-generate RTSP suggestions when IP/brand/creds change */
  useEffect(() => {
    if (!ip) { setSugg([]); return; }
    const urls = buildRtsp(brand, ip, user, pass);
    setSugg(urls);
    if (!rtsp) setRtsp(urls[0]||'');
  }, [ip, brand, user, pass]);

  /* Auto-fill name */
  useEffect(() => {
    if (ip && !name) setName(`${brand} ${ip}`);
  }, [ip, brand]);

  const testConnection = async () => {
    if (!ip) return;
    setTesting(true); setTestRes(null);
    try {
      const res = await axios.post('/api/v1/cameras/test-rtsp',
        { ip, port: parseInt(port) }
      );
      setTestRes(res.data.data.reachable);
    } catch {
      setTestRes(false);
    } finally {
      setTesting(false);
    }
  };

  const handleAdd = () => {
    if (!ip || !name) return;
    onAdd({
      id: Date.now(), name, brand, ip,
      rtspUrl: rtsp, zoneId: zone,
      resolution: res, ppeTypes: ppe,
      username: user, port,
      protocol: 'ip-direct',
      discovered: new Date().toISOString(),
    });
    setIp(''); setName(''); setPass(''); setRtsp(''); setTestRes(null);
  };

  return (
    <div style={{background:T.card2,border:`1px solid ${T.border}`,borderRadius:14,padding:20}}>
      <div style={{fontSize:12,color:T.orange,fontWeight:800,letterSpacing:1.5,marginBottom:16}}>
        CONNECT BY IP ADDRESS
      </div>

      {/* Row 1 — IP + Test */}
      <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:10,marginBottom:14,alignItems:"flex-end"}}>
        <div>
          <label style={lbl}>CAMERA IP ADDRESS *</label>
          <input value={ip} onChange={e=>setIp(e.target.value)} placeholder="192.168.1.100" style={inpM}/>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          <button onClick={testConnection} disabled={!ip||testing} style={{
            background:testing?T.g2:T.card, border:`1px solid ${T.border2}`,
            borderRadius:10, padding:"12px 20px", color:T.g1,
            fontSize:13, fontWeight:700, cursor:ip&&!testing?"pointer":"not-allowed",
            fontFamily:"'Nunito'", whiteSpace:"nowrap",
          }}>
            {testing?"Testing...":"⚡ Test Connection"}
          </button>
          {testRes !== null && (
            <div style={{textAlign:"center",fontSize:12,fontWeight:700,color:testRes?T.green:T.red}}>
              {testRes?"✓ Camera Online":"✗ Not Reachable"}
            </div>
          )}
        </div>
      </div>

      {/* Row 2 — Brand + Ports */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:14}}>
        <div>
          <label style={lbl}>BRAND</label>
          <select value={brand} onChange={e=>setBrand(e.target.value)} style={sel}>
            {BRANDS.map(b=><option key={b}>{b}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>RTSP PORT</label>
          <input value={port} onChange={e=>setPort(e.target.value)} placeholder="554" style={inpM}/>
        </div>
        <div>
          <label style={lbl}>HTTP PORT</label>
          <input value={httpPort} onChange={e=>setHttpPort(e.target.value)} placeholder="80" style={inpM}/>
        </div>
      </div>

      {/* Row 3 — Credentials */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
        <div>
          <label style={lbl}>USERNAME</label>
          <input value={user} onChange={e=>setUser(e.target.value)} placeholder="admin" style={inp}/>
        </div>
        <div>
          <label style={lbl}>PASSWORD</label>
          <input type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="camera password" style={inp}/>
        </div>
      </div>

      {/* RTSP URL with suggestions */}
      <div style={{marginBottom:14}}>
        <label style={lbl}>RTSP STREAM URL</label>
        <input value={rtsp} onChange={e=>setRtsp(e.target.value)} placeholder="Auto-generated from IP + brand" style={inpM}/>
        {suggestions.length > 1 && (
          <div style={{display:"flex",gap:6,marginTop:8,flexWrap:"wrap"}}>
            <span style={{fontSize:11,color:T.g2,alignSelf:"center"}}>Suggested:</span>
            {suggestions.map((u,i)=>(
              <button key={i} onClick={()=>setRtsp(u)} style={{
                padding:"3px 10px", borderRadius:6,
                border:`1px solid ${rtsp===u?T.orange:T.border}`,
                background:rtsp===u?`${T.orange}20`:T.card,
                color:rtsp===u?T.orange:T.g1,
                fontSize:10, cursor:"pointer", fontFamily:"'DM Mono'",
              }}>Stream {i+1}</button>
            ))}
          </div>
        )}
      </div>

      {/* Camera details */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:14}}>
        <div style={{gridColumn:"span 2"}}>
          <label style={lbl}>CAMERA NAME *</label>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. CAM-01 Gate Entry" style={inp}/>
        </div>
        <div>
          <label style={lbl}>RESOLUTION</label>
          <select value={res} onChange={e=>setRes(e.target.value)} style={sel}>
            {RESOLUTIONS.map(r=><option key={r}>{r}</option>)}
          </select>
        </div>
        <div style={{gridColumn:"span 3"}}>
          <label style={lbl}>ASSIGN TO ZONE</label>
          <select value={zone} onChange={e=>setZone(e.target.value)} style={sel}>
            {zones.map(z=><option key={z.id} value={z.id}>{z.name}</option>)}
          </select>
        </div>
      </div>

      {/* PPE types */}
      <div style={{marginBottom:18}}>
        <label style={lbl}>PPE TYPES TO DETECT</label>
        <PpeSelector value={ppe} onChange={setPpe}/>
      </div>

      {/* Web UI link */}
      {ip && (
        <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:10,padding:"10px 14px",marginBottom:16,display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontSize:16}}>🌐</span>
          <div style={{flex:1}}>
            <div style={{fontSize:12,fontWeight:700,color:T.white}}>Camera Web Interface</div>
            <div style={{fontSize:11,color:T.g1,fontFamily:"'DM Mono'"}}>http://{ip}:{httpPort}</div>
          </div>
          <a href={`http://${ip}:${httpPort}`} target="_blank" rel="noreferrer" style={{
            fontSize:11,fontWeight:700,color:T.blue,
            background:`${T.blue}15`,border:`1px solid ${T.blue}30`,
            padding:"5px 12px",borderRadius:6,textDecoration:"none",
          }}>Open →</a>
        </div>
      )}

      <button onClick={handleAdd} disabled={!ip||!name} style={{
        width:"100%", background:ip&&name?`linear-gradient(135deg,${T.orange},#FF8C52)`:`${T.g2}`,
        border:"none", borderRadius:10, padding:"13px",
        color:"#fff", fontSize:14, fontWeight:800,
        cursor:ip&&name?"pointer":"not-allowed", fontFamily:"'Nunito'",
      }}>
        + Add Camera
      </button>
    </div>
  );
}

/* ══════════════════════════════════════
   METHOD 2 — Auto Discovery
══════════════════════════════════════ */
function AutoDiscovery({ zones, onAdd, addedIps }) {
  const [scanning,   setScanning]   = useState(false);
  const [progress,   setProgress]   = useState(0);
  const [discovered, setDiscovered] = useState([]);
  const [sessionId,  setSessionId]  = useState(null);
  const [method,     setMethod]     = useState('all');
  const [subnet,     setSubnet]     = useState('');
  const [scanErr,    setScanErr]    = useState('');
  const pollRef = useRef(null);

  useEffect(() => () => { if(pollRef.current) clearInterval(pollRef.current); }, []);

  const startScan = async () => {
    setScanning(true); setProgress(0); setDiscovered([]); setScanErr('');
    try {
      const token = localStorage.getItem('safeg_token');
      const res = await axios.post('/api/v1/cameras/discover',
        { method, subnet: subnet||undefined, username:'admin', password:'' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const sid = res.data.sessionId;
      setSessionId(sid);
      pollRef.current = setInterval(async () => {
        try {
          const s = await axios.get(`/api/v1/cameras/discover/status/${sid}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          const d = s.data.data;
          setProgress(d.progress||0);
          if(d.cameras?.length) setDiscovered(d.cameras);
          if(d.status==='complete'||d.status==='error') {
            clearInterval(pollRef.current);
            setScanning(false);
            if(d.status==='error') setScanErr(d.error||'Scan failed');
          }
        } catch { clearInterval(pollRef.current); setScanning(false); }
      }, 1500);
    } catch(err) {
      setScanning(false);
      setScanErr(err.response?.data?.message||'Discovery failed. Check network access.');
    }
  };

  return (
    <div>
      <div style={{background:T.card2,border:`1px solid ${T.border}`,borderRadius:14,padding:18,marginBottom:16}}>
        <div style={{fontSize:12,color:T.orange,fontWeight:800,letterSpacing:1.5,marginBottom:14}}>NETWORK SCAN SETTINGS</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
          <div>
            <label style={lbl}>SCAN METHOD</label>
            <select value={method} onChange={e=>setMethod(e.target.value)} style={sel} disabled={scanning}>
              <option value="all">ONVIF + Port Scan (recommended)</option>
              <option value="onvif">ONVIF Only (faster)</option>
              <option value="portscan">Port Scan Only</option>
            </select>
          </div>
          <div>
            <label style={lbl}>SUBNET (auto-detect if blank)</label>
            <input value={subnet} onChange={e=>setSubnet(e.target.value)} placeholder="192.168.1" style={inpM} disabled={scanning}/>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          {!scanning ? (
            <button onClick={startScan} style={{background:`linear-gradient(135deg,${T.orange},#FF8C52)`,border:"none",borderRadius:10,padding:"11px 28px",color:"#fff",fontSize:13,fontWeight:800,cursor:"pointer",fontFamily:"'Nunito'"}}>
              🔍 Start Scan
            </button>
          ) : (
            <button onClick={()=>{clearInterval(pollRef.current);setScanning(false);}} style={{background:"transparent",border:`1px solid ${T.red}`,borderRadius:10,padding:"11px 22px",color:T.red,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Nunito'"}}>
              ✕ Stop
            </button>
          )}
          {scanning && (
            <div style={{flex:1}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:T.g1,marginBottom:5}}>
                <span>Scanning network...</span><span>{progress}%</span>
              </div>
              <div style={{height:5,background:T.border,borderRadius:3,overflow:"hidden"}}>
                <div style={{height:"100%",background:`linear-gradient(90deg,${T.orange},#FF8C52)`,borderRadius:3,width:`${progress}%`,transition:"width .5s"}}/>
              </div>
            </div>
          )}
        </div>
        {scanErr && <div style={{marginTop:10,padding:"9px 14px",background:`${T.red}10`,border:`1px solid ${T.red}30`,borderRadius:8,fontSize:12,color:T.red}}>⚠ {scanErr}</div>}
      </div>

      {/* Results */}
      {discovered.length > 0 && (
        <div>
          <div style={{fontSize:12,color:T.teal,fontWeight:800,letterSpacing:1.5,marginBottom:10}}>
            {discovered.length} CAMERA{discovered.length!==1?"S":""} FOUND
          </div>
          {discovered.map((cam,i)=>(
            <DiscoveredCard key={cam.ip||i} cam={cam} zones={zones} onAdd={onAdd} added={addedIps.includes(cam.ip)}/>
          ))}
        </div>
      )}

      {!scanning && discovered.length === 0 && (
        <div style={{textAlign:"center",padding:"32px 0",color:T.g2,fontSize:13}}>
          Run a scan to discover cameras on your network
        </div>
      )}
    </div>
  );
}

/* Single discovered camera row */
function DiscoveredCard({ cam, zones, onAdd, added }) {
  const [zone,  setZone]  = useState(zones[0]?.id||'');
  const [user,  setUser]  = useState('admin');
  const [pass,  setPass]  = useState('');
  const [rtsp,  setRtsp]  = useState(cam.rtspUrls?.[0]||'');
  const [ppe,   setPpe]   = useState(['Helmet','Safety Vest']);
  const [open,  setOpen]  = useState(false);

  return (
    <div style={{background:added?`${T.green}08`:T.card2,border:`1px solid ${added?T.green+"40":T.border}`,borderRadius:12,padding:"13px 16px",marginBottom:9}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontSize:18}}>📹</span>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:700,color:T.white}}>{cam.brand||'IP Camera'} {cam.model&&`· ${cam.model}`}</div>
          <div style={{fontSize:11,color:T.g1,fontFamily:"'DM Mono'"}}>{cam.ip} · {cam.protocol?.toUpperCase()}</div>
        </div>
        <button onClick={()=>setOpen(o=>!o)} style={{background:"none",border:"none",color:T.g1,cursor:"pointer",fontSize:15}}>{open?"▲":"▼"}</button>
        {!added ? (
          <button onClick={()=>onAdd({id:Date.now(),name:`${cam.brand||'Camera'} ${cam.ip}`,brand:cam.brand||'Generic',ip:cam.ip,rtspUrl:rtsp,zoneId:zone,ppeTypes:ppe,resolution:'1080p',protocol:'onvif',discovered:new Date().toISOString()})} style={{background:`linear-gradient(135deg,${T.orange},#FF8C52)`,border:"none",borderRadius:8,padding:"6px 16px",color:"#fff",fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:"'Nunito'"}}>+ Add</button>
        ) : (
          <span style={{color:T.green,fontSize:18,fontWeight:700}}>✓</span>
        )}
      </div>
      {open && (
        <div style={{marginTop:12,paddingTop:12,borderTop:`1px solid ${T.border}`,display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div><label style={lbl}>USERNAME</label><input value={user} onChange={e=>setUser(e.target.value)} style={inp}/></div>
          <div><label style={lbl}>PASSWORD</label><input type="password" value={pass} onChange={e=>setPass(e.target.value)} style={inp}/></div>
          <div style={{gridColumn:"span 2"}}>
            <label style={lbl}>RTSP URL</label>
            <input value={rtsp} onChange={e=>setRtsp(e.target.value)} style={inpM}/>
            {cam.rtspUrls?.length>1&&<div style={{display:"flex",gap:6,marginTop:6,flexWrap:"wrap"}}>{cam.rtspUrls.map((u,i)=><button key={i} onClick={()=>setRtsp(u)} style={{padding:"3px 10px",borderRadius:6,border:`1px solid ${rtsp===u?T.orange:T.border}`,background:rtsp===u?`${T.orange}20`:T.card,color:rtsp===u?T.orange:T.g1,fontSize:10,cursor:"pointer",fontFamily:"'DM Mono'"}}>Stream {i+1}</button>)}</div>}
          </div>
          <div><label style={lbl}>ZONE</label><select value={zone} onChange={e=>setZone(e.target.value)} style={sel}>{zones.map(z=><option key={z.id} value={z.id}>{z.name}</option>)}</select></div>
          <div><label style={lbl}>PPE TYPES</label><PpeSelector value={ppe} onChange={setPpe}/></div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════
   METHOD 3 — Manual Entry
══════════════════════════════════════ */
function ManualEntry({ zones, onAdd }) {
  const [form, setForm] = useState({
    name:"", brand:"CP Plus", ip:"", rtspUrl:"",
    camera_ip:"", camera_port:"80",
    zoneId:zones[0]?.id||"", resolution:"1080p",
    ppeTypes:["Helmet","Safety Vest"], username:"admin",
  });
  const F = (k,v) => setForm(f=>({...f,[k]:v}));

  return (
    <div style={{background:T.card2,border:`1px solid ${T.border}`,borderRadius:14,padding:18}}>
      <div style={{fontSize:12,color:T.blue,fontWeight:800,letterSpacing:1.5,marginBottom:14}}>MANUAL CAMERA ENTRY</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <div>
          <label style={lbl}>CAMERA NAME *</label>
          <input value={form.name} onChange={e=>F("name",e.target.value)} placeholder="CAM-01 Press Entry" style={inp}/>
        </div>
        <div>
          <label style={lbl}>BRAND</label>
          <select value={form.brand} onChange={e=>F("brand",e.target.value)} style={sel}>
            {BRANDS.map(b=><option key={b}>{b}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>IP ADDRESS</label>
          <input value={form.ip} onChange={e=>F("ip",e.target.value)} placeholder="192.168.1.100" style={inpM}/>
        </div>
        <div>
          <label style={lbl}>RESOLUTION</label>
          <select value={form.resolution} onChange={e=>F("resolution",e.target.value)} style={sel}>
            {RESOLUTIONS.map(r=><option key={r}>{r}</option>)}
          </select>
        </div>
        <div style={{gridColumn:"span 2"}}>
          <label style={lbl}>RTSP URL (optional)</label>
          <input value={form.rtspUrl} onChange={e=>F("rtspUrl",e.target.value)} placeholder="rtsp://admin:password@192.168.1.100:554/stream0" style={inpM}/>
        </div>
        <div>
          <label style={lbl}>CAMERA IP ADDRESS</label>
          <input value={form.camera_ip} onChange={e=>F("camera_ip",e.target.value)} placeholder="192.168.1.100" style={inpM}/>
        </div>
        <div>
          <label style={lbl}>CAMERA PORT</label>
          <input type="number" value={form.camera_port} onChange={e=>F("camera_port",e.target.value)} placeholder="80" style={inpM}/>
        </div>
        <div style={{gridColumn:"span 2"}}>
          <label style={lbl}>ASSIGN TO ZONE</label>
          <select value={form.zoneId} onChange={e=>F("zoneId",e.target.value)} style={sel}>
            {zones.map(z=><option key={z.id} value={z.id}>{z.name}</option>)}
          </select>
        </div>
        <div style={{gridColumn:"span 2"}}>
          <label style={lbl}>PPE TYPES TO DETECT</label>
          <PpeSelector value={form.ppeTypes} onChange={v=>F("ppeTypes",v)}/>
        </div>
      </div>
      <button onClick={()=>{
        if(!form.name){return;}
        onAdd({
          ...form,
          id:Date.now(),
          protocol:'manual',
          ipAddress:form.camera_ip || form.ip,
          port:form.camera_port || "80",
          discovered:new Date().toISOString(),
        });
        setForm({
          name:"", brand:"CP Plus", ip:"", rtspUrl:"",
          camera_ip:"", camera_port:"80",
          zoneId:zones[0]?.id||"", resolution:"1080p",
          ppeTypes:["Helmet","Safety Vest"], username:"admin"
        });
      }} style={{marginTop:16,width:"100%",background:`linear-gradient(135deg,${T.orange},#FF8C52)`,border:"none",borderRadius:10,padding:"13px",color:"#fff",fontSize:14,fontWeight:800,cursor:"pointer",fontFamily:"'Nunito'"}}>
        + Add Camera
      </button>
    </div>
  );
}

/* ══════════════════════════════════════
   ADDED CAMERAS LIST
══════════════════════════════════════ */
function AddedCamerasList({ cameras, zones, setCameras }) {
  if (cameras.length === 0) return null;
  return (
    <div style={{background:`${T.green}08`,border:`1px solid ${T.green}30`,borderRadius:12,padding:"14px 16px",marginBottom:16}}>
      <div style={{fontSize:12,color:T.green,fontWeight:800,letterSpacing:1.5,marginBottom:10}}>
        {cameras.length} CAMERA{cameras.length!==1?"S":""} ADDED
      </div>
      {cameras.map((c,i)=>{
        const zone = zones.find(z=>z.id===c.zoneId);
        return (
          <div key={i} style={{display:"flex",alignItems:"center",gap:10,marginBottom:6,padding:"8px 10px",background:T.card2,borderRadius:8}}>
            <span style={{fontSize:14}}>📹</span>
            <div style={{flex:1}}>
              <span style={{fontSize:13,fontWeight:700,color:T.white}}>{c.name}</span>
              <span style={{fontSize:11,color:T.g1,marginLeft:8}}>
                {c.brand} · {c.ip||'No IP'} · {zone?.name||'No zone'}
              </span>
            </div>
            <span style={{fontSize:10,color:T.g2,fontFamily:"'DM Mono'",marginRight:8}}>
              {c.protocol?.toUpperCase()}
            </span>
            <button onClick={()=>setCameras(prev=>prev.filter((_,j)=>j!==i))} style={{background:"none",border:"none",color:T.red,cursor:"pointer",fontSize:14}}>✕</button>
          </div>
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════════
   MAIN EXPORT
══════════════════════════════════════ */
export default function CameraDiscovery({ zones, cameras, setCameras, onNext, onBack, setError }) {
  const [method, setMethod] = useState('ip');

  const addCamera = (cam) => {
    setCameras(prev => {
      if (cam.ip && prev.find(c=>c.ip===cam.ip)) return prev;
      return [...prev, cam];
    });
  };

  const addedIps = cameras.map(c=>c.ip).filter(Boolean);

  return (
    <div style={{animation:"fadeUp .5s ease both"}}>
      <div style={{marginBottom:20}}>
        <div style={{fontFamily:"'Bebas Neue'",fontSize:32,color:T.white,letterSpacing:2}}>REGISTER CAMERAS</div>
        <div style={{color:T.g1,fontSize:13,marginTop:4}}>Connect cameras by IP address, auto-discover on network, or add manually</div>
      </div>

      {/* Method selector */}
      <MethodTabs active={method} onChange={setMethod}/>

      {/* Added cameras summary */}
      <AddedCamerasList cameras={cameras} zones={zones} setCameras={setCameras}/>

      {/* Method panels */}
      {method==='ip'       && <IpOnboarding    zones={zones} onAdd={addCamera}/>}
      {method==='discover' && <AutoDiscovery   zones={zones} onAdd={addCamera} addedIps={addedIps}/>}
      {method==='manual'   && <ManualEntry     zones={zones} onAdd={addCamera}/>}

      {/* Tip */}
      <div style={{background:`${T.teal}0A`,border:`1px solid ${T.teal}30`,borderRadius:10,padding:"10px 14px",margin:"16px 0",fontSize:12,color:T.g1}}>
        💡 <strong style={{color:T.teal}}>RTSP URL optional.</strong> Add stream URLs from the dashboard after setup. For CP Plus CP-E28Q use: <span style={{fontFamily:"'DM Mono'",color:T.g2}}>rtsp://admin:PASS@IP:554/stream0</span>
      </div>

      <div style={{display:"flex",gap:12}}>
        <button onClick={onBack} style={{flex:1,background:"transparent",border:`1px solid ${T.border}`,borderRadius:12,padding:"14px",color:T.g1,fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"'Nunito'"}}>← Back</button>
        <button onClick={()=>{
          if(cameras.length===0){setError("Please add at least one camera");return;}
          setError(""); onNext();
        }} style={{flex:2,background:`linear-gradient(135deg,${T.orange},#FF8C52)`,border:"none",borderRadius:12,padding:"14px",color:"#fff",fontSize:14,fontWeight:800,cursor:"pointer",fontFamily:"'Nunito'"}}>
          Continue → Activate Trial
        </button>
      </div>
    </div>
  );
}
