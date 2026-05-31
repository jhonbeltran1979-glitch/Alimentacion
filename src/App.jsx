import { useState, useEffect, useRef } from "react";

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxuSWQvUB377F-BA0M-LuHXPzBG1qDNPmv6ZbVM5nG744ZVsEDzN6ko_bsRZo6ewI1SIg/exec";
const _k = ["sk-ant-api03-7i2NPrcTcVD3IKU8SQNmhf","VsoSQ1O0-ftZSVI3LfT_XZCxGkdRlw_0y29QO8LP","WCsuswtJwHxVoCJodbVaiSTw-PQ2ULwAA"];
let CLAUDE_API_KEY = _k.join("");

// ─── PÍLDORAS ────────────────────────────────────────────────────────────────
const PILDORAS = [
  "El aguacate tiene grasas que ayudan a tu cerebro a procesar información más rápido.",
  "Comer legumbres 3 veces/semana reduce el riesgo cardiovascular en 22%.",
  "El brócoli contiene sulforafano, uno de los compuestos anticancerígenos más potentes.",
  "Tomar agua antes de comer reduce la ingesta calórica hasta un 13%.",
  "La espinaca cruda tiene más hierro disponible que cocida.",
  "El huevo es la proteína de mayor calidad biológica disponible.",
  "Las nueces mejoran la memoria por su Omega-3 y vitamina E.",
  "El kiwi antes de dormir mejora la calidad del sueño por su serotonina.",
  "Dormir menos de 7 horas aumenta el apetito por azúcares al día siguiente.",
  "Comer lento (20+ min) permite que el cerebro registre la saciedad.",
];

const IDENTITY_MSGS = [
  (n,s) => `¡Eres el tipo de persona que cuida su salud, ${n}! Score ${s}%`,
  (n,s) => `Cada registro es un voto por tu mejor versión, ${n}.`,
  (n,s) => `Con ${s}% de score, tu cuerpo te lo agradecerá, ${n}.`,
  (n,s) => `¡Increíble decisión, ${n}! ${s}% más cerca de tu meta.`,
];

const BADGES = [
  { id:"racha3",   icon:"🔥", nombre:"En racha",    desc:"3 días seguidos",   check:(s)=>s.streak>=3 },
  { id:"racha7",   icon:"⭐", nombre:"Una semana",   desc:"7 días seguidos",   check:(s)=>s.streak>=7 },
  { id:"racha30",  icon:"🏆", nombre:"Mes campeón",  desc:"30 días seguidos",  check:(s)=>s.streak>=30 },
  { id:"agua",     icon:"💧", nombre:"Hidratado",    desc:"Meta agua cumplida",check:(s)=>s.water>=8 },
  { id:"verde",    icon:"🥗", nombre:"Plato verde",  desc:"Score +70%",        check:(s)=>s.lastScore>=70 },
  { id:"variedad", icon:"🌈", nombre:"Arcoíris",     desc:"5+ categorías",     check:(s)=>s.lastCats>=5 },
  { id:"pro",      icon:"💪", nombre:"Proteína Pro", desc:"Proteínas 3 comidas",check:(s,h)=>(h||[]).filter(r=>(Array.isArray(r.alimentos)?r.alimentos:[]).some(a=>["Pollo","Res","Huevo","Atún","Salmón","Tofu","Lentejas"].includes(a))).length>=3 },
  { id:"constante",icon:"📅", nombre:"Constante",   desc:"10 registros",      check:(s,h)=>(h||[]).length>=10 },
];

const getNivel = (streak, total) => {
  if (streak>=30||total>=50) return { nivel:"Maestro del Bienestar", icon:"🧘", color:"#FFD700", bg:"#FFD70022" };
  if (streak>=7 ||total>=20) return { nivel:"Guerrero Vital",        icon:"⚔️", color:"#00d4aa", bg:"#00d4aa22" };
  if (streak>=3 ||total>=5)  return { nivel:"Explorador Saludable",  icon:"🌱", color:"#7C4DFF", bg:"#7C4DFF22" };
  return { nivel:"Principiante", icon:"🌟", color:"#90A4AE", bg:"#90A4AE22" };
};

const NUTRIENT_MAP = {
  "Vitamina C":   { immunity:30,energy:10,focus:5,vitality:15 },
  "Zinc":         { immunity:25,energy:5,focus:10,vitality:10 },
  "Vitamina D":   { immunity:20,energy:15,focus:10,vitality:20 },
  "Vitamina A":   { immunity:20,energy:5,focus:5,vitality:10 },
  "Hierro":       { immunity:10,energy:30,focus:15,vitality:20 },
  "Omega-3":      { immunity:15,energy:10,focus:30,vitality:20 },
  "Magnesio":     { immunity:10,energy:20,focus:20,vitality:25 },
  "Vitamina B12": { immunity:5,energy:25,focus:20,vitality:15 },
  "Probióticos":  { immunity:25,energy:5,focus:5,vitality:15 },
  "Antioxidantes":{ immunity:20,energy:10,focus:10,vitality:20 },
  "Proteína":     { immunity:10,energy:20,focus:10,vitality:30 },
  "Fibra":        { immunity:15,energy:10,focus:5,vitality:20 },
  "Calcio":       { immunity:5,energy:10,focus:5,vitality:25 },
  "Potasio":      { immunity:5,energy:20,focus:5,vitality:20 },
};

const FOOD_CATEGORIES = {
  "🥦 Verduras":    { color:"#2E7D32", light:"#E8F5E9", items:["Brócoli","Espinaca","Kale","Zanahoria","Tomate","Pimentón","Ajo","Champiñones","Aguacate","Repollo","Lechuga","Acelga","Cebolla","Remolacha"], nutrients:["Vitamina C","Vitamina A","Fibra","Antioxidantes","Hierro"] },
  "🍎 Frutas":      { color:"#C62828", light:"#FFEBEE", items:["Naranja","Mango","Papaya","Banano","Fresas","Arándanos","Guayaba","Maracuyá","Piña","Manzana","Uvas","Kiwi"], nutrients:["Vitamina C","Antioxidantes","Fibra","Potasio"] },
  "🥩 Proteínas":   { color:"#BF360C", light:"#FBE9E7", items:["Pollo","Res","Cerdo","Huevo","Atún","Sardinas","Salmón","Tofu","Lentejas","Fríjoles","Garbanzo"], nutrients:["Proteína","Hierro","Vitamina B12","Zinc","Omega-3"] },
  "🥛 Lácteos":     { color:"#1565C0", light:"#E3F2FD", items:["Leche","Yogur","Queso","Kéfir","Kumis"], nutrients:["Calcio","Vitamina D","Probióticos","Proteína"] },
  "🌾 Granos":      { color:"#F57F17", light:"#FFF8E1", items:["Arroz","Avena","Quinoa","Pasta","Pan integral","Maíz","Cebada","Plátano","Yuca","Papa"], nutrients:["Fibra","Magnesio","Vitamina B12","Proteína"] },
  "🥜 Frutos secos":{ color:"#4E342E", light:"#EFEBE9", items:["Almendras","Nueces","Maní","Marañón","Chía","Linaza","Ajonjolí"], nutrients:["Omega-3","Magnesio","Proteína","Calcio"] },
  "💧 Bebidas":     { color:"#0277BD", light:"#E1F5FE", items:["Agua","Jugo natural","Té verde","Café","Leche vegetal"], nutrients:["Antioxidantes"] },
};

const MEALS = [
  { label:"Desayuno", icon:"☀️", color:"#F57F17" },
  { label:"Almuerzo", icon:"🌤️", color:"#2E7D32" },
  { label:"Cena",     icon:"🌙", color:"#1A237E" },
  { label:"Merienda", icon:"🍎", color:"#C62828" },
];
const WATER_GOAL = 8;

