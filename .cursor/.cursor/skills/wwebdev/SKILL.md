---
name: wwebdev
description: "Expert CSS interactif style wweb.dev (2026) : générateurs preview+copie, blur aurora (cercles floutés), loaders conic-gradient/mask, séparateurs section, nav burger sans JS, hover wave/stripe/gradient, backgrounds animés. Toujours lire ce skill pour le code exact ; combinable avec animejs-v4-expert pour le mouvement."
---

# 🛠️ Expert CSS Interactif — Style wweb.dev

Ce skill te rend capable de **créer** n'importe quel outil CSS interactif de qualité
production. Il contient les implémentations exactes de chaque technique.

---

## OUTIL 1 — Blur Background Generator

**Ce que ça fait :** Fond avec des cercles floutés colorés (effet glassmorphism/aurora).

### Technique CSS exacte

```css
/* Conteneur */
.background {
  position: absolute;
  overflow: hidden;
  width: 100%; height: 100%;
  top: 0; left: 0;
  background: linear-gradient(to right, #FFFFFF, #ECE9E6);
  display: flex;
  flex-grow: 1;
}

/* Chaque cercle flouté */
.background div {
  position: absolute;
  border-radius: 100%;
  height: 0;                    /* ← ASTUCE : carré via padding-top */
  filter: blur(240vw);          /* ← blur massif = effet doux */
  opacity: 0.4;
}

/* Cercle #1 — positionné en % */
.background div:nth-child(1) {
  background: linear-gradient(132deg, #1FCFC3 0%, #1F91CF 100%);
  width: 30%;
  padding-top: 30%;             /* ← égal à width → forme carrée → blur = cercle */
  left: 20%;
  top: 20%;
  transform: translateX(-50%) translateY(-50%);  /* ← centré sur le point */
}
```

**Astuce clé :** `height: 0` + `padding-top: X%` = carré responsive. `border-radius: 100%` + `filter: blur()` = cercle flouté. Le blur est en `vw` pour rester proportionnel.

### HTML généré

```html
<div class="background">
  <div></div>   <!-- cercle 1 -->
  <div></div>   <!-- cercle 2 -->
  <div></div>   <!-- cercle 3 -->
</div>
```

### Paramètres configurables
- **Background gradient** : couleur gauche + couleur droite du fond
- **Circle count** : 1 à 5 cercles (génère autant de `nth-child`)
- **Par cercle** : top (%), left (%), size (= width = padding-top en %), gradient start + end color

### Générateur CSS dynamique (JavaScript)

```javascript
function generateBlurCSS(config) {
  const circlesCSS = config.circles.map((c, i) => `
.background div:nth-child(${i + 1}) {
  background: linear-gradient(132deg, ${c.color1} 0.00%, ${c.color2} 100.00%);
  width: ${c.size}%;
  padding-top: ${c.size}%;
  left: ${c.left}%;
  top: ${c.top}%;
  transform: translateX(-50%) translateY(-50%);
}`).join('\n')

  return `.background {
  position: absolute;
  overflow: hidden;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  background: linear-gradient(to right, ${config.bg1}, ${config.bg2});
  display: flex;
  flex-grow: 1;
}
.background div {
  position: absolute;
  border-radius: 100%;
  height: 0;
  filter: blur(240vw);
  opacity: 0.4;
}
${circlesCSS}`
}

function generateBlurHTML(count) {
  const divs = Array(count).fill('<div></div>').join('\n  ')
  return `<div class="background">\n  ${divs}\n</div>`
}
```

---

## OUTIL 2 — Pure CSS Loader Generator

**Ce que ça fait :** Spinner CSS utilisant `conic-gradient` + `mask` + animation `steps()`.

### Technique CSS exacte

```css
.loader {
  width: 50px;
  aspect-ratio: 1;
  border-radius: 50%;
  padding: 1px;
  background: conic-gradient(#0000, #1E4D92) content-box;
  mask:
    repeating-conic-gradient(
      #0000 0deg,
      #000 1deg calc(360deg/10 - 10deg - 1deg),
      #0000 calc(360deg/10 - 10deg) calc(360deg/10)
    ),
    radial-gradient(
      farthest-side,
      #0000 calc(98% - 10px),
      #000 calc(100% - 10px)
    );
  mask-composite: intersect;
  -webkit-mask-composite: destination-in;
  animation: spin 1000ms infinite steps(10);
}
@keyframes spin { to { transform: rotate(1turn) } }
```

