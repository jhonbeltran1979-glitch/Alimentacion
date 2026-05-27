import { useState, useEffect, useRef } from "react";

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxuSWQvUB377F-BA0M-LuHXPzBG1qDNPmv6ZbVM5nG744ZVsEDzN6ko_bsRZo6ewI1SIg/exec";
let CLAUDE_API_KEY = "";

// ─── INSIGNIAS ───────────────────────────────────────────────────────────────
const BADGES = [
  { id:"racha3",   icon:"🔥", nombre:"En racha",        desc:"3 días seguidos registrando",  check: (s,h) => s.streak >= 3 },
  { id:"racha7",   icon:"⭐", nombre:"Una semana",       desc:"7 días seguidos registrando",  check: (s,h) => s.streak >= 7 },
  { id:"racha30",  icon:"🏆", nombre:"Mes de campeón",   desc:"30 días seguidos registrando", check: (s,h) => s.streak >= 30 },
  { id:"agua",     icon:"💧", nombre:"Hidratado",        desc:"Meta de agua cumplida",        check: (s,h) => s.water >= 8 },
  { id:"verde",    icon:"🥗", nombre:"Plato verde",      desc:"Score mayor a 70%",            check: (s,h) => s.lastScore >= 70 },
  { id:"variedad", icon:"🌈", nombre:"Arcoíris",         desc:"5+ categorías en un registro", check: (s,h) => s.lastCats >= 5 },
  { id:"pro",      icon:"💪", nombre:"Proteína Pro",     desc:"Proteínas en 3 comidas",       check: (s,h) => (h||[]).filter(r=>r.comida&&(Array.isArray(r.alimentos)?r.alimentos:JSON.parse(r.alimentos||"[]")).some(a=>["Pollo","Res","Huevo","Atún","Salmón","Tofu","Lentejas"].includes(a))).length >= 3 },
  { id:"constante",icon:"📅", nombre:"Constante",        desc:"10 registros totales",         check: (s,h) => (h||[]).length >= 10 },
];

// ─── NUTRIENTES Y ALIMENTOS ──────────────────────────────────────────────────
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
  "🥦 Verduras": {
    items: ["Brócoli","Espinaca","Kale","Zanahoria","Tomate","Pimentón","Ajo","Champiñones","Aguacate","Repollo","Lechuga","Acelga","Cebolla","Remolacha"],
    nutrients: ["Vitamina C","Vitamina A","Fibra","Antioxidantes","Hierro"]
  },
  "🍎 Frutas": {
    items: ["Naranja","Mango","Papaya","Banano","Fresas","Arándanos","Guayaba","Maracuyá","Piña","Manzana","Uvas","Kiwi"],
    nutrients: ["Vitamina C","Antioxidantes","Fibra","Potasio"]
  },
  "🥩 Proteínas": {
    items: ["Pollo","Res","Cerdo","Huevo","Atún","Sardinas","Salmón","Tofu","Lentejas","Fríjoles","Garbanzo"],
    nutrients: ["Proteína","Hierro","Vitamina B12","Zinc","Omega-3"]
  },
  "🥛 Lácteos": {
    items: ["Leche","Yogur","Queso","Kéfir","Kumis"],
    nutrients: ["Calcio","Vitamina D","Probióticos","Proteína"]
  },
  "🌾 Granos": {
    items: ["Arroz","Avena","Quinoa","Pasta","Pan integral","Maíz","Cebada","Plátano","Yuca","Papa"],
    nutrients: ["Fibra","Magnesio","Vitamina B12","Proteína"]
  },
  "🥜 Frutos secos": {
    items: ["Almendras","Nueces","Maní","Marañón","Chía","Linaza","Ajonjolí"],
    nutrients: ["Omega-3","Magnesio","Proteína","Calcio"]
  },
  "💧 Bebidas": {
    items: ["Agua","Jugo natural","Té verde","Café","Leche vegetal"],
    nutrients: ["Antioxidantes"]
  },
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
  Object.entries(FOOD_CATEGORIES).forEach(([cat, c]) => {
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
    immunity: cap(totals.immunity), energy: cap(totals.energy),
    focus: cap(totals.focus),       vitality: cap(totals.vitality),
    total: cap((totals.immunity+totals.energy+totals.focus+totals.vitality)/4),
    nutrients: [...nutrientsFound],
    cats: catsUsed.size,
  };
}

