import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { useLang } from "../../i18n/LanguageContext";
import LanguageToggle from "../../components/LanguageToggle";


const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Nunito:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes gridMove{from{transform:translateY(0)}to{transform:translateY(60px)}}
@keyframes pulse{0%,100%{opacity:.4}50%{opacity:.9}}
@keyframes spin{to{transform:rotate(360deg)}}
`;

const T = {
  bg: "#05080F", bg2: "#080D18", card: "#0C1422",
  border: "#1A2540", orange: "#FF5B18", teal: "#00D4B4",
  white: "#EDF2FF", g1: "#8899BB", g2: "#3A4E72", green: "#22D468", red: "#FF3D3D",
};

export default function LoginPage({ onLogin }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { t, lang } = useLang();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await axios.post("/api/v1/auth/login", form);
      const { accessToken, refreshToken, user, tenantId } = res.data.data;
      localStorage.setItem("safeg_token", accessToken);
      localStorage.setItem("safeg_refresh", refreshToken);
      localStorage.setItem("safeg_user", JSON.stringify(user));
      localStorage.setItem("safeg_tenant", tenantId);
      localStorage.setItem("safeg_plan", res.data?.data?.plan || "enterprise");
      onLogin?.(user);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || t('invalid_login'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{CSS}</style>
      <div style={{ minHeight: "100vh", background: T.bg, display: "flex", fontFamily: "'Nunito',sans-serif", position: "relative", overflow: "hidden" }}>

        {/* Language toggle — top right */}
        <div style={{ position:"absolute", top:20, right:20, zIndex:10 }}>
          <LanguageToggle />
        </div>

        {/* Animated grid background */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(${T.border} 1px,transparent 1px),linear-gradient(90deg,${T.border} 1px,transparent 1px)`, backgroundSize: "60px 60px", animation: "gridMove 4s linear infinite", opacity: 0.4 }} />

        {/* Left panel — branding */}
        <div style={{ width: "50%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 64px", position: "relative", zIndex: 1 }}>
          <div style={{ animation: "fadeUp .6s ease both" }}>
            {/* Logo */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 56 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: `linear-gradient(135deg,${T.orange},#FF8C52)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 900, color: "#fff", fontFamily: "'Bebas Neue'" }}>S</div>
              <div>
                <div style={{ fontFamily: "'Bebas Neue'", fontSize: 22, letterSpacing: 3, color: T.white }}>SafeguardIQ Enterprise</div>
                <div style={{ fontSize: 11, color: T.g1, letterSpacing: 2 }}>
                  {lang === 'hi' ? 'फ़ैक्टरी सुरक्षा इंटेलिजेंस' : 'FACTORY SAFETY INTELLIGENCE'}
                </div>
              </div>
            </div>

            <div style={{ fontFamily: "'Bebas Neue'", fontSize: lang === 'hi' ? 36 : 56, lineHeight: 1.1, color: T.white, marginBottom: 16 }}>
              {lang === 'hi'
                ? <>{t('workers')} की<br /><span style={{ color: T.orange }}>सुरक्षा</span><br />हमारी जिम्मेदारी</>
                : <>PROTECTING<br /><span style={{ color: T.orange }}>INDIA'S</span><br />WORKERS</>
              }
            </div>
            <p style={{ color: T.g1, fontSize: 15, lineHeight: 1.7, maxWidth: 420, marginBottom: 48 }}>
              {lang === 'hi'
                ? 'AI-संचालित PPE अनुपालन निगरानी। रियल-टाइम अलर्ट, फैक्ट्री अधिनियम फॉर्म 18 ऑटोमेशन, और 98.7% सटीकता।'
                : 'AI-powered PPE compliance monitoring for factories. Real-time alerts, Factories Act Form 18 automation, and 98.7% detection accuracy.'}
            </p>

            {/* Stats */}
            <div style={{ display: "flex", gap: 32 }}>
              {[
                ["98.7%", lang === 'hi' ? "AI सटीकता" : "AI Accuracy"],
                ["<3s",   lang === 'hi' ? "पहचान समय" : "Detection"],
              ].map(([v,l])=>(
                <div key={l}>
                  <div style={{ fontFamily: "'Bebas Neue'", fontSize: 28, color: T.orange, letterSpacing: 1 }}>{v}</div>
                  <div style={{ fontSize: 11, color: T.g1, letterSpacing: 1.5 }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right panel — login form */}
        <div style={{ width: "50%", display: "flex", alignItems: "center", justifyContent: "center", padding: 40, position: "relative", zIndex: 1 }}>
          <div style={{ width: "100%", maxWidth: 420, background: T.card, border: `1px solid ${T.border}`, borderRadius: 20, padding: 40, animation: "fadeUp .7s ease both" }}>

            <div style={{ marginBottom: 32 }}>
              <div style={{ fontFamily: "'Bebas Neue'", fontSize: 32, color: T.white, letterSpacing: 2, marginBottom: 6 }}>
                {lang === 'hi' ? 'वापस स्वागत है' : 'WELCOME BACK'}
              </div>
              <div style={{ color: T.g1, fontSize: 14 }}>
                {lang === 'hi' ? 'SafeguardIQ Enterprise में साइन इन करें' : 'Sign in to SafeguardIQ Enterprise'}
              </div>
            </div>

            {error && (
              <div style={{ background: "rgba(255,61,61,.1)", border: `1px solid rgba(255,61,61,.3)`, borderRadius: 10, padding: "12px 16px", color: T.red, fontSize: 13, marginBottom: 20 }}>
                ⚠ {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Email */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: T.g1, letterSpacing: 1.5, display: "block", marginBottom: 8, fontWeight: 600 }}>
                  {t('email').toUpperCase()}
                </label>
                <input
                  type="email" required
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="you@company.com"
                  style={{ width: "100%", background: "#08101E", border: `1px solid ${T.border}`, borderRadius: 10, padding: "14px 16px", color: T.white, fontSize: 14, fontFamily: "'Nunito'", outline: "none" }}
                />
              </div>

              {/* Password */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <label style={{ fontSize: 12, color: T.g1, letterSpacing: 1.5, fontWeight: 600 }}>
                    {t('password').toUpperCase()}
                  </label>
                  <Link to="/forgot-password" style={{ fontSize: 12, color: T.orange, textDecoration: "none" }}>
                    {t('forgot_password')}
                  </Link>
                </div>
                <input
                  type="password" required
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••"
                  style={{ width: "100%", background: "#08101E", border: `1px solid ${T.border}`, borderRadius: 10, padding: "14px 16px", color: T.white, fontSize: 14, fontFamily: "'Nunito'", outline: "none" }}
                />
              </div>

              {/* Demo credentials autofill */}
              <button
                type="button"
                onClick={() => setForm({ email: "admin@bharatforge.com", password: "Admin@123" })}
                style={{
                  width:"100%", background:"none",
                  border:`1px dashed ${T.orange}60`,
                  borderRadius:10, padding:"10px",
                  color:T.orange, fontSize:12,
                  fontWeight:700, cursor:"pointer",
                  fontFamily:"'Nunito',sans-serif",
                  marginBottom:12, letterSpacing:0.5,
                  display:"flex", alignItems:"center",
                  justifyContent:"center", gap:8,
                }}
              >
                {t('autofill_demo')}
              </button>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                style={{ width: "100%", background: loading ? T.g2 : `linear-gradient(135deg,${T.orange},#FF8C52)`, border: "none", borderRadius: 10, padding: "15px", color: "#fff", fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", fontFamily: "'Nunito'", letterSpacing: 0.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}
              >
                {loading ? (
                  <>
                    <div style={{ width: 18, height: 18, border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin .8s linear infinite" }} />
                    {t('logging_in')}
                  </>
                ) : t('login_btn') + ' →'}
              </button>
            </form>

            {/* Demo credentials */}
            <div style={{ marginTop: 20, background: "rgba(0,212,180,.06)", border: `1px solid rgba(0,212,180,.2)`, borderRadius: 10, padding: "12px 16px" }}>
              <div style={{ fontSize: 11, color: T.teal, letterSpacing: 1.5, fontWeight: 700, marginBottom: 6 }}>
                {lang === 'hi' ? 'डेमो क्रेडेंशियल' : 'DEMO CREDENTIALS'}
              </div>
              <div style={{ fontSize: 12, color: T.g1, fontFamily: "'DM Mono'" }}>admin@bharatforge.com</div>
              <div style={{ fontSize: 12, color: T.g1, fontFamily: "'DM Mono'" }}>Admin@123</div>
            </div>

            <div style={{ textAlign: "center", marginTop: 24, fontSize: 13, color: T.g1 }}>
              <Link
                to="/free-trial"
                style={{
                  display: "inline-block",
                  width: "100%",
                  background: "linear-gradient(135deg,#FF5B18,#FF8C52)",
                  color: "#fff",
                  fontWeight: 800,
                  textDecoration: "none",
                  borderRadius: 10,
                  padding: "11px 0",
                  fontSize: 14,
                  marginBottom: 10,
                }}
              >
                🎁 Start 14-Day Free Trial →
              </Link>
              <div style={{ fontSize: 12, color: T.g2 }}>
                {lang === 'hi' ? 'पहले से खाता है? ' : "Already have an account? "}
                <Link to="/signup" style={{ color: T.orange, fontWeight: 700, textDecoration: "none" }}>
                  Sign up →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}


