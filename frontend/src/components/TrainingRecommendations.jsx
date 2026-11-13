import { useState, useEffect, useCallback } from 'react';

const T = {
  bg:'#0C0D10', panel:'#141619', card:'#1A1D22', border:'#2B3138',
  amber:'#F5A623', green:'#2FB674', red:'#E5484D', blue:'#3B82F6',
  white:'#F0F1F3', muted:'#9AA0A8', dim:'#6A7080',
};

const hdr = () => ({ Authorization: `Bearer ${localStorage.getItem('safeg_token')}` });

const PRIORITY = {
  high:   { color: T.red,   bg:'rgba(229,72,77,.10)',  border:'rgba(229,72,77,.3)',  label:'HIGH PRIORITY' },
  medium: { color: T.amber, bg:'rgba(245,166,35,.10)', border:'rgba(245,166,35,.3)', label:'MEDIUM' },
  low:    { color: T.blue,  bg:'rgba(59,130,246,.10)', border:'rgba(59,130,246,.3)', label:'ADVISORY' },
  info:   { color: T.green, bg:'rgba(47,182,116,.10)', border:'rgba(47,182,116,.3)', label:'GOOD STANDING' },
};

const DIMENSION = {
  type: { label:'By Violation Type', icon:'📊' },
  zone: { label:'By Zone', icon:'📍' },
  time: { label:'By Time Pattern', icon:'🕐' },
};

