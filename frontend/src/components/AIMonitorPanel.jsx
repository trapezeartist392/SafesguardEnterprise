/**
 * AIMonitorPanel.jsx — with Hindi/English support
 * Production: Browser captures webcam frames and sends to server Claude AI
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useLang } from '../i18n/LanguageContext';

const AI_URL = '/api/v1/ai';

const IS_PRODUCTION = typeof window !== 'undefined' && window.location.hostname !== 'localhost';

const T = {
  bg:"#05080F", card:"#0C1422", card2:"#101828",
  border:"#1A2540", orange:"#FF5B18", teal:"#00D4B4",
  blue:"#2D8EFF", white:"#EDF2FF", g1:"#8899BB", g2:"#3A4E72",
  green:"#22D468", red:"#FF3D3D", amber:"#FFB400",
};

const PPE_OPTIONS = [
  "Helmet","Safety Vest","Gloves","Safety Boots","Goggles","Face Mask",
  "Fire & Smoke","Chemical Hazard","Machinery Safety","Vehicle Safety","Working at Height","Housekeeping",
];

const PPE_ICONS = {
  "Helmet":"⛑️","Safety Vest":"🦺","Gloves":"🧤","Safety Boots":"👢",
  "Goggles":"🥽","Face Mask":"😷","Fire & Smoke":"🔥","Chemical Hazard":"🧪",
  "Machinery Safety":"⚙️","Vehicle Safety":"🚗","Working at Height":"🏗️","Housekeeping":"🚧",
  "Pathway Violation":"🚧","Zone Violation":"⛔","Exit Blocked":"🚪",
};

const PPE_LABELS_HI = {
  "Helmet":"हेलमेट","Safety Vest":"सेफ्टी वेस्ट","Gloves":"दस्ताने",
  "Safety Boots":"सेफ्टी बूट","Goggles":"चश्मा","Face Mask":"फेस मास्क",
  "Fire & Smoke":"आग और धुआं","Chemical Hazard":"रासायनिक खतरा",
  "Machinery Safety":"मशीनरी सुरक्षा","Vehicle Safety":"वाहन सुरक्षा",
  "Working at Height":"ऊंचाई पर काम","Housekeeping":"साफ-सफाई",
};

// Auto-refresh token on 401
const authFetch = async (url, options = {}) => {
  const token = localStorage.getItem('safeg_token') || '';
  const res = await fetch(url, {
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) {
    // Try refresh
    const refresh = localStorage.getItem('safeg_refresh');
    if (refresh) {
      const rRes = await fetch('/api/v1/auth/refresh-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: refresh }),
      });
      const rData = await rRes.json();
      if (rData?.data?.accessToken) {
        localStorage.setItem('safeg_token', rData.data.accessToken);
        if (rData.data.refreshToken) localStorage.setItem('safeg_refresh', rData.data.refreshToken);
        // Retry original request with new token
        return fetch(url, {
          ...options,
          headers: { ...options.headers, Authorization: `Bearer ${rData.data.accessToken}` },
        });
      }
    }
    // Refresh failed — redirect to login
    window.location.href = '/login';
  }
  return res;
};

export default function AIMonitorPanel() {
  const { t, lang } = useLang();
  const [aiOnline,  setAiOnline]  = useState(false);
  const [streams,   setStreams]    = useState({});
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [expanded,  setExpanded]  = useState(false);
  const [camId,     setCamId]     = useState('laptop-webcam');
  const [rtspUrl,   setRtspUrl]   = useState('webcam:0');
  const [ppeTypes,  setPpeTypes]  = useState(['Helmet','Safety Vest','Gloves']);
  const [violLog,   setViolLog]   = useState([]);
  const violLogRef = useRef([]);
  const analyseBrowserFrameRef = useRef(null);
  const [showAllViolations, setShowAllViolations] = useState(false);

  const canvasRef      = useRef(null);
  const intervalRef    = useRef(null);
  const ppeTypesRef    = useRef(ppeTypes);
  const camIdRef       = useRef(camId);
  const videoRef       = useRef(null);
  const mediaStreamRef = useRef(null);
  const [capturing,    setCapturing]   = useState(false);

  useEffect(() => { ppeTypesRef.current = ppeTypes; }, [ppeTypes]);
  useEffect(() => { camIdRef.current = camId; }, [camId]);

  const tenantId = localStorage.getItem('safeg_tenant') || 'ca5b55f4-bcac-4744-b07a-370503414ff1';
  const isDemo = tenantId === 'ca5b55f4-bcac-4744-b07a-370503414ff1';

  useEffect(() => {
    const init = async () => {
      try {
        const r = await fetch(`${AI_URL}/health`);
        if (!r.ok) { setAiOnline(false); return; }
        setAiOnline(true);
        // Clear all stopped streams on server
        await fetch(`${AI_URL}/stream/clear`, { method: 'POST' }).catch(() => {});
        setStreams({});
        setExpanded(true);
      } catch { setAiOnline(false); }
    };
    init();
    const t = setInterval(async () => {
      try { const r = await fetch(`${AI_URL}/health`); setAiOnline(r.ok); }
      catch { setAiOnline(false); }
    }, 10000);
    return () => clearInterval(t);
  }, [tenantId]);

  useEffect(() => {
    const poll = async () => {
      try {
        const r    = await fetch(`${AI_URL}/stream/status`);
        const data = await r.json();
        const s    = data.streams || {};
        // Merge server streams with local streams — don't overwrite browser webcam streams
        setStreams(prev => {
          const merged = { ...prev };
          Object.entries(s).forEach(([id, info]) => {
            merged[id] = { ...merged[id], ...info };
          });
          // Keep browser webcam streams that server doesn't know about
          Object.entries(prev).forEach(([id, info]) => {
            if (info.rtsp_url === 'browser-webcam' && !s[id]) {
              merged[id] = info; // preserve local webcam stream
            }
          });
          return merged;
        });
        Object.entries(s).forEach(([id, info]) => {
          if ((info.violations_today || 0) > 0 && info.last_violations_list?.length > 0) {
            const newEntries = info.last_violations_list.map((v, i) => ({
              id: `${id}-${info.violations_today}-${i}`, camera: id,
              type: v.type, category: v.category || 'ppe',
              persons: info.persons_detected || 0, total: info.violations_today || 0,
              time: new Date().toLocaleTimeString(), desc: v.description || '',
            }));
            const combined = [...newEntries, ...violLogRef.current];
            violLogRef.current = combined
              .filter((v, i, arr) => arr.findIndex(x => x.id === v.id) === i)
              .slice(0, 20);
            setViolLog([...violLogRef.current]);
          }
        });
      } catch {}
    };
    poll();
    const t = setInterval(poll, 2000);
    return () => clearInterval(t);
  }, []);

  const analyseBrowserFrame = async () => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 3 || video.videoWidth === 0) return;
    try {
      canvas.getContext('2d').drawImage(video, 0, 0, 640, 480);
      const b64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
      const res = await authFetch(`/api/v1/ai/detect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: b64,
          cameraId: camIdRef.current,
          ppeTypes: ppeTypesRef.current,
        }),
      });
      const json = await res.json();
      const data = json.data || json;
      const id   = camIdRef.current;
      setStreams(prev => ({
          ...prev,
          [id]: {
          ...prev[id], status: 'running', rtsp_url: 'browser-webcam',
          last_detection: new Date().toISOString(),
          persons_detected: data.persons_detected || 0,
          risk_level: data.risk_level || 'safe',
          violations_today: (prev[id]?.violations_today || 0) + (data.violations?.length || 0),
          ppe_violations: data.ppe_violations || 0,
          pathway_violations: data.pathway_violations || 0,
          unsafe_violations: data.unsafe_violations || 0,
          accident_violations: data.accident_violations || 0,
          nearmiss_violations: data.nearmiss_violations || 0,
          current_violations: (data.violations || []).map(v => v.type),
          last_violations_list: data.violations || [],
          last_violation: data.violations?.[0]?.type || prev[id]?.last_violation,
          last_summary: data.summary || '', compliant: data.compliant ?? true,
          ppe_types: ppeTypesRef.current,
        }
      }));
      if (data.violations?.length > 0) {
        // Save last violation to localStorage for Form 18
        const v = data.violations[0];
        localStorage.setItem('safeg_last_violation', JSON.stringify({
          camera: camIdRef.current,
          time: new Date().toISOString(),
          confidence: v.confidence,
          type: v.type,
          description: v.description,
        }));

        // Emit to LIVE EVENT LOG in safety-monitor
        if (typeof window !== 'undefined' && window._safegEmitLog) {
          window._safegEmitLog({
            cam: camIdRef.current,
            zone: 'Factory Floor',
            risk: data.risk_level?.toUpperCase() || 'HIGH',
            summary: data.summary || `${data.violations.length} violation(s) detected`,
            violations: data.violations.length,
            time: new Date().toLocaleTimeString(),
            id: Date.now(),
          });
        }
        console.log('Adding to violLog:', data.violations.length, 'violations, current log length:', violLogRef.current.length);
        const newEntries = data.violations.map((v, i) => ({
          id: `${camIdRef.current}-${Date.now()}-${i}`,
          camera: camIdRef.current,
          type: v.type,
          category: v.category || 'ppe',
          persons: data.persons_detected || 0,
          total: data.violations.length,
          time: new Date().toLocaleTimeString(),
          desc: v.description || '',
        }));
        violLogRef.current = [...newEntries, ...violLogRef.current].slice(0, 20);
        console.log('violLogRef updated:', violLogRef.current.length, 'items');
        setViolLog([...violLogRef.current]);
        console.log('setViolLog called');
      }
      } catch(e) { console.error('Analysis error:', e); }
    };

  analyseBrowserFrameRef.current = analyseBrowserFrame;

  const startStream = async () => {
    setLoading(true); setError('');
    // Force webcam for demo account - use local variable not state
    const effectiveRtspUrl = isDemo ? 'webcam:0' : rtspUrl;
    if (isDemo) setRtspUrl('webcam:0');
    const isRtsp = effectiveRtspUrl && effectiveRtspUrl !== 'webcam:0' && !effectiveRtspUrl.startsWith('webcam:');
    if (!isRtsp) {
      try {
        // Stop any existing stream
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(t => t.stop());
        }
        // Remove old video elements
        document.querySelectorAll('video[data-safeg]').forEach(v => v.remove());

        let media;
        try {
          media = await navigator.mediaDevices.getUserMedia({ video: { width:640, height:480 }, audio: false });
        } catch(camErr) {
          if (camErr.name === 'NotAllowedError' || camErr.name === 'PermissionDeniedError') {
            setError(lang === 'hi'
              ? 'कैमरा अनुमति अस्वीकृत। ब्राउज़र में कैमरा अनुमति दें और पुनः प्रयास करें।'
              : 'Camera permission denied. Please allow camera access in your browser settings and try again.');
          } else if (camErr.name === 'NotFoundError') {
            setError('No camera found. Please connect a camera and try again.');
          } else if (camErr.name === 'NotReadableError') {
            setError('Camera is in use by another application. Please close other apps using the camera.');
          } else {
            setError(`Camera error: ${camErr.message}`);
          }
          setLoading(false);
          return;
        }
        mediaStreamRef.current = media;

        const video = document.createElement('video');
        video.setAttribute('data-safeg', 'monitor');
        video.srcObject = media;
        video.muted = true;
        video.playsInline = true;
        video.autoplay = true;
        video.width = 640;
        video.height = 480;
        video.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;pointer-events:none;';
        document.body.appendChild(video);
        videoRef.current = video;

        await new Promise((resolve, reject) => {
          video.onloadedmetadata = resolve;
          video.onerror = reject;
          setTimeout(resolve, 3000);
        });
        await video.play().catch(() => {});
        // Wait for video to actually have frames
        await new Promise(resolve => {
          let attempts = 0;
          const check = setInterval(() => {
            attempts++;
            if (video.readyState >= 3 || video.videoWidth > 0 || attempts > 20) {
              clearInterval(check);
              resolve();
            }
          }, 200);
        });
        await new Promise(resolve => setTimeout(resolve, 500));

        const canvas = document.createElement('canvas');
        canvas.width = 640; canvas.height = 480;
        canvasRef.current = canvas;

        setCapturing(true); setExpanded(false);
        setStreams(prev => ({
          ...prev,
          [camId]: {
            status: 'running', rtsp_url: 'browser-webcam', ppe_types: ppeTypes,
            started_at: new Date().toISOString(), violations_today: 0,
            persons_detected: 0, risk_level: 'safe', ppe_violations: 0,
            pathway_violations: 0, unsafe_violations: 0, accident_violations: 0,
            nearmiss_violations: 0, current_violations: [], last_violations_list: [],
            last_violation: null, last_summary: '', compliant: true,
          }
        }));
        await analyseBrowserFrameRef.current?.();
        intervalRef.current = setInterval(() => analyseBrowserFrameRef.current?.(), 15000);
      } catch(e) {
        setError('Camera error: ' + e.message);
      }
    } else {
      // RTSP stream
      try {
        const r = await authFetch(`/api/v1/ai/stream/start`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cameraId: camId,
            rtspUrl: effectiveRtspUrl,
            ppeTypes,
            confidence: 0.1,
          }),
        });
        const d = await r.json();
        if (d.success) {
          setExpanded(false);
          // Show RTSP stream card immediately
          setStreams(prev => ({
            ...prev,
            [camId]: {
              status: 'connecting', rtsp_url: effectiveRtspUrl, ppe_types: ppeTypes,
              started_at: new Date().toISOString(), violations_today: 0,
              persons_detected: 0, risk_level: 'safe', ppe_violations: 0,
              pathway_violations: 0, unsafe_violations: 0, accident_violations: 0,
              nearmiss_violations: 0, current_violations: [], last_violations_list: [],
              last_violation: null, last_summary: '', compliant: true,
            }
          }));
          // Poll RTSP stream status every 3 seconds
          const rtspPoll = setInterval(async () => {
            try {
              const sr = await fetch(`${AI_URL}/stream/status/${camId}`);
              const sd = await sr.json();
              if (sd.success && sd.stream) {
                setStreams(prev => ({ ...prev, [camId]: { ...prev[camId], ...sd.stream } }));
                if (sd.stream.status === 'stopped' || sd.stream.status === 'error') {
                  clearInterval(rtspPoll);
                }
              }
            } catch {}
          }, 3000);
        } else {
          setError(d.message || 'Failed to start');
        }
      } catch(e) { setError(e.message); }
    }
    setLoading(false);
  };

  const stopStream = async (id) => {
    const streamInfo = streams[id];
    const wasRtsp = streamInfo?.rtsp_url && streamInfo.rtsp_url !== 'browser-webcam';
    if (!wasRtsp) {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      if (mediaStreamRef.current) { mediaStreamRef.current.getTracks().forEach(t => t.stop()); mediaStreamRef.current = null; }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        if (videoRef.current.parentNode) videoRef.current.parentNode.removeChild(videoRef.current);
        videoRef.current = null;
      }
      setCapturing(false);
      setStreams(prev => ({ ...prev, [id]: { ...prev[id], status: 'stopped' } }));
    } else {
      try {
        await authFetch(`/api/v1/ai/stream/stop`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ cameraId: id }),
        });
      } catch {}
      // Remove from UI
      setStreams(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach(t => t.stop());
  }, []);

  const togglePpe = p => setPpeTypes(prev =>
    prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
  );

  const allStreams    = Object.entries(streams);
  const activeStreams = allStreams.filter(([, s]) => s.status === 'running' || s.status === 'analysing');
  const totalViol     = allStreams.reduce((n, [, s]) => n + (s.violations_today || 0), 0);
  const totalPersons  = allStreams.reduce((n, [, s]) => n + (s.persons_detected || 0), 0);

  const getPPELabel = (ppe) => lang === 'hi' ? (PPE_LABELS_HI[ppe] || ppe) : ppe;

  return (
    <div style={{ fontFamily:"'Nunito',sans-serif", marginBottom:20 }}>
      <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:16, padding:20, marginBottom:16 }}>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:(expanded||allStreams.length>0)?16:0 }}>
          <div style={{ width:10, height:10, borderRadius:"50%", background:aiOnline?T.green:T.red, flexShrink:0,
            boxShadow:aiOnline?`0 0 8px ${T.green}`:undefined }} />
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14, fontWeight:800, color:T.white }}>{t('ai_engine')}</div>
            <div style={{ fontSize:11, color:T.g1 }}>
              {aiOnline ? (IS_PRODUCTION ? t('ai_online') : t('ai_online')) : t('ai_offline')}
            </div>
          </div>
          <div style={{ display:"flex", gap:20, marginRight:8 }}>
            {[
              { label:t('active'),           val:activeStreams.length, color:T.green },
              { label:t('persons'),           val:totalPersons,          color:T.blue  },
              { label:t('violations_count'),  val:totalViol,             color:totalViol>0?T.red:T.g1 },
            ].map(({ label, val, color }) => (
              <div key={label} style={{ textAlign:"center" }}>
                <div style={{ fontSize:26, fontWeight:800, color, fontFamily:"'Bebas Neue'", lineHeight:1 }}>{val}</div>
                <div style={{ fontSize:9, color:T.g2, letterSpacing:1 }}>{label}</div>
              </div>
            ))}
          </div>
          {allStreams.length > 0 && (
            <button onClick={async () => {
              await fetch(`${AI_URL}/stream/clear`, { method: 'POST' }).catch(() => {});
              if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
              if (mediaStreamRef.current) { mediaStreamRef.current.getTracks().forEach(t => t.stop()); mediaStreamRef.current = null; }
              if (videoRef.current) { videoRef.current.srcObject = null; videoRef.current = null; }
              setStreams({});
              setCapturing(false);
              violLogRef.current = [];
              setViolLog([]);
            }} style={{
              background:"none", border:`1px solid ${T.red}40`, borderRadius:8,
              padding:"7px 16px", color:T.red, fontSize:12, fontWeight:700,
              cursor:"pointer", fontFamily:"'Nunito'",
            }}>✕ Clear All</button>
          )}
          <button onClick={() => setExpanded(e => !e)} style={{
            background:"none", border:`1px solid ${T.border}`, borderRadius:8,
            padding:"7px 16px", color:T.g1, fontSize:12, fontWeight:700,
            cursor:"pointer", fontFamily:"'Nunito'",
          }}>
            {expanded ? t('close') : t('add_camera')}
          </button>
        </div>

        {/* Add camera form */}
        {expanded && (
          <div style={{ background:T.card2, border:`1px solid ${T.border}`, borderRadius:12, padding:16, marginBottom:16 }}>
            <div style={{ fontSize:11, color:T.orange, fontWeight:800, letterSpacing:1.5, marginBottom:14 }}>
{lang==='hi' ? 'कैमरा जोड़ें' : 'CONNECT CAMERA'}
            </div>

{!isDemo && (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
                <div>
                  <label style={{ fontSize:10, color:T.g1, display:"block", marginBottom:5, letterSpacing:1, fontWeight:700 }}>
                    {t('camera_name').toUpperCase()}
                  </label>
                  <input value={camId} onChange={e=>setCamId(e.target.value)}
                    style={{ width:"100%", background:"#06090F", border:`1px solid ${T.border}`, borderRadius:8,
                      padding:"10px 12px", color:T.white, fontSize:13, fontFamily:"'Nunito'", outline:"none", boxSizing:"border-box" }}/>
                </div>
                <div>
                  <label style={{ fontSize:10, color:T.g1, display:"block", marginBottom:5, letterSpacing:1, fontWeight:700 }}>
                    STREAM URL
                  </label>
                  <input value={rtspUrl} onChange={e=>setRtspUrl(e.target.value)}
                    placeholder="rtsp://admin:pass@192.168.1.x:554/stream1  or  webcam:0 for browser"
                    style={{ width:"100%", background:"#06090F", border:`1px solid ${T.border}`, borderRadius:8,
                      padding:"10px 12px", color:T.white, fontSize:12, fontFamily:"'DM Mono'", outline:"none", boxSizing:"border-box" }}/>
                </div>
              </div>
            )}
            {isDemo && (
              <div style={{ marginBottom:14, padding:"12px 16px", background:`${T.teal}10`,
                border:`1px solid ${T.teal}30`, borderRadius:8, fontSize:12, color:T.teal, fontWeight:700 }}>
                📷 Demo mode — browser webcam only. Sign up for a paid plan to connect RTSP cameras.
              </div>
            )}

{false && (
              <div style={{ marginBottom:14, padding:"10px 14px", background:`${T.teal}10`,
                border:`1px solid ${T.teal}30`, borderRadius:8, fontSize:11, color:T.teal }}>
                {t('browser_cam_note')}
              </div>
            )}

            {/* PPE selector */}
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:10, color:T.g1, display:"block", marginBottom:8, letterSpacing:1, fontWeight:700 }}>
                {t('ppe_to_detect').toUpperCase()}
              </label>
              <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
                {PPE_OPTIONS.map(p => {
                  const on = ppeTypes.includes(p);
                  return (
                    <button key={p} onClick={() => togglePpe(p)} style={{
                      padding:"6px 14px", borderRadius:20,
                      border:`1px solid ${on?T.orange:T.border}`,
                      background:on?`${T.orange}20`:T.card,
                      color:on?T.orange:T.g1,
                      fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"'Nunito'",
                    }}>
                      {PPE_ICONS[p]} {on?"✓ ":""}{getPPELabel(p)}
                    </button>
                  );
                })}
              </div>
            </div>

            {error && <div style={{ marginBottom:10, padding:"8px 12px", background:`${T.red}10`,
              border:`1px solid ${T.red}30`, borderRadius:8, fontSize:12, color:T.red }}>⚠ {error}</div>}

            <button onClick={startStream} disabled={loading||!aiOnline} style={{
              width:"100%", border:"none", borderRadius:10, padding:"13px",
              color:"#fff", fontSize:14, fontWeight:800, fontFamily:"'Nunito'",
              background:loading||!aiOnline?T.g2:`linear-gradient(135deg,${T.orange},#FF8C52)`,
              cursor:loading||!aiOnline?"not-allowed":"pointer",
              display:"flex", alignItems:"center", justifyContent:"center", gap:8,
            }}>
              {loading ? (lang==='hi'?'शुरू हो रहा है...':'Starting...') : !aiOnline ? (lang==='hi'?'⚠ AI सेवा ऑफलाइन':'⚠ AI Service Offline') : t('start_monitoring')}
            </button>
          </div>
        )}

        {/* Stream cards */}
        {allStreams.length > 0 && (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {allStreams.map(([id, s]) => {
              const running = s.status === 'running' || s.status === 'analysing';
              const viols   = s.violations_today || 0;
              const persons = s.persons_detected || 0;
              return (
                <div key={id} style={{ background:T.card2, border:`1px solid ${running?T.green+"50":T.border}`, borderRadius:12, padding:16 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                    <div style={{ width:8, height:8, borderRadius:"50%", background:running?T.green:T.g2, flexShrink:0,
                      animation:running?"blink 1.5s infinite":undefined }} />
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:800, color:T.white }}>{id}</div>
                      <div style={{ fontSize:10, color:T.g1, fontFamily:"'DM Mono'" }}>{s.rtsp_url} · {s.status}</div>
                    </div>
                    {(running || s.status === 'retrying' || s.status === 'connecting' || s.status === 'stopped') && (
                      <button onClick={() => stopStream(id)} style={{
                        background:"none", border:`1px solid ${T.red}40`, borderRadius:6,
                        padding:"5px 10px", color:T.red, fontSize:11, fontWeight:700, cursor:"pointer",
                      }}>{t('stop')}</button>
                    )}
                  </div>

                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr", gap:8, marginBottom:viols>0?12:0 }}>
                    {[
                      { label:t('persons'),   val:persons,                    color:persons>0?T.blue:T.g2 },
                      { label:t('ppe'),       val:s.ppe_violations||0,        color:(s.ppe_violations||0)>0?T.red:T.green },
                      { label:t('pathway'),   val:s.pathway_violations||0,    color:(s.pathway_violations||0)>0?T.amber:T.g2 },
                      { label:t('unsafe'),    val:s.unsafe_violations||0,     color:(s.unsafe_violations||0)>0?T.amber:T.g2 },
                      { label:t('accidents'), val:(s.accident_violations||0)+(s.nearmiss_violations||0), color:(s.accident_violations||0)>0?"#FF0000":T.g2 },
                    ].map(({ label, val, color }) => (
                      <div key={label} style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:10, padding:"12px 14px", textAlign:"center" }}>
                        <div style={{ fontSize:20, fontWeight:800, color, fontFamily:"'Bebas Neue'", lineHeight:1, marginBottom:4 }}>{val||0}</div>
                        <div style={{ fontSize:9, color:T.g2, letterSpacing:1 }}>{label}</div>
                      </div>
                    ))}
                  </div>

                  {viols > 0 && (
                    <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:10 }}>
                      {[...new Set(s.current_violations?.length > 0 ? s.current_violations : s.last_violation ? [s.last_violation] : [])].map(ppe => (
                        <div key={ppe} style={{ display:"flex", alignItems:"center", gap:6,
                          background:`${T.red}12`, border:`1px solid ${T.red}35`, borderRadius:8, padding:"5px 12px" }}>
                          <span style={{ fontSize:14 }}>{PPE_ICONS[ppe]||"⚠"}</span>
                          <span style={{ fontSize:12, color:T.red, fontWeight:700 }}>
                            {lang==='hi'?'नहीं':'No'} {getPPELabel(ppe)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {s.last_violations_list?.length > 0 && (
                    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                      {s.last_violations_list.map((v, i) => {
                        const catColor = v.category==='accident'?"#FF0000":v.category==='nearmiss'?"#FF6B00":v.category==='unsafe'?T.amber:v.category==='pathway'?"#00BCD4":T.red;
                        const catLabel = v.category==='accident'?"🚨":v.category==='nearmiss'?"❗":v.category==='unsafe'?"⚠️":v.category==='pathway'?"🚧":"⛑️";
                        return (
                          <div key={i} style={{ padding:"8px 12px", background:`${catColor}10`,
                            border:`1px solid ${catColor}30`, borderRadius:8, display:"flex", alignItems:"center", gap:10 }}>
                            <span style={{ fontSize:16 }}>{PPE_ICONS[v.type] || catLabel}</span>
                            <div style={{ flex:1 }}>
                              <div style={{ fontSize:12, fontWeight:800, color:catColor }}>
                                {lang==='hi'?'नहीं':'No'} {getPPELabel(v.type)}
                              </div>
                              {v.description && <div style={{ fontSize:9, color:T.g1, marginTop:1 }}>{v.description}</div>}
                            </div>
                            <div style={{ background:`${catColor}25`, border:`1px solid ${catColor}40`,
                              borderRadius:6, padding:"2px 8px", fontSize:9, fontWeight:800, color:catColor }}>
                              {v.category?.toUpperCase() || 'PPE'}
                            </div>
                          </div>
                        );
                      })}
                      <div style={{ fontSize:9, color:T.g1, fontFamily:"'DM Mono'", textAlign:"right" }}>
                        {t('last_detected')}: {s.last_detection ? new Date(s.last_detection).toLocaleTimeString('en-IN', {hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:true}) : ""}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {allStreams.length === 0 && !expanded && (
          <div style={{ textAlign:"center", padding:"14px 0", color:T.g2, fontSize:12 }}>
            {aiOnline ? t('no_cameras') : (lang==='hi'?'AI सेवा ऑफलाइन':t('ai_offline'))}
          </div>
        )}
      </div>

      {/* LIVE VIOLATION LOG */}
      {violLog.length > 0 && (
        <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:16, padding:20 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
            <div style={{ fontSize:11, color:T.red, fontWeight:800, letterSpacing:1.5 }}>{t('live_log')}</div>
            <button onClick={()=>{ violLogRef.current = []; setViolLog([]); }} style={{ background:"none", border:`1px solid ${T.border}`,
              borderRadius:6, padding:"3px 10px", color:T.g1, fontSize:10, fontWeight:700, cursor:"pointer" }}>
              {t('clear')}
            </button>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {(showAllViolations ? violLog : violLog.slice(0,5)).map((v,i) => {
              const catColor = v.category==='accident'?"#FF0000":v.category==='nearmiss'?"#FF6B00":v.category==='unsafe'?T.amber:v.category==='pathway'?"#00BCD4":T.red;
              const catLabel = v.category==='accident'
                ? (lang==='hi'?"🚨 दुर्घटना":"🚨 ACCIDENT")
                : v.category==='nearmiss'
                ? (lang==='hi'?"❗ बाल-बाल":"❗ NEAR MISS")
                : v.category==='unsafe'
                ? (lang==='hi'?"⚠️ असुरक्षित":"⚠️ UNSAFE")
                : v.category==='pathway'
                ? (lang==='hi'?"🚧 रास्ता":"🚧 PATHWAY")
                : (lang==='hi'?"⛑️ PPE":"⛑️ PPE");
              return (
                <div key={v.id||i} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px",
                  background:`${catColor}08`, border:`1px solid ${catColor}25`, borderRadius:10 }}>
                  <span style={{ fontSize:24, flexShrink:0 }}>{PPE_ICONS[v.type]||"⚠️"}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:11, fontWeight:800, color:catColor, marginBottom:2 }}>{catLabel}</div>
                    <div style={{ fontSize:13, fontWeight:800, color:T.white }}>
                      {lang==='hi'?'नहीं':'No'} {getPPELabel(v.type)}
                    </div>
                    {v.desc && <div style={{ fontSize:10, color:T.g1, marginTop:2 }}>{v.desc}</div>}
                    <div style={{ fontSize:10, color:T.g1, marginTop:2 }}>
                      {v.camera} · {v.persons} {lang==='hi'?'व्यक्ति':'person'}{v.persons!==1&&lang!=='hi'?"s":""} · {v.time}
                    </div>
                  </div>
                  <div style={{ textAlign:"center", flexShrink:0 }}>
                    <div style={{ fontSize:22, fontWeight:800, color:catColor, fontFamily:"'Bebas Neue'", lineHeight:1 }}>{v.total}</div>
                    <div style={{ fontSize:8, color:T.g2, letterSpacing:1 }}>{t('today_violations')}</div>
                  </div>
                </div>
              );
            })}
          </div>
          {violLog.length > 5 && (
            <button onClick={() => setShowAllViolations(s => !s)} style={{
              marginTop: 10, width:"100%", background:"transparent",
              border:`1px solid ${T.border}`, borderRadius:8,
              padding:"8px 0", color:T.g1, fontSize:12,
              fontWeight:700, cursor:"pointer",
              display:"flex", alignItems:"center", justifyContent:"center", gap:6
            }}>
              {showAllViolations
                ? "▲ Show Less"
                : `▼ View More (${violLog.length - 5} more violations)`
              }
            </button>
          )}
        </div>
      )}

      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
    </div>
  );
}
