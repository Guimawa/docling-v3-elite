# Stagger & Utilities API — Référence complète

## Stagger — API détaillée

```js
import { stagger } from 'animejs';
```

### Stagger sur le délai (time staggering)
```js
animate('.el', { x: 250, delay: stagger(100) });
// Élément 0: delay 0ms, Élément 1: 100ms, Élément 2: 200ms...
```

### Stagger sur les valeurs
```js
animate('.el', {
  rotate: stagger(45),        // 0°, 45°, 90°, 135°...
  x: stagger([0, 300]),       // Range: distribué de 0 à 300
  scale: stagger([1, 2]),     // De 1 à 2
  opacity: stagger([0.2, 1]), // De 0.2 à 1
});
```

### Stagger dans les positions timeline
```js
const tl = createTimeline();
tl.add('.el', { x: 250 }, stagger(100));
// Chaque élément est ajouté 100ms après dans la timeline
```

### Paramètres complets

```js
stagger(value, {
  start: 500,              // Valeur de départ (défaut: 0)
  from: 'first',           // Point de départ du stagger
  from: 'center',          // Depuis le centre
  from: 'last',            // Depuis le dernier
  from: 'random',          // Ordre aléatoire
  from: 5,                 // Depuis l'index 5
  reversed: true,          // Inverser l'ordre
  ease: 'outQuad',         // Courbe de distribution
  modifier: (v) => v * 2,  // Modifier la valeur finale
  total: 10,               // Nombre total d'éléments (override)
  use: 'index',            // Utiliser l'index comme valeur
});
```

### Grille 2D (grid)

```js
// Pour une grille de 10 colonnes × 5 lignes
animate('.grid-item', {
  scale: stagger([1, 3], {
    grid: [10, 5],          // [colonnes, lignes]
    from: 'center',
    axis: 'x',             // Stagger uniquement sur l'axe X
  }),
  delay: stagger(50, {
    grid: [10, 5],
    from: 'center',
  }),
});
```

### Axe de grille
```js
grid: [cols, rows],
axis: 'x',   // Stagger uniquement horizontalement
axis: 'y',   // Stagger uniquement verticalement
// Sans axis → distance radiale depuis le point d'origine
```

---

## Utilities — Fonctions utilitaires

```js
import { utils } from 'animejs';
// Ou: import * as utils from 'animejs/utils';
```

### $() — Sélecteur DOM
```js
const elements = utils.$('.selector');        // Retourne un Array (pas NodeList)
const elements = utils.$('.parent .child');   // Supporte les sélecteurs complexes
```

### get() — Lire une propriété CSS
```js
const value = utils.get('.el', 'translateX');    // Lire la valeur de translateX
const value = utils.get('.el', 'opacity');       // Lire l'opacité
const value = utils.get(element, 'width');       // Avec un élément DOM
```

### set() — Écrire des propriétés CSS
```js
utils.set('.el', { x: 100, opacity: 0.5 });     // Setter en batch
utils.set('.el', { backgroundColor: '#FF0000' });
utils.set(element, { scale: 1.5, rotate: 45 });
```

### cleanInlineStyles() — Nettoyer les styles inline
```js
utils.cleanInlineStyles('.el');  // Supprime tous les styles inline ajoutés
```

### remove() — Retirer des cibles d'une animation
```js
utils.remove(animation, '.el');   // Retire les éléments de l'animation
utils.remove(animation, element); // Avec un élément DOM
```

### sync() — Synchroniser des animations
```js
utils.sync(animation1, animation2); // Synchroniser 2 animations
```

### keepTime() — Horloge partagée
```js
const clock = utils.keepTime();  // Crée un time keeper global
```

### random() — Nombre aléatoire
```js
utils.random(0, 100);            // Entier entre 0 et 100
utils.random(0, 1, 2);           // Float avec 2 décimales: 0.57
utils.random(-50, 50);           // Négatif possible
```

### createSeededRandom() — Aléatoire reproductible
```js
const seededRandom = utils.createSeededRandom(42); // Seed fixe
seededRandom(0, 100);  // Toujours les mêmes résultats
```

### randomPick() — Choisir dans un tableau
```js
utils.randomPick(['red', 'green', 'blue']);  // Retourne un élément au hasard
```

### shuffle() — Mélanger un tableau
```js
utils.shuffle([1, 2, 3, 4, 5]);  // [3, 1, 5, 2, 4]
```

### round() — Arrondir
```js
utils.round(3.14159, 2);    // 3.14
utils.round(3.14159, 0);    // 3
utils.round(3.14159, 100);  // 3.14 (au centième)
```

### clamp() — Borner une valeur
```js
utils.clamp(150, 0, 100);   // 100
utils.clamp(-50, 0, 100);   // 0
utils.clamp(50, 0, 100);    // 50
```

### snap() — Arrondir au multiple le plus proche
```js
utils.snap(23, 10);     // 20
utils.snap(27, 10);     // 30
utils.snap(15, 10);     // 20
```

### wrap() — Boucler une valeur
```js
utils.wrap(370, 0, 360);   // 10
utils.wrap(-10, 0, 360);   // 350
```

### mapRange() — Mapper d'un range à un autre
```js
utils.mapRange(50, 0, 100, 0, 1);     // 0.5
utils.mapRange(25, 0, 100, -1, 1);    // -0.5
```

### lerp() — Interpolation linéaire
```js
utils.lerp(0, 100, 0.5);    // 50
utils.lerp(0, 100, 0.25);   // 25
```

### damp() — Interpolation amortie
```js
utils.damp(current, target, smoothing, deltaTime);
// Utile pour des suivis fluides (curseur, caméra)
```

### roundPad() — Arrondir avec padding de zéros
```js
utils.roundPad(3.1, 2);     // "3.10"
utils.roundPad(42, 4);      // "42.0000"
```

### padStart() / padEnd()
```js
utils.padStart(42, 5, '0');  // "00042"
utils.padEnd(42, 5, '0');    // "42000"
```

### degToRad() / radToDeg()
```js
utils.degToRad(180);         // 3.14159...
utils.radToDeg(Math.PI);     // 180
```

### Chain-able utilities — Fonctions chaînables
```js
// Les utilitaires peuvent être chaînés
utils.clamp(utils.mapRange(scrollY, 0, 1000, 0, 1), 0, 1);
```
