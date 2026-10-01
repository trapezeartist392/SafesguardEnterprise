/**
 * PPEComplianceBar.jsx
 * SafeguardIQ Enterprise — PPE Compliance % Dashboard Widget
 * Shows real-time compliance rate at top of dashboard
 * Place in: frontend/src/components/PPEComplianceBar.jsx
 */
import { useState, useEffect } from 'react';
import axios from 'axios';

const T = {
  bg:"#05080F", card:"#0C1422", card2:"#101828",
  border:"#1A2540", orange:"#FF5B18", teal:"#00D4B4",
  white:"#EDF2FF", g1:"#8899BB", g2:"#3A4E72",
  green:"#22D468", red:"#FF3D3D", amber:"#FFB400", blue:"#2D8EFF",
};

function ComplianceGauge({ pct, size = 80 }) {
  const radius    = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset    = circumference - (pct / 100) * circumference;
  const color     = pct >= 90 ? T.green : pct >= 75 ? T.amber : T.red;

  return (
    <svg width={size} height={size} style={{ transform:"rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={radius}
        fill="none" stroke={T.border} strokeWidth={8}/>
      <circle cx={size/2} cy={size/2} r={radius}
        fill="none" stroke={color} strokeWidth={8}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition:"stroke-dashoffset 1s ease" }}/>
      <text x={size/2} y={size/2} textAnchor="middle"
        dominantBaseline="middle"
        style={{ transform:"rotate(90deg)", transformOrigin:`${size/2}px ${size/2}px`,
          fill:color, fontSize:size*0.22, fontWeight:800,
          fontFamily:"'Bebas Neue',sans-serif" }}>
        {pct}%
      </text>
    </svg>
  );
}

