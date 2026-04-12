---
name: animejs-v4-expert
description: "Expert anime.js v4 : animate, createTimeline, stagger, onScroll, easings/spring, SVG, texte, layout. Déclencher pour motion, parallax, draggable, WAAPI. Lire SKILL + references ; vanilla/React ; UMD cdn jsdelivr …/lib/anime.umd.min.js. Combiner skill wwebdev pour couches CSS type wweb.dev."
---

# Anime.js V4 — Expert Senior Skill

## Vue d'ensemble

Anime.js v4 est un moteur d'animation JavaScript léger, modulaire et performant.
- **Version** : 4.0.0 (réécriture complète vs v3)
- **Auteur** : Julian Garnier
- **Licence** : MIT
- **Taille** : ~15KB gzippé (tree-shakable)
- **Site** : https://animejs.com
- **Doc** : https://animejs.com/documentation

**Combinaison** : pour des calques CSS purs (blur aurora, loaders `mask`, séparateurs, patterns type wweb.dev) en complément du JS, lire le skill **wwebdev** (`.cursor/skills/wwebdev/`).

## Architecture du skill

Ce skill est organisé en 2 niveaux :

1. **Ce fichier** (SKILL.md) — Vue globale de l'API, patterns fondamentaux, règles de génération
2. **Fichiers de référence** (dans `references/`) — API détaillée par module

### Quand lire les références

| Besoin | Lire |
|--------|------|
| Animation basique (translate, rotate, opacity, couleurs) | Ce fichier suffit |
| Timeline complexe, positions, sync | `references/timeline-api.md` |
| Scroll-driven animations, onScroll | `references/events-scroll-api.md` |
| Draggable, snap, container, carousel | `references/draggable-api.md` |
| SVG morph, draw, motion path | `references/svg-api.md` |
| Text splitting, effets texte | `references/text-api.md` |
| Layout animations (FLIP), enter/exit | `references/layout-api.md` |
| Stagger avancé, grille, axes | `references/stagger-utilities-api.md` |
| Easings, spring, bézier, steps | `references/easings-api.md` |
| WAAPI (Web Animation API) mode | `references/waapi-api.md` |
| Scope, Animatable, Engine, Timer | `references/scope-engine-api.md` |
| Intégration React / Next.js | `references/react-integration.md` |
| Recettes & patterns avancés | `references/advanced-patterns.md` |

---

## Installation

### NPM (recommandé)
```bash
npm install animejs
```

### CDN — ES Modules
```html
<script type="module">
import { animate } from 'https://esm.sh/animejs';
</script>
```

### CDN — UMD (global)
```html
<script src="https://cdn.jsdelivr.net/npm/animejs/dist/bundles/anime.umd.min.js"></script>
<script>
  const { animate } = anime;
</script>
```

---

## Imports — Architecture modulaire

### Import principal (avec tree-shaking)
```js
import { animate, createTimeline, stagger, utils } from 'animejs';
```

### Imports par sous-chemin (sans bundler / sans tree-shaking)
```js
import { animate } from 'animejs/animation';
import { createTimer } from 'animejs/timer';
import { createTimeline } from 'animejs/timeline';
import { createAnimatable } from 'animejs/animatable';
import { createDraggable } from 'animejs/draggable';
import { createLayout } from 'animejs/layout';
import { createScope } from 'animejs/scope';
import { engine } from 'animejs/engine';
import * as events from 'animejs/events';
import * as easings from 'animejs/easings';
import * as utils from 'animejs/utils';
import * as svg from 'animejs/svg';
import * as text from 'animejs/text';
import * as waapi from 'animejs/waapi';
```

---

## API Fondamentale — `animate()`

C'est LA fonction principale. Elle anime des cibles (éléments DOM, objets JS, SVG).

### Signature
```js
animate(targets, parameters)
```

### Targets (ce qu'on anime)
```js
// Sélecteur CSS
animate('.box', { x: 250 });

// Élément DOM
animate(document.querySelector('.box'), { x: 250 });

// Objet JavaScript
const obj = { value: 0 };
animate(obj, { value: 100, onUpdate: () => console.log(obj.value) });

// Tableau mixte
animate(['.box', document.getElementById('el'), obj], { x: 250 });
```

