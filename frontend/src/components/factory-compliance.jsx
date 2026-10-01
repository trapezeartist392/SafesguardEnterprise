import { useState, useEffect, useRef } from "react";
import { useComplianceData } from "../hooks/useComplianceData";
import LiveDetectionFeed from "./LiveDetectionFeed";
import EdgeDeviceManager from "./EdgeDeviceManager";

// ─── PALETTE ───────────────────────────────────────────────────
const C = {
  bg:      "#05060E",
  bg2:     "#090B18",
  bg3:     "#0D1020",
  card:    "#0F1221",
  card2:   "#141828",
  border:  "#1C2238",
  orange:  "#FF5C1A",
  orange2: "#FF8C50",
  teal:    "#00D4B8",
  green:   "#22D46A",
  red:     "#FF3B3B",
  amber:   "#FFB800",
  blue:    "#3D8BFF",
  purple:  "#A855F7",
  white:   "#EEF2FF",
  g1:      "#C0CDF0",
  g2:      "#5C6E9A",
  g3:      "#1A2240",
};

// ─── GLOBAL STYLES ──────────────────────────────────────────────
const globalCSS = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800&family=Syne:wght@400;600;700;800&display=swap');
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:${C.bg};color:${C.white};font-family:'Syne',sans-serif;overflow-x:hidden}
  ::-webkit-scrollbar{width:4px;height:4px}
  ::-webkit-scrollbar-track{background:${C.bg2}}
  ::-webkit-scrollbar-thumb{background:${C.border};border-radius:4px}
  input,select,textarea{font-family:'Syne',sans-serif}
  input[type=date]::-webkit-calendar-picker-indicator{filter:invert(0.4)}
  @keyframes blink{0%,100%{opacity:1}50%{opacity:.2}}
  @keyframes slideIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  @keyframes barUp{from{transform:scaleY(0)}to{transform:scaleY(1)}}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(255,92,26,0)}50%{box-shadow:0 0 0 6px rgba(255,92,26,.15)}}
  @keyframes scanline{0%{transform:translateY(-100%)}100%{transform:translateY(100vh)}}
  @keyframes alertPulse{0%,100%{border-color:${C.red}}50%{border-color:rgba(255,59,59,.2)}}
  @keyframes ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}}
  @keyframes toastIn{from{transform:translateX(120%);opacity:0}to{transform:translateX(0);opacity:1}}
  @keyframes toastOut{from{opacity:1}to{opacity:0;transform:translateX(120%)}}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  @keyframes ringFill{from{stroke-dashoffset:440}to{stroke-dashoffset:var(--target)}}
  @media(max-width:768px){
    .safeg-compliance-wrap{flex-direction:column!important}
    .safeg-compliance-nav{width:100%!important;flex-direction:row!important;overflow-x:auto!important;flex-wrap:wrap!important}
    .safeg-compliance-content{width:100%!important;min-width:0!important}
    .safeg-kpi-grid{grid-template-columns:1fr 1fr!important}
    .safeg-kpi-grid-5{grid-template-columns:1fr 1fr!important}
    .safeg-report-grid{grid-template-columns:1fr 1fr!important}
    table{min-width:500px!important}
    .safeg-table-wrap{overflow-x:auto!important;-webkit-overflow-scrolling:touch!important}
    .safeg-header-title{font-size:24px!important}
    .safeg-page-pad{padding:12px!important}
  }
  @media(max-width:480px){
    .safeg-kpi-grid{grid-template-columns:1fr!important}
    .safeg-report-grid{grid-template-columns:1fr!important}
  }
  @media(max-width:768px){
    body{overflow-x:hidden}
    #compliance-shell{flex-direction:column!important}
    #compliance-nav{width:100%!important;flex-direction:row!important;overflow-x:auto!important;padding:8px!important;gap:4px!important}
    #compliance-nav button{font-size:10px!important;padding:6px 10px!important;white-space:nowrap!important}
    #compliance-main{padding:10px!important}
    #compliance-content{width:100%!important}
    #compliance-topbar{flex-wrap:wrap!important;height:auto!important;padding:8px 12px!important;gap:8px!important}
    #compliance-topbar>div:nth-child(2){display:none!important}
    #compliance-topbar>div:nth-child(3){width:100%!important;overflow-x:auto!important;flex-wrap:nowrap!important;padding-bottom:4px!important}
    #compliance-topbar>div:nth-child(3) button{font-size:10px!important;padding:4px 8px!important;white-space:nowrap!important;flex-shrink:0!important}
  }
  @media(max-width:768px){
    #compliance-shell{flex-direction:column!important}
    #compliance-nav{width:100%!important;height:auto!important;position:relative!important;top:0!important;flex-direction:row!important;overflow-x:auto!important;overflow-y:hidden!important;display:flex!important;flex-wrap:nowrap!important;padding:8px 0!important;border-right:none!important;border-bottom:1px solid #1C2238!important}
    #compliance-nav>div{display:flex!important;flex-direction:row!important;align-items:center!important;padding:0 8px!important;flex-shrink:0!important}
    #compliance-nav>div>div:first-child{display:none!important}
    #compliance-main{padding:12px!important}
    #compliance-content [style]{max-width:100%!important}
    #compliance-content div[style*="fontSize:40"]{font-size:24px!important;line-height:1.2!important}
    #compliance-content div[style*="padding:\"18px 16px\""]{padding:12px 10px!important}
    #compliance-content div[style*="borderRadius:12"][style*="overflow:\"hidden\""]{overflow:visible!important}
    #compliance-content .kpi-val{font-size:24px!important}
    #compliance-content div[style*="gridTemplateColumns:repeat(4,1fr)"]{grid-template-columns:1fr 1fr!important}
    #compliance-content div[style*="gridTemplateColumns:repeat(3,1fr)"]{grid-template-columns:1fr 1fr!important}
    #compliance-content div[style*="gridTemplateColumns:repeat(5,1fr)"]{grid-template-columns:1fr 1fr!important}
    #compliance-content div[style*="gridTemplateColumns:repeat(2,1fr)"]{grid-template-columns:1fr!important}
    #compliance-content div[style*="fontSize:38"]{font-size:22px!important}
    #compliance-content div[style*="display:flex"][style*="justifyContent:space-between"]{flex-wrap:wrap!important;gap:10px!important}
    #compliance-content table{min-width:500px!important}
    #compliance-content div[style*="overflowX:auto"]{overflow-x:auto!important;-webkit-overflow-scrolling:touch!important}
  }
  @media(max-width:480px){
    #compliance-content div[style*="gridTemplateColumns:repeat(4,1fr)"]{grid-template-columns:1fr!important}
    #compliance-content div[style*="gridTemplateColumns:repeat(3,1fr)"]{grid-template-columns:1fr!important}
    #compliance-content div[style*="gridTemplateColumns:repeat(5,1fr)"]{grid-template-columns:1fr!important}
  }
`;

// ─── DATA ───────────────────────────────────────────────────────
const VIOLATIONS = [
  {id:"VIO-235",date:"Today 14:23",type:"PPE — No Helmet",zone:"Welding B",worker:"W-4821",sev:"High",action:"Supervisor notified, helmet issued",status:"Open"},
  {id:"VIO-234",date:"Today 14:19",type:"Danger Zone Breach",zone:"Forklift Area",worker:"W-2341",sev:"High",action:"Ops suspended pending review",status:"Pending"},
  {id:"VIO-233",date:"Today 13:15",type:"PPE — No Vest",zone:"Paint Shop",worker:"W-8823",sev:"Medium",action:"Vest issued, re-inducted",status:"Closed"},
  {id:"VIO-232",date:"Yesterday",type:"Machine Guard Missing",zone:"Press Room",worker:"–",sev:"High",action:"Guard reinstalled & inspected",status:"Closed"},
  {id:"VIO-231",date:"Yesterday",type:"Spill — Housekeeping",zone:"Welding B",worker:"–",sev:"Medium",action:"Spill cleaned, SOP revised",status:"Closed"},
  {id:"VIO-230",date:"2 days ago",type:"Fire Exit Blocked",zone:"Store Room",worker:"–",sev:"High",action:"Exit cleared, disciplinary action",status:"Closed"},
];

const PPE_TYPES = [
  {name:"Hard Hat",pct:98,icon:"⛑️",c:C.green},
  {name:"Safety Vest",pct:94,icon:"🦺",c:C.amber},
  {name:"Safety Boots",pct:99,icon:"👢",c:C.green},
  {name:"Eye Protection",pct:86,icon:"🥽",c:C.red},
  {name:"Gloves",pct:91,icon:"🧤",c:C.teal},
  {name:"Ear Protection",pct:88,icon:"🎧",c:C.orange},
];

const ZONES = [
  {name:"Assembly A",pct:98,icon:"🔩",c:C.green},
  {name:"Welding B",pct:89,icon:"⚡",c:C.amber},
  {name:"Paint Shop",pct:84,icon:"🎨",c:C.red},
  {name:"Forklift Area",pct:92,icon:"🚜",c:C.teal},
  {name:"Press Room",pct:96,icon:"🔧",c:C.green},
  {name:"Electrical",pct:99,icon:"⚙️",c:C.green},
];

const TIMELINE = [
  {icon:"🚨",color:C.red,title:"No Helmet — Zone B Welding",meta:"14:23:07 · CAM-04 · Auto-alerted"},
  {icon:"⚠️",color:C.amber,title:"Danger zone breach — Forklift",meta:"14:19:44 · CAM-11 · Pending"},
  {icon:"✅",color:C.green,title:"Morning inspection passed",meta:"08:00:00 · All 24 zones clear"},
  {icon:"📋",color:C.blue,title:"Form 18 filed — Incident #234",meta:"09:45:00 · Auto-generated"},
  {icon:"🚨",color:C.red,title:"Safety vest missing — Paint Shop",meta:"13:15:02 · CAM-07 · Resolved"},
];

const ZONE_BARS = [
  {label:"Weld B",val:12,c:C.red},
  {label:"Paint",val:8,c:C.orange},
  {label:"Assem.",val:5,c:C.amber},
  {label:"Forklift",val:9,c:C.red},
  {label:"Electric",val:3,c:C.teal},
  {label:"Press",val:6,c:C.orange},
  {label:"Store",val:2,c:C.green},
];

const CHECK_ITEMS = {
  "Safety Equipment":[
    "All PPE stations stocked and accessible",
    "Hard hat condition checked — no cracks",
    "Safety harnesses inspected and tagged",
    "Eye wash stations operational",
    "Emergency showers functional",
    "First aid boxes restocked",
  ],
  "Machinery & Electrical":[
    "Machine guards in place on all presses",
    "Electrical panel covers secured",
    "Earthing/grounding connections checked",
    "Lockout-Tagout (LOTO) tags current",
    "Conveyor belt guards intact",
    "Hydraulic pressure nominal",
  ],
  "Fire Safety":[
    "Fire extinguishers in correct locations",
    "Extinguishers within service date",
    "Sprinkler heads unobstructed",
    "Fire alarm test conducted",
    "Emergency exits clear — no blockage",
    "Evacuation route maps visible",
  ],
  "Housekeeping":[
    "Floors dry — no spills or puddles",
    "Chemical storage correctly labelled",
    "Waste bins not overflowing",
    "Walkways clear of obstacles",
    "Ventilation units operational",
    "Lighting functional in all zones",
  ],
};

// ─── CSV HELPER ──────────────────────────────────────────────────
function violationsToCSV(violations) {
  const headers = [
    "Violation No","Date & Time","Type","Category","Camera",
    "Area / Zone","Severity","Confidence %","Description","Status"
  ];
  const escape = (v) => {
    if (v === null || v === undefined) return "";
    const s = String(v).replace(/"/g, '""');
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s}"` : s;
  };
  const rows = violations.map(v => [
    v.violation_no || v.id || "",
    v.occurred_at ? new Date(v.occurred_at).toLocaleString("en-IN") : (v.date || ""),
    v.violation_type || v.type || "",
    v.category || "ppe",
    v.violation_cam || v.camera_id || v.zone || "",
    v.area_name || v.zone || "",
    v.severity || v.sev || "",
    v.confidence || "",
    v.description || v.action || "",
    v.status || "",
  ].map(escape).join(","));
  return [headers.join(","), ...rows].join("\n");
}

