# Draggable API — Référence complète

## Créer un draggable

```js
import { createDraggable } from 'animejs';

const draggable = createDraggable('.draggable-element', {
  x: true,           // Permettre le drag horizontal
  y: true,           // Permettre le drag vertical
  container: '.container',  // Limiter au conteneur
});
```

## Axes — Contrôle par axe

```js
// Un seul axe
createDraggable('.el', { x: true, y: false });  // Horizontal uniquement
createDraggable('.el', { x: false, y: true });  // Vertical uniquement

// Axe avec paramètres avancés
createDraggable('.el', {
  x: {
    mapTo: 'rotate',     // Mapper le drag X sur la rotation
    modifier: v => v * 2, // Doubler l'amplitude
    snap: 100,            // Snap tous les 100px
    snap: [0, 50, 100, 200], // Snap à ces positions précises
  },
  y: {
    snap: (draggable) => draggable.containerHeight / 4,
  },
});
```

## Snap — Accrochage magnétique

```js
createDraggable('.el', {
  snap: 50,               // Snap tous les 50px (les 2 axes)
  snap: [0, 100, 200],    // Snap à ces positions
  snap: (d) => d.containerWidth / 3, // Dynamique
});
```

## Container — Limites

```js
createDraggable('.el', {
  container: '.parent',           // Sélecteur CSS
  container: document.body,       // Élément DOM
  container: [0, 0, 500, 300],   // [x, y, width, height] fixe
  container: (d) => [0, 0, window.innerWidth, window.innerHeight],

  containerPadding: 20,           // Padding interne
  containerPadding: [10, 20, 10, 20], // [top, right, bottom, left]
  containerFriction: 0.5,         // Friction aux bords (0 = bloqué, 1 = libre)
  releaseContainerFriction: 0.05, // Friction au relâchement (rebond)
});
```

## Physique du relâchement

```js
createDraggable('.el', {
  releaseMass: 1,            // Masse (inertie)
  releaseStiffness: 100,     // Rigidité du rappel
  releaseDamping: 15,        // Amortissement
  velocityMultiplier: 1,     // Multiplicateur de vitesse
  minVelocity: 0,            // Vitesse min pour l'inertie
  maxVelocity: 200,          // Vitesse max
  releaseEase: 'outQuint',   // Easing du relâchement
});
```

## Paramètres de drag

```js
createDraggable('.el', {
  trigger: '.handle',        // Élément qui déclenche le drag
  dragSpeed: 1,              // Multiplicateur de vitesse de drag
  dragThreshold: 0,          // Distance min avant de commencer
  dragThreshold: { mouse: 3, touch: 10 }, // Par type d'input
  scrollThreshold: 20,       // Distance scroll qui annule le drag
  scrollSpeed: 1,            // Vitesse de scroll automatique aux bords
  cursor: true,              // Changer le curseur automatiquement
  cursor: { onHover: 'grab', onGrab: 'grabbing' },
});
```

## Callbacks

```js
createDraggable('.el', {
  onGrab: (self, e) => {},     // Début du grab (mousedown/touchstart)
  onDrag: (self, e) => {},     // Pendant le drag
  onUpdate: (self) => {},      // Chaque frame d'update
  onRelease: (self, e) => {},  // Relâchement
  onSnap: (self) => {},        // Quand il snap à une position
  onSettle: (self) => {},      // Quand le mouvement s'arrête complètement
  onResize: (self) => {},      // Pendant le resize du container
  onAfterResize: (self) => {}, // Après le resize
});
```

## Méthodes

```js
const d = createDraggable('.el', { x: true, y: true });

d.disable();           // Désactiver le drag
d.enable();            // Réactiver le drag
d.setX(100);           // Positionner en X (avec animation)
d.setY(200);           // Positionner en Y
d.animateInView();     // Animer pour revenir dans le container
d.scrollInView();      // Scroller pour que l'élément soit visible
d.stop();              // Arrêter le mouvement en cours
d.reset();             // Remettre à la position initiale
d.revert();            // Supprimer le draggable complètement
d.refresh();           // Recalculer les dimensions
```

## Propriétés

```js
d.x                    // Position X actuelle
d.y                    // Position Y actuelle
d.containerWidth       // Largeur du container
d.containerHeight      // Hauteur du container
d.velocity             // Vitesse actuelle
d.disabled             // Boolean
d.isDragging           // Boolean
d.isReleasing          // Boolean
```

## Pattern: Carousel horizontal avec snap

```js
const carousel = createDraggable('.carousel-track', {
  x: true,
  y: false,
  container: '.carousel-container',
  snap: (d) => d.containerWidth,  // Snap par page
  releaseEase: 'outExpo',
  releaseMass: 1,
  releaseDamping: 20,
  onSnap: (self) => {
    const page = Math.round(Math.abs(self.x) / self.containerWidth);
    // Mettre à jour les dots de pagination
  },
});
```

## Pattern: Slider vertical avec limites

```js
createDraggable('.slider-thumb', {
  x: false,
  y: {
    snap: (d) => d.containerHeight / 10,
    modifier: (v) => Math.round(v),
  },
  container: '.slider-track',
  onUpdate: (self) => {
    const progress = self.y / self.containerHeight;
    document.querySelector('.value').textContent = Math.round(progress * 100);
  },
});
```
