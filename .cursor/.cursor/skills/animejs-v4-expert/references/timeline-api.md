# Timeline API — Référence complète

## Créer une timeline

```js
import { createTimeline } from 'animejs';

const tl = createTimeline({
  defaults: {           // Paramètres par défaut pour tous les enfants
    duration: 500,
    ease: 'outExpo',
  },
  loop: true,           // Timeline en boucle
  alternate: true,      // Aller-retour
  autoplay: true,       // Jouer automatiquement
  playbackEase: 'inOutQuad', // Easing global sur la progression
});
```

## Ajouter des animations — `add()`

```js
tl.add(targets, animationParams, position);
```

### Positions (3ème argument)

| Valeur | Effet |
|--------|-------|
| `500` | Position absolue à 500ms |
| `'+=100'` | 100ms après la fin du dernier élément |
| `'-=200'` | 200ms avant la fin du dernier élément (chevauchement) |
| `'*=.5'` | À la moitié de la durée totale actuelle |
| `'<'` | Même position que la fin du précédent |
| `'<<'` | Même position que le début du précédent |
| `'<<+=250'` | 250ms après le début du précédent |
| `'myLabel'` | Position d'un label nommé |

### Exemple complet
```js
const tl = createTimeline({
  defaults: { duration: 600, ease: 'outExpo' }
})
.add('.title', { opacity: [0, 1], y: [30, 0] })
.add('.subtitle', { opacity: [0, 1], y: [20, 0] }, '-=400')  // Chevauche de 400ms
.add('.cta', { scale: [0, 1], ease: 'outBack' }, '-=300')
.add('.bg', { opacity: [0, 1] }, 0);  // Position absolue 0 (en parallèle)
```

## Labels — `label()`

```js
tl.label('intro')
  .add('.el1', { x: 100 })
  .label('middle')
  .add('.el2', { x: 200 }, 'intro')     // Positionné au label "intro"
  .add('.el3', { x: 300 }, 'middle');    // Positionné au label "middle"
```

## Set (changement instantané) — `set()`

```js
tl.set('.el', { opacity: 0, x: -100 })  // Appliqué instantanément
  .add('.el', { opacity: 1, x: 0 });
```

## Appeler des fonctions — `call()`

```js
tl.add('.el', { x: 250 })
  .call(() => console.log('Arrivé à la moitié !'), '*=.5')
  .add('.el', { x: 0 });
```

## Synchroniser des timelines — `sync()`

```js
const childTl = createTimeline({ autoplay: false })
  .add('.child', { x: 100 });

const mainTl = createTimeline()
  .add('.parent', { y: 50 })
  .sync(childTl, '-=200');  // Intègre la timeline enfant
```

## Stagger dans les positions

```js
import { stagger } from 'animejs';

// Chaque élément est ajouté avec un décalage de position
tl.add('.card', { y: [50, 0], opacity: [0, 1] }, stagger(100));
```

## Méthodes de contrôle

Même méthodes que `animate()` : `play()`, `pause()`, `restart()`, `reverse()`, `seek()`, `revert()`, `refresh()`, `stretch()`, etc.

## Init différé — `init()`

```js
const tl = createTimeline({ autoplay: false })
  .add('.el', { x: 100 })
  .init();  // Initialise sans jouer (utile pour seek immédiat)

tl.seek(500); // Puis naviguer
```

## Propriétés accessibles

```js
tl.duration     // Durée totale calculée
tl.currentTime  // Position actuelle
tl.progress     // Progression 0→1
tl.paused       // Boolean
tl.began        // A déjà démarré
tl.completed    // Est terminé
```
