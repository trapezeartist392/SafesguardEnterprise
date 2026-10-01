/**
 * ForgotPasswordPage.jsx
 * SafeguardIQ Enterprise — Forgot Password
 * Place in: frontend/src/pages/auth/ForgotPasswordPage.jsx
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

const T = {
  bg:"#05070E", card:"#0D1120", border:"#141E32",
  orange:"#FF5B18", teal:"#00D4B4", white:"#EEF2FF",
  g1:"#7B90B8", g2:"#344A6E", red:"#FF3D3D", green:"#22D468",
};

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!email) { setError("Please enter your email address"); return; }
    setLoading(true); setError("");
    try {
      await axios.post("/api/v1/auth/forgot-password", { email });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight:"100vh", background:T.bg, display:"flex",
      alignItems:"center", justifyContent:"center", padding:"20px",
      fontFamily:"'Nunito',sans-serif", position:"relative", overflow:"hidden" }}>

      {/* Background grid */}
      <div style={{ position:"absolute", inset:0,
        backgroundImage:`linear-gradient(${T.border} 1px,transparent 1px),linear-gradient(90deg,${T.border} 1px,transparent 1px)`,
        backgroundSize:"60px 60px", opacity:.2, pointerEvents:"none" }} />

      {/* Glow */}
      <div style={{ position:"absolute", top:0, left:"50%", transform:"translateX(-50%)",
        width:500, height:300,
        background:`radial-gradient(circle at center,${T.orange}15,transparent 70%)`,
        pointerEvents:"none" }} />

      <div style={{ width:"100%", maxWidth:420, position:"relative", zIndex:1 }}>

        {/* Logo */}
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:32, justifyContent:"center" }}>
          <div style={{ width:40, height:40, background:T.orange,
            clipPath:"polygon(50% 0%,100% 20%,100% 60%,50% 100%,0% 60%,0% 20%)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:18, color:"#fff", fontWeight:700 }}>✓</div>
          <div>
            <div style={{ fontSize:20, fontWeight:800, color:T.white, letterSpacing:2,
              fontFamily:"'Bebas Neue',sans-serif" }}>SAFEGUARDIQ ENTERPRISE</div>
            <div style={{ fontSize:9, color:T.g2, letterSpacing:3,
              fontFamily:"'DM Mono',monospace" }}>FACTORY SAFETY AI</div>
          </div>
        </div>

        <div style={{ background:T.card, border:`1px solid ${T.border}`,
          borderRadius:20, padding:36 }}>

          {!sent ? (
            <>
              <div style={{ marginBottom:28, textAlign:"center" }}>
                <div style={{ fontSize:32, marginBottom:12 }}>🔑</div>
                <div style={{ fontSize:22, fontWeight:800, color:T.white,
                  marginBottom:8, fontFamily:"'Bebas Neue',sans-serif", letterSpacing:2 }}>
                  FORGOT PASSWORD
                </div>
                <div style={{ fontSize:13, color:T.g1, lineHeight:1.6 }}>
                  Enter your registered email address. We'll send a password reset link to your WhatsApp number.
                </div>
              </div>

              {error && (
                <div style={{ background:"rgba(255,61,61,.1)", border:`1px solid rgba(255,61,61,.3)`,
                  borderRadius:10, padding:"11px 14px", color:T.red,
                  fontSize:13, marginBottom:18 }}>
                  ⚠ {error}
                </div>
              )}

              <form onSubmit={submit}>
                <div style={{ marginBottom:20 }}>
                  <label style={{ fontSize:10, color:T.g1, letterSpacing:2,
                    display:"block", marginBottom:7, fontWeight:700,
                    fontFamily:"'DM Mono',monospace" }}>
                    EMAIL ADDRESS
                  </label>
                  <input
                    type="email" required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="suresh@yourcompany.com"
                    style={{ width:"100%", background:"#060810",
                      border:`1px solid ${T.border}`, borderRadius:10,
                      padding:"13px 14px", color:T.white, fontSize:13,
                      fontFamily:"'Nunito',sans-serif", outline:"none",
                      boxSizing:"border-box" }}
                    onFocus={e => e.target.style.borderColor = T.orange}
                    onBlur={e => e.target.style.borderColor = T.border}
                  />
                </div>

                <button type="submit" disabled={loading} style={{
                  width:"100%", border:"none", borderRadius:11, padding:"14px",
                  color:"#fff", fontSize:14, fontWeight:800,
                  fontFamily:"'Nunito',sans-serif",
                  background:loading ? T.g2 : `linear-gradient(135deg,${T.orange},#FF8C52)`,
                  cursor:loading ? "not-allowed" : "pointer",
                  display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                }}>
                  {loading ? (
                    <>
                      <div style={{ width:16, height:16,
                        border:"2px solid rgba(255,255,255,.3)",
                        borderTopColor:"#fff", borderRadius:"50%",
                        animation:"spin .8s linear infinite" }} />
                      Sending...
                    </>
                  ) : "📱 Send Reset Link →"}
                </button>
              </form>

              <div style={{ textAlign:"center", marginTop:20 }}>
                <Link to="/login" style={{ fontSize:12, color:T.g2,
                  textDecoration:"none" }}>
                  ← Back to Login
                </Link>
              </div>
            </>
          ) : (
            /* Success state */
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:52, marginBottom:16 }}>📱</div>
              <div style={{ fontSize:22, fontWeight:800, color:T.green,
                marginBottom:10, fontFamily:"'Bebas Neue',sans-serif", letterSpacing:2 }}>
                CHECK YOUR WHATSAPP
              </div>
              <div style={{ fontSize:13, color:T.g1, lineHeight:1.7, marginBottom:24 }}>
                If <strong style={{ color:T.white }}>{email}</strong> is registered,
                a password reset link has been sent to the WhatsApp number on your account.
              </div>
              <div style={{ background:`rgba(0,212,180,.06)`,
                border:`1px solid rgba(0,212,180,.2)`,
                borderRadius:12, padding:"14px 18px", marginBottom:24,
                fontSize:12, color:T.teal, lineHeight:1.6 }}>
                💡 The link expires in <strong>1 hour</strong>.<br/>
                Didn't receive it? Make sure your WhatsApp number is saved in your account settings.
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                <button onClick={() => { setSent(false); setEmail(""); }}
                  style={{ background:"transparent", border:`1px solid ${T.border}`,
                    borderRadius:10, padding:"11px", color:T.g1, fontSize:13,
                    fontWeight:700, cursor:"pointer", fontFamily:"'Nunito',sans-serif" }}>
                  Try a different email
                </button>
                <Link to="/login" style={{ display:"block", textAlign:"center",
                  padding:"11px", borderRadius:10, fontSize:13, fontWeight:700,
                  color:"#fff", textDecoration:"none",
                  background:`linear-gradient(135deg,${T.orange},#FF8C52)` }}>
                  Back to Login
                </Link>
              </div>
            </div>
          )}
        </div>

        <div style={{ textAlign:"center", marginTop:16, fontSize:11, color:T.g2 }}>
          Need help? WhatsApp{" "}
          <span style={{ color:T.teal, fontWeight:700 }}>+91 96744 08408</span>
        </div>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
