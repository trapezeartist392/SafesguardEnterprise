/**
 * ViolationHeatmap.jsx
 * SafeguardIQ Enterprise — Violation Heatmap by Zone
 * Visual zone map showing violation intensity
 * Place in: frontend/src/components/ViolationHeatmap.jsx
 */
import { useState, useEffect } from 'react';
import axios from 'axios';

const T = {
  bg:"#05080F", card:"#0C1422", card2:"#101828",
  border:"#1A2540", orange:"#FF5B18", teal:"#00D4B4",
  white:"#EDF2FF", g1:"#8899BB", g2:"#3A4E72",
  green:"#22D468", red:"#FF3D3D", amber:"#FFB400", blue:"#2D8EFF",
};

// Heat colors from safe to critical
function getHeatColor(intensity) {
  if (intensity === 0)    return { bg:"#22D46815", border:"#22D46840", text:"#22D468", label:"SAFE" };
  if (intensity <= 2)     return { bg:"#FFB40015", border:"#FFB40040", text:"#FFB400", label:"LOW" };
  if (intensity <= 5)     return { bg:"#FF5B1815", border:"#FF5B1840", text:"#FF5B18", label:"MEDIUM" };
  if (intensity <= 10)    return { bg:"#FF3D3D15", border:"#FF3D3D40", text:"#FF3D3D", label:"HIGH" };
  return                         { bg:"#FF000020", border:"#FF000060", text:"#FF0000", label:"CRITICAL" };
}

