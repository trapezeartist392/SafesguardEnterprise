import { useState, useEffect, useRef } from "react";

/* ─────────────────────────────────────────────
   DESIGN: Industrial precision meets digital
   warmth. Dark slate base, ember-orange primary,
   crisp teal for AI/tech moments. Bebas Neue for
   headers — industrial, bold. DM Mono for IDs/
   codes. Nunito for body — approachable.
───────────────────────────────────────────── */

const G = `

*{margin:0;padding:0;box-sizing:border-box}
body{background:#080C14;color:#EDF2FF;font-family:'Nunito',sans-serif;min-height:100vh}
::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:#0D1220}::-webkit-scrollbar-thumb{background:#1E2A42;border-radius:4px}
input,select,textarea{font-family:'Nunito',sans-serif}
input[type=date]::-webkit-calendar-picker-indicator{filter:invert(.35) sepia(1) saturate(2) hue-rotate(175deg)}
@keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
@keyframes popIn{from{opacity:0;transform:scale(.92)}to{opacity:1;transform:scale(1)}}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.2}}
@keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}
@keyframes slideRight{from{transform:translateX(-12px);opacity:0}to{transform:translateX(0);opacity:1}}
@keyframes checkPop{0%{transform:scale(0) rotate(-20deg)}70%{transform:scale(1.2) rotate(5deg)}100%{transform:scale(1) rotate(0)}}
@keyframes progressFill{from{width:0}to{width:var(--w)}}
@keyframes ping{0%{transform:scale(1);opacity:.8}100%{transform:scale(2.2);opacity:0}}
@keyframes toastIn{from{transform:translateX(110%);opacity:0}to{transform:translateX(0);opacity:1}}
@keyframes toastOut{from{opacity:1}to{opacity:0;transform:translateX(110%)}}
`;

// ── colour tokens
const T = {
  bg:     "#080C14",
  bg2:    "#0D1220",
  bg3:    "#111828",
  card:   "#141D2E",
  card2:  "#192236",
  border: "#1E2A42",
  orange: "#FF5B18",
  orng2:  "#FF8C52",
  teal:   "#00D4B4",
  green:  "#22D468",
  red:    "#FF3D3D",
  amber:  "#FFB400",
  blue:   "#3D8AFF",
  purple: "#9F5FFF",
  white:  "#EDF2FF",
  g1:     "#B8C8EC",
  g2:     "#5A6E96",
  g3:     "#1A2540",
};

// ── shared atoms ────────────────────────────────────────
const Lbl = ({children, req}) => (
  <div style={{fontSize:11,fontWeight:700,color:T.g2,textTransform:"uppercase",letterSpacing:1.8,marginBottom:6,fontFamily:"'DM Mono',monospace",display:"flex",gap:4}}>
    {children}{req&&<span style={{color:T.orange}}>*</span>}
  </div>
);

const Field = ({label, req, children, hint}) => (
  <div>
    <Lbl req={req}>{label}</Lbl>
    {children}
    {hint && <div style={{fontSize:11,color:T.g2,marginTop:4}}>{hint}</div>}
  </div>
);

const inp = (val, set, props={}) => (
  <input value={val} onChange={e=>set(e.target.value)} {...props}
    style={{width:"100%",background:T.card2,border:`1.5px solid ${T.border}`,borderRadius:10,padding:"11px 14px",
    fontSize:14,color:T.white,outline:"none",transition:"border-color .2s",fontFamily:"'Nunito',sans-serif",...props.style}}
    onFocus={e=>e.target.style.borderColor=T.orange}
    onBlur={e=>e.target.style.borderColor=T.border}
  />
);

const sel = (val, set, opts, placeholder) => (
  <select value={val} onChange={e=>set(e.target.value)}
    style={{width:"100%",background:T.card2,border:`1.5px solid ${T.border}`,borderRadius:10,padding:"11px 14px",
    fontSize:14,color:val?T.white:T.g2,outline:"none",cursor:"pointer",fontFamily:"'Nunito',sans-serif"}}>
    {placeholder && <option value="">{placeholder}</option>}
    {opts.map(o=><option key={o.v||o} value={o.v||o}>{o.l||o}</option>)}
  </select>
);

const Btn = ({children, onClick, variant="primary", disabled, style={}}) => {
  const styles = {
    primary:{background:T.orange,color:"#fff",border:"none"},
    secondary:{background:T.card2,color:T.g1,border:`1.5px solid ${T.border}`},
    ghost:{background:"transparent",color:T.g2,border:`1.5px solid ${T.border}`},
    teal:{background:"rgba(0,212,180,.12)",color:T.teal,border:`1.5px solid rgba(0,212,180,.3)`},
    danger:{background:"rgba(255,61,61,.12)",color:T.red,border:`1.5px solid rgba(255,61,61,.3)`},
  };
  return (
    <button onClick={onClick} disabled={disabled}
      style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:"11px 22px",borderRadius:10,
      fontSize:14,fontWeight:700,cursor:disabled?"not-allowed":"pointer",fontFamily:"'Nunito',sans-serif",
      opacity:disabled?.5:1,transition:"all .2s",...styles[variant],...style}}>
      {children}
    </button>
  );
};

const Card = ({children, style={}, accent}) => (
  <div style={{background:T.card,border:`1.5px solid ${accent||T.border}`,borderRadius:14,padding:22,
  position:"relative",overflow:"hidden",...style}}>
    {accent && <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:accent}}/>}
    {children}
  </div>
);

// ── stepper ──────────────────────────────────────────────
const STEPS = [
  {id:"customer", icon:"🏢", label:"Customer", sub:"Company & contact"},
  {id:"plant",    icon:"🏭", label:"Plant",    sub:"Factory details"},
  {id:"area",     icon:"📍", label:"Area",     sub:"Zones & departments"},
  {id:"camera",   icon:"📹", label:"Camera",   sub:"Device setup"},
  {id:"review",   icon:"✅", label:"Review",   sub:"Confirm & activate"},
];

