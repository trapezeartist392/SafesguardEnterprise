/**
 * MultiPlantDashboard.jsx
 * SafeguardIQ Enterprise — Multi-Plant Dashboard (Enterprise Plan)
 * Place in: frontend/src/components/MultiPlantDashboard.jsx
 */
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useLang } from '../i18n/LanguageContext';

const T = {
  bg:"#05080F", card:"#0C1422", card2:"#101828",
  border:"#1A2540", orange:"#FF5B18", teal:"#00D4B4",
  blue:"#2D8EFF", white:"#EDF2FF", g1:"#8899BB", g2:"#3A4E72",
  green:"#22D468", red:"#FF3D3D", amber:"#FFB400",
};

const RISK_COLOR = {
  safe:"#22D468", low:"#22D468", medium:"#FFB400",
  high:"#FF3D3D", critical:"#FF0000",
};

function StatBox({ label, value, color = T.orange }) {
  return (
    <div style={{ textAlign:"center", padding:"14px 10px",
      background:T.card, border:`1px solid ${T.border}`, borderRadius:10 }}>
      <div style={{ fontSize:24, fontWeight:800, color,
        fontFamily:"'Bebas Neue',sans-serif", lineHeight:1, marginBottom:4 }}>
        {value ?? 0}
      </div>
      <div style={{ fontSize:9, color:T.g2, letterSpacing:1 }}>{label}</div>
    </div>
  );
}

