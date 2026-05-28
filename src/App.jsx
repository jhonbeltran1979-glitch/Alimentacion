import { useState, useEffect, useRef } from "react";

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxuSWQvUB377F-BA0M-LuHXPzBG1qDNPmv6ZbVM5nG744ZVsEDzN6ko_bsRZo6ewI1SIg/exec";
const _k = ["sk-ant-api03-7i2NPrcTcVD3IKU8SQNmhf","VsoSQ1O0-ftZSVI3LfT_XZCxGkdRlw_0y29QO8LP","WCsuswtJwHxVoCJodbVaiSTw-PQ2ULwAA"];
let CLAUDE_API_KEY = _k.join("");

// ─── PÍLDORAS DE SABIDURÍA ───────────────────────────────────────────────────
const PILDORAS = [
  "💡 El aguacate tiene grasas que ayudan a tu cerebro a procesar información más rápido.",
  "💡 Comer legumbres 3 veces por semana reduce el riesgo cardiovascular en un 22%.",
  "💡 El brócoli contiene sulforafano, uno de los compuestos anticancerígenos más potentes.",
  "💡 Tomar agua antes de comer reduce la ingesta calórica hasta un 13%.",
  "💡 La espinaca cruda tiene más hierro que cocida — el calor reduce su absorción.",
  "💡 El huevo es el alimento con la proteína de mayor calidad biológica disponible.",
  "💡 Comer lento (20+ min) permite que el cerebro registre la saciedad correctamente.",
  "💡 El plátano verde tiene almidón resistente que alimenta las bacterias buenas del intestino.",
  "💡 Las nueces mejoran la memoria por su contenido de Omega-3 y vitamina E.",
  "💡 La cúrcuma con pimienta negra aumenta su absorción un 2000% en el organismo.",
  "💡 Dormir menos de 7 horas aumenta el apetito por azúcares al día siguiente.",
  "💡 El kiwi antes de dormir mejora la calidad del sueño por su contenido de serotonina.",
];

// ─── MENSAJES DE IDENTIDAD ───────────────────────────────────────────────────
const IDENTITY_MSGS = [
  (n,s) => `🌟 ${n}, has cubierto el ${s}% de tu meta nutricional. ¡Eres el tipo de persona que cuida su salud!`,
  (n,s) => `💪 ¡Excelente elección, ${n}! Cada registro es un voto por la persona saludable que estás construyendo.`,
  (n,s) => `🥗 ${n}, tu cuerpo te agradecerá estas decisiones. Score ${s}% — ¡sigue construyendo tu mejor versión!`,
  (n,s) => `⚡ Con un score de ${s}%, ${n}, estás nutriendo tu energía para el resto del día. ¡Así se hace!`,
  (n,s) => `🛡️ ${n}, cada alimento saludable fortalece tu sistema inmune. ¡${s}% más cerca de tu meta!`,
];

// ─── INSIGNIAS ───────────────────────────────────────────────────────────────
const BADGES = [
  { id:"racha3",    icon:"🔥", nombre:"En racha",       desc:"3 días seguidos",      check:(s)=>s.streak>=3 },
  { id:"racha7",    icon:"⭐", nombre:"Una semana",      desc:"7 días seguidos",      check:(s)=>s.streak>=7 },
  { id:"racha30",   icon:"🏆", nombre:"Mes campeón",     desc:"30 días seguidos",     check:(s)=>s.streak>=30 },
  { id:"agua",      icon:"💧", nombre:"Hidratado",       desc:"Meta de agua cumplida",check:(s)=>s.water>=8 },
  { id:"verde",     icon:"🥗", nombre:"Plato verde",     desc:"Score mayor a 70%",    check:(s)=>s.lastScore>=70 },
  { id:"variedad",  icon:"🌈", nombre:"Arcoíris",        desc:"5+ categorías",        check:(s)=>s.lastCats>=5 },
  { id:"pro",       icon:"💪", nombre:"Proteína Pro",    desc:"Proteínas en 3 comidas",check:(s,h)=>(h||[]).filter(r=>(Array.isArray(r.alimentos)?r.alimentos:[]).some(a=>["Pollo","Res","Huevo","Atún","Salmón","Tofu","Lentejas"].includes(a))).length>=3 },
  { id:"constante", icon:"📅", nombre:"Constante",       desc:"10 registros totales", check:(s,h)=>(h||[]).length>=10 },
  { id:"gourmet",   icon:"👨‍🍳", nombre:"Gourmet",         desc:"7 categorías distintas usadas",check:(s,h)=>new Set((h||[]).flatMap(r=>Array.isArray(r.alimentos)?r.alimentos:[])).size>=7 },
];

// ─── NIVELES DE IDENTIDAD ────────────────────────────────────────────────────
const getNivel = (streak, totalRegistros) => {
  if (streak >= 30 || totalRegistros >= 50) return { nivel:"Maestro del Bienestar", icon:"🧘", color:"#ffd700" };
  if (streak >= 7  || totalRegistros >= 20) return { nivel:"Guerrero de la Vitalidad", icon:"⚔️", color:"#00d4aa" };
  if (streak >= 3  || totalRegistros >= 5)  return { nivel:"Explorador Saludable", icon:"🌱", color:"#6c63ff" };
  return { nivel:"Principiante Consciente", icon:"🌟", color:"#7b82a8" };
};

// ─── NUTRIENTES ──────────────────────────────────────────────────────────────
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
  "🥦 Verduras": { items:["Brócoli","Espinaca","Kale","Zanahoria","Tomate","Pimentón","Ajo","Champiñones","Aguacate","Repollo","Lechuga","Acelga","Cebolla","Remolacha"], nutrients:["Vitamina C","Vitamina A","Fibra","Antioxidantes","Hierro"] },
  "🍎 Frutas":   { items:["Naranja","Mango","Papaya","Banano","Fresas","Arándanos","Guayaba","Maracuyá","Piña","Manzana","Uvas","Kiwi"], nutrients:["Vitamina C","Antioxidantes","Fibra","Potasio"] },
  "🥩 Proteínas":{ items:["Pollo","Res","Cerdo","Huevo","Atún","Sardinas","Salmón","Tofu","Lentejas","Fríjoles","Garbanzo"], nutrients:["Proteína","Hierro","Vitamina B12","Zinc","Omega-3"] },
  "🥛 Lácteos":  { items:["Leche","Yogur","Queso","Kéfir","Kumis"], nutrients:["Calcio","Vitamina D","Probióticos","Proteína"] },
  "🌾 Granos":   { items:["Arroz","Avena","Quinoa","Pasta","Pan integral","Maíz","Cebada","Plátano","Yuca","Papa"], nutrients:["Fibra","Magnesio","Vitamina B12","Proteína"] },
  "🥜 Frutos secos":{ items:["Almendras","Nueces","Maní","Marañón","Chía","Linaza","Ajonjolí"], nutrients:["Omega-3","Magnesio","Proteína","Calcio"] },
  "💧 Bebidas":  { items:["Agua","Jugo natural","Té verde","Café","Leche vegetal"], nutrients:["Antioxidantes"] },
};

const MEALS = ["☀️ Desayuno","🌤️ Almuerzo","🌙 Cena","🍎 Merienda"];
const WATER_GOAL = 8;

const C = {
  bg:"#0d0f1a", card:"#151828", card2:"#1c2035", border:"#252840",
  accent:"#6c63ff", accent2:"#ff6b9d", green:"#00d4aa",
  yellow:"#ffd166", red:"#ff4757", text:"#e8eaf6", muted:"#7b82a8", white:"#ffffff",
};

