/**
 * WorkerViolationHistory.jsx
 * SafeguardIQ Enterprise — Worker-wise Violation History
 * Tracks repeat offenders by camera zone / worker ID
 * Place in: frontend/src/components/WorkerViolationHistory.jsx
 */
import { useState, useEffect } from 'react';
import axios from 'axios';

const T = {
  bg:"#05080F", card:"#0C1422", card2:"#101828",
  border:"#1A2540", orange:"#FF5B18", teal:"#00D4B4",
  white:"#EDF2FF", g1:"#8899BB", g2:"#3A4E72",
  green:"#22D468", red:"#FF3D3D", amber:"#FFB400", blue:"#2D8EFF",
};

const PPE_ICONS = {
  "Helmet":"⛑️","Safety Vest":"🦺","Gloves":"🧤","Safety Boots":"👢",
  "Goggles":"🥽","Face Mask":"😷","Fire & Smoke":"🔥",
  "Chemical Hazard":"🧪","Machinery Safety":"⚙️","Vehicle Safety":"🚗",
};

const RISK_COLOR = { critical:"#FF0000", high:T.red, medium:T.amber, low:T.green };

function RiskBadge({ count }) {
  const color = count >= 10 ? "#FF0000" : count >= 5 ? T.red : count >= 3 ? T.amber : T.green;
  const label = count >= 10 ? "HIGH RISK" : count >= 5 ? "AT RISK" : count >= 3 ? "MONITOR" : "LOW";
  return (
    <div style={{ display:"flex", alignItems:"center", gap:4,
      background:`${color}15`, border:`1px solid ${color}30`,
      borderRadius:6, padding:"2px 8px" }}>
      <div style={{ width:6, height:6, borderRadius:"50%", background:color }}/>
      <span style={{ fontSize:9, fontWeight:800, color }}>{label}</span>
    </div>
  );
}

