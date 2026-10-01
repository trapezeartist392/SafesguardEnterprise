/**
 * CameraSettingsPage.jsx
 * SafeguardIQ Enterprise — Manage cameras after onboarding
 * Place in: frontend/src/pages/settings/CameraSettingsPage.jsx
 * Route: /settings/cameras
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const T = {
  bg:"#05080F", card:"#0C1422", card2:"#101828",
  border:"#1A2540", orange:"#FF5B18", teal:"#00D4B4",
  white:"#EDF2FF", g1:"#8899BB", g2:"#3A4E72",
  green:"#22D468", red:"#FF3D3D", amber:"#FFB400",
};

const inp = (val, onChange, opts = {}) => (
  <input
    type={opts.type || "text"}
    value={val}
    onChange={e => onChange(e.target.value)}
    placeholder={opts.placeholder || ""}
    style={{
      width:"100%", background:"#06090F",
      border:`1px solid ${T.border}`, borderRadius:8,
      padding:"10px 12px", color:T.white, fontSize:13,
      fontFamily: opts.mono ? "'DM Mono',monospace" : "'Nunito',sans-serif",
      outline:"none", ...opts.style,
    }}
  />
);

const sel = (val, onChange, opts) => (
  <select value={val} onChange={e => onChange(e.target.value)}
    style={{ width:"100%", background:"#06090F",
      border:`1px solid ${T.border}`, borderRadius:8,
      padding:"10px 12px", color:T.white, fontSize:13,
      fontFamily:"'Nunito',sans-serif", outline:"none", cursor:"pointer" }}>
    {opts.map(o => <option key={o}>{o}</option>)}
  </select>
);

const Field = ({ label, hint, children }) => (
  <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
    <label style={{ fontSize:10, color:T.g1, letterSpacing:1.5,
      fontWeight:700, fontFamily:"'DM Mono',monospace" }}>
      {label}{hint && <span style={{ color:T.g2, fontWeight:400,
        marginLeft:6, textTransform:"none", letterSpacing:0 }}>— {hint}</span>}
    </label>
    {children}
  </div>
);

const PROTOCOLS = ["RTSP","ONVIF","HTTP MJPEG"];
const PPE_RULES = [
  { k:"detectHelmet", l:"Hard Hat",      icon:"⛑️" },
  { k:"detectVest",   l:"Safety Vest",   icon:"🦺" },
  { k:"detectBoots",  l:"Safety Boots",  icon:"👢" },
  { k:"detectEye",    l:"Eye Protection",icon:"🥽" },
  { k:"detectGloves", l:"Gloves",        icon:"🧤" },
  { k:"detectMask",   l:"Face Mask",     icon:"😷" },
];

function emptyCamera(areaId = "", areaName = "") {
  return {
    _new: true,
    areaId, areaName,
    camId:"", location:"", protocol:"RTSP",
    rtspUrl:"", ipAddress:"", port:"554",
    username:"admin", password:"",
    detectHelmet:true, detectVest:true, detectBoots:false,
    detectEye:false, detectGloves:false, detectMask:false,
  };
}

export default function CameraSettingsPage() {
  const navigate  = useNavigate();
  const token     = localStorage.getItem("safeg_token") || "";
  const headers   = { Authorization: `Bearer ${token}` };
  const camLimit  = parseInt(localStorage.getItem("safeg_cam_limit") || "16");

  const [cameras,   setCameras]   = useState([]);
  const [areas,     setAreas]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState({});   // { camId: true/false }
  const [deleting,  setDeleting]  = useState({});
  const [toast,     setToast]     = useState(null);
  const [testResult,setTestResult]= useState({});   // { camId: "ok"|"fail"|"testing" }

  // ── Toast helper ──
  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Load cameras + areas ──
  useEffect(() => {
    const load = async () => {
      try {
        const [camRes, areaRes] = await Promise.all([
          axios.get("/api/v1/cameras",  { headers }),
          axios.get("/api/v1/areas",    { headers }),
        ]);
        setCameras(camRes.data?.data || []);
        setAreas(areaRes.data?.data   || []);
      } catch {
        showToast("Failed to load cameras", "error");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ── Add blank camera row ──
  const addCamera = (areaId = "", areaName = "") => {
    if (cameras.length >= camLimit) {
      showToast(`Camera limit reached (${camLimit}). Upgrade your plan.`, "error");
      return;
    }
    setCameras(p => [...p, { ...emptyCamera(areaId, areaName), _tempId: Date.now() }]);
  };

  // ── Update field in camera row ──
  const upd = (idx, k, v) => {
    setCameras(p => {
      const c = [...p];
      c[idx] = { ...c[idx], [k]: v };
      // Auto-build RTSP URL if IP changes and no manual URL set
      if (k === "ipAddress" && !c[idx].rtspUrl) {
        const ip   = v;
        const port = c[idx].port || "554";
        const user = c[idx].username || "admin";
        const pass = c[idx].password ? `:${c[idx].password}` : "";
        c[idx].rtspUrl = `rtsp://${user}${pass}@${ip}:${port}/stream1`;
      }
      return c;
    });
  };

  // ── Build PPE types array for API ──
  const buildPpeTypes = (cam) => {
    const types = [];
    if (cam.detectHelmet)  types.push("Helmet");
    if (cam.detectVest)    types.push("Safety Vest");
    if (cam.detectBoots)   types.push("Safety Boots");
    if (cam.detectEye)     types.push("Goggles");
    if (cam.detectGloves)  types.push("Gloves");
    if (cam.detectMask)    types.push("Face Mask");
    return types.length ? types : ["Helmet", "Safety Vest"];
  };

  // ── Save camera (create or update) ──
  const saveCamera = async (idx) => {
    const cam = cameras[idx];
    if (!cam.camId) { showToast("Enter a Camera ID / Label", "error"); return; }
    if (!cam.ipAddress && !cam.rtspUrl) {
      showToast("Enter IP address or RTSP URL", "error"); return;
    }

    const key = cam.id || cam._tempId;
    setSaving(p => ({ ...p, [key]: true }));

    try {
      const rtspUrl = cam.rtspUrl ||
        `rtsp://${cam.username||"admin"}${cam.password?":"+cam.password:""}@${cam.ipAddress}:${cam.port||554}/stream1`;

      const payload = {
        camId:          cam.camId,
        camLabel:       cam.camId,
        ipAddress:      cam.ipAddress,
        port:           parseInt(cam.port) || 554,
        streamProtocol: cam.protocol || "RTSP",
        rtspUrl,
        username:       cam.username,
        password:       cam.password,
        locationDesc:   cam.location,
        areaId:         cam.areaId || null,
        ppeTypes:       buildPpeTypes(cam),
      };

      if (cam.id) {
        // Update existing
        await axios.put(`/api/v1/cameras/${cam.id}`, payload, { headers });
        showToast(`${cam.camId} updated ✓`, "success");
      } else {
        // Create new
        const res = await axios.post("/api/v1/cameras", payload, { headers });
        const newId = res.data?.data?.id;
        setCameras(p => {
          const c = [...p];
          c[idx] = { ...c[idx], id: newId, _new: false, _tempId: undefined };
          return c;
        });
        showToast(`${cam.camId} added ✓`, "success");
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Save failed", "error");
    } finally {
      setSaving(p => ({ ...p, [key]: false }));
    }
  };

  // ── Delete camera ──
  const deleteCamera = async (idx) => {
    const cam = cameras[idx];
    if (!cam.id) {
      setCameras(p => p.filter((_, i) => i !== idx));
      return;
    }
    if (!window.confirm(`Delete ${cam.camId || "this camera"}? This cannot be undone.`)) return;
    setDeleting(p => ({ ...p, [cam.id]: true }));
    try {
      await axios.delete(`/api/v1/cameras/${cam.id}`, { headers });
      setCameras(p => p.filter((_, i) => i !== idx));
      showToast(`${cam.camId} deleted`, "success");
    } catch {
      showToast("Delete failed", "error");
    } finally {
      setDeleting(p => ({ ...p, [cam.id]: false }));
    }
  };

  // ── Test RTSP connection ──
  const testConnection = async (idx) => {
    const cam = cameras[idx];
    const key = cam.id || cam._tempId;
    setTestResult(p => ({ ...p, [key]: "testing" }));
    try {
      const rtspUrl = cam.rtspUrl ||
        `rtsp://${cam.username||"admin"}${cam.password?":"+cam.password:""}@${cam.ipAddress}:${cam.port||554}/stream1`;
      // Use AI stream/start to test — if it connects, camera is reachable
      await axios.post("/api/v1/ai/stream/start", {
        cameraId: cam.camId || "test-cam",
        rtspUrl,
        ppeTypes: ["Helmet"],
        confidence: 0.5,
      }, { headers });
      // Stop it immediately after test
      await axios.post("/api/v1/ai/stream/stop", {
        cameraId: cam.camId || "test-cam",
      }, { headers });
      setTestResult(p => ({ ...p, [key]: "ok" }));
    } catch {
      setTestResult(p => ({ ...p, [key]: "fail" }));
    }
    setTimeout(() => setTestResult(p => ({ ...p, [key]: null })), 5000);
  };

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
      height:"60vh", color:T.g2, fontFamily:"'Nunito',sans-serif" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ width:40, height:40, border:`3px solid ${T.border}`,
          borderTopColor:T.orange, borderRadius:"50%",
          animation:"spin .8s linear infinite", margin:"0 auto 12px" }}/>
        Loading cameras…
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily:"'Nunito',sans-serif", padding:"24px",
      maxWidth:900, margin:"0 auto" }}>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Toast */}
      {toast && (
        <div style={{ position:"fixed", top:20, right:20, zIndex:9999,
          background:T.card, border:`1px solid ${toast.type==="error"?T.red:toast.type==="warning"?T.amber:T.green}44`,
          borderRadius:10, padding:"12px 20px", fontSize:13, color:T.white,
          boxShadow:"0 8px 30px rgba(0,0,0,.5)", minWidth:260 }}>
          {toast.type==="error"?"🔴":toast.type==="warning"?"⚠️":"✅"} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display:"flex", alignItems:"flex-start",
        justifyContent:"space-between", marginBottom:28 }}>
        <div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:34,
            color:T.white, letterSpacing:3, marginBottom:4 }}>
            CAMERA MANAGEMENT
          </div>
          <div style={{ fontSize:13, color:T.g2 }}>
            Add and configure cameras for AI safety monitoring.
            After adding, run the <strong style={{ color:T.teal }}>SafeguardIQ Enterprise Agent</strong> on
            your factory PC to connect cameras to the AI.
          </div>
        </div>
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          <div style={{ background:T.card2, border:`1px solid ${T.border}`,
            borderRadius:10, padding:"8px 16px", textAlign:"center" }}>
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:22,
              color:T.orange }}>
              {cameras.length}<span style={{ fontSize:14, color:T.g2 }}>/{camLimit}</span>
            </div>
            <div style={{ fontSize:10, color:T.g2, letterSpacing:1 }}>CAMERAS</div>
          </div>
          <button onClick={() => addCamera()}
            disabled={cameras.length >= camLimit}
            style={{ padding:"10px 20px", borderRadius:10,
              background:cameras.length>=camLimit?T.g2:`linear-gradient(135deg,${T.orange},#FF8C52)`,
              border:"none", color:"#fff", fontSize:13, fontWeight:700,
              cursor:cameras.length>=camLimit?"not-allowed":"pointer",
              fontFamily:"'Nunito',sans-serif" }}>
            + Add Camera
          </button>
        </div>
      </div>

      {/* Agent download banner */}
      <div style={{ background:"rgba(0,212,180,.06)", border:"1px solid rgba(0,212,180,.2)",
        borderRadius:12, padding:"14px 18px", marginBottom:24,
        display:"flex", alignItems:"center", gap:14 }}>
        <div style={{ fontSize:24 }}>📥</div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:13, fontWeight:700, color:T.teal, marginBottom:2 }}>
            Connect your cameras using the SafeguardIQ Enterprise Agent
          </div>
          <div style={{ fontSize:12, color:T.g1 }}>
            After adding cameras here, download and run the agent on any Windows PC
            inside your factory. It connects to your cameras and sends frames to the AI.
          </div>
        </div>
        <a href="/safeguardsiq_agent.py" download
          style={{ padding:"9px 18px", borderRadius:8,
            background:"rgba(0,212,180,.12)", border:"1px solid rgba(0,212,180,.3)",
            color:T.teal, fontSize:12, fontWeight:700, textDecoration:"none",
            whiteSpace:"nowrap" }}>
          ⬇ Download Agent
        </a>
      </div>

      {/* No cameras state */}
      {cameras.length === 0 && (
        <div style={{ textAlign:"center", padding:"48px 24px",
          background:T.card, border:`2px dashed ${T.border}`,
          borderRadius:16, color:T.g2 }}>
          <div style={{ fontSize:48, marginBottom:12 }}>📹</div>
          <div style={{ fontSize:18, fontWeight:700, color:T.white,
            marginBottom:8 }}>No cameras yet</div>
          <div style={{ fontSize:13, marginBottom:20 }}>
            Add your first camera to start AI safety monitoring
          </div>
          <button onClick={() => addCamera()}
            style={{ padding:"12px 28px", borderRadius:10,
              background:`linear-gradient(135deg,${T.orange},#FF8C52)`,
              border:"none", color:"#fff", fontSize:14, fontWeight:700,
              cursor:"pointer", fontFamily:"'Nunito',sans-serif" }}>
            + Add First Camera
          </button>
        </div>
      )}

      {/* Group cameras by area */}
      {(() => {
        const grouped = {};
        cameras.forEach((cam, idx) => {
          const key = cam.area_id || cam.areaId || "unassigned";
          const name = cam.area_name || cam.areaName || "Unassigned Zone";
          if (!grouped[key]) grouped[key] = { name, cameras: [] };
          grouped[key].cameras.push({ cam, idx });
        });
        return Object.entries(grouped).map(([areaKey, group]) => (
          <div key={areaKey} style={{ marginBottom:24 }}>
            {/* Zone header */}
            <div style={{ display:"flex", alignItems:"center",
              justifyContent:"space-between", marginBottom:12,
              padding:"10px 14px",
              background:"rgba(255,91,24,.07)",
              border:"1px solid rgba(255,91,24,.2)", borderRadius:10 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ fontSize:16 }}>📍</span>
                <span style={{ fontWeight:700, color:T.orange,
                  fontSize:14 }}>{group.name}</span>
                <span style={{ fontSize:11, color:T.g2 }}>
                  {group.cameras.length} camera{group.cameras.length!==1?"s":""}
                </span>
              </div>
              <button onClick={() => {
                const area = areas.find(a => a.id === areaKey);
                addCamera(areaKey, group.name);
              }}
                style={{ padding:"5px 12px", borderRadius:7,
                  background:"rgba(0,212,180,.1)",
                  border:"1px solid rgba(0,212,180,.3)",
                  color:T.teal, fontSize:12, fontWeight:700,
                  cursor:"pointer", fontFamily:"'Nunito',sans-serif" }}>
                + Camera in {group.name}
              </button>
            </div>

            {/* Camera cards */}
            {group.cameras.map(({ cam, idx }) => {
              const key = cam.id || cam._tempId;
              const testR = testResult[key];
              return (
                <div key={key} style={{ background:T.card,
                  border:`1.5px solid ${cam._new||!cam.id?T.teal+"44":T.border}`,
                  borderRadius:12, marginBottom:10, overflow:"hidden" }}>

                  {/* Card header */}
                  <div style={{ background:T.card2, padding:"9px 14px",
                    display:"flex", alignItems:"center", gap:10,
                    borderBottom:`1px solid ${T.border}` }}>
                    <span style={{ fontSize:14 }}>📹</span>
                    <span style={{ flex:1, fontWeight:700, fontSize:13,
                      color:cam.camId||cam.cam_label?T.white:T.g2,
                      fontFamily:cam.camId||cam.cam_label?"'DM Mono',monospace":"'Nunito',sans-serif" }}>
                      {cam.cam_label || cam.camId || "New Camera"}
                    </span>
                    {/* Status dot */}
                    <div style={{ display:"flex", alignItems:"center", gap:5,
                      fontSize:11, color:cam.status==="online"?T.green:cam.status==="error"?T.red:T.g2 }}>
                      <div style={{ width:7, height:7, borderRadius:"50%",
                        background:cam.status==="online"?T.green:cam.status==="error"?T.red:T.g2 }}/>
                      {cam.status||"offline"}
                    </div>
                    <button onClick={() => deleteCamera(idx)}
                      disabled={deleting[cam.id]}
                      style={{ background:"transparent", border:"none",
                        color:T.red, cursor:"pointer", fontSize:13, padding:"2px 6px" }}>
                      {deleting[cam.id] ? "…" : "✕"}
                    </button>
                  </div>

                  <div style={{ padding:14 }}>
                    {/* Row 1 — ID + Location */}
                    <div style={{ display:"grid",
                      gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:12 }}>
                      <Field label="Camera ID / Label" hint="e.g. CAM-01">
                        {inp(cam.cam_label||cam.camId||"",
                          v => upd(idx, cam.cam_label!==undefined?"cam_label":"camId", v),
                          { placeholder:"CAM-01", mono:true })}
                      </Field>
                      <Field label="Location Description">
                        {inp(cam.location_desc||cam.location||"",
                          v => upd(idx, cam.location_desc!==undefined?"location_desc":"location", v),
                          { placeholder:"North wall, Bay 3, 4m height" })}
                      </Field>
                    </div>

                    {/* Row 2 — Network */}
                    <div style={{ background:T.card2, borderRadius:10,
                      padding:12, marginBottom:12 }}>
                      <div style={{ fontSize:11, fontWeight:700, color:T.teal,
                        textTransform:"uppercase", letterSpacing:2,
                        marginBottom:10, fontFamily:"'DM Mono',monospace" }}>
                        Network / Stream
                      </div>
                      <div style={{ display:"grid",
                        gridTemplateColumns:"1fr 1fr 1fr 1fr",
                        gap:10, marginBottom:10 }}>
                        <Field label="IP Address">
                          {inp(cam.ip_address||cam.ipAddress||"",
                            v => upd(idx, cam.ip_address!==undefined?"ip_address":"ipAddress", v),
                            { placeholder:"192.168.1.101", mono:true })}
                        </Field>
                        <Field label="Port">
                          {inp(String(cam.port||"554"),
                            v => upd(idx, "port", v),
                            { placeholder:"554", mono:true })}
                        </Field>
                        <Field label="Protocol">
                          {sel(cam.stream_protocol||cam.protocol||"RTSP",
                            v => upd(idx, cam.stream_protocol!==undefined?"stream_protocol":"protocol", v),
                            PROTOCOLS)}
                        </Field>
                        <Field label="Username">
                          {inp(cam.username||"",
                            v => upd(idx, "username", v),
                            { placeholder:"admin", mono:true })}
                        </Field>
                      </div>
                      <div style={{ display:"grid",
                        gridTemplateColumns:"1fr 1fr", gap:10 }}>
                        <Field label="Password">
                          {inp(cam.password||"",
                            v => upd(idx, "password", v),
                            { type:"password", placeholder:"••••••••" })}
                        </Field>
                        <Field label="RTSP URL" hint="Auto-built from IP if blank">
                          {inp(cam.rtsp_url||cam.rtspUrl||"",
                            v => upd(idx, cam.rtsp_url!==undefined?"rtsp_url":"rtspUrl", v),
                            { placeholder:`rtsp://admin:pass@${cam.ip_address||cam.ipAddress||"192.168.x.x"}:${cam.port||554}/stream1`,
                              mono:true, style:{ fontSize:11 } })}
                        </Field>
                      </div>
                    </div>

                    {/* Row 3 — PPE rules */}
                    <div style={{ marginBottom:14 }}>
                      <div style={{ fontSize:10, color:T.g1, letterSpacing:1.5,
                        fontWeight:700, fontFamily:"'DM Mono',monospace",
                        marginBottom:8 }}>PPE DETECTION RULES</div>
                      <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
                        {PPE_RULES.map(rule => {
                          const on = cam[rule.k] ?? false;
                          return (
                            <button key={rule.k} onClick={() => upd(idx, rule.k, !on)}
                              style={{ padding:"6px 14px", borderRadius:20,
                                border:`1px solid ${on?T.orange:T.border}`,
                                background:on?`rgba(255,91,24,.15)`:"transparent",
                                color:on?T.orange:T.g2, fontSize:12,
                                fontWeight:700, cursor:"pointer",
                                fontFamily:"'Nunito',sans-serif" }}>
                              {rule.icon} {on?"✓ ":""}{rule.l}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                      <button onClick={() => testConnection(idx)}
                        disabled={testR==="testing"}
                        style={{ padding:"8px 16px", borderRadius:8,
                          background:"rgba(0,212,180,.1)",
                          border:`1px solid rgba(0,212,180,.3)`,
                          color:testR==="ok"?T.green:testR==="fail"?T.red:T.teal,
                          fontSize:12, fontWeight:700, cursor:"pointer",
                          fontFamily:"'Nunito',sans-serif" }}>
                        {testR==="testing"?"⏳ Testing…":
                         testR==="ok"?"✅ Connected!":
                         testR==="fail"?"❌ Can't reach camera":
                         "🔌 Test Connection"}
                      </button>
                      <button onClick={() => saveCamera(idx)}
                        disabled={saving[key]}
                        style={{ flex:1, padding:"10px", borderRadius:8,
                          background:saving[key]?T.g2:`linear-gradient(135deg,${T.orange},#FF8C52)`,
                          border:"none", color:"#fff", fontSize:13,
                          fontWeight:700, cursor:saving[key]?"not-allowed":"pointer",
                          fontFamily:"'Nunito',sans-serif",
                          display:"flex", alignItems:"center",
                          justifyContent:"center", gap:8 }}>
                        {saving[key]
                          ? <><div style={{ width:14,height:14,
                              border:"2px solid rgba(255,255,255,.3)",
                              borderTopColor:"#fff",borderRadius:"50%",
                              animation:"spin .8s linear infinite" }}/>Saving…</>
                          : cam.id ? "💾 Save Changes" : "✅ Add Camera"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ));
      })()}

      {/* Add camera button at bottom */}
      {cameras.length > 0 && cameras.length < camLimit && (
        <button onClick={() => addCamera()}
          style={{ width:"100%", padding:"14px",
            background:"transparent",
            border:`2px dashed ${T.border}`, borderRadius:12,
            color:T.g2, fontSize:13, fontWeight:700,
            cursor:"pointer", fontFamily:"'Nunito',sans-serif",
            marginTop:8 }}>
          + Add Another Camera ({cameras.length}/{camLimit} used)
        </button>
      )}
    </div>
  );
}