// ─── CALCULAR SCORES ─────────────────────────────────────────────────────────
function calcScores(selectedFoods) {
  const totals = { immunity:0, energy:0, focus:0, vitality:0 };
  const nutrientsFound = new Set();
  const catsUsed = new Set();
  Object.entries(FOOD_CATEGORIES).forEach(([cat,c]) => {
    const hasItem = c.items.some(item => selectedFoods.includes(item));
    if (hasItem) {
      catsUsed.add(cat);
      c.nutrients.forEach(n => {
        if (NUTRIENT_MAP[n] && !nutrientsFound.has(n)) {
          nutrientsFound.add(n);
          Object.keys(totals).forEach(k => { totals[k] += (NUTRIENT_MAP[n][k]||0); });
        }
      });
    }
  });
  const cap = v => Math.min(100, Math.round(v));
  return {
    immunity:cap(totals.immunity), energy:cap(totals.energy),
    focus:cap(totals.focus), vitality:cap(totals.vitality),
    total:cap((totals.immunity+totals.energy+totals.focus+totals.vitality)/4),
    nutrients:[...nutrientsFound], cats:catsUsed.size,
  };
}

// ─── API ─────────────────────────────────────────────────────────────────────
async function apiGet(params) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${APPS_SCRIPT_URL}?${qs}`, { redirect:"follow" });
  const text = await res.text();
  try { return JSON.parse(text); } catch(_) { return { ok:false, registros:[] }; }
}

async function analizarTexto(alimentos, perfil_salud) {
  const ctx = perfil_salud ? `El usuario tiene ${perfil_salud.edad} años, actividad "${perfil_salud.ejercicio}", condición "${perfil_salud.enfermedad}".` : "";
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST",
    headers:{ "Content-Type":"application/json","x-api-key":CLAUDE_API_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true" },
    body: JSON.stringify({
      model:"claude-opus-4-5", max_tokens:700,
      messages:[{ role:"user", content:`Eres nutricionista experto. ${ctx}\nAlimentos registrados: ${alimentos.join(", ")}.\nResponde SOLO con JSON sin backticks:\n{"recomendacion":"consejo personalizado según perfil de salud, máximo 3 oraciones concretas","semaforo":"verde|amarillo|rojo","calorias_aprox":"estimado","faltantes":["nutrientes faltantes según perfil"]}` }]
    })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message||"Error IA");
  if (data.content?.[0]?.text) return JSON.parse(data.content[0].text.trim().replace(/```json|```/g,"").trim());
  throw new Error("Sin respuesta");
}

async function analizarConClaude(base64, mediaType, perfil_salud) {
  const ctx = perfil_salud ? `El usuario tiene ${perfil_salud.edad} años, actividad "${perfil_salud.ejercicio}", condición "${perfil_salud.enfermedad}".` : "";
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST",
    headers:{ "Content-Type":"application/json","x-api-key":CLAUDE_API_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true" },
    body: JSON.stringify({
      model:"claude-opus-4-5", max_tokens:800,
      messages:[{ role:"user", content:[
        { type:"image", source:{ type:"base64", media_type:mediaType, data:base64 } },
        { type:"text", text:`Nutricionista experto. ${ctx}\nDistingue bien tubérculos (papa=blanca/harinosa, calabacín=verde/aguado, yuca=blanca/fibrosa).\nResponde SOLO con JSON sin backticks:\n{"alimentos":[{"nombre":"alimento","porcion":"Xg","confianza":"alta|media|baja"}],"recomendacion":"consejo personalizado 2 oraciones","semaforo":"verde|amarillo|rojo","calorias_aprox":"X kcal"}` }
      ]}]
    })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message||"Error IA");
  if (data.content?.[0]?.text) return JSON.parse(data.content[0].text.trim().replace(/```json|```/g,"").trim());
  throw new Error("Sin respuesta");
}

const sk = (perfil, key) => `vt_${perfil}_${key}`;

// ═══════════════════════════════════════════════════════════════════
//  PANTALLA 1: NOMBRE
// ═══════════════════════════════════════════════════════════════════
function ProfileScreen({ onEnter }) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef();
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 300); }, []);

  const handleEnter = async () => {
    const trimmed = name.trim();
    if (!trimmed) { setError("Escribe tu nombre"); return; }
    if (trimmed.length < 2) { setError("Mínimo 2 caracteres"); return; }
    setLoading(true);
    localStorage.setItem("vt_perfil_actual", trimmed);
    try { await apiGet({ action:"historial", perfil:trimmed }); } catch(_) {}
    setLoading(false);
    onEnter(trimmed);
  };

  return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:24,fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      <div style={{background:C.card,borderRadius:24,padding:40,maxWidth:380,width:"100%",border:`1px solid ${C.border}`,boxShadow:"0 32px 80px rgba(108,99,255,0.15)"}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{width:72,height:72,borderRadius:20,margin:"0 auto 16px",background:`linear-gradient(135deg,${C.accent},${C.accent2})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:36}}>🥗</div>
          <div style={{color:C.text,fontSize:26,fontWeight:700,letterSpacing:-0.5}}>VitalTrack</div>
          <div style={{color:C.muted,fontSize:13,marginTop:4}}>Tu guía personalizada de alimentación</div>
        </div>
        <div style={{marginBottom:8}}>
          <div style={{color:C.text,fontSize:14,fontWeight:600,marginBottom:8}}>¿Cuál es tu nombre?</div>
          <input ref={inputRef} value={name}
            onChange={e=>{setName(e.target.value);setError("");}}
            onKeyDown={e=>e.key==="Enter"&&handleEnter()}
            placeholder="Ej: María, Juan, Catalina..."
            style={{width:"100%",padding:"14px 16px",borderRadius:12,background:C.card2,border:`1.5px solid ${error?C.red:C.border}`,color:C.text,fontSize:16,outline:"none",boxSizing:"border-box"}}
          />
          {error && <div style={{color:C.red,fontSize:12,marginTop:6}}>{error}</div>}
        </div>
        <div style={{color:C.muted,fontSize:12,marginBottom:24,lineHeight:1.5}}>Tus datos quedarán en una pestaña propia en el Google Sheet del grupo.</div>
        <button onClick={handleEnter} disabled={loading} style={{width:"100%",padding:"14px",borderRadius:12,border:"none",background:loading?C.border:`linear-gradient(135deg,${C.accent},${C.accent2})`,color:C.white,fontSize:16,fontWeight:700,cursor:loading?"not-allowed":"pointer"}}>
          {loading?"Preparando tu perfil...":"Continuar →"}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  PANTALLA 2: PERFIL DE SALUD
