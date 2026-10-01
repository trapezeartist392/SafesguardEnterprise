/**
 * ViolationArchive.jsx — with Hindi/English support
 */
import { useState, useEffect } from 'react';
import EvidencePhoto from './EvidencePhoto';
import api from '../utils/api';
import { useLang } from '../i18n/LanguageContext';

const T = {
  bg:"#05080F", card:"#0C1422", card2:"#101828",
  border:"#1A2540", orange:"#FF5B18", teal:"#00D4B4",
  blue:"#2D8EFF", white:"#EDF2FF", g1:"#8899BB",
  g2:"#3A4E72", green:"#22D468", red:"#FF3D3D", amber:"#FFB400",
};

const CAT_COLOR = { ppe:T.red, pathway:"#00BCD4", unsafe:T.amber, accident:"#FF0000", nearmiss:"#FF6B00" };
const SEV_COLOR = { critical:"#FF0000", high:T.red, medium:T.amber, low:T.green };
const PPE_ICONS = {
  "Helmet":"⛑️","Safety Vest":"🦺","Gloves":"🧤","Safety Boots":"👢",
  "Goggles":"🥽","Face Mask":"😷","Fire & Smoke":"🔥",
  "Chemical Hazard":"🧪","Machinery Safety":"⚙️","Vehicle Safety":"🚗",
};

const iStyle = {
  background:"#06090F", border:`1px solid ${T.border}`, borderRadius:8,
  padding:"8px 12px", color:T.white, fontSize:12,
  fontFamily:"'Nunito',sans-serif", outline:"none",
};


