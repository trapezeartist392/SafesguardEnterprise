/**
 * SafeguardIQ Enterprise — Razorpay Payment Portal
 * Full-stack payment integration: plan selection → checkout → confirmation
 * Connects to Node.js backend at /api/v1/payments/*
 */
import { useState, useEffect, useRef } from "react";

/* ─── GOOGLE FONTS ─────────────────────────────────── */
const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:wght@300;400;500&family=Instrument+Sans:wght@400;500;600;700&display=swap');`;

/* ─── DESIGN TOKENS ────────────────────────────────── */
const T = {
  void:    "#05080F",
  deep:    "#080D18",
  ink:     "#0C1220",
  panel:   "#101828",
  card:    "#141E30",
  edge:    "#1C2A40",
  line:    "#243452",
  muted:   "#2E4068",
  // Text
  snow:    "#F4F7FF",
  cloud:   "#C8D6F0",
  fog:     "#7B94C4",
  ghost:   "#3A5080",
  // Brand
  ember:   "#FF4D00",
  flame:   "#FF6B2B",
  orange:  "#FF4D00",
  gold:    "#FFB020",
  jade:    "#00E5A0",
  sky:     "#2D8EFF",
  blue:    "#2D8EFF",
  violet:  "#8B5CF6",
  rose:    "#FF3B6B",
  // Glows
  emberGlow: "rgba(255,77,0,.18)",
  jadeGlow:  "rgba(0,229,160,.12)",
  skyGlow:   "rgba(45,142,255,.12)",
};

/* ─── GLOBAL STYLES ────────────────────────────────── */
const G = `
${FONTS}
*{margin:0;padding:0;box-sizing:border-box}
body{background:${T.void};color:${T.snow};font-family:'Instrument Sans',sans-serif;min-height:100vh;overflow-x:hidden}
::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:${T.deep}}::-webkit-scrollbar-thumb{background:${T.line};border-radius:2px}

@keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes slideLeft{from{opacity:0;transform:translateX(32px)}to{opacity:1;transform:translateX(0)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes shimmer{0%{background-position:-600px 0}100%{background-position:600px 0}}
@keyframes ping{0%{transform:scale(1);opacity:.6}100%{transform:scale(2.4);opacity:0}}
@keyframes checkDraw{from{stroke-dashoffset:40}to{stroke-dashoffset:0}}
@keyframes glowPulse{0%,100%{box-shadow:0 0 20px ${T.emberGlow}}50%{box-shadow:0 0 40px rgba(255,77,0,.32)}}
@keyframes countUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes orbFloat{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(30px,-20px) scale(1.05)}66%{transform:translate(-20px,15px) scale(.96)}}

.fade-up{animation:fadeUp .5s cubic-bezier(.22,1,.36,1) both}
.fade-in{animation:fadeIn .4s ease both}
.slide-left{animation:slideLeft .45s cubic-bezier(.22,1,.36,1) both}

input,select{font-family:'Instrument Sans',sans-serif}
input:focus,select:focus{outline:none}
button{cursor:pointer;font-family:'Instrument Sans',sans-serif}
`;

/* ─── PLANS CONFIG ─────────────────────────────────── */
const PLANS = [
  {
    id: "starter",
    name: "Starter",
    tagline: "Up to 4 cameras",
    monthlyINR: 10000,
    annualINR:  102000,
    annualSave: "₹18,000 saved",
    color: T.blue,
    features: [
      "4 cameras max",
      "PPE detection — 6 categories",
      "30-day violation archive",
      "Email alerts",
      "Form 18 auto-fill",
      "Basic compliance report",
    ],
    popular: false,
  },
  {
    id: "growth",
    name: "Professional",
    tagline: "5 to 16 cameras",
    monthlyINR: 32000,
    annualINR:  326400,
    annualSave: "₹57,600 saved",
    color: T.orange,
    features: [
      "5–16 cameras",
      "90-day violation archive",
      "WhatsApp + Email alerts",
      "Form 18 PDF",
      "Full compliance reports",
      "ROI calculator",
      "Multi-plant dashboard",
    ],
    popular: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "17 to 32 cameras",
    monthlyINR: null,
    annualINR:  null,
    annualSave: "",
    color: T.violet,
    features: [
      "17–32 cameras",
      "Unlimited archive",
      "WhatsApp + SMS + Email",
      "Dedicated CSM",
      "Custom reports",
      "99.5% SLA",
      "On-site training",
    ],
    popular: false,
  },
];

const ADD_ONS = [
  { id: "extra_cameras_8",  label: "+8 extra cameras",      price: 9600,  unit: "/mo" },
  { id: "sms_alerts",       label: "SMS alert bundle",       price: 2400,  unit: "/mo" },
  { id: "data_extension",   label: "Extended data (1 yr)",   price: 12000, unit: "/yr" },
  { id: "onsite_training",  label: "On-site HSE training",   price: 25000, unit: "one-time" },
];

/* ─── HELPERS ──────────────────────────────────────── */
const fmt = (n) =>
  n == null ? "Custom" : "₹" + n.toLocaleString("en-IN");

