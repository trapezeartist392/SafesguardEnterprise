import { useState, useEffect } from 'react';
import api from '../utils/api';

const DEMO_TENANT = 'ca5b55f4-bcac-4744-b07a-370503414ff1';

export default function TrialExpiredBanner() {
  const [trialInfo,  setTrialInfo]  = useState(null);

  useEffect(() => {
    const check = async () => {
      try {
        const tenantId = localStorage.getItem('safeg_tenant') || '';
        // Never show trial banner on demo account
        if (tenantId === DEMO_TENANT) return;
        const res = await api.get('/trial/status');
        setTrialInfo(res.data.data);
      } catch(e) {}
    };
    check();
  }, []);

  const goToUpgrade = () => {
    window.location.href = "/upgrade";
  };

  if (!trialInfo) return null;
  if (trialInfo.status === 'active') return null;

  const { status, daysLeft, isTrialMode } = trialInfo;

  if (status === 'expired') {
    // Don't block payment/subscribe pages — user needs to reach them to subscribe
    const onPaymentPage = ['/upgrade', '/billing', '/onboarding'].some(p =>
      window.location.pathname.startsWith(p)
    );

    return (
      <>
        {/* Full-screen lock overlay — only on non-payment pages */}
        {!onPaymentPage && <div style={{
          position:"fixed", inset:0, zIndex:9998,
          background:"rgba(5,8,15,.88)", backdropFilter:"blur(6px)",
          display:"flex", alignItems:"center", justifyContent:"center",
        }}>
          <div style={{
            background:"#0C1422",
            border:"1px solid rgba(255,61,61,.3)",
            borderRadius:20, padding:"44px 52px",
            maxWidth:460, width:"90%", textAlign:"center",
            fontFamily:"'Nunito',sans-serif",
            boxShadow:"0 24px 64px rgba(0,0,0,.6)",
          }}>
            <div style={{fontSize:52, marginBottom:18}}>🔒</div>
            <div style={{
              fontSize:26, fontWeight:800, color:"#EDF2FF",
              marginBottom:10, letterSpacing:1,
            }}>
              Trial Expired
            </div>
            <div style={{
              fontSize:14, color:"#8899BB",
              marginBottom:28, lineHeight:1.7,
            }}>
              Your free trial has ended. Subscribe to continue
              protecting your workers with AI-powered safety monitoring.
            </div>
            <button onClick={goToUpgrade} style={{
              width:"100%",
              background:"linear-gradient(135deg,#FF5B18,#FF8C52)",
              border:"none", borderRadius:12, padding:"15px",
              color:"#fff", fontSize:16, fontWeight:800,
              cursor:"pointer", fontFamily:"'Nunito',sans-serif",
              marginBottom:14,
            }}>
              🔓 Subscribe Now →
            </button>
            <div style={{fontSize:12, color:"#3A4E72", lineHeight:1.6}}>
              Questions? WhatsApp us at{" "}
              <span style={{color:"#00D4B4", fontWeight:700}}>+91 96744 08408</span>
            </div>
          </div>
        </div>}

        {/* Navbar pill (still shows behind overlay for layout) */}
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ display:"flex", alignItems:"center", gap:6,
            background:"rgba(255,61,61,.15)", border:"1px solid rgba(255,61,61,.3)",
            borderRadius:8, padding:"5px 10px" }}>
            <span style={{ fontSize:11 }}>🔒</span>
            <span style={{ fontSize:11, color:"#FF3D3D", fontWeight:700 }}>Trial Expired</span>
          </div>
          <button onClick={goToUpgrade} style={{
            background:"linear-gradient(135deg,#FF5B18,#FF8C52)",
            border:"none", borderRadius:8, padding:"6px 14px",
            color:"#fff", fontSize:11, fontWeight:800, cursor:"pointer",
            whiteSpace:"nowrap",
          }}>
            🔓 Subscribe →
          </button>
        </div>
      </>
    );
  }

  if (isTrialMode && daysLeft !== undefined) {
    const color = daysLeft <= 3 ? '#FF3D3D' : daysLeft <= 7 ? '#FFB400' : '#22D468';
    const urgent = daysLeft <= 7;

    return (
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <div style={{ display:"flex", alignItems:"center", gap:6,
          background:`${color}15`, border:`1px solid ${color}30`,
          borderRadius:8, padding:"5px 10px" }}>
          <span style={{ fontSize:11 }}>{urgent ? "⚠️" : "🎯"}</span>
          <span style={{ fontSize:11, color, fontWeight:700 }}>
            {daysLeft}d left
          </span>
          <span style={{ fontSize:10, color:"#8899BB" }}>trial</span>
        </div>
        <button onClick={goToUpgrade} style={{
          background:`linear-gradient(135deg,#FF5B18,#FF8C52)`,
          border:"none", borderRadius:8, padding:"6px 14px",
          color:"#fff", fontSize:11, fontWeight:800,
          cursor:"pointer",
          whiteSpace:"nowrap",
          display:"flex", alignItems:"center", gap:4,
        }}>
          💳 Subscribe →
        </button>
      </div>
    );
  }

  return null;
}
