import { useState, useEffect, useRef } from "react";

const G = `

*{margin:0;padding:0;box-sizing:border-box}
body{background:#040810;color:#E8F0FF;font-family:'Outfit',sans-serif;overflow-x:hidden}
::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#080C18}::-webkit-scrollbar-thumb{background:#162040;border-radius:4px}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
@keyframes flow{0%{stroke-dashoffset:40}100%{stroke-dashoffset:0}}
@keyframes flowRev{0%{stroke-dashoffset:0}100%{stroke-dashoffset:40}}
@keyframes glow{0%,100%{box-shadow:0 0 8px rgba(255,91,24,.3)}50%{box-shadow:0 0 22px rgba(255,91,24,.7)}}
@keyframes glowTeal{0%,100%{box-shadow:0 0 8px rgba(0,212,180,.3)}50%{box-shadow:0 0 22px rgba(0,212,180,.7)}}
@keyframes ping{0%{transform:scale(1);opacity:.6}100%{transform:scale(2.4);opacity:0}}
@keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.15}}
@keyframes dataFlow{0%{transform:translateY(0);opacity:0}20%{opacity:1}80%{opacity:1}100%{transform:translateY(32px);opacity:0}}
`;

const C = {
  bg:"#040810", bg2:"#070C18", bg3:"#0A1020",
  card:"#0D1528", card2:"#111D34",
  border:"#162040", border2:"#1E2D50",
  orange:"#FF5B18", orng2:"#FF8C52",
  teal:"#00D4B4", teal2:"#00FFD9",
  green:"#22D468", red:"#FF3D3D",
  amber:"#FFB400", blue:"#3D8AFF",
  purple:"#9F5FFF", pink:"#FF4DA6",
  white:"#E8F0FF", g1:"#A8BCDC", g2:"#4A5E82", g3:"#0E1830",
};

// ── tiny helpers
const mono = {fontFamily:"'Share Tech Mono',monospace"};
const head = {fontFamily:"'Outfit',sans-serif",fontWeight:800};

function Tag({color=C.orange, children, size=10}) {
  return <span style={{display:"inline-block",padding:`2px 9px`,borderRadius:20,fontSize:size,fontWeight:700,
    background:`${color}18`,color,border:`1px solid ${color}44`,...mono}}>{children}</span>;
}

function Dot({color,blink,size=7}) {
  return <div style={{width:size,height:size,borderRadius:"50%",background:color,flexShrink:0,
    animation:blink?"blink 1.2s infinite":"none"}}/>;
}

// ─────────────────────────────────────────────────────────────────
// ANIMATED SVG CONNECTOR
// ─────────────────────────────────────────────────────────────────
function Arrow({x1,y1,x2,y2,color=C.orange,label,animated=true,dashed=false}) {
  const id = `arrow-${Math.random().toString(36).slice(2,7)}`;
  const dx = x2-x1, dy = y2-y1;
  const mx = x1+dx*.5, my = y1+dy*.5;
  // slight curve
  const cx1 = x1+dx*.25, cy1 = y1, cx2 = x2-dx*.25, cy2 = y2;
  const d = `M${x1},${y1} C${cx1},${cy1} ${cx2},${cy2} ${x2},${y2}`;
  return (
    <g>
      <defs>
        <marker id={id} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill={color} opacity=".9"/>
        </marker>
        <filter id={`glow-${id}`}>
          <feGaussianBlur stdDeviation="2" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      {/* glow track */}
      <path d={d} fill="none" stroke={color} strokeWidth="3" opacity=".12" strokeLinecap="round"/>
      {/* main line */}
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" opacity=".7"
        strokeDasharray={dashed?"6,4":"none"}
        markerEnd={`url(#${id})`}
        strokeLinecap="round"
        filter={`url(#glow-${id})`}/>
      {/* animated dots */}
      {animated && [0,0.33,0.66].map((o,i) => (
        <circle key={i} r="2.5" fill={color} opacity=".9">
          <animateMotion dur={`${1.8+i*.3}s`} repeatCount="indefinite" begin={`${i*0.6}s`}>
            <mpath href={`#path-${id}`}/>
          </animateMotion>
        </circle>
      ))}
      <path id={`path-${id}`} d={d} fill="none" stroke="none"/>
      {label && <text x={mx} y={my-8} fill={color} fontSize="9" textAnchor="middle"
        fontFamily="'Share Tech Mono',monospace" opacity=".8">{label}</text>}
    </g>
  );
}

