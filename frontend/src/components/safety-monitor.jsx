import { useState, useRef, useEffect, useCallback } from "react";
import AIMonitorPanel from './AIMonitorPanel';
import Form18Generator from './Form18Generator';
import ViolationArchive from './ViolationArchive';
import ComplianceReportGenerator from './ComplianceReportGenerator';
import ROICalculator from './ROICalculator';
import LanguageToggle from './LanguageToggle';
import MultiPlantDashboard from './MultiPlantDashboard';
import PPEComplianceBar from './PPEComplianceBar';
import ShiftComplianceReport from './ShiftComplianceReport';
import WorkerViolationHistory from './WorkerViolationHistory';
import ViolationHeatmap    from './ViolationHeatmap';
import CameraHealthMonitor from './CameraHealthMonitor';

const CAMERAS = [
  { id: 1, name: "Assembly Line A", zone: "Zone 1" },
  { id: 2, name: "Welding Station", zone: "Zone 2" },
  { id: 3, name: "Loading Bay", zone: "Zone 3" },
  { id: 4, name: "Chemical Storage", zone: "Zone 4" },
];

// Palette tokens — change here to retheme everything   
const T = {
  bg:         "#0e1117",   // page background
  bgCard:     "#161b24",   // camera tile / card
  bgSide:     "#12171f",   // sidebar
  bgHeader:   "#0b0f16",   // header
  border:     "rgba(255,255,255,0.08)",
  text:       "#e8edf5",   // primary readable text
  textSub:    "#8b95a8",   // secondary labels
  textMute:   "#4e596b",   // tertiary / placeholder
  accent:     "#4f8ef7",   // blue accent (branding)
};

const RISK_CONFIG = {
  HIGH:    { color: "#ff3b3b", glow: "rgba(255,59,59,0.65)",  bg: "rgba(255,59,59,0.12)",  label: "HIGH RISK", dot: "#ff3b3b" },
  MEDIUM:  { color: "#ffb020", glow: "rgba(255,176,32,0.55)", bg: "rgba(255,176,32,0.10)", label: "MEDIUM",    dot: "#ffb020" },
  LOW:     { color: "#22d97a", glow: "rgba(34,217,122,0.4)",  bg: "rgba(34,217,122,0.08)", label: "LOW RISK",  dot: "#22d97a" },
  SAFE:    { color: "#4f8ef7", glow: "rgba(79,142,247,0.4)",  bg: "rgba(79,142,247,0.08)", label: "SAFE",      dot: "#4f8ef7" },
  UNKNOWN: { color: "#4e596b", glow: "rgba(78,89,107,0.2)",   bg: "transparent",           label: "OFFLINE",   dot: "#4e596b" },
};

const INTERVAL_MS = 15000;

function parseRisk(text) {
  if (!text) return "UNKNOWN";
  const m = text.match(/RISK:\s*(HIGH|MEDIUM|LOW|SAFE)/i);
  if (m) return m[1].toUpperCase();
  const m2 = text.match(/\b(HIGH|MEDIUM|LOW|SAFE)\b/i);
  return m2 ? m2[1].toUpperCase() : "SAFE";
}

function parseViolations(text) {
  if (!text) return [];
  const lines = text.split("\n");
  const hits = [];
  let inViolations = false;
  for (const line of lines) {
    if (/VIOLATIONS:/i.test(line)) { inViolations = true; continue; }
    if (/SUMMARY:/i.test(line)) break;
    if (inViolations) {
      const clean = line.replace(/^[-•*\d.>]+\s*/, "").trim();
      if (clean.length > 4 && !/^none/i.test(clean)) hits.push(clean);
    }
    if (hits.length >= 4) break;
  }
  return hits;
}

function parseSummary(text) {
  const m = text.match(/SUMMARY:\s*(.+)/i);
  return m ? m[1].trim() : "";
}

// ── Global log context via a simple event emitter ─────────────────────────
const listeners = new Set();
function emitLog(entry) { listeners.forEach(fn => fn(entry)); }
// Expose globally so AIMonitorPanel can emit events
if (typeof window !== 'undefined') window._safegEmitLog = emitLog;

