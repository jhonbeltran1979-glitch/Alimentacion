import { useState, useEffect, useRef } from "react";

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxuSWQvUB377F-BA0M-LuHXPzBG1qDNPmv6ZbVM5nG744ZVsEDzN6ko_bsRZo6ewI1SIg/exec";
// ⚠️ NO pegues tu API key real en un repo público. La app la carga sola por getKey() del Apps Script.
let CLAUDE_API_KEY = "PEGA_TU_API_KEY_AQUI_SOLO_PARA_PROBAR_LOCAL";

function makeNoise(ctx,kind){
  const len=ctx.sampleRate*2,buf=ctx.createBuffer(1,len,ctx.sampleRate),d=buf.getChannelData(0);
  let last=0;
  for(let i=0;i<len;i++){const w=Math.random()*2-1;if(kind==="marron"){last=(last+0.02*w)/1.02;d[i]=last*3.2;}else d[i]=w;}
  const src=ctx.createBufferSource();src.buffer=buf;src.loop=true;return src;
}
function jparse(text){
  let t=(text||"").trim().replace(/```json|```/g,"").trim();
  try{return JSON.parse(t);}catch(_){}
  const m=t.match(/\{[\s\S]*\}/);
  if(m){try{return JSON.parse(m[0]);}catch(_){}}
  throw new Error("Respuesta no válida de la IA");
}

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
  if(streak>=30||total>=50)return{nivel:"Maestro",icon:"🧘",color:"#6D5BD0",badge:"#FFD700"};
  if(streak>=7 ||total>=20)return{nivel:"Guerrero",icon:"⚔️",color:"#6D5BD0",badge:"#C0C0C0"};
  if(streak>=3 ||total>=5) return{nivel:"Explorador",icon:"🌱",color:"#6D5BD0",badge:"#CD7F32"};
  return{nivel:"Principiante",icon:"🌟",color:"#6D5BD0",badge:"#95A5A6"};
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
  {key:"verduras",  label:"Verduras",     emoji:"🥦", bg:"#EDEAFB", color:"#6D5BD0", items:["Brócoli","Espinaca","Kale","Zanahoria","Tomate","Pimentón","Ajo","Champiñones","Aguacate","Repollo","Lechuga","Acelga","Cebolla","Remolacha","Ahuyama","Calabacín","Zapallo","Habichuela","Pepino","Coliflor"], nutrients:["Vitamina C","Vitamina A","Fibra","Antioxidantes","Hierro"]},
  {key:"frutas",    label:"Frutas",       emoji:"🍎", bg:"#FFE8D6", color:"#C44B00", items:["Naranja","Mango","Papaya","Banano","Fresas","Arándanos","Guayaba","Maracuyá","Piña","Manzana","Uvas","Kiwi"], nutrients:["Vitamina C","Antioxidantes","Fibra","Potasio"]},
  {key:"proteinas", label:"Proteínas",    emoji:"🥩", bg:"#FFD7D7", color:"#9B2226", items:["Pollo","Res","Cerdo","Huevo","Atún","Sardinas","Salmón","Tofu","Lentejas","Fríjoles","Garbanzo"], nutrients:["Proteína","Hierro","Vitamina B12","Zinc","Omega-3"]},
  {key:"lacteos",   label:"Lácteos",      emoji:"🥛", bg:"#D4E8FF", color:"#1A6FA8", items:["Leche","Yogur","Queso","Kéfir","Kumis"], nutrients:["Calcio","Vitamina D","Probióticos","Proteína"]},
  {key:"granos",    label:"Granos",       emoji:"🌾", bg:"#FFF3CD", color:"#856404", items:["Arroz","Avena","Quinoa","Pasta","Pan integral","Maíz","Cebada","Plátano maduro","Yuca","Papa","Arepa","Peto","Mazamorra","Changua"], nutrients:["Fibra","Magnesio","Vitamina B12","Proteína"]},
  {key:"frutos",    label:"Frutos secos", emoji:"🥜", bg:"#E8DCC8", color:"#6D4C41", items:["Almendras","Nueces","Maní","Marañón","Chía","Linaza","Ajonjolí"], nutrients:["Omega-3","Magnesio","Proteína","Calcio"]},
  {key:"bebidas",   label:"Bebidas",      emoji:"💧", bg:"#D4F1F9", color:"#0077B6", items:["Agua","Jugo natural","Té verde","Café","Leche vegetal"], nutrients:["Antioxidantes"]},
];

const MEALS = [
  {label:"Desayuno",emoji:"☀️",color:"#F4A261"},
  {label:"Almuerzo",emoji:"🍽️",color:"#6D5BD0"},
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

async function iaText(prompt){
  const res=await fetch("https://xhplpwcfdtiarrpypyif.supabase.co/functions/v1/ai-text",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({prompt})
  });
  const d=await res.json();
  if(d.error)throw new Error(d.error);
  return d.result;
}

async function analizarTexto(alimentos,hp){
  const ctx=hp?`Perfil: ${hp.edad} años, actividad "${hp.ejercicio}", condición "${hp.enfermedad}".`:"";
  return iaText(`Nutricionista experto en gastronomía colombiana. ${ctx}\nAlimentos: ${alimentos.join(", ")}.\nJSON sin backticks:\n{"recomendacion":"consejo personalizado según perfil 2-3 oraciones concretas","semaforo":"verde|amarillo|rojo","calorias_aprox":"X kcal","faltantes":["nutrientes faltantes según perfil"]}`);
}

async function analizarFoto(b64,type,hp){
  const ctx=hp?`${hp.edad} años, actividad "${hp.ejercicio}", condición "${hp.enfermedad}"`:"";
  const res=await fetch("https://xhplpwcfdtiarrpypyif.supabase.co/functions/v1/ai-analyze-photo",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({user_id:"web",image_base64:b64,perfil:ctx})
  });
  const d=await res.json();
  if(d.error)throw new Error(d.error);
  return d.analysis;
}
async function analizarSueno(noches,hp){
  const ctx=hp?`Perfil: ${hp.edad} años, actividad "${hp.ejercicio}", condición "${hp.enfermedad}".`:"";
  const resumen=noches.map(n=>`${n.date}: durmió ${n.hours}h (${n.bed}→${n.wake}), calidad ${n.quality}/5, ${n.awakenings} despertares${n.note?", nota: "+n.note:""}`).join("\n");
  return iaText(`Eres experto en higiene del sueño en Colombia. ${ctx}
Últimas noches del usuario:
${resumen}

Analiza el patrón: duración promedio, calidad, consistencia de horarios (acostarse/levantarse a la misma hora) y despertares. Da consejos concretos y accionables adaptados a Colombia. NO diagnostiques enfermedades; si ves señales preocupantes (insomnio persistente, somnolencia diurna severa), sugiere consultar a un profesional de salud.

Responde SOLO JSON sin backticks:
{"resumen":"diagnóstico breve y empático del patrón en 2 oraciones","semaforo":"verde|amarillo|rojo","consejos":["consejo accionable 1","consejo accionable 2","consejo accionable 3"]}`);
}

async function resumenNoche(noche,contexto,hp,dieta){
  const ctxP=hp?`Perfil: ${hp.edad} años, actividad "${hp.ejercicio}", condición "${hp.enfermedad}".`:"";
  const det=noche.measured
    ?(noche.tooShort
      ?`Medición por sensor MUY CORTA (${noche.mins} min de grabación): NO alcanza para estimar duración ni fases del sueño. IGNORA por completo las fases y la duración medida; básate solo en la autoevaluación del usuario. Ruidos detectados: ${noche.snores}.`
      :`Medición por sensor del celular (movimiento + micrófono): ${noche.moves} movimientos en ${noche.mins} min. Fases estimadas → profundo:${noche.pctDeep}%, ligero:${noche.pctLight}%, despierto:${noche.pctAwake}%. Racha de sueño profundo más larga: ${noche.still} min. Ruidos/ronquidos detectados: ${noche.snores}.`)
    :"Registro manual (sin sensor).";
  const durPhrase=(noche.measured&&noche.tooShort)?"duración real desconocida (la medición fue demasiado corta)":`durmió ${noche.hours}h (${noche.bed}→${noche.wake})`;
  const hist=contexto.length>1?`Contexto de noches recientes: ${contexto.map(n=>n.hours+"h cal"+n.quality).join(", ")}.`:"Es de sus primeras noches registradas.";
  const die=dieta?`Comidas recientes del usuario (de la misma app): ${dieta}.`:"Sin datos de alimentación.";
  return iaText(`Eres un asistente cálido de bienestar del sueño. NO eres médico. ${ctxP}
NOCHE A RESUMIR — ${noche.date}: ${durPhrase}, calidad autoevaluada ${noche.quality}/5, ${noche.awakenings} despertares.${noche.note?" Nota del usuario: "+noche.note:""}
${det}
${hist}
${die}

IMPORTANTE: usa SOLO los datos de arriba. No inventes duraciones ni cifras que no aparezcan. Si la medición fue muy corta, dilo con naturalidad y enfócate en la autoevaluación del usuario, sin hablar de "24 horas" ni de fases.

Tareas:
1) Explica en lenguaje sencillo y empático cómo fue su noche.
2) Da 1-2 recomendaciones concretas para hoy/esta noche.
3) Si la alimentación reciente tiene relación plausible con el descanso (cena pesada o tardía, mucha azúcar, cafeína, alcohol, comer muy poco), menciónalo como HIPÓTESIS suave en "comida_sueno", sin afirmar causalidad. Si no hay relación clara o no hay datos, comida_sueno=null.
4) Decide si conviene SUGERIR (no obligar) consultar a un profesional de salud. ver_medico=true SOLO si hay señales que ameriten revisión: dormir muy poco de forma repetida, despertares muy frecuentes sostenidos, o que la nota mencione síntomas como ronquidos fuertes con pausas o ahogos (posible apnea), insomnio persistente o somnolencia diurna marcada. Si es una noche normal o un mal día aislado, ver_medico=false y tranquiliza.

REGLAS: NO diagnostiques enfermedades. No uses lenguaje alarmista. Si sugieres consultar, hazlo con calma y aclara que es solo una sugerencia, no un diagnóstico.

Responde SOLO JSON sin backticks:
{"titulo":"frase corta, ej 'Buena noche' o 'Noche inquieta'","resena":"reseña de UNA sola línea (máx 8 palabras), ej 'Descanso estable, despierta con energía'","resumen":"2-3 oraciones de cómo fue la noche","semaforo":"verde|amarillo|rojo","recomendacion":"1-2 consejos para esta noche","comida_sueno":"observación que conecta su dieta con su descanso, o null","ver_medico":true,"motivo_medico":"si ver_medico es true: motivo breve y calmado; si es false: null"}`);
}

async function planSemana(prefs,hp,contexto){
  const ctxP=hp?`Perfil: ${hp.edad} años, actividad actual "${hp.ejercicio}", condición de salud "${hp.enfermedad}".`:"";
  return iaText(`Eres un entrenador personal certificado y prudente. ${ctxP}
Objetivo: ${prefs.goal}. Equipo disponible: ${prefs.equip}. Días que quiere entrenar por semana: ${prefs.dias}. Minutos por sesión: ${prefs.min}.
${contexto||""}

Diseña un plan SEMANAL (7 días, de lunes a domingo) realista y progresivo. Pon días de descanso o movilidad ligera en los días que no entrena (respetando los ${prefs.dias} días activos). Si el equipo es "Ninguno", usa peso corporal y elementos del hogar. Adapta a Colombia (caminar, escaleras, parque, ciclovía).

SEGURIDAD (importante): respeta la condición de salud.
- Hipertensión: evita esfuerzos máximos y aguantar la respiración (Valsalva); prioriza aeróbico moderado.
- Diabetes: recomienda medir glucosa y tener un snack a mano.
- Si la condición es seria, hay dolor o es principiante absoluto mayor: incluye en el consejo validar con el médico antes de empezar.
No prometas resultados médicos ni de pérdida de peso garantizada.

Responde SOLO JSON sin backticks:
{"meta_semanal":"meta clara de la semana en 1 frase","consejo":"un consejo clave para cumplir el plan","dias":[{"dia":"Lunes","foco":"ej: Fuerza tren superior, Cardio, Movilidad o Descanso","actividades":["actividad concreta 1","actividad concreta 2"],"duracion":"X min","intensidad":"baja|media|alta"}]}`);
}

async function interpretarVoz(texto){
  return iaText(`El usuario dictó por voz lo que hizo hoy. Extrae lo registrable. Texto dictado: "${texto}".
Identifica: comidas (con su momento Desayuno/Almuerzo/Cena/Merienda y los alimentos), ejercicio (tipo, minutos, intensidad) y vasos de agua. Alimentos en español colombiano. Si algo no se menciona: comidas=[], ejercicio=null, agua_vasos=null.
Responde SOLO JSON sin backticks:
{"comidas":[{"momento":"Desayuno","alimentos":["arepa","huevo"]}],"ejercicio":{"tipo":"Caminar","minutos":30,"intensidad":"media"},"agua_vasos":null,"respuesta":"confirmación corta y cálida de lo que entendiste"}`);
}

async function analisisSemanal(datos,hp){
  const ctxP=hp?`Perfil: ${hp.edad} años, actividad "${hp.ejercicio}", condición "${hp.enfermedad}".`:"";
  return iaText(`Eres un coach de salud integral, cálido y realista. ${ctxP}
Datos de la última semana del usuario (todo lo que registró):
- Alimentación: ${datos.comida}
- Sueño: ${datos.sueno}
- Ejercicio: ${datos.ejercicio}
- Hidratación: ${datos.agua}

Analiza de forma integral su energía y vitalidad. Da sugerencias CONCRETAS de cambio de hábitos y CONECTA las áreas entre sí (ej: dormir mejor mejora el rendimiento en el ejercicio; hidratarse y comer mejor sube la energía). Motivador, sin alarmismo ni diagnósticos médicos.

Responde SOLO JSON sin backticks:
{"resumen":"2-3 oraciones sobre su energía y vitalidad esta semana","energia":75,"habitos":[{"area":"Nutrición|Sueño|Ejercicio|Hidratación","cambio":"sugerencia concreta y accionable"}],"mensaje":"frase corta motivadora"}`);
}

async function corregirFoto(detectados,correccion){
  return iaText(`Detecté estos alimentos en una foto: ${detectados.join(", ")||"ninguno"}.
El usuario corrige por voz: "${correccion}".
Aplica su corrección: cambia, agrega o quita alimentos según lo que dijo, y mantén los que no menciona. Nombres en español colombiano.
Responde SOLO JSON sin backticks:
{"alimentos":[{"nombre":"...","porcion":"Xg","confianza":"alta","alternativa":"segunda opción o null"}],"respuesta":"confirmación corta y cálida de lo que corregiste"}`);
}

const sk=(p,k)=>`vt_${p}_${k}`;

