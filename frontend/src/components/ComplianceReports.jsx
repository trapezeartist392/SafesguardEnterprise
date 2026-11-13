import { useState } from 'react';

const T = {
  bg:'#0C0D10', panel:'#141619', card:'#1A1D22', border:'#2B3138',
  amber:'#F5A623', green:'#2FB674', red:'#E5484D', teal:'#00D4B4',
  blue:'#3B82F6', orange:'#FF6B35',
  white:'#F0F1F3', muted:'#9AA0A8', dim:'#6A7080',
};

const tok = () => localStorage.getItem('safeg_token');
const hdr = () => ({ Authorization: `Bearer ${tok()}` });

function csv(rows, name) {
  const b = new Blob([rows.join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(b);
  a.download = name;
  a.click();
}

function Stat({ label, value, color }) {
  return (
    <div style={{ background:T.bg, borderRadius:8, padding:'12px 14px', border:`1px solid ${T.border}` }}>
      <div style={{ fontSize:22, fontWeight:800, color: color || T.white }}>{value}</div>
      <div style={{ fontSize:10, color:T.dim, marginTop:2, letterSpacing:.5 }}>{label}</div>
    </div>
  );
}

function Card({ children, style }) {
  return (
    <div style={{ background:T.panel, border:`1px solid ${T.border}`, borderRadius:10, padding:18, ...style }}>
      {children}
    </div>
  );
}

function Badge({ text, color }) {
  const colors = { green:[T.green,'rgba(47,182,116,.12)'], amber:[T.amber,'rgba(245,166,35,.12)'], red:[T.red,'rgba(229,72,77,.12)'] };
  const [fg, bg] = colors[color] || [T.muted, 'rgba(255,255,255,.06)'];
  return (
    <span style={{ fontSize:9, fontWeight:700, letterSpacing:1.5, padding:'3px 9px',
      borderRadius:999, color:fg, background:bg, fontFamily:'monospace' }}>
      {text}
    </span>
  );
}

function GenBtn({ onClick, loading, label='Generate Report' }) {
  return (
    <button onClick={onClick} disabled={loading} style={{
      padding:'7px 16px', borderRadius:8, fontSize:11, fontWeight:700, cursor:'pointer',
      background: loading ? 'rgba(255,255,255,.06)' : `linear-gradient(135deg,${T.orange},#FF8C52)`,
      color: loading ? T.dim : '#fff', border:'none',
    }}>
      {loading ? 'Loading…' : label}
    </button>
  );
}

function CsvBtn({ onClick }) {
  return (
    <button onClick={onClick} style={{
      padding:'7px 16px', borderRadius:8, fontSize:11, fontWeight:700, cursor:'pointer',
      background:`rgba(0,212,180,.1)`, color:T.teal,
      border:`1px solid rgba(0,212,180,.3)`,
    }}>
      ⬇ Download CSV
    </button>
  );
}

// ── ISO 45001 ─────────────────────────────────────────────────
function ISO45001Card() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const now = new Date();

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`/api/v1/compliance/iso45001?month=${now.getMonth()+1}&year=${now.getFullYear()}`, { headers: hdr() });
      const d = await r.json();
      if (d.success) setData(d.data);
    } catch {} finally { setLoading(false); }
  }

  function download() {
    const s = data.summary;
    csv([
      'Metric,Value',
      `Total Violations,${s.total}`,
      `PPE Violations,${s.ppe}`,
      `Unsafe Acts,${s.unsafe_acts}`,
      `High Risk,${s.high_risk}`,
      `Resolved,${s.resolved}`,
      `Cameras Affected,${s.cameras_affected}`,
      `Trend vs Prev Month,${s.trend_vs_prev}%`,
      '',
      'Violation Type,Count',
      ...data.by_type.map(t => `${t.violation_type},${t.count}`),
    ], `ISO45001-${now.getFullYear()}-${now.getMonth()+1}.csv`);
  }

  return (
    <Card style={{ gridColumn:'span 2' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <div>
          <div style={{ fontSize:16, fontWeight:700, color:T.white }}>📋 ISO 45001 Monthly Report</div>
          <div style={{ fontSize:11, color:T.muted, marginTop:2 }}>
            OHS Management System — {now.toLocaleDateString('en-IN',{month:'long',year:'numeric'})}
          </div>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <Badge text="LIVE" color="green"/>
          {!data ? <GenBtn onClick={load} loading={loading}/> : <CsvBtn onClick={download}/>}
        </div>
      </div>

      {data ? (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:16 }}>
            <Stat label="Total Incidents"  value={data.summary.total}           color={T.orange}/>
            <Stat label="PPE Violations"   value={data.summary.ppe}             color={T.red}/>
            <Stat label="Resolved"         value={data.summary.resolved}        color={T.green}/>
            <Stat label="Trend vs Prev"
              value={`${data.summary.trend_vs_prev > 0 ? '+' : ''}${data.summary.trend_vs_prev}%`}
              color={data.summary.trend_vs_prev <= 0 ? T.green : T.red}/>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <div>
              <div style={{ fontSize:11, color:T.dim, marginBottom:7, letterSpacing:1 }}>TOP VIOLATION TYPES</div>
              {data.by_type.slice(0,6).map((t,i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0',
                  borderBottom:`1px solid ${T.border}`, fontSize:12 }}>
                  <span style={{ color:T.muted }}>{t.violation_type}</span>
                  <span style={{ color:T.white, fontWeight:700 }}>{t.count}</span>
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize:11, color:T.dim, marginBottom:7, letterSpacing:1 }}>ISO 45001 CLAUSE STATUS</div>
              {Object.entries(data.clauses).map(([clause, detail]) => (
                <div key={clause} style={{ display:'flex', gap:8, padding:'5px 0',
                  borderBottom:`1px solid ${T.border}`, fontSize:11 }}>
                  <span style={{ color:T.teal, fontWeight:700, minWidth:50 }}>{clause}</span>
                  <span style={{ color:T.muted }}>{detail}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div style={{ textAlign:'center', padding:'32px 0', color:T.dim, fontSize:13 }}>
          Click "Generate Report" to pull live violation data for ISO 45001 compliance
        </div>
      )}
    </Card>
  );
}

// ── BRSR ─────────────────────────────────────────────────────
function BRSRCard() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const yr = new Date().getFullYear();

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`/api/v1/compliance/brsr?year=${yr}`, { headers: hdr() });
      const d = await r.json();
      if (d.success) setData(d.data);
    } catch {} finally { setLoading(false); }
  }

  function download() {
    csv([
      'Metric,Value',
      ...Object.entries(data.metrics).map(([k,v]) => `${k},${v}`),
      ...Object.entries(data.kpis).map(([k,v]) => `KPI_${k},${v}`),
      '',
      'Disclosure,Detail',
      ...Object.entries(data.disclosures).map(([k,v]) => `${k},"${v}"`),
    ], `BRSR-Safety-${yr}.csv`);
  }

  return (
    <Card>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:14 }}>
        <div>
          <div style={{ fontSize:15, fontWeight:700, color:T.white }}>📊 SEBI BRSR Safety</div>
          <div style={{ fontSize:11, color:T.muted, marginTop:2 }}>Business Responsibility — FY {yr}</div>
        </div>
        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
          <Badge text="LIVE" color="green"/>
          {!data ? <GenBtn onClick={load} loading={loading} label="Generate"/> : <CsvBtn onClick={download}/>}
        </div>
      </div>

      {data ? (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
            <Stat label="Total Incidents"  value={data.metrics.total_safety_incidents} color={T.orange}/>
            <Stat label="Accidents"        value={data.metrics.accidents}              color={T.red}/>
            <Stat label="Near Misses"      value={data.metrics.near_misses}            color={T.amber}/>
            <Stat label="Resolution Rate"  value={`${data.kpis.resolution_rate}%`}     color={T.green}/>
          </div>
          <div style={{ fontSize:11, color:T.dim, marginBottom:7, letterSpacing:1 }}>PRINCIPLE 3 DISCLOSURES</div>
          {Object.entries(data.disclosures).map(([k,v]) => (
            <div key={k} style={{ display:'flex', gap:8, padding:'5px 0',
              borderBottom:`1px solid ${T.border}`, fontSize:11 }}>
              <span style={{ color:T.teal, fontWeight:700, minWidth:44 }}>{k}</span>
              <span style={{ color:T.muted }}>{v}</span>
            </div>
          ))}
        </>
      ) : (
        <div style={{ textAlign:'center', padding:'28px 0', color:T.dim, fontSize:12 }}>
          Generate SEBI BRSR Principle 3 safety disclosures from live data
        </div>
      )}
    </Card>
  );
}

