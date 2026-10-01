/**
 * SignupPage.jsx — Redesigned
 * SafeguardIQ Enterprise — Unified Signup + Free Trial Page
 *
 * Step 1: Company Details (5 fields only) → Two buttons:
 *   A) Free Trial → Onboarding → Dashboard
 *   B) Sign Up → Choose Plan → Pay → Onboarding → Dashboard
 */
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Nunito:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes gridMove{from{transform:translateY(0)}to{transform:translateY(60px)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes checkPop{0%{transform:scale(0)}70%{transform:scale(1.2)}100%{transform:scale(1)}}
input:focus,select:focus,textarea:focus{outline:2px solid #FF5B18!important;border-color:#FF5B18!important}
`;

const T = {
  bg:"#05080F", bg2:"#080D18", card:"#0C1422", card2:"#101828",
  border:"#1A2540", border2:"#243452",
  orange:"#FF5B18", teal:"#00D4B4", blue:"#2D8EFF",
  white:"#EDF2FF", g1:"#8899BB", g2:"#3A4E72",
  green:"#22D468", red:"#FF3D3D", amber:"#FFB400",
};

const inp = {
  width:"100%", background:"#06090F", border:`1px solid ${T.border}`,
  borderRadius:10, padding:"13px 14px", color:T.white, fontSize:13,
  fontFamily:"'Nunito'", outline:"none",
};

const PLANS = [
  {
    id:"starter", name:"STARTER", price:2500, cameras:"1–4",
    color:T.blue, badge:null,
    features:["Up to 4 cameras","30-day violation archive","WhatsApp alerts","Form 18 PDF","Basic compliance report"],
  },
  {
    id:"growth", name:"PROFESSIONAL", price:2000, cameras:"5–16",
    color:T.orange, badge:"⭐ MOST POPULAR",
    features:["5–16 cameras","90-day violation archive","WhatsApp + Email alerts","Form 18 PDF","Full compliance reports","ROI calculator","Multi-plant dashboard"],
  },
  {
    id:"enterprise", name:"ENTERPRISE", price:1600, cameras:"17–32",
    color:T.teal, badge:"🏆 BEST VALUE",
    features:["17–32 cameras","Unlimited archive","WhatsApp + SMS + Email","Dedicated CSM","Custom reports","99.5% SLA","On-site training"],
  },
];

/* ── Reusable Field component (must be outside StepCompany to avoid re-render focus loss) ── */
function Field({ label, required, children }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
      <label style={{ fontSize:11, color:T.g1, letterSpacing:1.5,
        fontWeight:700, fontFamily:"'Nunito'" }}>
        {label}{required && <span style={{ color:T.orange, marginLeft:3 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

/* ── STEP 1: Company Details (5 fields only) ─────────────────── */
function StepCompany({ form, setForm, onFreeTrial, onSignup, loading, error, setError }) {
  const F = (k, v) => { setForm(f => ({ ...f, [k]: v })); setError(""); };
  const [showPass, setShowPass] = useState(false);

  const validate = (requireConfirm = true) => {
    if (!form.companyName || !form.email || !form.password) {
      setError("Please fill all required fields"); return false;
    }
    if (form.password.length < 8) { setError("Password must be at least 8 characters"); return false; }
    if (requireConfirm && form.password !== form.confirmPass) {
      setError("Passwords do not match"); return false;
    }
    if (!form.agreeTerms) { setError("Please agree to the Terms of Service"); return false; }
    setError(""); return true;
  };

  const strength = !form.password ? null
    : form.password.length < 8   ? { label:"Too short", color:T.red,   w:"25%" }
    : form.password.length < 10  ? { label:"Weak",      color:T.red,   w:"45%" }
    : /[A-Z]/.test(form.password) && /[0-9]/.test(form.password) && form.password.length >= 12
                                  ? { label:"Strong",   color:T.green, w:"100%" }
    : /[A-Z]/.test(form.password) || /[0-9]/.test(form.password)
                                  ? { label:"Good",     color:T.teal,  w:"70%" }
                                  : { label:"Fair",     color:T.amber, w:"50%" };



  return (
    <div style={{ animation:"fadeUp .5s ease both" }}>

      {/* Header */}
      <div style={{ marginBottom:28, textAlign:"center" }}>
        <div style={{ fontFamily:"'Bebas Neue'", fontSize:34, color:T.white,
          letterSpacing:3, marginBottom:6 }}>
          CREATE YOUR ACCOUNT
        </div>
        <div style={{ color:T.g1, fontSize:13 }}>
          Set up in 30 seconds — no credit card for trial
        </div>
      </div>

      {/* Fields */}
      <div style={{ display:"flex", flexDirection:"column", gap:16, marginBottom:20 }}>

        {/* Company Name */}
        <Field label="Company Name" required>
          <input type="text" value={form.companyName||""}
            onChange={e=>F("companyName",e.target.value)}
            placeholder="Pune Auto Components Pvt Ltd"
            style={{...inp}}/>
        </Field>

        {/* Work Email */}
        <Field label="Work Email" required>
          <input type="email" value={form.email||""}
            onChange={e=>F("email",e.target.value)}
            placeholder="suresh@company.com"
            style={{...inp}}/>
        </Field>

        {/* Password + Confirm side by side */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          <Field label="Password" required>
            <div style={{ position:"relative" }}>
              <input
                type={showPass?"text":"password"}
                value={form.password||""}
                onChange={e=>F("password",e.target.value)}
                placeholder="Min. 8 characters"
                style={{...inp, paddingRight:40}}/>
              <button type="button" onClick={()=>setShowPass(p=>!p)}
                style={{ position:"absolute", right:12, top:"50%",
                  transform:"translateY(-50%)", background:"none",
                  border:"none", color:T.g2, cursor:"pointer", fontSize:14 }}>
                {showPass?"🙈":"👁️"}
              </button>
            </div>
            {strength && (
              <div style={{ marginTop:4 }}>
                <div style={{ height:3, background:T.border, borderRadius:3, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:strength.w, background:strength.color,
                    borderRadius:3, transition:"width .3s, background .3s" }}/>
                </div>
                <div style={{ fontSize:10, color:strength.color,
                  marginTop:3, fontWeight:700 }}>{strength.label}</div>
              </div>
            )}
          </Field>

          <Field label="Confirm Password" required>
            <input
              type={showPass?"text":"password"}
              value={form.confirmPass||""}
              onChange={e=>F("confirmPass",e.target.value)}
              placeholder="Re-enter password"
              style={{...inp,
                borderColor: form.confirmPass
                  ? form.confirmPass===form.password ? T.green : T.red
                  : T.border
              }}/>
            {form.confirmPass && (
              <div style={{ fontSize:10, marginTop:3, fontWeight:700,
                color:form.confirmPass===form.password?T.green:T.red }}>
                {form.confirmPass===form.password?"✓ Passwords match":"✗ Does not match"}
              </div>
            )}
          </Field>
        </div>

        {/* Phone — optional */}
        <Field label={<>Phone <span style={{color:T.g1,fontWeight:500,fontSize:11,letterSpacing:0,textTransform:"none"}}>— optional · 📱 Enter to get WhatsApp violation alerts</span></>}>
          <input
            type="tel" value={form.whatsapp||""}
            onChange={e=>F("whatsapp",e.target.value)}
            placeholder="+91 98765 43210"
            style={{...inp}}/>
          {form.whatsapp && (
            <label style={{ display:"flex", alignItems:"center", gap:8,
              cursor:"pointer", marginTop:6 }}>
              <input type="checkbox" checked={form.agreeWhatsapp||false}
                onChange={e=>F("agreeWhatsapp",e.target.checked)}
                style={{ width:14, height:14, accentColor:T.orange }}/>
              <span style={{ fontSize:11, color:T.g1 }}>
                I agree to receive safety alerts on this number
              </span>
            </label>
          )}
        </Field>

      </div>

      {/* Terms */}
      <div style={{ marginBottom:24 }}>
        <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer" }}>
          <input type="checkbox" checked={form.agreeTerms||false}
            onChange={e=>F("agreeTerms",e.target.checked)}
            style={{ width:15, height:15, accentColor:T.orange }}/>
          <span style={{ fontSize:12, color:T.g1 }}>
            I agree to the{" "}
            <a href="/terms" target="_blank"
              style={{ color:T.orange, textDecoration:"none", fontWeight:700 }}>
              Terms of Service
            </a>
          </span>
        </label>
      </div>

      {/* Primary CTA — Free Trial */}
      <button onClick={()=>{ if(validate(false)) onFreeTrial(); }}
        disabled={loading}
        style={{ width:"100%", border:"none", borderRadius:12, padding:"15px",
          color:"#fff", fontSize:15, fontWeight:800, cursor:"pointer",
          fontFamily:"'Nunito'", marginBottom:16,
          background:loading==='trial'?T.g2:`linear-gradient(135deg,${T.orange},#FF8C52)`,
          display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
        {loading==='trial'
          ? <><div style={{ width:18, height:18,
              border:"2px solid rgba(255,255,255,.3)",
              borderTopColor:"#fff", borderRadius:"50%",
              animation:"spin .8s linear infinite" }}/>Starting...</>
          : "🎁 Click here to enjoy 14 days free trial →"}
      </button>

      {/* Divider */}
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
        <div style={{ flex:1, height:1, background:T.border }}/>
        <span style={{ fontSize:11, color:T.g2, letterSpacing:2 }}>OR</span>
        <div style={{ flex:1, height:1, background:T.border }}/>
      </div>

      {/* Secondary option — Sign Up & Pay */}
      <div style={{ background:`${T.orange}08`, border:`1px solid ${T.orange}25`,
        borderRadius:14, padding:18, display:"flex",
        alignItems:"center", justifyContent:"space-between", gap:16,
        flexWrap:"wrap" }}>
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
            <span style={{ fontSize:18 }}>💳</span>
            <div style={{ fontFamily:"'Bebas Neue'", fontSize:18,
              color:T.orange, letterSpacing:2 }}>SIGN UP & PAY</div>
            <div style={{ fontSize:10, color:T.g2 }}>Activate instantly</div>
          </div>
          <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
            {["From ₹2,500/camera/month","Starter / Pro / Enterprise",
              "15% off annual billing","GST invoice included"].map(f=>(
              <div key={f} style={{ display:"flex", gap:5, alignItems:"center" }}>
                <span style={{ color:T.orange, fontSize:10 }}>✓</span>
                <span style={{ fontSize:11, color:T.g1 }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
        <button onClick={()=>{ if(validate()) onSignup(); }}
          disabled={loading}
          style={{ flexShrink:0, border:`1.5px solid ${T.orange}`, borderRadius:10,
            padding:"10px 20px", color:T.orange, fontSize:13, fontWeight:800,
            cursor:"pointer", fontFamily:"'Nunito'",
            background:`${T.orange}12`, whiteSpace:"nowrap",
            display:"flex", alignItems:"center", gap:6 }}>
          {loading==='signup'
            ? <><div style={{ width:14, height:14,
                border:`2px solid ${T.orange}44`,
                borderTopColor:T.orange, borderRadius:"50%",
                animation:"spin .8s linear infinite" }}/>...</>
            : "💳 Choose Plan & Pay →"}
        </button>
      </div>

    </div>
  );
}

/* ── SUCCESS SCREEN ───────────────────────────────────────────── */
function StepSuccess({ email }) {
  return (
    <div style={{ textAlign:"center", padding:"40px 0", animation:"fadeUp .5s ease both" }}>
      <div style={{ fontSize:64, marginBottom:16, animation:"checkPop .4s ease both" }}>✅</div>
      <div style={{ fontFamily:"'Bebas Neue'", fontSize:32, color:T.green,
        letterSpacing:2, marginBottom:8 }}>
        ACCOUNT ACTIVATED!
      </div>
      <div style={{ color:T.g1, fontSize:14, marginBottom:8 }}>
        Payment successful! Setting up your account...
      </div>
      <div style={{ color:T.g2, fontSize:12, marginBottom:20 }}>
        GST invoice will be emailed to{" "}
        <strong style={{ color:T.white }}>{email}</strong>
      </div>
      <div style={{ width:40, height:40, border:`3px solid ${T.border}`,
        borderTopColor:T.orange, borderRadius:"50%",
        animation:"spin .8s linear infinite", margin:"0 auto" }}/>
    </div>
  );
}

/* ── STEP 2: Choose Plan ─────────────────────────────────────── */
function StepChoosePlanAuto({ form, setForm, selectedPlan, setSelectedPlan,
  billing, setBilling, onNext, onBack, loading }) {
  const camCount = parseInt(form.cameraCount) || 1;

  const getAutoplan = (n) => {
    if (n <= 4)  return 'starter';
    if (n <= 16) return 'growth';
    return 'enterprise';
  };

  useEffect(() => { setSelectedPlan(getAutoplan(camCount)); }, [camCount]);
  useEffect(() => { if (billing !== 'monthly' && billing !== 'annual') setBilling('monthly'); }, [billing]);

  const plan = PLANS.find(p => p.id === selectedPlan) || PLANS[1];
  const pricePerCam   = billing === 'annual' ? Math.round(plan.price * 0.85) : plan.price;
  const totalMonthly  = pricePerCam * camCount;
  const totalWithGST  = Math.round(totalMonthly * 1.18);
  const totalAnnual   = Math.round(totalMonthly * 12 * 1.18);
  const displayTotal  = billing === 'annual' ? totalAnnual : totalWithGST;
  const displayLabel  = billing === 'annual' ? 'TOTAL / YEAR' : 'TOTAL / MONTH';

  return (
    <div style={{ animation:"fadeUp .5s ease both" }}>
      <div style={{ marginBottom:24 }}>
        <div style={{ fontFamily:"'Bebas Neue'", fontSize:32, color:T.white, letterSpacing:2 }}>
          CHOOSE YOUR PLAN
        </div>
        <div style={{ color:T.g1, fontSize:13, marginTop:4 }}>
          Enter number of cameras — plan auto-selected
        </div>
      </div>

      {/* Billing toggle */}
      <div style={{ display:"flex", justifyContent:"center", marginBottom:24 }}>
        <div style={{ background:T.card2, border:`1px solid ${T.border}`,
          borderRadius:10, padding:4, display:"flex" }}>
          {[{id:"monthly",label:"Monthly"},{id:"annual",label:"Annual (Save 15%)"}].map(b=>(
            <button key={b.id} onClick={()=>setBilling(b.id)} style={{
              padding:"8px 24px", borderRadius:8, fontSize:12, fontWeight:700,
              border:"none", cursor:"pointer", fontFamily:"'Nunito'",
              background:billing===b.id?T.orange:"transparent",
              color:billing===b.id?"#fff":T.g1, transition:"all .2s",
            }}>{b.label}</button>
          ))}
        </div>
      </div>

      {/* Camera slider */}
      <div style={{ background:T.card2, border:`1px solid ${T.border}`,
        borderRadius:14, padding:24, marginBottom:20 }}>
        <div style={{ fontSize:12, color:T.g1, fontWeight:700,
          letterSpacing:1.5, marginBottom:16 }}>
          HOW MANY CAMERAS DO YOU NEED?
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:16 }}>
          <button onClick={()=>setForm(f=>({...f,cameraCount:Math.max(1,camCount-1)}))}
            style={{ width:36, height:36, borderRadius:8, border:`1px solid ${T.border}`,
              background:T.card, color:T.white, fontSize:18, cursor:"pointer", flexShrink:0 }}>−</button>
          <div style={{ flex:1 }}>
            <input type="range" min={1} max={32} value={camCount}
              onChange={e=>setForm(f=>({...f,cameraCount:parseInt(e.target.value)}))}
              style={{ width:"100%", accentColor:T.orange, cursor:"pointer" }}/>
            <div style={{ display:"flex", justifyContent:"space-between",
              fontSize:9, color:T.g2, marginTop:4 }}>
              <span>1</span><span>4</span><span>16</span><span>32</span>
            </div>
          </div>
          <button onClick={()=>setForm(f=>({...f,cameraCount:Math.min(32,camCount+1)}))}
            style={{ width:36, height:36, borderRadius:8, border:`1px solid ${T.border}`,
              background:T.card, color:T.white, fontSize:18, cursor:"pointer", flexShrink:0 }}>+</button>
          <div style={{ background:T.card, border:`1px solid ${T.orange}`,
            borderRadius:10, padding:"8px 16px", minWidth:60, textAlign:"center" }}>
            <div style={{ fontSize:24, fontWeight:800, color:T.orange,
              fontFamily:"'Bebas Neue'" }}>{camCount}</div>
            <div style={{ fontSize:9, color:T.g2 }}>CAMERAS</div>
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"4fr 12fr 16fr", gap:4, marginTop:8 }}>
          {[
            {label:"STARTER",      range:"1–4",   color:T.blue,   active:camCount<=4},
            {label:"PROFESSIONAL", range:"5–16",  color:T.orange, active:camCount>4&&camCount<=16},
            {label:"ENTERPRISE",   range:"17–32", color:T.teal,   active:camCount>16},
          ].map(z=>(
            <div key={z.label} style={{ padding:"6px 8px", borderRadius:6, textAlign:"center",
              background:z.active?`${z.color}20`:T.card,
              border:`1px solid ${z.active?z.color:T.border}`, transition:"all .3s" }}>
              <div style={{ fontSize:9, fontWeight:800,
                color:z.active?z.color:T.g2, letterSpacing:1 }}>{z.label}</div>
              <div style={{ fontSize:9, color:z.active?z.color:T.g2 }}>{z.range} cams</div>
            </div>
          ))}
        </div>
      </div>

      {/* Selected plan card */}
      <div style={{ background:`${plan.color}10`, border:`2px solid ${plan.color}`,
        borderRadius:14, padding:24, marginBottom:20, position:"relative" }}>
        {plan.badge && (
          <div style={{ position:"absolute", top:-12, left:20,
            background:plan.color, color:"#fff", fontSize:10, fontWeight:800,
            padding:"3px 14px", borderRadius:20 }}>{plan.badge}</div>
        )}
        <div style={{ display:"flex", alignItems:"flex-start",
          justifyContent:"space-between", gap:20 }}>
          <div style={{ flex:1 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
              <div style={{ fontFamily:"'Bebas Neue'", fontSize:28,
                color:plan.color, letterSpacing:2 }}>{plan.name}</div>
              <div style={{ background:`${plan.color}20`, border:`1px solid ${plan.color}40`,
                borderRadius:20, padding:"3px 12px", fontSize:10,
                color:plan.color, fontWeight:700 }}>AUTO-SELECTED ✓</div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
              {plan.features.map(f=>(
                <div key={f} style={{ display:"flex", gap:6, alignItems:"flex-start" }}>
                  <span style={{ color:plan.color, fontSize:11, flexShrink:0, marginTop:1 }}>✓</span>
                  <span style={{ fontSize:11, color:T.g1 }}>{f}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:12,
            padding:16, minWidth:200, textAlign:"center", flexShrink:0 }}>
            <div style={{ fontSize:10, color:T.g2, letterSpacing:1, marginBottom:8 }}>
              PRICE BREAKDOWN
            </div>
            <div style={{ fontSize:13, color:T.g1, marginBottom:4 }}>
              {camCount} cams × ₹{pricePerCam.toLocaleString()}/cam
            </div>
            <div style={{ fontSize:13, color:T.g1, marginBottom:4 }}>
              = ₹{totalMonthly.toLocaleString()}/month
              {billing==='annual' && ` × 12`}
            </div>
            <div style={{ fontSize:11, color:T.g2, marginBottom:8 }}>+ 18% GST</div>
            <div style={{ height:1, background:T.border, marginBottom:8 }}/>
            <div style={{ fontSize:11, color:T.g2, marginBottom:4 }}>{displayLabel}</div>
            <div style={{ fontFamily:"'Bebas Neue'", fontSize:32, color:T.white }}>
              ₹{displayTotal.toLocaleString()}
            </div>
            {billing==="annual" && (
              <div style={{ fontSize:10, color:T.green, marginTop:4 }}>
                15% annual discount applied
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ display:"flex", gap:12 }}>
        <button onClick={onBack}
          style={{ flex:1, background:"transparent", border:`1px solid ${T.border}`,
            borderRadius:12, padding:"14px", color:T.g1, fontSize:14,
            fontWeight:700, cursor:"pointer", fontFamily:"'Nunito'" }}>← Back</button>
        <button onClick={onNext} disabled={loading}
          style={{ flex:2, background:loading?T.g2:`linear-gradient(135deg,${T.orange},#FF8C52)`,
            border:"none", borderRadius:12, padding:"14px", color:"#fff",
            fontSize:15, fontWeight:800, cursor:loading?"not-allowed":"pointer",
            fontFamily:"'Nunito'",
            display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
          {loading==='signup'
            ? <><div style={{ width:18, height:18,
                border:"2px solid rgba(255,255,255,.3)",
                borderTopColor:"#fff", borderRadius:"50%",
                animation:"spin .8s linear infinite" }}/>Processing...</>
            : `💳 Pay ₹${displayTotal.toLocaleString()} ${billing==='annual'?'/ year':'/ month'} →`}
        </button>
      </div>
    </div>
  );
}

/* ── MAIN ────────────────────────────────────────────────────── */
export default function SignupPage({ onLogin }) {
  const [step,         setStep]         = useState(0);
  const [form,         setForm]         = useState({
    companyName:"", fullName:"", email:"",
    password:"", confirmPass:"",
    whatsapp:"", agreeTerms:false, agreeWhatsapp:false,
    cameraCount:4,
  });
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState("");

  // Clear any stale errors on mount
  useEffect(() => { setError(""); }, []);
  const [billing,      setBilling]      = useState("monthly");
  const [selectedPlan, setSelectedPlan] = useState("growth");
  const navigate = useNavigate();

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => document.body.removeChild(script);
  }, []);

  // Free Trial
  const handleFreeTrial = async () => {
    setLoading('trial'); setError("");
    try {
      const regRes = await axios.post("/api/v1/auth/register", {
        companyName:   form.companyName,
        email:         form.email,
        password:      form.password,
        fullName:      form.companyName,
        whatsapp:      form.whatsapp || "",
        whatsappOptIn: form.agreeWhatsapp || false,
        trialDays:     14,
        plants:        [],
        zones:         [],
        cameras:       [],
      });
      const { accessToken, refreshToken, user, tenantId } = regRes.data.data;
      localStorage.setItem("safeg_token",   accessToken);
      localStorage.setItem("safeg_refresh", refreshToken);
      localStorage.setItem("safeg_user",    JSON.stringify(user));
      localStorage.setItem("safeg_tenant",  tenantId);
      localStorage.setItem("safeg_plan",    "growth");
      onLogin?.(user);
      navigate("/dashboard");
    } catch(err) {
      const msg = err.response?.data?.message || err.message || "Registration failed";
      const errors = err.response?.data?.errors;
      if (errors && errors.length > 0) {
        setError(errors.map(e => e.msg || e.message).join(", "));
      } else if (msg === "Validation failed") {
        setError("Please check all fields are filled correctly");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // Go to plan step
  const handleSignup = () => { setStep(1); };

  // Payment & Account Creation
  const handlePayAndActivate = async () => {
    setLoading('signup'); setError("");
    try {
      // 1. Register account
      const regRes = await axios.post("/api/v1/auth/register", {
        companyName:   form.companyName,
        email:         form.email,
        password:      form.password,
        fullName:      form.companyName,
        whatsapp:      form.whatsapp || "",
        whatsappOptIn: form.agreeWhatsapp || false,
        trialDays:     0,
        plants:        [],
        zones:         [],
        cameras:       [],
      });
      const { accessToken, refreshToken, user, tenantId } = regRes.data.data;
      localStorage.setItem("safeg_token",   accessToken);
      localStorage.setItem("safeg_refresh", refreshToken);
      localStorage.setItem("safeg_user",    JSON.stringify(user));
      localStorage.setItem("safeg_tenant",  tenantId);

      // 2. Create Razorpay order
      const orderRes = await axios.post("/api/v1/payments/create-order", {
        planId:      selectedPlan,
        billing,
        addOns:      [],
        cameraCount: parseInt(form.cameraCount) || 4,
        customer: { name: form.companyName, email: form.email },
      }, { headers: { Authorization: `Bearer ${accessToken}` }});

      const { orderId, amount, currency, keyId } = orderRes.data.data;

      // 3. Open Razorpay
      await new Promise((resolve, reject) => {
        const rzp = new window.Razorpay({
          key:         keyId || import.meta.env.VITE_RAZORPAY_KEY_ID,
          amount, currency: currency || "INR", order_id: orderId,
          name:        "SafeguardIQ Enterprise",
          description: `${selectedPlan.toUpperCase()} Plan — ${billing}`,
          image:       "https://safeguardsiq.com/logo.png",
          prefill:     { name: form.fullName, email: form.email },
          theme:       { color: "#FF5B18" },
          handler: async (response) => {
            try {
              await axios.post("/api/v1/payments/verify", {
                razorpay_order_id:   response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature:  response.razorpay_signature,
                planId: selectedPlan, billing,
              }, { headers: { Authorization: `Bearer ${accessToken}` }});
              resolve();
            } catch(e) { reject(e); }
          },
          modal: { ondismiss: () => reject(new Error("Payment cancelled")) },
        });
        rzp.open();
      });

      // 4. Success
      localStorage.setItem('safeg_cam_limit', String(parseInt(form.cameraCount) || 4));
      localStorage.setItem('safeg_plan', selectedPlan);
      setStep(2);
      onLogin?.(user);
      setTimeout(() => navigate("/onboarding"), 2500);

    } catch(err) {
      if (err.message === "Payment cancelled") {
        setError("Payment cancelled. You can try again.");
      } else {
        const msg3 = err.response?.data?.message || err.message || "Registration failed";
      const errors3 = err.response?.data?.errors;
      if (errors3 && errors3.length > 0) {
        setError(errors3.map(e => e.msg || e.message).join(", "));
      } else if (msg3 === "Validation failed") {
        setError("Please check all fields are filled correctly");
      } else {
        setError(msg3);
      }
      }
    } finally {
      setLoading(false);
    }
  };

  const maxW = step === 1 ? 820 : 580;

  return (
    <>
      <style>{CSS}</style>
      <div style={{ minHeight:"100vh", background:T.bg, display:"flex",
        flexDirection:"column", alignItems:"center", justifyContent:"flex-start",
        fontFamily:"'Nunito',sans-serif", padding:"32px 20px",
        position:"relative", overflow:"hidden" }}>

        {/* Grid background */}
        <div style={{ position:"fixed", inset:0,
          backgroundImage:`linear-gradient(${T.border} 1px,transparent 1px),linear-gradient(90deg,${T.border} 1px,transparent 1px)`,
          backgroundSize:"60px 60px", animation:"gridMove 4s linear infinite",
          opacity:.3, pointerEvents:"none" }}/>

        {/* Logo + Sign in row */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
          width:"100%", maxWidth:maxW, marginBottom:28, zIndex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:38, height:38, borderRadius:10,
              background:`linear-gradient(135deg,${T.orange},#FF8C52)`,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontFamily:"'Bebas Neue'", fontSize:20, color:"#fff" }}>S</div>
            <div style={{ fontFamily:"'Bebas Neue'", fontSize:20,
              letterSpacing:3, color:T.white }}>SafeguardIQ Enterprise</div>
          </div>
          <div style={{ fontSize:13, color:T.g2 }}>
            Already have an account?{" "}
            <Link to="/login" style={{ color:T.orange, fontWeight:700,
              textDecoration:"none" }}>Sign in →</Link>
          </div>
        </div>

        {/* Step indicator — paid flow only */}
        {step === 1 && (
          <div style={{ display:"flex", alignItems:"center", gap:8,
            marginBottom:24, zIndex:1 }}>
            {["Company Details","Choose Plan","Activate"].map((s,i)=>(
              <div key={s} style={{ display:"flex", alignItems:"center" }}>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <div style={{ width:24, height:24, borderRadius:"50%",
                    background:i<1?T.green:i===1?T.orange:T.card2,
                    border:`2px solid ${i<1?T.green:i===1?T.orange:T.border}`,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:10, fontWeight:800, color:i<=1?"#fff":T.g2 }}>
                    {i<1?"✓":i+1}
                  </div>
                  <span style={{ fontSize:11,
                    color:i===1?T.white:i<1?T.green:T.g2,
                    fontWeight:i===1?700:400 }}>{s}</span>
                </div>
                {i<2 && <div style={{ width:24, height:2,
                  background:i<1?T.green:T.border, margin:"0 6px" }}/>}
              </div>
            ))}
          </div>
        )}

        {/* Form card */}
        <div style={{ width:"100%", maxWidth:maxW, background:T.card,
          border:`1px solid ${T.border}`, borderRadius:20, padding:32, zIndex:1 }}>

          {error && (
            <div style={{ background:"rgba(255,61,61,.1)",
              border:`1px solid rgba(255,61,61,.3)`, borderRadius:10,
              padding:"12px 16px", color:T.red, fontSize:13, marginBottom:20 }}>
              ⚠ {error}
            </div>
          )}

          {step === 0 && (
            <StepCompany
              form={form} setForm={setForm}
              onFreeTrial={handleFreeTrial}
              onSignup={handleSignup}
              loading={loading} error={error} setError={setError}
            />
          )}

          {step === 1 && (
            <StepChoosePlanAuto
              form={form} setForm={setForm}
              selectedPlan={selectedPlan} setSelectedPlan={setSelectedPlan}
              billing={billing} setBilling={setBilling}
              onNext={handlePayAndActivate}
              onBack={() => setStep(0)}
              loading={loading}
            />
          )}

          {step === 2 && <StepSuccess email={form.email} />}
        </div>

      </div>
    </>
  );
}
