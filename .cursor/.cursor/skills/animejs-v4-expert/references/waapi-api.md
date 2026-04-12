# WAAPI (Web Animation API) — Référence complète

Anime.js v4 peut utiliser le Web Animation API natif du navigateur au lieu de son moteur JS interne. Ça permet l'accélération GPU pour certaines propriétés.

```js
import { waapi } from 'animejs';
// Ou: import * as waapi from 'animejs/waapi';
```

## Quand utiliser WAAPI vs JS Engine

| WAAPI (hardware-accelerated) | JS Engine (plus de features) |
|------------------------------|------------------------------|
| `opacity` | Toutes les propriétés CSS |
| `transform` (x, y, rotate, scale) | CSS Variables |
| `filter` | Attributs HTML/SVG |
| `clip-path` | Objets JavaScript |
| `background-color` | Valeurs relatives (+=, -=) |
| | Composition additive |
| | Modifier functions |
| | Plus de callbacks |

**Règle simple** : Utiliser WAAPI pour les animations de mouvement/apparition simples sur les propriétés GPU. Utiliser le moteur JS pour tout le reste.

## Usage basique

```js
waapi.animate('.el', {
  x: 250,
  opacity: [0, 1],
  duration: 1000,
  ease: 'outExpo',
});
```

## Améliorations d'Anime.js sur WAAPI natif

### Multi-targets (pas possible en WAAPI natif)
```js
waapi.animate('.multiple-elements', {
  x: 250,
  delay: stagger(100),
});
```

### Unités par défaut (WAAPI natif n'en a pas)
```js
waapi.animate('.el', {
  x: 250,      // Anime.js ajoute 'px' automatiquement
  rotate: 360, // Anime.js ajoute 'deg' automatiquement
});
```

### Valeurs fonctionnelles
```js
waapi.animate('.el', {
  x: (target, i, total) => i * 50,
  delay: (target, i) => i * 100,
});
```

### Transforms individuels
```js
// WAAPI natif: il faut écrire transform: 'translateX(250px) rotate(360deg)'
// Anime.js WAAPI: propriétés individuelles
waapi.animate('.el', {
  x: 250,
  rotate: 360,
  scale: 1.5,
});
```

### Paramètres par propriété
```js
waapi.animate('.el', {
  x: { to: 250, duration: 800, ease: 'outBack' },
  opacity: { to: 0.5, delay: 200 },
});
```

### Spring et easings custom dans WAAPI
```js
import { spring } from 'animejs';

waapi.animate('.el', {
  x: 250,
  ease: spring({ duration: 800, bounce: .25 }),
  // Anime.js convertit le spring en keyframes WAAPI
});
```

## Différences avec l'API native

| WAAPI natif | Anime.js WAAPI |
|-------------|----------------|
| `iterations: Infinity` | `loop: true` ou `loop: -1` |
| `direction: 'alternate'` | `alternate: true` |
| `direction: 'reverse'` | `reversed: true` |
| `easing: 'ease-out'` | `ease: 'outQuad'` |
| `animation.finished` | `animation.then()` |

## Persistance

```js
waapi.animate('.el', {
  x: 250,
  persist: true,  // Garde le style final (sinon WAAPI revient au début)
});
```

## convertEase() — Convertir un easing Anime.js en CSS

```js
const cssEase = waapi.convertEase('outExpo');
// Retourne la version CSS-compatible de l'easing
```

## Synchroniser WAAPI dans une Timeline

```js
import { createTimeline, waapi } from 'animejs';

const tl = createTimeline();

// Mixer animations JS et WAAPI dans la même timeline
tl.add('.el-js', { x: 100 })                    // JS engine
  .sync(waapi.animate('.el-gpu', {               // WAAPI (GPU)
    x: 250, opacity: [0, 1], autoplay: false
  }), '-=500');
```

## Callbacks WAAPI

```js
waapi.animate('.el', {
  x: 250,
  onComplete: (self) => {},  // Quand terminé
  // Note: onUpdate, onBegin, onRender ne sont PAS disponibles en WAAPI
});
```

## Pattern: Animation GPU performante

```js
// Pour les animations intensives (beaucoup d'éléments, 60fps requis)
waapi.animate('.particle', {
  x: (t, i) => Math.cos(i) * 200,
  y: (t, i) => Math.sin(i) * 200,
  opacity: [1, 0],
  scale: [1, 0],
  duration: 2000,
  delay: stagger(10),
});
```