function Stepper({current}) {
  const ci = STEPS.findIndex(s=>s.id===current);
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:0,marginBottom:40}}>
      {STEPS.map((s,i)=>{
        const done = i < ci;
        const active = i === ci;
        const color = done ? T.green : active ? T.orange : T.g3;
        const textColor = done ? T.green : active ? T.orange : T.g2;
        return (
          <div key={s.id} style={{display:"flex",alignItems:"center"}}>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,minWidth:90}}>
              <div style={{position:"relative"}}>
                {active && <div style={{position:"absolute",inset:-4,borderRadius:"50%",border:`2px solid ${T.orange}`,animation:"ping 1.5s ease infinite",opacity:.4}}/>}
                <div style={{width:46,height:46,borderRadius:"50%",
                  background:done?"rgba(34,212,104,.12)":active?"rgba(255,91,24,.12)":T.card2,
                  border:`2px solid ${color}`,
                  display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,
                  transition:"all .3s"}}>
                  {done ? <span style={{animation:"checkPop .4s ease",display:"inline-block",color:T.green,fontSize:20}}>✓</span> : s.icon}
                </div>
              </div>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:12,fontWeight:700,color:textColor,transition:"color .3s"}}>{s.label}</div>
                <div style={{fontSize:10,color:T.g2}}>{s.sub}</div>
              </div>
            </div>
            {i < STEPS.length-1 && (
              <div style={{width:60,height:2,background:i < ci ? T.green : T.g3,margin:"0 4px",marginBottom:30,
              transition:"background .5s",flexShrink:0}}/>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── toast ────────────────────────────────────────────────
function Toast({msg, type, onDone}) {
  const [out, setOut] = useState(false);
  const icons = {success:"✅",error:"🔴",warning:"⚠️",info:"💡"};
  const bc = {success:T.green,error:T.red,warning:T.amber,info:T.teal};
  useEffect(()=>{
    const t1 = setTimeout(()=>setOut(true), 2800);
    const t2 = setTimeout(onDone, 3200);
    return ()=>{clearTimeout(t1);clearTimeout(t2)};
  },[]);
  return (
    <div style={{display:"flex",alignItems:"center",gap:10,background:T.card,
    border:`1.5px solid ${bc[type]}44`,borderRadius:12,padding:"13px 18px",minWidth:300,
    boxShadow:"0 8px 32px rgba(0,0,0,.5)",fontFamily:"'Nunito',sans-serif",fontSize:13,color:T.white,
    animation:out?"toastOut .35s forwards":"toastIn .35s forwards"}}>
      <span style={{fontSize:16}}>{icons[type]}</span><span>{msg}</span>
    </div>
  );
}

// ── STEP 1: CUSTOMER ────────────────────────────────────
function CustomerStep({data, setData}) {
  const u = (k,v) => setData(p=>({...p,[k]:v}));
  return (
    <div style={{animation:"fadeUp .4s ease"}}>
      <div style={{marginBottom:28}}>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:34,letterSpacing:3,color:T.white}}>CUSTOMER REGISTRATION</div>
        <div style={{fontSize:13,color:T.g2,marginTop:4}}>Register the company that will use SafeguardIQ Enterprise — this becomes the top-level account.</div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18,marginBottom:18}}>
        <Field label="Company / Organisation Name" req>
          {inp(data.companyName, v=>u("companyName",v), {placeholder:"Pune Auto Components Pvt Ltd"})}
        </Field>
        <Field label="CIN / LLPIN / Registration No.">
          {inp(data.cin, v=>u("cin",v), {placeholder:"U29100MH2018PTC000000",style:{fontFamily:"'DM Mono',monospace"}})}
        </Field>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:18,marginBottom:18}}>
        <Field label="Industry Type" req>
          {sel(data.industry, v=>u("industry",v), [
            "Automobile & Auto Components","Chemical & Petrochemical","Textile & Garments",
            "Food & Beverage Processing","Pharmaceutical","Steel & Metal Fabrication",
            "Cement & Building Materials","Electronics & Semiconductor","Paper & Packaging","Other Manufacturing"
          ], "Select industry…")}
        </Field>
        <Field label="No. of Employees">
          {sel(data.empCount, v=>u("empCount",v), ["1–50","51–200","201–500","501–2000","2000+"], "Select range…")}
        </Field>
        <Field label="Annual Turnover">
          {sel(data.turnover, v=>u("turnover",v), ["< ₹1 Cr","₹1–10 Cr","₹10–100 Cr","₹100–500 Cr","> ₹500 Cr"], "Select range…")}
        </Field>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:18,marginBottom:18}}>
        <Field label="Registered Address" req>
          {inp(data.address, v=>u("address",v), {placeholder:"Street / Area / Building name"})}
        </Field>
        <Field label="PIN Code">
          {inp(data.pin, v=>u("pin",v), {placeholder:"411018",maxLength:6,style:{fontFamily:"'DM Mono',monospace"}})}
        </Field>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:18,marginBottom:24}}>
        <Field label="City / District" req>
          {inp(data.city, v=>u("city",v), {placeholder:"Pune"})}
        </Field>
        <Field label="State" req>
          {sel(data.state, v=>u("state",v), [
            "Andhra Pradesh","Delhi","Gujarat","Haryana","Karnataka","Kerala","Madhya Pradesh",
            "Maharashtra","Punjab","Rajasthan","Tamil Nadu","Telangana","Uttar Pradesh","West Bengal","Other"
          ], "Select state…")}
        </Field>
        <Field label="GSTIN">
          {inp(data.gstin, v=>u("gstin",v), {placeholder:"27AABCU9603R1ZV",maxLength:15,style:{fontFamily:"'DM Mono',monospace"}})}
        </Field>
      </div>

      {/* Primary Contact */}
      <div style={{background:T.card2,border:`1.5px solid ${T.border}`,borderRadius:12,padding:18,marginBottom:18}}>
        <div style={{fontSize:12,fontWeight:700,color:T.orange,textTransform:"uppercase",letterSpacing:2,marginBottom:16,fontFamily:"'DM Mono',monospace"}}>
          Primary Contact (Admin User)
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16,marginBottom:14}}>
          <Field label="Full Name" req>
            {inp(data.contactName, v=>u("contactName",v), {placeholder:"Suresh Nair"})}
          </Field>
          <Field label="Designation" req>
            {inp(data.contactDesig, v=>u("contactDesig",v), {placeholder:"Plant Manager / HSE Head"})}
          </Field>
          <Field label="Department">
            {sel(data.contactDept, v=>u("contactDept",v), ["HSE / Safety","Operations","Engineering","IT","Admin","Management"], "Select dept…")}
          </Field>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16}}>
          <Field label="Email Address" req>
            {inp(data.email, v=>u("email",v), {type:"email",placeholder:"suresh@company.com"})}
          </Field>
          <Field label="Mobile Number" req>
            {inp(data.mobile, v=>u("mobile",v), {placeholder:"+91 98765 43210",style:{fontFamily:"'DM Mono',monospace"}})}
          </Field>
          <Field label="Alternate Phone">
            {inp(data.altPhone, v=>u("altPhone",v), {placeholder:"+91 20 4567 8901",style:{fontFamily:"'DM Mono',monospace"}})}
          </Field>
        </div>
      </div>

      {/* Plan Selection */}
      <div>
        <Lbl>Subscription Plan</Lbl>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}>
          {[
            {id:"starter", label:"Starter", price:"₹1,200/cam/mo", cams:"Up to 8 cameras", color:T.teal, features:["PPE Detection","Dashboard","Form 18 Auto-fill","Email Alerts"]},
            {id:"growth",  label:"Growth",  price:"₹1,800/cam/mo", cams:"Up to 32 cameras", color:T.orange, features:["All Starter","Multi-plant","WhatsApp Alerts","ISO Reports","API Access"], popular:true},
            {id:"enterprise", label:"Enterprise", price:"Custom pricing", cams:"Unlimited cameras", color:T.purple, features:["All Growth","Dedicated CSM","SLA 99.9%","On-prem option","Custom integrations"]},
          ].map(plan=>(
            <div key={plan.id} onClick={()=>u("plan",plan.id)}
              style={{border:`2px solid ${data.plan===plan.id?plan.color:T.border}`,borderRadius:12,padding:16,cursor:"pointer",
              background:data.plan===plan.id?`${plan.color}10`:T.card2,transition:"all .2s",position:"relative"}}>
              {plan.popular && <div style={{position:"absolute",top:-10,left:"50%",transform:"translateX(-50%)",background:T.orange,color:"#fff",fontSize:9,padding:"2px 10px",borderRadius:10,fontWeight:700,letterSpacing:1}}>MOST POPULAR</div>}
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,letterSpacing:2,color:plan.color}}>{plan.label}</div>
              <div style={{fontSize:15,fontWeight:800,color:T.white,margin:"6px 0 2px"}}>{plan.price}</div>
              <div style={{fontSize:11,color:T.g2,marginBottom:12}}>{plan.cams}</div>
              {plan.features.map(f=>(
                <div key={f} style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:T.g1,marginBottom:4}}>
                  <span style={{color:plan.color,fontSize:10}}>✓</span>{f}
                </div>
              ))}
              {data.plan===plan.id && <div style={{position:"absolute",top:10,right:10,width:20,height:20,borderRadius:"50%",background:plan.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#fff"}}>✓</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── STEP 2: PLANT ────────────────────────────────────────
function PlantStep({data, setData, customer}) {
  const u = (k,v) => setData(p=>({...p,[k]:v}));
  return (
    <div style={{animation:"fadeUp .4s ease"}}>
      <div style={{marginBottom:28}}>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:34,letterSpacing:3,color:T.white}}>PLANT / FACTORY REGISTRATION</div>
        <div style={{fontSize:13,color:T.g2,marginTop:4}}>
          Register a factory/plant under <strong style={{color:T.orange}}>{customer.companyName||"your company"}</strong>. Each plant gets its own dashboard and compliance reports.
        </div>
      </div>

      {/* Auto-linked */}
      <div style={{background:`rgba(0,212,180,.06)`,border:`1.5px solid rgba(0,212,180,.2)`,borderRadius:12,padding:"12px 16px",marginBottom:22,display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontSize:18}}>🔗</span>
        <span style={{fontSize:13,color:T.teal}}>Linked to customer: <strong>{customer.companyName||"—"}</strong></span>
        <span style={{marginLeft:"auto",fontSize:11,color:T.g2,fontFamily:"'DM Mono',monospace"}}>{customer.cin||"CID-TBD"}</span>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18,marginBottom:18}}>
        <Field label="Plant / Factory Name" req>
          {inp(data.plantName, v=>u("plantName",v), {placeholder:"Pune Unit 1 — Main Plant"})}
        </Field>
        <Field label="Factory Licence No. (Factories Act)" req>
          {inp(data.licNo, v=>u("licNo",v), {placeholder:"MH/PUN/F/2019/00423",style:{fontFamily:"'DM Mono',monospace"}})}
        </Field>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:18,marginBottom:18}}>
        <Field label="Factory Type" req>
          {sel(data.factoryType, v=>u("factoryType",v), [
            "Manufacturing","Assembly","Process Industry","Warehousing","R&D / Pilot",
            "Power Plant","Mining / Quarry","Construction Site"
          ], "Select type…")}
        </Field>
        <Field label="Hazard Category">
          {sel(data.hazard, v=>u("hazard",v), ["Low Hazard","Medium Hazard","High Hazard (Schedule 1 Process)","Highly Hazardous (MSIHC Rules)"], "Select…")}
        </Field>
        <Field label="Total Workers on Site">
          {inp(data.workers, v=>u("workers",v), {type:"number",placeholder:"250",min:1})}
        </Field>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:18,marginBottom:18}}>
        <Field label="Plant Address" req>
          {inp(data.plantAddress, v=>u("plantAddress",v), {placeholder:"Plot 47, MIDC Industrial Area, Pimpri-Chinchwad"})}
        </Field>
        <Field label="PIN Code">
          {inp(data.plantPin, v=>u("plantPin",v), {placeholder:"411018",maxLength:6,style:{fontFamily:"'DM Mono',monospace"}})}
        </Field>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:18,marginBottom:18}}>
        <Field label="City" req>
          {inp(data.plantCity, v=>u("plantCity",v), {placeholder:"Pune"})}
        </Field>
        <Field label="State" req>
          {sel(data.plantState, v=>u("plantState",v), [
            "Andhra Pradesh","Delhi","Gujarat","Haryana","Karnataka","Kerala","Madhya Pradesh",
            "Maharashtra","Punjab","Rajasthan","Tamil Nadu","Telangana","Uttar Pradesh","West Bengal","Other"
          ], "Select state…")}
        </Field>
        <Field label="GPS Coordinates" hint="Paste from Google Maps">
          {inp(data.gps, v=>u("gps",v), {placeholder:"18.6279, 73.7997",style:{fontFamily:"'DM Mono',monospace"}})}
        </Field>
      </div>

      {/* Compliance Details */}
      <div style={{background:T.card2,border:`1.5px solid ${T.border}`,borderRadius:12,padding:18,marginBottom:18}}>
        <div style={{fontSize:12,fontWeight:700,color:T.orange,textTransform:"uppercase",letterSpacing:2,marginBottom:16,fontFamily:"'DM Mono',monospace"}}>Statutory & Compliance Details</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16,marginBottom:14}}>
          <Field label="Licence Valid Upto">
            {inp(data.licExpiry, v=>u("licExpiry",v), {type:"date"})}
          </Field>
          <Field label="Inspector of Factories Office">
            {inp(data.inspectorOffice, v=>u("inspectorOffice",v), {placeholder:"Pune District — Joint Director"})}
          </Field>
          <Field label="DGFASLI Region">
            {sel(data.dgfasli, v=>u("dgfasli",v), ["Mumbai (Western)","Chennai (Southern)","Kolkata (Eastern)","Delhi (Northern)","Hyderabad","Ahmedabad","Bhopal"], "Select region…")}
          </Field>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16}}>
          <Field label="Shift Pattern">
            {sel(data.shifts, v=>u("shifts",v), ["Single Shift (8hr)","Double Shift (2×8hr)","Triple Shift (3×8hr)","Continuous (24×7)"], "Select…")}
          </Field>
          <Field label="Occupier Name (Factories Act)">
            {inp(data.occupier, v=>u("occupier",v), {placeholder:"MD / Director name"})}
          </Field>
          <Field label="Manager (Section 7 Notice)">
            {inp(data.manager, v=>u("manager",v), {placeholder:"Factory Manager name"})}
          </Field>
        </div>
      </div>

      {/* Plant Contact */}
      <div style={{background:T.card2,border:`1.5px solid ${T.border}`,borderRadius:12,padding:18}}>
        <div style={{fontSize:12,fontWeight:700,color:T.teal,textTransform:"uppercase",letterSpacing:2,marginBottom:16,fontFamily:"'DM Mono',monospace"}}>Plant Safety Contact (HSE Officer)</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16}}>
          <Field label="HSE Officer Name" req>
            {inp(data.hseName, v=>u("hseName",v), {placeholder:"Rajesh Patil"})}
          </Field>
          <Field label="HSE Email" req>
            {inp(data.hseEmail, v=>u("hseEmail",v), {type:"email",placeholder:"rajesh@company.com"})}
          </Field>
          <Field label="HSE Mobile" req>
            {inp(data.hseMobile, v=>u("hseMobile",v), {placeholder:"+91 98765 12345",style:{fontFamily:"'DM Mono',monospace"}})}
          </Field>
        </div>
      </div>
    </div>
  );
}

