# SVG API — Référence complète

```js
import { svg } from 'animejs';
// Ou: import * as svg from 'animejs/svg';
```

## morphTo — Morphing de formes SVG

Transforme une forme SVG en une autre progressivement.

```js
import { animate, svg } from 'animejs';

animate('.shape-from', {
  d: svg.morphTo('.shape-to'),  // Morph le path "d" vers l'autre forme
  duration: 1500,
  ease: 'inOutQuad',
  loop: true,
  alternate: true,
});
```

### Morphing entre plusieurs formes
```js
animate('.shape', {
  d: [
    svg.morphTo('#shape-1'),
    svg.morphTo('#shape-2'),
    svg.morphTo('#shape-3'),
  ],
  duration: 3000,
  ease: 'inOutQuad',
});
```

## createDrawable — Dessin de tracés SVG

Crée un attribut `draw` animable sur les éléments SVG (line drawing).

```js
import { animate, svg } from 'animejs';

// Rendre les éléments SVG "dessinables"
const drawables = svg.createDrawable('.svg-path');

// Animer le dessin
animate(drawables, {
  draw: '0 1',           // De 0% à 100% du tracé
  duration: 2000,
  ease: 'inOutQuad',
});
```

### Valeurs de `draw`
```js
draw: '0 1'        // Dessiner de 0% à 100% (tracé complet)
draw: '.5 .5'      // Point au milieu (rien de visible)
draw: '0 .5'       // Première moitié
draw: '.5 1'       // Deuxième moitié
draw: '1 0'        // Effacer (inverse)

// Avec des valeurs dynamiques
draw: ['0 0', '0 1'],        // De rien à tout
draw: ['.5 .5', '0 1'],      // Du point central au tracé complet
```

### Exemples avancés
```js
import { createTimeline, svg, stagger } from 'animejs';

// Line drawing avec stagger
const lines = svg.createDrawable('.line');

createTimeline()
  .add(lines, {
    draw: ['0 0', '0 1'],
    duration: 1500,
    ease: 'inOutQuad',
    delay: stagger(100),
  })
  .add(lines, {
    stroke: '#FF4B4B',
    duration: 800,
    delay: stagger(50),
  }, '-=1000');
```

## createMotionPath — Animation le long d'un chemin

Fait suivre un chemin SVG à un élément.

```js
import { animate, svg } from 'animejs';

// L'élément suit le chemin SVG
animate('.element', {
  ...svg.createMotionPath('#my-path'),
  duration: 3000,
  ease: 'inOutQuad',
  loop: true,
});
```

### Avec rotation automatique
```js
// L'élément tourne pour suivre la direction du chemin
animate('.car', {
  ...svg.createMotionPath('#road-path'),
  duration: 5000,
  ease: 'linear',
  loop: true,
});
```

## Pattern: Logo line drawing complet

```js
import { createTimeline, svg, stagger, utils } from 'animejs';

// 1. Créer les drawables
const paths = svg.createDrawable('#logo path');

// 2. Initialiser à invisible
utils.set(paths, { draw: '0 0', opacity: 0 });

// 3. Animer
createTimeline({
  defaults: { ease: 'inOutQuad' }
})
.add(paths, {
  opacity: 1,
  duration: 1,
})
.add(paths, {
  draw: ['0 0', '0 1'],
  duration: 2000,
  delay: stagger(150),
})
.add(paths, {
  fill: { from: 'transparent', to: 'currentColor' },
  strokeWidth: { from: 2, to: 0 },
  duration: 800,
  delay: stagger(100),
}, '-=500');
```

## Animer des attributs SVG directement

```js
// viewBox, cx, cy, r, rx, ry, x1, y1, x2, y2, points, etc.
animate('circle', {
  r: [0, 50],           // Rayon
  cx: 250,              // Position X centre
  cy: 250,              // Position Y centre
  fill: '#FF0000',
  duration: 1000,
});

animate('rect', {
  width: [0, 200],
  height: [0, 100],
  rx: 10,               // Border radius
});
```
