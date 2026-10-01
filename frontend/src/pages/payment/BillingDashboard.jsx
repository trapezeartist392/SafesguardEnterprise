/**
 * SafeguardIQ Enterprise — Billing & Invoice Dashboard
 * Shows current plan, payment history, upgrade options
 * Integrates with backend /api/v1/payments/*
 */
import { useState, useEffect } from "react";

const T = {
  void:"#05080F",deep:"#080D18",ink:"#0C1220",panel:"#101828",card:"#141E30",
  edge:"#1C2A40",line:"#243452",muted:"#2E4068",
  snow:"#F4F7FF",cloud:"#C8D6F0",fog:"#7B94C4",ghost:"#3A5080",
  ember:"#FF4D00",flame:"#FF6B2B",gold:"#FFB020",jade:"#00E5A0",
  sky:"#2D8EFF",violet:"#8B5CF6",rose:"#FF3B6B",amber:"#FFB400",
};

const G = `

*{margin:0;padding:0;box-sizing:border-box}
body{background:${T.void};color:${T.snow};font-family:'Instrument Sans',sans-serif}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes shimmer{0%{background-position:-800px 0}100%{background-position:800px 0}}
.shimmer{
  background:linear-gradient(90deg,${T.card} 0%,${T.edge} 50%,${T.card} 100%);
  background-size:800px 100%;animation:shimmer 1.5s infinite;border-radius:8px;
}
`;

