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
const GLASS_ML = 250;

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

async function iaAudio(prompt,audioB64,mime){
  const res=await fetch("https://xhplpwcfdtiarrpypyif.supabase.co/functions/v1/ai-audio",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({prompt,audio:audioB64,mime})
  });
  const d=await res.json();
  if(d.error)throw new Error(d.error);
  return d.result;
}

const blobToB64=(blob)=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(String(r.result).split(",")[1]);r.onerror=()=>rej(new Error("read failed"));r.readAsDataURL(blob);});

let GUIA_OMS="";
const guiaOMSCtx=()=>GUIA_OMS?`
GUÍA OMS VIGENTE (resumen actualizado desde la web — si alguna cifra difiere de tu conocimiento previo, usa ESTAS cifras):
${GUIA_OMS}
`:"";

async function analizarTexto(alimentos,hp){
  const ctx=hp?`Perfil: ${hp.edad} años${hp.sexo?`, sexo ${hp.sexo}`:""}${(hp.talla&&hp.peso)?`, IMC ${(Number(hp.peso)/((Number(hp.talla)/100)**2)).toFixed(1)}`:""}${(hp.cintura&&hp.cadera)?`, índice cintura-cadera ${(Number(hp.cintura)/Number(hp.cadera)).toFixed(2)}`:""}, actividad "${hp.ejercicio}", condición reportada "${hp.enfermedad}".${hp.tipo_dieta?` Dieta: ${hp.tipo_dieta}.`:""}${(hp.alergias&&hp.alergias.length)?` ALERGIAS (nunca recomendar estos alimentos): ${hp.alergias.join(", ")}.`:""}`:"";
  return iaText(`Eres nutricionista experto en gastronomía colombiana, basas tus recomendaciones en las guías de alimentación saludable de la OMS (mínimo 400g/5 porciones de frutas y verduras al día, azúcares libres <10% de las calorías, preferir granos integrales sobre refinados, limitar sal a <5g/día, priorizar proteínas magras). ${ctx}
${guiaOMSCtx()}
Alimentos registrados: ${alimentos.join(", ")}.

Da un consejo concreto y accionable citando cifras u orientaciones de la OMS cuando aplique (no solo "come más variado", di cuánto o qué tipo). Si la condición reportada del perfil es un valor de laboratorio (ej. "hemoglobina alta", "colesterol alto"), NO des instrucciones dietéticas específicas basadas en asumir la causa — esos valores pueden tener explicaciones normales (ej. en Bogotá y otras ciudades de altura, la hemoglobina alta suele ser una adaptación fisiológica normal, no una enfermedad). En esos casos da recomendaciones nutricionales generales y sugiere que consulte a su médico o nutricionista para interpretar ese valor correctamente, sin asumir tú la causa.

Responde SOLO JSON sin backticks:
{"recomendacion":"consejo concreto 2-3 oraciones, con referencia a una pauta de la OMS cuando aplique","semaforo":"verde|amarillo|rojo","calorias_aprox":"X kcal","faltantes":["nutrientes o grupos de alimentos faltantes según la pauta OMS del plato saludable"]}`);
}

async function analizarFoto(b64,type,hp){
  const ctx=hp?`${hp.edad} años${hp.sexo?`, sexo ${hp.sexo}`:""}${(hp.talla&&hp.peso)?`, IMC ${(Number(hp.peso)/((Number(hp.talla)/100)**2)).toFixed(1)}`:""}${(hp.cintura&&hp.cadera)?`, índice cintura-cadera ${(Number(hp.cintura)/Number(hp.cadera)).toFixed(2)}`:""}, actividad "${hp.ejercicio}", condición "${hp.enfermedad}"${hp.tipo_dieta?` Dieta: ${hp.tipo_dieta}.`:""}${(hp.alergias&&hp.alergias.length)?` ALERGIAS (nunca recomendar estos alimentos): ${hp.alergias.join(", ")}.`:""}`:"";
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
  const ctx=hp?`Perfil: ${hp.edad} años${hp.sexo?`, sexo ${hp.sexo}`:""}${(hp.talla&&hp.peso)?`, IMC ${(Number(hp.peso)/((Number(hp.talla)/100)**2)).toFixed(1)}`:""}${(hp.cintura&&hp.cadera)?`, índice cintura-cadera ${(Number(hp.cintura)/Number(hp.cadera)).toFixed(2)}`:""}, actividad "${hp.ejercicio}", condición "${hp.enfermedad}".${hp.tipo_dieta?` Dieta: ${hp.tipo_dieta}.`:""}${(hp.alergias&&hp.alergias.length)?` ALERGIAS (nunca recomendar estos alimentos): ${hp.alergias.join(", ")}.`:""}`:"";
  const resumen=noches.map(n=>`${n.date}: durmió ${n.hours}h (${n.bed}→${n.wake}), calidad ${n.quality}/5, ${n.awakenings} despertares${n.note?", nota: "+n.note:""}`).join("\n");
  return iaText(`Eres experto en higiene del sueño en Colombia. ${ctx}
Últimas noches del usuario:
${resumen}

Analiza el patrón: duración promedio, calidad, consistencia de horarios (acostarse/levantarse a la misma hora) y despertares. Da consejos concretos y accionables adaptados a Colombia. NO diagnostiques enfermedades; si ves señales preocupantes (insomnio persistente, somnolencia diurna severa), sugiere consultar a un profesional de salud.

Responde SOLO JSON sin backticks:
{"resumen":"diagnóstico breve y empático del patrón en 2 oraciones","semaforo":"verde|amarillo|rojo","consejos":["consejo accionable 1","consejo accionable 2","consejo accionable 3"]}`);
}

