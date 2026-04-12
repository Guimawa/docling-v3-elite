# Events & Scroll API — Référence complète

## onScroll — ScrollObserver

Permet de déclencher ou synchroniser des animations au scroll.

```js
import { onScroll, animate } from 'animejs';
```

### Déclencher une animation au scroll

```js
// Jouer quand l'élément entre dans le viewport
onScroll('.section', {
  enter: 'bottom',     // Quand le bas de l'élément entre
  leave: 'top',        // Quand le haut de l'élément sort
  onEnter: () => {
    animate('.section .content', { opacity: [0, 1], y: [50, 0] });
  },
});
```

### Synchroniser une animation avec le scroll (parallax / scrub)

```js
// L'animation suit la progression du scroll
onScroll(
  animate('.parallax', {
    y: [-100, 100],
    autoplay: false,
  }), {
    sync: true,  // La progression de l'anim = progression du scroll
  }
);
```

### Paramètres du ScrollObserver

```js
onScroll(animationOrTimeline, {
  container: window,       // Conteneur scrollable (défaut: window)
  target: '.element',      // Élément à observer (défaut: premier target de l'anim)
  axis: 'y',               // Axe: 'x' ou 'y' (défaut: 'y')
  repeat: true,            // Répéter à chaque passage (défaut: false)
  debug: true,             // Afficher les markers de debug

  // Seuils d'entrée/sortie
  enter: 'bottom',         // Quand le haut du target touche le bas du container
  leave: 'top',            // Quand le bas du target touche le haut du container

  // Modes de synchronisation
  sync: true,              // Synchronise la progression
  sync: 'play reverse',    // Jouer en entrant, inverser en sortant
  sync: 'play pause',      // Jouer en entrant, pauser en sortant
  sync: 'restart pause',   // Restart en entrant, pauser en sortant
  sync: .5,                // Smooth scroll avec facteur de lissage
  sync: 'outExpo',         // Scroll lissé avec easing
});
```

### Thresholds (seuils) — Positions détaillées

```js
// Shorthands
enter: 'top'        // Haut du target = haut du container
enter: 'center'     // Centre du target = centre du container
enter: 'bottom'     // Haut du target = bas du container

// Valeurs numériques (pixels depuis le haut)
enter: 100          // 100px depuis le haut du container

// Valeur relative au target et au container
enter: { target: '50%', container: '80%' }

// Min / Max
enter: { min: 100, max: 500 }
```

### Callbacks

```js
onScroll('.section', {
  onEnter: (self) => {},           // Entre dans la zone
  onEnterForward: (self) => {},    // Entre en scrollant vers le bas
  onEnterBackward: (self) => {},   // Entre en scrollant vers le haut
  onLeave: (self) => {},           // Sort de la zone
  onLeaveForward: (self) => {},    // Sort par le haut
  onLeaveBackward: (self) => {},   // Sort par le bas
  onUpdate: (self) => {},          // À chaque update de scroll
  onSyncComplete: (self) => {},    // Quand la sync est terminée
  onResize: (self) => {},          // Quand le container resize
});
```

### Propriétés du ScrollObserver

```js
const observer = onScroll(anim, { sync: true });

observer.isInView        // Boolean: est dans la zone visible
observer.hasEntered      // Boolean: a déjà été dans la zone
observer.scrollX         // Position scroll X
observer.scrollY         // Position scroll Y
observer.progress        // Progression 0→1 dans la zone
observer.velocity        // Vitesse de scroll
```

### Méthodes

```js
observer.link(autreAnimation);  // Lier une autre animation
observer.refresh();              // Recalculer les positions
observer.revert();               // Supprimer l'observateur
```

### Pattern: Scroll-triggered sections

```js
import { onScroll, createTimeline, stagger } from 'animejs';

document.querySelectorAll('.section').forEach(section => {
  const tl = createTimeline({ autoplay: false })
    .add(section.querySelectorAll('.fade-in'), {
      opacity: [0, 1],
      y: [40, 0],
      delay: stagger(100),
      duration: 800,
      ease: 'outExpo',
    });

  onScroll(tl, {
    target: section,
    enter: 'bottom',
    leave: 'top',
    sync: 'play reverse',
  });
});
```

### Pattern: Parallax multi-couches

```js
onScroll(
  animate('.bg-layer', { y: [-200, 200], autoplay: false }),
  { sync: true }
);

onScroll(
  animate('.mid-layer', { y: [-100, 100], autoplay: false }),
  { sync: true }
);

onScroll(
  animate('.fg-layer', { y: [-50, 50], autoplay: false }),
  { sync: true }
);
```