// ── STEP 3: AREA ─────────────────────────────────────────
function AreaStep({data, setData, plant}) {
  const TYPES = ["Assembly Line","Welding Zone","Paint Shop","Forklift / Material Handling","Press Room","Electrical / Control Room","Chemical Storage","Loading / Unloading Dock","Warehouse / Store","Boiler / Utility Room","Canteen / Rest Area","Main Gate / Entry","Emergency Assembly Point","Laboratory / QC","Office / Admin","Other"];
  const RISKS = ["Low","Medium","High","Very High (Hazardous)"];

  const addArea = () => setData(p=>({...p, areas:[...p.areas,{id:Date.now(),name:"",type:"",riskLevel:"",workerCount:"",sqft:"",hasHazardousMat:false,ppeRequired:[],notes:""}]}));
  const upd = (i,k,v) => setData(p=>{const a=[...p.areas];a[i]={...a[i],[k]:v};return{...p,areas:a}});
  const del = i => setData(p=>({...p,areas:p.areas.filter((_,j)=>j!==i)}));
  const togglePPE = (i,ppe) => setData(p=>{
    const a=[...p.areas]; const cur=a[i].ppeRequired||[];
    a[i]={...a[i],ppeRequired:cur.includes(ppe)?cur.filter(x=>x!==ppe):[...cur,ppe]};
    return{...p,areas:a};
  });

  const PPE_OPTIONS = ["Hard Hat","Safety Vest","Safety Boots","Eye Protection","Gloves","Ear Protection","Face Shield","Respiratory Mask","Safety Harness"];

  return (
    <div style={{animation:"fadeUp .4s ease"}}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:28}}>
        <div>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:34,letterSpacing:3,color:T.white}}>AREA / ZONE SETUP</div>
          <div style={{fontSize:13,color:T.g2,marginTop:4}}>
            Define monitoring zones inside <strong style={{color:T.orange}}>{plant.plantName||"your plant"}</strong>. Each area gets its own PPE rules and alert thresholds.
          </div>
        </div>
        <Btn onClick={addArea} variant="teal">+ Add Area</Btn>
      </div>

      {data.areas.length === 0 && (
        <div style={{textAlign:"center",padding:"60px 20px",background:T.card,border:`2px dashed ${T.border}`,borderRadius:16,color:T.g2}}>
          <div style={{fontSize:40,marginBottom:12}}>📍</div>
          <div style={{fontSize:16,fontWeight:700,color:T.g1,marginBottom:6}}>No areas added yet</div>
          <div style={{fontSize:13,marginBottom:20}}>Add at least one zone — e.g. "Welding Bay", "Assembly Line A", "Paint Shop"</div>
          <Btn onClick={addArea} variant="primary">+ Add First Area</Btn>
        </div>
      )}

      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        {data.areas.map((area,i)=>(
          <div key={area.id} style={{background:T.card,border:`1.5px solid ${T.border}`,borderRadius:14,overflow:"hidden",animation:"slideRight .3s ease"}}>
            {/* Area header */}
            <div style={{background:T.card2,padding:"12px 18px",display:"flex",alignItems:"center",gap:12,borderBottom:`1px solid ${T.border}`}}>
              <div style={{width:32,height:32,borderRadius:"50%",background:`rgba(255,91,24,.15)`,border:`1.5px solid ${T.orange}`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Bebas Neue',sans-serif",fontSize:16,color:T.orange}}>{i+1}</div>
              <div style={{flex:1,fontWeight:700,color:area.name||T.g2,fontSize:14}}>{area.name||`Area ${i+1} — click fields below to configure`}</div>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                {area.riskLevel && <span style={{fontSize:10,padding:"2px 9px",borderRadius:10,fontWeight:700,
                  background:area.riskLevel==="Low"?"rgba(34,212,104,.12)":area.riskLevel==="Medium"?"rgba(255,180,0,.12)":"rgba(255,61,61,.12)",
                  color:area.riskLevel==="Low"?T.green:area.riskLevel==="Medium"?T.amber:T.red,
                  border:`1px solid ${area.riskLevel==="Low"?"rgba(34,212,104,.3)":area.riskLevel==="Medium"?"rgba(255,180,0,.3)":"rgba(255,61,61,.3)"}`}}>
                  {area.riskLevel} Risk
                </span>}
                <button onClick={()=>del(i)} style={{background:"transparent",border:"none",color:T.g2,cursor:"pointer",fontSize:16,padding:"2px 6px"}} title="Remove area">✕</button>
              </div>
            </div>

            <div style={{padding:18}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16,marginBottom:16}}>
                <Field label="Area / Zone Name" req>
                  {inp(area.name, v=>upd(i,"name",v), {placeholder:"e.g. Welding Zone B, Assembly Line A"})}
                </Field>
                <Field label="Zone Type" req>
                  {sel(area.type, v=>upd(i,"type",v), TYPES, "Select zone type…")}
                </Field>
                <Field label="Risk Level" req>
                  {sel(area.riskLevel, v=>upd(i,"riskLevel",v), RISKS, "Select risk level…")}
                </Field>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16,marginBottom:16}}>
                <Field label="Worker Count in This Zone">
                  {inp(area.workerCount, v=>upd(i,"workerCount",v), {type:"number",placeholder:"30"})}
                </Field>
                <Field label="Area (sq ft / sq m)">
                  {inp(area.sqft, v=>upd(i,"sqft",v), {placeholder:"e.g. 1200 sq ft"})}
                </Field>
                <Field label="Hazardous Material?">
                  {sel(area.hasHazardousMat?"Yes":"No", v=>upd(i,"hasHazardousMat",v==="Yes"), ["Yes","No"])}
                </Field>
              </div>

              {/* PPE Required */}
              <div style={{marginBottom:14}}>
                <Lbl>Mandatory PPE for This Zone</Lbl>
                <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                  {PPE_OPTIONS.map(ppe=>{
                    const sel = area.ppeRequired?.includes(ppe);
                    return (
                      <div key={ppe} onClick={()=>togglePPE(i,ppe)}
                        style={{padding:"5px 12px",borderRadius:20,fontSize:12,fontWeight:600,cursor:"pointer",
                        border:`1.5px solid ${sel?T.orange:T.border}`,
                        background:sel?"rgba(255,91,24,.12)":T.card2,
                        color:sel?T.orange:T.g2,transition:"all .15s"}}>
                        {ppe}
                      </div>
                    );
                  })}
                </div>
              </div>

              <Field label="Additional Notes / Instructions">
                <textarea value={area.notes} onChange={e=>upd(i,"notes",e.target.value)}
                  placeholder="e.g. Welding fumes present — respiratory mask mandatory for >10 min exposure…"
                  style={{width:"100%",background:T.card2,border:`1.5px solid ${T.border}`,borderRadius:10,
                  padding:"10px 14px",fontSize:13,color:T.white,outline:"none",resize:"vertical",minHeight:64,
                  fontFamily:"'Nunito',sans-serif"}}/>
              </Field>
            </div>
          </div>
        ))}
      </div>

      {data.areas.length > 0 && (
        <div style={{marginTop:16,textAlign:"center"}}>
          <Btn onClick={addArea} variant="ghost">+ Add Another Area</Btn>
        </div>
      )}
    </div>
  );
}