function calcScores(sel) {
  const totals = { immunity:0, energy:0, focus:0, vitality:0 };
  const found = new Set(); let cats = 0;
  Object.entries(FOOD_CATEGORIES).forEach(([,c]) => {
    if (c.items.some(i=>sel.includes(i))) {
      cats++;
      c.nutrients.forEach(n=>{ if(NUTRIENT_MAP[n]&&!found.has(n)){ found.add(n); Object.keys(totals).forEach(k=>{totals[k]+=(NUTRIENT_MAP[n][k]||0);}); } });
    }
  });
  const cap=v=>Math.min(100,Math.round(v));
  return { immunity:cap(totals.immunity),energy:cap(totals.energy),focus:cap(totals.focus),vitality:cap(totals.vitality),total:cap((totals.immunity+totals.energy+totals.focus+totals.vitality)/4),nutrients:[...found],cats };
}

async function apiGet(params) {
  const res = await fetch(`${APPS_SCRIPT_URL}?${new URLSearchParams(params)}`,{redirect:"follow"});
  try{ return JSON.parse(await res.text()); }catch(_){ return {ok:false}; }
}

async function analizarTexto(alimentos, hp) {
  const ctx = hp?`Usuario: ${hp.edad} años, actividad "${hp.ejercicio}", condición "${hp.enfermedad}".`:"";
  const res = await fetch("https://api.anthropic.com/v1/messages",{
    method:"POST",headers:{"Content-Type":"application/json","x-api-key":CLAUDE_API_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
    body:JSON.stringify({model:"claude-opus-4-5",max_tokens:600,messages:[{role:"user",content:`Nutricionista experto. ${ctx}\nAlimentos: ${alimentos.join(", ")}.\nJSON sin backticks:\n{"recomendacion":"consejo personalizado 3 oraciones","semaforo":"verde|amarillo|rojo","calorias_aprox":"X kcal","faltantes":["nutrientes faltantes"]}`}]})
  });
  const d=await res.json();
  if(d.error)throw new Error(d.error.message);
  return JSON.parse(d.content[0].text.trim().replace(/```json|```/g,"").trim());
}

async function analizarFoto(b64,type,hp) {
  const ctx = hp?`Usuario: ${hp.edad} años, actividad "${hp.ejercicio}", condición "${hp.enfermedad}".`:"";
  const res = await fetch("https://api.anthropic.com/v1/messages",{
    method:"POST",headers:{"Content-Type":"application/json","x-api-key":CLAUDE_API_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
    body:JSON.stringify({model:"claude-opus-4-5",max_tokens:700,messages:[{role:"user",content:[
      {type:"image",source:{type:"base64",media_type:type,data:b64}},
      {type:"text",text:`Nutricionista experto. ${ctx}\nDistingue tubérculos. JSON sin backticks:\n{"alimentos":[{"nombre":"X","porcion":"Xg","confianza":"alta|media|baja"}],"recomendacion":"consejo 2 oraciones","semaforo":"verde|amarillo|rojo","calorias_aprox":"X kcal"}`}
    ]}]})
  });
  const d=await res.json();
  if(d.error)throw new Error(d.error.message);
  return JSON.parse(d.content[0].text.trim().replace(/```json|```/g,"").trim());
}

const sk=(p,k)=>`vt_${p}_${k}`;

// ══ CONFETI ═══════════════════════════════════════════════════════════════════
function Confeti({onDone}){
  useEffect(()=>{const t=setTimeout(onDone,2500);return()=>clearTimeout(t);},[]);
  return(
    <div style={{position:"fixed",top:0,left:0,width:"100%",height:"100%",pointerEvents:"none",zIndex:9999,overflow:"hidden"}}>
      {Array.from({length:24},(_,i)=>(
        <div key={i} style={{position:"absolute",left:`${Math.random()*100}%`,top:"-12px",width:10,height:10,borderRadius:Math.random()>.5?"50%":2,background:["#FFD700","#FF6B9D","#00D4AA","#7C4DFF","#FF6B00"][Math.floor(Math.random()*5)],animation:`fall ${.8+Math.random()*1.4}s ease-in ${Math.random()*.4}s forwards`}}/>
      ))}
      <style>{`@keyframes fall{to{transform:translateY(110vh) rotate(540deg);opacity:0}}`}</style>
    </div>
  );
}

// ══ TOAST ═════════════════════════════════════════════════════════════════════
function Toast({icon,title,sub,color,onClose}){
  useEffect(()=>{const t=setTimeout(onClose,4000);return()=>clearTimeout(t);},[]);
  return(
    <div style={{position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",zIndex:998,background:"#1C1C2E",borderRadius:16,padding:"12px 18px",display:"flex",alignItems:"center",gap:12,boxShadow:`0 4px 24px ${color}55`,maxWidth:320,width:"92%",border:`1px solid ${color}44`}}>
      <div style={{fontSize:30}}>{icon}</div>
      <div style={{flex:1}}>
        <div style={{color:"#fff",fontWeight:700,fontSize:13}}>{title}</div>
        <div style={{color:"#aaa",fontSize:11,marginTop:2}}>{sub}</div>
      </div>
      <button onClick={onClose} style={{background:"transparent",border:"none",color:"#666",cursor:"pointer",fontSize:16}}>✕</button>
    </div>
  );
}

// ══ ONBOARDING NOMBRE ════════════════════════════════════════════════════════
function ProfileScreen({onEnter}){
  const [name,setName]=useState("");const [loading,setLoading]=useState(false);const [err,setErr]=useState("");
  const ref=useRef();useEffect(()=>{setTimeout(()=>ref.current?.focus(),300);},[]);
  const go=async()=>{
    const t=name.trim();
    if(!t||t.length<2){setErr("Mínimo 2 caracteres");return;}
    setLoading(true);
    localStorage.setItem("vt_perfil_actual",t);
    try{await apiGet({action:"historial",perfil:t});}catch(_){}
    setLoading(false);onEnter(t);
  };
  return(
    <div style={{minHeight:"100vh",background:"#0A0A14",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      {/* Logo */}
      <div style={{marginBottom:40,textAlign:"center"}}>
        <div style={{width:80,height:80,borderRadius:24,background:"linear-gradient(135deg,#7C4DFF,#FF6B9D)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:40,margin:"0 auto 16px",boxShadow:"0 8px 32px #7C4DFF55"}}>🥗</div>
        <div style={{color:"#fff",fontSize:28,fontWeight:800,letterSpacing:-1}}>VitalTrack</div>
        <div style={{color:"#666",fontSize:13,marginTop:4}}>Tu guía nutricional personalizada con IA</div>
      </div>
      {/* Card */}
      <div style={{background:"#13131F",borderRadius:24,padding:28,width:"100%",maxWidth:380,border:"1px solid #2A2A3E"}}>
        <div style={{color:"#fff",fontSize:15,fontWeight:700,marginBottom:12}}>¿Cómo te llamas?</div>
        <input ref={ref} value={name} onChange={e=>{setName(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&go()}
          placeholder="Ej: María, Jhon, Catalina..."
          style={{width:"100%",padding:"14px 16px",borderRadius:12,background:"#1E1E30",border:`1.5px solid ${err?"#FF4757":"#2A2A3E"}`,color:"#fff",fontSize:16,outline:"none",boxSizing:"border-box",marginBottom:8}}/>
        {err&&<div style={{color:"#FF4757",fontSize:12,marginBottom:8}}>{err}</div>}
        <div style={{color:"#555",fontSize:12,marginBottom:20,lineHeight:1.6}}>Tus registros quedarán en una pestaña propia del Google Sheet del grupo.</div>
        <button onClick={go} disabled={loading} style={{width:"100%",padding:14,borderRadius:12,border:"none",background:loading?"#2A2A3E":"linear-gradient(135deg,#7C4DFF,#FF6B9D)",color:"#fff",fontSize:15,fontWeight:700,cursor:loading?"not-allowed":"pointer",boxShadow:loading?"none":"0 4px 20px #7C4DFF44"}}>
          {loading?"Preparando tu perfil...":"Continuar →"}
        </button>
      </div>
    </div>
  );
}

// ══ ONBOARDING SALUD ═════════════════════════════════════════════════════════
function HealthScreen({perfil,onComplete}){
  const [edad,setEdad]=useState("");const [ejercicio,setEjercicio]=useState("");const [enf,setEnf]=useState("");const [otra,setOtra]=useState("");const [loading,setLoading]=useState(false);const [err,setErr]=useState("");
  const EJERCICIOS=[{e:"🛋️ Sedentario",d:"Poca o ninguna actividad"},{e:"🚶 Caminata",d:"Ocasional, menos de 3x/sem"},{e:"🏃 Activo",d:"3-4 veces por semana"},{e:"💪 Intenso",d:"Diario o competitivo"}];
  const ENFERMEDADES=["Ninguna","Diabetes","Hipertensión","Colesterol alto","Hipotiroidismo","Gastritis","Otra"];
  const save=async()=>{
    if(!edad||+edad<1||+edad>110){setErr("Ingresa una edad válida");return;}
    if(!ejercicio){setErr("Selecciona tu nivel de actividad");return;}
    if(!enf){setErr("Selecciona una condición de salud");return;}
    setLoading(true);
    const e2=enf==="Otra"?(otra||"Otra condición"):enf;
    try{await apiGet({action:"guardar_perfil",perfil,edad,ejercicio:encodeURIComponent(ejercicio),enfermedad:encodeURIComponent(e2)});}catch(_){}
    localStorage.setItem(sk(perfil,"perfil_salud"),JSON.stringify({edad,ejercicio,enfermedad:e2}));
    setLoading(false);onComplete({edad,ejercicio,enfermedad:e2});
  };
  return(
    <div style={{minHeight:"100vh",background:"#0A0A14",fontFamily:"'Segoe UI',system-ui,sans-serif",overflowY:"auto",padding:"24px 16px"}}>
      <div style={{maxWidth:400,margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{fontSize:48,marginBottom:8}}>🩺</div>
          <div style={{color:"#fff",fontSize:22,fontWeight:800}}>Tu perfil de salud</div>
          <div style={{color:"#666",fontSize:13,marginTop:4}}>Hola <b style={{color:"#7C4DFF"}}>{perfil}</b> — personalizamos tus recomendaciones</div>
        </div>

        {/* Edad */}
        <div style={{background:"#13131F",borderRadius:16,padding:16,marginBottom:12,border:"1px solid #2A2A3E"}}>
          <div style={{color:"#aaa",fontSize:12,fontWeight:600,marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>Tu edad</div>
          <input type="number" value={edad} onChange={e=>{setEdad(e.target.value);setErr("");}} placeholder="Ej: 32"
            style={{width:"100%",padding:"12px 14px",borderRadius:10,background:"#1E1E30",border:"1px solid #2A2A3E",color:"#fff",fontSize:20,fontWeight:700,outline:"none",boxSizing:"border-box",textAlign:"center"}}/>
        </div>

        {/* Ejercicio */}
        <div style={{background:"#13131F",borderRadius:16,padding:16,marginBottom:12,border:"1px solid #2A2A3E"}}>
          <div style={{color:"#aaa",fontSize:12,fontWeight:600,marginBottom:10,textTransform:"uppercase",letterSpacing:1}}>Actividad física</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {EJERCICIOS.map(({e,d})=>(
              <div key={e} onClick={()=>{setEjercicio(e);setErr("");}} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:12,border:`1.5px solid ${ejercicio===e?"#7C4DFF":"#2A2A3E"}`,background:ejercicio===e?"#7C4DFF18":"#1E1E30",cursor:"pointer",transition:"all .15s"}}>
                <div style={{flex:1}}>
                  <div style={{color:ejercicio===e?"#7C4DFF":"#fff",fontWeight:700,fontSize:13}}>{e}</div>
                  <div style={{color:"#666",fontSize:11,marginTop:2}}>{d}</div>
                </div>
                <div style={{width:20,height:20,borderRadius:"50%",border:`2px solid ${ejercicio===e?"#7C4DFF":"#444"}`,background:ejercicio===e?"#7C4DFF":"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {ejercicio===e&&<div style={{width:8,height:8,borderRadius:"50%",background:"#fff"}}/>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Condición */}
        <div style={{background:"#13131F",borderRadius:16,padding:16,marginBottom:16,border:"1px solid #2A2A3E"}}>
          <div style={{color:"#aaa",fontSize:12,fontWeight:600,marginBottom:10,textTransform:"uppercase",letterSpacing:1}}>Condición de salud</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {ENFERMEDADES.map(e=>(
              <button key={e} onClick={()=>{setEnf(e);setErr("");}} style={{padding:"8px 14px",borderRadius:20,border:`1.5px solid ${enf===e?"#FF6B9D":"#2A2A3E"}`,background:enf===e?"#FF6B9D22":"#1E1E30",color:enf===e?"#FF6B9D":"#888",fontSize:12,cursor:"pointer",fontWeight:enf===e?700:400,transition:"all .15s"}}>{e}</button>
            ))}
          </div>
          {enf==="Otra"&&<input value={otra} onChange={e=>setOtra(e.target.value)} placeholder="¿Cuál condición?" style={{marginTop:10,width:"100%",padding:"10px 12px",borderRadius:10,background:"#1E1E30",border:"1px solid #2A2A3E",color:"#fff",fontSize:13,outline:"none",boxSizing:"border-box"}}/>}
        </div>

        {err&&<div style={{color:"#FF4757",fontSize:12,marginBottom:12,textAlign:"center"}}>{err}</div>}
        <button onClick={save} disabled={loading} style={{width:"100%",padding:15,borderRadius:14,border:"none",background:loading?"#2A2A3E":"linear-gradient(135deg,#7C4DFF,#FF6B9D)",color:"#fff",fontSize:15,fontWeight:700,cursor:loading?"not-allowed":"pointer",boxShadow:loading?"none":"0 4px 20px #7C4DFF44",marginBottom:24}}>
          {loading?"Guardando...":"Guardar y empezar 🚀"}
        </button>
      </div>
    </div>
  );
}

// ══ APP PRINCIPAL ═════════════════════════════════════════════════════════════
export default function App(){
  const [perfil,setPerfil]=useState(null);
  const [hp,setHp]=useState(null);
  const [showHF,setShowHF]=useState(false);
  const [tab,setTab]=useState(0);
  const [meal,setMeal]=useState(0);
  const [selected,setSelected]=useState([]);
  const [catOpen,setCatOpen]=useState(null);
  const [saving,setSaving]=useState(false);
  const [savedMsg,setSavedMsg]=useState("");
  const [water,setWater]=useState(0);
  const [streak,setStreak]=useState(0);
  const [history,setHistory]=useState([]);
  const [loadingHist,setLoadingHist]=useState(false);
  const [photoAI,setPhotoAI]=useState(false);
  const [photoResult,setPhotoResult]=useState(null);
  const [photoPreview,setPhotoPreview]=useState(null);
  const [photoFoods,setPhotoFoods]=useState(null);
  const [badges,setBadges]=useState([]);
  const [newBadge,setNewBadge]=useState(null);
  const [lastScore,setLastScore]=useState(0);
  const [lastCats,setLastCats]=useState(0);
  const [customFood,setCustomFood]=useState("");
  const [customFoods,setCustomFoods]=useState([]);
  const [analyzingText,setAnalyzingText]=useState(false);
  const [confeti,setConfeti]=useState(false);
  const [pildora,setPildora]=useState(null);
  const [idMsg,setIdMsg]=useState("");
  const [quickFoods,setQuickFoods]=useState([]);
  const fileRef=useRef();

  // Init
  useEffect(()=>{
    const saved=localStorage.getItem("vt_perfil_actual");
    if(saved){
      setPerfil(saved);
      const h=localStorage.getItem(sk(saved,"perfil_salud"));
      if(h) setHp(JSON.parse(h));
      else{ apiGet({action:"obtener_perfil",perfil:saved}).then(r=>{ if(r.ok&&r.encontrado){const h2={edad:r.edad,ejercicio:r.ejercicio,enfermedad:r.enfermedad};setHp(h2);localStorage.setItem(sk(saved,"perfil_salud"),JSON.stringify(h2));}else setShowHF(true);}).catch(()=>setShowHF(true));}
      const qf=localStorage.getItem(sk(saved,"quick_foods"));if(qf)setQuickFoods(JSON.parse(qf));
    }
    const cached=localStorage.getItem("vt_api_key_cache");if(cached)CLAUDE_API_KEY=cached;
    apiGet({action:"getKey"}).then(r=>{if(r.ok&&r.k){CLAUDE_API_KEY=r.k;localStorage.setItem("vt_api_key_cache",r.k);}}).catch(()=>{});
  },[]);

  useEffect(()=>{
    if(!perfil)return;
    const k=sk(perfil,"water"),d=sk(perfil,"water_date"),today=new Date().toLocaleDateString("es-CO");
    if(localStorage.getItem(d)===today)setWater(parseInt(localStorage.getItem(k)||"0"));
    else{setWater(0);localStorage.setItem(k,"0");localStorage.setItem(d,today);}
    setStreak(parseInt(localStorage.getItem(sk(perfil,"streak"))||"0"));
    const b=localStorage.getItem(sk(perfil,"badges"));if(b)setBadges(JSON.parse(b));
  },[perfil]);

  useEffect(()=>{
    if(!perfil||tab!==2)return;
    setLoadingHist(true);
    apiGet({action:"historial",perfil}).then(d=>{if(d.ok)setHistory(d.registros||[]);}).catch(()=>{}).finally(()=>setLoadingHist(false));
  },[perfil,tab]);

  if(!perfil)return <ProfileScreen onEnter={p=>{setPerfil(p);setShowHF(true);}}/>;
  if(showHF&&!hp)return <HealthScreen perfil={perfil} onComplete={h=>{setHp(h);setShowHF(false);}}/>;

  const scores=calcScores(selected);
  const today=new Date().toLocaleDateString("es-CO");
  const nivel=getNivel(streak,history.length);
  const waterPct=Math.min(100,(water/WATER_GOAL)*100);
  const scoreColor=v=>v>=70?"#00D4AA":v>=40?"#FFD166":"#FF4757";
  const toggle=f=>setSelected(p=>p.includes(f)?p.filter(x=>x!==f):[...p,f]);

  const checkBadges=(state,hist)=>{
    const cur=JSON.parse(localStorage.getItem(sk(perfil,"badges"))||"[]");
    BADGES.forEach(b=>{ if(!cur.includes(b.id)&&b.check(state,hist)){cur.push(b.id);localStorage.setItem(sk(perfil,"badges"),JSON.stringify(cur));setBadges([...cur]);setNewBadge(b);}});
  };

  const updateQF=(foods)=>{
    const all=[...quickFoods,...foods];const freq={};
    all.forEach(f=>{freq[f]=(freq[f]||0)+1;});
    const sorted=Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([f])=>f);
    setQuickFoods(sorted);localStorage.setItem(sk(perfil,"quick_foods"),JSON.stringify(sorted));
  };

  const handleSave=async()=>{
    const pending=customFood.trim()?[...customFoods,customFood.trim()]:[...customFoods];
    if(customFood.trim()){setCustomFoods(pending);setCustomFood("");}
    const all=[...selected,...pending];
    if(all.length===0){setSavedMsg("⚠️ Selecciona al menos un alimento");setTimeout(()=>setSavedMsg(""),2500);return;}
    setSaving(true);setSavedMsg("Analizando nutrición...");
    let analisis=photoResult;
    if(!analisis&&!photoPreview){
      try{const r=await analizarTexto(all,hp);analisis={ok:true,alimentos:[],...r};setPhotoResult(analisis);}catch(_){}
    }
    try{
      const res=await apiGet({action:"guardar",perfil,fecha:today,comida:encodeURIComponent(MEALS[meal].label),alimentos:encodeURIComponent(JSON.stringify(all)),score_total:scores.total,score_inmunidad:scores.immunity,score_energia:scores.energy,score_concentracion:scores.focus,score_vitalidad:scores.vitality,agua_vasos:water,racha_dias:streak,notas:encodeURIComponent(analisis?.recomendacion||"")});
      if(res.ok){
        const lastDate=localStorage.getItem(sk(perfil,"streak_date"));
        const yStr=new Date(Date.now()-86400000).toLocaleDateString("es-CO");
        const ns=lastDate===yStr?streak+1:1;
        setStreak(ns);localStorage.setItem(sk(perfil,"streak"),ns);localStorage.setItem(sk(perfil,"streak_date"),today);
        setLastScore(scores.total);setLastCats(scores.cats);
        updateQF(all);
        checkBadges({streak:ns,water,lastScore:scores.total,lastCats:scores.cats},[...history,{comida:MEALS[meal].label,alimentos:all}]);
        setConfeti(true);
        const msg=IDENTITY_MSGS[Math.floor(Math.random()*IDENTITY_MSGS.length)](perfil,scores.total);setIdMsg(msg);
        setTimeout(()=>setPildora(PILDORAS[Math.floor(Math.random()*PILDORAS.length)]),1600);
        setSavedMsg(`✅ ¡Guardado! Score: ${scores.total}%`);
        setTimeout(()=>{setSelected([]);setCustomFoods([]);setPhotoResult(null);setPhotoPreview(null);setPhotoFoods(null);setSavedMsg("");setIdMsg("");},4500);
      }else setSavedMsg("❌ Error al guardar");
    }catch(e){setSavedMsg(`❌ ${e.message}`);}
    setSaving(false);
  };

  const changeWater=d=>{const nw=Math.max(0,Math.min(12,water+d));setWater(nw);localStorage.setItem(sk(perfil,"water"),nw);localStorage.setItem(sk(perfil,"water_date"),today);if(nw>=8)checkBadges({streak,water:nw,lastScore,lastCats},history);};

  const handlePhoto=async(e)=>{
    const file=e.target.files?.[0];if(!file)return;
    setPhotoAI(true);setPhotoResult(null);setPhotoFoods(null);
    const url=URL.createObjectURL(file);setPhotoPreview(url);
    try{
      const b64=await new Promise((res,rej)=>{const img=new Image();img.onload=()=>{const MAX=512,r=Math.min(MAX/img.width,MAX/img.height,1),c=document.createElement("canvas");c.width=Math.round(img.width*r);c.height=Math.round(img.height*r);c.getContext("2d").drawImage(img,0,0,c.width,c.height);res(c.toDataURL("image/jpeg",.6).split(",")[1]);};img.onerror=rej;img.src=url;});
      const result=await analizarFoto(b64,"image/jpeg",hp);
      setPhotoResult({ok:true,...result});setPhotoFoods(result.alimentos||[]);
      (result.alimentos||[]).forEach(item=>{const al=typeof item==="object"?item.nombre:item;Object.values(FOOD_CATEGORIES).forEach(cat=>{const m=cat.items.find(i=>i.toLowerCase().includes(al.toLowerCase())||al.toLowerCase().includes(i.toLowerCase()));if(m&&!selected.includes(m))setSelected(p=>[...p,m]);});});
    }catch(err){setPhotoResult({ok:false,recomendacion:`Error: ${err.message}`,semaforo:"rojo"});}
    setPhotoAI(false);e.target.value="";
  };

  const TABS=[{icon:"🏠",label:"Inicio"},{icon:"📊",label:"Score"},{icon:"📅",label:"Historial"},{icon:"🏅",label:"Logros"},{icon:"💧",label:"Agua"}];

  const S={
    page:{minHeight:"100vh",background:"#0A0A14",fontFamily:"'Segoe UI',system-ui,sans-serif",color:"#fff",maxWidth:480,margin:"0 auto",paddingBottom:76},
    card:{background:"#13131F",borderRadius:16,border:"1px solid #1E1E30"},
  };

  return(
    <div style={S.page}>
      {confeti&&<Confeti onDone={()=>setConfeti(false)}/>}
      {newBadge&&<Toast icon={newBadge.icon} title="¡Insignia desbloqueada!" sub={newBadge.nombre+" — "+newBadge.desc} color="#7C4DFF" onClose={()=>setNewBadge(null)}/>}
      {pildora&&<Toast icon="💡" title="Píldora de sabiduría" sub={pildora} color="#FFD166" onClose={()=>setPildora(null)}/>}

      {/* Barra agua top */}
      <div style={{height:3,background:"#1E1E30",position:"sticky",top:0,zIndex:20}}>
        <div style={{height:3,width:`${waterPct}%`,background:"linear-gradient(90deg,#2196F3,#00BCD4)",transition:"width .5s"}}/>
      </div>

      {/* HEADER estilo Chess.com */}
      <div style={{background:"#13131F",borderBottom:"1px solid #1E1E30",padding:"10px 14px",position:"sticky",top:3,zIndex:10}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          {/* Avatar */}
          <div style={{width:44,height:44,borderRadius:12,background:`linear-gradient(135deg,${nivel.color},${nivel.color}88)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>
            {nivel.icon}
          </div>
          {/* Info */}
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:15,fontWeight:800,color:"#fff",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{perfil}</div>
            <div style={{display:"flex",alignItems:"center",gap:6,marginTop:2}}>
              <span style={{fontSize:11,color:nivel.color,fontWeight:600}}>{nivel.nivel}</span>
              {hp&&<span style={{fontSize:10,color:"#555"}}>· {hp.edad}a · {hp.enfermedad}</span>}
            </div>
          </div>
          {/* Stats chips */}
          <div style={{display:"flex",gap:5,flexShrink:0}}>
            {streak>0&&<div style={{background:"#FF6B0018",border:"1px solid #FF6B00",borderRadius:8,padding:"3px 7px",fontSize:11,color:"#FF6B00",fontWeight:700}}>🔥 {streak}</div>}
            {badges.length>0&&<div style={{background:"#7C4DFF18",border:"1px solid #7C4DFF",borderRadius:8,padding:"3px 7px",fontSize:11,color:"#7C4DFF",fontWeight:700}}>🏅 {badges.length}</div>}
          </div>
          <button onClick={()=>{localStorage.removeItem("vt_perfil_actual");setPerfil(null);setHp(null);setShowHF(false);}} style={{background:"#1E1E30",border:"none",borderRadius:8,padding:"5px 8px",color:"#555",fontSize:10,cursor:"pointer",flexShrink:0}}>Salir</button>
        </div>
      </div>

      {/* ══ TAB 0: REGISTRO ══════════════════════════════════════════ */}
      {tab===0&&(
        <div style={{padding:"12px 14px"}}>

          {/* Selector de comida — estilo cards Chess.com */}
          <div style={{marginBottom:14}}>
            <div style={{fontSize:12,color:"#555",fontWeight:600,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Registrar comida</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {MEALS.map((m,i)=>(
                <div key={i} onClick={()=>setMeal(i)} style={{background:meal===i?m.color+"33":"#13131F",borderRadius:14,padding:"12px 14px",border:`1.5px solid ${meal===i?m.color:"#1E1E30"}`,cursor:"pointer",display:"flex",alignItems:"center",gap:10,transition:"all .15s"}}>
                  <span style={{fontSize:22}}>{m.icon}</span>
                  <div style={{flex:1}}>
                    <div style={{color:meal===i?"#fff":"#888",fontWeight:700,fontSize:13}}>{m.label}</div>
                  </div>
                  {meal===i&&<div style={{width:18,height:18,borderRadius:"50%",background:m.color,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{color:"#fff",fontSize:10,fontWeight:700}}>✓</div></div>}
                </div>
              ))}
            </div>
          </div>

          {/* Foto IA */}
          <div style={{marginBottom:12}}>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={handlePhoto}/>
            <button onClick={()=>fileRef.current?.click()} disabled={photoAI} style={{width:"100%",padding:13,borderRadius:14,border:"1.5px dashed #7C4DFF",background:"#7C4DFF11",color:"#7C4DFF",fontSize:14,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              <span style={{fontSize:20}}>📷</span>
              {photoAI?"🔍 Analizando con IA...":"Tomar foto y detectar alimentos"}
            </button>

            {photoPreview&&<div style={{marginTop:8,borderRadius:12,overflow:"hidden",maxHeight:170,background:"#1E1E30"}}><img src={photoPreview} style={{width:"100%",objectFit:"cover",maxHeight:170}} alt=""/></div>}

            {/* Confirmación foto */}
            {photoFoods&&photoFoods.length>0&&(
              <div style={{marginTop:8,...S.card,padding:12}}>
                <div style={{fontSize:11,color:"#7C4DFF",fontWeight:700,marginBottom:8}}>✨ IA detectó — toca ✗ para corregir:</div>
                <div style={{display:"flex",flexDirection:"column",gap:5}}>
                  {photoFoods.map((item,i)=>{
                    const nombre=typeof item==="object"?item.nombre:item;
                    const porcion=typeof item==="object"?item.porcion:"";
                    const confianza=typeof item==="object"?item.confianza:"alta";
                    const matchApp=Object.values(FOOD_CATEGORIES).flatMap(c=>c.items).find(f=>f.toLowerCase().includes(nombre.toLowerCase())||nombre.toLowerCase().includes(f.toLowerCase()));
                    const isSel=matchApp&&selected.includes(matchApp);
                    return(
                      <div key={i} style={{display:"flex",alignItems:"center",gap:8,background:"#1E1E30",borderRadius:10,padding:"8px 10px",border:`1px solid ${confianza==="baja"?"#FFD16644":"#2A2A3E"}`}}>
                        <div style={{flex:1}}>
                          <span style={{fontSize:13,fontWeight:600,color:"#fff"}}>{nombre}</span>
                          {confianza==="baja"&&<span style={{marginLeft:6,fontSize:9,background:"#FFD16622",color:"#FFD166",padding:"1px 5px",borderRadius:4}}>?dudoso</span>}
                          {porcion&&<span style={{marginLeft:6,fontSize:10,color:"#555"}}>{porcion}</span>}
                        </div>
                        <button onClick={()=>{if(matchApp)toggle(matchApp);}} style={{padding:"4px 10px",borderRadius:8,border:"none",fontSize:11,fontWeight:700,cursor:"pointer",background:isSel?"#00D4AA22":"#2A2A3E",color:isSel?"#00D4AA":"#666"}}>
                          {isSel?"✓ Sí":"✗ No"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {photoResult&&(
              <div style={{marginTop:8,...S.card,padding:12,borderColor:photoResult.semaforo==="verde"?"#00D4AA44":photoResult.semaforo==="rojo"?"#FF475744":"#FFD16644"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <span style={{fontWeight:700,fontSize:12}}>{photoResult.semaforo==="verde"?"🟢":photoResult.semaforo==="rojo"?"🔴":"🟡"} Análisis IA</span>
                  {photoResult.calorias_aprox&&<span style={{fontSize:10,color:"#7C4DFF",background:"#7C4DFF18",padding:"2px 7px",borderRadius:8}}>{photoResult.calorias_aprox}</span>}
                </div>
                <div style={{fontSize:11,color:"#aaa",lineHeight:1.5}}>{photoResult.recomendacion}</div>
              </div>
            )}
          </div>

          {/* Comidas frecuentes */}
          {quickFoods.length>0&&(
            <div style={{marginBottom:12,...S.card,padding:12}}>
              <div style={{fontSize:11,color:"#555",fontWeight:600,marginBottom:8,textTransform:"uppercase",letterSpacing:.5}}>⚡ Frecuentes</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {quickFoods.map(f=>(
                  <button key={f} onClick={()=>{if(!selected.includes(f))setSelected(p=>[...p,f]);}} style={{padding:"5px 10px",borderRadius:20,border:`1px solid ${selected.includes(f)?"#7C4DFF":"#2A2A3E"}`,background:selected.includes(f)?"#7C4DFF22":"#1E1E30",color:selected.includes(f)?"#7C4DFF":"#888",fontSize:11,cursor:"pointer",fontWeight:selected.includes(f)?700:400}}>
                    {f}{selected.includes(f)?" ✓":""}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Categorías — estilo lista Chess.com */}
          <div style={{marginBottom:12}}>
            <div style={{fontSize:12,color:"#555",fontWeight:600,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Seleccionar alimentos</div>
            {/* Triggers visuales */}
            <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:8}}>
              {Object.entries(FOOD_CATEGORIES).map(([cat,data])=>{
                const has=data.items.some(i=>selected.includes(i));
                return <div key={cat} onClick={()=>setCatOpen(catOpen===cat?null:cat)} style={{fontSize:11,padding:"3px 8px",borderRadius:20,cursor:"pointer",background:has?data.color+"22":"#1E1E30",color:has?data.color:"#555",border:`1px solid ${has?data.color:"#2A2A3E"}`,fontWeight:has?700:400,transition:"all .15s"}}>{cat.split(" ")[0]} {has?"✓":""}</div>;
              })}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {Object.entries(FOOD_CATEGORIES).map(([cat,data])=>{
                const cnt=selected.filter(s=>data.items.includes(s)).length;
                return(
                  <div key={cat} style={{...S.card,overflow:"hidden"}}>
                    <div onClick={()=>setCatOpen(catOpen===cat?null:cat)} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",cursor:"pointer",background:cnt>0?data.color+"11":"transparent"}}>
                      <div style={{width:36,height:36,borderRadius:10,background:data.color+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{cat.split(" ")[0]}</div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,fontWeight:700,color:cnt>0?data.color:"#fff"}}>{cat.substring(3)}</div>
                        <div style={{fontSize:10,color:"#555",marginTop:1}}>{data.items.length} opciones</div>
                      </div>
                      {cnt>0&&<div style={{background:data.color,borderRadius:20,padding:"2px 8px",fontSize:10,fontWeight:700,color:"#fff"}}>✓ {cnt}</div>}
                      <span style={{color:"#444",fontSize:12}}>{catOpen===cat?"▲":"▶"}</span>
                    </div>
                    {catOpen===cat&&(
                      <div style={{padding:"8px 12px 12px",display:"flex",flexWrap:"wrap",gap:6,borderTop:"1px solid #1E1E30",background:"#0D0D1A"}}>
                        {data.items.map(food=>(
                          <button key={food} onClick={()=>toggle(food)} style={{padding:"6px 12px",borderRadius:20,border:`1.5px solid ${selected.includes(food)?data.color:"#2A2A3E"}`,background:selected.includes(food)?data.color+"22":"#1E1E30",color:selected.includes(food)?data.color:"#888",fontSize:12,cursor:"pointer",fontWeight:selected.includes(food)?700:400,transition:"all .15s"}}>{food}</button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Seleccionados */}
          {(selected.length>0||customFoods.length>0)&&(
            <div style={{...S.card,padding:12,marginBottom:10}}>
              <div style={{fontSize:11,color:"#555",marginBottom:6,fontWeight:600,textTransform:"uppercase",letterSpacing:.5}}>{selected.length+customFoods.length} seleccionados</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                {selected.map(f=><span key={f} onClick={()=>toggle(f)} style={{fontSize:11,padding:"4px 10px",borderRadius:20,background:"#7C4DFF22",color:"#7C4DFF",border:"1px solid #7C4DFF44",cursor:"pointer",fontWeight:600}}>{f} ✕</span>)}
                {customFoods.map((f,i)=><span key={`c${i}`} onClick={()=>setCustomFoods(p=>p.filter((_,j)=>j!==i))} style={{fontSize:11,padding:"4px 10px",borderRadius:20,background:"#FF6B9D22",color:"#FF6B9D",border:"1px solid #FF6B9D44",cursor:"pointer",fontWeight:600}}>{f} ✕</span>)}
              </div>
            </div>
          )}

          {/* Campo libre */}
          <div style={{...S.card,padding:12,marginBottom:10}}>
            <div style={{fontSize:11,color:"#555",marginBottom:6,fontWeight:600}}>➕ Agregar alimento no listado</div>
            <div style={{display:"flex",gap:6}}>
              <input value={customFood} onChange={e=>setCustomFood(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&customFood.trim()){setCustomFoods(p=>[...p,customFood.trim()]);setCustomFood("");}}} placeholder="Ej: calabacín, auyama, mazorca..."
                style={{flex:1,padding:"9px 12px",borderRadius:10,background:"#1E1E30",border:"1px solid #2A2A3E",color:"#fff",fontSize:12,outline:"none"}}/>
              <button onClick={()=>{if(customFood.trim()){setCustomFoods(p=>[...p,customFood.trim()]);setCustomFood("");}}} style={{padding:"9px 14px",borderRadius:10,border:"none",background:"#7C4DFF",color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer"}}>+</button>
            </div>
          </div>

          {/* Analizar sin foto */}
          {(selected.length>0||customFoods.length>0)&&!photoPreview&&(
            <button onClick={async()=>{const all=[...selected,...customFoods];setAnalyzingText(true);setPhotoResult(null);try{const r=await analizarTexto(all,hp);setPhotoResult({ok:true,alimentos:[],...r});}catch(_){}setAnalyzingText(false);}} disabled={analyzingText}
              style={{width:"100%",padding:11,borderRadius:12,border:"1.5px solid #00D4AA",background:"#00D4AA11",color:"#00D4AA",fontSize:13,fontWeight:700,cursor:"pointer",marginBottom:8,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
              <span>🧠</span>{analyzingText?"Analizando...":"Analizar nutrición de lo seleccionado"}
            </button>
          )}

          {/* Resultado análisis texto */}
          {photoResult&&!photoPreview&&(
            <div style={{...S.card,padding:12,marginBottom:10,borderColor:photoResult.semaforo==="verde"?"#00D4AA44":photoResult.semaforo==="rojo"?"#FF475744":"#FFD16644"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <span style={{fontWeight:700,fontSize:12}}>{photoResult.semaforo==="verde"?"🟢":photoResult.semaforo==="rojo"?"🔴":"🟡"} Análisis Nutricional</span>
                {photoResult.calorias_aprox&&<span style={{fontSize:10,color:"#7C4DFF",background:"#7C4DFF18",padding:"2px 7px",borderRadius:8}}>{photoResult.calorias_aprox}</span>}
              </div>
              <div style={{fontSize:11,color:"#aaa",lineHeight:1.5,marginBottom:6}}>{photoResult.recomendacion}</div>
              {photoResult.faltantes?.length>0&&(
                <div>
                  <div style={{fontSize:10,color:"#FFD166",fontWeight:600,marginBottom:4}}>⚠️ Le falta:</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:4}}>{photoResult.faltantes.map((f,i)=><span key={i} style={{fontSize:10,background:"#FFD16618",border:"1px solid #FFD16633",padding:"2px 7px",borderRadius:20,color:"#FFD166"}}>{f}</span>)}</div>
                </div>
              )}
            </div>
          )}

          {/* Mensaje identidad */}
          {idMsg&&<div style={{...S.card,padding:12,marginBottom:10,borderColor:"#00D4AA33",background:"#00D4AA08"}}><div style={{fontSize:12,color:"#00D4AA",lineHeight:1.5}}>✨ {idMsg}</div></div>}

          {/* Botón guardar */}
          <button onClick={handleSave} disabled={saving} style={{width:"100%",padding:15,borderRadius:14,border:"none",background:saving?"#1E1E30":"linear-gradient(135deg,#7C4DFF,#FF6B9D)",color:"#fff",fontSize:15,fontWeight:800,cursor:saving?"not-allowed":"pointer",boxShadow:saving?"none":"0 4px 24px #7C4DFF44",letterSpacing:.5}}>
            {saving?savedMsg||"Procesando...":"💾 Guardar en mi pestaña"}
          </button>
          {savedMsg&&!saving&&<div style={{marginTop:8,padding:10,borderRadius:12,textAlign:"center",fontSize:13,fontWeight:600,background:savedMsg.includes("✅")?"#00D4AA11":"#FF475711",color:savedMsg.includes("✅")?"#00D4AA":"#FF4757",border:`1px solid ${savedMsg.includes("✅")?"#00D4AA33":"#FF475733"}`}}>{savedMsg}</div>}
        </div>
      )}

      {/* ══ TAB 1: SCORE ══════════════════════════════════════════ */}
      {tab===1&&(
        <div style={{padding:"12px 14px"}}>
          {/* Score ring animado */}
          <div style={{textAlign:"center",marginBottom:20}}>
            <div style={{position:"relative",width:140,height:140,margin:"0 auto 10px"}}>
              <svg width="140" height="140" style={{transform:"rotate(-90deg)"}}>
                <circle cx="70" cy="70" r="60" fill="none" stroke="#1E1E30" strokeWidth="12"/>
                <circle cx="70" cy="70" r="60" fill="none" stroke={scoreColor(scores.total)} strokeWidth="12"
                  strokeDasharray={`${2*Math.PI*60}`} strokeDashoffset={`${2*Math.PI*60*(1-scores.total/100)}`}
                  strokeLinecap="round" style={{transition:"stroke-dashoffset 1s ease"}}/>
              </svg>
              <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",textAlign:"center"}}>
                <div style={{fontSize:32,fontWeight:900,color:scoreColor(scores.total)}}>{scores.total}</div>
                <div style={{fontSize:9,color:"#555",letterSpacing:1,textTransform:"uppercase"}}>Score</div>
              </div>
            </div>
            <div style={{color:"#aaa",fontSize:13}}>{scores.total>=70?"🌟 ¡Excelente alimentación!":scores.total>=40?"💪 Puedes mejorar":"🥺 Necesitas más variedad"}</div>
            <div style={{color:nivel.color,fontSize:11,marginTop:4}}>{nivel.icon} {nivel.nivel}</div>
          </div>

          {/* Barras */}
          {[{label:"🛡️ Inmunidad",key:"immunity"},{label:"⚡ Energía",key:"energy"},{label:"🧠 Concentración",key:"focus"},{label:"✨ Vitalidad",key:"vitality"}].map(({label,key})=>(
            <div key={key} style={{...S.card,padding:"12px 14px",marginBottom:8}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                <span style={{fontSize:13,fontWeight:600}}>{label}</span>
                <span style={{fontSize:13,fontWeight:800,color:scoreColor(scores[key])}}>{scores[key]}%</span>
              </div>
              <div style={{background:"#1E1E30",borderRadius:6,height:8,overflow:"hidden"}}>
                <div style={{width:`${scores[key]}%`,height:8,borderRadius:6,background:`linear-gradient(90deg,${scoreColor(scores[key])},${scoreColor(scores[key])}88)`,transition:"width 1s ease"}}/>
              </div>
            </div>
          ))}

          {/* Perfil activo */}
          {hp&&(
            <div style={{...S.card,padding:"12px 14px",marginTop:4}}>
              <div style={{fontSize:11,color:"#555",fontWeight:600,marginBottom:8,textTransform:"uppercase",letterSpacing:.5}}>Tu perfil activo</div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {[{icon:"🎂",label:"Edad",val:`${hp.edad} años`},{icon:"🏃",label:"Actividad",val:hp.ejercicio},{icon:"💊",label:"Condición",val:hp.enfermedad}].map(({icon,label,val})=>(
                  <div key={label} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",background:"#1E1E30",borderRadius:10}}>
                    <span style={{fontSize:16}}>{icon}</span>
                    <div style={{flex:1}}>
                      <div style={{fontSize:10,color:"#555"}}>{label}</div>
                      <div style={{fontSize:12,fontWeight:600,color:"#fff"}}>{val}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ TAB 2: HISTORIAL ══════════════════════════════════════ */}
      {tab===2&&(
        <div style={{padding:"12px 14px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div style={{fontSize:15,fontWeight:800}}>Historial de {perfil}</div>
            {history.length>0&&<div style={{fontSize:11,color:"#555"}}>{history.length} registros</div>}
          </div>

          {/* Calendario cadena */}
          {history.length>0&&(
            <div style={{...S.card,padding:14,marginBottom:12}}>
              <div style={{fontSize:11,color:"#555",fontWeight:600,marginBottom:8,textTransform:"uppercase",letterSpacing:.5}}>🔗 No rompas la cadena</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                {Array.from({length:30},(_,i)=>{
                  const d=new Date();d.setDate(d.getDate()-(29-i));
                  const ds=d.toISOString().split("T")[0];
                  const has=history.some(r=>{ const f=typeof r.fecha==="string"?r.fecha.split("T")[0]:String(r.fecha);return f===ds;});
                  const isToday=i===29;
                  return <div key={i} title={ds} style={{width:18,height:18,borderRadius:4,background:has?"#00D4AA":isToday?"#7C4DFF33":"#1E1E30",border:isToday?"1px solid #7C4DFF":"none",transition:"background .2s"}}/>;
                })}
              </div>
              <div style={{display:"flex",gap:12,marginTop:6}}>
                <div style={{display:"flex",gap:4,alignItems:"center"}}><div style={{width:10,height:10,borderRadius:2,background:"#00D4AA"}}/><span style={{fontSize:9,color:"#555"}}>Registrado</span></div>
                <div style={{display:"flex",gap:4,alignItems:"center"}}><div style={{width:10,height:10,borderRadius:2,background:"#1E1E30",border:"1px solid #333"}}/><span style={{fontSize:9,color:"#555"}}>Sin registro</span></div>
              </div>
            </div>
          )}

          {loadingHist
            ?<div style={{textAlign:"center",color:"#555",padding:40}}>Cargando...</div>
            :history.length===0
              ?<div style={{textAlign:"center",padding:40}}>
                <div style={{fontSize:40,marginBottom:12}}>🍽️</div>
                <div style={{color:"#fff",fontWeight:700,marginBottom:4}}>Sin registros aún</div>
                <div style={{color:"#555",fontSize:13}}>¡Registra tu primera comida!</div>
               </div>
              :[...history].reverse().map((r,i)=>(
                <div key={i} style={{...S.card,padding:14,marginBottom:8}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                    <span style={{fontSize:14,fontWeight:700}}>{r.comida||"Comida"}</span>
                    <span style={{fontSize:10,color:"#555",background:"#1E1E30",padding:"2px 7px",borderRadius:8}}>{typeof r.fecha==="string"?r.fecha.split("T")[0]:r.fecha}</span>
                  </div>
                  <div style={{display:"flex",gap:8,marginBottom:8,flexWrap:"wrap"}}>
                    {[{l:"Total",v:r.score_total,ic:"⭐"},{l:"Inmunidad",v:r.score_inmunidad,ic:"🛡️"},{l:"Energía",v:r.score_energia,ic:"⚡"}].map(({l,v,ic})=>(
                      <div key={l} style={{textAlign:"center",minWidth:60,background:"#1E1E30",borderRadius:10,padding:"6px 8px"}}>
                        <div style={{fontSize:14,fontWeight:800,color:scoreColor(v)}}>{v}%</div>
                        <div style={{fontSize:9,color:"#555"}}>{ic} {l}</div>
                      </div>
                    ))}
                  </div>
                  {r.alimentos&&<div style={{display:"flex",flexWrap:"wrap",gap:3,marginBottom:r.notas?6:0}}>{(Array.isArray(r.alimentos)?r.alimentos:[]).slice(0,6).map((f,j)=><span key={j} style={{fontSize:9,padding:"2px 6px",borderRadius:20,background:"#1E1E30",color:"#666",border:"1px solid #2A2A3E"}}>{typeof f==="object"?f.name:f}</span>)}</div>}
                  {r.notas&&<div style={{fontSize:10,color:"#7C4DFF",fontStyle:"italic",lineHeight:1.5,background:"#7C4DFF08",borderRadius:8,padding:"6px 8px",border:"1px solid #7C4DFF22"}}>{r.notas}</div>}
                </div>
              ))
          }
        </div>
      )}

      {/* ══ TAB 3: LOGROS ══════════════════════════════════════════ */}
      {tab===3&&(
        <div style={{padding:"12px 14px"}}>
          <div style={{fontSize:15,fontWeight:800,marginBottom:4}}>Mis Logros</div>
          <div style={{fontSize:11,color:"#555",marginBottom:12}}>{badges.length} de {BADGES.length} desbloqueados</div>

          {/* Barra progreso */}
          <div style={{background:"#1E1E30",borderRadius:6,height:8,marginBottom:14,overflow:"hidden"}}>
            <div style={{width:`${(badges.length/BADGES.length)*100}%`,height:8,borderRadius:6,background:"linear-gradient(90deg,#7C4DFF,#FF6B9D)",transition:"width .5s"}}/>
          </div>

          {/* Nivel */}
          <div style={{...S.card,padding:16,marginBottom:14,background:nivel.bg,borderColor:nivel.color+"44",textAlign:"center"}}>
            <div style={{fontSize:36,marginBottom:6}}>{nivel.icon}</div>
            <div style={{fontSize:16,fontWeight:800,color:nivel.color}}>{nivel.nivel}</div>
            <div style={{fontSize:11,color:"#666",marginTop:4}}>
              {streak>0?`🔥 ${streak} días de racha`:"Empieza tu racha registrando hoy"}
            </div>
            {history.length>0&&<div style={{fontSize:11,color:"#555",marginTop:2}}>{history.length} registros totales</div>}
            <div style={{marginTop:10,fontSize:10,color:"#555"}}>
              {streak<3?"Registra 3 días seguidos para subir de nivel":streak<7?"¡4 días más para Guerrero Vital!":streak<30?"¡Casi en Maestro del Bienestar!":"🏆 ¡Nivel máximo!"}
            </div>
          </div>

          {/* Grid badges */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {BADGES.map(b=>{
              const earned=badges.includes(b.id);
              return(
                <div key={b.id} style={{...S.card,padding:14,textAlign:"center",opacity:earned?1:.45,borderColor:earned?"#7C4DFF44":"#1E1E30",background:earned?"#7C4DFF0A":"#13131F",transition:"all .3s"}}>
                  <div style={{fontSize:30,marginBottom:6,filter:earned?"none":"grayscale(1)"}}>{b.icon}</div>
                  <div style={{fontSize:12,fontWeight:700,color:earned?"#fff":"#555"}}>{b.nombre}</div>
                  <div style={{fontSize:9,color:"#555",marginTop:2}}>{b.desc}</div>
                  {earned&&<div style={{marginTop:6,fontSize:9,color:"#7C4DFF",fontWeight:700,background:"#7C4DFF18",padding:"2px 8px",borderRadius:20,display:"inline-block"}}>✓ Obtenida</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══ TAB 4: AGUA ════════════════════════════════════════════ */}
      {tab===4&&(
        <div style={{padding:"12px 14px"}}>
          <div style={{fontSize:15,fontWeight:800,marginBottom:4}}>Hidratación diaria</div>
          <div style={{fontSize:11,color:"#555",marginBottom:14}}>Meta: {WATER_GOAL} vasos · Hoy: {water} · {Math.round(waterPct)}%</div>

          {/* Progreso */}
          <div style={{...S.card,padding:16,marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
              <span style={{fontSize:13,fontWeight:700}}>💧 Vasos tomados</span>
              <span style={{fontSize:13,fontWeight:800,color:waterPct>=100?"#00D4AA":"#2196F3"}}>{water}/{WATER_GOAL}</span>
            </div>
            <div style={{background:"#1E1E30",borderRadius:8,height:12,marginBottom:12,overflow:"hidden"}}>
              <div style={{width:`${waterPct}%`,height:12,borderRadius:8,background:"linear-gradient(90deg,#2196F3,#00BCD4)",transition:"width .5s"}}/>
            </div>
            <div style={{display:"flex",justifyContent:"center",flexWrap:"wrap",gap:6,marginBottom:14}}>
              {Array.from({length:WATER_GOAL}).map((_,i)=>(
                <div key={i} onClick={()=>changeWater(i<water?-(water-i):i-water+1)} style={{width:44,height:54,borderRadius:10,background:i<water?"linear-gradient(180deg,#2196F3,#0D47A1)":"#1E1E30",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,cursor:"pointer",transition:"all .2s",transform:i<water?"scale(1.05)":"scale(1)",border:i<water?"none":"1px solid #2A2A3E"}}>{i<water?"💧":"○"}</div>
              ))}
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"center"}}>
              <button onClick={()=>changeWater(-1)} style={{width:52,height:52,borderRadius:"50%",border:"1px solid #2A2A3E",background:"#1E1E30",color:"#fff",fontSize:22,cursor:"pointer",fontWeight:700}}>−</button>
              <button onClick={()=>changeWater(1)} style={{width:52,height:52,borderRadius:"50%",border:"none",background:"linear-gradient(135deg,#2196F3,#00BCD4)",color:"#fff",fontSize:22,cursor:"pointer",fontWeight:700}}>+</button>
            </div>
            {water>=WATER_GOAL&&<div style={{marginTop:12,color:"#00D4AA",fontSize:13,fontWeight:700,textAlign:"center"}}>🎉 ¡Meta cumplida hoy!</div>}
          </div>

          {/* Habit stacking tip */}
          <div style={{...S.card,padding:14}}>
            <div style={{fontSize:11,color:"#7C4DFF",fontWeight:700,marginBottom:6}}>💡 Habit Stacking</div>
            <div style={{fontSize:12,color:"#aaa",lineHeight:1.6}}>"Después de servirme el café de la mañana, registraré mi primer vaso de agua en VitalTrack."</div>
          </div>
        </div>
      )}

      {/* ══ NAV INFERIOR ═══════════════════════════════════════════ */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,background:"#0F0F1A",borderTop:"1px solid #1E1E30",display:"flex",zIndex:20,paddingBottom:"env(safe-area-inset-bottom,0px)"}}>
        {TABS.map((t,i)=>(
          <button key={i} onClick={()=>setTab(i)} style={{flex:1,padding:"10px 4px 8px",background:"transparent",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3,transition:"all .15s"}}>
            <div style={{width:36,height:36,borderRadius:10,background:tab===i?"#7C4DFF":"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,transition:"all .15s",boxShadow:tab===i?"0 2px 12px #7C4DFF55":"none"}}>{t.icon}</div>
            <div style={{fontSize:9,fontWeight:tab===i?700:400,color:tab===i?"#7C4DFF":"#444",letterSpacing:.3}}>{t.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