### Propriétés animables
```js
animate('.el', {
  // CSS transforms (pas besoin de "transform:")
  x: 250,              // translateX
  y: 100,              // translateY
  rotate: 360,         // rotation en degrés
  scale: 1.5,
  skewX: 15,

  // Propriétés CSS
  opacity: 0.5,
  width: '80%',
  backgroundColor: '#FF0000',
  borderRadius: '50%',

  // Conversion d'unités automatique
  width: '80%',        // depuis px vers %

  // Valeur de départ explicite
  rotate: { from: -180 },
  opacity: { from: 0, to: 1 },
});
```

### Types de valeurs
```js
animate('.el', {
  x: 250,                    // Numérique (px par défaut)
  width: '80%',              // Avec unité
  rotate: '1turn',           // Unité CSS
  color: '#FF0000',          // Couleur hex
  color: 'rgb(255,0,0)',     // Couleur rgb
  color: 'hsl(0,100%,50%)',  // Couleur hsl

  // Valeurs relatives (JS engine uniquement)
  x: '+=200',                // Ajouter 200
  x: '-=50',                 // Soustraire 50
  x: '*=2',                  // Multiplier par 2

  // Fonction (valeur par cible)
  x: (target, index, total) => index * 50,
  delay: (target, i, total) => i * 100,
});
```

### Paramètres de tween
```js
animate('.el', {
  x: 250,
  duration: 1000,       // Durée en ms (défaut: 1000)
  delay: 500,           // Délai avant démarrage
  ease: 'outExpo',      // Courbe d'accélération
  loop: true,           // Boucle infinie
  loop: 3,              // 3 boucles
  alternate: true,      // Aller-retour
  reversed: true,       // Inverser la direction
  autoplay: true,       // Jouer automatiquement (défaut)
  loopDelay: 200,       // Délai entre les boucles
  playbackRate: 2,      // Vitesse x2
  frameRate: 30,        // Limiter les FPS
});
```

### Paramètres par propriété
```js
animate('.el', {
  x: { to: 250, duration: 800, ease: 'outBack' },
  rotate: { to: 360, duration: 1200, ease: 'outElastic(1, .5)' },
  opacity: { to: 0.5, delay: 200 },
  duration: 1000,  // Durée par défaut pour les propriétés sans override
});
```

### Keyframes
```js
// Par valeurs (distribués équitablement sur la durée)
animate('.el', {
  x: [0, 100, 50, 200],
  rotate: [0, 180, 90, 360],
  duration: 2000,
});

// Par paramètres (contrôle par étape)
animate('.el', {
  x: [
    { to: 100, duration: 500 },
    { to: 50, duration: 300 },
    { to: 200, duration: 700, ease: 'outBounce' }
  ],
});

// Basés sur la durée (objet keyframes)
animate('.el', {
  keyframes: [
    { x: 100, y: 0, duration: 500 },
    { x: 100, y: 100, duration: 500 },
    { x: 0, y: 100, duration: 500 },
    { x: 0, y: 0, duration: 500 },
  ],
});

// Basés sur les pourcentages
animate('.el', {
  keyframes: {
    '0%':   { x: 0, y: 0 },
    '25%':  { x: 100, y: 0 },
    '50%':  { x: 100, y: 100 },
    '100%': { x: 0, y: 0 },
  },
  duration: 2000,
});
```

### Callbacks
```js
const anim = animate('.el', {
  x: 250,
  onBegin: (self) => {},      // Quand l'anim démarre
  onUpdate: (self) => {},     // À chaque frame
  onRender: (self) => {},     // Après le rendu DOM
  onLoop: (self) => {},       // À chaque fin de boucle
  onPause: (self) => {},      // Quand mis en pause
  onComplete: (self) => {},   // Quand terminé
});

// Promise-like
anim.then(() => console.log('Terminé !'));
```

