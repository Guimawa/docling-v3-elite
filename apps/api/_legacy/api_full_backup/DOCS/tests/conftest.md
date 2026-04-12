# conftest.py (tests/) — Ce qu'on vérifie

**Fichier :** `apps/api/tests/conftest.py`
**Catégorie :** conftest
**Ce qu'on teste :** Ce fichier ne contient pas de tests — il fournit les fixtures partagées par tous les tests d'intégration : connexion à la base de données réelle, clients HTTP avec et sans authentification, générateur d'utilisateurs et de produits.

---

## Le code

```python
"""
Configuration globale des tests — zéro mock.
Fixtures réelles : serveur, DB, utilisateur, client authentifié.
"""

import os
import time
import uuid
from collections.abc import Generator

import httpx
import pytest
from faker import Faker

# JWT_SECRET requis pour les tests auth (auth_service)
os.environ.setdefault("JWT_SECRET", "test-secret-32-chars-minimum-for-pytest")

# Charger .env.test si présent (racine projet ou apps/api)
_env_test_root = os.path.join(os.path.dirname(__file__), "..", "..", ".env.test")
_env_test_api = os.path.join(os.path.dirname(__file__), "..", ".env.test")
if os.path.exists(_env_test_root):
    from dotenv import load_dotenv
    load_dotenv(_env_test_root)
elif os.path.exists(_env_test_api):
    from dotenv import load_dotenv
    load_dotenv(_env_test_api)

# Variables d'environnement de test
TEST_BASE_URL = os.getenv("TEST_BASE_URL", "http://localhost:8000")
TEST_FRONTEND_URL = os.getenv("TEST_FRONTEND_URL", "http://localhost:5173")
TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL") or os.getenv("DATABASE_URL")

fake = Faker("fr_FR")


# ─── Serveur accessible ───────────────────────────────────────────────────────
@pytest.fixture(scope="session")
def ensure_server_running() -> str:
    """
    Vérifie que le serveur est réellement lancé avant tous les tests.
    Lance pytest.fail si inaccessible après 10 tentatives.
    """
    max_retries = 10
    for _i in range(max_retries):
        try:
            resp = httpx.get(f"{TEST_BASE_URL}/health", timeout=2)
            if resp.status_code == 200:
                return TEST_BASE_URL
        except Exception:
            pass
        time.sleep(1)
    pytest.skip(
        f"Le serveur n'est pas accessible sur {TEST_BASE_URL}. "
        "Lancez-le avant les tests (ex: cd apps/api && uv run uvicorn main:app).",
        allow_module_level=True,
    )
    return TEST_BASE_URL  # unreachable


# ─── Connexion DB réelle ──────────────────────────────────────────────────────
@pytest.fixture(scope="function")
def real_db_connection() -> Generator:
    """
    Connexion réelle à la base de données de test.
    Utilise psycopg2 (sync) pour compatibilité avec les fixtures.
    """
    if not TEST_DATABASE_URL:
        pytest.skip("TEST_DATABASE_URL ou DATABASE_URL non défini")
    conn = None
    try:
        import psycopg2
        conn = psycopg2.connect(TEST_DATABASE_URL)
        conn.autocommit = False
        yield conn
        conn.rollback()
    finally:
        if conn:
            conn.close()


# ─── Utilisateur unique (Faker) ───────────────────────────────────────────────
@pytest.fixture(scope="function")
def unique_user() -> dict:
    """Génère un utilisateur unique et réaliste pour chaque test."""
    import random
    import secrets
    pwd = f"Test@{secrets.token_hex(8)}!{random.randint(100, 999)}"
    return {
        "email": f"test_{uuid.uuid4().hex[:8]}@{fake.domain_name()}",
        "password": pwd,
        "name": fake.first_name(),
    }


# ─── Client HTTP authentifié ──────────────────────────────────────────────────
@pytest.fixture(scope="function")
def authenticated_client(
    ensure_server_running: str,
    unique_user: dict,
) -> Generator:
    """
    Client HTTP réel avec session authentifiée.
    Inscription + login réels via Form data (pas JSON).
    """
    base_url = ensure_server_running
    client = httpx.Client(base_url=base_url, timeout=30)

    # Inscription réelle (Form data)
    reg_resp = client.post(
        "/api/v1/auth/register",
        data={
            "email": unique_user["email"],
            "password": unique_user["password"],
            "name": unique_user.get("name", ""),
        },
    )
    if reg_resp.status_code not in (200, 409):
        pytest.fail(f"Register échoué : {reg_resp.status_code} {reg_resp.text}")

    # Connexion réelle (Form data)
    login_resp = client.post(
        "/api/v1/auth/login",
        data={
            "email": unique_user["email"],
            "password": unique_user["password"],
        },
    )
    assert login_resp.status_code == 200, f"Login échoué : {login_resp.text}"
    token = login_resp.json().get("token")
    assert token, "Token manquant dans la réponse login"
    client.headers["Authorization"] = f"Bearer {token}"

    yield client, unique_user
    client.close()


# ─── Client HTTP non authentifié ──────────────────────────────────────────────
@pytest.fixture(scope="function")
def http_client(ensure_server_running: str) -> Generator:
    """Client HTTP simple sans auth."""
    client = httpx.Client(base_url=ensure_server_running, timeout=30)
    yield client
    client.close()


# ─── Produit Faker pour batch ─────────────────────────────────────────────────
@pytest.fixture(scope="function")
def sample_products() -> list[dict]:
    """Liste de produits réalistes générés par Faker."""
    products = []
    for _ in range(3):
        prix = round(fake.random.uniform(5.0, 150.0), 2)
        remise = round(fake.random.uniform(0, 15), 1)
        prix_remise = round(prix * (1 - remise / 100), 2)
        products.append({
            "fournisseur": fake.company()[:50],
            "designation_raw": fake.catch_phrase()[:100],
            "designation_fr": fake.catch_phrase()[:100],
            "famille": "Maçonnerie",
            "unite": "unité",
            "prix_brut_ht": prix,
            "remise_pct": remise,
            "prix_remise_ht": prix_remise,
            "prix_ttc_iva21": round(prix_remise * 1.21, 2),
            "confidence": "high",
        })
    return products
```