**Comprendre les paramètres :**
- `COUNT` = nombre de segments (10 dans l'exemple) → apparaît dans `360deg/COUNT` et `steps(COUNT)`
- `SIZE` = épaisseur de l'anneau en px → apparaît dans `calc(98% - SIZE)` et `calc(100% - SIZE)`
- `GAP` = espace entre segments en degrés → apparaît dans `calc(360deg/COUNT - GAP - 1deg)`
- `COLOR` = couleur du loader → dans `conic-gradient(#0000, COLOR)`
- `DURATION` = durée en ms → dans `animation: spin DURATIONms infinite steps(COUNT)`

### Générateur CSS dynamique

```javascript
function generateLoaderCSS({ color, count, size, gap, duration }) {
  return `.loader {
  width: 50px;
  aspect-ratio: 1;
  border-radius: 50%;
  padding: 1px;
  background: conic-gradient(#0000, ${color}) content-box;
  mask:
    repeating-conic-gradient(
      #0000 0deg,
      #000 1deg calc(360deg/${count} - ${gap}deg - 1deg),
      #0000 calc(360deg/${count} - ${gap}deg) calc(360deg/${count})
    ),
    radial-gradient(
      farthest-side,
      #0000 calc(98% - ${size}px),
      #000 calc(100% - ${size}px)
    );
  mask-composite: intersect;
  -webkit-mask-composite: destination-in;
  animation: spin ${duration}ms infinite steps(${count});
}
@keyframes spin { to { transform: rotate(1turn) } }`
}
```

### HTML généré

```html
<div class="loader"></div>
```

---

## OUTIL 3 — CSS Section Separator Generator

**Ce que ça fait :** 6 types de séparateurs entre sections — tous personnalisables.

### Les 6 types avec CSS exact

#### 3a. Skewed (incliné)

```css
section {
  position: relative;
  background: #2c3e50;
  padding: 100px 0;
}
section::after {
  content: '';
  position: absolute;
  bottom: 0; left: 0;
  width: 100%; height: 100%;
  background: white;
  transform-origin: right bottom;
  transform: skewY(-6deg);   /* ← angle configurable */
}
```

**Reversed :** `transform-origin: left bottom; transform: skewY(6deg);`

#### 3b. Semi-circle

```css
section::after {
  content: '';
  position: absolute;
  bottom: -50px; left: 50%;
  transform: translateX(-50%);
  width: 100px;             /* ← size configurable */
  height: 100px;
  background: white;
  border-radius: 50%;
}
/* Reversed : top au lieu de bottom, border-radius top */
```

#### 3c. Wave (SVG inline)

```html
<section>
  <div class="wave-container">
    <svg viewBox="0 0 1200 120" preserveAspectRatio="none">
      <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,
        168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,
        146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z"
        fill="#ffffff" />
    </svg>
  </div>
</section>
```

```css
.wave-container {
  position: absolute;
  bottom: 0; left: 0;
  width: 100%; overflow: hidden;
  line-height: 0;
}
.wave-container svg {
  display: block;
  width: 100%;
  height: 80px;              /* ← height configurable */
}
```

#### 3d. Spikes

```css
section::after {
  content: '';
  position: absolute;
  bottom: 0; left: 0;
  width: 100%;
  height: 0;
  background: white;
  /* Répétition de triangles */
  clip-path: polygon(
    0% 100%, 5% 0%, 10% 100%, 15% 0%, 20% 100%,
    25% 0%, 30% 100%, 35% 0%, 40% 100%, 45% 0%,
    50% 100%, 55% 0%, 60% 100%, 65% 0%, 70% 100%,
    75% 0%, 80% 100%, 85% 0%, 90% 100%, 95% 0%, 100% 100%
  );
  height: 40px;              /* ← size configurable */
}
```

#### 3e. Triangle

```css
section::after {
  content: '';
  position: absolute;
  bottom: 0; left: 0;
  width: 0; height: 0;
  border-left: 50vw solid transparent;
  border-right: 50vw solid transparent;
  border-bottom: 80px solid white;   /* ← size = border-bottom height */
}
/* Reversed : border-top au lieu de border-bottom */
```

#### 3f. Curved

```css
section::after {
  content: '';
  position: absolute;
  bottom: -40px; left: -5%;
  width: 110%; height: 80px;        /* ← size configurable */
  background: white;
  border-radius: 50% 50% 0 0 / 80% 80% 0 0;  /* ← courbe via border-radius */
}
```

### Générateur JS

```javascript
function generateSeparatorCSS(type, angle, reversed) {
  const transforms = {
    skewed: `skewY(${reversed ? angle : -angle}deg)`,
  }
  const origins = {
    skewed: reversed ? 'left bottom' : 'right bottom'
  }
  // ... switch sur type, retourne CSS approprié
}
```

---

## OUTIL 4 — Responsive Navigation Generator (pure CSS, 0 JavaScript)

**Ce que ça fait :** Navbar responsive avec burger menu — aucun JS, pure CSS.

### Technique clé : le checkbox hack

```html
<nav class="menu-container">
  <!-- Le checkbox invisible = interrupteur -->
  <input type="checkbox" aria-label="Toggle menu" />
  <!-- Les 3 barres du burger -->
  <span></span>
  <span></span>
  <span></span>
  <!-- Logo -->
  <a href="#" class="menu-logo">
    <img src="logo.png" alt="Logo" />
  </a>
  <!-- Menu items : 2 ul = gauche + droite -->
  <div class="menu">
    <ul>
      <li><a href="#home">Home</a></li>
      <li><a href="#pricing">Pricing</a></li>
    </ul>
    <ul>
      <li><a href="#signup">Sign-up</a></li>
      <li><a href="#login">Login</a></li>
    </ul>
  </div>
</nav>
```

### CSS complet exact (avec variables)

```css
/* PRIMARY = bg nav | SECONDARY = couleur texte/burger | HOVER = couleur hover */
body { overflow-x: hidden; font-family: Sans-Serif; margin: 0; }

.menu-container {
  position: relative;
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  background: [PRIMARY];
  color: [SECONDARY];
  padding: 20px;
  z-index: 1;
  -webkit-user-select: none;
  user-select: none;
  box-sizing: border-box;
}

.menu-logo { line-height: 0; margin: 0 20px; }
.menu-logo img { max-height: 40px; max-width: 100px; flex-shrink: 0; }

.menu-container a {
  text-decoration: none;
  color: [PRIMARY];
  transition: color 0.3s ease;
}
.menu-container a:hover { color: [HOVER]; }

/* Checkbox invisible superposé sur les barres du burger */
.menu-container input {
  display: block;
  width: 35px; height: 25px;
  margin: 0;
  position: absolute;
  cursor: pointer;
  opacity: 0;              /* ← invisible mais cliquable */
  z-index: 2;
  -webkit-touch-callout: none;
}

/* Les 3 barres du burger */
.menu-container span {
  display: block;
  width: 33px; height: 4px;
  margin-bottom: 5px;
  background: [SECONDARY];
  border-radius: 3px;
  z-index: 1;
  transform-origin: 4px 0px;
  transition: transform 0.5s cubic-bezier(0.77,0.2,0.05,1.0),
              background 0.5s cubic-bezier(0.77,0.2,0.05,1.0),
              opacity 0.55s ease;
}

.menu-container span:first-child { transform-origin: 0% 0%; }
.menu-container span:nth-child(3) { transform-origin: 0% 100%; }

/* Quand checkbox cochée → transformer barres en X */
.menu-container input:checked ~ span {
  opacity: 1;
  transform: rotate(45deg) translate(3px, -1px);
  background: [PRIMARY];
}
.menu-container input:checked ~ span:nth-child(4) {
  opacity: 0;
  transform: rotate(0deg) scale(0.2, 0.2);
}
.menu-container input:checked ~ span:nth-child(3) {
  transform: rotate(-45deg) translate(-5px, 11px);
}

.menu ul { list-style: none; }
.menu li { padding: 10px 0; font-size: 22px; }

/* ── MOBILE ── */
@media only screen and (max-width: [BREAKPOINT]px) {
  .menu-container { flex-direction: column; align-items: flex-end; }
  
  .menu-logo {
    position: absolute;
    left: 0; top: 50%;
    transform: translateY(-50%);
  }
  
  /* Le menu slide depuis la droite */
  .menu {
    position: absolute;
    box-sizing: border-box;
    width: 300px;
    right: -300px;          /* ← hors écran à droite */
    top: 0;
    margin: -20px;
    padding: 75px 50px 50px;
    background: [SECONDARY];
    transform-origin: 0% 0%;
    transform: translateX(0%);
    transition: transform 0.5s cubic-bezier(0.77,0.2,0.05,1.0);
  }
  
  /* Checkbox cochée → menu glisse depuis droite */
  .menu-container input:checked ~ .menu { transform: translateX(-100%); }
}

/* ── DESKTOP ── */
@media only screen and (min-width: [BREAKPOINT]px) {
  .menu-container { width: 100%; }
  .menu-container a { color: [SECONDARY]; }
  .menu-container input, .menu-container span { display: none; }
  
  .menu {
    position: relative;
    width: 100%;
    display: flex;
    justify-content: space-between;
  }
  .menu ul { display: flex; padding: 0; }
  .menu li { padding: 0 20px; }
}
```

**Burger à gauche :** Ajouter `.menu-container { flex-direction: row-reverse; }` sur desktop et ajuster le positionnement du logo.

---

## OUTIL 5 — Creative Hover Effects (6 effets sur liens)

**Ce que ça fait :** Effets visuels créatifs sur des liens `<a>` au hover.

### Structure HTML commune

```html
<a href="#" class="hover-effect">HOVER ME</a>
```

### Effet 1 — Wave

```css
.hover-wave {
  position: relative;
  text-decoration: none;
  color: #333;
  font-weight: bold;
  padding-bottom: 4px;
}
.hover-wave::before {
  content: '';
  position: absolute;
  bottom: 0; left: 0;
  width: 100%; height: 2px;
  background: currentColor;
  transform-origin: right;
  transform: scaleX(0);
  transition: transform 0.3s ease;
}
/* Animation wave via SVG filter ou clip-path ondulé */
.hover-wave::after {
  content: '';
  position: absolute;
  bottom: 0; left: 0;
  width: 100%; height: 8px;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 4'%3E%3Cpath d='M0 2 Q5 0 10 2 Q15 4 20 2' stroke='%23333' fill='none' stroke-width='1'/%3E%3C/svg%3E") repeat-x;
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.4s ease;
}
.hover-wave:hover::after { transform: scaleX(1); }
```

### Effet 2 — Stripes

```css
.hover-stripes {
  position: relative;
  text-decoration: none;
  color: white;
  padding: 8px 16px;
  background: #333;
  overflow: hidden;
}
.hover-stripes::before {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 10px,
    rgba(255,255,255,0.15) 10px,
    rgba(255,255,255,0.15) 20px
  );
  transform: translateX(-100%);
  transition: transform 0.4s ease;
}
.hover-stripes:hover::before { transform: translateX(0); }
```

### Effet 3 — Curvy

```css
.hover-curvy {
  position: relative;
  text-decoration: none;
  color: #333;
  font-weight: bold;
}
.hover-curvy::before {
  content: '';
  position: absolute;
  bottom: -4px; left: 0;
  width: 100%; height: 3px;
  background: currentColor;
  border-radius: 50%;
  transform: scaleX(0) scaleY(0);
  transform-origin: center;
  transition: transform 0.35s ease;
}
.hover-curvy:hover::before { transform: scaleX(1) scaleY(1); }
```

### Effet 4 — Border (draw-in)

```css
.hover-border {
  position: relative;
  text-decoration: none;
  color: #333;
  padding: 8px 16px;
}
.hover-border::before,
.hover-border::after {
  content: '';
  position: absolute;
  border: 2px solid transparent;
  width: 0; height: 0;
  transition: width 0.2s ease, height 0.2s ease 0.2s, border-color 0s 0s;
}
.hover-border::before { top: 0; left: 0; }
.hover-border::after  { bottom: 0; right: 0; }
.hover-border:hover::before,
.hover-border:hover::after {
  width: 100%; height: 100%;
  border-color: currentColor;
}
.hover-border:hover::before { transition: width 0.2s ease 0.2s, height 0.2s ease; }
.hover-border:hover::after  { transition: width 0.2s ease 0.2s, height 0.2s ease; }
```

### Effet 5 — Gradient reveal

```css
.hover-gradient {
  position: relative;
  text-decoration: none;
  color: transparent;
  background: linear-gradient(90deg, #667eea, #764ba2);
  background-clip: text;
  -webkit-background-clip: text;
  font-weight: bold;
}
.hover-gradient::before {
  content: attr(data-text);
  position: absolute;
  inset: 0;
  color: #333;
  transition: opacity 0.3s ease;
}
.hover-gradient:hover::before { opacity: 0; }
```

### Effet 6 — Stripes 2 (wipe vertical)

```css
.hover-stripes2 {
  position: relative;
  text-decoration: none;
  color: #333;
  padding: 8px 16px;
  overflow: hidden;
}
.hover-stripes2::before {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    90deg,
    rgba(0,0,0,0.07),
    rgba(0,0,0,0.07) 1px,
    transparent 1px,
    transparent 8px
  );
  transform: translateY(101%);
  transition: transform 0.3s ease;
}
.hover-stripes2:hover::before { transform: translateY(0); }
```

---

## OUTIL 6 — Animated CSS Background Generator (3 variantes)

### Variante A — Bokeh (bulles flottantes)

**Nécessite un peu de JS** pour positionner aléatoirement les spans.

```html
<div class="bokeh-bg">
  <!-- spans générés dynamiquement par JS -->
</div>
```

```css
.bokeh-bg {
  position: fixed;
  width: 100%; height: 100%;
  background: [BG_COLOR];
  overflow: hidden;
}
.bokeh-bg span {
  position: absolute;
  display: block;
  border-radius: 50%;
  animation: bokeh-move linear infinite;
  bottom: -150px;
}
@keyframes bokeh-move {
  0%   { transform: translateY(0) rotate(0deg); opacity: 0.8; border-radius: 50%; }
  100% { transform: translateY(-1000px) rotate(720deg); opacity: 0; border-radius: 50%; }
}
```

```javascript
function generateBokeh({ count, size, speed, colors, bgColor }) {
  const container = document.querySelector('.bokeh-bg')
  
  for (let i = 0; i < count; i++) {
    const span = document.createElement('span')
    const s = Math.random() * size + 10
    const color = colors[Math.floor(Math.random() * colors.length)]
    
    span.style.cssText = `
      width: ${s}px;
      height: ${s}px;
      left: ${Math.random() * 100}%;
      bottom: ${Math.random() * 100}%;
      background: ${color};
      filter: blur(${s / 4}px);
      animation-duration: ${Math.random() * speed + speed / 2}s;
      animation-delay: ${Math.random() * speed}s;
    `
    container.appendChild(span)
  }
}
```

**CSS généré pour copy-paste :**
```javascript
function generateBokehCSS({ count, size, speed, bgColor }) {
  let spans = ''
  const css_spans = Array.from({length: count}, (_, i) => {
    const s = Math.floor(Math.random() * size + 10)
    const left = Math.floor(Math.random() * 100)
    const delay = (Math.random() * speed).toFixed(1)
    const dur = (Math.random() * speed + speed / 2).toFixed(1)
    spans += `\n    <span></span>`
    return `.bokeh-bg span:nth-child(${i+1}) {
  width: ${s}px; height: ${s}px;
  left: ${left}%;
  animation-duration: ${dur}s;
  animation-delay: -${delay}s;
}`
  }).join('\n')
  
  return { html: `<div class="bokeh-bg">${spans}\n</div>`, css: css_spans }
}
```

### Variante B — Pure CSS (rectangles → cercles qui montent)

```html
<ul class="circles-bg">
  <li></li><li></li><li></li><!-- ... autant que count -->
</ul>
```

```css
.circles-bg {
  position: fixed;
  width: 100%; height: 100%;
  top: 0; left: 0;
  overflow: hidden;
  margin: 0; padding: 0;
  list-style: none;
  background: [BG_COLOR];
}
.circles-bg li {
  position: absolute;
  display: block;
  background: rgba(255, 255, 255, 0.2);
  animation: circles-rise [SPEED]s linear infinite;
  bottom: -150px;
}
/* nth-child pour varier taille/position/délai */
.circles-bg li:nth-child(1) { left: 25%; width: 80px; height: 80px; animation-delay: 0s; }
.circles-bg li:nth-child(2) { left: 10%; width: 20px; height: 20px; animation-delay: 2s; animation-duration: 12s; }
/* ... */
@keyframes circles-rise {
  0%   { transform: translateY(0) rotate(0deg); opacity: 1; border-radius: 0; }
  100% { transform: translateY(-1000px) rotate(720deg); opacity: 0; border-radius: 50%; }
}
```

### Variante C — Cubes (spinning + growing)

```html
<ul class="cubes-bg">
  <li></li><!-- × count -->
</ul>
```

```css
.cubes-bg {
  position: fixed; inset: 0;
  overflow: hidden;
  margin: 0; padding: 0; list-style: none;
  background: [BG_COLOR];
}
.cubes-bg li {
  position: absolute;
  bottom: 0;
  opacity: 0;
  background: [CUBE_COLOR];
  animation: cubes-spin [SPEED]s linear infinite;
}
.cubes-bg li:nth-child(1) { left: 10%; width: [SIZE]px; height: [SIZE]px; animation-delay: 0s; }
/* ... */
@keyframes cubes-spin {
  0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
  90%  { opacity: 1; }
  100% { transform: translateY(-100vh) rotate(720deg); opacity: 0; }
}
```

---

## PATTERN UI — Construire un générateur interactif

Tout outil wweb.dev suit ce même pattern d'interface :

### Structure HTML d'un générateur

```html
<div class="generator-layout">
  <!-- 1. PREVIEW LIVE -->
  <div class="preview-area">
    <!-- Le rendu se met à jour ici en temps réel -->
  </div>

  <!-- 2. PANNEAU DE CONTRÔLES -->
  <div class="controls-panel">
    <!-- Color picker -->
    <label>Couleur</label>
    <div class="color-input">
      <input type="color" id="color1" value="#1FCFC3">
      <input type="text" id="color1-hex" value="#1FCFC3" maxlength="7">
    </div>

    <!-- Slider avec valeur affichée -->
    <label>Taille — <span id="size-val">30</span>%</label>
    <input type="range" id="size" min="10" max="100" value="30">

    <!-- Toggle -->
    <label class="toggle-row">
      Reversed
      <input type="checkbox" id="reversed" class="toggle">
    </label>

    <!-- Select -->
    <label>Type</label>
    <select id="type">
      <option value="skewed">Skewed</option>
      <option value="wave">Wave</option>
    </select>
  </div>

  <!-- 3. CODE OUTPUT avec copie -->
  <div class="code-output">
    <div class="code-tab active" data-lang="CSS">CSS</div>
    <div class="code-tab" data-lang="HTML">HTML</div>

    <button class="copy-btn" onclick="copyCode()">Copy Code</button>
    <div class="copied-msg" style="display:none">✓ copied</div>

    <pre class="code-block"><code id="generated-code"></code></pre>
  </div>
</div>
```

### JavaScript du générateur (pattern universel)

```javascript
// 1. Lire tous les contrôles → objet config
function getConfig() {
  return {
    color: document.getElementById('color1').value,
    size: +document.getElementById('size').value,
    reversed: document.getElementById('reversed').checked,
    type: document.getElementById('type').value,
  }
}

// 2. Générer le CSS selon la config
function generateCSS(config) {
  // ... logique selon l'outil
  return `/* CSS généré */\n.element { ... }`
}

// 3. Mettre à jour la preview
function updatePreview(config) {
  // Appliquer les styles directement à l'élément preview
  const preview = document.querySelector('.preview-area')
  preview.style.background = config.color
  // ...
}

// 4. Mettre à jour le code affiché
function update() {
  const config = getConfig()
  updatePreview(config)
  document.getElementById('generated-code').textContent = generateCSS(config)
}

// 5. Synchroniser color picker ↔ hex input
document.getElementById('color1').addEventListener('input', e => {
  document.getElementById('color1-hex').value = e.target.value
  update()
})
document.getElementById('color1-hex').addEventListener('input', e => {
  if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
    document.getElementById('color1').value = e.target.value
    update()
  }
})

// 6. Slider → afficher valeur
document.getElementById('size').addEventListener('input', e => {
  document.getElementById('size-val').textContent = e.target.value
  update()
})

// 7. Copy to clipboard avec feedback
async function copyCode() {
  const code = document.getElementById('generated-code').textContent
  await navigator.clipboard.writeText(code)
  
  const btn = document.querySelector('.copy-btn')
  const msg = document.querySelector('.copied-msg')
  btn.style.display = 'none'
  msg.style.display = 'block'
  setTimeout(() => {
    btn.style.display = 'block'
    msg.style.display = 'none'
  }, 2000)
}

// 8. Initialisation
update()
```

---

## RÈGLES DE QUALITÉ — Ce qu'un senior fait toujours

1. **Le code généré est minimal et propre** — pas de classes inutiles, commentaires utiles
2. **Preview identique au résultat** — ce que l'utilisateur voit = ce qu'il obtient
3. **Copie immédiate avec confirmation visuelle** — "copied" pendant 2s
4. **Synchronisation color picker ↔ hex input** — toujours les deux
5. **Sliders affichent leur valeur** — `Size — 30px` à côté du label
6. **CSS généré = cross-browser** — toujours inclure `-webkit-` préfixes nécessaires
7. **Code sans framework** — HTML/CSS pur dans l'output (pas de React/Vue dans le CSS généré)
8. **MIT license** — tout le code généré est libre d'utilisation commerciale

---

## Références complémentaires

- `references/css-techniques.md` — Techniques CSS avancées approfondies
- `references/ui-components.md` — Composants UI réutilisables (color picker, slider, toggle)