function ExpandedViolation({ v, cc, lang }) {
  const [photo, setPhoto]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPhoto, setShowPhoto] = useState(false);

  const loadPhoto = async () => {
    if (photo) { setShowPhoto(s => !s); return; }
    setLoading(true);
    try {
      const res = await api.get(`/violations/archive/photo/${v.id}`);
      setPhoto(res.data.image);
      setShowPhoto(true);
    } catch { setPhoto('none'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ margin:"0 0 8px 0", padding:16, background:`${cc}06`,
      border:`1px solid ${cc}20`, borderRadius:8, fontSize:12 }}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:10 }}>
        <div>
          <div style={{ fontSize:10, color:T.g2, marginBottom:3 }}>
            {lang === 'hi' ? 'विवरण' : 'DESCRIPTION'}
          </div>
          <div style={{ color:T.white }}>{v.description || (lang === 'hi' ? 'कोई विवरण नहीं' : 'No description available')}</div>
        </div>
        <div>
          <div style={{ fontSize:10, color:T.g2, marginBottom:3 }}>
            {lang === 'hi' ? 'तत्काल कार्रवाई' : 'IMMEDIATE ACTION'}
          </div>
          <div style={{ color:T.white }}>{v.immediate_action || "—"}</div>
        </div>
      </div>

      {/* Photo evidence button */}
      <div style={{ marginTop:10 }}>
        <EvidencePhoto violation={v} />

        {showPhoto && photo && photo !== 'none' && (
          <div style={{ marginTop:10 }}>
            <div style={{ fontSize:10, color:T.g2, marginBottom:6 }}>
              {lang === 'hi' ? 'AI द्वारा कैप्चर किया गया फ्रेम' : 'Frame captured by AI at time of violation'}
            </div>
            <img
              src={`data:image/jpeg;base64,${photo}`}
              alt="Violation evidence"
              style={{ maxWidth:"100%", maxHeight:300, borderRadius:8,
                border:`1px solid ${cc}40`, display:"block" }}
            />
            <a href={`data:image/jpeg;base64,${photo}`} download={`violation_${v.id}.jpg`}
              style={{ fontSize:10, color:cc, marginTop:6, display:"inline-block",
                textDecoration:"none", fontWeight:700 }}>
              ⬇ {lang === 'hi' ? 'फोटो डाउनलोड करें' : 'Download Photo'}
            </a>
          </div>
        )}
        {showPhoto && photo === 'none' && (
          <div style={{ marginTop:8, fontSize:11, color:T.g2 }}>
            {lang === 'hi' ? 'इस उल्लंघन के लिए कोई फोटो उपलब्ध नहीं है' : 'No photo evidence available for this violation'}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ViolationArchive() {
  const { t, lang } = useLang();
  const [violations, setViolations] = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  const [page,       setPage]       = useState(1);
  const [total,      setTotal]      = useState(0);
  const [expanded,   setExpanded]   = useState(null);
  const [downloading,setDownloading]= useState(false);

  const plan    = localStorage.getItem('safeg_plan') || 'starter';
  const maxDays = plan === 'professional' || plan === 'enterprise' ? 90 : 30;
  const PER_PAGE = 20;
  const minDate = new Date(Date.now() - maxDays * 86400000).toISOString().split('T')[0];

  const [filters, setFilters] = useState({
    dateFrom: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
    dateTo:   new Date().toISOString().split('T')[0],
    category: '', severity: '', camera: '',
  });

  const setF = (k, v) => { setFilters(p => ({...p,[k]:v})); setPage(1); };

  const fetchViolations = async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({
        page, limit: PER_PAGE,
        dateFrom: filters.dateFrom,
        dateTo:   filters.dateTo + 'T23:59:59',
        ...(filters.category && { category: filters.category }),
        ...(filters.severity && { severity: filters.severity }),
        ...(filters.camera   && { cameraId: filters.camera }),
      });
      const res = await api.get(`/violations/archive?${params}`);
      setViolations(res.data.data?.violations || []);
      setTotal(res.data.data?.total || 0);
    } catch(e) {
      setError(e.response?.data?.message || 'Failed to load violations');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchViolations(); }, [page, filters]);

  const downloadCSV = async () => {
    setDownloading(true);
    try {
      const params = new URLSearchParams({
        dateFrom: filters.dateFrom, dateTo: filters.dateTo + 'T23:59:59',
        format: 'csv', limit: 1000,
        ...(filters.category && { category: filters.category }),
        ...(filters.severity && { severity: filters.severity }),
      });
      const res = await api.get(`/violations/archive?${params}`, {
        responseType: 'blob',
      });
      const url  = URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href  = url;
      link.download = `violations_${filters.dateFrom}_${filters.dateTo}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch(e) {
      setError('Download failed');
    } finally { setDownloading(false); }
  };

  const CAT_LABEL = {
    ppe:      lang === 'hi' ? "⛑️ PPE" : "⛑️ PPE",
    pathway:  lang === 'hi' ? "🚧 रास्ता" : "🚧 Pathway",
    unsafe:   lang === 'hi' ? "⚠️ असुरक्षित" : "⚠️ Unsafe",
    accident: lang === 'hi' ? "🚨 दुर्घटना" : "🚨 Accident",
    nearmiss: lang === 'hi' ? "❗ बाल-बाल" : "❗ Near Miss",
  };

  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <div style={{ fontFamily:"'Nunito',sans-serif", marginBottom:20 }}>
      <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:16, overflow:"hidden" }}>

        {/* Header */}
        <div style={{ background:T.bg, padding:"16px 20px", borderBottom:`1px solid ${T.border}`,
          display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontSize:20 }}>🗂️</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14, fontWeight:800, color:T.white }}>{t('archive_title')}</div>
            <div style={{ fontSize:11, color:T.g1 }}>
              {maxDays}{lang === 'hi' ? ' दिन का इतिहास · ' : '-day history · '}
              {plan.charAt(0).toUpperCase()+plan.slice(1)} Plan ·
              {t('archive_subtitle')}
            </div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <div style={{ fontSize:10, color:T.amber, fontWeight:700,
              background:`${T.amber}15`, border:`1px solid ${T.amber}30`,
              padding:"4px 12px", borderRadius:6 }}>
              {total} {t('records')}
            </div>
            <button onClick={downloadCSV} disabled={downloading || total===0} style={{
              background:downloading||total===0?T.g2:`${T.teal}20`,
              border:`1px solid ${downloading||total===0?T.g2:T.teal}`,
              borderRadius:8, padding:"6px 14px", color:T.teal,
              fontSize:11, fontWeight:700, cursor:downloading||total===0?"not-allowed":"pointer",
            }}>
              {downloading ? t('exporting') : t('export_csv')}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div style={{ padding:16, background:T.card2, borderBottom:`1px solid ${T.border}` }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr", gap:10 }}>
            {[
              { key:'dateFrom', label:t('from_date'), type:'date', min:minDate, max:filters.dateTo },
              { key:'dateTo',   label:t('to_date'),   type:'date', min:filters.dateFrom, max:new Date().toISOString().split('T')[0] },
            ].map(f => (
              <div key={f.key}>
                <label style={{ fontSize:9, color:T.g1, display:"block", marginBottom:4, letterSpacing:1, fontWeight:700 }}>{f.label}</label>
                <input type="date" value={filters[f.key]} min={f.min} max={f.max}
                  onChange={e => setF(f.key, e.target.value)}
                  style={{ ...iStyle, width:"100%", boxSizing:"border-box" }}/>
              </div>
            ))}
            <div>
              <label style={{ fontSize:9, color:T.g1, display:"block", marginBottom:4, letterSpacing:1, fontWeight:700 }}>{t('category')}</label>
              <select value={filters.category} onChange={e => setF('category', e.target.value)}
                style={{ ...iStyle, width:"100%", boxSizing:"border-box" }}>
                <option value="">{t('all_categories')}</option>
                <option value="ppe">{lang === 'hi' ? 'PPE उल्लंघन' : 'PPE Violation'}</option>
                <option value="pathway">{lang === 'hi' ? 'रास्ता' : 'Pathway'}</option>
                <option value="unsafe">{lang === 'hi' ? 'असुरक्षित कार्य' : 'Unsafe Act'}</option>
                <option value="accident">{lang === 'hi' ? 'दुर्घटना' : 'Accident'}</option>
                <option value="nearmiss">{lang === 'hi' ? 'बाल-बाल बचाव' : 'Near Miss'}</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize:9, color:T.g1, display:"block", marginBottom:4, letterSpacing:1, fontWeight:700 }}>{t('severity')}</label>
              <select value={filters.severity} onChange={e => setF('severity', e.target.value)}
                style={{ ...iStyle, width:"100%", boxSizing:"border-box" }}>
                <option value="">{t('all_severity')}</option>
                <option value="critical">{lang === 'hi' ? 'अति गंभीर' : 'Critical'}</option>
                <option value="high">{lang === 'hi' ? 'उच्च' : 'High'}</option>
                <option value="medium">{lang === 'hi' ? 'मध्यम' : 'Medium'}</option>
                <option value="low">{lang === 'hi' ? 'निम्न' : 'Low'}</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize:9, color:T.g1, display:"block", marginBottom:4, letterSpacing:1, fontWeight:700 }}>{t('camera_id')}</label>
              <input placeholder="e.g. cam-01" value={filters.camera}
                onChange={e => setF('camera', e.target.value)}
                style={{ ...iStyle, width:"100%", boxSizing:"border-box" }}/>
            </div>
          </div>

          {/* Quick date filters */}
          <div style={{ display:"flex", gap:6, marginTop:10 }}>
            {[
              { label: lang === 'hi' ? 'आज' : 'Today',    days:0  },
              { label: lang === 'hi' ? '7 दिन' : '7 Days', days:7  },
              { label: lang === 'hi' ? '14 दिन' : '14 Days', days:14 },
              { label: lang === 'hi' ? '30 दिन' : '30 Days', days:30 },
              ...(maxDays >= 90 ? [{ label: lang === 'hi' ? '90 दिन' : '90 Days', days:90 }] : []),
            ].map(({ label, days }) => {
              const from = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
              const active = filters.dateFrom === from && filters.dateTo === new Date().toISOString().split('T')[0];
              return (
                <button key={label} onClick={() => {
                  setFilters(p => ({...p, dateFrom:from, dateTo:new Date().toISOString().split('T')[0]}));
                  setPage(1);
                }} style={{
                  padding:"4px 12px", borderRadius:6, fontSize:10, fontWeight:700,
                  border:`1px solid ${active ? T.orange : T.border}`,
                  background:active ? `${T.orange}20` : "none",
                  color:active ? T.orange : T.g1, cursor:"pointer",
                }}>{label}</button>
              );
            })}
            <div style={{ marginLeft:"auto", fontSize:11, color:T.g2, alignSelf:"center" }}>
              {t('max_history')}: <span style={{ color:T.amber, fontWeight:700 }}>{maxDays} {lang === 'hi' ? 'दिन' : 'days'}</span>
              {maxDays < 90 && <span style={{ color:T.g2 }}> · {t('upgrade_plan')}</span>}
            </div>
          </div>
        </div>

        {/* Table */}
        <div style={{ padding:16 }}>
          {error && (
            <div style={{ padding:"10px 14px", background:`${T.red}10`, border:`1px solid ${T.red}30`,
              borderRadius:8, fontSize:12, color:T.red, marginBottom:12 }}>⚠ {error}</div>
          )}

          {loading ? (
            <div style={{ textAlign:"center", padding:"40px 0", color:T.g1 }}>
              <div style={{ width:32, height:32, border:`2px solid ${T.border}`,
                borderTopColor:T.orange, borderRadius:"50%",
                animation:"spin .8s linear infinite", margin:"0 auto 12px" }}/>
              {t('loading')}
            </div>
          ) : violations.length === 0 ? (
            <div style={{ textAlign:"center", padding:"40px 0", color:T.g2 }}>
              <div style={{ fontSize:32, marginBottom:8 }}>✅</div>
              <div style={{ fontSize:14, fontWeight:700, color:T.g1, marginBottom:4 }}>{t('no_violations')}</div>
              <div style={{ fontSize:12 }}>{lang === 'hi' ? 'तारीख या फ़िल्टर बदलकर देखें' : 'Try adjusting the date range or filters'}</div>
            </div>
          ) : (
            <>
              <div style={{ display:"grid", gridTemplateColumns:"140px 90px 80px 80px 1fr 120px 36px",
                gap:8, padding:"8px 12px", fontSize:9, color:T.g2, fontWeight:700, letterSpacing:1 }}>
                <div>{lang === 'hi' ? 'दिनांक और समय' : 'DATE & TIME'}</div>
                <div>{lang === 'hi' ? 'कैमरा' : 'CAMERA'}</div>
                <div>{lang === 'hi' ? 'श्रेणी' : 'CATEGORY'}</div>
                <div>{lang === 'hi' ? 'गंभीरता' : 'SEVERITY'}</div>
                <div>{lang === 'hi' ? 'उल्लंघन' : 'VIOLATION'}</div>
                <div>{lang === 'hi' ? 'आत्मविश्वास' : 'CONFIDENCE'}</div>
                <div></div>
              </div>

              {violations.map((v, i) => {
                const cat = v.category || 'ppe';
                const sev = v.severity || 'high';
                const cc  = CAT_COLOR[cat] || T.red;
                const sc  = SEV_COLOR[sev] || T.amber;
                const isExp = expanded === i;
                return (
                  <div key={v.id || i}>
                    <div onClick={() => setExpanded(isExp ? null : i)}
                      style={{ display:"grid", gridTemplateColumns:"140px 90px 80px 80px 1fr 120px 36px",
                        gap:8, padding:"10px 12px", cursor:"pointer",
                        background:isExp ? `${cc}08` : i%2===0 ? T.card2 : "transparent",
                        border:`1px solid ${isExp ? cc+'30' : "transparent"}`,
                        borderRadius:8, marginBottom:2, transition:"all .15s" }}>
                      <div style={{ fontSize:11, color:T.g1, fontFamily:"'DM Mono'" }}>
                        {v.occurred_at ? new Date(v.occurred_at).toLocaleString('en-IN', {
                          day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit', hour12:true }) : "—"}
                      </div>
                      <div style={{ fontSize:11, color:T.white, fontWeight:600,
                        overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {v.camera_id || v.violation_cam || "—"}
                      </div>
                      <div style={{ fontSize:10, fontWeight:700, color:cc }}>{CAT_LABEL[cat] || cat}</div>
                      <div style={{ fontSize:10, fontWeight:700, color:sc, textTransform:"uppercase" }}>{sev}</div>
                      <div style={{ fontSize:12, color:T.white, fontWeight:600,
                        overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        <span style={{ marginRight:6 }}>{PPE_ICONS[v.violation_type] || "⚠️"}</span>
                        {v.violation_type || "—"}
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                        <div style={{ flex:1, height:4, background:T.border, borderRadius:2 }}>
                          <div style={{ height:"100%", borderRadius:2, width:`${v.confidence || 0}%`,
                            background:v.confidence >= 90 ? T.green : v.confidence >= 70 ? T.amber : T.red }}/>
                        </div>
                        <span style={{ fontSize:10, color:T.g1, fontFamily:"'DM Mono'", minWidth:32 }}>
                          {v.confidence || 0}%
                        </span>
                      </div>
                      <div style={{ color:T.g2, fontSize:14 }}>{isExp ? "▲" : "▼"}</div>
                    </div>
                    {isExp && (
                      <ExpandedViolation v={v} cc={cc} lang={lang} />
                    )}
                  </div>
                );
              })}

              {totalPages > 1 && (
                <div style={{ display:"flex", justifyContent:"center", alignItems:"center", gap:8, marginTop:16 }}>
                  <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}
                    style={{ background:"none", border:`1px solid ${T.border}`, borderRadius:6,
                      padding:"5px 12px", color:T.g1, fontSize:12, cursor:page===1?"not-allowed":"pointer" }}>
                    {lang === 'hi' ? '← पिछला' : '← Prev'}
                  </button>
                  <span style={{ fontSize:12, color:T.g1 }}>
                    {lang === 'hi' ? 'पृष्ठ' : 'Page'} <span style={{ color:T.white, fontWeight:700 }}>{page}</span> {lang === 'hi' ? 'का' : 'of'} {totalPages}
                    <span style={{ color:T.g2 }}> ({total} {t('records')})</span>
                  </span>
                  <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages}
                    style={{ background:"none", border:`1px solid ${T.border}`, borderRadius:6,
                      padding:"5px 12px", color:T.g1, fontSize:12, cursor:page===totalPages?"not-allowed":"pointer" }}>
                    {lang === 'hi' ? 'अगला →' : 'Next →'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
