# Techniques CSS Approfondies — wwebdev Expert

## Astuce blur circles (padding-top = width trick)

Le truc magique du blur background generator :
- `height: 0` + `padding-top: 30%` → carré (car padding en % = % de la LARGEUR du parent)
- `border-radius: 100%` → transforme ce carré en cercle parfait
- `filter: blur(240vw)` → blur massif, le `vw` le rend proportionnel à l'écran
- `opacity: 0.4` → transparence pour effet doux

Pourquoi `padding-top` au lieu de `height` ?
→ `height: 30%` = % de la hauteur du parent (inconsistant)
→ `padding-top: 30%` = toujours % de la LARGEUR → carré garanti

---

## Conic-gradient + mask pour loaders

`conic-gradient` dessine un dégradé en rotation autour d'un centre.
`mask` agit comme un pochoir : seules les zones `#000` du mask sont visibles.

```css
/* conic-gradient(#0000, #1E4D92) = de transparent à bleu, sur 360° */
background: conic-gradient(#0000, #1E4D92) content-box;

/* repeating-conic-gradient = répète le pattern tous les 360/COUNT degrés */
/* Résultat : COUNT segments avec des gaps */
mask: repeating-conic-gradient(
  #0000 0deg,                              /* début : transparent */
  #000  1deg calc(360deg/10 - 10deg - 1deg), /* segment visible */
  #0000 calc(360deg/10 - 10deg) calc(360deg/10) /* gap */
),
/* radial-gradient pour créer le trou central → anneau */
radial-gradient(
  farthest-side,
  #0000 calc(98% - 10px),   /* intérieur transparent */
  #000  calc(100% - 10px)   /* anneau visible = 10px d'épaisseur */
);
mask-composite: intersect; /* intersection des deux masks */
```

Animation `steps(N)` = rotation discrète (saccadée) en N paliers → effet tick.

---

## Checkbox hack pour burger menu (0 JS)

```css
/* L'input checkbox transparent flotte au-dessus du burger */
input {
  opacity: 0;       /* invisible */
  position: absolute;
  z-index: 2;       /* au-dessus des spans */
  width: 35px; height: 25px; /* même taille que burger */
  cursor: pointer;
}

/* Le sélecteur ~ = frère général suivant */
/* input:checked ~ span = "quand la checkbox est cochée, styler les spans" */
input:checked ~ span { transform: rotate(45deg); }
input:checked ~ .menu { transform: translateX(-100%); }
```

Pourquoi `input` avant les `span` dans le DOM ? → Le sélecteur CSS `~` ne fonctionne
que vers les FRÈRES SUIVANTS, jamais vers les précédents.

---

## clip-path pour séparateurs

```css
/* Triangle pointant vers le bas */
clip-path: polygon(0 0, 100% 0, 50% 100%);

/* Triangle pointant vers le haut */
clip-path: polygon(50% 0, 100% 100%, 0 100%);

/* Vague simple */
clip-path: ellipse(55% 40% at 50% 60%);

/* Spikes/zigzag — coordonnées en % */
clip-path: polygon(0% 0%, 5% 100%, 10% 0%, 15% 100%, /* ... */);
```

`skewY()` vs `clip-path` :
- `skewY` = penche TOUT le contenu (texte inclus) → utiliser sur un pseudo-élément `::after`
- `clip-path` = découpe sans incliner → préférable pour shapes complexes

---

## SVG inline pour wave separator

```html
<!-- preserveAspectRatio="none" = étire le SVG à 100% sans garder les proportions -->
<svg viewBox="0 0 1200 120" preserveAspectRatio="none">
  <!-- La path doit finir à V0 H0 pour fermer la forme en bas -->
  <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86...V0H0V27.35Z" fill="#fff"/>
</svg>
```

Modifier l'amplitude de la vague : toucher les Y des points de contrôle bezier.
Modifier la hauteur : CSS `height` sur le SVG ou son conteneur.

---

## background-clip: text pour gradient sur texte

```css
.gradient-text {
  background: linear-gradient(90deg, #667eea, #764ba2);
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;           /* ← obligatoire sinon le gradient est caché derrière le texte */
  -webkit-text-fill-color: transparent; /* fallback Safari */
}
```

---

## transform-origin pour animations précises

```css
/* Rotation depuis le coin bas-gauche */
.element {
  transform-origin: 0% 100%;
  transform: rotate(-6deg);
}

/* Barre burger → X : chaque barre tourne depuis son bord */
span:first-child  { transform-origin: 0% 0%; }   /* bord haut-gauche */
span:last-child   { transform-origin: 0% 100%; }  /* bord bas-gauche */
```

---

## Animations avec délais aléatoires (JS → CSS)

```javascript
// Générer des styles inline pour varier les animations
elements.forEach((el, i) => {
  const delay = (Math.random() * maxDelay).toFixed(2)
  const duration = (minDur + Math.random() * (maxDur - minDur)).toFixed(2)
  const left = Math.floor(Math.random() * 100)
  const size = Math.floor(minSize + Math.random() * (maxSize - minSize))
  
  el.style.cssText = `
    left: ${left}%;
    width: ${size}px;
    height: ${size}px;
    animation-duration: ${duration}s;
    animation-delay: -${delay}s;  /* délai négatif = commence en cours d'animation */
  `
})
```

`animation-delay` négatif → l'animation démarre comme si elle était déjà en cours
→ évite que tous les éléments partent en même temps au chargement.

---

## CSS custom properties pour générateurs

```css
/* Définir les variables sur :root ou l'élément cible */
.separator {
  --sep-color: #2c3e50;
  --sep-height: 80px;
  --sep-angle: -6deg;
}
.separator::after {
  height: var(--sep-height);
  transform: skewY(var(--sep-angle));
  background: var(--sep-color);
}
```

→ En JS, mettre à jour `element.style.setProperty('--sep-angle', angle + 'deg')`
→ La preview se met à jour instantanément sans regénérer le CSS
→ Mais dans le CSS final généré, remplacer les variables par les valeurs

---

## Préfixes CSS indispensables en 2026

```css
/* mask — toujours doubler */
mask: ...;
-webkit-mask: ...;

/* mask-composite */
mask-composite: intersect;
-webkit-mask-composite: destination-in;

/* background-clip: text */
background-clip: text;
-webkit-background-clip: text;

/* user-select */
user-select: none;
-webkit-user-select: none;

/* text-fill-color */
-webkit-text-fill-color: transparent;

/* backdrop-filter */
backdrop-filter: blur(10px);
-webkit-backdrop-filter: blur(10px);
```
