# Advanced Patterns — Recettes production

## 1. Hero section avec texte + éléments staggerés

```js
import { createTimeline, splitText, stagger, spring } from 'animejs';

const split = splitText('.hero-title', { chars: true, lines: { wrap: true } });

createTimeline({ defaults: { ease: 'outExpo' } })
  .add(split.chars, {
    y: ['110%', '0%'],
    opacity: [0, 1],
    delay: stagger(20),
    duration: 800,
  })
  .add('.hero-subtitle', {
    opacity: [0, 1],
    y: [30, 0],
    duration: 600,
  }, '-=400')
  .add('.hero-cta', {
    scale: [0, 1],
    opacity: [0, 1],
    ease: spring({ duration: 600, bounce: .3 }),
  }, '-=300')
  .add('.hero-image', {
    opacity: [0, 1],
    x: [60, 0],
    duration: 1000,
  }, '-=600');
```

## 2. Infinite auto-scrolling carousel

```js
import { animate, utils } from 'animejs';

const track = document.querySelector('.carousel-track');
const items = utils.$('.carousel-item');
const itemWidth = items[0].offsetWidth + 16; // + gap
const totalWidth = itemWidth * items.length;

// Dupliquer les items pour le loop seamless
track.innerHTML += track.innerHTML;

animate(track, {
  x: [0, -totalWidth],
  duration: totalWidth * 20, // Vitesse constante
  ease: 'linear',
  loop: true,
});
```

## 3. Scroll-linked progress bar

```js
import { animate, onScroll } from 'animejs';

const progressAnim = animate('.progress-bar', {
  scaleX: [0, 1],
  autoplay: false,
  duration: 1000,
  ease: 'linear',
});

onScroll(progressAnim, {
  container: window,
  target: document.body,
  enter: 'top',
  leave: 'bottom',
  sync: true,
});
```

## 4. Staggered grid reveal au scroll

```js
import { animate, stagger, onScroll } from 'animejs';

document.querySelectorAll('.grid-section').forEach(section => {
  const items = section.querySelectorAll('.grid-item');

  const anim = animate(items, {
    opacity: [0, 1],
    y: [60, 0],
    scale: [0.8, 1],
    delay: stagger(50, { grid: [4, 3], from: 'center' }),
    duration: 600,
    ease: 'outExpo',
    autoplay: false,
  });

  onScroll(anim, {
    target: section,
    enter: 'bottom',
    sync: 'play',
  });
});
```

## 5. Counter / Number animation

```js
import { animate } from 'animejs';

const obj = { count: 0 };

animate(obj, {
  count: 15847,
  duration: 2000,
  ease: 'outExpo',
  onUpdate: () => {
    document.querySelector('.counter').textContent =
      Math.round(obj.count).toLocaleString();
  },
});
```

## 6. Cursor follower custom

```js
import { createAnimatable } from 'animejs';

const cursor = createAnimatable('.custom-cursor', {
  x: { duration: 600, ease: 'outExpo' },
  y: { duration: 600, ease: 'outExpo' },
  scale: { duration: 300, ease: 'outBack' },
});

document.addEventListener('mousemove', (e) => {
  cursor.x(e.clientX - 16);
  cursor.y(e.clientY - 16);
});

// Grossir sur les liens
document.querySelectorAll('a, button').forEach(el => {
  el.addEventListener('mouseenter', () => cursor.scale(2));
  el.addEventListener('mouseleave', () => cursor.scale(1));
});
```

## 7. Tab switching avec layout animation

```js
import { createLayout, animate, utils } from 'animejs';

const layout = createLayout('.tabs-content', {
  duration: 400,
  ease: 'outExpo',
  enterFrom: { opacity: 0, y: 20 },
  leaveTo: { opacity: 0, y: -20 },
});

function switchTab(tabId) {
  utils.$('.tab-panel').forEach(panel => {
    panel.style.display = panel.id === tabId ? 'block' : 'none';
  });
}
```

## 8. SVG logo animation (draw + fill)