// ─── API ─────────────────────────────────────────────────────────────────────
async function apiGet(params) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${APPS_SCRIPT_URL}?${qs}`, { redirect:"follow" });
  const text = await res.text();
  try { return JSON.parse(text); } catch(_) { return { ok:false, registros:[] }; }
}

// ─── Analizar alimentos seleccionados manualmente (sin foto) ─────────────────
async function analizarTexto(alimentos) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "x-api-key": CLAUDE_API_KEY,
      "anthropic-version":"2023-06-01",
      "anthropic-dangerous-direct-browser-access":"true",
    },
    body: JSON.stringify({
      model:"claude-opus-4-5",
      max_tokens:600,
      messages:[{
        role:"user",
        content:`Eres un nutricionista experto. El usuario registró manualmente estos alimentos en su comida: ${alimentos.join(", ")}.

Analiza su valor nutricional y responde SOLO con este JSON válido sin backticks ni texto extra:
{
  "recomendacion":"consejo nutricional específico y práctico en español, menciona qué le falta o qué tiene de bueno esta combinación, máximo 3 oraciones",
  "semaforo":"verde|amarillo|rojo",
  "calorias_aprox":"estimado de calorías",
  "faltantes":["nutrientes o grupos alimenticios que hacen falta para completar la comida"]
}
verde=muy nutritiva y balanceada, amarillo=puede mejorar, rojo=poco nutritiva.`
      }]
    })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message||JSON.stringify(data.error));
  if (data.content?.[0]?.text) {
    const clean = data.content[0].text.trim().replace(/```json|```/g,"").trim();
    return JSON.parse(clean);
  }
  throw new Error("Sin respuesta");
}
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "x-api-key": CLAUDE_API_KEY,
      "anthropic-version":"2023-06-01",
      "anthropic-dangerous-direct-browser-access":"true",
    },
    body: JSON.stringify({
      model:"claude-opus-4-5",
      max_tokens:800,
      messages:[{
        role:"user",
        content:[
          { type:"image", source:{ type:"base64", media_type:mediaType, data:base64 } },
          { type:"text", text:`Eres un nutricionista experto analizando una foto de comida colombiana/latinoamericana.

INSTRUCCIONES IMPORTANTES:
- Identifica CADA alimento visible con precisión. Para tubérculos: distingue bien entre papa (blanca/amarilla, textura harinosa), calabacín/zapallo (verde o naranja, más aguado), yuca (blanca fibrosa), ñame, etc.
- Si un alimento es difícil de identificar con certeza, indica tu nivel de confianza.
- Estima la porción de cada alimento en gramos aproximados según lo que se ve en el plato.
- Sé honesto si no puedes identificar algo con certeza.

Responde SOLO con este JSON válido sin backticks ni texto extra:
{
  "alimentos": [
    {"nombre":"nombre exacto del alimento","porcion":"estimado en gramos o descripción (ej: 200g, 1 taza, 1 unidad mediana)","confianza":"alta|media|baja"}
  ],
  "recomendacion":"consejo nutricional específico para esta comida en español, máximo 2 oraciones",
  "semaforo":"verde|amarillo|rojo",
  "calorias_aprox":"estimado total de calorías del plato"
}