// ── STEP 4: CAMERA ───────────────────────────────────────
function CameraStep({data, setData, areas}) {
  const MODELS = ["Hikvision DS-2CD2143G2-I","Hikvision DS-2DE4A425IWG-E","Dahua IPC-HDW2831T-AS","CP Plus CP-USC-DA24PL5-0360","Axis P3245-V","Bosch FLEXIDOME 5100i","Generic ONVIF IP Camera","Other"];
  const RESOLUTION = ["1080p Full HD","2MP","4MP","5MP","8MP / 4K","12MP"];
  const PROTOCOLS = ["RTSP","ONVIF","HTTP MJPEG","HLS","RTMP"];

  const addCam = (areaId, areaName) => setData(p=>({...p, cameras:[...p.cameras,{
    id:Date.now(), areaId, areaName, camId:"", location:"", model:"", resolution:"",
    protocol:"RTSP", rtspUrl:"", username:"", password:"", ipAddress:"", port:"554",
    viewAngle:"", mountHeight:"", coverageDesc:"", alertSensitivity:"Medium",
    detectHelmet:true, detectVest:true, detectBoots:false, detectEye:false,
    detectGloves:false, detectEar:false, dangerZone:false, motionDetect:true, status:"Pending Test"
  }]}));

  const upd = (i,k,v) => setData(p=>{const c=[...p.cameras];c[i]={...c[i],[k]:v};return{...p,cameras:c}});
  const del = i => setData(p=>({...p,cameras:p.cameras.filter((_,j)=>j!==i)}));

  const grouped = areas.reduce((acc,a)=>({...acc,[a.id]:{name:a.name,cams:data.cameras.filter(c=>c.areaId===a.id)}}),{});

  return (
    <div style={{animation:"fadeUp .4s ease"}}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:28}}>
        <div>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:34,letterSpacing:3,color:T.white}}>CAMERA REGISTRATION</div>
          <div style={{fontSize:13,color:T.g2,marginTop:4}}>Add cameras to each zone. SafeguardIQ Enterprise will connect, test, and begin monitoring automatically.</div>
        </div>
        <div style={{fontSize:13,color:T.g2,fontFamily:"'DM Mono',monospace"}}>
          Total cameras: <strong style={{color:T.orange}}>{data.cameras.length}</strong>
        </div>
      </div>

      {areas.length === 0 && (
        <div style={{textAlign:"center",padding:"40px",background:T.card,border:`2px dashed ${T.border}`,borderRadius:16,color:T.g2}}>
          <div style={{fontSize:13}}>⬅ Go back and add at least one area first</div>
        </div>
      )}

      {areas.map(area=>(
        <div key={area.id} style={{marginBottom:24}}>
          {/* Area header */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12,padding:"10px 16px",
            background:`rgba(255,91,24,.07)`,border:`1px solid rgba(255,91,24,.2)`,borderRadius:10}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:18}}>📍</span>
              <div>
                <span style={{fontWeight:700,color:T.orange,fontSize:14}}>{area.name}</span>
                <span style={{marginLeft:10,fontSize:11,color:T.g2}}>{area.type} · {area.riskLevel} Risk</span>
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:11,color:T.g2,fontFamily:"'DM Mono',monospace"}}>{grouped[area.id]?.cams?.length||0} camera(s)</span>
              <Btn onClick={()=>addCam(area.id,area.name)} variant="teal" style={{padding:"7px 14px",fontSize:12}}>+ Add Camera</Btn>
            </div>
          </div>

          {data.cameras.filter(c=>c.areaId===area.id).map((cam, gi)=>{
            const ci = data.cameras.findIndex(c=>c.id===cam.id);
            return (
              <div key={cam.id} style={{background:T.card,border:`1.5px solid ${T.border}`,borderRadius:12,marginBottom:12,overflow:"hidden"}}>
                {/* Camera header */}
                <div style={{background:T.card2,padding:"10px 16px",display:"flex",alignItems:"center",gap:12,borderBottom:`1px solid ${T.border}`}}>
                  <div style={{width:28,height:28,borderRadius:"50%",background:`rgba(0,212,180,.12)`,border:`1.5px solid ${T.teal}`,
                    display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>📹</div>
                  <div style={{flex:1,fontWeight:700,fontSize:13,color:cam.camId?T.white:T.g2,fontFamily:cam.camId?"'DM Mono',monospace":"'Nunito',sans-serif"}}>
                    {cam.camId||`Camera ${gi+1} — fill CAM ID below`}
                  </div>
                  <span style={{fontSize:10,padding:"2px 9px",borderRadius:10,fontWeight:700,fontFamily:"'DM Mono',monospace",
                    background:cam.status==="Active"?"rgba(34,212,104,.12)":"rgba(255,180,0,.12)",
                    color:cam.status==="Active"?T.green:T.amber,
                    border:`1px solid ${cam.status==="Active"?"rgba(34,212,104,.3)":"rgba(255,180,0,.3)"}`}}>
                    {cam.status}
                  </span>
                  <button onClick={()=>del(ci)} style={{background:"transparent",border:"none",color:T.g2,cursor:"pointer",fontSize:15}}>✕</button>
                </div>

                <div style={{padding:16}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:14,marginBottom:14}}>
                    <Field label="Camera ID / Label" req hint="e.g. CAM-04">
                      {inp(cam.camId, v=>upd(ci,"camId",v), {placeholder:"CAM-04",style:{fontFamily:"'DM Mono',monospace"}})}
                    </Field>
                    <Field label="Physical Location" req>
                      {inp(cam.location, v=>upd(ci,"location",v), {placeholder:"Bay 3 — North wall, 4m height"})}
                    </Field>
                    <Field label="Camera Model">
                      {sel(cam.model, v=>upd(ci,"model",v), MODELS, "Select model…")}
                    </Field>
                    <Field label="Resolution">
                      {sel(cam.resolution, v=>upd(ci,"resolution",v), RESOLUTION, "Select…")}
                    </Field>
                  </div>

                  {/* Network Settings */}
                  <div style={{background:T.card2,borderRadius:10,padding:14,marginBottom:14}}>
                    <div style={{fontSize:11,fontWeight:700,color:T.teal,textTransform:"uppercase",letterSpacing:2,marginBottom:12,fontFamily:"'DM Mono',monospace"}}>Network / Stream Settings</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:12,marginBottom:12}}>
                      <Field label="IP Address" req>
                        {inp(cam.ipAddress, v=>upd(ci,"ipAddress",v), {placeholder:"192.168.1.101",style:{fontFamily:"'DM Mono',monospace"}})}
                      </Field>
                      <Field label="Port">
                        {inp(cam.port, v=>upd(ci,"port",v), {placeholder:"554",style:{fontFamily:"'DM Mono',monospace"}})}
                      </Field>
                      <Field label="Stream Protocol">
                        {sel(cam.protocol, v=>upd(ci,"protocol",v), PROTOCOLS)}
                      </Field>
                      <Field label="Username">
                        {inp(cam.username, v=>upd(ci,"username",v), {placeholder:"admin",style:{fontFamily:"'DM Mono',monospace"}})}
                      </Field>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                      <Field label="Password">
                        {inp(cam.password, v=>upd(ci,"password",v), {type:"password",placeholder:"••••••••"})}
                      </Field>
                      <Field label="RTSP Stream URL" hint="Auto-built from IP/port if left blank">
                        {inp(cam.rtspUrl, v=>upd(ci,"rtspUrl",v), {placeholder:`rtsp://${cam.ipAddress||"192.168.x.x"}:${cam.port||554}/stream1`,style:{fontFamily:"'DM Mono',monospace",fontSize:12}})}
                      </Field>
                    </div>
                  </div>

                  {/* Installation Details */}
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14,marginBottom:14}}>
                    <Field label="Mount Height">
                      {inp(cam.mountHeight, v=>upd(ci,"mountHeight",v), {placeholder:"4.0 m"})}
                    </Field>
                    <Field label="View Angle (°)">
                      {inp(cam.viewAngle, v=>upd(ci,"viewAngle",v), {placeholder:"110°",style:{fontFamily:"'DM Mono',monospace"}})}
                    </Field>
                    <Field label="Coverage Area Description">
                      {inp(cam.coverageDesc, v=>upd(ci,"coverageDesc",v), {placeholder:"Covers welding bay 3 & 4 entry"})}
                    </Field>
                  </div>

                  {/* AI Detection Config */}
                  <div style={{background:`rgba(0,212,180,.05)`,border:`1px solid rgba(0,212,180,.15)`,borderRadius:10,padding:14}}>
                    <div style={{fontSize:11,fontWeight:700,color:T.teal,textTransform:"uppercase",letterSpacing:2,marginBottom:12,fontFamily:"'DM Mono',monospace"}}>AI Detection Configuration</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:16,marginBottom:12}}>
                      <div>
                        <Lbl>PPE Detection Rules for This Camera</Lbl>
                        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                          {[
                            {k:"detectHelmet",l:"Hard Hat"},
                            {k:"detectVest",l:"Safety Vest"},
                            {k:"detectBoots",l:"Safety Boots"},
                            {k:"detectEye",l:"Eye Protection"},
                            {k:"detectGloves",l:"Gloves"},
                            {k:"detectEar",l:"Ear Protection"},
                          ].map(({k,l})=>(
                            <div key={k} onClick={()=>upd(ci,k,!cam[k])}
                              style={{padding:"5px 12px",borderRadius:20,fontSize:12,fontWeight:600,cursor:"pointer",
                              border:`1.5px solid ${cam[k]?T.teal:T.border}`,
                              background:cam[k]?"rgba(0,212,180,.1)":T.card2,
                              color:cam[k]?T.teal:T.g2,transition:"all .15s"}}>
                              {cam[k]?"✓ ":""}{l}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div style={{minWidth:140}}>
                        <Field label="Alert Sensitivity">
                          {sel(cam.alertSensitivity, v=>upd(ci,"alertSensitivity",v), ["Low","Medium","High","Very High"])}
                        </Field>
                      </div>
                    </div>
                    <div style={{display:"flex",gap:20}}>
                      {[{k:"dangerZone",l:"🚧 Danger Zone Monitoring"},{k:"motionDetect",l:"🔍 Motion Detection"}].map(({k,l})=>(
                        <div key={k} onClick={()=>upd(ci,k,!cam[k])} style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}>
                          <div style={{width:18,height:18,borderRadius:4,border:`1.5px solid ${cam[k]?T.orange:T.border}`,
                            background:cam[k]?"rgba(255,91,24,.15)":"transparent",display:"flex",alignItems:"center",
                            justifyContent:"center",fontSize:11,color:T.orange,transition:"all .15s"}}>
                            {cam[k]?"✓":""}
                          </div>
                          <span style={{fontSize:13,color:cam[k]?T.g1:T.g2}}>{l}</span>
                        </div>
                      ))}
                      <Btn onClick={()=>upd(ci,"status","Testing…")} variant="teal" style={{marginLeft:"auto",padding:"6px 14px",fontSize:12}}>
                        🔗 Test Connection
                      </Btn>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {data.cameras.filter(c=>c.areaId===area.id).length===0 && (
            <div onClick={()=>addCam(area.id,area.name)} style={{border:`2px dashed ${T.border}`,borderRadius:12,padding:"20px",
              textAlign:"center",color:T.g2,cursor:"pointer",transition:"all .2s",fontSize:13,
              background:"transparent"}}
              onMouseEnter={e=>e.target.style.borderColor=T.teal}
              onMouseLeave={e=>e.target.style.borderColor=T.border}>
              📹 Click to add a camera to <strong>{area.name}</strong>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── STEP 5: REVIEW ───────────────────────────────────────
function ReviewStep({customer, plant, areas, cameras, onActivate}) {
  const totalPPEEnabled = cameras.reduce((a,c)=>{
    return a + [c.detectHelmet,c.detectVest,c.detectBoots,c.detectEye,c.detectGloves,c.detectEar].filter(Boolean).length;
  },0);

  const Section = ({title, color=T.orange, children}) => (
    <div style={{background:T.card,border:`1.5px solid ${T.border}`,borderRadius:14,overflow:"hidden",marginBottom:16}}>
      <div style={{background:T.card2,padding:"10px 18px",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",gap:10}}>
        <div style={{width:4,height:18,borderRadius:2,background:color}}/>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,letterSpacing:2,color}}>{title}</div>
      </div>
      <div style={{padding:18}}>{children}</div>
    </div>
  );

  const Row = ({label, value, mono}) => (
    <div style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${T.g3}`,
      fontSize:13,color:T.g1}}>
      <span style={{color:T.g2}}>{label}</span>
      <span style={{fontFamily:mono?"'DM Mono',monospace":"'Nunito',sans-serif",color:T.white,textAlign:"right",maxWidth:"60%"}}>{value||<em style={{color:T.g2}}>Not entered</em>}</span>
    </div>
  );

  return (
    <div style={{animation:"fadeUp .4s ease"}}>
      <div style={{marginBottom:28}}>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:34,letterSpacing:3,color:T.white}}>REVIEW & ACTIVATE</div>
        <div style={{fontSize:13,color:T.g2,marginTop:4}}>Verify all details before activating the SafeguardIQ Enterprise system for this plant.</div>
      </div>

      {/* Summary cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:24}}>
        {[
          {label:"Customer",value:customer.companyName||"—",icon:"🏢",c:T.orange},
          {label:"Plants",value:"1",icon:"🏭",c:T.teal},
          {label:"Zones / Areas",value:areas.length,icon:"📍",c:T.blue},
          {label:"Cameras",value:cameras.length,icon:"📹",c:T.purple},
        ].map(s=>(
          <div key={s.label} style={{background:T.card,border:`1.5px solid ${T.border}`,borderRadius:12,padding:16,textAlign:"center",position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:s.c}}/>
            <div style={{fontSize:28,marginBottom:8}}>{s.icon}</div>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,color:s.c}}>{s.value}</div>
            <div style={{fontSize:11,color:T.g2,textTransform:"uppercase",letterSpacing:1.5}}>{s.label}</div>
          </div>
        ))}
      </div>

      <Section title="Customer Details" color={T.orange}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24}}>
          <div>
            <Row label="Company Name" value={customer.companyName}/>
            <Row label="CIN / Reg. No." value={customer.cin} mono/>
            <Row label="Industry" value={customer.industry}/>
            <Row label="GSTIN" value={customer.gstin} mono/>
            <Row label="Address" value={[customer.address,customer.city,customer.state,customer.pin].filter(Boolean).join(", ")}/>
          </div>
          <div>
            <Row label="Primary Contact" value={customer.contactName}/>
            <Row label="Designation" value={customer.contactDesig}/>
            <Row label="Email" value={customer.email} mono/>
            <Row label="Mobile" value={customer.mobile} mono/>
            <Row label="Plan" value={customer.plan?.toUpperCase()}/>
          </div>
        </div>
      </Section>

      <Section title="Plant Details" color={T.teal}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24}}>
          <div>
            <Row label="Plant Name" value={plant.plantName}/>
            <Row label="Factory Licence" value={plant.licNo} mono/>
            <Row label="Factory Type" value={plant.factoryType}/>
            <Row label="Hazard Category" value={plant.hazard}/>
            <Row label="Workers on Site" value={plant.workers}/>
          </div>
          <div>
            <Row label="HSE Officer" value={plant.hseName}/>
            <Row label="HSE Email" value={plant.hseEmail} mono/>
            <Row label="Shifts" value={plant.shifts}/>
            <Row label="Inspector Office" value={plant.inspectorOffice}/>
            <Row label="Licence Expiry" value={plant.licExpiry}/>
          </div>
        </div>
      </Section>

      <Section title="Areas / Zones" color={T.blue}>
        {areas.length===0 ? <div style={{color:T.g2,fontSize:13}}>No areas configured</div> :
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
            {areas.map((a,i)=>(
              <div key={i} style={{background:T.card2,border:`1px solid ${T.border}`,borderRadius:10,padding:12}}>
                <div style={{fontWeight:700,color:T.white,fontSize:13,marginBottom:4}}>{a.name}</div>
                <div style={{fontSize:11,color:T.g2,marginBottom:6}}>{a.type}</div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  <span style={{fontSize:10,padding:"2px 7px",borderRadius:8,
                    background:a.riskLevel==="Low"?"rgba(34,212,104,.12)":a.riskLevel==="Medium"?"rgba(255,180,0,.12)":"rgba(255,61,61,.12)",
                    color:a.riskLevel==="Low"?T.green:a.riskLevel==="Medium"?T.amber:T.red}}>
                    {a.riskLevel} Risk
                  </span>
                  {a.ppeRequired?.slice(0,3).map(p=>(
                    <span key={p} style={{fontSize:10,padding:"2px 7px",borderRadius:8,background:"rgba(255,91,24,.1)",color:T.orange}}>{p}</span>
                  ))}
                  {(a.ppeRequired?.length||0)>3 && <span style={{fontSize:10,color:T.g2}}>+{a.ppeRequired.length-3} more</span>}
                </div>
              </div>
            ))}
          </div>
        }
      </Section>

      <Section title="Cameras" color={T.purple}>
        {cameras.length===0 ? <div style={{color:T.g2,fontSize:13}}>No cameras configured</div> :
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead>
              <tr>{["CAM ID","Location","Zone","IP Address","Model","Detections","Status"].map(h=>(
                <th key={h} style={{fontSize:10,color:T.g2,textTransform:"uppercase",letterSpacing:1.5,padding:"8px 10px",textAlign:"left",borderBottom:`1px solid ${T.border}`,fontFamily:"'DM Mono',monospace"}}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {cameras.map((c,i)=>{
                const dets = [c.detectHelmet&&"Helmet",c.detectVest&&"Vest",c.detectBoots&&"Boots",c.detectEye&&"Eye",c.detectGloves&&"Gloves"].filter(Boolean);
                return (
                  <tr key={i} style={{borderBottom:`1px solid ${T.g3}`}}>
                    <td style={{padding:"9px 10px",fontSize:12,color:T.orange,fontFamily:"'DM Mono',monospace"}}>{c.camId||"—"}</td>
                    <td style={{padding:"9px 10px",fontSize:12,color:T.g1}}>{c.location||"—"}</td>
                    <td style={{padding:"9px 10px",fontSize:12,color:T.g2}}>{c.areaName}</td>
                    <td style={{padding:"9px 10px",fontSize:11,color:T.teal,fontFamily:"'DM Mono',monospace"}}>{c.ipAddress||"—"}</td>
                    <td style={{padding:"9px 10px",fontSize:11,color:T.g2}}>{c.model||"—"}</td>
                    <td style={{padding:"9px 10px"}}><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{dets.slice(0,3).map(d=><span key={d} style={{fontSize:9,padding:"1px 6px",borderRadius:8,background:"rgba(0,212,180,.1)",color:T.teal}}>{d}</span>)}{dets.length>3&&<span style={{fontSize:9,color:T.g2}}>+{dets.length-3}</span>}</div></td>
                    <td style={{padding:"9px 10px"}}><span style={{fontSize:10,padding:"2px 8px",borderRadius:8,background:"rgba(255,180,0,.12)",color:T.amber}}>{c.status}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        }
      </Section>

      {/* Activation */}
      <div style={{background:`linear-gradient(135deg, rgba(255,91,24,.1) 0%, rgba(0,212,180,.08) 100%)`,
        border:`1.5px solid ${T.orange}`,borderRadius:16,padding:24,textAlign:"center"}}>
        <div style={{fontSize:32,marginBottom:12}}>🚀</div>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:26,letterSpacing:2,marginBottom:8}}>READY TO ACTIVATE</div>
        <div style={{fontSize:13,color:T.g1,marginBottom:20,maxWidth:480,margin:"0 auto 20px"}}>
          SafeguardIQ Enterprise will connect to all {cameras.length} camera(s) across {areas.length} zone(s), run a connection test, and begin real-time compliance monitoring within minutes.
        </div>
        <div style={{display:"flex",gap:12,justifyContent:"center"}}>
          <Btn onClick={()=>onActivate(false)} variant="secondary">💾 Save as Draft</Btn>
          <Btn onClick={()=>onActivate(true)} variant="primary" style={{padding:"13px 32px",fontSize:16}}>
            ✅ Activate SafeguardIQ Enterprise
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ── SUCCESS SCREEN ───────────────────────────────────────
function SuccessScreen({customer, plant, areas, cameras, onReset}) {
  return (
    <div style={{textAlign:"center",padding:"40px 20px",animation:"popIn .5s ease"}}>
      <div style={{width:80,height:80,borderRadius:"50%",background:"rgba(34,212,104,.12)",
        border:`3px solid ${T.green}`,display:"flex",alignItems:"center",justifyContent:"center",
        fontSize:36,margin:"0 auto 24px",animation:"checkPop .5s ease .2s both"}}>✓</div>
      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:40,letterSpacing:3,color:T.green,marginBottom:8}}>
        ONBOARDING COMPLETE
      </div>
      <div style={{fontSize:15,color:T.g1,marginBottom:32,maxWidth:500,margin:"0 auto 32px"}}>
        <strong style={{color:T.white}}>{customer.companyName}</strong> is now live on SafeguardIQ Enterprise.<br/>
        {cameras.length} camera(s) across {areas.length} zone(s) are connecting…
      </div>

      {/* Status cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,maxWidth:600,margin:"0 auto 32px"}}>
        {[
          {icon:"🔗",label:"Cameras Connecting",value:cameras.length,c:T.teal},
          {icon:"📍",label:"Zones Active",value:areas.length,c:T.blue},
          {icon:"🤖",label:"AI Models Loading",value:"PPE + Danger Zone",c:T.purple},
        ].map(s=>(
          <div key={s.label} style={{background:T.card,border:`1.5px solid ${T.border}`,borderRadius:12,padding:16}}>
            <div style={{fontSize:24,marginBottom:6}}>{s.icon}</div>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:22,color:s.c}}>{s.value}</div>
            <div style={{fontSize:11,color:T.g2}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Account info */}
      <div style={{background:T.card,border:`1.5px solid ${T.border}`,borderRadius:14,padding:20,maxWidth:500,margin:"0 auto 28px",textAlign:"left"}}>
        <div style={{fontSize:11,fontWeight:700,color:T.orange,textTransform:"uppercase",letterSpacing:2,marginBottom:12,fontFamily:"'DM Mono',monospace"}}>Account Details</div>
        {[
          ["Customer ID","CUST-"+Math.random().toString(36).substr(2,8).toUpperCase(),true],
          ["Plant ID","PLT-"+Math.random().toString(36).substr(2,8).toUpperCase(),true],
          ["Login Email",customer.email||"—",true],
          ["Plan",customer.plan?.toUpperCase()||"GROWTH",false],
          ["Dashboard URL","app.syyaimsafeg.ai/"+customer.companyName?.replace(/\s+/g,"-").toLowerCase(),true],
        ].map(([l,v,m])=>(
          <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${T.g3}`,fontSize:13}}>
            <span style={{color:T.g2}}>{l}</span>
            <span style={{color:T.white,fontFamily:m?"'DM Mono',monospace":"'Nunito',sans-serif"}}>{v}</span>
          </div>
        ))}
      </div>

      <div style={{display:"flex",gap:12,justifyContent:"center"}}>
        <Btn onClick={onReset} variant="secondary">+ Onboard Another Plant</Btn>
        <Btn onClick={()=>{}} variant="primary">→ Go to Dashboard</Btn>
      </div>
    </div>
  );
}