async function resumenNoche(noche,contexto,hp,dieta){
  const ctxP=hp?`Perfil: ${hp.edad} años${hp.sexo?`, sexo ${hp.sexo}`:""}${(hp.talla&&hp.peso)?`, IMC ${(Number(hp.peso)/((Number(hp.talla)/100)**2)).toFixed(1)}`:""}${(hp.cintura&&hp.cadera)?`, índice cintura-cadera ${(Number(hp.cintura)/Number(hp.cadera)).toFixed(2)}`:""}, actividad "${hp.ejercicio}", condición "${hp.enfermedad}".${hp.tipo_dieta?` Dieta: ${hp.tipo_dieta}.`:""}${(hp.alergias&&hp.alergias.length)?` ALERGIAS (nunca recomendar estos alimentos): ${hp.alergias.join(", ")}.`:""}`:"";
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

async function planSemana(prefs,hp,contexto,historial){
  const ctxP=hp?`Perfil: ${hp.edad} años${hp.sexo?`, sexo ${hp.sexo}`:""}${(hp.talla&&hp.peso)?`, IMC ${(Number(hp.peso)/((Number(hp.talla)/100)**2)).toFixed(1)}`:""}${(hp.cintura&&hp.cadera)?`, índice cintura-cadera ${(Number(hp.cintura)/Number(hp.cadera)).toFixed(2)}`:""}, actividad actual "${hp.ejercicio}", condición de salud "${hp.enfermedad}".${hp.tipo_dieta?` Dieta: ${hp.tipo_dieta}.`:""}${(hp.alergias&&hp.alergias.length)?` ALERGIAS (nunca recomendar estos alimentos): ${hp.alergias.join(", ")}.`:""}`:"";
  const DIF=["muy fácil","fácil","moderado","duro","intenso"];
  const difTxt=DIF[Math.max(0,Math.min(4,(prefs.dificultad||3)-1))];
  return iaText(`Eres un entrenador personal certificado y prudente, como un coach de IA que ajusta el plan según el desempeño real del usuario. ${ctxP}
${guiaOMSCtx()}
Objetivo principal: ${prefs.objetivo||prefs.goal}. Resultados que busca conseguir: ${(prefs.resultados&&prefs.resultados.length)?prefs.resultados.join(", "):"bienestar general"}. Nivel de dificultad deseado: ${difTxt}. Equipo disponible: ${prefs.equip}. Días que quiere entrenar por semana: ${prefs.dias}. Minutos por sesión: ${prefs.min}.
${contexto||""}
${historial?`HISTORIAL DE LA SEMANA ANTERIOR (usa esto para reajustar la dificultad): ${historial}`:""}

Diseña un plan SEMANAL (7 días, de lunes a domingo) realista y progresivo, con EJERCICIOS CONCRETOS (nombre, series, repeticiones o duración, descanso entre series) — no actividades genéricas en texto libre. El plan debe reflejar el objetivo principal y los resultados que busca (ej: si busca "Aliviar el estrés" o "Mejorar la calidad del sueño", incluye movilidad/respiración/cardio suave; si busca "Aumentar la fuerza", prioriza series pesadas con buen descanso). Ajusta el volumen e intensidad general al nivel de dificultad indicado (${difTxt}). Pon días de descanso o movilidad ligera en los días que no entrena (respetando los ${prefs.dias} días activos). Si el equipo es "Ninguno", usa peso corporal y elementos del hogar. Adapta a Colombia (caminar, escaleras, parque, ciclovía).
${historial?"Si el usuario cumplió casi todos los días la semana pasada, sube un poco el volumen o la dificultad. Si falló varios días, baja el volumen, acorta sesiones o simplifica — prioriza que pueda cumplir antes que exigir de más.":""}

SEGURIDAD (importante): respeta la condición de salud.
- Hipertensión: evita esfuerzos máximos y aguantar la respiración (Valsalva); prioriza aeróbico moderado.
- Diabetes: recomienda medir glucosa y tener un snack a mano.
- Si la condición es seria, hay dolor o es principiante absoluto mayor: incluye en el consejo validar con el médico antes de empezar.
No prometas resultados médicos ni de pérdida de peso garantizada.

Responde SOLO JSON sin backticks:
{"meta_semanal":"meta clara de la semana en 1 frase","consejo":"un consejo clave para cumplir el plan","ajuste":"si hay historial, 1 frase explicando qué cambiaste vs la semana pasada y por qué (si no hay historial, deja string vacío)","dias":[{"dia":"Lunes","foco":"ej: Fuerza tren superior, Cardio, Movilidad o Descanso","duracion":"X min","intensidad":"baja|media|alta","ejercicios":[{"nombre":"nombre concreto del ejercicio","series":3,"reps":"10-12 o 30s","descanso":"45s"}]}]}`);
}

function promptVoz(fuente,ctx){
  const ctxTxt=ctx?`
Contexto: hora actual ${ctx.hora}. Comidas ya registradas hoy: ${ctx.registrados&&ctx.registrados.length?ctx.registrados.join(", "):"ninguna"}.${ctx.ultimo?` La última comida registrada fue: ${ctx.ultimo}.`:""}
REGLAS para asignar "momento" cuando el usuario NO lo menciona explícitamente:
1) Si acaba de registrar una comida (última: ${ctx.ultimo||"ninguna"}) y ahora dicta uno o pocos alimentos o bebidas sueltos que suenan a complemento de esa comida (un jugo, un postre, "también comí..."), asígnalos a ese MISMO momento, para que se unan a esa comida.
2) Si no aplica lo anterior, deduce el momento por la hora actual: 05:00-10:59 Desayuno, 11:00-15:59 Almuerzo, 18:00-23:59 Cena.
3) Usa "Merienda" SOLO si el usuario lo dice explícitamente o si por la hora (16:00-17:59, madrugada) es claramente un snack entre comidas.
`:"";
  return `El usuario dictó por voz lo que hizo hoy. Extrae lo registrable. ${fuente}${ctxTxt}
Identifica: comidas (con su momento Desayuno/Almuerzo/Cena/Merienda y los alimentos), ejercicio (tipo, minutos, intensidad) y vasos de agua. Alimentos en español colombiano. Si algo no se menciona: comidas=[], ejercicio=null, agua_vasos=null.

IMPORTANTE sobre los alimentos: extrae CADA alimento mencionado en el texto, sin omitir ninguno y sin resumir a "los principales". Trata cada ítem distinto como un alimento separado en la lista, aunque el usuario los mencione rápido, con muletillas, o de forma coloquial (ej. "unos huevos con arepa y jugo" son 3 alimentos: huevo, arepa, jugo). Si el mismo alimento aparece dos veces en el texto, inclúyelo una sola vez.

OJO: el texto viene de un reconocedor de voz y puede traer alimentos mal transcritos, cortados o sin tilde. Corrige cada alimento al nombre REAL más cercano de un alimento en español colombiano (ej: "sag" o "sagu" → "sagú", "guanabana" → "guanábana", "aguacat" → "aguacate"). Además, el reconocedor a veces transcribe un alimento como OTRO alimento real que suena parecido: si el resultado es un alimento inusual o incoherente con el contexto de una comida casera colombiana pero existe uno mucho más común y frecuente en Colombia que suena casi igual, usa el común. Ejemplo típico: "almeja" o "almeja verde" en un almuerzo casero es casi siempre "alverja" (arveja); "sopa de mariscos" en cambio sí haría plausible "almeja". Solo corrige cuando la palabra suene claramente parecida; nunca inventes alimentos que no se parezcan a lo dictado.

Además, REVISA la transcripción: si corregiste algún alimento respecto a lo que decía literalmente el texto dictado (por corte, tilde o confusión fonética), repórtalo en "correcciones" y menciónalo brevemente en "respuesta" para que el usuario confirme (ej: "...anoté alverja, que creo que era lo que dijiste donde entendí almeja"). Si no corregiste nada, "correcciones" es [].

Responde SOLO JSON sin backticks:
{"transcripcion":"lo que dictó el usuario tal cual (si vino en audio, tu transcripción fiel)","comidas":[{"momento":"Desayuno","alimentos":["arepa","huevo"]}],"ejercicio":{"tipo":"Caminar","minutos":30,"intensidad":"media"},"agua_vasos":null,"correcciones":[{"escuchado":"almeja verde","interpretado":"alverja verde"}],"respuesta":"confirmación corta y cálida que repita EXACTAMENTE la lista de alimentos que entendiste (mencionando las correcciones si las hubo), para que el usuario pueda notar si algo faltó"}`;
}

async function interpretarVoz(texto,ctx){return iaText(promptVoz(`Texto dictado: "${texto}".`,ctx));}
async function interpretarVozAudio(audioB64,mime,ctx){return iaAudio(promptVoz(`El dictado del usuario viene en el AUDIO adjunto (español con acento colombiano). Escúchalo con atención, transcríbelo fielmente e inclúyelo en el campo "transcripcion"; usa esa transcripción como el texto dictado.`,ctx),audioB64,mime);}

function promptCorregir(fuente,pend){
  return `El usuario está confirmando POR VOZ un registro de salud que aún NO se ha guardado. Registro pendiente: ${JSON.stringify({comidas:pend.comidas||[],ejercicio:pend.ejercicio||null,agua_vasos:pend.agua_vasos||null})}.
${fuente}
Decide la acción:
- Si dice que está bien, listo, guarda, correcto, perfecto → accion "guardar".
- Si dice cancela, olvídalo, borra todo, no guardes → accion "cancelar".
- Si pide agregar, quitar o cambiar alimentos, ejercicio o agua (ej: "falta la pera", "también comí arroz", "quita el tomate", "no era pollo sino carne", "fueron 3 vasos") → accion "actualizar" y devuelve el registro COMPLETO ya corregido, manteniendo intacto todo lo que no pidió cambiar. Alimentos en español colombiano.
- Si menciona alimentos nuevos sin decir momento, agrégalos a la comida ya presente en el registro pendiente.
- Si el audio no contiene voz clara, está en silencio o no se entiende → accion "nada" (no cambies el registro) y en respuesta pide amablemente que repita.
- El texto viene de un reconocedor de voz: corrige alimentos mal transcritos o cortados al nombre real más cercano en español colombiano (ej: "sag"/"sagu" → "sagú", "guanabana" → "guanábana"), y ten en cuenta que a veces transcribe un alimento como otro que suena parecido (ej: "almeja" en comida casera es casi siempre "alverja"/arveja). Si el usuario dice que un alimento quedó mal escrito (ej: "no es almeja, es alverja"), reemplázalo por el correcto — incluso si lo que el reconocedor te entrega de esa corrección vuelve a sonar al alimento equivocado, entiende la intención por contexto.

Responde SOLO JSON sin backticks:
{"accion":"guardar|cancelar|actualizar|nada","transcripcion":"lo que dijo el usuario tal cual (si vino en audio, tu transcripción fiel)","comidas":[{"momento":"Desayuno","alimentos":["papaya","banano"]}],"ejercicio":null,"agua_vasos":null,"respuesta":"si actualizaste: confirmación corta repitiendo la lista COMPLETA actualizada; si guardar/cancelar: frase corta de cierre; si nada: pide amablemente que repita"}`;
}

async function corregirVoz(texto,pend){return iaText(promptCorregir(`El usuario acaba de decir: "${texto}".`,pend));}
async function corregirVozAudio(audioB64,mime,pend){return iaAudio(promptCorregir(`La respuesta del usuario viene en el AUDIO adjunto (español con acento colombiano). Escúchala, transcríbela fielmente en "transcripcion" y decide la acción a partir de ella.`,pend),audioB64,mime);}

async function analisisSemanal(datos,hp){
  const ctxP=hp?`Perfil: ${hp.edad} años${hp.sexo?`, sexo ${hp.sexo}`:""}${(hp.talla&&hp.peso)?`, IMC ${(Number(hp.peso)/((Number(hp.talla)/100)**2)).toFixed(1)}`:""}${(hp.cintura&&hp.cadera)?`, índice cintura-cadera ${(Number(hp.cintura)/Number(hp.cadera)).toFixed(2)}`:""}, actividad "${hp.ejercicio}", condición "${hp.enfermedad}".${hp.tipo_dieta?` Dieta: ${hp.tipo_dieta}.`:""}${(hp.alergias&&hp.alergias.length)?` ALERGIAS (nunca recomendar estos alimentos): ${hp.alergias.join(", ")}.`:""}`:"";
  return iaText(`Eres un coach de salud integral, cálido y realista. ${ctxP}
${guiaOMSCtx()}
Datos de la última semana del usuario (todo lo que registró):
- Alimentación: ${datos.comida}
- Sueño: ${datos.sueno}
- Ejercicio: ${datos.ejercicio}
- Hidratación: ${datos.agua}

Analiza de forma integral su energía y vitalidad. Da sugerencias CONCRETAS de cambio de hábitos y CONECTA las áreas entre sí (ej: dormir mejor mejora el rendimiento en el ejercicio; hidratarse y comer mejor sube la energía). Motivador, sin alarmismo ni diagnósticos médicos.

Responde SOLO JSON sin backticks:
{"resumen":"2-3 oraciones sobre su energía y vitalidad esta semana","energia":75,"habitos":[{"area":"Nutrición|Sueño|Ejercicio|Hidratación","cambio":"sugerencia concreta y accionable"}],"mensaje":"frase corta motivadora"}`);
}

async function analisisDia(datos,hp){
  const ctxP=hp?`Perfil: ${hp.edad} años${hp.sexo?`, sexo ${hp.sexo}`:""}${(hp.talla&&hp.peso)?`, IMC ${(Number(hp.peso)/((Number(hp.talla)/100)**2)).toFixed(1)}`:""}${(hp.cintura&&hp.cadera)?`, índice cintura-cadera ${(Number(hp.cintura)/Number(hp.cadera)).toFixed(2)}`:""}, actividad "${hp.ejercicio}", condición "${hp.enfermedad}".${hp.tipo_dieta?` Dieta: ${hp.tipo_dieta}.`:""}${(hp.alergias&&hp.alergias.length)?` ALERGIAS (nunca recomendar estos alimentos): ${hp.alergias.join(", ")}.`:""}`:"";
  return iaText(`Eres un nutricionista y coach de salud cálido, cercano y directo. ${ctxP}
${guiaOMSCtx()}
Esto es lo que el usuario registró el ${datos.dia}:
- Comidas: ${datos.comida}
- Hidratación: ${datos.agua}
- Ejercicio: ${datos.ejercicio}
- Sueño: ${datos.sueno}

Analiza qué le faltó ese día (ej: verduras, proteína, agua, actividad física) y da sugerencias concretas y accionables para hoy. Tono cercano tipo "Ayer notamos que...", motivador, sin diagnósticos médicos ni alarmismo.

Responde SOLO JSON sin backticks:
{"resumen":"1-2 oraciones sobre cómo estuvo ese día en general","faltantes":["cosas concretas que faltaron ese día, máx 4"],"sugerencias":["2-3 sugerencias accionables y concretas para hoy"]}`);
}

async function analisisMes(datos,hp){
  const ctxP=hp?`Perfil: ${hp.edad} años${hp.sexo?`, sexo ${hp.sexo}`:""}${(hp.talla&&hp.peso)?`, IMC ${(Number(hp.peso)/((Number(hp.talla)/100)**2)).toFixed(1)}`:""}${(hp.cintura&&hp.cadera)?`, índice cintura-cadera ${(Number(hp.cintura)/Number(hp.cadera)).toFixed(2)}`:""}, actividad "${hp.ejercicio}", condición "${hp.enfermedad}".${hp.tipo_dieta?` Dieta: ${hp.tipo_dieta}.`:""}${(hp.alergias&&hp.alergias.length)?` ALERGIAS (nunca recomendar estos alimentos): ${hp.alergias.join(", ")}.`:""}`:"";
  return iaText(`Eres un nutricionista y coach de salud cálido y directo, hablando con el usuario al iniciar un nuevo mes. ${ctxP}
${guiaOMSCtx()}
Esto es lo que el usuario registró durante ${datos.mes}:
- Nutrición: ${datos.nutricion}
- Hidratación: ${datos.hidratacion}
- Ejercicio: ${datos.ejercicio}
- Sueño: ${datos.sueno}
- Peso: ${datos.peso}
- Índice cintura-cadera: ${datos.icc||"sin datos"}
${datos.mesAnterior?`Comparación con el mes anterior: ${datos.mesAnterior}`:""}

Resume cómo le fue ese mes en los 4 pilares, qué le faltó, y da 2-3 metas concretas y alcanzables para el mes que empieza. Si hay datos de peso de al menos 2 mediciones, comenta la tendencia con cautela (sin diagnosticar ni prometer resultados) — si el peso no se movió o falta un segundo dato, dilo con naturalidad e invita a registrar el peso seguido para poder verlo con claridad. Si hay medición de índice cintura-cadera, coméntala con la misma cautela usando los umbrales de referencia de la OMS (0.90 hombres, 0.85 mujeres) como orientación, nunca como diagnóstico. Si hay mejora respecto al mes anterior en cualquier pilar, celébrala explícitamente. Tono cercano, motivador, sin diagnósticos médicos.

Responde SOLO JSON sin backticks:
{"resumen":"2-3 oraciones sobre cómo estuvo el mes en general","faltantes":["cosas concretas que faltaron ese mes, máx 4"],"metas":["2-3 metas concretas y alcanzables para el próximo mes"]}`);
}


async function corregirFoto(detectados,correccion){
  return iaText(`Detecté estos alimentos en una foto: ${detectados.join(", ")||"ninguno"}.
El usuario corrige por voz: "${correccion}".
Aplica su corrección: cambia, agrega o quita alimentos según lo que dijo, y mantén los que no menciona. Nombres en español colombiano.
Responde SOLO JSON sin backticks:
{"alimentos":[{"nombre":"...","porcion":"Xg","confianza":"alta","alternativa":"segunda opción o null"}],"respuesta":"confirmación corta y cálida de lo que corregiste"}`);
}

const sk=(p,k)=>`vt_${p}_${k}`;
const isoHoy=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;};
const esCOfromISO=(iso)=>{if(!iso)return iso;const [y,m,d]=iso.split("-").map(Number);return `${d}/${m}/${y}`;};
const isoFromEsCO=(ds)=>{if(typeof ds!=="string")return isoHoy();const p=ds.split("/");if(p.length!==3)return isoHoy();const [d,m,y]=p.map(Number);return `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;};

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
function HealthScreen({perfil,user,token,onComplete}){
  const [edad,setEdad]=useState("");const [peso,setPeso]=useState("");const [talla,setTalla]=useState("");const [sexo,setSexo]=useState("");const [cintura,setCintura]=useState("");const [cadera,setCadera]=useState("");const [ejercicio,setEjercicio]=useState("");const [enf,setEnf]=useState("");const [otra,setOtra]=useState("");const [loading,setLoading]=useState(false);const [err,setErr]=useState("");
  const EJERCICIOS=[{e:"🛋️ Sedentario",d:"Poca o ninguna actividad"},{e:"🚶 Caminata",d:"Menos de 3 veces/semana"},{e:"🏃 Activo",d:"3-4 veces por semana"},{e:"💪 Intenso",d:"Diario o competitivo"}];
  const ENFERMEDADES=["Ninguna","Diabetes","Hipertensión","Colesterol alto","Hipotiroidismo","Gastritis","Otra"];
  const SEXOS=["Femenino","Masculino","Prefiero no decirlo"];
  const normTalla=v=>{const n=+v;if(!v||isNaN(n)||n<=0)return 0;return n<3?Math.round(n*100):n;};
  const tallaN=normTalla(talla);
  const save=async()=>{
    if(!edad||+edad<1||+edad>110){setErr("Ingresa una edad válida");return;}
    if(!peso||+peso<20||+peso>300){setErr("Ingresa un peso válido (kg)");return;}
    if(!tallaN||tallaN<100||tallaN>250){setErr("Ingresa una talla válida: es tu estatura, ej: 170 (o 1.70)");return;}
    if(!sexo){setErr("Selecciona una opción");return;}
    if(cintura&&(+cintura<40||+cintura>200)){setErr("Ingresa una medida de cintura válida (cm)");return;}
    if(cadera&&(+cadera<40||+cadera>200)){setErr("Ingresa una medida de cadera válida (cm)");return;}
    if(!ejercicio){setErr("Selecciona tu nivel de actividad");return;}
    if(!enf){setErr("Selecciona una opción");return;}
    setLoading(true);
    const e2=enf==="Otra"?(otra||"Otra condición"):enf;
    if(user&&token){
      try{await fetch(`${SB_URL}/rest/v1/health_profiles`,{method:"POST",headers:{apikey:SB_ANON,Authorization:`Bearer ${token}`,"Content-Type":"application/json",Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({patient_id:user.id,edad:Number(edad),peso_kg:Number(peso),talla_cm:tallaN,sexo,cintura_cm:cintura?Number(cintura):null,cadera_cm:cadera?Number(cadera):null,condicion:e2,actividad:ejercicio})});}catch(_){}
      try{await fetch(`${SB_URL}/rest/v1/weight_logs`,{method:"POST",headers:{apikey:SB_ANON,Authorization:`Bearer ${token}`,"Content-Type":"application/json",Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({patient_id:user.id,fecha:isoHoy(),peso_kg:Number(peso)})});}catch(_){}
    }
    localStorage.setItem(sk(perfil,"perfil_salud"),JSON.stringify({edad,peso,talla:String(tallaN),sexo,cintura,cadera,ejercicio,enfermedad:e2}));
    setLoading(false);onComplete({edad,peso,talla:String(tallaN),sexo,cintura,cadera,ejercicio,enfermedad:e2});
  };
  return(
    <div style={{minHeight:"100vh",background:"#F8F7FE",fontFamily:"'Segoe UI',system-ui,sans-serif",overflowY:"auto"}}>
      <div style={{background:"linear-gradient(160deg,#6D5BD0,#8B7BE8)",padding:"40px 24px 50px",textAlign:"center"}}>
        <div style={{fontSize:44,marginBottom:10}}>🩺</div>
        <div style={{color:"#fff",fontSize:22,fontWeight:900}}>Tu perfil de salud</div>
        <div style={{color:"rgba(255,255,255,.75)",fontSize:13,marginTop:4}}>Hola <b>{perfil}</b> — personalizamos tus recomendaciones</div>
      </div>
      <div style={{padding:"0 16px 24px",marginTop:-20}}>
        {/* Edad y peso */}
        <div style={{display:"flex",gap:12,marginBottom:12}}>
          <div style={{flex:1,background:"#fff",borderRadius:20,padding:18,boxShadow:"0 4px 20px rgba(0,0,0,0.06)"}}>
            <div style={{color:"#6D5BD0",fontSize:12,fontWeight:800,marginBottom:10,textTransform:"uppercase",letterSpacing:1}}>Edad</div>
            <input type="number" value={edad} onChange={e=>{setEdad(e.target.value);setErr("");}} placeholder="Ej: 32"
              style={{width:"100%",padding:"14px",borderRadius:12,border:"2px solid #EFEDFC",background:"#F8F7FE",color:"#1A1A1A",fontSize:22,fontWeight:800,outline:"none",boxSizing:"border-box",textAlign:"center"}}/>
          </div>
          <div style={{flex:1,background:"#fff",borderRadius:20,padding:18,boxShadow:"0 4px 20px rgba(0,0,0,0.06)"}}>
            <div style={{color:"#6D5BD0",fontSize:12,fontWeight:800,marginBottom:10,textTransform:"uppercase",letterSpacing:1}}>Peso (kg)</div>
            <input type="number" value={peso} onChange={e=>{setPeso(e.target.value);setErr("");}} placeholder="Ej: 70"
              style={{width:"100%",padding:"14px",borderRadius:12,border:"2px solid #EFEDFC",background:"#F8F7FE",color:"#1A1A1A",fontSize:22,fontWeight:800,outline:"none",boxSizing:"border-box",textAlign:"center"}}/>
          </div>
        </div>
        {/* Talla y sexo */}
        <div style={{display:"flex",gap:12,marginBottom:12}}>
          <div style={{flex:1,background:"#fff",borderRadius:20,padding:18,boxShadow:"0 4px 20px rgba(0,0,0,0.06)"}}>
            <div style={{color:"#6D5BD0",fontSize:12,fontWeight:800,marginBottom:10,textTransform:"uppercase",letterSpacing:1}}>Talla / Estatura (cm)</div>
            <input type="number" value={talla} onChange={e=>{setTalla(e.target.value);setErr("");}} placeholder="Ej: 170"
              style={{width:"100%",padding:"14px",borderRadius:12,border:`2px solid ${talla&&(tallaN<100||tallaN>250)?"#E53935":"#EFEDFC"}`,background:"#F8F7FE",color:"#1A1A1A",fontSize:22,fontWeight:800,outline:"none",boxSizing:"border-box",textAlign:"center"}}/>
            {talla&&(tallaN<100||tallaN>250)&&(
              <div style={{fontSize:10,color:"#E53935",marginTop:6,fontWeight:700,textAlign:"center"}}>⚠️ La talla es tu estatura. Ej: 170 (o 1.70)</div>
            )}
            {talla&&+talla>0&&+talla<3&&tallaN>=100&&tallaN<=250&&(
              <div style={{fontSize:10,color:"#3DAE5A",marginTop:6,fontWeight:700,textAlign:"center"}}>✓ Se guardará como {tallaN} cm</div>
            )}
          </div>
          <div style={{flex:1,background:"#fff",borderRadius:20,padding:18,boxShadow:"0 4px 20px rgba(0,0,0,0.06)",display:"flex",flexDirection:"column",justifyContent:"center"}}>
            {peso&&tallaN>=100&&tallaN<=250?(()=>{
              const imc=Number(peso)/((tallaN/100)**2);
              return(<>
                <div style={{color:"#6D5BD0",fontSize:12,fontWeight:800,marginBottom:6,textTransform:"uppercase",letterSpacing:1}}>Tu IMC</div>
                <div style={{fontSize:22,fontWeight:800,color:"#1A1A1A"}}>{imc.toFixed(1)}</div>
                <div style={{fontSize:10,color:"#999",marginTop:2}}>Se calcula solo con tu peso y talla</div>
              </>);
            })():(
              <div style={{fontSize:11,color:"#aaa",textAlign:"center"}}>Ingresa peso y talla para ver tu IMC</div>
            )}
          </div>
        </div>
        {/* Sexo */}
        <div style={{background:"#fff",borderRadius:20,padding:18,marginBottom:12,boxShadow:"0 4px 20px rgba(0,0,0,0.06)"}}>
          <div style={{color:"#6D5BD0",fontSize:12,fontWeight:800,marginBottom:10,textTransform:"uppercase",letterSpacing:1}}>Sexo biológico <span style={{fontWeight:400,textTransform:"none",letterSpacing:0}}>(para calcular mejor tus necesidades)</span></div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {SEXOS.map(s=>(
              <button key={s} onClick={()=>{setSexo(s);setErr("");}} style={{padding:"9px 16px",borderRadius:20,border:`2px solid ${sexo===s?"#6D5BD0":"#EFEDFC"}`,background:sexo===s?"#6D5BD0":"#F8F7FE",color:sexo===s?"#fff":"#555",fontSize:13,cursor:"pointer",fontWeight:sexo===s?800:400,transition:"all .15s"}}>{s}</button>
            ))}
          </div>
        </div>
        {/* Índice cintura-cadera */}
        <div style={{background:"#fff",borderRadius:20,padding:18,marginBottom:12,boxShadow:"0 4px 20px rgba(0,0,0,0.06)"}}>
          <div style={{color:"#6D5BD0",fontSize:12,fontWeight:800,marginBottom:4,textTransform:"uppercase",letterSpacing:1}}>Índice cintura-cadera <span style={{fontWeight:400,textTransform:"none",letterSpacing:0}}>(opcional)</span></div>
          <div style={{fontSize:11.5,color:"#888",lineHeight:1.5,marginBottom:12}}>
            📏 <b>Cintura:</b> mide en el punto más angosto del abdomen (usualmente a la altura del ombligo), sin apretar la cinta, al terminar de exhalar.<br/>
            📏 <b>Cadera:</b> mide en el punto más ancho de tus caderas/glúteos.
          </div>
          <div style={{display:"flex",gap:12}}>
            <div style={{flex:1}}>
              <div style={{fontSize:11,color:"#999",marginBottom:6,fontWeight:700}}>Cintura (cm)</div>
              <input type="number" value={cintura} onChange={e=>{setCintura(e.target.value);setErr("");}} placeholder="Ej: 85"
                style={{width:"100%",padding:"12px",borderRadius:12,border:"2px solid #EFEDFC",background:"#F8F7FE",color:"#1A1A1A",fontSize:18,fontWeight:800,outline:"none",boxSizing:"border-box",textAlign:"center"}}/>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:11,color:"#999",marginBottom:6,fontWeight:700}}>Cadera (cm)</div>
              <input type="number" value={cadera} onChange={e=>{setCadera(e.target.value);setErr("");}} placeholder="Ej: 100"
                style={{width:"100%",padding:"12px",borderRadius:12,border:"2px solid #EFEDFC",background:"#F8F7FE",color:"#1A1A1A",fontSize:18,fontWeight:800,outline:"none",boxSizing:"border-box",textAlign:"center"}}/>
            </div>
          </div>
          {cintura&&cadera&&+cadera>0&&(()=>{
            const icc=Number(cintura)/Number(cadera);
            const umbral=sexo==="Femenino"?0.85:sexo==="Masculino"?0.90:null;
            const riesgo=umbral!=null?(icc>=umbral):null;
            return(
              <div style={{marginTop:12,padding:"12px 14px",borderRadius:12,background:riesgo===true?"#FEECEC":"#F0EDFC"}}>
                <div style={{fontSize:12,color:"#6D5BD0",fontWeight:700,marginBottom:2}}>Tu índice cintura-cadera: <span style={{fontSize:16,fontWeight:900}}>{icc.toFixed(2)}</span></div>
                {umbral!=null&&<div style={{fontSize:10.5,color:riesgo?"#C0392B":"#5B8A6B"}}>Según la OMS, {sexo==="Femenino"?"0.85":"0.90"} es el umbral de referencia para {sexo.toLowerCase()}s. Esto es orientativo, no un diagnóstico — coméntalo con tu médico.</div>}
              </div>
            );
          })()}
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

// ══ ÍCONOS DE HÁBITOS (resumen semanal) ═════════════════════════════
function IconoHabito({tipo}){
  const CFG={
    nutricion:{bg:"#E5F5E9",fg:"#3DAE5A"},
    hidratacion:{bg:"#DDF1FA",fg:"#3DAEE6"},
    ejercicio:{bg:"#FCEEDB",fg:"#E9A23B"},
    sueno:{bg:"#EDEAFB",fg:"#6D5BD0"},
  };
  const c=CFG[tipo];
  return (
    <div style={{width:34,height:34,borderRadius:"50%",background:c.bg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
      <svg width="18" height="18" viewBox="0 0 24 24">
        {tipo==="nutricion"&&(<g transform="rotate(45 12 12)"><ellipse cx="12" cy="12" rx="9" ry="5" fill={c.fg}/><line x1="4" y1="12" x2="20" y2="12" stroke={c.bg} strokeWidth="1.4"/></g>)}
        {tipo==="hidratacion"&&(<path d="M12 2C12 2 4 12.5 4 17a8 8 0 0 0 16 0C20 12.5 12 2 12 2Z" fill={c.fg}/>)}
        {tipo==="ejercicio"&&(<>
          <rect x="1" y="9" width="2.5" height="6" rx="1" fill={c.fg}/>
          <rect x="20.5" y="9" width="2.5" height="6" rx="1" fill={c.fg}/>
          <rect x="3" y="10" width="4" height="4" rx="1" fill={c.fg}/>
          <rect x="17" y="10" width="4" height="4" rx="1" fill={c.fg}/>
          <rect x="7" y="11" width="10" height="2" fill={c.fg}/>
        </>)}
        {tipo==="sueno"&&(<>
          <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" fill={c.fg}/>
          <circle cx="19" cy="5" r="1.1" fill={c.fg}/>
          <circle cx="16" cy="3" r="0.7" fill={c.fg}/>
        </>)}
      </svg>
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
  const [step,setStep]=useState(0);
  const [mealPrompt,setMealPrompt]=useState(null);
  const [selected,setSelected]=useState([]);
  const [catOpen,setCatOpen]=useState(null);
  const [saving,setSaving]=useState(false);
  const [savedMsg,setSavedMsg]=useState("");
  const [water,setWater]=useState(0);
  const [waterLog,setWaterLog]=useState([]);
  const [waterHist,setWaterHist]=useState({});
  const [diaSel,setDiaSel]=useState(6);
  const [recordatorio,setRecordatorio]=useState(null);
  const [chequeoMensual,setChequeoMensual]=useState(null);
  const [pesoNuevo,setPesoNuevo]=useState("");
  const [cinturaNueva,setCinturaNueva]=useState("");
  const [caderaNueva,setCaderaNueva]=useState("");
  const [pesoHist,setPesoHist]=useState([]);
  const [prefsIA,setPrefsIA]=useState(null);
  const [pushEstado,setPushEstado]=useState("desconocido");
  const [pushBusy,setPushBusy]=useState(false);
  const waterSyncTimer=useRef(null);
  const [mesSel,setMesSel]=useState(4);
  const [dayAI,setDayAI]=useState({});
  const [planDiaAbierto,setPlanDiaAbierto]=useState(null);
  const [dayAiLoadingId,setDayAiLoadingId]=useState(null);
  const dayAiBusyRef=useRef(false);
  const [monthAI,setMonthAI]=useState({});
  const monthAiBusyRef=useRef(false);
  const [micPos,setMicPos]=useState(()=>{try{return JSON.parse(localStorage.getItem("vt_mic_pos")||"null")||{x:0,y:0};}catch(_){return {x:0,y:0};}});
  const micDrag=useRef({dragging:false,startX:0,startY:0,origX:0,origY:0,moved:false});
  const [containerMl,setContainerMl]=useState(250);
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
  const [exObjetivo,setExObjetivo]=useState("Estar en forma y sentirte saludable");
  const [exResultados,setExResultados]=useState([]);
  const [exDificultad,setExDificultad]=useState(3);
  const [exSeccion,setExSeccion]=useState("plan");
  const [exFormAbierto,setExFormAbierto]=useState(false);
  const [exDiaAbierto,setExDiaAbierto]=useState(null);
  const [exPlan,setExPlan]=useState(null);
  const [exDone,setExDone]=useState([]);
  const [exLog,setExLog]=useState([]);
  const [exType,setExType]=useState("Caminar");
  const [exLogMin,setExLogMin]=useState(30);
  const [exInt,setExInt]=useState("media");
  const [caminataActiva,setCaminataActiva]=useState(false);
  const [caminataTiempo,setCaminataTiempo]=useState(0);
  const [caminataDist,setCaminataDist]=useState(0);
  const [caminataErr,setCaminataErr]=useState("");
  const [caminataResumen,setCaminataResumen]=useState(null);
  const caminataWatchId=useRef(null);
  const caminataTimerRef=useRef(null);
  const caminataMapaRef=useRef(null);
  const caminataMapaDivRef=useRef(null);
  const caminataLineaRef=useRef(null);
  const caminataMarcadorRef=useRef(null);
  const caminataPuntosRef=useRef([]);
  const caminataLeafletListo=useRef(false);
  const [exAnalyzing,setExAnalyzing]=useState(false);
  const [exMsg,setExMsg]=useState("");
  const [listening,setListening]=useState(false);
  const [voiceText,setVoiceText]=useState("");
  const [voiceBusy,setVoiceBusy]=useState(false);
  const [voiceResult,setVoiceResult]=useState(null);
  const [voicePending,setVoicePendingState]=useState(null);
  const voicePendingRef=useRef(null);
  const setVoicePending=(v)=>{voicePendingRef.current=v;setVoicePendingState(v);};
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
      else setShowHF(true);
      const qf=localStorage.getItem(sk(saved,"quick_foods"));if(qf)setQuickFoods(JSON.parse(qf));
    }
  },[]);

  const syncWaterLog=async(fechaISO,vasos)=>{
    if(!user||!token)return;
    try{
      await fetch(`${SB_URL}/rest/v1/water_logs`,{method:"POST",headers:{apikey:SB_ANON,Authorization:`Bearer ${token}`,"Content-Type":"application/json",Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({patient_id:user.id,fecha:fechaISO,vasos})});
    }catch(_){}
  };
  const syncSleepLog=async(rec)=>{
    if(!user||!token)return;
    try{
      const fechaISO=isoFromEsCO(rec.date);
      await fetch(`${SB_URL}/rest/v1/sleep_logs?patient_id=eq.${user.id}&fecha=eq.${fechaISO}`,{method:"DELETE",headers:{apikey:SB_ANON,Authorization:`Bearer ${token}`}});
      await fetch(`${SB_URL}/rest/v1/sleep_logs`,{method:"POST",headers:{apikey:SB_ANON,Authorization:`Bearer ${token}`,"Content-Type":"application/json",Prefer:"return=minimal"},body:JSON.stringify({patient_id:user.id,fecha:fechaISO,bed:rec.bed||null,wake:rec.wake||null,hours:rec.hours,quality:rec.quality||null,awakenings:rec.awakenings!=null?rec.awakenings:null,measured:!!rec.measured,note:rec.note||null})});
    }catch(_){}
  };
  const syncMealLog=async(rec)=>{
    if(!user||!token)return false;
    try{
      const r=await fetch(`${SB_URL}/rest/v1/meals`,{method:"POST",headers:{apikey:SB_ANON,Authorization:`Bearer ${token}`,"Content-Type":"application/json",Prefer:"return=minimal"},body:JSON.stringify({patient_id:user.id,fecha:isoFromEsCO(rec.fecha),momento:rec.comida,alimentos:rec.alimentos,score_total:rec.score_total,score_inmunidad:rec.score_inmunidad,score_energia:rec.score_energia,score_concentracion:rec.score_concentracion,score_vitalidad:rec.score_vitalidad,semaforo:rec.semaforo||null,calorias_aprox:rec.calorias_aprox||null,recomendacion:rec.notas||null})});
      return r.ok;
    }catch(_){return false;}
  };
  const syncExerciseLog=async(rec)=>{
    if(!user||!token)return;
    try{
      await fetch(`${SB_URL}/rest/v1/exercise_logs`,{method:"POST",headers:{apikey:SB_ANON,Authorization:`Bearer ${token}`,"Content-Type":"application/json",Prefer:"return=minimal"},body:JSON.stringify({patient_id:user.id,fecha:isoFromEsCO(rec.date),tipo:rec.tipo,min:rec.min,intensidad:rec.intensidad,km:rec.km||null,calorias:rec.calorias||null,ritmo:rec.ritmoTxt||null})});
    }catch(_){}
  };
  useEffect(()=>{
    if(!user||!token)return;
    (async()=>{
      try{
        const rWL=await fetch(`${SB_URL}/rest/v1/water_logs?patient_id=eq.${user.id}&select=fecha,vasos&order=fecha.desc&limit=400`,{headers:{apikey:SB_ANON,Authorization:`Bearer ${token}`}});
        const wl=await rWL.json();
        if(Array.isArray(wl)&&wl.length){
          const hoyISO=isoHoy();
          const wh={};
          wl.forEach(row=>{const ds=esCOfromISO(row.fecha);if(row.fecha!==hoyISO&&row.vasos!=null)wh[ds]=row.vasos;});
          setWaterHist(wh);
          const hoyRow=wl.find(row=>row.fecha===hoyISO);
          if(hoyRow&&hoyRow.vasos!=null)setWater(hoyRow.vasos);
        }
      }catch(_){}
      try{
        const rSL=await fetch(`${SB_URL}/rest/v1/sleep_logs?patient_id=eq.${user.id}&select=*&order=fecha.desc&limit=60`,{headers:{apikey:SB_ANON,Authorization:`Bearer ${token}`}});
        const sl=await rSL.json();
        if(Array.isArray(sl)&&sl.length){
          const n=sl.map(row=>({date:esCOfromISO(row.fecha),bed:row.bed,wake:row.wake,hours:row.hours,quality:row.quality,awakenings:row.awakenings,measured:row.measured,note:row.note}));
          setSleepLog(n);
        }
      }catch(_){}
      try{
        const rEL=await fetch(`${SB_URL}/rest/v1/exercise_logs?patient_id=eq.${user.id}&select=*&order=created_at.desc&limit=200`,{headers:{apikey:SB_ANON,Authorization:`Bearer ${token}`}});
        const el=await rEL.json();
        if(Array.isArray(el)&&el.length){
          const n=el.map(row=>({date:esCOfromISO(row.fecha),ts:new Date(row.created_at).getTime(),tipo:row.tipo,min:row.min,intensidad:row.intensidad,km:row.km||undefined,calorias:row.calorias||undefined,ritmoTxt:row.ritmo||undefined}));
          setExLog(n);
        }
      }catch(_){}
      try{
        const rHP=await fetch(`${SB_URL}/rest/v1/health_profiles?patient_id=eq.${user.id}&select=*`,{headers:{apikey:SB_ANON,Authorization:`Bearer ${token}`}});
        const hpRows=await rHP.json();
        if(Array.isArray(hpRows)&&hpRows.length){
          const row=hpRows[0];
          const h2={edad:row.edad,peso:row.peso_kg,talla:row.talla_cm,sexo:row.sexo,cintura:row.cintura_cm,cadera:row.cadera_cm,ejercicio:row.actividad,enfermedad:row.condicion};
          setHp(h2);setShowHF(false);
          if(perfil)localStorage.setItem(sk(perfil,"perfil_salud"),JSON.stringify(h2));
        }
      }catch(_){}
      try{
        const rW=await fetch(`${SB_URL}/rest/v1/weight_logs?patient_id=eq.${user.id}&select=*&order=fecha.desc&limit=24`,{headers:{apikey:SB_ANON,Authorization:`Bearer ${token}`}});
        const wRows=await rW.json();
        if(Array.isArray(wRows))setPesoHist(wRows);
      }catch(_){}
      try{
        const rP=await fetch(`${SB_URL}/rest/v1/preferences?user_id=eq.${user.id}&select=tipo_dieta,alergias,alimentos_no_gustan`,{headers:{apikey:SB_ANON,Authorization:`Bearer ${token}`}});
        const pRows=await rP.json();
        if(Array.isArray(pRows)&&pRows.length)setPrefsIA(pRows[0]);
      }catch(_){}
      try{
        const rG=await fetch(`${SB_URL}/rest/v1/ai_guidelines?id=eq.oms&select=contenido`,{headers:{apikey:SB_ANON,Authorization:`Bearer ${token}`}});
        const gRows=await rG.json();
        if(Array.isArray(gRows)&&gRows.length&&gRows[0].contenido)GUIA_OMS=gRows[0].contenido;
      }catch(_){}
    })();
  },[user,token]);

  useEffect(()=>{
    if(!perfil)return;
    const k=sk(perfil,"water"),d=sk(perfil,"water_date"),today=new Date().toLocaleDateString("es-CO");
    let wh={};try{wh=JSON.parse(localStorage.getItem(sk(perfil,"water_history"))||"{}");}catch(_){}
    if(localStorage.getItem(d)===today){
      const g=parseInt(localStorage.getItem(k)||"0");setWater(g);
      let lg=[];try{lg=JSON.parse(localStorage.getItem(sk(perfil,"waterlog"))||"[]");}catch(_){}
      if((!lg||!lg.length)&&g>0)lg=Array.from({length:g}).map((_,i)=>({t:Date.now()-i*300000,ml:GLASS_ML}));
      setWaterLog(lg);
    }
    else{
      const prevDate=localStorage.getItem(d);
      const prevG=parseInt(localStorage.getItem(k)||"0");
      if(prevDate&&prevG>0){wh={...wh,[prevDate]:prevG};localStorage.setItem(sk(perfil,"water_history"),JSON.stringify(wh));syncWaterLog(isoFromEsCO(prevDate),prevG);}
      setWater(0);setWaterLog([]);localStorage.setItem(k,"0");localStorage.setItem(sk(perfil,"waterlog"),"[]");localStorage.setItem(d,today);
    }
    setWaterHist(wh);
    let dai={};try{dai=JSON.parse(localStorage.getItem(sk(perfil,"day_ai"))||"{}");}catch(_){}
    setDayAI(dai);
    let mai={};try{mai=JSON.parse(localStorage.getItem(sk(perfil,"month_ai"))||"{}");}catch(_){}
    setMonthAI(mai);
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
    if(!user||!token)return;
    setLoadingHist(true);
    (async()=>{
      try{
        const r=await fetch(`${SB_URL}/rest/v1/meals?patient_id=eq.${user.id}&select=*&order=created_at.desc&limit=300`,{headers:{apikey:SB_ANON,Authorization:`Bearer ${token}`}});
        const rows=await r.json();
        const _seen=new Set();
        const mapped=Array.isArray(rows)?rows.filter(row=>{const k=`${row.fecha}|${row.momento}`;if(_seen.has(k))return false;_seen.add(k);return true;}).map(row=>({fecha:esCOfromISO(row.fecha),comida:row.momento,alimentos:row.alimentos,score_total:row.score_total,score_inmunidad:row.score_inmunidad,score_energia:row.score_energia,score_concentracion:row.score_concentracion,score_vitalidad:row.score_vitalidad,notas:row.recomendacion})):[];
        setHistory(mapped);
      }catch(_){}
      setLoadingHist(false);
    })();
  },[user,token]);

  const scores=calcScores(selected);
  const _nrecs=history.filter(r=>r&&r.score_total!=null&&r.score_total!=="").slice(0,14);
  const _avg=(k)=>{const v=_nrecs.filter(r=>r[k]!=null&&r[k]!=="");return v.length?Math.round(v.reduce((a,r)=>a+(Number(r[k])||0),0)/v.length):0;};
  const eatScore=_nrecs.length?{total:_avg("score_total"),immunity:_avg("score_inmunidad"),energy:_avg("score_energia"),focus:_avg("score_concentracion"),vitality:_avg("score_vitalidad"),n:_nrecs.length}:null;
  const scoreView=eatScore||scores;
  const today=new Date().toLocaleDateString("es-CO");
  const hpConDieta=hp?{...hp,tipo_dieta:prefsIA?.tipo_dieta,alergias:prefsIA?.alergias}:hp;
  const nivel=getNivel(streak,history.length);
  const waterPct=Math.min(100,(water/WATER_GOAL)*100);
  const waterMl=waterLog.reduce((a,d)=>a+(d.ml||0),0);
  const waterGoalMl=WATER_GOAL*GLASS_ML;
  const waterMlPct=Math.min(100,(waterMl/waterGoalMl)*100);

  const semanaData=(()=>{
    const pct=v=>Math.max(0,Math.min(100,Math.round(v)));
    const fechaMatch=(f,ds)=>f===ds||(typeof f==="string"&&f.split("T")[0]===ds);
    const DIAS=["D","L","M","M","J","V","S"];
    const DIAS_FULL=["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
    const semana=Array.from({length:7}).map((_,i)=>{
      const dt=new Date(Date.now()-(6-i)*864e5);
      return {ds:dt.toLocaleDateString("es-CO"),lbl:DIAS[dt.getDay()],full:DIAS_FULL[dt.getDay()]};
    });
    const nutriDias=semana.map(w=>{
      const ms=history.filter(r=>fechaMatch(r.fecha,w.ds));
      return ms.length?pct(ms.reduce((a,r)=>a+(r.score_total||0),0)/3):null;
    });
    const ejerDias=semana.map(w=>pct(exLog.filter(e=>e.date===w.ds).reduce((a,e)=>a+(e.min||0),0)/30*100));
    const aguaDias=semana.map(w=>{
      if(w.ds===today)return pct(water/WATER_GOAL*100);
      if(waterHist[w.ds]!=null)return pct(waterHist[w.ds]/WATER_GOAL*100);
      return null;
    });
    const suenoDias=semana.map(w=>{
      const e=sleepLog.find(s=>s.date===w.ds);
      return e?pct((e.hours||0)/8*100):null;
    });
    const avgOf=arr=>{const v=arr.filter(x=>x!=null);return v.length?Math.round(v.reduce((a,b)=>a+b,0)/v.length):0;};
    const pNutri=avgOf(nutriDias),pAgua=avgOf(aguaDias),pEjer=avgOf(ejerDias),pSueno=avgOf(suenoDias);
    const semanaProm=Math.round((pNutri+pAgua+pEjer+pSueno)/4);
    const diasConDato=semana.map((w,i)=>{
      const vals=[nutriDias[i],aguaDias[i],ejerDias[i],suenoDias[i]].filter(v=>v!=null);
      return vals.length?Math.round(vals.reduce((a,b)=>a+b,0)/vals.length):null;
    });
    return {semana,nutriDias,ejerDias,aguaDias,suenoDias,pNutri,pAgua,pEjer,pSueno,semanaProm,diasConDato};
  })();
  const datosDelDia=(ds)=>{
    const fechaMatch=f=>f===ds||(typeof f==="string"&&f.split("T")[0]===ds);
    const comidas=history.filter(r=>fechaMatch(r.fecha));
    const comidaTxt=comidas.length?comidas.map(r=>{let f=[];try{f=JSON.parse(typeof r.alimentos==="string"?r.alimentos:JSON.stringify(r.alimentos||[]));}catch(_){}return `${r.comida}: ${(Array.isArray(f)?f:[]).map(x=>typeof x==="object"?x.name:x).join(", ")}`;}).join(" | "):"sin registros de comida";
    const aguaVal=ds===today?water:(waterHist[ds]!=null?waterHist[ds]:null);
    const aguaTxt=aguaVal!=null?`${aguaVal} de ${WATER_GOAL} vasos`:"sin registro de hidratación";
    const ejerMin=exLog.filter(e=>e.date===ds).reduce((a,e)=>a+(e.min||0),0);
    const ejercicioTxt=ejerMin>0?`${ejerMin} min de actividad`:"sin actividad física registrada";
    const sleepE=sleepLog.find(s=>s.date===ds);
    const suenoTxt=sleepE?`${sleepE.hours} horas`:"sin registro de sueño";
    return {comidas,comidaTxt,aguaTxt,ejercicioTxt,suenoTxt};
  };
  const generarAnalisisDia=async(ds,label)=>{
    if(dayAiBusyRef.current||dayAI[ds])return;
    dayAiBusyRef.current=true;setDayAiLoadingId(ds);
    try{
      const dd=datosDelDia(ds);
      const r=await analisisDia({dia:label||ds,comida:dd.comidaTxt,agua:dd.aguaTxt,ejercicio:dd.ejercicioTxt,sueno:dd.suenoTxt},hpConDieta);
      setDayAI(prev=>{const n={...prev,[ds]:r};try{localStorage.setItem(sk(perfil,"day_ai"),JSON.stringify(n));}catch(_){}return n;});
    }catch(_){/* si falla, se reintenta la próxima vez que abra la app */}
    dayAiBusyRef.current=false;setDayAiLoadingId(null);
  };
  useEffect(()=>{
    if(!perfil)return;
    (async()=>{
      const hoyDs=today;
      const dateKeyToTs=ds=>{
        if(typeof ds!=="string")return 0;
        const p=ds.split("/");
        if(p.length===3){const [d,m,y]=p.map(Number);return new Date(y,m-1,d).getTime();}
        const t=Date.parse(ds);return isNaN(t)?0:t;
      };
      const fechaKey=f=>(typeof f==="string"&&f.includes("T"))?f.split("T")[0]:f;
      const dias=new Set();
      history.forEach(r=>{const f=fechaKey(r.fecha);if(f&&f!==hoyDs)dias.add(f);});
      exLog.forEach(e=>{if(e.date&&e.date!==hoyDs)dias.add(e.date);});
      sleepLog.forEach(s=>{if(s.date&&s.date!==hoyDs)dias.add(s.date);});
      Object.keys(waterHist).forEach(ds=>{if(ds!==hoyDs)dias.add(ds);});
      const limite=Date.now()-14*864e5;
      const pendientes=[...dias]
        .filter(ds=>dateKeyToTs(ds)>=limite)
        .filter(ds=>!dayAI[ds])
        .sort((a,b)=>dateKeyToTs(a)-dateKeyToTs(b));
      const ayerDs=new Date(Date.now()-864e5).toLocaleDateString("es-CO");
      for(const ds of pendientes.slice(0,5)){
        const label=ds===ayerDs?"día de ayer":ds;
        await generarAnalisisDia(ds,label);
      }
    })();
  // eslint-disable-next-line
  },[perfil,history.length,exLog.length,sleepLog.length,waterHist]);

  const MESES_CORTO=["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  const MESES_LARGO=["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  const mesData=(()=>{
    const pct=v=>Math.max(0,Math.min(100,Math.round(v)));
    const parseDs=ds=>{
      if(typeof ds!=="string")return null;
      const p=ds.split("/");
      if(p.length===3){const [d,m,y]=p.map(Number);return {d,m:m-1,y};}
      const t=new Date(ds);return isNaN(t)?null:{d:t.getDate(),m:t.getMonth(),y:t.getFullYear()};
    };
    const now=new Date();
    const meses=Array.from({length:6}).map((_,i)=>{
      const dt=new Date(now.getFullYear(),now.getMonth()-(5-i),1);
      return {y:dt.getFullYear(),m:dt.getMonth(),key:`${dt.getFullYear()}-${dt.getMonth()}`,lbl:MESES_CORTO[dt.getMonth()]};
    });
    const enMes=(ds,mes)=>{const p=parseDs(ds);return p&&p.y===mes.y&&p.m===mes.m;};
    const nutriMes=meses.map(mes=>{
      const ms=history.filter(r=>enMes(typeof r.fecha==="string"&&r.fecha.includes("T")?r.fecha.split("T")[0]:r.fecha,mes));
      if(!ms.length)return null;
      const dt2=new Date(mes.y,mes.m+1,0);
      const diasEnMes2=(mes.y===now.getFullYear()&&mes.m===now.getMonth())?now.getDate():dt2.getDate();
      return pct(ms.reduce((a,r)=>a+(r.score_total||0),0)/(3*diasEnMes2));
    });
    const aguaMes=meses.map(mes=>{
      const dias=Object.keys(waterHist).filter(ds=>enMes(ds,mes)).map(ds=>waterHist[ds]);
      if(today){const p=parseDs(today);if(p&&p.y===mes.y&&p.m===mes.m)dias.push(water);}
      return dias.length?pct(dias.reduce((a,v)=>a+v,0)/dias.length/WATER_GOAL*100):null;
    });
    const ejerMes=meses.map(mes=>{
      const dt=new Date(mes.y,mes.m+1,0);
      const diasEnMes=(mes.y===now.getFullYear()&&mes.m===now.getMonth())?now.getDate():dt.getDate();
      const mins=exLog.filter(e=>enMes(e.date,mes)).reduce((a,e)=>a+(e.min||0),0);
      return pct(mins/(30*diasEnMes)*100);
    });
    const suenoMes=meses.map(mes=>{
      const ns=sleepLog.filter(s=>enMes(s.date,mes));
      return ns.length?pct(ns.reduce((a,s)=>a+((s.hours||0)/8*100),0)/ns.length):null;
    });
    const avgOf=arr=>{const v=arr.filter(x=>x!=null);return v.length?Math.round(v.reduce((a,b)=>a+b,0)/v.length):0;};
    return {meses,nutriMes,aguaMes,ejerMes,suenoMes,
      actualIdx:5,
      promActual:Math.round((avgOf([nutriMes[5]])+avgOf([aguaMes[5]])+ejerMes[5]+avgOf([suenoMes[5]]))/4)};
  })();
  const datosDelMes=(mes)=>{
    const parseDs=ds=>{
      if(typeof ds!=="string")return null;
      const p=ds.split("/");
      if(p.length===3){const [d,m,y]=p.map(Number);return {d,m:m-1,y};}
      const t=new Date(ds);return isNaN(t)?null:{d:t.getDate(),m:t.getMonth(),y:t.getFullYear()};
    };
    const enMes=ds=>{const p=parseDs(ds);return p&&p.y===mes.y&&p.m===mes.m;};
    const comidas=history.filter(r=>enMes(typeof r.fecha==="string"&&r.fecha.includes("T")?r.fecha.split("T")[0]:r.fecha));
    const nutricion=comidas.length?`${comidas.length} comidas registradas, score promedio ${Math.round(comidas.reduce((a,r)=>a+(r.score_total||0),0)/comidas.length)}%`:"sin registros de comida";
    const diasAgua=Object.keys(waterHist).filter(enMes);
    const hidratacion=diasAgua.length?`meta cumplida ${diasAgua.filter(d=>waterHist[d]>=WATER_GOAL).length} de ${diasAgua.length} días registrados`:"sin registros de hidratación";
    const minsEj=exLog.filter(e=>enMes(e.date)).reduce((a,e)=>a+(e.min||0),0);
    const ejercicio=minsEj>0?`${minsEj} min totales en el mes`:"sin actividad física registrada";
    const nochesS=sleepLog.filter(s=>enMes(s.date));
    const sueno=nochesS.length?`promedio ${Math.round(nochesS.reduce((a,s)=>a+(s.hours||0),0)/nochesS.length*10)/10}h en ${nochesS.length} noches registradas`:"sin registros de sueño";
    const mesISO=`${mes.y}-${String(mes.m+1).padStart(2,"0")}`;
    const pesosMes=pesoHist.filter(w=>w.fecha&&w.fecha.startsWith(mesISO)).sort((a,b)=>a.fecha.localeCompare(b.fecha));
    let peso="sin registro de peso este mes";
    if(pesosMes.length>=2){
      const dif=Math.round((pesosMes[pesosMes.length-1].peso_kg-pesosMes[0].peso_kg)*10)/10;
      peso=`de ${pesosMes[0].peso_kg}kg a ${pesosMes[pesosMes.length-1].peso_kg}kg (${dif>0?"+":""}${dif}kg en el mes)`;
    }else if(pesosMes.length===1){
      peso=`${pesosMes[0].peso_kg}kg registrado este mes (sin un segundo dato para ver tendencia)`;
    }
    const iccMes=pesosMes.filter(w=>w.cintura_cm&&w.cadera_cm&&Number(w.cadera_cm)>0).map(w=>({fecha:w.fecha,icc:Number(w.cintura_cm)/Number(w.cadera_cm)}));
    let icc="sin medidas de cintura-cadera este mes";
    if(iccMes.length>=2){
      icc=`ICC de ${iccMes[0].icc.toFixed(2)} a ${iccMes[iccMes.length-1].icc.toFixed(2)} en el mes`;
    }else if(iccMes.length===1){
      icc=`ICC ${iccMes[0].icc.toFixed(2)} registrado este mes`;
    }else if(hp&&hp.cintura&&hp.cadera&&Number(hp.cadera)>0){
      icc=`ICC actual del perfil: ${(Number(hp.cintura)/Number(hp.cadera)).toFixed(2)} (sin nueva medición este mes)`;
    }
    return {nutricion,hidratacion,ejercicio,sueno,peso,icc};
  };
  const generarAnalisisMes=async(key,mes,mesAnteriorTxt)=>{
    if(monthAiBusyRef.current||monthAI[key])return;
    monthAiBusyRef.current=true;
    try{
      const dd=datosDelMes(mes);
      const r=await analisisMes({mes:MESES_LARGO[mes.m],...dd,mesAnterior:mesAnteriorTxt},hpConDieta);
      setMonthAI(prev=>{const n={...prev,[key]:r};try{localStorage.setItem(sk(perfil,"month_ai"),JSON.stringify(n));}catch(_){}return n;});
    }catch(_){}
    monthAiBusyRef.current=false;
  };
  useEffect(()=>{
    if("serviceWorker" in navigator){
      navigator.serviceWorker.register("./sw.js").catch(()=>{});
      if("Notification" in window)setPushEstado(Notification.permission);
    }
  },[]);
  const activarPush=async()=>{
    if(!user||!token){setPushEstado("error");return;}
    if(!("serviceWorker" in navigator)||!("PushManager" in window)){setPushEstado("no_soportado");return;}
    setPushBusy(true);
    try{
      const permiso=await Notification.requestPermission();
      setPushEstado(permiso);
      if(permiso!=="granted"){setPushBusy(false);return;}
      const reg=await navigator.serviceWorker.ready;
      let sub=await reg.pushManager.getSubscription();
      if(!sub){sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:urlBase64ToUint8Array(VAPID_PUBLIC_KEY)});}
      const j=sub.toJSON();
      await fetch(`${SB_URL}/rest/v1/push_subscriptions`,{method:"POST",headers:{apikey:SB_ANON,Authorization:`Bearer ${token}`,"Content-Type":"application/json",Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({patient_id:user.id,endpoint:j.endpoint,p256dh:j.keys.p256dh,auth:j.keys.auth})});
      setPushEstado("activo");
    }catch(_){setPushEstado("error");}
    setPushBusy(false);
  };

  useEffect(()=>{
    if(!perfil)return;
    const revisar=()=>{
      const h=new Date().getHours();
      const yaVisto=k=>localStorage.getItem(sk(perfil,`rec_${k}_${today}`))==="1";
      const marcar=k=>localStorage.setItem(sk(perfil,`rec_${k}_${today}`),"1");
      const comidaHoy=lb=>history.some(r=>r.fecha===today&&r.comida===lb);
      const ejercicioHoy=exLog.some(e=>e.date===today);
      const candidatos=[
        {k:"agua",cond:h>=10&&water===0,icon:"💧",msg:"Aún no has tomado agua hoy. ¡Un vasito te vendría bien!",accion:()=>setTab(4),negLabel:"No he tomado agua"},
        {k:"desayuno",cond:h>=10&&!comidaHoy("Desayuno"),icon:"☀️",msg:"No veo registrado tu desayuno de hoy. ¿Ya comiste algo?",accion:()=>irAComida(0),negLabel:"No desayuné"},
        {k:"almuerzo",cond:h>=14&&!comidaHoy("Almuerzo"),icon:"🍽️",msg:"Todavía no registras tu almuerzo. No te lo saltes.",accion:()=>irAComida(1),negLabel:"No almorcé"},
        {k:"ejercicio",cond:h>=18&&!ejercicioHoy,icon:"💪",msg:"Hoy no has registrado actividad física. ¿Una caminata corta?",accion:()=>setTab(6),negLabel:"No hice ejercicio"},
        {k:"cena",cond:h>=20&&!comidaHoy("Cena"),icon:"🌙",msg:"No has registrado la cena de hoy.",accion:()=>irAComida(2),negLabel:"No cené"},
      ];
      const pendiente=candidatos.find(c=>c.cond&&!yaVisto(c.k));
      if(pendiente){setRecordatorio(pendiente);marcar(pendiente.k);}
    };
    const t=setTimeout(revisar,4000);
    const iv=setInterval(revisar,5*60*1000);
    return()=>{clearTimeout(t);clearInterval(iv);};
  },[perfil,water,history.length,exLog.length,tab]);

  useEffect(()=>{
    if(!perfil||!hp)return;
    const yaVistoMes=localStorage.getItem(sk(perfil,"chequeo_peso_"+new Date().toISOString().slice(0,7)));
    if(yaVistoMes)return;
    const ultimoRegistro=pesoHist[0];
    const diasDesde=ultimoRegistro?Math.floor((Date.now()-new Date(ultimoRegistro.fecha).getTime())/864e5):9999;
    if(diasDesde>=30){
      const t=setTimeout(()=>{
        setPesoNuevo(hp.peso||"");
        setCinturaNueva(hp.cintura||"");
        setCaderaNueva(hp.cadera||"");
        setChequeoMensual({pesoAnterior:ultimoRegistro?ultimoRegistro.peso_kg:(hp.peso?Number(hp.peso):null)});
      },6000);
      return()=>clearTimeout(t);
    }
  // eslint-disable-next-line
  },[perfil,hp,pesoHist.length]);

  const guardarChequeoMensual=async()=>{
    const p=Number(pesoNuevo);
    if(!p||p<20||p>300)return;
    const ci=(Number(cinturaNueva)>=40&&Number(cinturaNueva)<=200)?Number(cinturaNueva):null;
    const ca=(Number(caderaNueva)>=40&&Number(caderaNueva)<=200)?Number(caderaNueva):null;
    const hoyISO=isoHoy();
    if(user&&token){
      try{
        const body1={patient_id:user.id,fecha:hoyISO,peso_kg:p};
        if(ci)body1.cintura_cm=ci;if(ca)body1.cadera_cm=ca;
        const r=await fetch(`${SB_URL}/rest/v1/weight_logs`,{method:"POST",headers:{apikey:SB_ANON,Authorization:`Bearer ${token}`,"Content-Type":"application/json",Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify(body1)});
        if(!r.ok&&(ci||ca)){await fetch(`${SB_URL}/rest/v1/weight_logs`,{method:"POST",headers:{apikey:SB_ANON,Authorization:`Bearer ${token}`,"Content-Type":"application/json",Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({patient_id:user.id,fecha:hoyISO,peso_kg:p})});}
      }catch(_){}
      try{
        const hpBody={patient_id:user.id,peso_kg:p};
        if(ci)hpBody.cintura_cm=ci;if(ca)hpBody.cadera_cm=ca;
        await fetch(`${SB_URL}/rest/v1/health_profiles`,{method:"POST",headers:{apikey:SB_ANON,Authorization:`Bearer ${token}`,"Content-Type":"application/json",Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify(hpBody)});
      }catch(_){}
    }
    setPesoHist(prev=>[{fecha:hoyISO,peso_kg:p,cintura_cm:ci,cadera_cm:ca},...prev]);
    const h2={...hp,peso:String(p)};
    if(ci)h2.cintura=String(ci);if(ca)h2.cadera=String(ca);
    setHp(h2);
    if(perfil)localStorage.setItem(sk(perfil,"perfil_salud"),JSON.stringify(h2));
    localStorage.setItem(sk(perfil,"chequeo_peso_"+new Date().toISOString().slice(0,7)),"1");
    setChequeoMensual(null);
  };

  useEffect(()=>{
    if(!perfil)return;
    const now=new Date();
    const mesAnt=new Date(now.getFullYear(),now.getMonth()-1,1);
    const key=`${mesAnt.getFullYear()}-${mesAnt.getMonth()}`;
    const mes={y:mesAnt.getFullYear(),m:mesAnt.getMonth()};
    const enMes=ds=>{
      if(typeof ds!=="string")return false;
      const f=ds.includes("T")?ds.split("T")[0]:ds;
      const p=f.split("/");
      return p.length===3&&Number(p[2])===mes.y&&Number(p[1])-1===mes.m;
    };
    const tieneComida=history.some(r=>enMes(r.fecha));
    const tieneEjercicio=exLog.some(e=>enMes(e.date));
    const tieneSueno=sleepLog.some(s=>enMes(s.date));
    const tieneAgua=Object.keys(waterHist).some(enMes);
    const tieneRegistros=tieneComida||tieneEjercicio||tieneSueno||tieneAgua;
    if(tieneRegistros&&!monthAI[key])generarAnalisisMes(key,mes,null);
  // eslint-disable-next-line
  },[perfil,history.length,exLog.length,sleepLog.length,waterHist]);

  // Estos 3 "return" van AQUÍ (después de todos los hooks de arriba) y no antes,
  // para que React siempre llame la misma cantidad de hooks en cada render.
  if(!perfil)return <ProfileScreen onEnter={p=>{setPerfil(p);setShowHF(true);}}/>;
  if(showHF&&!hp)return <HealthScreen perfil={perfil} user={user} token={token} onComplete={h=>{setHp(h);setShowHF(false);}}/>;
  if(prefsEditor) return <OnboardingPreferences user={user} token={token} onDone={()=>{setPrefsEditor(false);setTab(0);}}/>;

  const recomendacionDia=(tipo,v)=>{
    if(v==null)return "Sin datos registrados este día.";
    const M={
      nutricion:[v>=70?"¡Excelente alimentación! 🌟":v>=40?"Buena base, suma más variedad de alimentos.":"Registra tus comidas para mejorar tu nutrición."],
      hidratacion:[v>=70?"Cumpliste tu meta de hidratación 💧":v>=40?"Vas bien, toma un poco más de agua.":"Te faltó tomar agua este día."],
      ejercicio:[v>=70?"¡Buen nivel de actividad! 💪":v>=40?"Un poco más de movimiento te vendría bien.":"No se registró actividad física."],
      sueno:[v>=70?"Dormiste muy bien 😴":v>=40?"Podrías dormir un poco más.":"Te faltó descanso este día."],
    };
    return M[tipo][0];
  };
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
    if(!analisis){try{const r=await analizarTexto(all,hpConDieta);analisis={ok:true,...r};setPhotoResult(analisis);}catch(_){}}
    try{
      const ok=await syncMealLog({fecha:today,comida:MEALS[meal].label,alimentos:all,score_total:scores.total,score_inmunidad:scores.immunity,score_energia:scores.energy,score_concentracion:scores.focus,score_vitalidad:scores.vitality,semaforo:analisis?.semaforo,calorias_aprox:analisis?.calorias_aprox,notas:analisis?.recomendacion||""});
      if(ok){
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

  const persistWaterLog=(log)=>{try{localStorage.setItem(sk(perfil,"waterlog"),JSON.stringify(log));localStorage.setItem(sk(perfil,"water_date"),today);}catch(_){}};
  const syncGlasses=(log)=>{const ml=log.reduce((a,d)=>a+(d.ml||0),0);const g=Math.round(ml/GLASS_ML);setWater(g);localStorage.setItem(sk(perfil,"water"),g);localStorage.setItem(sk(perfil,"water_date"),today);if(waterSyncTimer.current)clearTimeout(waterSyncTimer.current);waterSyncTimer.current=setTimeout(()=>syncWaterLog(isoHoy(),g),600);if(g>=WATER_GOAL)checkBadges({streak,water:g,lastScore,lastCats},history);};
  const addWater=(ml)=>{if(!ml)return;const log=[{t:Date.now(),ml},...waterLog];setWaterLog(log);persistWaterLog(log);syncGlasses(log);};
  const removeWaterAt=(i)=>{const log=waterLog.filter((_,j)=>j!==i);setWaterLog(log);persistWaterLog(log);syncGlasses(log);};
  const changeWater=d=>{if(d>0){addWater(GLASS_ML*d);}else if(d<0){const log=waterLog.slice(Math.abs(d));setWaterLog(log);persistWaterLog(log);syncGlasses(log);}};

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
  const addQuickWorkout=(tipo,min,intensidad)=>{const rec={date:today,ts:Date.now(),tipo,min,intensidad};syncExerciseLog(rec);setExLog(prev=>{const n=[rec,...prev].slice(0,120);localStorage.setItem(sk(perfil,"fit_log"),JSON.stringify(n));return n;});};
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
    syncSleepLog(rec);
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
    let historial="";
    if(exPlan&&exPlan.dias&&exPlan.dias.length){
      const activos=exPlan.dias.filter(d=>!/descanso/i.test(d.foco||""));
      const cumplidos=activos.filter((d,i)=>exDone.includes(exPlan.dias.indexOf(d))).length;
      historial=`De ${activos.length} días activos planeados la semana pasada, el usuario cumplió ${cumplidos}.`;
    }
    try{const r=await planSemana({goal:exGoal,equip:exEquip,dias:exDias,min:exMin,objetivo:exObjetivo,resultados:exResultados,dificultad:exDificultad},hp,contexto,historial);setExPlan(r);setExDone([]);setExFormAbierto(false);setExDiaAbierto(null);localStorage.setItem(sk(perfil,"fit_plan"),JSON.stringify(r));localStorage.setItem(sk(perfil,"fit_done"),"[]");}
    catch(e){setExMsg("Error: "+e.message);setTimeout(()=>setExMsg(""),3000);}
    setExAnalyzing(false);
  };
  const toggleDone=(i)=>{const n=exDone.includes(i)?exDone.filter(x=>x!==i):[...exDone,i];setExDone(n);localStorage.setItem(sk(perfil,"fit_done"),JSON.stringify(n));};
  const logWorkout=()=>{
    if(!exLogMin){setExMsg("Pon los minutos");setTimeout(()=>setExMsg(""),2000);return;}
    const rec={date:today,ts:Date.now(),tipo:exType,min:exLogMin,intensidad:exInt};
    syncExerciseLog(rec);
    const n=[rec,...exLog].slice(0,120);setExLog(n);localStorage.setItem(sk(perfil,"fit_log"),JSON.stringify(n));
    setExMsg("✓ Entrenamiento registrado");setTimeout(()=>setExMsg(""),2500);
  };

  const cargarLeaflet=()=>new Promise((resolve,reject)=>{
    if(window.L){caminataLeafletListo.current=true;resolve();return;}
    if(!document.getElementById("vt-leaflet-css")){
      const link=document.createElement("link");link.id="vt-leaflet-css";link.rel="stylesheet";link.href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";document.head.appendChild(link);
    }
    const existente=document.getElementById("vt-leaflet-js");
    if(existente){existente.addEventListener("load",()=>{caminataLeafletListo.current=true;resolve();});return;}
    const script=document.createElement("script");script.id="vt-leaflet-js";script.src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload=()=>{caminataLeafletListo.current=true;resolve();};
    script.onerror=()=>reject(new Error("No se pudo cargar el mapa"));
    document.body.appendChild(script);
  });

  const haversineKm=(a,b)=>{
    const R=6371,dLat=(b.lat-a.lat)*Math.PI/180,dLng=(b.lng-a.lng)*Math.PI/180;
    const s=Math.sin(dLat/2)**2+Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLng/2)**2;
    return R*2*Math.atan2(Math.sqrt(s),Math.sqrt(1-s));
  };

  const iniciarCaminata=async()=>{
    setCaminataErr("");setCaminataResumen(null);
    if(!navigator.geolocation){setCaminataErr("Tu navegador no soporta GPS.");return;}
    try{await cargarLeaflet();}catch(e){setCaminataErr(e.message);return;}
    caminataPuntosRef.current=[];setCaminataDist(0);setCaminataTiempo(0);
    setCaminataActiva(true);
    setTimeout(()=>{
      const L=window.L;
      if(caminataMapaDivRef.current&&!caminataMapaRef.current){
        const mapa=L.map(caminataMapaDivRef.current).setView([4.6,-74.08],16);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"© OpenStreetMap"}).addTo(mapa);
        caminataMapaRef.current=mapa;
        caminataLineaRef.current=L.polyline([],{color:"#6D5BD0",weight:5}).addTo(mapa);
      }
    },50);
    const inicioTs=Date.now();
    caminataTimerRef.current=setInterval(()=>setCaminataTiempo(Math.floor((Date.now()-inicioTs)/1000)),1000);
    caminataWatchId.current=navigator.geolocation.watchPosition(
      pos=>{
        const p={lat:pos.coords.latitude,lng:pos.coords.longitude};
        const pts=caminataPuntosRef.current;
        if(pts.length>0)setCaminataDist(d=>d+haversineKm(pts[pts.length-1],p));
        pts.push(p);
        const L=window.L,mapa=caminataMapaRef.current;
        if(L&&mapa){
          caminataLineaRef.current.addLatLng(p);
          mapa.setView(p,mapa.getZoom()<16?16:mapa.getZoom());
          if(caminataMarcadorRef.current)caminataMarcadorRef.current.setLatLng(p);
          else caminataMarcadorRef.current=L.circleMarker(p,{radius:7,color:"#6D5BD0",fillColor:"#6D5BD0",fillOpacity:1}).addTo(mapa);
        }
      },
      err=>setCaminataErr(err.code===1?"Necesito permiso de ubicación para trazar tu ruta.":"No se pudo obtener tu ubicación."),
      {enableHighAccuracy:true,maximumAge:2000,timeout:15000}
    );
  };

  const detenerCaminata=()=>{
    if(caminataWatchId.current!=null){navigator.geolocation.clearWatch(caminataWatchId.current);caminataWatchId.current=null;}
    if(caminataTimerRef.current){clearInterval(caminataTimerRef.current);caminataTimerRef.current=null;}
    const minutos=Math.max(1,Math.round(caminataTiempo/60));
    const km=Math.round(caminataDist*100)/100;
    const pesoKg=hp&&hp.peso?Number(hp.peso):70;
    const MET=3.8;
    const calorias=Math.round((MET*3.5*pesoKg/200)*minutos);
    const kmh=km/((caminataTiempo||1)/3600);
    const intensidad=kmh>=5?"alta":kmh>=3.5?"media":"baja";
    const ritmoMinKm=km>0?minutos/km:null;
    const ritmoTxt=ritmoMinKm?`${Math.floor(ritmoMinKm)}:${String(Math.round((ritmoMinKm%1)*60)).padStart(2,"0")} /km`:"—";
    const rec={date:today,ts:Date.now(),tipo:"Caminata GPS",min:minutos,intensidad,km,calorias,ritmoTxt};
    syncExerciseLog(rec);
    const n=[rec,...exLog].slice(0,120);setExLog(n);localStorage.setItem(sk(perfil,"fit_log"),JSON.stringify(n));
    setCaminataResumen({min:minutos,km,calorias,ritmoTxt});
    setCaminataActiva(false);
    if(caminataMapaRef.current){caminataMapaRef.current.remove();caminataMapaRef.current=null;caminataLineaRef.current=null;caminataMarcadorRef.current=null;}
  };

  // ── VOZ ────────────────────────────────────────────────
  const applyVoz=(p)=>{
    if(p.ejercicio&&p.ejercicio.minutos){
      const rec={date:today,ts:Date.now(),tipo:p.ejercicio.tipo||"Ejercicio",min:Number(p.ejercicio.minutos)||0,intensidad:p.ejercicio.intensidad||"media"};
      syncExerciseLog(rec);
      setExLog(prev=>{const n=[rec,...prev].slice(0,120);localStorage.setItem(sk(perfil,"fit_log"),JSON.stringify(n));return n;});
    }
    if(p.agua_vasos){const nw=Math.max(0,Math.min(12,Number(p.agua_vasos)));setWater(nw);localStorage.setItem(sk(perfil,"water"),nw);localStorage.setItem(sk(perfil,"water_date"),today);if(waterSyncTimer.current)clearTimeout(waterSyncTimer.current);waterSyncTimer.current=setTimeout(()=>syncWaterLog(isoHoy(),nw),600);}
    if(Array.isArray(p.comidas)&&p.comidas.length){
      const nuevos=[];
      p.comidas.forEach(c=>{
        const momento=c.momento||"Comida";
        const nombreDe=x=>typeof x==="object"&&x?x.name:x;
        const nuevosAlimentos=Array.isArray(c.alimentos)?c.alimentos:[];
        const existente=history.find(r=>r.fecha===today&&r.comida===momento);
        let all=nuevosAlimentos;
        if(existente){
          let prevAlimentos=[];
          try{prevAlimentos=Array.isArray(existente.alimentos)?existente.alimentos:JSON.parse(existente.alimentos||"[]");}catch(_){prevAlimentos=[];}
          const prevNombres=prevAlimentos.map(x=>String(nombreDe(x)).toLowerCase());
          const extras=nuevosAlimentos.filter(x=>!prevNombres.includes(String(nombreDe(x)).toLowerCase()));
          all=[...prevAlimentos,...extras];
        }
        const matched=FOOD_CATEGORIES.flatMap(cat=>cat.items).filter(f=>all.some(a=>f.toLowerCase().includes(String(nombreDe(a)).toLowerCase())||String(nombreDe(a)).toLowerCase().includes(f.toLowerCase())));
        const sc=calcScores(matched);
        nuevos.push({fecha:today,comida:momento,alimentos:JSON.stringify(all),score_total:sc.total,porVoz:true,_reemplazaExistente:!!existente});
        (async()=>{
          if(existente&&user&&token){
            try{await fetch(`${SB_URL}/rest/v1/meals?patient_id=eq.${user.id}&fecha=eq.${isoHoy()}&momento=eq.${encodeURIComponent(momento)}`,{method:"DELETE",headers:{apikey:SB_ANON,Authorization:`Bearer ${token}`}});}catch(_){}
          }
          syncMealLog({fecha:today,comida:momento,alimentos:all,score_total:sc.total,score_inmunidad:sc.immunity,score_energia:sc.energy,score_concentracion:sc.focus,score_vitalidad:sc.vitality,notas:""});
        })();
      });
      setHistory(prev=>{
        const sinDuplicados=prev.filter(r=>!nuevos.some(n=>n._reemplazaExistente&&n.fecha===r.fecha&&n.comida===r.comida));
        return [...nuevos,...sinDuplicados];
      });
    }
  };
  const hablar=(texto,onEnd)=>{
    try{
      if(!("speechSynthesis" in window)||!texto){if(onEnd)setTimeout(onEnd,300);return;}
      window.speechSynthesis.cancel();
      const u=new SpeechSynthesisUtterance(texto);
      u.lang="es-CO";u.rate=1;u.pitch=1;
      if(onEnd){let done=false;const fin=()=>{if(done)return;done=true;setTimeout(onEnd,300);};u.onend=fin;u.onerror=fin;setTimeout(fin,Math.min(20000,2500+texto.length*90));}
      window.speechSynthesis.speak(u);
    }catch(_){if(onEnd)setTimeout(onEnd,300);}
  };
  const VOICE_OK=/(^|\s)(listo|lista|guardar|guarda|gu[aá]rdalo|as[ií] est[aá] bien|est[aá] bien|correcto|perfecto|s[ií],? guarda)(\s|$|\.)/i;
  const VOICE_NO=/(^|\s)(cancela|cancelar|canc[eé]lalo|olv[ií]dalo|no guardes|borra todo|desc[aá]rtalo|descartar)(\s|$|\.)/i;
  const guardarPendiente=async(p)=>{
    if(!p)return;
    setVoiceBusy(true);
    applyVoz(p);
    let analisis=p.analisis||null;
    const foods=(p.comidas||[]).flatMap(c=>c.alimentos||[]);
    if(!analisis&&foods.length){try{analisis=await analizarTexto(foods,hpConDieta);}catch(_){}}
    setVoicePending(null);
    setVoiceResult({respuesta:"¡Guardado! ✅",analisis});
    hablar("¡Listo, guardado!");
    setVoiceBusy(false);
  };
  const descartarPendiente=()=>{setVoicePending(null);setVoiceResult({respuesta:"Descartado, no guardé nada."});hablar("Listo, no guardé nada.");};
  const processVoiceAudio=async(b64,mime)=>{
    setVoiceBusy(true);
    try{
      const pend=voicePendingRef.current;
      if(pend){
        const c=await corregirVozAudio(b64,mime,pend);
        if(c.transcripcion)setVoiceText(c.transcripcion);
        const t=c.transcripcion||"";
        if(c.accion==="cancelar"||VOICE_NO.test(t)){descartarPendiente();}
        else if(c.accion==="guardar"||VOICE_OK.test(t)){await guardarPendiente(pend);}
        else if(c.accion==="nada"){hablar(c.respuesta||"No te escuché bien, ¿me repites?",()=>{if(voicePendingRef.current)startVoice(true);});}
        else{
          const upd={...pend,comidas:Array.isArray(c.comidas)?c.comidas:(pend.comidas||[]),ejercicio:c.ejercicio!==undefined?c.ejercicio:pend.ejercicio,agua_vasos:c.agua_vasos!==undefined?c.agua_vasos:pend.agua_vasos,respuesta:c.respuesta,analisis:null,correcciones:[]};
          setVoicePending(upd);
          hablar((c.respuesta||"Actualizado.")+" ¿Guardo así? Di listo, o sigue corrigiendo.",()=>{if(voicePendingRef.current)startVoice(true);});
        }
      }
      else{
        const ahora=new Date();
        const hoyMeals=history.filter(r=>r.fecha===today).map(r=>r.comida);
        const p=await interpretarVozAudio(b64,mime,{hora:`${String(ahora.getHours()).padStart(2,"0")}:${String(ahora.getMinutes()).padStart(2,"0")}`,registrados:[...new Set(hoyMeals)],ultimo:hoyMeals[0]||null});
        if(p.transcripcion)setVoiceText(p.transcripcion);
        const tieneAlgo=(Array.isArray(p.comidas)&&p.comidas.length)||(p.ejercicio&&p.ejercicio.minutos)||p.agua_vasos;
        if(!tieneAlgo){
          setVoiceResult({respuesta:p.respuesta||"No entendí nada para registrar, intenta de nuevo."});
          hablar(p.respuesta||"No entendí nada para registrar, intenta de nuevo.");
        }
        else{
          setVoicePending({...p,analisis:null,textoDictado:p.transcripcion||""});
          hablar((p.respuesta||"")+" ¿Falta algo? Dime qué agrego o quito, o di listo para guardar.",()=>{if(voicePendingRef.current)startVoice(true);});
        }
      }
    }
    catch(e){setVoiceResult({respuesta:"No pude procesar el audio, intenta de nuevo."});hablar("No pude procesar el audio, intenta de nuevo.");}
    setVoiceBusy(false);
  };
  const processVoice=async(texto)=>{
    setVoiceBusy(true);
    try{
      const pend=voicePendingRef.current;
      if(pend){
        if(VOICE_NO.test(texto)){descartarPendiente();}
        else if(VOICE_OK.test(texto)){await guardarPendiente(pend);}
        else{
          const c=await corregirVoz(texto,pend);
          if(c.accion==="cancelar")descartarPendiente();
          else if(c.accion==="guardar")await guardarPendiente(pend);
          else{
            const upd={...pend,comidas:Array.isArray(c.comidas)?c.comidas:(pend.comidas||[]),ejercicio:c.ejercicio!==undefined?c.ejercicio:pend.ejercicio,agua_vasos:c.agua_vasos!==undefined?c.agua_vasos:pend.agua_vasos,respuesta:c.respuesta,analisis:null,correcciones:[]};
            setVoicePending(upd);
            hablar((c.respuesta||"Actualizado.")+" ¿Guardo así? Di listo, o sigue corrigiendo.",()=>{if(voicePendingRef.current&&!recRef.userStop)startVoice(true);});
          }
        }
      }
      else{
        const ahora=new Date();
        const hoyMeals=history.filter(r=>r.fecha===today).map(r=>r.comida);
        const p=await interpretarVoz(texto,{hora:`${String(ahora.getHours()).padStart(2,"0")}:${String(ahora.getMinutes()).padStart(2,"0")}`,registrados:[...new Set(hoyMeals)],ultimo:hoyMeals[0]||null});
        const tieneAlgo=(Array.isArray(p.comidas)&&p.comidas.length)||(p.ejercicio&&p.ejercicio.minutos)||p.agua_vasos;
        if(!tieneAlgo){
          setVoiceResult({respuesta:p.respuesta||"No entendí nada para registrar, intenta de nuevo."});
          hablar(p.respuesta||"No entendí nada para registrar, intenta de nuevo.");
        }
        else{
          setVoicePending({...p,analisis:null,textoDictado:texto});
          hablar((p.respuesta||"")+" ¿Falta algo? Dime qué agrego o quito, o di listo para guardar.",()=>{if(voicePendingRef.current&&!recRef.userStop)startVoice(true);});
        }
      }
    }
    catch(e){setVoiceResult({respuesta:"No pude procesarlo, intenta de nuevo."});hablar("No pude procesarlo, intenta de nuevo.");}
    setVoiceBusy(false);
  };
  const mediaRef=useRef({rec:null,chunks:[],stream:null,timer:null,mime:""});
  const canRecord=()=>!!(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia&&window.MediaRecorder);
  const startVoice=async(auto)=>{
    if(canRecord()){
      try{
        const stream=await navigator.mediaDevices.getUserMedia({audio:true});
        const mime=(window.MediaRecorder.isTypeSupported&&window.MediaRecorder.isTypeSupported("audio/webm"))?"audio/webm":((window.MediaRecorder.isTypeSupported&&window.MediaRecorder.isTypeSupported("audio/mp4"))?"audio/mp4":"");
        const rec=new MediaRecorder(stream,mime?{mimeType:mime}:undefined);
        mediaRef.current={rec,chunks:[],stream,timer:null,mime:rec.mimeType||mime||"audio/webm"};
        rec.ondataavailable=(e)=>{if(e.data&&e.data.size)mediaRef.current.chunks.push(e.data);};
        rec.onstop=async()=>{
          try{stream.getTracks().forEach(t=>t.stop());}catch(_){}
          if(mediaRef.current.timer){clearTimeout(mediaRef.current.timer);mediaRef.current.timer=null;}
          setListening(false);
          const blob=new Blob(mediaRef.current.chunks,{type:mediaRef.current.mime});
          mediaRef.current.chunks=[];
          if(blob.size<1500){if(!voicePendingRef.current)setVoiceResult(null);return;}
          try{const b64=await blobToB64(blob);processVoiceAudio(b64,(mediaRef.current.mime||"audio/webm").split(";")[0]);}
          catch(_){setVoiceResult({respuesta:"No pude leer el audio, intenta de nuevo."});}
        };
        setVoiceText("");if(!auto)setVoiceResult(null);setListening(true);
        rec.start();
        if(auto){mediaRef.current.timer=setTimeout(()=>{try{if(rec.state!=="inactive")rec.stop();}catch(_){}},8000);}
        return;
      }catch(err){
        if(err&&(err.name==="NotAllowedError"||err.name==="SecurityError")){setListening(false);setVoiceResult({respuesta:"Necesito permiso de micrófono para escucharte."});return;}
        /* otro error (sin MediaRecorder útil) → caemos al reconocedor de Chrome */
      }
    }
    startVoiceSR(auto);
  };
  const startVoiceSR=(auto)=>{
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){setVoiceResult({respuesta:"Tu navegador no soporta dictado. Abre la app en Chrome."});return;}
    let acc="";
    recRef.userStop=false;
    setVoiceText("");if(!auto)setVoiceResult(null);setListening(true);
    const run=()=>{
      const r=new SR();r.lang="es-CO";r.interimResults=true;r.continuous=false;r._fin="";
      recRef.current=r;
      r.onresult=(e)=>{let fin="",inter="";for(let i=0;i<e.results.length;i++){const seg=e.results[i];if(seg.isFinal)fin+=seg[0].transcript+" ";else inter=seg[0].transcript;}r._fin=fin.trim();setVoiceText((acc+" "+(fin?fin:inter)).trim());};
      r.onerror=(ev)=>{if(ev.error==="not-allowed"||ev.error==="service-not-allowed"){recRef.userStop=true;setListening(false);setVoiceResult({respuesta:"Necesito permiso de micrófono para escucharte."});}};
      r.onend=()=>{
        if(r._fin)acc=(acc+" "+r._fin).trim();
        if(auto){setListening(false);if(acc.trim())processVoice(acc.trim());return;}
        if(recRef.userStop){setListening(false);if(acc.trim())processVoice(acc.trim());else if(!voicePendingRef.current)setVoiceResult(null);}
        else{try{run();}catch(_){setListening(false);if(acc.trim())processVoice(acc.trim());}}
      };
      try{r.start();}catch(_){if(auto)setListening(false);}
    };
    run();
  };
  const stopVoice=()=>{
    const m=mediaRef.current;
    if(m&&m.rec&&m.rec.state&&m.rec.state!=="inactive"){if(m.timer){clearTimeout(m.timer);m.timer=null;}try{m.rec.stop();}catch(_){}return;}
    recRef.userStop=true;try{recRef.current&&recRef.current.stop();}catch(_){}
  };
  const mealByHour=()=>{const h=new Date().getHours();if(h<11)return 0;if(h<15)return 1;if(h<18)return 3;return 2;};
  const irAComida=(m)=>{const idx=(typeof m==="number")?m:mealByHour();setMeal(idx);setTab(0);setStep(1);setPhotoResult(null);setSavedMsg("");setMealPrompt(idx);};

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
      {mealPrompt!==null&&(
        <div onClick={()=>setMealPrompt(null)} style={{position:"fixed",inset:0,zIndex:80,background:"rgba(40,30,80,.55)",display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:"22px 22px 0 0",width:"100%",maxWidth:480,padding:"22px 20px 30px",boxShadow:"0 -8px 30px rgba(0,0,0,.25)"}}>
            <div style={{width:44,height:5,borderRadius:3,background:"#E5E1F5",margin:"0 auto 16px"}}/>
            <div style={{fontSize:34,textAlign:"center",marginBottom:6}}>{MEALS[mealPrompt]?.emoji||"🍽️"}</div>
            <div style={{fontSize:19,fontWeight:900,color:"#4A3B9E",textAlign:"center",marginBottom:4}}>{mealPrompt===0?"¿Qué desayunaste?":mealPrompt===1?"¿Qué almorzaste?":mealPrompt===2?"¿Qué cenaste?":"¿Qué merendaste?"}</div>
            <div style={{fontSize:13,color:"#888",textAlign:"center",marginBottom:20,lineHeight:1.5}}>Toca el micrófono y cuéntame; yo lo registro y lo analizo por ti.</div>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:14}}>
              <button onClick={()=>{setMealPrompt(null);startVoice();}} style={{width:82,height:82,borderRadius:"50%",border:"none",background:"linear-gradient(135deg,#6D5BD0,#8B7BE8)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",boxShadow:"0 8px 24px #6D5BD055"}}>
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="2" width="6" height="11" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><line x1="12" y1="17" x2="12" y2="21"/><line x1="8" y1="21" x2="16" y2="21"/>
                </svg>
              </button>
              <button onClick={()=>setMealPrompt(null)} style={{background:"transparent",border:"none",color:"#9990C8",fontSize:13,fontWeight:700,cursor:"pointer",textDecoration:"underline"}}>Prefiero escribirlo</button>
            </div>
          </div>
        </div>
      )}

      {tab===0&&(
        <div style={{padding:"16px 14px"}}>

          {step===0&&(<>
          {/* Accesos rápidos */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10,marginBottom:16}}>
            {[["nutricion","🥗","Nutrición",()=>irAComida(),"#3DAE5A",semanaData.nutriDias[diaSel]],["hidratacion","💧","Hidratación",()=>setTab(4),"#3DAEE6",semanaData.aguaDias[diaSel]],["ejercicio","💪","Ejercicio",()=>setTab(6),"#E76F51",semanaData.ejerDias[diaSel]],["sueno","😴","Sueño",()=>setTab(5),"#6D5BD0",semanaData.suenoDias[diaSel]]].map(([tipo,ic,lb,onClick,cl,val])=>(
              <button key={lb} onClick={onClick} style={{background:"#fff",border:"none",borderRadius:16,padding:"16px 8px",boxShadow:"0 2px 10px rgba(0,0,0,0.05)",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:6,position:"relative"}}>
                <span style={{position:"absolute",top:8,right:8,fontSize:10,fontWeight:800,color:cl,background:cl+"18",padding:"2px 7px",borderRadius:10}}>{val==null?"—":val+"%"}</span>
                <span style={{fontSize:26}}>{ic}</span>
                <span style={{fontSize:12,fontWeight:800,color:cl}}>{lb}</span>
              </button>
            ))}
          </div>

          {/* Resumen semanal */}
          <div style={{background:"#fff",borderRadius:18,padding:"18px 16px",marginBottom:16,boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div style={{fontSize:16,fontWeight:900,color:"#6D5BD0"}}>Resumen semanal</div>
              <div style={{fontSize:11,color:"#999"}}>últimos 7 días</div>
            </div>
            {(()=>{
              const d=semanaData;
              const R=46,C=2*Math.PI*R;
              const filas=[
                ["nutricion","Nutrición",d.pNutri,"#3DAE5A"],
                ["hidratacion","Hidratación",d.pAgua,"#3DAEE6"],
                ["ejercicio","Ejercicio",d.pEjer,"#E9A23B"],
                ["sueno","Sueño",d.pSueno,"#6D5BD0"],
              ];
              const filasDia=[
                ["nutricion","Nutrición",d.nutriDias[diaSel],"#3DAE5A"],
                ["hidratacion","Hidratación",d.aguaDias[diaSel],"#3DAEE6"],
                ["ejercicio","Ejercicio",d.ejerDias[diaSel],"#E9A23B"],
                ["sueno","Sueño",d.suenoDias[diaSel],"#6D5BD0"],
              ];
              return (<div>
                <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:16}}>
                  <div style={{position:"relative",width:112,height:112,flexShrink:0}}>
                    <svg width="112" height="112" viewBox="0 0 112 112">
                      <circle cx="56" cy="56" r="46" fill="none" stroke="#EDEAFB" strokeWidth="11"/>
                      <circle cx="56" cy="56" r="46" fill="none" stroke="#6D5BD0" strokeWidth="11" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C*(1-d.semanaProm/100)} transform="rotate(-90 56 56)" style={{transition:"stroke-dashoffset .6s"}}/>
                    </svg>
                    <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                      <div style={{fontSize:26,fontWeight:900,color:"#6D5BD0",lineHeight:1}}>{d.semanaProm}<span style={{fontSize:13}}>%</span></div>
                      <div style={{fontSize:10,color:"#999",marginTop:2,fontWeight:700}}>promedio</div>
                    </div>
                  </div>
                  <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",gap:12}}>
                    {filas.map(([tipo,lb,pctV,cl])=>(
                      <div key={tipo} style={{display:"flex",alignItems:"center",gap:8}}>
                        <IconoHabito tipo={tipo}/>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                            <span style={{fontSize:12,fontWeight:700,color:"#555"}}>{lb}</span>
                            <span style={{fontSize:11,fontWeight:700,color:cl}}>{pctV}%</span>
                          </div>
                          <div style={{height:7,background:"#F0EFF7",borderRadius:6,overflow:"hidden"}}>
                            <div style={{height:7,width:pctV+"%",background:cl,borderRadius:6,transition:"width .6s"}}/>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{fontSize:10,color:"#bbb",textAlign:"center",marginBottom:6}}>Toca un día para ver su detalle</div>
                <div style={{display:"flex",gap:4}}>
                  {d.semana.map((w,i)=>(
                    <button key={i} onClick={()=>setDiaSel(diaSel===i?null:i)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4,background:"none",border:"none",cursor:"pointer",padding:"2px 0"}}>
                      <span style={{fontSize:9,color:diaSel===i?"#6D5BD0":"#999",fontWeight:diaSel===i?800:500}}>{w.lbl}</span>
                      <div style={{width:"100%",height:28,display:"flex",alignItems:"flex-end"}}>
                        <div style={{width:"100%",background:diaSel===i?"#6D5BD0":"#D8D3F0",borderRadius:4,height:(d.diasConDato[i]==null?4:Math.max(6,d.diasConDato[i]*0.28))+"px",transition:"background .2s"}}/>
                      </div>
                    </button>
                  ))}
                </div>
                {diaSel!=null&&(
                <div style={{marginTop:14,paddingTop:14,borderTop:"1px solid #F0EFF7"}}>
                  <div style={{fontSize:12,fontWeight:800,color:"#6D5BD0",marginBottom:10}}>{d.semana[diaSel].ds===today?"Hoy":d.semana[diaSel].full} · cómo vas en cada pilar</div>
                  {filasDia.map(([tipo,lb,v,cl])=>(
                    <div key={tipo} style={{display:"flex",gap:8,alignItems:"flex-start",marginBottom:10}}>
                      <IconoHabito tipo={tipo}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",justifyContent:"space-between"}}>
                          <span style={{fontSize:12,fontWeight:700,color:"#555"}}>{lb}</span>
                          <span style={{fontSize:11,fontWeight:700,color:cl}}>{v==null?"sin datos":v+"%"}</span>
                        </div>
                        <div style={{fontSize:11,color:"#888",marginTop:2,lineHeight:1.4}}>{recomendacionDia(tipo,v)}</div>
                      </div>
                    </div>
                  ))}
                </div>
                )}
              </div>);
            })()}
          </div>

          </>)}

          {step===1&&(<>
          {/* Header wizard */}
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
            <button onClick={()=>{setStep(0);setMealPrompt(null);}} style={{width:38,height:38,borderRadius:12,border:"none",background:"#F0EFF7",color:"#6D5BD0",fontSize:18,cursor:"pointer",flexShrink:0}}>‹</button>
            <div style={{flex:1}}>
              <div style={{fontSize:17,fontWeight:900,color:"#4A3B9E"}}>{MEALS[meal].emoji} {MEALS[meal].label}</div>
              <div style={{fontSize:11,color:"#999"}}>Cuéntame o selecciona qué comiste</div>
            </div>
            <div style={{display:"flex",gap:5,alignItems:"center"}}>{[0,1].map(d=><span key={d} style={{width:d===0?18:7,height:7,borderRadius:4,background:d===0?"#6D5BD0":"#D8D3F0"}}/>)}</div>
          </div>

          {/* Micrófono protagonista */}
          <div style={{background:"linear-gradient(135deg,#EFEDFC,#F6F4FE)",borderRadius:18,padding:"18px 16px",marginBottom:16,border:"1.5px solid #E1DBF7",textAlign:"center"}}>
            <button onClick={listening?stopVoice:startVoice} style={{width:74,height:74,borderRadius:"50%",border:"none",background:listening?"#C1121F":"linear-gradient(135deg,#6D5BD0,#8B7BE8)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",boxShadow:listening?"0 0 0 8px rgba(193,18,31,.15)":"0 8px 22px #6D5BD055",animation:listening?"vtpulse 1.3s infinite":"none"}}>
              {listening?(
                <svg width="26" height="26" viewBox="0 0 24 24"><rect x="5" y="5" width="14" height="14" rx="2" fill="#fff"/></svg>
              ):(
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="2" width="6" height="11" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><line x1="12" y1="17" x2="12" y2="21"/><line x1="8" y1="21" x2="16" y2="21"/>
                </svg>
              )}
            </button>
            <div style={{fontSize:14,fontWeight:800,color:"#4A3B9E",marginTop:12}}>{listening?"Escuchando… habla tranquilo":"Graba lo que comiste"}</div>
            <div style={{fontSize:11,color:"#8A82B8",marginTop:3}}>{listening?"Cuando termines, toca ⏹️ y te confirmo lo que entendí":"Ej: \"desayuné huevos con arepa y jugo de naranja\""}</div>
            {voiceText&&<div style={{fontSize:13,color:"#333",marginTop:12,fontStyle:"italic",lineHeight:1.4,background:"#fff",borderRadius:12,padding:"10px 12px"}}>"{voiceText}"</div>}
            {voiceBusy&&<div style={{fontSize:12,color:"#888",marginTop:10}}>🤔 Procesando…</div>}
            {voicePending&&!voiceBusy&&(
              <div style={{marginTop:10,padding:"10px 12px",borderRadius:10,background:"#fff",border:"1.5px dashed #6D5BD0",textAlign:"left"}}>
                <div style={{fontSize:11,fontWeight:800,color:"#4A3B9E",marginBottom:6}}>📝 Por guardar — di qué agrego o quito, o di "listo"</div>
                {voicePending.textoDictado&&<div style={{fontSize:10.5,color:"#999",marginBottom:5,fontStyle:"italic"}}>🎤 Escuché: «{voicePending.textoDictado}»</div>}
                {Array.isArray(voicePending.correcciones)&&voicePending.correcciones.map((c,i)=>(
                  <div key={"ct"+i} style={{fontSize:10.5,color:"#B8860B",marginBottom:4,fontWeight:700}}>✏️ Corregí: "{c.escuchado}" → "{c.interpretado}" (dime si no era eso)</div>
                ))}
                {(voicePending.comidas||[]).map((c,i)=>(
                  <div key={i} style={{fontSize:12,color:"#333",marginBottom:3}}><b style={{color:"#6D5BD0"}}>{c.momento}:</b> {(c.alimentos||[]).join(", ")}</div>
                ))}
                {voicePending.ejercicio&&voicePending.ejercicio.minutos?<div style={{fontSize:12,color:"#333",marginBottom:3}}>🏃 {voicePending.ejercicio.tipo||"Ejercicio"} · {voicePending.ejercicio.minutos} min</div>:null}
                {voicePending.agua_vasos?<div style={{fontSize:12,color:"#333",marginBottom:3}}>💧 {voicePending.agua_vasos} vasos de agua</div>:null}
                <div style={{display:"flex",gap:8,marginTop:8}}>
                  <button onClick={()=>{recRef.userStop=true;try{recRef.current&&recRef.current.stop();}catch(_){}guardarPendiente(voicePendingRef.current);}} style={{flex:1,padding:"9px 0",borderRadius:9,border:"none",background:"#2E9E5B",color:"#fff",fontWeight:800,fontSize:12,cursor:"pointer"}}>✓ Guardar</button>
                  <button onClick={()=>{recRef.userStop=true;try{recRef.current&&recRef.current.stop();}catch(_){}descartarPendiente();}} style={{padding:"9px 14px",borderRadius:9,border:"1.5px solid #E76F51",background:"#fff",color:"#E76F51",fontWeight:800,fontSize:12,cursor:"pointer"}}>Descartar</button>
                </div>
              </div>
            )}
            {voiceResult&&voiceResult.respuesta&&<div style={{fontSize:13,color:"#6D5BD0",fontWeight:700,marginTop:10,background:"#fff",padding:"10px 12px",borderRadius:10}}>✓ {voiceResult.respuesta}</div>}
            {voiceResult&&voiceResult.analisis&&(
              <div style={{marginTop:8,padding:"10px 12px",borderRadius:10,background:"#fff",textAlign:"left",borderLeft:`4px solid ${voiceResult.analisis.semaforo==="verde"?"#2E9E5B":voiceResult.analisis.semaforo==="rojo"?"#E76F51":"#E9C46A"}`}}>
                <div style={{fontSize:12,fontWeight:800,color:"#6D5BD0",marginBottom:3}}>{voiceResult.analisis.semaforo==="verde"?"🟢":voiceResult.analisis.semaforo==="rojo"?"🔴":"🟡"} Análisis de lo que comiste</div>
                <div style={{fontSize:12,color:"#555",lineHeight:1.5}}>{voiceResult.analisis.recomendacion}</div>
              </div>
            )}
            <div style={{fontSize:11,color:"#B0A9D6",marginTop:12}}>— o selecciona manualmente abajo —</div>
          </div>

          {/* Comida — selector compacto */}
          <div style={{display:"flex",gap:6,marginBottom:16,overflowX:"auto",scrollbarWidth:"none"}}>
            {MEALS.map((m,i)=>(
              <button key={i} onClick={()=>{setMeal(i);setPhotoResult(null);setMealPrompt(i);}} style={{flex:"1 0 auto",padding:"9px 12px",borderRadius:12,border:`2px solid ${meal===i?m.color:"#EFEDFC"}`,background:meal===i?m.color:"#fff",color:meal===i?"#fff":"#666",fontSize:12,fontWeight:800,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:5,whiteSpace:"nowrap",transition:"all .2s"}}>
                <span style={{fontSize:15}}>{m.emoji}</span>{m.label}
              </button>
            ))}
          </div>

          {/* Mensaje identidad */}
          {idMsg&&<div style={{background:"#EFEDFC",borderRadius:14,padding:12,marginBottom:10,border:"1.5px solid #8B7BE844"}}><div style={{fontSize:13,color:"#6D5BD0",fontWeight:600,lineHeight:1.5}}>✨ {idMsg}</div></div>}

          </>)}
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
          <div style={{marginBottom:16}}>
            <div style={{fontSize:12,color:"#6D5BD0",fontWeight:800,marginBottom:4,textTransform:"uppercase",letterSpacing:.5}}>Progreso mensual · últimos 6 meses</div>
            <div style={{fontSize:10,color:"#bbb",marginBottom:10}}>Toca un mes para ver su detalle</div>
            {[["nutricion","Nutrición",mesData.nutriMes,"#3DAE5A"],["hidratacion","Hidratación",mesData.aguaMes,"#3DAEE6"],["ejercicio","Ejercicio",mesData.ejerMes,"#E9A23B"],["sueno","Sueño",mesData.suenoMes,"#6D5BD0"]].map(([tipo,lb,serie,cl])=>(
              <div key={tipo} style={{background:"#fff",borderRadius:16,padding:"14px 16px",marginBottom:10,boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                  <IconoHabito tipo={tipo}/>
                  <span style={{flex:1,fontSize:13,fontWeight:800,color:"#333"}}>{lb}</span>
                  <span style={{fontSize:13,fontWeight:900,color:cl}}>{serie[mesSel]==null?"—":serie[mesSel]+"%"}</span>
                </div>
                <div style={{display:"flex",gap:6,alignItems:"flex-end",height:44}}>
                  {serie.map((v,i)=>(
                    <div key={i} onClick={()=>setMesSel(i)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4,height:"100%",justifyContent:"flex-end",cursor:"pointer"}}>
                      <div style={{width:"100%",background:i===mesSel?cl:cl+"33",borderRadius:4,height:(v==null?3:Math.max(4,v*0.4))+"px",transition:"height .5s"}}/>
                    </div>
                  ))}
                </div>
                <div style={{display:"flex",gap:6,marginTop:4}}>
                  {mesData.meses.map((m,i)=>(<div key={i} onClick={()=>setMesSel(i)} style={{flex:1,textAlign:"center",fontSize:9,color:i===mesSel?cl:"#bbb",fontWeight:i===mesSel?800:500,cursor:"pointer"}}>{m.lbl}</div>))}
                </div>
              </div>
            ))}
          </div>

          {(()=>{
            const mesElegido=mesData.meses[mesSel];
            const key=mesElegido.key;
            const mes={y:mesElegido.y,m:mesElegido.m};
            const ai=monthAI[key];
            const nombreMes=MESES_LARGO[mesElegido.m];
            const esMesActual=mesSel===5;
            return (
              <div style={{background:"#fff",borderRadius:16,padding:16,marginBottom:8,boxShadow:"0 2px 12px rgba(0,0,0,0.06)",borderLeft:"5px solid #6D5BD0"}}>
                <div style={{fontSize:13,fontWeight:800,color:"#6D5BD0",marginBottom:10,textTransform:"capitalize"}}>📅 Cómo te fue en {nombreMes}</div>
                {esMesActual?(
                  <p style={{fontSize:12,color:"#888"}}>Este mes sigue en curso — el análisis de {nombreMes} se genera cuando el mes termine.</p>
                ):ai?(
                  <div>
                    <div style={{fontSize:13,color:"#444",lineHeight:1.5,marginBottom:10}}>{ai.resumen}</div>
                    {ai.faltantes&&ai.faltantes.length>0&&(
                      <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:10}}>
                        {ai.faltantes.map((x,i)=><span key={i} style={{fontSize:10,padding:"3px 9px",borderRadius:20,background:"#FEECEC",color:"#C0392B",fontWeight:600}}>Te faltó: {x}</span>)}
                      </div>
                    )}
                    <div style={{fontSize:11,fontWeight:800,color:"#5B49C0",marginBottom:6,textTransform:"uppercase",letterSpacing:.5}}>Metas para este mes</div>
                    {(ai.metas||[]).map((s,i)=>(
                      <div key={i} style={{fontSize:12,color:"#5B49C0",background:"#EFEDFC",borderRadius:10,padding:"8px 10px",marginBottom:6,lineHeight:1.4}}>🎯 {s}</div>
                    ))}
                  </div>
                ):(
                  <div>
                    <p style={{fontSize:12,color:"#888",marginBottom:10}}>Aún no se ha generado el análisis de {nombreMes}.</p>
                    <button onClick={()=>generarAnalisisMes(key,mes,null)} style={{width:"100%",padding:"10px",borderRadius:10,border:"1.5px solid #6D5BD0",background:"#fff",color:"#6D5BD0",fontWeight:800,fontSize:12,cursor:"pointer"}}>✨ Analizar {nombreMes} con IA</button>
                  </div>
                )}
              </div>
            );
          })()}
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
          <div style={{fontSize:13,color:"#888",marginBottom:16}}>Meta: {waterGoalMl} ml · Hoy: {waterMl} ml · {Math.round(waterMlPct)}%</div>

          {/* Botella de hidratación */}
          <div style={{background:"#fff",borderRadius:20,padding:"22px 20px",marginBottom:14,boxShadow:"0 4px 20px rgba(0,0,0,0.08)"}}>
            <div style={{textAlign:"center",marginBottom:2}}>
              <span style={{fontSize:32,fontWeight:900,color:"#4A3B9E"}}>{waterMl}</span>
              <span style={{fontSize:18,fontWeight:700,color:"#B0A9D6"}}> / {waterGoalMl}</span>
              <span style={{fontSize:14,color:"#B0A9D6",fontWeight:700}}> ml</span>
            </div>

            <div style={{display:"flex",justifyContent:"center",margin:"4px 0"}}>
              <svg width="118" height="168" viewBox="0 0 120 170">
                <defs>
                  <linearGradient id="vtwater" x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0%" stopColor="#6D5BD0"/><stop offset="100%" stopColor="#9C8CF0"/>
                  </linearGradient>
                  <clipPath id="vtbottle"><path d="M42 34 h36 v10 q0 6 6 10 q14 8 14 30 v42 q0 20 -20 20 h-36 q-20 0 -20 -20 v-42 q0 -22 14 -30 q6 -4 6 -10 z"/></clipPath>
                </defs>
                <rect x="48" y="16" width="24" height="16" rx="4" fill="#C9C0F0"/>
                <g clipPath="url(#vtbottle)">
                  <rect x="16" y="34" width="88" height="122" fill="#F1EFFC"/>
                  <rect x="16" y={156-(122*waterMlPct/100)} width="88" height={122*waterMlPct/100} fill="url(#vtwater)" style={{transition:"y .5s,height .5s"}}/>
                </g>
                <path d="M42 34 h36 v10 q0 6 6 10 q14 8 14 30 v42 q0 20 -20 20 h-36 q-20 0 -20 -20 v-42 q0 -22 14 -30 q6 -4 6 -10 z" fill="none" stroke="#D8D2F2" strokeWidth="3"/>
                <text x="60" y="106" textAnchor="middle" fontSize="21" fontWeight="900" fill={waterMlPct>48?"#fff":"#6D5BD0"}>{Math.round(waterMlPct)}%</text>
              </svg>
            </div>

            {/* Selector de recipiente */}
            <div style={{display:"flex",gap:7,justifyContent:"center",marginBottom:14,flexWrap:"wrap"}}>
              {[{ml:250,l:"Vaso",e:"🥛"},{ml:500,l:"Botella",e:"🍶"},{ml:750,l:"Termo",e:"🧴"}].map(c=>(
                <button key={c.ml} onClick={()=>setContainerMl(c.ml)} style={{padding:"8px 12px",borderRadius:14,border:`2px solid ${containerMl===c.ml?"#6D5BD0":"#EFEDFC"}`,background:containerMl===c.ml?"#EFEDFC":"#fff",color:containerMl===c.ml?"#4A3B9E":"#999",fontSize:12,fontWeight:800,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:1,minWidth:62}}>
                  <span style={{fontSize:17}}>{c.e}</span>{c.l}<span style={{fontSize:10,color:"#B0A9D6"}}>{c.ml} ml</span>
                </button>
              ))}
            </div>

            {/* − cantidad + */}
            <div style={{display:"flex",gap:14,justifyContent:"center",alignItems:"center"}}>
              <button onClick={()=>changeWater(-1)} disabled={!waterLog.length} style={{width:52,height:52,borderRadius:"50%",border:"2px solid #E8E4F5",background:"#F8F7FE",color:waterLog.length?"#6D5BD0":"#D8D2F2",fontSize:26,cursor:waterLog.length?"pointer":"not-allowed",fontWeight:700}}>−</button>
              <div style={{textAlign:"center",minWidth:74}}>
                <div style={{fontSize:22,fontWeight:900,color:"#6D5BD0"}}>{containerMl}</div>
                <div style={{fontSize:11,color:"#B0A9D6",fontWeight:700}}>ml a agregar</div>
              </div>
              <button onClick={()=>addWater(containerMl)} style={{width:52,height:52,borderRadius:"50%",border:"none",background:"linear-gradient(135deg,#6D5BD0,#8B7BE8)",color:"#fff",fontSize:26,cursor:"pointer",fontWeight:700,boxShadow:"0 6px 18px #6D5BD055"}}>+</button>
            </div>

            {waterMlPct>=100&&<div style={{marginTop:16,color:"#6D5BD0",fontSize:14,fontWeight:800,textAlign:"center",background:"#EFEDFC",padding:"10px",borderRadius:12}}>🎉 ¡Meta de hidratación cumplida hoy!</div>}
          </div>

          {/* Registro de tomas de hoy */}
          {waterLog.length>0&&(
            <div style={{background:"#fff",borderRadius:16,padding:16,marginBottom:14,boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
              <div style={{fontSize:13,fontWeight:900,color:"#4A3B9E",marginBottom:8}}>💧 Tomas de hoy ({waterLog.length})</div>
              {waterLog.map((d,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 2px",borderBottom:i<waterLog.length-1?"1px solid #F2F0FB":"none"}}>
                  <span style={{fontSize:13,color:"#999"}}>🕐 {new Date(d.t).toLocaleTimeString("es-CO",{hour:"2-digit",minute:"2-digit"})}</span>
                  <span style={{fontSize:14,fontWeight:800,color:"#6D5BD0"}}>{d.ml} ml</span>
                  <button onClick={()=>removeWaterAt(i)} style={{border:"none",background:"transparent",color:"#CFC7EC",fontSize:16,cursor:"pointer",padding:"0 4px",lineHeight:1}}>✕</button>
                </div>
              ))}
            </div>
          )}

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

          <div style={{display:"flex",gap:8,marginBottom:14}}>
            {[["📋","Plan","plan"],["📝","Registrar","registrar"],["📜","Historial","historial"]].map(([ic,lb,sc])=>(
              <button key={sc} onClick={()=>setExSeccion(sc)} style={{flex:1,padding:"10px 4px",borderRadius:12,border:"none",background:exSeccion===sc?"#E76F51":"#fff",color:exSeccion===sc?"#fff":"#888",fontWeight:800,fontSize:12,cursor:"pointer",boxShadow:"0 2px 8px rgba(0,0,0,0.05)"}}>{ic} {lb}</button>
            ))}
          </div>

          {exSeccion==="registrar"&&(<>
          <div style={{background:"#fff",borderRadius:20,padding:18,marginBottom:14,boxShadow:"0 4px 20px rgba(0,0,0,0.08)"}}>
            <div style={{fontSize:14,fontWeight:900,marginBottom:4,color:"#C1492B"}}>🗺️ Caminata con GPS</div>
            <div style={{fontSize:12,color:"#888",marginBottom:12}}>Traza tu ruta en el mapa y calcula distancia y calorías reales.</div>
            {!caminataActiva&&!caminataResumen&&(
              <button onClick={iniciarCaminata} style={{width:"100%",padding:"14px",borderRadius:14,border:"none",background:"linear-gradient(135deg,#6D5BD0,#8B7BE8)",color:"#fff",fontSize:15,fontWeight:800,cursor:"pointer",boxShadow:"0 4px 16px #6D5BD044"}}>🚶 Iniciar caminata</button>
            )}
            {caminataErr&&<div style={{marginTop:10,background:"#FEECEC",color:"#C0392B",padding:"10px 12px",borderRadius:10,fontSize:12}}>{caminataErr}</div>}
            {caminataActiva&&(
              <div>
                <div ref={caminataMapaDivRef} style={{width:"100%",height:220,borderRadius:14,overflow:"hidden",marginBottom:12,background:"#EFEDFC"}}/>
                <div style={{display:"flex",gap:8,marginBottom:12}}>
                  <div style={{flex:1,background:"#F8F7FE",borderRadius:12,padding:"10px 6px",textAlign:"center"}}>
                    <div style={{fontSize:17,fontWeight:900,color:"#6D5BD0"}}>{String(Math.floor(caminataTiempo/60)).padStart(2,"0")}:{String(caminataTiempo%60).padStart(2,"0")}</div>
                    <div style={{fontSize:10,color:"#999"}}>tiempo</div>
                  </div>
                  <div style={{flex:1,background:"#F8F7FE",borderRadius:12,padding:"10px 6px",textAlign:"center"}}>
                    <div style={{fontSize:17,fontWeight:900,color:"#6D5BD0"}}>{caminataDist.toFixed(2)}</div>
                    <div style={{fontSize:10,color:"#999"}}>km</div>
                  </div>
                  <div style={{flex:1,background:"#F8F7FE",borderRadius:12,padding:"10px 6px",textAlign:"center"}}>
                    <div style={{fontSize:17,fontWeight:900,color:"#6D5BD0"}}>{Math.round((3.8*3.5*(hp&&hp.peso?Number(hp.peso):70)/200)*(caminataTiempo/60))}</div>
                    <div style={{fontSize:10,color:"#999"}}>kcal</div>
                  </div>
                </div>
                <button onClick={detenerCaminata} style={{width:"100%",padding:"13px",borderRadius:14,border:"none",background:"#C1121F",color:"#fff",fontSize:15,fontWeight:800,cursor:"pointer"}}>⏹️ Detener y guardar</button>
              </div>
            )}
            {caminataResumen&&!caminataActiva&&(
              <div>
                <div style={{background:"#EFEDFC",borderRadius:14,padding:16,marginBottom:12}}>
                  <div style={{fontSize:14,fontWeight:800,color:"#5B49C0",marginBottom:12,textAlign:"center"}}>💚 ¡Bien hecho!</div>
                  {[["⏱️","Tiempo de actividad",`${caminataResumen.min} min`],["📍","Distancia",`${caminataResumen.km} km`],["🔥","Energía gastada",`${caminataResumen.calorias} cal`],["🚶","Ritmo promedio",caminataResumen.ritmoTxt]].map(([ic,lb,v])=>(
                    <div key={lb} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:"1px solid #E1DBF7"}}>
                      <span style={{fontSize:16,width:22,textAlign:"center"}}>{ic}</span>
                      <span style={{flex:1,fontSize:13,color:"#5B49C0"}}>{lb}</span>
                      <span style={{fontSize:14,fontWeight:800,color:"#4A3B9E"}}>{v}</span>
                    </div>
                  ))}
                </div>
                <button onClick={()=>setCaminataResumen(null)} style={{width:"100%",padding:"12px",borderRadius:12,border:"1.5px solid #6D5BD0",background:"#fff",color:"#6D5BD0",fontWeight:800,fontSize:13,cursor:"pointer"}}>🚶 Nueva caminata</button>
              </div>
            )}
          </div>
          </>)}

          {exSeccion==="plan"&&(<>
          <div style={{background:"#fff",borderRadius:20,padding:18,marginBottom:14,boxShadow:"0 4px 20px rgba(0,0,0,0.08)"}}>
            <div style={{fontSize:14,fontWeight:900,marginBottom:12,color:"#C1492B"}}>🎯 Tu plan a la medida</div>

            {exPlan&&!exFormAbierto&&(
              <div style={{display:"flex",alignItems:"center",gap:10,background:"#FFF4EF",borderRadius:14,padding:"12px 14px",marginBottom:4}}>
                <span style={{fontSize:20}}>🎯</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:800,color:"#C1492B",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{exObjetivo}</div>
                  <div style={{fontSize:11,color:"#996"}}>Dificultad {exDificultad}/5 · {exDias} días/sem · {exMin} min/sesión · {exEquip}</div>
                </div>
                <button onClick={()=>setExFormAbierto(true)} style={{padding:"7px 12px",borderRadius:10,border:"1.5px solid #E76F51",background:"#fff",color:"#E76F51",fontWeight:800,fontSize:11,cursor:"pointer",flexShrink:0}}>✏️ Editar</button>
              </div>
            )}
            {exPlan&&!exFormAbierto&&(
              <button onClick={genPlan} disabled={exAnalyzing} style={{width:"100%",padding:"11px",borderRadius:12,border:"none",background:exAnalyzing?"#ccc":"#F0EDFB",color:"#6D5BD0",fontSize:13,fontWeight:800,cursor:"pointer",marginTop:8}}>{exAnalyzing?"🔍 Creando tu plan…":"🔄 Regenerar plan de la semana"}</button>
            )}

            {(!exPlan||exFormAbierto)&&(<>
            <div style={{fontSize:11,color:"#888",fontWeight:700,marginBottom:8,marginTop:exPlan?14:0}}>¿Cuál es tu objetivo principal?</div>
            <div style={{display:"flex",flexDirection:"column",gap:7,marginBottom:16}}>
              {[["💪","Ganar masa muscular"],["🔥","Perder peso y quemar grasa"],["🏋️","Aumentar la fuerza"],["⚖️","Tonificar: ganar músculo y perder grasa"],["❤️","Estar en forma y sentirte saludable"],["🎯","Preparación física / táctica"]].map(([ic,l])=>(
                <div key={l} onClick={()=>setExObjetivo(l)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:12,border:`2px solid ${exObjetivo===l?"#E76F51":"#F5F0ED"}`,background:exObjetivo===l?"#FFF4EF":"#FAFAFA",cursor:"pointer",transition:"all .15s"}}>
                  <span style={{fontSize:18,width:24,textAlign:"center"}}>{ic}</span>
                  <span style={{flex:1,fontSize:13,fontWeight:exObjetivo===l?800:500,color:exObjetivo===l?"#C1492B":"#555"}}>{l}</span>
                  <div style={{width:20,height:20,borderRadius:"50%",border:`2px solid ${exObjetivo===l?"#E76F51":"#ddd"}`,background:exObjetivo===l?"#E76F51":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{exObjetivo===l&&<span style={{color:"#fff",fontSize:11}}>✓</span>}</div>
                </div>
              ))}
            </div>

            <div style={{fontSize:11,color:"#888",fontWeight:700,marginBottom:8}}>¿Qué resultados quieres conseguir? <span style={{fontWeight:400,color:"#bbb"}}>(elige los que quieras)</span></div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:16}}>
              {["Aliviar el estrés","Mejorar el sueño","Aumentar la energía","Envejecimiento activo","Mejorar la nutrición","Hábitos alimentarios saludables","Aumentar el VO2 máx","Aumentar la confianza","Mejorar el equilibrio","Aumentar la agilidad"].map(r=>{
                const sel=exResultados.includes(r);
                return <button key={r} onClick={()=>setExResultados(sel?exResultados.filter(x=>x!==r):[...exResultados,r])} style={{padding:"7px 12px",borderRadius:20,border:"none",cursor:"pointer",fontSize:12,fontWeight:700,background:sel?"#6D5BD0":"#F0F0F0",color:sel?"#fff":"#666"}}>{sel?"✓ ":""}{r}</button>;
              })}
            </div>

            <div style={{fontSize:11,color:"#888",fontWeight:700,marginBottom:8}}>¿Qué tan duro te gustaría entrenar?</div>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
              {[1,2,3,4,5].map(n=>{
                const tonos=["#FBD9C4","#F6BFA0","#F1A47C","#EA7C48","#C1492B"];
                return (
                  <div key={n} onClick={()=>setExDificultad(n)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5,cursor:"pointer"}}>
                    <div style={{width:42,height:42,borderRadius:"50%",background:tonos[n-1],display:"flex",alignItems:"center",justifyContent:"center",border:exDificultad===n?"3px solid #6D5BD0":"3px solid transparent",boxSizing:"border-box"}}>
                      <span style={{fontSize:15,fontWeight:900,color:"#fff"}}>{n}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:16}}>
              <span style={{fontSize:10,color:"#999",fontWeight:700}}>Fácil</span>
              <span style={{fontSize:10,color:"#999",fontWeight:700}}>Intenso</span>
            </div>

            <div style={{fontSize:11,color:"#888",fontWeight:700,marginBottom:6}}>Equipo</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12}}>{["Ninguno","Casa","Gimnasio"].map(g=><button key={g} onClick={()=>setExEquip(g)} style={chip(g,exEquip)}>{g}</button>)}</div>
            <div style={{display:"flex",gap:14,marginBottom:14}}>
              <div style={{flex:1}}><div style={{fontSize:11,color:"#888",fontWeight:700,marginBottom:6}}>Días/semana</div><div style={{display:"flex",alignItems:"center",gap:10}}><button onClick={()=>setExDias(Math.max(2,exDias-1))} style={{width:32,height:32,borderRadius:"50%",border:"2px solid #eee",background:"#F8F8F8",fontSize:16,cursor:"pointer"}}>−</button><span style={{fontSize:16,fontWeight:900,minWidth:16,textAlign:"center"}}>{exDias}</span><button onClick={()=>setExDias(Math.min(7,exDias+1))} style={{width:32,height:32,borderRadius:"50%",border:"none",background:"#E76F51",color:"#fff",fontSize:16,cursor:"pointer"}}>+</button></div></div>
              <div style={{flex:1}}><div style={{fontSize:11,color:"#888",fontWeight:700,marginBottom:6}}>Min/sesión</div><div style={{display:"flex",alignItems:"center",gap:10}}><button onClick={()=>setExMin(Math.max(15,exMin-5))} style={{width:32,height:32,borderRadius:"50%",border:"2px solid #eee",background:"#F8F8F8",fontSize:16,cursor:"pointer"}}>−</button><span style={{fontSize:16,fontWeight:900,minWidth:24,textAlign:"center"}}>{exMin}</span><button onClick={()=>setExMin(Math.min(90,exMin+5))} style={{width:32,height:32,borderRadius:"50%",border:"none",background:"#E76F51",color:"#fff",fontSize:16,cursor:"pointer"}}>+</button></div></div>
            </div>
            <button onClick={genPlan} disabled={exAnalyzing} style={{width:"100%",padding:"14px",borderRadius:14,border:"none",background:exAnalyzing?"#ccc":"linear-gradient(135deg,#E76F51,#C1492B)",color:"#fff",fontSize:15,fontWeight:800,cursor:"pointer",boxShadow:"0 4px 16px #E76F5144"}}>{exAnalyzing?"🔍 Creando tu plan…":exPlan?"🔄 Regenerar plan de la semana":"✨ Generar plan de la semana con IA"}</button>
            </>)}
            {exMsg&&<div style={{marginTop:10,textAlign:"center",fontSize:12,fontWeight:700,color:"#C1492B"}}>{exMsg}</div>}
          </div>

          {exPlan&&(
            <div style={{marginBottom:14}}>
              <div style={{background:"#FFF4EF",borderRadius:14,padding:"12px 14px",marginBottom:10,borderLeft:"4px solid #E76F51"}}>
                <div style={{fontSize:13,fontWeight:800,color:"#C1492B",marginBottom:4}}>🎯 {exPlan.meta_semanal}</div>
                <div style={{fontSize:12,color:"#7A4A3A",lineHeight:1.5}}>💡 {exPlan.consejo}</div>
                {exPlan.ajuste&&(
                  <div style={{marginTop:8,paddingTop:8,borderTop:"1px solid #F5D9CC",fontSize:12,color:"#5B49C0",fontWeight:700,lineHeight:1.5}}>🔄 {exPlan.ajuste}</div>
                )}
              </div>
              {(()=>{
                const NOMBRES=["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
                const norm=s=>(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
                const hoyNombre=norm(NOMBRES[new Date().getDay()]);
                return (exPlan.dias||[]).map((d,i)=>{
                  const done=exDone.includes(i),rest=/descanso/i.test(d.foco||"");
                  const esHoy=norm(d.dia).includes(hoyNombre);
                  const abierto=exDiaAbierto==null?esHoy:exDiaAbierto===i;
                  return(
                    <div key={i} style={{background:"#fff",borderRadius:14,marginBottom:8,boxShadow:"0 2px 10px rgba(0,0,0,0.05)",opacity:done?.6:1,borderLeft:`4px solid ${rest?"#bbb":intColor(d.intensidad)}`,overflow:"hidden"}}>
                      <div onClick={()=>setExDiaAbierto(abierto?-1:i)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 14px",cursor:"pointer"}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,minWidth:0}}>
                          <div style={{fontSize:14,fontWeight:900,color:"#333",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{d.dia} · <span style={{color:"#E76F51"}}>{d.foco}</span></div>
                          {esHoy&&<span style={{fontSize:9,fontWeight:800,color:"#fff",background:"#6D5BD0",padding:"2px 7px",borderRadius:8,flexShrink:0}}>HOY</span>}
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                          {!rest&&<button onClick={e=>{e.stopPropagation();toggleDone(i);}} style={{padding:"4px 10px",borderRadius:10,border:"none",cursor:"pointer",fontSize:11,fontWeight:800,background:done?"#6D5BD0":"#F0F0F0",color:done?"#fff":"#888"}}>{done?"✓ Hecho":"Marcar"}</button>}
                          <span style={{fontSize:12,color:"#bbb",transform:abierto?"rotate(90deg)":"none",transition:"transform .2s"}}>›</span>
                        </div>
                      </div>
                      {abierto&&(
                        <div style={{padding:"0 14px 12px"}}>
                          {(d.ejercicios||d.actividades||[]).map((a,j)=>typeof a==="object"?(
                            <div key={j} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 4px",borderBottom:j<(d.ejercicios.length-1)?"1px solid #F5F5F5":"none"}}>
                              <span style={{fontSize:13,color:"#444",fontWeight:600}}>{a.nombre}</span>
                              <span style={{fontSize:12,color:"#E76F51",fontWeight:800,whiteSpace:"nowrap",marginLeft:8}}>{a.series}×{a.reps}{a.descanso?` · ${a.descanso}`:""}</span>
                            </div>
                          ):(
                            <div key={j} style={{fontSize:13,color:"#555",lineHeight:1.5,paddingLeft:4}}>• {a}</div>
                          ))}
                          {!rest&&<div style={{fontSize:11,color:"#999",marginTop:6}}>⏱️ {d.duracion} · intensidad {d.intensidad}</div>}
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          )}
          </>)}

          {exSeccion==="registrar"&&(<>
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
          </>)}

          {exSeccion==="historial"&&(<>
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
          {exLog.length===0&&(
            <div style={{textAlign:"center",padding:"30px 20px",background:"#fff",borderRadius:16,boxShadow:"0 2px 10px rgba(0,0,0,0.05)"}}>
              <div style={{color:"#888",fontSize:13}}>Aún no tienes entrenamientos registrados. Usa "Registrar" para tu primera sesión.</div>
            </div>
          )}
          </>)}
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
      {recordatorio&&(
        <div style={{position:"fixed",inset:0,background:"rgba(26,20,50,0.45)",zIndex:90,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={()=>setRecordatorio(null)}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:22,padding:"26px 22px",maxWidth:340,width:"100%",textAlign:"center",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{fontSize:46,marginBottom:12}}>{recordatorio.icon}</div>
            <div style={{fontSize:15,color:"#333",fontWeight:700,lineHeight:1.5,marginBottom:20}}>{recordatorio.msg}</div>
            <button onClick={()=>{recordatorio.accion&&recordatorio.accion();setRecordatorio(null);}} style={{width:"100%",padding:"13px",borderRadius:14,border:"none",background:"linear-gradient(135deg,#6D5BD0,#8B7BE8)",color:"#fff",fontSize:14,fontWeight:800,cursor:"pointer",marginBottom:10}}>Registrar ahora</button>
            {recordatorio.negLabel&&<button onClick={()=>setRecordatorio(null)} style={{width:"100%",padding:"12px",borderRadius:14,border:"1.5px solid #EFEDFC",background:"#fff",color:"#6D5BD0",fontSize:13,fontWeight:700,cursor:"pointer",marginBottom:8}}>{recordatorio.negLabel}</button>}
            <button onClick={()=>setRecordatorio(null)} style={{width:"100%",padding:"11px",borderRadius:14,border:"none",background:"none",color:"#999",fontSize:13,fontWeight:700,cursor:"pointer"}}>Más tarde</button>
          </div>
        </div>
      )}
      {chequeoMensual&&(
        <div style={{position:"fixed",inset:0,background:"rgba(26,20,50,0.45)",zIndex:90,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{background:"#fff",borderRadius:22,padding:"28px 24px",maxWidth:340,width:"100%",textAlign:"center",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{fontSize:42,marginBottom:10}}>{chequeoMensual.manual?"📏":"📅"}</div>
            <div style={{fontSize:16,fontWeight:800,color:"#333",marginBottom:6}}>{chequeoMensual.manual?"Peso y medidas":"Chequeo mensual"}</div>
            <div style={{fontSize:13,color:"#888",marginBottom:20,lineHeight:1.5}}>{chequeoMensual.manual?"Registra tu peso, cintura y cadera para calcular tu ICC y seguir tu progreso.":"Actualiza tu peso y tus medidas para ver si las recomendaciones están funcionando de verdad."}</div>
            {chequeoMensual.pesoAnterior!=null&&<div style={{fontSize:12,color:"#6D5BD0",fontWeight:700,marginBottom:14}}>Tu último registro: {chequeoMensual.pesoAnterior} kg</div>}
            <input type="number" value={pesoNuevo} onChange={e=>setPesoNuevo(e.target.value)} placeholder="Tu peso hoy (kg)" style={{width:"100%",padding:"14px",borderRadius:12,border:"2px solid #EFEDFC",background:"#F8F7FE",fontSize:20,fontWeight:800,textAlign:"center",marginBottom:10,boxSizing:"border-box"}}/>
            <div style={{display:"flex",gap:8,marginBottom:6}}>
              <input type="number" value={cinturaNueva} onChange={e=>setCinturaNueva(e.target.value)} placeholder="Cintura (cm)" style={{flex:1,minWidth:0,padding:"12px 6px",borderRadius:12,border:"2px solid #EFEDFC",background:"#F8F7FE",fontSize:16,fontWeight:800,textAlign:"center",boxSizing:"border-box"}}/>
              <input type="number" value={caderaNueva} onChange={e=>setCaderaNueva(e.target.value)} placeholder="Cadera (cm)" style={{flex:1,minWidth:0,padding:"12px 6px",borderRadius:12,border:"2px solid #EFEDFC",background:"#F8F7FE",fontSize:16,fontWeight:800,textAlign:"center",boxSizing:"border-box"}}/>
            </div>
            {(Number(cinturaNueva)>0&&Number(caderaNueva)>0)?<div style={{fontSize:12,color:"#6D5BD0",fontWeight:800,marginBottom:12}}>Tu ICC: {(Number(cinturaNueva)/Number(caderaNueva)).toFixed(2)}</div>:<div style={{fontSize:10.5,color:"#aaa",marginBottom:12}}>Cintura y cadera son opcionales, pero permiten seguir tu ICC mes a mes.</div>}
            <button onClick={guardarChequeoMensual} style={{width:"100%",padding:"13px",borderRadius:14,border:"none",background:"linear-gradient(135deg,#6D5BD0,#8B7BE8)",color:"#fff",fontSize:14,fontWeight:800,cursor:"pointer",marginBottom:10}}>Guardar</button>
            <button onClick={()=>{if(!chequeoMensual.manual)localStorage.setItem(sk(perfil,"chequeo_peso_"+new Date().toISOString().slice(0,7)),"1");setChequeoMensual(null);}} style={{width:"100%",padding:"11px",borderRadius:14,border:"none",background:"none",color:"#999",fontSize:13,fontWeight:700,cursor:"pointer"}}>{chequeoMensual.manual?"Cancelar":"Recuérdamelo después"}</button>
          </div>
        </div>
      )}
      {!(tab===0&&step===1)&&(<div style={{position:"fixed",left:14,right:14,bottom:82,zIndex:60,display:"flex",justifyContent:"flex-end",alignItems:"flex-end",pointerEvents:"none"}}>
        {(listening||voiceBusy||voiceResult||voicePending)&&(
          <div style={{flex:1,marginRight:10,background:"#fff",borderRadius:16,padding:14,boxShadow:"0 6px 24px rgba(0,0,0,0.22)",border:`2px solid ${listening?"#C1121F":"#EFEDFC"}`,pointerEvents:"auto"}}>
            {listening&&<div style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:"#C1121F",fontWeight:800}}><span style={{width:10,height:10,borderRadius:"50%",background:"#C1121F",animation:"vtpulse 1.3s infinite"}}/>Escuchando… habla tranquilo</div>}
            {listening&&<div style={{fontSize:11,color:"#888",marginTop:4}}>Cuando termines, toca ⏹️ y te confirmo lo que entendí.</div>}
            {voiceText&&<div style={{fontSize:13,color:"#333",marginTop:8,fontStyle:"italic",lineHeight:1.4}}>"{voiceText}"</div>}
            {voiceBusy&&<div style={{fontSize:12,color:"#888",marginTop:8}}>🤔 Procesando…</div>}
            {voicePending&&!voiceBusy&&(
              <div style={{marginTop:8,padding:"10px 12px",borderRadius:10,background:"#F8F7FE",border:"1.5px dashed #6D5BD0"}}>
                <div style={{fontSize:11,fontWeight:800,color:"#4A3B9E",marginBottom:6}}>📝 Por guardar — di qué agrego o quito, o di "listo"</div>
                {voicePending.textoDictado&&<div style={{fontSize:10.5,color:"#999",marginBottom:5,fontStyle:"italic"}}>🎤 Escuché: «{voicePending.textoDictado}»</div>}
                {Array.isArray(voicePending.correcciones)&&voicePending.correcciones.map((c,i)=>(
                  <div key={"cx"+i} style={{fontSize:10.5,color:"#B8860B",marginBottom:4,fontWeight:700}}>✏️ Corregí: "{c.escuchado}" → "{c.interpretado}" (dime si no era eso)</div>
                ))}
                {(voicePending.comidas||[]).map((c,i)=>(
                  <div key={i} style={{fontSize:12,color:"#333",marginBottom:3}}><b style={{color:"#6D5BD0"}}>{c.momento}:</b> {(c.alimentos||[]).join(", ")}</div>
                ))}
                {voicePending.ejercicio&&voicePending.ejercicio.minutos?<div style={{fontSize:12,color:"#333",marginBottom:3}}>🏃 {voicePending.ejercicio.tipo||"Ejercicio"} · {voicePending.ejercicio.minutos} min</div>:null}
                {voicePending.agua_vasos?<div style={{fontSize:12,color:"#333",marginBottom:3}}>💧 {voicePending.agua_vasos} vasos de agua</div>:null}
                <div style={{display:"flex",gap:8,marginTop:8}}>
                  <button onClick={()=>{recRef.userStop=true;try{recRef.current&&recRef.current.stop();}catch(_){}guardarPendiente(voicePendingRef.current);}} style={{flex:1,padding:"9px 0",borderRadius:9,border:"none",background:"#2E9E5B",color:"#fff",fontWeight:800,fontSize:12,cursor:"pointer"}}>✓ Guardar</button>
                  <button onClick={()=>{recRef.userStop=true;try{recRef.current&&recRef.current.stop();}catch(_){}descartarPendiente();}} style={{padding:"9px 14px",borderRadius:9,border:"1.5px solid #E76F51",background:"#fff",color:"#E76F51",fontWeight:800,fontSize:12,cursor:"pointer"}}>Descartar</button>
                </div>
              </div>
            )}
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
        <div
          onPointerDown={(e)=>{
            try{e.currentTarget.setPointerCapture(e.pointerId);}catch(_){}
            micDrag.current={dragging:true,startX:e.clientX,startY:e.clientY,origX:micPos.x,origY:micPos.y,moved:false};
          }}
          onPointerMove={(e)=>{
            if(!micDrag.current.dragging)return;
            const dx=e.clientX-micDrag.current.startX,dy=e.clientY-micDrag.current.startY;
            if(Math.abs(dx)>6||Math.abs(dy)>6)micDrag.current.moved=true;
            setMicPos({x:micDrag.current.origX+dx,y:micDrag.current.origY+dy});
          }}
          onPointerUp={()=>{
            if(!micDrag.current.dragging)return;
            micDrag.current.dragging=false;
            setMicPos(p=>{try{localStorage.setItem("vt_mic_pos",JSON.stringify(p));}catch(_){}return p;});
          }}
          style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,pointerEvents:"auto",touchAction:"none",transform:`translate(${micPos.x}px,${micPos.y}px)`,cursor:"grab"}}>
          <button onClick={()=>{if(micDrag.current.moved){micDrag.current.moved=false;return;}if(listening){stopVoice();}else{setMeal(mealByHour());startVoice();}}} title="Dictar por voz · mantén y arrastra para mover" style={{width:64,height:64,borderRadius:"50%",border:"none",background:listening?"#C1121F":"linear-gradient(135deg,#6D5BD0,#8B7BE8)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",boxShadow:"0 6px 20px rgba(45,106,79,.45)",flexShrink:0,animation:listening?"vtpulse 1.3s infinite":"none"}}>
            {listening?(
              <svg width="22" height="22" viewBox="0 0 24 24"><rect x="5" y="5" width="14" height="14" rx="2" fill="#fff"/></svg>
            ):(
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="2" width="6" height="11" rx="3"/>
                <path d="M5 10a7 7 0 0 0 14 0"/>
                <line x1="12" y1="17" x2="12" y2="21"/>
                <line x1="8" y1="21" x2="16" y2="21"/>
              </svg>
            )}
          </button>
          {!listening&&<div style={{background:"#fff",borderRadius:10,padding:"5px 10px",fontSize:11,fontWeight:700,color:"#4A3B9E",boxShadow:"0 2px 10px rgba(0,0,0,0.12)",whiteSpace:"nowrap"}}>Registrar por voz</div>}
        </div>
      </div>)}

      {tab===7&&(
        <div style={{padding:"16px 14px 90px"}}>
          {/* ══ REGISTRO DÍA A DÍA + ANÁLISIS IA ══ */}
          <div>
            <h2 style={{fontSize:20,fontWeight:900,color:"#1A1A1A",margin:"0 0 4px"}}>Tus registros 📋</h2>
            <div style={{fontSize:12,color:"#888",marginBottom:12}}>Lo que registraste por voz, con recomendaciones de la IA</div>
            {(()=>{
              const dateKeyToTs=ds=>{
                if(typeof ds!=="string")return 0;
                const p=ds.split("/");
                if(p.length===3){const [d,m,y]=p.map(Number);return new Date(y,m-1,d).getTime();}
                const t=Date.parse(ds);return isNaN(t)?0:t;
              };
              const DIA_SEMANA=["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
              const nombreDia=ds=>{const ts=dateKeyToTs(ds);if(!ts)return ds;const dt=new Date(ts);return `${DIA_SEMANA[dt.getDay()]} ${dt.getDate()}/${dt.getMonth()+1}`;};
              const ayerDs=new Date(Date.now()-864e5).toLocaleDateString("es-CO");
              const map={};
              history.forEach(r=>{
                const k=(typeof r.fecha==="string"&&r.fecha.includes("T"))?r.fecha.split("T")[0]:r.fecha;
                if(!map[k])map[k]=[];
                map[k].push(r);
              });
              const dias=Object.keys(map).sort((a,b)=>dateKeyToTs(b)-dateKeyToTs(a)).slice(0,14);
              if(!dias.length)return (
                <div style={{textAlign:"center",padding:"24px 20px",background:"#fff",borderRadius:16,boxShadow:"0 2px 10px rgba(0,0,0,0.05)"}}>
                  <div style={{color:"#888",fontSize:13}}>Aún no tienes comidas registradas. Toca el micrófono flotante y cuéntame qué desayunaste, almorzaste o cenaste para empezar tu historial.</div>
                </div>
              );
              return dias.map(ds=>{
                const items=map[ds];
                const scores=items.map(r=>r.score_total).filter(v=>typeof v==="number");
                const scoreProm=scores.length?Math.min(100,Math.round(scores.reduce((a,b)=>a+b,0)/3)):null;
                const label=ds===today?"Hoy":ds===ayerDs?"Ayer":nombreDia(ds);
                const abierto=planDiaAbierto===ds;
                const ai=dayAI[ds];
                return (
                  <div key={ds} style={{background:"#fff",borderRadius:16,marginBottom:10,boxShadow:"0 2px 10px rgba(0,0,0,0.05)",overflow:"hidden"}}>
                    <button onClick={()=>setPlanDiaAbierto(abierto?null:ds)} style={{width:"100%",background:"none",border:"none",padding:"14px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer"}}>
                      <div style={{textAlign:"left"}}>
                        <div style={{fontSize:14,fontWeight:800,color:"#1A1A1A"}}>{label}</div>
                        <div style={{fontSize:11,color:"#999",marginTop:1}}>{items.length} comida{items.length!==1?"s":""} · hidratación · ejercicio</div>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        {scoreProm!=null&&<span style={{fontSize:11,fontWeight:800,color:scoreColor(scoreProm),background:scoreBg(scoreProm),padding:"3px 9px",borderRadius:10}}>{scoreProm}%</span>}
                        <span style={{fontSize:12,color:"#bbb",transform:abierto?"rotate(90deg)":"none",transition:"transform .2s"}}>›</span>
                      </div>
                    </button>
                    {abierto&&(
                      <div style={{padding:"0 16px 16px"}}>
                        {items.map((r,i)=>{
                          let f=[];try{f=JSON.parse(typeof r.alimentos==="string"?r.alimentos:JSON.stringify(r.alimentos||[]));}catch(_){}
                          return (
                            <div key={i} style={{background:"#F8F7FE",borderRadius:12,padding:"10px 12px",marginBottom:8}}>
                              <div style={{fontSize:12,fontWeight:800,color:"#6D5BD0",marginBottom:5}}>{r.comida||"Comida"}</div>
                              <div style={{display:"flex",flexWrap:"wrap",gap:4}}>{(Array.isArray(f)?f:[]).slice(0,8).map((x,j)=><span key={j} style={{fontSize:10,padding:"3px 8px",borderRadius:20,background:"#fff",color:"#666",fontWeight:500}}>{typeof x==="object"?x.name:x}</span>)}</div>
                              {r.notas&&<div style={{fontSize:11,color:"#6D5BD0",marginTop:6,lineHeight:1.4}}>💡 {r.notas}</div>}
                            </div>
                          );
                        })}
                        {(()=>{
                          const aguaVal=ds===today?water:(waterHist[ds]!=null?waterHist[ds]:null);
                          const ejerDia=exLog.filter(e=>e.date===ds);
                          return (<>
                            <div style={{background:"#EAF6FC",borderRadius:12,padding:"10px 12px",marginBottom:8,display:"flex",alignItems:"center",gap:10}}>
                              <IconoHabito tipo="hidratacion"/>
                              <div style={{flex:1}}>
                                <div style={{fontSize:12,fontWeight:800,color:"#0C7CB0"}}>Hidratación</div>
                                <div style={{fontSize:11,color:"#0C7CB0",marginTop:1}}>{aguaVal!=null?`${aguaVal} de ${WATER_GOAL} vasos`:"Sin registro"}</div>
                              </div>
                            </div>
                            <div style={{background:"#FCF3E3",borderRadius:12,padding:"10px 12px",marginBottom:8,display:"flex",alignItems:"flex-start",gap:10}}>
                              <IconoHabito tipo="ejercicio"/>
                              <div style={{flex:1}}>
                                <div style={{fontSize:12,fontWeight:800,color:"#9A6A0C",marginBottom:ejerDia.length?4:0}}>Ejercicio</div>
                                {ejerDia.length?ejerDia.map((e,i)=>(<div key={i} style={{fontSize:11,color:"#9A6A0C"}}>{e.tipo} · {e.min} min</div>)):<div style={{fontSize:11,color:"#9A6A0C"}}>Sin registro</div>}
                              </div>
                            </div>
                          </>);
                        })()}
                        <div style={{marginTop:4,paddingTop:12,borderTop:"1px solid #F2F2F2"}}>
                          {ds===today?(
                            <div style={{fontSize:12,color:"#999",fontStyle:"italic"}}>El análisis de IA de este día se genera mañana, cuando el día quede completo.</div>
                          ):ai?(
                            <div>
                              <div style={{fontSize:12,color:"#444",lineHeight:1.5,marginBottom:8}}>🤖 {ai.resumen}</div>
                              {ai.faltantes&&ai.faltantes.length>0&&(
                                <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:8}}>
                                  {ai.faltantes.map((x,i)=><span key={i} style={{fontSize:10,padding:"3px 9px",borderRadius:20,background:"#FEECEC",color:"#C0392B",fontWeight:600}}>Te faltó: {x}</span>)}
                                </div>
                              )}
                              {ai.sugerencias&&ai.sugerencias.map((s,i)=>(
                                <div key={i} style={{fontSize:12,color:"#5B49C0",background:"#EFEDFC",borderRadius:10,padding:"8px 10px",marginBottom:6,lineHeight:1.4}}>✓ {s}</div>
                              ))}
                            </div>
                          ):(
                            <button onClick={()=>generarAnalisisDia(ds,label)} disabled={dayAiLoadingId===ds} style={{width:"100%",padding:"10px",borderRadius:10,border:"1.5px solid #6D5BD0",background:"#fff",color:"#6D5BD0",fontWeight:800,fontSize:12,cursor:dayAiLoadingId===ds?"default":"pointer"}}>{dayAiLoadingId===ds?"🤖 Analizando…":"✨ Analizar este día con IA"}</button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
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
            {[["Edad",hp?hp.edad+" años":"—"],["Condición",hp?hp.enfermedad:"—"],["Actividad",hp?hp.ejercicio:"—"],["Peso",(hp&&hp.peso)?hp.peso+" kg":"—"],["ICC (cintura-cadera)",(hp&&hp.cintura&&hp.cadera&&Number(hp.cadera)>0)?(Number(hp.cintura)/Number(hp.cadera)).toFixed(2):"—"]].map(([k,v])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"9px 0",borderBottom:"1px solid #F2F2F2"}}>
                <span style={{fontSize:13,color:"#888"}}>{k}</span>
                <span style={{fontSize:13,fontWeight:700,color:"#444"}}>{v}</span>
              </div>
            ))}
            <button onClick={()=>{setPesoNuevo((hp&&hp.peso)||"");setCinturaNueva((hp&&hp.cintura)||"");setCaderaNueva((hp&&hp.cadera)||"");setChequeoMensual({pesoAnterior:(hp&&hp.peso)?Number(hp.peso):null,manual:true});}} style={{width:"100%",marginTop:12,padding:"12px",borderRadius:12,border:"1.5px solid #6D5BD0",background:"#F8F7FE",color:"#6D5BD0",fontWeight:800,fontSize:13,cursor:"pointer"}}>📏 Actualizar peso y medidas</button>
          </div>
          <div style={{background:"#fff",borderRadius:16,padding:"16px",boxShadow:"0 2px 12px rgba(0,0,0,0.05)",marginBottom:14}}>
            <div style={{fontSize:13,fontWeight:800,color:"#6D5BD0",marginBottom:6}}>🔔 Notificaciones</div>
            <div style={{fontSize:12,color:"#888",marginBottom:10,lineHeight:1.5}}>Recibe un aviso en tu celular (aunque tengas la app cerrada) si no has tomado agua o registrado tus comidas y ejercicio.</div>
            {pushEstado==="activo"||pushEstado==="granted"?(
              <div style={{fontSize:13,fontWeight:800,color:"#2E9E5B",background:"#E9F7EF",padding:"10px 12px",borderRadius:10,textAlign:"center"}}>✓ Notificaciones activadas</div>
            ):pushEstado==="denied"?(
              <div style={{fontSize:12,color:"#C0392B",background:"#FEECEC",padding:"10px 12px",borderRadius:10}}>Bloqueaste los avisos del navegador. Actívalos desde los ajustes del sitio para poder recibirlos.</div>
            ):pushEstado==="no_soportado"?(
              <div style={{fontSize:12,color:"#888"}}>Tu navegador no soporta notificaciones push.</div>
            ):(
              <button onClick={activarPush} disabled={pushBusy} style={{width:"100%",padding:"12px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#6D5BD0,#8B7BE8)",color:"#fff",fontWeight:800,fontSize:13,cursor:pushBusy?"default":"pointer"}}>{pushBusy?"Activando…":"🔔 Activar notificaciones"}</button>
            )}
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
            {navBtn("🏠","Inicio",tab===0||tab===4||tab===5||tab===6,()=>{setTab(0);setStep(0);})}
            {navBtn("📋","Registros",tab===7,()=>setTab(7))}
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
const VAPID_PUBLIC_KEY = "BGw9EHnNajsQUfYXNcnh2baJRgNFyZn7soCN0y8vQAYHCYRmyn6C7cXVycM20NSDyUPTFK2UFTydf0wrV_-MduU";
function urlBase64ToUint8Array(base64String){
  const padding="=".repeat((4-base64String.length%4)%4);
  const base64=(base64String+padding).replace(/-/g,"+").replace(/_/g,"/");
  const rawData=window.atob(base64);
  const outputArray=new Uint8Array(rawData.length);
  for(let i=0;i<rawData.length;i++)outputArray[i]=rawData.charCodeAt(i);
  return outputArray;
}

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
const sbRefresh= (refresh_token)=>sbAuth("token?grant_type=refresh_token",{ refresh_token });
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

  const OTTER_IMG={
    feliz1:`${import.meta.env.BASE_URL}otter/otter-feliz-1.png`,
    feliz2:`${import.meta.env.BASE_URL}otter/otter-feliz-2.png`,
    pensando:`${import.meta.env.BASE_URL}otter/otter-pensando.png`,
    preocupada:`${import.meta.env.BASE_URL}otter/otter-preocupada.png`,
  };
  const OtterMascot=({step})=>{
    // Una expresión distinta según qué tan sensible/decisiva es la pregunta
    const getExpression=()=>{
      if(step===6)return "preocupada";   // alergias: tema de seguridad
      if(step===2||step===5||step===7)return "pensando"; // decisiones (dieta, objetivo, presupuesto/tiempo)
      if(step===1||step===4)return "feliz2"; // variedad visual
      return "feliz1";
    };
    const expr=getExpression();
    return (
      <img src={OTTER_IMG[expr]} alt="Nutria de VitalTrack" style={{width:150,height:"auto",display:"block",flexShrink:0,mixBlendMode:"multiply",animation:"vtfloat 1.9s ease-in-out infinite",transformOrigin:"bottom center"}}/>
    );
  };

  return (
    <div style={{minHeight:"100vh",background:VT.bg,fontFamily:"system-ui,-apple-system,sans-serif",display:"flex",flexDirection:"column"}}>
      <style>{`@keyframes vtfloat{
        0%{transform:translateY(0px) rotate(0deg) scale(1,1)}
        15%{transform:translateY(-4px) rotate(-6deg) scale(0.98,1.02)}
        30%{transform:translateY(-14px) rotate(-9deg) scale(1,1)}
        45%{transform:translateY(-4px) rotate(-2deg) scale(1.02,0.98)}
        60%{transform:translateY(0px) rotate(4deg) scale(1,1)}
        75%{transform:translateY(-8px) rotate(9deg) scale(0.98,1.02)}
        90%{transform:translateY(-2px) rotate(2deg) scale(1,1)}
        100%{transform:translateY(0px) rotate(0deg) scale(1,1)}
      }`}</style>
      <div style={{background:VT.violeta,padding:"16px 18px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,maxWidth:420,marginLeft:"auto",marginRight:"auto"}}>
          <span style={{color:"#fff",fontSize:14,fontWeight:800}}>Tus preferencias</span>
          <span style={{color:"rgba(255,255,255,.8)",fontSize:12}}>Paso {paso+1} de {TOTAL}</span>
        </div>
        <div style={{maxWidth:420,marginLeft:"auto",marginRight:"auto",height:6,background:"rgba(255,255,255,.25)",borderRadius:6,overflow:"hidden"}}>
          <div style={{height:6,width:((paso+1)/TOTAL*100)+"%",background:"#fff",borderRadius:6,transition:"width .3s"}}/>
        </div>
      </div>
      <div style={{flex:1,padding:"22px 18px",maxWidth:420,marginLeft:"auto",marginRight:"auto",width:"100%",boxSizing:"border-box",display:"flex",flexDirection:"column"}}>
        <h2 style={{fontSize:20,color:VT.txt,margin:"0 0 4px"}}>{TITULOS[paso][0]}</h2>
        <p style={{fontSize:13,color:VT.gris,margin:"0 0 16px"}}>{TITULOS[paso][1]}</p>
        <div style={{display:"flex",alignItems:"flex-start",gap:14}}>
          <OtterMascot step={paso}/>
          <div style={{flex:1,minWidth:0}}>{cuerpo()}</div>
        </div>
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
        // 1) Intentar renovar la sesión con el refresh_token (los access_token caducan en ~1h)
        if(sesion.refresh_token){
          try{
            const d=await sbRefresh(sesion.refresh_token);
            const ses={ access_token:d.access_token, refresh_token:d.refresh_token||sesion.refresh_token, user:d.user||sesion.user };
            localStorage.setItem("vt_session",JSON.stringify(ses));
            setSesion(ses);setVerif(false);return;
          }catch(_){/* si falla (sin red o token revocado), probamos el access_token actual */}
        }
        // 2) Plan B: validar el access_token que había
        try{ const u=await sbGetUser(sesion.access_token); setSesion(s=>({...s,user:u})); }
        catch(_){ localStorage.removeItem("vt_session"); setSesion(null); }
      }
      setVerif(false);
    })();
  // eslint-disable-next-line
  },[]);
  useEffect(()=>{
    // Renovación periódica mientras la app está abierta (antes de que caduque la 1h)
    const t=setInterval(async()=>{
      try{
        const s=JSON.parse(localStorage.getItem("vt_session")||"null");
        if(!s||!s.refresh_token)return;
        const d=await sbRefresh(s.refresh_token);
        const ses={ access_token:d.access_token, refresh_token:d.refresh_token||s.refresh_token, user:d.user||s.user };
        localStorage.setItem("vt_session",JSON.stringify(ses));
        setSesion(ses);
      }catch(_){}
    },50*60*1000);
    return()=>clearInterval(t);
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