function ZoneCell({ zone, violations, maxViols, onClick, isSelected }) {
  const intensity = violations;
  const heat      = getHeatColor(intensity);
  const heatPct   = maxViols > 0 ? (intensity / maxViols) : 0;

  return (
    <div onClick={() => onClick(zone)}
      style={{ padding:"16px 12px", borderRadius:10, cursor:"pointer",
        background: isSelected ? heat.bg : `${heat.bg}`,
        border:`2px solid ${isSelected ? heat.text : heat.border}`,
        position:"relative", overflow:"hidden",
        transition:"all .2s",
        boxShadow: intensity > 5 ? `0 0 20px ${heat.text}30` : "none" }}>

      {/* Heat bar background */}
      <div style={{ position:"absolute", bottom:0, left:0, right:0,
        height:`${heatPct*100}%`, background:`${heat.text}10`,
        transition:"height .5s" }}/>

      {/* Content */}
      <div style={{ position:"relative" }}>
        <div style={{ fontSize:11, fontWeight:800, color:T.white, marginBottom:6,
          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
          {zone}
        </div>
        <div style={{ fontSize:28, fontWeight:800, color:heat.text,
          fontFamily:"'Bebas Neue',sans-serif", lineHeight:1, marginBottom:4 }}>
          {violations}
        </div>
        <div style={{ fontSize:8, color:heat.text, fontWeight:700, letterSpacing:1 }}>
          {heat.label}
        </div>
      </div>
    </div>
  );
}

export default function ViolationHeatmap() {
  const [zoneData,  setZoneData]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [selected,  setSelected]  = useState(null);
  const [dateRange, setDateRange] = useState(7);
  const [expanded,  setExpanded]  = useState(true);
  const [view,      setView]      = useState('grid'); // grid | list

  const token = localStorage.getItem('safeg_token') || '';

  const fetchHeatmapData = async () => {
    setLoading(true);
    try {
      const from = new Date(Date.now() - dateRange * 86400000).toISOString().split('T')[0];
      const to   = new Date().toISOString().split('T')[0];

      const res = await axios.get(
        `/api/v1/violations/archive?dateFrom=${from}&dateTo=${to}&limit=1000`,
        { headers: { Authorization: `Bearer ${token}` }}
      );
      const viols = res.data.data?.violations || [];

      // Group by camera/zone
      const byZone = {};
      viols.forEach(v => {
        const zone = v.camera_id || 'Unknown Zone';
        if (!byZone[zone]) {
          byZone[zone] = {
            zone,
            total:     0,
            ppe:       0,
            unsafe:    0,
            pathway:   0,
            accident:  0,
            byType:    {},
            byDay:     {},
            recent:    [],
          };
        }
        byZone[zone].total++;
        if (v.category === 'ppe'     || !v.category) byZone[zone].ppe++;
        if (v.category === 'unsafe')                 byZone[zone].unsafe++;
        if (v.category === 'pathway')                byZone[zone].pathway++;
        if (v.category === 'accident')               byZone[zone].accident++;

        const type = v.violation_type || 'Unknown';
        byZone[zone].byType[type] = (byZone[zone].byType[type]||0) + 1;

        const day = (v.detected_at||'').split('T')[0] || to;
        byZone[zone].byDay[day] = (byZone[zone].byDay[day]||0) + 1;

        if (byZone[zone].recent.length < 5) byZone[zone].recent.push(v);
      });

      const sorted = Object.values(byZone).sort((a,b) => b.total - a.total);
      setZoneData(sorted);
    } catch(e) {
      setZoneData([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchHeatmapData(); }, [dateRange]);

  const maxViols  = Math.max(...zoneData.map(z => z.total), 1);
  const selZone   = zoneData.find(z => z.zone === selected);
  const totalAll  = zoneData.reduce((s,z) => s+z.total, 0);
  const hotZone   = zoneData[0];

  return (
    <div style={{ fontFamily:"'Nunito',sans-serif", marginBottom:16 }}>
      <div style={{ background:T.card, border:`1px solid ${T.border}`,
        borderRadius:16, overflow:"hidden" }}>

        {/* Header */}
        <div style={{ background:T.bg, padding:"16px 20px",
          borderBottom:`1px solid ${T.border}`,
          display:"flex", alignItems:"center", gap:12, cursor:"pointer" }}
          onClick={() => setExpanded(e => !e)}>
          <span style={{ fontSize:20 }}>🗺️</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14, fontWeight:800, color:T.white }}>
              Violation Heatmap by Zone
            </div>
            <div style={{ fontSize:11, color:T.g1 }}>
              Visual breakdown of violation intensity per camera zone
            </div>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            {hotZone && (
              <div style={{ fontSize:10, color:T.red, fontWeight:700,
                background:`${T.red}15`, border:`1px solid ${T.red}30`,
                padding:"3px 10px", borderRadius:6 }}>
                🔥 Hot: {hotZone.zone} ({hotZone.total})
              </div>
            )}
            <span style={{ color:T.g1, fontSize:14 }}>{expanded?"▲":"▼"}</span>
          </div>
        </div>

        {expanded && (
          <div style={{ padding:16 }}>

            {/* Controls */}
            <div style={{ display:"flex", gap:10, marginBottom:16, alignItems:"center" }}>
              <div style={{ flex:1, fontSize:12, color:T.g1 }}>
                {totalAll} total violations across {zoneData.length} zones in last {dateRange} days
              </div>
              <div style={{ display:"flex", gap:6 }}>
                {[7,14,30].map(d => (
                  <button key={d} onClick={() => setDateRange(d)} style={{
                    padding:"5px 12px", borderRadius:6, fontSize:10,
                    fontWeight:700, cursor:"pointer",
                    border:`1px solid ${dateRange===d?T.orange:T.border}`,
                    background:dateRange===d?`${T.orange}20`:"none",
                    color:dateRange===d?T.orange:T.g1 }}>
                    {d}d
                  </button>
                ))}
              </div>
              <div style={{ display:"flex", gap:4 }}>
                {['grid','list'].map(v => (
                  <button key={v} onClick={() => setView(v)} style={{
                    padding:"5px 10px", borderRadius:6, fontSize:10,
                    fontWeight:700, cursor:"pointer",
                    border:`1px solid ${view===v?T.teal:T.border}`,
                    background:view===v?`${T.teal}20`:"none",
                    color:view===v?T.teal:T.g1 }}>
                    {v==='grid'?'⊞':'☰'}
                  </button>
                ))}
              </div>
              <button onClick={fetchHeatmapData} style={{
                background:"none", border:`1px solid ${T.border}`,
                borderRadius:6, padding:"5px 10px", color:T.g1,
                fontSize:10, cursor:"pointer" }}>↻</button>
            </div>

            {/* Heat legend */}
            <div style={{ display:"flex", gap:6, marginBottom:14, flexWrap:"wrap" }}>
              <span style={{ fontSize:9, color:T.g2, alignSelf:"center" }}>INTENSITY:</span>
              {[
                { label:"SAFE (0)",     color:"#22D468" },
                { label:"LOW (1-2)",    color:"#FFB400" },
                { label:"MEDIUM (3-5)", color:"#FF5B18" },
                { label:"HIGH (6-10)",  color:"#FF3D3D" },
                { label:"CRITICAL (10+)","color":"#FF0000" },
              ].map(({ label, color }) => (
                <div key={label} style={{ display:"flex", alignItems:"center", gap:4 }}>
                  <div style={{ width:10, height:10, borderRadius:2, background:color }}/>
                  <span style={{ fontSize:9, color:T.g2 }}>{label}</span>
                </div>
              ))}
            </div>

            {loading ? (
              <div style={{ textAlign:"center", padding:"30px 0", color:T.g1 }}>
                <div style={{ width:28, height:28, border:`2px solid ${T.border}`,
                  borderTopColor:T.orange, borderRadius:"50%",
                  animation:"spin .8s linear infinite", margin:"0 auto 10px" }}/>
                Building heatmap...
              </div>
            ) : zoneData.length === 0 ? (
              <div style={{ textAlign:"center", padding:"40px 0", color:T.g2 }}>
                <div style={{ fontSize:32, marginBottom:8 }}>🗺️</div>
                <div style={{ fontSize:13, color:T.g1 }}>
                  No violations in the last {dateRange} days — all zones safe ✅
                </div>
              </div>
            ) : (
              <div style={{ display:"grid",
                gridTemplateColumns: selected ? "1fr 300px" : "1fr",
                gap:16 }}>

                {/* Heatmap */}
                <div>
                  {view === 'grid' ? (
                    <div style={{ display:"grid",
                      gridTemplateColumns:"repeat(auto-fill, minmax(130px, 1fr))",
                      gap:8 }}>
                      {zoneData.map(z => (
                        <ZoneCell
                          key={z.zone}
                          zone={z.zone}
                          violations={z.total}
                          maxViols={maxViols}
                          onClick={zone => setSelected(s => s===zone?null:zone)}
                          isSelected={selected===z.zone}
                        />
                      ))}
                    </div>
                  ) : (
                    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                      {zoneData.map((z,i) => {
                        const heat = getHeatColor(z.total);
                        const pct  = (z.total/maxViols)*100;
                        return (
                          <div key={z.zone} onClick={() => setSelected(s=>s===z.zone?null:z.zone)}
                            style={{ display:"flex", alignItems:"center", gap:12,
                              padding:"10px 14px", borderRadius:10, cursor:"pointer",
                              background:selected===z.zone?heat.bg:i%2===0?T.card2:"transparent",
                              border:`1px solid ${selected===z.zone?heat.text:T.border}` }}>
                            <div style={{ fontSize:13, fontWeight:800, color:heat.text,
                              fontFamily:"'Bebas Neue',sans-serif", minWidth:30,
                              textAlign:"right" }}>{z.total}</div>
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ fontSize:11, fontWeight:700,
                                color:T.white, marginBottom:4 }}>{z.zone}</div>
                              <div style={{ height:4, background:T.border, borderRadius:2 }}>
                                <div style={{ height:"100%", width:`${pct}%`,
                                  background:heat.text, borderRadius:2 }}/>
                              </div>
                            </div>
                            <div style={{ fontSize:9, fontWeight:800, color:heat.text,
                              background:heat.bg, border:`1px solid ${heat.border}`,
                              padding:"2px 8px", borderRadius:4 }}>
                              {heat.label}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Zone detail panel */}
                {selected && selZone && (
                  <div style={{ background:T.card2, border:`1px solid ${T.border}`,
                    borderRadius:12, padding:16, height:"fit-content" }}>
                    <div style={{ display:"flex", alignItems:"center",
                      justifyContent:"space-between", marginBottom:12 }}>
                      <div style={{ fontSize:13, fontWeight:800, color:T.white }}>
                        📹 {selZone.zone}
                      </div>
                      <button onClick={() => setSelected(null)} style={{
                        background:"none", border:"none", color:T.g1,
                        fontSize:16, cursor:"pointer" }}>✕</button>
                    </div>

                    {/* Stats */}
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr",
                      gap:8, marginBottom:14 }}>
                      {[
                        { label:"Total",   val:selZone.total,   color:T.red },
                        { label:"PPE",     val:selZone.ppe,     color:T.red },
                        { label:"Unsafe",  val:selZone.unsafe,  color:T.amber },
                        { label:"Pathway", val:selZone.pathway, color:"#00BCD4" },
                      ].map(({ label, val, color }) => (
                        <div key={label} style={{ textAlign:"center", padding:"10px 6px",
                          background:T.card, border:`1px solid ${T.border}`, borderRadius:8 }}>
                          <div style={{ fontSize:20, fontWeight:800, color,
                            fontFamily:"'Bebas Neue',sans-serif" }}>{val}</div>
                          <div style={{ fontSize:9, color:T.g2 }}>{label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Top violations */}
                    <div style={{ fontSize:10, color:T.g2, fontWeight:700,
                      letterSpacing:1.5, marginBottom:8 }}>TOP VIOLATIONS</div>
                    {Object.entries(selZone.byType)
                      .sort((a,b) => b[1]-a[1])
                      .slice(0,4)
                      .map(([type, count]) => (
                        <div key={type} style={{ display:"flex", alignItems:"center",
                          gap:8, padding:"5px 8px", marginBottom:4,
                          background:T.card, border:`1px solid ${T.border}`,
                          borderRadius:6 }}>
                          <span style={{ flex:1, fontSize:10, color:T.white }}>{type}</span>
                          <span style={{ fontSize:11, fontWeight:800, color:T.red }}>{count}x</span>
                        </div>
                      ))}

                    {/* Daily trend */}
                    {Object.keys(selZone.byDay).length > 1 && (
                      <>
                        <div style={{ fontSize:10, color:T.g2, fontWeight:700,
                          letterSpacing:1.5, margin:"12px 0 8px" }}>DAILY TREND</div>
                        {Object.entries(selZone.byDay)
                          .sort((a,b) => a[0].localeCompare(b[0]))
                          .slice(-7)
                          .map(([day, count]) => {
                            const maxDay = Math.max(...Object.values(selZone.byDay));
                            return (
                              <div key={day} style={{ display:"flex", alignItems:"center",
                                gap:8, marginBottom:4 }}>
                                <span style={{ fontSize:9, color:T.g2, minWidth:70 }}>
                                  {new Date(day).toLocaleDateString('en-IN',
                                    { day:'2-digit', month:'short' })}
                                </span>
                                <div style={{ flex:1, height:4, background:T.border,
                                  borderRadius:2 }}>
                                  <div style={{ height:"100%", borderRadius:2,
                                    width:`${(count/maxDay)*100}%`,
                                    background:T.red }}/>
                                </div>
                                <span style={{ fontSize:10, fontWeight:700,
                                  color:T.red, minWidth:20 }}>{count}</span>
                              </div>
                            );
                          })}
                      </>
                    )}
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
