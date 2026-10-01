/**
 * ShiftComplianceReport.jsx
 * SafeguardIQ Enterprise — Shift-wise Compliance Report
 * Shows General / Morning / Night shift breakdown
 * Place in: frontend/src/components/ShiftComplianceReport.jsx
 */
import { useState, useEffect } from 'react';
import axios from 'axios';

const T = {
  bg:"#05080F", card:"#0C1422", card2:"#101828",
  border:"#1A2540", orange:"#FF5B18", teal:"#00D4B4",
  white:"#EDF2FF", g1:"#8899BB", g2:"#3A4E72",
  green:"#22D468", red:"#FF3D3D", amber:"#FFB400", blue:"#2D8EFF",
};

// Indian factory shift timings
const SHIFTS = [
  { id:"general", label:"General Shift",  icon:"☀️",  start:8,  end:17, color:"#FFB400" },
  { id:"morning", label:"Morning Shift",  icon:"🌅",  start:6,  end:14, color:"#00D4B4" },
  { id:"evening", label:"Evening Shift",  icon:"🌆",  start:14, end:22, color:"#FF5B18" },
  { id:"night",   label:"Night Shift",    icon:"🌙",  start:22, end:6,  color:"#2D8EFF" },
];

function getShiftForHour(hour) {
  if (hour >= 8  && hour < 17) return "general";
  if (hour >= 6  && hour < 14) return "morning";
  if (hour >= 14 && hour < 22) return "evening";
  return "night";
}

