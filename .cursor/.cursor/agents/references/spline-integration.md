# Spline — intégration Docling

Référence pour intégrer des scènes [Spline](https://spline.design/) dans Docling PWA.

## Analyse du projet

Pour identifier les opportunités Spline :

```bash
python scripts/analyze_spline_opportunities.py --output docs/workflow/SPLINE-OPPORTUNITIES.md
```

## Installation

```bash
cd docling-pwa && npm install @splinetool/react-spline @splinetool/runtime
```

## Usage React

```jsx
import Spline from '@splinetool/react-spline'

<Spline scene="https://prod.spline.design/XXX/scene.splinecode" />
```

## Avec lazy loading (recommandé)

```jsx
import { Suspense, lazy } from 'react'
const Spline = lazy(() => import('@splinetool/react-spline'))

<Suspense fallback={<div>Chargement 3D...</div>}>
  <Spline scene={url} />
</Suspense>
```

## Événements et interactions

```jsx
import { useRef } from 'react'
import Spline from '@splinetool/react-spline'

function Scene() {
  const splineRef = useRef()
  return (
    <>
      <Spline
        scene={url}
        onLoad={(s) => { splineRef.current = s }}
        onSplineMouseDown={(e) => e.target.name === 'Cube' && console.log('click')}
      />
      <button onClick={() => splineRef.current?.emitEvent('mouseHover', 'Cube')}>
        Animer
      </button>
    </>
  )
}
```

## HTML / spline-viewer (sans React)

```html
<script type="module" src="https://unpkg.com/@splinetool/viewer@1.9.82/build/spline-viewer.js"></script>
<spline-viewer url="https://prod.spline.design/XXX/scene.splinecode"></spline-viewer>
```

## Export depuis Spline

1. Ouvrir [spline.design](https://spline.design/)
2. **Export** → **Code** → **React** ou **Vanilla JS**
3. Copier l’URL ou télécharger le `.splinecode` pour l’auto-hébergement

## Ressources

- [Docs Spline](https://docs.spline.design/)
- [react-spline](https://github.com/splinetool/react-spline)
- [Code API Web](https://docs.spline.design/exporting-your-scene/web/code-api-for-web)