// ── OSH Code 2020 ────────────────────────────────────────────
function OSHCard() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const yr  = new Date().getFullYear();
  const qtr = Math.ceil((new Date().getMonth() + 1) / 3);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`/api/v1/compliance/osh-code?year=${yr}&quarter=${qtr}`, { headers: hdr() });
      const d = await r.json();
      if (d.success) setData(d.data);
    } catch {} finally { setLoading(false); }
  }

  function download() {
    csv([
      'Section,Status,Detail',
      ...Object.entries(data.sections).map(([s,d]) => `"${s}","${d.status}","${d.detail}"`),
    ], `OSH-Code-Q${qtr}-${yr}.csv`);
  }

  const statusIcon = s => s === 'Compliant' ? '🟢' : s === 'Action Required' ? '🔴' : '🟡';

  return (
    <Card>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:14 }}>
        <div>
          <div style={{ fontSize:15, fontWeight:700, color:T.white }}>📜 OSH Code 2020</div>
          <div style={{ fontSize:11, color:T.muted, marginTop:2 }}>Q{qtr} {yr} — Quarterly Compliance</div>
        </div>
        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
          <Badge text="LIVE" color="green"/>
          {!data ? <GenBtn onClick={load} loading={loading} label="Generate"/> : <CsvBtn onClick={download}/>}
        </div>
      </div>

      {data ? (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
            <Stat label="Total Incidents" value={data.summary.total_incidents} color={T.orange}/>
            <Stat label="Accidents"       value={data.summary.accidents}       color={T.red}/>
            <Stat label="Resolved"        value={data.summary.resolved}        color={T.green}/>
            <Stat label="Zones Monitored" value={data.summary.zones_monitored} color={T.teal}/>
          </div>
          <div style={{ fontSize:11, color:T.dim, marginBottom:7, letterSpacing:1 }}>SECTION-WISE STATUS</div>
          {Object.entries(data.sections).map(([sec,d]) => (
            <div key={sec} style={{ display:'flex', gap:8, padding:'6px 0',
              borderBottom:`1px solid ${T.border}`, fontSize:11, alignItems:'flex-start' }}>
              <span style={{ flexShrink:0 }}>{statusIcon(d.status)}</span>
              <div>
                <div style={{ color:T.white, fontWeight:600 }}>{sec}</div>
                <div style={{ color:T.muted, marginTop:1 }}>{d.detail}</div>
              </div>
            </div>
          ))}
        </>
      ) : (
        <div style={{ textAlign:'center', padding:'28px 0', color:T.dim, fontSize:12 }}>
          Generate OSH Code 2020 quarterly section-wise compliance status
        </div>
      )}
    </Card>
  );
}

