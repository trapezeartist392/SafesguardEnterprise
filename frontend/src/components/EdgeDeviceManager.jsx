import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const T = {
  bg:'#0C0D10', panel:'#141619', card:'#1A1D22', border:'#2B3138',
  amber:'#F5A623', amberDim:'rgba(245,166,35,0.12)',
  green:'#2FB674', greenDim:'rgba(47,182,116,0.12)',
  red:'#E5484D', redDim:'rgba(229,72,77,0.12)',
  blue:'#3B82F6',
  white:'#F0F1F3', muted:'#9AA0A8', dim:'#6A7080',
};

const auth = () => ({ Authorization: `Bearer ${localStorage.getItem('safeg_token')}` });

function ago(iso) {
  if (!iso) return 'never';
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 10) return 'just now';
  if (s < 60) return `${Math.floor(s)}s ago`;
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

const camStatusColor = s =>
  s === 'online' ? T.green : s === 'error' ? T.red : T.dim;

export default function EdgeDeviceManager({ toast = () => {} }) {
  const [devices, setDevices]   = useState([]);
  const [cameras, setCameras]   = useState([]);
  const [areas, setAreas]       = useState([]);
  const [plants, setPlants]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState(null);

  const [showDeviceForm, setShowDeviceForm] = useState(false);
  const [camFormFor, setCamFormFor]         = useState(null); // device id
  const [editCam, setEditCam]               = useState(null);
  const [newKey, setNewKey]                 = useState(null); // { device_code, api_key }
  const [tick, setTick]                     = useState(0);

  const load = useCallback(async () => {
    try {
      const [d, c, a, p] = await Promise.all([
        axios.get('/api/v1/devices',  { headers: auth() }),
        axios.get('/api/v1/cameras',  { headers: auth() }),
        axios.get('/api/v1/areas',    { headers: auth() }),
        axios.get('/api/v1/plants',   { headers: auth() }),
      ]);
      setDevices(d.data?.data?.devices || []);
      setCameras(c.data?.data || []);
      setAreas(a.data?.data || []);
      setPlants(p.data?.data || []);
    } catch (e) {
      toast('Could not load devices', 'error');
    } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  // refresh thumbnails + status every 10s
  useEffect(() => {
    const i = setInterval(() => { load(); setTick(t => t + 1); }, 10000);
    return () => clearInterval(i);
  }, [load]);

  const camsOf = id => cameras.filter(c => c.edge_device_id === id);

  // ── actions ───────────────────────────────────────────────
  async function addDevice(form) {
    try {
      const r = await axios.post('/api/v1/devices', form, { headers: auth() });
      setNewKey({ device_code: r.data.data.device.device_code, api_key: r.data.data.api_key });
      setShowDeviceForm(false);
      toast('Edge device registered', 'success');
      load();
    } catch (e) {
      toast(e.response?.data?.message || 'Failed to register device', 'error');
    }
  }

  async function addCamera(form) {
    try {
      await axios.post('/api/v1/cameras', form, { headers: auth() });
      setCamFormFor(null);
      toast('Camera attached', 'success');
      load();
    } catch (e) {
      toast(e.response?.data?.message || 'Failed to add camera', 'error');
    }
  }

  async function saveCamera(id, form) {
    try {
      await axios.put(`/api/v1/cameras/${id}`, form, { headers: auth() });
      setEditCam(null);
      toast('Camera updated', 'success');
      load();
    } catch (e) {
      toast(e.response?.data?.message || 'Failed to update camera', 'error');
    }
  }

  async function removeCamera(id, label) {
    if (!window.confirm(`Remove camera "${label}"? Past violations are kept.`)) return;
    try {
      await axios.delete(`/api/v1/cameras/${id}`, { headers: auth() });
      toast('Camera removed', 'success');
      load();
    } catch { toast('Failed to remove camera', 'error'); }
  }

  async function removeDevice(id, code) {
    if (!window.confirm(`Delete edge device "${code}" and all its cameras?`)) return;
    try {
      await axios.delete(`/api/v1/devices/${id}`, { headers: auth() });
      toast('Device deleted', 'success');
      load();
    } catch { toast('Failed to delete device', 'error'); }
  }

  async function rotateKey(id) {
    if (!window.confirm('Issue a new API key? The edge agent must be updated with the new key.')) return;
    try {
      const r = await axios.post(`/api/v1/devices/${id}/rotate-key`, {}, { headers: auth() });
      setNewKey(r.data.data);
    } catch { toast('Failed to rotate key', 'error'); }
  }

  async function testCamera(id) {
    try {
      const r = await axios.post(`/api/v1/cameras/${id}/test-connection`, {}, { headers: auth() });
      const d = r.data.data;
      toast(d.message, d.status === 'ok' ? 'success' : 'warning');
    } catch { toast('Test failed', 'error'); }
  }

  if (loading) {
    return <div style={{ padding: 40, color: T.muted, textAlign: 'center' }}>Loading edge devices…</div>;
  }

  const totalCams   = cameras.length;
  const onlineCams  = cameras.filter(c => c.stream_status === 'online').length;
  const onlineDevs  = devices.filter(d => d.status === 'online').length;

  return (
    <div style={{ animation: 'slideIn .3s ease' }}>
      {/* ── header ── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <h2 style={{ fontSize:22, fontWeight:800, color:T.white, margin:0 }}>Edge Devices &amp; Cameras</h2>
          <p style={{ fontSize:13, color:T.muted, margin:'4px 0 0' }}>
            Each edge device runs detection for up to 16 cameras. Assign every device and camera to a plant and zone.
          </p>
        </div>
        <button onClick={() => setShowDeviceForm(true)} style={btnPrimary}>+ Register Edge Device</button>
      </div>

      {/* ── summary ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:12, marginBottom:20 }}>
        <Stat label="Edge Devices" value={devices.length} sub={`${onlineDevs} online`} color={T.amber}/>
        <Stat label="Cameras"      value={totalCams}      sub={`${onlineCams} streaming`} color={T.green}/>
        <Stat label="Capacity"     value={devices.reduce((s,d)=>s+(d.max_cameras||16),0)} sub="camera slots" color={T.blue}/>
        <Stat label="Violations Today" value={devices.reduce((s,d)=>s+(d.violations_today||0),0)} sub="all devices" color={T.red}/>
      </div>

      {/* ── api key modal ── */}
      {newKey && (
        <Modal onClose={() => setNewKey(null)} title="Device API Key — shown once">
          <p style={{ fontSize:13, color:T.muted, marginBottom:14 }}>
            Put this key in the edge agent's <code style={code}>edge_config.json</code> as <code style={code}>device_key</code>.
            It cannot be shown again.
          </p>
          <div style={{ background:T.bg, border:`1px solid ${T.border}`, borderRadius:8, padding:14, marginBottom:8 }}>
            <div style={{ fontSize:11, color:T.dim, marginBottom:4 }}>DEVICE</div>
            <div style={{ fontFamily:'monospace', fontSize:14, color:T.white, marginBottom:12 }}>{newKey.device_code}</div>
            <div style={{ fontSize:11, color:T.dim, marginBottom:4 }}>API KEY</div>
            <div style={{ fontFamily:'monospace', fontSize:13, color:T.amber, wordBreak:'break-all' }}>{newKey.api_key}</div>
          </div>
          <button onClick={() => { navigator.clipboard?.writeText(newKey.api_key); toast('Key copied','success'); }} style={btnGhost}>
            Copy key
          </button>
        </Modal>
      )}

      {/* ── device form ── */}
      {showDeviceForm && (
        <Modal onClose={() => setShowDeviceForm(false)} title="Register Edge Device">
          <DeviceForm areas={areas} plants={plants}
            onCancel={() => setShowDeviceForm(false)} onSave={addDevice}/>
        </Modal>
      )}

      {/* ── camera form ── */}
      {camFormFor && (
        <Modal onClose={() => setCamFormFor(null)} title="Attach Camera">
          <CameraForm
            deviceId={camFormFor}
            device={devices.find(d => d.id === camFormFor)}
            used={camsOf(camFormFor).length}
            areas={areas} plants={plants}
            onCancel={() => setCamFormFor(null)}
            onSave={addCamera}/>
        </Modal>
      )}

      {editCam && (
        <Modal onClose={() => setEditCam(null)} title={`Edit — ${editCam.cam_label}`}>
          <CameraForm
            deviceId={editCam.edge_device_id}
            device={devices.find(d => d.id === editCam.edge_device_id)}
            devices={devices}
            areas={areas} plants={plants}
            initial={editCam}
            onCancel={() => setEditCam(null)}
            onSave={f => saveCamera(editCam.id, f)}/>
        </Modal>
      )}

      {/* ── devices ── */}
      {devices.length === 0 ? (
        <Empty onAdd={() => setShowDeviceForm(true)}/>
      ) : devices.map(d => {
        const cams = camsOf(d.id);
        const cap  = d.max_cameras || 16;
        const open = expanded === d.id;
        return (
          <div key={d.id} style={{ background:T.panel, border:`1px solid ${T.border}`, borderRadius:10, marginBottom:14, overflow:'hidden' }}>
            {/* device header */}
            <div style={{ padding:'16px 18px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12, cursor:'pointer' }}
                 onClick={() => setExpanded(open ? null : d.id)}>
              <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                <div style={{ width:10, height:10, borderRadius:'50%',
                  background: d.status === 'online' ? T.green : T.dim,
                  boxShadow: d.status === 'online' ? `0 0 10px ${T.greenDim}` : 'none' }}/>
                <div>
                  <div style={{ fontSize:16, fontWeight:700, color:T.white, fontFamily:'monospace' }}>{d.device_code}</div>
                  <div style={{ fontSize:12, color:T.muted, marginTop:2 }}>
                    {d.plant_name || 'No plant'} · {d.area_name || d.zone_name || 'No zone'} · {d.device_type}
                    {d.location_note && ` · ${d.location_note}`}
                  </div>
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:18 }}>
                <Mini label="Cameras"   value={`${cams.length}/${cap}`} color={cams.length >= cap ? T.red : T.white}/>
                <Mini label="Streaming" value={cams.filter(c=>c.stream_status==='online').length} color={T.green}/>
                <Mini label="Today"     value={d.violations_today || 0} color={T.amber}/>
                <Mini label="Heartbeat" value={ago(d.last_heartbeat_at)} color={T.muted}/>
                <span style={{ color:T.dim, fontSize:16 }}>{open ? '▲' : '▼'}</span>
              </div>
            </div>

            {open && (
              <div style={{ borderTop:`1px solid ${T.border}`, padding:18 }}>
                {/* device actions */}
                <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
                  <button onClick={() => setCamFormFor(d.id)} disabled={cams.length >= cap}
                    style={{ ...btnPrimary, opacity: cams.length >= cap ? .4 : 1, cursor: cams.length >= cap ? 'not-allowed' : 'pointer' }}>
                    + Add Camera {cams.length >= cap && '(full)'}
                  </button>
                  <button onClick={() => rotateKey(d.id)} style={btnGhost}>Rotate API Key</button>
                  <button onClick={() => removeDevice(d.id, d.device_code)} style={btnDanger}>Delete Device</button>
                </div>

                {cams.length === 0 ? (
                  <div style={{ padding:'28px 16px', textAlign:'center', color:T.dim, fontSize:13,
                    border:`1px dashed ${T.border}`, borderRadius:8 }}>
                    No cameras attached yet. Click <strong style={{color:T.amber}}>+ Add Camera</strong> and paste the RTSP proxy URL.
                  </div>
                ) : (
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:14 }}>
                    {cams.map(c => (
                      <CameraCard key={c.id} cam={c} tick={tick}
                        onEdit={() => setEditCam(c)}
                        onDelete={() => removeCamera(c.id, c.cam_label)}
                        onTest={() => testCamera(c.id)}/>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      <style>{`
        @keyframes slideIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        @keyframes pulseDot { 0%{box-shadow:0 0 0 0 rgba(47,182,116,.5)} 70%{box-shadow:0 0 0 6px rgba(47,182,116,0)} 100%{box-shadow:0 0 0 0 rgba(47,182,116,0)} }
      `}</style>
    </div>
  );
}

// ── camera card with live thumbnail ───────────────────────────
function CameraCard({ cam, tick, onEdit, onDelete, onTest }) {
  const online = cam.stream_status === 'online';
  const thumb  = cam.last_frame_path ? `${cam.last_frame_path}?t=${tick}` : null;
  const lastViol = cam.last_violation_frame;

  return (
    <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:10, overflow:'hidden' }}>
      {/* live thumbnail */}
      <div style={{ position:'relative', height:150, background:'#000' }}>
        {thumb ? (
          <img src={thumb} alt={cam.cam_label}
            style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}
            onError={e => { e.target.style.display='none'; }}/>
        ) : (
          <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center',
            color:T.dim, fontSize:12, flexDirection:'column', gap:6 }}>
            <span style={{ fontSize:26 }}>📷</span>
            {online ? 'Waiting for frame…' : 'No signal'}
          </div>
        )}
        {/* status pill */}
        <div style={{ position:'absolute', top:8, left:8, display:'flex', alignItems:'center', gap:6,
          background:'rgba(0,0,0,.72)', borderRadius:999, padding:'3px 10px' }}>
          <span style={{ width:7, height:7, borderRadius:'50%', background:camStatusColor(cam.stream_status),
            animation: online ? 'pulseDot 2s infinite' : 'none' }}/>
          <span style={{ fontSize:10, fontFamily:'monospace', letterSpacing:1,
            color:camStatusColor(cam.stream_status) }}>
            {online ? 'LIVE' : (cam.stream_status || 'unknown').toUpperCase()}
          </span>
        </div>
        {!cam.enabled && (
          <div style={{ position:'absolute', top:8, right:8, background:T.redDim, color:T.red,
            fontSize:10, padding:'3px 8px', borderRadius:999 }}>DISABLED</div>
        )}
        {cam.violations_today > 0 && (
          <div style={{ position:'absolute', bottom:8, right:8, background:T.amber, color:'#000',
            fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:999 }}>
            {cam.violations_today} today
          </div>
        )}
      </div>

      {/* body */}
      <div style={{ padding:'12px 14px' }}>
        <div style={{ fontSize:14, fontWeight:700, color:T.white, marginBottom:3 }}>{cam.cam_label}</div>
        <div style={{ fontSize:11, color:T.muted, marginBottom:8 }}>
          {cam.plant_name || '—'} · {cam.area_name || 'No zone'}
        </div>
        <div style={{ fontSize:10, fontFamily:'monospace', color:T.dim, marginBottom:10,
          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={cam.rtsp_url}>
          {cam.rtsp_url}
        </div>

        {/* last violation */}
        <div style={{ borderTop:`1px solid ${T.border}`, paddingTop:9, marginBottom:10 }}>
          <div style={{ fontSize:10, color:T.dim, letterSpacing:1, marginBottom:5 }}>LAST VIOLATION</div>
          {cam.last_violation_at ? (
            <div style={{ display:'flex', gap:9, alignItems:'center' }}>
              {lastViol && (
                <img src={lastViol} alt="last" style={{ width:46, height:34, objectFit:'cover',
                  borderRadius:5, border:`1px solid ${T.border}`, flexShrink:0 }}
                  onError={e => { e.target.style.display='none'; }}/>
              )}
              <div style={{ minWidth:0 }}>
                <div style={{ fontSize:12, color:T.amber, fontWeight:600 }}>{cam.last_violation_type}</div>
                <div style={{ fontSize:10, color:T.dim }}>{ago(cam.last_violation_at)}</div>
              </div>
            </div>
          ) : (
            <div style={{ fontSize:11, color:T.green }}>No violations recorded</div>
          )}
        </div>

        {cam.error_message && (
          <div style={{ fontSize:10, color:T.red, background:T.redDim, padding:'5px 8px',
            borderRadius:5, marginBottom:9 }}>{cam.error_message}</div>
        )}

        <div style={{ display:'flex', gap:6 }}>
          <button onClick={onTest}   style={{ ...btnTiny, flex:1 }}>Test</button>
          <button onClick={onEdit}   style={{ ...btnTiny, flex:1 }}>Edit</button>
          <button onClick={onDelete} style={{ ...btnTiny, color:T.red, borderColor:'rgba(229,72,77,.3)' }}>✕</button>
        </div>
      </div>
    </div>
  );
}

// ── forms ─────────────────────────────────────────────────────
function DeviceForm({ areas, plants, onCancel, onSave }) {
  const [f, setF] = useState({
    device_code:'', device_type:'jetson_nano', zone_name:'',
    plant_id:'', area_id:'', max_cameras:16, location_note:'',
  });
  const set = (k,v) => setF(p => ({ ...p, [k]:v }));
  const areasOfPlant = f.plant_id ? areas.filter(a => a.plant_id === f.plant_id) : areas;

  return (
    <div>
      <Field label="Device Code *" hint="A unique name for this edge computer, e.g. EDGE-PRESS-01">
        <input style={input} value={f.device_code} onChange={e=>set('device_code', e.target.value)} placeholder="EDGE-PRESS-01"/>
      </Field>
      <Row>
        <Field label="Hardware">
          <select style={input} value={f.device_type} onChange={e=>set('device_type', e.target.value)}>
            <option value="jetson_nano">Jetson Orin Nano</option>
            <option value="jetson_xavier">Jetson Xavier NX</option>
            <option value="industrial_pc">Industrial PC</option>
            <option value="raspberry_pi">Raspberry Pi 5</option>
          </select>
        </Field>
        <Field label="Camera Slots" hint="Max 16 per device">
          <input style={input} type="number" min={1} max={16} value={f.max_cameras}
            onChange={e=>set('max_cameras', Math.min(16, Math.max(1, +e.target.value||1)))}/>
        </Field>
      </Row>
      <Row>
        <Field label="Plant">
          <select style={input} value={f.plant_id} onChange={e=>{ set('plant_id', e.target.value); set('area_id',''); }}>
            <option value="">— Select plant —</option>
            {plants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label="Zone / Area">
          <select style={input} value={f.area_id} onChange={e=>set('area_id', e.target.value)}>
            <option value="">— Select zone —</option>
            {areasOfPlant.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </Field>
      </Row>
      <Field label="Zone Label" hint="Shown on violations if no zone is selected">
        <input style={input} value={f.zone_name} onChange={e=>set('zone_name', e.target.value)} placeholder="Press Shop Line 1"/>
      </Field>
      <Field label="Physical Location" hint="Where the box is mounted — helps maintenance">
        <input style={input} value={f.location_note} onChange={e=>set('location_note', e.target.value)} placeholder="Control room rack 2, shelf 3"/>
      </Field>
      <Actions onCancel={onCancel} onSave={() => f.device_code ? onSave(f) : null} saveLabel="Register Device"/>
    </div>
  );
}

function CameraForm({ deviceId, device, devices, used = 0, areas, plants, initial, onCancel, onSave }) {
  const [f, setF] = useState({
    edge_device_id: initial?.edge_device_id || deviceId,
    cam_label:   initial?.cam_label  || '',
    rtsp_url:    initial?.rtsp_url   || '',
    plant_id:    initial?.plant_id   || device?.plant_id || '',
    area_id:     initial?.area_id    || device?.area_id  || '',
    fps_target:  initial?.fps_target || 15,
    enabled:     initial?.enabled ?? true,
  });
  const set = (k,v) => setF(p => ({ ...p, [k]:v }));
  const areasOfPlant = f.plant_id ? areas.filter(a => a.plant_id === f.plant_id) : areas;
  const cap = device?.max_cameras || 16;

  return (
    <div>
      {!initial && (
        <div style={{ background:T.amberDim, border:`1px solid rgba(245,166,35,.2)`, borderRadius:7,
          padding:'9px 12px', fontSize:12, color:T.amber, marginBottom:14 }}>
          Slot {used + 1} of {cap} on {device?.device_code}
        </div>
      )}

      <Field label="Camera Name *" hint="Shown on violations and reports">
        <input style={input} value={f.cam_label} onChange={e=>set('cam_label', e.target.value)} placeholder="PRESS-CAM-01"/>
      </Field>

      <Field label="RTSP URL *" hint="Use your RTSP proxy URL — never the camera's own URL with its password">
        <input style={input} value={f.rtsp_url} onChange={e=>set('rtsp_url', e.target.value)}
          placeholder="rtsp://192.168.1.50:8554/press-cam01"/>
      </Field>

      <Row>
        <Field label="Plant">
          <select style={input} value={f.plant_id} onChange={e=>{ set('plant_id', e.target.value); set('area_id',''); }}>
            <option value="">— Select plant —</option>
            {plants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label="Zone / Area" hint="Violations from this camera roll up here">
          <select style={input} value={f.area_id} onChange={e=>set('area_id', e.target.value)}>
            <option value="">— Select zone —</option>
            {areasOfPlant.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </Field>
      </Row>

      <Row>
        <Field label="Target FPS" hint="10–15 keeps a Jetson comfortable with many cameras">
          <input style={input} type="number" min={1} max={30} value={f.fps_target}
            onChange={e=>set('fps_target', +e.target.value || 15)}/>
        </Field>
        {initial && devices && (
          <Field label="Edge Device" hint="Move this camera to another device">
            <select style={input} value={f.edge_device_id} onChange={e=>set('edge_device_id', e.target.value)}>
              {devices.map(d => <option key={d.id} value={d.id}>{d.device_code}</option>)}
            </select>
          </Field>
        )}
      </Row>

      {initial && (
        <label style={{ display:'flex', alignItems:'center', gap:9, fontSize:13, color:T.muted, margin:'4px 0 14px', cursor:'pointer' }}>
          <input type="checkbox" checked={f.enabled} onChange={e=>set('enabled', e.target.checked)}/>
          Camera enabled (the edge agent skips disabled cameras)
        </label>
      )}

      <Actions onCancel={onCancel}
        onSave={() => (f.cam_label && f.rtsp_url) ? onSave(f) : null}
        saveLabel={initial ? 'Save Changes' : 'Attach Camera'}/>
    </div>
  );
}

// ── small pieces ──────────────────────────────────────────────
const Stat = ({ label, value, sub, color }) => (
  <div style={{ background:T.panel, border:`1px solid ${T.border}`, borderRadius:9, padding:'14px 16px' }}>
    <div style={{ fontSize:10, color:T.dim, letterSpacing:1.5, textTransform:'uppercase' }}>{label}</div>
    <div style={{ fontSize:26, fontWeight:800, color, lineHeight:1.2, marginTop:4 }}>{value}</div>
    <div style={{ fontSize:11, color:T.muted }}>{sub}</div>
  </div>
);

const Mini = ({ label, value, color }) => (
  <div style={{ textAlign:'right' }}>
    <div style={{ fontSize:9, color:T.dim, letterSpacing:1, textTransform:'uppercase' }}>{label}</div>
    <div style={{ fontSize:14, fontWeight:700, color }}>{value}</div>
  </div>
);

const Field = ({ label, hint, children }) => (
  <div style={{ marginBottom:14 }}>
    <label style={{ display:'block', fontSize:11, color:T.muted, marginBottom:5, letterSpacing:.5, fontWeight:600 }}>{label}</label>
    {children}
    {hint && <div style={{ fontSize:10, color:T.dim, marginTop:4 }}>{hint}</div>}
  </div>
);

const Row = ({ children }) => (
  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>{children}</div>
);

const Actions = ({ onCancel, onSave, saveLabel }) => (
  <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:18 }}>
    <button onClick={onCancel} style={btnGhost}>Cancel</button>
    <button onClick={onSave}   style={btnPrimary}>{saveLabel}</button>
  </div>
);

function Modal({ title, children, onClose }) {
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,.75)',
      display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background:T.panel, border:`1px solid ${T.border}`,
        borderRadius:12, padding:24, width:'100%', maxWidth:560, maxHeight:'88vh', overflowY:'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
          <h3 style={{ fontSize:17, fontWeight:700, color:T.white, margin:0 }}>{title}</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', color:T.dim, fontSize:20, cursor:'pointer' }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const Empty = ({ onAdd }) => (
  <div style={{ background:T.panel, border:`1px dashed ${T.border}`, borderRadius:10, padding:'48px 24px', textAlign:'center' }}>
    <div style={{ fontSize:44, marginBottom:12 }}>🖥️</div>
    <div style={{ fontSize:17, fontWeight:700, color:T.white, marginBottom:7 }}>No edge devices yet</div>
    <div style={{ fontSize:13, color:T.muted, marginBottom:20, maxWidth:460, margin:'0 auto 20px' }}>
      An edge device is the computer on the factory floor that runs detection. Register one here, copy its API key
      into the edge agent, then attach up to 16 cameras to it.
    </div>
    <button onClick={onAdd} style={btnPrimary}>+ Register Edge Device</button>
  </div>
);

// ── styles ────────────────────────────────────────────────────
const input = {
  width:'100%', padding:'9px 12px', background:T.bg, border:`1px solid ${T.border}`,
  borderRadius:7, color:T.white, fontSize:13, outline:'none', fontFamily:'inherit',
};
const btnPrimary = {
  padding:'9px 18px', background:T.amber, color:'#000', border:'none',
  borderRadius:7, fontSize:13, fontWeight:700, cursor:'pointer',
};
const btnGhost = {
  padding:'9px 18px', background:'transparent', color:T.muted,
  border:`1px solid ${T.border}`, borderRadius:7, fontSize:13, cursor:'pointer',
};
const btnDanger = {
  padding:'9px 18px', background:'transparent', color:T.red,
  border:`1px solid rgba(229,72,77,.3)`, borderRadius:7, fontSize:13, cursor:'pointer',
};
const btnTiny = {
  padding:'6px 10px', background:'transparent', color:T.muted,
  border:`1px solid ${T.border}`, borderRadius:6, fontSize:11, cursor:'pointer',
};
const code = {
  background:T.bg, padding:'1px 5px', borderRadius:4, fontFamily:'monospace', fontSize:12, color:T.amber,
};
