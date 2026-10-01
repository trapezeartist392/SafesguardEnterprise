/**
 * ROICalculator.jsx
 * SafeguardIQ Enterprise — Interactive ROI Calculator + PDF Report Generator
 * Place in: frontend/src/components/ROICalculator.jsx
 */
import { useState } from 'react';
import axios from 'axios';
import { useLang } from '../i18n/LanguageContext';

const T = {
  bg:"#05080F", card:"#0C1422", card2:"#101828",
  border:"#1A2540", orange:"#FF5B18", teal:"#00D4B4",
  white:"#EDF2FF", g1:"#8899BB", g2:"#3A4E72",
  green:"#22D468", red:"#FF3D3D", amber:"#FFB400",
};

const fmt = (n) => {
  n = Math.round(n);
  if (n >= 10000000) return `₹${(n/10000000).toFixed(1)}Cr`;
  if (n >= 100000)   return `₹${(n/100000).toFixed(1)}L`;
  return `₹${n.toLocaleString('en-IN')}`;
};

const iStyle = {
  width:"100%", background:"#06090F", border:`1px solid ${T.border}`,
  borderRadius:8, padding:"10px 12px", color:T.white, fontSize:13,
  fontFamily:"'Nunito',sans-serif", outline:"none", boxSizing:"border-box",
};

function ResultCard({ label, value, sub, color = T.orange, large = false }) {
  return (
    <div style={{ background:T.card2, border:`1px solid ${color}30`,
      borderRadius:12, padding:"16px 18px", borderLeft:`3px solid ${color}` }}>
      <div style={{ fontSize:10, color:T.g1, fontWeight:700,
        letterSpacing:1, marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:large?28:22, fontWeight:800, color,
        fontFamily:"'Bebas Neue',sans-serif", lineHeight:1,
        marginBottom:4 }}>{value}</div>
      <div style={{ fontSize:10, color:T.g2 }}>{sub}</div>
    </div>
  );
}

