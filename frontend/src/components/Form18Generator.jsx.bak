/**
 * Form18Generator.jsx
 * SafeguardsIQ — Factories Act Form 18 Generator
 * Place in: frontend/src/components/Form18Generator.jsx
 */

import { useState } from 'react';
import axios from 'axios';

const T = {
  bg:"#05080F", card:"#0C1422", card2:"#101828",
  border:"#1A2540", orange:"#FF5B18", white:"#EDF2FF",
  g1:"#8899BB", g2:"#3A4E72", green:"#22D468",
  red:"#FF3D3D", amber:"#FFB400", teal:"#00D4B4",
};

const FIELDS = [
  { section:"Factory Details", fields:[
    { key:"factory_name",        label:"Factory / Company Name",       required:true },
    { key:"factory_address",     label:"Factory Address",               required:true },
    { key:"registration_no",     label:"Factory Registration Number",   required:true },
    { key:"industry_type",       label:"Type of Industry",              required:true },
  ]},
  { section:"Accident Details", fields:[
    { key:"accident_date",       label:"Date of Accident (DD/MM/YYYY)", required:true },
    { key:"accident_time",       label:"Time of Accident",              required:true },
    { key:"accident_location",   label:"Location / Zone",               required:true },
    { key:"shift",               label:"Shift (General/Morning/Night)",  required:false },
    { key:"nature_of_injury",    label:"Nature / Description of Accident", required:true, multiline:true },
    { key:"machine_involved",    label:"Machine / Equipment Involved",  required:false },
    { key:"activity_at_time",    label:"Activity at Time of Accident",  required:false, multiline:true },
    { key:"cause_of_accident",   label:"Cause of Accident",             required:true, multiline:true },
    { key:"severity",            label:"Severity",                      required:true, type:"select",
      options:["minor","serious","fatal"] },
  ]},
  { section:"Injured Person", fields:[
    { key:"injured_name",        label:"Full Name of Injured Person",   required:true },
    { key:"age",                 label:"Age",                           required:true },
    { key:"sex",                 label:"Sex",                           required:false, type:"select", options:["Male","Female","Other"] },
    { key:"designation",         label:"Designation",                   required:true },
    { key:"department",          label:"Department",                    required:false },
    { key:"employment_type",     label:"Employment Type",               required:false, type:"select",
      options:["Permanent","Contract","Casual","Apprentice"] },
    { key:"body_part",           label:"Body Part Injured",             required:false },
  ]},
  { section:"Medical Treatment", fields:[
    { key:"first_aid_given",     label:"First Aid Given",               required:false },
    { key:"hospital_name",       label:"Hospital / Medical Centre",     required:false },
    { key:"doctor_name",         label:"Doctor Name",                   required:false },
  ]},
  { section:"Actions Taken", fields:[
    { key:"immediate_action_taken", label:"Immediate Action Taken",     required:true, multiline:true },
    { key:"corrective_action",      label:"Corrective Action (Short-term)", required:false, multiline:true },
    { key:"preventive_action",      label:"Preventive Action (Long-term)", required:false, multiline:true },
    { key:"action_target_date",     label:"Target Completion Date",     required:false },
  ]},
  { section:"Reporting Officer", fields:[
    { key:"manager_name",           label:"Manager / EHS Officer Name", required:true },
    { key:"manager_designation",    label:"Designation",                required:false },
    { key:"inspector_jurisdiction", label:"Inspector of Factories — Jurisdiction", required:false },
  ]},
];

const inputStyle = {
  width:"100%", background:"#06090F",
  border:`1px solid ${T.border}`, borderRadius:8,
  padding:"9px 12px", color:T.white, fontSize:12,
  fontFamily:"'Nunito',sans-serif", outline:"none",
  boxSizing:"border-box",
};

