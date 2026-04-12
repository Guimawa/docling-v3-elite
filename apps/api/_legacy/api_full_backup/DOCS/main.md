# `main.py` — Composition Root API

**Fichier :** `apps/api/main.py`
**Taille actuelle :** ~173 lignes
**Rôle :** assembler l'application FastAPI (middlewares globaux, erreurs, routes domaine, docs OpenAPI).

---

## Vue d'ensemble

Le backend suit maintenant une structure **DDD modulaire** :

- `main.py` ne contient plus la logique métier.
- Le cycle de vie (startup/shutdown) est externalisé dans `domains/platform/lifespan.py`.
- Les routes sont découpées par **bounded context** (`auth`, `scan`, `catalogue`, etc.).
- Les briques transverses sont centralisées dans `domains/shared/`.

---

## Ce que `main.py` fait

1. Initialise la télémétrie (`domains/shared/sentry.py`).
2. Configure l'app FastAPI (métadonnées, docs, tags OpenAPI).
3. Branche les middlewares globaux :
   - CORS
   - `request_id` (traçabilité)
   - headers de sécurité HTTP
4. Branche le rate limiter (`app.state.limiter`).
5. Inclut les routeurs domaine :
   - `platform_router`
   - `scan_router`
   - `catalogue_router`
   - `auth_router`
   - `community_router`
   - `compliance_router`
   - `watchdog_router`

---

## Ce que `main.py` **ne** fait plus

- Pas de bootstrap DB direct.
- Pas de migration Alembic inline.
- Pas de logique watchdog inline.
- Pas de logique métier scan/catalogue/auth.

Tout cela est déplacé dans les modules domaine dédiés.

---

## Routage (source de vérité)

Les endpoints sont définis dans :

- `apps/api/domains/auth/router.py`
- `apps/api/domains/scan/router.py`
- `apps/api/domains/catalogue/router.py`
- `apps/api/domains/community/router.py`
- `apps/api/domains/compliance/router.py`
- `apps/api/domains/watchdog/router.py`
- `apps/api/domains/platform/router.py`

---

## Lifespan

Le lifecycle FastAPI est géré par `apps/api/domains/platform/lifespan.py` :

- validation config (`Config.validate()`)
- ouverture pool DB
- migrations
- gestion utilisateur invité (`FREE_ACCESS_MODE`)
- démarrage/arrêt watchdog
- fermeture pool DB

---

## Notes exploitation

- Entrée runtime locale : `uvicorn main:app --host 0.0.0.0 --port 8000`
- Docs API : `/docs` (si activées selon environnement)
- Healthcheck : `/health`