export default function PPEComplianceBar() {
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const token = localStorage.getItem('safeg_token') || '';

  const fetchCompliance = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      // Read from AIMonitorPanel streams via status endpoint
      const AI_URL = '/api/v1/ai';

      // Try AI service first (local mode)
      let totalViols = 0, ppeViols = 0, pathwayViols = 0,
          unsafeViols = 0, accidentViols = 0, nearmissViols = 0;
      const ppeByType = {};

    try {
      const r = await fetch(`${AI_URL}/stream/status`);
      const d = await r.json();
      const streams = Object.values(d.streams || {});
      streams.forEach(s => {
        totalViols    += s.violations_today    || 0;
        ppeViols      += s.ppe_violations      || 0;
        pathwayViols  += s.pathway_violations  || 0;
        unsafeViols   += s.unsafe_violations   || 0;
        accidentViols += s.accident_violations || 0;
        nearmissViols += s.nearmiss_violations || 0;
      });
    } catch {}

    // Also try DB archive for production
    try {
      const today = new Date().toISOString().split('T')[0];
      const res   = await axios.get(
        `/api/v1/violations/archive?dateFrom=${today}&dateTo=${today}&limit=1000`,
        { headers: { Authorization: `Bearer ${token}` }}
      );
      const viols = res.data.data?.violations || [];
      if (viols.length > totalViols) {
        totalViols    = viols.length;
        ppeViols      = viols.filter(v => v.category === 'ppe' || !v.category).length;
        pathwayViols  = viols.filter(v => v.category === 'pathway').length;
        unsafeViols   = viols.filter(v => v.category === 'unsafe').length;
        accidentViols = viols.filter(v => v.category === 'accident').length;
        nearmissViols = viols.filter(v => v.category === 'nearmiss').length;
        viols.forEach(v => {
          const type = v.violation_type || 'Unknown';
          ppeByType[type] = (ppeByType[type] || 0) + 1;
        });
      }
    } catch {}

    const frames     = Math.max(totalViols * 3, 50);
    const compliance = totalViols === 0 ? 100
      : Math.max(0, Math.min(99, Math.round(100 - (totalViols / frames) * 100)));

    setData({
      compliance_rate:    compliance,
      total_violations:   totalViols,
      ppe_violations:     ppeViols,
      pathway_violations: pathwayViols,
      unsafe_violations:  unsafeViols,
      accident_violations:accidentViols,
      nearmiss_violations:nearmissViols,
      ppe_by_type:        ppeByType,
    });
    } catch(e) {
    setData({ compliance_rate:100, total_violations:0,
      ppe_violations:0, pathway_violations:0, unsafe_violations:0,
      accident_violations:0, nearmiss_violations:0, ppe_by_type:{} });
    } finally { setLoading(false); setRefreshing(false); }
  };
  useEffect(() => {
    fetchCompliance();
    const interval = setInterval(fetchCompliance, 15000); // refresh every minute
    return () => clearInterval(interval);
  }, []);

  if (loading) return null;
  if (!data)   return null;

  const compColor = data.compliance_rate >= 90 ? T.green
    : data.compliance_rate >= 75 ? T.amber : T.red;
  const compLabel = data.compliance_rate >= 90 ? "COMPLIANT"
    : data.compliance_rate >= 75 ? "NEEDS ATTENTION" : "NON-COMPLIANT";

  return (
    <div style={{ background:T.card, border:`1px solid ${T.border}`,
      borderRadius:16, padding:20, marginBottom:16,
      borderTop:`3px solid ${compColor}` }}>

      <div style={{ display:"flex", alignItems:"center", gap:20 }}>

        {/* Gauge */}
        <div style={{ flexShrink:0 }}>
          <ComplianceGauge pct={data.compliance_rate} size={90}/>
        </div>

        {/* Main stats */}
        <div style={{ flex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
            <div style={{ fontSize:16, fontWeight:800, color:T.white }}>
              PPE Compliance Rate — Today
            </div>
            <div style={{ fontSize:10, fontWeight:700, color:compColor,
              background:`${compColor}20`, border:`1px solid ${compColor}30`,
              padding:"2px 10px", borderRadius:6 }}>
              {compLabel}
            </div>
            <button onClick={() => fetchCompliance(true)} style={{
              marginLeft:"auto", background:"none",
              border:`1px solid ${T.border}`, borderRadius:6,
              padding:"3px 10px", color:T.g1, fontSize:10,
              fontWeight:700, cursor:"pointer" }}>{refreshing ? "⟳ ..." : "↻ Refresh"}</button>
          </div>

          {/* Progress bar */}
          <div style={{ height:10, background:T.border, borderRadius:5,
            overflow:"hidden", marginBottom:12 }}>
            <div style={{ height:"100%", width:`${data.compliance_rate}%`,
              background:`linear-gradient(90deg,${compColor},${compColor}88)`,
              borderRadius:5, transition:"width 1s ease" }}/>
          </div>

          {/* Category breakdown */}
          <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
            {[
              { label:"PPE",      val:data.ppe_violations,      color:T.red,    icon:"\u26D1\uFE0F" },
              { label:"Pathway",  val:data.pathway_violations,  color:"#00BCD4", icon:"\uD83D\uDEA7" },
              { label:"Unsafe",   val:data.unsafe_violations,   color:T.amber,  icon:"\u26A0\uFE0F" },
              { label:"Accident", val:data.accident_violations, color:"#FF0000", icon:"\uD83D\uDEA8" },
              { label:"Near Miss",val:data.nearmiss_violations, color:"#FF6B00", icon:"\u25CF" },
            ].map(({ label, val, color, icon }) => (
              <div key={label} style={{ display:"flex", alignItems:"center", gap:6,
                background:`${color}10`, border:`1px solid ${color}25`,
                borderRadius:8, padding:"4px 10px" }}>
                <span style={{ fontSize:12 }}>{icon}</span>
                <span style={{ fontSize:11, fontWeight:800, color }}>{val}</span>
                <span style={{ fontSize:9, color:T.g1 }}>{label}</span>
              </div>
            ))}
            <div style={{ marginLeft:"auto", fontSize:11, color:T.g2, alignSelf:"center" }}>
              Total: <span style={{ color:T.red, fontWeight:800 }}>{data.total_violations}</span> violations today
            </div>
          </div>
        </div>
      </div>

      {/* PPE type breakdown */}
      {Object.keys(data.ppe_by_type).length > 0 && (
        <div style={{ marginTop:14, paddingTop:14,
          borderTop:`1px solid ${T.border}` }}>
          <div style={{ fontSize:10, color:T.g2, fontWeight:700,
            letterSpacing:1.5, marginBottom:10 }}>PPE VIOLATION BREAKDOWN</div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {Object.entries(data.ppe_by_type)
              .sort((a,b) => b[1]-a[1])
              .slice(0,8)
              .map(([type, count]) => (
                <div key={type} style={{ display:"flex", alignItems:"center", gap:6,
                  background:T.card2, border:`1px solid ${T.border}`,
                  borderRadius:8, padding:"5px 12px" }}>
                  <span style={{ fontSize:12, fontWeight:800, color:T.red }}>{count}</span>
                  <span style={{ fontSize:11, color:T.g1 }}>{type}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