export default function TrainingRecommendations() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays]       = useState(30);
  const [filter, setFilter]   = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/v1/training/recommendations?days=${days}`, { headers: hdr() });
      const d = await r.json();
      if (d.success) setData(d.data);
    } catch {} finally { setLoading(false); }
  }, [days]);

  useEffect(() => { load(); }, [load]);

  function exportCsv() {
    if (!data) return;
    const rows = [
      'Priority,Dimension,Title,Detail,Evidence,Recommended Action',
      ...data.recommendations.map(r =>
        `${r.priority},${r.dimension || '—'},"${r.title}","${r.detail}","${r.evidence}","${r.action}"`
      ),
    ];
    const b = new Blob([rows.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b);
    a.download = `Training-Recommendations-${days}d.csv`;
    a.click();
  }

  const recs = data?.recommendations || [];
  const shown = filter === 'all' ? recs : recs.filter(r => r.dimension === filter || (filter === 'priority' && r.priority === 'high'));

  const counts = {
    high:   recs.filter(r => r.priority === 'high').length,
    medium: recs.filter(r => r.priority === 'medium').length,
    low:    recs.filter(r => r.priority === 'low').length,
  };

  return (
    <div style={{ animation:'slideIn .3s ease' }}>
      {/* header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <h2 style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:34, fontWeight:800,
            letterSpacing:3, color:T.white, margin:0 }}>TRAINING RECOMMENDATIONS</h2>
          <div style={{ fontSize:12, color:T.muted, marginTop:4, letterSpacing:1 }}>
            AI-driven safety training priorities — derived from violation patterns across type, zone &amp; shift
          </div>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <select value={days} onChange={e => setDays(+e.target.value)} style={selectStyle}>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button onClick={load} style={ghostBtn}>↻ Refresh</button>
          {data && recs.length > 0 && <button onClick={exportCsv} style={csvBtn}>⬇ Download CSV</button>}
        </div>
      </div>

      {loading ? (
        <div style={{ padding:60, textAlign:'center', color:T.muted }}>Analysing violation patterns…</div>
      ) : (
        <>
          {/* summary bar */}
          {data?.summary && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12, marginBottom:20 }}>
              <SummaryTile label="Violations Analysed" value={data.summary.total} color={T.white}/>
              <SummaryTile label="High Priority" value={counts.high} color={T.red}/>
              <SummaryTile label="Medium" value={counts.medium} color={T.amber}/>
              <SummaryTile label="Top Issue"
                value={data.summary.top_type ? data.summary.top_type.type : '—'}
                color={T.amber} small/>
            </div>
          )}

          {/* filters */}
          <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
            {[['all','All'],['priority','High Priority'],['type','By Type'],['zone','By Zone'],['time','By Time']].map(([k,label]) => (
              <button key={k} onClick={() => setFilter(k)} style={{
                ...chip, ...(filter === k ? { background:T.amber, color:'#000', borderColor:T.amber } : {})
              }}>{label}</button>
            ))}
          </div>

          {/* recommendations */}
          {shown.length === 0 ? (
            <div style={{ padding:'40px 20px', textAlign:'center', color:T.dim,
              border:`1px dashed ${T.border}`, borderRadius:10 }}>
              No recommendations for this filter.
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {shown.map((r, i) => {
                const p = PRIORITY[r.priority] || PRIORITY.info;
                return (
                  <div key={i} style={{ background:T.panel, border:`1px solid ${T.border}`,
                    borderLeft:`3px solid ${p.color}`, borderRadius:10, padding:'16px 18px' }}>
                    <div style={{ display:'flex', alignItems:'flex-start', gap:14 }}>
                      <div style={{ fontSize:26, flexShrink:0 }}>{r.icon}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6, flexWrap:'wrap' }}>
                          <span style={{ fontSize:15, fontWeight:700, color:T.white }}>{r.title}</span>
                          <span style={{ fontSize:9, fontWeight:700, letterSpacing:1, padding:'2px 8px',
                            borderRadius:999, color:p.color, background:p.bg, border:`1px solid ${p.border}` }}>
                            {p.label}
                          </span>
                          {r.dimension && DIMENSION[r.dimension] && (
                            <span style={{ fontSize:10, color:T.dim }}>
                              {DIMENSION[r.dimension].icon} {DIMENSION[r.dimension].label}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize:13, color:T.muted, lineHeight:1.6, marginBottom:10 }}>{r.detail}</div>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                          <div style={{ background:T.bg, borderRadius:7, padding:'9px 12px' }}>
                            <div style={{ fontSize:9, color:T.dim, letterSpacing:1, marginBottom:3 }}>📋 EVIDENCE</div>
                            <div style={{ fontSize:12, color:T.muted }}>{r.evidence}</div>
                          </div>
                          <div style={{ background:'rgba(47,182,116,.06)', borderRadius:7, padding:'9px 12px',
                            border:'1px solid rgba(47,182,116,.15)' }}>
                            <div style={{ fontSize:9, color:T.green, letterSpacing:1, marginBottom:3 }}>✓ RECOMMENDED ACTION</div>
                            <div style={{ fontSize:12, color:T.white }}>{r.action}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ marginTop:20, padding:'12px 16px', background:T.panel, borderRadius:8,
            border:`1px solid ${T.border}`, fontSize:11, color:T.dim }}>
            💡 These recommendations are generated by a deterministic rules engine running entirely on your server —
            no cloud, no external AI. Every recommendation shows the exact violation data that triggered it.
          </div>
        </>
      )}

      <style>{`@keyframes slideIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
}

function SummaryTile({ label, value, color, small }) {
  return (
    <div style={{ background:T.panel, border:`1px solid ${T.border}`, borderRadius:9, padding:'14px 16px' }}>
      <div style={{ fontSize: small ? 15 : 26, fontWeight:800, color, lineHeight:1.2,
        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{value}</div>
      <div style={{ fontSize:10, color:T.dim, marginTop:3, letterSpacing:1, textTransform:'uppercase' }}>{label}</div>
    </div>
  );
}

const selectStyle = {
  padding:'7px 12px', background:T.bg, border:`1px solid ${T.border}`,
  borderRadius:7, color:T.white, fontSize:12, outline:'none',
};
const ghostBtn = {
  padding:'7px 14px', background:'transparent', color:T.muted,
  border:`1px solid ${T.border}`, borderRadius:7, fontSize:12, cursor:'pointer',
};
const csvBtn = {
  padding:'7px 14px', background:'rgba(0,212,180,.1)', color:'#00D4B4',
  border:'1px solid rgba(0,212,180,.3)', borderRadius:7, fontSize:12, fontWeight:700, cursor:'pointer',
};
const chip = {
  padding:'6px 14px', background:'transparent', color:T.muted,
  border:`1px solid ${T.border}`, borderRadius:999, fontSize:12, cursor:'pointer',
};
