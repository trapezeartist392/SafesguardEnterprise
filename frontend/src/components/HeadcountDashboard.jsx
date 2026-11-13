import { useState, useEffect, useRef, useCallback } from 'react';

const T = {
  bg:'#0C0D10', panel:'#141619', card:'#1A1D22', border:'#2B3138',
  orange:'#FF5C1A', green:'#2FB674', red:'#E5484D', blue:'#3B82F6',
  amber:'#FFB800', teal:'#00D4B8', white:'#F0F1F3', muted:'#9AA0A8', dim:'#6A7080',
};

const hdr = () => ({ Authorization: `Bearer ${localStorage.getItem('safeg_token')}` });

// ── Audio alert (browser beep — real audio speaker on edge device fires from backend) ──
function useAudioAlert(emergency, evacuated) {
  const ref = useRef(null);
  useEffect(() => {
    if (!emergency) { ref.current?.pause(); return; }
    if (evacuated)  { ref.current?.pause(); return; }
    // Create oscillator beep if no ref
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    let interval;
    const beep = () => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.3, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      o.start(); o.stop(ctx.currentTime + 0.4);
    };
    beep();
    interval = setInterval(beep, 3000);
    return () => { clearInterval(interval); ctx.close(); };
  }, [emergency, evacuated]);
}