verde=muy nutritiva y balanceada, amarillo=puede mejorar, rojo=poco nutritiva o muy procesada.` }
        ]
      }]
    })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message||JSON.stringify(data.error));
  if (data.content?.[0]?.text) {
    const clean = data.content[0].text.trim().replace(/```json|```/g,"").trim();
    return JSON.parse(clean);
  }
  throw new Error("Sin respuesta");
}

const sk = (perfil, key) => `vt_${perfil}_${key}`;

// ══════════════════════════════════════════════════════════════════════════════
//  PANTALLA DE PERFIL
// ══════════════════════════════════════════════════════════════════════════════
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
          <div style={{color:C.muted,fontSize:13,marginTop:4}}>Tu guía de alimentación saludable</div>
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
        <div style={{color:C.muted,fontSize:12,marginBottom:24,lineHeight:1.5}}>
          Tus datos quedarán en una pestaña propia en el Google Sheet del grupo.
        </div>
        <button onClick={handleEnter} disabled={loading} style={{width:"100%",padding:"14px",borderRadius:12,border:"none",background:loading?C.border:`linear-gradient(135deg,${C.accent},${C.accent2})`,color:C.white,fontSize:16,fontWeight:700,cursor:loading?"not-allowed":"pointer"}}>
          {loading?"Preparando tu perfil...":"Entrar a la app →"}
        </button>
        <div style={{textAlign:"center",marginTop:16,color:C.muted,fontSize:11}}>La próxima vez entrarás directo</div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  COMPONENTE: TOAST DE INSIGNIA
// ══════════════════════════════════════════════════════════════════════════════
function BadgeToast({ badge, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, []);
  return (
    <div style={{position:"fixed",top:20,left:"50%",transform:"translateX(-50%)",zIndex:999,
      background:`linear-gradient(135deg,${C.accent},${C.accent2})`,
      borderRadius:16,padding:"12px 20px",display:"flex",alignItems:"center",gap:12,
      boxShadow:"0 8px 32px rgba(108,99,255,0.4)",animation:"slideDown 0.3s ease",
      maxWidth:320,width:"90%"}}>
      <div style={{fontSize:32}}>{badge.icon}</div>
      <div>
        <div style={{color:C.white,fontWeight:700,fontSize:14}}>¡Insignia desbloqueada!</div>
        <div style={{color:"rgba(255,255,255,0.9)",fontSize:13,fontWeight:600}}>{badge.nombre}</div>
        <div style={{color:"rgba(255,255,255,0.7)",fontSize:11}}>{badge.desc}</div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  APP PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [perfil, setPerfil]           = useState(null);
  const [tab, setTab]                 = useState(0);
  const [meal, setMeal]               = useState(0);
  const [selected, setSelected]       = useState([]);
  const [catOpen, setCatOpen]         = useState(null);
  const [saving, setSaving]           = useState(false);
  const [savedMsg, setSavedMsg]       = useState("");
  const [water, setWater]             = useState(0);
  const [streak, setStreak]           = useState(0);
  const [history, setHistory]         = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [photoAnalyzing, setPhotoAnalyzing] = useState(false);
  const [photoResult, setPhotoResult] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [earnedBadges, setEarnedBadges] = useState([]);
  const [newBadge, setNewBadge]       = useState(null);
  const [lastScore, setLastScore]     = useState(0);
  const [lastCats, setLastCats]       = useState(0);
  const [customFood, setCustomFood]   = useState(""); // campo texto libre
  const [customFoods, setCustomFoods] = useState([]); // alimentos libres agregados
  const [analyzingText, setAnalyzingText] = useState(false); // análisis sin foto
  const fileRef = useRef();

  useEffect(() => {
    const saved = localStorage.getItem("vt_perfil_actual");
    if (saved) setPerfil(saved);
    // Cargar key: primero del caché local, luego del servidor
    const cached = localStorage.getItem("vt_api_key_cache");
    if (cached) CLAUDE_API_KEY = cached;
    apiGet({ action:"getKey" }).then(r => {
      if (r.ok && r.k) {
        CLAUDE_API_KEY = r.k;
        localStorage.setItem("vt_api_key_cache", r.k); // guardar en caché
      }
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
      .catch(()=>{})
      .finally(()=>setLoadingHistory(false));
  }, [perfil, tab]);

  // Verificar insignias
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

  if (!perfil) return <ProfileScreen onEnter={p => setPerfil(p)} />;

  const scores = calcScores(selected);
  const today  = new Date().toLocaleDateString("es-CO");
  const scoreColor = v => v>=70?C.green:v>=40?C.yellow:C.red;
  const toggleFood = food => setSelected(prev => prev.includes(food)?prev.filter(f=>f!==food):[...prev,food]);

  // ── Guardar ────────────────────────────────────────────────────
  const handleSave = async () => {
    // Auto-agregar texto pendiente en el campo si el usuario olvidó presionar +
    const pendingFoods = customFood.trim() ? [...customFoods, customFood.trim()] : [...customFoods];
    if (customFood.trim()) { setCustomFoods(pendingFoods); setCustomFood(""); }

    const todosAlimentos = [...selected, ...pendingFoods];
    if (todosAlimentos.length===0) { setSavedMsg("⚠️ Selecciona al menos un alimento"); setTimeout(()=>setSavedMsg(""),2500); return; }
    setSaving(true);

    // Auto-analizar si no hay análisis previo y no hay foto
    let analisis = photoResult;
    if (!analisis && !photoPreview) {
      try {
        if (!CLAUDE_API_KEY) {
          setSavedMsg("🔑 Cargando configuración...");
          const r = await apiGet({ action:"getKey" });
          if (r.ok && r.k) CLAUDE_API_KEY = r.k;
        }
        if (CLAUDE_API_KEY) {
          setSavedMsg("🧠 Analizando nutrición...");
          const result = await analizarTexto(todosAlimentos);
          analisis = { ok:true, alimentos:[], ...result };
          setPhotoResult(analisis);
        } else {
          setSavedMsg("⚠️ Sin conexión a IA, guardando sin análisis...");
        }
      } catch(err) {
        setSavedMsg(`⚠️ Error IA: ${err.message}. Guardando igual...`);
        analisis = null;
      }
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
        const updatedHistory = [...history, { comida: MEALS[meal], alimentos: todosAlimentos }];
        checkBadges({ streak:newStreak, water, lastScore:scores.total, lastCats:scores.cats }, updatedHistory);
        setSavedMsg(`✅ ¡Guardado! Score: ${scores.total}%`);
        setTimeout(() => {
          setSelected([]); setCustomFoods([]); setPhotoResult(null); setPhotoPreview(null);
        }, 4000);
      } else {
        setSavedMsg("❌ Error al guardar. Intenta de nuevo.");
      }
    } catch(_) { setSavedMsg("❌ Sin conexión."); }
    setSaving(false);
    setTimeout(()=>setSavedMsg(""),5000);
  };

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
    const previewUrl = URL.createObjectURL(file);
    setPhotoPreview(previewUrl);
    try {
      const compressed = await new Promise((res,rej) => {
        const img = new Image();
        img.onload = () => {
          const MAX=512, ratio=Math.min(MAX/img.width,MAX/img.height,1);
          const canvas=document.createElement("canvas");
          canvas.width=Math.round(img.width*ratio); canvas.height=Math.round(img.height*ratio);
          canvas.getContext("2d").drawImage(img,0,0,canvas.width,canvas.height);
          res(canvas.toDataURL("image/jpeg",0.6).split(",")[1]);
        };
        img.onerror=rej; img.src=previewUrl;
      });
      const result = await analizarConClaude(compressed,"image/jpeg");
      setPhotoResult({ ok:true,...result });
      // Auto-seleccionar alimentos detectados (nueva estructura con objetos)
      const lista = result.alimentos||[];
      lista.forEach(item => {
        const al = typeof item==="object" ? item.nombre : item;
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

  // ─── TABS CONFIG ─────────────────────────────────────────────
  const TABS = [
    { icon:"📝", label:"Registrar" },
    { icon:"📊", label:"Score" },
    { icon:"📅", label:"Historial" },
    { icon:"🏅", label:"Insignias" },
    { icon:"💧", label:"Agua" },
  ];

  // ─── RENDER ──────────────────────────────────────────────────
  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Segoe UI',system-ui,sans-serif",color:C.text,maxWidth:480,margin:"0 auto",paddingBottom:72}}>

      {/* Toast de insignia */}
      {newBadge && <BadgeToast badge={newBadge} onClose={()=>setNewBadge(null)}/>}

      {/* Header */}
      <div style={{background:C.card,borderBottom:`1px solid ${C.border}`,padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:10}}>
        <div>
          <div style={{fontSize:15,fontWeight:700}}>🥗 VitalTrack</div>
          <div style={{fontSize:11,color:C.muted}}>Hola, <b style={{color:C.accent}}>{perfil}</b> · {today}</div>
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          {streak>0 && <div style={{background:"#ff6b0022",border:"1px solid #ff6b00",borderRadius:20,padding:"3px 8px",fontSize:12,color:"#ff6b00"}}>🔥{streak}</div>}
          {earnedBadges.length>0 && <div style={{background:`${C.accent}22`,border:`1px solid ${C.accent}`,borderRadius:20,padding:"3px 8px",fontSize:12,color:C.accent}}>🏅{earnedBadges.length}</div>}
          <button onClick={()=>{localStorage.removeItem("vt_perfil_actual");setPerfil(null);}} style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:8,padding:"4px 8px",color:C.muted,fontSize:11,cursor:"pointer"}}>Cambiar</button>
        </div>
      </div>

      {/* ── TAB 0: REGISTRAR ── */}
      {tab===0 && (
        <div style={{padding:16}}>
          <div style={{display:"flex",gap:8,marginBottom:16,overflowX:"auto",paddingBottom:4}}>
            {MEALS.map((m,i)=>(
              <button key={i} onClick={()=>setMeal(i)} style={{flex:"0 0 auto",padding:"8px 14px",borderRadius:20,border:"none",cursor:"pointer",background:meal===i?C.accent:C.card2,color:meal===i?C.white:C.muted,fontSize:13,fontWeight:meal===i?700:400}}>{m}</button>
            ))}
          </div>

          <div style={{marginBottom:16}}>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={handlePhoto}/>
            <button onClick={()=>fileRef.current?.click()} disabled={photoAnalyzing} style={{width:"100%",padding:"12px",borderRadius:12,border:`1.5px dashed ${C.accent}`,background:`${C.accent}11`,color:C.accent,fontSize:14,fontWeight:600,cursor:"pointer"}}>
              {photoAnalyzing?"🔍 Analizando con IA...":"📷 Tomar foto y detectar alimentos"}
            </button>
            {photoPreview && (
              <div style={{marginTop:10,borderRadius:12,overflow:"hidden",maxHeight:180,background:C.card2}}>
                <img src={photoPreview} alt="foto" style={{width:"100%",objectFit:"cover",maxHeight:180}}/>
              </div>
            )}
            {photoResult && (
              <div style={{marginTop:10,background:C.card2,borderRadius:12,padding:12,border:`1px solid ${photoResult.semaforo==="verde"?C.green:photoResult.semaforo==="rojo"?C.red:C.yellow}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <div style={{fontSize:13,fontWeight:700}}>
                    {photoResult.semaforo==="verde"?"🟢":photoResult.semaforo==="rojo"?"🔴":"🟡"} Análisis IA
                  </div>
                  {photoResult.calorias_aprox&&<div style={{fontSize:11,color:C.accent,background:`${C.accent}22`,padding:"2px 8px",borderRadius:10}}>~{photoResult.calorias_aprox}</div>}
                </div>
                <div style={{fontSize:12,color:C.muted,marginBottom:8}}>{photoResult.recomendacion}</div>

                {/* Alimentos detectados con porciones — editables */}
                {photoResult.alimentos?.length>0 && (
                  <div>
                    <div style={{fontSize:11,color:C.muted,marginBottom:6,fontWeight:600}}>Alimentos detectados — toca para corregir:</div>
                    <div style={{display:"flex",flexDirection:"column",gap:6}}>
                      {photoResult.alimentos.map((item,i)=>{
                        const nombre = typeof item==="object"?item.nombre:item;
                        const porcion = typeof item==="object"?item.porcion:"";
                        const confianza = typeof item==="object"?item.confianza:"alta";
                        // Buscar si está seleccionado en la app
                        const matchApp = Object.values(FOOD_CATEGORIES).flatMap(c=>c.items).find(f=>f.toLowerCase().includes(nombre.toLowerCase())||nombre.toLowerCase().includes(f.toLowerCase()));
                        const isSelected = matchApp && selected.includes(matchApp);
                        return (
                          <div key={i} style={{display:"flex",alignItems:"center",gap:8,background:C.bg,borderRadius:10,padding:"8px 10px",border:`1px solid ${confianza==="baja"?C.yellow:C.border}`}}>
                            <div style={{flex:1}}>
                              <div style={{display:"flex",alignItems:"center",gap:6}}>
                                <span style={{fontSize:12,fontWeight:600,color:C.text}}>{nombre}</span>
                                {confianza==="baja"&&<span style={{fontSize:9,background:`${C.yellow}33`,color:C.yellow,padding:"1px 5px",borderRadius:6}}>?dudoso</span>}
                                {confianza==="media"&&<span style={{fontSize:9,background:`${C.muted}22`,color:C.muted,padding:"1px 5px",borderRadius:6}}>~aprox</span>}
                              </div>
                              {porcion&&<div style={{fontSize:10,color:C.muted,marginTop:1}}>{porcion}</div>}
                            </div>
                            <button
                              onClick={()=>{ if(matchApp) toggleFood(matchApp); }}
                              style={{padding:"4px 10px",borderRadius:8,border:"none",cursor:"pointer",fontSize:11,fontWeight:600,
                                background:isSelected?`${C.green}22`:C.card2,
                                color:isSelected?C.green:C.muted}}>
                              {isSelected?"✓ Sí":"✗ No"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{fontSize:10,color:C.muted,marginTop:8,fontStyle:"italic"}}>
                      💡 Puedes corregir marcando ✗ No en lo incorrecto y agregando manualmente abajo
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {Object.entries(FOOD_CATEGORIES).map(([cat,data])=>(
            <div key={cat} style={{marginBottom:8,borderRadius:12,overflow:"hidden",border:`1px solid ${C.border}`}}>
              <button onClick={()=>setCatOpen(catOpen===cat?null:cat)} style={{width:"100%",padding:"12px 16px",background:C.card2,border:"none",color:C.text,fontSize:14,fontWeight:600,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span>{cat}</span>
                <span style={{color:C.muted,fontSize:12}}>
                  {selected.filter(s=>data.items.includes(s)).length>0&&<span style={{color:C.green,marginRight:8}}>✓{selected.filter(s=>data.items.includes(s)).length}</span>}
                  {catOpen===cat?"▲":"▼"}
                </span>
              </button>
              {catOpen===cat&&(
                <div style={{padding:12,display:"flex",flexWrap:"wrap",gap:8,background:C.card}}>
                  {data.items.map(food=>(
                    <button key={food} onClick={()=>toggleFood(food)} style={{padding:"6px 12px",borderRadius:20,border:"none",cursor:"pointer",background:selected.includes(food)?C.accent:C.card2,color:selected.includes(food)?C.white:C.muted,fontSize:13,fontWeight:selected.includes(food)?600:400}}>{food}</button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {selected.length>0&&(
            <div style={{marginTop:12,background:C.card2,borderRadius:12,padding:12}}>
              <div style={{fontSize:12,color:C.muted,marginBottom:8}}>✅ Seleccionados ({selected.length + customFoods.length})</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {selected.map(f=><span key={f} onClick={()=>toggleFood(f)} style={{fontSize:12,padding:"4px 10px",borderRadius:20,background:C.accent,color:C.white,cursor:"pointer"}}>{f} ✕</span>)}
                {customFoods.map((f,i)=>(
                  <span key={`custom-${i}`} onClick={()=>setCustomFoods(prev=>prev.filter((_,j)=>j!==i))} style={{fontSize:12,padding:"4px 10px",borderRadius:20,background:C.accent2,color:C.white,cursor:"pointer"}}>{f} ✕</span>
                ))}
              </div>
            </div>
          )}

          {/* Campo texto libre para alimentos no listados */}
          <div style={{marginTop:12,background:C.card2,borderRadius:12,padding:12,border:`1px solid ${C.border}`}}>
            <div style={{fontSize:12,color:C.muted,marginBottom:8}}>➕ Agregar alimento que no está en la lista</div>
            <div style={{display:"flex",gap:8}}>
              <input
                value={customFood}
                onChange={e=>setCustomFood(e.target.value)}
                onKeyDown={e=>{
                  if(e.key==="Enter" && customFood.trim()) {
                    setCustomFoods(prev=>[...prev, customFood.trim()]);
                    setCustomFood("");
                  }
                }}
                placeholder="Ej: calabacín, auyama, mazorca..."
                style={{flex:1,padding:"10px 12px",borderRadius:10,background:C.bg,border:`1px solid ${C.border}`,color:C.text,fontSize:13,outline:"none"}}
              />
              <button
                onClick={()=>{
                  if(customFood.trim()){
                    setCustomFoods(prev=>[...prev, customFood.trim()]);
                    setCustomFood("");
                  }
                }}
                style={{padding:"10px 14px",borderRadius:10,border:"none",background:C.accent,color:C.white,fontSize:13,fontWeight:700,cursor:"pointer"}}>
                +
              </button>
            </div>
            {customFoods.length>0&&(
              <div style={{fontSize:10,color:C.muted,marginTop:6}}>
                Agregados: {customFoods.join(", ")}
              </div>
            )}
          </div>

          {/* Botón analizar selección manual — aparece siempre que hay alimentos y no hay foto */}
          {(selected.length > 0 || customFoods.length > 0) && !photoPreview && (
            <button
              onClick={async () => {
                const todos = [...selected, ...customFoods];
                if (todos.length === 0) return;
                setAnalyzingText(true);
                setPhotoResult(null);
                try {
                  const result = await analizarTexto(todos);
                  setPhotoResult({ ok:true, alimentos:[], ...result });
                } catch(err) {
                  setPhotoResult({ ok:false, recomendacion:`Error: ${err.message}`, semaforo:"rojo", alimentos:[], faltantes:[] });
                }
                setAnalyzingText(false);
              }}
              disabled={analyzingText}
              style={{width:"100%",marginTop:12,padding:"12px",borderRadius:12,border:`1.5px solid ${C.green}`,
                background:`${C.green}15`,color:C.green,fontSize:14,fontWeight:600,cursor:"pointer"}}>
              {analyzingText ? "🧠 Analizando tu selección..." : "🧠 Analizar nutrición de lo seleccionado"}
            </button>
          )}

          {/* Resultado análisis — texto sin foto */}
          {photoResult && !photoPreview && (
            <div style={{marginTop:10,background:C.card2,borderRadius:12,padding:12,border:`1px solid ${photoResult.semaforo==="verde"?C.green:photoResult.semaforo==="rojo"?C.red:C.yellow}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div style={{fontSize:13,fontWeight:700}}>
                  {photoResult.semaforo==="verde"?"🟢":photoResult.semaforo==="rojo"?"🔴":"🟡"} Análisis Nutricional
                </div>
                {photoResult.calorias_aprox&&<div style={{fontSize:11,color:C.accent,background:`${C.accent}22`,padding:"2px 8px",borderRadius:10}}>~{photoResult.calorias_aprox}</div>}
              </div>
              <div style={{fontSize:12,color:C.muted,marginBottom:8,lineHeight:1.5}}>{photoResult.recomendacion}</div>
              {photoResult.faltantes?.length>0&&(
                <div style={{marginTop:6}}>
                  <div style={{fontSize:11,color:C.yellow,fontWeight:600,marginBottom:4}}>⚠️ Le falta a tu comida:</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                    {photoResult.faltantes.map((f,i)=>(
                      <span key={i} style={{fontSize:11,background:`${C.yellow}22`,border:`1px solid ${C.yellow}44`,padding:"2px 8px",borderRadius:20,color:C.yellow}}>{f}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <button onClick={handleSave} disabled={saving} style={{width:"100%",marginTop:16,padding:"15px",borderRadius:14,border:"none",background:saving?C.border:`linear-gradient(135deg,${C.accent},${C.accent2})`,color:C.white,fontSize:16,fontWeight:700,cursor:saving?"not-allowed":"pointer"}}>
            {saving?"Guardando...":"💾 Guardar en mi pestaña"}
          </button>
          {savedMsg&&<div style={{marginTop:10,padding:12,borderRadius:12,textAlign:"center",fontSize:14,fontWeight:600,background:savedMsg.includes("✅")?`${C.green}22`:`${C.red}22`,color:savedMsg.includes("✅")?C.green:C.red,border:`1px solid ${savedMsg.includes("✅")?C.green:C.red}`}}>{savedMsg}</div>}
        </div>
      )}

      {/* ── TAB 1: SCORE ── */}
      {tab===1&&(
        <div style={{padding:16}}>
          <div style={{textAlign:"center",marginBottom:24}}>
            <div style={{width:120,height:120,borderRadius:"50%",margin:"0 auto 12px",background:`conic-gradient(${scoreColor(scores.total)} ${scores.total}%, ${C.border} 0)`,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <div style={{width:92,height:92,borderRadius:"50%",background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                <div style={{fontSize:28,fontWeight:800,color:scoreColor(scores.total)}}>{scores.total}</div>
                <div style={{fontSize:10,color:C.muted}}>Score</div>
              </div>
            </div>
            <div style={{color:C.muted,fontSize:13}}>{scores.total>=70?"🌟 ¡Excelente alimentación!":scores.total>=40?"💪 Puedes mejorar":"🥺 Necesitas más variedad"}</div>
          </div>
          {[{label:"🛡️ Inmunidad",key:"immunity"},{label:"⚡ Energía",key:"energy"},{label:"🧠 Concentración",key:"focus"},{label:"✨ Vitalidad",key:"vitality"}].map(({label,key})=>(
            <div key={key} style={{marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                <span style={{fontSize:13,fontWeight:600}}>{label}</span>
                <span style={{fontSize:13,color:scoreColor(scores[key]),fontWeight:700}}>{scores[key]}%</span>
              </div>
              <div style={{background:C.border,borderRadius:6,height:8}}>
                <div style={{width:`${scores[key]}%`,height:8,borderRadius:6,background:`linear-gradient(90deg,${scoreColor(scores[key])},${scoreColor(scores[key])}88)`,transition:"width 0.5s"}}/>
              </div>
            </div>
          ))}
          {scores.nutrients.length>0&&(
            <div style={{background:C.card2,borderRadius:12,padding:12,marginTop:16}}>
              <div style={{fontSize:12,color:C.muted,marginBottom:8}}>Nutrientes en tu selección:</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {scores.nutrients.map(n=><span key={n} style={{fontSize:11,padding:"3px 10px",borderRadius:20,background:`${C.accent}22`,color:C.accent,border:`1px solid ${C.accent}44`}}>{n}</span>)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: HISTORIAL ── */}
      {tab===2&&(
        <div style={{padding:16}}>
          <div style={{fontSize:14,fontWeight:700,marginBottom:12}}>📅 Historial de {perfil}</div>
          {loadingHistory
            ?<div style={{textAlign:"center",color:C.muted,padding:40}}>Cargando desde Sheets...</div>
            :history.length===0
              ?<div style={{textAlign:"center",color:C.muted,padding:40}}>No hay registros aún.<br/>¡Registra tu primera comida!</div>
              :[...history].reverse().map((r,i)=>(
                <div key={i} style={{background:C.card2,borderRadius:12,padding:12,marginBottom:10,border:`1px solid ${C.border}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                    <span style={{fontSize:13,fontWeight:700}}>{r.comida||"Comida"}</span>
                    <span style={{fontSize:11,color:C.muted}}>{typeof r.fecha==="string"?r.fecha.split("T")[0]:r.fecha}</span>
                  </div>
                  <div style={{display:"flex",gap:8,marginBottom:6,flexWrap:"wrap"}}>
                    {[{label:"Total",val:r.score_total,icon:"⭐"},{label:"Inmunidad",val:r.score_inmunidad,icon:"🛡️"},{label:"Energía",val:r.score_energia,icon:"⚡"}].map(({label,val,icon})=>(
                      <div key={label} style={{textAlign:"center",minWidth:60}}>
                        <div style={{fontSize:14,fontWeight:700,color:scoreColor(val)}}>{val}%</div>
                        <div style={{fontSize:10,color:C.muted}}>{icon} {label}</div>
                      </div>
                    ))}
                  </div>
                  {r.alimentos&&(
                    <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                      {(Array.isArray(r.alimentos)?r.alimentos:[]).slice(0,6).map((f,j)=>(
                        <span key={j} style={{fontSize:10,padding:"2px 7px",borderRadius:20,background:C.border,color:C.muted}}>{typeof f==="object"?f.name:f}</span>
                      ))}
                    </div>
                  )}
                  {r.notas&&<div style={{fontSize:11,color:C.muted,marginTop:6,fontStyle:"italic"}}>{r.notas}</div>}
                </div>
              ))
          }
        </div>
      )}

      {/* ── TAB 3: INSIGNIAS ── */}
      {tab===3&&(
        <div style={{padding:16}}>
          <div style={{fontSize:14,fontWeight:700,marginBottom:4}}>🏅 Mis Insignias</div>
          <div style={{fontSize:12,color:C.muted,marginBottom:16}}>{earnedBadges.length} de {BADGES.length} desbloqueadas</div>

          {/* Barra de progreso */}
          <div style={{background:C.border,borderRadius:6,height:8,marginBottom:20}}>
            <div style={{width:`${(earnedBadges.length/BADGES.length)*100}%`,height:8,borderRadius:6,background:`linear-gradient(90deg,${C.accent},${C.accent2})`,transition:"width 0.5s"}}/>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {BADGES.map(badge=>{
              const earned = earnedBadges.includes(badge.id);
              return (
                <div key={badge.id} style={{background:earned?`${C.accent}18`:C.card2,borderRadius:14,padding:14,border:`1px solid ${earned?C.accent:C.border}`,textAlign:"center",opacity:earned?1:0.5,transition:"all 0.3s"}}>
                  <div style={{fontSize:32,marginBottom:6,filter:earned?"none":"grayscale(1)"}}>{badge.icon}</div>
                  <div style={{fontSize:12,fontWeight:700,color:earned?C.text:C.muted}}>{badge.nombre}</div>
                  <div style={{fontSize:10,color:C.muted,marginTop:3}}>{badge.desc}</div>
                  {earned&&<div style={{marginTop:6,fontSize:10,color:C.accent,fontWeight:600}}>✓ Obtenida</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB 4: AGUA ── */}
      {tab===4&&(
        <div style={{padding:24,textAlign:"center"}}>
          <div style={{fontSize:16,fontWeight:700,marginBottom:8}}>💧 Meta de agua diaria</div>
          <div style={{color:C.muted,fontSize:13,marginBottom:24}}>Meta: {WATER_GOAL} vasos · Hoy: {water}</div>
          <div style={{display:"flex",justifyContent:"center",flexWrap:"wrap",gap:8,marginBottom:24}}>
            {Array.from({length:WATER_GOAL}).map((_,i)=>(
              <div key={i} style={{width:44,height:56,borderRadius:10,background:i<water?"#2196f3":C.border,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,transition:"background 0.2s"}}>{i<water?"💧":"○"}</div>
            ))}
          </div>
          <div style={{display:"flex",gap:16,justifyContent:"center"}}>
            <button onClick={()=>changeWater(-1)} style={{width:56,height:56,borderRadius:"50%",border:`2px solid ${C.border}`,background:C.card2,color:C.text,fontSize:24,cursor:"pointer"}}>−</button>
            <button onClick={()=>changeWater(1)} style={{width:56,height:56,borderRadius:"50%",border:"none",background:`linear-gradient(135deg,#2196f3,#00bcd4)`,color:C.white,fontSize:24,cursor:"pointer"}}>+</button>
          </div>
          {water>=WATER_GOAL&&<div style={{marginTop:20,color:C.green,fontSize:15,fontWeight:700}}>🎉 ¡Meta de agua cumplida hoy!</div>}
        </div>
      )}

      {/* ── BARRA DE NAVEGACIÓN INFERIOR FIJA ── */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,background:C.card,borderTop:`1px solid ${C.border}`,display:"flex",zIndex:20}}>
        {TABS.map((t,i)=>(
          <button key={i} onClick={()=>setTab(i)} style={{flex:1,padding:"10px 4px 8px",background:"transparent",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3,
            color:tab===i?C.accent:C.muted,transition:"color 0.2s"}}>
            <div style={{fontSize:20}}>{t.icon}</div>
            <div style={{fontSize:9,fontWeight:tab===i?700:400}}>{t.label}</div>
            {tab===i&&<div style={{width:20,height:2,borderRadius:1,background:C.accent}}/>}
          </button>
        ))}
      </div>
    </div>
  );
}