export default function WorkerViolationHistory() {
  const [workers,   setWorkers]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [selected,  setSelected]  = useState(null);
  const [workerDetail, setWorkerDetail] = useState(null);
  const [expanded,  setExpanded]  = useState(true);
  const [dateRange, setDateRange] = useState(30);
  const [search,    setSearch]    = useState('');

  const token = localStorage.getItem('safeg_token') || '';

  const fetchWorkers = async () => {
    setLoading(true);
    try {
      const from = new Date(Date.now() - dateRange * 86400000).toISOString().split('T')[0];
      const to   = new Date().toISOString().split('T')[0];

      const res = await axios.get(
        `/api/v1/violations/archive?dateFrom=${from}&dateTo=${to}&limit=1000`,
        { headers: { Authorization: `Bearer ${token}` }}
      );
      const viols = res.data.data?.violations || [];

      // Group by camera_id as proxy for work zone/worker
      const byCam = {};
      viols.forEach(v => {
        const key = v.camera_id || 'Unknown Zone';
        if (!byCam[key]) {
          byCam[key] = {
            zone:         key,
            total:        0,
            ppe:          0,
            unsafe:       0,
            critical:     0,
            violations:   [],
            lastViolation:null,
            mostCommon:   {},
          };
        }
        byCam[key].total++;
        if (v.category === 'ppe' || !v.category) byCam[key].ppe++;
        if (v.category === 'unsafe')             byCam[key].unsafe++;
        if (v.severity === 'critical' || v.severity === 'high') byCam[key].critical++;

        const type = v.violation_type || 'Unknown';
        byCam[key].mostCommon[type] = (byCam[key].mostCommon[type] || 0) + 1;

        if (!byCam[key].lastViolation ||
            new Date(v.detected_at) > new Date(byCam[key].lastViolation)) {
          byCam[key].lastViolation = v.detected_at;
        }
        if (byCam[key].violations.length < 10) {
          byCam[key].violations.push(v);
        }
      });

      // Sort by total violations desc
      const sorted = Object.values(byCam)
        .sort((a,b) => b.total - a.total);

      setWorkers(sorted);
    } catch(e) {
      setWorkers([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchWorkers(); }, [dateRange]);

  const filtered = workers.filter(w =>
    w.zone.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (worker) => {
    if (selected === worker.zone) {
      setSelected(null); setWorkerDetail(null);
    } else {
      setSelected(worker.zone);
      setWorkerDetail(worker);
    }
  };

  return (
    <div style={{ fontFamily:"'Nunito',sans-serif", marginBottom:16 }}>
      <div style={{ background:T.card, border:`1px solid ${T.border}`,
        borderRadius:16, overflow:"hidden" }}>

        {/* Header */}
        <div style={{ background:T.bg, padding:"16px 20px",
          borderBottom:`1px solid ${T.border}`,
          display:"flex", alignItems:"center", gap:12, cursor:"pointer" }}
          onClick={() => setExpanded(e => !e)}>
          <span style={{ fontSize:20 }}>👷</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14, fontWeight:800, color:T.white }}>
              Zone / Worker Violation History
            </div>
            <div style={{ fontSize:11, color:T.g1 }}>
              Track repeat violations by work zone — identify high-risk areas and workers
            </div>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            {workers.length > 0 && (
              <div style={{ fontSize:10, color:T.red, fontWeight:700,
                background:`${T.red}15`, border:`1px solid ${T.red}30`,
                padding:"3px 10px", borderRadius:6 }}>
                {workers.filter(w=>w.total>=5).length} HIGH RISK ZONES
              </div>
            )}
            <span style={{ color:T.g1, fontSize:14 }}>{expanded?"▲":"▼"}</span>
          </div>
        </div>

        {expanded && (
          <div style={{ padding:16 }}>

            {/* Controls */}
            <div style={{ display:"flex", gap:10, marginBottom:16 }}>
              <input
                placeholder="🔍 Search zone or camera..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ flex:1, background:T.card2, border:`1px solid ${T.border}`,
                  borderRadius:8, padding:"8px 12px", color:T.white,
                  fontSize:12, fontFamily:"'Nunito'", outline:"none" }}/>
              <div style={{ display:"flex", gap:6 }}>
                {[7, 14, 30].map(days => (
                  <button key={days} onClick={() => setDateRange(days)}
                    style={{ padding:"6px 14px", borderRadius:8, fontSize:11,
                      fontWeight:700, cursor:"pointer",
                      border:`1px solid ${dateRange===days?T.orange:T.border}`,
                      background:dateRange===days?`${T.orange}20`:"none",
                      color:dateRange===days?T.orange:T.g1 }}>
                    {days}d
                  </button>
                ))}
              </div>
              <button onClick={fetchWorkers} style={{
                background:"none", border:`1px solid ${T.border}`,
                borderRadius:8, padding:"6px 12px", color:T.g1,
                fontSize:11, cursor:"pointer" }}>↻</button>
            </div>

            {loading ? (
              <div style={{ textAlign:"center", padding:"30px 0", color:T.g1 }}>
                <div style={{ width:28, height:28, border:`2px solid ${T.border}`,
                  borderTopColor:T.orange, borderRadius:"50%",
                  animation:"spin .8s linear infinite", margin:"0 auto 10px" }}/>
                Analysing violation patterns...
              </div>
            ) : workers.length === 0 ? (
              <div style={{ textAlign:"center", padding:"40px 0", color:T.g2 }}>
                <div style={{ fontSize:32, marginBottom:8 }}>✅</div>
                <div style={{ fontSize:13, color:T.g1 }}>No violations in the last {dateRange} days</div>
              </div>
            ) : (
              <div style={{ display:"grid", gridTemplateColumns:selected?"1fr 1fr":"1fr", gap:12 }}>

                {/* Worker/Zone list */}
                <div>
                  {/* Column headers */}
                  <div style={{ display:"grid",
                    gridTemplateColumns:"1fr 60px 60px 60px 80px",
                    gap:8, padding:"6px 12px",
                    fontSize:9, color:T.g2, fontWeight:700, letterSpacing:1 }}>
                    <div>ZONE / CAMERA</div>
                    <div style={{ textAlign:"center" }}>TOTAL</div>
                    <div style={{ textAlign:"center" }}>PPE</div>
                    <div style={{ textAlign:"center" }}>UNSAFE</div>
                    <div style={{ textAlign:"center" }}>RISK</div>
                  </div>

                  <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                    {filtered.map((worker, i) => {
                      const isSelected = selected === worker.zone;
                      const riskColor  = worker.total >= 10 ? "#FF0000"
                        : worker.total >= 5 ? T.red
                        : worker.total >= 3 ? T.amber : T.green;

                      return (
                        <div key={worker.zone} onClick={() => handleSelect(worker)}
                          style={{ display:"grid",
                            gridTemplateColumns:"1fr 60px 60px 60px 80px",
                            gap:8, padding:"10px 12px", cursor:"pointer",
                            background:isSelected?`${T.orange}10`:i%2===0?T.card2:"transparent",
                            border:`1px solid ${isSelected?T.orange:T.border}`,
                            borderRadius:8, transition:"all .15s",
                            borderLeft:`3px solid ${riskColor}` }}>
                          <div>
                            <div style={{ fontSize:12, fontWeight:700, color:T.white,
                              overflow:"hidden", textOverflow:"ellipsis",
                              whiteSpace:"nowrap" }}>
                              📹 {worker.zone}
                            </div>
                            {worker.lastViolation && (
                              <div style={{ fontSize:9, color:T.g2, marginTop:2 }}>
                                Last: {new Date(worker.lastViolation).toLocaleDateString('en-IN')}
                              </div>
                            )}
                          </div>
                          <div style={{ textAlign:"center", fontSize:14, fontWeight:800,
                            color:riskColor, fontFamily:"'Bebas Neue'" }}>
                            {worker.total}
                          </div>
                          <div style={{ textAlign:"center", fontSize:13, color:T.red,
                            fontWeight:700 }}>{worker.ppe}</div>
                          <div style={{ textAlign:"center", fontSize:13, color:T.amber,
                            fontWeight:700 }}>{worker.unsafe}</div>
                          <div style={{ display:"flex", justifyContent:"center" }}>
                            <RiskBadge count={worker.total}/>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Zone detail */}
                {selected && workerDetail && (
                  <div style={{ background:T.card2, border:`1px solid ${T.border}`,
                    borderRadius:12, padding:16 }}>
                    <div style={{ fontSize:14, fontWeight:800, color:T.white, marginBottom:4 }}>
                      📹 {workerDetail.zone}
                    </div>
                    <div style={{ fontSize:11, color:T.g1, marginBottom:14 }}>
                      {workerDetail.total} violations in last {dateRange} days
                    </div>

                    {/* Stats */}
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr",
                      gap:8, marginBottom:14 }}>
                      {[
                        { label:"Total",    val:workerDetail.total,    color:T.red },
                        { label:"PPE",      val:workerDetail.ppe,      color:T.red },
                        { label:"Critical", val:workerDetail.critical, color:"#FF0000" },
                      ].map(({ label, val, color }) => (
                        <div key={label} style={{ textAlign:"center", padding:"10px 6px",
                          background:T.card, border:`1px solid ${T.border}`, borderRadius:8 }}>
                          <div style={{ fontSize:20, fontWeight:800, color,
                            fontFamily:"'Bebas Neue'" }}>{val}</div>
                          <div style={{ fontSize:9, color:T.g2 }}>{label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Most common violations */}
                    <div style={{ fontSize:10, color:T.g2, fontWeight:700,
                      letterSpacing:1.5, marginBottom:8 }}>MOST COMMON VIOLATIONS</div>
                    <div style={{ display:"flex", flexDirection:"column", gap:4, marginBottom:14 }}>
                      {Object.entries(workerDetail.mostCommon)
                        .sort((a,b) => b[1]-a[1])
                        .slice(0,5)
                        .map(([type, count]) => (
                          <div key={type} style={{ display:"flex", alignItems:"center",
                            gap:8, padding:"6px 10px",
                            background:T.card, border:`1px solid ${T.border}`,
                            borderRadius:8 }}>
                            <span style={{ fontSize:14 }}>{PPE_ICONS[type]||"⚠️"}</span>
                            <span style={{ flex:1, fontSize:11, color:T.white }}>{type}</span>
                            <span style={{ fontSize:13, fontWeight:800, color:T.red }}>{count}x</span>
                            <div style={{ width:60, height:4, background:T.border, borderRadius:2 }}>
                              <div style={{ height:"100%", borderRadius:2,
                                width:`${Math.min(100,(count/workerDetail.total)*100)}%`,
                                background:T.red }}/>
                            </div>
                          </div>
                        ))}
                    </div>

                    {/* Recent violations */}
                    <div style={{ fontSize:10, color:T.g2, fontWeight:700,
                      letterSpacing:1.5, marginBottom:8 }}>RECENT VIOLATIONS</div>
                    <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                      {workerDetail.violations.slice(0,5).map((v,i) => (
                        <div key={i} style={{ display:"flex", alignItems:"center",
                          gap:8, padding:"6px 10px",
                          background:`${T.red}08`, border:`1px solid ${T.red}20`,
                          borderRadius:6 }}>
                          <span style={{ fontSize:12 }}>{PPE_ICONS[v.violation_type]||"⚠️"}</span>
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:11, color:T.white, fontWeight:600 }}>
                              {v.violation_type}
                            </div>
                            <div style={{ fontSize:9, color:T.g2 }}>
                              {v.detected_at
                                ? new Date(v.detected_at).toLocaleString('en-IN',{
                                    day:'2-digit',month:'short',
                                    hour:'2-digit',minute:'2-digit',hour12:true})
                                : "—"}
                            </div>
                          </div>
                          <div style={{ fontSize:9, fontWeight:700,
                            color:RISK_COLOR[v.severity]||T.amber,
                            textTransform:"uppercase" }}>{v.severity}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