export default function HeadcountDashboard() {
  const [plants,    setPlants]   = useState([]);
  const [selected,  setSelected] = useState(null);   // plant state object
  const [log,       setLog]      = useState([]);
  const [loading,   setLoading]  = useState(true);
  const [declaring, setDeclaring]= useState(false);
  const wsRef = useRef(null);

  const plant = plants.find(p => p.plant_id === selected) || plants[0];
  const evacuated = plant && plant.emergency_mode &&
    plant.assembly_count >= plant.current_count && plant.current_count > 0;

  useAudioAlert(plant?.emergency_mode, evacuated);

  const fetchLive = useCallback(async () => {
    try {
      const r = await fetch('/api/v1/headcount/live', { headers: hdr() });
      const d = await r.json();
      if (d.success) {
        setPlants(d.data);
        if (!selected && d.data[0]) setSelected(d.data[0].plant_id);
      }
    } catch {} finally { setLoading(false); }
  }, [selected]);

  const fetchLog = useCallback(async () => {
    if (!plant) return;
    try {
      const r = await fetch(`/api/v1/headcount/shift-log?plant_id=${plant.plant_id}&hours=12`, { headers: hdr() });
      const d = await r.json();
      if (d.success) setLog(d.data);
    } catch {}
  }, [plant]);

  useEffect(() => { fetchLive(); fetchLog(); }, []);
  useEffect(() => { fetchLog(); }, [plant?.plant_id]);

  // WebSocket live updates
  useEffect(() => {
    const token = localStorage.getItem('safeg_token');
    const ws = new WebSocket(`ws://${window.location.host}/ws?token=${token}`);
    wsRef.current = ws;
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'headcount_update') {
          setPlants(prev => prev.map(p =>
            p.plant_id === msg.data.plant_id ? { ...p, ...msg.data } : p
          ));
          fetchLog();
        }
      } catch {}
    };
    return () => ws.close();
  }, []);

  async function declareEmergency() {
    if (!plant) return;
    setDeclaring(true);
    await fetch('/api/v1/headcount/emergency', {
      method:'POST', headers:{...hdr(),'Content-Type':'application/json'},
      body: JSON.stringify({ plant_id: plant.plant_id, action: 'declare' })
    });
    await fetchLive();
    setDeclaring(false);
  }

  async function allClear() {
    if (!plant) return;
    await fetch('/api/v1/headcount/emergency', {
      method:'POST', headers:{...hdr(),'Content-Type':'application/json'},
      body: JSON.stringify({ plant_id: plant.plant_id, action: 'all_clear' })
    });
    await fetchLive();
  }

  if (loading) return (
    <div style={{ padding:60, textAlign:'center', color:T.muted }}>Loading headcount data…</div>
  );

  const emergencyBg = plant?.emergency_mode
    ? (evacuated ? 'rgba(47,182,116,.06)' : 'rgba(229,72,77,.06)')
    : 'transparent';
  const emergencyBorder = plant?.emergency_mode
    ? (evacuated ? T.green : T.red)
    : 'transparent';

  return (
    <div style={{ animation:'slideIn .3s ease' }}>
      <style>{`
        @keyframes emergencyPulse{0%,100%{box-shadow:0 0 0 0 rgba(229,72,77,0)}
          50%{box-shadow:0 0 0 12px rgba(229,72,77,.15)}}
        @keyframes slideIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
      `}</style>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start',
        marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <h2 style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:34, fontWeight:800,
            letterSpacing:3, color:T.white, margin:0 }}>HEADCOUNT & MUSTER</h2>
          <div style={{ fontSize:12, color:T.muted, marginTop:4, letterSpacing:1 }}>
            Real-time people counting · entry/exit cameras · emergency evacuation tracking
          </div>
        </div>
        {plants.length > 1 && (
          <select value={selected || ''} onChange={e => setSelected(e.target.value)}
            style={{ padding:'7px 12px', background:T.panel, border:`1px solid ${T.border}`,
              borderRadius:7, color:T.white, fontSize:12 }}>
            {plants.map(p => <option key={p.plant_id} value={p.plant_id}>{p.plant_name}</option>)}
          </select>
        )}
      </div>

      {!plant ? (
        <div style={{ padding:'40px', textAlign:'center', color:T.dim,
          border:`1px dashed ${T.border}`, borderRadius:10 }}>
          No headcount data yet. Assign entry/exit cameras and start the edge agent.
        </div>
      ) : (
        <>
          {/* Emergency banner */}
          {plant.emergency_mode && (
            <div style={{ marginBottom:20, padding:'16px 20px',
              background: evacuated ? 'rgba(47,182,116,.12)' : 'rgba(229,72,77,.12)',
              border:`1px solid ${evacuated ? T.green : T.red}`,
              borderRadius:10, display:'flex', alignItems:'center',
              justifyContent:'space-between', flexWrap:'wrap', gap:12,
              animation: evacuated ? 'none' : 'emergencyPulse 2s infinite' }}>
              <div>
                <div style={{ fontSize:18, fontWeight:800, color: evacuated ? T.green : T.red,
                  fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:2 }}>
                  {evacuated ? '✅ EVACUATION COMPLETE — ALL ACCOUNTED FOR' : '🚨 EMERGENCY EVACUATION IN PROGRESS'}
                </div>
                <div style={{ fontSize:12, color:T.muted, marginTop:4 }}>
                  {evacuated
                    ? `${plant.current_count} of ${plant.current_count} accounted at assembly point`
                    : `${plant.assembly_count} of ${plant.current_count} accounted at assembly point · Audio warning active`}
                </div>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                {evacuated && (
                  <button onClick={allClear} style={{ padding:'8px 18px', background:T.green,
                    color:'#000', border:'none', borderRadius:7, fontWeight:700, cursor:'pointer' }}>
                    ✅ Confirm All Clear
                  </button>
                )}
                {!evacuated && (
                  <button onClick={allClear} style={{ padding:'8px 18px', background:'transparent',
                    color:T.muted, border:`1px solid ${T.border}`, borderRadius:7, cursor:'pointer' }}>
                    Cancel Emergency
                  </button>
                )}
              </div>
            </div>
          )}

          {/* KPI tiles */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',
            gap:12, marginBottom:20 }}>
            <BigTile label="INSIDE NOW" value={plant.current_count}
              color={plant.current_count > 0 ? T.white : T.dim}
              sub={plant.last_event_at ? `Last event ${timeSince(plant.last_event_at)}` : 'No events yet'} />
            <BigTile label="PEAK TODAY" value={plant.peak_count} color={T.amber} />
            {plant.emergency_mode && (
              <BigTile label="AT ASSEMBLY" value={plant.assembly_count}
                color={evacuated ? T.green : T.red}
                sub={evacuated ? 'Fully evacuated' : `${plant.current_count - plant.assembly_count} unaccounted`} />
            )}
            <BigTile label="LAST EVENT"
              value={plant.last_direction ? (plant.last_direction === 'in' ? '↑ IN' : plant.last_direction === 'out' ? '↓ OUT' : '🏁 ASM') : '—'}
              color={plant.last_direction === 'in' ? T.green : plant.last_direction === 'out' ? T.amber : T.blue}
              sub={plant.last_event_at ? new Date(plant.last_event_at).toLocaleTimeString('en-IN') : ''} />
          </div>

          {/* Action buttons */}
          <div style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap' }}>
            {!plant.emergency_mode && (
              <button onClick={declareEmergency} disabled={declaring}
                style={{ padding:'10px 22px', background:'rgba(229,72,77,.15)',
                  color:T.red, border:`1px solid rgba(229,72,77,.4)`,
                  borderRadius:8, fontWeight:700, fontSize:13, cursor:'pointer' }}>
                🚨 Declare Emergency
              </button>
            )}
            <ManualAdjust plantId={plant.plant_id} onDone={fetchLive} />
          </div>

          {/* Shift log */}
          <div style={{ background:T.panel, border:`1px solid ${T.border}`, borderRadius:10 }}>
            <div style={{ padding:'14px 18px', borderBottom:`1px solid ${T.border}`,
              fontSize:11, color:T.muted, letterSpacing:1, textTransform:'uppercase' }}>
              Shift Event Log (last 12 hours)
            </div>
            {log.length === 0 ? (
              <div style={{ padding:'30px', textAlign:'center', color:T.dim }}>
                No events recorded yet. Waiting for camera crossings…
              </div>
            ) : (
              <div style={{ maxHeight:400, overflowY:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                  <thead>
                    <tr style={{ color:T.dim, fontSize:10, letterSpacing:1, textTransform:'uppercase' }}>
                      <th style={th}>Time</th>
                      <th style={th}>Camera</th>
                      <th style={th}>Role</th>
                      <th style={th}>Direction</th>
                      <th style={th}>Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {log.map((row, i) => (
                      <tr key={i} style={{ borderTop:`1px solid ${T.border}` }}>
                        <td style={td}>{new Date(row.occurred_at).toLocaleTimeString('en-IN')}</td>
                        <td style={td}>{row.cam_label || '—'}</td>
                        <td style={td}>
                          <span style={{ fontSize:10, padding:'2px 8px', borderRadius:999,
                            background: roleColor(row.camera_role).bg,
                            color: roleColor(row.camera_role).text }}>
                            {row.camera_role || 'entry'}
                          </span>
                        </td>
                        <td style={td}>
                          <span style={{ color: row.direction === 'in' ? T.green : row.direction === 'assembly_in' ? T.blue : T.amber }}>
                            {row.direction === 'in' ? '↑ IN' : row.direction === 'out' ? '↓ OUT' : '🏁 ASSEMBLY IN'}
                          </span>
                        </td>
                        <td style={td}>{row.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Escalation contacts */}
          {plant.escalation?.length > 0 && (
            <div style={{ marginTop:16, background:T.panel, border:`1px solid ${T.border}`,
              borderRadius:10, padding:'14px 18px' }}>
              <div style={{ fontSize:10, color:T.dim, letterSpacing:1,
                textTransform:'uppercase', marginBottom:10 }}>Escalation Chain</div>
              <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
                {plant.escalation.map(e => (
                  <div key={e.id} style={{ background:T.card, border:`1px solid ${T.border}`,
                    borderRadius:8, padding:'10px 14px', minWidth:160 }}>
                    <div style={{ fontSize:10, color:T.dim, marginBottom:2 }}>Level {e.level}</div>
                    <div style={{ fontSize:13, fontWeight:700, color:T.white }}>{e.name}</div>
                    <div style={{ fontSize:11, color:T.muted }}>{e.role}</div>
                    {e.phone && <div style={{ fontSize:11, color:T.teal, marginTop:4 }}>📞 {e.phone}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Manual adjust modal ───────────────────────────────────────────────────────
function ManualAdjust({ plantId, onDone }) {
  const [open, setOpen] = useState(false);
  const [val,  setVal]  = useState('');
  async function save() {
    await fetch('/api/v1/headcount/manual-adjust', {
      method:'POST', headers:{...hdr(),'Content-Type':'application/json'},
      body: JSON.stringify({ plant_id: plantId, count: parseInt(val) || 0 })
    });
    setOpen(false); setVal(''); onDone();
  }
  return <>
    <button onClick={() => setOpen(true)} style={{ padding:'10px 18px',
      background:'transparent', color:T.muted, border:`1px solid ${T.border}`,
      borderRadius:8, fontSize:13, cursor:'pointer' }}>
      ✏️ Set Count Manually
    </button>
    {open && (
      <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)',
        display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999 }}>
        <div style={{ background:T.panel, border:`1px solid ${T.border}`, borderRadius:12,
          padding:28, minWidth:300 }}>
          <div style={{ fontSize:14, fontWeight:700, color:T.white, marginBottom:16 }}>
            Set Headcount Manually
          </div>
          <div style={{ fontSize:12, color:T.muted, marginBottom:12 }}>
            Use this to seed the count at shift start or correct a drift.
          </div>
          <input type="number" min="0" value={val} onChange={e => setVal(e.target.value)}
            placeholder="Enter current headcount"
            style={{ width:'100%', padding:'8px 12px', background:T.bg,
              border:`1px solid ${T.border}`, borderRadius:7, color:T.white,
              fontSize:13, marginBottom:16 }} />
          <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
            <button onClick={() => setOpen(false)} style={{ padding:'8px 16px',
              background:'transparent', color:T.muted, border:`1px solid ${T.border}`,
              borderRadius:7, cursor:'pointer' }}>Cancel</button>
            <button onClick={save} style={{ padding:'8px 16px', background:T.orange,
              color:'#fff', border:'none', borderRadius:7, fontWeight:700, cursor:'pointer' }}>
              Save
            </button>
          </div>
        </div>
      </div>
    )}
  </>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function BigTile({ label, value, color, sub }) {
  return (
    <div style={{ background:T.panel, border:`1px solid ${T.border}`, borderRadius:10,
      padding:'18px 20px' }}>
      <div style={{ fontSize:10, color:T.dim, letterSpacing:1,
        textTransform:'uppercase', marginBottom:6 }}>{label}</div>
      <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:52,
        fontWeight:800, color, lineHeight:1 }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:T.muted, marginTop:6 }}>{sub}</div>}
    </div>
  );
}

function timeSince(iso) {
  const s = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (s < 60)  return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  return `${Math.floor(s/3600)}h ago`;
}

function roleColor(role) {
  const map = {
    entry:    { bg:'rgba(47,182,116,.12)',  text:'#2FB674' },
    exit:     { bg:'rgba(245,166,35,.12)',  text:'#F5A623' },
    assembly: { bg:'rgba(59,130,246,.12)',  text:'#3B82F6' },
    ppe:      { bg:'rgba(107,114,128,.12)', text:'#9AA0A8' },
  };
  return map[role] || map.ppe;
}

const th = { padding:'8px 12px', textAlign:'left', color:'#6A7080', fontWeight:600 };
const td = { padding:'10px 12px', color:'#9AA0A8' };