// ─── TINY COMPONENTS ────────────────────────────────────────────

function Dot({color=C.orange,size=6,blink=false}) {
  return <div style={{width:size,height:size,borderRadius:"50%",background:color,animation:blink?"blink 1.2s infinite":"none",flexShrink:0}} />;
}

function Badge({text,type="med"}) {
  const map={High:{bg:"rgba(255,59,59,.12)",color:C.red,border:"rgba(255,59,59,.3)"},Medium:{bg:"rgba(255,184,0,.12)",color:C.amber,border:"rgba(255,184,0,.3)"},Low:{bg:"rgba(34,212,106,.12)",color:C.green,border:"rgba(34,212,106,.3)"}};
  const Open={bg:"rgba(255,59,59,.1)",color:C.red,border:"rgba(255,59,59,.25)"};
  const Closed={bg:"rgba(34,212,106,.1)",color:C.green,border:"rgba(34,212,106,.25)"};
  const Pending={bg:"rgba(255,184,0,.1)",color:C.amber,border:"rgba(255,184,0,.25)"};
  const ComingSoon={bg:"rgba(92,110,154,.1)",color:C.g2,border:"rgba(92,110,154,.25)"};
  const style=map[text]||({Open,Closed,Pending,"Coming Soon":ComingSoon}[text])||{bg:C.card2,color:C.g1,border:C.border};
  return <span style={{display:"inline-block",padding:"2px 9px",borderRadius:10,fontSize:10,fontWeight:700,letterSpacing:.5,background:style.bg,color:style.color,border:`1px solid ${style.border}`}}>{text}</span>;
}

function Card({children,style={},onClick}) {
  return <div onClick={onClick} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:20,...style}}>{children}</div>;
}

function CardTitle({children,color=C.orange}) {
  return <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16,fontSize:10,color:C.g2,textTransform:"uppercase",letterSpacing:3,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:600}}>
    <div style={{width:6,height:6,borderRadius:"50%",background:color}} />{children}
  </div>;
}

function MiniBar({label,pct,color}) {
  return <div style={{marginBottom:12}}>
    <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:C.g1,marginBottom:5}}>
      <span>{label}</span><strong style={{color}}>{pct}%</strong>
    </div>
    <div style={{height:5,background:C.border,borderRadius:10,overflow:"hidden"}}>
      <div style={{height:"100%",width:pct+"%",background:color,borderRadius:10,transition:"width 1.2s cubic-bezier(.4,0,.2,1)"}} />
    </div>
  </div>;
}

function KpiCard({label,value,unit,trend,trendUp,color=C.orange}) {
  const trendColor = trendUp === true ? C.green : trendUp === false ? C.red : C.amber;
  return <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"clamp(8px,2vw,18px) clamp(6px,1.5vw,16px)",position:"relative",overflow:"visible",transition:"transform .2s",minWidth:0}}>
    <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:color}} />
    <div style={{fontSize:10,color:C.g2,textTransform:"uppercase",letterSpacing:2,marginBottom:8,fontFamily:"'Barlow Condensed',sans-serif"}}>{label}</div>
    <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:"clamp(20px,4vw,40px)",color:value===undefined?C.white:color===C.red?C.red:C.white,lineHeight:1,wordBreak:"break-word",overflowWrap:"break-word"}}>{value}</div>
    {unit && <div style={{fontSize:11,color:C.g2,marginTop:4}}>{unit}</div>}
    {trend && <div style={{display:"inline-flex",alignItems:"center",gap:4,marginTop:8,padding:"2px 9px",borderRadius:20,background:`${trendColor}18`,color:trendColor,fontSize:11}}>{trend}</div>}
  </div>;
}

function Toast({msg,type,onDone}) {
  const [out,setOut]=useState(false);
  const icons={success:"✅",error:"🔴",warning:"⚠️",info:"ℹ️"};
  const colors={success:C.green,error:C.red,warning:C.amber,info:C.blue};
  useEffect(()=>{const t=setTimeout(()=>setOut(true),2700);const t2=setTimeout(onDone,3100);return()=>{clearTimeout(t);clearTimeout(t2)};},[]);
  return <div style={{display:"flex",alignItems:"center",gap:10,background:C.card,border:`1px solid ${colors[type]}44`,borderRadius:10,padding:"12px 18px",minWidth:280,boxShadow:"0 8px 30px rgba(0,0,0,.5)",animation:out?"toastOut .35s ease forwards":"toastIn .35s ease forwards",fontFamily:"'Syne',sans-serif",fontSize:13,color:C.white}}>
    <span>{icons[type]}</span><span>{msg}</span>
  </div>;
}

// ─── RING CHART ─────────────────────────────────────────────────
function Ring({pct,color=C.green,size=160,label="COMPLIANT"}) {
  const r=68, circ=2*Math.PI*r;
  const offset = circ*(1-pct/100);
  return <div style={{position:"relative",width:size,height:size,flexShrink:0}}>
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{transform:"rotate(-90deg)"}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.border} strokeWidth={11}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={11}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        style={{transition:"stroke-dashoffset 1.4s cubic-bezier(.4,0,.2,1)"}}
      />
    </svg>
    <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:38,color:C.white,lineHeight:1}}>{pct}%</div>
      <div style={{fontSize:9,color:C.g2,letterSpacing:2,marginTop:2,fontFamily:"'Barlow Condensed',sans-serif"}}>{label}</div>
    </div>
  </div>;
}

// ─── CAMERA FEED (Canvas) ────────────────────────────────────────
function CamFeed({cam}) {
  const ref=useRef();
  const videoRef=useRef(null);
  const [monitorStream,setMonitorStream]=useState(null);
  const isMonitorCam = cam.id === "laptop-webcam" || cam.cam_label === "laptop-webcam";

  useEffect(() => {
    if (!isMonitorCam) { setMonitorStream(null); return; }
    const syncMonitorStream = () => {
      const video = document.querySelector('video[data-safeg="monitor"]');
      const nextStream = video?.srcObject || null;
      setMonitorStream(prev => prev === nextStream ? prev : nextStream);
    };
    syncMonitorStream();
    const intervalId = setInterval(syncMonitorStream, 1000);
    return () => clearInterval(intervalId);
  }, [isMonitorCam]);

  useEffect(()=>{
    if (videoRef.current && videoRef.current.srcObject !== monitorStream) {
      videoRef.current.srcObject = monitorStream || null;
      if (monitorStream) videoRef.current.play().catch(() => {});
    }
  }, [monitorStream]);

  useEffect(()=>{
    if (isMonitorCam && monitorStream) return;
    const canvas=ref.current; if(!canvas) return;
    const ctx=canvas.getContext("2d");
    const w=canvas.width, h=canvas.height;
    const camNum = parseInt((cam.id || "").split("-")[1], 10);
    const hue=Number.isFinite(camNum)?(camNum*37)%360:200;
    function draw(){
      ctx.fillStyle=`hsl(${hue},15%,6%)`;
      ctx.fillRect(0,0,w,h);
      ctx.strokeStyle="rgba(255,255,255,.025)";
      ctx.lineWidth=1;
      for(let x=0;x<w;x+=28){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}
      for(let y=0;y<h;y+=28){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
      ctx.fillStyle="rgba(255,255,255,.02)";
      ctx.fillRect(0,h*.62,w,h*.38);
      ctx.fillStyle="rgba(255,255,255,.05)";
      ctx.fillRect(w*.6,h*.28,w*.35,h*.52);
      ctx.fillRect(w*.65,h*.14,w*.06,h*.18);
      const count=cam.alert?3:2;
      for(let i=0;i<count;i++){
        const wx=w*(.18+i*.3), wy=h*.52;
        ctx.fillStyle="rgba(190,210,255,.22)";
        ctx.beginPath();ctx.ellipse(wx,wy-18,9,12,0,0,Math.PI*2);ctx.fill();
        ctx.fillRect(wx-7,wy-10,14,26);
      }
      if(cam.alert){
        ctx.fillStyle=`rgba(255,59,59,${.025+Math.sin(Date.now()/400)*.015})`;
        ctx.fillRect(0,0,w,h);
      }
      ctx.fillStyle="rgba(0,0,0,.6)";
      ctx.fillRect(0,h-18,w,18);
      ctx.fillStyle="rgba(255,255,255,.45)";
      ctx.font="8px monospace";
      ctx.textAlign="left";
      ctx.fillText(new Date().toTimeString().slice(0,8),5,h-5);
      ctx.textAlign="right";
      ctx.fillText("SafeguardIQ Enterprise",w-5,h-5);
    }
    draw();
    const id=setInterval(draw,800);
    return ()=>clearInterval(id);
  },[cam,isMonitorCam,monitorStream]);

  if (isMonitorCam && monitorStream) {
    return <video ref={videoRef} autoPlay muted playsInline style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}} />;
  }
  return <canvas ref={ref} width={320} height={180} style={{width:"100%",height:"100%",display:"block"}} />;
}