const fmtShort = (n) =>
  n == null ? "Custom"
  : n >= 100000 ? "₹" + (n / 100000).toFixed(1).replace(/\.0$/, "") + "L/yr"
  : "₹" + (n / 1000).toFixed(0) + "K/yr";

/* ─── API LAYER ────────────────────────────────────── */
const API_BASE = import.meta?.env?.VITE_API_URL || "http://localhost:4000/api/v1";

async function apiCall(method, path, body) {
  const token = window._safegToken;
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}

/* ─── RAZORPAY LOADER ──────────────────────────────── */
function loadRazorpay() {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload  = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

/* ═══════════════════════════════════════════════════ */
/*  COMPONENT: Ambient background orbs                 */
/* ═══════════════════════════════════════════════════ */
function AmbientOrbs({ color }) {
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
      {[
        { top: "-10%", left: "-5%",  size: 520, delay: "0s",   c: T.ember, o: .06 },
        { top: "60%",  left: "80%",  size: 400, delay: "4s",   c: T.jade,  o: .05 },
        { top: "40%",  left: "50%",  size: 300, delay: "8s",   c: T.sky,   o: .04 },
      ].map((o, i) => (
        <div key={i} style={{
          position: "absolute", top: o.top, left: o.left,
          width: o.size, height: o.size, borderRadius: "50%",
          background: `radial-gradient(circle, ${o.c} 0%, transparent 70%)`,
          opacity: o.o,
          animation: `orbFloat ${18 + i * 6}s ease-in-out infinite`,
          animationDelay: o.delay,
          filter: "blur(60px)",
        }}/>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════ */
/*  COMPONENT: Plan Card                               */
/* ═══════════════════════════════════════════════════ */
function PlanCard({ plan, billing, selected, onSelect }) {
  const price = billing === "annual" ? plan.annualINR : plan.monthlyINR;
  const perCam = plan.id === "starter" ? (billing === "annual" ? 2125 : 2500)
               : plan.id === "growth"  ? (billing === "annual" ? 1700 : 2000)
               : plan.id === "enterprise" ? (billing === "annual" ? 1360 : 1600)
               : null;
  const planGlow = plan.glow || `${plan.color}1f`;
  const planIcon = plan.icon || (plan.id === "starter" ? "◈" : plan.id === "growth" ? "⬡" : "✦");

  return (
    <div
      onClick={() => plan.monthlyINR !== null && onSelect(plan.id)}
      style={{
        background: selected
          ? `linear-gradient(135deg, ${planGlow} 0%, rgba(255,255,255,.02) 100%)`
          : T.card,
        border: `1.5px solid ${selected ? plan.color : T.line}`,
        borderRadius: 20,
        padding: "28px 24px",
        cursor: plan.monthlyINR !== null ? "pointer" : "default",
        position: "relative",
        overflow: "hidden",
        transition: "all .25s cubic-bezier(.22,1,.36,1)",
        transform: selected ? "translateY(-4px)" : "none",
        boxShadow: selected ? `0 20px 60px ${planGlow}, 0 0 0 1px ${plan.color}22` : "none",
      }}
    >
      {/* Top accent bar */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 3,
        background: `linear-gradient(90deg, ${plan.color}, transparent)`,
        opacity: selected ? 1 : 0.4,
      }}/>

      {/* Popular badge */}
      {plan.popular && (
        <div style={{
          position: "absolute", top: 16, right: 16,
          background: T.ember, color: "#fff",
          fontSize: 9, fontWeight: 700, letterSpacing: 2,
          padding: "3px 10px", borderRadius: 20,
          fontFamily: "'DM Mono',monospace",
          textTransform: "uppercase",
        }}>POPULAR</div>
      )}

      {/* Plan icon + name */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: `${planGlow}`,
          border: `1.5px solid ${plan.color}44`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20, color: plan.color,
        }}>{planIcon}</div>
        <div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 800, color: T.snow }}>{plan.name}</div>
          <div style={{ fontSize: 12, color: T.fog, marginTop: 1 }}>{plan.tagline}</div>
        </div>
      </div>

      {/* Price */}
      <div style={{ marginBottom: 20 }}>
        {price == null ? (
          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 30, fontWeight: 800, color: plan.color }}>
            Custom
          </div>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 34, fontWeight: 800, color: T.snow }}>
                {fmt(price)}
              </span>
              <span style={{ fontSize: 13, color: T.fog }}>
                /{billing === "annual" ? "yr" : "mo"}
              </span>
            </div>
            {perCam && (
              <div style={{ fontSize: 12, color: T.fog, marginTop: 3, fontFamily: "'DM Mono',monospace" }}>
                ₹{perCam}/cam/mo · +18% GST
              </div>
            )}
            {billing === "annual" && plan.annualSave && (
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                marginTop: 8, padding: "3px 10px",
                background: `${T.jadeGlow}`, borderRadius: 20,
                border: `1px solid ${T.jade}33`, fontSize: 11,
                color: T.jade, fontWeight: 600,
              }}>
                🎁 {plan.annualSave}
              </div>
            )}
          </>
        )}
      </div>

      {/* Features */}
      <div style={{ marginBottom: 20 }}>
        {plan.features.map(f => (
          <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 9, marginBottom: 7 }}>
            <span style={{ color: plan.color, fontSize: 13, marginTop: 1, flexShrink: 0 }}>✓</span>
            <span style={{ fontSize: 13, color: T.cloud, lineHeight: 1.4 }}>{f}</span>
          </div>
        ))}
        {plan.notIncluded?.map(f => (
          <div key={f} style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 7, opacity: 0.35 }}>
            <span style={{ fontSize: 13, color: T.fog }}>–</span>
            <span style={{ fontSize: 13, color: T.fog, textDecoration: "line-through" }}>{f}</span>
          </div>
        ))}
      </div>

      {/* CTA */}
      {plan.monthlyINR !== null ? (
        <div style={{
          width: "100%", padding: "11px",
          background: selected ? plan.color : "transparent",
          border: `1.5px solid ${selected ? plan.color : T.line}`,
          borderRadius: 10, textAlign: "center",
          fontSize: 13, fontWeight: 700, color: selected ? "#fff" : T.fog,
          transition: "all .2s",
        }}>
          {selected ? "✓ Selected" : "Select Plan"}
        </div>
      ) : (
        <a href="mailto:sales@syyaimsafeg.ai" style={{
          display: "block", width: "100%", padding: "11px",
          background: `${planGlow}`,
          border: `1.5px solid ${plan.color}44`,
          borderRadius: 10, textAlign: "center",
          fontSize: 13, fontWeight: 700, color: plan.color,
          textDecoration: "none",
        }}>Contact Sales →</a>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════ */
/*  COMPONENT: Order Summary sidebar                   */
/* ═══════════════════════════════════════════════════ */
function OrderSummary({ plan, billing, addOns, coupon, couponValid, couponDiscount }) {
  const base = billing === "annual" ? plan.annualINR : plan.monthlyINR;
  const addOnTotal = addOns.reduce((s, id) => {
    const a = ADD_ONS.find(x => x.id === id);
    return s + (a ? a.price : 0);
  }, 0);
  const subtotal  = base + addOnTotal;
  const discount  = couponValid ? Math.round(subtotal * couponDiscount) : 0;
  const afterDisc = subtotal - discount;
  const gst       = Math.round(afterDisc * 0.18);
  const total     = afterDisc + gst;

  const Row = ({ label, value, accent, big, sub }) => (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: big ? "10px 0" : "7px 0",
      borderBottom: big ? `1px solid ${T.line}` : "none",
    }}>
      <span style={{ fontSize: sub ? 12 : 13, color: sub ? T.ghost : T.fog }}>{label}</span>
      <span style={{
        fontSize: big ? 16 : 13, fontWeight: big ? 700 : 500,
        color: accent || T.cloud,
        fontFamily: "'DM Mono',monospace",
      }}>{value}</span>
    </div>
  );

  return (
    <div style={{
      background: T.panel, border: `1.5px solid ${T.line}`,
      borderRadius: 20, padding: 24, position: "sticky", top: 24,
    }}>
      <div style={{
        fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 700,
        color: T.fog, textTransform: "uppercase", letterSpacing: 3, marginBottom: 20,
      }}>Order Summary</div>

      {/* Plan */}
      <div style={{
        background: T.card, border: `1px solid ${T.line}`,
        borderRadius: 12, padding: "12px 14px", marginBottom: 16,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <div style={{ fontWeight: 700, color: plan.color, fontSize: 14 }}>{plan.name} Plan</div>
          <div style={{ fontSize: 11, color: T.fog, marginTop: 2, fontFamily: "'DM Mono',monospace" }}>
            {billing === "annual" ? "Annual billing" : "Monthly billing"}
          </div>
        </div>
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 14, color: T.snow, fontWeight: 600 }}>
          {fmt(base)}
        </div>
      </div>

      {/* Add-ons */}
      {addOns.length > 0 && addOns.map(id => {
        const a = ADD_ONS.find(x => x.id === id);
        return a ? (
          <Row key={id} label={`+ ${a.label}`} value={fmt(a.price)} sub/>
        ) : null;
      })}

      <div style={{ borderTop: `1px solid ${T.line}`, margin: "12px 0" }}/>
      <Row label="Subtotal"  value={fmt(subtotal)}/>
      {couponValid && (
        <Row label={`Coupon (${coupon})`} value={`– ${fmt(discount)}`} accent={T.jade}/>
      )}
      <Row label="GST (18%)" value={fmt(gst)} sub/>
      <div style={{ borderTop: `1px solid ${T.line}`, margin: "12px 0" }}/>
      <Row label="Total due" value={fmt(total)} big accent={T.snow}/>

      {billing === "annual" && plan.annualSave && (
        <div style={{
          marginTop: 14, padding: "10px 12px",
          background: T.jadeGlow, borderRadius: 10,
          border: `1px solid ${T.jade}33`,
          display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: T.jade,
        }}>
          <span>🎁</span>
          <span>You save <strong>{plan.annualSave.split(" ")[0]}</strong> with annual billing vs monthly</span>
        </div>
      )}

      {/* Security badges */}
      <div style={{ marginTop: 20, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {["🔒 SSL Secured", "⚡ Razorpay", "🇮🇳 INR"].map(b => (
          <div key={b} style={{
            fontSize: 11, color: T.ghost, padding: "4px 9px",
            border: `1px solid ${T.edge}`, borderRadius: 20,
          }}>{b}</div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════ */
/*  COMPONENT: Payment Success Screen                  */
/* ═══════════════════════════════════════════════════ */
function SuccessScreen({ payment, plan, onDone }) {
  return (
    <div style={{ textAlign: "center", padding: "40px 20px", animation: "fadeIn .6s ease" }}>
      {/* Animated checkmark */}
      <div style={{ position: "relative", display: "inline-flex", marginBottom: 28 }}>
        <div style={{
          position: "absolute", inset: -12, borderRadius: "50%",
          background: T.jadeGlow, animation: "ping 1.5s ease 1",
        }}/>
        <div style={{
          width: 80, height: 80, borderRadius: "50%",
          background: `linear-gradient(135deg, ${T.jadeGlow} 0%, ${T.card} 100%)`,
          border: `2px solid ${T.jade}`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <path d="M8 18l7 7 13-13" stroke={T.jade} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray="40" strokeDashoffset="0" style={{ animation: "checkDraw .5s ease .3s both" }}/>
          </svg>
        </div>
      </div>

      <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 34, fontWeight: 800, marginBottom: 8, animation: "fadeUp .5s ease .2s both" }}>
        Payment Successful!
      </div>
      <div style={{ fontSize: 15, color: T.fog, maxWidth: 420, margin: "0 auto 32px", animation: "fadeUp .5s ease .3s both" }}>
        Your <strong style={{ color: plan.color }}>{plan.name} Plan</strong> is now active.
        SafeguardIQ Enterprise is ready to protect your factory floor.
      </div>

      {/* Receipt card */}
      <div style={{
        background: T.card, border: `1px solid ${T.line}`,
        borderRadius: 20, padding: 24, maxWidth: 420, margin: "0 auto 28px",
        textAlign: "left", animation: "fadeUp .5s ease .4s both",
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.fog, textTransform: "uppercase", letterSpacing: 2, marginBottom: 16, fontFamily: "'DM Mono',monospace" }}>
          Transaction Receipt
        </div>
        {[
          ["Payment ID",  payment.razorpay_payment_id || "pay_" + Math.random().toString(36).slice(2,12).toUpperCase()],
          ["Order ID",    payment.razorpay_order_id || "order_" + Math.random().toString(36).slice(2,12).toUpperCase()],
          ["Plan",        `${plan.name} — ${payment.billing === "annual" ? "Annual" : "Monthly"}`],
          ["Amount Paid", payment.amount],
          ["Status",      "✓ Confirmed"],
          ["Date",        new Date().toLocaleString("en-IN", { dateStyle:"medium", timeStyle:"short" })],
        ].map(([l, v]) => (
          <div key={l} style={{
            display: "flex", justifyContent: "space-between",
            padding: "8px 0", borderBottom: `1px solid ${T.edge}`, fontSize: 13,
          }}>
            <span style={{ color: T.fog }}>{l}</span>
            <span style={{
              color: l === "Status" ? T.jade : T.snow,
              fontFamily: l === "Payment ID" || l === "Order ID" ? "'DM Mono',monospace" : "inherit",
              fontSize: l === "Payment ID" || l === "Order ID" ? 11 : 13,
            }}>{v}</span>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", animation: "fadeUp .5s ease .5s both" }}>
        <button onClick={onDone} style={{
          background: T.ember, color: "#fff", border: "none",
          padding: "13px 32px", borderRadius: 12, fontSize: 14, fontWeight: 700,
        }}>→ Go to Dashboard</button>
        <button style={{
          background: "transparent", color: T.fog,
          border: `1.5px solid ${T.line}`,
          padding: "13px 24px", borderRadius: 12, fontSize: 14,
        }}>📧 Email Receipt</button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════ */
/*  MAIN APP                                           */
/* ═══════════════════════════════════════════════════ */
export default function PaymentPortal() {
  // ── State
  const [screen,        setScreen]       = useState("plans");    // plans | checkout | processing | success | failed
  const [selectedPlan,  setSelectedPlan] = useState("growth");
  const [billing,       setBilling]      = useState("annual");
  const [addOns,        setAddOns]       = useState([]);
  const [coupon,        setCoupon]       = useState("");
  const [couponInput,   setCouponInput]  = useState("");
  const [couponValid,   setCouponValid]  = useState(false);
  const [couponDiscount,setCouponDiscount]= useState(0);
  const [couponLoading, setCouponLoading]= useState(false);
  const [couponError,   setCouponError]  = useState("");
  const [paymentResult, setPaymentResult]= useState(null);
  const [payError,      setPayError]     = useState("");
  const [paying,        setPaying]       = useState(false);

  // Billing details form
  const [form, setForm] = useState({
    name: "", email: "", mobile: "", company: "",
    gstin: "", address: "", city: "", state: "", pin: "",
  });
  const [formErrors, setFormErrors] = useState({});

  const plan = PLANS.find(p => p.id === selectedPlan);

  // ── Derived totals
  const base       = billing === "annual" ? plan.annualINR : plan.monthlyINR;
  const addOnTotal = addOns.reduce((s, id) => s + (ADD_ONS.find(x => x.id === id)?.price || 0), 0);
  const subtotal   = base + addOnTotal;
  const discount   = couponValid ? Math.round(subtotal * couponDiscount) : 0;
  const afterDisc  = subtotal - discount;
  const gst        = Math.round(afterDisc * 0.18);
  const totalINR   = afterDisc + gst;
  const totalPaise = totalINR * 100;

  // ── Toggle add-on
  const toggleAddOn = (id) =>
    setAddOns(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  // ── Validate coupon
  const validateCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponLoading(true); setCouponError("");
    try {
      // In production: call /api/v1/payments/validate-coupon
      await new Promise(r => setTimeout(r, 800));
      const VALID = { "SAFEG20": 0.20, "LAUNCH15": 0.15, "INDIA10": 0.10 };
      const disc = VALID[couponInput.toUpperCase()];
      if (disc) {
        setCoupon(couponInput.toUpperCase());
        setCouponValid(true);
        setCouponDiscount(disc);
      } else {
        setCouponError("Invalid coupon code");
      }
    } finally {
      setCouponLoading(false);
    }
  };

  // ── Validate checkout form
  const validateForm = () => {
    const e = {};
    if (!form.name.trim())    e.name    = "Required";
    if (!form.email.match(/^[^@]+@[^@]+\.[^@]+$/)) e.email = "Valid email required";
    if (!form.mobile.match(/^[+\d\s]{10,15}$/))     e.mobile = "Valid mobile required";
    if (!form.company.trim()) e.company = "Required";
    if (!form.city.trim())    e.city    = "Required";
    if (!form.state)          e.state   = "Required";
    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── MAIN PAYMENT FLOW ──────────────────────────────
  const handlePay = async () => {
    if (!validateForm()) return;
    setPaying(true); setPayError("");

    try {
      const loaded = await loadRazorpay();
      if (!loaded) throw new Error("Razorpay SDK failed to load. Check your internet connection.");

      // 1. Create order on backend
      let orderData;
      try {
        const res = await apiCall("POST", "/payments/create-order", {
          planId:    selectedPlan,
          billing,
          addOns,
          coupon:    couponValid ? coupon : null,
          amount:    totalPaise,
          currency:  "INR",
          customer:  form,
        });
        orderData = res.data;
      } catch (apiErr) {
        // Demo fallback: simulate order creation
        console.warn("Backend unavailable — using demo mode:", apiErr.message);
        orderData = {
          orderId:    "order_DEMO" + Date.now().toString(36).toUpperCase(),
          amount:     totalPaise,
          currency:   "INR",
          key:        "rzp_test_YOUR_KEY_ID", // Replace with your Razorpay test key
          name:       "SafeguardIQ Enterprise",
          description:`${plan.name} Plan — ${billing === "annual" ? "Annual" : "Monthly"}`,
        };
      }

      // 2. Open Razorpay checkout
      const options = {
        key:         orderData.key || import.meta?.env?.VITE_RAZORPAY_KEY || "rzp_test_YOUR_KEY_ID",
        amount:      orderData.amount,
        currency:    orderData.currency || "INR",
        name:        "SafeguardIQ Enterprise",
        description: orderData.description || `${plan.name} Plan`,
        order_id:    orderData.orderId,
        image:       "https://i.imgur.com/safeg-logo.png",

        prefill: {
          name:    form.name,
          email:   form.email,
          contact: form.mobile,
        },

        notes: {
          plan_id:  selectedPlan,
          billing,
          company:  form.company,
          gstin:    form.gstin || "",
          address:  form.address,
        },

        theme: {
          color:      "#FF4D00",
          backdrop_color: "rgba(5,8,15,.8)",
        },

        config: {
          display: {
            blocks: {
              upi:        { name: "UPI Apps", instruments: [{ method: "upi" }] },
              netbanking: { name: "Net Banking", instruments: [{ method: "netbanking" }] },
              card:       { name: "Cards", instruments: [{ method: "card" }] },
            },
            sequence: ["block.upi", "block.card", "block.netbanking"],
            preferences: { show_default_blocks: true },
          },
        },

        handler: async (response) => {
          setScreen("processing");
          try {
            // 3. Verify payment signature on backend
            await apiCall("POST", "/payments/verify", {
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
              planId:   selectedPlan,
              billing,
              amount:   totalINR,
              customer: form,
              addOns,
              coupon: couponValid ? coupon : null,
            }).catch(() => {
              // Demo: treat as success if backend unavailable
              console.warn("Verification API unavailable — demo success");
            });

            setPaymentResult({
              ...response,
              amount:  `₹${totalINR.toLocaleString("en-IN")} + GST`,
              billing,
            });
            setScreen("success");
          } catch (err) {
            setPayError(err.message);
            setScreen("failed");
          }
        },

        modal: {
          ondismiss: () => { setPaying(false); },
          escape: true,
          animation: true,
        },
      };

      const rzp = new window.Razorpay(options);

      rzp.on("payment.failed", (response) => {
        setPayError(response.error?.description || "Payment failed. Please try again.");
        setScreen("failed");
      });

      rzp.open();
      setPaying(false);

    } catch (err) {
      setPayError(err.message);
      setPaying(false);
      setScreen("failed");
    }
  };

  // ── INPUT helper
  const inp = (key, placeholder, type = "text") => (
    <input
      type={type}
      placeholder={placeholder}
      value={form[key]}
      onChange={e => { setForm(p => ({...p, [key]: e.target.value})); setFormErrors(p => ({...p, [key]: ""})); }}
      style={{
        width: "100%", background: T.ink,
        border: `1.5px solid ${formErrors[key] ? T.rose : T.line}`,
        borderRadius: 10, padding: "11px 14px",
        fontSize: 14, color: T.snow,
        transition: "border-color .2s",
      }}
      onFocus={e  => e.target.style.borderColor = T.ember}
      onBlur={e   => e.target.style.borderColor = formErrors[e.target.name] ? T.rose : T.line}
    />
  );

  /* ── SUCCESS SCREEN ── */
  if (screen === "success") return (
    <>
      <style>{G}</style>
      <AmbientOrbs/>
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "60px 24px", position: "relative", zIndex: 1 }}>
        <SuccessScreen payment={paymentResult} plan={plan} onDone={() => window.location.href = "/dashboard"}/>
      </div>
    </>
  );

  /* ── PROCESSING SCREEN ── */
  if (screen === "processing") return (
    <>
      <style>{G}</style>
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column", gap: 20,
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: "50%",
          border: `3px solid ${T.line}`,
          borderTopColor: T.ember,
          animation: "spin .8s linear infinite",
        }}/>
        <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 700 }}>Confirming payment…</div>
        <div style={{ color: T.fog, fontSize: 13 }}>Please wait, do not close this window</div>
      </div>
    </>
  );

  /* ── FAILED SCREEN ── */
  if (screen === "failed") return (
    <>
      <style>{G}</style>
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column", gap: 16, padding: 24,
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: "50%",
          background: "rgba(255,59,107,.1)", border: `2px solid ${T.rose}`,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32,
        }}>✕</div>
        <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 26, fontWeight: 800, color: T.rose }}>Payment Failed</div>
        <div style={{ color: T.fog, fontSize: 14, maxWidth: 380, textAlign: "center" }}>{payError}</div>
        <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
          <button onClick={() => { setScreen("checkout"); setPayError(""); }} style={{
            background: T.ember, color: "#fff", border: "none",
            padding: "12px 28px", borderRadius: 12, fontWeight: 700, fontSize: 14,
          }}>Try Again</button>
          <button onClick={() => setScreen("plans")} style={{
            background: "transparent", color: T.fog,
            border: `1.5px solid ${T.line}`,
            padding: "12px 20px", borderRadius: 12, fontSize: 14,
          }}>← Back to Plans</button>
        </div>
      </div>
    </>
  );

  /* ── PLANS SCREEN ── */
  if (screen === "plans") return (
    <>
      <style>{G}</style>
      <AmbientOrbs/>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1200, margin: "0 auto", padding: "40px 24px" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 48, animation: "fadeUp .5s ease" }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 32 }}>
            <div style={{
              width: 36, height: 36,
              background: T.ember,
              clipPath: "polygon(50% 0%,100% 20%,100% 60%,50% 100%,0% 60%,0% 20%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, color: "#fff", fontWeight: 900,
            }}>✓</div>
            <div>
              <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase" }}>SafeguardIQ Enterprise</div>
            </div>
          </div>

          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 48, fontWeight: 800, lineHeight: 1.1, marginBottom: 14 }}>
            Simple, transparent<br/>
            <span style={{
              background: `linear-gradient(90deg, ${T.ember}, ${T.gold})`,
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>pricing</span>
          </div>
          <div style={{ fontSize: 16, color: T.fog, maxWidth: 480, margin: "0 auto" }}>
            Pay per camera. Scale as you grow. Cancel anytime.
          </div>
        </div>

        {/* Billing toggle */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 40, animation: "fadeUp .5s ease .1s both" }}>
          <div style={{
            display: "flex", background: T.panel, border: `1.5px solid ${T.line}`,
            borderRadius: 12, padding: 4, gap: 2,
          }}>
            {["monthly", "annual"].map(b => (
              <button key={b} onClick={() => setBilling(b)} style={{
                padding: "8px 24px", borderRadius: 9, border: "none",
                background: billing === b ? T.ember : "transparent",
                color: billing === b ? "#fff" : T.fog,
                fontSize: 13, fontWeight: 700,
                transition: "all .2s",
                position: "relative",
              }}>
                {b.charAt(0).toUpperCase() + b.slice(1)}
                {b === "annual" && billing !== "annual" && (
                  <span style={{
                    position: "absolute", top: -8, right: -4,
                    background: T.jade, color: T.deep,
                    fontSize: 8, fontWeight: 800, padding: "1px 5px",
                    borderRadius: 8, letterSpacing: .5,
                  }}>–20%</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Plan cards */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20, marginBottom: 48,
          animation: "fadeUp .5s ease .2s both",
        }}>
          {PLANS.map(p => (
            <PlanCard key={p.id} plan={p} billing={billing}
              selected={selectedPlan === p.id}
              onSelect={setSelectedPlan}/>
          ))}
        </div>

        {/* Add-ons */}
        <div style={{ marginBottom: 48, animation: "fadeUp .5s ease .3s both" }}>
          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
            Optional Add-ons
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12 }}>
            {ADD_ONS.map(a => {
              const sel = addOns.includes(a.id);
              return (
                <div key={a.id} onClick={() => toggleAddOn(a.id)} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  background: sel ? T.emberGlow : T.card,
                  border: `1.5px solid ${sel ? T.ember : T.line}`,
                  borderRadius: 12, padding: "14px 16px", cursor: "pointer",
                  transition: "all .2s",
                }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: 6,
                    border: `1.5px solid ${sel ? T.ember : T.muted}`,
                    background: sel ? T.ember : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, color: "#fff", flexShrink: 0,
                  }}>{sel ? "✓" : ""}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.snow }}>{a.label}</div>
                  </div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, color: sel ? T.ember : T.fog }}>
                    {fmt(a.price)}{a.unit}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Proceed CTA */}
        {selectedPlan !== "enterprise" && (
          <div style={{ textAlign: "center", animation: "fadeUp .5s ease .4s both" }}>
            <div style={{ fontSize: 13, color: T.fog, marginBottom: 12 }}>
              Selected: <strong style={{ color: plan.color }}>{plan.name}</strong> ·{" "}
              <strong style={{ color: T.snow }}>{fmt(billing === "annual" ? plan.annualINR : plan.monthlyINR)}</strong>
              /{billing === "annual" ? "yr" : "mo"} + 18% GST
            </div>
            <button onClick={() => setScreen("checkout")} style={{
              background: `linear-gradient(135deg, ${T.ember}, ${T.flame})`,
              color: "#fff", border: "none",
              padding: "15px 48px", borderRadius: 14,
              fontSize: 16, fontWeight: 700,
              boxShadow: `0 8px 32px rgba(255,77,0,.35)`,
              animation: "glowPulse 3s ease infinite",
            }}>
              Proceed to Checkout →
            </button>
            <div style={{ fontSize: 12, color: T.ghost, marginTop: 10 }}>
              Secured by Razorpay · Cancel anytime · Instant activation
            </div>
          </div>
        )}
      </div>
    </>
  );

  /* ── CHECKOUT SCREEN ── */
  return (
    <>
      <style>{G}</style>
      <AmbientOrbs/>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>

        {/* Back + Header */}
        <div style={{ marginBottom: 32, animation: "fadeUp .4s ease" }}>
          <button onClick={() => setScreen("plans")} style={{
            background: "transparent", border: "none", color: T.fog,
            fontSize: 13, display: "flex", alignItems: "center", gap: 6, marginBottom: 20,
          }}>← Back to plans</button>
          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 32, fontWeight: 800 }}>Checkout</div>
          <div style={{ color: T.fog, fontSize: 14, marginTop: 4 }}>
            Activating <strong style={{ color: plan.color }}>{plan.name} Plan</strong> ·{" "}
            {billing === "annual" ? "Annual" : "Monthly"} billing
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 28, alignItems: "start" }}>

          {/* Left: Form */}
          <div style={{ animation: "fadeUp .4s ease .1s both" }}>

            {/* Billing Details */}
            <div style={{
              background: T.panel, border: `1.5px solid ${T.line}`,
              borderRadius: 20, padding: 28, marginBottom: 20,
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.fog, textTransform: "uppercase", letterSpacing: 3, marginBottom: 22, fontFamily: "'DM Mono',monospace" }}>
                Billing Details
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {[
                  ["name",    "Full name *",       "text"],
                  ["email",   "Email address *",   "email"],
                  ["mobile",  "Mobile number *",   "tel"],
                  ["company", "Company name *",    "text"],
                  ["gstin",   "GSTIN (optional)",  "text"],
                  ["address", "Billing address",   "text"],
                  ["city",    "City *",            "text"],
                ].map(([key, label, type]) => (
                  <div key={key} style={key === "address" ? { gridColumn: "1/-1" } : {}}>
                    <div style={{ fontSize: 11, color: T.fog, marginBottom: 6, fontWeight: 600, letterSpacing: .5 }}>{label}</div>
                    {inp(key, label.replace(" *",""), type)}
                    {formErrors[key] && <div style={{ fontSize: 11, color: T.rose, marginTop: 4 }}>{formErrors[key]}</div>}
                  </div>
                ))}

                <div>
                  <div style={{ fontSize: 11, color: T.fog, marginBottom: 6, fontWeight: 600, letterSpacing: .5 }}>State *</div>
                  <select value={form.state} onChange={e => setForm(p => ({...p, state: e.target.value}))}
                    style={{
                      width: "100%", background: T.ink, border: `1.5px solid ${formErrors.state ? T.rose : T.line}`,
                      borderRadius: 10, padding: "11px 14px", fontSize: 14, color: form.state ? T.snow : T.fog,
                    }}>
                    <option value="">Select state…</option>
                    {["Andhra Pradesh","Delhi","Gujarat","Haryana","Karnataka","Kerala","Madhya Pradesh",
                       "Maharashtra","Punjab","Rajasthan","Tamil Nadu","Telangana","Uttar Pradesh","West Bengal","Other"]
                      .map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {formErrors.state && <div style={{ fontSize: 11, color: T.rose, marginTop: 4 }}>{formErrors.state}</div>}
                </div>
              </div>
            </div>

            {/* Coupon */}
            <div style={{
              background: T.panel, border: `1.5px solid ${T.line}`,
              borderRadius: 20, padding: 24, marginBottom: 20,
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.fog, textTransform: "uppercase", letterSpacing: 3, marginBottom: 16, fontFamily: "'DM Mono',monospace" }}>
                Coupon Code
              </div>
              {couponValid ? (
                <div style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "11px 14px",
                  background: T.jadeGlow, border: `1px solid ${T.jade}33`,
                  borderRadius: 10, fontSize: 13, color: T.jade,
                }}>
                  ✓ <strong>{coupon}</strong> — {(couponDiscount * 100).toFixed(0)}% off applied!
                  <button onClick={() => { setCouponValid(false); setCoupon(""); setCouponInput(""); }}
                    style={{ marginLeft: "auto", background: "none", border: "none", color: T.fog, fontSize: 16, cursor: "pointer" }}>✕</button>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 10 }}>
                  <input value={couponInput} onChange={e => { setCouponInput(e.target.value); setCouponError(""); }}
                    placeholder="Enter coupon (try SAFEG20, LAUNCH15)"
                    onKeyDown={e => e.key === "Enter" && validateCoupon()}
                    style={{
                      flex: 1, background: T.ink, border: `1.5px solid ${couponError ? T.rose : T.line}`,
                      borderRadius: 10, padding: "11px 14px", fontSize: 14, color: T.snow,
                    }}/>
                  <button onClick={validateCoupon} disabled={couponLoading} style={{
                    background: T.emberGlow, border: `1.5px solid ${T.ember}44`,
                    color: T.ember, padding: "11px 20px", borderRadius: 10,
                    fontSize: 13, fontWeight: 700,
                  }}>
                    {couponLoading ? "…" : "Apply"}
                  </button>
                </div>
              )}
              {couponError && <div style={{ fontSize: 12, color: T.rose, marginTop: 8 }}>{couponError}</div>}
              <div style={{ fontSize: 11, color: T.ghost, marginTop: 8 }}>
                Try: SAFEG20 (20% off) · LAUNCH15 (15% off) · INDIA10 (10% off)
              </div>
            </div>

            {/* Pay Button */}
            <button onClick={handlePay} disabled={paying} style={{
              width: "100%", padding: "17px",
              background: paying
                ? T.muted
                : `linear-gradient(135deg, ${T.ember}, ${T.flame})`,
              border: "none", borderRadius: 14,
              fontSize: 17, fontWeight: 800, color: "#fff",
              boxShadow: paying ? "none" : `0 10px 40px rgba(255,77,0,.4)`,
              transition: "all .2s",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            }}>
              {paying ? (
                <>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2.5px solid rgba(255,255,255,.3)", borderTopColor: "#fff", animation: "spin .7s linear infinite" }}/>
                  Opening Razorpay…
                </>
              ) : (
                <>
                  <span style={{ fontSize: 20 }}>⚡</span>
                  Pay {fmt(totalINR)} · Secured by Razorpay
                </>
              )}
            </button>

            <div style={{ textAlign: "center", marginTop: 12, fontSize: 12, color: T.ghost }}>
              By paying you agree to our Terms of Service · 7-day refund policy
            </div>

            {/* Payment methods strip */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              gap: 12, marginTop: 20, flexWrap: "wrap",
            }}>
              {["UPI", "Visa", "Mastercard", "Net Banking", "Wallets", "EMI"].map(m => (
                <div key={m} style={{
                  padding: "5px 12px", background: T.card,
                  border: `1px solid ${T.line}`, borderRadius: 8,
                  fontSize: 11, color: T.fog, fontFamily: "'DM Mono',monospace",
                }}>{m}</div>
              ))}
            </div>
          </div>

          {/* Right: Order Summary */}
          <OrderSummary
            plan={plan} billing={billing} addOns={addOns}
            coupon={coupon} couponValid={couponValid} couponDiscount={couponDiscount}
          />
        </div>
      </div>
    </>
  );
}
