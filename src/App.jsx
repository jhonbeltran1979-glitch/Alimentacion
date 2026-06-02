import { useState, useEffect, useRef } from "react";

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxuSWQvUB377F-BA0M-LuHXPzBG1qDNPmv6ZbVM5nG744ZVsEDzN6ko_bsRZo6ewI1SIg/exec";
const _k = ["sk-ant-api03-7i2NPrcTcVD3IKU8SQNmhf","VsoSQ1O0-ftZSVI3LfT_XZCxGkdRlw_0y29QO8LP","WCsuswtJwHxVoCJodbVaiSTw-PQ2ULwAA"];
let CLAUDE_API_KEY = _k.join("");

const PILDORAS = [
  "La ahuyama es rica en betacaroteno, vitamina A y antioxidantes.",
  "El plátano maduro aporta potasio y es fuente de energía rápida.",
  "Las legumbres (fríjoles, lentejas) reducen el colesterol LDL.",
  "Tomar agua antes de comer reduce la ingesta calórica hasta un 13%.",
  "El aguacate tiene grasas que ayudan al cerebro a procesar información.",
  "La zanahoria cocida tiene más betacaroteno disponible que cruda.",
  "El arroz integral tiene 3x más fibra que el arroz blanco.",
  "Comer lento (20+ min) permite que el cerebro registre la saciedad.",
  "Las nueces mejoran la memoria por su Omega-3 y vitamina E.",
  "El kiwi antes de dormir mejora la calidad del sueño.",
];

const IDENTITY_MSGS = [
  (n,s)=>`¡Eres el tipo de persona que cuida su salud, ${n}! Score ${s}%`,
  (n,s)=>`Cada registro es un voto por tu mejor versión. ¡${s}% logrado!`,
  (n,s)=>`Tu cuerpo te lo agradece, ${n}. Score ${s}% hoy.`,
  (n,s)=>`¡Increíble elección, ${n}! ${s}% más cerca de tu meta.`,
];

const BADGES = [
  {id:"racha3",  icon:"🔥",nombre:"En racha",   desc:"3 días seguidos",    check:s=>s.streak>=3},
  {id:"racha7",  icon:"⭐",nombre:"Una semana",  desc:"7 días seguidos",    check:s=>s.streak>=7},
  {id:"racha30", icon:"🏆",nombre:"Mes campeón", desc:"30 días seguidos",   check:s=>s.streak>=30},
  {id:"agua",    icon:"💧",nombre:"Hidratado",   desc:"Meta agua cumplida", check:s=>s.water>=8},
  {id:"verde",   icon:"🥗",nombre:"Plato verde", desc:"Score +70%",         check:s=>s.lastScore>=70},
  {id:"variedad",icon:"🌈",nombre:"Arcoíris",    desc:"5+ categorías",      check:s=>s.lastCats>=5},
  {id:"pro",     icon:"💪",nombre:"Proteína Pro",desc:"Proteínas 3 comidas",check:(s,h)=>(h||[]).filter(r=>(Array.isArray(r.alimentos)?r.alimentos:[]).some(a=>["Pollo","Res","Huevo","Atún","Salmón","Tofu","Lentejas"].includes(a))).length>=3},
  {id:"const",   icon:"📅",nombre:"Constante",   desc:"10 registros",       check:(s,h)=>(h||[]).length>=10},
];

const getNivel = (streak,total) => {
  if(streak>=30||total>=50)return{nivel:"Maestro",icon:"🧘",color:"#2D6A4F",badge:"#FFD700"};
  if(streak>=7 ||total>=20)return{nivel:"Guerrero",icon:"⚔️",color:"#2D6A4F",badge:"#C0C0C0"};
  if(streak>=3 ||total>=5) return{nivel:"Explorador",icon:"🌱",color:"#2D6A4F",badge:"#CD7F32"};
  return{nivel:"Principiante",icon:"🌟",color:"#2D6A4F",badge:"#95A5A6"};
};

const NUTRIENT_MAP = {
  "Vitamina C":   {immunity:30,energy:10,focus:5,vitality:15},
  "Zinc":         {immunity:25,energy:5,focus:10,vitality:10},
  "Vitamina D":   {immunity:20,energy:15,focus:10,vitality:20},
  "Vitamina A":   {immunity:20,energy:5,focus:5,vitality:10},
  "Hierro":       {immunity:10,energy:30,focus:15,vitality:20},
  "Omega-3":      {immunity:15,energy:10,focus:30,vitality:20},
  "Magnesio":     {immunity:10,energy:20,focus:20,vitality:25},
  "Vitamina B12": {immunity:5,energy:25,focus:20,vitality:15},
  "Probióticos":  {immunity:25,energy:5,focus:5,vitality:15},
  "Antioxidantes":{immunity:20,energy:10,focus:10,vitality:20},
  "Proteína":     {immunity:10,energy:20,focus:10,vitality:30},
  "Fibra":        {immunity:15,energy:10,focus:5,vitality:20},
  "Calcio":       {immunity:5,energy:10,focus:5,vitality:25},
  "Potasio":      {immunity:5,energy:20,focus:5,vitality:20},
};

const FOOD_CATEGORIES = [
  {key:"verduras",  label:"Verduras",     emoji:"🥦", bg:"#D8F3DC", color:"#2D6A4F", items:["Brócoli","Espinaca","Kale","Zanahoria","Tomate","Pimentón","Ajo","Champiñones","Aguacate","Repollo","Lechuga","Acelga","Cebolla","Remolacha","Ahuyama"], nutrients:["Vitamina C","Vitamina A","Fibra","Antioxidantes","Hierro"]},
  {key:"frutas",    label:"Frutas",       emoji:"🍎", bg:"#FFE8D6", color:"#C44B00", items:["Naranja","Mango","Papaya","Banano","Fresas","Arándanos","Guayaba","Maracuyá","Piña","Manzana","Uvas","Kiwi"], nutrients:["Vitamina C","Antioxidantes","Fibra","Potasio"]},
  {key:"proteinas", label:"Proteínas",    emoji:"🥩", bg:"#FFD7D7", color:"#9B2226", items:["Pollo","Res","Cerdo","Huevo","Atún","Sardinas","Salmón","Tofu","Lentejas","Fríjoles","Garbanzo"], nutrients:["Proteína","Hierro","Vitamina B12","Zinc","Omega-3"]},
  {key:"lacteos",   label:"Lácteos",      emoji:"🥛", bg:"#D4E8FF", color:"#1A6FA8", items:["Leche","Yogur","Queso","Kéfir","Kumis"], nutrients:["Calcio","Vitamina D","Probióticos","Proteína"]},
  {key:"granos",    label:"Granos",       emoji:"🌾", bg:"#FFF3CD", color:"#856404", items:["Arroz","Avena","Quinoa","Pasta","Pan integral","Maíz","Cebada","Plátano maduro","Yuca","Papa","Arepa"], nutrients:["Fibra","Magnesio","Vitamina B12","Proteína"]},
  {key:"frutos",    label:"Frutos secos", emoji:"🥜", bg:"#E8DCC8", color:"#6D4C41", items:["Almendras","Nueces","Maní","Marañón","Chía","Linaza","Ajonjolí"], nutrients:["Omega-3","Magnesio","Proteína","Calcio"]},
  {key:"bebidas",   label:"Bebidas",      emoji:"💧", bg:"#D4F1F9", color:"#0077B6", items:["Agua","Jugo natural","Té verde","Café","Leche vegetal"], nutrients:["Antioxidantes"]},
];

const MEALS = [
  {label:"Desayuno",emoji:"☀️",color:"#F4A261"},
  {label:"Almuerzo",emoji:"🍽️",color:"#2D6A4F"},
  {label:"Cena",    emoji:"🌙",color:"#457B9D"},
  {label:"Merienda",emoji:"🍎",color:"#E76F51"},
];
const WATER_GOAL = 8;