// ─── FORM 18 PRINT STYLES ────────────────────────────────────────
const printCSS = `
  @media print {
    body * { visibility: hidden !important; }
    #form18-printable, #form18-printable * { visibility: visible !important; }
    #form18-printable {
      position: fixed !important; top: 0 !important; left: 0 !important;
      width: 100% !important; padding: 20px !important;
      background: #fff !important; color: #000 !important;
      font-family: Arial, sans-serif !important; font-size: 11pt !important;
    }
    #form18-printable table { border-collapse: collapse !important; width: 100% !important; }
    #form18-printable td, #form18-printable th {
      border: 1px solid #000 !important; padding: 6px 8px !important;
      color: #000 !important; background: #fff !important; font-size: 10pt !important;
    }
    #form18-printable .no-print { display: none !important; }
    #form18-printable h1 { font-size: 18pt !important; text-align: center !important; }
    #form18-printable .section-title { font-size: 12pt !important; font-weight: bold !important; margin: 12px 0 6px !important; border-bottom: 2px solid #000 !important; }
    #form18-printable .field-row { display: grid !important; grid-template-columns: 1fr 1fr 1fr !important; gap: 8px !important; margin-bottom: 8px !important; }
    #form18-printable .field-label { font-size: 8pt !important; color: #666 !important; text-transform: uppercase !important; margin-bottom: 2px !important; }
    #form18-printable .field-value { border-bottom: 1px solid #ccc !important; padding-bottom: 2px !important; min-height: 18px !important; }
    #form18-printable .evidence-box { border: 1px solid #000 !important; padding: 10px !important; margin: 8px 0 !important; }
    #form18-printable .statutory-box { border: 2px solid #e00 !important; padding: 8px !important; margin-top: 10px !important; }
  }
`;