// ── Camera Tile ───────────────────────────────────────────────────────────
function CameraTile({ cam, isMain, onClick }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const countdownRef = useRef(null);
  const busyRef = useRef(false);

  const [status, setStatus] = useState("idle"); // idle | live | denied
  const [risk, setRisk] = useState("UNKNOWN");
  const [violations, setViolations] = useState([]);
  const [summary, setSummary] = useState("");
  const [scanning, setScanning] = useState(false);
  const [countdown, setCountdown] = useState(INTERVAL_MS / 1000);
  const [frameCount, setFrameCount] = useState(0);
  const [lastTime, setLastTime] = useState(null);

  const analyse = useCallback(async () => {
    if (busyRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;

    busyRef.current = true;
    setScanning(true);

    try {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      canvas.getContext("2d").drawImage(video, 0, 0);
      const b64 = canvas.toDataURL("image/jpeg", 0.7).split(",")[1];

      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 500,
          messages: [{
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: "image/jpeg", data: b64 } },
              { type: "text", text: `Safety analyst AI for manufacturing plant.
Camera: ${cam.name} (${cam.zone})
Scan for: PPE violations, unsafe posture, restricted zone intrusion, fire/smoke/chemical hazard, equipment misuse, blocked exits, slip/fall hazards, electrical violations.

Respond ONLY in this exact format:
RISK: HIGH|MEDIUM|LOW|SAFE
VIOLATIONS:
- <item or "None detected">
SUMMARY: <one short sentence>` }
            ]
          }]
        })
      });

      const data = await resp.json();
      const raw = data.content?.find(b => b.type === "text")?.text || "";
      const r = parseRisk(raw);
      const v = parseViolations(raw);
      const s = parseSummary(raw);

      setRisk(r);
      setViolations(v);
      setSummary(s);
      setLastTime(new Date().toLocaleTimeString());
      setFrameCount(c => c + 1);
      emitLog({ cam: cam.name, zone: cam.zone, risk: r, summary: s, violations: v.length, time: new Date().toLocaleTimeString() });
    } catch {
      // silent retry
    } finally {
      busyRef.current = false;
      setScanning(false);
      setCountdown(INTERVAL_MS / 1000);
    }
  }, [cam]);