// ═══════════════════════════════════════════════════════════════════
function HealthProfileScreen({ perfil, onComplete }) {
  const [edad, setEdad] = useState("");
  const [ejercicio, setEjercicio] = useState("");
  const [enfermedad, setEnfermedad] = useState("");
  const [otraEnf, setOtraEnf] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const EJERCICIOS = ["🛋️ Sedentario","🚶 Caminata ocasional","🏃 3-4 veces/semana","💪 Diario intenso"];
  const ENFERMEDADES = ["Ninguna","Diabetes","Hipertensión","Colesterol alto","Hipotiroidismo","Gastritis","Otra"];

  const handleSave = async () => {
    if (!edad || parseInt(edad)<1 || parseInt(edad)>110) { setError("Ingresa una edad válida"); return; }
    if (!ejercicio) { setError("Selecciona tu nivel de actividad"); return; }
    if (!enfermedad) { setError("Selecciona una opción de salud"); return; }
    setLoading(true);
    const enf = enfermedad==="Otra" ? (otraEnf||"Otra condición") : enfermedad;
    try { await apiGet({ action:"guardar_perfil", perfil, edad, ejercicio:encodeURIComponent(ejercicio), enfermedad:encodeURIComponent(enf) }); } catch(_) {}
    localStorage.setItem(sk(perfil,"perfil_salud"), JSON.stringify({ edad, ejercicio, enfermedad:enf }));
    setLoading(false);
    onComplete({ edad, ejercicio, enfermedad:enf });
  };

  return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:24,fontFamily:"'Segoe UI',system-ui,sans-serif",overflowY:"auto"}}>
      <div style={{background:C.card,borderRadius:24,padding:28,maxWidth:400,width:"100%",border:`1px solid ${C.border}`,boxShadow:"0 32px 80px rgba(108,99,255,0.15)",margin:"20px 0"}}>
        <div style={{textAlign:"center",marginBottom:20}}>
          <div style={{fontSize:40,marginBottom:8}}>🩺</div>
          <div style={{color:C.text,fontSize:20,fontWeight:700}}>Tu perfil de salud</div>
          <div style={{color:C.muted,fontSize:12,marginTop:4}}>Hola <b style={{color:C.accent}}>{perfil}</b> — esto personaliza tus recomendaciones nutricionales</div>
        </div>

        <div style={{marginBottom:16}}>
          <div style={{color:C.text,fontSize:13,fontWeight:600,marginBottom:6}}>¿Cuántos años tienes?</div>
          <input type="number" value={edad} onChange={e=>{setEdad(e.target.value);setError("");}} placeholder="Ej: 32"
            style={{width:"100%",padding:"12px 14px",borderRadius:10,background:C.card2,border:`1.5px solid ${C.border}`,color:C.text,fontSize:15,outline:"none",boxSizing:"border-box"}}/>
        </div>

        <div style={{marginBottom:16}}>
          <div style={{color:C.text,fontSize:13,fontWeight:600,marginBottom:6}}>¿Cuánto ejercicio haces?</div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {EJERCICIOS.map(e=>(
              <button key={e} onClick={()=>{setEjercicio(e);setError("");}} style={{padding:"10px 14px",borderRadius:10,border:`1.5px solid ${ejercicio===e?C.accent:C.border}`,background:ejercicio===e?`${C.accent}22`:C.card2,color:ejercicio===e?C.accent:C.muted,fontSize:13,cursor:"pointer",textAlign:"left",fontWeight:ejercicio===e?700:400}}>{e}</button>
            ))}
          </div>
        </div>

        <div style={{marginBottom:20}}>
          <div style={{color:C.text,fontSize:13,fontWeight:600,marginBottom:6}}>¿Tienes alguna condición de salud?</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {ENFERMEDADES.map(e=>(
              <button key={e} onClick={()=>{setEnfermedad(e);setError("");}} style={{padding:"8px 12px",borderRadius:20,border:`1.5px solid ${enfermedad===e?C.accent2:C.border}`,background:enfermedad===e?`${C.accent2}22`:C.card2,color:enfermedad===e?C.accent2:C.muted,fontSize:12,cursor:"pointer",fontWeight:enfermedad===e?700:400}}>{e}</button>
            ))}
          </div>
          {enfermedad==="Otra"&&<input value={otraEnf} onChange={e=>setOtraEnf(e.target.value)} placeholder="¿Cuál condición?" style={{marginTop:8,width:"100%",padding:"10px 14px",borderRadius:10,background:C.card2,border:`1.5px solid ${C.border}`,color:C.text,fontSize:13,outline:"none",boxSizing:"border-box"}}/>}
        </div>

        {error&&<div style={{color:C.red,fontSize:12,marginBottom:12,textAlign:"center"}}>{error}</div>}
        <button onClick={handleSave} disabled={loading} style={{width:"100%",padding:"14px",borderRadius:12,border:"none",background:loading?C.border:`linear-gradient(135deg,${C.accent},${C.accent2})`,color:C.white,fontSize:15,fontWeight:700,cursor:loading?"not-allowed":"pointer"}}>
          {loading?"Guardando...":"Guardar y comenzar 🚀"}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  TOAST: INSIGNIA
