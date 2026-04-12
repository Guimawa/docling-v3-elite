# test_full_flow.py — Ce qu'on vérifie

**Fichier :** `apps/api/tests/e2e/test_full_flow.py`
**Catégorie :** e2e
**Ce qu'on teste :** Le parcours complet d'un utilisateur via l'API réelle : vérification du serveur, inscription, connexion, accès au catalogue, protection des routes, rate limiting et déconnexion.

---

## Le code

```python
"""
Tests E2E — Flow complet API : auth → upload → catalogue → devis
Ces tests nécessitent le serveur en cours d'exécution.
Skip automatiquement si serveur non disponible.
"""

import os
import time

import httpx
import pytest

BASE_URL = os.getenv("TEST_BASE_URL", "http://localhost:8000")

pytestmark = [pytest.mark.e2e, pytest.mark.anyio]


@pytest.fixture(scope="module")
def anyio_backend():
    return "asyncio"


async def server_available() -> bool:
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(f"{BASE_URL}/health", timeout=3)
            return r.status_code == 200
    except Exception:
        return False


# ─── Test 1 : Health check ────────────────────────────────────────────────────
@pytest.mark.anyio
async def test_health_check():
    """Vérifie que /health répond 200 avec un champ status."""
    if not await server_available():
        pytest.skip("Server not available")
    async with httpx.AsyncClient(base_url=BASE_URL) as client:
        r = await client.get("/health")
    assert r.status_code == 200
    data = r.json()
    assert "status" in data


# ─── Test 2 : Register + Login flow ──────────────────────────────────────────
@pytest.mark.anyio
async def test_auth_flow():
    """Inscription + connexion réelles via l'API."""
    if not await server_available():
        pytest.skip("Server not available")
    email = f"e2e_test_{int(time.time())}@test.com"
    password = "TestPassword123!"

    async with httpx.AsyncClient(base_url=BASE_URL) as client:
        # Inscription
        r = await client.post(
            "/api/v1/auth/register",
            data={"email": email, "password": password, "name": "E2E Test"},
        )
        assert r.status_code in (200, 201, 409), f"Register failed: {r.text}"

        # Connexion
        r = await client.post(
            "/api/v1/auth/login",
            data={"email": email, "password": password},
        )
        assert r.status_code == 200, f"Login failed: {r.text}"

        # Vérification token ou cookie
        response_data = r.json()
        has_token = (
            "docling-token" in r.cookies
            or response_data.get("token")
            or response_data.get("data", {}).get("access_token")
        )
        assert has_token, f"No token found in response: {response_data}"


# ─── Test 3 : Accès endpoint authentifié ─────────────────────────────────────
@pytest.mark.anyio
async def test_authenticated_access():
    """Un client authentifié peut accéder au catalogue."""
    if not await server_available():
        pytest.skip("Server not available")
    email = f"e2e_auth_{int(time.time())}@test.com"
    password = "TestPassword123!"

    async with httpx.AsyncClient(base_url=BASE_URL, follow_redirects=True) as client:
        # Inscription + connexion
        await client.post(
            "/api/v1/auth/register",
            data={"email": email, "password": password, "name": "E2E Auth"},
        )
        login_r = await client.post(
            "/api/v1/auth/login",
            data={"email": email, "password": password},
        )
        assert login_r.status_code == 200, f"Login failed: {login_r.text}"

        token = login_r.json().get("token")
        if token:
            client.headers["Authorization"] = f"Bearer {token}"

        # Accès au catalogue (doit fonctionner avec auth)
        r = await client.get("/api/v1/catalogue")
        assert r.status_code in (200, 204), f"Catalogue access failed: {r.text}"


# ─── Test 4 : Accès non authentifié bloqué ───────────────────────────────────
@pytest.mark.anyio
async def test_unauthorized_blocked():
    """Un client sans token reçoit 401 sur les endpoints protégés."""
    if not await server_available():
        pytest.skip("Server not available")
    async with httpx.AsyncClient(base_url=BASE_URL) as client:
        r = await client.get("/api/v1/catalogue")
        assert r.status_code == 401, f"Expected 401, got {r.status_code}"


# ─── Test 5 : Rate limiting login ────────────────────────────────────────────
@pytest.mark.anyio
async def test_rate_limiting():
    """Plusieurs tentatives de login échouées déclenchent le rate limiting."""
    if not await server_available():
        pytest.skip("Server not available")
    async with httpx.AsyncClient(base_url=BASE_URL) as client:
        responses = []
        for _ in range(7):
            r = await client.post(
                "/api/v1/auth/login",
                data={"email": "nonexistent@test.com", "password": "wrong"},
            )
            responses.append(r.status_code)
        # Au moins un 429 (rate limited) ou des 401 (creds invalides)
        assert 429 in responses or all(s == 401 for s in responses), (
            f"Rate limiting not working as expected: {responses}"
        )


# ─── Test 6 : Upload sans auth bloqué ────────────────────────────────────────
@pytest.mark.anyio
async def test_upload_invoice_requires_auth():
    """Un upload sans authentification doit retourner 401."""
    if not await server_available():
        pytest.skip("Server not available")
    async with httpx.AsyncClient(base_url=BASE_URL) as client:
        r = await client.post(
            "/api/v1/invoices/process",
            files={"file": ("test.pdf", b"fake pdf", "application/pdf")},
        )
        assert r.status_code == 401, (
            f"Expected 401 for unauthenticated upload, got {r.status_code}"
        )


# ─── Test 7 : Flow complet auth → catalogue ──────────────────────────────────
@pytest.mark.anyio
async def test_full_auth_catalogue_flow():
    """Flow E2E complet : register → login → catalogue → logout."""
    if not await server_available():
        pytest.skip("Server not available")
    email = f"e2e_full_{int(time.time())}@test.com"
    password = "TestPassword123!"

    async with httpx.AsyncClient(base_url=BASE_URL, follow_redirects=True) as client:
        # 1. Inscription
        reg_r = await client.post(
            "/api/v1/auth/register",
            data={"email": email, "password": password, "name": "E2E Full"},
        )
        assert reg_r.status_code in (200, 201), f"Register failed: {reg_r.text}"

        # 2. Connexion
        login_r = await client.post(
            "/api/v1/auth/login",
            data={"email": email, "password": password},
        )
        assert login_r.status_code == 200, f"Login failed: {login_r.text}"

        token = login_r.json().get("token")
        if token:
            client.headers["Authorization"] = f"Bearer {token}"

        # 3. Catalogue accessible
        cat_r = await client.get("/api/v1/catalogue")
        assert cat_r.status_code in (200, 204), f"Catalogue failed: {cat_r.text}"

        # 4. Liste fournisseurs accessible
        fournisseurs_r = await client.get("/api/v1/catalogue/fournisseurs")
        assert fournisseurs_r.status_code == 200, (
            f"Fournisseurs failed: {fournisseurs_r.text}"
        )

        # 5. Logout
        logout_r = await client.post("/api/v1/auth/logout")
        assert logout_r.status_code in (200, 204), f"Logout failed: {logout_r.text}"

        # 6. Catalogue inaccessible après logout (si cookie-based, token toujours valide)
        if not token:
            # Cookie-based : vérifier que la session est invalidée
            post_logout_r = await client.get("/api/v1/catalogue")
            assert post_logout_r.status_code == 401, (
                f"Expected 401 after logout, got {post_logout_r.status_code}"
            )
```

