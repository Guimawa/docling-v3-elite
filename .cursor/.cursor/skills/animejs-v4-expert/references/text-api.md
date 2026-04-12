# Text API — Référence complète

```js
import { splitText } from 'animejs';
// Ou: import { splitText } from 'animejs/text';
```

## splitText — Découper du texte pour l'animer

Découpe le contenu texte d'un élément en lignes, mots et/ou caractères individuels.

```js
const split = splitText('.my-text', {
  lines: true,       // Découper en lignes
  words: true,       // Découper en mots
  chars: true,       // Découper en caractères
});
```

### Résultat

```js
split.lines   // Array d'éléments <span> pour chaque ligne
split.words   // Array d'éléments <span> pour chaque mot
split.chars   // Array d'éléments <span> pour chaque caractère
split.el      // L'élément DOM original
```

### Paramètres

```js
splitText('.text', {
  lines: true,           // Activer le split par lignes
  words: true,           // Activer le split par mots
  chars: true,           // Activer le split par caractères
  debug: true,           // Afficher les bordures de debug
  includeSpaces: false,  // Inclure les espaces comme éléments
  accessible: true,      // Ajouter aria-label pour l'accessibilité
});
```

### Classes personnalisées

```js
splitText('.text', {
  chars: { class: 'char' },    // Classe CSS sur chaque char
  words: { class: 'word' },    // Classe CSS sur chaque mot
  lines: { class: 'line' },    // Classe CSS sur chaque ligne
});
```

### Wrapper (enveloppe de débordement)

```js
splitText('.text', {
  chars: { wrap: true },          // Enveloppe avec overflow:hidden
  chars: { wrap: 'hidden' },     // Équivalent
  words: { wrap: 'clip' },       // Clip overflow
});
```

### Clone (pour effets de masque)

```js
splitText('.text', {
  chars: { clone: true },        // Crée un clone caché
  chars: { clone: 'bottom' },    // Clone positionné en bas
});
```

## Animer le texte découpé

### Caractère par caractère avec stagger
```js
import { animate, splitText, stagger } from 'animejs';

const split = splitText('h1');

animate(split.chars, {
  opacity: [0, 1],
  y: [50, 0],
  delay: stagger(30),
  duration: 600,
  ease: 'outExpo',
});
```

### Mot par mot
```js
const split = splitText('.paragraph', { words: true });

animate(split.words, {
  opacity: [0, 1],
  x: [20, 0],
  delay: stagger(50, { from: 'center' }),
  duration: 500,
  ease: 'outQuint',
});
```

### Ligne par ligne (reveal avec mask)
```js
const split = splitText('.text', {
  lines: { wrap: true },  // Le wrapper cache le débordement
});

animate(split.lines, {
  y: ['100%', '0%'],
  delay: stagger(100),
  duration: 800,
  ease: 'outExpo',
});
```

## addEffect — Ajouter un effet post-split

```js
const split = splitText('.text', { chars: true });

split.addEffect((chars) => {
  return animate(chars, {
    opacity: [0, 1],
    y: [20, 0],
    delay: stagger(25),
    ease: 'outExpo',
  });
});
```

## Méthodes

```js
split.revert();    // Restaurer le HTML original
split.refresh();   // Recalculer le split (après resize)
```

## Pattern: Typewriter effect

```js
const split = splitText('.text', { chars: true });

animate(split.chars, {
  opacity: [0, 1],
  delay: stagger(40),
  duration: 1,
  ease: 'linear',
});
```

## Pattern: Texte qui se révèle au scroll

```js
import { splitText, animate, stagger, onScroll } from 'animejs';

const split = splitText('.hero-title', {
  lines: { wrap: true },
  chars: true,
});

const anim = animate(split.chars, {
  y: ['110%', '0%'],
  opacity: [0, 1],
  delay: stagger(15),
  duration: 800,
  ease: 'outExpo',
  autoplay: false,
});

onScroll(anim, {
  target: '.hero-title',
  enter: 'bottom',
  sync: 'play',
});
```

## Pattern: Scramble / Random text

```js
const split = splitText('.text', { chars: true });

animate(split.chars, {
  opacity: () => [0, 1],
  rotateX: () => [utils.random(-90, 90), 0],
  y: () => [utils.random(-50, 50), 0],
  delay: stagger(20, { from: 'random' }),
  duration: 600,
  ease: 'outBack',
});
```