export default function Form18Generator({ violationId = null, prefill = {} }) {
  const [form,     setForm]     = useState({ severity:"serious", sex:"Male",
    employment_type:"Permanent", ...prefill });
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState(false);
  const [expanded, setExpanded] = useState(true);

  const token = localStorage.getItem('safeg_token') || sessionStorage.getItem('safeg_token') || '';

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const generate = async () => {
    // Validate required
    const missing = [];
    FIELDS.forEach(sec => sec.fields.forEach(f => {
      if (f.required && !form[f.key]) missing.push(f.label);
    }));
    if (missing.length > 0) {
      setError(`Required fields missing: ${missing.slice(0,3).join(', ')}${missing.length>3?' ...':''}`);
      return;
    }

    setLoading(true); setError(''); setSuccess(false);
    try {
      const payload = { ...form };
      if (violationId) payload.violation_id = violationId;

      const res = await axios.post('/api/v1/form18/generate', payload, {
        headers:      { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });

      // Download PDF
      const url      = URL.createObjectURL(new Blob([res.data], { type:'application/pdf' }));
      const link     = document.createElement('a');
      const reportNo = `FORM18-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
      link.href      = url;
      link.download  = `${reportNo}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      setSuccess(true);
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Failed to generate PDF');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ fontFamily:"'Nunito',sans-serif", marginBottom:20 }}>
      <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:16, overflow:"hidden" }}>

        {/* Header */}
        <div style={{ background:T.bg, padding:"16px 20px", display:"flex", alignItems:"center", gap:12,
          borderBottom:`1px solid ${T.border}`, cursor:"pointer" }}
          onClick={() => setExpanded(e => !e)}>
          <span style={{ fontSize:20 }}>📋</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14, fontWeight:800, color:T.white }}>Factories Act Form 18</div>
            <div style={{ fontSize:11, color:T.g1 }}>
              Accident Register — Section 88 &amp; 88A | Auto-filled from AI detection data
            </div>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <div style={{ fontSize:10, color:T.amber, fontWeight:700,
              background:`${T.amber}15`, border:`1px solid ${T.amber}30`,
              padding:"3px 10px", borderRadius:6 }}>
              Submit within 24–48 hrs of accident
            </div>
            <span style={{ color:T.g1, fontSize:14 }}>{expanded?"▲":"▼"}</span>
          </div>
        </div>

        {expanded && (
          <div style={{ padding:20 }}>

            {/* AI pre-fill notice */}
            {violationId && (
              <div style={{ marginBottom:16, padding:"10px 14px",
                background:`${T.teal}10`, border:`1px solid ${T.teal}30`,
                borderRadius:10, fontSize:12, color:T.teal }}>
                ✅ Form pre-filled from AI violation detection data (Violation ID: {violationId}).
                Review all fields before generating.
              </div>
            )}

            {/* Form sections */}
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
                        <select value={form[f.key]||""} onChange={e => set(f.key, e.target.value)}
                          style={{ ...inputStyle }}>
                          {f.options.map(o => (
                            <option key={o} value={o}>{o.charAt(0).toUpperCase()+o.slice(1)}</option>
                          ))}
                        </select>
                      ) : f.multiline ? (
                        <textarea value={form[f.key]||""} onChange={e => set(f.key, e.target.value)}
                          rows={3} style={{ ...inputStyle, resize:"vertical" }}/>
                      ) : (
                        <input value={form[f.key]||""} onChange={e => set(f.key, e.target.value)}
                          style={inputStyle}/>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Error / Success */}
            {error && (
              <div style={{ marginBottom:12, padding:"10px 14px",
                background:`${T.red}10`, border:`1px solid ${T.red}30`,
                borderRadius:8, fontSize:12, color:T.red }}>
                ⚠ {error}
              </div>
            )}
            {success && (
              <div style={{ marginBottom:12, padding:"10px 14px",
                background:`${T.green}10`, border:`1px solid ${T.green}30`,
                borderRadius:8, fontSize:12, color:T.green }}>
                ✅ Form 18 PDF downloaded successfully. Submit to Inspector of Factories within the required timeframe.
              </div>
            )}

            {/* Generate button */}
            <button onClick={generate} disabled={loading} style={{
              width:"100%", border:"none", borderRadius:10, padding:"14px",
              color:"#fff", fontSize:14, fontWeight:800,
              fontFamily:"'Nunito',sans-serif",
              background:loading ? T.g2 : `linear-gradient(135deg,${T.orange},#FF8C52)`,
              cursor:loading?"not-allowed":"pointer",
              display:"flex", alignItems:"center", justifyContent:"center", gap:10,
            }}>
              {loading ? (
                <><div style={{ width:18, height:18, border:"2px solid rgba(255,255,255,.3)",
                  borderTopColor:"#fff", borderRadius:"50%",
                  animation:"spin .8s linear infinite" }}/>Generating PDF...</>
              ) : (
                <><span style={{ fontSize:18 }}>📄</span>Generate &amp; Download Form 18 PDF</>
              )}
            </button>

            <div style={{ marginTop:10, fontSize:10, color:T.g2, textAlign:"center" }}>
              PDF includes AI detection evidence, violation photos, timestamps and corrective actions.
              Compliant with Factories Act 1948 Section 88 &amp; 88A.
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
