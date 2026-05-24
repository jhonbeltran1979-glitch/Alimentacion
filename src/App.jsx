import { useState, useRef, useEffect } from "react";
const API_KEY = "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";



// ─── THEME ───────────────────────────────────────────────────────────────────
const T = {
  bg: "#07050f",
  surface: "#0e0c1a",
  card: "#141220",
  border: "#1f1c30",
  accent: "#7c5cfc",
  green: "#22c55e",
  amber: "#f59e0b",
  red: "#ef4444",
  pink: "#ec4899",
  text: "#f0ecff",
  muted: "#6b6490",
  soft: "#2a2640",
};

// ─── CONDICIONES ──────────────────────────────────────────────────────────────
const CONDITIONS = [
  { id: "sano", label: "Saludable", icon: "💪", desc: "Sin condiciones médicas", color: T.green },
  { id: "diabetes", label: "Diabetes", icon: "🩺", desc: "Control de azúcar", color: T.amber },
  { id: "anemia", label: "Anemia", icon: "🩸", desc: "Déficit de hierro o B12", color: T.red },
  { id: "hipertension", label: "Hipertensión", icon: "❤️", desc: "Control de presión", color: T.pink },
  { id: "embarazo", label: "Embarazo", icon: "🤰", desc: "Nutrición prenatal", color: "#a78bfa" },
  { id: "otro", label: "Otro", icon: "✨", desc: "Quiero comer mejor", color: T.accent },
];

const GOALS = [
  { id: "energia", label: "Más energía", icon: "⚡" },
  { id: "peso", label: "Bajar de peso", icon: "⚖️" },
  { id: "inmunidad", label: "Fortalecer defensas", icon: "🛡️" },
  { id: "sueno", label: "Dormir mejor", icon: "🌙" },
  { id: "musculo", label: "Ganar músculo", icon: "💪" },
  { id: "control", label: "Control médico", icon: "🩺" },
];

const MEALS = [
  { id: "desayuno", label: "Desayuno", icon: "🌅", hour: 7, color: T.amber },
  { id: "almuerzo", label: "Almuerzo", icon: "☀️", hour: 12, color: T.green },
  { id: "cena", label: "Cena", icon: "🌙", hour: 19, color: T.accent },
  { id: "merienda", label: "Merienda", icon: "🍎", hour: 16, color: T.pink },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const todayKey = () => new Date().toLocaleDateString("es-CO");
const monthKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
};

function loadLS(key, def) {
  try { return JSON.parse(localStorage.getItem(key) || "null") ?? def; } catch { return def; }
}
function saveLS(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}

function calcStreak(user) {
  let s = 0;
  const today = new Date();
  for (let i = 0; i < 60; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const k = `fl_day_${user}_${d.toLocaleDateString("es-CO")}`;
    const data = loadLS(k, {});
    if (Object.keys(data).length > 0) s++;
    else if (i > 0) break;
  }
  return s;
}

function avgScore(dayData) {
  const scores = Object.values(dayData).map(e => e?.score || 0).filter(Boolean);
  return scores.length ? Math.round(scores.reduce((a,b)=>a+b,0)/scores.length) : 0;
}

function ScoreRing({ score, size = 60, stroke = 5 }) {
  const r = size/2 - stroke;
  const circ = 2 * Math.PI * r;
  const dash = (score/100) * circ;
  const color = score >= 70 ? T.green : score >= 50 ? T.amber : T.red;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={T.border} strokeWidth={stroke}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: "stroke-dasharray 1s ease" }}/>
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
        style={{ fontSize: size*.22, fontWeight:700, fill:color, fontFamily:"monospace",
          transform:`rotate(90deg)`, transformOrigin:`${size/2}px ${size/2}px` }}>
        {score}
      </text>
    </svg>
  );
}

function Bar({ pct, color }) {
  return (
    <div style={{ height:5, borderRadius:99, background:T.border, overflow:"hidden" }}>
      <div style={{ height:"100%", width:`${Math.min(100,pct)}%`, background:color,
        borderRadius:99, transition:"width .8s ease" }}/>
    </div>
  );
}

