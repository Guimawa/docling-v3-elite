# Scope, Engine, Timer & Animatable — Référence complète

## createScope — Gestion du cycle de vie

Le Scope gère le cleanup automatique des animations, essentiel pour React/Vue/Angular.

```js
import { createScope } from 'animejs';
```

### Usage basique
```js
const scope = createScope({
  root: document.querySelector('.container'), // Racine du scope
  defaults: { duration: 500, ease: 'outExpo' }, // Défauts partagés
});

// Ajouter des animations au scope
scope.add(() => {
  animate('.child', { x: 250 });
  animate('.other-child', { rotate: 360 });
});

// CLEANUP — Supprime toutes les animations et restaure les styles
scope.revert();
```

### add() — Ajouter des animations

```js
// La fonction reçoit le scope en argument
scope.add((self) => {
  animate('.el', { x: 250 });
  createTimeline().add('.el', { y: 100 });
  
  // Retourner une fonction de cleanup personnalisée (optionnel)
  return () => {
    console.log('Nettoyé !');
  };
});
```

### addOnce() — Exécuter une seule fois

```js
// Ne s'exécute qu'une fois, même si le scope est reconstruit
scope.addOnce(() => {
  animate('.intro', { opacity: [0, 1] });
});
```

### Media Queries — Responsive

```js
const scope = createScope({
  root: '.container',
  mediaQueries: {
    isMobile: '(max-width: 768px)',
    isDesktop: '(min-width: 769px)',
    prefersReduced: '(prefers-reduced-motion: reduce)',
  },
});

scope.add(({ matches }) => {
  if (matches.isMobile) {
    animate('.el', { x: 100 });
  } else if (matches.isDesktop) {
    animate('.el', { x: 300 });
  }
  
  if (matches.prefersReduced) {
    // Pas d'animation, juste setter les valeurs finales
    utils.set('.el', { x: 300 });
  }
});
```

### keepTime() — Temps partagé dans le scope
```js
scope.keepTime(); // Active un time keeper partagé
```

### Méthodes
```js
scope.revert();    // Nettoyer tout
scope.refresh();   // Recalculer (après resize, changement DOM)
```

### Propriétés
```js
scope.root         // L'élément racine
scope.defaults     // Les paramètres par défaut
```

---

## createAnimatable — Propriétés animées réactives

Crée un objet dont les propriétés sont automatiquement animées quand on change leur valeur.

```js
import { createAnimatable } from 'animejs';

const box = createAnimatable('.box', {
  x: { duration: 500, ease: 'outExpo' },
  y: { duration: 500, ease: 'outExpo' },
  rotate: { duration: 800, ease: 'outElastic(1, .5)' },
});

// Changer la valeur → animation automatique
box.x(200);        // Anime vers x=200
box.y(100);        // Anime vers y=100
box.rotate(45);    // Anime vers 45°

// Lire la valeur actuelle
console.log(box.x()); // Retourne la valeur actuelle
```

### Settings par propriété
```js
createAnimatable('.el', {
  x: {
    unit: 'px',            // Unité (défaut: détecté automatiquement)
    duration: 600,          // Durée de transition
    ease: 'outExpo',        // Easing
    modifier: v => Math.round(v), // Modifier la valeur
    composition: 'replace',       // Mode de composition
  },
  opacity: { duration: 300, ease: 'linear' },
});
```

### Méthodes
```js
box.revert();   // Supprimer l'animatable et restaurer les styles
```

### Pattern: Suivi de curseur fluide
```js
const follower = createAnimatable('.cursor-follower', {
  x: { duration: 800, ease: 'outExpo' },
  y: { duration: 800, ease: 'outExpo' },
  scale: { duration: 400, ease: 'outBack' },
});

document.addEventListener('mousemove', (e) => {
  follower.x(e.clientX);
  follower.y(e.clientY);
});

document.addEventListener('mousedown', () => follower.scale(0.8));
document.addEventListener('mouseup', () => follower.scale(1));
```

---

## createTimer — Minuterie sans cible

Un timer exécute des callbacks à intervalle régulier sans animer de propriété.

```js
import { createTimer } from 'animejs';

const timer = createTimer({
  duration: 5000,           // Durée totale
  loop: true,               // Boucle
  onUpdate: (self) => {
    console.log(self.currentTime);     // Temps écoulé
    console.log(self.progress);        // Progression 0→1
  },
  onComplete: () => console.log('Fini !'),
});
```

### Tous les paramètres
```js
createTimer({
  duration: 3000,
  delay: 500,
  loop: true,
  loop: 3,
  alternate: true,
  reversed: true,
  autoplay: true,
  loopDelay: 200,
  frameRate: 30,
  playbackRate: 2,
  onBegin: (self) => {},
  onUpdate: (self) => {},
  onLoop: (self) => {},
  onPause: (self) => {},
  onComplete: (self) => {},
});
```

### Méthodes (identiques à animate)
```js
timer.play(); timer.pause(); timer.restart();
timer.reverse(); timer.seek(1000); timer.revert();
```

### Pattern: Compteur animé
```js
const counter = { value: 0 };

createTimer({
  duration: 2000,
  onUpdate: (self) => {
    counter.value = Math.round(self.progress * 1000);
    document.querySelector('.counter').textContent = counter.value;
  },
});
```

---

## Engine — Contrôle global du moteur

```js
import { engine } from 'animejs';
```

### Paramètres globaux
```js
engine.timeUnit = 'ms';       // 'ms' (défaut) ou 's' (secondes)
engine.speed = 1;              // Vitesse globale (0.5 = moitié, 2 = double)
engine.fps = 60;               // FPS max global
engine.precision = 4;          // Décimales de précision
engine.pauseOnDocumentHidden = true; // Pause quand l'onglet est caché
```

### Méthodes
```js
engine.update();    // Forcer une mise à jour manuelle
engine.pause();     // Mettre TOUT en pause
engine.resume();    // Reprendre TOUT
```

### Propriétés
```js
engine.currentTime   // Temps global du moteur
engine.playbackRate  // Vitesse globale
```

### Engine defaults — Valeurs par défaut globales
```js
// Changer les défauts pour TOUTES les animations futures
engine.defaults.duration = 800;
engine.defaults.ease = 'outExpo';
```

### Pattern: Mode debug (ralenti global)
```js
// Ralentir toutes les animations pour debugger
engine.speed = 0.1;  // 10× plus lent

// Remettre à la normale
engine.speed = 1;
```

### Pattern: Temps en secondes
```js
engine.timeUnit = 's';

// Maintenant toutes les durées sont en secondes
animate('.el', { x: 250, duration: 1.5 });  // 1.5 secondes
```
