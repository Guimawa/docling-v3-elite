---
name: run-full-tests
description: Exécute tous les tests Docling — backend (pytest) et frontend (Vitest). Exclut slow et external par défaut.
---

# Run Full Tests

Exécute la suite de tests complète.

## Backend (pytest)

```bash
# Tous les tests (hors slow, external)
pytest tests/ backend/tests/ -v -m "not slow and not external"

# Avec coverage
pytest tests/ backend/tests/ -v --cov=backend --cov-fail-under=65 -m "not slow and not external"

# Tests API (serveur requis)
pytest tests/03_api -v

# Tests E2E Playwright
pytest tests/04_e2e -v -m e2e
```

## Frontend (Vitest)

```bash
cd docling-pwa && npx vitest run --coverage
```

## CI

La CI exécute :
- Backend : migrations, serveur, pytest avec coverage 65%
- Frontend : vitest avec coverage 60%, build