// ── MAIN APP ─────────────────────────────────────────────
export default function App() {
  const [step, setStep] = useState("customer");
  const [done, setDone] = useState(false);
  const [toasts, setToasts] = useState([]);

  const [customer, setCustomer] = useState({companyName:"",cin:"",industry:"",empCount:"",turnover:"",address:"",pin:"",city:"",state:"",gstin:"",contactName:"",contactDesig:"",contactDept:"",email:"",mobile:"",altPhone:"",plan:"growth"});
  const [plant, setPlant]       = useState({plantName:"",licNo:"",factoryType:"",hazard:"",workers:"",plantAddress:"",plantPin:"",plantCity:"",plantState:"",gps:"",licExpiry:"",inspectorOffice:"",dgfasli:"",shifts:"",occupier:"",manager:"",hseName:"",hseEmail:"",hseMobile:""});
  const [areasData, setAreasData] = useState({areas:[]});
  const [camerasData, setCamerasData] = useState({cameras:[]});

  const toast = (msg, type="success") => {
    const id = Date.now();
    setToasts(p=>[...p,{id,msg,type}]);
  };
  const removeToast = id => setToasts(p=>p.filter(t=>t.id!==id));

  const ORDER = ["customer","plant","area","camera","review"];
  const ci = ORDER.indexOf(step);

  const next = () => {
    const checks = {
      customer: ()=>{ if(!customer.companyName){toast("Company name is required","error");return false;} if(!customer.email){toast("Email is required","error");return false;} return true; },
      plant: ()=>{ if(!plant.plantName){toast("Plant name is required","error");return false;} return true; },
      area: ()=>{ if(areasData.areas.length===0){toast("Add at least one area/zone","error");return false;} return true; },
      camera: ()=>{ if(camerasData.cameras.length===0){toast("Add at least one camera","warning");} return true; },
    };
    if(checks[step] && !checks[step]()) return;
    if(ci < ORDER.length-1) setStep(ORDER[ci+1]);
  };

  const prev = () => { if(ci>0) setStep(ORDER[ci-1]); };

  const activate = (launch) => {
    if(launch){ toast("SafeguardIQ Enterprise activated! Cameras connecting…","success"); setTimeout(()=>setDone(true),800); }
    else { toast("Saved as draft","info"); }
  };

  const reset = () => { setDone(false); setStep("customer"); setCustomer(p=>({...p,companyName:"",email:""})); setAreasData({areas:[]}); setCamerasData({cameras:[]}); };

  const progress = ((ci/(ORDER.length-1))*100).toFixed(0);

  return (
    <>
      <style>{G}</style>

      {/* TOP BAR */}
      <div style={{background:T.bg2,borderBottom:`1px solid ${T.border}`,padding:"0 28px",height:54,display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:32,height:32,background:T.orange,clipPath:"polygon(50% 0%,100% 20%,100% 60%,50% 100%,0% 60%,0% 20%)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:"#fff",fontWeight:700}}>✓</div>
          <div>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:21,letterSpacing:3}}>SafeguardIQ Enterprise</div>
            <div style={{fontSize:9,color:T.g2,letterSpacing:3,fontFamily:"'DM Mono',monospace",textTransform:"uppercase"}}>Customer Onboarding</div>
          </div>
        </div>
        {!done && (
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:180,height:4,background:T.g3,borderRadius:4,overflow:"hidden"}}>
              <div style={{height:"100%",background:`linear-gradient(90deg,${T.orange},${T.orng2})`,width:progress+"%",transition:"width .4s",borderRadius:4}}/>
            </div>
            <div style={{fontSize:11,color:T.g2,fontFamily:"'DM Mono',monospace"}}>{progress}% complete</div>
          </div>
        )}
        <div style={{fontSize:12,color:T.g2,fontFamily:"'DM Mono',monospace"}}>
          {new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}
        </div>
      </div>

      {/* MAIN */}
      <div style={{maxWidth:1100,margin:"0 auto",padding:"32px 24px"}}>
        {done ? (
          <SuccessScreen customer={customer} plant={plant} areas={areasData.areas} cameras={camerasData.cameras} onReset={reset}/>
        ) : (
          <>
            <Stepper current={step}/>

            {/* FORM AREA */}
            <div style={{background:T.bg3,border:`1.5px solid ${T.border}`,borderRadius:20,padding:32,minHeight:400}}>
              {step==="customer" && <CustomerStep data={customer} setData={setCustomer}/>}
              {step==="plant"    && <PlantStep data={plant} setData={setPlant} customer={customer}/>}
              {step==="area"     && <AreaStep data={areasData} setData={setAreasData} plant={plant}/>}
              {step==="camera"   && <CameraStep data={camerasData} setData={setCamerasData} areas={areasData.areas}/>}
              {step==="review"   && <ReviewStep customer={customer} plant={plant} areas={areasData.areas} cameras={camerasData.cameras} onActivate={activate}/>}
            </div>

            {/* NAV BUTTONS */}
            {step !== "review" && (
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:24}}>
                <Btn onClick={prev} variant="ghost" disabled={ci===0}>← Back</Btn>
                <div style={{display:"flex",gap:10,alignItems:"center"}}>
                  <Btn onClick={()=>toast("Draft saved","info")} variant="secondary">💾 Save Draft</Btn>
                  <Btn onClick={next} variant="primary">
                    {ci===ORDER.length-2 ? "Review →" : "Continue →"}
                  </Btn>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* TOASTS */}
      <div style={{position:"fixed",bottom:24,right:24,zIndex:9999,display:"flex",flexDirection:"column",gap:8}}>
        {toasts.map(t=><Toast key={t.id} {...t} onDone={()=>removeToast(t.id)}/>)}
      </div>
    </>
  );
}