### Méthodes de contrôle
```js
const anim = animate('.el', { x: 250, autoplay: false });

anim.play();        // Démarrer
anim.pause();       // Mettre en pause
anim.restart();     // Recommencer
anim.reverse();     // Inverser la direction
anim.alternate();   // Basculer aller/retour
anim.resume();      // Reprendre après pause
anim.complete();    // Aller à la fin
anim.cancel();      // Annuler (supprime l'anim)
anim.revert();      // Annuler + restaurer les styles
anim.reset();       // Remettre au début
anim.seek(500);     // Aller à 500ms
anim.stretch(2000); // Changer la durée totale
anim.refresh();     // Recalculer les valeurs (après resize etc.)
```

---

## Stagger — Décalage en cascade

```js
import { animate, stagger } from 'animejs';

// Décalage simple (chaque élément commence 100ms après le précédent)
animate('.el', { x: 250, delay: stagger(100) });

// Depuis le centre
animate('.el', { x: 250, delay: stagger(100, { from: 'center' }) });

// Depuis un index spécifique
animate('.el', { x: 250, delay: stagger(100, { from: 3 }) });

// Range de valeurs (distribué uniformément)
animate('.el', { rotate: stagger([0, 360]) });

// Avec easing
animate('.el', { x: 250, delay: stagger(100, { ease: 'outQuad' }) });

// Grille 2D
animate('.el', {
  scale: stagger([1, 2], { grid: [14, 5], from: 'center', axis: 'x' }),
  delay: stagger(100, { grid: [14, 5], from: 'center' }),
});

// Stagger sur les valeurs (pas juste le délai)
animate('.el', {
  rotate: stagger([0, 360]),
  x: stagger(10),
});
```

---

## Easings — Courbes d'accélération

### Noms intégrés
```
'linear'        — Vitesse constante
'in' / 'out' / 'inOut' — Power easing (défaut p=1.675)
'inQuad' / 'outQuad' / 'inOutQuad'
'inCubic' / 'outCubic' / 'inOutCubic'
'inQuart' / 'outQuart' / 'inOutQuart'
'inQuint' / 'outQuint' / 'inOutQuint'
'inSine' / 'outSine' / 'inOutSine'
'inCirc' / 'outCirc' / 'inOutCirc'
'inExpo' / 'outExpo' / 'inOutExpo'
'inBounce' / 'outBounce' / 'inOutBounce'
'inBack' / 'outBack' / 'inOutBack'
'inElastic' / 'outElastic' / 'inOutElastic'
```

### Avec paramètres
```js
ease: 'out(3)'                    // Power avec exposant
ease: 'inBack(2.5)'              // Overshoot personnalisé
ease: 'outElastic(1.2, .4)'      // Amplitude + période
ease: 'cubicBezier(.5, 0, .5, 1)' // Courbe de Bézier
ease: 'steps(6)'                  // Par paliers
ease: 'linear(.2, .8 40%, 1)'    // Linéaire segmenté
```

### Spring (ressort physique)
```js
import { spring } from 'animejs';

animate('.el', {
  x: 250,
  ease: spring({ mass: 1, stiffness: 100, damping: 10, velocity: 0 }),
});

// Raccourci avec duration perçue
animate('.el', {
  x: 250,
  ease: spring({ duration: 800, bounce: .25 }),
});
```

---

## Utilitaires clés

```js
import { utils } from 'animejs';

// Sélecteur DOM
const els = utils.$('.selector');

// Get / Set propriétés
const val = utils.get('.el', 'translateX');
utils.set('.el', { x: 100, opacity: 0.5 });

// Nettoyage
utils.cleanInlineStyles('.el');   // Supprime les styles inline
utils.remove(animation, '.el');   // Retire des cibles

// Maths
utils.random(0, 100);            // Nombre aléatoire
utils.random(0, 100, 2);         // Avec 2 décimales
utils.clamp(value, 0, 100);      // Borner
utils.round(value, 2);           // Arrondir
utils.snap(value, 10);           // Arrondir au multiple
utils.wrap(value, 0, 100);       // Boucler la valeur
utils.mapRange(value, 0, 1, 0, 100); // Mapper un range
utils.lerp(a, b, 0.5);           // Interpolation linéaire
utils.degToRad(180);             // Degrés → radians
utils.radToDeg(Math.PI);         // Radians → degrés
utils.shuffle(array);            // Mélanger un tableau
utils.randomPick(array);         // Choisir aléatoirement
```