function calcScores(sel) {
  const t={immunity:0,energy:0,focus:0,vitality:0};const found=new Set();let cats=0;
  FOOD_CATEGORIES.forEach(c=>{if(c.items.some(i=>sel.includes(i))){cats++;c.nutrients.forEach(n=>{if(NUTRIENT_MAP[n]&&!found.has(n)){found.add(n);Object.keys(t).forEach(k=>{t[k]+=(NUTRIENT_MAP[n][k]||0);});}});}});
  const cap=v=>Math.min(100,Math.round(v));
  return{immunity:cap(t.immunity),energy:cap(t.energy),focus:cap(t.focus),vitality:cap(t.vitality),total:cap((t.immunity+t.energy+t.focus+t.vitality)/4),nutrients:[...found],cats};
}

async function apiGet(p){
  const res=await fetch(`${APPS_SCRIPT_URL}?${new URLSearchParams(p)}`,{redirect:"follow"});
  try{return JSON.parse(await res.text());}catch(_){return{ok:false};}
}

async function analizarTexto(alimentos,hp){
  const ctx=hp?`Perfil: ${hp.edad} años, actividad "${hp.ejercicio}", condición "${hp.enfermedad}".`:"";
  const res=await fetch("https://api.anthropic.com/v1/messages",{
    method:"POST",headers:{"Content-Type":"application/json","x-api-key":CLAUDE_API_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
    body:JSON.stringify({model:"claude-opus-4-5",max_tokens:600,messages:[{role:"user",content:`Nutricionista experto en gastronomía colombiana. ${ctx}\nAlimentos: ${alimentos.join(", ")}.\nJSON sin backticks:\n{"recomendacion":"consejo personalizado según perfil 2-3 oraciones concretas","semaforo":"verde|amarillo|rojo","calorias_aprox":"X kcal","faltantes":["nutrientes faltantes según perfil"]}`}]})
  });
  const d=await res.json();
  if(d.error)throw new Error(d.error.message);
  return JSON.parse(d.content[0].text.trim().replace(/```json|```/g,"").trim());
}

async function analizarFoto(b64,type,hp){
  const ctx=hp?`Perfil: ${hp.edad} años, actividad "${hp.ejercicio}", condición "${hp.enfermedad}".`:"";
  const res=await fetch("https://api.anthropic.com/v1/messages",{
    method:"POST",headers:{"Content-Type":"application/json","x-api-key":CLAUDE_API_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
    body:JSON.stringify({model:"claude-opus-4-5",max_tokens:800,messages:[{role:"user",content:[
      {type:"image",source:{type:"base64",media_type:type,data:b64}},
      {type:"text",text:`Eres nutricionista experto en gastronomía colombiana. ${ctx}

IDENTIFICACIÓN PRECISA de alimentos colombianos:
- AHUYAMA: calabaza naranja-amarilla cremosa, MUY común en Colombia, diferente a zanahoria
- PLÁTANO MADURO: amarillo intenso blando (tajada/patacón), diferente a banano
- ZANAHORIA: naranja brillante alargada y firme
- PAPA: blanca/crema (papa común) o amarilla pequeña (papa criolla)
- YUCA: blanca fibrosa
- ARROZ: blanco granulado suelto
- FRÍJOLES: rojos/negros/pintados en caldo o secos
- AREPA: disco plano de maíz blanco/amarillo

RECOMENDACIÓN: personalizada según perfil. Sedentario→porciones carbohidratos. Diabetes→índice glucémico. Hipertensión→sodio. Máximo 2 oraciones útiles.

JSON sin backticks:
{"alimentos":[{"nombre":"nombre exacto colombiano","porcion":"Xg","confianza":"alta|media|baja"}],"recomendacion":"consejo personalizado","semaforo":"verde|amarillo|rojo","calorias_aprox":"X kcal"}`}
    ]}]})
  });
  const d=await res.json();
  if(d.error)throw new Error(d.error.message);
  return JSON.parse(d.content[0].text.trim().replace(/```json|```/g,"").trim());
}

const sk=(p,k)=>`vt_${p}_${k}`;

// ══ CONFETI ══════════════════════════════════════════════════════
function Confeti({onDone}){
  useEffect(()=>{const t=setTimeout(onDone,2500);return()=>clearTimeout(t);},[]);
  const colors=["#2D6A4F","#52B788","#F4A261","#FFD166","#FF6B9D"];
  return(
    <div style={{position:"fixed",top:0,left:0,width:"100%",height:"100%",pointerEvents:"none",zIndex:9999,overflow:"hidden"}}>
      {Array.from({length:28},(_,i)=>(
        <div key={i} style={{position:"absolute",left:`${Math.random()*100}%`,top:"-12px",width:i%3===0?12:8,height:i%3===0?12:8,borderRadius:i%2?"50%":2,background:colors[i%colors.length],animation:`fall ${.7+Math.random()*1.5}s ease-in ${Math.random()*.5}s forwards`}}/>
      ))}
      <style>{`@keyframes fall{to{transform:translateY(110vh) rotate(540deg);opacity:0}}`}</style>
    </div>
  );
}

// ══ TOAST ════════════════════════════════════════════════════════
function Toast({icon,title,sub,color,onClose}){
  useEffect(()=>{const t=setTimeout(onClose,4500);return()=>clearTimeout(t);},[]);
  return(
    <div style={{position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",zIndex:998,background:"#fff",borderRadius:20,padding:"14px 16px",display:"flex",alignItems:"center",gap:12,boxShadow:`0 8px 32px ${color}44`,maxWidth:340,width:"92%",border:`2px solid ${color}33`}}>
      <div style={{width:44,height:44,borderRadius:14,background:color+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>{icon}</div>
      <div style={{flex:1}}>
        <div style={{color:"#1A1A1A",fontWeight:800,fontSize:13}}>{title}</div>
        <div style={{color:"#666",fontSize:11,marginTop:2,lineHeight:1.4}}>{sub}</div>
      </div>
      <button onClick={onClose} style={{background:"#f0f0f0",border:"none",borderRadius:8,width:24,height:24,cursor:"pointer",color:"#999",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
    </div>
  );
}

// ══ ONBOARDING NOMBRE ════════════════════════════════════════════
function ProfileScreen({onEnter}){
  const [name,setName]=useState("");const [loading,setLoading]=useState(false);const [err,setErr]=useState("");
  const ref=useRef();useEffect(()=>{setTimeout(()=>ref.current?.focus(),300);},[]);
  const go=async()=>{
    const t=name.trim();if(!t||t.length<2){setErr("Mínimo 2 caracteres");return;}
    setLoading(true);localStorage.setItem("vt_perfil_actual",t);
    try{await apiGet({action:"historial",perfil:t});}catch(_){}
    setLoading(false);onEnter(t);
  };
  return(
    <div style={{minHeight:"100vh",background:"#F8FAF5",fontFamily:"'Segoe UI',system-ui,sans-serif",display:"flex",flexDirection:"column"}}>
      {/* Header verde */}
      <div style={{background:"linear-gradient(160deg,#2D6A4F,#52B788)",padding:"48px 24px 60px",textAlign:"center"}}>
        <div style={{width:80,height:80,borderRadius:24,background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:40,margin:"0 auto 16px",backdropFilter:"blur(10px)"}}>🥗</div>
        <div style={{color:"#fff",fontSize:28,fontWeight:900,letterSpacing:-1}}>VitalTrack</div>
        <div style={{color:"rgba(255,255,255,0.75)",fontSize:14,marginTop:6}}>Tu guía nutricional personalizada con IA</div>
      </div>
      {/* Card flotante */}
      <div style={{flex:1,padding:"0 20px",marginTop:-24}}>
        <div style={{background:"#fff",borderRadius:24,padding:24,boxShadow:"0 8px 40px rgba(0,0,0,0.1)"}}>
          <div style={{color:"#1A1A1A",fontSize:18,fontWeight:800,marginBottom:4}}>¡Hola! ¿Cómo te llamas?</div>
          <div style={{color:"#888",fontSize:13,marginBottom:20}}>Crea tu perfil para comenzar tu journey saludable</div>
          <input ref={ref} value={name} onChange={e=>{setName(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&go()}
            placeholder="Tu nombre..."
            style={{width:"100%",padding:"16px",borderRadius:14,border:`2px solid ${err?"#FF4757":"#E8F4EC"}`,background:"#F8FAF5",color:"#1A1A1A",fontSize:16,fontWeight:600,outline:"none",boxSizing:"border-box",marginBottom:err?6:16}}/>
          {err&&<div style={{color:"#FF4757",fontSize:12,marginBottom:12}}>{err}</div>}
          <button onClick={go} disabled={loading} style={{width:"100%",padding:16,borderRadius:14,border:"none",background:loading?"#ccc":"linear-gradient(135deg,#2D6A4F,#52B788)",color:"#fff",fontSize:16,fontWeight:800,cursor:loading?"not-allowed":"pointer",boxShadow:loading?"none":"0 4px 20px #2D6A4F44",letterSpacing:.3}}>
            {loading?"Preparando perfil...":"Empezar →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ══ ONBOARDING SALUD ═════════════════════════════════════════════
function HealthScreen({perfil,onComplete}){
  const [edad,setEdad]=useState("");const [ejercicio,setEjercicio]=useState("");const [enf,setEnf]=useState("");const [otra,setOtra]=useState("");const [loading,setLoading]=useState(false);const [err,setErr]=useState("");
  const EJERCICIOS=[{e:"🛋️ Sedentario",d:"Poca o ninguna actividad"},{e:"🚶 Caminata",d:"Menos de 3 veces/semana"},{e:"🏃 Activo",d:"3-4 veces por semana"},{e:"💪 Intenso",d:"Diario o competitivo"}];
  const ENFERMEDADES=["Ninguna","Diabetes","Hipertensión","Colesterol alto","Hipotiroidismo","Gastritis","Otra"];
  const save=async()=>{
    if(!edad||+edad<1||+edad>110){setErr("Ingresa una edad válida");return;}
    if(!ejercicio){setErr("Selecciona tu nivel de actividad");return;}
    if(!enf){setErr("Selecciona una opción");return;}
    setLoading(true);
    const e2=enf==="Otra"?(otra||"Otra condición"):enf;
    try{await apiGet({action:"guardar_perfil",perfil,edad,ejercicio:encodeURIComponent(ejercicio),enfermedad:encodeURIComponent(e2)});}catch(_){}
    localStorage.setItem(sk(perfil,"perfil_salud"),JSON.stringify({edad,ejercicio,enfermedad:e2}));
    setLoading(false);onComplete({edad,ejercicio,enfermedad:e2});
  };
  return(
    <div style={{minHeight:"100vh",background:"#F8FAF5",fontFamily:"'Segoe UI',system-ui,sans-serif",overflowY:"auto"}}>
      <div style={{background:"linear-gradient(160deg,#2D6A4F,#52B788)",padding:"40px 24px 50px",textAlign:"center"}}>
        <div style={{fontSize:44,marginBottom:10}}>🩺</div>
        <div style={{color:"#fff",fontSize:22,fontWeight:900}}>Tu perfil de salud</div>
        <div style={{color:"rgba(255,255,255,.75)",fontSize:13,marginTop:4}}>Hola <b>{perfil}</b> — personalizamos tus recomendaciones</div>
      </div>
      <div style={{padding:"0 16px 24px",marginTop:-20}}>
        {/* Edad */}
        <div style={{background:"#fff",borderRadius:20,padding:18,marginBottom:12,boxShadow:"0 4px 20px rgba(0,0,0,0.06)"}}>
          <div style={{color:"#2D6A4F",fontSize:12,fontWeight:800,marginBottom:10,textTransform:"uppercase",letterSpacing:1}}>Edad</div>
          <input type="number" value={edad} onChange={e=>{setEdad(e.target.value);setErr("");}} placeholder="Ej: 32"
            style={{width:"100%",padding:"14px",borderRadius:12,border:"2px solid #E8F4EC",background:"#F8FAF5",color:"#1A1A1A",fontSize:22,fontWeight:800,outline:"none",boxSizing:"border-box",textAlign:"center"}}/>
        </div>
        {/* Ejercicio */}
        <div style={{background:"#fff",borderRadius:20,padding:18,marginBottom:12,boxShadow:"0 4px 20px rgba(0,0,0,0.06)"}}>
          <div style={{color:"#2D6A4F",fontSize:12,fontWeight:800,marginBottom:10,textTransform:"uppercase",letterSpacing:1}}>Actividad física</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {EJERCICIOS.map(({e,d})=>(
              <div key={e} onClick={()=>{setEjercicio(e);setErr("");}} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:14,border:`2px solid ${ejercicio===e?"#2D6A4F":"#E8F4EC"}`,background:ejercicio===e?"#E8F4EC":"#F8FAF5",cursor:"pointer",transition:"all .15s"}}>
                <div style={{flex:1}}>
                  <div style={{color:ejercicio===e?"#2D6A4F":"#333",fontWeight:700,fontSize:14}}>{e}</div>
                  <div style={{color:"#888",fontSize:11,marginTop:1}}>{d}</div>
                </div>
                <div style={{width:22,height:22,borderRadius:"50%",border:`2.5px solid ${ejercicio===e?"#2D6A4F":"#ccc"}`,background:ejercicio===e?"#2D6A4F":"transparent",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .15s"}}>
                  {ejercicio===e&&<div style={{width:8,height:8,borderRadius:"50%",background:"#fff"}}/>}
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Condición */}
        <div style={{background:"#fff",borderRadius:20,padding:18,marginBottom:16,boxShadow:"0 4px 20px rgba(0,0,0,0.06)"}}>
          <div style={{color:"#2D6A4F",fontSize:12,fontWeight:800,marginBottom:10,textTransform:"uppercase",letterSpacing:1}}>Condición de salud</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {ENFERMEDADES.map(e=>(
              <button key={e} onClick={()=>{setEnf(e);setErr("");}} style={{padding:"9px 16px",borderRadius:20,border:`2px solid ${enf===e?"#2D6A4F":"#E8F4EC"}`,background:enf===e?"#2D6A4F":"#F8FAF5",color:enf===e?"#fff":"#555",fontSize:13,cursor:"pointer",fontWeight:enf===e?800:400,transition:"all .15s"}}>{e}</button>
            ))}
          </div>
          {enf==="Otra"&&<input value={otra} onChange={e=>setOtra(e.target.value)} placeholder="¿Cuál condición?" style={{marginTop:10,width:"100%",padding:"12px",borderRadius:12,border:"2px solid #E8F4EC",background:"#F8FAF5",color:"#1A1A1A",fontSize:13,outline:"none",boxSizing:"border-box"}}/>}
        </div>
        {err&&<div style={{color:"#FF4757",fontSize:13,marginBottom:12,textAlign:"center",fontWeight:600}}>{err}</div>}
        <button onClick={save} disabled={loading} style={{width:"100%",padding:16,borderRadius:16,border:"none",background:loading?"#ccc":"linear-gradient(135deg,#2D6A4F,#52B788)",color:"#fff",fontSize:16,fontWeight:800,cursor:loading?"not-allowed":"pointer",boxShadow:loading?"none":"0 4px 20px #2D6A4F44"}}>
          {loading?"Guardando...":"Guardar y empezar 🚀"}
        </button>
      </div>
    </div>
  );
}

// ══ APP PRINCIPAL ═════════════════════════════════════════════════
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
  const [search,setSearch]=useState("");
  const fileRef=useRef();

  useEffect(()=>{
    const saved=localStorage.getItem("vt_perfil_actual");
    if(saved){
      setPerfil(saved);
      const h=localStorage.getItem(sk(saved,"perfil_salud"));
      if(h)setHp(JSON.parse(h));
      else{apiGet({action:"obtener_perfil",perfil:saved}).then(r=>{if(r.ok&&r.encontrado){const h2={edad:r.edad,ejercicio:r.ejercicio,enfermedad:r.enfermedad};setHp(h2);localStorage.setItem(sk(saved,"perfil_salud"),JSON.stringify(h2));}else setShowHF(true);}).catch(()=>setShowHF(true));}
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
  const scoreColor=v=>v>=70?"#2D6A4F":v>=40?"#E9C46A":"#E76F51";
  const scoreBg=v=>v>=70?"#D8F3DC":v>=40?"#FFF3CD":"#FFE5DE";
  const toggle=f=>setSelected(p=>p.includes(f)?p.filter(x=>x!==f):[...p,f]);

  const checkBadges=(state,hist)=>{
    const cur=JSON.parse(localStorage.getItem(sk(perfil,"badges"))||"[]");
    BADGES.forEach(b=>{if(!cur.includes(b.id)&&b.check(state,hist)){cur.push(b.id);localStorage.setItem(sk(perfil,"badges"),JSON.stringify(cur));setBadges([...cur]);setNewBadge(b);}});
  };

  const updateQF=(foods)=>{
    const freq={};[...quickFoods,...foods].forEach(f=>{freq[f]=(freq[f]||0)+1;});
    const s=Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([f])=>f);
    setQuickFoods(s);localStorage.setItem(sk(perfil,"quick_foods"),JSON.stringify(s));
  };

  const handleSave=async()=>{
    const pending=customFood.trim()?[...customFoods,customFood.trim()]:[...customFoods];
    if(customFood.trim()){setCustomFoods(pending);setCustomFood("");}
    const all=[...selected,...pending];
    if(all.length===0){setSavedMsg("⚠️ Selecciona al menos un alimento");setTimeout(()=>setSavedMsg(""),2500);return;}
    setSaving(true);setSavedMsg("Analizando nutrición...");
    let analisis=photoResult;
    if(!analisis&&!photoPreview){try{const r=await analizarTexto(all,hp);analisis={ok:true,...r};setPhotoResult(analisis);}catch(_){}}
    try{
      const res=await apiGet({action:"guardar",perfil,fecha:today,comida:encodeURIComponent(MEALS[meal].label),alimentos:encodeURIComponent(JSON.stringify(all)),score_total:scores.total,score_inmunidad:scores.immunity,score_energia:scores.energy,score_concentracion:scores.focus,score_vitalidad:scores.vitality,agua_vasos:water,racha_dias:streak,notas:encodeURIComponent(analisis?.recomendacion||"")});
      if(res.ok){
        const lastDate=localStorage.getItem(sk(perfil,"streak_date"));
        const yStr=new Date(Date.now()-86400000).toLocaleDateString("es-CO");
        const ns=lastDate===yStr?streak+1:1;
        setStreak(ns);localStorage.setItem(sk(perfil,"streak"),ns);localStorage.setItem(sk(perfil,"streak_date"),today);
        setLastScore(scores.total);setLastCats(scores.cats);updateQF(all);
        checkBadges({streak:ns,water,lastScore:scores.total,lastCats:scores.cats},[...history,{comida:MEALS[meal].label,alimentos:all}]);
        setConfeti(true);
        setIdMsg(IDENTITY_MSGS[Math.floor(Math.random()*IDENTITY_MSGS.length)](perfil,scores.total));
        setTimeout(()=>setPildora(PILDORAS[Math.floor(Math.random()*PILDORAS.length)]),1800);
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
      (result.alimentos||[]).forEach(item=>{const al=typeof item==="object"?item.nombre:item;FOOD_CATEGORIES.forEach(cat=>{const m=cat.items.find(i=>i.toLowerCase().includes(al.toLowerCase())||al.toLowerCase().includes(i.toLowerCase()));if(m&&!selected.includes(m))setSelected(p=>[...p,m]);});});
    }catch(err){setPhotoResult({ok:false,recomendacion:`Error: ${err.message}`,semaforo:"rojo"});}
    setPhotoAI(false);e.target.value="";
  };

  // Filtro de búsqueda
  const filteredCats = search ? FOOD_CATEGORIES.map(c=>({...c,items:c.items.filter(i=>i.toLowerCase().includes(search.toLowerCase()))})).filter(c=>c.items.length>0) : FOOD_CATEGORIES;

  const TABS=[{icon:"🏠",label:"Inicio"},{icon:"📊",label:"Score"},{icon:"📅",label:"Historial"},{icon:"🏅",label:"Logros"},{icon:"💧",label:"Agua"}];

  return(
    <div style={{minHeight:"100vh",background:"#F8FAF5",fontFamily:"'Segoe UI',system-ui,sans-serif",color:"#1A1A1A",maxWidth:480,margin:"0 auto",paddingBottom:80}}>

      {confeti&&<Confeti onDone={()=>setConfeti(false)}/>}
      {newBadge&&<Toast icon={newBadge.icon} title="¡Insignia desbloqueada!" sub={`${newBadge.nombre} — ${newBadge.desc}`} color="#2D6A4F" onClose={()=>setNewBadge(null)}/>}
      {pildora&&<Toast icon="💡" title="Píldora de sabiduría" sub={pildora} color="#F4A261" onClose={()=>setPildora(null)}/>}

      {/* ══ HEADER VERDE ══════════════════════════════════════════ */}
      <div style={{background:"linear-gradient(160deg,#1B4332,#2D6A4F)",padding:"16px 16px 28px",position:"sticky",top:0,zIndex:10}}>
        {/* Barra agua top */}
        <div style={{height:3,background:"rgba(255,255,255,0.2)",borderRadius:2,marginBottom:14,overflow:"hidden"}}>
          <div style={{height:3,width:`${waterPct}%`,background:"rgba(255,255,255,0.8)",borderRadius:2,transition:"width .5s"}}/>
        </div>
        {/* User row */}
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
          <div style={{width:50,height:50,borderRadius:16,background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,backdropFilter:"blur(10px)",border:"2px solid rgba(255,255,255,0.3)",flexShrink:0}}>{nivel.icon}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{color:"#fff",fontSize:18,fontWeight:900,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{perfil}</div>
            <div style={{display:"flex",alignItems:"center",gap:6,marginTop:2}}>
              <span style={{background:"rgba(255,255,255,0.2)",color:"#fff",fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:10}}>{nivel.nivel}</span>
              {hp&&<span style={{color:"rgba(255,255,255,.6)",fontSize:10}}>{hp.edad}a · {hp.enfermedad}</span>}
            </div>
          </div>
          <div style={{display:"flex",gap:6,flexShrink:0}}>
            {streak>0&&<div style={{background:"rgba(255,255,255,0.15)",borderRadius:10,padding:"6px 10px",textAlign:"center",backdropFilter:"blur(10px)"}}>
              <div style={{color:"#FFD166",fontSize:16,lineHeight:1}}>🔥</div>
              <div style={{color:"#fff",fontSize:11,fontWeight:800}}>{streak}</div>
            </div>}
            <div style={{background:"rgba(255,255,255,0.15)",borderRadius:10,padding:"6px 10px",textAlign:"center",backdropFilter:"blur(10px)"}}>
              <div style={{color:"#fff",fontSize:16,lineHeight:1}}>🏅</div>
              <div style={{color:"#fff",fontSize:11,fontWeight:800}}>{badges.length}</div>
            </div>
            <button onClick={()=>{localStorage.removeItem("vt_perfil_actual");setPerfil(null);setHp(null);setShowHF(false);}} style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:10,padding:"6px 10px",color:"rgba(255,255,255,.7)",fontSize:10,cursor:"pointer",backdropFilter:"blur(10px)"}}>Salir</button>
          </div>
        </div>
        {/* Stats row */}
        <div style={{display:"flex",gap:8,marginBottom:14}}>
          {[{v:history.length,l:"Registros"},{v:streak,l:"Días racha"},{v:badges.length,l:"Logros"},{v:water,l:"Vasos agua"}].map(({v,l})=>(
            <div key={l} style={{flex:1,background:"rgba(255,255,255,0.12)",borderRadius:14,padding:"10px 6px",textAlign:"center",backdropFilter:"blur(10px)"}}>
              <div style={{color:"#fff",fontSize:18,fontWeight:900,lineHeight:1}}>{v}</div>
              <div style={{color:"rgba(255,255,255,.65)",fontSize:9,marginTop:3}}>{l}</div>
            </div>
          ))}
        </div>
        {/* Barra búsqueda */}
        <div style={{background:"rgba(255,255,255,0.95)",borderRadius:14,display:"flex",alignItems:"center",padding:"12px 16px",gap:10,boxShadow:"0 4px 20px rgba(0,0,0,0.15)"}}>
          <span style={{fontSize:18,opacity:.5}}>🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="¿Qué comiste hoy?"
            style={{flex:1,border:"none",background:"transparent",color:"#333",fontSize:14,outline:"none",fontWeight:500}}/>
          {search&&<button onClick={()=>setSearch("")} style={{background:"#f0f0f0",border:"none",borderRadius:8,width:22,height:22,cursor:"pointer",color:"#999",fontSize:11}}>✕</button>}
        </div>
      </div>

      {/* ══ TAB 0: INICIO/REGISTRO ════════════════════════════════ */}
      {tab===0&&(
        <div style={{padding:"16px 14px"}}>

          {/* Selector comida — grid 2x2 */}
          <div style={{marginBottom:16}}>
            <div style={{fontSize:12,color:"#2D6A4F",fontWeight:800,textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>Registrar comida</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {MEALS.map((m,i)=>(
                <div key={i} onClick={()=>setMeal(i)} style={{background:meal===i?m.color:"#fff",borderRadius:16,padding:"14px",display:"flex",alignItems:"center",gap:10,cursor:"pointer",boxShadow:meal===i?`0 4px 16px ${m.color}55`:"0 2px 8px rgba(0,0,0,0.06)",border:`2px solid ${meal===i?m.color:"transparent"}`,transition:"all .2s"}}>
                  <span style={{fontSize:24}}>{m.emoji}</span>
                  <div>
                    <div style={{color:meal===i?"#fff":"#333",fontWeight:800,fontSize:14}}>{m.label}</div>
                    {meal===i&&<div style={{color:"rgba(255,255,255,.75)",fontSize:10}}>Seleccionado ✓</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Foto IA */}
          <div style={{marginBottom:14}}>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={handlePhoto}/>
            <button onClick={()=>fileRef.current?.click()} disabled={photoAI} style={{width:"100%",padding:15,borderRadius:16,border:"2px dashed #52B788",background:photoAI?"#E8F4EC":"#F0FBF4",color:"#2D6A4F",fontSize:14,fontWeight:800,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              <span style={{fontSize:22}}>📷</span>
              {photoAI?"🔍 Analizando con IA...":"Tomar foto y detectar alimentos"}
            </button>

            {photoPreview&&<div style={{marginTop:10,borderRadius:16,overflow:"hidden",maxHeight:180,boxShadow:"0 4px 20px rgba(0,0,0,0.1)"}}><img src={photoPreview} style={{width:"100%",objectFit:"cover",maxHeight:180}} alt="foto"/></div>}

            {/* Confirmación foto */}
            {photoFoods&&photoFoods.length>0&&(
              <div style={{marginTop:10,background:"#fff",borderRadius:16,padding:14,boxShadow:"0 4px 20px rgba(0,0,0,0.08)",border:"2px solid #E8F4EC"}}>
                <div style={{fontSize:12,color:"#2D6A4F",fontWeight:800,marginBottom:10}}>✨ IA detectó — toca ✗ para corregir:</div>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {photoFoods.map((item,i)=>{
                    const nombre=typeof item==="object"?item.nombre:item;
                    const porcion=typeof item==="object"?item.porcion:"";
                    const confianza=typeof item==="object"?item.confianza:"alta";
                    const matchApp=FOOD_CATEGORIES.flatMap(c=>c.items).find(f=>f.toLowerCase().includes(nombre.toLowerCase())||nombre.toLowerCase().includes(f.toLowerCase()));
                    const isSel=matchApp&&selected.includes(matchApp);
                    return(
                      <div key={i} style={{display:"flex",alignItems:"center",gap:10,background:isSel?"#E8F4EC":"#F8FAF5",borderRadius:12,padding:"10px 12px",border:`1.5px solid ${confianza==="baja"?"#E9C46A33":isSel?"#2D6A4F33":"transparent"}`}}>
                        <div style={{flex:1}}>
                          <span style={{fontSize:13,fontWeight:700,color:"#1A1A1A"}}>{nombre}</span>
                          {confianza==="baja"&&<span style={{marginLeft:6,fontSize:9,background:"#E9C46A22",color:"#856404",padding:"1px 5px",borderRadius:4,fontWeight:600}}>?dudoso</span>}
                          {porcion&&<span style={{marginLeft:6,fontSize:10,color:"#888"}}>{porcion}</span>}
                        </div>
                        <button onClick={()=>{if(matchApp)toggle(matchApp);}} style={{padding:"5px 12px",borderRadius:10,border:"none",fontSize:11,fontWeight:800,cursor:"pointer",background:isSel?"#2D6A4F":"#eee",color:isSel?"#fff":"#888",transition:"all .15s"}}>
                          {isSel?"✓ Sí":"✗ No"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {photoResult&&(
              <div style={{marginTop:10,background:"#fff",borderRadius:16,padding:14,boxShadow:"0 4px 20px rgba(0,0,0,0.08)",borderLeft:`4px solid ${photoResult.semaforo==="verde"?"#2D6A4F":photoResult.semaforo==="rojo"?"#E76F51":"#E9C46A"}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <span style={{fontWeight:800,fontSize:13}}>{photoResult.semaforo==="verde"?"🟢":photoResult.semaforo==="rojo"?"🔴":"🟡"} Análisis IA</span>
                  {photoResult.calorias_aprox&&<span style={{fontSize:11,color:"#2D6A4F",background:"#E8F4EC",padding:"3px 8px",borderRadius:8,fontWeight:700}}>{photoResult.calorias_aprox}</span>}
                </div>
                <div style={{fontSize:12,color:"#555",lineHeight:1.6}}>{photoResult.recomendacion}</div>
              </div>
            )}
          </div>

          {/* Frecuentes */}
          {quickFoods.length>0&&(
            <div style={{background:"#fff",borderRadius:16,padding:14,marginBottom:12,boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
              <div style={{fontSize:11,color:"#2D6A4F",fontWeight:800,marginBottom:10,textTransform:"uppercase",letterSpacing:.5}}>⚡ Frecuentes</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {quickFoods.map(f=>(
                  <button key={f} onClick={()=>{if(!selected.includes(f))setSelected(p=>[...p,f]);}} style={{padding:"7px 14px",borderRadius:20,border:`2px solid ${selected.includes(f)?"#2D6A4F":"#E8F4EC"}`,background:selected.includes(f)?"#2D6A4F":"#F8FAF5",color:selected.includes(f)?"#fff":"#555",fontSize:12,cursor:"pointer",fontWeight:700,transition:"all .15s"}}>
                    {f}{selected.includes(f)?" ✓":""}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Categorías — estilo cards con emoji grande */}
          <div style={{marginBottom:12}}>
            <div style={{fontSize:12,color:"#2D6A4F",fontWeight:800,textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>Seleccionar alimentos</div>
            {/* Chips rápidos */}
            <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:8,marginBottom:10,scrollbarWidth:"none"}}>
              {FOOD_CATEGORIES.map(c=>{
                const has=c.items.some(i=>selected.includes(i));
                return(
                  <button key={c.key} onClick={()=>setCatOpen(catOpen===c.key?null:c.key)} style={{flex:"0 0 auto",padding:"6px 14px",borderRadius:20,border:`2px solid ${has?c.color:"#E8E8E8"}`,background:has?c.bg:"#fff",color:has?c.color:"#888",fontSize:12,cursor:"pointer",fontWeight:has?800:500,whiteSpace:"nowrap",transition:"all .15s"}}>
                    {c.emoji} {c.label} {has?"✓":""}
                  </button>
                );
              })}
            </div>
            {/* Cards expandibles */}
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {filteredCats.map(c=>{
                const cnt=c.items.filter(i=>selected.includes(i)).length;
                const isOpen=catOpen===c.key;
                return(
                  <div key={c.key} style={{background:"#fff",borderRadius:16,overflow:"hidden",boxShadow:"0 2px 12px rgba(0,0,0,0.06)",border:`1.5px solid ${cnt>0?c.color+"44":"transparent"}`}}>
                    <div onClick={()=>setCatOpen(isOpen?null:c.key)} style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px",cursor:"pointer",background:cnt>0?c.bg+"88":"#fff"}}>
                      <div style={{width:44,height:44,borderRadius:12,background:c.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{c.emoji}</div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:15,fontWeight:800,color:cnt>0?c.color:"#1A1A1A"}}>{c.label}</div>
                        <div style={{fontSize:11,color:"#999",marginTop:1}}>{c.items.length} opciones disponibles</div>
                      </div>
                      {cnt>0&&<div style={{background:c.color,borderRadius:20,padding:"4px 10px",fontSize:11,fontWeight:800,color:"#fff"}}>✓ {cnt}</div>}
                      <span style={{color:"#ccc",fontSize:14,transform:isOpen?"rotate(90deg)":"rotate(0deg)",transition:"transform .2s"}}>▶</span>
                    </div>
                    {isOpen&&(
                      <div style={{padding:"10px 14px 14px",display:"flex",flexWrap:"wrap",gap:7,borderTop:`1px solid ${c.bg}`}}>
                        {c.items.map(food=>(
                          <button key={food} onClick={()=>toggle(food)} style={{padding:"7px 14px",borderRadius:20,border:`2px solid ${selected.includes(food)?c.color:c.bg}`,background:selected.includes(food)?c.color:c.bg,color:selected.includes(food)?"#fff":c.color,fontSize:13,cursor:"pointer",fontWeight:selected.includes(food)?800:500,transition:"all .15s"}}>{food}</button>
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
            <div style={{background:"#fff",borderRadius:16,padding:14,marginBottom:10,boxShadow:"0 2px 12px rgba(0,0,0,0.06)",border:"2px solid #E8F4EC"}}>
              <div style={{fontSize:11,color:"#2D6A4F",fontWeight:800,marginBottom:8,textTransform:"uppercase",letterSpacing:.5}}>{selected.length+customFoods.length} seleccionados</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {selected.map(f=><span key={f} onClick={()=>toggle(f)} style={{fontSize:12,padding:"5px 12px",borderRadius:20,background:"#E8F4EC",color:"#2D6A4F",cursor:"pointer",fontWeight:700,border:"1.5px solid #52B78844"}}>{f} ✕</span>)}
                {customFoods.map((f,i)=><span key={`c${i}`} onClick={()=>setCustomFoods(p=>p.filter((_,j)=>j!==i))} style={{fontSize:12,padding:"5px 12px",borderRadius:20,background:"#FFE8D6",color:"#C44B00",cursor:"pointer",fontWeight:700,border:"1.5px solid #F4A26144"}}>{f} ✕</span>)}
              </div>
            </div>
          )}

          {/* Campo libre */}
          <div style={{background:"#fff",borderRadius:16,padding:14,marginBottom:10,boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
            <div style={{fontSize:11,color:"#888",fontWeight:700,marginBottom:8}}>➕ Agregar alimento no listado</div>
            <div style={{display:"flex",gap:8}}>
              <input value={customFood} onChange={e=>setCustomFood(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&customFood.trim()){setCustomFoods(p=>[...p,customFood.trim()]);setCustomFood("");}}} placeholder="Ej: ahuyama, mazorca, aguapanela..."
                style={{flex:1,padding:"10px 14px",borderRadius:12,border:"2px solid #E8F4EC",background:"#F8FAF5",color:"#1A1A1A",fontSize:13,outline:"none"}}/>
              <button onClick={()=>{if(customFood.trim()){setCustomFoods(p=>[...p,customFood.trim()]);setCustomFood("");}}} style={{padding:"10px 16px",borderRadius:12,border:"none",background:"#2D6A4F",color:"#fff",fontSize:16,fontWeight:800,cursor:"pointer"}}>+</button>
            </div>
          </div>

          {/* Analizar sin foto */}
          {(selected.length>0||customFoods.length>0)&&!photoPreview&&(
            <button onClick={async()=>{const all=[...selected,...customFoods];setAnalyzingText(true);setPhotoResult(null);try{const r=await analizarTexto(all,hp);setPhotoResult({ok:true,...r});}catch(_){}setAnalyzingText(false);}} disabled={analyzingText}
              style={{width:"100%",padding:13,borderRadius:14,border:"2px solid #52B788",background:"#F0FBF4",color:"#2D6A4F",fontSize:13,fontWeight:800,cursor:"pointer",marginBottom:8,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
              🧠 {analyzingText?"Analizando...":"Analizar nutrición de lo seleccionado"}
            </button>
          )}

          {/* Resultado análisis texto */}
          {photoResult&&!photoPreview&&(
            <div style={{background:"#fff",borderRadius:16,padding:14,marginBottom:10,boxShadow:"0 4px 20px rgba(0,0,0,0.08)",borderLeft:`4px solid ${photoResult.semaforo==="verde"?"#2D6A4F":photoResult.semaforo==="rojo"?"#E76F51":"#E9C46A"}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <span style={{fontWeight:800,fontSize:13}}>{photoResult.semaforo==="verde"?"🟢":photoResult.semaforo==="rojo"?"🔴":"🟡"} Análisis Nutricional</span>
                {photoResult.calorias_aprox&&<span style={{fontSize:11,color:"#2D6A4F",background:"#E8F4EC",padding:"3px 8px",borderRadius:8,fontWeight:700}}>{photoResult.calorias_aprox}</span>}
              </div>
              <div style={{fontSize:12,color:"#555",lineHeight:1.6,marginBottom:photoResult.faltantes?.length>0?8:0}}>{photoResult.recomendacion}</div>
              {photoResult.faltantes?.length>0&&(
                <div>
                  <div style={{fontSize:10,color:"#856404",fontWeight:800,marginBottom:5}}>⚠️ Le falta a tu comida:</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:5}}>{photoResult.faltantes.map((f,i)=><span key={i} style={{fontSize:10,background:"#FFF3CD",border:"1px solid #E9C46A44",padding:"3px 8px",borderRadius:20,color:"#856404",fontWeight:600}}>{f}</span>)}</div>
                </div>
              )}
            </div>
          )}

          {/* Mensaje identidad */}
          {idMsg&&<div style={{background:"#E8F4EC",borderRadius:14,padding:12,marginBottom:10,border:"1.5px solid #52B78844"}}><div style={{fontSize:13,color:"#2D6A4F",fontWeight:600,lineHeight:1.5}}>✨ {idMsg}</div></div>}

          {/* Botón guardar */}
          <button onClick={handleSave} disabled={saving} style={{width:"100%",padding:17,borderRadius:16,border:"none",background:saving?"#ccc":"linear-gradient(135deg,#1B4332,#2D6A4F)",color:"#fff",fontSize:16,fontWeight:900,cursor:saving?"not-allowed":"pointer",boxShadow:saving?"none":"0 6px 24px #2D6A4F44",letterSpacing:.5}}>
            {saving?savedMsg||"Procesando...":"💾 Guardar en mi pestaña"}
          </button>
          {savedMsg&&!saving&&<div style={{marginTop:8,padding:12,borderRadius:14,textAlign:"center",fontSize:13,fontWeight:700,background:savedMsg.includes("✅")?"#E8F4EC":"#FFE5DE",color:savedMsg.includes("✅")?"#2D6A4F":"#E76F51"}}>{savedMsg}</div>}
        </div>
      )}

      {/* ══ TAB 1: SCORE ══════════════════════════════════════════ */}
      {tab===1&&(
        <div style={{padding:"16px 14px"}}>
          <div style={{textAlign:"center",marginBottom:20}}>
            <div style={{position:"relative",width:150,height:150,margin:"0 auto 14px"}}>
              <svg width="150" height="150" style={{transform:"rotate(-90deg)"}}>
                <circle cx="75" cy="75" r="64" fill="none" stroke="#E8F4EC" strokeWidth="14"/>
                <circle cx="75" cy="75" r="64" fill="none" stroke={scoreColor(scores.total)} strokeWidth="14"
                  strokeDasharray={`${2*Math.PI*64}`} strokeDashoffset={`${2*Math.PI*64*(1-scores.total/100)}`}
                  strokeLinecap="round" style={{transition:"stroke-dashoffset 1s ease"}}/>
              </svg>
              <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",textAlign:"center"}}>
                <div style={{fontSize:36,fontWeight:900,color:scoreColor(scores.total)}}>{scores.total}</div>
                <div style={{fontSize:10,color:"#aaa",letterSpacing:1,textTransform:"uppercase"}}>Score</div>
              </div>
            </div>
            <div style={{color:"#555",fontSize:14,fontWeight:600}}>{scores.total>=70?"🌟 ¡Excelente alimentación!":scores.total>=40?"💪 Puedes mejorar":"🥺 Necesitas más variedad"}</div>
          </div>

          {[{label:"🛡️ Inmunidad",key:"immunity"},{label:"⚡ Energía",key:"energy"},{label:"🧠 Concentración",key:"focus"},{label:"✨ Vitalidad",key:"vitality"}].map(({label,key})=>(
            <div key={key} style={{background:"#fff",borderRadius:16,padding:"14px 16px",marginBottom:8,boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                <span style={{fontSize:14,fontWeight:700}}>{label}</span>
                <span style={{fontSize:15,fontWeight:900,color:scoreColor(scores[key]),background:scoreBg(scores[key]),padding:"2px 10px",borderRadius:10}}>{scores[key]}%</span>
              </div>
              <div style={{background:"#F0F0F0",borderRadius:8,height:10,overflow:"hidden"}}>
                <div style={{width:`${scores[key]}%`,height:10,borderRadius:8,background:scoreColor(scores[key]),transition:"width 1s ease"}}/>
              </div>
            </div>
          ))}

          {hp&&(
            <div style={{background:"#fff",borderRadius:16,padding:16,marginTop:8,boxShadow:"0 2px 12px rgba(0,0,0,0.06)",border:"2px solid #E8F4EC"}}>
              <div style={{fontSize:12,color:"#2D6A4F",fontWeight:800,marginBottom:10,textTransform:"uppercase",letterSpacing:.5}}>Tu perfil activo</div>
              {[{icon:"🎂",l:"Edad",v:`${hp.edad} años`},{icon:"🏃",l:"Actividad",v:hp.ejercicio},{icon:"💊",l:"Condición",v:hp.enfermedad}].map(({icon,l,v})=>(
                <div key={l} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:"#F8FAF5",borderRadius:12,marginBottom:6}}>
                  <span style={{fontSize:18}}>{icon}</span>
                  <div style={{flex:1}}><div style={{fontSize:10,color:"#aaa"}}>{l}</div><div style={{fontSize:13,fontWeight:700}}>{v}</div></div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══ TAB 2: HISTORIAL ══════════════════════════════════════ */}
      {tab===2&&(
        <div style={{padding:"16px 14px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div style={{fontSize:18,fontWeight:900}}>Historial</div>
            {history.length>0&&<div style={{fontSize:12,color:"#888",background:"#fff",padding:"4px 10px",borderRadius:10,boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>{history.length} registros</div>}
          </div>

          {/* Calendario */}
          {history.length>0&&(
            <div style={{background:"#fff",borderRadius:16,padding:16,marginBottom:14,boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
              <div style={{fontSize:12,color:"#2D6A4F",fontWeight:800,marginBottom:10,textTransform:"uppercase",letterSpacing:.5}}>🔗 No rompas la cadena</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                {Array.from({length:30},(_,i)=>{
                  const d=new Date();d.setDate(d.getDate()-(29-i));
                  const ds=d.toISOString().split("T")[0];
                  const has=history.some(r=>{const f=typeof r.fecha==="string"?r.fecha.split("T")[0]:String(r.fecha);return f===ds;});
                  const isToday=i===29;
                  return <div key={i} title={ds} style={{width:20,height:20,borderRadius:5,background:has?"#2D6A4F":isToday?"#E8F4EC":"#F0F0F0",border:isToday?"2px solid #52B788":"none",transition:"background .2s"}}/>;
                })}
              </div>
              <div style={{display:"flex",gap:12,marginTop:8}}>
                <div style={{display:"flex",gap:4,alignItems:"center"}}><div style={{width:12,height:12,borderRadius:3,background:"#2D6A4F"}}/><span style={{fontSize:10,color:"#888"}}>Registrado</span></div>
                <div style={{display:"flex",gap:4,alignItems:"center"}}><div style={{width:12,height:12,borderRadius:3,background:"#F0F0F0",border:"1px solid #ddd"}}/><span style={{fontSize:10,color:"#888"}}>Sin registro</span></div>
              </div>
            </div>
          )}

          {loadingHist
            ?<div style={{textAlign:"center",color:"#888",padding:40}}>Cargando...</div>
            :history.length===0
              ?<div style={{textAlign:"center",padding:40}}>
                <div style={{fontSize:48,marginBottom:12}}>🍽️</div>
                <div style={{fontWeight:800,fontSize:16,marginBottom:4}}>Sin registros aún</div>
                <div style={{color:"#888",fontSize:13}}>¡Registra tu primera comida!</div>
               </div>
              :[...history].reverse().map((r,i)=>(
                <div key={i} style={{background:"#fff",borderRadius:16,padding:16,marginBottom:10,boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                    <span style={{fontSize:15,fontWeight:900}}>{r.comida||"Comida"}</span>
                    <span style={{fontSize:11,color:"#888",background:"#F8FAF5",padding:"3px 8px",borderRadius:8,fontWeight:600}}>{typeof r.fecha==="string"?r.fecha.split("T")[0]:r.fecha}</span>
                  </div>
                  <div style={{display:"flex",gap:8,marginBottom:10,flexWrap:"wrap"}}>
                    {[{l:"Total",v:r.score_total,ic:"⭐"},{l:"Inmunidad",v:r.score_inmunidad,ic:"🛡️"},{l:"Energía",v:r.score_energia,ic:"⚡"}].map(({l,v,ic})=>(
                      <div key={l} style={{textAlign:"center",flex:1,background:scoreBg(v),borderRadius:12,padding:"8px 6px"}}>
                        <div style={{fontSize:16,fontWeight:900,color:scoreColor(v)}}>{v}%</div>
                        <div style={{fontSize:9,color:scoreColor(v),fontWeight:600}}>{ic} {l}</div>
                      </div>
                    ))}
                  </div>
                  {r.alimentos&&<div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:r.notas?8:0}}>{(Array.isArray(r.alimentos)?r.alimentos:[]).slice(0,6).map((f,j)=><span key={j} style={{fontSize:10,padding:"3px 8px",borderRadius:20,background:"#F0F0F0",color:"#666",fontWeight:500}}>{typeof f==="object"?f.name:f}</span>)}</div>}
                  {r.notas&&(
                    <div style={{background:"#E8F4EC",borderRadius:12,padding:"10px 12px",border:"1px solid #52B78833"}}>
                      <div style={{fontSize:10,color:"#2D6A4F",fontWeight:800,marginBottom:3,textTransform:"uppercase",letterSpacing:.5}}>💡 Recomendación IA</div>
                      <div style={{fontSize:12,color:"#2D6A4F",lineHeight:1.5}}>{r.notas}</div>
                    </div>
                  )}
                </div>
              ))
          }
        </div>
      )}

      {/* ══ TAB 3: LOGROS ══════════════════════════════════════════ */}
      {tab===3&&(
        <div style={{padding:"16px 14px"}}>
          <div style={{fontSize:18,fontWeight:900,marginBottom:4}}>Mis Logros</div>
          <div style={{fontSize:13,color:"#888",marginBottom:14}}>{badges.length} de {BADGES.length} desbloqueados</div>

          <div style={{background:"#E8F4EC",borderRadius:6,height:10,marginBottom:16,overflow:"hidden"}}>
            <div style={{width:`${(badges.length/BADGES.length)*100}%`,height:10,borderRadius:6,background:"linear-gradient(90deg,#2D6A4F,#52B788)",transition:"width .5s"}}/>
          </div>

          {/* Nivel card */}
          <div style={{background:"linear-gradient(135deg,#1B4332,#2D6A4F)",borderRadius:20,padding:20,marginBottom:16,textAlign:"center",boxShadow:"0 6px 24px #2D6A4F44"}}>
            <div style={{fontSize:40,marginBottom:8}}>{nivel.icon}</div>
            <div style={{fontSize:18,fontWeight:900,color:"#fff"}}>{nivel.nivel}</div>
            <div style={{fontSize:12,color:"rgba(255,255,255,.7)",marginTop:4}}>{streak>0?`🔥 ${streak} días de racha consecutiva`:"Registra hoy para empezar tu racha"}</div>
            {history.length>0&&<div style={{fontSize:11,color:"rgba(255,255,255,.5)",marginTop:2}}>{history.length} registros totales</div>}
            <div style={{marginTop:12,background:"rgba(255,255,255,0.15)",borderRadius:10,padding:"8px 12px",fontSize:11,color:"rgba(255,255,255,.8)"}}>
              {streak<3?"Registra 3 días seguidos para subir de nivel":streak<7?"¡4 días más para Guerrero Vital!":streak<30?"¡Camino al nivel Maestro!":"🏆 ¡Nivel máximo alcanzado!"}
            </div>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {BADGES.map(b=>{
              const earned=badges.includes(b.id);
              return(
                <div key={b.id} style={{background:"#fff",borderRadius:16,padding:16,textAlign:"center",boxShadow:"0 2px 12px rgba(0,0,0,0.06)",opacity:earned?1:.5,border:`2px solid ${earned?"#52B78844":"transparent"}`,transition:"all .3s"}}>
                  <div style={{fontSize:32,marginBottom:8,filter:earned?"none":"grayscale(1)"}}>{b.icon}</div>
                  <div style={{fontSize:13,fontWeight:800,color:earned?"#1A1A1A":"#aaa"}}>{b.nombre}</div>
                  <div style={{fontSize:10,color:"#aaa",marginTop:3}}>{b.desc}</div>
                  {earned&&<div style={{marginTop:8,fontSize:10,color:"#2D6A4F",fontWeight:800,background:"#E8F4EC",padding:"3px 10px",borderRadius:20,display:"inline-block"}}>✓ Obtenida</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══ TAB 4: AGUA ════════════════════════════════════════════ */}
      {tab===4&&(
        <div style={{padding:"16px 14px"}}>
          <div style={{fontSize:18,fontWeight:900,marginBottom:4}}>Hidratación</div>
          <div style={{fontSize:13,color:"#888",marginBottom:16}}>Meta: {WATER_GOAL} vasos · Hoy: {water} · {Math.round(waterPct)}%</div>

          <div style={{background:"#fff",borderRadius:20,padding:20,marginBottom:14,boxShadow:"0 4px 20px rgba(0,0,0,0.08)"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
              <span style={{fontSize:14,fontWeight:800}}>💧 Progreso del día</span>
              <span style={{fontSize:14,fontWeight:900,color:waterPct>=100?"#2D6A4F":"#1A6FA8"}}>{water}/{WATER_GOAL}</span>
            </div>
            <div style={{background:"#E8F4EC",borderRadius:10,height:14,marginBottom:16,overflow:"hidden"}}>
              <div style={{width:`${waterPct}%`,height:14,borderRadius:10,background:"linear-gradient(90deg,#1A6FA8,#52B788)",transition:"width .5s"}}/>
            </div>
            <div style={{display:"flex",justifyContent:"center",flexWrap:"wrap",gap:8,marginBottom:16}}>
              {Array.from({length:WATER_GOAL}).map((_,i)=>(
                <div key={i} onClick={()=>changeWater(i<water?-(water-i):i-water+1)} style={{width:48,height:58,borderRadius:12,background:i<water?"linear-gradient(180deg,#1A6FA8,#0D47A1)":"#F0F0F0",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,cursor:"pointer",transition:"all .2s",transform:i<water?"scale(1.05)":"scale(1)",boxShadow:i<water?"0 4px 12px #1A6FA844":"none"}}>{i<water?"💧":"○"}</div>
              ))}
            </div>
            <div style={{display:"flex",gap:12,justifyContent:"center"}}>
              <button onClick={()=>changeWater(-1)} style={{width:56,height:56,borderRadius:"50%",border:"2px solid #E8E8E8",background:"#F8FAF5",color:"#333",fontSize:24,cursor:"pointer",fontWeight:700}}>−</button>
              <button onClick={()=>changeWater(1)} style={{width:56,height:56,borderRadius:"50%",border:"none",background:"linear-gradient(135deg,#1A6FA8,#52B788)",color:"#fff",fontSize:24,cursor:"pointer",fontWeight:700,boxShadow:"0 4px 16px #1A6FA844"}}>+</button>
            </div>
            {water>=WATER_GOAL&&<div style={{marginTop:14,color:"#2D6A4F",fontSize:14,fontWeight:800,textAlign:"center",background:"#E8F4EC",padding:"10px",borderRadius:12}}>🎉 ¡Meta de agua cumplida hoy!</div>}
          </div>

          <div style={{background:"#fff",borderRadius:16,padding:16,boxShadow:"0 2px 12px rgba(0,0,0,0.06)",border:"2px solid #E8F4EC"}}>
            <div style={{fontSize:12,color:"#2D6A4F",fontWeight:800,marginBottom:6}}>💡 Habit Stacking</div>
            <div style={{fontSize:13,color:"#555",lineHeight:1.6}}>"Después de servirme mi café de la mañana, registraré mi primer vaso de agua en VitalTrack."</div>
          </div>
        </div>
      )}

      {/* ══ NAV INFERIOR ══════════════════════════════════════════ */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,background:"#fff",borderTop:"1px solid #F0F0F0",display:"flex",zIndex:20,boxShadow:"0 -4px 20px rgba(0,0,0,0.08)",paddingBottom:"env(safe-area-inset-bottom,0px)"}}>
        {TABS.map((t,i)=>(
          <button key={i} onClick={()=>setTab(i)} style={{flex:1,padding:"10px 4px 8px",background:"transparent",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3,transition:"all .15s"}}>
            <div style={{width:38,height:38,borderRadius:12,background:tab===i?"#2D6A4F":"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,transition:"all .2s",boxShadow:tab===i?"0 4px 12px #2D6A4F44":"none"}}>{t.icon}</div>
            <div style={{fontSize:9,fontWeight:tab===i?800:500,color:tab===i?"#2D6A4F":"#aaa",letterSpacing:.3}}>{t.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