export default function MultiPlantDashboard() {
  const { t, lang } = useLang();
  const [plants,      setPlants]      = useState([]);
  const [selected,    setSelected]    = useState(null);
  const [plantData,   setPlantData]   = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [loadingPlant,setLoadingPlant]= useState(false);
  const [error,       setError]       = useState('');
  const [expanded,    setExpanded]    = useState(true);

  const token    = localStorage.getItem('safeg_token') || '';
  const plan     = localStorage.getItem('safeg_plan') || 'starter';
  const isEnterprise = plan === 'enterprise' || plan === 'professional';

  // Fetch all plants
  useEffect(() => {
    const fetchPlants = async () => {
      setLoading(true);
      try {
        const res = await axios.get('/api/v1/plants', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const list = res.data.data || res.data.plants || [];
        setPlants(list);
        if (list.length > 0) setSelected(list[0].id);
      } catch(e) {
        setError(e.response?.data?.message || 'Failed to load plants');
      } finally { setLoading(false); }
    };
    fetchPlants();
  }, []);

  // Fetch selected plant dashboard
  useEffect(() => {
    if (!selected) return;
    const fetchPlantData = async () => {
      setLoadingPlant(true);
      try {
        const res = await axios.get(`/api/v1/plants/${selected}/dashboard`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPlantData(res.data.data || res.data);
      } catch(e) {
        setPlantData(null);
      } finally { setLoadingPlant(false); }
    };
    fetchPlantData();
    const interval = setInterval(fetchPlantData, 30000);
    return () => clearInterval(interval);
  }, [selected]);

  const selectedPlant = plants.find(p => p.id === selected);

  return (
    <div style={{ fontFamily:"'Nunito',sans-serif", marginBottom:20 }}>
      <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:16, overflow:"hidden" }}>

        {/* Header */}
        <div style={{ background:T.bg, padding:"16px 20px",
          borderBottom:`1px solid ${T.border}`,
          display:"flex", alignItems:"center", gap:12, cursor:"pointer" }}
          onClick={() => setExpanded(e => !e)}>
          <span style={{ fontSize:20 }}>🏭</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14, fontWeight:800, color:T.white }}>
              {lang === 'hi' ? 'मल्टी-प्लांट डैशबोर्ड' : 'Multi-Plant Dashboard'}
            </div>
            <div style={{ fontSize:11, color:T.g1 }}>
              {lang === 'hi'
                ? `${plants.length} प्लांट निगरानी में · Enterprise Plan`
                : `${plants.length} plants monitored · Enterprise Plan`}
            </div>
          </div>

          {/* Plant-level KPIs */}
          <div style={{ display:"flex", gap:16, marginRight:8 }}>
            {[
              { label: lang==='hi'?"प्लांट":"PLANTS",     val:plants.length,     color:T.teal },
              { label: lang==='hi'?"कुल उल्लंघन":"VIOLATIONS", val:plants.reduce((s,p) => s+(p.violations_today||0),0), color:T.red },
            ].map(({ label, val, color }) => (
              <div key={label} style={{ textAlign:"center" }}>
                <div style={{ fontSize:24, fontWeight:800, color,
                  fontFamily:"'Bebas Neue'", lineHeight:1 }}>{val}</div>
                <div style={{ fontSize:9, color:T.g2, letterSpacing:1 }}>{label}</div>
              </div>
            ))}
          </div>

          {!isEnterprise && (
            <div style={{ fontSize:10, color:T.amber, fontWeight:700,
              background:`${T.amber}15`, border:`1px solid ${T.amber}30`,
              padding:"4px 12px", borderRadius:6 }}>
              {lang === 'hi' ? 'Enterprise में अपग्रेड करें' : 'Upgrade to Enterprise'}
            </div>
          )}
          <span style={{ color:T.g1, fontSize:14 }}>{expanded?"▲":"▼"}</span>
        </div>

        {expanded && (
          <div style={{ padding:16 }}>
            {!isEnterprise ? (
              <div style={{ textAlign:"center", padding:"40px 20px" }}>
                <div style={{ fontSize:48, marginBottom:16 }}>🏭</div>
                <div style={{ fontSize:18, fontWeight:800, color:T.white, marginBottom:8 }}>
                  {lang === 'hi' ? 'Enterprise Plan आवश्यक है' : 'Enterprise Plan Required'}
                </div>
                <div style={{ fontSize:13, color:T.g1, marginBottom:20, maxWidth:400, margin:"0 auto 20px" }}>
                  {lang === 'hi'
                    ? 'मल्टी-प्लांट डैशबोर्ड Enterprise plan में उपलब्ध है। एक ही स्क्रीन से सभी प्लांट की निगरानी करें।'
                    : 'Monitor all your plants from a single dashboard. Available on the Enterprise plan (17+ cameras).'}
                </div>
                <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap", marginBottom:24 }}>
                  {[
                    lang==='hi'?"✓ सभी प्लांट एक जगह":"✓ All plants in one view",
                    lang==='hi'?"✓ तुलनात्मक अनुपालन":"✓ Comparative compliance",
                    lang==='hi'?"✓ क्रॉस-प्लांट रिपोर्ट":"✓ Cross-plant reports",
                    lang==='hi'?"✓ केंद्रीकृत अलर्ट":"✓ Centralized alerts",
                  ].map(f => (
                    <div key={f} style={{ fontSize:12, color:T.teal,
                      background:`${T.teal}10`, border:`1px solid ${T.teal}25`,
                      padding:"6px 14px", borderRadius:20 }}>{f}</div>
                  ))}
                </div>
                <button style={{
                  background:`linear-gradient(135deg,${T.orange},#FF8C52)`,
                  border:"none", borderRadius:10, padding:"12px 32px",
                  color:"#fff", fontSize:14, fontWeight:800, cursor:"pointer",
                }}>
                  {lang === 'hi' ? 'Enterprise में अपग्रेड करें →' : 'Upgrade to Enterprise →'}
                </button>
              </div>
            ) : loading ? (
              <div style={{ textAlign:"center", padding:"40px 0", color:T.g1 }}>
                <div style={{ width:32, height:32, border:`2px solid ${T.border}`,
                  borderTopColor:T.orange, borderRadius:"50%",
                  animation:"spin .8s linear infinite", margin:"0 auto 12px" }}/>
                {lang === 'hi' ? 'प्लांट लोड हो रहे हैं...' : 'Loading plants...'}
              </div>
            ) : plants.length === 0 ? (
              <div style={{ textAlign:"center", padding:"40px 0", color:T.g2 }}>
                <div style={{ fontSize:32, marginBottom:8 }}>🏭</div>
                <div style={{ fontSize:14, color:T.g1 }}>
                  {lang === 'hi' ? 'कोई प्लांट नहीं मिला' : 'No plants found — add plants in Settings'}
                </div>
              </div>
            ) : (
              <div style={{ display:"grid", gridTemplateColumns:"240px 1fr", gap:16 }}>

                {/* Plant list sidebar */}
                <div>
                  <div style={{ fontSize:10, color:T.g2, fontWeight:700,
                    letterSpacing:1.5, marginBottom:10 }}>
                    {lang === 'hi' ? 'सभी प्लांट' : 'ALL PLANTS'}
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                    {plants.map(plant => {
                      const isSelected = selected === plant.id;
                      const riskColor  = RISK_COLOR[plant.risk_level || 'safe'] || T.green;
                      return (
                        <div key={plant.id} onClick={() => setSelected(plant.id)}
                          style={{ padding:"12px 14px", borderRadius:10, cursor:"pointer",
                            background:isSelected ? `${T.orange}15` : T.card2,
                            border:`1px solid ${isSelected ? T.orange : T.border}`,
                            transition:"all .15s" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                            <div style={{ width:8, height:8, borderRadius:"50%",
                              background:riskColor, flexShrink:0 }}/>
                            <div style={{ fontSize:13, fontWeight:700,
                              color:isSelected ? T.orange : T.white,
                              overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                              {plant.plant_name || plant.name}
                            </div>
                          </div>
                          <div style={{ fontSize:10, color:T.g2, marginLeft:16 }}>
                            {plant.city || plant.location || ''} ·{' '}
                            {plant.camera_count || 0} {lang==='hi'?'कैमरे':'cams'}
                          </div>
                          <div style={{ display:"flex", gap:6, marginTop:6, marginLeft:16 }}>
                            <div style={{ fontSize:9, fontWeight:700, color:T.red,
                              background:`${T.red}15`, padding:"2px 8px", borderRadius:4 }}>
                              {plant.violations_today || 0} {lang==='hi'?'उल्लंघन':'violations'}
                            </div>
                            <div style={{ fontSize:9, fontWeight:700, color:riskColor,
                              background:`${riskColor}15`, padding:"2px 8px", borderRadius:4 }}>
                              {(plant.risk_level || 'safe').toUpperCase()}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Plant detail */}
                <div>
                  {loadingPlant ? (
                    <div style={{ textAlign:"center", padding:"60px 0", color:T.g1 }}>
                      <div style={{ width:28, height:28, border:`2px solid ${T.border}`,
                        borderTopColor:T.orange, borderRadius:"50%",
                        animation:"spin .8s linear infinite", margin:"0 auto 10px" }}/>
                    </div>
                  ) : selectedPlant ? (
                    <div>
                      {/* Plant header */}
                      <div style={{ marginBottom:16 }}>
                        <div style={{ fontSize:18, fontWeight:800, color:T.white, marginBottom:4 }}>
                          {selectedPlant.plant_name || selectedPlant.name}
                        </div>
                        <div style={{ fontSize:12, color:T.g1 }}>
                          {selectedPlant.address || selectedPlant.city || ''} ·{' '}
                          {lang==='hi'?'पंजीकरण:':'Reg:'} {selectedPlant.registration_no || '—'}
                        </div>
                      </div>

                      {/* KPI grid */}
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:10, marginBottom:16 }}>
                        <StatBox label={lang==='hi'?"आज के उल्लंघन":"TODAY'S VIOLATIONS"}
                          value={plantData?.violations_today || selectedPlant.violations_today || 0}
                          color={T.red}/>
                        <StatBox label={lang==='hi'?"अनुपालन दर":"COMPLIANCE %"}
                          value={`${plantData?.compliance_rate || 0}%`}
                          color={T.green}/>
                        <StatBox label={lang==='hi'?"सक्रिय कैमरे":"ACTIVE CAMERAS"}
                          value={plantData?.active_cameras || selectedPlant.camera_count || 0}
                          color={T.teal}/>
                        <StatBox label={lang==='hi'?"जोखिम स्तर":"RISK LEVEL"}
                          value={(plantData?.risk_level || selectedPlant.risk_level || 'SAFE').toUpperCase()}
                          color={RISK_COLOR[plantData?.risk_level || 'safe']}/>
                      </div>

                      {/* Areas */}
                      {plantData?.areas?.length > 0 && (
                        <div style={{ marginBottom:16 }}>
                          <div style={{ fontSize:10, color:T.g2, fontWeight:700,
                            letterSpacing:1.5, marginBottom:10 }}>
                            {lang==='hi'?'क्षेत्र-वार स्थिति':'ZONE-WISE STATUS'}
                          </div>
                          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                            {plantData.areas.map(area => {
                              const rc = RISK_COLOR[area.risk_level || 'safe'];
                              return (
                                <div key={area.id} style={{ padding:"12px 14px",
                                  background:T.card2, border:`1px solid ${T.border}`,
                                  borderRadius:10, borderLeft:`3px solid ${rc}` }}>
                                  <div style={{ fontSize:12, fontWeight:700,
                                    color:T.white, marginBottom:4 }}>{area.area_name}</div>
                                  <div style={{ display:"flex", gap:8 }}>
                                    <div style={{ fontSize:10, color:T.g1 }}>
                                      {area.camera_count || 0} {lang==='hi'?'कैमरे':'cams'}
                                    </div>
                                    <div style={{ fontSize:10, fontWeight:700, color:T.red }}>
                                      {area.violations_today || 0} {lang==='hi'?'उल्लंघन':'violations'}
                                    </div>
                                    <div style={{ fontSize:10, fontWeight:700, color:rc }}>
                                      {(area.risk_level || 'safe').toUpperCase()}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Recent violations */}
                      {plantData?.recent_violations?.length > 0 && (
                        <div>
                          <div style={{ fontSize:10, color:T.g2, fontWeight:700,
                            letterSpacing:1.5, marginBottom:10 }}>
                            {lang==='hi'?'हालिया उल्लंघन':'RECENT VIOLATIONS'}
                          </div>
                          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                            {plantData.recent_violations.slice(0,5).map((v,i) => (
                              <div key={i} style={{ display:"flex", alignItems:"center",
                                gap:12, padding:"10px 14px", background:T.card2,
                                border:`1px solid ${T.border}`, borderRadius:8 }}>
                                <div style={{ flex:1 }}>
                                  <div style={{ fontSize:12, fontWeight:700, color:T.red }}>
                                    {v.violation_type}
                                  </div>
                                  <div style={{ fontSize:10, color:T.g1 }}>
                                    {v.camera_id} · {new Date(v.detected_at).toLocaleString('en-IN')}
                                  </div>
                                </div>
                                <div style={{ fontSize:10, fontWeight:700,
                                  color:T.amber, textTransform:"uppercase" }}>
                                  {v.severity}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ textAlign:"center", padding:"40px 0", color:T.g2 }}>
                      {lang==='hi'?'प्लांट चुनें':'Select a plant to view details'}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