---

## Ce que chaque fixture prépare

**Initialisation au chargement**
Avant les fixtures, le fichier :
1. Définit `JWT_SECRET` si absent (même chose que le conftest racine, par sécurité).
2. Cherche un fichier `.env.test` dans les dossiers parents et le charge si trouvé. Cela permet d'avoir une vraie base de données de test configurée localement sans commit de credentials.
3. Lit les URLs de base (`TEST_BASE_URL`, `TEST_FRONTEND_URL`, `TEST_DATABASE_URL`).
4. Crée un générateur `fake` en français pour produire des données réalistes.

**`ensure_server_running`** (scope: session)
Vérifie que le backend FastAPI est démarré en appelant `/health` jusqu'à 10 fois (1 seconde d'attente entre chaque tentative). Si le serveur répond, il retourne l'URL de base. Sinon, il ignore tous les tests qui en dépendent avec un message explicatif. Le scope `session` signifie que cette vérification n'est faite qu'une seule fois pour toute la session de test — pas avant chaque test.

**`real_db_connection`** (scope: function)
Ouvre une vraie connexion PostgreSQL à la base de test. La connexion est en mode `autocommit = False`, ce qui signifie que toutes les modifications faites pendant le test sont annulées automatiquement à la fin (`conn.rollback()`). Cela garantit que chaque test repart d'une base propre sans avoir à vider les tables. Si `TEST_DATABASE_URL` n'est pas défini, le test est ignoré.

**`unique_user`** (scope: function)
Génère un dictionnaire représentant un utilisateur avec :
- Un email unique (`test_` + 8 caractères aléatoires + `@` + un nom de domaine Faker).
- Un mot de passe fort généré aléatoirement (respecte les contraintes de complexité).
- Un prénom réaliste en français.

Chaque appel à cette fixture produit un utilisateur différent, évitant les conflits d'email entre tests.

**`authenticated_client`** (scope: function)
Combine `ensure_server_running` et `unique_user` pour créer un client HTTP déjà authentifié. Il effectue une vraie inscription puis une vraie connexion via l'API, récupère le token JWT et le place dans les headers du client. Les tests qui utilisent cette fixture reçoivent le tuple `(client, unique_user)` et peuvent faire des requêtes authentifiées directement. Le client est fermé proprement après le test.

**`http_client`** (scope: function)
Client HTTP simple sans authentification. Utile pour tester que les routes protégées retournent bien 401.

**`sample_products`** (scope: function)
Génère une liste de 3 produits BTP réalistes avec des prix, remises et désignations aléatoires. Utilisé pour tester les endpoints de sauvegarde en lot. Les calculs (prix TTC, prix remisé) sont cohérents entre eux.

---

## Pourquoi c'est important

Ce fichier est le "kit de démarrage" pour tous les tests d'intégration. Il évite de dupliquer la logique de connexion/authentification dans chaque fichier de test. La philosophie "zéro mock" signifie que les tests utilisent de vraies requêtes HTTP et une vraie base de données — ce qui détecte des bugs que des mocks ne peuvent pas voir (ex: une contrainte SQL manquante, un bug de sérialisation JSON réel).

---

## Peut-on améliorer ces fixtures ?

- **`real_db_connection` utilise psycopg2 synchrone** : le reste du code utilise `asyncpg` (asynchrone). Une incompatibilité subtile pourrait causer des bugs non détectés par ces tests.
- **Pas de nettoyage des utilisateurs créés** : `authenticated_client` crée un vrai utilisateur dans la base de test. Si `rollback` n'est pas utilisé (ce n'est pas le cas ici), ces utilisateurs s'accumulent. Il faudrait une fixture de teardown qui supprime les utilisateurs créés.
- **`sample_products` retourne des données mais pas des `Product` Pydantic** : les tests pourraient recevoir des objets `Product` validés plutôt que des dictionnaires bruts, ce qui détecterait plus tôt les problèmes de validation.
- **La gestion du `.env.test`** : si ni `.env.test` racine ni `.env.test` api n'existe, les tests tournent avec les valeurs par défaut. Cela peut mener à des tests qui "passent" parce qu'ils sont ignorés (`skip`) plutôt que parce qu'ils fonctionnent vraiment.