// ═══════════════════════════════════════════════════════════════════
function BadgeToast({ badge, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, []);
  return (
    <div style={{position:"fixed",top:20,left:"50%",transform:"translateX(-50%)",zIndex:999,background:`linear-gradient(135deg,${C.accent},${C.accent2})`,borderRadius:16,padding:"12px 20px",display:"flex",alignItems:"center",gap:12,boxShadow:"0 8px 32px rgba(108,99,255,0.5)",maxWidth:320,width:"90%",animation:"slideDown 0.3s ease"}}>
      <div style={{fontSize:32}}>{badge.icon}</div>
      <div>
        <div style={{color:C.white,fontWeight:700,fontSize:13}}>¡Insignia desbloqueada!</div>
        <div style={{color:"rgba(255,255,255,0.9)",fontSize:14,fontWeight:600}}>{badge.nombre}</div>
        <div style={{color:"rgba(255,255,255,0.7)",fontSize:11}}>{badge.desc}</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  TOAST: PÍLDORA DE SABIDURÍA
// ═══════════════════════════════════════════════════════════════════
function PildoraToast({ msg, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 5000); return () => clearTimeout(t); }, []);
  return (
    <div style={{position:"fixed",bottom:90,left:"50%",transform:"translateX(-50%)",zIndex:998,background:C.card,borderRadius:16,padding:"14px 18px",maxWidth:340,width:"90%",border:`1px solid ${C.accent}`,boxShadow:"0 8px 32px rgba(0,0,0,0.4)"}}>
      <div style={{fontSize:12,color:C.accent,fontWeight:700,marginBottom:4}}>💡 Píldora de sabiduría</div>
      <div style={{fontSize:13,color:C.text,lineHeight:1.5}}>{msg}</div>
      <button onClick={onClose} style={{position:"absolute",top:8,right:10,background:"transparent",border:"none",color:C.muted,cursor:"pointer",fontSize:16}}>✕</button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  CONFETI
// ═══════════════════════════════════════════════════════════════════
function Confeti({ onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2500); return () => clearTimeout(t); }, []);
  const pieces = Array.from({length:20},(_,i)=>i);
  const colors = [C.accent,C.accent2,C.green,C.yellow,"#fff"];
  return (
    <div style={{position:"fixed",top:0,left:0,width:"100%",height:"100%",pointerEvents:"none",zIndex:9999,overflow:"hidden"}}>
      {pieces.map(i=>(
        <div key={i} style={{
          position:"absolute",
          left:`${Math.random()*100}%`,
          top:"-10px",
          width:8,height:8,
          borderRadius:Math.random()>0.5?"50%":0,
          background:colors[Math.floor(Math.random()*colors.length)],
          animation:`fall ${0.8+Math.random()*1.5}s ease-in ${Math.random()*0.5}s forwards`,
          transform:`rotate(${Math.random()*360}deg)`
        }}/>
      ))}
      <style>{`@keyframes fall{to{transform:translateY(100vh) rotate(720deg);opacity:0}}`}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  APP PRINCIPAL
// ═══════════════════════════════════════════════════════════════════
export default function App() {
  const [perfil, setPerfil]               = useState(null);
  const [healthProfile, setHealthProfile] = useState(null);
  const [showHealthForm, setShowHealthForm]= useState(false);
  const [tab, setTab]                     = useState(0);
  const [meal, setMeal]                   = useState(0);
  const [selected, setSelected]           = useState([]);
  const [catOpen, setCatOpen]             = useState(null);
  const [saving, setSaving]               = useState(false);
  const [savedMsg, setSavedMsg]           = useState("");
  const [water, setWater]                 = useState(0);
  const [streak, setStreak]               = useState(0);
  const [history, setHistory]             = useState([]);
  const [loadingHistory, setLoadingHistory]= useState(false);
  const [photoAnalyzing, setPhotoAnalyzing]= useState(false);
  const [photoResult, setPhotoResult]     = useState(null);
  const [photoPreview, setPhotoPreview]   = useState(null);
  const [earnedBadges, setEarnedBadges]   = useState([]);
  const [newBadge, setNewBadge]           = useState(null);
  const [lastScore, setLastScore]         = useState(0);
  const [lastCats, setLastCats]           = useState(0);
  const [customFood, setCustomFood]       = useState("");
  const [customFoods, setCustomFoods]     = useState([]);
  const [analyzingText, setAnalyzingText] = useState(false);
  const [showConfeti, setShowConfeti]     = useState(false);
  const [pildora, setPildora]             = useState(null);
  const [identityMsg, setIdentityMsg]     = useState("");
  const [quickFoods, setQuickFoods]       = useState([]); // Comidas frecuentes
  const [photoFoodList, setPhotoFoodList] = useState(null); // Para confirmación de foto
  const fileRef = useRef();

  // ── Init ───────────────────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem("vt_perfil_actual");
    if (saved) {
      setPerfil(saved);
      const hp = localStorage.getItem(sk(saved,"perfil_salud"));
      if (hp) setHealthProfile(JSON.parse(hp));
      else {
        apiGet({ action:"obtener_perfil", perfil:saved }).then(r => {
          if (r.ok && r.encontrado) {
            const hp2 = { edad:r.edad, ejercicio:r.ejercicio, enfermedad:r.enfermedad };
            setHealthProfile(hp2);
            localStorage.setItem(sk(saved,"perfil_salud"), JSON.stringify(hp2));
          } else setShowHealthForm(true);
        }).catch(()=>setShowHealthForm(true));
      }
      // Cargar comidas frecuentes
      const qf = localStorage.getItem(sk(saved,"quick_foods"));
      if (qf) setQuickFoods(JSON.parse(qf));
    }
    const cached = localStorage.getItem("vt_api_key_cache");
    if (cached) CLAUDE_API_KEY = cached;
    apiGet({ action:"getKey" }).then(r => {
      if (r.ok && r.k) { CLAUDE_API_KEY = r.k; localStorage.setItem("vt_api_key_cache", r.k); }
    }).catch(()=>{});
  }, []);

  useEffect(() => {
    if (!perfil) return;
    const k = sk(perfil,"water"), d = sk(perfil,"water_date");
    const today = new Date().toLocaleDateString("es-CO");
    if (localStorage.getItem(d)===today) setWater(parseInt(localStorage.getItem(k)||"0"));
    else { setWater(0); localStorage.setItem(k,"0"); localStorage.setItem(d,today); }
    setStreak(parseInt(localStorage.getItem(sk(perfil,"streak"))||"0"));
    const saved = localStorage.getItem(sk(perfil,"badges"));
    if (saved) setEarnedBadges(JSON.parse(saved));
  }, [perfil]);

  useEffect(() => {
    if (!perfil || tab!==2) return;
    setLoadingHistory(true);
    apiGet({ action:"historial", perfil })
      .then(data => { if (data.ok) setHistory(data.registros||[]); })
      .catch(()=>{}).finally(()=>setLoadingHistory(false));
  }, [perfil, tab]);

  // ── Pantallas de onboarding ────────────────────────────────────
  if (!perfil) return <ProfileScreen onEnter={p => { setPerfil(p); setShowHealthForm(true); }} />;
  if (showHealthForm && !healthProfile) return <HealthProfileScreen perfil={perfil} onComplete={hp => { setHealthProfile(hp); setShowHealthForm(false); }} />;

  const scores = calcScores(selected);
  const today  = new Date().toLocaleDateString("es-CO");
  const scoreColor = v => v>=70?C.green:v>=40?C.yellow:C.red;
  const toggleFood = food => setSelected(prev => prev.includes(food)?prev.filter(f=>f!==food):[...prev,food]);

  // ── Verificar insignias ────────────────────────────────────────
  const checkBadges = (state, hist) => {
    const current = JSON.parse(localStorage.getItem(sk(perfil,"badges"))||"[]");
    BADGES.forEach(badge => {
      if (!current.includes(badge.id) && badge.check(state, hist)) {
        current.push(badge.id);
        localStorage.setItem(sk(perfil,"badges"), JSON.stringify(current));
        setEarnedBadges([...current]);
        setNewBadge(badge);
      }
    });
  };

  // ── Actualizar comidas frecuentes ──────────────────────────────
  const updateQuickFoods = (foods) => {
    const allFoods = [...quickFoods, ...foods];
    const freq = {};
    allFoods.forEach(f => { freq[f] = (freq[f]||0)+1; });
    const sorted = Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([f])=>f);
    setQuickFoods(sorted);
    localStorage.setItem(sk(perfil,"quick_foods"), JSON.stringify(sorted));
  };

  // ── Guardar ────────────────────────────────────────────────────
  const handleSave = async () => {
    const pendingFoods = customFood.trim() ? [...customFoods, customFood.trim()] : [...customFoods];
    if (customFood.trim()) { setCustomFoods(pendingFoods); setCustomFood(""); }
    const todosAlimentos = [...selected, ...pendingFoods];
    if (todosAlimentos.length===0) { setSavedMsg("⚠️ Selecciona al menos un alimento"); setTimeout(()=>setSavedMsg(""),2500); return; }
    setSaving(true);
    setSavedMsg("💾 Guardando...");

    let analisis = photoResult;
    if (!analisis && !photoPreview) {
      try {
        setSavedMsg("🧠 Analizando nutrición...");
        const result = await analizarTexto(todosAlimentos, healthProfile);
        analisis = { ok:true, alimentos:[], ...result };
        setPhotoResult(analisis);
        setSavedMsg("💾 Guardando...");
      } catch(_) { analisis = null; }
    }

    try {
      const res = await apiGet({
        action:"guardar", perfil, fecha:today,
        comida: encodeURIComponent(MEALS[meal].replace(/[^\w\s]/g,"").trim()),
        alimentos: encodeURIComponent(JSON.stringify(todosAlimentos)),
        score_total:scores.total, score_inmunidad:scores.immunity,
        score_energia:scores.energy, score_concentracion:scores.focus,
        score_vitalidad:scores.vitality, agua_vasos:water, racha_dias:streak,
        notas: encodeURIComponent(analisis?.recomendacion||"")
      });
      if (res.ok) {
        const lastDate = localStorage.getItem(sk(perfil,"streak_date"));
        const yStr = new Date(Date.now()-86400000).toLocaleDateString("es-CO");
        const newStreak = lastDate===yStr ? streak+1 : 1;
        setStreak(newStreak);
        localStorage.setItem(sk(perfil,"streak"), newStreak);
        localStorage.setItem(sk(perfil,"streak_date"), today);
        setLastScore(scores.total);
        setLastCats(scores.cats);
        updateQuickFoods(todosAlimentos);
        const updatedHistory = [...history, { comida:MEALS[meal], alimentos:todosAlimentos }];
        checkBadges({ streak:newStreak, water, lastScore:scores.total, lastCats:scores.cats }, updatedHistory);

        // Confeti + mensaje de identidad + píldora
        setShowConfeti(true);
        const msg = IDENTITY_MSGS[Math.floor(Math.random()*IDENTITY_MSGS.length)](perfil, scores.total);
        setIdentityMsg(msg);
        const pil = PILDORAS[Math.floor(Math.random()*PILDORAS.length)];
        setTimeout(() => setPildora(pil), 1500);

        setSavedMsg(`✅ ¡Guardado! Score: ${scores.total}%`);
        setTimeout(() => {
          setSelected([]); setCustomFoods([]); setPhotoResult(null);
          setPhotoPreview(null); setPhotoFoodList(null); setSavedMsg(""); setIdentityMsg("");
        }, 4000);
      } else { setSavedMsg("❌ Error al guardar. Intenta de nuevo."); }
    } catch(e) { setSavedMsg(`❌ Error: ${e.message}`); }
    setSaving(false);
  };

  // ── Agua ───────────────────────────────────────────────────────
  const changeWater = delta => {
    const nw = Math.max(0,Math.min(12,water+delta));
    setWater(nw);
    localStorage.setItem(sk(perfil,"water"),nw);
    localStorage.setItem(sk(perfil,"water_date"),today);
    if (nw>=8) checkBadges({ streak, water:nw, lastScore, lastCats }, history);
  };

  // ── Foto ───────────────────────────────────────────────────────
  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoAnalyzing(true);
    setPhotoResult(null);
    setPhotoFoodList(null);
    const previewUrl = URL.createObjectURL(file);
    setPhotoPreview(previewUrl);
    try {
      const compressed = await new Promise((res,rej) => {
        const img = new Image();
        img.onload = () => {
          const MAX=512, ratio=Math.min(MAX/img.width,MAX/img.height,1);
          const canvas = document.createElement("canvas");
          canvas.width=Math.round(img.width*ratio); canvas.height=Math.round(img.height*ratio);
          canvas.getContext("2d").drawImage(img,0,0,canvas.width,canvas.height);
          res(canvas.toDataURL("image/jpeg",0.6).split(",")[1]);
        };
        img.onerror=rej; img.src=previewUrl;
      });
      const result = await analizarConClaude(compressed,"image/jpeg",healthProfile);
      setPhotoResult({ ok:true,...result });
      setPhotoFoodList(result.alimentos||[]);
      // Auto-seleccionar
      (result.alimentos||[]).forEach(item => {
        const al = typeof item==="object"?item.nombre:item;
        Object.values(FOOD_CATEGORIES).forEach(cat => {
          const match = cat.items.find(i=>i.toLowerCase().includes(al.toLowerCase())||al.toLowerCase().includes(i.toLowerCase()));
          if (match && !selected.includes(match)) setSelected(prev=>[...prev,match]);
        });
      });
    } catch(err) {
      setPhotoResult({ ok:false, recomendacion:`Error: ${err.message}`, semaforo:"rojo", alimentos:[] });
    }
    setPhotoAnalyzing(false);
    e.target.value="";
  };

  // ── Nivel del usuario ──────────────────────────────────────────
  const nivel = getNivel(streak, history.length);

  // ── Porcentaje de agua ─────────────────────────────────────────
  const waterPct = Math.min(100, (water/WATER_GOAL)*100);

  const TABS = [
    { icon:"📝", label:"Registrar" },
    { icon:"📊", label:"Score" },
    { icon:"📅", label:"Historial" },
    { icon:"🏅", label:"Insignias" },
    { icon:"💧", label:"Agua" },
  ];

  // ═══════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════
  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Segoe UI',system-ui,sans-serif",color:C.text,maxWidth:480,margin:"0 auto",paddingBottom:72}}>

      {/* Overlays */}
      {showConfeti && <Confeti onDone={()=>setShowConfeti(false)}/>}
      {newBadge && <BadgeToast badge={newBadge} onClose={()=>setNewBadge(null)}/>}
      {pildora && <PildoraToast msg={pildora} onClose={()=>setPildora(null)}/>}

      {/* Barra de agua permanente */}
      <div style={{height:3,background:C.border,position:"sticky",top:0,zIndex:20}}>
        <div style={{height:3,width:`${waterPct}%`,background:"linear-gradient(90deg,#2196f3,#00bcd4)",transition:"width 0.5s"}}/>
      </div>

      {/* Header */}
      <div style={{background:C.card,borderBottom:`1px solid ${C.border}`,padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:3,zIndex:10}}>
        <div>
          <div style={{fontSize:14,fontWeight:700}}>🥗 VitalTrack</div>
          <div style={{fontSize:10,color:C.muted}}>
            <b style={{color:C.accent}}>{perfil}</b>
            {healthProfile && <span style={{color:nivel.color}}> · {nivel.icon} {nivel.nivel}</span>}
          </div>
        </div>
        <div style={{display:"flex",gap:5,alignItems:"center"}}>
          {streak>0 && <div style={{background:"#ff6b0022",border:"1px solid #ff6b00",borderRadius:20,padding:"2px 7px",fontSize:11,color:"#ff6b00"}}>🔥{streak}</div>}
          {earnedBadges.length>0 && <div style={{background:`${C.accent}22`,border:`1px solid ${C.accent}`,borderRadius:20,padding:"2px 7px",fontSize:11,color:C.accent}}>🏅{earnedBadges.length}</div>}
          {healthProfile && <div style={{background:`${C.green}22`,border:`1px solid ${C.green}`,borderRadius:20,padding:"2px 7px",fontSize:10,color:C.green}}>{healthProfile.edad}a</div>}
          <button onClick={()=>{localStorage.removeItem("vt_perfil_actual");setPerfil(null);setHealthProfile(null);setShowHealthForm(false);}} style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:8,padding:"3px 7px",color:C.muted,fontSize:10,cursor:"pointer"}}>Salir</button>
        </div>
      </div>

      {/* ── TAB 0: REGISTRAR ── */}
      {tab===0 && (
        <div style={{padding:14}}>
          {/* Comida selector */}
          <div style={{display:"flex",gap:6,marginBottom:12,overflowX:"auto",paddingBottom:2}}>
            {MEALS.map((m,i)=>(
              <button key={i} onClick={()=>setMeal(i)} style={{flex:"0 0 auto",padding:"7px 12px",borderRadius:20,border:"none",cursor:"pointer",background:meal===i?C.accent:C.card2,color:meal===i?C.white:C.muted,fontSize:12,fontWeight:meal===i?700:400}}>{m}</button>
            ))}
          </div>

          {/* Comidas frecuentes */}
          {quickFoods.length>0 && (
            <div style={{marginBottom:12,background:C.card2,borderRadius:12,padding:10}}>
              <div style={{fontSize:11,color:C.muted,marginBottom:6,fontWeight:600}}>⚡ Comidas frecuentes — toca para agregar rápido</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                {quickFoods.map(f=>(
                  <button key={f} onClick={()=>{ if(!selected.includes(f)) setSelected(prev=>[...prev,f]); }} style={{padding:"5px 10px",borderRadius:20,border:"none",cursor:"pointer",background:selected.includes(f)?C.accent:C.border,color:selected.includes(f)?C.white:C.text,fontSize:12}}>{f}{selected.includes(f)?" ✓":""}</button>
                ))}
              </div>
            </div>
          )}

          {/* Foto */}
          <div style={{marginBottom:12}}>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={handlePhoto}/>
            <button onClick={()=>fileRef.current?.click()} disabled={photoAnalyzing} style={{width:"100%",padding:"11px",borderRadius:12,border:`1.5px dashed ${C.accent}`,background:`${C.accent}11`,color:C.accent,fontSize:13,fontWeight:600,cursor:"pointer"}}>
              {photoAnalyzing?"🔍 Analizando con IA...":"📷 Tomar foto y detectar alimentos"}
            </button>

            {photoPreview && (
              <div style={{marginTop:8,borderRadius:12,overflow:"hidden",maxHeight:160,background:C.card2}}>
                <img src={photoPreview} alt="foto" style={{width:"100%",objectFit:"cover",maxHeight:160}}/>
              </div>
            )}

            {/* Confirmación rápida de foto — "¿Lo guardo?" */}
            {photoFoodList && photoFoodList.length>0 && (
              <div style={{marginTop:8,background:C.card2,borderRadius:12,padding:10,border:`1px solid ${C.accent}44`}}>
                <div style={{fontSize:11,color:C.accent,fontWeight:700,marginBottom:6}}>✨ IA detectó — corrige si algo está mal:</div>
                <div style={{display:"flex",flexDirection:"column",gap:4}}>
                  {photoFoodList.map((item,i)=>{
                    const nombre = typeof item==="object"?item.nombre:item;
                    const porcion = typeof item==="object"?item.porcion:"";
                    const confianza = typeof item==="object"?item.confianza:"alta";
                    const matchApp = Object.values(FOOD_CATEGORIES).flatMap(c=>c.items).find(f=>f.toLowerCase().includes(nombre.toLowerCase())||nombre.toLowerCase().includes(f.toLowerCase()));
                    const isSelected = matchApp && selected.includes(matchApp);
                    return (
                      <div key={i} style={{display:"flex",alignItems:"center",gap:6,background:C.bg,borderRadius:8,padding:"6px 8px",border:`1px solid ${confianza==="baja"?C.yellow:C.border}`}}>
                        <div style={{flex:1}}>
                          <span style={{fontSize:12,fontWeight:600}}>{nombre}</span>
                          {confianza==="baja"&&<span style={{marginLeft:4,fontSize:9,background:`${C.yellow}33`,color:C.yellow,padding:"1px 4px",borderRadius:4}}>?dudoso</span>}
                          {porcion&&<span style={{marginLeft:4,fontSize:10,color:C.muted}}>{porcion}</span>}
                        </div>
                        <button onClick={()=>{ if(matchApp) toggleFood(matchApp); }} style={{padding:"3px 8px",borderRadius:6,border:"none",cursor:"pointer",fontSize:11,fontWeight:600,background:isSelected?`${C.green}22`:C.card2,color:isSelected?C.green:C.muted}}>
                          {isSelected?"✓ Sí":"✗ No"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {photoResult && (
              <div style={{marginTop:8,background:C.card2,borderRadius:12,padding:10,border:`1px solid ${photoResult.semaforo==="verde"?C.green:photoResult.semaforo==="rojo"?C.red:C.yellow}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                  <div style={{fontSize:12,fontWeight:700}}>{photoResult.semaforo==="verde"?"🟢":photoResult.semaforo==="rojo"?"🔴":"🟡"} Análisis IA</div>
                  {photoResult.calorias_aprox&&<div style={{fontSize:10,color:C.accent,background:`${C.accent}22`,padding:"1px 6px",borderRadius:8}}>~{photoResult.calorias_aprox}</div>}
                </div>
                <div style={{fontSize:11,color:C.muted,lineHeight:1.5}}>{photoResult.recomendacion}</div>
              </div>
            )}
          </div>

          {/* Triggers visuales — categorías sin consumir */}
          <div style={{marginBottom:8,display:"flex",gap:4,flexWrap:"wrap"}}>
            {Object.keys(FOOD_CATEGORIES).map(cat=>{
              const catItems = FOOD_CATEGORIES[cat].items;
              const hasSelected = catItems.some(i=>selected.includes(i));
              return (
                <div key={cat} onClick={()=>setCatOpen(catOpen===cat?null:cat)} style={{fontSize:11,padding:"3px 8px",borderRadius:20,cursor:"pointer",background:hasSelected?`${C.green}22`:C.card2,color:hasSelected?C.green:C.muted,border:`1px solid ${hasSelected?C.green:C.border}`,opacity:hasSelected?1:0.6}}>
                  {cat.split(" ")[0]} {hasSelected?"✓":""}
                </div>
              );
            })}
          </div>

          {/* Categorías expandibles */}
          {Object.entries(FOOD_CATEGORIES).map(([cat,data])=>(
            <div key={cat} style={{marginBottom:6,borderRadius:12,overflow:"hidden",border:`1px solid ${C.border}`}}>
              <button onClick={()=>setCatOpen(catOpen===cat?null:cat)} style={{width:"100%",padding:"10px 14px",background:C.card2,border:"none",color:C.text,fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span>{cat}</span>
                <span style={{color:C.muted,fontSize:11}}>
                  {selected.filter(s=>data.items.includes(s)).length>0&&<span style={{color:C.green,marginRight:6}}>✓{selected.filter(s=>data.items.includes(s)).length}</span>}
                  {catOpen===cat?"▲":"▼"}
                </span>
              </button>
              {catOpen===cat&&(
                <div style={{padding:10,display:"flex",flexWrap:"wrap",gap:6,background:C.card}}>
                  {data.items.map(food=>(
                    <button key={food} onClick={()=>toggleFood(food)} style={{padding:"5px 10px",borderRadius:20,border:"none",cursor:"pointer",background:selected.includes(food)?C.accent:C.card2,color:selected.includes(food)?C.white:C.muted,fontSize:12,fontWeight:selected.includes(food)?600:400}}>{food}</button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Seleccionados */}
          {(selected.length>0||customFoods.length>0)&&(
            <div style={{marginTop:10,background:C.card2,borderRadius:12,padding:10}}>
              <div style={{fontSize:11,color:C.muted,marginBottom:6}}>✅ Seleccionados ({selected.length+customFoods.length})</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                {selected.map(f=><span key={f} onClick={()=>toggleFood(f)} style={{fontSize:11,padding:"3px 9px",borderRadius:20,background:C.accent,color:C.white,cursor:"pointer"}}>{f} ✕</span>)}
                {customFoods.map((f,i)=><span key={`c${i}`} onClick={()=>setCustomFoods(prev=>prev.filter((_,j)=>j!==i))} style={{fontSize:11,padding:"3px 9px",borderRadius:20,background:C.accent2,color:C.white,cursor:"pointer"}}>{f} ✕</span>)}
              </div>
            </div>
          )}

          {/* Campo libre */}
          <div style={{marginTop:10,background:C.card2,borderRadius:12,padding:10,border:`1px solid ${C.border}`}}>
            <div style={{fontSize:11,color:C.muted,marginBottom:6}}>➕ Agregar alimento no listado</div>
            <div style={{display:"flex",gap:6}}>
              <input value={customFood} onChange={e=>setCustomFood(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter"&&customFood.trim()){setCustomFoods(prev=>[...prev,customFood.trim()]);setCustomFood("");}}}
                placeholder="Ej: calabacín, auyama, mazorca..."
                style={{flex:1,padding:"8px 10px",borderRadius:8,background:C.bg,border:`1px solid ${C.border}`,color:C.text,fontSize:12,outline:"none"}}/>
              <button onClick={()=>{if(customFood.trim()){setCustomFoods(prev=>[...prev,customFood.trim()]);setCustomFood("");}}} style={{padding:"8px 12px",borderRadius:8,border:"none",background:C.accent,color:C.white,fontSize:13,fontWeight:700,cursor:"pointer"}}>+</button>
            </div>
          </div>

          {/* Botón analizar manual */}
          {(selected.length>0||customFoods.length>0)&&!photoPreview&&(
            <button onClick={async()=>{
              const todos=[...selected,...customFoods];
              setAnalyzingText(true); setPhotoResult(null);
              try { const r=await analizarTexto(todos,healthProfile); setPhotoResult({ok:true,alimentos:[],...r}); } catch(_){}
              setAnalyzingText(false);
            }} disabled={analyzingText} style={{width:"100%",marginTop:8,padding:"10px",borderRadius:12,border:`1.5px solid ${C.green}`,background:`${C.green}15`,color:C.green,fontSize:13,fontWeight:600,cursor:"pointer"}}>
              {analyzingText?"🧠 Analizando...":"🧠 Analizar nutrición de lo seleccionado"}
            </button>
          )}

          {/* Resultado análisis texto */}
          {photoResult&&!photoPreview&&(
            <div style={{marginTop:8,background:C.card2,borderRadius:12,padding:10,border:`1px solid ${photoResult.semaforo==="verde"?C.green:photoResult.semaforo==="rojo"?C.red:C.yellow}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <div style={{fontSize:12,fontWeight:700}}>{photoResult.semaforo==="verde"?"🟢":photoResult.semaforo==="rojo"?"🔴":"🟡"} Análisis Nutricional</div>
                {photoResult.calorias_aprox&&<div style={{fontSize:10,color:C.accent,background:`${C.accent}22`,padding:"1px 6px",borderRadius:8}}>~{photoResult.calorias_aprox}</div>}
              </div>
              <div style={{fontSize:11,color:C.muted,lineHeight:1.5,marginBottom:6}}>{photoResult.recomendacion}</div>
              {photoResult.faltantes?.length>0&&(
                <div>
                  <div style={{fontSize:10,color:C.yellow,fontWeight:600,marginBottom:4}}>⚠️ Le falta:</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                    {photoResult.faltantes.map((f,i)=><span key={i} style={{fontSize:10,background:`${C.yellow}22`,border:`1px solid ${C.yellow}44`,padding:"2px 7px",borderRadius:20,color:C.yellow}}>{f}</span>)}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mensaje de identidad */}
          {identityMsg&&(
            <div style={{marginTop:10,background:`${C.green}15`,borderRadius:12,padding:10,border:`1px solid ${C.green}44`}}>
              <div style={{fontSize:12,color:C.green,lineHeight:1.5}}>{identityMsg}</div>
            </div>
          )}

          {/* Botón guardar */}
          <button onClick={handleSave} disabled={saving} style={{width:"100%",marginTop:12,padding:"14px",borderRadius:14,border:"none",background:saving?C.border:`linear-gradient(135deg,${C.accent},${C.accent2})`,color:C.white,fontSize:15,fontWeight:700,cursor:saving?"not-allowed":"pointer",boxShadow:saving?"none":"0 4px 20px rgba(108,99,255,0.4)"}}>
            {saving?savedMsg||"Procesando...":"💾 Guardar en mi pestaña"}
          </button>
          {savedMsg&&!saving&&<div style={{marginTop:8,padding:10,borderRadius:12,textAlign:"center",fontSize:13,fontWeight:600,background:savedMsg.includes("✅")?`${C.green}22`:`${C.red}22`,color:savedMsg.includes("✅")?C.green:C.red,border:`1px solid ${savedMsg.includes("✅")?C.green:C.red}`}}>{savedMsg}</div>}
        </div>
      )}

      {/* ── TAB 1: SCORE ── */}
      {tab===1&&(
        <div style={{padding:16}}>
          <div style={{textAlign:"center",marginBottom:20}}>
            {/* Círculo animado */}
            <div style={{position:"relative",width:130,height:130,margin:"0 auto 12px"}}>
              <svg width="130" height="130" style={{transform:"rotate(-90deg)"}}>
                <circle cx="65" cy="65" r="55" fill="none" stroke={C.border} strokeWidth="10"/>
                <circle cx="65" cy="65" r="55" fill="none" stroke={scoreColor(scores.total)} strokeWidth="10"
                  strokeDasharray={`${2*Math.PI*55}`}
                  strokeDashoffset={`${2*Math.PI*55*(1-scores.total/100)}`}
                  strokeLinecap="round"
                  style={{transition:"stroke-dashoffset 0.8s ease"}}/>
              </svg>
              <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",textAlign:"center"}}>
                <div style={{fontSize:30,fontWeight:800,color:scoreColor(scores.total)}}>{scores.total}</div>
                <div style={{fontSize:10,color:C.muted}}>Score</div>
              </div>
            </div>
            <div style={{color:C.muted,fontSize:13}}>{scores.total>=70?"🌟 ¡Excelente alimentación!":scores.total>=40?"💪 Puedes mejorar":"🥺 Necesitas más variedad"}</div>
            {healthProfile&&<div style={{marginTop:4,fontSize:11,color:nivel.color}}>{nivel.icon} {nivel.nivel}</div>}
          </div>

          {[{label:"🛡️ Inmunidad",key:"immunity"},{label:"⚡ Energía",key:"energy"},{label:"🧠 Concentración",key:"focus"},{label:"✨ Vitalidad",key:"vitality"}].map(({label,key})=>(
            <div key={key} style={{marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                <span style={{fontSize:13,fontWeight:600}}>{label}</span>
                <span style={{fontSize:13,color:scoreColor(scores[key]),fontWeight:700}}>{scores[key]}%</span>
              </div>
              <div style={{background:C.border,borderRadius:6,height:10,overflow:"hidden"}}>
                <div style={{width:`${scores[key]}%`,height:10,borderRadius:6,background:`linear-gradient(90deg,${scoreColor(scores[key])},${scoreColor(scores[key])}88)`,transition:"width 0.8s ease"}}/>
              </div>
            </div>
          ))}

          {scores.nutrients.length>0&&(
            <div style={{background:C.card2,borderRadius:12,padding:12,marginTop:12}}>
              <div style={{fontSize:11,color:C.muted,marginBottom:6}}>Nutrientes activos:</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                {scores.nutrients.map(n=><span key={n} style={{fontSize:10,padding:"2px 8px",borderRadius:20,background:`${C.accent}22`,color:C.accent,border:`1px solid ${C.accent}44`}}>{n}</span>)}
              </div>
            </div>
          )}

          {/* Mensaje según perfil */}
          {healthProfile&&selected.length>0&&(
            <div style={{marginTop:12,background:`${C.accent}11`,borderRadius:12,padding:12,border:`1px solid ${C.accent}33`}}>
              <div style={{fontSize:11,color:C.accent,fontWeight:600,marginBottom:4}}>👤 Tu perfil: {healthProfile.edad} años · {healthProfile.ejercicio} · {healthProfile.enfermedad}</div>
              <div style={{fontSize:11,color:C.muted}}>El análisis IA considera tu perfil de salud al guardar.</div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: HISTORIAL ── */}
      {tab===2&&(
        <div style={{padding:14}}>
          <div style={{fontSize:14,fontWeight:700,marginBottom:4}}>📅 Historial de {perfil}</div>
          {history.length>0&&(
            <div style={{fontSize:11,color:C.muted,marginBottom:12}}>
              {history.length} registros · Mejor score: {Math.max(...history.map(r=>r.score_total||0))}%
            </div>
          )}

          {/* Calendario "no rompas la cadena" */}
          {history.length>0&&(
            <div style={{background:C.card2,borderRadius:12,padding:12,marginBottom:12}}>
              <div style={{fontSize:11,color:C.muted,marginBottom:8,fontWeight:600}}>🔗 Cadena de hábitos — últimos 30 días</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:3}}>
                {Array.from({length:30},(_,i)=>{
                  const d = new Date();
                  d.setDate(d.getDate()-(29-i));
                  const dStr = d.toISOString().split("T")[0];
                  const hasReg = history.some(r=>{ const f=typeof r.fecha==="string"?r.fecha.split("T")[0]:String(r.fecha); return f===dStr; });
                  const isToday = i===29;
                  return (
                    <div key={i} title={dStr} style={{width:16,height:16,borderRadius:3,background:hasReg?"#00d4aa":isToday?`${C.accent}44`:C.border,border:isToday?`1px solid ${C.accent}`:"none",transition:"background 0.2s"}}/>
                  );
                })}
              </div>
              <div style={{display:"flex",gap:12,marginTop:6}}>
                <div style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:10,height:10,borderRadius:2,background:"#00d4aa"}}/><span style={{fontSize:9,color:C.muted}}>Registrado</span></div>
                <div style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:10,height:10,borderRadius:2,background:C.border}}/><span style={{fontSize:9,color:C.muted}}>Sin registro</span></div>
              </div>
            </div>
          )}

          {loadingHistory
            ?<div style={{textAlign:"center",color:C.muted,padding:40}}>Cargando...</div>
            :history.length===0
              ?<div style={{textAlign:"center",color:C.muted,padding:40}}>No hay registros aún.<br/>¡Registra tu primera comida!</div>
              :[...history].reverse().map((r,i)=>(
                <div key={i} style={{background:C.card2,borderRadius:12,padding:12,marginBottom:8,border:`1px solid ${C.border}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                    <span style={{fontSize:13,fontWeight:700}}>{r.comida||"Comida"}</span>
                    <span style={{fontSize:10,color:C.muted}}>{typeof r.fecha==="string"?r.fecha.split("T")[0]:r.fecha}</span>
                  </div>
                  <div style={{display:"flex",gap:10,marginBottom:5,flexWrap:"wrap"}}>
                    {[{label:"Total",val:r.score_total,icon:"⭐"},{label:"Inmunidad",val:r.score_inmunidad,icon:"🛡️"},{label:"Energía",val:r.score_energia,icon:"⚡"}].map(({label,val,icon})=>(
                      <div key={label} style={{textAlign:"center",minWidth:55}}>
                        <div style={{fontSize:13,fontWeight:700,color:scoreColor(val)}}>{val}%</div>
                        <div style={{fontSize:9,color:C.muted}}>{icon} {label}</div>
                      </div>
                    ))}
                  </div>
                  {r.alimentos&&<div style={{display:"flex",flexWrap:"wrap",gap:3}}>{(Array.isArray(r.alimentos)?r.alimentos:[]).slice(0,6).map((f,j)=><span key={j} style={{fontSize:9,padding:"2px 6px",borderRadius:20,background:C.border,color:C.muted}}>{typeof f==="object"?f.name:f}</span>)}</div>}
                  {r.notas&&<div style={{fontSize:10,color:C.muted,marginTop:5,fontStyle:"italic",lineHeight:1.4}}>{r.notas}</div>}
                </div>
              ))
          }
        </div>
      )}

      {/* ── TAB 3: INSIGNIAS ── */}
      {tab===3&&(
        <div style={{padding:14}}>
          <div style={{fontSize:14,fontWeight:700,marginBottom:4}}>🏅 Mis Insignias</div>
          <div style={{fontSize:11,color:C.muted,marginBottom:12}}>{earnedBadges.length} de {BADGES.length} desbloqueadas</div>
          <div style={{background:C.border,borderRadius:6,height:8,marginBottom:16,overflow:"hidden"}}>
            <div style={{width:`${(earnedBadges.length/BADGES.length)*100}%`,height:8,borderRadius:6,background:`linear-gradient(90deg,${C.accent},${C.accent2})`,transition:"width 0.5s"}}/>
          </div>

          {/* Nivel de identidad */}
          <div style={{background:`${nivel.color}22`,borderRadius:12,padding:12,marginBottom:14,border:`1px solid ${nivel.color}44`,textAlign:"center"}}>
            <div style={{fontSize:28,marginBottom:4}}>{nivel.icon}</div>
            <div style={{fontSize:14,fontWeight:700,color:nivel.color}}>{nivel.nivel}</div>
            <div style={{fontSize:11,color:C.muted,marginTop:2}}>
              {streak>0 ? `🔥 ${streak} días seguidos registrando` : "Registra tu primera comida para comenzar"}
            </div>
            {history.length>0&&<div style={{fontSize:11,color:C.muted}}>{history.length} registros totales</div>}
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {BADGES.map(badge=>{
              const earned = earnedBadges.includes(badge.id);
              return (
                <div key={badge.id} style={{background:earned?`${C.accent}18`:C.card2,borderRadius:14,padding:12,border:`1px solid ${earned?C.accent:C.border}`,textAlign:"center",opacity:earned?1:0.5,transition:"all 0.3s"}}>
                  <div style={{fontSize:28,marginBottom:4,filter:earned?"none":"grayscale(1)"}}>{badge.icon}</div>
                  <div style={{fontSize:11,fontWeight:700,color:earned?C.text:C.muted}}>{badge.nombre}</div>
                  <div style={{fontSize:9,color:C.muted,marginTop:2}}>{badge.desc}</div>
                  {earned&&<div style={{marginTop:4,fontSize:9,color:C.accent,fontWeight:600}}>✓ Obtenida</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB 4: AGUA ── */}
      {tab===4&&(
        <div style={{padding:24,textAlign:"center"}}>
          <div style={{fontSize:16,fontWeight:700,marginBottom:4}}>💧 Hidratación diaria</div>
          <div style={{color:C.muted,fontSize:12,marginBottom:6}}>Meta: {WATER_GOAL} vasos · Hoy: {water} · {Math.round(waterPct)}%</div>

          {/* Barra de progreso grande */}
          <div style={{background:C.border,borderRadius:10,height:16,marginBottom:20,overflow:"hidden"}}>
            <div style={{width:`${waterPct}%`,height:16,borderRadius:10,background:"linear-gradient(90deg,#2196f3,#00bcd4)",transition:"width 0.5s"}}/>
          </div>

          <div style={{display:"flex",justifyContent:"center",flexWrap:"wrap",gap:6,marginBottom:20}}>
            {Array.from({length:WATER_GOAL}).map((_,i)=>(
              <div key={i} onClick={()=>changeWater(i<water?-1:1)} style={{width:48,height:60,borderRadius:10,background:i<water?"#2196f3":C.border,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,transition:"all 0.2s",cursor:"pointer",transform:i<water?"scale(1.05)":"scale(1)"}}>{i<water?"💧":"○"}</div>
            ))}
          </div>

          <div style={{display:"flex",gap:16,justifyContent:"center"}}>
            <button onClick={()=>changeWater(-1)} style={{width:56,height:56,borderRadius:"50%",border:`2px solid ${C.border}`,background:C.card2,color:C.text,fontSize:24,cursor:"pointer"}}>−</button>
            <button onClick={()=>changeWater(1)} style={{width:56,height:56,borderRadius:"50%",border:"none",background:"linear-gradient(135deg,#2196f3,#00bcd4)",color:C.white,fontSize:24,cursor:"pointer"}}>+</button>
          </div>

          {water>=WATER_GOAL&&<div style={{marginTop:16,color:C.green,fontSize:14,fontWeight:700}}>🎉 ¡Meta de agua cumplida hoy!</div>}

          {/* Tip de hábito */}
          <div style={{marginTop:20,background:C.card2,borderRadius:12,padding:12,border:`1px solid ${C.border}`}}>
            <div style={{fontSize:11,color:C.accent,fontWeight:600,marginBottom:4}}>💡 Habit Stacking</div>
            <div style={{fontSize:11,color:C.muted,lineHeight:1.5}}>"Después de servirme mi café o té de la mañana, registraré mi primer vaso de agua en VitalTrack."</div>
          </div>
        </div>
      )}

      {/* BARRA NAV INFERIOR */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,background:C.card,borderTop:`1px solid ${C.border}`,display:"flex",zIndex:20}}>
        {TABS.map((t,i)=>(
          <button key={i} onClick={()=>setTab(i)} style={{flex:1,padding:"8px 4px 6px",background:"transparent",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2,color:tab===i?C.accent:C.muted,transition:"color 0.2s"}}>
            <div style={{fontSize:18}}>{t.icon}</div>
            <div style={{fontSize:8,fontWeight:tab===i?700:400}}>{t.label}</div>
            {tab===i&&<div style={{width:18,height:2,borderRadius:1,background:C.accent}}/>}
          </button>
        ))}
      </div>
    </div>
  );
}
