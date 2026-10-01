/**
 * PostPaymentOnboarding.jsx
 * SafeguardIQ Enterprise — Plant/Area/Camera setup shown after subscription payment
 * Place in: frontend/src/pages/onboarding/PostPaymentOnboarding.jsx
 *
 * Flow: Payment success → /onboarding → Plant → Areas → Cameras → Dashboard
 * Skips Customer step (already registered). Saves to real API.
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const T = {
  bg:"#080C14", bg2:"#0D1220", bg3:"#111828",
  card:"#141D2E", card2:"#192236", border:"#1E2A42",
  orange:"#FF5B18", orng2:"#FF8C52", teal:"#00D4B4",
  green:"#22D468", red:"#FF3D3D", amber:"#FFB400",
  blue:"#3D8AFF", white:"#EDF2FF",
  g1:"#B8C8EC", g2:"#5A6E96", g3:"#1A2540",
};

const G = `
*{margin:0;padding:0;box-sizing:border-box}
body{background:#080C14;color:#EDF2FF;font-family:'Nunito',sans-serif;min-height:100vh}
::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:#0D1220}::-webkit-scrollbar-thumb{background:#1E2A42;border-radius:4px}
input,select,textarea{font-family:'Nunito',sans-serif}
@keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
@keyframes checkPop{0%{transform:scale(0)}70%{transform:scale(1.2)}100%{transform:scale(1)}}
@keyframes ping{0%{transform:scale(1);opacity:.8}100%{transform:scale(2.2);opacity:0}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes toastIn{from{transform:translateX(110%);opacity:0}to{transform:translateX(0);opacity:1}}
@keyframes toastOut{from{opacity:1}to{opacity:0;transform:translateX(110%)}}
`;

// ── Atoms ─────────────────────────────────────────────────
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
    style={{width:"100%",background:T.card2,border:`1.5px solid ${T.border}`,borderRadius:10,
    padding:"11px 14px",fontSize:14,color:T.white,outline:"none",fontFamily:"'Nunito',sans-serif",...props.style}}
    onFocus={e=>e.target.style.borderColor=T.orange}
    onBlur={e=>e.target.style.borderColor=T.border}
  />
);
const sel = (val, set, opts, placeholder) => (
  <select value={val} onChange={e=>set(e.target.value)}
    style={{width:"100%",background:T.card2,border:`1.5px solid ${T.border}`,borderRadius:10,
    padding:"11px 14px",fontSize:14,color:val?T.white:T.g2,outline:"none",cursor:"pointer",fontFamily:"'Nunito',sans-serif"}}>
    {placeholder && <option value="">{placeholder}</option>}
    {opts.map(o=><option key={o.v||o} value={o.v||o}>{o.l||o}</option>)}
  </select>
);
const Btn = ({children, onClick, variant="primary", disabled, style={}}) => {
  const s = {
    primary:{background:disabled?T.g2:T.orange,color:"#fff",border:"none"},
    secondary:{background:T.card2,color:T.g1,border:`1.5px solid ${T.border}`},
    ghost:{background:"transparent",color:T.g2,border:`1.5px solid ${T.border}`},
    teal:{background:"rgba(0,212,180,.12)",color:T.teal,border:`1.5px solid rgba(0,212,180,.3)`},
  };
  return (
    <button onClick={onClick} disabled={disabled}
      style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:"11px 22px",
      borderRadius:10,fontSize:14,fontWeight:700,cursor:disabled?"not-allowed":"pointer",
      fontFamily:"'Nunito',sans-serif",opacity:disabled?.5:1,...s[variant],...style}}>
      {children}
    </button>
  );
};

// ── Toast ──────────────────────────────────────────────────
function Toast({msg, type, onDone}) {
  const [out, setOut] = useState(false);
  const icons = {success:"✅",error:"🔴",warning:"⚠️",info:"💡"};
  const bc = {success:T.green,error:T.red,warning:T.amber,info:T.teal};
  useEffect(()=>{
    const t1=setTimeout(()=>setOut(true),2800);
    const t2=setTimeout(onDone,3200);
    return()=>{clearTimeout(t1);clearTimeout(t2)};
  },[]);
  return (
    <div style={{display:"flex",alignItems:"center",gap:10,background:T.card,
    border:`1.5px solid ${bc[type]}44`,borderRadius:12,padding:"13px 18px",minWidth:300,
    boxShadow:"0 8px 32px rgba(0,0,0,.5)",fontSize:13,color:T.white,
    animation:out?"toastOut .35s forwards":"toastIn .35s forwards"}}>
      <span>{icons[type]}</span><span>{msg}</span>
    </div>
  );
}

// ── Stepper ────────────────────────────────────────────────
const STEPS = [
  {id:"plant",  icon:"🏭", label:"Plant",   sub:"Factory details"},
  {id:"area",   icon:"📍", label:"Areas",   sub:"Zones & departments"},
  {id:"camera", icon:"📹", label:"Cameras", sub:"Device setup"},
  {id:"review", icon:"✅", label:"Activate",sub:"Confirm & go live"},
];

function Stepper({current}) {
  const ci = STEPS.findIndex(s=>s.id===current);
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:0,marginBottom:36}}>
      {STEPS.map((s,i)=>{
        const done=i<ci, active=i===ci;
        const color=done?T.green:active?T.orange:T.g3;
        return (
          <div key={s.id} style={{display:"flex",alignItems:"center"}}>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,minWidth:90}}>
              <div style={{position:"relative"}}>
                {active&&<div style={{position:"absolute",inset:-4,borderRadius:"50%",border:`2px solid ${T.orange}`,animation:"ping 1.5s ease infinite",opacity:.4}}/>}
                <div style={{width:46,height:46,borderRadius:"50%",
                  background:done?"rgba(34,212,104,.12)":active?"rgba(255,91,24,.12)":T.card2,
                  border:`2px solid ${color}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>
                  {done?<span style={{color:T.green,fontSize:20}}>✓</span>:s.icon}
                </div>
              </div>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:12,fontWeight:700,color:done||active?color:T.g2}}>{s.label}</div>
                <div style={{fontSize:10,color:T.g2}}>{s.sub}</div>
              </div>
            </div>
            {i<STEPS.length-1&&(
              <div style={{width:60,height:2,background:i<ci?T.green:T.g3,margin:"0 4px",marginBottom:30,flexShrink:0}}/>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── STEP 1: PLANT ──────────────────────────────────────────
function PlantStep({data, setData}) {
  const u=(k,v)=>setData(p=>({...p,[k]:v}));
  return (
    <div style={{animation:"fadeUp .4s ease"}}>
      <div style={{marginBottom:24}}>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:32,letterSpacing:3,color:T.white}}>YOUR FACTORY / PLANT</div>
        <div style={{fontSize:13,color:T.g2,marginTop:4}}>Tell us about the factory you want to monitor. This is used for compliance reports and Form 18.</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18,marginBottom:18}}>
        <Field label="Plant / Factory Name" req>
          {inp(data.plantName,v=>u("plantName",v),{placeholder:"e.g. Pune Unit 1 — Main Plant"})}
        </Field>
        <Field label="Factory Licence No." hint="From your Factories Act registration">
          {inp(data.licNo,v=>u("licNo",v),{placeholder:"MH/PUN/F/2019/00423",style:{fontFamily:"'DM Mono',monospace"}})}
        </Field>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:18,marginBottom:18}}>
        <Field label="City" req>
          {inp(data.city,v=>u("city",v),{placeholder:"Pune"})}
        </Field>
        <Field label="State" req>
          {sel(data.state,v=>u("state",v),["Andhra Pradesh","Delhi","Gujarat","Haryana","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Punjab","Rajasthan","Tamil Nadu","Telangana","Uttar Pradesh","West Bengal","Other"],"Select state…")}
        </Field>
        <Field label="Total Workers on Site">
          {inp(data.workers,v=>u("workers",v),{type:"number",placeholder:"250",min:1})}
        </Field>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18,marginBottom:18}}>
        <Field label="HSE Officer Name">
          {inp(data.hseName,v=>u("hseName",v),{placeholder:"Rajesh Patil"})}
        </Field>
        <Field label="HSE Mobile (WhatsApp alerts sent here)" req>
          {inp(data.hseMobile,v=>u("hseMobile",v),{placeholder:"+91 98765 12345",style:{fontFamily:"'DM Mono',monospace"}})}
        </Field>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18}}>
        <Field label="Occupier Name (Factories Act)">
          {inp(data.occupier,v=>u("occupier",v),{placeholder:"MD / Director name"})}
        </Field>
        <Field label="Inspector of Factories Office">
          {inp(data.inspectorOffice,v=>u("inspectorOffice",v),{placeholder:"Pune District — Joint Director"})}
        </Field>
      </div>
    </div>
  );
}

// ── STEP 2: AREAS ──────────────────────────────────────────
function AreaStep({data, setData}) {
  const TYPES=["Assembly Line","Welding Zone","Paint Shop","Forklift / Material Handling","Press Room","Electrical / Control Room","Chemical Storage","Loading / Unloading Dock","Warehouse / Store","Other"];
  const RISKS=["Low","Medium","High","Very High (Hazardous)"];
  const PPE_OPTIONS=["Hard Hat","Safety Vest","Safety Boots","Eye Protection","Gloves","Ear Protection","Face Shield","Respiratory Mask"];

  const add=()=>setData(p=>({...p,areas:[...p.areas,{id:Date.now(),name:"",type:"",riskLevel:"Medium",ppeRequired:["Hard Hat","Safety Vest"],notes:""}]}));
  const upd=(i,k,v)=>setData(p=>{const a=[...p.areas];a[i]={...a[i],[k]:v};return{...p,areas:a}});
  const del=i=>setData(p=>({...p,areas:p.areas.filter((_,j)=>j!==i)}));
  const togglePPE=(i,ppe)=>setData(p=>{
    const a=[...p.areas];const cur=a[i].ppeRequired||[];
    a[i]={...a[i],ppeRequired:cur.includes(ppe)?cur.filter(x=>x!==ppe):[...cur,ppe]};
    return{...p,areas:a};
  });

  return (
    <div style={{animation:"fadeUp .4s ease"}}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:24}}>
        <div>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:32,letterSpacing:3,color:T.white}}>MONITORING ZONES</div>
          <div style={{fontSize:13,color:T.g2,marginTop:4}}>Define areas inside your plant. Each zone gets its own PPE rules and alert thresholds.</div>
        </div>
        <Btn onClick={add} variant="teal">+ Add Zone</Btn>
      </div>

      {data.areas.length===0&&(
        <div style={{textAlign:"center",padding:"50px 20px",background:T.card,border:`2px dashed ${T.border}`,borderRadius:16,color:T.g2}}>
          <div style={{fontSize:36,marginBottom:12}}>📍</div>
          <div style={{fontSize:15,fontWeight:700,color:T.g1,marginBottom:8}}>No zones added yet</div>
          <div style={{fontSize:13,marginBottom:20}}>Add zones like "Welding Bay", "Assembly Line A", "Paint Shop"</div>
          <Btn onClick={add} variant="primary">+ Add First Zone</Btn>
        </div>
      )}

      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        {data.areas.map((area,i)=>(
          <div key={area.id} style={{background:T.card,border:`1.5px solid ${T.border}`,borderRadius:14,overflow:"hidden"}}>
            <div style={{background:T.card2,padding:"10px 16px",display:"flex",alignItems:"center",gap:12,borderBottom:`1px solid ${T.border}`}}>
              <div style={{width:30,height:30,borderRadius:"50%",background:"rgba(255,91,24,.15)",border:`1.5px solid ${T.orange}`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Mono',monospace",fontSize:14,color:T.orange,fontWeight:700}}>{i+1}</div>
              <div style={{flex:1,fontWeight:700,color:area.name?T.white:T.g2,fontSize:14}}>{area.name||`Zone ${i+1}`}</div>
              <button onClick={()=>del(i)} style={{background:"transparent",border:"none",color:T.g2,cursor:"pointer",fontSize:15}}>✕</button>
            </div>
            <div style={{padding:16}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14,marginBottom:14}}>
                <Field label="Zone Name" req>
                  {inp(area.name,v=>upd(i,"name",v),{placeholder:"e.g. Welding Zone B"})}
                </Field>
                <Field label="Zone Type" req>
                  {sel(area.type,v=>upd(i,"type",v),TYPES,"Select type…")}
                </Field>
                <Field label="Risk Level">
                  {sel(area.riskLevel,v=>upd(i,"riskLevel",v),RISKS,"Select…")}
                </Field>
              </div>
              <div style={{marginBottom:8}}>
                <Lbl>Mandatory PPE for This Zone</Lbl>
                <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                  {PPE_OPTIONS.map(ppe=>{
                    const on=area.ppeRequired?.includes(ppe);
                    return (
                      <div key={ppe} onClick={()=>togglePPE(i,ppe)}
                        style={{padding:"5px 12px",borderRadius:20,fontSize:12,fontWeight:600,cursor:"pointer",
                        border:`1.5px solid ${on?T.orange:T.border}`,
                        background:on?"rgba(255,91,24,.12)":T.card2,
                        color:on?T.orange:T.g2,transition:"all .15s"}}>
                        {ppe}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {data.areas.length>0&&(
        <div style={{marginTop:14,textAlign:"center"}}>
          <Btn onClick={add} variant="ghost">+ Add Another Zone</Btn>
        </div>
      )}
    </div>
  );
}

// ── STEP 3: CAMERAS ────────────────────────────────────────
function CameraStep({data, setData, areas, camLimit}) {
  const PROTOCOLS=["RTSP","ONVIF","HTTP MJPEG"];

  const add=(areaId,areaName)=>{
    if(data.cameras.length>=camLimit){return;}
    setData(p=>({...p,cameras:[...p.cameras,{
      id:Date.now(),areaId,areaName,
      camId:"",location:"",protocol:"RTSP",rtspUrl:"",
      ipAddress:"",port:"554",username:"admin",password:"",
      detectHelmet:true,detectVest:true,detectBoots:false,
      detectEye:false,detectGloves:false,
    }]}));
  };
  const upd=(i,k,v)=>setData(p=>{const c=[...p.cameras];c[i]={...c[i],[k]:v};return{...p,cameras:c}});
  const del=i=>setData(p=>({...p,cameras:p.cameras.filter((_,j)=>j!==i)}));

  return (
    <div style={{animation:"fadeUp .4s ease"}}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:24}}>
        <div>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:32,letterSpacing:3,color:T.white}}>CAMERA SETUP</div>
          <div style={{fontSize:13,color:T.g2,marginTop:4}}>Add cameras to each zone. You can add up to <strong style={{color:T.orange}}>{camLimit}</strong> cameras on your plan.</div>
        </div>
        <div style={{background:T.card2,border:`1px solid ${T.border}`,borderRadius:10,padding:"8px 16px",textAlign:"center"}}>
          <div style={{fontFamily:"'DM Mono',monospace",fontSize:22,color:T.orange}}>{data.cameras.length}<span style={{fontSize:14,color:T.g2}}>/{camLimit}</span></div>
          <div style={{fontSize:10,color:T.g2}}>CAMERAS ADDED</div>
        </div>
      </div>

      {areas.length===0&&(
        <div style={{textAlign:"center",padding:"30px",background:T.card,border:`2px dashed ${T.border}`,borderRadius:16,color:T.g2,fontSize:13}}>
          ⬅ Go back and add at least one zone first
        </div>
      )}

      {areas.map(area=>(
        <div key={area.id} style={{marginBottom:22}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10,
            padding:"10px 14px",background:"rgba(255,91,24,.07)",border:"1px solid rgba(255,91,24,.2)",borderRadius:10}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:16}}>📍</span>
              <span style={{fontWeight:700,color:T.orange,fontSize:14}}>{area.name}</span>
              <span style={{fontSize:11,color:T.g2}}>{area.type}</span>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:11,color:T.g2,fontFamily:"'DM Mono',monospace"}}>
                {data.cameras.filter(c=>c.areaId===area.id).length} cam(s)
              </span>
              {data.cameras.length<camLimit&&(
                <Btn onClick={()=>add(area.id,area.name)} variant="teal" style={{padding:"6px 12px",fontSize:12}}>+ Add Camera</Btn>
              )}
            </div>
          </div>

          {data.cameras.filter(c=>c.areaId===area.id).map((cam)=>{
            const ci=data.cameras.findIndex(c=>c.id===cam.id);
            return (
              <div key={cam.id} style={{background:T.card,border:`1.5px solid ${T.border}`,borderRadius:12,marginBottom:10,overflow:"hidden"}}>
                <div style={{background:T.card2,padding:"9px 14px",display:"flex",alignItems:"center",gap:10,borderBottom:`1px solid ${T.border}`}}>
                  <span style={{fontSize:14}}>📹</span>
                  <span style={{flex:1,fontWeight:700,fontSize:13,color:cam.camId?T.white:T.g2,fontFamily:cam.camId?"'DM Mono',monospace":"'Nunito',sans-serif"}}>
                    {cam.camId||"Enter Camera ID below"}
                  </span>
                  <button onClick={()=>del(ci)} style={{background:"transparent",border:"none",color:T.g2,cursor:"pointer",fontSize:14}}>✕</button>
                </div>
                <div style={{padding:14}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:12}}>
                    <Field label="Camera ID / Label" req hint="e.g. CAM-01">
                      {inp(cam.camId,v=>upd(ci,"camId",v),{placeholder:"CAM-01",style:{fontFamily:"'DM Mono',monospace"}})}
                    </Field>
                    <Field label="Location Description">
                      {inp(cam.location,v=>upd(ci,"location",v),{placeholder:"North wall, Bay 3, 4m height"})}
                    </Field>
                  </div>
                  <div style={{background:T.card2,borderRadius:10,padding:12,marginBottom:12}}>
                    <div style={{fontSize:11,fontWeight:700,color:T.teal,textTransform:"uppercase",letterSpacing:2,marginBottom:10,fontFamily:"'DM Mono',monospace"}}>Network / Stream</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:10,marginBottom:10}}>
                      <Field label="IP Address">
                        {inp(cam.ipAddress,v=>upd(ci,"ipAddress",v),{placeholder:"192.168.1.101",style:{fontFamily:"'DM Mono',monospace"}})}
                      </Field>
                      <Field label="Port">
                        {inp(cam.port,v=>upd(ci,"port",v),{placeholder:"554",style:{fontFamily:"'DM Mono',monospace"}})}
                      </Field>
                      <Field label="Protocol">
                        {sel(cam.protocol,v=>upd(ci,"protocol",v),PROTOCOLS)}
                      </Field>
                      <Field label="Username">
                        {inp(cam.username,v=>upd(ci,"username",v),{placeholder:"admin",style:{fontFamily:"'DM Mono',monospace"}})}
                      </Field>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                      <Field label="Password">
                        {inp(cam.password,v=>upd(ci,"password",v),{type:"password",placeholder:"••••••••"})}
                      </Field>
                      <Field label="RTSP URL" hint="Auto-built from IP if blank">
                        {inp(cam.rtspUrl,v=>upd(ci,"rtspUrl",v),{placeholder:`rtsp://${cam.ipAddress||"192.168.x.x"}:${cam.port||554}/stream1`,style:{fontFamily:"'DM Mono',monospace",fontSize:12}})}
                      </Field>
                    </div>
                  </div>
                  <div>
                    <Lbl>PPE Detection Rules</Lbl>
                    <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                      {[
                        {k:"detectHelmet",l:"Hard Hat"},
                        {k:"detectVest",l:"Safety Vest"},
                        {k:"detectBoots",l:"Safety Boots"},
                        {k:"detectEye",l:"Eye Protection"},
                        {k:"detectGloves",l:"Gloves"},
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
                </div>
              </div>
            );
          })}

          {data.cameras.filter(c=>c.areaId===area.id).length===0&&data.cameras.length<camLimit&&(
            <div onClick={()=>add(area.id,area.name)}
              style={{border:`2px dashed ${T.border}`,borderRadius:12,padding:"18px",textAlign:"center",
              color:T.g2,cursor:"pointer",fontSize:13}}
              onMouseEnter={e=>e.currentTarget.style.borderColor=T.teal}
              onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>
              📹 Click to add a camera to <strong>{area.name}</strong>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── STEP 4: REVIEW & ACTIVATE ──────────────────────────────
function ReviewStep({plant, areas, cameras, onActivate, saving}) {
  return (
    <div style={{animation:"fadeUp .4s ease"}}>
      <div style={{marginBottom:24}}>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:32,letterSpacing:3,color:T.white}}>REVIEW & ACTIVATE</div>
        <div style={{fontSize:13,color:T.g2,marginTop:4}}>Everything look right? Hit Activate and we'll connect your cameras and start monitoring.</div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBottom:24}}>
        {[
          {icon:"🏭",label:"Plant",value:plant.plantName||"—",c:T.orange},
          {icon:"📍",label:"Zones",value:areas.length,c:T.teal},
          {icon:"📹",label:"Cameras",value:cameras.length,c:T.blue},
        ].map(s=>(
          <div key={s.label} style={{background:T.card,border:`1.5px solid ${T.border}`,borderRadius:12,padding:18,textAlign:"center",position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:s.c}}/>
            <div style={{fontSize:26,marginBottom:6}}>{s.icon}</div>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:26,color:s.c}}>{s.value}</div>
            <div style={{fontSize:11,color:T.g2,textTransform:"uppercase",letterSpacing:1.5}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Plant summary */}
      <div style={{background:T.card,border:`1.5px solid ${T.border}`,borderRadius:14,padding:18,marginBottom:16}}>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:16,letterSpacing:2,color:T.orange,marginBottom:14}}>PLANT DETAILS</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {[
            ["Plant Name",plant.plantName],["City / State",[plant.city,plant.state].filter(Boolean).join(", ")],
            ["Factory Licence",plant.licNo||"—"],["HSE Mobile",plant.hseMobile||"—"],
            ["Workers",plant.workers||"—"],["Occupier",plant.occupier||"—"],
          ].map(([l,v])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${T.g3}`,fontSize:13}}>
              <span style={{color:T.g2}}>{l}</span>
              <span style={{color:T.white}}>{v||"—"}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Areas summary */}
      <div style={{background:T.card,border:`1.5px solid ${T.border}`,borderRadius:14,padding:18,marginBottom:16}}>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:16,letterSpacing:2,color:T.teal,marginBottom:14}}>ZONES ({areas.length})</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
          {areas.map((a,i)=>(
            <div key={i} style={{background:T.card2,border:`1px solid ${T.border}`,borderRadius:10,padding:10}}>
              <div style={{fontWeight:700,color:T.white,fontSize:13,marginBottom:3}}>{a.name}</div>
              <div style={{fontSize:11,color:T.g2,marginBottom:6}}>{a.type}</div>
              <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                {(a.ppeRequired||[]).slice(0,3).map(p=>(
                  <span key={p} style={{fontSize:9,padding:"1px 6px",borderRadius:8,background:"rgba(255,91,24,.1)",color:T.orange}}>{p}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cameras summary */}
      {cameras.length>0&&(
        <div style={{background:T.card,border:`1.5px solid ${T.border}`,borderRadius:14,padding:18,marginBottom:24}}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:16,letterSpacing:2,color:T.blue,marginBottom:14}}>CAMERAS ({cameras.length})</div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {cameras.map((c,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"8px 12px",background:T.card2,borderRadius:8,fontSize:12}}>
                <span style={{color:T.orange,fontFamily:"'DM Mono',monospace",minWidth:70}}>{c.camId||`CAM-${i+1}`}</span>
                <span style={{color:T.g2,flex:1}}>{c.areaName} — {c.location||"No location set"}</span>
                <span style={{color:T.g2,fontFamily:"'DM Mono',monospace"}}>{c.ipAddress||"No IP"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{background:"linear-gradient(135deg,rgba(255,91,24,.1),rgba(0,212,180,.08))",
        border:`1.5px solid ${T.orange}`,borderRadius:16,padding:24,textAlign:"center"}}>
        <div style={{fontSize:28,marginBottom:10}}>🚀</div>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:24,letterSpacing:2,marginBottom:8}}>READY TO GO LIVE</div>
        <div style={{fontSize:13,color:T.g1,marginBottom:20,maxWidth:440,margin:"0 auto 20px"}}>
          SafeguardIQ Enterprise will connect to your cameras, run a connection test, and begin real-time PPE monitoring.
        </div>
        <Btn onClick={onActivate} disabled={saving} variant="primary" style={{padding:"14px 40px",fontSize:16,margin:"0 auto"}}>
          {saving
            ? <><div style={{width:18,height:18,border:"2px solid rgba(255,255,255,.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin .8s linear infinite"}}/>Activating…</>
            : "✅ Activate SafeguardIQ Enterprise →"
          }
        </Btn>
      </div>
    </div>
  );
}

// ── SUCCESS ────────────────────────────────────────────────
function SuccessScreen({plant, areas, cameras}) {
  const navigate = useNavigate();
  return (
    <div style={{textAlign:"center",padding:"40px 20px",animation:"fadeUp .5s ease"}}>
      <div style={{width:80,height:80,borderRadius:"50%",background:"rgba(34,212,104,.12)",
        border:`3px solid ${T.green}`,display:"flex",alignItems:"center",justifyContent:"center",
        fontSize:36,margin:"0 auto 24px",animation:"checkPop .5s ease .2s both"}}>✓</div>
      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:38,letterSpacing:3,color:T.green,marginBottom:8}}>
        YOU'RE LIVE!
      </div>
      <div style={{fontSize:15,color:T.g1,marginBottom:32,maxWidth:480,margin:"0 auto 32px"}}>
        <strong style={{color:T.white}}>{plant.plantName}</strong> is now being monitored.<br/>
        {cameras.length} camera(s) across {areas.length} zone(s) are connecting…
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,maxWidth:540,margin:"0 auto 32px"}}>
        {[
          {icon:"📹",label:"Cameras Connecting",value:cameras.length,c:T.teal},
          {icon:"📍",label:"Zones Active",value:areas.length,c:T.blue},
          {icon:"🤖",label:"AI Detection",value:"Starting…",c:T.orange},
        ].map(s=>(
          <div key={s.label} style={{background:T.card,border:`1.5px solid ${T.border}`,borderRadius:12,padding:16}}>
            <div style={{fontSize:22,marginBottom:6}}>{s.icon}</div>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:22,color:s.c}}>{s.value}</div>
            <div style={{fontSize:11,color:T.g2}}>{s.label}</div>
          </div>
        ))}
      </div>
      <Btn onClick={()=>navigate("/dashboard")} variant="primary" style={{padding:"14px 40px",fontSize:16,margin:"0 auto"}}>
        → Go to Dashboard
      </Btn>
    </div>
  );
}

// ── MAIN ───────────────────────────────────────────────────
export default function PostPaymentOnboarding() {
  const navigate  = useNavigate();
  const token     = localStorage.getItem("safeg_token") || "";
  const camLimit  = parseInt(localStorage.getItem("safeg_cam_limit")) || 4;

  const [step,    setStep]    = useState("plant");
  const [done,    setDone]    = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [toasts,  setToasts]  = useState([]);

  const [plant,   setPlant]   = useState({plantName:"",licNo:"",city:"",state:"",workers:"",hseName:"",hseMobile:"",occupier:"",inspectorOffice:""});
  const [areaData,setAreaData]= useState({areas:[]});
  const [camData, setCamData] = useState({cameras:[]});

  // Redirect if not logged in
  useEffect(()=>{
    if(!token) navigate("/login");
  },[token]);

  const toast=(msg,type="success")=>{
    const id=Date.now();
    setToasts(p=>[...p,{id,msg,type}]);
  };
  const removeToast=id=>setToasts(p=>p.filter(t=>t.id!==id));

  const ORDER=["plant","area","camera","review"];
  const ci=ORDER.indexOf(step);

  const validate=()=>{
    if(step==="plant"){
      if(!plant.plantName){toast("Plant name is required","error");return false;}
      if(!plant.city){toast("City is required","error");return false;}
      if(!plant.state){toast("State is required","error");return false;}
    }
    if(step==="area"){
      if(areaData.areas.length===0){toast("Add at least one zone","error");return false;}
      for(const a of areaData.areas){
        if(!a.name){toast("Each zone needs a name","error");return false;}
      }
    }
    return true;
  };

  const next=()=>{
    if(!validate()) return;
    if(ci<ORDER.length-1) setStep(ORDER[ci+1]);
  };
  const prev=()=>{ if(ci>0) setStep(ORDER[ci-1]); };

  const activate=async()=>{
    setSaving(true);
    try {
      // Build payload matching auth.controller.js register format
      const payload = {
        plants: [{
          plant_name:       plant.plantName,
          city:             plant.city,
          state:            plant.state,
          factory_licence_no: plant.licNo||null,
          workers:          plant.workers||null,
          hse_name:         plant.hseName||null,
          hse_mobile:       plant.hseMobile||null,
          occupier_name:    plant.occupier||null,
          inspector_office: plant.inspectorOffice||null,
        }],
        zones: areaData.areas.map(a=>({
          area_name:    a.name,
          zone_type:    a.type||"Other",
          hazard_level: a.riskLevel||"Medium",
          ppe_required: a.ppeRequired||[],
        })),
        cameras: camData.cameras.map(c=>({
          cam_label:      c.camId,
          cam_code:       c.camId,
          rtsp_url:       c.rtspUrl || (c.ipAddress ? `rtsp://${c.username||"admin"}:${c.password||""}@${c.ipAddress}:${c.port||554}/stream1` : ""),
          ip_address:     c.ipAddress||null,
          port:           parseInt(c.port)||554,
          stream_protocol:c.protocol||"RTSP",
          area_name:      c.areaName,
          detect_helmet:  c.detectHelmet||true,
          detect_vest:    c.detectVest||true,
          detect_gloves:  c.detectGloves||false,
          detect_eye:     c.detectEye||false,
          detect_boots:   c.detectBoots||false,
          status:         "active",
        })),
      };

      await axios.post("/api/v1/plants/setup", payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Update whatsapp number if HSE mobile provided
      if(plant.hseMobile){
        await axios.patch("/api/v1/auth/update-profile", {
          whatsapp: plant.hseMobile,
          whatsappOptIn: true,
        }, { headers: { Authorization: `Bearer ${token}` } }).catch(()=>{});
      }

      toast("Plant setup complete! Cameras connecting…","success");
      setTimeout(()=>setDone(true), 800);
    } catch(e){
      const msg = e.response?.data?.message || e.message || "Setup failed";
      toast(msg,"error");
    } finally {
      setSaving(false);
    }
  };

  const progress=((ci/(ORDER.length-1))*100).toFixed(0);

  return (
    <>
      <style>{G}</style>

      {/* Top bar */}
      <div style={{background:T.bg2,borderBottom:`1px solid ${T.border}`,padding:"0 28px",height:54,
        display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:32,height:32,background:T.orange,clipPath:"polygon(50% 0%,100% 20%,100% 60%,50% 100%,0% 60%,0% 20%)",
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:"#fff",fontWeight:700}}>✓</div>
          <div>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,letterSpacing:3}}>SafeguardIQ Enterprise</div>
            <div style={{fontSize:9,color:T.g2,letterSpacing:3,fontFamily:"'DM Mono',monospace",textTransform:"uppercase"}}>Plant Setup</div>
          </div>
        </div>
        {!done&&(
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:160,height:4,background:T.g3,borderRadius:4,overflow:"hidden"}}>
              <div style={{height:"100%",background:T.orange,width:progress+"%",transition:"width .4s",borderRadius:4}}/>
            </div>
            <div style={{fontSize:11,color:T.g2,fontFamily:"'DM Mono',monospace"}}>{progress}%</div>
          </div>
        )}
        <button onClick={()=>navigate("/dashboard")}
          style={{background:"transparent",border:`1px solid ${T.border}`,borderRadius:8,
          padding:"7px 14px",color:T.g2,fontSize:12,cursor:"pointer",fontFamily:"'Nunito',sans-serif"}}>
          Skip for now →
        </button>
      </div>

      {/* Welcome banner — shown only on first step */}
      {step==="plant"&&!done&&(
        <div style={{background:"linear-gradient(135deg,rgba(255,91,24,.12),rgba(0,212,180,.06))",
          borderBottom:`1px solid rgba(255,91,24,.2)`,padding:"16px 28px",textAlign:"center"}}>
          <div style={{fontSize:15,fontWeight:700,color:T.white,marginBottom:4}}>
            🎉 Payment successful — let's set up your plant
          </div>
          <div style={{fontSize:13,color:T.g1}}>
            Takes about 3 minutes. You can always update these details later from Settings.
          </div>
        </div>
      )}

      <div style={{maxWidth:960,margin:"0 auto",padding:"28px 24px"}}>
        {done ? (
          <SuccessScreen plant={plant} areas={areaData.areas} cameras={camData.cameras}/>
        ) : (
          <>
            <Stepper current={step}/>
            <div style={{background:T.bg3,border:`1.5px solid ${T.border}`,borderRadius:20,padding:28,minHeight:400}}>
              {step==="plant"  && <PlantStep  data={plant}   setData={setPlant}/>}
              {step==="area"   && <AreaStep   data={areaData} setData={setAreaData}/>}
              {step==="camera" && <CameraStep data={camData}  setData={setCamData} areas={areaData.areas} camLimit={camLimit}/>}
              {step==="review" && <ReviewStep plant={plant} areas={areaData.areas} cameras={camData.cameras} onActivate={activate} saving={saving}/>}
            </div>
            {step!=="review"&&(
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:20}}>
                <Btn onClick={prev} variant="ghost" disabled={ci===0}>← Back</Btn>
                <Btn onClick={next} variant="primary">
                  {ci===ORDER.length-2?"Review →":"Continue →"}
                </Btn>
              </div>
            )}
            {step==="review"&&(
              <div style={{marginTop:16,textAlign:"center"}}>
                <button onClick={prev} style={{background:"none",border:"none",color:T.g2,fontSize:13,cursor:"pointer"}}>
                  ← Back to edit
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <div style={{position:"fixed",bottom:24,right:24,zIndex:9999,display:"flex",flexDirection:"column",gap:8}}>
        {toasts.map(t=><Toast key={t.id} {...t} onDone={()=>removeToast(t.id)}/>)}
      </div>
    </>
  );
}