// ─────────────────────────────────────────────────────────────────
// MODULE BOX
// ─────────────────────────────────────────────────────────────────
function Module({x,y,w=160,h=64,color=C.orange,icon,title,sub,onClick,active,pulse: doPulse}) {
  const [hov, setHov] = useState(false);
  const bc = hov||active ? color : C.border2;
  const bg = active ? `${color}15` : hov ? `${color}0A` : C.card;
  return (
    <g onClick={onClick} style={{cursor:"pointer"}}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}>
      {doPulse && <rect x={x-3} y={y-3} width={w+6} height={h+6} rx={12} fill="none"
        stroke={color} strokeWidth="1" opacity=".4">
        <animate attributeName="opacity" values=".4;0;.4" dur="2s" repeatCount="indefinite"/>
        <animate attributeName="stroke-width" values="1;3;1" dur="2s" repeatCount="indefinite"/>
      </rect>}
      <rect x={x} y={y} width={w} height={h} rx={10} fill={bg}
        stroke={bc} strokeWidth={active||hov?1.5:1}/>
      {/* top accent */}
      <rect x={x} y={y} width={w} height={3} rx="2" fill={color} opacity={active||hov?1:.5}/>
      <text x={x+10} y={y+22} fontSize="16" fontFamily="Arial">{icon}</text>
      <text x={x+34} y={y+20} fill={C.white} fontSize="12" fontWeight="700" fontFamily="'Outfit',sans-serif">{title}</text>
      <text x={x+34} y={y+36} fill={C.g2} fontSize="9" fontFamily="'Share Tech Mono',monospace">{sub}</text>
      {active && <circle cx={x+w-14} cy={y+14} r="4" fill={color}>
        <animate attributeName="opacity" values="1;.2;1" dur="1s" repeatCount="indefinite"/>
      </circle>}
    </g>
  );
}

// ─────────────────────────────────────────────────────────────────
// DATA FLOW PANEL (right side detail)
// ─────────────────────────────────────────────────────────────────
const FLOWS = {
  onboarding: {
    title:"Onboarding → System",
    color: C.orange,
    icon:"🔗",
    desc:"When you complete the 4-step onboarding wizard, here's exactly what gets written into the SafeguardIQ Enterprise database and which modules get activated automatically.",
    steps:[
      {from:"Customer Form",to:"Auth Service",data:"Creates tenant account, login credentials, JWT config, billing plan",color:C.orange},
      {from:"Plant Form",to:"Plant Registry DB",data:"Stores factory licence, GPS, shift pattern, inspector details, occupier info",color:C.teal},
      {from:"Area Form",to:"Zone Config Engine",data:"Creates zone records with PPE rules, risk levels, alert thresholds per zone",color:C.blue},
      {from:"Camera Form",to:"Stream Manager",data:"Registers RTSP/ONVIF URLs, spawns ffmpeg workers, begins health checks",color:C.purple},
      {from:"Camera Form",to:"AI Engine",data:"Loads PPE detection model per camera with zone-specific class filters",color:C.pink},
      {from:"Activation",to:"Dashboard + Alerts",data:"Populates live dashboard, enables Form 18 auto-fill, activates WhatsApp alerts",color:C.green},
    ]
  },
  dashboard: {
    title:"Dashboard Data Sources",
    color: C.teal,
    icon:"📊",
    desc:"Every KPI and table in the compliance dashboard is pulled live from these backend services, all seeded by onboarding data.",
    steps:[
      {from:"AI Engine",to:"PPE KPI Tile",data:"Compliance % = violations_today / total_detections × 100, refreshed every 30s",color:C.green},
      {from:"Violation DB",to:"Violation Table",data:"Queries by plant_id + date range, ordered by severity DESC",color:C.red},
      {from:"Camera Registry",to:"Live Feed Grid",data:"RTSP URLs resolved from camera table, streamed via WebRTC/HLS proxy",color:C.teal},
      {from:"Zone Config",to:"Form 18 Auto-fill",data:"Zone name, camera ID, PPE type, timestamp → pre-populates statutory fields",color:C.orange},
      {from:"Plant Registry",to:"Compliance Reports",data:"Factory licence, occupier, DGFASLI region → ISO 45001 + ESIC templates",color:C.blue},
      {from:"Alert Engine",to:"WhatsApp / Email",data:"Violation event → lookup supervisor for zone → send formatted alert",color:C.purple},
    ]
  },
  form18: {
    title:"Form 18 Auto-Population",
    color: C.amber,
    icon:"📋",
    desc:"Form 18 fields are populated from 4 different sources collected during onboarding — zero re-entry needed.",
    steps:[
      {from:"Customer (Step 1)",to:"Part A — Factory Name",data:"companyName, regNo, industry, address → Factory & registration details",color:C.orange},
      {from:"Plant (Step 2)",to:"Part A — Occupier/Manager",data:"occupier, manager, licNo, inspectorOffice → statutory identity",color:C.teal},
      {from:"Camera (Step 4)",to:"Part B — Accident Details",data:"camId, zone, timestamp, AI confidence → auto-populates incident location + time",color:C.purple},
      {from:"Area (Step 3)",to:"Part B — Department",data:"area.name + area.type → Department / Section field",color:C.blue},
      {from:"AI Engine",to:"Part E — Evidence Log",data:"Detection frame, confidence score, causal chain analysis → AI Evidence section",color:C.pink},
      {from:"Plant (Step 2)",to:"Part G — Declaration",data:"hseName, hseEmail, inspector office → declaration section + deadline warning",color:C.green},
    ]
  },
  camera: {
    title:"Camera → AI → Alert Pipeline",
    color: C.purple,
    icon:"📹",
    desc:"The real-time pipeline from physical camera to compliance alert — latency under 3 seconds end-to-end.",
    steps:[
      {from:"IP Camera (RTSP)",to:"Stream Ingestion",data:"ffmpeg / GStreamer decodes RTSP stream → 4 FPS frame extraction",color:C.g1},
      {from:"Frame Buffer",to:"AI Inference (GPU)",data:"YOLOv8 model runs PPE detection per frame. Zone-specific class filters applied.",color:C.teal},
      {from:"AI Inference",to:"Violation Detector",data:"Missing PPE class → cross-check with area.ppeRequired → trigger if match",color:C.red},
      {from:"Violation Detector",to:"Violation DB",data:"INSERT violation: camId, zoneId, type, frame_url, confidence, timestamp",color:C.orange},
      {from:"Violation DB",to:"Alert Engine",data:"Pub/Sub event → lookup zone supervisor → format WhatsApp/Email alert",color:C.amber},
      {from:"Alert Engine",to:"Dashboard WebSocket",data:"Push to connected dashboard clients → live KPI update + ticker + timeline",color:C.green},
    ]
  }
};

