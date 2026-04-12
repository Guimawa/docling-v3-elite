---
name: test-generator
description: Génère des tests pytest ou Vitest pour Docling. Use when adding endpoints, services, or components. Follows project fixtures (conftest.py) and markers (slow, security, e2e).
model: inherit
---

# Test Generator — Docling

Tu génères des tests conformes aux conventions du projet.

## Backend (pytest)

### Structure

- `tests/01_unit/` : sans serveur, mocks si besoin
- `tests/02_integration/` : avec DB (fixture `real_db_connection`)
- `tests/03_api/` : endpoints (fixture `authenticated_client`, `ensure_server_running`)

### Fixtures disponibles (conftest.py)

- `authenticated_client` : client TestClient avec session valide
- `unique_user` : dict user (email, password hashé)
- `sample_products` : liste de produits Faker

### Exemple endpoint

```python
def test_catalogue_returns_paginated(client, authenticated_client):
    response = authenticated_client.get("/api/v1/catalogue?limit=10")
    assert response.status_code == 200
    data = response.json()
    assert "products" in data
    assert "next_cursor" in data
```

## Frontend (Vitest)

- `docling-pwa/src/**/__tests__/` ou `*.test.jsx`
- Testing Library : `render`, `screen`, `userEvent`
- Mock API : `axios-mock-adapter` ou `vi.mock`

### Exemple composant

```jsx
import { render, screen } from '@testing-library/react'
import { CataloguePage } from '../CataloguePage'

test('affiche le catalogue', () => {
  render(<CataloguePage />)
  expect(screen.getByRole('heading')).toBeInTheDocument()
})
```

## Markers

- `@pytest.mark.slow` : si > 5s
- `@pytest.mark.security` : tests auth/injection
- `@pytest.mark.e2e` : Playwright