---

## Règles de génération de code

### OBLIGATOIRE
1. **Toujours utiliser la syntaxe v4** — Jamais `anime({...})` de la v3
2. **Imports nommés** — `import { animate } from 'animejs'`, jamais `import anime from 'animejs'`
3. **`animate()` remplace `anime()`** — C'est le changement majeur v3 → v4
4. **`createTimeline()` remplace `anime.timeline()`**
5. **`loop: true` remplace `loop: true`** (inchangé) mais **`alternate: true` remplace `direction: 'alternate'`**
6. **`reversed: true` remplace `direction: 'reverse'`**
7. **Les transforms individuels** : `x`, `y`, `rotate`, `scale`, `skewX`, etc. (pas `translateX`)
8. **`ease` remplace `easing`** en v4
9. **Toujours `revert()` dans les cleanups React/Vue** pour éviter les fuites mémoire

### Changements majeurs v3 → v4
| v3 | v4 |
|----|----|
| `anime({targets, ...})` | `animate(targets, {...})` |
| `anime.timeline()` | `createTimeline()` |
| `easing: 'easeOutExpo'` | `ease: 'outExpo'` |
| `direction: 'alternate'` | `alternate: true` |
| `direction: 'reverse'` | `reversed: true` |
| `translateX` | `x` |
| `translateY` | `y` |
| `anime.stagger()` | `stagger()` (import direct) |

### Pattern React (useEffect + Scope)
```jsx
import { useRef, useEffect } from 'react';
import { createScope, animate, stagger } from 'animejs';

function MyComponent() {
  const root = useRef(null);
  const scope = useRef(null);

  useEffect(() => {
    scope.current = createScope({ root: root.current }).add(() => {
      animate('.box', {
        x: 250,
        rotate: 360,
        delay: stagger(100),
        ease: 'outExpo',
      });
    });
    return () => scope.current.revert(); // CLEANUP OBLIGATOIRE
  }, []);

  return (
    <div ref={root}>
      <div className="box" />
      <div className="box" />
    </div>
  );
}
```

### Pattern HTML autonome (CDN)
```html
<!DOCTYPE html>
<html>
<head>
  <style>
    .box { width: 50px; height: 50px; background: #FF4B4B; margin: 10px; }
  </style>
</head>
<body>
  <div class="box"></div>
  <div class="box"></div>
  <div class="box"></div>

  <script src="https://cdn.jsdelivr.net/npm/animejs/dist/bundles/anime.umd.min.js"></script>
  <script>
    const { animate, stagger } = anime;

    animate('.box', {
      x: 250,
      rotate: { from: -180 },
      duration: 1250,
      delay: stagger(65, { from: 'center' }),
      ease: 'inOutQuint',
      loop: true,
      alternate: true,
    });
  </script>
</body>
</html>
```

---

## Table des matières des références

Pour l'API détaillée de chaque module, lire le fichier correspondant dans `references/` :

1. **`timeline-api.md`** — createTimeline, add(), positions, sync, labels, defaults
2. **`events-scroll-api.md`** — onScroll, ScrollObserver, thresholds, sync modes
3. **`draggable-api.md`** — createDraggable, axes, snap, container, physics
4. **`svg-api.md`** — morphTo, createDrawable, createMotionPath
5. **`text-api.md`** — splitText, lignes/mots/caractères, addEffect
6. **`layout-api.md`** — createLayout, FLIP, enter/exit, record/animate
7. **`stagger-utilities-api.md`** — stagger avancé, $, get, set, maths, chaînable
8. **`easings-api.md`** — Tous les easings, spring, bézier, steps, irregular
9. **`waapi-api.md`** — Web Animation API mode, hardware acceleration
10. **`scope-engine-api.md`** — createScope, createAnimatable, createTimer, engine
11. **`react-integration.md`** — Patterns React, Next.js, Vue, Angular
12. **`advanced-patterns.md`** — Recettes production, scroll parallax, carousel, texte
