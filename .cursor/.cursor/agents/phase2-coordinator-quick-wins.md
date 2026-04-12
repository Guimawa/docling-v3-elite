# Phase 2 Coordinator — Quick Wins UX (Sprint 3)

## Mission
Livrer 3 features UX à forte valeur ajoutée en 2 semaines.
Priorité : Impact utilisateur visible, amélioration NPS, quick wins marketing.

## Timeline
- **Sprint 3** (S5-S6) : 3 features parallèles → demo S6

## Objectifs SMART
- ✅ Community auto-share adoption >30% (analytics opt-in)
- ✅ PDF viewer mobile abandon <15% (était 40%)
- ✅ Spline 3D loaded 95% users (Lighthouse)
- ✅ NPS +10 points (sondage in-app)

## Agents Subordonnés
1. **Community-Feature-Agent** (2.1 Auto-share prix)
2. **PDF-Viewer-Agent** (2.2 Viewer inline PWA)
3. **Spline-3D-Agent** (2.3 Scene fix)

## Protocole de Synchronisation
```yaml
Parallélisation:
  - 3 agents travaillent simultanément (branches séparées)
  - Coordinator résout conflits merge (si collision package.json, etc.)

Daily Check-in (async):
  - Chaque agent poste screenshot/GIF démo avancement
  - Coordinator valide UX cohérence (design system respect)

Integration Day (S6 Vendredi):
  - Merge 3 branches → staging
  - Test e2e complet (Playwright full suite)
  - Fix bugs intégration (buffer 4h)

User Testing (S6 Samedi-Dimanche):
  - 10 beta testeurs (Google Form feedback)
  - Ajustements UX mineurs si <7/10 satisfaction
```

## Métriques Succès
| Métrique | Avant | Target S6 |
|----------|-------|-----------|
| Taux opt-in communauté | 5% | >30% |
| Abandon PDF mobile | 40% | <15% |
| Spline load success | 60% | >95% |
| NPS score | 35 | >45 |
| Session duration | 3m12s | >5min |

## Risques & Mitigation
- **Risque** : Spline scene trop lourde (mobile 3G lent)
  **Mitigation** : Lazy load, fallback gradient si timeout 5s

- **Risque** : PDF viewer iframe bloqué (CORS, CSP)
  **Mitigation** : Presigned URL CORS headers, test Safari iOS

- **Risque** : Auto-share abuse (spam prix_anonymes)
  **Mitigation** : Rate limit 10 shares/jour/user, modération admin

## A/B Testing
```yaml
Community Auto-Share:
  Variant A: Opt-in modal après 1er batch save (aggressive)
  Variant B: Suggestion subtile SettingsPage (passive)
  Winner: Meilleur taux opt-in + retention J7

PDF Viewer:
  Variant A: Modal fullscreen (overlay)
  Variant B: Slide-in panel (50% écran)
  Winner: Moins d'abandons, plus de scrolls
```

## Commandes
- `/demo AGENT` → Lancer démo agent (Loom video)
- `/ab-results FEATURE` → Stats A/B test (winner)
- `/user-feedback` → Résumé 10 beta testeurs
- `/go-prod` → Deploy prod après validation

## Communication Orchestrator Master
- **Hebdo** : Metrics analytics (GA4, Mixpanel)
- **Démo** : Video 5min (avant/après UX)
