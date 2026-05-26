import { useState, useEffect, useRef } from "react";

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxuSWQvUB377F-BA0M-LuHXPzBG1qDNPmv6ZbVM5nG744ZVsEDzN6ko_bsRZo6ewI1SIg/exec";
const CLAUDE_API_KEY  = "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"; // pega tu sk-ant-...

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
  Object.entries(FOOD_CATEGORIES).forEach(([, cat]) => {
    const hasItem = cat.items.some(item => selectedFoods.includes(item));
    if (hasItem) cat.nutrients.forEach(n => {
      if (NUTRIENT_MAP[n] && !nutrientsFound.has(n)) {
        nutrientsFound.add(n);
        Object.keys(totals).forEach(k => { totals[k] += (NUTRIENT_MAP[n][k] || 0); });
      }
    });
  });
  const cap = v => Math.min(100, Math.round(v));
  return {
    immunity: cap(totals.immunity), energy: cap(totals.energy),
    focus: cap(totals.focus),       vitality: cap(totals.vitality),
    total: cap((totals.immunity+totals.energy+totals.focus+totals.vitality)/4),
    nutrients: [...nutrientsFound],
  };
}

// ─── API APPS SCRIPT (GET, sin CORS) ─────────────────────────────────────────
async function apiGet(params) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${APPS_SCRIPT_URL}?${qs}`, { redirect:"follow" });
  const text = await res.text();
  try { return JSON.parse(text); } catch(_) { return { ok:false, registros:[] }; }
}

// ─── API CLAUDE DIRECTO (análisis de foto) ────────────────────────────────────
async function analizarConClaude(base64, mediaType) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": CLAUDE_API_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      messages: [{
        role: "user",
        content: [
          { type:"image", source:{ type:"base64", media_type: mediaType, data: base64 } },
          { type:"text",  text:`Analiza esta foto de comida. Responde SOLO con JSON válido sin backticks ni texto extra:
{"alimentos":["lista","de","alimentos","identificados"],"recomendacion":"consejo nutricional breve en español máximo 2 oraciones","semaforo":"verde|amarillo|rojo"}
verde=muy nutritiva, amarillo=puede mejorar, rojo=poco nutritiva.` }
        ]
      }]
    })
  });
  const data = await res.json();
  if (data.content?.[0]?.text) {
    const clean = data.content[0].text.trim().replace(/```json|```/g,"").trim();
    return JSON.parse(clean);
  }
  throw new Error("Sin respuesta de Claude");
}

const storageKey = (perfil, key) => `vt_${perfil}_${key}`;

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
    if (!trimmed) { setError("Escribe tu nombre para continuar"); return; }
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
//  APP PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [perfil, setPerfil]             = useState(null);
  const [tab, setTab]                   = useState(0);
  const [meal, setMeal]                 = useState(0);
  const [selected, setSelected]         = useState([]);
  const [catOpen, setCatOpen]           = useState(null);
  const [saving, setSaving]             = useState(false);
  const [savedMsg, setSavedMsg]         = useState("");
  const [water, setWater]               = useState(0);
  const [streak, setStreak]             = useState(0);
  const [history, setHistory]           = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [photoAnalyzing, setPhotoAnalyzing] = useState(false);
  const [photoResult, setPhotoResult]   = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const fileRef = useRef();

  useEffect(() => {
    const saved = localStorage.getItem("vt_perfil_actual");
    if (saved) setPerfil(saved);
  }, []);

  useEffect(() => {
    if (!perfil) return;
    const k = storageKey(perfil,"water"), d = storageKey(perfil,"water_date");
    const today = new Date().toLocaleDateString("es-CO");
    if (localStorage.getItem(d) === today) setWater(parseInt(localStorage.getItem(k)||"0"));
    else { setWater(0); localStorage.setItem(k,"0"); localStorage.setItem(d,today); }
    setStreak(parseInt(localStorage.getItem(storageKey(perfil,"streak"))||"0"));
  }, [perfil]);

  useEffect(() => {
    if (!perfil || tab !== 2) return;
    setLoadingHistory(true);
    apiGet({ action:"historial", perfil })
      .then(data => { if (data.ok) setHistory(data.registros||[]); })
      .catch(()=>{})
      .finally(()=>setLoadingHistory(false));
  }, [perfil, tab]);

  if (!perfil) return <ProfileScreen onEnter={p => setPerfil(p)} />;

  const scores = calcScores(selected);
  const today  = new Date().toLocaleDateString("es-CO");
  const scoreColor = v => v>=70?C.green:v>=40?C.yellow:C.red;

  const toggleFood = food => setSelected(prev => prev.includes(food)?prev.filter(f=>f!==food):[...prev,food]);

  // ── Guardar ────────────────────────────────────────────────────
  const handleSave = async () => {
    if (selected.length===0) { setSavedMsg("⚠️ Selecciona al menos un alimento"); setTimeout(()=>setSavedMsg(""),2500); return; }
    setSaving(true);
    try {
      const res = await apiGet({
        action:"guardar", perfil,
        fecha: today,
        comida: encodeURIComponent(MEALS[meal].replace(/[^\w\s]/g,"").trim()),
        alimentos: encodeURIComponent(JSON.stringify(selected)),
        score_total: scores.total, score_inmunidad: scores.immunity,
        score_energia: scores.energy, score_concentracion: scores.focus,
        score_vitalidad: scores.vitality, agua_vasos: water, racha_dias: streak,
        notas: encodeURIComponent(photoResult?.recomendacion||"")
      });
      if (res.ok) {
        const lastDate = localStorage.getItem(storageKey(perfil,"streak_date"));
        const yStr = new Date(Date.now()-86400000).toLocaleDateString("es-CO");
        const newStreak = lastDate===yStr ? streak+1 : 1;
        setStreak(newStreak);
        localStorage.setItem(storageKey(perfil,"streak"), newStreak);
        localStorage.setItem(storageKey(perfil,"streak_date"), today);
        setSavedMsg(`✅ ¡Guardado! Score: ${scores.total}%`);
        setSelected([]); setPhotoResult(null); setPhotoPreview(null);
      } else {
        setSavedMsg("❌ Error al guardar. Intenta de nuevo.");
      }
    } catch(_) { setSavedMsg("❌ Sin conexión."); }
    setSaving(false);
    setTimeout(()=>setSavedMsg(""),3500);
  };

  // ── Agua ───────────────────────────────────────────────────────
  const changeWater = delta => {
    const nw = Math.max(0,Math.min(12,water+delta));
    setWater(nw);
    localStorage.setItem(storageKey(perfil,"water"),nw);
    localStorage.setItem(storageKey(perfil,"water_date"),today);
  };

  // ── Foto → Claude directo desde navegador ─────────────────────
  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoAnalyzing(true);
    setPhotoResult(null);

    // Preview inmediato
    const previewUrl = URL.createObjectURL(file);
    setPhotoPreview(previewUrl);

    try {
      // Comprimir imagen con canvas
      const compressed = await new Promise((res, rej) => {
        const img = new Image();
        img.onload = () => {
          const MAX = 512;
          const ratio = Math.min(MAX/img.width, MAX/img.height, 1);
          const canvas = document.createElement("canvas");
          canvas.width  = Math.round(img.width  * ratio);
          canvas.height = Math.round(img.height * ratio);
          canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
          res(canvas.toDataURL("image/jpeg", 0.6).split(",")[1]);
        };
        img.onerror = rej;
        img.src = previewUrl;
      });

      // Llamar a Claude directamente desde el navegador
      const result = await analizarConClaude(compressed, "image/jpeg");

      setPhotoResult({ ok:true, ...result });

      // Auto-seleccionar alimentos detectados
      if (result.alimentos?.length) {
        result.alimentos.forEach(al => {
          Object.values(FOOD_CATEGORIES).forEach(cat => {
            const match = cat.items.find(i =>
              i.toLowerCase().includes(al.toLowerCase()) ||
              al.toLowerCase().includes(i.toLowerCase())
            );
            if (match && !selected.includes(match))
              setSelected(prev => [...prev, match]);
          });
        });
      }
    } catch(err) {
      setPhotoResult({ ok:false, recomendacion:`Error: ${err.message}. Selecciona alimentos manualmente.`, semaforo:"rojo", alimentos:[] });
    }
    setPhotoAnalyzing(false);
    e.target.value = "";
  };

  // ─── RENDER ───────────────────────────────────────────────────
  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Segoe UI',system-ui,sans-serif",color:C.text,maxWidth:480,margin:"0 auto",paddingBottom:80}}>

      {/* Header */}
      <div style={{background:C.card,borderBottom:`1px solid ${C.border}`,padding:"14px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:10}}>
        <div>
          <div style={{fontSize:16,fontWeight:700}}>🥗 VitalTrack</div>
          <div style={{fontSize:11,color:C.muted}}>Hola, <b style={{color:C.accent}}>{perfil}</b> · {today}</div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {streak>0 && <div style={{background:"#ff6b0022",border:"1px solid #ff6b00",borderRadius:20,padding:"3px 10px",fontSize:12,color:"#ff6b00"}}>🔥{streak}</div>}
          <button onClick={()=>{localStorage.removeItem("vt_perfil_actual");setPerfil(null);}} style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:8,padding:"4px 8px",color:C.muted,fontSize:11,cursor:"pointer"}}>Cambiar</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",overflowX:"auto",background:C.card,borderBottom:`1px solid ${C.border}`,padding:"0 8px"}}>
        {["📝 Registrar","📊 Score","📅 Historial","💧 Agua"].map((t,i)=>(
          <button key={i} onClick={()=>setTab(i)} style={{flex:"0 0 auto",padding:"12px 16px",background:"transparent",border:"none",color:tab===i?C.accent:C.muted,fontSize:13,fontWeight:tab===i?700:400,cursor:"pointer",borderBottom:tab===i?`2px solid ${C.accent}`:"2px solid transparent",whiteSpace:"nowrap"}}>{t}</button>
        ))}
      </div>

      {/* ── TAB 0: REGISTRAR ── */}
      {tab===0 && (
        <div style={{padding:16}}>
          {/* Selector comida */}
          <div style={{display:"flex",gap:8,marginBottom:16,overflowX:"auto",paddingBottom:4}}>
            {MEALS.map((m,i)=>(
              <button key={i} onClick={()=>setMeal(i)} style={{flex:"0 0 auto",padding:"8px 14px",borderRadius:20,border:"none",cursor:"pointer",background:meal===i?C.accent:C.card2,color:meal===i?C.white:C.muted,fontSize:13,fontWeight:meal===i?700:400}}>{m}</button>
            ))}
          </div>

          {/* Foto */}
          <div style={{marginBottom:16}}>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={handlePhoto}/>
            <button onClick={()=>fileRef.current?.click()} disabled={photoAnalyzing} style={{width:"100%",padding:"12px",borderRadius:12,border:`1.5px dashed ${C.accent}`,background:`${C.accent}11`,color:C.accent,fontSize:14,fontWeight:600,cursor:"pointer"}}>
              {photoAnalyzing?"🔍 Analizando con IA...":"📷 Tomar foto y detectar alimentos"}
            </button>

            {/* Preview de la foto */}
            {photoPreview && (
              <div style={{marginTop:10,borderRadius:12,overflow:"hidden",maxHeight:180,display:"flex",alignItems:"center",justifyContent:"center",background:C.card2}}>
                <img src={photoPreview} alt="foto" style={{width:"100%",objectFit:"cover",maxHeight:180}}/>
              </div>
            )}

            {/* Resultado del análisis */}
            {photoResult && (
              <div style={{marginTop:10,background:C.card2,borderRadius:12,padding:12,border:`1px solid ${photoResult.semaforo==="verde"?C.green:photoResult.semaforo==="rojo"?C.red:C.yellow}`}}>
                <div style={{fontSize:13,fontWeight:700,marginBottom:4}}>
                  {photoResult.semaforo==="verde"?"🟢":photoResult.semaforo==="rojo"?"🔴":"🟡"} Análisis IA
                </div>
                <div style={{fontSize:12,color:C.muted}}>{photoResult.recomendacion}</div>
                {photoResult.alimentos?.length>0 && (
                  <div style={{marginTop:6,display:"flex",flexWrap:"wrap",gap:4}}>
                    {photoResult.alimentos.map((a,i)=>(
                      <span key={i} style={{fontSize:11,background:C.border,padding:"2px 8px",borderRadius:20,color:C.text}}>{a}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Categorías */}
          {Object.entries(FOOD_CATEGORIES).map(([cat,data])=>(
            <div key={cat} style={{marginBottom:8,borderRadius:12,overflow:"hidden",border:`1px solid ${C.border}`}}>
              <button onClick={()=>setCatOpen(catOpen===cat?null:cat)} style={{width:"100%",padding:"12px 16px",background:C.card2,border:"none",color:C.text,fontSize:14,fontWeight:600,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span>{cat}</span>
                <span style={{color:C.muted,fontSize:12}}>
                  {selected.filter(s=>data.items.includes(s)).length>0 && <span style={{color:C.green,marginRight:8}}>✓{selected.filter(s=>data.items.includes(s)).length}</span>}
                  {catOpen===cat?"▲":"▼"}
                </span>
              </button>
              {catOpen===cat && (
                <div style={{padding:12,display:"flex",flexWrap:"wrap",gap:8,background:C.card}}>
                  {data.items.map(food=>(
                    <button key={food} onClick={()=>toggleFood(food)} style={{padding:"6px 12px",borderRadius:20,border:"none",cursor:"pointer",background:selected.includes(food)?C.accent:C.card2,color:selected.includes(food)?C.white:C.muted,fontSize:13,fontWeight:selected.includes(food)?600:400,transition:"all 0.15s"}}>{food}</button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Seleccionados */}
          {selected.length>0 && (
            <div style={{marginTop:12,background:C.card2,borderRadius:12,padding:12}}>
              <div style={{fontSize:12,color:C.muted,marginBottom:8}}>✅ Seleccionados ({selected.length})</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {selected.map(f=>(
                  <span key={f} onClick={()=>toggleFood(f)} style={{fontSize:12,padding:"4px 10px",borderRadius:20,background:C.accent,color:C.white,cursor:"pointer"}}>{f} ✕</span>
                ))}
              </div>
            </div>
          )}

          {/* Guardar */}
          <button onClick={handleSave} disabled={saving} style={{width:"100%",marginTop:16,padding:"15px",borderRadius:14,border:"none",background:saving?C.border:`linear-gradient(135deg,${C.accent},${C.accent2})`,color:C.white,fontSize:16,fontWeight:700,cursor:saving?"not-allowed":"pointer"}}>
            {saving?"Guardando...":"💾 Guardar en mi pestaña"}
          </button>
          {savedMsg && (
            <div style={{marginTop:10,padding:12,borderRadius:12,textAlign:"center",fontSize:14,fontWeight:600,background:savedMsg.includes("✅")?`${C.green}22`:`${C.red}22`,color:savedMsg.includes("✅")?C.green:C.red,border:`1px solid ${savedMsg.includes("✅")?C.green:C.red}`}}>{savedMsg}</div>
          )}
        </div>
      )}

      {/* ── TAB 1: SCORE ── */}
      {tab===1 && (
        <div style={{padding:16}}>
          <div style={{textAlign:"center",marginBottom:24}}>
            <div style={{width:110,height:110,borderRadius:"50%",margin:"0 auto 12px",background:`conic-gradient(${scoreColor(scores.total)} ${scores.total}%, ${C.border} 0)`,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <div style={{width:84,height:84,borderRadius:"50%",background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                <div style={{fontSize:26,fontWeight:800,color:scoreColor(scores.total)}}>{scores.total}</div>
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
          {scores.nutrients.length>0 && (
            <div style={{background:C.card2,borderRadius:12,padding:12,marginTop:16}}>
              <div style={{fontSize:12,color:C.muted,marginBottom:8}}>Nutrientes en tu selección:</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {scores.nutrients.map(n=>(
                  <span key={n} style={{fontSize:11,padding:"3px 10px",borderRadius:20,background:`${C.accent}22`,color:C.accent,border:`1px solid ${C.accent}44`}}>{n}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: HISTORIAL ── */}
      {tab===2 && (
        <div style={{padding:16}}>
          <div style={{fontSize:14,fontWeight:700,marginBottom:12}}>📅 Historial de {perfil}</div>
          {loadingHistory
            ? <div style={{textAlign:"center",color:C.muted,padding:40}}>Cargando desde Sheets...</div>
            : history.length===0
              ? <div style={{textAlign:"center",color:C.muted,padding:40}}>No hay registros aún.<br/>¡Registra tu primera comida!</div>
              : [...history].reverse().map((r,i)=>(
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
                  {r.alimentos && (
                    <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                      {(Array.isArray(r.alimentos)?r.alimentos:[]).slice(0,6).map((f,j)=>(
                        <span key={j} style={{fontSize:10,padding:"2px 7px",borderRadius:20,background:C.border,color:C.muted}}>{typeof f==="object"?f.name:f}</span>
                      ))}
                    </div>
                  )}
                  {r.notas && <div style={{fontSize:11,color:C.muted,marginTop:6,fontStyle:"italic"}}>{r.notas}</div>}
                </div>
              ))
          }
        </div>
      )}

      {/* ── TAB 3: AGUA ── */}
      {tab===3 && (
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
          {water>=WATER_GOAL && <div style={{marginTop:20,color:C.green,fontSize:15,fontWeight:700}}>🎉 ¡Meta de agua cumplida hoy!</div>}
        </div>
      )}
    </div>
  );
}