// ── Main export ───────────────────────────────────────────────
export default function ComplianceReports() {
  return (
    <div style={{ animation:'slideIn .3s ease' }}>
      <div style={{ marginBottom:20 }}>
        <h2 style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:34, fontWeight:800,
          letterSpacing:3, color:T.white, margin:0 }}>COMPLIANCE REPORTS</h2>
        <div style={{ fontSize:12, color:T.muted, marginTop:4, letterSpacing:2 }}>
          AUTO-GENERATED STATUTORY REPORTS — ISO 45001 · BRSR · OSH CODE 2020 · FACTORIES ACT
        </div>
      </div>

      {/* ISO 45001 — full width */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
        <ISO45001Card/>
      </div>

      {/* BRSR + OSH side by side */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
        <BRSRCard/>
        <OSHCard/>
      </div>

      {/* Coming Soon — require external data */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        {[
          { icon:'🏥', title:'ESIC Half-Yearly Return',
            desc:`Employee State Insurance — H${new Date().getMonth()<6?1:2} ${new Date().getFullYear()}`,
            reason:'Requires employee ESIC IP numbers and payroll data from your HRMS' },
          { icon:'🏛️', title:'Shram Suvidha Portal Sync',
            desc:'Labour compliance — Ministry of Labour',
            reason:'Requires MoL portal API credentials from your establishment registration' },
        ].map((r,i) => (
          <Card key={i} style={{ opacity:.65 }}>
            <div style={{ fontSize:28, marginBottom:10 }}>{r.icon}</div>
            <div style={{ fontSize:15, fontWeight:700, color:T.white, marginBottom:4 }}>{r.title}</div>
            <div style={{ fontSize:11, color:T.muted, marginBottom:10 }}>{r.desc}</div>
            <Badge text="Coming Soon"/>
            <div style={{ fontSize:11, color:T.dim, marginTop:8 }}>⚠ {r.reason}</div>
          </Card>
        ))}
      </div>

      {/* Accident Summary — LIVE */}
      <div style={{ marginTop:16 }}>
        <AccidentSummaryCard/>
      </div>

      <style>{`@keyframes slideIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
}

function AccidentSummaryCard() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const yr = new Date().getFullYear();

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`/api/v1/violations/archive?dateFrom=${yr}-01-01&dateTo=${yr}-12-31&limit=1000`, { headers: hdr() });
      const d = await r.json();
      if (d.success) {
        const viols = d.data.violations || [];
        setData({
          total:   viols.length,
          open:    viols.filter(v => v.status === 'open').length,
          pending: viols.filter(v => v.status === 'acknowledged').length,
          closed:  viols.filter(v => v.status === 'resolved' || v.status === 'closed').length,
          violations: viols,
        });
      }
    } catch {} finally { setLoading(false); }
  }

  function download() {
    const rows = [
      'VIO No,Type,Severity,Status,Camera,Zone,Date',
      ...data.violations.map(v =>
        `${v.violation_no},${v.violation_type},${v.severity},${v.status},${v.camera_id||'—'},${v.area_name||'—'},${new Date(v.occurred_at).toLocaleDateString('en-IN')}`
      ),
    ];
    csv(rows, `Accident-Summary-${yr}.csv`);
  }

  return (
    <Card>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <div>
          <div style={{ fontSize:15, fontWeight:700, color:T.white }}>⚠️ Accident Summary Report</div>
          <div style={{ fontSize:11, color:T.muted, marginTop:2 }}>Form 18 &amp; 19 Register — {yr}</div>
          {data && (
            <div style={{ fontSize:11, color:T.muted, marginTop:2 }}>
              {data.total} incidents recorded · Year to date
            </div>
          )}
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <Badge text="LIVE" color="green"/>
          {!data
            ? <GenBtn onClick={load} loading={loading} label="Load Summary"/>
            : <CsvBtn onClick={download}/>
          }
        </div>
      </div>

      {data ? (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
          <Stat label="Total Incidents" value={data.total}   color={T.orange}/>
          <Stat label="Open"            value={data.open}    color={T.red}/>
          <Stat label="Pending"         value={data.pending} color={T.amber}/>
          <Stat label="Closed"          value={data.closed}  color={T.green}/>
        </div>
      ) : (
        <div style={{ textAlign:'center', padding:'24px 0', color:T.dim, fontSize:12 }}>
          Click "Load Summary" to pull the full-year accident register from live data
        </div>
      )}
    </Card>
  );
}
