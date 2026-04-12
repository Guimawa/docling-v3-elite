# React / Next.js / Vue / Angular Integration — Référence complète

## React — Pattern officiel avec createScope

### Composant basique
```jsx
import { useRef, useEffect } from 'react';
import { createScope, animate, stagger } from 'animejs';

function AnimatedComponent() {
  const root = useRef(null);
  const scope = useRef(null);

  useEffect(() => {
    // Créer le scope avec la ref comme racine
    scope.current = createScope({ root: root.current }).add(() => {
      // Toutes les animations ici sont scopées au root
      animate('.item', {
        x: 250,
        opacity: [0, 1],
        delay: stagger(100),
        ease: 'outExpo',
      });
    });

    // CLEANUP OBLIGATOIRE — revert() nettoie tout
    return () => scope.current.revert();
  }, []);

  return (
    <div ref={root}>
      <div className="item">A</div>
      <div className="item">B</div>
      <div className="item">C</div>
    </div>
  );
}
```

### Avec timeline
```jsx
function TimelineComponent() {
  const root = useRef(null);
  const scope = useRef(null);

  useEffect(() => {
    scope.current = createScope({ root: root.current }).add(() => {
      createTimeline({ defaults: { ease: 'outExpo', duration: 600 } })
        .add('.title', { opacity: [0, 1], y: [30, 0] })
        .add('.subtitle', { opacity: [0, 1], y: [20, 0] }, '-=400')
        .add('.cta', { scale: [0, 1], ease: 'outBack' }, '-=300');
    });

    return () => scope.current.revert();
  }, []);

  return (
    <div ref={root}>
      <h1 className="title">Hello</h1>
      <p className="subtitle">World</p>
      <button className="cta">Click</button>
    </div>
  );
}
```

### Avec interaction utilisateur (méthode scopée)
```jsx
function InteractiveComponent() {
  const root = useRef(null);
  const scope = useRef(null);

  useEffect(() => {
    scope.current = createScope({ root: root.current }).add((self) => {
      // Enregistrer une méthode réutilisable
      self.add('bounce', () => {
        animate('.ball', {
          y: [0, -100, 0],
          duration: 600,
          ease: 'outBounce',
        });
      });
    });

    return () => scope.current.revert();
  }, []);

  const handleClick = () => {
    // Appeler la méthode enregistrée
    scope.current.methods.bounce();
  };

  return (
    <div ref={root}>
      <div className="ball" onClick={handleClick} />
    </div>
  );
}
```

### Avec scroll (onScroll)
```jsx
function ScrollComponent() {
  const root = useRef(null);
  const scope = useRef(null);

  useEffect(() => {
    scope.current = createScope({ root: root.current }).add(() => {
      const anim = animate('.reveal', {
        y: [50, 0],
        opacity: [0, 1],
        delay: stagger(100),
        autoplay: false,
      });

      onScroll(anim, {
        target: '.reveal-section',
        enter: 'bottom',
        sync: 'play',
      });
    });

    return () => scope.current.revert();
  }, []);

  return (
    <div ref={root}>
      <div className="reveal-section">
        <div className="reveal">Content 1</div>
        <div className="reveal">Content 2</div>
      </div>
    </div>
  );
}
```

### Avec responsive (mediaQueries)
```jsx
function ResponsiveComponent() {
  const root = useRef(null);
  const scope = useRef(null);

  useEffect(() => {
    scope.current = createScope({
      root: root.current,
      mediaQueries: {
        mobile: '(max-width: 768px)',
        desktop: '(min-width: 769px)',
      },
    }).add(({ matches }) => {
      if (matches.desktop) {
        animate('.hero', { x: 300, scale: 1.2, ease: 'outExpo' });
      } else {
        animate('.hero', { y: 100, scale: 1, ease: 'outExpo' });
      }
    });

    return () => scope.current.revert();
  }, []);

  return <div ref={root}><div className="hero">Hero</div></div>;
}
```

### Animation au démontage (exit)
```jsx
function ExitComponent({ isVisible, onExitComplete }) {
  const root = useRef(null);
  const scope = useRef(null);

  useEffect(() => {
    scope.current = createScope({ root: root.current }).add(() => {
      animate('.content', { opacity: [0, 1], y: [20, 0], ease: 'outExpo' });
    });
    return () => scope.current.revert();
  }, []);

  useEffect(() => {
    if (!isVisible && scope.current) {
      animate('.content', {
        opacity: [1, 0],
        y: [0, -20],
        duration: 300,
        onComplete: onExitComplete,
      });
    }
  }, [isVisible]);

  return (
    <div ref={root}>
      <div className="content">Goodbye</div>
    </div>
  );
}
```

## Next.js — Considérations spécifiques

### 'use client' obligatoire
```jsx
'use client'; // OBLIGATOIRE — anime.js utilise le DOM

import { useRef, useEffect } from 'react';
import { createScope, animate } from 'animejs';

export default function AnimatedPage() {
  const root = useRef(null);
  const scope = useRef(null);

  useEffect(() => {
    scope.current = createScope({ root: root.current }).add(() => {
      animate('.hero', { opacity: [0, 1], y: [40, 0] });
    });
    return () => scope.current.revert();
  }, []);

  return <div ref={root}><div className="hero">Welcome</div></div>;
}
```

### Dynamic import (SSR-safe)
```jsx
'use client';
import { useRef, useEffect } from 'react';

export default function SafeAnimation() {
  const root = useRef(null);

  useEffect(() => {
    let scope;
    import('animejs').then(({ createScope, animate, stagger }) => {
      scope = createScope({ root: root.current }).add(() => {
        animate('.el', { x: 200, delay: stagger(50) });
      });
    });
    return () => scope?.revert();
  }, []);

  return <div ref={root}><div className="el">Hello</div></div>;
}
```

## Vue 3 — Composition API

```vue
<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { createScope, animate, stagger } from 'animejs';

const root = ref(null);
let scope = null;

onMounted(() => {
  scope = createScope({ root: root.value }).add(() => {
    animate('.item', {
      x: 250,
      delay: stagger(100),
      ease: 'outExpo',
    });
  });
});

onUnmounted(() => {
  scope?.revert();
});
</script>

<template>
  <div ref="root">
    <div class="item">A</div>
    <div class="item">B</div>
  </div>
</template>
```

## Angular

```typescript
import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { createScope, animate, stagger } from 'animejs';

@Component({
  selector: 'app-animated',
  template: `
    <div #root>
      <div class="item" *ngFor="let item of items">{{ item }}</div>
    </div>
  `,
})
export class AnimatedComponent implements AfterViewInit, OnDestroy {
  @ViewChild('root') root!: ElementRef;
  private scope: any;

  items = ['A', 'B', 'C'];

  ngAfterViewInit() {
    this.scope = createScope({ root: this.root.nativeElement }).add(() => {
      animate('.item', {
        x: 250,
        delay: stagger(100),
        ease: 'outExpo',
      });
    });
  }

  ngOnDestroy() {
    this.scope?.revert();
  }
}
```

## Règles d'or pour les frameworks

1. **Toujours `revert()` au démontage** — Sinon fuites mémoire
2. **Utiliser `createScope`** — Il gère le scope des sélecteurs CSS au root
3. **React Strict Mode** — `useEffect` s'exécute 2× en dev, `revert()` gère ça
4. **SSR** — Anime.js est client-only, utiliser `useEffect` ou `onMounted`
5. **Refs** — Préférer les refs aux sélecteurs globaux pour l'isolation
