import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

/* --- FONTS & ANIMATIONS ----------------------------- */
const CSS = `

*{margin:0;padding:0;box-sizing:border-box}
@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideLeft{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.2}}
@keyframes ping{0%{transform:scale(1);opacity:.7}100%{transform:scale(2.2);opacity:0}}
@keyframes flow{0%{stroke-dashoffset:60}100%{stroke-dashoffset:0}}
@keyframes glow{0%,100%{opacity:.6}50%{opacity:1}}
::-webkit-scrollbar{width:4px;height:4px}
::-webkit-scrollbar-track{background:#05070E}
::-webkit-scrollbar-thumb{background:#1E2A40;border-radius:4px}
input,button{font-family:'Syne',sans-serif}
`;

const T = {
  bg:"#05070E",   bg2:"#07090F",  bg3:"#0A0D18",
  card:"#0D1120", card2:"#101520",
  border:"#141E32", border2:"#1C2A45",
  orange:"#FF5B18", orng2:"#FF8040",
  teal:"#00D4B4",  green:"#22D468",
  red:"#FF3D3D",   amber:"#FFB400", blue:"#3D8AFF",
  white:"#EEF2FF", g1:"#7B90B8",   g2:"#344A6E",   g3:"#0D1528",
};

const mono  = { fontFamily:"'Share Tech Mono',monospace" };
const syne  = { fontFamily:"'Syne',sans-serif" };
const dm    = { fontFamily:"'DM Mono',monospace" };

/* --- SHARED ATOMS ----------------------------------- */
function Pill({ color=T.orange, children, size=10 }) {
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"3px 10px", borderRadius:20, fontSize:size, fontWeight:700, background:`${color}18`, color, border:`1px solid ${color}35`, ...mono }}>
      {children}
    </span>
  );
}

function Dot({ color, animate=false }) {
  return (
    <span style={{ position:"relative", display:"inline-flex", width:10, height:10 }}>
      {animate && <span style={{ position:"absolute", inset:0, borderRadius:"50%", background:color, animation:"ping 1.5s infinite" }} />}
      <span style={{ width:10, height:10, borderRadius:"50%", background:color, display:"block", position:"relative" }} />
    </span>
  );
}

function KPI({ label, value, sub, color=T.orange, icon, i=0 }) {
  return (
    <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:14, padding:"20px 22px", animation:`fadeUp .5s ease ${i*.07}s both` }}>
      <div style={{ display:"flex", justifyContent:"space-between" }}>
        <div style={{ fontSize:10, color:T.g1, letterSpacing:2, marginBottom:10, ...mono }}>{label}</div>
        <span style={{ fontSize:20 }}>{icon}</span>
      </div>
      <div style={{ ...syne, fontSize:30, fontWeight:800, color, lineHeight:1, marginBottom:5 }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:T.g2 }}>{sub}</div>}
    </div>
  );
}

function Spinner() {
  return <div style={{ width:28, height:28, border:`2px solid ${T.border}`, borderTopColor:T.orange, borderRadius:"50%", animation:"spin .7s linear infinite" }} />;
}

