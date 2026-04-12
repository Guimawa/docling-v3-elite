# Layout API — Référence complète

L'API Layout permet d'animer automatiquement les changements de position/taille des éléments dans le DOM (principe FLIP — First, Last, Invert, Play).

```js
import { createLayout } from 'animejs';
// Ou: import { createLayout } from 'animejs/layout';
```

## Créer un Layout

```js
const layout = createLayout('.container', {
  duration: 500,
  ease: 'outExpo',
});
```

Après la création, tout changement CSS ou DOM dans `.container` sera automatiquement animé.

## Usage basique — CSS display animation

```js
const layout = createLayout('.list');

// Quand on cache/montre un élément, les autres s'animent en place
document.querySelector('.item').style.display = 'none';
// → Les autres items glissent pour remplir l'espace
```

## Specifying a root

```js
// Observer un conteneur spécifique
const layout = createLayout('#my-grid', {
  children: '.grid-item',  // Quels enfants observer
});
```

## Settings

```js
createLayout('.container', {
  children: '.item',        // Sélecteur des enfants à animer
  duration: 600,            // Durée de transition
  delay: 0,                 // Délai
  ease: 'outExpo',          // Easing
  properties: ['x', 'y', 'width', 'height', 'opacity'], // Props à animer
});
```

## States — Enter / Leave / Swap

### enterFrom — Animation d'entrée
```js
createLayout('.list', {
  enterFrom: {
    opacity: 0,
    scale: 0,
    // L'élément apparaît depuis cet état
  },
});
```

### leaveTo — Animation de sortie
```js
createLayout('.list', {
  leaveTo: {
    opacity: 0,
    scale: 0,
    y: 50,
    // L'élément disparaît vers cet état
  },
});
```

### swapAt — Point de transition lors d'un changement de parent
```js
createLayout('.grid', {
  swapAt: {
    scale: 0.8,
    opacity: 0.5,
    // État intermédiaire pendant le swap
  },
});
```

## Méthodes

### record() + animate() — Contrôle manuel

Pour les cas où le changement DOM doit être fait manuellement :

```js
const layout = createLayout('.container');

// 1. Enregistrer l'état actuel
layout.record();

// 2. Faire les modifications DOM
container.appendChild(newElement);
// ou: element.classList.toggle('active');
// ou: elements.sort(...) et réinsérer

// 3. Animer vers le nouvel état
layout.animate();
```

### update()
```js
layout.update();  // Forcer la mise à jour des positions
```

### revert()
```js
layout.revert();  // Supprimer le layout observer
```

## Layout id — Identifier les éléments entre parents

Quand un élément change de parent, il faut un identifiant pour le tracking :

```html
<div class="list-a">
  <div data-layout-id="item-1">Item 1</div>
</div>
<div class="list-b">
  <!-- Item 1 sera transféré ici avec animation -->
</div>
```

```js
const layout = createLayout('.lists-container');

// Quand on déplace l'élément
listB.appendChild(document.querySelector('[data-layout-id="item-1"]'));
// → L'élément anime sa transition vers la nouvelle position
```

## Callbacks

```js
createLayout('.container', {
  onBegin: (self) => {},
  onComplete: (self) => {},
  onUpdate: (self) => {},
});
```

## Propriétés

```js
layout.root          // L'élément racine
layout.children      // Les enfants observés
layout.isAnimating   // Boolean
```

## Pattern: Filterable grid

```js
const layout = createLayout('.grid', {
  duration: 400,
  ease: 'outQuint',
  enterFrom: { opacity: 0, scale: .8 },
  leaveTo: { opacity: 0, scale: .8 },
});

function filter(category) {
  document.querySelectorAll('.grid-item').forEach(item => {
    item.style.display = item.dataset.category === category ? '' : 'none';
  });
}
```

## Pattern: Reorder list

```js
const layout = createLayout('.sortable-list', {
  duration: 300,
  ease: 'outExpo',
});

function moveUp(item) {
  const prev = item.previousElementSibling;
  if (prev) {
    layout.record();
    item.parentNode.insertBefore(item, prev);
    layout.animate();
  }
}
```

## Pattern: Modal dialog animation

```js
const layout = createLayout('body', {
  enterFrom: { opacity: 0, scale: .9 },
  leaveTo: { opacity: 0, scale: .9 },
  duration: 300,
  ease: 'outExpo',
});

function openModal() {
  document.body.appendChild(modalElement);
}

function closeModal() {
  modalElement.remove();
}
```

## Common gotchas (pièges courants)

1. **Ne pas animer `transform` directement** — Utiliser les propriétés individuelles `x`, `y`, `scale`, `rotate`
2. **Les éléments doivent avoir une position** — `position: relative/absolute` si nécessaire
3. **Éviter `display: contents`** — Ça casse le tracking des dimensions
4. **Les éléments inline** (`span`) ne trackent pas bien la position — Les wrapper dans un `block` ou `inline-block`
