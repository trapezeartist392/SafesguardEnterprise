/**
 * Form18Generator.jsx — with Hindi/English support
 */
import { useState } from 'react';
import axios from 'axios';
import { useLang } from '../i18n/LanguageContext';

const T = {
  bg:"#05080F", card:"#0C1422", card2:"#101828",
  border:"#1A2540", orange:"#FF5B18", white:"#EDF2FF",
  g1:"#8899BB", g2:"#3A4E72", green:"#22D468",
  red:"#FF3D3D", amber:"#FFB400", teal:"#00D4B4",
};

export default function Form18Generator({ violationId = null, prefill = {} }) {
  const { t, lang } = useLang();
  const [form,     setForm]     = useState({ severity:"serious", sex:"Male", employment_type:"Permanent", ...prefill });
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState(false);
  const [expanded, setExpanded] = useState(true);

  const token = localStorage.getItem('safeg_token') || sessionStorage.getItem('safeg_token') || '';
  const set   = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const FIELDS = [
    { section: t('factory_details'), fields:[
      { key:"factory_name",     label: lang==='hi'?"फैक्ट्री का नाम":"Factory / Company Name",       required:true },
      { key:"factory_address",  label: lang==='hi'?"फैक्ट्री का पता":"Factory Address",               required:true },
      { key:"registration_no",  label: lang==='hi'?"पंजीकरण संख्या":"Factory Registration Number",   required:true },
      { key:"industry_type",    label: lang==='hi'?"उद्योग का प्रकार":"Type of Industry",              required:true },
    ]},
    { section: t('accident_details'), fields:[
      { key:"accident_date",    label: lang==='hi'?"दुर्घटना की तारीख":"Date of Accident (DD/MM/YYYY)", required:true },
      { key:"accident_time",    label: lang==='hi'?"दुर्घटना का समय":"Time of Accident",               required:true },
      { key:"accident_location",label: lang==='hi'?"स्थान / क्षेत्र":"Location / Zone",               required:true },
      { key:"shift",            label: lang==='hi'?"शिफ्ट":"Shift",                                    required:false },
      { key:"nature_of_injury", label: lang==='hi'?"चोट का विवरण":"Nature / Description of Accident", required:true, multiline:true },
      { key:"machine_involved", label: lang==='hi'?"मशीन का नाम":"Machine / Equipment Involved",       required:false },
      { key:"cause_of_accident",label: lang==='hi'?"दुर्घटना का कारण":"Cause of Accident",             required:true, multiline:true },
      { key:"severity",         label: lang==='hi'?"गंभीरता":"Severity",                               required:true, type:"select",
        options:[{v:"minor",l:lang==='hi'?"मामूली":"Minor"},{v:"serious",l:lang==='hi'?"गंभीर":"Serious"},{v:"fatal",l:lang==='hi'?"घातक":"Fatal"}] },
    ]},
    { section: t('injured_person'), fields:[
      { key:"injured_name",     label: lang==='hi'?"पूरा नाम":"Full Name of Injured Person",           required:true },
      { key:"age",              label: lang==='hi'?"आयु":"Age",                                         required:true },
      { key:"sex",              label: lang==='hi'?"लिंग":"Sex",                                        required:false, type:"select",
        options:[{v:"Male",l:lang==='hi'?"पुरुष":"Male"},{v:"Female",l:lang==='hi'?"महिला":"Female"},{v:"Other",l:lang==='hi'?"अन्य":"Other"}] },
      { key:"designation",      label: lang==='hi'?"पदनाम":"Designation",                              required:true },
      { key:"department",       label: lang==='hi'?"विभाग":"Department",                               required:false },
      { key:"body_part",        label: lang==='hi'?"घायल अंग":"Body Part Injured",                     required:false },
    ]},
    { section: t('medical'), fields:[
      { key:"first_aid_given",  label: lang==='hi'?"प्राथमिक उपचार दिया":"First Aid Given",            required:false },
      { key:"hospital_name",    label: lang==='hi'?"अस्पताल का नाम":"Hospital / Medical Centre",       required:false },
      { key:"doctor_name",      label: lang==='hi'?"डॉक्टर का नाम":"Doctor Name",                      required:false },
    ]},
    { section: t('actions'), fields:[
      { key:"immediate_action_taken", label: lang==='hi'?"तत्काल कार्रवाई":"Immediate Action Taken",  required:true, multiline:true },
      { key:"corrective_action",      label: lang==='hi'?"सुधारात्मक कार्रवाई":"Corrective Action",   required:false, multiline:true },
      { key:"preventive_action",      label: lang==='hi'?"निवारक कार्रवाई":"Preventive Action",       required:false, multiline:true },
      { key:"action_target_date",     label: lang==='hi'?"लक्ष्य तिथि":"Target Completion Date",       required:false },
    ]},
    { section: t('reporting'), fields:[
      { key:"manager_name",           label: lang==='hi'?"प्रबंधक का नाम":"Manager / EHS Officer Name", required:true },
      { key:"manager_designation",    label: lang==='hi'?"पदनाम":"Designation",                         required:false },
      { key:"inspector_jurisdiction", label: lang==='hi'?"फैक्ट्री निरीक्षक क्षेत्र":"Inspector of Factories — Jurisdiction", required:false },
    ]},
  ];

  const iStyle = {
    width:"100%", background:"#06090F", border:`1px solid ${T.border}`, borderRadius:8,
    padding:"9px 12px", color:T.white, fontSize:12,
    fontFamily:"'Nunito',sans-serif", outline:"none", boxSizing:"border-box",
  };

  const generate = async () => {
    const missing = [];
    FIELDS.forEach(sec => sec.fields.forEach(f => {
      if (f.required && !form[f.key]) missing.push(f.label);
    }));
    if (missing.length > 0) {
      setError((lang==='hi'?'आवश्यक फ़ील्ड खाली हैं: ':'Required fields missing: ') + missing.slice(0,3).join(', '));
      return;
    }
    setLoading(true); setError(''); setSuccess(false);
    try {
      const payload = { ...form };
      if (violationId) payload.violation_id = violationId;
      const res = await axios.post('/api/v1/form18/generate', payload, {
        headers: { Authorization: `Bearer ${token}` }, responseType: 'blob',
      });
      const url  = URL.createObjectURL(new Blob([res.data], { type:'application/pdf' }));
      const link = document.createElement('a');
      link.href  = url;
      link.download = `FORM18-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      setSuccess(true);
    } catch(e) {
      setError(e.response?.data?.message || e.message || 'Failed to generate PDF');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ fontFamily:"'Nunito',sans-serif", marginBottom:20 }}>
      <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:16, overflow:"hidden" }}>
        {/* Header */}
        <div style={{ background:T.bg, padding:"16px 20px", display:"flex", alignItems:"center",
          gap:12, borderBottom:`1px solid ${T.border}`, cursor:"pointer" }}
          onClick={() => setExpanded(e => !e)}>
          <span style={{ fontSize:20 }}>📋</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14, fontWeight:800, color:T.white }}>{t('form18_title')}</div>
            <div style={{ fontSize:11, color:T.g1 }}>{t('form18_subtitle')}</div>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <div style={{ fontSize:10, color:T.amber, fontWeight:700,
              background:`${T.amber}15`, border:`1px solid ${T.amber}30`,
              padding:"3px 10px", borderRadius:6 }}>
              {t('submit_deadline')}
            </div>
            <span style={{ color:T.g1, fontSize:14 }}>{expanded?"▲":"▼"}</span>
          </div>
        </div>

        {expanded && (
          <div style={{ padding:20 }}>
            {FIELDS.map((section, si) => (
              <div key={si} style={{ marginBottom:20 }}>
                <div style={{ fontSize:11, color:T.orange, fontWeight:800,
                  letterSpacing:1.5, marginBottom:12,
                  borderBottom:`1px solid ${T.border}`, paddingBottom:6 }}>
                  {section.section.toUpperCase()}
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  {section.fields.map(f => (
                    <div key={f.key} style={{ gridColumn: f.multiline ? "1 / -1" : "auto" }}>
                      <label style={{ fontSize:10, color:T.g1, display:"block",
                        marginBottom:5, letterSpacing:1, fontWeight:700 }}>
                        {f.label.toUpperCase()}
                        {f.required && <span style={{ color:T.red }}> *</span>}
                      </label>
                      {f.type === "select" ? (
                        <select value={form[f.key]||""} onChange={e => set(f.key, e.target.value)} style={iStyle}>
                          {f.options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                        </select>
                      ) : f.multiline ? (
                        <textarea value={form[f.key]||""} onChange={e => set(f.key, e.target.value)}
                          rows={3} style={{ ...iStyle, resize:"vertical" }}/>
                      ) : (
                        <input value={form[f.key]||""} onChange={e => set(f.key, e.target.value)} style={iStyle}/>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {error && <div style={{ marginBottom:12, padding:"10px 14px", background:`${T.red}10`,
              border:`1px solid ${T.red}30`, borderRadius:8, fontSize:12, color:T.red }}>⚠ {error}</div>}
            {success && <div style={{ marginBottom:12, padding:"10px 14px", background:`${T.green}10`,
              border:`1px solid ${T.green}30`, borderRadius:8, fontSize:12, color:T.green }}>
              ✅ {lang==='hi'?'फॉर्म 18 PDF डाउनलोड हो गई।':'Form 18 PDF downloaded successfully.'}
            </div>}

            <button onClick={generate} disabled={loading} style={{
              width:"100%", border:"none", borderRadius:10, padding:"14px",
              color:"#fff", fontSize:14, fontWeight:800, fontFamily:"'Nunito',sans-serif",
              background:loading ? T.g2 : `linear-gradient(135deg,${T.orange},#FF8C52)`,
              cursor:loading?"not-allowed":"pointer",
              display:"flex", alignItems:"center", justifyContent:"center", gap:10,
            }}>
              {loading ? (
                <><div style={{ width:18, height:18, border:"2px solid rgba(255,255,255,.3)",
                  borderTopColor:"#fff", borderRadius:"50%", animation:"spin .8s linear infinite" }}/>{t('generating')}</>
              ) : (
                <><span style={{ fontSize:18 }}>📄</span>{t('generate_pdf')}</>
              )}
            </button>
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