const startCamera = async (e) => {
  e?.stopPropagation();
  // If camera has RTSP URL — use AI stream agent
  if (cam.rtsp_url && !cam.rtsp_url.includes('webcam')) {
    try {
      setStatus("live");
      const token = localStorage.getItem('safeg_token') || '';
      const AI_URL = window.location.hostname !== 'localhost'
        ? 'https://safeguardsiq.com/ai' : '/api/v1/ai';
      const res = await fetch(`${AI_URL}/stream/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          camera_id: cam.id || cam.cam_label,
          rtsp_url:  cam.rtsp_url,
          tenant_id: localStorage.getItem('safeg_tenant') || '',
          ppe_types: ['Helmet','Safety Vest','Gloves','Safety Boots'],
          token,
        })
      });
      const data = await res.json();
      if (data.success) {
        setStatus("live");
        setRisk("UNKNOWN");
      } else {
        setStatus("denied");
      }
    } catch { setStatus("denied"); }
    return;
  }
  // Fallback — browser webcam
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      setStatus("live");
      setRisk("UNKNOWN");
    } catch { setStatus("denied"); }
  };

  const stopCamera = (e) => {
    e?.stopPropagation();
    // Stop RTSP stream if running
    if (cam.rtsp_url && !cam.rtsp_url.includes('webcam')) {
      const AI_URL = window.location.hostname !== 'localhost'
        ? 'https://safeguardsiq.com/ai' : '/api/v1/ai';
      fetch(`${AI_URL}/stream/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ camera_id: cam.id || cam.cam_label })
      }).catch(() => {});
    }
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    clearInterval(intervalRef.current);
    clearInterval(countdownRef.current);
    setStatus("idle");
    setRisk("UNKNOWN");
    setViolations([]);
    setSummary("");
    setFrameCount(0);
  };

  useEffect(() => {
    if (status !== "live") return;
    analyse();
    intervalRef.current = setInterval(analyse, INTERVAL_MS);
    countdownRef.current = setInterval(() => setCountdown(c => c <= 1 ? INTERVAL_MS / 1000 : c - 1), 1000);
    return () => { clearInterval(intervalRef.current); clearInterval(countdownRef.current); };
  }, [status, analyse]);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    clearInterval(intervalRef.current);
    clearInterval(countdownRef.current);
  }, []);

  const rc = RISK_CONFIG[risk] || RISK_CONFIG.UNKNOWN;
  const alert = risk === "HIGH" || risk === "MEDIUM";
  const pad = isMain ? 14 : 8;

  return (
    <div onClick={onClick} style={{
      border: `1px solid ${alert ? rc.color : T.border}`,
      borderRadius: 5,
      background: alert ? rc.bg : T.bgCard,
      cursor: "pointer",
      display: "flex", flexDirection: "column",
      boxShadow: alert ? `0 0 28px ${rc.glow}` : "none",
      animation: risk === "HIGH" ? "alertPulse 1.3s ease-in-out infinite" : "none",
      transition: "box-shadow 0.4s, border-color 0.4s",
      overflow: "hidden",
    }}>
      {/* Video area */}
      <div style={{ position: "relative", aspectRatio: "16/9", background: "#000", overflow: "hidden", flexShrink: 0 }}>
        <video ref={videoRef} muted playsInline style={{
          width: "100%", height: "100%", objectFit: "cover",
          display: status === "live" ? "block" : "none"
        }} />
        <canvas ref={canvasRef} style={{ display: "none" }} />

        {status !== "live" && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", background: "#000810" }}>
            <div style={{ fontSize: isMain ? 42 : 26, opacity: 0.15, marginBottom: 6 }}>📷</div>
            <div style={{ fontSize: isMain ? 10 : 8, color: T.textSub, letterSpacing: 3 }}>
              {status === "denied" ? "CAMERA DENIED" : "CAMERA OFFLINE"}
            </div>
            {status === "idle" && (
              <button onClick={startCamera} style={{
                marginTop: 10, padding: isMain ? "8px 20px" : "5px 12px",
                background: "rgba(79,142,247,0.12)", border: "1px solid rgba(79,142,247,0.4)",
                color: "#7ab4ff", cursor: "pointer", fontSize: isMain ? 10 : 8,
                letterSpacing: 3, borderRadius: 3, fontFamily: "inherit", transition: "all 0.2s"
    }}>{cam.rtsp_url && !cam.rtsp_url.includes('webcam') ? '▶ CONNECT RTSP' : '▶ CONNECT'}</button>
            )}
          </div>
        )}

        {/* Scanning overlay */}
        {scanning && (
          <>
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none",
              background: "linear-gradient(transparent 48%, rgba(79,142,247,0.07) 50%, transparent 52%)",
              backgroundSize: "100% 6px", animation: "scanMove 1.5s linear infinite" }} />
            <div style={{ position: "absolute", inset: 0, border: "1px solid rgba(79,142,247,0.35)", pointerEvents: "none",
              animation: "borderPulse 0.8s ease-in-out infinite" }} />
            <div style={{ position: "absolute", bottom: 8, right: 8, fontSize: 8, color: "#a0c4ff",
              background: "rgba(0,0,0,0.75)", padding: "2px 6px", borderRadius: 2, letterSpacing: 2 }}>◌ AI SCANNING</div>
          </>
        )}

        {/* Risk badge */}
        {status === "live" && !scanning && risk !== "UNKNOWN" && (
          <div style={{
            position: "absolute", top: 8, right: 8,
            background: rc.color, color: "#000", fontWeight: "bold",
            fontSize: isMain ? 9 : 8, letterSpacing: 2, padding: "3px 8px", borderRadius: 2,
            boxShadow: `0 0 12px ${rc.glow}`
          }}>{rc.label}</div>
        )}

        {/* Countdown */}
        {status === "live" && !scanning && (
          <div style={{ position: "absolute", bottom: 8, left: 8, fontSize: 8,
            color: "rgba(160,196,255,0.5)", letterSpacing: 1 }}>next {countdown}s</div>
        )}

        {/* Corner brackets */}
        {["tl","tr","bl","br"].map(p => (
          <div key={p} style={{
            position: "absolute", width: 10, height: 10, pointerEvents: "none",
            top: p[0]==="t" ? 5 : undefined, bottom: p[0]==="b" ? 5 : undefined,
            left: p[1]==="l" ? 5 : undefined, right: p[1]==="r" ? 5 : undefined,
            borderTop: p[0]==="t" ? `1px solid ${rc.color}88` : "none",
            borderBottom: p[0]==="b" ? `1px solid ${rc.color}88` : "none",
            borderLeft: p[1]==="l" ? `1px solid ${rc.color}88` : "none",
            borderRight: p[1]==="r" ? `1px solid ${rc.color}88` : "none",
          }} />
        ))}
      </div>

      {/* Info */}
      <div style={{ padding: `${pad}px`, borderTop: `1px solid ${T.border}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: isMain ? 11 : 9, fontWeight: "bold", color: rc.color, letterSpacing: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              CAM-{String(cam.id).padStart(2,"0")} · {cam.name}
            </div>
            <div style={{ fontSize: 8, color: T.textSub, letterSpacing: 1, marginTop: 2 }}>
              {cam.zone}{lastTime ? ` · ${lastTime}` : ""}{frameCount > 0 ? ` · ${frameCount} scans` : ""}
            </div>
          </div>
          {status === "live" && (
            <button onClick={stopCamera} style={{
              background: "none", border: "1px solid rgba(255,60,60,0.2)",
              color: "#ff4444", cursor: "pointer", fontSize: 8, padding: "2px 7px",
              borderRadius: 2, fontFamily: "inherit", letterSpacing: 1, marginLeft: 8, flexShrink: 0
            }}>■ STOP</button>
          )}
        </div>

        {isMain && summary && (
          <div style={{ marginTop: 6, fontSize: 10, color: T.textSub, fontStyle: "italic" }}>{summary}</div>
        )}

        {isMain && violations.length > 0 && (
          <div style={{ marginTop: 8 }}>
            {violations.map((v, i) => (
              <div key={i} style={{ display: "flex", gap: 5, marginBottom: 3, fontSize: 10 }}>
                <span style={{ color: rc.color, flexShrink: 0 }}>▸</span>
                <span style={{ color: T.text }}>{v}</span>
              </div>
            ))}
          </div>
        )}

        {isMain && risk !== "UNKNOWN" && violations.length === 0 && status === "live" && !scanning && (
          <div style={{ marginTop: 6, fontSize: 10, color: "#00aaff" }}>✔ No violations detected</div>
        )}
      </div>
    </div>
  );
}

// ── App Shell ─────────────────────────────────────────────────────────────
export default function App() {
  const [focusIdx, setFocusIdx] = useState(null);
  const [logs, setLogs] = useState([]);
  const clockRef = useRef(null);
  const [clockStr, setClockStr] = useState(new Date().toLocaleTimeString());
const [realCameras, setRealCameras] = useState([]);
const [showAddCamera, setShowAddCamera] = useState(false);
const [manualCam, setManualCam] = useState({ label: '', rtsp: '' });
const [manualError, setManualError] = useState('');

const connectManualCamera = async () => {
  if (!manualCam.label) { setManualError('Enter camera label'); return; }
  if (!manualCam.rtsp)  { setManualError('Enter RTSP URL'); return; }
  setManualError('');
  try {
    const AI_URL = window.location.hostname !== 'localhost'
      ? 'https://safeguardsiq.com/ai' : '/api/v1/ai';
    const token = localStorage.getItem('safeg_token') || '';
    const res = await fetch(`${AI_URL}/stream/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        camera_id: manualCam.label,
        rtsp_url:  manualCam.rtsp,
        tenant_id: localStorage.getItem('safeg_tenant') || '',
        ppe_types: ['Helmet','Safety Vest','Gloves','Safety Boots'],
        token,
      })
    });
    const data = await res.json();
    if (data.success) {
      // Add to realCameras list
      setRealCameras(prev => [...prev, {
        id: manualCam.label,
        name: manualCam.label,
        zone: 'Manual',
        rtsp_url: manualCam.rtsp,
        status: 'online',
        cam_label: manualCam.label,
      }]);
      setShowAddCamera(false);
      setManualCam({ label: '', rtsp: '' });
    } else {
      setManualError('Failed to connect — check RTSP URL');
    }
  } catch(e) {
    setManualError('Connection error: ' + e.message);
  }
};

  useEffect(() => {
    const fetchCams = async () => {
      try {
        const token = localStorage.getItem('safeg_token') || '';
        const res = await fetch('/api/v1/cameras', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        const allCams = data.data || [];
        const camLimit = parseInt(localStorage.getItem('safeg_cam_limit')) || 999;
        const cams = allCams.slice(0, camLimit).map(c => ({
          id: c.id,
          name: c.cam_label || c.id,
          zone: c.area_name || c.zone_type || 'Zone',
          rtsp_url: c.rtsp_url || '',
          status: c.status || 'offline',
        }));
        if (cams.length > 0) setRealCameras(cams);
      } catch(e) {
        console.error('Camera fetch error:', e);
      }
    };
    fetchCams();
    const interval = setInterval(fetchCams, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fn = (entry) => setLogs(prev => [entry, ...prev.slice(0, 99)]);
    listeners.add(fn);
    return () => listeners.delete(fn);
  }, []);

  useEffect(() => {
    clockRef.current = setInterval(() => setClockStr(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(clockRef.current);
  }, []);

  const highCount = logs.filter(l => l.risk === "HIGH").length;
  const medCount  = logs.filter(l => l.risk === "MEDIUM").length;

  useEffect(() => {
    const total = highCount + medCount;
    if (window.location.pathname === '/dashboard') {
      document.title = total > 0
        ? `⚠️ ${total} VIOLATIONS — SafeguardIQ Enterprise`
        : 'SafeguardIQ Enterprise';
    }
  }, [highCount, medCount]);

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text,
      fontFamily: "'Courier New', Courier, monospace", display: "flex", flexDirection: "column" }}>

      {/* Scanlines */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 60,
        backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(255,255,255,0.008) 3px,rgba(255,255,255,0.008) 4px)" }} />

      {/* Header */}
      <header style={{ padding: "10px 20px", borderBottom: `1px solid ${T.border}`,
        background: T.bgHeader, backdropFilter: "blur(10px)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 36, height: 36, background: "linear-gradient(135deg,#4f8ef7,#7b5ea7)",
            borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, boxShadow: "0 0 18px rgba(79,142,247,0.4)" }}>⚠</div>
          <div>
            <div style={{ fontSize: 14, color: T.text, letterSpacing: 5, fontWeight: "bold" }}>SAFEGUARD AI</div>
            <div style={{ fontSize: 8, color: T.textMute, letterSpacing: 3 }}>CONTINUOUS LIVE SAFETY MONITORING · MANUFACTURING</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 20, fontSize: 9, color: T.textSub, alignItems: "center" }}>
          <span>● {(realCameras.length > 0 ? realCameras : CAMERAS).length} FEEDS</span>
          <span style={{ color: "#ffb020" }}>⚠ {highCount + medCount} ALERTS</span>
          <span style={{ color: "#4f8ef7" }}>■ LIVE</span>
          <span style={{ color: T.textSub }}>{clockStr}</span>
          <LanguageToggle />
        </div>
      </header>

      <div style={{ display: "flex", flex: 1, overflow: "hidden", height: "calc(100vh - 57px)" }}>
        {/* Main grid area */}
        <div style={{ flex: 1, padding: 14, overflowY: "auto" }}>
          <AIMonitorPanel />
          <PPEComplianceBar />
          <CameraHealthMonitor />
          <ViolationHeatmap />
          <MultiPlantDashboard />
          <ViolationArchive />
          <ShiftComplianceReport />
          <WorkerViolationHistory />
          <ComplianceReportGenerator />
          <ROICalculator />
          {focusIdx !== null ? (
            <div>
              <button onClick={() => setFocusIdx(null)} style={{
                marginBottom: 12, background: "none",
                border: `1px solid ${T.border}`, color: T.textSub,
                cursor: "pointer", fontSize: 9, padding: "5px 14px",
                borderRadius: 3, fontFamily: "inherit", letterSpacing: 3
              }}>← ALL CAMERAS</button>
              <CameraTile cam={(realCameras.length > 0 ? realCameras : CAMERAS)[focusIdx]} isMain={true} onClick={() => {}} />
            </div>
          ) : (
            <>
<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
  {(realCameras.length > 0 ? realCameras : CAMERAS).map((cam, i) => (
    <CameraTile key={cam.id} cam={cam} isMain={false} onClick={() => setFocusIdx(i)} />
  ))}
  {/* Manual Add Camera Tile */}
  {showAddCamera ? (
    <div style={{ background: T.bgCard, border: `1px solid ${T.border}`,
      borderRadius: 8, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 10, color: T.textSub, letterSpacing: 2, fontWeight: 700 }}>
        ADD CAMERA MANUALLY
      </div>
      <input
        placeholder="Camera Label (e.g. Welding Zone)"
        value={manualCam.label}
        onChange={e => setManualCam(p => ({...p, label: e.target.value}))}
        style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6,
          padding: "8px 10px", color: T.text, fontSize: 11, fontFamily: "monospace",
          outline: "none" }}
      />
      <input
        placeholder="RTSP URL (rtsp://admin:pass@192.168.1.x:554/stream1)"
        value={manualCam.rtsp}
        onChange={e => setManualCam(p => ({...p, rtsp: e.target.value}))}
        style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6,
          padding: "8px 10px", color: T.text, fontSize: 11, fontFamily: "monospace",
          outline: "none" }}
      />
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={connectManualCamera} style={{
          flex: 2, padding: "8px", borderRadius: 6, background: "rgba(79,142,247,0.15)",
          border: "1px solid rgba(79,142,247,0.4)", color: "#7ab4ff",
          fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
          ▶ Connect
        </button>
        <button onClick={() => { setShowAddCamera(false); setManualCam({label:'',rtsp:''}); }}
          style={{ flex: 1, padding: "8px", borderRadius: 6, background: "none",
          border: `1px solid ${T.border}`, color: T.textSub, fontSize: 11, cursor: "pointer" }}>
          Cancel
        </button>
      </div>
      {manualError && <div style={{ fontSize: 10, color: "#ff3b3b" }}>{manualError}</div>}
    </div>
  ) : (
    <div onClick={() => setShowAddCamera(true)}
      style={{ background: T.bgCard, border: `1px dashed ${T.border}`,
        borderRadius: 8, padding: 14, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 8,
        cursor: "pointer", minHeight: 120, transition: "border-color .2s" }}
      onMouseEnter={e => e.currentTarget.style.borderColor = "#7ab4ff"}
      onMouseLeave={e => e.currentTarget.style.borderColor = T.border}>
      <div style={{ fontSize: 24, color: T.textMute }}>＋</div>
      <div style={{ fontSize: 9, color: T.textMute, letterSpacing: 2 }}>ADD CAMERA</div>
      <div style={{ fontSize: 8, color: T.textMute }}>RTSP / Webcam</div>
    </div>
  )}
</div>
              <Form18Generator />
              <div style={{ marginTop: 12, padding: "10px 14px",
                border: `1px solid ${T.border}`, borderRadius: 4,
                background: T.bgCard, fontSize: 9, color: T.textSub, lineHeight: 2 }}>
                <span style={{ color: T.text, letterSpacing: 2 }}>◆ SETUP</span>
                {"  "}Click <b style={{ color: "#7ab" }}>▶ CONNECT</b> on each tile — your device camera will be used for that feed.
                Frames are auto-captured every <b style={{ color: "#7ab" }}>15 s</b> and analysed by Claude AI.
                Click any tile to expand. Real RTSP streams can be proxied to &lt;video&gt; via a local relay.
              </div>
            </>
          )}
        </div>

        {/* Alert sidebar */}
        <aside style={{ width: 240, borderLeft: `1px solid ${T.border}`,
          background: T.bgSide, display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <div style={{ padding: "11px 14px", borderBottom: `1px solid ${T.border}`,
            fontSize: 8, letterSpacing: 3, color: T.textSub }}>LIVE EVENT LOG</div>

          {/* Legend */}
          <div style={{ padding: "10px 14px 8px", borderBottom: `1px solid ${T.border}` }}>
            {[["HIGH","#ff3b3b"],["MEDIUM","#ffb020"],["LOW","#22d97a"],["SAFE","#4f8ef7"]].map(([l,c]) => (
              <div key={l} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: c, flexShrink: 0 }} />
                <span style={{ fontSize: 8, color: c, letterSpacing: 2 }}>{l}</span>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div style={{ padding: "10px 14px", borderBottom: `1px solid ${T.border}`,
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[
              { label: "TOTAL", val: logs.length, color: T.text },
              { label: "HIGH", val: highCount, color: "#ff3b3b" },
              { label: "MEDIUM", val: medCount, color: "#ffb020" },
              { label: "SAFE", val: logs.filter(l=>l.risk==="SAFE"||l.risk==="LOW").length, color: "#4f8ef7" },
            ].map(s => (
              <div key={s.label} style={{ textAlign: "center", padding: "6px 4px",
                border: `1px solid ${T.border}`, borderRadius: 3 }}>
                <div style={{ fontSize: 18, fontWeight: "bold", color: s.color }}>{s.val}</div>
                <div style={{ fontSize: 7, color: T.textSub, letterSpacing: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Events */}
          <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
            {logs.length === 0 ? (
              <div style={{ textAlign: "center", color: T.textMute, fontSize: 9, marginTop: 24, lineHeight: 2 }}>
                Connect cameras<br/>to see events here
              </div>
            ) : logs.map(log => {
              const rc = RISK_CONFIG[log.risk] || RISK_CONFIG.UNKNOWN;
              return (
                <div key={log.id || Math.random()} style={{
                  padding: "8px 14px", borderBottom: `1px solid ${T.border}`,
                  borderLeft: `2px solid ${rc.color}`, marginBottom: 2,
                  background: log.risk === "HIGH" ? "rgba(255,59,59,0.06)" : "transparent"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ fontSize: 8, color: rc.color, letterSpacing: 2, fontWeight: "bold" }}>{log.risk}</span>
                    <span style={{ fontSize: 7, color: T.textMute }}>{log.time}</span>
                  </div>
                  <div style={{ fontSize: 8, color: T.text, marginBottom: 2 }}>{log.cam}</div>
                  <div style={{ fontSize: 8, color: T.textSub, lineHeight: 1.4 }}>{log.summary}</div>
                </div>
              );
            })}
          </div>
        </aside>
      </div>

      <style>{`
        @keyframes alertPulse {
          0%,100% { box-shadow: 0 0 24px rgba(255,34,51,0.6); }
          50%      { box-shadow: 0 0 50px rgba(255,34,51,0.95); }
        }
        @keyframes scanMove {
          0%   { background-position: 0 0; }
          100% { background-position: 0 200px; }
        }
        @keyframes borderPulse {
          0%,100% { opacity: 0.4; } 50% { opacity: 1; }
        }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
        button:hover { filter: brightness(1.3); }
      `}</style>
    </div>
  );
}