// ══ CONFETI ══════════════════════════════════════════════════════
function Confeti({onDone}){
  useEffect(()=>{const t=setTimeout(onDone,2500);return()=>clearTimeout(t);},[]);
  const colors=["#6D5BD0","#8B7BE8","#F4A261","#FFD166","#FF6B9D"];
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
    <div style={{minHeight:"100vh",background:"#F8F7FE",fontFamily:"'Segoe UI',system-ui,sans-serif",display:"flex",flexDirection:"column"}}>
      {/* Header verde */}
      <div style={{background:"linear-gradient(160deg,#6D5BD0,#8B7BE8)",padding:"48px 24px 60px",textAlign:"center"}}>
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
            style={{width:"100%",padding:"16px",borderRadius:14,border:`2px solid ${err?"#FF4757":"#EFEDFC"}`,background:"#F8F7FE",color:"#1A1A1A",fontSize:16,fontWeight:600,outline:"none",boxSizing:"border-box",marginBottom:err?6:16}}/>
          {err&&<div style={{color:"#FF4757",fontSize:12,marginBottom:12}}>{err}</div>}
          <button onClick={go} disabled={loading} style={{width:"100%",padding:16,borderRadius:14,border:"none",background:loading?"#ccc":"linear-gradient(135deg,#6D5BD0,#8B7BE8)",color:"#fff",fontSize:16,fontWeight:800,cursor:loading?"not-allowed":"pointer",boxShadow:loading?"none":"0 4px 20px #6D5BD044",letterSpacing:.3}}>
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
    <div style={{minHeight:"100vh",background:"#F8F7FE",fontFamily:"'Segoe UI',system-ui,sans-serif",overflowY:"auto"}}>
      <div style={{background:"linear-gradient(160deg,#6D5BD0,#8B7BE8)",padding:"40px 24px 50px",textAlign:"center"}}>
        <div style={{fontSize:44,marginBottom:10}}>🩺</div>
        <div style={{color:"#fff",fontSize:22,fontWeight:900}}>Tu perfil de salud</div>
        <div style={{color:"rgba(255,255,255,.75)",fontSize:13,marginTop:4}}>Hola <b>{perfil}</b> — personalizamos tus recomendaciones</div>
      </div>
      <div style={{padding:"0 16px 24px",marginTop:-20}}>
        {/* Edad */}
        <div style={{background:"#fff",borderRadius:20,padding:18,marginBottom:12,boxShadow:"0 4px 20px rgba(0,0,0,0.06)"}}>
          <div style={{color:"#6D5BD0",fontSize:12,fontWeight:800,marginBottom:10,textTransform:"uppercase",letterSpacing:1}}>Edad</div>
          <input type="number" value={edad} onChange={e=>{setEdad(e.target.value);setErr("");}} placeholder="Ej: 32"
            style={{width:"100%",padding:"14px",borderRadius:12,border:"2px solid #EFEDFC",background:"#F8F7FE",color:"#1A1A1A",fontSize:22,fontWeight:800,outline:"none",boxSizing:"border-box",textAlign:"center"}}/>
        </div>
        {/* Ejercicio */}
        <div style={{background:"#fff",borderRadius:20,padding:18,marginBottom:12,boxShadow:"0 4px 20px rgba(0,0,0,0.06)"}}>
          <div style={{color:"#6D5BD0",fontSize:12,fontWeight:800,marginBottom:10,textTransform:"uppercase",letterSpacing:1}}>Actividad física</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {EJERCICIOS.map(({e,d})=>(
              <div key={e} onClick={()=>{setEjercicio(e);setErr("");}} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:14,border:`2px solid ${ejercicio===e?"#6D5BD0":"#EFEDFC"}`,background:ejercicio===e?"#EFEDFC":"#F8F7FE",cursor:"pointer",transition:"all .15s"}}>
                <div style={{flex:1}}>
                  <div style={{color:ejercicio===e?"#6D5BD0":"#333",fontWeight:700,fontSize:14}}>{e}</div>
                  <div style={{color:"#888",fontSize:11,marginTop:1}}>{d}</div>
                </div>
                <div style={{width:22,height:22,borderRadius:"50%",border:`2.5px solid ${ejercicio===e?"#6D5BD0":"#ccc"}`,background:ejercicio===e?"#6D5BD0":"transparent",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .15s"}}>
                  {ejercicio===e&&<div style={{width:8,height:8,borderRadius:"50%",background:"#fff"}}/>}
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Condición */}
        <div style={{background:"#fff",borderRadius:20,padding:18,marginBottom:16,boxShadow:"0 4px 20px rgba(0,0,0,0.06)"}}>
          <div style={{color:"#6D5BD0",fontSize:12,fontWeight:800,marginBottom:10,textTransform:"uppercase",letterSpacing:1}}>Condición de salud</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {ENFERMEDADES.map(e=>(
              <button key={e} onClick={()=>{setEnf(e);setErr("");}} style={{padding:"9px 16px",borderRadius:20,border:`2px solid ${enf===e?"#6D5BD0":"#EFEDFC"}`,background:enf===e?"#6D5BD0":"#F8F7FE",color:enf===e?"#fff":"#555",fontSize:13,cursor:"pointer",fontWeight:enf===e?800:400,transition:"all .15s"}}>{e}</button>
            ))}
          </div>
          {enf==="Otra"&&<input value={otra} onChange={e=>setOtra(e.target.value)} placeholder="¿Cuál condición?" style={{marginTop:10,width:"100%",padding:"12px",borderRadius:12,border:"2px solid #EFEDFC",background:"#F8F7FE",color:"#1A1A1A",fontSize:13,outline:"none",boxSizing:"border-box"}}/>}
        </div>
        {err&&<div style={{color:"#FF4757",fontSize:13,marginBottom:12,textAlign:"center",fontWeight:600}}>{err}</div>}
        <button onClick={save} disabled={loading} style={{width:"100%",padding:16,borderRadius:16,border:"none",background:loading?"#ccc":"linear-gradient(135deg,#6D5BD0,#8B7BE8)",color:"#fff",fontSize:16,fontWeight:800,cursor:loading?"not-allowed":"pointer",boxShadow:loading?"none":"0 4px 20px #6D5BD044"}}>
          {loading?"Guardando...":"Guardar y empezar 🚀"}
        </button>
      </div>
    </div>
  );
}

// ══ APP PRINCIPAL ═════════════════════════════════════════════════
function PatientApp({onLogout,user,token}){
  const [perfil,setPerfil]=useState(()=>(user&&user.user_metadata&&user.user_metadata.nombre)||localStorage.getItem("vt_perfil_actual")||null);
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
  const [photoConfirmed,setPhotoConfirmed]=useState(false);
  const [photoVoiceBusy,setPhotoVoiceBusy]=useState(false);
  const [photoVoiceListening,setPhotoVoiceListening]=useState(false);
  const photoRecRef=useRef(null);
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
  const [sleepLog,setSleepLog]=useState([]);
  const [bedtime,setBedtime]=useState("23:00");
  const [waketime,setWaketime]=useState("06:30");
  const [sleepQuality,setSleepQuality]=useState(3);
  const [awakenings,setAwakenings]=useState(0);
  const [sleepNote,setSleepNote]=useState("");
  const [sleepAI,setSleepAI]=useState(null);
  const [sleepAnalyzing,setSleepAnalyzing]=useState(false);
  const [nightAI,setNightAI]=useState(null);
  const [nightAnalyzing,setNightAnalyzing]=useState(false);
  const [measuredData,setMeasuredData]=useState(null);
  const [smartAlarm,setSmartAlarm]=useState(false);
  const [alarmTime,setAlarmTime]=useState("06:30");
  const [snoreCount,setSnoreCount]=useState(0);
  const [soundLevel,setSoundLevel]=useState(0);
  const [micActive,setMicActive]=useState(false);
  const [actMsg,setActMsg]=useState("");
  const [votos,setVotos]=useState(0);
  const [habits,setHabits]=useState([]);
  const [hSignal,setHSignal]=useState("");
  const [hAction,setHAction]=useState("");
  const [routineBed,setRoutineBed]=useState("22:30");
  const [routineWake,setRoutineWake]=useState("06:30");
  const [sound,setSound]=useState(null);
  const [soundTimer,setSoundTimer]=useState(30);
  const soundRef=useRef(null);
  const [breathing,setBreathing]=useState(false);
  const [breathPhase,setBreathPhase]=useState("Inhala");
  const breathRef=useRef(null);
  const [exGoal,setExGoal]=useState("Bienestar general");
  const [exEquip,setExEquip]=useState("Ninguno");
  const [exDias,setExDias]=useState(4);
  const [exMin,setExMin]=useState(30);
  const [exPlan,setExPlan]=useState(null);
  const [exDone,setExDone]=useState([]);
  const [exLog,setExLog]=useState([]);
  const [exType,setExType]=useState("Caminar");
  const [exLogMin,setExLogMin]=useState(30);
  const [exInt,setExInt]=useState("media");
  const [exAnalyzing,setExAnalyzing]=useState(false);
  const [exMsg,setExMsg]=useState("");
  const [listening,setListening]=useState(false);
  const [voiceText,setVoiceText]=useState("");
  const [voiceBusy,setVoiceBusy]=useState(false);
  const [voiceResult,setVoiceResult]=useState(null);
  const [weeklyAI,setWeeklyAI]=useState(null);
  const [weeklyBusy,setWeeklyBusy]=useState(false);
  const recRef=useRef(null);
  const [sleepMsg,setSleepMsg]=useState("");
  const [measuring,setMeasuring]=useState(false);
  const [moveCount,setMoveCount]=useState(0);
  const measureRef=useRef({start:null,moves:0,lastMove:0,prevMag:null,handler:null,wake:null});
  const smartAlarmRef=useRef({on:false,time:"06:30"});
  const fileRef=useRef();
  const [prefsEditor,setPrefsEditor]=useState(false);
  const [plan,setPlan]=useState(null);
  const [planBusy,setPlanBusy]=useState(false);
  const [planErr,setPlanErr]=useState("");
  const fetchPlan=async()=>{ try{ const r=await fetch(`${SB_URL}/rest/v1/plans?user_id=eq.${user.id}&select=*`,{headers:{apikey:SB_ANON,Authorization:`Bearer ${token}`}}); const d=await r.json(); if(Array.isArray(d)&&d.length){ setPlan(d[0]); return true; } }catch(_){ } return false; };
  const genMiPlan=async()=>{
    setPlanBusy(true);setPlanErr("");
    try{
      const r=await fetch(`${SB_URL}/rest/v1/preferences?user_id=eq.${user.id}&select=*`,{headers:{apikey:SB_ANON,Authorization:`Bearer ${token}`}});
      const pr=((await r.json())[0])||{};
      const cond=hp?`Condición de salud: ${hp.enfermedad}. Edad: ${hp.edad}. Nivel de actividad: ${hp.ejercicio}.`:"";
      const prompt=`Eres nutricionista experto en gastronomía colombiana. Crea un plan personalizado y realista.\n${cond}\nLe gustan: ${(pr.alimentos_gustan||[]).join(", ")||"no especificado"}.\nNo le gustan (evítalos): ${(pr.alimentos_no_gustan||[]).join(", ")||"ninguno"}.\nTipo de dieta: ${pr.tipo_dieta||"omnívoro"}.\nEstilo de vida: ${pr.estilo_vida||"no especificado"}.\nObjetivo: ${pr.objetivo||"mejorar salud"}.\nAlergias (NUNCA las incluyas en ninguna comida): ${(pr.alergias||[]).join(", ")||"ninguna"}.\nPresupuesto: ${pr.presupuesto||"medio"}. Tiempo para cocinar: ${pr.tiempo_cocinar||"medio"}.\nUsa ingredientes colombianos accesibles. Respeta gustos, dieta, alergias y condición de salud.\nResponde SOLO JSON sin backticks ni texto extra:\n{"desayuno":"desayuno ideal concreto con porciones","almuerzo":"almuerzo ideal con porciones","cena":"cena ideal con porciones","evitar":["alimento a evitar segun su condicion de salud"],"ejercicio":"rutina recomendada segun su estilo de vida y objetivo, 2-3 oraciones","resumen":"1 oracion motivadora y personal"}`;
      const p=await iaText(prompt);
      await fetch(`${SB_URL}/rest/v1/plans`,{method:"POST",headers:{apikey:SB_ANON,Authorization:`Bearer ${token}`,"Content-Type":"application/json",Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({user_id:user.id,desayuno:p.desayuno||"",almuerzo:p.almuerzo||"",cena:p.cena||"",evitar:p.evitar||[],ejercicio:p.ejercicio||"",resumen:p.resumen||"",generado_at:new Date().toISOString()})});
      setPlan({desayuno:p.desayuno,almuerzo:p.almuerzo,cena:p.cena,evitar:p.evitar||[],ejercicio:p.ejercicio,resumen:p.resumen});
    }catch(e){ setPlanErr("No se pudo generar el plan: "+(e.message||e)); }
    setPlanBusy(false);
  };
  useEffect(()=>{ if(!user||!token)return; (async()=>{ const has=await fetchPlan(); if(!has) genMiPlan(); })(); /* eslint-disable-next-line */ },[]);

  useEffect(()=>{
    const saved=((user&&user.user_metadata&&user.user_metadata.nombre)||localStorage.getItem("vt_perfil_actual")||"").trim();
    if(saved){localStorage.setItem("vt_perfil_actual",saved);
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
    const slp=localStorage.getItem(sk(perfil,"sleep"));if(slp)setSleepLog(JSON.parse(slp));
    const fp=localStorage.getItem(sk(perfil,"fit_plan"));if(fp)setExPlan(JSON.parse(fp));
    const fl=localStorage.getItem(sk(perfil,"fit_log"));if(fl)setExLog(JSON.parse(fl));
    const fd=localStorage.getItem(sk(perfil,"fit_done"));if(fd)setExDone(JSON.parse(fd));
    const fpr=localStorage.getItem(sk(perfil,"fit_prefs"));if(fpr){try{const p=JSON.parse(fpr);setExGoal(p.goal);setExEquip(p.equip);setExDias(p.dias);setExMin(p.min);}catch(_){}}
    setVotos(parseInt(localStorage.getItem(sk(perfil,"votos"))||"0"));
    const hb=localStorage.getItem(sk(perfil,"habits"));if(hb){try{setHabits(JSON.parse(hb));}catch(_){}}
    const rt=localStorage.getItem(sk(perfil,"sleep_routine"));if(rt){try{const r=JSON.parse(rt);setRoutineBed(r.bed);setRoutineWake(r.wake);}catch(_){}}
  },[perfil]);

  useEffect(()=>{smartAlarmRef.current={on:smartAlarm,time:alarmTime};},[smartAlarm,alarmTime]);

  useEffect(()=>{
    if(!perfil||tab!==2)return;
    setLoadingHist(true);
    apiGet({action:"historial",perfil}).then(d=>{if(d.ok)setHistory(d.registros||[]);}).catch(()=>{}).finally(()=>setLoadingHist(false));
  },[perfil,tab]);

  if(!perfil)return <ProfileScreen onEnter={p=>{setPerfil(p);setShowHF(true);}}/>;
  if(showHF&&!hp)return <HealthScreen perfil={perfil} onComplete={h=>{setHp(h);setShowHF(false);}}/>;
  if(prefsEditor) return <OnboardingPreferences user={user} token={token} onDone={()=>{setPrefsEditor(false);setTab(0);}}/>;

  const scores=calcScores(selected);
  const _nrecs=history.filter(r=>r&&r.score_total!=null&&r.score_total!=="").slice(0,14);
  const _avg=(k)=>{const v=_nrecs.filter(r=>r[k]!=null&&r[k]!=="");return v.length?Math.round(v.reduce((a,r)=>a+(Number(r[k])||0),0)/v.length):0;};
  const eatScore=_nrecs.length?{total:_avg("score_total"),immunity:_avg("score_inmunidad"),energy:_avg("score_energia"),focus:_avg("score_concentracion"),vitality:_avg("score_vitalidad"),n:_nrecs.length}:null;
  const scoreView=eatScore||scores;
  const today=new Date().toLocaleDateString("es-CO");
  const nivel=getNivel(streak,history.length);
  const waterPct=Math.min(100,(water/WATER_GOAL)*100);
  const scoreColor=v=>v>=70?"#6D5BD0":v>=40?"#E9C46A":"#E76F51";
  const scoreBg=v=>v>=70?"#EDEAFB":v>=40?"#FFF3CD":"#FFE5DE";
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

  const handleSave=async(foodsOverride)=>{
    const pending=customFood.trim()?[...customFoods,customFood.trim()]:[...customFoods];
    if(customFood.trim()){setCustomFoods(pending);setCustomFood("");}
    const all=(foodsOverride&&foodsOverride.length)?foodsOverride:[...selected,...pending];
    if(all.length===0){setSavedMsg("⚠️ Selecciona al menos un alimento");setTimeout(()=>setSavedMsg(""),2500);return;}
    setSaving(true);setSavedMsg("Analizando nutrición...");
    let analisis=photoResult;
    if(!analisis){try{const r=await analizarTexto(all,hp);analisis={ok:true,...r};setPhotoResult(analisis);}catch(_){}}
    try{
      const res=await apiGet({action:"guardar",perfil,fecha:today,comida:encodeURIComponent(MEALS[meal].label),alimentos:encodeURIComponent(JSON.stringify(all)),score_total:scores.total,score_inmunidad:scores.immunity,score_energia:scores.energy,score_concentracion:scores.focus,score_vitalidad:scores.vitality,agua_vasos:water,racha_dias:streak,notas:encodeURIComponent(analisis?.recomendacion||"")});
      if(res.ok){
        const lastDate=localStorage.getItem(sk(perfil,"streak_date"));
        const yStr=new Date(Date.now()-86400000).toLocaleDateString("es-CO");
        const ns=lastDate===yStr?streak+1:1;
        setStreak(ns);localStorage.setItem(sk(perfil,"streak"),ns);localStorage.setItem(sk(perfil,"streak_date"),today);
        setLastScore(scores.total);setLastCats(scores.cats);updateQF(all);
        checkBadges({streak:ns,water,lastScore:scores.total,lastCats:scores.cats},[...history,{comida:MEALS[meal].label,alimentos:all}]);
        setConfeti(true);addVoto();
        setIdMsg(IDENTITY_MSGS[Math.floor(Math.random()*IDENTITY_MSGS.length)](perfil,scores.total));
        setTimeout(()=>setPildora(PILDORAS[Math.floor(Math.random()*PILDORAS.length)]),1800);
        setSavedMsg(`✅ ¡Guardado! Score: ${scores.total}%`);
        setTimeout(()=>{setSelected([]);setCustomFoods([]);setPhotoResult(null);setPhotoPreview(null);setPhotoFoods(null);setPhotoConfirmed(false);setSavedMsg("");setIdMsg("");},4500);
      }else setSavedMsg("❌ Error al guardar");
    }catch(e){setSavedMsg(`❌ ${e.message}`);}
    setSaving(false);
  };

  const changeWater=d=>{const nw=Math.max(0,Math.min(12,water+d));setWater(nw);localStorage.setItem(sk(perfil,"water"),nw);localStorage.setItem(sk(perfil,"water_date"),today);if(nw>=8)checkBadges({streak,water:nw,lastScore,lastCats},history);};

  // ── IDENTIDAD: cada acción es un voto a quien eliges ser ──
  const addVoto=(n=1)=>{setVotos(prev=>{const nv=prev+n;localStorage.setItem(sk(perfil,"votos"),nv);return nv;});};
  const identityMsg=(v)=>{
    if(v<1)return"Hoy empiezas a votar por la persona que quieres ser.";
    if(v<10)return"Te estás convirtiendo en alguien que se cuida.";
    if(v<30)return"Eres una persona que cuida su energía.";
    if(v<70)return"Cuidarte ya es parte de quien eres.";
    if(v<150)return"Vives con bienestar — es parte de tu identidad. 💪";
    return"Eres ejemplo de una vida que se cuida cada día. 🌟";
  };

  // ── ACTÍVATE (pausas activas) ──────────────────────────
  const actBtn={padding:"14px 8px",borderRadius:14,border:"2px solid #EFEDFC",background:"#F8F7FE",color:"#6D5BD0",fontSize:14,fontWeight:800,cursor:"pointer"};
  const flashAct=(m)=>{setActMsg(m);setTimeout(()=>setActMsg(""),3500);};
  const addQuickWorkout=(tipo,min,intensidad)=>{const rec={date:today,ts:Date.now(),tipo,min,intensidad};setExLog(prev=>{const n=[rec,...prev].slice(0,120);localStorage.setItem(sk(perfil,"fit_log"),JSON.stringify(n));return n;});};
  const startBreathing=()=>{setBreathing(true);setBreathPhase("Inhala");let inhale=true;if(breathRef.current)clearInterval(breathRef.current);breathRef.current=setInterval(()=>{inhale=!inhale;setBreathPhase(inhale?"Inhala":"Exhala");},5000);setTimeout(stopBreathing,60000);};
  const stopBreathing=()=>{if(breathRef.current){clearInterval(breathRef.current);breathRef.current=null;}setBreathing(false);};
  const quickActivate=(type)=>{
    if(type==="agua"){changeWater(1);addVoto();flashAct("💧 +1 vaso. 🗳️ Un voto a quien cuida su cuerpo.");}
    else if(type==="caminar"){addQuickWorkout("Caminar",10,"media");addVoto();flashAct("🚶 10 min de caminata. 🗳️ Un voto a la persona activa que eliges ser.");}
    else if(type==="estirar"){addQuickWorkout("Estiramiento",5,"baja");addVoto();flashAct("🧘 5 min de estiramiento. 🗳️ Un voto a tu bienestar.");}
    else if(type==="descansar"){startBreathing();}
  };

  // ── ARMAR MI HÁBITO (señal → acción → recompensa) ──────
  const H_SIGNALS=["Al despertar","Después del almuerzo","Al llegar a casa","Antes de dormir","Cuando me estreso","En mi pausa del café"];
  const H_ACTIONS=[{k:"agua",l:"💧 Tomar agua"},{k:"caminar",l:"🚶 Caminar 10 min"},{k:"estirar",l:"🧘 Estirarme"},{k:"descansar",l:"😌 Respirar 1 min"},{k:"comida",l:"🍽️ Registrar comida"},{k:"sueno",l:"😴 Registrar sueño"}];
  const aLabel=(k)=>(H_ACTIONS.find(a=>a.k===k)||{}).l||k;
  const saveHabit=()=>{
    if(!hSignal||!hAction){flashAct("Elige una señal y una acción.");return;}
    const rec={id:Date.now(),signal:hSignal,action:hAction};
    setHabits(prev=>{const n=[rec,...prev].slice(0,12);localStorage.setItem(sk(perfil,"habits"),JSON.stringify(n));return n;});
    setHSignal("");setHAction("");flashAct("🔗 ¡Hábito creado! Cuando llegue la señal, ya sabes qué hacer.");
  };
  const delHabit=(id)=>{setHabits(prev=>{const n=prev.filter(h=>h.id!==id);localStorage.setItem(sk(perfil,"habits"),JSON.stringify(n));return n;});};
  const runHabit=(a)=>{
    if(a==="agua"||a==="caminar"||a==="estirar"||a==="descansar")quickActivate(a);
    else if(a==="comida"){setTab(0);flashAct("📸 Registra tu comida un poco más abajo 👇");}
    else if(a==="sueno"){setTab(5);}
  };

  // ── MI RUTINA DE SUEÑO + SONIDOS PARA DORMIR (Sleep Routine) ──
  const routineHours=()=>{const[bh,bm]=routineBed.split(":").map(Number),[wh,wm]=routineWake.split(":").map(Number);let m=(wh*60+wm)-(bh*60+bm);if(m<=0)m+=1440;return Math.round(m/6)/10;};
  const saveRoutine=()=>{localStorage.setItem(sk(perfil,"sleep_routine"),JSON.stringify({bed:routineBed,wake:routineWake}));setAlarmTime(routineWake);flashAct("🎯 Rutina guardada: "+routineBed+" → "+routineWake+" ("+routineHours()+" h).");};
  const stopSound=()=>{const s=soundRef.current;if(!s)return;try{clearTimeout(s.timer);s.gain.gain.cancelScheduledValues(s.ctx.currentTime);s.gain.gain.linearRampToValueAtTime(0,s.ctx.currentTime+0.6);setTimeout(()=>{try{s.src.stop();s.ctx.close();}catch(_){}},700);}catch(_){}soundRef.current=null;setSound(null);};
  const startSound=(type)=>{
    if(sound&&sound.type===type){stopSound();return;}
    stopSound();
    try{
      const AC=window.AudioContext||window.webkitAudioContext,ctx=new AC();
      const src=makeNoise(ctx,type==="marron"?"marron":"blanco"),gain=ctx.createGain();gain.gain.value=0;
      if(type==="lluvia"||type==="blanco"){const lp=ctx.createBiquadFilter();lp.type="lowpass";lp.frequency.value=type==="lluvia"?1600:7000;src.connect(lp);lp.connect(gain);}
      else src.connect(gain);
      gain.connect(ctx.destination);src.start();
      gain.gain.linearRampToValueAtTime(type==="marron"?0.18:0.22,ctx.currentTime+1.5);
      const timer=setTimeout(stopSound,soundTimer*60000);
      soundRef.current={ctx,src,gain,timer};setSound({type,mins:soundTimer});
    }catch(_){flashAct("Tu navegador no permite reproducir el sonido.");}
  };

  // ── SUEÑO ──────────────────────────────────────────────
  const calcHours=(bed,wake)=>{
    if(!bed||!wake)return 0;
    const [bh,bm]=bed.split(":").map(Number),[wh,wm]=wake.split(":").map(Number);
    let mins=(wh*60+wm)-(bh*60+bm); if(mins<=0)mins+=1440;
    return Math.round(mins/6)/10;
  };
  const sleepStats=()=>{
    const last=sleepLog.slice(0,7);
    if(!last.length)return null;
    const avg=last.reduce((a,n)=>a+n.hours,0)/last.length;
    const avgQ=last.reduce((a,n)=>a+(n.quality||3),0)/last.length;
    const debt=last.reduce((a,n)=>a+Math.max(0,8-n.hours),0);
    const beds=last.map(n=>{const[h,m]=n.bed.split(":").map(Number);let v=h*60+m;if(v<720)v+=1440;return v;});
    const mB=beds.reduce((a,b)=>a+b,0)/beds.length;
    const sd=Math.sqrt(beds.reduce((a,b)=>a+(b-mB)**2,0)/beds.length);
    const consLabel=sd<30?"Excelente":sd<60?"Buena":sd<90?"Irregular":"Muy irregular";
    const consScore=sd<30?30:sd<60?22:sd<90?12:5;
    const durScore=Math.min(40,Math.round((avg/8)*40));
    const qScore=Math.round((avgQ/5)*30);
    const score=Math.max(0,Math.min(100,durScore+qScore+consScore));
    return{avg:Math.round(avg*10)/10,avgQ:Math.round(avgQ*10)/10,debt:Math.round(debt*10)/10,sd:Math.round(sd),consLabel,score,n:last.length};
  };
  const saveSleep=()=>{
    const hours=measuredData?Math.round(measuredData.mins/6)/10:calcHours(bedtime,waketime);
    if(!measuredData&&!hours){setSleepMsg("Pon hora de dormir y de despertar");setTimeout(()=>setSleepMsg(""),2500);return;}
    const rec={date:today,bed:bedtime,wake:waketime,hours,quality:sleepQuality,awakenings,note:sleepNote.trim()};
    if(measuredData)Object.assign(rec,{measured:true},measuredData);
    const next=[rec,...sleepLog.filter(n=>n.date!==today)].slice(0,60);
    setSleepLog(next);localStorage.setItem(sk(perfil,"sleep"),JSON.stringify(next));
    setSleepNote("");setSleepAI(null);setNightAI(null);setMeasuredData(null);setSleepMsg("✓ Noche guardada — generando resumen…");setTimeout(()=>setSleepMsg(""),2500);
    addVoto();
    analyzeNight(next);
  };
  const analyzeSleep=async()=>{
    if(sleepLog.length<2){setSleepMsg("Registra al menos 2 noches para analizar");setTimeout(()=>setSleepMsg(""),2500);return;}
    setSleepAnalyzing(true);setSleepAI(null);
    try{const r=await analizarSueno(sleepLog.slice(0,7),hp);setSleepAI(r);}
    catch(e){setSleepMsg("Error: "+e.message);setTimeout(()=>setSleepMsg(""),3000);}
    setSleepAnalyzing(false);
  };
  const analyzeNight=async(nightsArg)=>{
    const nights=Array.isArray(nightsArg)?nightsArg:sleepLog;
    if(!nights.length){setSleepMsg("Primero guarda la noche");setTimeout(()=>setSleepMsg(""),2500);return;}
    setNightAnalyzing(true);setNightAI(null);
    const dieta=[...history].slice(-4).map(r=>{let f=[];try{f=JSON.parse(typeof r.alimentos==="string"?r.alimentos:JSON.stringify(r.alimentos||[]));}catch(_){}return `${r.comida||"Comida"}: ${(Array.isArray(f)?f:[]).join(", ")||"—"}`;}).join(" | ");
    try{const r=await resumenNoche(nights[0],nights.slice(0,7),hp,dieta);setNightAI(r);}
    catch(e){setNightAI({titulo:"No se pudo generar el resumen",resumen:"Hubo un problema al analizar tu noche ("+e.message+"). Revisa tu conexión y vuelve a intentarlo.",semaforo:"amarillo",recomendacion:"Toca de nuevo \"Resumen de anoche con IA\" para reintentar.",ver_medico:false});}
    setNightAnalyzing(false);
  };

  // ── EJERCICIO ──────────────────────────────────────────
  const weekMinutes=()=>{const now=Date.now();return exLog.filter(w=>now-(w.ts||0)<7*864e5).reduce((a,w)=>a+(w.min||0),0);};
  const weekDaysActive=()=>{const now=Date.now();const ds=new Set();exLog.forEach(w=>{if(now-(w.ts||0)<7*864e5)ds.add(w.date);});return ds.size;};
  const genPlan=async()=>{
    setExAnalyzing(true);
    localStorage.setItem(sk(perfil,"fit_prefs"),JSON.stringify({goal:exGoal,equip:exEquip,dias:exDias,min:exMin}));
    let contexto="";const ss=sleepStats();if(ss)contexto=`Contexto del usuario: duerme en promedio ${ss.avg}h con constancia ${ss.consLabel}. Ajusta la carga si duerme poco.`;
    try{const r=await planSemana({goal:exGoal,equip:exEquip,dias:exDias,min:exMin},hp,contexto);setExPlan(r);setExDone([]);localStorage.setItem(sk(perfil,"fit_plan"),JSON.stringify(r));localStorage.setItem(sk(perfil,"fit_done"),"[]");}
    catch(e){setExMsg("Error: "+e.message);setTimeout(()=>setExMsg(""),3000);}
    setExAnalyzing(false);
  };
  const toggleDone=(i)=>{const n=exDone.includes(i)?exDone.filter(x=>x!==i):[...exDone,i];setExDone(n);localStorage.setItem(sk(perfil,"fit_done"),JSON.stringify(n));};
  const logWorkout=()=>{
    if(!exLogMin){setExMsg("Pon los minutos");setTimeout(()=>setExMsg(""),2000);return;}
    const rec={date:today,ts:Date.now(),tipo:exType,min:exLogMin,intensidad:exInt};
    const n=[rec,...exLog].slice(0,120);setExLog(n);localStorage.setItem(sk(perfil,"fit_log"),JSON.stringify(n));
    setExMsg("✓ Entrenamiento registrado");setTimeout(()=>setExMsg(""),2500);
  };

  // ── VOZ ────────────────────────────────────────────────
  const applyVoz=(p)=>{
    if(p.ejercicio&&p.ejercicio.minutos){
      const rec={date:today,ts:Date.now(),tipo:p.ejercicio.tipo||"Ejercicio",min:Number(p.ejercicio.minutos)||0,intensidad:p.ejercicio.intensidad||"media"};
      setExLog(prev=>{const n=[rec,...prev].slice(0,120);localStorage.setItem(sk(perfil,"fit_log"),JSON.stringify(n));return n;});
    }
    if(p.agua_vasos){const nw=Math.max(0,Math.min(12,Number(p.agua_vasos)));setWater(nw);localStorage.setItem(sk(perfil,"water"),nw);localStorage.setItem(sk(perfil,"water_date"),today);}
    if(Array.isArray(p.comidas)&&p.comidas.length){
      const nuevos=[];
      p.comidas.forEach(c=>{
        const all=Array.isArray(c.alimentos)?c.alimentos:[];
        const matched=FOOD_CATEGORIES.flatMap(cat=>cat.items).filter(f=>all.some(a=>f.toLowerCase().includes(String(a).toLowerCase())||String(a).toLowerCase().includes(f.toLowerCase())));
        const sc=calcScores(matched);
        nuevos.push({fecha:today,comida:c.momento||"Comida",alimentos:JSON.stringify(all),score_total:sc.total,porVoz:true});
        apiGet({action:"guardar",perfil,fecha:today,comida:encodeURIComponent(c.momento||"Comida"),alimentos:encodeURIComponent(JSON.stringify(all)),score_total:sc.total,score_inmunidad:sc.immunity,score_energia:sc.energy,score_concentracion:sc.focus,score_vitalidad:sc.vitality,agua_vasos:water,racha_dias:streak,notas:""}).catch(()=>{});
      });
      setHistory(prev=>[...nuevos,...prev]);
    }
  };
  const processVoice=async(texto)=>{
    setVoiceBusy(true);
    try{
      const p=await interpretarVoz(texto);
      applyVoz(p);
      let analisis=null;
      const foods=(p.comidas||[]).flatMap(c=>c.alimentos||[]);
      if(foods.length){try{analisis=await analizarTexto(foods,hp);}catch(_){}}
      setVoiceResult({...p,analisis});
    }
    catch(e){setVoiceResult({respuesta:"No pude procesarlo, intenta de nuevo."});}
    setVoiceBusy(false);
  };
  const startVoice=()=>{
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){setVoiceResult({respuesta:"Tu navegador no soporta dictado. Abre la app en Chrome."});return;}
    let acc="";
    recRef.userStop=false;
    setVoiceText("");setVoiceResult(null);setListening(true);
    const run=()=>{
      const r=new SR();r.lang="es-CO";r.interimResults=true;r.continuous=false;r._fin="";
      recRef.current=r;
      r.onresult=(e)=>{let fin="",inter="";for(let i=0;i<e.results.length;i++){const seg=e.results[i];if(seg.isFinal)fin+=seg[0].transcript+" ";else inter=seg[0].transcript;}r._fin=fin.trim();setVoiceText((acc+" "+(fin?fin:inter)).trim());};
      r.onerror=(ev)=>{if(ev.error==="not-allowed"||ev.error==="service-not-allowed"){recRef.userStop=true;setListening(false);setVoiceResult({respuesta:"Necesito permiso de micrófono para escucharte."});}};
      r.onend=()=>{if(r._fin)acc=(acc+" "+r._fin).trim();if(recRef.userStop){setListening(false);if(acc.trim())processVoice(acc.trim());else setVoiceResult(null);}else{try{run();}catch(_){setListening(false);if(acc.trim())processVoice(acc.trim());}}};
      try{r.start();}catch(_){}
    };
    run();
  };
  const stopVoice=()=>{recRef.userStop=true;try{recRef.current&&recRef.current.stop();}catch(_){}};

  // ── ANÁLISIS SEMANAL INTEGRAL ──────────────────────────
  const analizarSemana=async()=>{
    setWeeklyBusy(true);setWeeklyAI(null);
    const comida=history.slice(0,10).map(r=>{let f=[];try{f=JSON.parse(typeof r.alimentos==="string"?r.alimentos:JSON.stringify(r.alimentos||[]));}catch(_){}return `${r.comida}: ${(Array.isArray(f)?f:[]).join(", ")}`;}).join(" | ")||"sin registros de comida";
    const ss=sleepStats();const sueno=ss?`promedio ${ss.avg}h, calidad ${ss.avgQ}/5, constancia ${ss.consLabel}, deuda ${ss.debt}h`:"sin registros de sueño";
    const ejercicio=`${weekMinutes()} min en ${weekDaysActive()} días esta semana; recientes: ${exLog.slice(0,5).map(w=>w.tipo+" "+w.min+"min").join(", ")||"ninguno"}`;
    const agua=`${water} de ${WATER_GOAL} vasos hoy`;
    try{const r=await analisisSemanal({comida,sueno,ejercicio,agua},hp);setWeeklyAI(r);}
    catch(e){setWeeklyAI({resumen:"No se pudo analizar: "+e.message,habitos:[]});}
    setWeeklyBusy(false);
  };
  const fireAlarm=(ref)=>{
    ref.alarmFired=true;
    try{
      const AC=window.AudioContext||window.webkitAudioContext;
      const ctx=ref.audioCtx&&ref.audioCtx.state!=="closed"?ref.audioCtx:new AC();
      let n=0;const beep=()=>{if(n++>12)return;const o=ctx.createOscillator(),g=ctx.createGain();o.frequency.value=n%2?660:880;o.connect(g);g.connect(ctx.destination);g.gain.setValueAtTime(0.001,ctx.currentTime);g.gain.exponentialRampToValueAtTime(0.35,ctx.currentTime+0.05);g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.5);o.start();o.stop(ctx.currentTime+0.55);setTimeout(beep,700);};
      beep();
    }catch(_){}
    try{navigator.vibrate&&navigator.vibrate([500,300,500,300,800]);}catch(_){}
    setSleepMsg("⏰ ¡Despertador inteligente! Te despertamos en una fase ligera.");
  };
  const startMeasure=async()=>{
    try{
      if(typeof DeviceMotionEvent!=="undefined"&&DeviceMotionEvent.requestPermission){
        const p=await DeviceMotionEvent.requestPermission();
        if(p!=="granted"){setSleepMsg("Permiso de movimiento denegado");setTimeout(()=>setSleepMsg(""),3000);return;}
      }
      const ref=measureRef.current;
      ref.start=Date.now();ref.lastMove=0;ref.prevMag=null;ref.timeline=[];ref.sound=[];ref.snores=0;ref.lastSnore=0;ref.alarmFired=false;ref.curLevel=0;ref.ambient=null;
      ref.handler=(ev)=>{const a=ev.accelerationIncludingGravity;if(!a)return;const mag=Math.sqrt((a.x||0)**2+(a.y||0)**2+(a.z||0)**2);const now=Date.now();if(ref.prevMag!=null){const delta=Math.abs(mag-ref.prevMag);if(delta>3&&now-ref.lastMove>3000){ref.lastMove=now;ref.timeline.push((now-ref.start)/60000);setMoveCount(ref.timeline.length);}}ref.prevMag=mag;};
      window.addEventListener("devicemotion",ref.handler);
      try{
        const stream=await navigator.mediaDevices.getUserMedia({audio:true});
        ref.micStream=stream;const AC=window.AudioContext||window.webkitAudioContext;ref.audioCtx=new AC();
        if(ref.audioCtx.state==="suspended"){try{await ref.audioCtx.resume();}catch(_){}}
        const srcN=ref.audioCtx.createMediaStreamSource(stream);ref.analyser=ref.audioCtx.createAnalyser();ref.analyser.fftSize=1024;
        srcN.connect(ref.analyser);ref.buf=new Uint8Array(ref.analyser.fftSize);
        setMicActive(true);
      }catch(_){ref.analyser=null;setMicActive(false);}
      try{ref.wake=await navigator.wakeLock.request("screen");}catch(_){}
      // Loop rápido de audio: nivel real (RMS) + detección de ronquidos + medidor en vivo
      ref.audioInt=setInterval(()=>{
        if(!ref.analyser)return;
        ref.analyser.getByteTimeDomainData(ref.buf);
        let sum=0;for(let i=0;i<ref.buf.length;i++){const v=(ref.buf[i]-128)/128;sum+=v*v;}
        const level=Math.round(Math.sqrt(sum/ref.buf.length)*200);
        ref.curLevel=level;setSoundLevel(level);
        ref.ambient=ref.ambient==null?level:ref.ambient*0.96+level*0.04;
        const now=Date.now();
        if(level>Math.max(12,(ref.ambient||0)*2.5)&&now-ref.lastSnore>2000){ref.snores++;ref.lastSnore=now;setSnoreCount(ref.snores);}
      },300);
      // Loop lento: guarda muestra para fases + revisa despertador inteligente
      ref.interval=setInterval(()=>{
        const now=Date.now(),tmin=(now-ref.start)/60000;
        ref.sound.push({t:tmin,lvl:ref.curLevel||0});
        if(smartAlarmRef.current.on&&!ref.alarmFired){
          const [ah,am]=smartAlarmRef.current.time.split(":").map(Number);
          const target=new Date(ref.start);target.setHours(ah,am,0,0);if(target.getTime()<ref.start)target.setDate(target.getDate()+1);
          const msTo=target.getTime()-now,recentMove=ref.timeline.length&&(tmin-ref.timeline[ref.timeline.length-1])<1.5;
          if((msTo<=30*60000&&msTo>0&&recentMove)||msTo<=0)fireAlarm(ref);
        }
      },3000);
      setMoveCount(0);setSnoreCount(0);setMeasuring(true);setBedtime(new Date().toTimeString().slice(0,5));
    }catch(_){setSleepMsg("No se pudo iniciar la medición en este navegador");setTimeout(()=>setSleepMsg(""),3000);}
  };
  const stopMeasure=()=>{
    const ref=measureRef.current;
    if(ref.handler)window.removeEventListener("devicemotion",ref.handler);
    if(ref.interval)clearInterval(ref.interval);
    if(ref.audioInt)clearInterval(ref.audioInt);
    if(ref.micStream){try{ref.micStream.getTracks().forEach(t=>t.stop());}catch(_){}}
    if(ref.audioCtx){try{ref.audioCtx.close();}catch(_){}}
    if(ref.wake){try{ref.wake.release();}catch(_){}ref.wake=null;}
    setSoundLevel(0);setMicActive(false);
    const mins=ref.start?Math.round((Date.now()-ref.start)/60000):0;
    const tl=ref.timeline||[],sound=ref.sound||[],moves=tl.length;
    const tooShort=mins<25;
    const EP=5,nE=Math.max(1,Math.ceil(mins/EP));
    // 1) actividad por bloque de 5 min
    const epAct=[];
    for(let i=0;i<nE;i++){
      const a=i*EP,b=(i+1)*EP;
      const mv=tl.filter(t=>t>=a&&t<b).length;
      const snd=sound.filter(s=>s.t>=a&&s.t<b);const maxL=snd.length?Math.max(...snd.map(s=>s.lvl)):0;
      epAct.push({mv,maxL});
    }
    // 2) clasificación inicial: 0 despierto, 1 ligero, 2 quieto(candidato a profundo)
    const stages=epAct.map((e,i)=>{
      if(e.mv>=2||(i<2&&e.mv>=1))return 0;
      if(e.mv>=1||e.maxL>35)return 1;
      return 2;
    });
    // 3) refinar: el sueño profundo de verdad ocurre en RACHAS largas de quietud y sobre todo
    //    en la primera mitad de la noche. Lo demás (quietud aislada o 2a mitad) es sueño ligero.
    let run=0;
    for(let i=0;i<stages.length;i++){
      run=stages[i]===2?run+1:0;
      if(stages[i]===2 && !(run>=3 && i<nE/2)) stages[i]=1;
    }
    const cnt=[0,0,0];stages.forEach(s=>cnt[s]++);const tot=stages.length||1;
    const pctAwake=Math.round(cnt[0]/tot*100),pctLight=Math.round(cnt[1]/tot*100),pctDeep=Math.round(cnt[2]/tot*100);
    let deepRun=0,cur=0;stages.forEach(s=>{if(s===2){cur++;if(cur>deepRun)deepRun=cur;}else cur=0;});
    const t=[0,0,0];tl.forEach(m=>{const f=mins>0?m/mins:0;t[f<0.34?0:f<0.67?1:2]++;});
    setWaketime(new Date().toTimeString().slice(0,5));
    setAwakenings(Math.min(9,cnt[0]));
    setSleepQuality(tooShort?3:(pctDeep>=20?5:pctDeep>=12?4:pctDeep>=6?3:2));
    setMeasuredData({mins,moves,t1:t[0],t2:t[1],t3:t[2],still:deepRun*EP,stages,pctAwake,pctLight,pctDeep,snores:ref.snores,tooShort});
    setMeasuring(false);
    setSleepMsg(tooShort?`Medido: ${(mins/60).toFixed(1)}h y ${ref.snores} ruidos. Muy corto para estimar fases — revisa y guarda.`:`Medido: ${(mins/60).toFixed(1)}h · ${pctDeep}% profundo · ${ref.snores} ruidos. Revisa y guarda.`);setTimeout(()=>setSleepMsg(""),7000);
  };

  const handlePhoto=async(e)=>{
    const file=e.target.files?.[0];if(!file)return;
    setPhotoAI(true);setPhotoResult(null);setPhotoFoods(null);
    const url=URL.createObjectURL(file);setPhotoPreview(url);
    try{
      const b64=await new Promise((res,rej)=>{const img=new Image();img.onload=()=>{const MAX=1280,r=Math.min(MAX/img.width,MAX/img.height,1),c=document.createElement("canvas");c.width=Math.round(img.width*r);c.height=Math.round(img.height*r);c.getContext("2d").drawImage(img,0,0,c.width,c.height);res(c.toDataURL("image/jpeg",.85).split(",")[1]);};img.onerror=rej;img.src=url;});
      const result=await analizarFoto(b64,"image/jpeg",hp);
      setPhotoFoods(result.alimentos||[]);setPhotoConfirmed(false);
      (result.alimentos||[]).forEach(item=>{const al=typeof item==="object"?item.nombre:item;FOOD_CATEGORIES.forEach(cat=>{const m=cat.items.find(i=>i.toLowerCase().includes(al.toLowerCase())||al.toLowerCase().includes(i.toLowerCase()));if(m&&!selected.includes(m))setSelected(p=>[...p,m]);});});
    }catch(err){setPhotoResult({ok:false,recomendacion:`Error: ${err.message}`,semaforo:"rojo"});}
    setPhotoAI(false);e.target.value="";
  };

  // Empareja un nombre detectado por la IA con un alimento del catálogo de la app
  const matchFood = (nombre) =>
    FOOD_CATEGORIES.flatMap(c=>c.items)
      .find(f => f.toLowerCase().includes((nombre||"").toLowerCase())
              || (nombre||"").toLowerCase().includes(f.toLowerCase()));

  // Corregir con UN toque: cambia el alimento por su alternativa y reajusta la selección
  const swapToAlternative = (index) => {
    const item = photoFoods[index];
    const oldName = typeof item==="object" ? item.nombre : item;
    const newName = typeof item==="object" ? item.alternativa : null;
    if(!newName) return;
    // 1) actualiza el chip (deja poder devolverlo con otro toque)
    setPhotoFoods(prev => prev.map((it,i) =>
      i===index ? { ...it, nombre:newName, alternativa:oldName, confianza:"alta" } : it
    ));
    // 2) saca el viejo de la selección, mete el nuevo
    const oldMatch = matchFood(oldName);
    const newMatch = matchFood(newName);
    setSelected(sel => {
      let s = oldMatch ? sel.filter(x => x!==oldMatch) : sel.slice();
      if(newMatch && !s.includes(newMatch)) s = [...s, newMatch];
      return s;
    });
  };

  // Corrección por voz de la foto: el usuario dicta qué cambiar
  const applyPhotoCorrection=async(texto)=>{
    setPhotoVoiceBusy(true);
    try{
      const names=(photoFoods||[]).map(f=>typeof f==="object"?f.nombre:f);
      const r=await corregirFoto(names,texto);
      const nf=r.alimentos||[];
      setPhotoFoods(nf);
      const matches=nf.map(f=>matchFood(typeof f==="object"?f.nombre:f)).filter(Boolean);
      setSelected([...new Set(matches)]);
    }catch(_){setSavedMsg("No pude aplicar la corrección, intenta de nuevo");setTimeout(()=>setSavedMsg(""),3000);}
    setPhotoVoiceBusy(false);
  };
  const startPhotoVoiceCorrection=()=>{
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){setSavedMsg("Tu navegador no soporta voz. Usa Chrome.");setTimeout(()=>setSavedMsg(""),3000);return;}
    let acc="";
    photoRecRef.userStop=false;setPhotoVoiceListening(true);
    const run=()=>{
      const r=new SR();r.lang="es-CO";r.interimResults=true;r.continuous=false;r._fin="";
      photoRecRef.current=r;
      r.onresult=(e)=>{let fin="";for(let i=0;i<e.results.length;i++){const seg=e.results[i];if(seg.isFinal)fin+=seg[0].transcript+" ";}r._fin=fin.trim();};
      r.onerror=(ev)=>{if(ev.error==="not-allowed"){photoRecRef.userStop=true;setPhotoVoiceListening(false);}};
      r.onend=()=>{if(r._fin)acc=(acc+" "+r._fin).trim();if(photoRecRef.userStop){setPhotoVoiceListening(false);if(acc.trim())applyPhotoCorrection(acc.trim());}else{try{run();}catch(_){setPhotoVoiceListening(false);if(acc.trim())applyPhotoCorrection(acc.trim());}}};
      try{r.start();}catch(_){}
    };
    run();
  };
  const stopPhotoVoice=()=>{photoRecRef.userStop=true;try{photoRecRef.current&&photoRecRef.current.stop();}catch(_){}};
  // Confirmar la foto → guardar y luego analizar
  const confirmPhotoAndSave=()=>{
    setPhotoConfirmed(true);
    const names=(photoFoods||[]).map(f=>typeof f==="object"?f.nombre:f);
    handleSave(names.length?names:undefined);
  };

  // Filtro de búsqueda
  const filteredCats = search ? FOOD_CATEGORIES.map(c=>({...c,items:c.items.filter(i=>i.toLowerCase().includes(search.toLowerCase()))})).filter(c=>c.items.length>0) : FOOD_CATEGORIES;

  const TABS=[{icon:"🏠",label:"Inicio"},{icon:"📊",label:"Score"},{icon:"📅",label:"Historial"},{icon:"🏅",label:"Logros"},{icon:"💧",label:"Agua"},{icon:"😴",label:"Sueño"},{icon:"💪",label:"Ejercicio"}];

  return(
    <div style={{minHeight:"100vh",background:"#F8F7FE",fontFamily:"'Segoe UI',system-ui,sans-serif",color:"#1A1A1A",maxWidth:480,margin:"0 auto",paddingBottom:80}}>

      {confeti&&<Confeti onDone={()=>setConfeti(false)}/>}
      {newBadge&&<Toast icon={newBadge.icon} title="¡Insignia desbloqueada!" sub={`${newBadge.nombre} — ${newBadge.desc}`} color="#6D5BD0" onClose={()=>setNewBadge(null)}/>}
      {pildora&&<Toast icon="💡" title="Píldora de sabiduría" sub={pildora} color="#F4A261" onClose={()=>setPildora(null)}/>}

      {/* ══ HEADER VERDE ══════════════════════════════════════════ */}
      <div style={{background:"linear-gradient(160deg,#4A3B9E,#6D5BD0)",padding:"16px 16px 28px",position:"sticky",top:0,zIndex:10}}>
        {/* Barra agua top */}
        <div style={{height:3,background:"rgba(255,255,255,0.2)",borderRadius:2,marginBottom:14,overflow:"hidden"}}>
          <div style={{height:3,width:`${waterPct}%`,background:"rgba(255,255,255,0.8)",borderRadius:2,transition:"width .5s"}}/>
        </div>
        {/* Saludo */}
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
          <div style={{width:52,height:52,borderRadius:16,background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,backdropFilter:"blur(10px)",border:"2px solid rgba(255,255,255,0.3)",flexShrink:0}}>{nivel.icon}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{color:"#fff",fontSize:19,fontWeight:900,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>¡Hola, {perfil}! 👋</div>
            <div style={{color:"rgba(255,255,255,.85)",fontSize:12,marginTop:2}}>Hoy es un buen día para cuidar de ti 🌟</div>
          </div>
          <button onClick={()=>{localStorage.removeItem("vt_perfil_actual");onLogout&&onLogout();}} style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:10,padding:"6px 10px",color:"rgba(255,255,255,.8)",fontSize:10,fontWeight:700,cursor:"pointer",backdropFilter:"blur(10px)",flexShrink:0}}>Salir</button>
        </div>
        {/* Chips de estado */}
        <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginBottom:14}}>
          <span style={{background:"rgba(255,255,255,0.22)",color:"#fff",fontSize:11,fontWeight:800,padding:"4px 10px",borderRadius:20}}>{nivel.icon} {nivel.nivel}</span>
          {hp&&<span style={{background:"rgba(255,255,255,0.12)",color:"rgba(255,255,255,.9)",fontSize:11,fontWeight:600,padding:"4px 10px",borderRadius:20}}>{hp.edad} años · {hp.enfermedad}</span>}
          {streak>0&&<span style={{background:"rgba(255,255,255,0.12)",color:"#FFD166",fontSize:11,fontWeight:800,padding:"4px 10px",borderRadius:20}}>🔥 {streak} días</span>}
        </div>
        {/* Stats row */}
        <div style={{display:"flex",gap:8}}>
          {[{v:history.length,l:"Registros"},{v:streak,l:"Días racha"},{v:badges.length,l:"Logros"},{v:water,l:"Vasos agua"}].map(({v,l})=>(
            <div key={l} style={{flex:1,background:"rgba(255,255,255,0.14)",borderRadius:14,padding:"11px 6px",textAlign:"center",backdropFilter:"blur(10px)"}}>
              <div style={{color:"#fff",fontSize:19,fontWeight:900,lineHeight:1}}>{v}</div>
              <div style={{color:"rgba(255,255,255,.7)",fontSize:9,marginTop:3}}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ══ TAB 0: INICIO/REGISTRO ════════════════════════════════ */}
      {tab===0&&(
        <div style={{padding:"16px 14px"}}>

          {/* Accesos rápidos */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16}}>
            {[["💧","Agua",4,"#3DAEE6"],["😴","Sueño",5,"#6D5BD0"],["💪","Ejercicio",6,"#E76F51"]].map(([ic,lb,tb,cl])=>(
              <button key={lb} onClick={()=>setTab(tb)} style={{background:"#fff",border:"none",borderRadius:16,padding:"16px 8px",boxShadow:"0 2px 10px rgba(0,0,0,0.05)",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
                <span style={{fontSize:26}}>{ic}</span>
                <span style={{fontSize:12,fontWeight:800,color:cl}}>{lb}</span>
              </button>
            ))}
          </div>

          {/* Resumen del día */}
          <div style={{background:"#fff",borderRadius:18,padding:"18px 16px",marginBottom:16,boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
            <div style={{fontSize:16,fontWeight:900,color:"#6D5BD0",marginBottom:14}}>Tu resumen de hoy</div>
            {(()=>{
              const exHoy=exLog.filter(w=>w.date===today).reduce((a,w)=>a+(w.min||0),0);
              const suenoH=(sleepLog[0]&&sleepLog[0].date===today)?(sleepLog[0].hours||0):0;
              const pNutri=Math.max(0,Math.min(100,Math.round(lastScore)));
              const pAgua=Math.max(0,Math.min(100,Math.round(water/WATER_GOAL*100)));
              const pEjer=Math.max(0,Math.min(100,Math.round(exHoy/30*100)));
              const pSueno=Math.max(0,Math.min(100,Math.round(suenoH/8*100)));
              const dia=Math.round((pNutri+pAgua+pEjer+pSueno)/4);
              const R=46,C=2*Math.PI*R;
              const barras=[
                ["Nutrición",pNutri,"#6D5BD0",lastScore?`${Math.round(lastScore)}/100`:"—"],
                ["Hidratación",pAgua,"#3DAEE6",`${water}/${WATER_GOAL} vasos`],
                ["Ejercicio",pEjer,"#E76F51",`${exHoy} min`],
                ["Sueño",pSueno,"#5B49C0",suenoH?`${suenoH} h`:"—"],
              ];
              return (<div>
                <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:14}}>
                  <div style={{position:"relative",width:112,height:112,flexShrink:0}}>
                    <svg width="112" height="112" viewBox="0 0 112 112">
                      <circle cx="56" cy="56" r="46" fill="none" stroke="#EDEAFB" strokeWidth="11"/>
                      <circle cx="56" cy="56" r="46" fill="none" stroke="#6D5BD0" strokeWidth="11" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C*(1-dia/100)} transform="rotate(-90 56 56)" style={{transition:"stroke-dashoffset .6s"}}/>
                    </svg>
                    <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                      <div style={{fontSize:26,fontWeight:900,color:"#6D5BD0",lineHeight:1}}>{dia}<span style={{fontSize:13}}>%</span></div>
                      <div style={{fontSize:10,color:"#999",marginTop:2,fontWeight:700}}>del día</div>
                    </div>
                  </div>
                  <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",gap:11}}>
                    {barras.map(([lb,pct,cl,val])=>(
                      <div key={lb}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                          <span style={{fontSize:12,fontWeight:700,color:"#555"}}>{lb}</span>
                          <span style={{fontSize:11,fontWeight:700,color:cl}}>{val}</span>
                        </div>
                        <div style={{height:7,background:"#F0EFF7",borderRadius:6,overflow:"hidden"}}>
                          <div style={{height:7,width:pct+"%",background:cl,borderRadius:6,transition:"width .6s"}}/>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{fontSize:12,color:"#999",textAlign:"center"}}>{dia>=70?"¡Vas muy bien hoy! 🌟":dia>=40?"Buen avance, sigue así 💪":"Registra tus hábitos para subir tu puntuación 📈"}</div>
              </div>);
            })()}
          </div>

          {/* Selector comida — grid 2x2 */}
          <div style={{marginBottom:16}}>
            <div style={{fontSize:12,color:"#6D5BD0",fontWeight:800,textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>Registrar comida</div>
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
            <button onClick={()=>fileRef.current?.click()} disabled={photoAI} style={{width:"100%",padding:15,borderRadius:16,border:"2px dashed #8B7BE8",background:photoAI?"#EFEDFC":"#F0FBF4",color:"#6D5BD0",fontSize:14,fontWeight:800,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              <span style={{fontSize:22}}>📷</span>
              {photoAI?"🔍 Analizando con IA...":"Tomar foto y detectar alimentos"}
            </button>

            {photoPreview&&<div style={{marginTop:10,borderRadius:16,overflow:"hidden",maxHeight:180,boxShadow:"0 4px 20px rgba(0,0,0,0.1)"}}><img src={photoPreview} style={{width:"100%",objectFit:"cover",maxHeight:180}} alt="foto"/></div>}

            {/* Confirmación foto */}
            {photoFoods&&photoFoods.length>0&&(
              <div style={{marginTop:10,background:"#fff",borderRadius:16,padding:14,boxShadow:"0 4px 20px rgba(0,0,0,0.08)",border:"2px solid #EFEDFC"}}>
                <div style={{fontSize:12,color:"#6D5BD0",fontWeight:800,marginBottom:10}}>✨ IA detectó — confirma o corrige con un toque:</div>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {photoFoods.map((item,i)=>{
                    const nombre=typeof item==="object"?item.nombre:item;
                    const porcion=typeof item==="object"?item.porcion:"";
                    const confianza=typeof item==="object"?item.confianza:"alta";
                    const alternativa=typeof item==="object"?item.alternativa:null;
                    const matchApp=matchFood(nombre);
                    const isSel=matchApp&&selected.includes(matchApp);
                    return(
                      <div key={i} style={{display:"flex",flexDirection:"column",gap:6,background:isSel?"#EFEDFC":"#F8F7FE",borderRadius:12,padding:"10px 12px",border:`1.5px solid ${confianza==="baja"?"#E9C46A55":isSel?"#6D5BD033":"transparent"}`}}>
                        <div style={{display:"flex",alignItems:"center",gap:10}}>
                          <div style={{flex:1}}>
                            <span style={{fontSize:13,fontWeight:700,color:"#1A1A1A"}}>{nombre}</span>
                            {confianza==="baja"&&<span style={{marginLeft:6,fontSize:9,background:"#E9C46A22",color:"#856404",padding:"1px 5px",borderRadius:4,fontWeight:600}}>?dudoso</span>}
                            {porcion&&<span style={{marginLeft:6,fontSize:10,color:"#888"}}>{porcion}</span>}
                          </div>
                          <button onClick={()=>{if(matchApp)toggle(matchApp);}} style={{padding:"5px 12px",borderRadius:10,border:"none",fontSize:11,fontWeight:800,cursor:"pointer",background:isSel?"#6D5BD0":"#eee",color:isSel?"#fff":"#888",transition:"all .15s"}}>
                            {isSel?"✓ Sí":"✗ No"}
                          </button>
                        </div>
                        {alternativa&&alternativa!=="null"&&alternativa.toLowerCase()!==nombre.toLowerCase()&&(
                          <button onClick={()=>swapToAlternative(i)} style={{alignSelf:"flex-start",fontSize:11,padding:"4px 10px",borderRadius:8,border:"1px solid #E9C46A",background:"#FFF8E1",color:"#856404",fontWeight:700,cursor:"pointer"}}>
                            🔄 ¿No es {nombre}? Era {alternativa}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {!photoConfirmed&&(
                  <div style={{marginTop:12,paddingTop:12,borderTop:"1px solid #F0F0F0"}}>
                    <div style={{fontSize:13,fontWeight:800,color:"#6D5BD0",marginBottom:8,textAlign:"center"}}>¿Es correcta esta información?</div>
                    {photoVoiceListening&&<div style={{fontSize:12,color:"#C1121F",fontWeight:700,textAlign:"center",marginBottom:8}}>🎤 Escuchando… di qué corregir y toca Detener</div>}
                    {photoVoiceBusy&&<div style={{fontSize:12,color:"#888",textAlign:"center",marginBottom:8}}>🤔 Aplicando tu corrección…</div>}
                    <div style={{display:"flex",gap:8}}>
                      {photoVoiceListening
                        ?<button onClick={stopPhotoVoice} style={{flex:1,padding:"12px",borderRadius:12,border:"none",background:"#C1121F",color:"#fff",fontSize:13,fontWeight:800,cursor:"pointer"}}>⏹️ Detener</button>
                        :<button onClick={startPhotoVoiceCorrection} disabled={photoVoiceBusy} style={{flex:1,padding:"12px",borderRadius:12,border:"2px solid #6D5BD0",background:"#fff",color:"#6D5BD0",fontSize:13,fontWeight:800,cursor:"pointer"}}>🎤 Corregir por voz</button>}
                      <button onClick={confirmPhotoAndSave} disabled={photoVoiceListening||photoVoiceBusy||saving} style={{flex:1,padding:"12px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#6D5BD0,#8B7BE8)",color:"#fff",fontSize:13,fontWeight:800,cursor:"pointer"}}>✓ Sí, guardar</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {photoResult&&(
              <div style={{marginTop:10,background:"#fff",borderRadius:16,padding:14,boxShadow:"0 4px 20px rgba(0,0,0,0.08)",borderLeft:`4px solid ${photoResult.semaforo==="verde"?"#2E9E5B":photoResult.semaforo==="rojo"?"#E76F51":"#E9C46A"}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <span style={{fontWeight:800,fontSize:13}}>{photoResult.semaforo==="verde"?"🟢":photoResult.semaforo==="rojo"?"🔴":"🟡"} Análisis IA</span>
                  {photoResult.calorias_aprox&&<span style={{fontSize:11,color:"#6D5BD0",background:"#EFEDFC",padding:"3px 8px",borderRadius:8,fontWeight:700}}>{photoResult.calorias_aprox}</span>}
                </div>
                <div style={{fontSize:12,color:"#555",lineHeight:1.6}}>{photoResult.recomendacion}</div>
              </div>
            )}
          </div>

          {/* Frecuentes */}
          {quickFoods.length>0&&(
            <div style={{background:"#fff",borderRadius:16,padding:14,marginBottom:12,boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
              <div style={{fontSize:11,color:"#6D5BD0",fontWeight:800,marginBottom:10,textTransform:"uppercase",letterSpacing:.5}}>⚡ Frecuentes</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {quickFoods.map(f=>(
                  <button key={f} onClick={()=>{if(!selected.includes(f))setSelected(p=>[...p,f]);}} style={{padding:"7px 14px",borderRadius:20,border:`2px solid ${selected.includes(f)?"#6D5BD0":"#EFEDFC"}`,background:selected.includes(f)?"#6D5BD0":"#F8F7FE",color:selected.includes(f)?"#fff":"#555",fontSize:12,cursor:"pointer",fontWeight:700,transition:"all .15s"}}>
                    {f}{selected.includes(f)?" ✓":""}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Categorías — estilo cards con emoji grande */}
          <div style={{marginBottom:12}}>
            <div style={{fontSize:12,color:"#6D5BD0",fontWeight:800,textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>Seleccionar alimentos</div>
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
            <div style={{background:"#fff",borderRadius:16,padding:14,marginBottom:10,boxShadow:"0 2px 12px rgba(0,0,0,0.06)",border:"2px solid #EFEDFC"}}>
              <div style={{fontSize:11,color:"#6D5BD0",fontWeight:800,marginBottom:8,textTransform:"uppercase",letterSpacing:.5}}>{selected.length+customFoods.length} seleccionados</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {selected.map(f=><span key={f} onClick={()=>toggle(f)} style={{fontSize:12,padding:"5px 12px",borderRadius:20,background:"#EFEDFC",color:"#6D5BD0",cursor:"pointer",fontWeight:700,border:"1.5px solid #8B7BE844"}}>{f} ✕</span>)}
                {customFoods.map((f,i)=><span key={`c${i}`} onClick={()=>setCustomFoods(p=>p.filter((_,j)=>j!==i))} style={{fontSize:12,padding:"5px 12px",borderRadius:20,background:"#FFE8D6",color:"#C44B00",cursor:"pointer",fontWeight:700,border:"1.5px solid #F4A26144"}}>{f} ✕</span>)}
              </div>
            </div>
          )}

          {/* Campo libre */}
          <div style={{background:"#fff",borderRadius:16,padding:14,marginBottom:10,boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
            <div style={{fontSize:11,color:"#888",fontWeight:700,marginBottom:8}}>➕ Agregar alimento no listado</div>
            <div style={{display:"flex",gap:8}}>
              <input value={customFood} onChange={e=>setCustomFood(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&customFood.trim()){setCustomFoods(p=>[...p,customFood.trim()]);setCustomFood("");}}} placeholder="Ej: ahuyama, mazorca, aguapanela..."
                style={{flex:1,padding:"10px 14px",borderRadius:12,border:"2px solid #EFEDFC",background:"#F8F7FE",color:"#1A1A1A",fontSize:13,outline:"none"}}/>
              <button onClick={()=>{if(customFood.trim()){setCustomFoods(p=>[...p,customFood.trim()]);setCustomFood("");}}} style={{padding:"10px 16px",borderRadius:12,border:"none",background:"#6D5BD0",color:"#fff",fontSize:16,fontWeight:800,cursor:"pointer"}}>+</button>
            </div>
          </div>

          {/* Analizar sin foto */}
          {(selected.length>0||customFoods.length>0)&&!photoPreview&&(
            <button onClick={async()=>{const all=[...selected,...customFoods];setAnalyzingText(true);setPhotoResult(null);try{const r=await analizarTexto(all,hp);setPhotoResult({ok:true,...r});}catch(_){}setAnalyzingText(false);}} disabled={analyzingText}
              style={{width:"100%",padding:13,borderRadius:14,border:"2px solid #8B7BE8",background:"#F0FBF4",color:"#6D5BD0",fontSize:13,fontWeight:800,cursor:"pointer",marginBottom:8,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
              🧠 {analyzingText?"Analizando...":"Analizar nutrición de lo seleccionado"}
            </button>
          )}

          {/* Resultado análisis texto */}
          {photoResult&&!photoPreview&&(
            <div style={{background:"#fff",borderRadius:16,padding:14,marginBottom:10,boxShadow:"0 4px 20px rgba(0,0,0,0.08)",borderLeft:`4px solid ${photoResult.semaforo==="verde"?"#2E9E5B":photoResult.semaforo==="rojo"?"#E76F51":"#E9C46A"}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <span style={{fontWeight:800,fontSize:13}}>{photoResult.semaforo==="verde"?"🟢":photoResult.semaforo==="rojo"?"🔴":"🟡"} Análisis Nutricional</span>
                {photoResult.calorias_aprox&&<span style={{fontSize:11,color:"#6D5BD0",background:"#EFEDFC",padding:"3px 8px",borderRadius:8,fontWeight:700}}>{photoResult.calorias_aprox}</span>}
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
          {idMsg&&<div style={{background:"#EFEDFC",borderRadius:14,padding:12,marginBottom:10,border:"1.5px solid #8B7BE844"}}><div style={{fontSize:13,color:"#6D5BD0",fontWeight:600,lineHeight:1.5}}>✨ {idMsg}</div></div>}

          {/* Botón guardar */}
          <button onClick={handleSave} disabled={saving} style={{width:"100%",padding:17,borderRadius:16,border:"none",background:saving?"#ccc":"linear-gradient(135deg,#4A3B9E,#6D5BD0)",color:"#fff",fontSize:16,fontWeight:900,cursor:saving?"not-allowed":"pointer",boxShadow:saving?"none":"0 6px 24px #6D5BD044",letterSpacing:.5}}>
            {saving?savedMsg||"Procesando...":"💾 Guardar en mi pestaña"}
          </button>
          {savedMsg&&!saving&&<div style={{marginTop:8,padding:12,borderRadius:14,textAlign:"center",fontSize:13,fontWeight:700,background:savedMsg.includes("✅")?"#EFEDFC":"#FFE5DE",color:savedMsg.includes("✅")?"#6D5BD0":"#E76F51"}}>{savedMsg}</div>}
        </div>
      )}

      {/* ══ TAB 1: SCORE ══════════════════════════════════════════ */}
      {(tab===1||tab===2||tab===3)&&(
        <div style={{padding:"14px 14px 0",display:"flex",gap:8}}>
          {[["📊","Score",1],["📅","Historial",2],["🏅","Logros",3]].map(([ic,lb,tb])=>(
            <button key={tb} onClick={()=>setTab(tb)} style={{flex:1,padding:"10px 4px",borderRadius:12,border:"none",background:tab===tb?"#6D5BD0":"#fff",color:tab===tb?"#fff":"#888",fontWeight:800,fontSize:12,cursor:"pointer",boxShadow:"0 2px 8px rgba(0,0,0,0.05)"}}>{ic} {lb}</button>
          ))}
        </div>
      )}
      {tab===1&&(
        <div style={{padding:"16px 14px"}}>
          <div style={{marginBottom:18}}>
            <button onClick={analizarSemana} disabled={weeklyBusy} style={{width:"100%",padding:"15px",borderRadius:14,border:"none",background:weeklyBusy?"#ccc":"linear-gradient(135deg,#6D5BD0,#8B7BE8)",color:"#fff",fontSize:15,fontWeight:800,cursor:"pointer",boxShadow:"0 4px 16px #6D5BD033"}}>{weeklyBusy?"🔍 Analizando tu semana…":"✨ Mi semana: energía y vitalidad"}</button>
            {weeklyAI&&(
              <div style={{background:"#fff",borderRadius:16,padding:18,marginTop:12,boxShadow:"0 4px 20px rgba(0,0,0,0.08)"}}>
                {typeof weeklyAI.energia==="number"&&(
                  <div style={{textAlign:"center",marginBottom:12}}>
                    <span style={{fontSize:36,fontWeight:900,color:"#6D5BD0"}}>{weeklyAI.energia}</span>
                    <span style={{fontSize:14,color:"#aaa"}}>/100 energía</span>
                  </div>
                )}
                <div style={{fontSize:13,color:"#444",lineHeight:1.6,marginBottom:12}}>{weeklyAI.resumen}</div>
                <div style={{background:"#EAF3FB",borderRadius:12,padding:"11px 13px",marginBottom:12,fontSize:12,color:"#2C5374",lineHeight:1.5}}>🧠💪 Tu salud <b>mental</b>, la de tu <b>cuerpo</b> y la <b>metabólica</b> van juntas: lo que comes, cómo duermes y cómo te mueves se afectan entre sí. Por eso VitalTrack los mira en conjunto.</div>
                {(weeklyAI.habitos||[]).map((h,i)=>(
                  <div key={i} style={{background:"#F8F7FE",borderRadius:12,padding:"10px 12px",marginBottom:8}}>
                    <div style={{fontSize:11,fontWeight:800,color:"#6D5BD0",marginBottom:3}}>{h.area}</div>
                    <div style={{fontSize:13,color:"#555",lineHeight:1.5}}>{h.cambio}</div>
                  </div>
                ))}
                {weeklyAI.mensaje&&<div style={{marginTop:8,textAlign:"center",fontSize:13,fontWeight:800,color:"#6D5BD0"}}>💚 {weeklyAI.mensaje}</div>}
                <div style={{marginTop:10,fontSize:10,color:"#aaa",textAlign:"center"}}>Sugerencias de bienestar, no consejo médico.</div>
              </div>
            )}
          </div>
          <div style={{textAlign:"center",marginBottom:20}}>
            <div style={{fontSize:12,color:"#6D5BD0",fontWeight:800,marginBottom:8,textTransform:"uppercase",letterSpacing:.5}}>{eatScore?`Qué tan bien te alimentas · ${eatScore.n} comida${eatScore.n!==1?"s":""}`:"Selecciona alimentos para ver tu score"}</div>
            <div style={{position:"relative",width:150,height:150,margin:"0 auto 14px"}}>
              <svg width="150" height="150" style={{transform:"rotate(-90deg)"}}>
                <circle cx="75" cy="75" r="64" fill="none" stroke="#EFEDFC" strokeWidth="14"/>
                <circle cx="75" cy="75" r="64" fill="none" stroke={scoreColor(scoreView.total)} strokeWidth="14"
                  strokeDasharray={`${2*Math.PI*64}`} strokeDashoffset={`${2*Math.PI*64*(1-scoreView.total/100)}`}
                  strokeLinecap="round" style={{transition:"stroke-dashoffset 1s ease"}}/>
              </svg>
              <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",textAlign:"center"}}>
                <div style={{fontSize:36,fontWeight:900,color:scoreColor(scoreView.total)}}>{scoreView.total}</div>
                <div style={{fontSize:10,color:"#aaa",letterSpacing:1,textTransform:"uppercase"}}>Score</div>
              </div>
            </div>
            <div style={{color:"#555",fontSize:14,fontWeight:600}}>{scoreView.total>=70?"🌟 ¡Excelente alimentación!":scoreView.total>=40?"💪 Puedes mejorar":"🥺 Necesitas más variedad"}</div>
          </div>

          {[{label:"🛡️ Inmunidad",key:"immunity"},{label:"⚡ Energía",key:"energy"},{label:"🧠 Concentración",key:"focus"},{label:"✨ Vitalidad",key:"vitality"}].map(({label,key})=>(
            <div key={key} style={{background:"#fff",borderRadius:16,padding:"14px 16px",marginBottom:8,boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                <span style={{fontSize:14,fontWeight:700}}>{label}</span>
                <span style={{fontSize:15,fontWeight:900,color:scoreColor(scoreView[key]),background:scoreBg(scoreView[key]),padding:"2px 10px",borderRadius:10}}>{scoreView[key]}%</span>
              </div>
              <div style={{background:"#F0F0F0",borderRadius:8,height:10,overflow:"hidden"}}>
                <div style={{width:`${scoreView[key]}%`,height:10,borderRadius:8,background:scoreColor(scoreView[key]),transition:"width 1s ease"}}/>
              </div>
            </div>
          ))}

          {eatScore&&(()=>{
            const dims=[["immunity","🛡️ Inmunidad"],["energy","⚡ Energía"],["focus","🧠 Concentración"],["vitality","✨ Vitalidad"]];
            const TIPS={immunity:"Suma frutas y verduras de colores (cítricos, brócoli, zanahoria, espinaca).",energy:"Prefiere granos integrales y baja el azúcar y los fritos para energía estable.",focus:"Incluye proteína, pescado o frutos secos y mantente hidratado.",vitality:"Varía más el plato con verduras de hoja y menos ultraprocesados."};
            const weak=dims.slice().sort((a,b)=>eatScore[a[0]]-eatScore[b[0]]).slice(0,2);
            return(
              <div style={{background:"#fff",borderRadius:16,padding:16,marginTop:8,marginBottom:8,boxShadow:"0 2px 12px rgba(0,0,0,0.06)",borderLeft:"5px solid #E9A23B"}}>
                <div style={{fontSize:13,fontWeight:800,color:"#B26A00",marginBottom:10}}>📈 Para mejorar tu alimentación</div>
                {weak.map(([k,label])=>(
                  <div key={k} style={{background:"#FFF8EC",borderRadius:12,padding:"10px 12px",marginBottom:8}}>
                    <div style={{fontSize:12,fontWeight:800,color:"#856404",marginBottom:3}}>{label} · {eatScore[k]}%</div>
                    <div style={{fontSize:13,color:"#6b5a2e",lineHeight:1.5}}>{TIPS[k]}</div>
                  </div>
                ))}
                <div style={{fontSize:11,color:"#aaa",marginTop:2}}>Para un plan completo, usa "✨ Mi semana" arriba.</div>
              </div>
            );
          })()}

          {hp&&(
            <div style={{background:"#fff",borderRadius:16,padding:16,marginTop:8,boxShadow:"0 2px 12px rgba(0,0,0,0.06)",border:"2px solid #EFEDFC"}}>
              <div style={{fontSize:12,color:"#6D5BD0",fontWeight:800,marginBottom:10,textTransform:"uppercase",letterSpacing:.5}}>Tu perfil activo</div>
              {[{icon:"🎂",l:"Edad",v:`${hp.edad} años`},{icon:"🏃",l:"Actividad",v:hp.ejercicio},{icon:"💊",l:"Condición",v:hp.enfermedad}].map(({icon,l,v})=>(
                <div key={l} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:"#F8F7FE",borderRadius:12,marginBottom:6}}>
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
                    <span style={{fontSize:11,color:"#888",background:"#F8F7FE",padding:"3px 8px",borderRadius:8,fontWeight:600}}>{typeof r.fecha==="string"?r.fecha.split("T")[0]:r.fecha}</span>
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
                    <div style={{background:"#EFEDFC",borderRadius:12,padding:"10px 12px",border:"1px solid #8B7BE833"}}>
                      <div style={{fontSize:10,color:"#6D5BD0",fontWeight:800,marginBottom:3,textTransform:"uppercase",letterSpacing:.5}}>💡 Recomendación IA</div>
                      <div style={{fontSize:12,color:"#6D5BD0",lineHeight:1.5}}>{r.notas}</div>
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

          <div style={{background:"#EFEDFC",borderRadius:6,height:10,marginBottom:16,overflow:"hidden"}}>
            <div style={{width:`${(badges.length/BADGES.length)*100}%`,height:10,borderRadius:6,background:"linear-gradient(90deg,#6D5BD0,#8B7BE8)",transition:"width .5s"}}/>
          </div>

          {/* Nivel card */}
          <div style={{background:"linear-gradient(135deg,#4A3B9E,#6D5BD0)",borderRadius:20,padding:20,marginBottom:16,textAlign:"center",boxShadow:"0 6px 24px #6D5BD044"}}>
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
                <div key={b.id} style={{background:"#fff",borderRadius:16,padding:16,textAlign:"center",boxShadow:"0 2px 12px rgba(0,0,0,0.06)",opacity:earned?1:.5,border:`2px solid ${earned?"#8B7BE844":"transparent"}`,transition:"all .3s"}}>
                  <div style={{fontSize:32,marginBottom:8,filter:earned?"none":"grayscale(1)"}}>{b.icon}</div>
                  <div style={{fontSize:13,fontWeight:800,color:earned?"#1A1A1A":"#aaa"}}>{b.nombre}</div>
                  <div style={{fontSize:10,color:"#aaa",marginTop:3}}>{b.desc}</div>
                  {earned&&<div style={{marginTop:8,fontSize:10,color:"#6D5BD0",fontWeight:800,background:"#EFEDFC",padding:"3px 10px",borderRadius:20,display:"inline-block"}}>✓ Obtenida</div>}
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
              <span style={{fontSize:14,fontWeight:900,color:waterPct>=100?"#6D5BD0":"#1A6FA8"}}>{water}/{WATER_GOAL}</span>
            </div>
            <div style={{background:"#EFEDFC",borderRadius:10,height:14,marginBottom:16,overflow:"hidden"}}>
              <div style={{width:`${waterPct}%`,height:14,borderRadius:10,background:"linear-gradient(90deg,#1A6FA8,#8B7BE8)",transition:"width .5s"}}/>
            </div>
            <div style={{display:"flex",justifyContent:"center",flexWrap:"wrap",gap:8,marginBottom:16}}>
              {Array.from({length:WATER_GOAL}).map((_,i)=>(
                <div key={i} onClick={()=>changeWater(i<water?-(water-i):i-water+1)} style={{width:48,height:58,borderRadius:12,background:i<water?"linear-gradient(180deg,#1A6FA8,#0D47A1)":"#F0F0F0",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,cursor:"pointer",transition:"all .2s",transform:i<water?"scale(1.05)":"scale(1)",boxShadow:i<water?"0 4px 12px #1A6FA844":"none"}}>{i<water?"💧":"○"}</div>
              ))}
            </div>
            <div style={{display:"flex",gap:12,justifyContent:"center"}}>
              <button onClick={()=>changeWater(-1)} style={{width:56,height:56,borderRadius:"50%",border:"2px solid #E8E8E8",background:"#F8F7FE",color:"#333",fontSize:24,cursor:"pointer",fontWeight:700}}>−</button>
              <button onClick={()=>changeWater(1)} style={{width:56,height:56,borderRadius:"50%",border:"none",background:"linear-gradient(135deg,#1A6FA8,#8B7BE8)",color:"#fff",fontSize:24,cursor:"pointer",fontWeight:700,boxShadow:"0 4px 16px #1A6FA844"}}>+</button>
            </div>
            {water>=WATER_GOAL&&<div style={{marginTop:14,color:"#6D5BD0",fontSize:14,fontWeight:800,textAlign:"center",background:"#EFEDFC",padding:"10px",borderRadius:12}}>🎉 ¡Meta de agua cumplida hoy!</div>}
          </div>

          <div style={{background:"#fff",borderRadius:16,padding:16,boxShadow:"0 2px 12px rgba(0,0,0,0.06)",border:"2px solid #EFEDFC"}}>
            <div style={{fontSize:12,color:"#6D5BD0",fontWeight:800,marginBottom:6}}>💡 Habit Stacking</div>
            <div style={{fontSize:13,color:"#555",lineHeight:1.6}}>"Después de servirme mi café de la mañana, registraré mi primer vaso de agua en VitalTrack."</div>
          </div>
        </div>
      )}

      {tab===5&&(()=>{
        const ss=sleepStats();
        const dur=calcHours(bedtime,waketime);
        const chart=sleepLog.slice(0,7).slice().reverse();
        const semColor=s=>s==="verde"?"#2E9E5B":s==="rojo"?"#C1121F":"#E9A23B";
        return(
        <div style={{padding:"16px 14px 90px"}}>
          <div style={{fontSize:18,fontWeight:900,marginBottom:4}}>😴 Sueño</div>
          <div style={{fontSize:13,color:"#888",marginBottom:16}}>Registra tu noche y mira tus patrones. Meta: 7–9 h.</div>

          <div style={{background:"#fff",borderRadius:16,padding:16,marginBottom:14,boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
            <div style={{fontSize:14,fontWeight:900,color:"#2D3561",marginBottom:2}}>🎯 Mi rutina de sueño</div>
            <div style={{fontSize:12,color:"#888",marginBottom:12}}>Fija tu horario objetivo. Acostarte a la misma hora es lo que más mejora el descanso.</div>
            <div style={{display:"flex",gap:10,marginBottom:10}}>
              <div style={{flex:1}}><div style={{fontSize:11,color:"#777",marginBottom:4}}>Acostarte</div><input type="time" value={routineBed} onChange={e=>setRoutineBed(e.target.value)} style={{width:"100%",padding:"9px",borderRadius:10,border:"1.5px solid #E0E0E0",fontSize:15,fontWeight:700,color:"#2D3561",boxSizing:"border-box"}}/></div>
              <div style={{flex:1}}><div style={{fontSize:11,color:"#777",marginBottom:4}}>Despertar</div><input type="time" value={routineWake} onChange={e=>setRoutineWake(e.target.value)} style={{width:"100%",padding:"9px",borderRadius:10,border:"1.5px solid #E0E0E0",fontSize:15,fontWeight:700,color:"#2D3561",boxSizing:"border-box"}}/></div>
            </div>
            <div style={{textAlign:"center",fontSize:12,color:"#4A5899",fontWeight:700,marginBottom:10}}>Meta: {routineHours()} h de sueño</div>
            {sleepLog[0]&&<div style={{background:sleepLog[0].hours>=routineHours()-0.5?"#EFEDFC":"#FBF3E6",borderRadius:10,padding:"9px 11px",marginBottom:10,fontSize:12,color:sleepLog[0].hours>=routineHours()-0.5?"#6D5BD0":"#7A5200",lineHeight:1.4}}>{sleepLog[0].hours>=routineHours()-0.5?`✓ Anoche cumpliste tu rutina (${sleepLog[0].hours} h). 🗳️ Un voto a quien descansa bien.`:`Anoche dormiste ${sleepLog[0].hours} h, te faltaron ${Math.max(0,Math.round((routineHours()-sleepLog[0].hours)*10)/10)} h para tu meta.`}</div>}
            <button onClick={saveRoutine} style={{width:"100%",padding:"11px",borderRadius:12,border:"none",background:"#4A5899",color:"#fff",fontSize:14,fontWeight:800,cursor:"pointer"}}>Guardar mi rutina</button>
          </div>

          <div style={{background:"#fff",borderRadius:16,padding:16,marginBottom:14,boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
            <div style={{fontSize:14,fontWeight:900,color:"#2D3561",marginBottom:2}}>🎵 Sonidos para dormir</div>
            <div style={{fontSize:12,color:"#888",marginBottom:12}}>Sonidos relajantes con temporizador para conciliar el sueño.</div>
            <div style={{display:"flex",gap:8,marginBottom:10}}>
              {[{k:"lluvia",l:"🌧️ Lluvia"},{k:"marron",l:"🌊 Olas graves"},{k:"blanco",l:"💨 Ruido blanco"}].map(s=>(
                <button key={s.k} onClick={()=>startSound(s.k)} style={{flex:1,padding:"12px 6px",borderRadius:12,border:"2px solid "+(sound&&sound.type===s.k?"#4A5899":"#E0E0E0"),background:sound&&sound.type===s.k?"#4A5899":"#F8F8FC",color:sound&&sound.type===s.k?"#fff":"#2D3561",fontSize:12,fontWeight:800,cursor:"pointer"}}>{s.l}</button>
              ))}
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:sound?10:0}}>
              <span style={{fontSize:11,color:"#777",fontWeight:700}}>Temporizador:</span>
              {[15,30,60].map(t=>(
                <button key={t} onClick={()=>setSoundTimer(t)} style={{padding:"5px 12px",borderRadius:16,border:"1.5px solid "+(soundTimer===t?"#4A5899":"#E0E0E0"),background:soundTimer===t?"#EEEDFB":"#fff",color:"#4A5899",fontSize:12,fontWeight:700,cursor:"pointer"}}>{t} min</button>
              ))}
            </div>
            {sound&&<button onClick={stopSound} style={{width:"100%",padding:"10px",borderRadius:12,border:"none",background:"#C1121F",color:"#fff",fontSize:13,fontWeight:800,cursor:"pointer"}}>⏹️ Detener sonido</button>}
          </div>

          {ss&&(
            <div style={{background:"linear-gradient(135deg,#2D3561,#4A5899)",borderRadius:20,padding:20,marginBottom:14,color:"#fff",boxShadow:"0 4px 20px rgba(45,53,97,.3)"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div>
                  <div style={{fontSize:11,opacity:.8,fontWeight:700,letterSpacing:.5}}>SCORE DE SUEÑO ({ss.n} noches)</div>
                  <div style={{fontSize:44,fontWeight:900,lineHeight:1.1}}>{ss.score}<span style={{fontSize:18,opacity:.7}}>/100</span></div>
                </div>
                <div style={{fontSize:46}}>{ss.score>=80?"🌙":ss.score>=60?"😌":"😪"}</div>
              </div>
              <div style={{display:"flex",gap:10,marginTop:14}}>
                <div style={{flex:1,background:"rgba(255,255,255,.12)",borderRadius:12,padding:"8px 10px"}}><div style={{fontSize:18,fontWeight:900}}>{ss.avg}h</div><div style={{fontSize:10,opacity:.8}}>Promedio</div></div>
                <div style={{flex:1,background:"rgba(255,255,255,.12)",borderRadius:12,padding:"8px 10px"}}><div style={{fontSize:18,fontWeight:900}}>{ss.debt}h</div><div style={{fontSize:10,opacity:.8}}>Deuda</div></div>
                <div style={{flex:1,background:"rgba(255,255,255,.12)",borderRadius:12,padding:"8px 10px"}}><div style={{fontSize:14,fontWeight:900}}>{ss.consLabel}</div><div style={{fontSize:10,opacity:.8}}>Constancia</div></div>
              </div>
            </div>
          )}

          {chart.length>0&&(
            <div style={{background:"#fff",borderRadius:16,padding:16,marginBottom:14,boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
              <div style={{fontSize:12,fontWeight:800,color:"#2D3561",marginBottom:12}}>Últimas noches</div>
              <div style={{display:"flex",alignItems:"flex-end",gap:6,height:96}}>
                {chart.map((n,i)=>(
                  <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                    <div style={{fontSize:9,fontWeight:800,color:"#4A5899"}}>{n.hours}</div>
                    <div style={{width:"70%",height:`${Math.min(100,(n.hours/10)*100)}%`,minHeight:4,borderRadius:6,background:n.hours>=7?"linear-gradient(180deg,#4A5899,#2D3561)":"linear-gradient(180deg,#E9A23B,#C97B1E)"}}/>
                    <div style={{fontSize:8,color:"#aaa"}}>{n.date.split("/").slice(0,2).join("/")}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{background:"#fff",borderRadius:20,padding:18,marginBottom:14,boxShadow:"0 4px 20px rgba(0,0,0,0.08)"}}>
            <div style={{fontSize:14,fontWeight:900,marginBottom:14,color:"#2D3561"}}>📝 Registrar la noche de hoy</div>
            <div style={{display:"flex",gap:10,marginBottom:14}}>
              <div style={{flex:1}}>
                <div style={{fontSize:11,color:"#888",fontWeight:700,marginBottom:5}}>🛏️ Me dormí</div>
                <input type="time" value={bedtime} onChange={e=>setBedtime(e.target.value)} style={{width:"100%",padding:"10px",borderRadius:12,border:"2px solid #E8E8E8",fontSize:16,fontWeight:700,color:"#2D3561",boxSizing:"border-box"}}/>
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:11,color:"#888",fontWeight:700,marginBottom:5}}>☀️ Desperté</div>
                <input type="time" value={waketime} onChange={e=>setWaketime(e.target.value)} style={{width:"100%",padding:"10px",borderRadius:12,border:"2px solid #E8E8E8",fontSize:16,fontWeight:700,color:"#2D3561",boxSizing:"border-box"}}/>
              </div>
            </div>
            <div style={{textAlign:"center",fontSize:13,color:"#4A5899",fontWeight:800,marginBottom:14}}>⏱️ {dur} horas de sueño</div>

            <div style={{fontSize:11,color:"#888",fontWeight:700,marginBottom:6}}>⭐ ¿Cómo descansaste?</div>
            <div style={{display:"flex",gap:8,marginBottom:14}}>
              {[1,2,3,4,5].map(q=>(
                <button key={q} onClick={()=>setSleepQuality(q)} style={{flex:1,padding:"10px 0",borderRadius:12,border:"none",cursor:"pointer",fontSize:20,background:q<=sleepQuality?"#4A5899":"#F0F0F0",transition:"all .15s"}}>{q<=sleepQuality?"⭐":"☆"}</button>
              ))}
            </div>

            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
              <div style={{fontSize:11,color:"#888",fontWeight:700}}>😣 Veces que desperté</div>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <button onClick={()=>setAwakenings(Math.max(0,awakenings-1))} style={{width:36,height:36,borderRadius:"50%",border:"2px solid #E8E8E8",background:"#F8F7FE",fontSize:18,cursor:"pointer",fontWeight:700}}>−</button>
                <span style={{fontSize:18,fontWeight:900,minWidth:20,textAlign:"center"}}>{awakenings}</span>
                <button onClick={()=>setAwakenings(Math.min(9,awakenings+1))} style={{width:36,height:36,borderRadius:"50%",border:"none",background:"#4A5899",color:"#fff",fontSize:18,cursor:"pointer",fontWeight:700}}>+</button>
              </div>
            </div>

            <input value={sleepNote} onChange={e=>setSleepNote(e.target.value)} placeholder="Nota (café tarde, estrés, pantalla…)" style={{width:"100%",padding:"10px 12px",borderRadius:12,border:"2px solid #E8E8E8",fontSize:13,marginBottom:14,boxSizing:"border-box"}}/>

            <button onClick={saveSleep} style={{width:"100%",padding:"14px",borderRadius:14,border:"none",background:"linear-gradient(135deg,#2D3561,#4A5899)",color:"#fff",fontSize:15,fontWeight:800,cursor:"pointer",boxShadow:"0 4px 16px #2D356144"}}>Guardar noche</button>
            {sleepMsg&&<div style={{marginTop:10,textAlign:"center",fontSize:12,fontWeight:700,color:"#2D3561"}}>{sleepMsg}</div>}
          </div>

          <div style={{background:"#fff",borderRadius:16,padding:16,marginBottom:14,boxShadow:"0 2px 12px rgba(0,0,0,0.06)",border:"2px dashed #C9CEE8"}}>
            <div style={{fontSize:13,fontWeight:800,color:"#2D3561",marginBottom:4}}>🌙 Medir la noche (movimiento + micrófono)</div>
            <div style={{fontSize:11,color:"#999",lineHeight:1.5,marginBottom:12}}>Deja el celular en el colchón, enchufado y con la app abierta. Usa movimiento y sonido para estimar tus fases (profundo/ligero/despierto) y ronquidos. Es una estimación, no grado clínico; REM real, oxígeno y pulso necesitan un wearable.</div>
            {!measuring&&(
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"#F4F4FB",borderRadius:12,padding:"10px 12px",marginBottom:10}}>
                <div onClick={()=>setSmartAlarm(!smartAlarm)} style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}>
                  <div style={{width:38,height:22,borderRadius:11,background:smartAlarm?"#4A5899":"#ccc",position:"relative",transition:"all .2s"}}><div style={{width:18,height:18,borderRadius:"50%",background:"#fff",position:"absolute",top:2,left:smartAlarm?18:2,transition:"all .2s"}}/></div>
                  <span style={{fontSize:13,fontWeight:700,color:"#2D3561"}}>⏰ Despertador inteligente</span>
                </div>
                {smartAlarm&&<input type="time" value={alarmTime} onChange={e=>setAlarmTime(e.target.value)} style={{padding:"4px 8px",borderRadius:8,border:"1.5px solid #C9CEE8",fontSize:14,fontWeight:700,color:"#2D3561"}}/>}
              </div>
            )}
            {smartAlarm&&!measuring&&<div style={{fontSize:10,color:"#999",marginBottom:10,lineHeight:1.4}}>Te despertará en una fase ligera hasta 30 min antes de las {alarmTime} (o exacto a esa hora). Sube el volumen del celular.</div>}
            {!measuring
              ? <button onClick={startMeasure} style={{width:"100%",padding:"12px",borderRadius:12,border:"2px solid #4A5899",background:"#fff",color:"#2D3561",fontSize:14,fontWeight:800,cursor:"pointer"}}>▶️ Empezar a medir</button>
              : <div style={{textAlign:"center"}}>
                  <div style={{fontSize:13,color:"#4A5899",fontWeight:800,marginBottom:4}}>🟢 Midiendo… {moveCount} movimientos</div>
                  <div style={{fontSize:11,color:"#888",marginBottom:8}}>🔊 {snoreCount} ruidos detectados{smartAlarm?` · ⏰ ${alarmTime}`:""}</div>
                  {micActive
                    ?<div style={{marginBottom:10}}>
                       <div style={{fontSize:10,color:"#999",marginBottom:4}}>Nivel de sonido (habla o ronca para probarlo)</div>
                       <div style={{background:"#EEE",borderRadius:8,height:14,overflow:"hidden"}}>
                         <div style={{width:`${Math.min(100,soundLevel*1.6)}%`,height:14,borderRadius:8,background:soundLevel>30?"#C1121F":soundLevel>15?"#E9A23B":"#8B7BE8",transition:"width .12s"}}/>
                       </div>
                     </div>
                    :<div style={{fontSize:11,color:"#C1121F",fontWeight:700,marginBottom:10}}>🔇 Micrófono no activo — acepta el permiso para detectar ronquidos</div>}
                  <button onClick={stopMeasure} style={{width:"100%",padding:"12px",borderRadius:12,border:"none",background:"#C1121F",color:"#fff",fontSize:14,fontWeight:800,cursor:"pointer"}}>⏹️ Desperté / Detener</button>
                </div>}
          </div>

          {(()=>{
            const sd=measuredData&&measuredData.stages?measuredData:(sleepLog[0]&&sleepLog[0].stages?sleepLog[0]:null);
            if(!sd)return null;
            if(sd.tooShort)return(
              <div style={{background:"#fff",borderRadius:16,padding:16,marginBottom:14,boxShadow:"0 4px 20px rgba(0,0,0,0.08)"}}>
                <div style={{fontSize:13,fontWeight:800,color:"#2D3561",marginBottom:8}}>🌙 Fases estimadas</div>
                <div style={{background:"#FFF8EC",border:"1.5px solid #E9A23B",borderRadius:12,padding:"12px 14px",fontSize:13,color:"#7A5200",lineHeight:1.5}}>⏱️ La medición fue muy corta ({(sd.mins/60).toFixed(1)} h) para estimar fases de sueño con sentido. Mide al menos ~30 min (idealmente toda la noche). Eso sí, ya detecté <b>{sd.snores} ruidos/ronquidos</b>.</div>
              </div>
            );
            const st=sd.stages,W=300,H=70,step=st.length>1?W/(st.length-1):W,yOf=s=>s===0?10:s===1?32:54;
            const pts=st.map((s,i)=>`${(i*step).toFixed(1)},${yOf(s)}`).join(" ");
            return(
              <div style={{background:"#fff",borderRadius:16,padding:16,marginBottom:14,boxShadow:"0 4px 20px rgba(0,0,0,0.08)"}}>
                <div style={{fontSize:13,fontWeight:800,color:"#2D3561",marginBottom:10}}>🌙 Fases estimadas de la noche</div>
                <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:80}} preserveAspectRatio="none">
                  {[10,32,54].map((y,i)=><line key={i} x1="0" y1={y} x2={W} y2={y} stroke="#F0F0F5" strokeWidth="1"/>)}
                  <polyline points={pts} fill="none" stroke="#4A5899" strokeWidth="2.5" strokeLinejoin="round"/>
                </svg>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:"#aaa",marginBottom:12}}><span>Despierto</span><span>Ligero</span><span>Profundo</span></div>
                <div style={{display:"flex",gap:8}}>
                  <div style={{flex:1,textAlign:"center",background:"#FBF3E6",borderRadius:12,padding:"8px"}}><div style={{fontSize:16,fontWeight:900,color:"#E9A23B"}}>{sd.pctAwake}%</div><div style={{fontSize:9,color:"#999"}}>Despierto</div></div>
                  <div style={{flex:1,textAlign:"center",background:"#EEEDFB",borderRadius:12,padding:"8px"}}><div style={{fontSize:16,fontWeight:900,color:"#6C63FF"}}>{sd.pctLight}%</div><div style={{fontSize:9,color:"#999"}}>Ligero</div></div>
                  <div style={{flex:1,textAlign:"center",background:"#E6E8F2",borderRadius:12,padding:"8px"}}><div style={{fontSize:16,fontWeight:900,color:"#2D3561"}}>{sd.pctDeep}%</div><div style={{fontSize:9,color:"#999"}}>Profundo</div></div>
                  <div style={{flex:1,textAlign:"center",background:"#F0F4F1",borderRadius:12,padding:"8px"}}><div style={{fontSize:16,fontWeight:900,color:"#6D5BD0"}}>{sd.snores}</div><div style={{fontSize:9,color:"#999"}}>Ruidos</div></div>
                </div>
                <div style={{marginTop:10,fontSize:10,color:"#aaa",textAlign:"center",lineHeight:1.4}}>Estimación por movimiento y sonido (el profundo se infiere de las rachas largas sin moverte). No es un estudio de sueño clínico.</div>
              </div>
            );
          })()}

          <button onClick={analyzeNight} disabled={nightAnalyzing} style={{width:"100%",padding:"15px",borderRadius:14,border:"none",background:nightAnalyzing?"#ccc":"linear-gradient(135deg,#2D3561,#6C63FF)",color:"#fff",fontSize:15,fontWeight:800,cursor:"pointer",marginBottom:12,boxShadow:"0 4px 16px #2D356133"}}>{nightAnalyzing?"🔍 Analizando tu noche…":"📋 Resumen de anoche con IA"}</button>

          {nightAI&&(
            <div style={{background:"#fff",borderRadius:16,padding:18,marginBottom:14,boxShadow:"0 4px 20px rgba(0,0,0,0.08)",borderLeft:`5px solid ${semColor(nightAI.semaforo)}`}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                <span style={{fontSize:20}}>{nightAI.semaforo==="verde"?"😴":nightAI.semaforo==="rojo"?"😪":"😌"}</span>
                <span style={{fontSize:16,fontWeight:900,color:semColor(nightAI.semaforo)}}>{nightAI.titulo}</span>
              </div>
              {nightAI.resena&&<div style={{fontSize:14,fontStyle:"italic",color:"#555",marginBottom:10,paddingLeft:2}}>“{nightAI.resena}”</div>}
              <div style={{fontSize:13,color:"#444",lineHeight:1.6,marginBottom:12}}>{nightAI.resumen}</div>
              <div style={{background:"#F4F4FB",borderRadius:12,padding:"10px 12px",fontSize:13,color:"#3A3A5C",lineHeight:1.5}}>💡 {nightAI.recomendacion}</div>
              {nightAI.comida_sueno&&nightAI.comida_sueno!=="null"&&(
                <div style={{marginTop:10,background:"#EFEDFC",borderRadius:12,padding:"10px 12px",fontSize:13,color:"#1B5E3A",lineHeight:1.5}}>🍽️↔😴 {nightAI.comida_sueno}</div>
              )}
              {nightAI.ver_medico&&(
                <div style={{marginTop:12,background:"#FFF4E5",border:"1.5px solid #E9A23B",borderRadius:12,padding:"12px 14px"}}>
                  <div style={{fontSize:13,fontWeight:800,color:"#B26A00",marginBottom:4}}>🩺 Quizás valga la pena consultar a un profesional</div>
                  <div style={{fontSize:12,color:"#7A5200",lineHeight:1.5}}>{nightAI.motivo_medico}</div>
                </div>
              )}
              <div style={{marginTop:12,fontSize:10,color:"#aaa",lineHeight:1.4,textAlign:"center"}}>Esto es una estimación de bienestar, no un diagnóstico médico.</div>
            </div>
          )}

          <button onClick={analyzeSleep} disabled={sleepAnalyzing} style={{width:"100%",padding:"13px",borderRadius:14,border:"2px solid #C9CEE8",background:"#fff",color:sleepAnalyzing?"#aaa":"#4A5899",fontSize:14,fontWeight:800,cursor:"pointer",marginBottom:14}}>{sleepAnalyzing?"🔍 Analizando…":"📈 Ver tendencia de 7 noches"}</button>

          {sleepAI&&(
            <div style={{background:"#fff",borderRadius:16,padding:16,marginBottom:14,boxShadow:"0 4px 20px rgba(0,0,0,0.08)",borderLeft:`5px solid ${semColor(sleepAI.semaforo)}`}}>
              <div style={{fontSize:13,fontWeight:800,color:semColor(sleepAI.semaforo),marginBottom:8}}>{sleepAI.semaforo==="verde"?"🟢":sleepAI.semaforo==="rojo"?"🔴":"🟡"} Análisis de tu sueño</div>
              <div style={{fontSize:13,color:"#444",lineHeight:1.6,marginBottom:12}}>{sleepAI.resumen}</div>
              {(sleepAI.consejos||[]).map((c,i)=>(
                <div key={i} style={{display:"flex",gap:8,marginBottom:6,fontSize:13,color:"#555",lineHeight:1.5}}><span>💡</span><span>{c}</span></div>
              ))}
            </div>
          )}

          {sleepLog.length>0&&(
            <div style={{background:"#fff",borderRadius:16,padding:16,boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
              <div style={{fontSize:12,fontWeight:800,color:"#2D3561",marginBottom:10}}>Historial</div>
              {sleepLog.slice(0,10).map((n,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 0",borderBottom:i<Math.min(9,sleepLog.length-1)?"1px solid #F2F2F2":"none"}}>
                  <div><div style={{fontSize:13,fontWeight:700}}>{n.date}</div><div style={{fontSize:10,color:"#aaa"}}>{n.bed} → {n.wake}{n.awakenings?` · ${n.awakenings} despertares`:""}</div></div>
                  <div style={{textAlign:"right"}}><span style={{fontSize:15,fontWeight:900,color:n.hours>=7?"#6D5BD0":"#E9A23B"}}>{n.hours}h</span><div style={{fontSize:11}}>{"⭐".repeat(n.quality||0)}</div></div>
                </div>
              ))}
            </div>
          )}
        </div>
        );
      })()}

      {tab===6&&(()=>{
        const WHO=150,wm=weekMinutes(),wpct=Math.min(100,Math.round(wm/WHO*100)),wd=weekDaysActive();
        const intColor=v=>v==="alta"?"#C1121F":v==="baja"?"#6D5BD0":"#E76F51";
        const chip=(val,cur,set)=>({padding:"7px 12px",borderRadius:10,border:"none",cursor:"pointer",fontSize:12,fontWeight:700,background:val===cur?"#E76F51":"#F0F0F0",color:val===cur?"#fff":"#666"});
        return(
        <div style={{padding:"16px 14px 90px"}}>
          <div style={{fontSize:18,fontWeight:900,marginBottom:4}}>💪 Ejercicio</div>
          <div style={{fontSize:13,color:"#888",marginBottom:16}}>Meta OMS: 150 min de actividad moderada por semana.</div>

          <div style={{background:"linear-gradient(135deg,#E76F51,#F4A261)",borderRadius:20,padding:20,marginBottom:14,color:"#fff",boxShadow:"0 4px 20px rgba(231,111,81,.3)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
              <span style={{fontSize:12,fontWeight:700,opacity:.9}}>ESTA SEMANA</span>
              <span style={{fontSize:13,fontWeight:800}}>{wm}/{WHO} min</span>
            </div>
            <div style={{background:"rgba(255,255,255,.25)",borderRadius:10,height:14,margin:"10px 0",overflow:"hidden"}}>
              <div style={{width:`${wpct}%`,height:14,borderRadius:10,background:"#fff",transition:"width .5s"}}/>
            </div>
            <div style={{fontSize:12,opacity:.9}}>{wd} día{wd!==1?"s":""} activo{wd!==1?"s":""} · {wpct>=100?"¡Meta cumplida! 🎉":`Te faltan ${Math.max(0,WHO-wm)} min`}</div>
          </div>

          <div style={{background:"#fff",borderRadius:20,padding:18,marginBottom:14,boxShadow:"0 4px 20px rgba(0,0,0,0.08)"}}>
            <div style={{fontSize:14,fontWeight:900,marginBottom:12,color:"#C1492B"}}>🎯 Tu plan a la medida</div>
            <div style={{fontSize:11,color:"#888",fontWeight:700,marginBottom:6}}>Objetivo</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12}}>{["Bajar peso","Fuerza","Resistencia","Bienestar general"].map(g=><button key={g} onClick={()=>setExGoal(g)} style={chip(g,exGoal)}>{g}</button>)}</div>
            <div style={{fontSize:11,color:"#888",fontWeight:700,marginBottom:6}}>Equipo</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12}}>{["Ninguno","Casa","Gimnasio"].map(g=><button key={g} onClick={()=>setExEquip(g)} style={chip(g,exEquip)}>{g}</button>)}</div>
            <div style={{display:"flex",gap:14,marginBottom:14}}>
              <div style={{flex:1}}><div style={{fontSize:11,color:"#888",fontWeight:700,marginBottom:6}}>Días/semana</div><div style={{display:"flex",alignItems:"center",gap:10}}><button onClick={()=>setExDias(Math.max(2,exDias-1))} style={{width:32,height:32,borderRadius:"50%",border:"2px solid #eee",background:"#F8F8F8",fontSize:16,cursor:"pointer"}}>−</button><span style={{fontSize:16,fontWeight:900,minWidth:16,textAlign:"center"}}>{exDias}</span><button onClick={()=>setExDias(Math.min(7,exDias+1))} style={{width:32,height:32,borderRadius:"50%",border:"none",background:"#E76F51",color:"#fff",fontSize:16,cursor:"pointer"}}>+</button></div></div>
              <div style={{flex:1}}><div style={{fontSize:11,color:"#888",fontWeight:700,marginBottom:6}}>Min/sesión</div><div style={{display:"flex",alignItems:"center",gap:10}}><button onClick={()=>setExMin(Math.max(15,exMin-5))} style={{width:32,height:32,borderRadius:"50%",border:"2px solid #eee",background:"#F8F8F8",fontSize:16,cursor:"pointer"}}>−</button><span style={{fontSize:16,fontWeight:900,minWidth:24,textAlign:"center"}}>{exMin}</span><button onClick={()=>setExMin(Math.min(90,exMin+5))} style={{width:32,height:32,borderRadius:"50%",border:"none",background:"#E76F51",color:"#fff",fontSize:16,cursor:"pointer"}}>+</button></div></div>
            </div>
            <button onClick={genPlan} disabled={exAnalyzing} style={{width:"100%",padding:"14px",borderRadius:14,border:"none",background:exAnalyzing?"#ccc":"linear-gradient(135deg,#E76F51,#C1492B)",color:"#fff",fontSize:15,fontWeight:800,cursor:"pointer",boxShadow:"0 4px 16px #E76F5144"}}>{exAnalyzing?"🔍 Creando tu plan…":exPlan?"🔄 Regenerar plan de la semana":"✨ Generar plan de la semana con IA"}</button>
            {exMsg&&<div style={{marginTop:10,textAlign:"center",fontSize:12,fontWeight:700,color:"#C1492B"}}>{exMsg}</div>}
          </div>

          {exPlan&&(
            <div style={{marginBottom:14}}>
              <div style={{background:"#FFF4EF",borderRadius:14,padding:"12px 14px",marginBottom:10,borderLeft:"4px solid #E76F51"}}>
                <div style={{fontSize:13,fontWeight:800,color:"#C1492B",marginBottom:4}}>🎯 {exPlan.meta_semanal}</div>
                <div style={{fontSize:12,color:"#7A4A3A",lineHeight:1.5}}>💡 {exPlan.consejo}</div>
              </div>
              {(exPlan.dias||[]).map((d,i)=>{
                const done=exDone.includes(i),rest=/descanso/i.test(d.foco||"");
                return(
                  <div key={i} style={{background:"#fff",borderRadius:14,padding:"12px 14px",marginBottom:8,boxShadow:"0 2px 10px rgba(0,0,0,0.05)",opacity:done?.6:1,borderLeft:`4px solid ${rest?"#bbb":intColor(d.intensidad)}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                      <div style={{fontSize:14,fontWeight:900,color:"#333"}}>{d.dia} · <span style={{color:"#E76F51"}}>{d.foco}</span></div>
                      {!rest&&<button onClick={()=>toggleDone(i)} style={{padding:"4px 10px",borderRadius:10,border:"none",cursor:"pointer",fontSize:11,fontWeight:800,background:done?"#6D5BD0":"#F0F0F0",color:done?"#fff":"#888"}}>{done?"✓ Hecho":"Marcar"}</button>}
                    </div>
                    {(d.actividades||[]).map((a,j)=><div key={j} style={{fontSize:13,color:"#555",lineHeight:1.5,paddingLeft:4}}>• {a}</div>)}
                    {!rest&&<div style={{fontSize:11,color:"#999",marginTop:6}}>⏱️ {d.duracion} · intensidad {d.intensidad}</div>}
                  </div>
                );
              })}
            </div>
          )}

          <div style={{background:"#fff",borderRadius:20,padding:18,marginBottom:14,boxShadow:"0 4px 20px rgba(0,0,0,0.08)"}}>
            <div style={{fontSize:14,fontWeight:900,marginBottom:12,color:"#C1492B"}}>📝 Registrar entrenamiento</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12}}>{["Caminar","Correr","Fuerza","Cardio","Yoga","Ciclismo","Deporte"].map(t=><button key={t} onClick={()=>setExType(t)} style={chip(t,exType)}>{t}</button>)}</div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
              <div style={{fontSize:12,color:"#888",fontWeight:700}}>Minutos</div>
              <div style={{display:"flex",alignItems:"center",gap:10}}><button onClick={()=>setExLogMin(Math.max(5,exLogMin-5))} style={{width:34,height:34,borderRadius:"50%",border:"2px solid #eee",background:"#F8F8F8",fontSize:16,cursor:"pointer"}}>−</button><span style={{fontSize:17,fontWeight:900,minWidth:30,textAlign:"center"}}>{exLogMin}</span><button onClick={()=>setExLogMin(Math.min(180,exLogMin+5))} style={{width:34,height:34,borderRadius:"50%",border:"none",background:"#E76F51",color:"#fff",fontSize:16,cursor:"pointer"}}>+</button></div>
            </div>
            <div style={{display:"flex",gap:6,marginBottom:14}}>{["baja","media","alta"].map(v=><button key={v} onClick={()=>setExInt(v)} style={{flex:1,padding:"9px 0",borderRadius:10,border:"none",cursor:"pointer",fontSize:12,fontWeight:700,background:v===exInt?intColor(v):"#F0F0F0",color:v===exInt?"#fff":"#666"}}>{v}</button>)}</div>
            <button onClick={logWorkout} style={{width:"100%",padding:"13px",borderRadius:14,border:"none",background:"linear-gradient(135deg,#E76F51,#F4A261)",color:"#fff",fontSize:15,fontWeight:800,cursor:"pointer"}}>Registrar {exLogMin} min de {exType}</button>
          </div>

          {exLog.length>0&&(
            <div style={{background:"#fff",borderRadius:16,padding:16,boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
              <div style={{fontSize:12,fontWeight:800,color:"#C1492B",marginBottom:10}}>Entrenamientos recientes</div>
              {exLog.slice(0,10).map((w,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:i<Math.min(9,exLog.length-1)?"1px solid #F2F2F2":"none"}}>
                  <div><span style={{fontSize:13,fontWeight:700}}>{w.tipo}</span><span style={{fontSize:10,color:"#aaa",marginLeft:8}}>{w.date}</span></div>
                  <div style={{fontSize:13,fontWeight:900,color:intColor(w.intensidad)}}>{w.min} min</div>
                </div>
              ))}
            </div>
          )}
        </div>
        );
      })()}

      {/* ══ MICRÓFONO FLOTANTE GLOBAL ═════════════════════════════ */}
      {breathing&&(
        <div onClick={stopBreathing} style={{position:"fixed",inset:0,zIndex:80,background:"rgba(18,40,30,.93)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
          <style>{`@keyframes vtbreath{0%,100%{transform:scale(.65)}50%{transform:scale(1.25)}}`}</style>
          <div style={{width:170,height:170,borderRadius:"50%",background:"radial-gradient(circle,#B3A8F0,#6D5BD0)",animation:"vtbreath 10s ease-in-out infinite",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <span style={{color:"#fff",fontSize:22,fontWeight:800}}>{breathPhase}</span>
          </div>
          <div style={{color:"#fff",fontSize:16,marginTop:34,fontWeight:600}}>Respira un minuto y vuelve con energía</div>
          <div style={{color:"rgba(255,255,255,.6)",fontSize:12,marginTop:10}}>Toca para salir</div>
        </div>
      )}
      <style>{`@keyframes vtpulse{0%{box-shadow:0 0 0 0 rgba(193,18,31,.55)}70%{box-shadow:0 0 0 22px rgba(193,18,31,0)}100%{box-shadow:0 0 0 0 rgba(193,18,31,0)}}`}</style>
      <div style={{position:"fixed",left:14,right:14,bottom:82,zIndex:60,display:"flex",justifyContent:"flex-end",alignItems:"flex-end",pointerEvents:"none"}}>
        {(listening||voiceBusy||voiceResult)&&(
          <div style={{flex:1,marginRight:10,background:"#fff",borderRadius:16,padding:14,boxShadow:"0 6px 24px rgba(0,0,0,0.22)",border:`2px solid ${listening?"#C1121F":"#EFEDFC"}`,pointerEvents:"auto"}}>
            {listening&&<div style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:"#C1121F",fontWeight:800}}><span style={{width:10,height:10,borderRadius:"50%",background:"#C1121F",animation:"vtpulse 1.3s infinite"}}/>Escuchando… habla tranquilo</div>}
            {listening&&<div style={{fontSize:11,color:"#888",marginTop:4}}>Cuando termines, toca ⏹️ para guardar y analizar.</div>}
            {voiceText&&<div style={{fontSize:13,color:"#333",marginTop:8,fontStyle:"italic",lineHeight:1.4}}>"{voiceText}"</div>}
            {voiceBusy&&<div style={{fontSize:12,color:"#888",marginTop:8}}>🤔 Guardando y analizando…</div>}
            {voiceResult&&voiceResult.respuesta&&<div style={{fontSize:13,color:"#6D5BD0",fontWeight:700,marginTop:8,background:"#EFEDFC",padding:"10px 12px",borderRadius:10}}>✓ {voiceResult.respuesta}</div>}
            {voiceResult&&voiceResult.analisis&&(
              <div style={{marginTop:8,padding:"10px 12px",borderRadius:10,background:"#F8F7FE",borderLeft:`4px solid ${voiceResult.analisis.semaforo==="verde"?"#2E9E5B":voiceResult.analisis.semaforo==="rojo"?"#E76F51":"#E9C46A"}`}}>
                <div style={{fontSize:12,fontWeight:800,color:"#6D5BD0",marginBottom:3}}>{voiceResult.analisis.semaforo==="verde"?"🟢":voiceResult.analisis.semaforo==="rojo"?"🔴":"🟡"} Análisis de lo que comiste</div>
                <div style={{fontSize:12,color:"#555",lineHeight:1.5}}>{voiceResult.analisis.recomendacion}</div>
              </div>
            )}
            {voiceResult&&<div style={{textAlign:"right",marginTop:8}}><button onClick={()=>{setVoiceResult(null);setVoiceText("");}} style={{background:"transparent",border:"none",color:"#aaa",fontSize:11,cursor:"pointer"}}>cerrar</button></div>}
          </div>
        )}
        <button onClick={listening?stopVoice:startVoice} title="Dictar por voz" style={{pointerEvents:"auto",width:64,height:64,borderRadius:"50%",border:"none",background:listening?"#C1121F":"linear-gradient(135deg,#6D5BD0,#8B7BE8)",color:"#fff",fontSize:listening?22:26,cursor:"pointer",boxShadow:"0 6px 20px rgba(45,106,79,.45)",flexShrink:0,animation:listening?"vtpulse 1.3s infinite":"none"}}>{listening?"⏹️":"🎤"}</button>
      </div>

      {tab===7&&(
        <div style={{padding:"16px 14px 90px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <h2 style={{fontSize:20,fontWeight:900,color:"#1A1A1A",margin:0}}>Tu plan 📋</h2>
            <button onClick={genMiPlan} disabled={planBusy} style={{background:"#6D5BD0",color:"#fff",border:"none",borderRadius:10,padding:"8px 12px",fontWeight:800,fontSize:12,cursor:planBusy?"default":"pointer",opacity:planBusy?.6:1}}>{planBusy?"Generando…":"🔄 Regenerar"}</button>
          </div>
          {planErr&&<div style={{background:"#FEECEC",color:"#C0392B",padding:"10px 12px",borderRadius:10,fontSize:13,marginBottom:12}}>{planErr}</div>}
          {planBusy&&!plan&&<div style={{textAlign:"center",color:"#6D5BD0",padding:"40px 20px",fontWeight:700}}>🤖 Generando tu plan con IA…<div style={{fontSize:12,color:"#999",fontWeight:500,marginTop:6}}>Esto toma unos segundos</div></div>}
          {plan?(
            <div>
              {plan.resumen&&<div style={{background:"#EDEAFB",borderRadius:14,padding:14,color:"#5B49C0",fontSize:14,fontWeight:700,marginBottom:14}}>{plan.resumen}</div>}
              {[["🌅 Desayuno",plan.desayuno],["☀️ Almuerzo",plan.almuerzo],["🌙 Cena",plan.cena]].map(([t,txt])=>(
                <div key={t} style={{background:"#fff",borderRadius:14,padding:14,marginBottom:10,boxShadow:"0 2px 10px rgba(0,0,0,.05)"}}>
                  <div style={{fontSize:14,fontWeight:800,color:"#6D5BD0",marginBottom:4}}>{t}</div>
                  <div style={{fontSize:13,color:"#444",lineHeight:1.5}}>{txt||"—"}</div>
                </div>
              ))}
              {plan.evitar&&plan.evitar.length>0&&(
                <div style={{background:"#FEECEC",borderRadius:14,padding:14,marginBottom:10}}>
                  <div style={{fontSize:14,fontWeight:800,color:"#C0392B",marginBottom:8}}>🚫 Alimentos a evitar</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{plan.evitar.map((x,i)=>(<span key={i} style={{fontSize:12,background:"#fff",color:"#C0392B",padding:"5px 10px",borderRadius:14,border:"1px solid #F0C0C0"}}>{x}</span>))}</div>
                </div>
              )}
              {plan.ejercicio&&(
                <div style={{background:"#fff",borderRadius:14,padding:14,boxShadow:"0 2px 10px rgba(0,0,0,.05)"}}>
                  <div style={{fontSize:14,fontWeight:800,color:"#6D5BD0",marginBottom:4}}>💪 Ejercicio recomendado</div>
                  <div style={{fontSize:13,color:"#444",lineHeight:1.5}}>{plan.ejercicio}</div>
                </div>
              )}
            </div>
          ):(!planBusy&&(
            <div style={{textAlign:"center",padding:"40px 20px"}}>
              <div style={{fontSize:42,marginBottom:10}}>📋</div>
              <p style={{color:"#888",fontSize:14,marginBottom:18}}>Aún no tienes un plan generado.</p>
              <button onClick={genMiPlan} style={{background:"#6D5BD0",color:"#fff",border:"none",borderRadius:12,padding:"13px 24px",fontWeight:800,fontSize:15,cursor:"pointer"}}>Generar mi plan</button>
            </div>
          ))}
        </div>
      )}

      {tab===9&&(
        <div style={{padding:"16px 14px 90px"}}>
          <div style={{background:"#fff",borderRadius:18,padding:"22px 16px",boxShadow:"0 2px 12px rgba(0,0,0,0.06)",textAlign:"center",marginBottom:14}}>
            <div style={{width:72,height:72,borderRadius:20,background:"#EDEAFB",display:"flex",alignItems:"center",justifyContent:"center",fontSize:34,margin:"0 auto 12px"}}>{nivel.icon}</div>
            <div style={{fontSize:21,fontWeight:900,color:"#1A1A1A"}}>{perfil}</div>
            <div style={{fontSize:13,color:"#888",marginTop:2}}>Paciente · VitalTrack</div>
          </div>
          <div style={{background:"#fff",borderRadius:16,padding:"16px",boxShadow:"0 2px 12px rgba(0,0,0,0.05)",marginBottom:14}}>
            <div style={{fontSize:13,fontWeight:800,color:"#6D5BD0",marginBottom:6}}>Tus datos de salud</div>
            {[["Edad",hp?hp.edad+" años":"—"],["Condición",hp?hp.enfermedad:"—"],["Actividad",hp?hp.ejercicio:"—"]].map(([k,v])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"9px 0",borderBottom:"1px solid #F2F2F2"}}>
                <span style={{fontSize:13,color:"#888"}}>{k}</span>
                <span style={{fontSize:13,fontWeight:700,color:"#444"}}>{v}</span>
              </div>
            ))}
          </div>
          <button onClick={()=>setPrefsEditor(true)} style={{width:"100%",background:"#fff",border:"2px solid #6D5BD0",color:"#6D5BD0",borderRadius:14,padding:"14px",fontWeight:800,fontSize:15,cursor:"pointer",marginBottom:10}}>✏️ Editar mis preferencias</button>
          <button onClick={()=>{localStorage.removeItem("vt_perfil_actual");onLogout&&onLogout();}} style={{width:"100%",background:"#FEECEC",border:"none",color:"#C0392B",borderRadius:14,padding:"14px",fontWeight:800,fontSize:15,cursor:"pointer"}}>🚪 Cerrar sesión</button>
        </div>
      )}

      {/* ══ NAV INFERIOR (5 botones) ══════════════════════════════ */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,background:"#fff",borderTop:"1px solid #F0F0F0",display:"flex",alignItems:"flex-end",zIndex:20,boxShadow:"0 -4px 20px rgba(0,0,0,0.08)",paddingBottom:"env(safe-area-inset-bottom,0px)"}}>
        {(()=>{
          const navBtn=(ic,lb,activo,onClick)=>(
            <button key={lb} onClick={onClick} style={{flex:1,padding:"10px 4px 8px",background:"transparent",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
              <span style={{fontSize:21,opacity:activo?1:.45,filter:activo?"none":"grayscale(40%)"}}>{ic}</span>
              <span style={{fontSize:10,fontWeight:activo?800:500,color:activo?"#6D5BD0":"#aaa"}}>{lb}</span>
            </button>
          );
          return (<>
            {navBtn("🏠","Inicio",tab===0||tab===4||tab===5||tab===6,()=>setTab(0))}
            {navBtn("📋","Plan",tab===7,()=>setTab(7))}
            <div style={{flex:1,display:"flex",justifyContent:"center"}}>
              <button onClick={()=>setPrefsEditor(true)} style={{width:54,height:54,borderRadius:"50%",background:"#6D5BD0",border:"none",display:"flex",alignItems:"center",justifyContent:"center",marginTop:-26,boxShadow:"0 6px 16px rgba(109,91,208,0.45)",cursor:"pointer"}}>
                <span style={{fontSize:30,color:"#fff",fontWeight:300,lineHeight:1,marginTop:-2}}>＋</span>
              </button>
            </div>
            {navBtn("📈","Progreso",tab===1||tab===2||tab===3,()=>setTab(1))}
            {navBtn("👤","Perfil",tab===9,()=>setTab(9))}
          </>);
        })()}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   VitalTrack — FASE 1: Login + Registro (Supabase Auth vía REST)
   Sin dependencias nuevas. role: paciente | especialista.
   ════════════════════════════════════════════════════════════ */
const SB_URL  = "https://xhplpwcfdtiarrpypyif.supabase.co";
const SB_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhocGxwd2NmZHRpYXJycHlweWlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3NjM5MDksImV4cCI6MjA5NjMzOTkwOX0.tlCAIDo43LIShwFeGdP3kCSZTjPMV0s9_Ox6ana7Q3s";

const VT = { violeta:"#6D5BD0", violetaO:"#5B49C0", lila:"#EDEAFB", verde:"#3DAE5A",
             bg:"#F6F5FF", txt:"#1F2433", gris:"#7A7E8C", linea:"#E7E4F7" };

async function sbAuth(path, body){
  const res = await fetch(`${SB_URL}/auth/v1/${path}`, {
    method:"POST",
    headers:{ apikey:SB_ANON, "Content-Type":"application/json" },
    body: JSON.stringify(body)
  });
  const d = await res.json();
  if(!res.ok) throw new Error(d.error_description||d.msg||d.error||"No se pudo autenticar");
  return d;
}
const sbSignup = (email,password,nombre,role)=>sbAuth("signup",{ email, password, data:{ nombre, role } });
const sbLogin  = (email,password)=>sbAuth("token?grant_type=password",{ email, password });
async function sbGetUser(token){
  const res = await fetch(`${SB_URL}/auth/v1/user`,{ headers:{ apikey:SB_ANON, Authorization:`Bearer ${token}` }});
  if(!res.ok) throw new Error("sesión inválida");
  return res.json();
}
async function sbInsertProfile(token, user, nombre, role){
  try{
    await fetch(`${SB_URL}/rest/v1/profiles`,{
      method:"POST",
      headers:{ apikey:SB_ANON, Authorization:`Bearer ${token}`, "Content-Type":"application/json", Prefer:"return=minimal" },
      body: JSON.stringify({ id:user.id, role, nombre, email:user.email })
    });
  }catch(_){}
}

function VTCampo({label,...p}){
  return (
    <label style={{display:"block",marginBottom:14}}>
      <span style={{display:"block",fontSize:13,fontWeight:700,color:VT.txt,marginBottom:6}}>{label}</span>
      <input {...p} style={{width:"100%",boxSizing:"border-box",padding:"13px 14px",borderRadius:12,border:`1.5px solid ${VT.linea}`,fontSize:15,outline:"none",background:"#fff"}}/>
    </label>
  );
}

function AuthScreen({onLogin}){
  const [modo,setModo]=useState("login");
  const [email,setEmail]=useState("");
  const [pass,setPass]=useState("");
  const [nombre,setNombre]=useState("");
  const [role,setRole]=useState("paciente");
  const [busy,setBusy]=useState(false);
  const [err,setErr]=useState("");
  const submit=async()=>{
    setErr(""); setBusy(true);
    try{
      if(modo==="registro"){
        if(!nombre.trim()) throw new Error("Escribe tu nombre");
        if(pass.length<6) throw new Error("La contraseña debe tener al menos 6 caracteres");
        const d=await sbSignup(email.trim(),pass,nombre.trim(),role);
        if(d.access_token){
          // El perfil lo crea automáticamente el trigger handle_new_user en Supabase.
          onLogin(d);
        } else {
          setErr("Cuenta creada ✓. Si Supabase pide confirmar el correo, desactívalo para probar (Authentication → Sign In/Providers → Email → Confirm email OFF), o confírmalo desde tu correo. Luego ingresa.");
          setModo("login");
        }
      } else {
        const d=await sbLogin(email.trim(),pass);
        onLogin(d);
      }
    }catch(e){ setErr(e.message); }
    setBusy(false);
  };
  return (
    <div style={{minHeight:"100vh",background:VT.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20,fontFamily:"system-ui,-apple-system,sans-serif"}}>
      <div style={{width:"100%",maxWidth:380}}>
        <div style={{textAlign:"center",marginBottom:22}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:10}}>
            <div style={{width:46,height:46,borderRadius:14,background:VT.violeta,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>🥗</div>
            <div style={{textAlign:"left"}}>
              <div style={{fontSize:24,fontWeight:900,color:VT.violeta,lineHeight:1}}>VitalTrack</div>
              <div style={{fontSize:12,fontWeight:700,color:VT.verde}}>Salud Inteligente 🌱</div>
            </div>
          </div>
          <p style={{color:VT.gris,fontSize:14,marginTop:14,lineHeight:1.5}}>Tu nutrición personalizada,<br/>tu mejor versión.</p>
        </div>
        <div style={{background:"#fff",borderRadius:20,padding:22,boxShadow:"0 10px 40px rgba(109,91,208,.12)"}}>
          <div style={{display:"flex",background:VT.lila,borderRadius:12,padding:4,marginBottom:20}}>
            {["login","registro"].map(m=>(
              <button key={m} onClick={()=>{setModo(m);setErr("");}} style={{flex:1,padding:"9px",borderRadius:9,border:"none",cursor:"pointer",fontWeight:800,fontSize:13,background:modo===m?"#fff":"transparent",color:modo===m?VT.violeta:VT.gris,boxShadow:modo===m?"0 2px 8px rgba(0,0,0,.06)":"none"}}>{m==="login"?"Ingresar":"Crear cuenta"}</button>
            ))}
          </div>
          {modo==="registro" && <VTCampo label="Nombre" value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="Tu nombre"/>}
          <VTCampo label="Correo" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="tucorreo@ejemplo.com" autoCapitalize="none"/>
          <VTCampo label="Contraseña" type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="Mínimo 6 caracteres"/>
          {modo==="registro" &&
            <div style={{marginBottom:16}}>
              <span style={{display:"block",fontSize:13,fontWeight:700,color:VT.txt,marginBottom:8}}>¿Quién eres?</span>
              <div style={{display:"flex",gap:10}}>
                {[["paciente","🧑 Paciente"],["especialista","👩‍⚕️ Especialista"]].map(([v,l])=>(
                  <button key={v} onClick={()=>setRole(v)} style={{flex:1,padding:"12px",borderRadius:12,border:`1.5px solid ${role===v?VT.violeta:VT.linea}`,background:role===v?VT.lila:"#fff",color:role===v?VT.violeta:VT.gris,fontWeight:800,fontSize:13,cursor:"pointer"}}>{l}</button>
                ))}
              </div>
            </div>
          }
          {err && <div style={{background:"#FEECEC",color:"#C0392B",padding:"10px 12px",borderRadius:10,fontSize:13,marginBottom:14,lineHeight:1.4}}>{err}</div>}
          <button onClick={submit} disabled={busy} style={{width:"100%",padding:"14px",borderRadius:12,border:"none",background:busy?VT.gris:VT.violeta,color:"#fff",fontWeight:900,fontSize:15,cursor:busy?"default":"pointer"}}>{busy?"Un momento...":(modo==="login"?"Ingresar":"Crear mi cuenta")}</button>
        </div>
        <p style={{textAlign:"center",color:VT.gris,fontSize:11,marginTop:16}}>Tu salud es única, tu nutrición también. 💜</p>
      </div>
    </div>
  );
}

function VTTarjeta({titulo,valor,sub}){
  return (
    <div style={{background:"#fff",borderRadius:14,padding:"14px 16px",boxShadow:"0 3px 12px rgba(0,0,0,.04)"}}>
      <div style={{fontSize:12,color:VT.gris,fontWeight:700}}>{titulo}</div>
      <div style={{fontSize:26,fontWeight:900,color:VT.violeta,margin:"2px 0"}}>{valor}</div>
      <div style={{fontSize:11,color:VT.gris}}>{sub}</div>
    </div>
  );
}
function VTConstruccion({titulo}){
  return (
    <div style={{background:"#fff",borderRadius:16,padding:30,textAlign:"center"}}>
      <div style={{fontSize:40,marginBottom:10}}>🚧</div>
      <h3 style={{color:VT.txt,margin:"0 0 6px"}}>{titulo}</h3>
      <p style={{color:VT.gris,fontSize:13,margin:0}}>Esta sección se construye en la siguiente fase.</p>
    </div>
  );
}

function NutritionistPanel({user,token,onLogout}){
  const [sec,setSec]=useState("inicio");
  const [pac,setPac]=useState(null);
  const [cargando,setCargando]=useState(false);
  const nombre=(user&&user.user_metadata&&user.user_metadata.nombre)||"Especialista";
  const SECS=[["inicio","🏠 Inicio"],["pacientes","👥 Pacientes"],["planes","📋 Planes"],["seguimiento","📈 Seguimiento"],["mensajes","💬 Mensajes"],["config","⚙️ Configuración"]];
  const cargarPacientes=async()=>{
    setCargando(true);
    try{
      const res=await fetch(`${SB_URL}/rest/v1/profiles?role=eq.paciente&select=id,nombre,email`,{headers:{apikey:SB_ANON,Authorization:`Bearer ${token}`}});
      const d=await res.json();
      setPac(Array.isArray(d)?d:[]);
    }catch(e){ setPac([]); }
    setCargando(false);
  };
  useEffect(()=>{ if(sec==="pacientes"&&pac===null) cargarPacientes(); },[sec]);
  return (
    <div style={{minHeight:"100vh",background:VT.bg,fontFamily:"system-ui,-apple-system,sans-serif",paddingBottom:30}}>
      <div style={{background:VT.violeta,color:"#fff",padding:"16px 18px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:38,height:38,borderRadius:11,background:"rgba(255,255,255,.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>🥗</div>
          <div>
            <div style={{fontWeight:900,fontSize:17,lineHeight:1}}>VitalTrack</div>
            <div style={{fontSize:11,opacity:.85}}>Panel del Especialista</div>
          </div>
        </div>
        <button onClick={onLogout} style={{background:"rgba(255,255,255,.15)",border:"none",color:"#fff",padding:"8px 12px",borderRadius:10,fontWeight:700,fontSize:12,cursor:"pointer"}}>Salir</button>
      </div>
      <div style={{display:"flex",gap:8,overflowX:"auto",padding:"12px 14px",background:"#fff",borderBottom:`1px solid ${VT.linea}`}}>
        {SECS.map(([k,l])=>(
          <button key={k} onClick={()=>setSec(k)} style={{whiteSpace:"nowrap",padding:"9px 14px",borderRadius:11,border:"none",cursor:"pointer",fontWeight:800,fontSize:13,background:sec===k?VT.violeta:VT.lila,color:sec===k?"#fff":VT.violetaO}}>{l}</button>
        ))}
      </div>
      <div style={{padding:18,maxWidth:560,margin:"0 auto"}}>
        {sec==="inicio" && (
          <div>
            <h2 style={{color:VT.txt,fontSize:22,margin:"4px 0 4px"}}>¡Hola, {nombre}! 👋</h2>
            <p style={{color:VT.gris,fontSize:14,marginBottom:18}}>Este es tu panel para acompañar a tus pacientes.</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <VTTarjeta titulo="Pacientes" valor={pac?String(pac.length):"—"} sub="vinculados"/>
              <VTTarjeta titulo="Planes activos" valor="0" sub="esta semana"/>
              <VTTarjeta titulo="Mensajes" valor="0" sub="sin leer"/>
              <VTTarjeta titulo="Seguimientos" valor="0" sub="pendientes"/>
            </div>
            <div style={{marginTop:18,background:VT.lila,borderRadius:14,padding:16,color:VT.violetaO,fontSize:13,lineHeight:1.5}}>
              <b>Fase 1 lista ✓</b><br/>Login con roles funcionando. Las demás secciones se conectan en las siguientes fases.
            </div>
          </div>
        )}
        {sec==="pacientes" && (
          <div>
            <h2 style={{color:VT.txt,fontSize:20,marginBottom:12}}>Mis pacientes</h2>
            {cargando && <p style={{color:VT.gris}}>Cargando...</p>}
            {pac && pac.length===0 && !cargando && (
              <div style={{background:"#fff",borderRadius:14,padding:22,textAlign:"center",color:VT.gris,fontSize:14}}>
                Aún no tienes pacientes vinculados.<br/><span style={{fontSize:12}}>La vinculación paciente↔especialista (tabla care_links) se construye en la siguiente fase.</span>
              </div>
            )}
            {pac && pac.map((p,i)=>(
              <div key={i} style={{background:"#fff",borderRadius:14,padding:14,marginBottom:10,boxShadow:"0 3px 12px rgba(0,0,0,.04)"}}>
                <div style={{fontWeight:800,color:VT.txt}}>{p.nombre||"Paciente"}</div>
                <div style={{fontSize:12,color:VT.gris,marginTop:2}}>{p.email||""}</div>
              </div>
            ))}
          </div>
        )}
        {["planes","seguimiento","mensajes","config"].includes(sec) && (
          <VTConstruccion titulo={SECS.find(s=>s[0]===sec)[1]}/>
        )}
      </div>
    </div>
  );
}


/* ════════════════════════════════════════════════════════════
   VitalTrack — FASE 2: Onboarding de preferencias (paso a paso)
   ════════════════════════════════════════════════════════════ */
async function sbGetPrefs(token, uid){
  try{
    const res=await fetch(`${SB_URL}/rest/v1/preferences?user_id=eq.${uid}&select=completado`,{headers:{apikey:SB_ANON,Authorization:`Bearer ${token}`}});
    const d=await res.json();
    return Array.isArray(d)&&d.length?d[0]:null;
  }catch(_){ return null; }
}
async function sbSavePrefs(token, uid, data){
  const res=await fetch(`${SB_URL}/rest/v1/preferences`,{
    method:"POST",
    headers:{apikey:SB_ANON,Authorization:`Bearer ${token}`,"Content-Type":"application/json",Prefer:"resolution=merge-duplicates,return=minimal"},
    body:JSON.stringify({user_id:uid,...data,completado:true,updated_at:new Date().toISOString()})
  });
  if(!res.ok){ const e=await res.text(); throw new Error(e||"No se pudo guardar"); }
}

function OnboardingPreferences({user,token,onDone}){
  const [paso,setPaso]=useState(0);
  const [busy,setBusy]=useState(false);
  const [err,setErr]=useState("");
  const [nuevo,setNuevo]=useState("");
  const [d,setD]=useState({alimentos_gustan:[],alimentos_no_gustan:[],tipo_dieta:"",horario_desayuno:"07:00",horario_almuerzo:"12:30",horario_cena:"19:00",estilo_vida:"",objetivo:"",alergias:[],presupuesto:"",tiempo_cocinar:""});
  const set=(k,v)=>setD(p=>({...p,[k]:v}));
  const toggle=(k,v)=>setD(p=>({...p,[k]:p[k].includes(v)?p[k].filter(x=>x!==v):[...p[k],v]}));
  const addNuevo=(k)=>{const t=nuevo.trim();if(t){setD(p=>({...p,[k]:p[k].includes(t)?p[k]:[...p[k],t]}));setNuevo("");}};
  const TOTAL=8;
  const finalizar=async()=>{setErr("");setBusy(true);try{await sbSavePrefs(token,user.id,d);onDone();}catch(e){setErr("No se pudo guardar: "+e.message);}setBusy(false);};
  const siguiente=()=>{ if(paso<TOTAL-1)setPaso(paso+1); else finalizar(); };
  const TITULOS=[
    ["¿Qué alimentos te gustan?","Toca los que disfrutas (o agrega)"],
    ["¿Cuáles NO te gustan?","Para no incluirlos en tu plan"],
    ["¿Qué tipo de alimentación llevas?","Elige la más cercana"],
    ["¿A qué hora comes?","Tus horarios habituales"],
    ["¿Cómo es tu estilo de vida?","Tu nivel de actividad"],
    ["¿Cuál es tu objetivo?","Lo que quieres lograr"],
    ["¿Tienes alergias o intolerancias?","Importante para tu seguridad"],
    ["Un par de cosas más","Presupuesto y tiempo para cocinar"]
  ];
  const chip=(sel,label,onClick)=>(<button key={label} onClick={onClick} style={{fontSize:13,padding:"8px 14px",borderRadius:20,border:sel?("2px solid "+VT.violeta):("1px solid "+VT.linea),background:sel?VT.lila:"#fff",color:sel?VT.violeta:VT.gris,fontWeight:sel?800:500,cursor:"pointer"}}>{label}</button>);
  const opcion=(sel,label,sub,onClick)=>(<button key={label} onClick={onClick} style={{width:"100%",textAlign:"left",padding:"14px",borderRadius:14,border:sel?("2px solid "+VT.violeta):("1px solid "+VT.linea),background:sel?VT.lila:"#fff",cursor:"pointer",marginBottom:10}}><div style={{fontSize:15,fontWeight:800,color:sel?VT.violeta:VT.txt}}>{label}</div>{sub&&<div style={{fontSize:12,color:VT.gris,marginTop:2}}>{sub}</div>}</button>);

  const cuerpo=()=>{
    if(paso===0||paso===1){
      const k=paso===0?"alimentos_gustan":"alimentos_no_gustan";
      const sug=["Pollo","Pescado","Huevo","Aguacate","Arroz","Frijoles","Plátano","Arepa","Verduras","Frutas","Lentejas","Yogur"];
      return (<div>
        <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:14}}>
          {sug.map(s=>chip(d[k].includes(s),s,()=>toggle(k,s)))}
          {d[k].filter(x=>!sug.includes(x)).map(s=>chip(true,s,()=>toggle(k,s)))}
        </div>
        <div style={{display:"flex",gap:8}}>
          <input value={nuevo} onChange={e=>setNuevo(e.target.value)} placeholder="Otro…" style={{flex:1,boxSizing:"border-box",padding:"11px 12px",borderRadius:10,border:"1px solid "+VT.linea,fontSize:14,outline:"none"}}/>
          <button onClick={()=>addNuevo(k)} style={{padding:"0 16px",borderRadius:10,border:"none",background:VT.violeta,color:"#fff",fontWeight:800,cursor:"pointer"}}>Agregar</button>
        </div>
      </div>);
    }
    if(paso===2){
      const opts=[["omnivoro","🍖 Omnívoro","Como de todo"],["vegetariano","🥗 Vegetariano","Sin carne"],["vegano","🌱 Vegano","Sin productos animales"],["sin_gluten","🌾 Sin gluten","Evito el gluten"]];
      return <div>{opts.map(([v,l,s])=>opcion(d.tipo_dieta===v,l,s,()=>set("tipo_dieta",v)))}</div>;
    }
    if(paso===3){
      const campo=(lbl,k)=>(<div key={k} style={{marginBottom:12}}><div style={{fontSize:13,fontWeight:700,color:VT.txt,marginBottom:6}}>{lbl}</div><input type="time" value={d[k]} onChange={e=>set(k,e.target.value)} style={{width:"100%",boxSizing:"border-box",padding:"12px",borderRadius:10,border:"1px solid "+VT.linea,fontSize:15,outline:"none"}}/></div>);
      return <div>{campo("🌅 Desayuno","horario_desayuno")}{campo("☀️ Almuerzo","horario_almuerzo")}{campo("🌙 Cena","horario_cena")}</div>;
    }
    if(paso===4){
      const opts=[["sedentario","🪑 Sedentario","Poco movimiento"],["activo","🚶 Activo","Me muevo a diario"],["atleta","🏃 Atleta","Entreno fuerte"]];
      return <div>{opts.map(([v,l,s])=>opcion(d.estilo_vida===v,l,s,()=>set("estilo_vida",v)))}</div>;
    }
    if(paso===5){
      const opts=[["bajar_peso","⚖️ Bajar de peso",""],["masa_muscular","💪 Aumentar masa muscular",""],["salud","❤️ Mejorar mi salud",""]];
      return <div>{opts.map(([v,l,s])=>opcion(d.objetivo===v,l,s,()=>set("objetivo",v)))}</div>;
    }
    if(paso===6){
      const sug=["Lactosa","Gluten","Maní","Mariscos","Huevo","Soya","Frutos secos"];
      return (<div>
        <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:14}}>
          {sug.map(s=>chip(d.alergias.includes(s),s,()=>toggle("alergias",s)))}
          {d.alergias.filter(x=>!sug.includes(x)).map(s=>chip(true,s,()=>toggle("alergias",s)))}
        </div>
        <div style={{display:"flex",gap:8}}>
          <input value={nuevo} onChange={e=>setNuevo(e.target.value)} placeholder="Otra…" style={{flex:1,boxSizing:"border-box",padding:"11px 12px",borderRadius:10,border:"1px solid "+VT.linea,fontSize:14,outline:"none"}}/>
          <button onClick={()=>addNuevo("alergias")} style={{padding:"0 16px",borderRadius:10,border:"none",background:VT.violeta,color:"#fff",fontWeight:800,cursor:"pointer"}}>Agregar</button>
        </div>
        <button onClick={()=>set("alergias",[])} style={{marginTop:12,background:"none",border:"none",color:VT.gris,fontSize:12,textDecoration:"underline",cursor:"pointer"}}>No tengo alergias</button>
      </div>);
    }
    const presu=[["bajo","💵 Bajo"],["medio","💰 Medio"],["alto","💳 Alto"]];
    const coc=[["poco","⏱️ Poco tiempo"],["medio","🕐 Tiempo medio"],["mucho","👨‍🍳 Me gusta cocinar"],["fuera","🍽️ Como por fuera"]];
    return (<div>
      <div style={{fontSize:13,fontWeight:700,color:VT.txt,marginBottom:8}}>Presupuesto para alimentos</div>
      <div style={{display:"flex",gap:8,marginBottom:18,flexWrap:"wrap"}}>{presu.map(([v,l])=>chip(d.presupuesto===v,l,()=>set("presupuesto",v)))}</div>
      <div style={{fontSize:13,fontWeight:700,color:VT.txt,marginBottom:8}}>Tiempo para cocinar</div>
      <div style={{display:"flex",flexWrap:"wrap",gap:8}}>{coc.map(([v,l])=>chip(d.tiempo_cocinar===v,l,()=>set("tiempo_cocinar",v)))}</div>
    </div>);
  };

  return (
    <div style={{minHeight:"100vh",background:VT.bg,fontFamily:"system-ui,-apple-system,sans-serif",display:"flex",flexDirection:"column"}}>
      <div style={{background:VT.violeta,padding:"16px 18px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,maxWidth:420,marginLeft:"auto",marginRight:"auto"}}>
          <span style={{color:"#fff",fontSize:14,fontWeight:800}}>Tus preferencias</span>
          <span style={{color:"rgba(255,255,255,.8)",fontSize:12}}>Paso {paso+1} de {TOTAL}</span>
        </div>
        <div style={{maxWidth:420,marginLeft:"auto",marginRight:"auto",height:6,background:"rgba(255,255,255,.25)",borderRadius:6,overflow:"hidden"}}>
          <div style={{height:6,width:((paso+1)/TOTAL*100)+"%",background:"#fff",borderRadius:6,transition:"width .3s"}}/>
        </div>
      </div>
      <div style={{flex:1,padding:"22px 18px",maxWidth:420,marginLeft:"auto",marginRight:"auto",width:"100%",boxSizing:"border-box"}}>
        <h2 style={{fontSize:20,color:VT.txt,margin:"0 0 4px"}}>{TITULOS[paso][0]}</h2>
        <p style={{fontSize:13,color:VT.gris,margin:"0 0 18px"}}>{TITULOS[paso][1]}</p>
        {cuerpo()}
        {err&&<div style={{background:"#FEECEC",color:"#C0392B",padding:"10px 12px",borderRadius:10,fontSize:13,marginTop:14}}>{err}</div>}
      </div>
      <div style={{padding:"14px 18px calc(18px + env(safe-area-inset-bottom,0px))",display:"flex",gap:10,maxWidth:420,marginLeft:"auto",marginRight:"auto",width:"100%",boxSizing:"border-box"}}>
        {paso>0&&<button onClick={()=>setPaso(paso-1)} style={{padding:"14px 18px",borderRadius:12,border:"1px solid "+VT.linea,background:"#fff",color:VT.gris,fontWeight:800,cursor:"pointer"}}>Atrás</button>}
        <button onClick={siguiente} disabled={busy} style={{flex:1,padding:"14px",borderRadius:12,border:"none",background:busy?VT.gris:VT.violeta,color:"#fff",fontWeight:900,fontSize:15,cursor:busy?"default":"pointer"}}>{busy?"Guardando...":(paso<TOTAL-1?"Continuar →":"Finalizar ✓")}</button>
      </div>
    </div>
  );
}

export default function App(){
  const [sesion,setSesion]=useState(()=>{ try{ return JSON.parse(localStorage.getItem("vt_session")||"null"); }catch(_){ return null; } });
  const [verif,setVerif]=useState(true);
  const [prefsDone,setPrefsDone]=useState(null);
  useEffect(()=>{
    (async()=>{
      if(sesion&&sesion.access_token){
        try{ const u=await sbGetUser(sesion.access_token); setSesion(s=>({...s,user:u})); }
        catch(_){ localStorage.removeItem("vt_session"); setSesion(null); }
      }
      setVerif(false);
    })();
  // eslint-disable-next-line
  },[]);
  useEffect(()=>{
    (async()=>{
      if(sesion&&sesion.access_token){
        const r=(sesion.user&&sesion.user.user_metadata&&sesion.user.user_metadata.role)||"paciente";
        if(r!=="paciente"){ setPrefsDone(true); return; }
        const p=await sbGetPrefs(sesion.access_token, sesion.user.id);
        setPrefsDone(p&&p.completado?true:false);
      }
    })();
  // eslint-disable-next-line
  },[sesion]);
  const guardar=(d)=>{
    const ses={ access_token:d.access_token, refresh_token:d.refresh_token, user:d.user };
    localStorage.setItem("vt_session",JSON.stringify(ses));
    setSesion(ses);
  };
  const salir=()=>{ localStorage.removeItem("vt_session"); setSesion(null); };
  if(verif) return <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#F6F5FF",color:"#6D5BD0",fontWeight:800,fontFamily:"system-ui"}}>Cargando VitalTrack…</div>;
  if(!sesion||!sesion.access_token) return <AuthScreen onLogin={guardar}/>;
  const role=(sesion.user&&sesion.user.user_metadata&&sesion.user.user_metadata.role)||"paciente";
  if(role==="especialista") return <NutritionistPanel user={sesion.user} token={sesion.access_token} onLogout={salir}/>;
  if(prefsDone===null) return <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#F6F5FF",color:"#6D5BD0",fontWeight:800,fontFamily:"system-ui"}}>Cargando VitalTrack…</div>;
  if(prefsDone===false) return <OnboardingPreferences user={sesion.user} token={sesion.access_token} onDone={()=>setPrefsDone(true)}/>;
  return <PatientApp onLogout={salir} user={sesion.user} token={sesion.access_token}/>;
}
