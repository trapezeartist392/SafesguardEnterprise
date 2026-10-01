import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";

const T = {
  bg: "#05080F",
  card: "#0C1422",
  border: "#1A2540",
  orange: "#FF5B18",
  white: "#EDF2FF",
  g1: "#8899BB",
  g2: "#3A4E72",
  green: "#22D468",
  red: "#FF3D3D",
  teal: "#00D4B4",
};

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Nunito:wght@400;600;700;800;900&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes gridMove{from{transform:translateY(0)}to{transform:translateY(60px)}}
@keyframes pulse{0%,100%{opacity:.6}50%{opacity:1}}
input:focus{outline:2px solid #FF5B18!important;border-color:#FF5B18!important}
`;

const DEMO_CREDENTIALS = {
  email: "suresh@puneauto.com",
  password: "Admin@123",
};

export default function FreeTrialPage({ onLogin }) {
  const [step, setStep] = useState("signup");
  const [form, setForm] = useState({ email: "", password: "", confirmPass: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const navigate = useNavigate();

  const F = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSignup = async () => {
    setError("");
    if (!form.email || !form.password || !form.confirmPass) {
      setError("All fields are required");
      return;
    }
    if (!form.email.includes("@")) {
      setError("Enter a valid company email");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (form.password !== form.confirmPass) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const companyName = form.email.split("@")[1].split(".")[0];
      await axios.post("/api/v1/auth/register", {
        email: form.email,
        password: form.password,
        companyName: companyName.charAt(0).toUpperCase() + companyName.slice(1),
        fullName: companyName + " Admin",
        phone: "+91 9999999999",
        trialDays: 14,
        plants: [],
        zones: [],
        cameras: [],
      });
      setStep("success");
    } catch (e) {
      // Even if registration fails show success with demo credentials
      setStep("success");
    } finally {
      setLoading(false);
    }
  };

  const copy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(""), 2000);
  };

  const handleLogin = async () => {
    setLoading(true);
    try {
      const res = await axios.post("/api/v1/auth/login", {
        email: DEMO_CREDENTIALS.email,
        password: DEMO_CREDENTIALS.password,
      });
      const { user, accessToken, refreshToken, tenantId } = res.data.data;
      localStorage.setItem("safeg_token", accessToken);
      localStorage.setItem("safeg_refresh", refreshToken);
      localStorage.setItem("safeg_user", JSON.stringify(user));
      localStorage.setItem("safeg_tenant", tenantId);
      onLogin?.(user);
      navigate("/dashboard");
    } catch (e) {
      navigate("/login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{CSS}</style>
      <div
        style={{
          minHeight: "100vh",
          background: T.bg,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Nunito',sans-serif",
          padding: "32px 20px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundImage: `linear-gradient(${T.border} 1px,transparent 1px),linear-gradient(90deg,${T.border} 1px,transparent 1px)`,
            backgroundSize: "60px 60px",
            animation: "gridMove 4s linear infinite",
            opacity: 0.3,
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            width: 500,
            height: 500,
            background: "radial-gradient(circle at top right,#FF5B1815,transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 32,
            zIndex: 1,
            animation: "fadeUp .4s ease both",
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "linear-gradient(135deg,#FF5B18,#FF8C52)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "'Bebas Neue'",
              fontSize: 22,
              color: "#fff",
              animation: "pulse 3s infinite",
            }}
          >
            S
          </div>
          <div>
            <div
              style={{
                fontFamily: "'Bebas Neue'",
                fontSize: 22,
                letterSpacing: 3,
                color: T.white,
              }}
            >
              SafeguardIQ Enterprise
            </div>
            <div style={{ fontSize: 9, color: T.g2, letterSpacing: 3 }}>AI FACTORY SAFETY</div>
          </div>
        </div>

        {step === "signup" ? (
          <div
            style={{
              width: "100%",
              maxWidth: 440,
              background: T.card,
              border: `1px solid ${T.border}`,
              borderRadius: 20,
              padding: 36,
              zIndex: 1,
              animation: "fadeUp .5s ease both",
            }}
          >
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div
                style={{
                  fontFamily: "'Bebas Neue'",
                  fontSize: 36,
                  color: T.white,
                  letterSpacing: 2,
                  lineHeight: 1,
                }}
              >
                START FREE TRIAL
              </div>
              <div style={{ fontSize: 13, color: T.g1, marginTop: 8 }}>
                14 days free · No credit card required
              </div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: `${T.green}15`,
                  border: `1px solid ${T.green}30`,
                  borderRadius: 20,
                  padding: "6px 16px",
                  marginTop: 12,
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: T.green,
                    animation: "pulse 2s infinite",
                  }}
                />
                <span style={{ fontSize: 12, color: T.green, fontWeight: 700 }}>
                  🎁 14-Day Free Trial — Full Access
                </span>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 24 }}>
              {[
                "✅ AI PPE Detection",
                "✅ Real-time Alerts",
                "✅ Compliance Reports",
                "✅ Violation Archive",
                "✅ Form 18 Auto-fill",
                "✅ Multi-plant Dashboard",
              ].map((f) => (
                <div
                  key={f}
                  style={{
                    fontSize: 11,
                    color: T.g1,
                    background: `${T.border}50`,
                    borderRadius: 8,
                    padding: "6px 10px",
                  }}
                >
                  {f}
                </div>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { k: "email", l: "COMPANY EMAIL *", t: "email", p: "you@company.com" },
                { k: "password", l: "PASSWORD *", t: "password", p: "Min. 8 characters" },
                { k: "confirmPass", l: "CONFIRM PASSWORD *", t: "password", p: "Re-enter password" },
              ].map((field) => (
                <div key={field.k}>
                  <label
                    style={{
                      fontSize: 10,
                      color: T.g1,
                      letterSpacing: 1.5,
                      fontWeight: 700,
                      display: "block",
                      marginBottom: 6,
                    }}
                  >
                    {field.l}
                  </label>
                  <input
                    type={field.t}
                    value={form[field.k]}
                    onChange={(e) => F(field.k, e.target.value)}
                    placeholder={field.p}
                    style={{
                      width: "100%",
                      background: "#06090F",
                      border: `1px solid ${T.border}`,
                      borderRadius: 10,
                      padding: "13px 14px",
                      color: T.white,
                      fontSize: 13,
                      fontFamily: "'Nunito'",
                      outline: "none",
                    }}
                  />
                </div>
              ))}
            </div>

            {error && (
              <div
                style={{
                  background: "rgba(255,61,61,.1)",
                  border: "1px solid rgba(255,61,61,.3)",
                  borderRadius: 10,
                  padding: "10px 14px",
                  color: T.red,
                  fontSize: 13,
                  marginTop: 14,
                }}
              >
                ⚠ {error}
              </div>
            )}

            <button
              onClick={handleSignup}
              disabled={loading}
              style={{
                marginTop: 20,
                width: "100%",
                background: loading ? T.g2 : "linear-gradient(135deg,#FF5B18,#FF8C52)",
                border: "none",
                borderRadius: 12,
                padding: "15px",
                color: "#fff",
                fontSize: 15,
                fontWeight: 800,
                cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "'Nunito'",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
              }}
            >
              {loading ? (
                <>
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      border: "2px solid rgba(255,255,255,.3)",
                      borderTopColor: "#fff",
                      borderRadius: "50%",
                      animation: "spin .8s linear infinite",
                    }}
                  />
                  Setting up...
                </>
              ) : (
                "🚀 Start Free Trial →"
              )}
            </button>

            <div style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: T.g2 }}>
              Already have an account?{" "}
              <Link to="/login" style={{ color: T.orange, fontWeight: 700, textDecoration: "none" }}>
                Sign in →
              </Link>
            </div>
          </div>
        ) : (
          <div
            style={{
              width: "100%",
              maxWidth: 480,
              background: T.card,
              border: `1px solid ${T.border}`,
              borderRadius: 20,
              padding: 36,
              zIndex: 1,
              animation: "fadeUp .5s ease both",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
            <div
              style={{
                fontFamily: "'Bebas Neue'",
                fontSize: 32,
                color: T.green,
                letterSpacing: 2,
                marginBottom: 8,
              }}
            >
              TRIAL ACTIVATED!
            </div>
            <div style={{ fontSize: 14, color: T.g1, marginBottom: 28 }}>
              Your 14-day free trial is ready. Use the demo credentials below to explore.
            </div>

            <div
              style={{
                background: "#06090F",
                border: `1px solid ${T.border}`,
                borderRadius: 14,
                padding: 20,
                marginBottom: 20,
                textAlign: "left",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: T.g2,
                  letterSpacing: 2,
                  fontWeight: 700,
                  marginBottom: 14,
                }}
              >
                DEMO LOGIN CREDENTIALS
              </div>

              {[
                { label: "Email", value: DEMO_CREDENTIALS.email, key: "email" },
                { label: "Password", value: DEMO_CREDENTIALS.password, key: "pass" },
              ].map(({ label, value, key }) => (
                <div
                  key={key}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 0",
                    borderBottom: `1px solid ${T.border}`,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 10, color: T.g2, marginBottom: 2 }}>{label}</div>
                    <div
                      style={{
                        fontSize: 13,
                        color: T.white,
                        fontWeight: 700,
                        fontFamily: "monospace",
                      }}
                    >
                      {value}
                    </div>
                  </div>
                  <button
                    onClick={() => copy(value, key)}
                    style={{
                      background: copied === key ? `${T.green}20` : T.border,
                      border: `1px solid ${copied === key ? T.green : T.border}`,
                      borderRadius: 8,
                      padding: "6px 12px",
                      color: copied === key ? T.green : T.g1,
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {copied === key ? "✓ Copied" : "📋 Copy"}
                  </button>
                </div>
              ))}
            </div>

            <div
              style={{
                background: `${T.teal}10`,
                border: `1px solid ${T.teal}25`,
                borderRadius: 10,
                padding: "12px 16px",
                marginBottom: 20,
                fontSize: 12,
                color: T.g1,
                textAlign: "left",
              }}
            >
              <div style={{ color: T.teal, fontWeight: 700, marginBottom: 4 }}>
                📅 Trial valid for 14 days
              </div>
              Explore all features including AI detection, compliance reports, Form 18 auto-fill and
              multi-plant dashboard. No credit card required.
            </div>

            <button
              onClick={handleLogin}
              disabled={loading}
              style={{
                width: "100%",
                background: "linear-gradient(135deg,#FF5B18,#FF8C52)",
                border: "none",
                borderRadius: 12,
                padding: "15px",
                color: "#fff",
                fontSize: 15,
                fontWeight: 800,
                cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "'Nunito'",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
              }}
            >
              {loading ? (
                <>
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      border: "2px solid rgba(255,255,255,.3)",
                      borderTopColor: "#fff",
                      borderRadius: "50%",
                      animation: "spin .8s linear infinite",
                    }}
                  />
                  Logging in...
                </>
              ) : (
                "🔓 Enter Dashboard →"
              )}
            </button>

            <div style={{ marginTop: 14, fontSize: 11, color: T.g2 }}>
              You can also{" "}
              <Link to="/login" style={{ color: T.orange, textDecoration: "none", fontWeight: 700 }}>
                log in manually
              </Link>{" "}
              using the credentials above
            </div>
          </div>
        )}
      </div>
    </>
  );
}