function ShiftCard({ shift, data, isActive }) {
  const viols      = data?.violations || 0;
  const compliance = data?.compliance || 100;
  const color      = compliance >= 90 ? T.green : compliance >= 75 ? T.amber : T.red;

  return (
    <div style={{ background:T.card2, border:`1px solid ${isActive ? shift.color : T.border}`,
      borderRadius:12, padding:16,
      borderTop:`3px solid ${isActive ? shift.color : T.border}` }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
        <span style={{ fontSize:20 }}>{shift.icon}</span>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:13, fontWeight:800, color:T.white }}>{shift.label}</div>
          <div style={{ fontSize:10, color:T.g1 }}>
            {String(shift.start).padStart(2,'0')}:00 — {String(shift.end).padStart(2,'0')}:00
            {isActive && <span style={{ color:shift.color, marginLeft:6, fontWeight:700 }}>● ACTIVE</span>}
          </div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize:22, fontWeight:800, color,
            fontFamily:"'Bebas Neue',sans-serif" }}>{compliance}%</div>
          <div style={{ fontSize:9, color:T.g2 }}>COMPLIANCE</div>
        </div>
      </div>

      {/* Mini bar */}
      <div style={{ height:6, background:T.border, borderRadius:3,
        overflow:"hidden", marginBottom:10 }}>
        <div style={{ height:"100%", width:`${compliance}%`,
          background:color, borderRadius:3 }}/>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6 }}>
        {[
          { label:"Violations", val:viols,                   color:viols>0?T.red:T.green },
          { label:"PPE",        val:data?.ppe||0,            color:(data?.ppe||0)>0?T.red:T.g2 },
          { label:"Unsafe Acts",val:data?.unsafe||0,         color:(data?.unsafe||0)>0?T.amber:T.g2 },
        ].map(({ label, val, color: c }) => (
          <div key={label} style={{ textAlign:"center", padding:"6px 4px",
            background:T.card, borderRadius:6, border:`1px solid ${T.border}` }}>
            <div style={{ fontSize:16, fontWeight:800, color:c,
              fontFamily:"'Bebas Neue',sans-serif" }}>{val}</div>
            <div style={{ fontSize:8, color:T.g2, letterSpacing:0.5 }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ShiftComplianceReport() {
  const [shiftData, setShiftData] = useState({});
  const [loading,   setLoading]   = useState(true);
  const [date,      setDate]      = useState(new Date().toISOString().split('T')[0]);
  const [expanded,  setExpanded]  = useState(true);

  const token       = localStorage.getItem('safeg_token') || '';
  const currentHour = new Date().getHours();
  const activeShift = getShiftForHour(currentHour);

  const fetchShiftData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        `/api/v1/violations/archive?dateFrom=${date}&dateTo=${date}&limit=1000`,
        { headers: { Authorization: `Bearer ${token}` }}
      );
      const viols = res.data.data?.violations || [];

      // Group violations by shift based on occurred_at hour
      const byShift = { general:{violations:0,ppe:0,unsafe:0,pathway:0},
                        morning:{violations:0,ppe:0,unsafe:0,pathway:0},
                        evening:{violations:0,ppe:0,unsafe:0,pathway:0},
                        night:  {violations:0,ppe:0,unsafe:0,pathway:0} };

      viols.forEach(v => {
        const hour  = new Date(v.detected_at || v.occurred_at).getHours();
        const shift = getShiftForHour(hour);
        byShift[shift].violations++;
        if (v.category === 'ppe'     || !v.category) byShift[shift].ppe++;
        if (v.category === 'unsafe')                 byShift[shift].unsafe++;
        if (v.category === 'pathway')                byShift[shift].pathway++;
      });

      // Calculate compliance per shift
      Object.keys(byShift).forEach(shift => {
        const v = byShift[shift].violations;
        byShift[shift].compliance = v === 0 ? 100 : Math.max(0, Math.round(100 - (v / Math.max(v*3,20)) * 100));
      });

      setShiftData(byShift);
    } catch(e) {
      setShiftData({});
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchShiftData(); }, [date]);

  // Find worst and best shift
  const shiftEntries = Object.entries(shiftData);
  const worstShift = shiftEntries.sort((a,b) => a[1].compliance - b[1].compliance)[0];
  const bestShift  = shiftEntries.sort((a,b) => b[1].compliance - a[1].compliance)[0];

  return (
    <div style={{ fontFamily:"'Nunito',sans-serif", marginBottom:16 }}>
      <div style={{ background:T.card, border:`1px solid ${T.border}`,
        borderRadius:16, overflow:"hidden" }}>

        {/* Header */}
        <div style={{ background:T.bg, padding:"16px 20px",
          borderBottom:`1px solid ${T.border}`,
          display:"flex", alignItems:"center", gap:12, cursor:"pointer" }}
          onClick={() => setExpanded(e => !e)}>
          <span style={{ fontSize:20 }}>🕐</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14, fontWeight:800, color:T.white }}>
              Shift-wise Compliance Report
            </div>
            <div style={{ fontSize:11, color:T.g1 }}>
              General · Morning · Evening · Night shift breakdown
            </div>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <input type="date" value={date}
              max={new Date().toISOString().split('T')[0]}
              onChange={e => setDate(e.target.value)}
              onClick={e => e.stopPropagation()}
              style={{ background:T.card2, border:`1px solid ${T.border}`,
                borderRadius:8, padding:"5px 10px", color:T.white,
                fontSize:11, fontFamily:"'Nunito'", outline:"none" }}/>
            <span style={{ color:T.g1, fontSize:14 }}>{expanded?"▲":"▼"}</span>
          </div>
        </div>

        {expanded && (
          <div style={{ padding:16 }}>
            {loading ? (
              <div style={{ textAlign:"center", padding:"30px 0", color:T.g1 }}>
                <div style={{ width:28, height:28, border:`2px solid ${T.border}`,
                  borderTopColor:T.orange, borderRadius:"50%",
                  animation:"spin .8s linear infinite", margin:"0 auto 10px" }}/>
                Loading shift data...
              </div>
            ) : (
              <>
                {/* Summary badges */}
                {shiftEntries.length > 0 && (
                  <div style={{ display:"flex", gap:10, marginBottom:16 }}>
                    {worstShift && (
                      <div style={{ flex:1, padding:"10px 14px",
                        background:`${T.red}10`, border:`1px solid ${T.red}25`,
                        borderRadius:10 }}>
                        <div style={{ fontSize:9, color:T.g2, marginBottom:2 }}>⚠ WORST PERFORMING SHIFT</div>
                        <div style={{ fontSize:12, fontWeight:800, color:T.red }}>
                          {SHIFTS.find(s=>s.id===worstShift[0])?.label} — {worstShift[1].compliance}% compliance
                        </div>
                      </div>
                    )}
                    {bestShift && (
                      <div style={{ flex:1, padding:"10px 14px",
                        background:`${T.green}10`, border:`1px solid ${T.green}25`,
                        borderRadius:10 }}>
                        <div style={{ fontSize:9, color:T.g2, marginBottom:2 }}>✅ BEST PERFORMING SHIFT</div>
                        <div style={{ fontSize:12, fontWeight:800, color:T.green }}>
                          {SHIFTS.find(s=>s.id===bestShift[0])?.label} — {bestShift[1].compliance}% compliance
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Shift cards */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  {SHIFTS.map(shift => (
                    <ShiftCard
                      key={shift.id}
                      shift={shift}
                      data={shiftData[shift.id]}
                      isActive={shift.id === activeShift}
                    />
                  ))}
                </div>

                {/* Hourly trend */}
                <div style={{ marginTop:14, padding:"12px 14px",
                  background:T.card2, border:`1px solid ${T.border}`,
                  borderRadius:10 }}>
                  <div style={{ fontSize:10, color:T.g2, fontWeight:700,
                    letterSpacing:1.5, marginBottom:8 }}>
                    SHIFT TIMING REFERENCE — INDIAN FACTORIES
                  </div>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                    {SHIFTS.map(s => (
                      <div key={s.id} style={{ display:"flex", alignItems:"center", gap:6,
                        padding:"4px 10px", borderRadius:6,
                        background:`${s.color}15`, border:`1px solid ${s.color}30` }}>
                        <span>{s.icon}</span>
                        <span style={{ fontSize:10, color:s.color, fontWeight:700 }}>
                          {s.label}: {String(s.start).padStart(2,'0')}:00 – {String(s.end).padStart(2,'0')}:00
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