// ─── ONBOARDING ───────────────────────────────────────────────────────────────
function Onboarding({ onDone }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [condition, setCondition] = useState(null);
  const [goals, setGoals] = useState([]);

  const next = () => {
    if (step === 0 && !name.trim()) return;
    if (step < 3) setStep(s => s + 1);
    else onDone({ name: name.trim(), condition, goals });
  };

  const toggleGoal = (id) => setGoals(g => g.includes(id) ? g.filter(x=>x!==id) : [...g, id]);

  const steps = [
    // 0: Bienvenida + nombre
    <div style={{ textAlign:"center", padding:"0 8px" }}>
      <div style={{ fontSize:72, marginBottom:20 }}>🥗</div>
      <h2 style={{ color:T.text, fontSize:26, fontWeight:800, margin:"0 0 10px", letterSpacing:"-1px" }}>
        FoodLens IA
      </h2>
      <p style={{ color:T.muted, fontSize:14, lineHeight:1.7, marginBottom:32, maxWidth:300, margin:"0 auto 32px" }}>
        Toma foto de lo que comes. La IA analiza tus alimentos y te ayuda a mejorar tu salud mes a mes.
      </p>
      <label style={{ display:"block", fontSize:12, color:T.muted, marginBottom:8, textAlign:"left" }}>
        ¿Cómo te llamas?
      </label>
      <input value={name} onChange={e=>setName(e.target.value)}
        onKeyDown={e=>e.key==="Enter"&&next()}
        placeholder="Tu nombre"
        style={{ width:"100%", padding:"14px 16px", boxSizing:"border-box",
          background:T.card, border:`1px solid ${name?T.accent:T.border}`,
          borderRadius:14, color:T.text, fontSize:16, outline:"none" }}/>
    </div>,

    // 1: Condición
    <div>
      <h3 style={{ color:T.text, fontSize:18, fontWeight:700, margin:"0 0 6px" }}>
        ¿Tienes alguna condición de salud?
      </h3>
      <p style={{ color:T.muted, fontSize:13, margin:"0 0 20px" }}>
        La IA personaliza el análisis según tu situación.
      </p>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        {Conditions.map(c => (
          <div key={c.id} onClick={()=>setCondition(c.id)} style={{
            background:condition===c.id?`${c.color}18`:T.card,
            border:`1px solid ${condition===c.id?c.color:T.border}`,
            borderRadius:14, padding:"14px 12px", cursor:"pointer", transition:"all .15s",
          }}>
            <div style={{ fontSize:24, marginBottom:6 }}>{c.icon}</div>
            <div style={{ fontSize:13, fontWeight:700, color:condition===c.id?c.color:T.text }}>{c.label}</div>
            <div style={{ fontSize:11, color:T.muted, marginTop:2 }}>{c.desc}</div>
          </div>
        ))}
      </div>
    </div>,

    // 2: Objetivos
    <div>
      <h3 style={{ color:T.text, fontSize:18, fontWeight:700, margin:"0 0 6px" }}>
        ¿Qué quieres lograr?
      </h3>
      <p style={{ color:T.muted, fontSize:13, margin:"0 0 20px" }}>
        Puedes elegir más de uno.
      </p>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        {GOALS.map(g => (
          <div key={g.id} onClick={()=>toggleGoal(g.id)} style={{
            background:goals.includes(g.id)?`${T.accent}20`:T.card,
            border:`1px solid ${goals.includes(g.id)?T.accent:T.border}`,
            borderRadius:14, padding:"14px 12px", cursor:"pointer", transition:"all .15s",
            display:"flex", alignItems:"center", gap:10,
          }}>
            <span style={{ fontSize:22 }}>{g.icon}</span>
            <div style={{ fontSize:13, fontWeight:600, color:goals.includes(g.id)?T.accent:T.text }}>{g.label}</div>
          </div>
        ))}
      </div>
    </div>,

    // 3: Listo
    <div style={{ textAlign:"center", padding:"0 8px" }}>
      <div style={{ fontSize:72, marginBottom:20 }}>✅</div>
      <h2 style={{ color:T.text, fontSize:22, fontWeight:800, margin:"0 0 10px" }}>
        ¡Todo listo, {name}!
      </h2>
      <p style={{ color:T.muted, fontSize:14, lineHeight:1.7, marginBottom:24 }}>
        Toma la foto de tu primera comida del día y la IA analizará automáticamente qué comiste y qué mejorar.
      </p>
      <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:16, padding:16, textAlign:"left" }}>
        {[
          "📸 Toma foto de cada comida",
          "🤖 La IA detecta los alimentos",
          "📊 Ve tu progreso día a día",
          "📋 Análisis completo cada mes",
        ].map((tip,i) => (
          <div key={i} style={{ display:"flex", gap:10, padding:"8px 0",
            borderBottom:i<3?`1px solid ${T.border}`:"none" }}>
            <span style={{ fontSize:16 }}>{tip.split(" ")[0]}</span>
            <span style={{ fontSize:13, color:T.muted }}>{tip.slice(3)}</span>
          </div>
        ))}
      </div>
    </div>,
  ];

  return (
    <div style={{ minHeight:"100vh", background:T.bg, display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center", padding:24 }}>
      <div style={{ width:"100%", maxWidth:400 }}>
        {/* Progress dots */}
        <div style={{ display:"flex", gap:6, justifyContent:"center", marginBottom:36 }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{
              height:4, borderRadius:99,
              width:i===step?24:8,
              background:i<=step?T.accent:T.border,
              transition:"all .3s",
            }}/>
          ))}
        </div>

        {steps[step]}

        <div style={{ marginTop:28, display:"flex", gap:10 }}>
          {step > 0 && (
            <button onClick={()=>setStep(s=>s-1)} style={{
              padding:"14px 20px", borderRadius:14, border:`1px solid ${T.border}`,
              background:"transparent", color:T.muted, fontSize:14, cursor:"pointer",
            }}>←</button>
          )}
          <button onClick={next} style={{
            flex:1, padding:"14px", borderRadius:14, border:"none",
            background:step===0&&!name.trim() ? T.border : `linear-gradient(135deg,${T.accent},${T.green})`,
            color:"white", fontSize:15, fontWeight:700, cursor:"pointer",
          }}>
            {step === 3 ? "🚀 Empezar" : "Continuar →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── PHOTO MODAL ──────────────────────────────────────────────────────────────
async function analyzePhoto(base64, mediaType, profile) {
  const condTip = {
    diabetes: "Presta especial atención al índice glucémico y carbohidratos simples.",
    anemia: "Presta especial atención al hierro, vitamina B12 y vitamina C.",
    hipertension: "Presta especial atención al sodio y potasio.",
    embarazo: "Presta especial atención al ácido fólico, calcio y hierro.",
    sano: "",
    otro: "",
  }[profile.condition] || "";

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST",
    headers:{"Content-Type":"application/json","x-api-key":API_KEY,"anthropic-version":"2023-06-01"},
    body:JSON.stringify({
      model:"claude-sonnet-4-20250514",
      max_tokens:900,
      messages:[{
        role:"user",
        content:[
          { type:"image", source:{ type:"base64", media_type:mediaType, data:base64 } },
          { type:"text", text:`Eres nutricionista experto colombiano. Analiza esta foto de comida para ${profile.name}.
Condición de salud: ${profile.condition}. ${condTip}
Objetivos: ${profile.goals?.join(", ")}.

Responde SOLO con JSON válido sin markdown:
{
  "alimentos": ["arroz", "pollo", "ensalada"],
  "descripcion": "descripción corta en 1 oración",
  "calorias_aprox": 450,
  "score_nutricional": 72,
  "semaforo": "verde",
  "positivo": "qué tiene de bueno específicamente para este usuario",
  "mejora": "qué agregarle o cambiarle considerando su condición",
  "alerta": "advertencia específica si aplica para su condición o vacío",
  "proteina_nivel": "alta",
  "carbs_nivel": "media",
  "grasas_nivel": "baja",
  "fibra_nivel": "alta",
  "tip_del_dia": "consejo práctico y concreto para mañana"
}
semaforo: verde (score≥70), amarillo (50-69), rojo (<50)` }
        ]
      }]
    })
  });
  const data = await res.json();
  const raw = data.content?.[0]?.text || "{}";
  return JSON.parse(raw.replace(/```json|```/g,"").trim());
}

