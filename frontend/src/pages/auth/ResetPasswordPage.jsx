/**
 * ResetPasswordPage.jsx
 * SafeguardIQ Enterprise — Reset Password (token from URL)
 * Place in: frontend/src/pages/auth/ResetPasswordPage.jsx
 * Route: /reset-password?token=XXXX
 */
import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";

const T = {
  bg:"#05070E", card:"#0D1120", border:"#141E32",
  orange:"#FF5B18", teal:"#00D4B4", white:"#EEF2FF",
  g1:"#7B90B8", g2:"#344A6E", red:"#FF3D3D", green:"#22D468",
};

export default function ResetPasswordPage() {
  const [searchParams]          = useSearchParams();
  const navigate                = useNavigate();
  const token                   = searchParams.get("token") || "";
  const [password,  setPassword]  = useState("");
  const [confirm,   setConfirm]   = useState("");
  const [loading,   setLoading]   = useState(false);
  const [done,      setDone]      = useState(false);
  const [error,     setError]     = useState("");
  const [showPass,  setShowPass]  = useState(false);

  useEffect(() => {
    if (!token) setError("Invalid reset link — no token found. Please request a new one.");
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    if (!password)               { setError("Enter a new password"); return; }
    if (password.length < 8)     { setError("Password must be at least 8 characters"); return; }
    if (password !== confirm)    { setError("Passwords do not match"); return; }
    if (!token)                  { setError("Invalid reset link"); return; }
    setLoading(true); setError("");
    try {
      await axios.post("/api/v1/auth/reset-password", { token, password });
      setDone(true);
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Reset failed — link may have expired. Request a new one.");
    } finally {
      setLoading(false);
    }
  };

  const strength = !password ? null
    : password.length < 8  ? { label:"Too short",  color:T.red,    w:"25%" }
    : password.length < 10 ? { label:"Weak",        color:T.red,    w:"40%" }
    : /[A-Z]/.test(password) && /[0-9]/.test(password) && password.length >= 12
                            ? { label:"Strong",      color:T.green,  w:"100%" }
    : /[A-Z]/.test(password) || /[0-9]/.test(password)
                            ? { label:"Good",        color:T.teal,   w:"70%" }
                            :   { label:"Fair",        color:T.amber,  w:"55%" };

  return (
    <div style={{ minHeight:"100vh", background:T.bg, display:"flex",
      alignItems:"center", justifyContent:"center", padding:"20px",
      fontFamily:"'Nunito',sans-serif", position:"relative", overflow:"hidden" }}>

      {/* Background grid */}
      <div style={{ position:"absolute", inset:0,
        backgroundImage:`linear-gradient(${T.border} 1px,transparent 1px),linear-gradient(90deg,${T.border} 1px,transparent 1px)`,
        backgroundSize:"60px 60px", opacity:.2, pointerEvents:"none" }} />

      <div style={{ position:"absolute", top:0, left:"50%", transform:"translateX(-50%)",
        width:500, height:300,
        background:`radial-gradient(circle at center,${T.orange}15,transparent 70%)`,
        pointerEvents:"none" }} />

      <div style={{ width:"100%", maxWidth:420, position:"relative", zIndex:1 }}>

        {/* Logo */}
        <div style={{ display:"flex", alignItems:"center", gap:12,
          marginBottom:32, justifyContent:"center" }}>
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

          {done ? (
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:52, marginBottom:16 }}>✅</div>
              <div style={{ fontSize:22, fontWeight:800, color:T.green,
                marginBottom:10, fontFamily:"'Bebas Neue',sans-serif", letterSpacing:2 }}>
                PASSWORD UPDATED
              </div>
              <div style={{ fontSize:13, color:T.g1, lineHeight:1.7, marginBottom:20 }}>
                Your password has been reset successfully.<br/>
                Redirecting to login in 3 seconds…
              </div>
              <Link to="/login" style={{ display:"block", textAlign:"center",
                padding:"12px", borderRadius:10, fontSize:14, fontWeight:700,
                color:"#fff", textDecoration:"none",
                background:`linear-gradient(135deg,${T.orange},#FF8C52)` }}>
                → Login Now
              </Link>
            </div>
          ) : (
            <>
              <div style={{ marginBottom:28, textAlign:"center" }}>
                <div style={{ fontSize:32, marginBottom:12 }}>🔐</div>
                <div style={{ fontSize:22, fontWeight:800, color:T.white,
                  marginBottom:8, fontFamily:"'Bebas Neue',sans-serif", letterSpacing:2 }}>
                  SET NEW PASSWORD
                </div>
                <div style={{ fontSize:13, color:T.g1 }}>
                  Choose a strong password for your account.
                </div>
              </div>

              {error && (
                <div style={{ background:"rgba(255,61,61,.1)",
                  border:`1px solid rgba(255,61,61,.3)`, borderRadius:10,
                  padding:"11px 14px", color:T.red, fontSize:13, marginBottom:18 }}>
                  ⚠ {error}
                  {error.includes("expired") && (
                    <div style={{ marginTop:8 }}>
                      <Link to="/forgot-password" style={{ color:T.orange,
                        fontWeight:700, fontSize:12 }}>
                        Request a new reset link →
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {!token && !error && (
                <div style={{ background:"rgba(255,61,61,.1)",
                  border:`1px solid rgba(255,61,61,.3)`, borderRadius:10,
                  padding:"11px 14px", color:T.red, fontSize:13, marginBottom:18 }}>
                  ⚠ Invalid reset link.{" "}
                  <Link to="/forgot-password" style={{ color:T.orange, fontWeight:700 }}>
                    Request a new one →
                  </Link>
                </div>
              )}

              <form onSubmit={submit}>
                {/* New password */}
                <div style={{ marginBottom:16 }}>
                  <label style={{ fontSize:10, color:T.g1, letterSpacing:2,
                    display:"block", marginBottom:7, fontWeight:700,
                    fontFamily:"'DM Mono',monospace" }}>
                    NEW PASSWORD
                  </label>
                  <div style={{ position:"relative" }}>
                    <input
                      type={showPass ? "text" : "password"} required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Min 8 characters"
                      style={{ width:"100%", background:"#060810",
                        border:`1px solid ${T.border}`, borderRadius:10,
                        padding:"13px 44px 13px 14px", color:T.white, fontSize:13,
                        fontFamily:"'Nunito',sans-serif", outline:"none",
                        boxSizing:"border-box" }}
                      onFocus={e => e.target.style.borderColor = T.orange}
                      onBlur={e => e.target.style.borderColor = T.border}
                    />
                    <button type="button" onClick={() => setShowPass(p => !p)}
                      style={{ position:"absolute", right:12, top:"50%",
                        transform:"translateY(-50%)", background:"none",
                        border:"none", color:T.g2, cursor:"pointer", fontSize:14 }}>
                      {showPass ? "🙈" : "👁️"}
                    </button>
                  </div>
                  {/* Strength bar */}
                  {strength && (
                    <div style={{ marginTop:8 }}>
                      <div style={{ height:3, background:T.border, borderRadius:3, overflow:"hidden" }}>
                        <div style={{ height:"100%", width:strength.w,
                          background:strength.color, borderRadius:3,
                          transition:"width .3s, background .3s" }} />
                      </div>
                      <div style={{ fontSize:10, color:strength.color,
                        marginTop:4, fontWeight:700 }}>{strength.label}</div>
                    </div>
                  )}
                </div>

                {/* Confirm password */}
                <div style={{ marginBottom:24 }}>
                  <label style={{ fontSize:10, color:T.g1, letterSpacing:2,
                    display:"block", marginBottom:7, fontWeight:700,
                    fontFamily:"'DM Mono',monospace" }}>
                    CONFIRM PASSWORD
                  </label>
                  <input
                    type={showPass ? "text" : "password"} required
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Re-enter new password"
                    style={{ width:"100%", background:"#060810",
                      border:`1px solid ${confirm && confirm !== password ? T.red : confirm && confirm === password ? T.green : T.border}`,
                      borderRadius:10, padding:"13px 14px", color:T.white,
                      fontSize:13, fontFamily:"'Nunito',sans-serif",
                      outline:"none", boxSizing:"border-box" }}
                  />
                  {confirm && confirm === password && (
                    <div style={{ fontSize:11, color:T.green, marginTop:4 }}>✓ Passwords match</div>
                  )}
                  {confirm && confirm !== password && (
                    <div style={{ fontSize:11, color:T.red, marginTop:4 }}>✗ Passwords do not match</div>
                  )}
                </div>

                <button type="submit" disabled={loading || !token} style={{
                  width:"100%", border:"none", borderRadius:11, padding:"14px",
                  color:"#fff", fontSize:14, fontWeight:800,
                  fontFamily:"'Nunito',sans-serif",
                  background:loading || !token ? T.g2 : `linear-gradient(135deg,${T.orange},#FF8C52)`,
                  cursor:loading || !token ? "not-allowed" : "pointer",
                  display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                }}>
                  {loading ? (
                    <>
                      <div style={{ width:16, height:16,
                        border:"2px solid rgba(255,255,255,.3)",
                        borderTopColor:"#fff", borderRadius:"50%",
                        animation:"spin .8s linear infinite" }} />
                      Updating...
                    </>
                  ) : "🔐 Reset Password →"}
                </button>
              </form>

              <div style={{ textAlign:"center", marginTop:20 }}>
                <Link to="/login" style={{ fontSize:12, color:T.g2, textDecoration:"none" }}>
                  ← Back to Login
                </Link>
              </div>
            </>
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