const API = import.meta?.env?.VITE_API_URL || "http://localhost:4000/api/v1";
const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('safeg_token') || ''}` });

const PLAN_META = {
  starter:    { color: T.jade,   icon: "◈", label: "Starter",      limit: "4 cameras" },
  growth:     { color: T.ember,  icon: "⬡", label: "Professional", limit: "16 cameras" },
  enterprise: { color: T.violet, icon: "✦", label: "Enterprise",   limit: "32 cameras" },
};

const STATUS_META = {
  captured:           { color: T.jade,   bg: "rgba(0,229,160,.1)",   label: "Paid" },
  created:            { color: T.amber,  bg: "rgba(255,180,0,.1)",   label: "Pending" },
  failed:             { color: T.rose,   bg: "rgba(255,59,107,.1)",  label: "Failed" },
  refunded:           { color: T.fog,    bg: "rgba(123,148,196,.1)", label: "Refunded" },
  partially_refunded: { color: T.amber,  bg: "rgba(255,180,0,.1)",   label: "Part. Refunded" },
};

function fmtINR(paise) {
  if (!paise) return "—";
  return "₹" + (paise / 100).toLocaleString("en-IN");
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

/* ─── Skeleton loader ───────────────────────────── */
function Skeleton({ h = 20, w = "100%", mb = 0 }) {
  return <div className="shimmer" style={{ height: h, width: w, marginBottom: mb }}/>;
}

/* ─── Stat card ─────────────────────────────────── */
function StatCard({ label, value, sub, icon, color, loading }) {
  return (
    <div style={{
      background: T.card, border: `1.5px solid ${T.line}`,
      borderRadius: 16, padding: 20, position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 3,
        background: `linear-gradient(90deg, ${color}, transparent)`,
      }}/>
      <div style={{ fontSize: 24, marginBottom: 10 }}>{icon}</div>
      {loading ? (
        <><Skeleton h={28} w={100} mb={6}/><Skeleton h={14} w={140}/></>
      ) : (
        <>
          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 26, fontWeight: 800, color }}>{value}</div>
          <div style={{ fontSize: 12, color: T.fog, marginTop: 4 }}>{label}</div>
          {sub && <div style={{ fontSize: 11, color: T.ghost, marginTop: 2 }}>{sub}</div>}
        </>
      )}
    </div>
  );
}

/* ─── Invoice row ───────────────────────────────── */
function InvoiceRow({ inv, onDownload, onRefund }) {
  const s = STATUS_META[inv.status] || STATUS_META.created;
  const plan = PLAN_META[inv.plan_id] || PLAN_META.growth;

  return (
    <tr style={{ borderBottom: `1px solid ${T.edge}` }}>
      <td style={{ padding: "14px 12px" }}>
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: T.fog }}>
          {inv.invoice_no || "—"}
        </div>
        <div style={{ fontSize: 11, color: T.ghost, marginTop: 2 }}>{fmtDate(inv.created_at)}</div>
      </td>
      <td style={{ padding: "14px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: plan.color, fontSize: 14 }}>{plan.icon}</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.snow }}>{plan.label}</div>
            <div style={{ fontSize: 11, color: T.fog }}>
              {inv.billing_cycle === "annual" ? "Annual" : "Monthly"}
            </div>
          </div>
        </div>
      </td>
      <td style={{ padding: "14px 12px" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.snow, fontFamily: "'DM Mono',monospace" }}>
          {fmtINR(inv.total_amount)}
        </div>
        <div style={{ fontSize: 11, color: T.ghost }}>incl. GST</div>
      </td>
      <td style={{ padding: "14px 12px" }}>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: "3px 10px",
          borderRadius: 20, background: s.bg, color: s.color,
          border: `1px solid ${s.color}33`,
        }}>{s.label}</span>
      </td>
      <td style={{ padding: "14px 12px" }}>
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: T.fog }}>
          {inv.razorpay_payment_id?.slice(0, 16) || "—"}
        </div>
      </td>
      <td style={{ padding: "14px 12px" }}>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => onDownload(inv)} style={{
            padding: "5px 10px", borderRadius: 7, border: `1px solid ${T.line}`,
            background: "transparent", color: T.fog, fontSize: 11, cursor: "pointer",
          }}>⬇ PDF</button>
          {inv.status === "captured" && (
            <button onClick={() => onRefund(inv)} style={{
              padding: "5px 10px", borderRadius: 7, border: `1px solid rgba(255,59,107,.3)`,
              background: "rgba(255,59,107,.07)", color: T.rose, fontSize: 11, cursor: "pointer",
            }}>↩ Refund</button>
          )}
        </div>
      </td>
    </tr>
  );
}

/* ─── Refund modal ──────────────────────────────── */
function RefundModal({ payment, onConfirm, onClose }) {
  const [reason, setReason] = useState("");
  const [partial, setPartial] = useState(false);
  const [partialAmt, setPartialAmt] = useState("");
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    setLoading(true);
    try {
      await onConfirm({
        paymentId: payment.razorpay_payment_id,
        reason,
        amount: partial ? parseInt(partialAmt) * 100 : payment.total_amount,
      });
      onClose();
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(5,8,15,.85)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999,
    }}>
      <div style={{
        background: T.panel, border: `1.5px solid ${T.line}`,
        borderRadius: 20, padding: 28, width: 440, animation: "fadeUp .3s ease",
      }}>
        <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 800, marginBottom: 6 }}>
          Request Refund
        </div>
        <div style={{ fontSize: 13, color: T.fog, marginBottom: 20 }}>
          {fmtINR(payment.total_amount)} · {payment.invoice_no} · 7-day policy
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: T.fog, marginBottom: 6 }}>Reason for refund *</div>
          <textarea value={reason} onChange={e => setReason(e.target.value)}
            placeholder="Please describe why you're requesting a refund…"
            style={{
              width: "100%", background: T.ink, border: `1.5px solid ${T.line}`,
              borderRadius: 10, padding: "10px 14px", fontSize: 13, color: T.snow,
              minHeight: 80, resize: "vertical", fontFamily: "'Instrument Sans',sans-serif",
            }}/>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <input type="checkbox" id="partial" checked={partial} onChange={e => setPartial(e.target.checked)}
            style={{ width: 16, height: 16 }}/>
          <label htmlFor="partial" style={{ fontSize: 13, color: T.cloud, cursor: "pointer" }}>
            Partial refund
          </label>
        </div>
        {partial && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: T.fog, marginBottom: 6 }}>Amount (₹)</div>
            <input type="number" value={partialAmt} onChange={e => setPartialAmt(e.target.value)}
              placeholder={`Max: ${payment.total_amount / 100}`}
              max={payment.total_amount / 100}
              style={{
                width: "100%", background: T.ink, border: `1.5px solid ${T.line}`,
                borderRadius: 10, padding: "10px 14px", fontSize: 14, color: T.snow,
              }}/>
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={handle} disabled={!reason || loading} style={{
            flex: 1, padding: "12px",
            background: reason && !loading ? T.rose : T.muted,
            border: "none", borderRadius: 10, color: "#fff",
            fontSize: 14, fontWeight: 700,
          }}>
            {loading ? "Processing…" : "Confirm Refund"}
          </button>
          <button onClick={onClose} style={{
            padding: "12px 20px", background: "transparent",
            border: `1.5px solid ${T.line}`, borderRadius: 10,
            color: T.fog, fontSize: 14,
          }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════ */
export default function BillingDashboard({ onUpgrade }) {
  const [payments, setPayments] = useState([]);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason,    setCancelReason]    = useState('');
  const [cancelling,      setCancelling]      = useState(false);
  const [cancelDone,      setCancelDone]      = useState(false);
  const [loading,  setLoading]    = useState(true);

  const [stats,    setStats]      = useState(null);
  const [tab,      setTab]        = useState("overview");
  const [refundModal, setRefundModal] = useState(null);
  const [toast,    setToast]      = useState(null);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [trialEndsAt, setTrialEndsAt] = useState(null);
  const [cameraCount, setCameraCount] = useState(null);

  // ── Load data
  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [pmtRes, meRes] = await Promise.allSettled([
        fetch(`${API}/payments/history`, { headers: authHeader() }).then(r => r.json()),
        fetch(`${API}/auth/me`,          { headers: authHeader() }).then(r => r.json()),
      ]);

      const pmts = pmtRes.status === "fulfilled" && pmtRes.value.success ? pmtRes.value.data : [];
      setPayments(pmts);

      if (meRes.status === "fulfilled" && meRes.value.success) {
        const me = meRes.value.data;
        setCurrentPlan(me.plan || "growth");
        setTrialEndsAt(me.trial_ends_at || me.trialEndsAt || null);
        setCameraCount(
          parseInt(localStorage.getItem('safeg_cam_limit')) ||
          me.camera_count || me.cameraCount || null
        );
      }

      // Compute stats
      const captured = pmts.filter(p => p.status === "captured");
      setStats({
        totalPaid:     captured.reduce((s, p) => s + p.total_amount, 0),
        totalPayments: captured.length,
        lastPayment:   captured[0]?.created_at,
        openInvoices:  pmts.filter(p => p.status === "created").length,
      });
    } catch (err) {
      console.error(err);
      setPayments([]);
      setStats({ totalPaid: 0, totalPayments: 0, lastPayment: null, openInvoices: 0 });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (inv) => {
    showToast(`Generating ${inv.invoice_no}�`);
    const user = JSON.parse(localStorage.getItem("safeg_user") || "{}");
    const plan = PLAN_META[inv.plan_id] || PLAN_META.growth;
    const html = `
      <html><head><style>
        body{font-family:Arial,sans-serif;padding:40px;color:#111}
        .header{display:flex;justify-content:space-between;margin-bottom:40px}
        .logo{font-size:24px;font-weight:900;color:#FF4D00}
        .title{font-size:32px;font-weight:900;margin-bottom:4px}
        .table{width:100%;border-collapse:collapse;margin-top:24px}
        .table th{background:#f5f5f5;padding:10px 14px;text-align:left;font-size:12px}
        .table td{padding:10px 14px;border-bottom:1px solid #eee;font-size:13px}
        .total{font-size:18px;font-weight:900;text-align:right;margin-top:20px}
        .badge{background:#FF4D0010;color:#FF4D00;padding:3px 10px;border-radius:6px;font-size:11px;font-weight:700}
        .footer{margin-top:40px;font-size:11px;color:#888;border-top:1px solid #eee;padding-top:20px}
      </style></head><body>
        <div class="header">
          <div><div class="logo">SafeguardIQ Enterprise</div><div style="font-size:11px;color:#888">by Syyaim Enterprises</div></div>
          <div style="text-align:right">
            <div class="title">INVOICE</div>
            <div style="font-size:13px;color:#888">${inv.invoice_no || `INV-${Date.now()}`}</div>
            <div style="font-size:12px;color:#888;margin-top:4px">${new Date(inv.created_at).toLocaleDateString("en-IN", { day:"2-digit", month:"long", year:"numeric" })}</div>
          </div>
        </div>
        <div style="display:flex;gap:40px;margin-bottom:32px">
          <div><div style="font-size:11px;color:#888;margin-bottom:6px">BILLED TO</div>
            <div style="font-weight:700">${inv.company_name || user.companyName || "�"}</div>
            <div style="font-size:12px;color:#555">${user.email || "�"}</div>
          </div>
          <div><div style="font-size:11px;color:#888;margin-bottom:6px">STATUS</div>
            <span class="badge">${inv.status?.toUpperCase()}</span>
          </div>
        </div>
        <table class="table">
          <thead><tr><th>Description</th><th>Plan</th><th>Billing</th><th>Amount</th></tr></thead>
          <tbody>
            <tr>
              <td>SafeguardIQ Enterprise ${plan.label} Plan</td>
              <td>${plan.label}</td>
              <td>${inv.billing_cycle === "annual" ? "Annual" : "Monthly"}</td>
              <td style="font-weight:700">&#8377;${((inv.total_amount || 0) / 100).toLocaleString("en-IN")}</td>
            </tr>
            <tr><td colspan="3" style="text-align:right;font-size:12px;color:#888">GST (18%)</td>
              <td>&#8377;${Math.round((inv.total_amount || 0) / 118).toLocaleString("en-IN")}</td></tr>
          </tbody>
        </table>
        <div class="total">Total: &#8377;${((inv.total_amount || 0) / 100).toLocaleString("en-IN")}</div>
        <div class="footer">
          SafeguardIQ Enterprise � Syyaim Enterprises � mazhar.imam@syyaim.com � +91 96744 08408<br>
          Kolkata, West Bengal � safeguardsiq.com<br>
          Payment ID: ${inv.razorpay_payment_id || "�"}
        </div>
      </body></html>
    `;
    const blob = new Blob([html], { type:"text/html" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    setTimeout(() => { win?.print(); }, 500);
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await fetch(`${API}/payments/cancel-subscription`, {
        method: 'POST',
        headers: { ...authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason }),
      });
      setCancelDone(true);
      // Update localStorage plan to cancelled
      localStorage.setItem('safeg_plan', 'cancelled');
    } catch (e) {
      alert('Cancellation failed. Please try again or contact support.');
    } finally {
      setCancelling(false);
    }
  };

  const handleRefund = async ({ paymentId, reason, amount }) => {
    const res = await fetch(`${API}/payments/refund`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader() },
      body: JSON.stringify({ paymentId, reason, amount }),
    }).then(r => r.json());

    if (!res.success) throw new Error(res.message);
    showToast("Refund initiated — 5-7 business days");
    loadAll();
  };

  const showToast = (msg, type = "success") => {

    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const plan = PLAN_META[currentPlan] || PLAN_META.growth;

  return (
    <>
      <style>{G}</style>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px", minHeight: "100vh" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32, animation: "fadeUp .4s ease" }}>
          <div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 30, fontWeight: 800 }}>Billing & Payments</div>
            <div style={{ fontSize: 14, color: T.fog, marginTop: 4 }}>Manage your subscription, invoices and billing details</div>
          </div>
          <button onClick={onUpgrade} style={{
            background: `linear-gradient(135deg, ${T.ember}, ${T.flame})`,
            color: "#fff", border: "none",
            padding: "11px 24px", borderRadius: 12, fontSize: 14, fontWeight: 700,
            boxShadow: "0 6px 20px rgba(255,77,0,.3)",
          }}>⚡ Upgrade Plan</button>
        </div>

        {/* Current plan banner */}
        <div style={{
          background: `linear-gradient(135deg, ${plan.color}18 0%, ${T.card} 100%)`,
          border: `1.5px solid ${plan.color}44`,
          borderRadius: 20, padding: "22px 28px",
          marginBottom: 28, animation: "fadeUp .4s ease .1s both",
          display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: `${plan.color}20`, border: `1.5px solid ${plan.color}44`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22, color: plan.color,
            }}>{plan.icon}</div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 800 }}>
                  {plan.label} Plan
                </span>
                <span style={{
                  fontSize: 10, padding: "2px 8px", borderRadius: 8, fontWeight: 700,
                  background: `${plan.color}20`, color: plan.color, border: `1px solid ${plan.color}33`,
                }}>ACTIVE</span>
              </div>
              <div style={{ fontSize: 13, color: T.fog, marginTop: 3 }}>
                {cameraCount ? `${cameraCount} cameras` : plan.limit} · {trialEndsAt
                  ? `Trial ends ${new Date(trialEndsAt).toLocaleDateString("en-IN", {day:"2-digit",month:"short",year:"numeric"})}`
                  : stats?.lastPayment
                    ? `Last paid ${new Date(stats.lastPayment).toLocaleDateString("en-IN", {day:"2-digit",month:"short",year:"numeric"})}`
                    : "No active subscription"}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setShowCancelModal(true)} style={{
              padding: "9px 18px", background: "transparent",
              border: `1.5px solid ${T.rose}44`, borderRadius: 10,
              color: T.rose, fontSize: 13, cursor: "pointer",
              fontFamily: "'Instrument Sans',sans-serif",
            }}>Cancel subscription</button>

            {currentPlan !== "enterprise" && (
              <button onClick={onUpgrade} style={{
                padding: "9px 18px", background: `${plan.color}20`,
                border: `1.5px solid ${plan.color}44`, borderRadius: 10,
                color: plan.color, fontSize: 13, fontWeight: 600,
              }}>Upgrade →</button>
            )}
          </div>
        </div>

        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28, animation: "fadeUp .4s ease .2s both" }}>
          <StatCard icon="💰" label="Total Paid" color={T.jade}
            value={loading ? "…" : fmtINR(stats?.totalPaid)}
            sub="All time" loading={loading}/>
          <StatCard icon="📄" label="Invoices" color={T.sky}
            value={loading ? "…" : stats?.totalPayments || 0}
            sub="Successful" loading={loading}/>
          <StatCard icon="⏳" label="Pending" color={T.amber}
            value={loading ? "…" : stats?.openInvoices || 0}
            sub="Open invoices" loading={loading}/>
          <StatCard icon="📅" label="Last Payment" color={T.violet}
            value={loading ? "…" : fmtDate(stats?.lastPayment)}
            loading={loading}/>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: `1px solid ${T.line}`, animation: "fadeUp .4s ease .3s both" }}>
          {[["overview","Overview"],["invoices","Invoice History"],["methods","Payment Methods"]].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              padding: "10px 20px", border: "none", background: "transparent",
              color: tab === id ? T.snow : T.fog,
              borderBottom: `2px solid ${tab === id ? T.ember : "transparent"}`,
              fontSize: 14, fontWeight: tab === id ? 700 : 400,
              marginBottom: -1,
            }}>{label}</button>
          ))}
        </div>

        {/* Invoice table */}
        {(tab === "overview" || tab === "invoices") && (
          <div style={{
            background: T.panel, border: `1.5px solid ${T.line}`,
            borderRadius: 20, overflow: "hidden", animation: "fadeUp .4s ease .35s both",
          }}>
            <div style={{ padding: "18px 20px", borderBottom: `1px solid ${T.line}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 15, fontWeight: 700 }}>Invoice History</div>
              <div style={{ fontSize: 12, color: T.ghost }}>{payments.length} records</div>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: T.ink }}>
                    {["Invoice","Plan","Amount","Status","Payment ID","Actions"].map(h => (
                      <th key={h} style={{
                        padding: "10px 12px", textAlign: "left",
                        fontSize: 10, color: T.ghost, textTransform: "uppercase",
                        letterSpacing: 1.5, fontFamily: "'DM Mono',monospace",
                        borderBottom: `1px solid ${T.line}`, fontWeight: 500,
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array(3).fill(0).map((_,i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${T.edge}` }}>
                        {Array(6).fill(0).map((_,j) => (
                          <td key={j} style={{ padding: "14px 12px" }}>
                            <Skeleton h={16} w={80 + j * 20}/>
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : payments.length === 0 ? (
                    <tr><td colSpan={6} style={{ padding: "40px", textAlign: "center", color: T.fog, fontSize: 14 }}>
                      No payments yet — <button onClick={onUpgrade} style={{ background: "none", border: "none", color: T.ember, cursor: "pointer", fontWeight: 700 }}>subscribe to a plan →</button>
                    </td></tr>
                  ) : (
                    payments.map(inv => (
                      <InvoiceRow key={inv.id} inv={inv}
                        onDownload={handleDownload}
                        onRefund={setRefundModal}/>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Payment methods tab */}
        {tab === "methods" && (
          <div style={{ animation: "fadeUp .4s ease" }}>
            <div style={{
              background: T.panel, border: `1.5px solid ${T.line}`,
              borderRadius: 20, padding: 32, textAlign: "center",
            }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>💳</div>
              <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
                Manage Payment Methods
              </div>
              <div style={{ fontSize: 14, color: T.fog, maxWidth: 500, margin: "0 auto 24px" }}>
                Payment methods are securely managed by Razorpay. Your saved UPI, cards and net banking appear automatically at checkout.
              </div>
              <div style={{
                background: T.ink, border: `1.5px solid ${T.line}`,
                borderRadius: 16, padding: 20, marginBottom: 24, textAlign: "left",
              }}>
                <div style={{ fontSize: 12, color: T.ghost, marginBottom: 10, textTransform: "uppercase", fontWeight: 700 }}>Last Payment Method</div>
                {payments.length > 0 && payments[0].razorpay_payment_id ? (
                  <div>
                    <div style={{ fontSize: 13, color: T.fog, marginBottom: 6 }}>Payment ID:</div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: T.snow, wordBreak: "break-all" }}>
                      {payments[0].razorpay_payment_id?.slice(0, 20)}...
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: T.ghost }}>No payment history yet</div>
                )}
              </div>
              <button onClick={onUpgrade} style={{
                background: `linear-gradient(135deg, ${T.ember}, ${T.flame})`,
                color: "#fff", border: "none",
                padding: "11px 24px", borderRadius: 10, fontSize: 13, fontWeight: 700,
              }}>Make a Payment →</button>
            </div>
          </div>
        )}
      </div>

      {/* Refund modal */}
      {refundModal && (
        <RefundModal
          payment={refundModal}
          onConfirm={handleRefund}
          onClose={() => setRefundModal(null)}
        />
      )}

      {/* Cancel Subscription Modal */}
      {showCancelModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(5,8,15,.88)", backdropFilter: "blur(6px)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            background: T.ink, border: `1.5px solid ${T.line}`,
            borderRadius: 20, padding: 36, maxWidth: 460, width: "90%",
            fontFamily: "'Instrument Sans',sans-serif",
          }}>
            {!cancelDone ? (
              <>
                <div style={{ fontSize: 36, marginBottom: 16, textAlign: "center" }}>⚠️</div>
                <div style={{
                  fontSize: 20, fontWeight: 800, color: T.snow,
                  marginBottom: 8, textAlign: "center"
                }}>
                  Cancel Subscription?
                </div>
                <div style={{
                  fontSize: 13, color: T.fog, marginBottom: 20,
                  textAlign: "center", lineHeight: 1.6,
                }}>
                  You will retain full access until the end of your current billing period.
                  After that, your account will be locked.
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{
                    fontSize: 11, color: T.fog, letterSpacing: 1.5,
                    fontWeight: 700, display: "block", marginBottom: 6,
                  }}>
                    REASON (OPTIONAL)
                  </label>
                  <select
                    value={cancelReason}
                    onChange={e => setCancelReason(e.target.value)}
                    style={{
                      width: "100%", background: T.panel,
                      border: `1.5px solid ${T.line}`,
                      borderRadius: 10,
                      padding: "11px 14px",
                      color: T.snow,
                      fontSize: 13,
                      fontFamily: "'Instrument Sans',sans-serif",
                      cursor: "pointer",
                    }}
                  >
                    <option value="">Select a reason…</option>
                    <option value="Too expensive">Too expensive</option>
                    <option value="Not using it enough">Not using it enough</option>
                    <option value="Missing features I need">Missing features I need</option>
                    <option value="Switching to another solution">Switching to another solution</option>
                    <option value="Technical issues">Technical issues</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={() => setShowCancelModal(false)}
                    style={{
                      flex: 1, padding: "12px", background: "transparent",
                      border: `1.5px solid ${T.line}`,
                      borderRadius: 10,
                      color: T.fog, fontSize: 14, fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "'Instrument Sans',sans-serif",
                    }}
                  >
                    Keep Subscription
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={cancelling}
                    style={{
                      flex: 1, padding: "12px",
                      background: cancelling ? T.ghost : T.rose,
                      border: "none", borderRadius: 10, color: "#fff",
                      fontSize: 14, fontWeight: 700,
                      cursor: cancelling ? "not-allowed" : "pointer",
                      fontFamily: "'Instrument Sans',sans-serif",
                    }}
                  >
                    {cancelling ? "Cancelling…" : "Yes, Cancel"}
                  </button>
                </div>
              </>
            ) : (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: T.snow, marginBottom: 10 }}>
                  Subscription Cancelled
                </div>
                <div style={{ fontSize: 13, color: T.fog, lineHeight: 1.7, marginBottom: 24 }}>
                  Your subscription has been cancelled. You'll retain full access
                  until the end of your current billing period.
                </div>
                <div style={{ fontSize: 12, color: T.ghost, marginBottom: 20 }}>
                  Changed your mind? Contact us at{" "}
                  <span style={{ color: T.ember }}>mazhar.imam@syyaim.com</span>
                </div>
                <button
                  onClick={() => { setShowCancelModal(false); setCancelDone(false); }}
                  style={{
                    padding: "12px 32px", background: T.ember,
                    border: "none", borderRadius: 10, color: "#fff",
                    fontSize: 14, fontWeight: 700, cursor: "pointer",
                    fontFamily: "'Instrument Sans',sans-serif",
                  }}
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toast */}

      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 9999,
          background: T.panel, border: `1.5px solid ${T.jade}44`,
          borderRadius: 12, padding: "13px 20px",
          display: "flex", alignItems: "center", gap: 10,
          fontSize: 13, color: T.snow,
          boxShadow: "0 8px 32px rgba(0,0,0,.5)",
          animation: "fadeUp .3s ease",
        }}>
          <span style={{ color: T.jade }}>✓</span> {toast.msg}
        </div>
      )}
    </>
  );
}