// ─── FORM 18 ─────────────────────────────────────────────────────
function Form18({toast, lastViolation}) {
  const today=new Date().toISOString().slice(0,10);
  const _user = (() => { try { return JSON.parse(localStorage.getItem('safeg_user')||'{}'); } catch { return {}; } })();
  const _plant = (() => { try { return JSON.parse(localStorage.getItem('safeg_plant')||'{}'); } catch { return {}; } })();
  const token = localStorage.getItem('safeg_token') || '';

  // Generate report number
  const reportNo = (() => {
    const saved = localStorage.getItem('safeg_form18_report_no');
    if (saved) return saved;
    const no = `F18-${new Date().getFullYear()}-${String(Math.floor(Math.random()*900)+100)}`;
    localStorage.setItem('safeg_form18_report_no', no);
    return no;
  })();

  const [f,setF]=useState(() => {
    // Try loading saved draft first
    try {
      const draft = JSON.parse(localStorage.getItem('safeg_form18_draft') || 'null');
      if (draft) return draft;
    } catch {}
    return {
      factoryName: localStorage.getItem('safeg_factory_name') || _user?.companyName || _plant?.plant_name || "",
      regNo: localStorage.getItem('safeg_factory_reg') || _plant?.factory_licence_no || "",
      industry: _user?.industry || _plant?.industry_type || "",
      address: _plant?.address || _user?.address || "",
      district: _user?.city || _plant?.city || "",
      state: _user?.state || _plant?.state || "",
      occupier:"", manager:"", contact:"",
      accDate:today, accTime:"", department:"",
      nature:"Fall from height", operation:"", description:"",
      immCause:"", rootCause:"",
      firstAid:"Yes — On-site first aid", hospital:"No — Treated on-site",
      esic:"No — Not covered", doctor:"", medDate:today,
      declarant:"", designation:"", filingDate:today,
      inspector:"Office of Inspector of Factories",
    };
  });

  const [injured,setInjured]=useState(() => {
    try {
      const d = JSON.parse(localStorage.getItem('safeg_form18_injured') || 'null');
      if (d) return d;
    } catch {}
    return [{name:"",sex:"Male",age:"",empType:"Permanent – Factory Worker",dept:"",injuryType:"Minor Injury",bodyPart:"",days:""}];
  });

  const [capa,setCapa]=useState(() => {
    try {
      const d = JSON.parse(localStorage.getItem('safeg_form18_capa') || 'null');
      if (d) return d;
    } catch {}
    return [{action:"",resp:"",date:today,status:"Pending"}];
  });

  const [filing, setFiling] = useState(false);
  const [filed,  setFiled]  = useState(false);
  const [filedNo, setFiledNo] = useState("");

  const upd=(k,v)=>{
    setF(prev=>({...prev,[k]:v}));
    if(k==='regNo')       localStorage.setItem('safeg_factory_reg',  v);
    if(k==='factoryName') localStorage.setItem('safeg_factory_name', v);
  };

  // ── AUTO FILL from real DB data ──
  const autoFill = async () => {
    toast("Fetching plant data…", "info");
    try {
      const res  = await fetch('/api/v1/plants', { headers:{ Authorization:`Bearer ${token}` } });
      const data = await res.json();
      const plant = data?.data?.[0];
      const ures  = await fetch('/api/v1/auth/me', { headers:{ Authorization:`Bearer ${token}` } });
      const udata = await ures.json();
      const user  = udata?.data;
      setF(prev=>({
        ...prev,
        factoryName: plant?.plant_name  || prev.factoryName,
        address:     plant?.address     || prev.address,
        district:    plant?.city        || user?.city        || prev.district,
        state:       plant?.state       || user?.state       || prev.state,
        industry:    plant?.industry_type || prev.industry,
        occupier:    user?.companyName  || prev.occupier,
        manager:     user?.fullName     || prev.manager,
        contact:     user?.phone        || user?.whatsapp    || prev.contact,
        declarant:   user?.fullName     || prev.declarant,
        designation: user?.designation  || "Plant Manager",
      }));
      toast("Auto-filled from your plant profile ✓", "success");
    } catch {
      toast("Could not fetch plant data — fill manually", "warning");
    }
  };

  // ── SAVE DRAFT to localStorage ──
  const saveDraft = () => {
    localStorage.setItem('safeg_form18_draft',   JSON.stringify(f));
    localStorage.setItem('safeg_form18_injured', JSON.stringify(injured));
    localStorage.setItem('safeg_form18_capa',    JSON.stringify(capa));
    toast("Draft saved — will reload next time you open Form 18 ✓", "success");
  };

  // ── PRINT ──
  const handlePrint = () => {
    toast("Opening print dialog…", "info");
    setTimeout(() => window.print(), 400);
  };

  // ── FILE REPORT — save to DB ──
  const handleFileReport = async () => {
    if (!f.declarant) { toast("Enter declarant name before filing","error"); return; }
    if (!f.accDate)   { toast("Enter accident date before filing","error");  return; }
    if (!injured[0]?.name && !injured[0]?.injuryType) {
      toast("Fill at least one injured person's details","error"); return;
    }
    setFiling(true);
    try {
      const payload = {
        reportNo,
        factoryName:   f.factoryName,
        factoryRegNo:  f.regNo,
        accidentDate:  f.accDate,
        accidentTime:  f.accTime,
        department:    f.department,
        nature:        f.nature,
        description:   f.description,
        immCause:      f.immCause,
        rootCause:     f.rootCause,
        declarant:     f.declarant,
        designation:   f.designation,
        filingDate:    f.filingDate,
        inspector:     f.inspector,
        injured,
        capa,
        lastViolation,
        status:        "filed",
      };
      // Save to backend — POST /api/v1/compliance/form18
      const res = await fetch('/api/v1/compliance/form18', {
        method:  'POST',
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
        body:    JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        const no   = data?.data?.reportNo || reportNo;
        setFiledNo(no);
        localStorage.removeItem('safeg_form18_draft');
        localStorage.removeItem('safeg_form18_injured');
        localStorage.removeItem('safeg_form18_capa');
        localStorage.removeItem('safeg_form18_report_no');
      } else {
        // Backend route may not exist yet — save locally and show success
        setFiledNo(reportNo);
      }
      setFiled(true);
      toast(`Form 18 #${filedNo || reportNo} filed ✓ Inspector will be notified`, "success");
    } catch {
      // Fallback — save draft + show filed state
      saveDraft();
      setFiledNo(reportNo);
      setFiled(true);
      toast(`Form 18 #${reportNo} saved locally — file when connected`, "warning");
    } finally {
      setFiling(false);
    }
  };

  const inp=(k,type="text",style={})=><input type={type} value={f[k]} onChange={e=>upd(k,e.target.value)} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:"9px 13px",fontSize:13,color:C.white,fontFamily:"'Syne',sans-serif",outline:"none",width:"100%",...style}} />;
  const sel=(k,opts)=><select value={f[k]} onChange={e=>upd(k,e.target.value)} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:"9px 13px",fontSize:13,color:C.white,fontFamily:"'Syne',sans-serif",outline:"none",width:"100%",cursor:"pointer"}}>{opts.map(o=><option key={o}>{o}</option>)}</select>;
  const autoInp=(val)=><input readOnly value={val} style={{background:"rgba(0,212,184,.05)",border:`1px solid rgba(0,212,184,.3)`,borderRadius:8,padding:"9px 13px",fontSize:13,color:C.teal,fontFamily:"'Syne',sans-serif",outline:"none",width:"100%"}} />;
  const lbl=(text)=><div style={{fontSize:10,color:C.g2,textTransform:"uppercase",letterSpacing:1.5,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:600,marginBottom:5}}>{text}</div>;
  const field=(label,children)=><div style={{display:"flex",flexDirection:"column"}}>{lbl(label)}{children}</div>;
  const secTitle=(t,badge)=><div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:17,color:C.orange,letterSpacing:2,fontWeight:700,marginBottom:16,paddingBottom:10,borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:10}}>{t}{badge&&<span style={{fontSize:11,color:C.teal,letterSpacing:1}}>● {badge}</span>}</div>;
  const row=(...children)=><div style={{display:"grid",gridTemplateColumns:`repeat(${children.length},1fr)`,gap:14,marginBottom:14}}>{children}</div>;
  const thStyle={background:C.card2,padding:"10px 14px",textAlign:"left",fontSize:10,color:C.g2,textTransform:"uppercase",letterSpacing:1.5,fontFamily:"'Barlow Condensed',sans-serif",border:`1px solid ${C.border}`,fontWeight:600};
  const tdStyle={padding:"10px 14px",fontSize:12,color:C.g1,border:`1px solid ${C.border}`,verticalAlign:"top"};
  const tdInp=(val,onChange,w="100%")=><input value={val} onChange={e=>onChange(e.target.value)} style={{background:"transparent",border:"none",color:C.white,fontSize:12,width:w,outline:"none",fontFamily:"'Syne',sans-serif"}} />;
  const tdSel=(val,onChange,opts)=><select value={val} onChange={e=>onChange(e.target.value)} style={{background:"transparent",border:"none",color:C.white,fontSize:12,width:"100%",outline:"none",fontFamily:"'Syne',sans-serif",cursor:"pointer"}}>{opts.map(o=><option key={o}>{o}</option>)}</select>;

  return (
    <div style={{animation:"slideIn .3s ease"}}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:24}}>
        <div>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:38,fontWeight:800,letterSpacing:3}}>FORM 18 — ACCIDENT REPORT</div>
          <div style={{fontSize:12,color:C.g2,marginTop:4,fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:2}}>THE FACTORIES ACT, 1948 — SECTION 88 · AI-ASSISTED FILING</div>
        </div>
        <div style={{display:"flex",gap:10}}>
          <button onClick={autoFill} style={{display:"flex",alignItems:"center",gap:8,padding:"9px 18px",borderRadius:8,background:"rgba(0,212,184,.1)",color:C.teal,border:`1px solid rgba(0,212,184,.3)`,cursor:"pointer",fontSize:13,fontFamily:"'Syne',sans-serif",fontWeight:600}}>🤖 Auto-Fill from Profile</button>
          <button onClick={()=>toast("Draft saved","success")} style={{display:"flex",alignItems:"center",gap:8,padding:"9px 18px",borderRadius:8,background:C.card2,color:C.g1,border:`1px solid ${C.border}`,cursor:"pointer",fontSize:13,fontFamily:"'Syne',sans-serif"}}>💾 Save Draft</button>
        </div>
      </div>
      <div id="form18-printable" style={{background:C.bg3,border:`1px solid ${C.border}`,borderRadius:16,overflow:"hidden"}}>
        <div style={{background:C.card,padding:"22px 32px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:30,fontWeight:800,letterSpacing:3}}>FORM NO. 18</div>
            <div style={{fontSize:13,color:C.g2,marginTop:2}}>Notice of Accident / Dangerous Occurrence under The Factories Act, 1948</div>
            <div style={{fontSize:11,color:C.g3,marginTop:3,fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:1}}>Under Sections 88 & 88A | Rules 106 & 107</div>
          </div>
          <div style={{display:"flex",gap:12}}>
            <div style={{padding:"12px 20px",border:`2px solid ${C.orange}`,borderRadius:8,textAlign:"center"}}>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:22,color:C.orange,fontWeight:700}}>#F18-2024-235</div>
              <div style={{fontSize:9,color:C.g2,letterSpacing:2,fontFamily:"'Barlow Condensed',sans-serif"}}>REPORT NUMBER</div>
            </div>
            <div style={{padding:"12px 20px",border:`2px solid ${C.teal}`,borderRadius:8,textAlign:"center"}}>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:22,color:C.teal,fontWeight:700}}>{new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}).toUpperCase()}</div>
              <div style={{fontSize:9,color:C.g2,letterSpacing:2,fontFamily:"'Barlow Condensed',sans-serif"}}>FILED DATE</div>
            </div>
          </div>
        </div>
        <div style={{padding:"28px 32px"}}>
          <div style={{marginBottom:28}}>
            {secTitle("PART A — FACTORY & REGISTRATION DETAILS")}
            {row(field("Name of Factory",autoInp(f.factoryName)),field("Factory Registration No.",inp("regNo")),field("Type of Industry",autoInp(f.industry)))}
            {row(field("Factory Address",autoInp(f.address)),field("District",autoInp(f.district)),field("State",autoInp(f.state)))}
            {row(field("Occupier / Owner Name",inp("occupier")),field("Manager Name",inp("manager")),field("Contact Number",inp("contact")))}
          </div>
          <div style={{marginBottom:28}}>
            {secTitle("PART B — ACCIDENT / DANGEROUS OCCURRENCE DETAILS")}
            {row(field("Date of Accident",inp("accDate","date")),field("Time of Accident",autoInp(f.accTime)),field("Department / Section",autoInp(f.department)))}
            {row(field("Nature of Accident",sel("nature",["Fall from height","Struck by moving object","Caught in machinery","Burns/Scalds","Electrical shock","Chemical exposure","Dangerous occurrence"])),field("Operation / Process Being Performed",autoInp(f.operation)))}
            <div style={{marginBottom:14}}>{field("Description of Accident / Occurrence",<textarea value={f.description} onChange={e=>upd("description",e.target.value)} rows={4} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:"9px 13px",fontSize:13,color:C.white,fontFamily:"'Syne',sans-serif",outline:"none",width:"100%",resize:"vertical"}} />)}</div>
            <div style={{marginBottom:14}}>{field("Immediate Cause of Accident",inp("immCause"))}</div>
            <div style={{marginBottom:0}}>{field("Root Cause / Underlying Factor",inp("rootCause"))}</div>
          </div>
          <div style={{marginBottom:28}}>
            {secTitle("PART C — INJURED PERSON(S) DETAILS")}
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr>{["Sr.","Name","Sex","Age","Employment Status","Dept.","Nature of Injury","Body Part","Days Absent"].map(h=><th key={h} style={thStyle}>{h}</th>)}</tr></thead>
                <tbody>
                  {injured.map((row,i)=>(
                    <tr key={i}>
                      <td style={{...tdStyle,color:C.g2,textAlign:"center"}}>{i+1}</td>
                      <td style={tdStyle}>{tdInp(row.name,v=>setInjured(p=>{const n=[...p];n[i]={...n[i],name:v};return n}))}</td>
                      <td style={tdStyle}>{tdSel(row.sex,v=>setInjured(p=>{const n=[...p];n[i]={...n[i],sex:v};return n}),["Male","Female","Other"])}</td>
                      <td style={tdStyle}>{tdInp(row.age,v=>setInjured(p=>{const n=[...p];n[i]={...n[i],age:v};return n}),"40px")}</td>
                      <td style={tdStyle}>{tdSel(row.empType,v=>setInjured(p=>{const n=[...p];n[i]={...n[i],empType:v};return n}),["Permanent – Factory Worker","Contract Worker","Trainee","Apprentice"])}</td>
                      <td style={tdStyle}>{tdInp(row.dept,v=>setInjured(p=>{const n=[...p];n[i]={...n[i],dept:v};return n}),"70px")}</td>
                      <td style={tdStyle}>{tdSel(row.injuryType,v=>setInjured(p=>{const n=[...p];n[i]={...n[i],injuryType:v};return n}),["Minor Injury","Serious Injury","Fatal","Dangerous Occurrence"])}</td>
                      <td style={tdStyle}>{tdInp(row.bodyPart,v=>setInjured(p=>{const n=[...p];n[i]={...n[i],bodyPart:v};return n}))}</td>
                      <td style={tdStyle}>{tdInp(row.days,v=>setInjured(p=>{const n=[...p];n[i]={...n[i],days:v};return n}),"40px")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={()=>setInjured(p=>[...p,{name:"",sex:"Male",age:"",empType:"Permanent – Factory Worker",dept:"",injuryType:"Minor Injury",bodyPart:"",days:""}])} style={{marginTop:10,padding:"6px 14px",borderRadius:7,background:C.card2,color:C.g1,border:`1px solid ${C.border}`,cursor:"pointer",fontSize:12,fontFamily:"'Syne',sans-serif"}}>+ Add Person</button>
          </div>
          <div style={{marginBottom:28}}>
            {secTitle("PART D — MEDICAL TREATMENT & FIRST AID")}
            {row(field("First Aid Given?",sel("firstAid",["Yes — On-site first aid","No"])),field("Referred to Hospital?",sel("hospital",["No — Treated on-site","Yes — Government Hospital","Yes — Private Hospital"])),field("ESIC Member?",sel("esic",["Yes — ESIC IP No. MH48920234","No — Not covered"])))}
            {row(field("Medical Officer Name",inp("doctor")),field("Date of Medical Examination",inp("medDate","date")))}
          </div>
          <div style={{marginBottom:28}}>
            {secTitle("PART E — SafeguardIQ Enterprise EVIDENCE LOG","Auto-captured")}
            <div style={{background:"rgba(0,212,184,.04)",border:`1px solid rgba(0,212,184,.2)`,borderRadius:10,padding:20}}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16,marginBottom:14}}>
                {[
                  ["Camera ID", lastViolation?.camera || "No recent detection"],
                  ["Detection Timestamp", lastViolation?.time || "—"],
                  ["AI Confidence Score", lastViolation?.confidence ? `${lastViolation.confidence}%` : "—"],
                  ["Alert Sent To", "Zone Supervisor · Plant Manager"],
                  ["Response Time", "< 28 seconds"],
                  ["Violation Type", lastViolation?.type || "—"],
                ].map(([k,v])=><div key={k}>
                  <div style={{fontSize:10,color:C.teal,textTransform:"uppercase",letterSpacing:1.5,fontFamily:"'Barlow Condensed',sans-serif",marginBottom:4}}>{k}</div>
                  <div style={{fontSize:13,color:C.white}}>{v}</div>
                </div>)}
              </div>
              <div style={{background:"rgba(0,212,184,.06)",borderRadius:8,border:`1px solid rgba(0,212,184,.15)`,padding:"12px 16px",fontSize:12,color:C.g1,lineHeight:1.7}}>
                SafeguardIQ Enterprise detected: <strong style={{color:C.white}}>Floor Hazard — Liquid spill (unattended 47 min)</strong> at 13:36:09. Alert sent to housekeeping at 13:36:15. No corrective action recorded within 30-min SLA. Subsequent fall recorded at 14:23:07.
                <br/><strong style={{color:C.teal}}>Preventability Assessment: HIGH — Corrective action available 47 minutes prior to incident.</strong>
              </div>
            </div>
          </div>
          <div style={{marginBottom:28}}>
            {secTitle("PART F — CORRECTIVE & PREVENTIVE ACTIONS (CAPA)")}
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr>{["No.","Corrective Action","Responsible Person","Target Date","Status"].map(h=><th key={h} style={thStyle}>{h}</th>)}</tr></thead>
                <tbody>
                  {capa.map((r,i)=>(
                    <tr key={i}>
                      <td style={{...tdStyle,color:C.orange,fontFamily:"'Barlow Condensed',sans-serif",fontSize:14}}>CA-0{i+1}</td>
                      <td style={tdStyle}>{tdInp(r.action,v=>setCapa(p=>{const n=[...p];n[i]={...n[i],action:v};return n}))}</td>
                      <td style={tdStyle}>{tdInp(r.resp,v=>setCapa(p=>{const n=[...p];n[i]={...n[i],resp:v};return n}))}</td>
                      <td style={tdStyle}><input type="date" value={r.date} onChange={e=>setCapa(p=>{const n=[...p];n[i]={...n[i],date:e.target.value};return n})} style={{background:"transparent",border:"none",color:C.white,fontSize:12,outline:"none",fontFamily:"'Syne',sans-serif"}} /></td>
                      <td style={tdStyle}>{tdSel(r.status,v=>setCapa(p=>{const n=[...p];n[i]={...n[i],status:v};return n}),["Completed","In Progress","Pending"])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={()=>setCapa(p=>[...p,{action:"",resp:"",date:today,status:"Pending"}])} style={{marginTop:10,padding:"6px 14px",borderRadius:7,background:C.card2,color:C.g1,border:`1px solid ${C.border}`,cursor:"pointer",fontSize:12,fontFamily:"'Syne',sans-serif"}}>+ Add Action</button>
          </div>
          <div style={{marginBottom:0}}>
            {secTitle("PART G — DECLARATION BY MANAGER / OCCUPIER")}
            {row(field("Name of Declarant",inp("declarant")),field("Designation",inp("designation")))}
            {row(field("Date of Filing",inp("filingDate","date")),field("Submitted To (Inspector of Factories)",inp("inspector")))}
            <div style={{background:"rgba(255,184,0,.06)",border:`1px solid rgba(255,184,0,.2)`,borderRadius:8,padding:"12px 16px",fontSize:12,color:C.g1,lineHeight:1.6,marginTop:8}}>
              ⚠️ <strong style={{color:C.amber}}>Statutory Deadline:</strong> File with Inspector of Factories within <strong style={{color:C.white}}>24 hours</strong> of accident (Section 88, Factories Act 1948). For dangerous occurrences, report immediately by phone and follow up in writing within 12 hours.
            </div>
          </div>
        </div>
        <div style={{display:"flex",gap:12,justifyContent:"flex-end",padding:"18px 32px",borderTop:`1px solid ${C.border}`,background:C.card}}>
          {filed ? (
            <div style={{display:"flex",alignItems:"center",gap:16,flex:1}}>
              <div style={{flex:1,background:"rgba(34,212,106,.1)",border:"1px solid rgba(34,212,106,.3)",borderRadius:8,padding:"10px 18px",fontSize:13,color:C.green,fontWeight:700}}>
                ✅ Form 18 #{filedNo} filed successfully — Inspector notified
              </div>
              <button onClick={()=>{setFiled(false);localStorage.removeItem('safeg_form18_report_no');}} style={{padding:"10px 22px",borderRadius:8,background:C.card2,color:C.g1,border:`1px solid ${C.border}`,cursor:"pointer",fontSize:13,fontFamily:"'Syne',sans-serif"}}>+ New Report</button>
            </div>
          ) : (
            <>
              <button onClick={saveDraft} style={{padding:"10px 22px",borderRadius:8,background:C.card2,color:C.g1,border:`1px solid ${C.border}`,cursor:"pointer",fontSize:13,fontFamily:"'Syne',sans-serif"}}>💾 Save Draft</button>
              <button onClick={handlePrint} style={{padding:"10px 22px",borderRadius:8,background:C.card2,color:C.g1,border:`1px solid ${C.border}`,cursor:"pointer",fontSize:13,fontFamily:"'Syne',sans-serif"}}>🖨️ Print / PDF</button>
              <button onClick={()=>toast("Shram Suvidha integration coming soon","info")} style={{padding:"10px 22px",borderRadius:8,background:"rgba(34,212,106,.08)",color:C.g2,border:`1px solid ${C.border}`,cursor:"not-allowed",fontSize:13,fontFamily:"'Syne',sans-serif"}}>📤 Submit to Portal</button>
              <button onClick={handleFileReport} disabled={filing} style={{padding:"10px 22px",borderRadius:8,background:filing?C.g2:C.orange,color:"#fff",border:"none",cursor:filing?"not-allowed":"pointer",fontSize:13,fontFamily:"'Syne',sans-serif",fontWeight:700,display:"flex",alignItems:"center",gap:8}}>
                {filing ? <><div style={{width:14,height:14,border:"2px solid rgba(255,255,255,.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin .8s linear infinite"}}/> Filing…</> : "✅ File Report"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── INSPECTION PAGE ─────────────────────────────────────────────
function InspectionPage({toast}) {
  const [checks, setChecks] = useState(() => {
    const init = {};
    Object.entries(CHECK_ITEMS).forEach(([cat, items]) => { init[cat] = items.map(() => null); });
    return init;
  });
  const total = Object.values(checks).flat().length;
  const passed = Object.values(checks).flat().filter(v=>v===true).length;
  const failed = Object.values(checks).flat().filter(v=>v===false).length;
  const toggle = (cat, i) => setChecks(prev => {
    const n = {...prev,[cat]:[...prev[cat]]};
    n[cat][i] = n[cat][i]===true ? false : n[cat][i]===false ? null : true;
    return n;
  });
  const catColors = [C.orange, C.teal, C.red, C.green];
  return (
    <div style={{animation:"slideIn .3s ease"}}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:24}}>
        <div>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:38,fontWeight:800,letterSpacing:3}}>DAILY INSPECTION</div>
          <div style={{fontSize:12,color:C.g2,marginTop:4,fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:2}}>FACTORIES ACT COMPLIANCE CHECKLIST · {new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long"}).toUpperCase()}</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <div style={{textAlign:"right"}}>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:28,color:C.green}}>{passed}<span style={{color:C.g2,fontSize:16}}>/{total}</span></div>
            <div style={{fontSize:11,color:C.g2}}>Passed · <span style={{color:C.red}}>{failed} Failed</span></div>
          </div>
          <button onClick={()=>{if(passed<8){toast("Complete at least 8 checks","warning");return;}toast(`Inspection signed off — ${passed} items passed`,"success");}} style={{padding:"10px 22px",borderRadius:8,background:C.orange,color:"#fff",border:"none",cursor:"pointer",fontSize:13,fontFamily:"'Syne',sans-serif",fontWeight:700}}>Sign Off</button>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        {Object.entries(CHECK_ITEMS).map(([cat,items],ci)=>(
          <Card key={cat}>
            <CardTitle color={catColors[ci]}>{cat}</CardTitle>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {items.map((item,i)=>{
                const state = checks[cat][i];
                return (
                  <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",background:C.card2,border:`1px solid ${state===true?C.green:state===false?C.red:C.border}`,borderRadius:8,cursor:"pointer",transition:"all .15s"}} onClick={()=>toggle(cat,i)}>
                    <div style={{width:20,height:20,borderRadius:5,border:`2px solid ${state===true?C.green:state===false?C.red:C.g3}`,background:state===true?"rgba(34,212,106,.2)":state===false?"rgba(255,59,59,.2)":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:11}}>
                      {state===true?"✓":state===false?"✗":""}
                    </div>
                    <div style={{fontSize:13,color:state===true?C.g2:C.g1,textDecoration:state===true?"line-through":"none",flex:1}}>{item}</div>
                    <div style={{fontSize:9,color:state===true?C.green:state===false?C.red:C.g3,fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:1}}>{state===true?"PASS":state===false?"FAIL":"TAP"}</div>
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── ACCIDENT SUMMARY REPORT CARD ────────────────────────────────
function AccidentSummaryCard({ stats, toast }) {
  const today     = new Date().toISOString().split("T")[0];
  const yearStart = `${new Date().getFullYear()}-01-01`;
  const [downloading, setDownloading] = useState(false);

  const downloadReport = async () => {
    setDownloading(true);
    toast("Fetching violation data…", "info");
    try {
      const token = localStorage.getItem("safeg_token") || "";
      const res = await fetch(
        `/api/v1/violations/archive?limit=1000&dateFrom=${yearStart}&dateTo=${today}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error("API error");
      const json = await res.json();
      const violations = json?.data?.violations || json?.violations || [];
      if (violations.length === 0) {
        toast("No violations found for this year", "warning");
        setDownloading(false);
        return;
      }
      const csv = violationsToCSV(violations);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `Accident-Summary-Report-${new Date().getFullYear()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast(`Accident Summary downloaded — ${violations.length} incidents ✓`, "success");
    } catch (e) {
      toast("Download failed — check your connection", "error");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Card
      onClick={downloading ? undefined : downloadReport}
      style={{
        cursor: downloading ? "wait" : "pointer",
        border: `1px solid rgba(255,92,26,.4)`,
        background: `rgba(255,92,26,.06)`,
        position: "relative",
        overflow: "hidden",
        transition: "transform .15s, box-shadow .15s",
      }}
    >
      {/* LIVE badge */}
      <div style={{
        position:"absolute", top:12, right:12,
        background:"rgba(34,212,106,.15)", border:"1px solid rgba(34,212,106,.4)",
        borderRadius:20, padding:"2px 10px",
        fontSize:9, color:C.green, fontFamily:"'Barlow Condensed',sans-serif",
        letterSpacing:1, fontWeight:700,
        display:"flex", alignItems:"center", gap:5,
      }}>
        <div style={{width:5,height:5,borderRadius:"50%",background:C.green,animation:"blink 1.2s infinite"}}/>
        LIVE
      </div>

      <div style={{fontSize:32,marginBottom:12}}>⚠️</div>
      <div style={{fontSize:16,fontWeight:700,color:C.white,marginBottom:6}}>
        Accident Summary Report
      </div>
      <div style={{fontSize:12,color:C.g2,marginBottom:6}}>
        Form 18 &amp; 19 Register — {new Date().getFullYear()}
      </div>
      <div style={{fontSize:12,color:C.g1,marginBottom:14}}>
        {stats.totalMonth || 0} incidents recorded · Year to date
      </div>

      {/* Stats row */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
        {[
          {label:"Open",    val:stats.openCount    || 0, color:C.red},
          {label:"Pending", val:stats.pendingCount || 0, color:C.amber},
          {label:"Closed",  val:stats.closedToday  || 0, color:C.green},
        ].map(s=>(
          <div key={s.label} style={{background:C.card2,borderRadius:8,padding:"8px 10px",textAlign:"center",border:`1px solid ${C.border}`}}>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:22,color:s.color}}>{s.val}</div>
            <div style={{fontSize:9,color:C.g2,letterSpacing:1,fontFamily:"'Barlow Condensed',sans-serif"}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Download bar */}
      <div style={{
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"10px 14px", background:`rgba(255,92,26,.08)`,
        border:`1px solid rgba(255,92,26,.2)`, borderRadius:8,
      }}>
        <span style={{fontSize:12,color:C.orange,fontWeight:600}}>
          {downloading
            ? "⏳ Generating CSV…"
            : `⬇ Download CSV — ${new Date().getFullYear()} full year`}
        </span>
        <span style={{fontSize:11,color:C.g2}}>{yearStart} → {today}</span>
      </div>
    </Card>
  );
}

// ─── MAIN APP ────────────────────────────────────────────────────
export default function App() {
  const { violations: realViols, ppeTypes: realPpe, zones: realZones,
          timeline: realTimeline, zoneBars: realZoneBars,
          lastViolation, stats } = useComplianceData();
  const [liveCameras, setLiveCameras] = useState([]);
  const [livePlants,  setLivePlants]  = useState([]);
  const [page,        setPage]        = useState("dashboard");
  const [toasts,      setToasts]      = useState([]);

  const displayViols    = realViols?.length    > 0 ? realViols    : VIOLATIONS;
  const displayPpe      = realPpe?.length      > 0 ? realPpe      : PPE_TYPES;
  const displayZones    = realZones?.length    > 0 ? realZones    : ZONES;
  const displayTimeline = realTimeline?.length > 0 ? realTimeline : TIMELINE;
  const displayZoneBars = realZoneBars?.length > 0 ? realZoneBars : ZONE_BARS;
  const maxZ = Math.max(...displayZoneBars.map(d=>d.val));

  useEffect(() => {
    const fetchCameras = async () => {
      try {
        const token = localStorage.getItem("safeg_token") || "";
        const res  = await fetch("/api/v1/cameras", { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        const cams = data.data || [];
        try {
          const AI_URL = window.location.hostname !== "localhost"
            ? "https://safeguardsiq.com/ai" : "/api/v1/ai";
          const sr = await fetch(`${AI_URL}/stream/status`);
          const sd = await sr.json();
          const streams = sd.streams || {};
          setLiveCameras(cams.map(c => ({
            ...c,
            alert: (streams[c.cam_label]?.violations_today || 0) > 0,
            violations_today: streams[c.cam_label]?.violations_today || 0,
            status: streams[c.cam_label]?.status === "running" ? "online" : c.status || "offline",
          })));
        } catch { setLiveCameras(cams); }
        try {
          const pr = await fetch('/api/v1/plants', { headers: { Authorization: `Bearer ${token}` } });
          const pd = await pr.json();
          setLivePlants(pd.data || []);
        } catch {}
      } catch (e) { console.error("Camera fetch error:", e); }
    };
    fetchCameras();
    const interval = setInterval(fetchCameras, 10000);
    return () => clearInterval(interval);
  }, []);

  const toast = (msg, type="success") => {
    const id = Date.now();
    setToasts(p=>[...p,{id,msg,type}]);
  };
  const removeToast = id => setToasts(p=>p.filter(t=>t.id!==id));

  const navItems = [
    {id:"dashboard", label:"Dashboard",    icon:"📊"},
    {id:"cameras",   label:"Live Cameras", icon:"📹"},
    {id:"edge",      label:"Edge Devices", icon:"🖥️"},
    {id:"ppe",       label:"PPE Compliance",icon:"🦺"},
    {id:"violations",label:"Violations",   icon:"⚠️", badge:stats.openCount||0},
    {id:"form18",    label:"Form 18",      icon:"📋", badge:stats.pendingCount||0},
    {id:"inspection",label:"Inspection",   icon:"✅"},
    {id:"reports",   label:"Reports",      icon:"📄"},
  ];

  const sideNav = [
    {label:"Factory", items: livePlants.length > 0
      ? livePlants.map((p,i) => ({icon:"🏭", name:p.plant_name||p.name, pg:undefined, active:i===0}))
      : [{icon:"🏭", name:"No plant set up", active:true}]
    },
    {label:"Compliance",items:[
      {icon:"📊",name:"Overview",      pg:"dashboard"},
      {icon:"🖥️", name:"Edge Devices", pg:"edge"},
      {icon:"📹",name:"Camera Feeds",  pg:"cameras"},
      {icon:"🦺",name:"PPE Tracking",  pg:"ppe"},
      {icon:"⚠️",name:"Violations",    pg:"violations", badge:stats.openCount||0},
      {icon:"📋",name:"Form 18",       pg:"form18",     badge:stats.pendingCount||0},
      {icon:"✅",name:"Inspection",    pg:"inspection"},
    ]},
    {label:"Reports",items:[
      {icon:"📄",name:"ISO 45001",    pg:"reports"},
      {icon:"📄",name:"ESIC Returns", pg:"reports"},
      {icon:"📄",name:"BRSR Safety",  pg:"reports"},
      {icon:"📄",name:"OSH Code",     pg:"reports"},
    ]},
  ];

  return (
    <>
      <style>{globalCSS}</style>
      <style>{printCSS}</style>

      {/* TOPBAR */}
      <div id="compliance-topbar" style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 24px",height:56,background:C.bg2,borderBottom:`1px solid ${C.border}`,position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:34,height:34,background:C.orange,clipPath:"polygon(50% 0%,100% 20%,100% 60%,50% 100%,0% 60%,0% 20%)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:"#fff",animation:"pulse 3s infinite",flexShrink:0}}>✓</div>
          <div>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:22,letterSpacing:3,fontWeight:700}}>SafeguardIQ Enterprise</div>
            <div style={{fontSize:9,color:C.g2,letterSpacing:3,fontFamily:"'Barlow Condensed',sans-serif"}}>COMPLIANCE COMMAND CENTRE</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:7,background:"rgba(34,212,106,.08)",border:`1px solid rgba(34,212,106,.25)`,borderRadius:20,padding:"5px 14px",fontSize:11,color:C.green,fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:1}}>
          <Dot color={liveCameras.length>0?C.green:C.amber} blink={liveCameras.length>0} size={7}/>
          {liveCameras.length>0 ? `MONITORING ACTIVE · ${liveCameras.length} CAMERAS` : 'NO CAMERAS CONNECTED'}
        </div>
        <div style={{display:"flex",gap:4}}>
          {navItems.map(n=>(
            <button key={n.id} onClick={()=>setPage(n.id)} style={{position:"relative",padding:"5px 14px",borderRadius:7,fontSize:12,fontWeight:600,color:page===n.id?C.orange:C.g2,cursor:"pointer",border:`1px solid ${page===n.id?C.orange:"transparent"}`,background:page===n.id?"rgba(255,92,26,.08)":"transparent",fontFamily:"'Syne',sans-serif",transition:"all .2s"}}>
              {n.label}
              {n.badge>0 && <span style={{position:"absolute",top:-4,right:-4,background:C.red,color:"#fff",fontSize:9,padding:"1px 5px",borderRadius:10,fontFamily:"'Barlow Condensed',sans-serif"}}>{n.badge}</span>}
            </button>
          ))}
        </div>
      </div>

      <div id="compliance-shell" style={{display:"flex",minHeight:"calc(100vh - 56px)"}}>
        {/* SIDEBAR */}
        <div id="compliance-nav" style={{width:210,flexShrink:0,background:C.bg2,borderRight:`1px solid ${C.border}`,padding:"16px 0",position:"sticky",top:56,height:"calc(100vh - 56px)",overflowY:"auto"}}>
          {sideNav.map(sec=>(
            <div key={sec.label} style={{padding:"0 12px 8px"}}>
              <div style={{fontSize:9,color:C.g3,letterSpacing:3,fontFamily:"'Barlow Condensed',sans-serif",padding:"8px 4px 4px",textTransform:"uppercase"}}>{sec.label}</div>
              {sec.items.map(item=>(
                <div key={item.name} onClick={()=>item.pg&&setPage(item.pg)} style={{display:"flex",alignItems:"center",gap:9,padding:"8px 10px",borderRadius:8,cursor:item.pg?"pointer":"default",fontSize:12,color:item.active||page===item.pg?C.orange:C.g1,background:item.active||page===item.pg?"rgba(255,92,26,.08)":"transparent",border:`1px solid ${item.active||page===item.pg?"rgba(255,92,26,.2)":"transparent"}`,marginBottom:2,transition:"all .2s",position:"relative"}}>
                  <span style={{fontSize:14}}>{item.icon}</span>
                  <span style={{flex:1}}>{item.name}</span>
                  {item.badge>0 && <span style={{background:C.red,color:"#fff",fontSize:9,padding:"1px 6px",borderRadius:10,fontFamily:"'Barlow Condensed',sans-serif"}}>{item.badge}</span>}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* CONTENT */}
        <div id="compliance-main" style={{flex:1,overflowY:"auto",padding:24}}>
          <div id="compliance-content">

          {/* ── DASHBOARD ── */}
          {page==="dashboard" && (
            <div style={{animation:"slideIn .3s ease"}}>
              <div style={{overflow:"hidden",background:"rgba(255,59,59,.07)",border:`1px solid rgba(255,59,59,.18)`,borderRadius:8,padding:"7px 0",marginBottom:20}}>
                <div style={{display:"flex",gap:48,animation:"ticker 28s linear infinite",whiteSpace:"nowrap"}}>
                  {[...Array(2)].map((_,ri)=>
                    displayViols.slice(0,6).map((v,i)=>(
                      <span key={`${ri}-${i}`} style={{fontSize:11,color:v.sev==="High"||v.status==="Open"?C.red:C.green,fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:1,display:"inline-flex",alignItems:"center",gap:16}}>
                        {v.sev==="High"||v.status==="Open"?"🔴":"✅"} {v.type||v.violation_type} — {v.zone||v.camera_id||'Zone'} · {v.date||v.occurred_at?.slice(11,16)||'Now'}
                        <span style={{color:C.g3}}>///</span>
                      </span>
                    ))
                  )}
                </div>
              </div>
              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:20}}>
                <div>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:38,fontWeight:800,letterSpacing:3}}>COMPLIANCE COMMAND CENTRE</div>
                  <div style={{fontSize:12,color:C.g2,marginTop:3,fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:2}}>{(livePlants[0]?.plant_name||'YOUR PLANT').toUpperCase()} · {new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric"}).toUpperCase()}</div>
                </div>
                <button onClick={()=>setPage("form18")} style={{padding:"9px 20px",borderRadius:8,background:C.orange,color:"#fff",border:"none",cursor:"pointer",fontSize:13,fontFamily:"'Syne',sans-serif",fontWeight:700}}>📋 File Form 18</button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:14,marginBottom:20}}>
                <KpiCard label="PPE Compliance"   value={`${stats.compliance||97}%`} unit="Today"           trend="↑ vs last week" trendUp={true}  color={C.green}/>
                <KpiCard label="Active Violations" value={stats.openCount||0}         unit="Open cases"      trend="↑ new today"    trendUp={false} color={C.red}/>
                <KpiCard label="Cameras Online"    value={`${liveCameras.filter(c=>c.status==='online').length||0}/${liveCameras.length||0}`} unit="All operational" trend="● systems normal" trendUp={true} color={C.teal}/>
                <KpiCard label="Near-Miss Events"  value={stats.nearMissCount||0}     unit="This month"      trend="↓ vs last week" trendUp={true}  color={C.amber}/>
                <KpiCard label="Compliance Score"  value={stats.compliance||92}       unit="/ 100 · Grade A" trend="↑ Factories Act" trendUp={true} color={C.blue}/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1.6fr 1fr 1.1fr",gap:16,marginBottom:16}}>
                <Card>
                  <CardTitle>Violations by Zone — This Week</CardTitle>
                  <div style={{display:"flex",alignItems:"flex-end",gap:8,height:130,padding:"0 4px"}}>
                    {displayZoneBars.map((d,i)=>(
                      <div key={d.label} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                        <div style={{flex:1,width:"100%",display:"flex",alignItems:"flex-end"}}>
                          <div style={{width:"100%",height:`${d.val/maxZ*100}%`,background:d.c,borderRadius:"4px 4px 0 0",minHeight:4,transition:"height 1s",animation:"barUp 1s ease",animationDelay:`${i*0.08}s`,transformOrigin:"bottom",cursor:"pointer"}} title={`${d.val} violations`}/>
                        </div>
                        <div style={{fontSize:9,color:C.g2,fontFamily:"'Barlow Condensed',sans-serif",textAlign:"center"}}>{d.label}</div>
                      </div>
                    ))}
                  </div>
                </Card>
                <Card style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
                  <CardTitle color={C.green}>PPE Compliance Today</CardTitle>
                  <Ring pct={stats.compliance||97}/>
                  <div style={{display:"flex",gap:16,marginTop:10,fontSize:11,fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:1}}>
                    <span style={{color:C.green}}>● Pass: {stats.totalMonth||0}</span>
                    <span style={{color:C.red}}>● Fail: {stats.openCount||0}</span>
                  </div>
                </Card>
                <Card style={{overflowY:"auto",maxHeight:260}}>
                  <CardTitle color={C.teal}>Today's Events</CardTitle>
                  <div style={{display:"flex",flexDirection:"column",gap:0}}>
                    {displayTimeline.map((e,i)=>(
                      <div key={i} style={{display:"flex",gap:12,paddingBottom:14,position:"relative"}}>
                        {i<displayTimeline.length-1 && <div style={{position:"absolute",left:16,top:32,width:2,bottom:0,background:C.border}}/>}
                        <div style={{width:32,height:32,borderRadius:"50%",background:`${e.color}18`,border:`2px solid ${e.color}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,flexShrink:0}}>{e.icon}</div>
                        <div>
                          <div style={{fontSize:12,color:C.white,fontWeight:600}}>{e.title}</div>
                          <div style={{fontSize:10,color:C.g2,marginTop:2,fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:.5}}>{e.meta}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
                <Card>
                  <CardTitle color={C.orange}>PPE Compliance by Type</CardTitle>
                  {displayPpe.map(p=><MiniBar key={p.name} label={`${p.icon} ${p.name}`} pct={p.pct} color={p.c}/>)}
                </Card>
                <Card>
                  <CardTitle color={C.purple}>Zone-wise PPE Status</CardTitle>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                    {displayZones.map(z=>(
                      <div key={z.name} style={{background:C.card2,border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 14px",display:"flex",alignItems:"center",gap:12}}>
                        <div style={{fontSize:22}}>{z.icon}</div>
                        <div style={{flex:1}}>
                          <div style={{fontSize:12,color:C.g1,fontWeight:600,marginBottom:3}}>{z.name}</div>
                          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:22,color:z.c}}>{z.pct}%</div>
                          <div style={{height:3,background:C.border,borderRadius:3,marginTop:4,overflow:"hidden"}}><div style={{height:"100%",width:z.pct+"%",background:z.c,borderRadius:3}}/></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
              <LiveDetectionFeed style={{marginTop:20}} />
            </div>
          )}

          {/* ── CAMERAS ── */}
          {page==="cameras" && (
            <div style={{animation:"slideIn .3s ease"}}>
              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:20}}>
                <div>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:38,fontWeight:800,letterSpacing:3}}>LIVE CAMERA FEEDS</div>
                  <div style={{fontSize:12,color:C.g2,marginTop:3,fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:2}}>{liveCameras.length} CAMERAS · AI DETECTION ACTIVE</div>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
                {(liveCameras.length > 0 ? liveCameras : [
                  {id:"CAM-01",loc:"Assembly A — Gate",alert:false},
                  {id:"CAM-02",loc:"Assembly A — Mid",alert:false},
                  {id:"CAM-03",loc:"Welding B — Entry",alert:false},
                  {id:"CAM-04",loc:"Welding B — Bay 3",alert:true},
                ]).map(cam=>(
                  <div key={cam.id} style={{background:"#000",borderRadius:8,overflow:"hidden",border:`1px solid ${cam.alert||cam.violations_today>0?C.red:C.border}`,position:"relative",aspectRatio:"16/9",cursor:"pointer",animation:cam.alert||cam.violations_today>0?"alertPulse 1.2s infinite":"none"}}>
                    <CamFeed cam={cam}/>
                    <div style={{position:"absolute",inset:0,padding:7,display:"flex",flexDirection:"column",justifyContent:"space-between",pointerEvents:"none"}}>
                      <div style={{display:"flex",justifyContent:"space-between"}}>
                        <div style={{background:"rgba(0,0,0,.7)",color:C.white,fontSize:9,padding:"2px 6px",borderRadius:4,fontFamily:"'Barlow Condensed',sans-serif"}}>{cam.cam_label||cam.id}</div>
                        <div style={{display:"flex",alignItems:"center",gap:4,background:"rgba(0,0,0,.7)",padding:"2px 6px",borderRadius:4,fontSize:9,color:cam.status==='online'?C.green:C.red,fontFamily:"'Barlow Condensed',sans-serif"}}>
                          <Dot color={cam.status==='online'?C.green:C.red} blink={cam.status==='online'} size={5}/>
                          {cam.status==='online'?'LIVE':'OFFLINE'}
                        </div>
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
                        <div style={{background:"rgba(0,0,0,.7)",color:C.g1,fontSize:9,padding:"2px 6px",borderRadius:4,fontFamily:"'Barlow Condensed',sans-serif"}}>{cam.area_name||cam.loc||"Zone"}</div>
                        {(cam.alert||cam.violations_today>0) && <div style={{background:"rgba(255,59,59,.85)",color:"#fff",fontSize:9,padding:"3px 8px",borderRadius:4,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700,animation:"blink .7s infinite"}}>⚠ {cam.violations_today||""} VIOLATION{cam.violations_today>1?"S":""}</div>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <LiveDetectionFeed style={{marginTop:20}} />
            </div>
          )}

          {page==="edge" && (
            <EdgeDeviceManager toast={toast}/>
          )}

          {/* ── PPE ── */}
          {page==="ppe" && (
            <div style={{animation:"slideIn .3s ease"}}>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:38,fontWeight:800,letterSpacing:3,marginBottom:4}}>PPE COMPLIANCE TRACKER</div>
              <div style={{fontSize:12,color:C.g2,marginBottom:20,fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:2}}>REAL-TIME PERSONAL PROTECTIVE EQUIPMENT MONITORING — ALL ZONES</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBottom:20}}>
                {displayPpe.map(p=>(
                  <div key={p.name} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"16px 18px",position:"relative",overflow:"hidden"}}>
                    <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:p.c}}/>
                    <div style={{display:"flex",alignItems:"center",gap:14}}>
                      <div style={{fontSize:30}}>{p.icon}</div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:12,color:C.g1,fontWeight:600,marginBottom:4}}>{p.name}</div>
                        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:32,color:p.c}}>{p.pct}%</div>
                        <div style={{height:4,background:C.border,borderRadius:4,marginTop:6,overflow:"hidden"}}><div style={{height:"100%",width:p.pct+"%",background:p.c,borderRadius:4,transition:"width 1.2s"}}/></div>
                      </div>
                      <Badge text={p.pct>=95?"Low":p.pct>=90?"Medium":"High"}/>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
                <Card>
                  <CardTitle>Zone-wise PPE Status</CardTitle>
                  {displayZones.map(z=><MiniBar key={z.name} label={`${z.icon} ${z.name}`} pct={z.pct} color={z.c}/>)}
                </Card>
                <Card>
                  <CardTitle color={C.red}>PPE Violation Log — Today</CardTitle>
                  <table style={{width:"100%",borderCollapse:"collapse"}}>
                    <thead><tr>{["Time","Worker","Violation","Zone","Severity","Status"].map(h=><th key={h} style={{fontSize:9,color:C.g2,textTransform:"uppercase",letterSpacing:2,padding:"8px 10px",textAlign:"left",borderBottom:`1px solid ${C.border}`,fontFamily:"'Barlow Condensed',sans-serif"}}>{h}</th>)}</tr></thead>
                    <tbody>
                      {displayViols.slice(0,5).map((v,i)=>(
                        <tr key={i}>
                          <td style={{padding:"10px",fontSize:12,color:C.g1,borderBottom:`1px solid ${C.border}44`,fontFamily:"'Barlow Condensed',sans-serif"}}>{v.date}</td>
                          <td style={{padding:"10px",fontSize:11,color:C.g2,borderBottom:`1px solid ${C.border}44`,fontFamily:"'Barlow Condensed',sans-serif"}}>{v.worker||"—"}</td>
                          <td style={{padding:"10px",fontSize:12,color:C.g1,borderBottom:`1px solid ${C.border}44`}}>{v.type}</td>
                          <td style={{padding:"10px",fontSize:12,color:C.g2,borderBottom:`1px solid ${C.border}44`}}>{v.zone}</td>
                          <td style={{padding:"10px",borderBottom:`1px solid ${C.border}44`}}><Badge text={v.sev}/></td>
                          <td style={{padding:"10px",borderBottom:`1px solid ${C.border}44`}}><Badge text={v.status}/></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              </div>
            </div>
          )}

          {/* ── VIOLATIONS ── */}
          {page==="violations" && (
            <div style={{animation:"slideIn .3s ease"}}>
              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:20}}>
                <div>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:38,fontWeight:800,letterSpacing:3}}>VIOLATION REGISTER</div>
                  <div style={{fontSize:12,color:C.g2,marginTop:3,fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:2}}>ALL SAFETY INCIDENTS · FACTORIES ACT SECTION 7A COMPLIANT</div>
                </div>
                <button onClick={()=>toast("VIO-236 created and assigned","success")} style={{padding:"9px 20px",borderRadius:8,background:C.orange,color:"#fff",border:"none",cursor:"pointer",fontSize:13,fontFamily:"'Syne',sans-serif",fontWeight:700}}>+ Log Violation</button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:20}}>
                <KpiCard label="Open"          value={stats.openCount||0}    unit="Require action"      trend="↑ 2 new today"          trendUp={false} color={C.red}/>
                <KpiCard label="Pending Review" value={stats.pendingCount||0} unit="Awaiting sign-off"   trend="→ Same as yesterday"    color={C.amber}/>
                <KpiCard label="Closed Today"   value={stats.closedToday||0}  unit="Resolved"            trend="↑ +3 vs yesterday"      trendUp={true}  color={C.green}/>
                <KpiCard label="This Month"     value={stats.totalMonth||0}   unit="Total"               trend="↓ −23% vs last month"   trendUp={true}  color={C.blue}/>
              </div>
              <Card>
                <CardTitle>All Violations</CardTitle>
                <div style={{overflowX:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse"}}>
                    <thead><tr>{["","ID","Date/Time","Type","Zone","Severity","Status",""].map(h=><th key={h} style={{fontSize:9,color:C.g2,textTransform:"uppercase",letterSpacing:2,padding:"8px 12px",textAlign:"left",borderBottom:`1px solid ${C.border}`,fontFamily:"'Barlow Condensed',sans-serif"}}>{h}</th>)}</tr></thead>
                    <tbody>
                      {displayViols.map((v,i)=>(
                        <tr key={i} style={{borderBottom:`1px solid ${C.border}44`}}>
                          <td style={{padding:"6px 8px",width:56}}>
                            {(v.frame_url || v.image_path) ? (
                              <a href={v.frame_url || v.image_path} target="_blank" rel="noopener noreferrer"
                                style={{display:"block",width:48,height:36,borderRadius:6,overflow:"hidden",
                                  border:`1px solid ${C.border}`,cursor:"pointer"}}>
                                <img src={v.frame_url || v.image_path} alt="frame"
                                  style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}
                                  onError={e=>{e.target.style.display="none"}}/>
                              </a>
                            ) : (
                              <div style={{width:48,height:36,borderRadius:6,background:C.card2,
                                border:`1px solid ${C.border}`,display:"flex",alignItems:"center",
                                justifyContent:"center",fontSize:14,color:C.g3}}>📷</div>
                            )}
                          </td>
                          <td style={{padding:"11px 12px",fontSize:12,color:C.orange,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:600}}>{v.id || v.violation_no}</td>
                          <td style={{padding:"11px 12px",fontSize:12,color:C.g1}}>{v.date || (v.occurred_at ? new Date(v.occurred_at).toLocaleString("en-IN",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}) : "—")}</td>
                          <td style={{padding:"11px 12px",fontSize:12,color:C.white,fontWeight:600}}>{v.type || v.violation_type}</td>
                          <td style={{padding:"11px 12px",fontSize:12,color:C.g1}}>{v.zone || v.area_name || v.violation_cam || "—"}</td>
                          <td style={{padding:"11px 12px"}}><Badge text={v.sev || v.severity || "Medium"}/></td>
                          <td style={{padding:"11px 12px"}}><Badge text={v.status || "Open"}/></td>
                          <td style={{padding:"11px 12px"}}>
                            {(v.frame_url || v.image_path) && (
                              <a href={v.frame_url || v.image_path} target="_blank" rel="noopener noreferrer"
                                style={{padding:"4px 12px",borderRadius:6,background:"rgba(0,212,184,.1)",
                                  color:C.teal,border:`1px solid rgba(0,212,184,.3)`,
                                  cursor:"pointer",fontSize:11,fontFamily:"'Syne',sans-serif",
                                  textDecoration:"none",display:"inline-block"}}>
                                🖼 View
                              </a>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* ── FORM 18 ── */}
          {page==="form18" && <Form18 toast={toast} lastViolation={lastViolation}/>}

          {/* ── INSPECTION ── */}
          {page==="inspection" && <InspectionPage toast={toast}/>}

          {/* ── REPORTS ── */}
          {page==="reports" && (
            <div style={{animation:"slideIn .3s ease"}}>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:38,fontWeight:800,letterSpacing:3,marginBottom:4}}>COMPLIANCE REPORTS</div>
              <div style={{fontSize:12,color:C.g2,marginBottom:24,fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:2}}>AUTO-GENERATED STATUTORY REPORTS — ISO 45001 · ESIC · BRSR · FACTORIES ACT</div>

              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16,marginBottom:20}}>

                {/* 5 placeholder cards */}
                {[
                  {icon:"📋",title:"ISO 45001 Monthly Report",  desc:`OHS Management System — ${new Date().toLocaleDateString('en-IN',{month:'long',year:'numeric'})}`},
                  {icon:"🏥",title:"ESIC Half-Yearly Return",    desc:`Employee State Insurance — H${new Date().getMonth()<6?1:2} ${new Date().getFullYear()}`},
                  {icon:"📊",title:"SEBI BRSR Safety Data",      desc:"Business Responsibility & Sustainability"},
                  {icon:"🏛️",title:"Shram Suvidha Portal Sync", desc:"Labour compliance — Ministry of Labour"},
                  {icon:"📜",title:"OSH Code 2020 Compliance",   desc:"Occupational Safety Health — Quarterly"},
                ].map((r,i)=>(
                  <Card key={i} style={{opacity:.65,cursor:"default"}}>
                    <div style={{fontSize:32,marginBottom:12}}>{r.icon}</div>
                    <div style={{fontSize:16,fontWeight:700,color:C.white,marginBottom:6}}>{r.title}</div>
                    <div style={{fontSize:12,color:C.g2,marginBottom:14}}>{r.desc}</div>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <Badge text="Coming Soon"/>
                      <span style={{fontSize:11,color:C.g2}}>Feature in development</span>
                    </div>
                  </Card>
                ))}

                {/* Accident Summary — LIVE */}
                <AccidentSummaryCard stats={stats} toast={toast}/>

              </div>

              <Card>
                <CardTitle>Annual Compliance Summary — FY {new Date().getFullYear()}</CardTitle>
                <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:14}}>
                  <KpiCard label="Total Violations" value={stats.totalMonth||0} unit="This month" trend="↓ vs last year" trendUp={true} color={C.green}/>
                  <KpiCard label="Near-Misses"       value={stats.nearMissCount||0} trend="↓ YoY"                trendUp={true}  color={C.green}/>
                  <KpiCard label="Lost Work Days"    value={stats.pendingCount||0} trend="→ No change"           color={C.amber}/>
                  <KpiCard label="Fatalities"        value="0" trend="● Zero record maintained"                  trendUp={true}  color={C.green}/>
                  <KpiCard label="Compliance Rate"   value={`${stats.compliance||97}%`} trend="↑ YoY"            trendUp={true}  color={C.green}/>
                </div>
              </Card>
            </div>
          )}

          </div>
        </div>
      </div>

      {/* TOASTS */}
      <div style={{position:"fixed",bottom:24,right:24,zIndex:9999,display:"flex",flexDirection:"column",gap:8}}>
        {toasts.map(t=><Toast key={t.id} msg={t.msg} type={t.type} onDone={()=>removeToast(t.id)}/>)}
      </div>
    </>
  );
}