/* ------------------------------------------------------
   ARCHITECTURE SECTION
------------------------------------------------------ */
function ArchSection({ sysInfo }) {
  const [tab, setTab]   = useState("stack");
  const [open, setOpen] = useState(null);

  // Build real service status from sysInfo
  const SERVICES = [
    { name:"safeg-backend",   tech:"Node.js 22 + Express",  port:4000,
      status: sysInfo ? "online" : "standby",
      icon:"⚙️", c: sysInfo ? T.green : T.amber },
    { name:"safeg-websocket", tech:"WS Server",             port:4000,
      status: sysInfo ? "online" : "standby",
      icon:"🔌", c: sysInfo ? T.green : T.amber },
    { name:"postgres",        tech:"PostgreSQL 16",         port:5432,
      status: sysInfo?.app ? "online" : "standby",
      icon:"🗄️", c: sysInfo?.app ? T.green : T.amber },
    { name:"redis",           tech:"Redis 7",               port:6379,
      status: sysInfo?.server ? "online" : "standby",
      icon:"⚡", c: sysInfo?.server ? T.green : T.amber },
    { name:"ai-engine",       tech:"Python 3.11 FastAPI",   port:5050,
      status: sysInfo?.app?.violations24h >= 0 ? "online" : "standby",
      icon:"🤖", c: sysInfo?.app?.violations24h >= 0 ? T.green : T.amber },
    { name:"nginx",           tech:"Nginx 1.25",            port:443,
      status: "online",
      icon:"🌐", c: T.green },
    { name:"safeg-frontend",  tech:"Vite 5 + React 18",     port:443,
      status: "online",
      icon:"🖥️", c: T.green },
    { name:"admin-portal",    tech:"React — this screen",   port:443,
      status: "active",
      icon:"🔐", c: T.teal },
  ];

  const STACK = [
    { id:"camera",   icon:"📷", label:"CAMERA LAYER",    color:T.blue,
      chips:["Hikvision IP","Dahua PTZ","CP Plus","ONVIF Generic","RTSP Feed"],
      detail:"16–32 cameras per plant. RTSP/ONVIF protocol. 1080p @ 4–8 FPS. PoE powered over CAT6. Offline buffering up to 4 hours." },
    { id:"edge",     icon:"⚡", label:"EDGE AI LAYER",   color:T.orange,
      chips:["Frame Capture 4 FPS","YOLOv8 PPE Model","Confidence = 85%","Violation Trigger","Alert Queue"],
      detail:"Local edge server processes streams — no cloud dependency. < 3s detection latency. Works fully offline. GPU optional (Jetson Nano / x86 with CUDA)." },
    { id:"backend",  icon:"⚙️", label:"BACKEND API",     color:T.teal,
      chips:["Node.js 22","Express 4","PostgreSQL 16","Redis 7","WebSocket"],
      detail:"50+ REST endpoints under /api/v1. JWT + Refresh token auth. Rate limiting. Real-time events over WebSocket. Razorpay payment integration." },
    { id:"notify",   icon:"🔔", label:"NOTIFICATION",    color:T.amber,
      chips:["WhatsApp MSG91","SMTP Email","SMS","Dashboard Push","Form 18 Auto"],
      detail:"< 28s alert delivery from camera to WhatsApp. Multi-channel simultaneous. Factories Act 1948 Form 18 auto-filled and emailed to HSE officer." },
    { id:"frontend", icon:"🖥️", label:"FRONTEND",        color:T.green,
      chips:["React 18","Vite 5","Tailwind CSS","Recharts","Lucide Icons"],
      detail:"Single-page React 18 app. Real-time WebSocket dashboard. Mobile-responsive. Login/signup with 7-day trial flow. Admin portal (this screen)." },
  ];

  const FLOWS = [
    { n:"01", from:"IP Camera",     to:"Edge Server",    proto:"RTSP / TCP",    lat:"< 200 ms", c:T.blue   },
    { n:"02", from:"Edge Server",   to:"AI Engine",      proto:"HTTP / gRPC",   lat:"< 500 ms", c:T.orange },
    { n:"03", from:"AI Engine",     to:"Backend API",    proto:"HTTP POST",     lat:"< 100 ms", c:T.teal   },
    { n:"04", from:"Backend API",   to:"PostgreSQL",     proto:"TCP / SQL",     lat:"< 20 ms",  c:T.green  },
    { n:"05", from:"Backend API",   to:"Redis",          proto:"TCP",           lat:"< 5 ms",   c:T.amber  },
    { n:"06", from:"Backend API",   to:"WhatsApp/Email", proto:"HTTPS API",     lat:"< 2 s",    c:T.orange },
    { n:"07", from:"Backend API",   to:"WebSocket",      proto:"WS Events",     lat:"< 50 ms",  c:T.teal   },
    { n:"08", from:"WebSocket",     to:"React UI",       proto:"WS / Push",     lat:"< 100 ms", c:T.blue   },
  ];

  const tabs = [
    { id:"stack",    label:"STACK LAYERS"  },
    { id:"dataflow", label:"DATA FLOW"     },
    { id:"services", label:"SERVICES"      },
    { id:"sysinfo",  label:"SYSTEM INFO"   },
  ];

  return (
    <div style={{ padding:28, animation:"fadeUp .45s ease both" }}>
      {/* Header */}
      <div style={{ marginBottom:26 }}>
        <div style={{ ...syne, fontSize:22, fontWeight:800, color:T.white }}>System Architecture</div>
        <div style={{ fontSize:13, color:T.g1, marginTop:4 }}>Full stack diagram, data flows and live service registry</div>
      </div>

      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:26 }}>
        <KPI label="ACTIVE CUSTOMERS"  value={sysInfo?.app?.activeCustomers||0}  sub="subscribed"          color={T.teal}   icon="👥" i={0} />
        <KPI label="TOTAL PLANTS"      value={sysInfo?.app?.totalPlants||0}       sub="monitored"           color={T.green}  icon="🏭" i={1} />
        <KPI label="ONLINE CAMERAS"    value={sysInfo?.app?.onlineCameras||0}     sub="streaming"           color={T.orange} icon="📹" i={2} />
        <KPI label="VIOLATIONS 24H"    value={sysInfo?.app?.violations24h||0}     sub="detected today"      color={T.blue}   icon="⚠️" i={3} />
      </div>

      {/* Tab bar */}
      <div style={{ display:"flex", gap:6, marginBottom:20, borderBottom:`1px solid ${T.border}`, paddingBottom:0 }}>
        {tabs.map(({ id, label }) => (
          <button key={id} onClick={() => setTab(id)} style={{ padding:"10px 18px", border:"none", borderBottom:`2px solid ${tab===id?T.orange:"transparent"}`, background:"transparent", color:tab===id?T.orange:T.g1, fontSize:11, fontWeight:700, cursor:"pointer", letterSpacing:1.5, ...mono, transition:"color .2s" }}>
            {label}
          </button>
        ))}
      </div>

      {/* STACK */}
      {tab === "stack" && (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {STACK.map((layer, i) => (
            <div key={layer.id} onClick={() => setOpen(open===i?null:i)}
              style={{ background:open===i?`${layer.color}0A`:T.card, border:`1px solid ${open===i?layer.color:T.border}`, borderRadius:14, padding:"16px 20px", cursor:"pointer", transition:"all .2s", animation:`fadeUp .4s ease ${i*.06}s both` }}>
              <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                <span style={{ fontSize:22 }}>{layer.icon}</span>
                <span style={{ ...syne, fontSize:13, fontWeight:700, color:layer.color, letterSpacing:1 }}>{layer.label}</span>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap", flex:1 }}>
                  {layer.chips.map(c => <Pill key={c} color={layer.color} size={10}>{c}</Pill>)}
                </div>
                <span style={{ color:T.g2, fontSize:12 }}>{open===i?"→":"→"}</span>
              </div>
              {open === i && (
                <div style={{ borderTop:`1px solid ${T.border}`, marginTop:14, paddingTop:14, fontSize:13, color:T.g1, lineHeight:1.8, animation:"fadeUp .3s ease both" }}>
                  {layer.detail}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* DATA FLOW */}
      {tab === "dataflow" && (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {FLOWS.map((f, i) => (
            <div key={f.n} style={{ display:"grid", gridTemplateColumns:"36px 180px 28px 1fr 120px 100px", alignItems:"center", gap:14, background:T.card, border:`1px solid ${T.border}`, borderRadius:12, padding:"14px 18px", animation:`fadeUp .35s ease ${i*.04}s both` }}>
              <span style={{ fontSize:11, color:T.g2, ...mono }}>{f.n}</span>
              <span style={{ fontSize:13, color:T.white, fontWeight:600 }}>{f.from}</span>
              <span style={{ textAlign:"center", fontSize:18, color:f.c }}>→</span>
              <span style={{ fontSize:13, color:T.white, fontWeight:600 }}>{f.to}</span>
              <Pill color={f.c} size={10}>{f.proto}</Pill>
              <span style={{ fontSize:12, color:T.g1, textAlign:"right", ...mono }}>{f.lat}</span>
            </div>
          ))}
        </div>
      )}

      {/* SERVICES */}
      {tab === "services" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          {SERVICES.map((s, i) => (
            <div key={s.name} style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:14, padding:"18px 20px", display:"flex", alignItems:"center", gap:14, animation:`fadeUp .4s ease ${i*.05}s both` }}>
              <span style={{ fontSize:26 }}>{s.icon}</span>
              <div style={{ flex:1 }}>
                <div style={{ ...mono, fontSize:13, color:T.white, fontWeight:600 }}>{s.name}</div>
                <div style={{ fontSize:11, color:T.g1, marginTop:3 }}>{s.tech} · :{s.port}</div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <Dot color={s.c} animate={s.status==="online"||s.status==="active"} />
                <Pill color={s.c}>{s.status}</Pill>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SYSTEM INFO */}
      {tab === "sysinfo" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          {/* Server */}
          <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:14, padding:22 }}>
            <div style={{ ...syne, fontSize:14, fontWeight:700, color:T.white, marginBottom:18 }}>🖥️ Server Runtime</div>
            {sysInfo ? (
              Object.entries(sysInfo.server).map(([k,v]) => (
                <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"9px 0", borderBottom:`1px solid ${T.border}`, fontSize:13 }}>
                  <span style={{ color:T.g1 }}>{k}</span>
                  <span style={{ color:T.white, ...mono }}>{String(v)}</span>
                </div>
              ))
            ) : (
              <div style={{ color:T.g1, fontSize:13 }}>Loading...</div>
            )}
          </div>
          {/* App */}
          <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:14, padding:22 }}>
            <div style={{ ...syne, fontSize:14, fontWeight:700, color:T.white, marginBottom:18 }}>📊 Application Stats</div>
            {sysInfo ? (
              Object.entries(sysInfo.app).map(([k,v]) => (
                <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"9px 0", borderBottom:`1px solid ${T.border}`, fontSize:13 }}>
                  <span style={{ color:T.g1 }}>{k}</span>
                  <span style={{ color:T.teal, ...mono }}>{String(v)}</span>
                </div>
              ))
            ) : (
              <div style={{ color:T.g1, fontSize:13 }}>Loading...</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------
   PAYMENT SECTION
------------------------------------------------------ */
function PaySection({ token }) {
  const [stats,    setStats]    = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      axios.get('/api/admin/payments/stats', { headers }),
      axios.get('/api/admin/payments?limit=20', { headers }),
    ]).then(([statsRes, pmtRes]) => {
      setStats(statsRes.data.data);
      setPayments(pmtRes.data.data || []);
    }).catch(() => {
      setStats(null);
      setPayments([]);
    }).finally(() => setLoading(false));
  }, [token]);

  const fmt = (paise) => '\u20B9' + ((paise||0)/100).toLocaleString('en-IN');

  return (
    <div style={{ padding:28 }}>
      <div style={{ fontSize:20, fontWeight:800, color:'#EEF2FF', marginBottom:20 }}>Payments & Revenue</div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:14, marginBottom:24 }}>
        {[
          { label:'TOTAL REVENUE',    val: loading ? '…' : fmt(stats?.totalRevenue),  color:'#22D468' },
          { label:'THIS MONTH',       val: loading ? '…' : fmt(stats?.monthRevenue),  color:'#FF5B18' },
          { label:'ACTIVE PLANS',     val: loading ? '…' : stats?.activePlans||0,     color:'#3D8AFF' },
          { label:'PENDING REFUNDS',  val: loading ? '…' : stats?.pendingRefunds||0,  color:'#FFB400' },
        ].map(({ label, val, color }) => (
          <div key={label} style={{ background:'#0D1120', border:'1px solid #141E32',
            borderRadius:12, padding:20 }}>
            <div style={{ fontSize:9, color:'#344A6E', letterSpacing:2, marginBottom:8,
              fontFamily:'Share Tech Mono,monospace' }}>{label}</div>
            <div style={{ fontSize:28, fontWeight:800, color,
              fontFamily:'Share Tech Mono,monospace' }}>{val}</div>
          </div>
        ))}
      </div>

      {stats?.subs && (
        <div style={{ background:'#0D1120', border:'1px solid #141E32',
          borderRadius:12, padding:20, marginBottom:20 }}>
          <div style={{ fontSize:10, color:'#344A6E', letterSpacing:2, marginBottom:14,
            fontFamily:'Share Tech Mono,monospace' }}>SUBSCRIBERS BY PLAN</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
            {Object.entries(stats.subs).map(([plan, count]) => (
              <div key={plan} style={{ background:'#101520', borderRadius:10, padding:14 }}>
                <div style={{ fontSize:11, color:'#7B90B8', marginBottom:6,
                  textTransform:'uppercase', letterSpacing:1 }}>{plan}</div>
                <div style={{ fontSize:24, fontWeight:800, color:'#EEF2FF' }}>{count}</div>
                <div style={{ fontSize:10, color:'#344A6E', marginTop:4 }}>
                  MRR: {fmt((stats.mrr?.[plan]||0)*100)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ background:'#0D1120', border:'1px solid #141E32', borderRadius:12, overflow:'hidden' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1.5fr 1fr 1fr 1fr',
          padding:'10px 16px', fontSize:9, color:'#344A6E', fontWeight:700,
          letterSpacing:1.5, borderBottom:'1px solid #141E32',
          fontFamily:'Share Tech Mono,monospace' }}>
          <div>INVOICE</div><div>CUSTOMER</div><div>PLAN</div>
          <div>AMOUNT</div><div>STATUS</div>
        </div>
        {loading ? (
          <div style={{ textAlign:'center', padding:'40px 0', color:'#344A6E' }}>Loading...</div>
        ) : !stats ? (
          <div style={{ textAlign:'center', padding:'40px 0', color:T.red, fontSize:13 }}>
            ⚠ Failed to load payment data — check API connection
          </div>
        ) : payments.map((p, i) => (
          <div key={p.id} style={{ display:'grid',
            gridTemplateColumns:'1fr 1.5fr 1fr 1fr 1fr',
            padding:'12px 16px', fontSize:12,
            background: i%2===0 ? '#101520' : 'transparent',
            borderBottom:'1px solid #141E3220', alignItems:'center' }}>
            <div style={{ color:'#7B90B8', fontFamily:'Share Tech Mono,monospace',
              fontSize:11 }}>{p.invoice_no||'—'}</div>
            <div style={{ color:'#EEF2FF', fontWeight:600 }}>{p.customer_name||'—'}</div>
            <div style={{ color:'#FF5B18', textTransform:'uppercase',
              fontSize:10, fontWeight:700 }}>{p.plan_id||'—'}</div>
            <div style={{ color:'#EEF2FF', fontFamily:'Share Tech Mono,monospace' }}>
              {fmt(p.total_amount)}</div>
            <div>
              <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px',
                borderRadius:6,
                color: p.status==='captured'?'#22D468':p.status==='created'?'#FFB400':'#FF3D3D',
                background: p.status==='captured'?'rgba(34,212,104,.1)':p.status==='created'?'rgba(255,180,0,.1)':'rgba(255,61,61,.1)',
              }}>{p.status?.toUpperCase()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
/* -- CUSTOMER TABLE (sub-component of PaySection) --- */
function CustomerTable({ token }) {
  const [customers, setCustomers] = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    axios.get("/api/admin/customers?limit=20", { headers:{ Authorization:`Bearer ${token}` } })
      .then(r => setCustomers(r.data.data || []))
      .catch(() => setCustomers([]))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div style={{ display:"flex", justifyContent:"center", padding:40 }}><Spinner /></div>;

  const STATUS_C = { active:T.green, trial:T.amber, expired:T.red, cancelled:T.g2 };

  return (
    <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:14, overflow:"hidden" }}>
      <table style={{ width:"100%", borderCollapse:"collapse" }}>
        <thead>
          <tr style={{ background:T.card2 }}>
            {["Company","Plan","Cameras","Status","Trial Ends","Since","Plants"].map(h => (
              <th key={h} style={{ padding:"12px 14px", textAlign:"left", fontSize:9, color:T.g1, letterSpacing:2, fontWeight:700, ...mono }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {customers.map((c, i) => (
            <tr key={i} style={{ borderTop:`1px solid ${T.border}` }}>
              <td style={{ padding:"12px 14px", fontSize:13, color:T.white, fontWeight:600, maxWidth:180, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.company_name}</td>
              <td style={{ padding:"12px 14px" }}><Pill color={T.orange}>{c.plan_id||"—"}</Pill></td>
              <td style={{ padding:"12px 14px", fontSize:13, color:T.g1, textAlign:"center" }}>{c.camera_count||"—"}</td>
              <td style={{ padding:"12px 14px" }}><Pill color={STATUS_C[c.subscription_status]||T.g2}>{c.subscription_status||"—"}</Pill></td>
              <td style={{ padding:"12px 14px", fontSize:11, color:T.amber, ...mono }}>{c.trial_ends_at?new Date(c.trial_ends_at).toLocaleDateString("en-IN"):"—"}</td>
              <td style={{ padding:"12px 14px", fontSize:11, color:T.g1, ...mono }}>{c.created_at?new Date(c.created_at).toLocaleDateString("en-IN"):"—"}</td>
              <td style={{ padding:"12px 14px", fontSize:13, color:T.teal, textAlign:"center" }}>{c.plant_count||0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CustomersSection({ token }) {
  const [customers, setCustomers] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [total,     setTotal]     = useState(0);
  const [search,    setSearch]    = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await axios.get("/api/admin/tenants?limit=100", {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCustomers(res.data.data || []);
        setTotal(res.data.total || 0);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const filtered = customers.filter((c) =>
    !search ||
    c.company_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  const statusColor = (s) =>
    s === "active" ? "#22D468" :
    s === "trial" ? "#FFB400" :
    s === "expired" ? "#FF3D3D" : "#7B90B8";

  return (
    <div style={{ padding:28 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <div>
          <div style={{ fontSize:20, fontWeight:800, color:"#EEF2FF", marginBottom:4 }}>
            👥 Customer Signups
          </div>
          <div style={{ fontSize:12, color:"#7B90B8" }}>
            {total} total signups · all plans
          </div>
        </div>
        <input
          placeholder="Search company or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            background:"#0D1120",
            border:"1px solid #141E32",
            borderRadius:8,
            padding:"8px 14px",
            color:"#EEF2FF",
            fontSize:12,
            fontFamily:"Syne,sans-serif",
            outline:"none",
            width:240
          }}
        />
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:12, marginBottom:20 }}>
        {[
          { label:"Total Signups",  val:total, color:"#3D8AFF" },
          { label:"Trial",          val:customers.filter((c) => c.subscription_status === "trial").length, color:"#FFB400" },
          { label:"Active",         val:customers.filter((c) => c.subscription_status === "active").length, color:"#22D468" },
          { label:"Expired",        val:customers.filter((c) => c.subscription_status === "expired").length, color:"#FF3D3D" },
        ].map(({ label, val, color }) => (
          <div
            key={label}
            style={{
              background:"#0D1120",
              border:"1px solid #141E32",
              borderRadius:10,
              padding:"16px",
              textAlign:"center"
            }}
          >
            <div style={{ fontSize:28, fontWeight:800, color, fontFamily:"Share Tech Mono,monospace" }}>{val}</div>
            <div style={{ fontSize:10, color:"#344A6E", letterSpacing:1, marginTop:4 }}>{label}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign:"center", padding:"40px 0", color:"#7B90B8" }}>Loading...</div>
      ) : (
        <div style={{ background:"#0D1120", border:"1px solid #141E32", borderRadius:12, overflow:"hidden" }}>
          <div
            style={{
              display:"grid",
              gridTemplateColumns:"2fr 2fr 1fr 1fr 1fr 1fr",
              gap:8,
              padding:"10px 16px",
              fontSize:9,
              color:"#344A6E",
              fontWeight:700,
              letterSpacing:1.5,
              borderBottom:"1px solid #141E32",
              fontFamily:"Share Tech Mono,monospace"
            }}
          >
            <div>COMPANY</div><div>EMAIL</div><div>PLAN</div>
            <div>STATUS</div><div>TRIAL ENDS</div><div>JOINED</div>
          </div>
          {filtered.length === 0 ? (
            <div style={{ textAlign:"center", padding:"40px 0", color:"#344A6E" }}>
              No customers found
            </div>
          ) : filtered.map((c, i) => (
            <div
              key={c.id}
              onClick={() => setSelectedCustomer(c)}
              style={{
                display:"grid",
                gridTemplateColumns:"2fr 2fr 1fr 1fr 1fr 1fr",
                cursor:"pointer",
                gap:8,
                padding:"12px 16px",
                fontSize:12,
                background:i % 2 === 0 ? "#101520" : "transparent",
                borderBottom:"1px solid #141E3220",
                alignItems:"center"
              }}
            >
              <div style={{ color:"#EEF2FF", fontWeight:700 }}>
                {c.company_name || "—"}
              </div>
              <div style={{ color:"#7B90B8", fontSize:11 }}>{c.email || "—"}</div>
              <div style={{ color:"#FF5B18", fontWeight:700, textTransform:"uppercase", fontSize:10 }}>
                {c.plan_id || "starter"}
              </div>
              <div>
                <span
                  style={{
                    fontSize:10,
                    fontWeight:700,
                    color:statusColor(c.subscription_status),
                    background:`${statusColor(c.subscription_status)}15`,
                    border:`1px solid ${statusColor(c.subscription_status)}30`,
                    padding:"2px 8px",
                    borderRadius:6
                  }}
                >
                  {c.subscription_status?.toUpperCase() || "TRIAL"}
                </span>
              </div>
              <div style={{ fontSize:10, color:"#7B90B8", fontFamily:"Share Tech Mono,monospace" }}>
                {c.trial_ends_at
                  ? new Date(c.trial_ends_at).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" })
                  : "—"}
              </div>
              <div style={{ fontSize:10, color:"#344A6E", fontFamily:"Share Tech Mono,monospace" }}>
                {c.created_at
                  ? new Date(c.created_at).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" })
                  : "—"}
              </div>
            </div>
          ))}
        </div>
      )}
      {selectedCustomer && (
        <div
          style={{
            position:"fixed",
            inset:0,
            background:"rgba(0,0,0,.7)",
            zIndex:1000,
            display:"flex",
            alignItems:"center",
            justifyContent:"center"
          }}
          onClick={() => setSelectedCustomer(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background:"#0D1120",
              border:"1px solid #141E32",
              borderRadius:16,
              padding:28,
              width:520,
              maxHeight:"80vh",
              overflowY:"auto"
            }}
          >
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:20 }}>
              <div style={{ fontSize:18, fontWeight:800, color:"#EEF2FF" }}>
                {selectedCustomer.company_name || "—"}
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                style={{ background:"none", border:"none", color:"#7B90B8", cursor:"pointer", fontSize:18 }}
              >
                ?
              </button>
            </div>
            {[
              { l:"Email",      v:selectedCustomer.email },
              { l:"Full Name",  v:selectedCustomer.full_name },
              { l:"Plan",       v:selectedCustomer.plan_id?.toUpperCase() },
              { l:"Status",     v:selectedCustomer.subscription_status?.toUpperCase() },
              { l:"Trial Ends", v:selectedCustomer.trial_ends_at ? new Date(selectedCustomer.trial_ends_at).toLocaleDateString("en-IN") : "—" },
              { l:"Joined",     v:selectedCustomer.created_at ? new Date(selectedCustomer.created_at).toLocaleDateString("en-IN") : "—" },
              { l:"Plants",     v:selectedCustomer.plant_count || 0 },
              { l:"Tenant ID",  v:selectedCustomer.id },
            ].map(({ l, v }) => (
              <div
                key={l}
                style={{
                  display:"flex",
                  justifyContent:"space-between",
                  padding:"10px 0",
                  borderBottom:"1px solid #141E3220"
                }}
              >
                <span style={{ fontSize:12, color:"#7B90B8" }}>{l}</span>
                <span
                  style={{
                    fontSize:12,
                    color:"#EEF2FF",
                    fontWeight:600,
                    fontFamily:"Share Tech Mono,monospace"
                  }}
                >
                  {v || "—"}
                </span>
              </div>
            ))}
            <div style={{ marginTop:20, display:"flex", gap:10 }}>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(selectedCustomer.email || "");
                  alert("Email copied!");
                }}
                style={{
                  flex:1,
                  padding:"10px",
                  background:"#101520",
                  border:"1px solid #141E32",
                  borderRadius:8,
                  color:"#7B90B8",
                  cursor:"pointer",
                  fontSize:12
                }}
              >
                📋 Copy Email
              </button>
              <button
                onClick={() => {
                  const d = selectedCustomer;
                  const csv = `Company,Email,Plan,Status,Trial Ends,Joined\n${d.company_name},${d.email},${d.plan_id},${d.subscription_status},${d.trial_ends_at},${d.created_at}`;
                  const blob = new Blob([csv], { type:"text/csv" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${d.company_name || "customer"}.csv`;
                  a.click();
                }}
                style={{
                  flex:1,
                  padding:"10px",
                  background:"#FF5B1820",
                  border:"1px solid #FF5B1844",
                  borderRadius:8,
                  color:"#FF5B18",
                  cursor:"pointer",
                  fontSize:12,
                  fontWeight:700
                }}
              >
                ⬇ Export CSV
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


/* ------------------------------------------------------
   ADMIN LOGIN SCREEN
------------------------------------------------------ */
function AdminLogin({ onLogin }) {
  const [form, setForm]   = useState({ email:"", password:"" });
  const [err,  setErr]    = useState("");
  const [load, setLoad]   = useState(false);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setLoad(true); setErr("");
    try {
      const res = await axios.post("/api/v1/auth/login", form);
      const { user, accessToken } = res.data.data;
      if (!["superadmin","customer_admin"].includes(user.role)) {
        setErr("Admin access only — contact your system administrator"); return;
      }
      localStorage.setItem("safeg_admin_token", accessToken);
      localStorage.setItem("safeg_admin",       JSON.stringify(user));
      onLogin(user, accessToken);
    } catch (ex) {
      setErr(ex.response?.data?.message || "Invalid credentials");
    } finally {
      setLoad(false);
    }
  };

  return (
    <div style={{ minHeight:"100vh", background:T.bg, display:"flex", alignItems:"center", justifyContent:"center", position:"relative", overflow:"hidden" }}>
      {/* Grid */}
      <div style={{ position:"absolute", inset:0, backgroundImage:`linear-gradient(${T.border} 1px,transparent 1px),linear-gradient(90deg,${T.border} 1px,transparent 1px)`, backgroundSize:"60px 60px", opacity:.25 }} />
      {/* Corner accent */}
      <div style={{ position:"absolute", top:0, right:0, width:400, height:400, background:`radial-gradient(circle at top right,${T.orange}18,transparent 70%)`, pointerEvents:"none" }} />

      <div style={{ width:400, background:T.card, border:`1px solid ${T.border}`, borderRadius:22, padding:42, position:"relative", zIndex:1, animation:"fadeUp .55s ease both" }}>
        {/* Logo */}
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10 }}>
          <div style={{ width:42, height:42, borderRadius:11, background:"linear-gradient(135deg,#FF5B18,#FF8040)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>🔐</div>
          <div>
            <div style={{ ...syne, fontSize:16, fontWeight:800, color:T.white, letterSpacing:1.5 }}>ADMIN PORTAL</div>
            <div style={{ fontSize:9, color:T.g1, letterSpacing:2.5, ...mono }}>SafeguardIQ Enterprise — INTERNAL</div>
          </div>
        </div>

        {/* Warning strip */}
        <div style={{ background:`${T.red}0E`, border:`1px solid ${T.red}25`, borderRadius:10, padding:"9px 14px", fontSize:11, color:`${T.red}CC`, marginBottom:28, marginTop:22, display:"flex", gap:8, alignItems:"center", ...mono }}>
          🔒 RESTRICTED · AUTHORISED PERSONNEL ONLY
        </div>

        {err && (
          <div style={{ background:`${T.red}10`, border:`1px solid ${T.red}30`, borderRadius:10, padding:"10px 14px", color:T.red, fontSize:13, marginBottom:18 }}>⚠ {err}</div>
        )}

        <form onSubmit={submit}>
          {[
            { key:"email",    label:"ADMIN EMAIL",  type:"email",    ph:"admin@syyaimsafeg.ai" },
            { key:"password", label:"PASSWORD",     type:"password", ph:"••••••••••••" },
          ].map(({ key, label, type, ph }) => (
            <div key={key} style={{ marginBottom:16 }}>
              <label style={{ fontSize:9, color:T.g1, letterSpacing:2.5, display:"block", marginBottom:7, fontWeight:700, ...mono }}>{label}</label>
              <input type={type} required value={form[key]} onChange={e => setForm(f=>({...f,[key]:e.target.value}))} placeholder={ph}
                style={{ width:"100%", background:"#040608", border:`1px solid ${T.border}`, borderRadius:10, padding:"13px 14px", color:T.white, fontSize:13, outline:"none" }} />
            </div>
          ))}

          <button type="submit" disabled={load} style={{ width:"100%", marginTop:8, background:load?T.g2:`linear-gradient(135deg,${T.orange},${T.orng2})`, border:"none", borderRadius:11, padding:"14px", color:"#fff", fontSize:14, fontWeight:800, cursor:load?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}>
            {load ? <><Spinner />Authenticating...</> : "Access Admin Portal →"}
          </button>
        </form>

        <div style={{ textAlign:"center", marginTop:16 }}>
          <button onClick={() => navigate("/login")} style={{ background:"none", border:"none", color:T.g2, fontSize:12, cursor:"pointer" }}>← Back to main app</button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------
   ROOT ADMIN DASHBOARD
------------------------------------------------------ */
const NAV = [
  { id:"architecture", label:"Architecture", icon:"🗺️" },
  { id:"payments",     label:"Payments",     icon:"💳" },
  { id:"customers",    label:"Customers",    icon:"👥" },
];

export default function AdminDashboard() {
  const [admin,   setAdmin]   = useState(() => { try { return JSON.parse(localStorage.getItem("safeg_admin")); } catch { return null; } });
  const [token,   setToken]   = useState(() => localStorage.getItem("safeg_admin_token") || "");
  const [section, setSection] = useState("architecture");
  const [sysInfo, setSysInfo] = useState(null);
  const [revenueStats, setRevenueStats] = useState(null);

  useEffect(() => {
    if (!token) return;
    axios.get("/api/admin/system", { headers:{ Authorization:`Bearer ${token}` } })
      .then(r => setSysInfo(r.data.data))
      .catch(() => {});
    axios.get("/api/admin/payments/stats", { headers:{ Authorization:`Bearer ${token}` } })
      .then(r => setRevenueStats(r.data.data))
      .catch(() => {});
  }, [token]);

  const handleLogin = (user, tok) => { setAdmin(user); setToken(tok); };
  const handleLogout = () => {
    ["safeg_admin_token","safeg_admin"].forEach(k => localStorage.removeItem(k));
    setAdmin(null); setToken("");
  };

  if (!admin) return <><style>{CSS}</style><AdminLogin onLogin={handleLogin} /></>;

  return (
    <>
      <style>{CSS}</style>
      <div style={{ display:"flex", minHeight:"100vh", background:T.bg }}>

        {/* -- SIDEBAR -- */}
        <div style={{ width:220, background:T.bg2, borderRight:`1px solid ${T.border}`, display:"flex", flexDirection:"column", position:"sticky", top:0, height:"100vh", flexShrink:0 }}>
          {/* Logo */}
          <div style={{ padding:"22px 20px", borderBottom:`1px solid ${T.border}` }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:36, height:36, borderRadius:9, background:"linear-gradient(135deg,#FF5B18,#FF8040)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:17 }}>🔐</div>
              <div>
                <div style={{ ...syne, fontSize:13, fontWeight:800, color:T.white, letterSpacing:1.5 }}>ADMIN</div>
                <div style={{ fontSize:9, color:T.g2, letterSpacing:2.5, ...mono }}>INTERNAL PORTAL</div>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav style={{ padding:"18px 10px", flex:1 }}>
            <div style={{ fontSize:9, color:T.g2, letterSpacing:2.5, padding:"0 10px", marginBottom:12, ...mono }}>SECTIONS</div>
            {NAV.map(({ id, label, icon }) => (
              <button key={id} onClick={() => setSection(id)} style={{ width:"100%", display:"flex", alignItems:"center", gap:12, padding:"11px 12px", borderRadius:10, border:"none", background:section===id?`${T.orange}14`:"transparent", color:section===id?T.orange:T.g1, cursor:"pointer", marginBottom:4, fontSize:13, fontWeight:section===id?700:500, textAlign:"left", transition:"all .2s" }}>
                <span style={{ fontSize:18 }}>{icon}</span>
                {label}
                {section===id && <div style={{ marginLeft:"auto", width:5, height:5, borderRadius:"50%", background:T.orange }} />}
              </button>
            ))}
          </nav>

          {/* System status */}
          <div style={{ padding:"12px 20px", borderTop:`1px solid ${T.border}`, borderBottom:`1px solid ${T.border}` }}>
            <div style={{ fontSize:9, color:T.g2, letterSpacing:2, ...mono, marginBottom:10 }}>SYSTEM STATUS</div>
            {[
              { label:"API Server",  ok:true },
              { label:"Database",    ok:!!sysInfo },
              { label:"Redis Cache", ok:!!sysInfo },
              { label:"AI Engine",   ok:sysInfo?.app?.violations24h >= 0 },
            ].map(({ label, ok }) => (
              <div key={label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:7 }}>
                <span style={{ fontSize:11, color:T.g1 }}>{label}</span>
                <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                  <Dot color={ok?T.green:T.amber} animate={ok} />
                  <span style={{ fontSize:10, color:ok?T.green:T.amber, ...mono }}>{ok?"online":"standby"}</span>
                </div>
              </div>
            ))}
          </div>

          {/* User */}
          <div style={{ padding:"16px 20px" }}>
            <div style={{ fontSize:12, color:T.white, fontWeight:700, marginBottom:2 }}>{admin.fullName||admin.email}</div>
            <div style={{ fontSize:10, color:T.g2, marginBottom:12, ...mono }}>{admin.role?.replace("_"," ").toUpperCase()}</div>
            <button onClick={handleLogout} style={{ width:"100%", background:"transparent", border:`1px solid ${T.border}`, borderRadius:8, padding:"8px", color:T.g1, fontSize:11, fontWeight:700, cursor:"pointer" }}>Sign Out</button>
          </div>
        </div>

        {/* -- MAIN CONTENT -- */}
        <div style={{ flex:1, overflowY:"auto" }}>
          {/* Topbar */}
          <div style={{ padding:"14px 28px", borderBottom:`1px solid ${T.border}`, background:T.bg2, position:"sticky", top:0, zIndex:50, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ ...syne, fontSize:15, fontWeight:700, color:T.white }}>
              {NAV.find(n=>n.id===section)?.icon} {NAV.find(n=>n.id===section)?.label}
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:14 }}>
              {sysInfo && <span style={{ fontSize:11, color:T.g1, ...mono }}>Node {sysInfo.server.nodeVersion} · {sysInfo.server.memUsedMB}MB</span>}
              <Dot color={T.green} animate />
              <span style={{ fontSize:10, color:T.green, ...mono }}>SYSTEM ONLINE</span>
              <Pill color={T.orange}>ADMIN</Pill>
            </div>
          </div>

          {section === "architecture" && <ArchSection sysInfo={sysInfo} />}
          {section === "payments"     && <PaySection token={token} />}
          {section === "customers"    && <CustomersSection token={token} />}
        </div>
      </div>
    </>
  );
}
