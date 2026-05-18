# 🌿 VitalTrack — Optimización Nutricional Familiar

App para registrar tus alimentos, hacer seguimiento de nutrientes y recibir análisis con IA.

## 🚀 Instalación y despliegue en GitHub Pages

### Paso 1 — Instalar dependencias
```bash
npm install
```

### Paso 2 — Probar localmente
```bash
npm run dev
```
Abre http://localhost:5173 en tu navegador.

### Paso 3 — Crear repositorio en GitHub
1. Ve a github.com → New repository
2. Nombre: `vitaltrack`
3. Público ✅
4. Create repository

### Paso 4 — Subir el código
```bash
git init
git add .
git commit -m "VitalTrack inicial"
git branch -M main
git remote add origin https://github.com/TUUSUARIO/vitaltrack.git
git push -u origin main
```

### Paso 5 — Desplegar en GitHub Pages
```bash
npm run deploy
```

### Paso 6 — Activar GitHub Pages
1. Ve a tu repo en GitHub → Settings → Pages
2. Source: selecciona rama `gh-pages`
3. Save

Tu app estará en: **https://TUUSUARIO.github.io/vitaltrack**

---

## 📱 Cómo instalarla en el celular

1. Abre el link en Chrome (Android) o Safari (iPhone)
2. Menú del navegador → "Añadir a pantalla de inicio"
3. Queda como app instalada con ícono 🌿

---

## 👨‍👩‍👧‍👦 Para compartir con la familia

Simplemente envía el link por WhatsApp. Cada persona guarda su historial en su propio celular.

---

## 🔧 Tecnologías
- React 18 + Vite
- GitHub Pages (gratis)
- Anthropic Claude API (análisis nutricional IA)
- localStorage (historial personal por dispositivo)