function FlowDetail({flow, onClose}) {
  if(!flow) return null;
  const f = FLOWS[flow];
  return (
    <div style={{animation:"slideIn .3s ease",background:C.card,border:`1.5px solid ${f.color}44`,
      borderRadius:16,padding:24,height:"100%",overflowY:"auto"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:36,height:36,borderRadius:10,background:`${f.color}18`,border:`1.5px solid ${f.color}44`,
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{f.icon}</div>
          <div>
            <div style={{fontWeight:800,fontSize:16,color:C.white}}>{f.title}</div>
            <Tag color={f.color}>{flow.toUpperCase()}</Tag>
          </div>
        </div>
        <button onClick={onClose} style={{background:"transparent",border:"none",color:C.g2,cursor:"pointer",fontSize:18}}>✕</button>
      </div>
      <div style={{fontSize:13,color:C.g1,lineHeight:1.6,marginBottom:20,padding:"12px 14px",
        background:C.bg3,borderRadius:10,borderLeft:`3px solid ${f.color}`}}>
        {f.desc}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {f.steps.map((s,i)=>(
          <div key={i} style={{display:"flex",gap:12,padding:"13px 14px",background:C.card2,
            border:`1px solid ${C.border2}`,borderRadius:10,animation:`fadeUp .3s ease ${i*.07}s both`}}>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,flexShrink:0}}>
              <div style={{width:24,height:24,borderRadius:"50%",background:`${s.color}18`,
                border:`1.5px solid ${s.color}`,display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:11,fontWeight:700,color:s.color,...mono}}>{i+1}</div>
              {i<f.steps.length-1&&<div style={{width:2,flex:1,background:C.border2,borderRadius:2,minHeight:16}}/>}
            </div>
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5,flexWrap:"wrap"}}>
                <span style={{fontSize:12,fontWeight:700,color:s.color,...mono}}>{s.from}</span>
                <span style={{color:C.g2,fontSize:12}}>→</span>
                <span style={{fontSize:12,fontWeight:700,color:C.white}}>{s.to}</span>
              </div>
              <div style={{fontSize:11,color:C.g1,lineHeight:1.5}}>{s.data}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// MAIN ARCHITECTURE DIAGRAM
// ─────────────────────────────────────────────────────────────────
export default function App() {
  const [selected, setSelected] = useState(null);
  const [activeFlow, setActiveFlow] = useState("onboarding");
  const [tab, setTab] = useState("architecture");
  const [tick, setTick] = useState(0);

  useEffect(()=>{const t=setInterval(()=>setTick(p=>p+1),2000);return()=>clearInterval(t);},[]);

  // Live events simulation
  const events = [
    {t:"14:23:07",msg:"CAM-04 → PPE violation detected → Violation DB → Alert sent",c:C.red},
    {t:"14:23:10",msg:"Dashboard WebSocket push → KPI updated → Form 18 pre-filled",c:C.orange},
    {t:"14:19:44",msg:"CAM-11 → Zone breach → Supervisor alerted via WhatsApp",c:C.amber},
    {t:"14:18:00",msg:"AI Engine heartbeat → All 16 cameras healthy",c:C.green},
    {t:"14:15:02",msg:"CAM-07 → No vest → Violation #VIO-233 created",c:C.red},
    {t:"14:10:00",msg:"Plant Registry → ISO 45001 report auto-generated",c:C.blue},
    {t:"14:05:30",msg:"Camera stream reconnected → CAM-09 back online",c:C.teal},
  ];

  const SVG_W = 900, SVG_H = 680;

  // Node positions (x,y,w,h)
  const nodes = {
    // Layer 0: Input (leftmost)
    cam:      {x:20,  y:140, w:150, h:60, color:C.purple, icon:"📹", title:"IP Cameras", sub:"RTSP · ONVIF · 16 feeds"},
    onboard:  {x:20,  y:240, w:150, h:60, color:C.orange, icon:"🧙", title:"Onboarding", sub:"4-step wizard"},
    mobile:   {x:20,  y:340, w:150, h:60, color:C.teal,   icon:"📱", title:"Mobile App", sub:"Inspector · HSE officer"},
    api:      {x:20,  y:440, w:150, h:60, color:C.blue,   icon:"🔌", title:"REST API",   sub:"3rd party · ERP sync"},

    // Layer 1: Ingestion
    stream:   {x:220, y:100, w:155, h:60, color:C.purple, icon:"📡", title:"Stream Ingestion", sub:"ffmpeg · frame extract 4fps"},
    auth:     {x:220, y:200, w:155, h:60, color:C.orange, icon:"🔐", title:"Auth & Tenant", sub:"JWT · multi-tenant isolate"},
    plantdb:  {x:220, y:300, w:155, h:60, color:C.teal,   icon:"🗄️",  title:"Plant Registry", sub:"Customer→Plant→Area→Cam"},
    alertmgr: {x:220, y:400, w:155, h:60, color:C.amber,  icon:"🔔", title:"Alert Manager", sub:"WhatsApp · Email · SMS"},
    webhook:  {x:220, y:500, w:155, h:60, color:C.blue,   icon:"🔗", title:"Webhook / ERP", sub:"SAP · Oracle · Shram Suvid."},

    // Layer 2: Core AI
    ai:       {x:430, y:140, w:155, h:65, color:C.pink,   icon:"🤖", title:"AI Engine (GPU)", sub:"YOLOv8 PPE · Danger Zone"},
    zoneconf: {x:430, y:240, w:155, h:60, color:C.blue,   icon:"📍", title:"Zone Config", sub:"PPE rules · thresholds"},
    violdb:   {x:430, y:340, w:155, h:60, color:C.red,    icon:"⚠️",  title:"Violation DB",   sub:"PostgreSQL · time-series"},
    formfill: {x:430, y:440, w:155, h:60, color:C.amber,  icon:"📋", title:"Form 18 Engine", sub:"Auto-populate statutory"},
    rptgen:   {x:430, y:540, w:155, h:60, color:C.green,  icon:"📄", title:"Report Generator", sub:"ISO · ESIC · BRSR · OSH"},

    // Layer 3: Output (rightmost)
    dash:     {x:640, y:80,  w:155, h:60, color:C.teal,   icon:"📊", title:"Live Dashboard", sub:"KPIs · cameras · timeline"},
    camfeed:  {x:640, y:170, w:155, h:60, color:C.purple, icon:"🎥", title:"Camera Grid", sub:"WebRTC · HLS proxy"},
    violist:  {x:640, y:260, w:155, h:60, color:C.red,    icon:"🚨", title:"Violation Register", sub:"Real-time + history"},
    form18:   {x:640, y:350, w:155, h:60, color:C.amber,  icon:"📋", title:"Form 18 Filing", sub:"Pre-filled + submit"},
    inspector:{x:640, y:440, w:155, h:60, color:C.green,  icon:"✅", title:"Inspection Check", sub:"24-item daily checklist"},
    reports:  {x:640, y:530, w:155, h:60, color:C.blue,   icon:"📑", title:"Compliance Reports", sub:"Auto PDF export"},
  };

  // Edges: [from_node, to_node, label, color]
  const edges = [
    // Cameras → stream
    ["cam","stream","RTSP",C.purple],
    // Onboarding → auth, plantdb
    ["onboard","auth","creates",C.orange],
    ["onboard","plantdb","seeds",C.teal],
    ["onboard","zoneconf","configures",C.blue],
    // Mobile / API
    ["mobile","auth",null,C.teal],
    ["api","webhook",null,C.blue],
    // Ingestion → AI
    ["stream","ai","frames@4fps",C.pink],
    ["plantdb","zoneconf","zone rules",C.blue],
    ["plantdb","formfill","factory data",C.amber],
    ["plantdb","rptgen","compliance data",C.green],
    // AI → violations
    ["ai","violdb","detections",C.red],
    ["zoneconf","ai","PPE filters",C.pink],
    // Violations → alerts + form18
    ["violdb","alertmgr","events",C.amber],
    ["violdb","formfill","incident data",C.amber],
    ["violdb","violist","live push",C.red],
    // Alert → outputs
    ["alertmgr","dash","push",C.teal],
    ["webhook","rptgen","sync",C.blue],
    // Outputs
    ["stream","camfeed","HLS/WebRTC",C.purple],
    ["auth","dash","session",C.teal],
    ["formfill","form18","pre-fill",C.amber],
    ["rptgen","reports","PDF",C.blue],
    ["zoneconf","inspector","checklist",C.green],
    ["dash","form18",null,C.amber],
  ];

  const midX = (n) => nodes[n].x + nodes[n].w/2;
  const midY = (n) => nodes[n].y + nodes[n].h/2;

  // Layer labels
  const layers = [
    {x:20,  label:"INPUT LAYER",    sub:"Cameras · Wizard · Mobile · API"},
    {x:220, label:"INGESTION",      sub:"Stream · Auth · Registry · Alerts"},
    {x:430, label:"CORE ENGINE",    sub:"AI · Zone Config · Violations · Forms"},
    {x:640, label:"OUTPUT / UI",    sub:"Dashboard · Reports · Forms · Checks"},
  ];

  const clickFlow = (key) => { setActiveFlow(key); setTab("dataflow"); };

  return (
    <>
      <style>{G}</style>

      {/* TOP BAR */}
      <div style={{background:C.bg2,borderBottom:`1px solid ${C.border}`,padding:"0 28px",height:54,
        display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:32,height:32,background:C.orange,clipPath:"polygon(50% 0%,100% 20%,100% 60%,50% 100%,0% 60%,0% 20%)",
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:"#fff",fontWeight:700}}>✓</div>
          <div>
            <div style={{fontFamily:"'Outfit',sans-serif",fontWeight:900,fontSize:20,letterSpacing:2}}>SafeguardIQ Enterprise</div>
            <div style={{fontSize:9,color:C.g2,letterSpacing:3,...mono,textTransform:"uppercase"}}>System Architecture & Integration Map</div>
          </div>
        </div>
        <div style={{display:"flex",gap:4}}>
          {[{id:"architecture",l:"🗺 Architecture"},{id:"dataflow",l:"🔗 Data Flows"},{id:"liveevents",l:"⚡ Live Events"}].map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{padding:"6px 18px",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer",
              border:`1.5px solid ${tab===t.id?C.orange:C.border}`,
              background:tab===t.id?"rgba(255,91,24,.1)":"transparent",
              color:tab===t.id?C.orange:C.g2,fontFamily:"'Outfit',sans-serif",transition:"all .2s"}}>
              {t.l}
            </button>
          ))}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:C.teal,...mono}}>
          <Dot color={C.green} blink size={7}/> System Online
        </div>
      </div>

      {/* ══ TAB: ARCHITECTURE ══ */}
      {tab==="architecture" && (
        <div style={{padding:"28px 28px 40px"}}>
          <div style={{marginBottom:28,animation:"fadeUp .4s ease"}}>
            <div style={{fontFamily:"'Outfit',sans-serif",fontWeight:900,fontSize:38,letterSpacing:2}}>HOW IT ALL CONNECTS</div>
            <div style={{fontSize:14,color:C.g1,marginTop:6,maxWidth:700}}>
              Click any module to see its data flow. The onboarding wizard is the <strong style={{color:C.orange}}>seed</strong> — everything downstream is automatically populated from those 4 steps.
            </div>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 380px",gap:20}}>
            {/* SVG DIAGRAM */}
            <div style={{background:C.bg3,border:`1.5px solid ${C.border}`,borderRadius:16,overflow:"hidden",position:"relative"}}>
              {/* Grid background */}
              <svg style={{position:"absolute",inset:0,width:"100%",height:"100%"}} xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                    <path d="M30,0 L0,0 L0,30" fill="none" stroke={C.g3} strokeWidth=".5" opacity=".6"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)"/>
              </svg>

              <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} style={{width:"100%",position:"relative",zIndex:1}}>
                {/* Layer labels */}
                {layers.map((l,i)=>(
                  <g key={i}>
                    <rect x={l.x} y={10} width={165} height={54} rx={8}
                      fill={C.card2} stroke={C.border2} strokeWidth="1"/>
                    <text x={l.x+12} y={30} fill={C.orange} fontSize="10" fontWeight="700" fontFamily="'Outfit',sans-serif" letterSpacing="1">{l.label}</text>
                    <text x={l.x+12} y={48} fill={C.g2} fontSize="8" fontFamily="'Share Tech Mono',monospace">{l.sub}</text>
                  </g>
                ))}

                {/* Arrows */}
                {edges.map(([from,to,label,color],i)=>{
                  const fn=nodes[from], tn=nodes[to];
                  if(!fn||!tn) return null;
                  // exit right of source, enter left of target (or adjust for same column)
                  const x1 = fn.x+fn.w, y1 = fn.y+fn.h/2;
                  const x2 = tn.x, y2 = tn.y+tn.h/2;
                  return <Arrow key={i} x1={x1} y1={y1} x2={x2} y2={y2} color={color||C.g2} label={label} animated={true}/>;
                })}

                {/* Modules */}
                {Object.entries(nodes).map(([key,n])=>(
                  <Module key={key} {...n}
                    active={selected===key}
                    pulse={key==="onboard"}
                    onClick={()=>{
                      setSelected(selected===key?null:key);
                      const flowMap={onboard:"onboarding",dash:"dashboard",form18:"form18",cam:"camera",ai:"camera"};
                      if(flowMap[key]) clickFlow(flowMap[key]);
                    }}
                  />
                ))}
              </svg>
            </div>

            {/* Right panel */}
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              {/* Legend */}
              <div style={{background:C.card,border:`1.5px solid ${C.border}`,borderRadius:14,padding:18}}>
                <div style={{fontWeight:700,fontSize:12,color:C.g2,textTransform:"uppercase",letterSpacing:2,marginBottom:14,...mono}}>Legend</div>
                {[
                  {color:C.orange,label:"Onboarding / Setup"},
                  {color:C.purple,label:"Camera Pipeline"},
                  {color:C.pink,  label:"AI Inference Engine"},
                  {color:C.teal,  label:"Real-time Dashboard"},
                  {color:C.red,   label:"Violation & Alert"},
                  {color:C.amber, label:"Form 18 / Statutory"},
                  {color:C.green, label:"Reports & Compliance"},
                  {color:C.blue,  label:"External Integrations"},
                ].map(l=>(
                  <div key={l.label} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                    <div style={{width:24,height:4,borderRadius:2,background:l.color,flexShrink:0}}/>
                    <span style={{fontSize:12,color:C.g1}}>{l.label}</span>
                  </div>
                ))}
              </div>

              {/* Quick flow buttons */}
              <div style={{background:C.card,border:`1.5px solid ${C.border}`,borderRadius:14,padding:18}}>
                <div style={{fontWeight:700,fontSize:12,color:C.g2,textTransform:"uppercase",letterSpacing:2,marginBottom:14,...mono}}>Explore Data Flows</div>
                {[
                  {id:"onboarding",icon:"🔗",label:"Onboarding → System",color:C.orange},
                  {id:"camera",    icon:"📹",label:"Camera → AI → Alert",color:C.purple},
                  {id:"dashboard", icon:"📊",label:"Dashboard Data Sources",color:C.teal},
                  {id:"form18",    icon:"📋",label:"Form 18 Auto-Population",color:C.amber},
                ].map(f=>(
                  <div key={f.id} onClick={()=>clickFlow(f.id)} style={{display:"flex",alignItems:"center",gap:12,
                    padding:"11px 14px",borderRadius:10,cursor:"pointer",marginBottom:8,
                    background:activeFlow===f.id&&tab==="dataflow"?`${f.color}12`:C.card2,
                    border:`1.5px solid ${activeFlow===f.id&&tab==="dataflow"?f.color:C.border}`,
                    transition:"all .2s"}}>
                    <span style={{fontSize:18}}>{f.icon}</span>
                    <span style={{fontSize:13,fontWeight:600,color:activeFlow===f.id&&tab==="dataflow"?f.color:C.g1,flex:1}}>{f.label}</span>
                    <span style={{color:C.g2,fontSize:12}}>→</span>
                  </div>
                ))}
              </div>

              {/* Key numbers */}
              <div style={{background:C.card,border:`1.5px solid ${C.border}`,borderRadius:14,padding:18}}>
                <div style={{fontWeight:700,fontSize:12,color:C.g2,textTransform:"uppercase",letterSpacing:2,marginBottom:14,...mono}}>System Stats</div>
                {[
                  {label:"End-to-end latency",value:"< 3s",color:C.green},
                  {label:"Frame analysis rate",value:"4 FPS/cam",color:C.teal},
                  {label:"AI model accuracy",value:"98.7%",color:C.blue},
                  {label:"Form 18 fill rate",value:"94% auto",color:C.amber},
                  {label:"Alert delivery",value:"< 28s",color:C.orange},
                  {label:"Uptime SLA",value:"99.9%",color:C.green},
                ].map(s=>(
                  <div key={s.label} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",
                    borderBottom:`1px solid ${C.g3}`,fontSize:13}}>
                    <span style={{color:C.g2}}>{s.label}</span>
                    <strong style={{color:s.color,...mono}}>{s.value}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ TAB: DATA FLOWS ══ */}
      {tab==="dataflow" && (
        <div style={{padding:"28px",display:"grid",gridTemplateColumns:"260px 1fr",gap:20}}>
          {/* Flow selector */}
          <div>
            <div style={{fontFamily:"'Outfit',sans-serif",fontWeight:900,fontSize:22,marginBottom:6}}>DATA FLOWS</div>
            <div style={{fontSize:12,color:C.g2,marginBottom:20}}>Select a flow to see step-by-step data movement</div>
            {Object.entries(FLOWS).map(([key,f])=>(
              <div key={key} onClick={()=>setActiveFlow(key)}
                style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:12,
                cursor:"pointer",marginBottom:10,
                background:activeFlow===key?`${f.color}12`:C.card,
                border:`1.5px solid ${activeFlow===key?f.color:C.border}`,transition:"all .2s"}}>
                <span style={{fontSize:22}}>{f.icon}</span>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:activeFlow===key?f.color:C.white}}>{f.title}</div>
                  <div style={{fontSize:10,color:C.g2,...mono}}>Click to expand</div>
                </div>
              </div>
            ))}

            {/* Onboarding to dashboard mapping */}
            <div style={{background:C.card,border:`1.5px solid ${C.border}`,borderRadius:14,padding:16,marginTop:16}}>
              <div style={{fontWeight:700,fontSize:11,color:C.orange,textTransform:"uppercase",letterSpacing:2,marginBottom:12,...mono}}>Onboarding → Dashboard</div>
              {[
                ["Customer","→ Account + Login + Billing"],
                ["Plant","→ Plant Registry + Licence DB"],
                ["Area","→ Zone Config + PPE Rules"],
                ["Camera","→ Live Feed + AI Detection"],
              ].map(([from,to])=>(
                <div key={from} style={{fontSize:12,color:C.g1,marginBottom:6,display:"flex",gap:6}}>
                  <strong style={{color:C.orange,minWidth:60}}>{from}</strong>
                  <span style={{color:C.g2}}>{to}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Flow detail */}
          <FlowDetail flow={activeFlow} onClose={()=>{}}/>
        </div>
      )}

      {/* ══ TAB: LIVE EVENTS ══ */}
      {tab==="liveevents" && (
        <div style={{padding:"28px"}}>
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:24}}>
            <div>
              <div style={{fontFamily:"'Outfit',sans-serif",fontWeight:900,fontSize:36,letterSpacing:2}}>LIVE SYSTEM EVENTS</div>
              <div style={{fontSize:13,color:C.g2,marginTop:4}}>Real-time log of data moving through the SafeguardIQ Enterprise pipeline</div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 16px",
              background:"rgba(34,212,104,.08)",border:`1px solid rgba(34,212,104,.25)`,borderRadius:20}}>
              <Dot color={C.green} blink size={8}/>
              <span style={{fontSize:12,color:C.green,...mono}}>LIVE · All systems nominal</span>
            </div>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
            {/* Event log */}
            <div style={{background:C.bg3,border:`1.5px solid ${C.border}`,borderRadius:16,overflow:"hidden"}}>
              <div style={{background:C.card2,padding:"12px 18px",borderBottom:`1px solid ${C.border}`,
                display:"flex",alignItems:"center",gap:10}}>
                <Dot color={C.green} blink size={7}/>
                <span style={{fontSize:12,fontWeight:700,...mono}}>PIPELINE EVENT LOG</span>
              </div>
              <div style={{padding:16,fontFamily:"'Share Tech Mono',monospace",fontSize:11}}>
                {events.map((e,i)=>(
                  <div key={i} style={{display:"flex",gap:12,padding:"8px 10px",borderBottom:`1px solid ${C.g3}`,
                    animation:`fadeUp .3s ease ${i*.05}s both`}}>
                    <span style={{color:C.g2,flexShrink:0}}>{e.t}</span>
                    <span style={{color:e.c,flex:1,lineHeight:1.5}}>{e.msg}</span>
                  </div>
                ))}
                <div style={{padding:"8px 10px",color:C.g2,animation:"blink 1s infinite"}}>▋</div>
              </div>
            </div>

            {/* Module status */}
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div style={{background:C.card,border:`1.5px solid ${C.border}`,borderRadius:14,padding:18}}>
                <div style={{fontWeight:700,fontSize:12,color:C.g2,textTransform:"uppercase",letterSpacing:2,marginBottom:16,...mono}}>Module Health</div>
                {[
                  {name:"Stream Ingestion (16 cameras)",status:"Healthy",latency:"12ms",color:C.green},
                  {name:"AI Engine (GPU)",status:"Healthy",latency:"248ms",color:C.green},
                  {name:"Zone Config Engine",status:"Healthy",latency:"3ms",color:C.green},
                  {name:"Violation DB (PostgreSQL)",status:"Healthy",latency:"8ms",color:C.green},
                  {name:"Alert Manager",status:"Healthy",latency:"1.2s",color:C.green},
                  {name:"Form 18 Engine",status:"Healthy",latency:"45ms",color:C.green},
                  {name:"Report Generator",status:"Idle",latency:"—",color:C.g2},
                  {name:"Webhook / ERP Sync",status:"Idle",latency:"—",color:C.g2},
                ].map(m=>(
                  <div key={m.name} style={{display:"flex",alignItems:"center",gap:12,padding:"9px 0",
                    borderBottom:`1px solid ${C.g3}`}}>
                    <Dot color={m.color} blink={m.status==="Healthy"} size={7}/>
                    <span style={{flex:1,fontSize:12,color:C.g1}}>{m.name}</span>
                    <span style={{fontSize:11,color:m.color,...mono}}>{m.status}</span>
                    <span style={{fontSize:11,color:C.g2,...mono,minWidth:50,textAlign:"right"}}>{m.latency}</span>
                  </div>
                ))}
              </div>

              <div style={{background:C.card,border:`1.5px solid ${C.border}`,borderRadius:14,padding:18}}>
                <div style={{fontWeight:700,fontSize:12,color:C.g2,textTransform:"uppercase",letterSpacing:2,marginBottom:14,...mono}}>Today's Pipeline Metrics</div>
                {[
                  {label:"Frames processed",value:"2,764,800",color:C.purple},
                  {label:"AI inferences run",value:"691,200",color:C.pink},
                  {label:"Violations detected",value:"7",color:C.red},
                  {label:"Alerts sent",value:"12",color:C.amber},
                  {label:"Form 18 auto-fills",value:"3",color:C.orange},
                  {label:"Reports generated",value:"2",color:C.blue},
                ].map(m=>(
                  <div key={m.label} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",
                    borderBottom:`1px solid ${C.g3}`,fontSize:13}}>
                    <span style={{color:C.g2}}>{m.label}</span>
                    <strong style={{color:m.color,...mono}}>{m.value}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Integration map (text) */}
          <div style={{marginTop:20,background:C.card,border:`1.5px solid ${C.border}`,borderRadius:16,padding:24}}>
            <div style={{fontWeight:900,fontSize:18,marginBottom:4}}>🔄 THE COMPLETE INTEGRATION CHAIN</div>
            <div style={{fontSize:13,color:C.g2,marginBottom:20}}>How a single onboarding session creates the entire working system</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:0}}>
              {[
                {step:"01",title:"You fill Onboarding",desc:"Customer → Plant → Area → Camera wizard",color:C.orange,icon:"🧙",sub:"~10 minutes"},
                {step:"02",title:"Database seeded",desc:"Plant Registry, Zone Config, Camera Registry, Auth all populated",color:C.teal,icon:"🗄️",sub:"Instant"},
                {step:"03",title:"Cameras connect",desc:"Stream Ingestion pulls RTSP feeds, AI Engine loads zone-specific PPE model",color:C.purple,icon:"📡",sub:"~2 minutes"},
                {step:"04",title:"Dashboard goes live",desc:"KPIs, camera grid, violation log, Form 18 all auto-populated from onboarding data",color:C.green,icon:"🚀",sub:"~3 minutes"},
              ].map((s,i)=>(
                <div key={i} style={{display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center",
                  padding:"20px 16px",position:"relative",
                  borderRight:i<3?`1px solid ${C.border}`:"none"}}>
                  <div style={{width:52,height:52,borderRadius:"50%",background:`${s.color}15`,
                    border:`2px solid ${s.color}`,display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:24,marginBottom:12}}>{s.icon}</div>
                  <div style={{fontSize:9,...mono,color:s.color,letterSpacing:2,marginBottom:4}}>STEP {s.step}</div>
                  <div style={{fontWeight:800,fontSize:15,color:C.white,marginBottom:8}}>{s.title}</div>
                  <div style={{fontSize:12,color:C.g1,lineHeight:1.6,marginBottom:8}}>{s.desc}</div>
                  <Tag color={s.color}>{s.sub}</Tag>
                  {i<3 && <div style={{position:"absolute",right:-12,top:"50%",transform:"translateY(-50%)",
                    fontSize:18,color:C.g2}}>›</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

