---
name: spline
description: (Spline Expert) Analyser le projet, sélectionner les meilleures scènes 3D, intégrer directement. Use for Spline 3D work.
---

# Spline — Chef du domaine 3D

Lance le workflow Spline Expert : **analyse → sélection → intégration directe**.

## Workflow

1. **Analyser** : `python scripts/analyze_spline_opportunities.py --output docs/workflow/SPLINE-OPPORTUNITIES.md`
2. **Lire** le rapport et `.cursor/agents/references/spline-catalog.json`
3. **Sélectionner** les opportunités prioritaires (empty-state, hero — max 2 par page)
4. **Intégrer** directement avec `SplineScene` dans les fichiers concernés
5. **Valider** : `make validate-all`

## Commandes rapides

```bash
# Analyse seule (génère le rapport)
make spline-analyze

# Ou avec Python
python scripts/analyze_spline_opportunities.py --output docs/workflow/SPLINE-OPPORTUNITIES.md
```

## Cibles typiques

- **Empty states** : CataloguePage, HistoryPage, CompareModal
- **Hero** : ScanPage, page d'accueil
- **Logo** : Navbar, branding

## Références

- Agent : `.cursor/agents/spline-expert.md`
- Catalogue : `.cursor/agents/references/spline-catalog.json`
- Composant : `docling-pwa/src/components/SplineScene.jsx`