```js
import { createTimeline, svg, stagger, utils } from 'animejs';

const paths = svg.createDrawable('#logo path, #logo polyline, #logo line');
utils.set(paths, { draw: '0 0' });
utils.set('#logo [fill]', { fillOpacity: 0 });

createTimeline({
  defaults: { ease: 'inOutQuad' }
})
.add(paths, {
  draw: '0 1',
  duration: 1500,
  delay: stagger(200),
})
.add('#logo [fill]', {
  fillOpacity: [0, 1],
  duration: 600,
  delay: stagger(100),
}, '-=800');
```

## 9. Parallax multi-couches smooth

```js
import { createAnimatable } from 'animejs';

const layers = [
  { el: '.layer-bg', speed: 0.1 },
  { el: '.layer-mid', speed: 0.3 },
  { el: '.layer-fg', speed: 0.6 },
];

const animatables = layers.map(layer => ({
  ...layer,
  anim: createAnimatable(layer.el, {
    y: { duration: 1200, ease: 'outExpo' },
  }),
}));

window.addEventListener('scroll', () => {
  const scrollY = window.scrollY;
  animatables.forEach(({ anim, speed }) => {
    anim.y(-scrollY * speed);
  });
});
```

## 10. Button micro-interaction

```js
import { animate, spring } from 'animejs';

document.querySelectorAll('.btn').forEach(btn => {
  btn.addEventListener('mouseenter', () => {
    animate(btn, {
      scale: 1.05,
      duration: 300,
      ease: 'outBack',
    });
  });

  btn.addEventListener('mouseleave', () => {
    animate(btn, {
      scale: 1,
      duration: 400,
      ease: spring({ duration: 400, bounce: .2 }),
    });
  });

  btn.addEventListener('mousedown', () => {
    animate(btn, { scale: 0.95, duration: 100 });
  });

  btn.addEventListener('mouseup', () => {
    animate(btn, {
      scale: 1.05,
      duration: 200,
      ease: 'outBack',
    });
  });
});
```

## 11. Canvas 2D avec anime.js

```js
import { createTimer, utils } from 'animejs';

const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');

const particles = Array.from({ length: 100 }, () => ({
  x: utils.random(0, canvas.width),
  y: utils.random(0, canvas.height),
  radius: utils.random(2, 8),
  color: `hsl(${utils.random(0, 360)}, 70%, 60%)`,
  vx: utils.random(-2, 2),
  vy: utils.random(-2, 2),
}));

createTimer({
  duration: Infinity,
  onUpdate: () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.x = utils.wrap(p.x + p.vx, 0, canvas.width);
      p.y = utils.wrap(p.y + p.vy, 0, canvas.height);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
    });
  },
});
```

## 12. Accordion smooth

```js
import { animate } from 'animejs';

document.querySelectorAll('.accordion-trigger').forEach(trigger => {
  trigger.addEventListener('click', () => {
    const content = trigger.nextElementSibling;
    const isOpen = content.style.display !== 'none';

    if (isOpen) {
      animate(content, {
        height: [content.scrollHeight, 0],
        opacity: [1, 0],
        duration: 400,
        ease: 'outExpo',
        onComplete: () => { content.style.display = 'none'; },
      });
    } else {
      content.style.display = 'block';
      animate(content, {
        height: [0, content.scrollHeight],
        opacity: [0, 1],
        duration: 500,
        ease: 'outExpo',
        onComplete: () => { content.style.height = 'auto'; },
      });
    }
  });
});
```

## 13. Notification toast

```js
import { animate } from 'animejs';

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  animate(toast, {
    y: [-100, 0],
    opacity: [0, 1],
    duration: 500,
    ease: 'outBack',
    onComplete: () => {
      setTimeout(() => {
        animate(toast, {
          y: [0, -100],
          opacity: [1, 0],
          duration: 300,
          ease: 'inExpo',
          onComplete: () => toast.remove(),
        });
      }, 3000);
    },
  });
}
```

## Performance Tips

1. **Utiliser WAAPI** pour `opacity`, `transform` — GPU-accelerated
2. **`will-change: transform`** sur les éléments animés fréquemment
3. **Éviter d'animer `width/height`** — Préférer `scale`
4. **`revert()` les animations terminées** pour libérer la mémoire
5. **`frameRate: 30`** pour les animations non-critiques
6. **`engine.pauseOnDocumentHidden = true`** — Économiser les ressources
7. **Batch les lectures/écritures DOM** — Utiliser `onRender` au lieu de `onUpdate` pour les changements DOM