---

## Ce que ces tests vérifient — en clair

**`server_available()`** (fonction utilitaire, pas un test)
Avant chaque test, on vérifie rapidement si le serveur répond sur `/health`. Si ce n'est pas le cas, le test est automatiquement ignoré (`pytest.skip`). Cela évite des erreurs confuses quand le serveur n'est pas démarré.

**`test_health_check`**
On appelle `/health` et on vérifie qu'on reçoit un code 200 et que la réponse contient un champ `status`. C'est le test le plus basique : "le serveur est vivant et répond correctement".

**`test_auth_flow`**
On crée un compte avec un email unique (basé sur l'heure pour éviter les doublons), puis on se connecte. On vérifie que la réponse contient bien un token d'authentification, que ce soit dans les cookies (`docling-token`) ou dans le corps de la réponse JSON.

**`test_authenticated_access`**
On s'inscrit, on se connecte, on récupère le token, et on fait une requête sur `/api/v1/catalogue`. On vérifie que le serveur répond 200 ou 204 (succès), confirmant que les routes protégées sont accessibles quand on est connecté.

**`test_unauthorized_blocked`**
Sans aucun token ni cookie, on essaie d'accéder à `/api/v1/catalogue`. Le serveur doit refuser avec un code 401 (Non autorisé). C'est la vérification de sécurité fondamentale.

**`test_rate_limiting`**
On envoie 7 tentatives de connexion avec de mauvais identifiants d'affilée. On vérifie qu'au moins une réponse est 429 (Trop de requêtes) ou que toutes sont 401. Ce test valide que le système de protection anti-brute-force fonctionne.

**`test_upload_invoice_requires_auth`**
On tente d'uploader un fichier PDF sans être connecté. Le serveur doit refuser avec 401. Cela garantit qu'on ne peut pas faire traiter des factures sans compte.

**`test_full_auth_catalogue_flow`**
Le test le plus complet : inscription → connexion → accès catalogue → accès liste fournisseurs → déconnexion → vérification que le catalogue est inaccessible après déconnexion (seulement pour l'auth par cookie). C'est le scénario utilisateur complet du début à la fin.

---

## Pourquoi c'est important

Ces tests vérifient ce qui se passe vraiment sur le réseau, avec une vraie base de données. Ils attrapent des bugs qu'aucun test unitaire ne peut détecter :
- Un middleware d'authentification mal configuré qui laisserait passer des requêtes non authentifiées
- Un problème d'encodage dans les formulaires d'inscription/connexion
- Le rate limiting qui ne se déclencherait pas en production
- La déconnexion qui n'invaliderait pas vraiment la session

---

## Peut-on améliorer ces tests ?

- **Le test de rate limiting est trop permissif** : il accepte que toutes les réponses soient 401, ce qui veut dire que le rate limiting pourrait ne jamais se déclencher et le test passerait quand même. Il faudrait tester avec un seuil plus bas.
- **Utilisation de `time.time()` pour les emails** : si deux tests s'exécutent dans la même seconde, il pourrait y avoir un conflit d'email. Mieux vaudrait utiliser un UUID aléatoire (comme le fait `conftest.py`).
- **Pas de test de l'upload avec auth** : le test 6 vérifie seulement qu'un upload sans auth est bloqué, mais pas qu'un upload avec auth fonctionne.
- **Le test 7 ne vérifie pas le post-logout en mode token Bearer** : si l'auth est par token et non par cookie, la vérification après logout est ignorée (le token reste techniquement valide côté client).