async function generateMonthReport(profile, allMeals) {
  const lines = allMeals.map(m=>
    `${m.date} ${m.meal}: ${m.foods?.join(",")} (score:${m.score})`
  ).join("\n");
  const avg = Math.round(allMeals.reduce((a,b)=>a+(b.score||0),0)/allMeals.length);

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST",
    headers:{"Content-Type":"application/json","x-api-key":API_KEY,"anthropic-version":"2023-06-01"},
    body:JSON.stringify({
      model:"claude-sonnet-4-20250514",
      max_tokens:1200,
      messages:[{
        role:"user",
        content:`Eres nutricionista. Analiza el mes alimenticio de ${profile.name}.
Condición: ${profile.condition}. Objetivos: ${profile.goals?.join(", ")}.
Promedio score: ${avg}%. Total comidas: ${allMeals.length}.

REGISTRO:
${lines}

Responde SOLO con JSON válido:
{
  "score_mes": ${avg},
  "titulo": "Tu mes en resumen",
  "resumen": "2 oraciones evaluando el mes",
  "logro_principal": "lo que mejor hizo este mes",
  "reto_principal": "lo que más falló",
  "deficiencias": [
    {"nutriente":"Vitamina D","impacto":"explica cómo lo afecta específicamente","solucion":"alimento colombiano concreto"},
    {"nutriente":"Fibra","impacto":"...","solucion":"..."},
    {"nutriente":"Omega-3","impacto":"...","solucion":"..."}
  ],
  "patron_semanal": "descripción de patrón (ej: lunes y martes bien, fines de semana mal)",
  "metas": [
    "Meta 1 concreta para el próximo mes",
    "Meta 2 concreta",
    "Meta 3 concreta"
  ],
  "receta_semana": "Una receta colombiana específica que solucione las deficiencias principales"
}`
      }]
    })
  });
  const data = await res.json();
  const raw = data.content?.[0]?.text || "{}";
  return JSON.parse(raw.replace(/```json|```/g,"").trim());
}