export default function ROICalculator() {
  const { t } = useLang();

  const [inputs, setInputs] = useState({
    workers:           100,
    cameras:           8,
    accidents_year:    8,
    cost_per_accident: 1500000,
    plan:              'professional',
    factory_name:      '',
    manager_name:      '',
  });
  const [expanded,    setExpanded]    = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error,       setError]       = useState('');
  const [success,     setSuccess]     = useState(false);

  const set = (k, v) => setInputs(p => ({...p,[k]:v}));

  // Plan pricing
  const PLAN_PRICE = { starter:2500, professional:2000, enterprise:1600 };
  const planPrice  = PLAN_PRICE[inputs.plan] || 2000;

  // ── CALCULATIONS ──
  const reductionRate       = 0.40;
  const accidentsPrevented  = inputs.accidents_year * reductionRate;
  const savingsFromPrevention = accidentsPrevented * inputs.cost_per_accident;
  const insuranceSaving     = inputs.accidents_year * inputs.cost_per_accident * 0.20;
  const totalSavings        = savingsFromPrevention + insuranceSaving;

  const annualSaaS          = inputs.cameras * planPrice * 12;
  const setupCost           = inputs.cameras * 15000;
  const totalYear1          = annualSaaS + setupCost;

  const netBenefit          = totalSavings - totalYear1;
  const roiPct              = totalYear1 > 0 ? (netBenefit / totalYear1 * 100) : 0;
  const paybackMonths       = totalSavings > 0 ? (totalYear1 / totalSavings * 12) : 0;

  const token = localStorage.getItem('safeg_token') || '';

  const downloadPDF = async () => {
    setDownloading(true); setError(''); setSuccess(false);
    try {
      const res = await axios.post('/api/v1/roi/report', {
        ...inputs,
        accidents_year:     parseInt(inputs.accidents_year),
        cost_per_accident:  parseInt(inputs.cost_per_accident),
        workers:            parseInt(inputs.workers),
        cameras:            parseInt(inputs.cameras),
        reduction_rate:     reductionRate,
        plan_price_per_camera: planPrice,
      }, {
        headers:      { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });
      const url  = URL.createObjectURL(new Blob([res.data], { type:'application/pdf' }));
      const link = document.createElement('a');
      link.href  = url;
      link.download = `ROI_Report_${inputs.factory_name || 'SafeguardIQ Enterprise'}_${new Date().getFullYear()}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      setSuccess(true);
    } catch(e) {
      setError('Failed to generate PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div style={{ fontFamily:"'Nunito',sans-serif", marginBottom:20 }}>
      <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:16, overflow:"hidden" }}>

        {/* Header */}
        <div style={{ background:T.bg, padding:"16px 20px",
          borderBottom:`1px solid ${T.border}`,
          display:"flex", alignItems:"center", gap:12, cursor:"pointer" }}
          onClick={() => setExpanded(e => !e)}>
          <span style={{ fontSize:22 }}>📈</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14, fontWeight:800, color:T.white }}>
              {t('roi_title')}
            </div>
            <div style={{ fontSize:11, color:T.g1 }}>{t('roi_subtitle')}</div>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <div style={{ fontSize:10, fontWeight:700, color:T.green,
              background:`${T.green}15`, border:`1px solid ${T.green}30`,
              padding:"3px 10px", borderRadius:6 }}>
              Based on DGFASLI Data
            </div>
            <span style={{ color:T.g1, fontSize:14 }}>{expanded?"▲":"▼"}</span>
          </div>
        </div>

        {expanded && (
          <div style={{ padding:20 }}>

            {/* Input section */}
            <div style={{ fontSize:11, color:T.orange, fontWeight:800,
              letterSpacing:1.5, marginBottom:12,
              borderBottom:`1px solid ${T.border}`, paddingBottom:6 }}>
              YOUR PLANT DETAILS
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
              <div>
                <label style={{ fontSize:10, color:T.g1, display:"block",
                  marginBottom:5, letterSpacing:1, fontWeight:700 }}>
                  FACTORY NAME
                </label>
                <input value={inputs.factory_name}
                  onChange={e => set('factory_name', e.target.value)}
                  placeholder="e.g. Pune Auto Components"
                  style={iStyle}/>
              </div>
              <div>
                <label style={{ fontSize:10, color:T.g1, display:"block",
                  marginBottom:5, letterSpacing:1, fontWeight:700 }}>
                  SAFEGUARDIQ ENTERPRISE PLAN
                </label>
                <select value={inputs.plan} onChange={e => set('plan', e.target.value)}
                  style={iStyle}>
                  <option value="starter">Starter — ₹2,500/cam/month</option>
                  <option value="professional">Professional — ₹2,000/cam/month</option>
                  <option value="enterprise">Enterprise — ₹1,600/cam/month</option>
                </select>
              </div>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:12, marginBottom:20 }}>
              {[
                { key:"workers",           label:t('workers'),           min:10,   max:5000, step:10  },
                { key:"cameras",           label:t('cameras_count'),     min:1,    max:100,  step:1   },
                { key:"accidents_year",    label:t('accidents_year'),    min:0,    max:100,  step:1   },
                { key:"cost_per_accident", label:t('cost_per_accident'), min:100000, max:5000000, step:50000 },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize:10, color:T.g1, display:"block",
                    marginBottom:5, letterSpacing:1, fontWeight:700 }}>
                    {f.label.toUpperCase()}
                  </label>
                  <input type="number" value={inputs[f.key]}
                    min={f.min} max={f.max} step={f.step}
                    onChange={e => set(f.key, parseFloat(e.target.value) || 0)}
                    style={iStyle}/>
                  {f.key === 'cost_per_accident' && (
                    <div style={{ fontSize:9, color:T.g2, marginTop:3 }}>
                      = {fmt(inputs.cost_per_accident)} per incident
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* ── RESULTS ── */}
            <div style={{ fontSize:11, color:T.orange, fontWeight:800,
              letterSpacing:1.5, marginBottom:12,
              borderBottom:`1px solid ${T.border}`, paddingBottom:6 }}>
              CALCULATED ROI
            </div>

            {/* Top results */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:10 }}>
              <ResultCard
                label={t('annual_savings')}
                value={fmt(totalSavings)}
                sub="Accident prevention + insurance"
                color={T.green}
                large={true}
              />
              <ResultCard
                label={t('roi_percentage')}
                value={`${Math.round(roiPct)}%`}
                sub="First year return on investment"
                color={T.orange}
                large={true}
              />
              <ResultCard
                label={t('payback_period')}
                value={`${paybackMonths.toFixed(1)}`}
                sub={t('months') + " to recover investment"}
                color={T.teal}
                large={true}
              />
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:16 }}>
              <ResultCard
                label="ACCIDENTS PREVENTED"
                value={`${accidentsPrevented.toFixed(1)}/yr`}
                sub={`40% reduction — ${accidentsPrevented.toFixed(0)} incidents avoided`}
                color={T.green}
              />
              <ResultCard
                label="INSURANCE SAVING"
                value={fmt(insuranceSaving)}
                sub="20% premium reduction"
                color={T.amber}
              />
              <ResultCard
                label="NET BENEFIT YEAR 1"
                value={fmt(netBenefit)}
                sub={netBenefit > 0 ? "After SafeguardIQ Enterprise cost" : "Negative — increase cameras"}
                color={netBenefit > 0 ? T.green : T.red}
              />
            </div>

            {/* 3-year projection bar */}
            <div style={{ background:T.card2, border:`1px solid ${T.border}`,
              borderRadius:12, padding:16, marginBottom:16 }}>
              <div style={{ fontSize:11, color:T.g1, fontWeight:700, marginBottom:12 }}>
                3-YEAR CUMULATIVE SAVINGS
              </div>
              {[
                { label:"Year 1", savings:totalSavings,       cost:totalYear1,  net:netBenefit },
                { label:"Year 2", savings:totalSavings*1.1,   cost:annualSaaS*0.85, net:totalSavings*1.1-annualSaaS*0.85+netBenefit },
                { label:"Year 3", savings:totalSavings*1.2,   cost:annualSaaS*0.80, net:totalSavings*1.2-annualSaaS*0.80+netBenefit+totalSavings*1.1-annualSaaS*0.85 },
              ].map(({ label, savings, cost, net }, i) => {
                const maxVal = totalSavings * 3.5;
                const pct    = Math.min(100, savings / maxVal * 100);
                return (
                  <div key={i} style={{ marginBottom:10 }}>
                    <div style={{ display:"flex", justifyContent:"space-between",
                      fontSize:11, marginBottom:4 }}>
                      <span style={{ color:T.white, fontWeight:700 }}>{label}</span>
                      <span style={{ color:T.green, fontWeight:700 }}>
                        {fmt(savings)} savings · {fmt(cost)} cost · Net: {fmt(net)}
                      </span>
                    </div>
                    <div style={{ height:8, background:T.border, borderRadius:4, overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${pct}%`,
                        background:`linear-gradient(90deg,${T.green},${T.teal})`,
                        borderRadius:4, transition:"width .5s" }}/>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Conclusion */}
            <div style={{ background:`${T.green}08`, border:`1px solid ${T.green}25`,
              borderRadius:10, padding:"12px 16px", marginBottom:16,
              borderLeft:`3px solid ${T.green}` }}>
              <div style={{ fontSize:13, fontWeight:700, color:T.green, marginBottom:4 }}>
                💡 One prevented accident pays for {(inputs.cost_per_accident / (annualSaaS || 1)).toFixed(1)} years of SafeguardIQ Enterprise
              </div>
              <div style={{ fontSize:11, color:T.g1 }}>
                Based on your accident cost of {fmt(inputs.cost_per_accident)} vs annual plan cost of {fmt(annualSaaS)}
              </div>
            </div>

            {/* Manager name for PDF */}
            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:10, color:T.g1, display:"block",
                marginBottom:5, letterSpacing:1, fontWeight:700 }}>
                PLANT MANAGER NAME (for PDF)
              </label>
              <input value={inputs.manager_name}
                onChange={e => set('manager_name', e.target.value)}
                placeholder="e.g. Suresh Nair"
                style={{ ...iStyle, maxWidth:300 }}/>
            </div>

            {error && (
              <div style={{ marginBottom:12, padding:"10px 14px",
                background:`${T.red}10`, border:`1px solid ${T.red}30`,
                borderRadius:8, fontSize:12, color:T.red }}>⚠ {error}</div>
            )}
            {success && (
              <div style={{ marginBottom:12, padding:"10px 14px",
                background:`${T.green}10`, border:`1px solid ${T.green}30`,
                borderRadius:8, fontSize:12, color:T.green }}>
                ✅ ROI Report downloaded successfully!
              </div>
            )}

            {/* Download PDF button */}
            <button onClick={downloadPDF} disabled={downloading} style={{
              width:"100%", border:"none", borderRadius:10, padding:"14px",
              color:"#fff", fontSize:14, fontWeight:800,
              fontFamily:"'Nunito',sans-serif",
              background:downloading ? T.g2 : `linear-gradient(135deg,${T.orange},#FF8C52)`,
              cursor:downloading?"not-allowed":"pointer",
              display:"flex", alignItems:"center", justifyContent:"center", gap:10,
            }}>
              {downloading ? (
                <><div style={{ width:18, height:18,
                  border:"2px solid rgba(255,255,255,.3)",
                  borderTopColor:"#fff", borderRadius:"50%",
                  animation:"spin .8s linear infinite" }}/>Generating PDF...</>
              ) : (
                <>{t('download_roi')}</>
              )}
            </button>

            <div style={{ marginTop:10, fontSize:10, color:T.g2, textAlign:"center" }}>
              PDF includes: Cost analysis · 3-year projection · Pilot results · Investment breakdown
              · Based on DGFASLI official accident data
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
