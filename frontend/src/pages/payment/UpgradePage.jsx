/**
 * UpgradePage.jsx
 * SafeguardIQ Enterprise — Trial to Paid Upgrade
 * Shown when trial customer clicks Subscribe
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const T = {
  bg:"#05080F", card:"#0C1422", card2:"#101828",
  border:"#1A2540", orange:"#FF5B18", teal:"#00D4B4",
  blue:"#2D8EFF", white:"#EDF2FF", g1:"#8899BB", g2:"#3A4E72",
  green:"#22D468", red:"#FF3D3D", amber:"#FFB400",
};

const PLANS = [
  { id:"starter",    name:"STARTER",      price:2500, annual:2125, cameras:"1–4",  maxCams:4,  color:T.blue,   badge:null },
  { id:"growth",     name:"PROFESSIONAL", price:2000, annual:1700, cameras:"5–16", maxCams:16, color:T.orange, badge:"⭐ MOST POPULAR" },
  { id:"enterprise", name:"ENTERPRISE",   price:1600, annual:1360, cameras:"17–32",maxCams:32, color:T.teal,   badge:"🏆 BEST VALUE" },
];

export default function UpgradePage({ onLogin }) {
  const [billing,      setBilling]      = useState("monthly");
  const [selectedPlan, setSelectedPlan] = useState("growth");
  const [camCount,     setCamCount]     = useState(4);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState("");
  const navigate = useNavigate();

  // Auto-select plan based on camera count
  useEffect(() => {
    if (camCount <= 4)       setSelectedPlan("starter");
    else if (camCount <= 16) setSelectedPlan("growth");
    else                     setSelectedPlan("enterprise");
  }, [camCount]);

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => document.body.removeChild(script);
  }, []);

  const plan = PLANS.find(p => p.id === selectedPlan) || PLANS[1];
  const pricePerCam = billing === 'annual' ? plan.annual : plan.price;
  const totalMonthly = pricePerCam * camCount;
  const totalWithGST = billing === 'annual'
    ? Math.round(totalMonthly * 12 * 1.18)
    : Math.round(totalMonthly * 1.18);
  const displayLabel = billing === 'annual' ? 'TOTAL / YEAR' : 'TOTAL / MONTH';

  const handlePay = async () => {
    setLoading(true); setError("");
    try {
      const token = localStorage.getItem('safeg_token');
      const orderRes = await axios.post("/api/v1/payments/create-order", {
        planId:      selectedPlan,
        billing,
        cameraCount: camCount,
        addOns:      [],
      }, { headers: { Authorization: `Bearer ${token}` }});

      const { orderId, amount, currency, keyId } = orderRes.data.data;
      const user = JSON.parse(localStorage.getItem('safeg_user') || '{}');

      await new Promise((resolve, reject) => {
        const rzp = new window.Razorpay({
          key:         keyId || import.meta.env.VITE_RAZORPAY_KEY_ID,
          amount, currency: currency || "INR", order_id: orderId,
          name:        "SafeguardIQ Enterprise",
          description: `${selectedPlan.toUpperCase()} Plan — ${billing}`,
          image:       "https://safeguardsiq.com/logo.png",
          prefill:     { name: user.fullName || "", email: user.email || "", contact: user.phone || "" },
          theme:       { color: "#FF5B18" },
          handler: async (response) => {
            try {
              await axios.post("/api/v1/payments/verify", {
                razorpay_order_id:   response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature:  response.razorpay_signature,
                planId: selectedPlan, billing,
              }, { headers: { Authorization: `Bearer ${token}` }});
              // Update camera limit in localStorage
              localStorage.setItem('safeg_cam_limit', camCount.toString());
              localStorage.setItem('safeg_plan', selectedPlan);
              resolve();
            } catch(e) { reject(e); }
          },
          modal: { ondismiss: () => reject(new Error("Payment cancelled")) },
        });
        rzp.open();
      });

      // Refresh user plan
      const meRes = await axios.get("/api/v1/auth/me", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (meRes.data.success) {
        localStorage.setItem('safeg_user', JSON.stringify(meRes.data.data));
        onLogin?.(meRes.data.data);
      }

      navigate("/onboarding");
    } catch(err) {
      if (err.message === "Payment cancelled") {
        setError("Payment cancelled.");
      } else {
        setError(err.response?.data?.message || err.message || "Payment failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ fontFamily:"'Nunito',sans-serif", minHeight:"100vh", background:T.bg,
      display:"flex", flexDirection:"column", alignItems:"center",
      justifyContent:"flex-start", padding:"40px 20px" }}>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:32 }}>
        <div style={{ width:38, height:38, borderRadius:10,
          background:`linear-gradient(135deg,${T.orange},#FF8C52)`,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:20, fontWeight:700, color:"#fff" }}>S</div>
        <div style={{ fontSize:20, fontWeight:800, color:T.white, letterSpacing:2 }}>SAFEGUARDIQ ENTERPRISE</div>
      </div>

      <div style={{ width:"100%", maxWidth:860, background:T.card,
        border:`1px solid ${T.border}`, borderRadius:20, padding:32 }}>

        <div style={{ marginBottom:24 }}>
          <div style={{ fontSize:28, fontWeight:800, color:T.white,
            fontFamily:"'Bebas Neue',sans-serif", letterSpacing:2 }}>
            UPGRADE YOUR PLAN
          </div>
          <div style={{ fontSize:13, color:T.g1, marginTop:4 }}>
            Select how many cameras you need — plan auto-selected
          </div>
        </div>

        {error && (
          <div style={{ background:"rgba(255,61,61,.1)", border:`1px solid rgba(255,61,61,.3)`,
            borderRadius:10, padding:"12px 16px", color:T.red, fontSize:13, marginBottom:20 }}>
            ⚠ {error}
          </div>
        )}

        {/* Billing toggle */}
        <div style={{ display:"flex", justifyContent:"center", marginBottom:24 }}>
          <div style={{ background:T.card2, border:`1px solid ${T.border}`, borderRadius:10, padding:4, display:"flex" }}>
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
            letterSpacing:1.5, marginBottom:16 }}>HOW MANY CAMERAS DO YOU NEED?</div>
          <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:16 }}>
            <button onClick={()=>setCamCount(c=>Math.max(1,c-1))}
              style={{ width:36, height:36, borderRadius:8, border:`1px solid ${T.border}`,
                background:T.card, color:T.white, fontSize:18, cursor:"pointer" }}>−</button>
            <div style={{ flex:1 }}>
              <input type="range" min={1} max={32} value={camCount}
                onChange={e=>setCamCount(parseInt(e.target.value))}
                style={{ width:"100%", accentColor:T.orange, cursor:"pointer" }}/>
              <div style={{ display:"flex", justifyContent:"space-between",
                fontSize:9, color:T.g2, marginTop:4 }}>
                <span>1</span><span>4</span><span>16</span><span>32</span>
              </div>
            </div>
            <button onClick={()=>setCamCount(c=>Math.min(32,c+1))}
              style={{ width:36, height:36, borderRadius:8, border:`1px solid ${T.border}`,
                background:T.card, color:T.white, fontSize:18, cursor:"pointer" }}>+</button>
            <div style={{ background:T.card, border:`1px solid ${T.orange}`,
              borderRadius:10, padding:"8px 16px", minWidth:60, textAlign:"center" }}>
              <div style={{ fontSize:24, fontWeight:800, color:T.orange,
                fontFamily:"'Bebas Neue',sans-serif" }}>{camCount}</div>
              <div style={{ fontSize:9, color:T.g2 }}>CAMERAS</div>
            </div>
          </div>

          {/* Plan zones */}
          <div style={{ display:"grid", gridTemplateColumns:"4fr 12fr 16fr", gap:4 }}>
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

        {/* Selected plan + price */}
        <div style={{ background:`${plan.color}10`, border:`2px solid ${plan.color}`,
          borderRadius:14, padding:24, marginBottom:24, position:"relative" }}>
          {plan.badge && (
            <div style={{ position:"absolute", top:-12, left:20,
              background:plan.color, color:"#fff", fontSize:10, fontWeight:800,
              padding:"3px 14px", borderRadius:20 }}>{plan.badge}</div>
          )}
          <div style={{ display:"flex", alignItems:"flex-start",
            justifyContent:"space-between", gap:20 }}>
            <div style={{ flex:1 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28,
                  color:plan.color, letterSpacing:2 }}>{plan.name}</div>
                <div style={{ background:`${plan.color}20`, border:`1px solid ${plan.color}40`,
                  borderRadius:20, padding:"3px 12px", fontSize:10,
                  color:plan.color, fontWeight:700 }}>AUTO-SELECTED ✓</div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                {PLANS.find(p=>p.id===selectedPlan)?.features?.map(f=>(
                  <div key={f} style={{ display:"flex", gap:6 }}>
                    <span style={{ color:plan.color, fontSize:11, flexShrink:0 }}>✓</span>
                    <span style={{ fontSize:11, color:T.g1 }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Price box */}
            <div style={{ background:T.card, border:`1px solid ${T.border}`,
              borderRadius:12, padding:16, minWidth:200,
              textAlign:"center", flexShrink:0 }}>
              <div style={{ fontSize:10, color:T.g2, letterSpacing:1, marginBottom:8 }}>PRICE BREAKDOWN</div>
              <div style={{ fontSize:13, color:T.g1, marginBottom:4 }}>
                {camCount} cams × ₹{pricePerCam.toLocaleString()}
              </div>
              <div style={{ fontSize:13, color:T.g1, marginBottom:4 }}>
                = ₹{totalMonthly.toLocaleString()}/month{billing==='annual'?' × 12':''}
              </div>
              <div style={{ fontSize:11, color:T.g2, marginBottom:8 }}>+ 18% GST</div>
              <div style={{ height:1, background:T.border, marginBottom:8 }}/>
              <div style={{ fontSize:11, color:T.g2, marginBottom:4 }}>{displayLabel}</div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:32, color:T.white }}>
                ₹{totalWithGST.toLocaleString()}
              </div>
              {billing==="annual" && (
                <div style={{ fontSize:10, color:T.green, marginTop:4 }}>15% annual discount applied</div>
              )}
            </div>
          </div>
        </div>

        <div style={{ display:"flex", gap:12 }}>
          <button onClick={()=>navigate("/billing")}
            style={{ flex:1, background:"transparent", border:`1px solid ${T.border}`,
              borderRadius:12, padding:"14px", color:T.g1, fontSize:14,
              fontWeight:700, cursor:"pointer", fontFamily:"'Nunito'" }}>← Back</button>
          <button onClick={handlePay} disabled={loading}
            style={{ flex:2, background:loading?T.g2:`linear-gradient(135deg,${T.orange},#FF8C52)`,
              border:"none", borderRadius:12, padding:"14px", color:"#fff",
              fontSize:15, fontWeight:800, cursor:loading?"not-allowed":"pointer",
              fontFamily:"'Nunito'", display:"flex",
              alignItems:"center", justifyContent:"center", gap:8 }}>
            {loading
              ? <><div style={{ width:18, height:18, border:"2px solid rgba(255,255,255,.3)",
                  borderTopColor:"#fff", borderRadius:"50%",
                  animation:"spin .8s linear infinite" }}/>Processing...</>
              : `💳 Pay ₹${totalWithGST.toLocaleString()} ${billing==='annual'?'/ year':'/ month'} →`}
          </button>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}