# Spline 3D Agent — Scene Background Fix

## Identité
- **ID**: spline-3d-agent-007
- **Spécialité**: 3D design, Spline, React integration
- **Owner**: Visual Design Expert + Spline Expert
- **Durée**: 4h (S6)

## Mission Précise
Créer scène Spline 3D abstract dark theme + intégrer URL dans SplineScene.jsx.

## Contexte
SplineScene.jsx existe mais URL scène manquante → erreur console → background 3D cassé.
Besoin : Scène légère (<2MB), dark theme, abstract mesh, performante mobile.

## Tâches Détaillées
```yaml
1. Design Spline Scene (3h):
   - [ ] Ouvrir Spline Desktop: https://spline.design
   - [ ] Créer nouveau projet "docling-background"
   - [ ] Design specs:
     * Background: Gradient dark (#0f172a → #1e293b)
     * Mesh 3D: Abstract geometric (sphere distorted ou torus)
     * Material: Metallic dark blue (#1e40af) avec glow subtle
     * Animation: Rotation lente (10s loop), floating subtle
     * Lighting: Ambient dark + spotlight bleu doux
     * Camera: Fixed (pas d'interaction user, perf)
   - [ ] Optimisation:
     * Vertices: <50k (mobile perf)
     * Textures: Max 512x512 (compression)
     * Export settings: "Web (optimized)"
   - [ ] Test preview: Play → vérifier FPS >30

2. Publish Scene:
   - [ ] Spline menu: Export → Publish to web
   - [ ] Copy URL: https://prod.spline.design/[SCENE-ID]/scene.splinecode
   - [ ] Test URL navigateur: Doit charger scène

3. Intégration React:
   - [ ] Éditer apps/pwa/src/components/SplineScene.jsx:
     ```jsx
     import Spline from '@splinetool/react-spline'
     import { useState } from 'react'

     export default function SplineScene() {
       const [loaded, setLoaded] = useState(false)
       const [error, setError] = useState(false)

       return (
         <div className="fixed inset-0 -z-10 opacity-30">
           {!error && (
             <Spline
               scene="https://prod.spline.design/[VOTRE-SCENE-ID]/scene.splinecode"
               onLoad={() => {
                 setLoaded(true)
                 console.log('Spline 3D loaded')
               }}
               onError={(e) => {
                 console.warn('Spline load error:', e)
                 setError(true)
               }}
             />
           )}
           {error && (
             <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-800" />
           )}
         </div>
       )
     }
     ```

4. Lazy Loading (Performance):
   - [ ] Wrapper lazy load si viewport visible:
     ```jsx
     import { lazy, Suspense } from 'react'
     const SplineLazy = lazy(() => import('@splinetool/react-spline'))

     // Render avec Suspense fallback gradient
     ```

5. Tests:
   - [ ] Local: pnpm dev → vérifier background 3D animé
   - [ ] Mobile: iPhone Safari → vérifier FPS >24, pas de lag scroll
   - [ ] 3G throttle: Chrome DevTools → timeout 5s si pas load → fallback gradient

6. Fallback Graceful:
   - [ ] Si timeout 5s ou error → display gradient CSS (pas de crash)
   - [ ] Sentry log warning (pas error, c'est progressif enhancement)

7. Analytics:
   - [ ] Track "spline_load_success" / "spline_load_fail" (ratio)
   - [ ] Metric: Load success >95%

8. Documentation:
   - [ ] Screenshot scène Spline → docs/images/spline-background.png
   - [ ] Update README.md: "Background 3D powered by Spline"

9. Deploy:
   - [ ] Branch: feature/spline-3d-agent-007
   - [ ] PR → merge staging
   - [ ] Lighthouse CI: Vérifier Performance score pas de régression (<-5 points)
   - [ ] Prod après validation
```

## Livrables
1. ✅ Scène Spline published (<2MB)
2. ✅ SplineScene.jsx updated (URL + error handling)
3. ✅ Tests mobile (FPS >24)
4. ✅ Fallback gradient CSS
5. ✅ Analytics tracking

## Métriques Succès
- Spline load success: >95%
- FPS mobile: >24 (acceptable)
- Lighthouse Performance: Pas de régression >5 points
- User feedback: "Background magnifique" 🎨

## Risques
- **Scene trop lourde (>5MB)** → Optimiser vertices, textures 256x256
- **Mobile lag** → Désactiver Spline si device low-end (navigator.deviceMemory <4GB)

## Design Inspiration
- https://spline.design/community (abstract dark themes)
- Notion homepage background (subtle, pas distrayant)
- Stripe homepage (mesh gradient 3D)

## Communication
- S6 Jour 1: Screenshot design Spline (WIP)
- S6 Fin: Loom démo background animé (desktop + mobile)
