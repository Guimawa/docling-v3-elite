# Easings API — Référence complète

```js
import { spring } from 'animejs';
// Ou: import * as easings from 'animejs/easings';
```

## Easings intégrés (built-in)

### Liste complète

| Nom | In | Out | InOut |
|-----|-----|------|-------|
| Quad | `inQuad` | `outQuad` | `inOutQuad` |
| Cubic | `inCubic` | `outCubic` | `inOutCubic` |
| Quart | `inQuart` | `outQuart` | `inOutQuart` |
| Quint | `inQuint` | `outQuint` | `inOutQuint` |
| Sine | `inSine` | `outSine` | `inOutSine` |
| Circ | `inCirc` | `outCirc` | `inOutCirc` |
| Expo | `inExpo` | `outExpo` | `inOutExpo` |
| Bounce | `inBounce` | `outBounce` | `inOutBounce` |
| Back | `inBack` | `outBack` | `inOutBack` |
| Elastic | `inElastic` | `outElastic` | `inOutElastic` |

### Power easing (générique)
```js
ease: 'in'           // Équivalent à inQuad avec p=1.675
ease: 'out'          // Équivalent à outQuad avec p=1.675
ease: 'inOut'        // Équivalent à inOutQuad avec p=1.675
ease: 'out(3)'       // Power 3 (plus agressif)
ease: 'in(6)'        // Power 6 (très rapide au début)
ease: 'inOut(2)'     // Power 2 (plus doux)
```

### Linéaire
```js
ease: 'linear'       // Pas d'accélération
ease: 'none'         // Alias de 'linear'
```

## Easings avec paramètres

### Back (dépassement)
```js
ease: 'outBack'              // Overshoot par défaut (1.7)
ease: 'outBack(3)'           // Overshoot plus fort
ease: 'inBack(1.2)'          // Overshoot léger
ease: 'inOutBack(2.5)'       // Overshoot des deux côtés
```

### Elastic (rebond élastique)
```js
ease: 'outElastic'                 // Défaut: amplitude=1, period=.3
ease: 'outElastic(1.5, .4)'       // Plus d'amplitude, période plus longue
ease: 'inElastic(0.8, .2)'        // Moins d'amplitude, période courte
ease: 'inOutElastic(1.2, .5)'     // Effet subtil
```

## Cubic Bézier

```js
ease: 'cubicBezier(.5, 0, .5, 1)'    // Courbe personnalisée
ease: 'cubicBezier(0.25, 0.1, 0.25, 1)' // Équivalent de CSS ease
ease: 'cubicBezier(0.42, 0, 1, 1)'      // Équivalent de CSS ease-in
```

## Linear easing (CSS-like)

```js
ease: 'linear(0, 0.25 40%, 1)'   // Points de contrôle linéaires
// Syntaxe identique à CSS linear()
```

## Steps (paliers)

```js
ease: 'steps(6)'                // 6 paliers
ease: 'steps(10, start)'       // Saut au début de chaque palier
ease: 'steps(10, end)'         // Saut à la fin de chaque palier (défaut)
```

## Irregular easing

Easing irrégulier pour des mouvements organiques/naturels.

```js
// Utiliser les noms built-in + paramètre irrégulier
// Disponible via le site: https://animejs.com/easing-editor
```

## Spring — Ressort physique

```js
import { spring } from 'animejs';

// Paramètres physiques
animate('.el', {
  x: 250,
  ease: spring({
    mass: 1,          // Masse de l'objet (défaut: 1)
    stiffness: 100,   // Rigidité du ressort (défaut: 100)
    damping: 10,      // Amortissement (défaut: 10)
    velocity: 0,      // Vitesse initiale (défaut: 0)
  }),
});
```

### Spring avec durée perçue
```js
// Plus simple: on donne la durée souhaitée et le rebond
animate('.el', {
  x: 250,
  ease: spring({
    duration: 800,    // Durée perçue en ms
    bounce: 0.25,     // Force du rebond (0 = aucun, 1 = fort)
  }),
});
```

### Spring avec callback
```js
animate('.el', {
  x: 250,
  ease: spring({
    mass: 1,
    stiffness: 200,
    damping: 15,
    onComplete: (anim) => {
      console.log('Le spring a atteint sa durée perçue');
    },
  }),
});
```

### Valeurs typiques de spring

| Usage | mass | stiffness | damping | bounce |
|-------|------|-----------|---------|--------|
| Doux, lent | 1 | 50 | 10 | 0.1 |
| Standard | 1 | 100 | 10 | 0.25 |
| Rapide, vif | 1 | 300 | 20 | 0.3 |
| Élastique | 1 | 200 | 5 | 0.5 |
| Lourd | 3 | 100 | 15 | 0.2 |
| Snappy | 0.5 | 400 | 25 | 0.1 |

## Easing comme fonction

```js
// Fonction personnalisée (0→1 input, 0→1 output)
animate('.el', {
  x: 250,
  ease: (t) => t * t,  // Quad personnalisé
});

// Fonction avec rebond personnalisé
animate('.el', {
  x: 250,
  ease: (t) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    else if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    else if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    else return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
});
```

## Quand utiliser quel easing

| Contexte | Easing recommandé |
|----------|-------------------|
| Entrée d'élément | `outExpo`, `outQuint`, `outBack` |
| Sortie d'élément | `inExpo`, `inQuint` |
| Mouvement naturel | `inOutQuad`, `inOutCubic` |
| Rebond joyeux | `outBounce`, `outElastic` |
| UI snappy | `outExpo`, spring avec bounce faible |
| Scroll parallax | `linear` |
| Hover / interaction | `outQuad`, `outCubic` |
| Attention utilisateur | `outElastic(1, .3)`, `outBack(2)` |