function PhotoModal({ meal, profile, onClose, onSave }) {
  const [step, setStep] = useState("pick");
  const [img, setImg] = useState(null);
  const [b64, setB64] = useState(null);
  const [mime, setMime] = useState("image/jpeg");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const fileRef = useRef();

  const pickFile = (file) => {
    if (!file) return;
    setMime(file.type || "image/jpeg");
    const r = new FileReader();
    r.onload = e => { setImg(e.target.result); setB64(e.target.result.split(",")[1]); setStep("preview"); };
    r.readAsDataURL(file);
  };

  const analyze = async () => {
    setLoading(true); setErr(null);
    try {
      const res = await analyzePhoto(b64, mime, profile);
      setResult(res); setStep("result");
    } catch(e) { setErr("Error al analizar. Intenta de nuevo."); }
    setLoading(false);
  };

  const save = () => {
    onSave(meal.id, {
      photoUrl: img,
      foods: result.alimentos,
      descripcion: result.descripcion,
      score: result.score_nutricional,
      semaforo: result.semaforo,
      positivo: result.positivo,
      mejora: result.mejora,
      alerta: result.alerta,
      tip: result.tip_del_dia,
      macros: { proteina: result.proteina_nivel, carbs: result.carbs_nivel, grasas: result.grasas_nivel, fibra: result.fibra_nivel },
      calorias: result.calorias_aprox,
    });
    onClose();
  };

  const semaforoColor = { verde: T.green, amarillo: T.amber, rojo: T.red };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(7,5,15,.97)", zIndex:200,
      display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:T.card, borderRadius:24, border:`1px solid ${T.border}`,
        width:"100%", maxWidth:480, maxHeight:"92vh", overflowY:"auto" }}>

        {/* Header */}
        <div style={{ padding:"18px 20px 14px", borderBottom:`1px solid ${T.border}`,
          display:"flex", alignItems:"center", justifyContent:"space-between",
          background:`linear-gradient(135deg,${meal.color}12,transparent)` }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:22 }}>{meal.icon}</span>
            <div>
              <div style={{ fontSize:15, fontWeight:700, color:T.text }}>{meal.label}</div>
              <div style={{ fontSize:11, color:T.muted }}>
                {step==="pick"?"Sube o toma una foto":step==="preview"?"¿Esta foto?":"Análisis listo"}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ width:32, height:32, borderRadius:8, border:"none",
            background:T.soft, color:T.muted, cursor:"pointer", fontSize:16 }}>✕</button>
        </div>

        <div style={{ padding:20 }}>

          {step === "pick" && (
            <div style={{ textAlign:"center" }}>
              <div style={{ width:110, height:110, borderRadius:28, margin:"20px auto 24px",
                background:`${meal.color}18`, border:`2px dashed ${meal.color}55`,
                display:"flex", alignItems:"center", justifyContent:"center", fontSize:52 }}>📷</div>
              <p style={{ color:T.muted, fontSize:13, lineHeight:1.7, marginBottom:24 }}>
                Fotografía tu {meal.label.toLowerCase()} y la IA identificará los alimentos y analizará su valor nutricional en segundos.
              </p>
              <input ref={fileRef} type="file" accept="image/*" capture="environment"
                style={{ display:"none" }} onChange={e=>pickFile(e.target.files[0])}/>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                <button onClick={()=>fileRef.current.click()} style={{
                  padding:"15px", borderRadius:14, border:"none",
                  background:`linear-gradient(135deg,${meal.color},${T.accent})`,
                  color:"white", fontSize:14, fontWeight:700, cursor:"pointer" }}>
                  📸 Tomar foto
                </button>
                <button onClick={()=>{ fileRef.current.removeAttribute("capture"); fileRef.current.click(); }} style={{
                  padding:"13px", borderRadius:14, border:`1px solid ${T.border}`,
                  background:"transparent", color:T.muted, fontSize:13, cursor:"pointer" }}>
                  🖼️ Elegir de galería
                </button>
              </div>
            </div>
          )}

          {step === "preview" && (
            <div>
              <img src={img} alt="preview" style={{ width:"100%", borderRadius:16, marginBottom:16,
                maxHeight:280, objectFit:"cover" }}/>
              {loading ? (
                <div style={{ textAlign:"center", padding:"24px 0" }}>
                  <div style={{ fontSize:42, display:"inline-block",
                    animation:"spin 1s linear infinite", marginBottom:12 }}>🔄</div>
                  <p style={{ color:T.muted, fontSize:13 }}>Analizando tu comida con IA...</p>
                  <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
                </div>
              ) : (
                <>
                  {err && <p style={{ color:T.red, fontSize:12, textAlign:"center", marginBottom:12 }}>{err}</p>}
                  <div style={{ display:"flex", gap:10 }}>
                    <button onClick={()=>setStep("pick")} style={{ flex:1, padding:"13px",
                      borderRadius:12, border:`1px solid ${T.border}`,
                      background:"transparent", color:T.muted, fontSize:13, cursor:"pointer" }}>← Retomar</button>
                    <button onClick={analyze} style={{ flex:2, padding:"13px", borderRadius:12, border:"none",
                      background:`linear-gradient(135deg,${T.accent},${T.green})`,
                      color:"white", fontSize:13, fontWeight:700, cursor:"pointer" }}>🤖 Analizar con IA</button>
                  </div>
                </>
              )}
            </div>
          )}

          {step === "result" && result && (
            <div>
              {/* Foto + semáforo */}
              <div style={{ position:"relative", marginBottom:16 }}>
                <img src={img} alt="comida" style={{ width:"100%", borderRadius:16,
                  maxHeight:200, objectFit:"cover" }}/>
                <div style={{ position:"absolute", top:12, right:12,
                  background:"rgba(14,12,26,.9)", borderRadius:12, padding:"8px 12px",
                  display:"flex", alignItems:"center", gap:8 }}>
                  <ScoreRing score={result.score_nutricional||0} size={52}/>
                  <div>
                    <div style={{ fontSize:10, color:T.muted }}>Score</div>
                    <div style={{ width:8, height:8, borderRadius:"50%", marginTop:3,
                      background:semaforoColor[result.semaforo]||T.muted }}/>
                  </div>
                </div>
              </div>

              {/* Descripción */}
              <p style={{ color:T.text, fontSize:13, lineHeight:1.6, marginBottom:14 }}>
                {result.descripcion}
              </p>

              {/* Alimentos */}
              <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:14 }}>
                {(result.alimentos||[]).map((f,i) => (
                  <span key={i} style={{ background:`${T.accent}20`, border:`1px solid ${T.accent}44`,
                    color:T.accent, padding:"4px 10px", borderRadius:99, fontSize:12 }}>{f}</span>
                ))}
              </div>

              {/* Macros */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:6, marginBottom:14 }}>
                {[["Proteína",result.proteina_nivel,T.green],["Carbos",result.carbs_nivel,T.amber],
                  ["Grasas",result.grasas_nivel,T.pink],["Fibra",result.fibra_nivel,T.accent]].map(([l,v,c],i)=>(
                  <div key={i} style={{ background:T.surface, borderRadius:10, padding:"8px 6px",
                    textAlign:"center", border:`1px solid ${T.border}` }}>
                    <div style={{ fontSize:9, color:T.muted, marginBottom:3 }}>{l}</div>
                    <div style={{ fontSize:11, fontWeight:700,
                      color:v==="alta"?c:v==="media"?T.amber:T.muted }}>{v||"—"}</div>
                  </div>
                ))}
              </div>

              {/* Positivo */}
              <div style={{ background:"rgba(34,197,94,.08)", border:"1px solid rgba(34,197,94,.2)",
                borderRadius:12, padding:"10px 14px", marginBottom:8 }}>
                <div style={{ fontSize:11, color:T.green, fontWeight:700, marginBottom:4 }}>✅ LO BUENO</div>
                <div style={{ fontSize:12, color:T.text, lineHeight:1.5 }}>{result.positivo}</div>
              </div>

              {/* Mejora */}
              <div style={{ background:"rgba(245,158,11,.08)", border:"1px solid rgba(245,158,11,.2)",
                borderRadius:12, padding:"10px 14px", marginBottom:8 }}>
                <div style={{ fontSize:11, color:T.amber, fontWeight:700, marginBottom:4 }}>💡 CÓMO MEJORAR</div>
                <div style={{ fontSize:12, color:T.text, lineHeight:1.5 }}>{result.mejora}</div>
              </div>

              {/* Alerta condición */}
              {result.alerta && (
                <div style={{ background:"rgba(239,68,68,.08)", border:"1px solid rgba(239,68,68,.2)",
                  borderRadius:12, padding:"10px 14px", marginBottom:8 }}>
                  <div style={{ fontSize:11, color:T.red, fontWeight:700, marginBottom:4 }}>⚠️ ATENCIÓN</div>
                  <div style={{ fontSize:12, color:T.text, lineHeight:1.5 }}>{result.alerta}</div>
                </div>
              )}

              {/* Tip */}
              {result.tip_del_dia && (
                <div style={{ background:`${T.accent}10`, border:`1px solid ${T.accent}25`,
                  borderRadius:12, padding:"10px 14px", marginBottom:16 }}>
                  <div style={{ fontSize:11, color:T.accent, fontWeight:700, marginBottom:4 }}>🌟 TIP PARA MAÑANA</div>
                  <div style={{ fontSize:12, color:T.text, lineHeight:1.5 }}>{result.tip_del_dia}</div>
                </div>
              )}

              <button onClick={save} style={{ width:"100%", padding:"14px", borderRadius:14,
                border:"none", background:`linear-gradient(135deg,${meal.color},${T.accent})`,
                color:"white", fontSize:14, fontWeight:700, cursor:"pointer" }}>
                💾 Guardar análisis
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MONTH REPORT ─────────────────────────────────────────────────────────────
function MonthReport({ profile }) {
  const [report, setReport] = useState(() => loadLS(`fl_report_${profile.name}_${monthKey()}`, null));
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const collectMeals = () => {
    const meals = [];
    const now = new Date();
    for (let d = 1; d <= now.getDate(); d++) {
      const date = new Date(now.getFullYear(), now.getMonth(), d);
      const dateStr = date.toLocaleDateString("es-CO");
      const data = loadLS(`fl_day_${profile.name}_${dateStr}`, {});
      MEALS.forEach(m => {
        if (data[m.id]) meals.push({ date:dateStr, meal:m.label, foods:data[m.id].foods, score:data[m.id].score||0 });
      });
    }
    return meals;
  };

  const generate = async () => {
    setLoading(true); setErr(null);
    const meals = collectMeals();
    if (meals.length < 3) { setErr("Necesitas al menos 3 comidas registradas."); setLoading(false); return; }
    try {
      const r = await generateMonthReport(profile, meals);
      setReport(r);
      saveLS(`fl_report_${profile.name}_${monthKey()}`, r);
    } catch { setErr("Error al generar. Intenta de nuevo."); }
    setLoading(false);
  };

  if (loading) return (
    <div style={{ textAlign:"center", padding:"60px 0" }}>
      <div style={{ fontSize:48, display:"inline-block", animation:"spin 1s linear infinite", marginBottom:14 }}>🔄</div>
      <p style={{ color:T.muted, fontSize:13 }}>La IA analiza tu mes completo...</p>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!report) return (
    <div style={{ textAlign:"center", padding:"50px 20px" }}>
      <div style={{ fontSize:64, marginBottom:16 }}>📊</div>
      <h3 style={{ color:T.text, fontSize:20, fontWeight:700, margin:"0 0 10px" }}>Análisis del Mes</h3>
      <p style={{ color:T.muted, fontSize:13, lineHeight:1.7, maxWidth:300, margin:"0 auto 28px" }}>
        Registra tus comidas durante el mes. Al finalizar la IA genera un informe personalizado con recomendaciones basadas en tu historial real.
      </p>
      {err && <div style={{ background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.3)",
        borderRadius:12, padding:"12px 16px", marginBottom:16 }}>
        <p style={{ color:T.red, fontSize:13, margin:0 }}>{err}</p>
      </div>}
      <button onClick={generate} style={{ padding:"14px 32px", borderRadius:14, border:"none",
        background:`linear-gradient(135deg,${T.accent},${T.green})`,
        color:"white", fontSize:14, fontWeight:700, cursor:"pointer" }}>
        🤖 Generar análisis del mes
      </button>
    </div>
  );

  const sc = report.score_mes || 0;
  const scColor = sc>=70?T.green:sc>=50?T.amber:T.red;

  return (
    <div>
      {/* Header score */}
      <div style={{ background:`${T.accent}12`, border:`1px solid ${T.accent}25`,
        borderRadius:20, padding:20, marginBottom:16, textAlign:"center" }}>
        <div style={{ fontSize:11, color:T.muted, marginBottom:6, fontFamily:"monospace", letterSpacing:1 }}>
          {new Date().toLocaleDateString("es-CO",{month:"long",year:"numeric"}).toUpperCase()}
        </div>
        <div style={{ fontSize:52, fontWeight:800, color:scColor, fontFamily:"monospace", lineHeight:1 }}>
          {sc}%
        </div>
        <div style={{ fontSize:13, color:T.muted, marginTop:4, marginBottom:10 }}>{report.titulo}</div>
        <p style={{ fontSize:13, color:T.text, lineHeight:1.6, margin:0 }}>{report.resumen}</p>
      </div>

      {/* Logro / Reto */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
        <div style={{ background:"rgba(34,197,94,.07)", border:"1px solid rgba(34,197,94,.2)",
          borderRadius:14, padding:14 }}>
          <div style={{ fontSize:11, color:T.green, fontWeight:700, marginBottom:6 }}>🏆 LOGRO DEL MES</div>
          <div style={{ fontSize:12, color:T.text, lineHeight:1.5 }}>{report.logro_principal}</div>
        </div>
        <div style={{ background:"rgba(239,68,68,.07)", border:"1px solid rgba(239,68,68,.2)",
          borderRadius:14, padding:14 }}>
          <div style={{ fontSize:11, color:T.red, fontWeight:700, marginBottom:6 }}>📉 RETO PENDIENTE</div>
          <div style={{ fontSize:12, color:T.text, lineHeight:1.5 }}>{report.reto_principal}</div>
        </div>
      </div>

      {/* Deficiencias */}
      <div style={{ background:T.card, border:`1px solid ${T.border}`,
        borderRadius:16, padding:16, marginBottom:14 }}>
        <div style={{ fontSize:13, fontWeight:700, color:T.text, marginBottom:14 }}>🔍 Lo que le falta a tu dieta</div>
        {(report.deficiencias||[]).map((d,i) => (
          <div key={i} style={{ marginBottom:12, paddingBottom:12,
            borderBottom:i<(report.deficiencias.length-1)?`1px solid ${T.border}`:"none" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
              <div style={{ fontSize:13, fontWeight:700, color:T.amber }}>{d.nutriente}</div>
            </div>
            <div style={{ fontSize:12, color:T.muted, marginBottom:4 }}>{d.impacto}</div>
            <div style={{ fontSize:12, color:T.green }}>→ {d.solucion}</div>
          </div>
        ))}
      </div>

      {/* Patrón semanal */}
      {report.patron_semanal && (
        <div style={{ background:T.card, border:`1px solid ${T.border}`,
          borderRadius:14, padding:14, marginBottom:14 }}>
          <div style={{ fontSize:11, color:T.muted, fontWeight:700, marginBottom:6 }}>📅 PATRÓN DETECTADO</div>
          <div style={{ fontSize:13, color:T.text, lineHeight:1.5 }}>{report.patron_semanal}</div>
        </div>
      )}

      {/* Metas */}
      <div style={{ background:`${T.accent}10`, border:`1px solid ${T.accent}25`,
        borderRadius:16, padding:16, marginBottom:14 }}>
        <div style={{ fontSize:13, fontWeight:700, color:T.accent, marginBottom:12 }}>🎯 Tus 3 metas para el próximo mes</div>
        {(report.metas||[]).map((m,i) => (
          <div key={i} style={{ display:"flex", gap:10, marginBottom:10, alignItems:"flex-start" }}>
            <div style={{ width:24, height:24, borderRadius:7, background:T.accent,
              color:T.bg, display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:11, fontWeight:800, flexShrink:0, marginTop:1 }}>{i+1}</div>
            <div style={{ fontSize:13, color:T.text, lineHeight:1.5 }}>{m}</div>
          </div>
        ))}
      </div>

      {/* Receta */}
      {report.receta_semana && (
        <div style={{ background:"rgba(236,72,153,.08)", border:"1px solid rgba(236,72,153,.2)",
          borderRadius:14, padding:14, marginBottom:14 }}>
          <div style={{ fontSize:11, color:T.pink, fontWeight:700, marginBottom:6 }}>🍳 RECETA DE LA SEMANA</div>
          <div style={{ fontSize:13, color:T.text, lineHeight:1.5 }}>{report.receta_semana}</div>
        </div>
      )}

      <button onClick={()=>{ setReport(null); saveLS(`fl_report_${profile.name}_${monthKey()}`,null); }} style={{
        width:"100%", padding:"12px", borderRadius:12, border:`1px solid ${T.border}`,
        background:"transparent", color:T.muted, fontSize:12, cursor:"pointer" }}>
        🔄 Regenerar análisis
      </button>
    </div>
  );
}

// ─── CALENDAR ─────────────────────────────────────────────────────────────────
function Calendar({ profile }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());

  const daysInMonth = new Date(year,month+1,0).getDate();
  const firstDay = new Date(year,month,1).getDay();
  const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

  const getScore = (day) => {
    const dateStr = new Date(year,month,day).toLocaleDateString("es-CO");
    const data = loadLS(`fl_day_${profile.name}_${dateStr}`, {});
    return avgScore(data);
  };

  const scoreColor = s => s===0?T.border:s>=70?T.green:s>=50?T.amber:T.red;

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:18 }}>
        <button onClick={()=>month===0?[setMonth(11),setYear(y=>y-1)]:setMonth(m=>m-1)} style={{
          width:36,height:36,borderRadius:10,border:`1px solid ${T.border}`,
          background:"transparent",color:T.muted,cursor:"pointer",fontSize:16 }}>‹</button>
        <div style={{ fontSize:16,fontWeight:700,color:T.text }}>{MONTHS[month]} {year}</div>
        <button onClick={()=>month===11?[setMonth(0),setYear(y=>y+1)]:setMonth(m=>m+1)} style={{
          width:36,height:36,borderRadius:10,border:`1px solid ${T.border}`,
          background:"transparent",color:T.muted,cursor:"pointer",fontSize:16 }}>›</button>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4, marginBottom:6 }}>
        {["D","L","M","X","J","V","S"].map(d=>(
          <div key={d} style={{ textAlign:"center",fontSize:11,color:T.muted,padding:"3px 0",fontWeight:600 }}>{d}</div>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4 }}>
        {Array.from({length:firstDay}).map((_,i)=><div key={`e${i}`}/>)}
        {Array.from({length:daysInMonth}).map((_,i)=>{
          const day = i+1;
          const sc = getScore(day);
          const isToday = day===now.getDate()&&month===now.getMonth()&&year===now.getFullYear();
          const col = scoreColor(sc);
          return (
            <div key={day} style={{
              aspectRatio:"1", borderRadius:9,
              background:sc>0?`${col}18`:T.card,
              border:isToday?`2px solid ${T.accent}`:`1px solid ${sc>0?col+"40":T.border}`,
              display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
            }}>
              <div style={{ fontSize:11,fontWeight:isToday?800:400,
                color:isToday?T.accent:T.text }}>{day}</div>
              {sc>0&&<div style={{ fontSize:9,fontWeight:700,color:col,marginTop:1 }}>{sc}%</div>}
            </div>
          );
        })}
      </div>

      <div style={{ display:"flex",gap:14,justifyContent:"center",marginTop:16 }}>
        {[[T.green,"70%+"],[T.amber,"50-69%"],[T.red,"<50%"]].map(([c,l])=>(
          <div key={l} style={{ display:"flex",alignItems:"center",gap:5 }}>
            <div style={{ width:9,height:9,borderRadius:3,background:c }}/>
            <span style={{ fontSize:10,color:T.muted }}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── HOME (TODAY) ─────────────────────────────────────────────────────────────
function Today({ profile, dayKey }) {
  const [dayData, setDayData] = useState(()=>loadLS(`fl_day_${profile.name}_${dayKey}`,{}));
  const [modal, setModal] = useState(null);
  const [viewEntry, setViewEntry] = useState(null);
  const [energia, setEnergia] = useState(()=>loadLS(`fl_energia_${profile.name}_${dayKey}`,null));

  const saveEntry = (mealId, data) => {
    const updated = { ...dayData, [mealId]: data };
    setDayData(updated);
    saveLS(`fl_day_${profile.name}_${dayKey}`, updated);
  };

  const logged = Object.keys(dayData).length;
  const score = avgScore(dayData);
  const streak = calcStreak(profile.name);

  const semaforoColor = { verde:T.green, amarillo:T.amber, rojo:T.red };

  return (
    <div>
      {/* Score del día */}
      <div style={{ background:`linear-gradient(135deg,${T.accent}14,${T.green}08)`,
        border:`1px solid ${T.accent}22`, borderRadius:18, padding:"18px 20px",
        display:"flex", alignItems:"center", gap:16, marginBottom:18 }}>
        <ScoreRing score={score} size={58}/>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:14,fontWeight:700,color:T.text,marginBottom:3 }}>
            Hola, {profile.name} 👋
          </div>
          <div style={{ fontSize:12,color:T.muted,marginBottom:8 }}>
            {logged} de 4 comidas registradas hoy
          </div>
          <div style={{ height:4,borderRadius:99,background:T.border }}>
            <div style={{ height:"100%",width:`${(logged/4)*100}%`,borderRadius:99,
              background:`linear-gradient(90deg,${T.accent},${T.green})`,transition:"width .6s" }}/>
          </div>
        </div>
        {streak>0&&(
          <div style={{ textAlign:"center",background:"rgba(245,158,11,.12)",
            border:"1px solid rgba(245,158,11,.3)",borderRadius:12,padding:"8px 10px",flexShrink:0 }}>
            <div style={{ fontSize:20 }}>🔥</div>
            <div style={{ fontSize:11,color:T.amber,fontWeight:700 }}>{streak}d</div>
          </div>
        )}
      </div>

      {/* ¿Cómo te sientes? */}
      {!energia && (
        <div style={{ background:T.card,border:`1px solid ${T.border}`,borderRadius:16,padding:16,marginBottom:16 }}>
          <div style={{ fontSize:13,fontWeight:700,color:T.text,marginBottom:12 }}>
            ⚡ ¿Cómo está tu energía hoy?
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8 }}>
            {[["Alta","💪",T.green],["Media","😐",T.amber],["Baja","😴",T.red],["Mal","🤒","#a78bfa"]].map(([l,e,c])=>(
              <button key={l} onClick={()=>{ setEnergia(l); saveLS(`fl_energia_${profile.name}_${dayKey}`,l); }} style={{
                padding:"10px 4px",borderRadius:10,border:`1px solid ${T.border}`,
                background:T.surface,cursor:"pointer",textAlign:"center" }}>
                <div style={{ fontSize:18,marginBottom:3 }}>{e}</div>
                <div style={{ fontSize:11,color:c,fontWeight:600 }}>{l}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {energia && (
        <div style={{ background:T.card,border:`1px solid ${T.border}`,borderRadius:14,
          padding:"10px 16px",marginBottom:16,display:"flex",alignItems:"center",gap:10 }}>
          <span style={{ fontSize:16 }}>⚡</span>
          <div style={{ fontSize:13,color:T.muted }}>
            Energía de hoy: <strong style={{ color:T.text }}>{energia}</strong>
          </div>
          <button onClick={()=>{ setEnergia(null); saveLS(`fl_energia_${profile.name}_${dayKey}`,null); }} style={{
            marginLeft:"auto",fontSize:11,color:T.muted,background:"transparent",border:"none",cursor:"pointer" }}>Cambiar</button>
        </div>
      )}

      {/* Comidas */}
      <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
        {MEALS.map(meal => {
          const entry = dayData[meal.id];
          return (
            <div key={meal.id} style={{ background:T.card,border:`1px solid ${entry?meal.color+"33":T.border}`,
              borderRadius:16,overflow:"hidden",transition:"all .2s" }}>

              <div style={{ padding:"14px 16px",display:"flex",alignItems:"center",gap:12 }}>
                <div style={{ width:44,height:44,borderRadius:12,background:`${meal.color}18`,
                  display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0 }}>
                  {meal.icon}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14,fontWeight:700,color:T.text }}>{meal.label}</div>
                  {entry
                    ? <div style={{ fontSize:11,color:T.muted,marginTop:2 }}>
                        {entry.foods?.slice(0,3).join(", ")}{entry.foods?.length>3?` +${entry.foods.length-3}`:""}
                      </div>
                    : <div style={{ fontSize:11,color:T.muted,marginTop:2 }}>Sin registrar</div>
                  }
                </div>
                {entry && (
                  <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                    <div style={{ width:8,height:8,borderRadius:"50%",
                      background:semaforoColor[entry.semaforo]||T.muted }}/>
                    <ScoreRing score={entry.score||0} size={42}/>
                  </div>
                )}
              </div>

              {entry?.photoUrl && (
                <div onClick={()=>setViewEntry({meal,entry})} style={{ cursor:"pointer",position:"relative" }}>
                  <img src={entry.photoUrl} alt="comida"
                    style={{ width:"100%",height:120,objectFit:"cover",display:"block" }}/>
                  <div style={{ position:"absolute",bottom:0,left:0,right:0,
                    background:"linear-gradient(transparent,rgba(0,0,0,.7))",
                    padding:"16px 12px 8px" }}>
                    <div style={{ fontSize:11,color:"#fff",opacity:.85 }}>{entry.descripcion}</div>
                  </div>
                </div>
              )}

              <div style={{ padding:"10px 16px 14px",display:"flex",gap:8 }}>
                <button onClick={()=>setModal(meal)} style={{
                  flex:1,padding:"9px",borderRadius:10,border:"none",
                  background:entry?T.soft:`linear-gradient(135deg,${meal.color}99,${meal.color}44)`,
                  color:entry?T.muted:T.text,fontSize:12,fontWeight:600,cursor:"pointer",
                  display:"flex",alignItems:"center",justifyContent:"center",gap:6 }}>
                  📷 {entry?"Actualizar foto":"Tomar foto"}
                </button>
                {entry&&(
                  <button onClick={()=>setViewEntry({meal,entry})} style={{
                    padding:"9px 14px",borderRadius:10,border:`1px solid ${T.border}`,
                    background:"transparent",color:T.muted,fontSize:12,cursor:"pointer" }}>Ver</button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal foto */}
      {modal && (
        <PhotoModal meal={modal} profile={profile}
          onClose={()=>setModal(null)} onSave={saveEntry}/>
      )}

      {/* Modal ver detalle */}
      {viewEntry && (
        <div style={{ position:"fixed",inset:0,background:"rgba(7,5,15,.97)",zIndex:200,
          display:"flex",alignItems:"center",justifyContent:"center",padding:16 }}>
          <div style={{ background:T.card,borderRadius:24,border:`1px solid ${T.border}`,
            width:"100%",maxWidth:480,maxHeight:"90vh",overflowY:"auto" }}>
            <div style={{ position:"relative" }}>
              <img src={viewEntry.entry.photoUrl} alt="comida"
                style={{ width:"100%",height:220,objectFit:"cover" }}/>
              <button onClick={()=>setViewEntry(null)} style={{
                position:"absolute",top:12,right:12,width:34,height:34,borderRadius:10,
                border:"none",background:"rgba(14,12,26,.9)",color:T.muted,cursor:"pointer",fontSize:16 }}>✕</button>
              <div style={{ position:"absolute",bottom:12,right:12,
                background:"rgba(14,12,26,.9)",borderRadius:12,padding:"8px 10px" }}>
                <ScoreRing score={viewEntry.entry.score||0} size={44}/>
              </div>
            </div>
            <div style={{ padding:20 }}>
              <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:12 }}>
                <span style={{ fontSize:20 }}>{viewEntry.meal.icon}</span>
                <div style={{ fontSize:15,fontWeight:700,color:T.text }}>{viewEntry.meal.label}</div>
              </div>
              <div style={{ display:"flex",flexWrap:"wrap",gap:6,marginBottom:14 }}>
                {(viewEntry.entry.foods||[]).map((f,i)=>(
                  <span key={i} style={{ background:`${viewEntry.meal.color}20`,
                    border:`1px solid ${viewEntry.meal.color}44`,
                    color:viewEntry.meal.color,padding:"4px 10px",borderRadius:99,fontSize:12 }}>{f}</span>
                ))}
              </div>
              {viewEntry.entry.positivo&&(
                <div style={{ background:"rgba(34,197,94,.08)",border:"1px solid rgba(34,197,94,.2)",
                  borderRadius:12,padding:"10px 14px",marginBottom:8 }}>
                  <div style={{ fontSize:11,color:T.green,fontWeight:700,marginBottom:3 }}>✅ LO BUENO</div>
                  <div style={{ fontSize:12,color:T.text,lineHeight:1.5 }}>{viewEntry.entry.positivo}</div>
                </div>
              )}
              {viewEntry.entry.mejora&&(
                <div style={{ background:"rgba(245,158,11,.08)",border:"1px solid rgba(245,158,11,.2)",
                  borderRadius:12,padding:"10px 14px",marginBottom:8 }}>
                  <div style={{ fontSize:11,color:T.amber,fontWeight:700,marginBottom:3 }}>💡 CÓMO MEJORAR</div>
                  <div style={{ fontSize:12,color:T.text,lineHeight:1.5 }}>{viewEntry.entry.mejora}</div>
                </div>
              )}
              {viewEntry.entry.tip&&(
                <div style={{ background:`${T.accent}10`,border:`1px solid ${T.accent}25`,
                  borderRadius:12,padding:"10px 14px" }}>
                  <div style={{ fontSize:11,color:T.accent,fontWeight:700,marginBottom:3 }}>🌟 TIP</div>
                  <div style={{ fontSize:12,color:T.text,lineHeight:1.5 }}>{viewEntry.entry.tip}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PROFILE SWITCHER ─────────────────────────────────────────────────────────
function ProfileSwitcher({ profiles, current, onSelect, onAdd }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position:"relative" }}>
      <button onClick={()=>setOpen(o=>!o)} style={{
        display:"flex",alignItems:"center",gap:8,padding:"6px 12px",
        borderRadius:10,border:`1px solid ${T.border}`,background:T.soft,cursor:"pointer" }}>
        <div style={{ width:26,height:26,borderRadius:8,
          background:`linear-gradient(135deg,${T.accent},${T.green})`,
          display:"flex",alignItems:"center",justifyContent:"center",
          fontSize:12,fontWeight:700,color:"#fff" }}>
          {current.name[0].toUpperCase()}
        </div>
        <span style={{ fontSize:13,fontWeight:600,color:T.text }}>{current.name}</span>
        <span style={{ fontSize:10,color:T.muted }}>▼</span>
      </button>
      {open&&(
        <div style={{ position:"absolute",top:44,left:0,zIndex:100,
          background:T.card,border:`1px solid ${T.border}`,borderRadius:14,
          padding:8,minWidth:180,boxShadow:"0 8px 32px rgba(0,0,0,.4)" }}>
          {profiles.map(p=>(
            <button key={p.name} onClick={()=>{ onSelect(p); setOpen(false); }} style={{
              display:"flex",alignItems:"center",gap:8,width:"100%",padding:"9px 10px",
              border:"none",background:p.name===current.name?T.soft:"transparent",
              borderRadius:8,cursor:"pointer",textAlign:"left" }}>
              <div style={{ width:24,height:24,borderRadius:6,
                background:`linear-gradient(135deg,${T.accent},${T.green})`,
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:11,fontWeight:700,color:"#fff" }}>
                {p.name[0].toUpperCase()}
              </div>
              <span style={{ fontSize:13,color:T.text }}>{p.name}</span>
              {p.name===current.name&&<span style={{ marginLeft:"auto",color:T.accent,fontSize:12 }}>✓</span>}
            </button>
          ))}
          <div style={{ height:1,background:T.border,margin:"6px 0" }}/>
          <button onClick={()=>{ onAdd(); setOpen(false); }} style={{
            display:"flex",alignItems:"center",gap:8,width:"100%",padding:"9px 10px",
            border:"none",background:"transparent",borderRadius:8,cursor:"pointer" }}>
            <div style={{ width:24,height:24,borderRadius:6,background:T.border,
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:T.muted }}>+</div>
            <span style={{ fontSize:13,color:T.muted }}>Agregar perfil</span>
          </button>
        </div>
      )}
    </div>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
// Fix: reference correct variable name
const Conditions = CONDITIONS;

export default function App() {
  const [profiles, setProfiles] = useState(()=>loadLS("fl_profiles",[]));
  const [currentIdx, setCurrentIdx] = useState(0);
  const [addingNew, setAddingNew] = useState(false);
  const [tab, setTab] = useState("today");

  const today = todayKey();

  // Si no hay perfiles, mostrar onboarding
  if (profiles.length === 0 || addingNew) {
    return (
      <Onboarding onDone={(profile) => {
        const updated = [...profiles, profile];
        setProfiles(updated);
        saveLS("fl_profiles", updated);
        setCurrentIdx(updated.length - 1);
        setAddingNew(false);
      }}/>
    );
  }

  const current = profiles[currentIdx] || profiles[0];

  const TABS = [
    { id:"today", icon:"🍽️", label:"Hoy" },
    { id:"calendar", icon:"📅", label:"Calendario" },
    { id:"report", icon:"📊", label:"Mes" },
  ];

  return (
    <div style={{ minHeight:"100vh", background:T.bg, color:T.text,
      fontFamily:"'DM Sans','Segoe UI',sans-serif" }}>

      {/* HEADER */}
      <div style={{ background:`linear-gradient(180deg,${T.surface} 0%,rgba(14,12,26,.96) 100%)`,
        borderBottom:`1px solid ${T.border}`, padding:"16px 18px 0",
        position:"sticky", top:0, zIndex:50 }}>
        <div style={{ maxWidth:560, margin:"0 auto" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
            <div style={{ width:40,height:40,borderRadius:12,flexShrink:0,
              background:`linear-gradient(135deg,${T.accent},${T.green})`,
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:20,boxShadow:`0 0 20px ${T.accent}40` }}>🥗</div>
            <div style={{ flex:1 }}>
              <h1 style={{ margin:0,fontSize:18,fontWeight:800,letterSpacing:"-0.5px" }}>FoodLens IA</h1>
              <p style={{ margin:0,fontSize:10,color:T.muted }}>
                {new Date().toLocaleDateString("es-CO",{weekday:"long",day:"numeric",month:"long"})}
              </p>
            </div>
            <ProfileSwitcher
              profiles={profiles}
              current={current}
              onSelect={p=>setCurrentIdx(profiles.indexOf(p))}
              onAdd={()=>setAddingNew(true)}/>
          </div>

          {/* Condition badge */}
          {current.condition && (
            <div style={{ display:"flex",gap:8,marginBottom:12,flexWrap:"wrap" }}>
              {(() => {
                const cond = Conditions.find(c=>c.id===current.condition);
                return cond ? (
                  <span style={{ background:`${cond.color}18`,border:`1px solid ${cond.color}40`,
                    color:cond.color,fontSize:11,padding:"3px 10px",borderRadius:99,fontWeight:600 }}>
                    {cond.icon} {cond.label}
                  </span>
                ) : null;
              })()}
              {(current.goals||[]).slice(0,2).map(g=>{
                const goal = GOALS.find(x=>x.id===g);
                return goal ? (
                  <span key={g} style={{ background:T.soft,color:T.muted,
                    fontSize:11,padding:"3px 10px",borderRadius:99 }}>
                    {goal.icon} {goal.label}
                  </span>
                ) : null;
              })}
            </div>
          )}

          <div style={{ display:"flex" }}>
            {TABS.map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)} style={{
                flex:1,padding:"10px 0",border:"none",background:"transparent",cursor:"pointer",
                borderBottom:tab===t.id?`2px solid ${T.accent}`:"2px solid transparent",
                color:tab===t.id?T.accent:T.muted,fontSize:11,fontWeight:600,transition:"all .2s" }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ maxWidth:560, margin:"0 auto", padding:"18px 14px 100px" }}>
        {tab==="today" && <Today profile={current} dayKey={today}/>}
        {tab==="calendar" && <Calendar profile={current}/>}
        {tab==="report" && <MonthReport profile={current}/>}
      </div>
    </div>
  );
}
