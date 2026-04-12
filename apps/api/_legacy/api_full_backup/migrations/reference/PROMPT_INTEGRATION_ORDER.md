# Ordre d’intégration strict (prompt catalogue / produits / facettes)

Checklist de traçabilité. Cocher après exécution réelle.

| Étape | Action | Résultat attendu |
|------|--------|------------------|
| 1 | **Neon** : si base legacy avec table `catalogue`, exécuter `migration_catalogue_to_produits.sql` ; sinon no-op | Table unique `public.produits` |
| 2 | **Neon** : `.\scripts\migrate_db.ps1` (ou `-ApplyReferenceSql` si vue stats) | `alembic current` → `a013` (head) |
| 3 | **API** : routes facettes via `domains/catalogue/facets_router.py` | `GET /api/v1/catalogue/facets`, `GET /api/v1/catalogue/search` |
| 4 | **API** : routes attributs via `domains/catalogue/attributes_endpoint.py` | `GET /api/v1/catalogue/attributes`, `POST /api/v1/catalogue/{id}/attributes` |
| 5 | **API** : `services/attribute_extractor.py` + `services/product_enricher.py` | Imports OK, SQL sur `produits` |
| 6 | **PWA** : `AttributeQuestionnaire.jsx` dans `ValidationPage.jsx` | Import + rendu conditionnel |
| 7 | **PWA** : `CataloguePage.jsx` version fournie | Pas de `useCatalogueFacets.js` |
| 8 | **PWA** : pas de TanStack Query (`@tanstack/react-query` absent, pas de `QueryClient` dans `main.jsx`) | Build + runtime OK |
| 9 | **`.env`** : `GOOGLE_API_KEY` renseigné (extraction attributs Gemini) | Pas de `KeyError` à l’appel extract |

Fichiers d’ancrage :

- SQL rename : `migration_catalogue_to_produits.sql`
- SQL complément stats : `migration_attributes_produits.sql`
- Router principal : `domains/catalogue/router.py` (compose `facets_router` + `attributes_endpoint`)
