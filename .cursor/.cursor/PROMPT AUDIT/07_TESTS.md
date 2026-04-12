# 🧪 07 — AUDIT TESTS COMPLET
# pytest · Vitest · Playwright E2E · Couverture · Fixtures · CI
# Écriture des tests critiques absents — Zéro complaisance

---

## MÉTHODE

```
L'audit tests est en deux temps :

  TEMPS 1 — DIAGNOTIC (sections T1 à T4) :
    → Inventorier ce qui existe
    → Mesurer la couverture réelle
    → Identifier les trous critiques (ce qui peut passer en prod sans se voir)

  TEMPS 2 — PRODUCTION (sections T5 à T9) :
    → Écrire les tests manquants P0 et P1 MAINTENANT
    → Code complet, prêt à copier-coller
    → Fixtures conftest.py complètes
    → Config CI mise à jour

RÈGLE ABSOLUE :
  Un test qui vérifie toujours true n'est pas un test.
  Un test sans assertion précise n'est pas un test.
  Un test qui ne peut jamais échouer = bruit, pas signal.

SÉVÉRITÉ DES TESTS MANQUANTS :
  P0 = Un bug passe en prod sans que personne le sache → 🔴 BLOCKER
  P1 = Feature cassée, détectable manuellement → 🟠 IMPORTANT
  P2 = Régressions futures possibles → 🟡 UTILE
```

---

## T1 — INVENTAIRE DES TESTS EXISTANTS

```bash
echo "=== TESTS BACKEND ==="
find tests/ -name "*.py" | sort
echo "Nombre de fichiers de test : $(find tests/ -name "test_*.py" | wc -l)"
echo ""
pytest tests/ --collect-only -q 2>&1 | tail -5
echo "Total tests collectés : $(pytest tests/ --collect-only -q 2>&1 | grep "selected" | head -1)"

echo ""
echo "=== TESTS FRONTEND ==="
find docling-pwa/src -name "*.test.*" -o -name "*.spec.*" | \
  grep -v node_modules | sort
find docling-pwa -name "vitest.config*" -o -name "playwright.config*" | \
  grep -v node_modules | sort
echo ""
cd docling-pwa && npx vitest list 2>/dev/null | head -30

echo ""
echo "=== TESTS E2E ==="
find . \( -name "*.e2e.*" -o -name "*playwright*" -o -name "*cypress*" \) | \
  grep -v node_modules | grep -v ".git" | sort
```

### Tableau tests existants

| Fichier | Lignes | Nb tests | Ce qui est testé | Happy path | Sad path | Edge cases | Score qualité |
|---------|--------|----------|-----------------|-----------|---------|-----------|--------------|
| tests/conftest.py | N | — | Fixtures globales | — | — | — | /10 |
| tests/test_api.py | N | N | Endpoints | | | | /10 |
| tests/test_auth.py | N | N | Auth / JWT | | | | /10 |
| tests/test_isolation.py | N | N | Multi-tenant | | | | /10 |
| [AGENT: tous les fichiers] | | | | | | | |

### Tableau tests frontend

| Fichier | Lignes | Nb tests | Ce qui est testé | Mock réaliste | Score qualité |
|---------|--------|----------|-----------------|--------------|--------------|
| src/__tests__/*.test.jsx | N | N | | | /10 |
| [AGENT: tous les fichiers] | | | | | |

---

## T2 — ANALYSE QUALITÉ DES TESTS EXISTANTS

```
Pour CHAQUE fichier de test existant, répondre à cette checklist :
```

```bash
# Détecter les anti-patterns courants :

# 1. Tests qui passent toujours (assert True)
grep -rn "assert True\|expect(true)\|toBeTruthy()" tests/ docling-pwa/src/ | \
  grep -v "node_modules"

# 2. sleep() dans les tests (tests lents et fragiles)
grep -rn "sleep\|time.sleep\|setTimeout.*[0-9][0-9][0-9]" tests/ \
  docling-pwa/src/ | grep -v "node_modules"

# 3. Tests qui utilisent la DB de PRODUCTION
grep -rn "DATABASE_URL\|prod\|production" tests/ | \
  grep -v ".env.example" | grep -v "#"

# 4. Tests sans assertion
grep -rn "^async def test_\|^def test_" tests/ | \
  while IFS=: read file lineno funcname; do
    # Vérifier si la fonction a des "assert" ou "raise"
    end_line=$((lineno + 30))
    if ! sed -n "${lineno},${end_line}p" "$file" | grep -q "assert\|raise"; then
      echo "⚠️ TEST SANS ASSERTION : $file:$lineno $funcname"
    fi
  done

# 5. Mocks trop larges (mocker tout le module = ne teste rien)
grep -rn "patch\|MagicMock\|Mock()" tests/ | wc -l
# → Ratio (mocks / total lignes tests) > 50% = problème
```

### Grille anti-patterns

| Fichier | Tests sans assertion | sleep() | Mock trop large | Fixtures non nettoyées | Score /10 |
|---------|---------------------|---------|----------------|----------------------|---------|
| [AGENT: chaque fichier] | | | | | |

---

## T3 — COUVERTURE ACTUELLE

```bash
echo "=== COUVERTURE BACKEND ==="
pytest tests/ \
  --cov=. \
  --cov-report=term-missing \
  --cov-report=json:coverage.json \
  --cov-omit="tests/*,migrations/*,*/__pycache__/*" \
  2>&1 | tee /tmp/coverage_report.txt

# Extraire les fichiers les moins couverts
python3 -c "
import json
with open('coverage.json') as f:
    data = json.load(f)

print('=== GLOBAL ===')
t = data['totals']
print(f'Couverture : {t[\"percent_covered\"]:.1f}%')
print(f'Lignes manquées : {t[\"missing_lines\"]}')
print()
print('=== FICHIERS LES MOINS COUVERTS ===')
files = [(path, info['summary']['percent_covered'])
         for path, info in data['files'].items()]
for path, pct in sorted(files, key=lambda x: x[1])[:10]:
    print(f'{pct:5.1f}% : {path}')
"

echo ""
echo "=== COUVERTURE FRONTEND ==="
cd docling-pwa
npx vitest run --coverage 2>&1 | tail -30
```

### Tableau couverture — objectifs par fichier

| Module / Fichier | Couverture actuelle | Objectif minimum | Gap | Lignes non couvertes | Priorité |
|-----------------|--------------------|-----------------|----|---------------------|---------|
| api.py | N% | 80% | N% | [lignes] | P0 |
| auth_service.py | N% | 90% | N% | [lignes] | P0 |
| db_manager.py | N% | 75% | N% | [lignes] | P0 |
| orchestrator.py | N% | 70% | N% | [lignes] | P1 |
| gemini_service.py | N% | 65% | N% | [lignes] | P1 |
| ScanPage.jsx | N% | 70% | N% | [lignes] | P1 |
| useStore.js | N% | 85% | N% | [lignes] | P0 |
| apiClient.js | N% | 75% | N% | [lignes] | P1 |
| DevisPage calculs | N% | 90% | N% | [lignes] | P0 |
| **GLOBAL** | **N%** | **75%** | **N%** | | |

---

## T4 — FIXTURES CONFTEST.PY — AUDIT & RÉÉCRITURE

```
PROBLÈME FRÉQUENT : le conftest.py est minimaliste ou inexistant.
Sans bonnes fixtures, les tests sont fragiles et couplés.

LIRE LE CONFTEST ACTUEL :
  [AGENT: cat tests/conftest.py]

VÉRIFIER QUE CES FIXTURES EXISTENT ET SONT CORRECTES :
```

```python
# ─── tests/conftest.py — VERSION COMPLÈTE RECOMMANDÉE ───────────────────────
# FICHIER COMPLET : tests/conftest.py

import pytest
import pytest_asyncio
import asyncio
import asyncpg
import jwt
import os
from datetime import datetime, timedelta, timezone
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, patch

from api import app
from backend.core.config import settings

# ─── CONFIGURATION ───────────────────────────────────────────────────────────

# DB de test séparée — JAMAIS utiliser la DB de prod
TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql://testuser:testpass@localhost:5432/docling_test"
)

# Données de test réutilisables
TEST_USER_A = {
    "email": "user_a@test.com",
    "password": "SecureTestPass_A_123!",
}
TEST_USER_B = {
    "email": "user_b@test.com",
    "password": "SecureTestPass_B_456!",
}

# ─── CONFIGURATION EVENT LOOP ────────────────────────────────────────────────

@pytest.fixture(scope="session")
def event_loop_policy():
    """Politique event loop pour pytest-asyncio."""
    return asyncio.DefaultEventLoopPolicy()

# ─── FIXTURES DB ─────────────────────────────────────────────────────────────

@pytest_asyncio.fixture(scope="session")
async def db_pool():
    """
    Pool de connexions vers la DB de TEST.
    Scope session = créé une seule fois pour tous les tests.
    Vérifie que la DB de test est bien accessible avant de commencer.
    """
    if "prod" in TEST_DATABASE_URL or "production" in TEST_DATABASE_URL:
        pytest.fail("DANGER : vous utilisez la DB de production pour les tests !")

    pool = await asyncpg.create_pool(
        TEST_DATABASE_URL,
        min_size=2,
        max_size=5,
        command_timeout=30,
    )
    yield pool
    await pool.close()

@pytest_asyncio.fixture(autouse=True)
async def clean_tables(db_pool):
    """
    Nettoyage des tables entre chaque test.
    autouse=True = appliqué à TOUS les tests automatiquement.
    Ordre de suppression : respecter les FK.
    """
    yield  # Le test s'exécute ici
    # Cleanup APRÈS le test
    async with db_pool.acquire() as conn:
        await conn.execute(
            "TRUNCATE TABLE jobs, products, users RESTART IDENTITY CASCADE"
        )

# ─── FIXTURES UTILISATEURS ───────────────────────────────────────────────────

@pytest_asyncio.fixture
async def user_a(db_pool):
    """Crée l'utilisateur A dans la DB de test. Retourne ses données."""
    async with db_pool.acquire() as conn:
        # Hash du password (Argon2)
        from argon2 import PasswordHasher
        ph = PasswordHasher()
        hashed = ph.hash(TEST_USER_A["password"])
        row = await conn.fetchrow(
            "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email",
            TEST_USER_A["email"], hashed
        )
    return {"id": row["id"], "email": row["email"]}

@pytest_asyncio.fixture
async def user_b(db_pool):
    """Crée l'utilisateur B dans la DB de test."""
    async with db_pool.acquire() as conn:
        from argon2 import PasswordHasher
        ph = PasswordHasher()
        hashed = ph.hash(TEST_USER_B["password"])
        row = await conn.fetchrow(
            "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email",
            TEST_USER_B["email"], hashed
        )
    return {"id": row["id"], "email": row["email"]}

# ─── FIXTURES JWT ─────────────────────────────────────────────────────────────

def make_token(user_id: int, exp_delta: timedelta = timedelta(hours=24)) -> str:
    """Génère un JWT valide pour les tests."""
    payload = {
        "sub": str(user_id),
        "exp": datetime.now(timezone.utc) + exp_delta,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")

@pytest.fixture
def token_a(user_a):
    """JWT valide pour l'utilisateur A."""
    return make_token(user_a["id"])

@pytest.fixture
def token_b(user_b):
    """JWT valide pour l'utilisateur B."""
    return make_token(user_b["id"])

@pytest.fixture
def expired_token(user_a):
    """JWT expiré depuis 1 heure. Pour tester le rejet des tokens expirés."""
    return make_token(user_a["id"], exp_delta=timedelta(hours=-1))

@pytest.fixture
def malformed_token():
    """Token invalide (pas un JWT). Pour tester la robustesse du décodage."""
    return "this.is.not.a.jwt.token.at.all"

@pytest.fixture
def token_wrong_secret(user_a):
    """JWT signé avec le mauvais secret. Pour tester la vérification de signature."""
    payload = {
        "sub": str(user_a["id"]),
        "exp": datetime.now(timezone.utc) + timedelta(hours=24),
    }
    return jwt.encode(payload, "wrong-secret-key-that-is-not-the-real-one", algorithm="HS256")

# ─── FIXTURES HTTP CLIENT ─────────────────────────────────────────────────────

@pytest_asyncio.fixture
async def client():
    """Client HTTP non authentifié. Pour les endpoints publics."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c

@pytest_asyncio.fixture
async def auth_client_a(token_a):
    """Client HTTP authentifié en tant qu'utilisateur A."""
    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport,
        base_url="http://test",
        headers={"Authorization": f"Bearer {token_a}"}
    ) as c:
        yield c

@pytest_asyncio.fixture
async def auth_client_b(token_b):
    """Client HTTP authentifié en tant qu'utilisateur B."""
    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport,
        base_url="http://test",
        headers={"Authorization": f"Bearer {token_b}"}
    ) as c:
        yield c

# ─── FIXTURES DONNÉES ────────────────────────────────────────────────────────

@pytest_asyncio.fixture
async def product_a(db_pool, user_a):
    """Crée un produit appartenant à l'utilisateur A."""
    async with db_pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO products (user_id, designation_fr, famille, fournisseur, prix_ht, quantite)
            VALUES ($1, $2, $3, $4, $5, $6) RETURNING id
            """,
            user_a["id"], "Ciment Portland 25kg", "Ciment", "Lafarge", 12.50, 100
        )
    return {"id": row["id"], "user_id": user_a["id"]}

@pytest_asyncio.fixture
async def product_b(db_pool, user_b):
    """Crée un produit appartenant à l'utilisateur B."""
    async with db_pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO products (user_id, designation_fr, famille, fournisseur, prix_ht, quantite)
            VALUES ($1, $2, $3, $4, $5, $6) RETURNING id
            """,
            user_b["id"], "Sable 0/4 1m³", "Granulats", "Cemex", 85.00, 50
        )
    return {"id": row["id"], "user_id": user_b["id"]}

@pytest_asyncio.fixture
async def job_b(db_pool, user_b):
    """Crée un job appartenant à l'utilisateur B."""
    async with db_pool.acquire() as conn:
        row = await conn.fetchrow(
            "INSERT INTO jobs (user_id, status, filename) VALUES ($1, $2, $3) RETURNING id",
            user_b["id"], "done", "facture_test.pdf"
        )
    return {"id": row["id"], "user_id": user_b["id"]}

# ─── FIXTURES FICHIERS ────────────────────────────────────────────────────────

@pytest.fixture
def valid_pdf():
    """Contenu minimal d'un PDF valide (header magique)."""
    return b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\nxref\n%%EOF"

@pytest.fixture
def large_file():
    """Fichier > limite d'upload pour tester le rejet 413."""
    # Dépasse la limite configurée dans les settings
    limit_bytes = getattr(settings, 'max_upload_size_bytes', 10 * 1024 * 1024)
    return b"X" * (limit_bytes + 1)

@pytest.fixture
def executable_file():
    """Fichier exécutable Windows (header PE). Pour tester le rejet MIME."""
    return b"MZ\x90\x00\x03\x00\x00\x00"

@pytest.fixture
def path_traversal_filename():
    """Nom de fichier avec path traversal. Pour tester la sanitisation."""
    return "../../../../etc/passwd.pdf"

# ─── FIXTURES MOCKS SERVICES EXTERNES ────────────────────────────────────────

@pytest.fixture
def mock_gemini():
    """
    Mock du service Gemini.
    Les tests ne doivent JAMAIS appeler la vraie API Gemini :
    - Coûteux (quota)
    - Non déterministe (résultat variable)
    - Dépendance réseau (tests fragiles)
    """
    mock_response = {
        "products": [
            {
                "designation_fr": "Ciment Portland CEM I 52.5 N - 25kg",
                "famille": "Ciment",
                "fournisseur": "Lafarge",
                "reference": "CEM-52-25",
                "prix_ht": 12.50,
                "quantite": 100,
                "unite": "sac",
                "confidence": "high"
            }
        ],
        "metadata": {
            "source": "gemini-mock",
            "confidence_global": "high"
        }
    }
    with patch("backend.services.gemini_service.GeminiService.extract_products",
               new_callable=AsyncMock, return_value=mock_response) as mock:
        yield mock

@pytest.fixture
def mock_gemini_failure():
    """Mock Gemini qui échoue. Pour tester le fallback et la gestion d'erreur."""
    with patch("backend.services.gemini_service.GeminiService.extract_products",
               new_callable=AsyncMock, side_effect=Exception("Gemini API rate limit exceeded")) as mock:
        yield mock

@pytest.fixture
def mock_storage():
    """Mock du service de stockage S3/Storj."""
    with patch("backend.services.storage_service.StorageService.upload_file",
               new_callable=AsyncMock, return_value="https://storage.example.com/file.pdf") as mock:
        yield mock
```

---

## T5 — TESTS BACKEND MANQUANTS P0

```python
# ─── tests/test_auth.py ──────────────────────────────────────────────────────
# FICHIER COMPLET

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio

class TestRegister:

    async def test_register_success(self, client):
        """Inscription réussie retourne 201 et ne renvoie jamais le password."""
        response = await client.post("/api/v1/register", json={
            "email": "newuser@example.com",
            "password": "SecurePass123!"
        })
        assert response.status_code == 201
        data = response.json()
        # Le hash du password ne doit JAMAIS être dans la réponse
        assert "password" not in data
        assert "password_hash" not in str(data)
        # L'email est retourné (pour confirmation)
        assert data.get("email") == "newuser@example.com"

    async def test_register_duplicate_email_returns_409(self, client):
        """Deux inscriptions avec le même email → 409 Conflict."""
        payload = {"email": "duplicate@example.com", "password": "Pass123!"}
        await client.post("/api/v1/register", json=payload)
        response = await client.post("/api/v1/register", json=payload)
        assert response.status_code == 409
        # Message d'erreur humain (pas "UNIQUE constraint failed")
        detail = response.json().get("detail", "")
        assert "duplicate" not in detail.lower() or "utilisé" in detail.lower() or "existe" in detail.lower()

    @pytest.mark.parametrize("email", [
        "notanemail",
        "@nodomain.com",
        "no@",
        "",
        "a" * 255 + "@example.com",  # Email trop long
    ])
    async def test_register_invalid_email_returns_422(self, client, email):
        """Emails invalides → 422 Unprocessable Entity."""
        response = await client.post("/api/v1/register", json={
            "email": email,
            "password": "ValidPass123!"
        })
        assert response.status_code == 422

    @pytest.mark.parametrize("password", [
        "short",            # Trop court
        "",                 # Vide
        "a" * 1000,         # Trop long (DoS via Argon2)
    ])
    async def test_register_invalid_password_returns_422(self, client, password):
        """Passwords invalides → 422."""
        response = await client.post("/api/v1/register", json={
            "email": "test@example.com",
            "password": password
        })
        assert response.status_code == 422


class TestLogin:

    async def test_login_success_returns_token(self, client, user_a):
        """Login correct → token valide dans la réponse."""
        response = await client.post("/api/v1/login", json={
            "email": "user_a@test.com",
            "password": "SecureTestPass_A_123!"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert len(data["access_token"]) > 20  # Token non vide

    async def test_login_wrong_password_returns_401(self, client, user_a):
        """Mauvais password → 401, message générique (pas d'info sur l'existence)."""
        response = await client.post("/api/v1/login", json={
            "email": "user_a@test.com",
            "password": "WrongPasswordXXX!"
        })
        assert response.status_code == 401
        detail = response.json().get("detail", "")
        # Message générique — pas "mot de passe incorrect"
        # car ça confirme que l'email existe (user enumeration)
        assert "password" not in detail.lower() or "invalide" in detail.lower()

    async def test_login_nonexistent_email_returns_401(self, client):
        """Email inexistant → 401, MÊME message qu'un mauvais password."""
        response = await client.post("/api/v1/login", json={
            "email": "doesnotexist@example.com",
            "password": "AnyPassword123!"
        })
        assert response.status_code == 401

    async def test_login_wrong_vs_nonexistent_same_status(self, client, user_a):
        """
        SÉCURITÉ : User enumeration impossible.
        Wrong password et email inexistant doivent retourner le même code ET
        idéalement le même message (pour éviter de confirmer l'existence d'un email).
        """
        wrong_pass_resp = await client.post("/api/v1/login", json={
            "email": "user_a@test.com",
            "password": "WrongPass!"
        })
        no_user_resp = await client.post("/api/v1/login", json={
            "email": "nonexistent@example.com",
            "password": "WrongPass!"
        })
        assert wrong_pass_resp.status_code == no_user_resp.status_code == 401
        # Idéalement, même message :
        assert wrong_pass_resp.json().get("detail") == no_user_resp.json().get("detail")


class TestJWTValidation:

    async def test_no_token_returns_401(self, client):
        """Endpoint protégé sans token → 401."""
        response = await client.get("/api/v1/catalogue")
        assert response.status_code == 401

    async def test_malformed_token_returns_401(self, client, malformed_token):
        """Token malformé (pas un JWT) → 401."""
        response = await client.get(
            "/api/v1/catalogue",
            headers={"Authorization": f"Bearer {malformed_token}"}
        )
        assert response.status_code == 401

    async def test_expired_token_returns_401(self, client, expired_token):
        """Token expiré → 401 (pas 500 — vérifier que exp est bien vérifié)."""
        response = await client.get(
            "/api/v1/catalogue",
            headers={"Authorization": f"Bearer {expired_token}"}
        )
        assert response.status_code == 401

    async def test_wrong_secret_returns_401(self, client, token_wrong_secret):
        """Token signé avec le mauvais secret → 401."""
        response = await client.get(
            "/api/v1/catalogue",
            headers={"Authorization": f"Bearer {token_wrong_secret}"}
        )
        assert response.status_code == 401

    async def test_alg_none_attack_rejected(self, client, user_a):
        """
        SÉCURITÉ CRITIQUE : L'algorithme 'none' doit être rejeté.
        Un attaquant peut créer un token non signé avec alg: none
        si le backend ne vérifie pas l'algorithme.
        """
        import base64, json
        # Construire manuellement un JWT avec alg: none
        header = base64.urlsafe_b64encode(
            json.dumps({"alg": "none", "typ": "JWT"}).encode()
        ).rstrip(b"=").decode()
        payload = base64.urlsafe_b64encode(
            json.dumps({"sub": str(user_a["id"]), "exp": 9999999999}).encode()
        ).rstrip(b"=").decode()
        none_token = f"{header}.{payload}."  # Signature vide

        response = await client.get(
            "/api/v1/catalogue",
            headers={"Authorization": f"Bearer {none_token}"}
        )
        assert response.status_code == 401, (
            "CRITIQUE : l'algorithme 'none' est accepté ! "
            "Tout utilisateur peut forger un token valide."
        )
```

---

## T6 — TESTS ISOLATION MULTI-TENANT P0

```python
# ─── tests/test_isolation.py ─────────────────────────────────────────────────
# FICHIER COMPLET
# Ces tests sont les plus critiques de toute la suite.
# Un FAIL ici = faille de sécurité en production.

import pytest
pytestmark = pytest.mark.asyncio

class TestIDOR:
    """
    IDOR = Insecure Direct Object Reference.
    L'utilisateur A ne doit avoir AUCUN accès aux données de B.
    """

    async def test_cannot_read_other_user_products(
        self, auth_client_a, product_b
    ):
        """
        A ne peut pas voir les produits de B via le catalogue.
        (Le catalogue de A doit être vide si A n'a aucun produit.)
        """
        response = await auth_client_a.get("/api/v1/catalogue")
        assert response.status_code == 200
        products = response.json()
        # product_b appartient à B → ne doit PAS apparaître dans le catalogue de A
        product_ids = [p["id"] for p in (products if isinstance(products, list)
                       else products.get("items", products.get("data", [])))]
        assert product_b["id"] not in product_ids, (
            f"IDOR DÉTECTÉ : le produit {product_b['id']} de l'utilisateur B "
            f"est visible dans le catalogue de l'utilisateur A !"
        )

    async def test_cannot_delete_other_user_product(
        self, auth_client_a, product_b
    ):
        """A ne peut pas supprimer un produit de B → 403 ou 404."""
        response = await auth_client_a.delete(
            f"/api/v1/catalogue/{product_b['id']}"
        )
        assert response.status_code in [403, 404], (
            f"IDOR CRITIQUE : user A a pu supprimer le produit {product_b['id']} "
            f"de user B (status: {response.status_code}) !"
        )

    async def test_cannot_read_other_user_job(
        self, auth_client_a, job_b
    ):
        """A ne peut pas lire le job de B → 403 ou 404."""
        response = await auth_client_a.get(f"/api/v1/jobs/{job_b['id']}")
        assert response.status_code in [403, 404], (
            f"IDOR CRITIQUE : user A peut voir le job {job_b['id']} de user B !"
        )

    async def test_cannot_modify_other_user_product(
        self, auth_client_a, product_b
    ):
        """A ne peut pas modifier un produit de B → 403 ou 404."""
        response = await auth_client_a.patch(
            f"/api/v1/catalogue/{product_b['id']}",
            json={"designation_fr": "Modifié par A — attaque"}
        )
        assert response.status_code in [403, 404]

    async def test_export_contains_only_own_data(
        self, auth_client_a, product_a, product_b
    ):
        """L'export de A ne contient que les données de A."""
        response = await auth_client_a.get("/api/v1/export")
        if response.status_code == 200:
            data = response.json()
            all_ids = [p.get("id") for p in data.get("products", [])]
            assert product_b["id"] not in all_ids, (
                "IDOR dans l'export : les données de B sont dans l'export de A !"
            )


class TestQueryIsolation:
    """Vérifie que les requêtes SQL filtrent bien sur user_id."""

    async def test_search_filters_by_user(
        self, auth_client_a, product_a, product_b
    ):
        """La recherche retourne uniquement les produits de l'utilisateur authentifié."""
        response = await auth_client_a.get(
            "/api/v1/catalogue",
            params={"search": ""}  # Recherche vide → tout le catalogue
        )
        assert response.status_code == 200
        products = response.json()
        items = products if isinstance(products, list) else products.get("items", [])
        # Seul product_a doit apparaître
        product_ids = [p["id"] for p in items]
        assert product_a["id"] in product_ids
        assert product_b["id"] not in product_ids
```

---

## T7 — TESTS UPLOAD & VALIDATION P0

```python
# ─── tests/test_upload.py ────────────────────────────────────────────────────
import pytest
import io
pytestmark = pytest.mark.asyncio

class TestUploadValidation:

    async def test_upload_valid_pdf_returns_202(
        self, auth_client_a, valid_pdf, mock_gemini, mock_storage
    ):
        """Upload d'un PDF valide → 202 Accepted (traitement asynchrone)."""
        response = await auth_client_a.post(
            "/api/v1/process",
            files={"file": ("facture.pdf", io.BytesIO(valid_pdf), "application/pdf")}
        )
        assert response.status_code in [200, 201, 202]
        data = response.json()
        assert "job_id" in data or "id" in data  # Un ID de job est retourné

    async def test_upload_too_large_returns_413(
        self, auth_client_a, large_file
    ):
        """Fichier dépassant la limite → 413 Request Entity Too Large."""
        response = await auth_client_a.post(
            "/api/v1/process",
            files={"file": ("huge.pdf", io.BytesIO(large_file), "application/pdf")}
        )
        assert response.status_code == 413, (
            f"Expected 413, got {response.status_code}. "
            "La limite d'upload n'est pas appliquée !"
        )

    async def test_upload_wrong_mime_type_returns_415(self, auth_client_a):
        """Type MIME non autorisé → 415 Unsupported Media Type."""
        response = await auth_client_a.post(
            "/api/v1/process",
            files={"file": ("virus.exe", b"MZ\x90\x00", "application/octet-stream")}
        )
        assert response.status_code in [415, 422], (
            f"Fichier exécutable accepté ! (status: {response.status_code})"
        )

    async def test_upload_empty_file_returns_422(self, auth_client_a):
        """Fichier vide → 422 Unprocessable Entity."""
        response = await auth_client_a.post(
            "/api/v1/process",
            files={"file": ("empty.pdf", b"", "application/pdf")}
        )
        assert response.status_code == 422

    async def test_upload_path_traversal_filename_sanitized(
        self, auth_client_a, valid_pdf, mock_gemini, mock_storage, path_traversal_filename
    ):
        """
        Nom de fichier avec path traversal → le nom est sanitisé.
        '../../../../etc/passwd.pdf' doit devenir 'passwd.pdf' ou être rejeté.
        """
        response = await auth_client_a.post(
            "/api/v1/process",
            files={"file": (path_traversal_filename, io.BytesIO(valid_pdf), "application/pdf")}
        )
        # Soit accepté avec un nom sanitisé, soit rejeté
        if response.status_code in [200, 201, 202]:
            # Vérifier que le nom stocké ne contient pas de ..
            job_id = response.json().get("job_id") or response.json().get("id")
            if job_id:
                job_resp = await auth_client_a.get(f"/api/v1/jobs/{job_id}")
                if job_resp.status_code == 200:
                    filename = job_resp.json().get("filename", "")
                    assert ".." not in filename, (
                        f"Path traversal dans le filename stocké : '{filename}'"
                    )

    async def test_upload_requires_auth(self, client, valid_pdf):
        """Upload sans authentification → 401."""
        import io
        response = await client.post(
            "/api/v1/process",
            files={"file": ("test.pdf", io.BytesIO(valid_pdf), "application/pdf")}
        )
        assert response.status_code == 401


class TestBatchSave:

    async def test_batch_save_products(self, auth_client_a, mock_gemini):
        """Sauvegarde en batch de produits valides."""
        products = [
            {"designation_fr": f"Produit {i}", "famille": "Test",
             "fournisseur": "Test", "prix_ht": float(i * 10), "quantite": i}
            for i in range(1, 6)
        ]
        response = await auth_client_a.post(
            "/api/v1/catalogue/batch",
            json={"products": products}
        )
        assert response.status_code in [200, 201]

    async def test_batch_save_dos_protection(self, auth_client_a):
        """Batch avec trop de produits → 422 ou 413 (protection DoS)."""
        # 10 000 produits d'un coup → le backend doit refuser
        products = [
            {"designation_fr": f"P{i}", "famille": "T", "fournisseur": "T",
             "prix_ht": 1.0, "quantite": 1}
            for i in range(10_000)
        ]
        response = await auth_client_a.post(
            "/api/v1/catalogue/batch",
            json={"products": products}
        )
        assert response.status_code in [413, 422], (
            f"Batch de 10 000 produits accepté sans limite ! (status: {response.status_code})"
        )
```

---

## T8 — TESTS FRONTEND VITEST P0

```javascript
// ─── src/__tests__/useStore.test.js ──────────────────────────────────────────
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useStore } from '../store/useStore'

// Reset du store entre chaque test
beforeEach(() => {
  useStore.getState().reset?.()
  // Si pas de reset : utiliser setState directement
  // useStore.setState(useStore.getInitialState())
})

describe('useStore — extractedProducts', () => {
  it('démarre avec un tableau vide', () => {
    const { result } = renderHook(() => useStore())
    expect(result.current.extractedProducts).toEqual([])
  })

  it('addProducts ajoute les produits au tableau', () => {
    const { result } = renderHook(() => useStore())
    const products = [
      { id: 1, designation_fr: 'Ciment 25kg' },
      { id: 2, designation_fr: 'Sable fin' },
    ]
    act(() => { result.current.addProducts(products) })
    expect(result.current.extractedProducts).toHaveLength(2)
    expect(result.current.extractedProducts[0].designation_fr).toBe('Ciment 25kg')
  })

  it('clearProducts vide le tableau', () => {
    const { result } = renderHook(() => useStore())
    act(() => { result.current.addProducts([{ id: 1, designation_fr: 'X' }]) })
    act(() => { result.current.clearProducts() })
    expect(result.current.extractedProducts).toEqual([])
  })
})

describe('useStore — queue', () => {
  it('addToQueue génère des IDs uniques', () => {
    const { result } = renderHook(() => useStore())
    act(() => {
      result.current.addToQueue(new File(['a'], 'a.pdf', { type: 'application/pdf' }))
      result.current.addToQueue(new File(['b'], 'b.pdf', { type: 'application/pdf' }))
      result.current.addToQueue(new File(['c'], 'c.pdf', { type: 'application/pdf' }))
    })
    const ids = result.current.queue.map(item => item.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(3)
  })

  it('updateQueueItemStatus met à jour le bon item', () => {
    const { result } = renderHook(() => useStore())
    let itemId
    act(() => {
      result.current.addToQueue(new File(['x'], 'x.pdf'))
      itemId = result.current.queue[0].id
    })
    act(() => { result.current.updateQueueItemStatus(itemId, 'processing') })
    const item = result.current.queue.find(i => i.id === itemId)
    expect(item?.status).toBe('processing')
  })

  it('addToQueue avec statut initial "pending"', () => {
    const { result } = renderHook(() => useStore())
    act(() => {
      result.current.addToQueue(new File(['x'], 'test.pdf'))
    })
    expect(result.current.queue[0].status).toBe('pending')
  })
})

// ─── src/__tests__/devis-calculations.test.js ────────────────────────────────
import { describe, it, expect } from 'vitest'
// Importer la fonction de calcul depuis DevisPage ou un utilitaire
// Si les calculs sont inline dans DevisPage → les extraire dans utils/devisCalculations.js
import { calculateDevisTotals } from '../utils/devisCalculations'

describe('Calculs devis — précision', () => {
  it('calcul simple sans remise', () => {
    const items = [{ qty: 2, prix_unit: 50 }, { qty: 1, prix_unit: 30 }]
    const result = calculateDevisTotals(items, { tvaRate: 20, remise: 0 })
    expect(result.totalHT).toBeCloseTo(130, 2)
    expect(result.tva).toBeCloseTo(26, 2)
    expect(result.ttc).toBeCloseTo(156, 2)
  })

  it('calcul avec remise en pourcentage', () => {
    const items = [
      { qty: 1, prix_unit: 100 },
      { qty: 1, prix_unit: 250 },
      { qty: 1, prix_unit: 75 },
    ]
    const result = calculateDevisTotals(items, { tvaRate: 20, remise: 10 })
    expect(result.totalHT).toBeCloseTo(425, 2)      // 100+250+75
    expect(result.remiseAmount).toBeCloseTo(42.5, 2) // 425 * 10%
    expect(result.netHT).toBeCloseTo(382.5, 2)       // 425 - 42.5
    expect(result.tva).toBeCloseTo(76.5, 2)          // 382.5 * 20%
    expect(result.ttc).toBeCloseTo(459, 2)            // 382.5 + 76.5
  })

  it('pas d\'erreur d\'arrondi float sur 0.1 + 0.2', () => {
    // Le classique piège JS : 0.1 + 0.2 = 0.30000000000000004
    const items = [{ qty: 1, prix_unit: 0.1 }, { qty: 1, prix_unit: 0.2 }]
    const result = calculateDevisTotals(items, { tvaRate: 20, remise: 0 })
    // Doit être 0.30, pas 0.30000000000000004
    expect(result.totalHT).toBeCloseTo(0.3, 10)
  })

  it('quantité décimale (1.5 jours de main d\'oeuvre)', () => {
    const items = [{ qty: 1.5, prix_unit: 200 }]
    const result = calculateDevisTotals(items, { tvaRate: 20, remise: 0 })
    expect(result.totalHT).toBeCloseTo(300, 2)
    expect(result.ttc).toBeCloseTo(360, 2)
  })

  it('prix nul ou zéro ne provoque pas d\'erreur', () => {
    const items = [{ qty: 1, prix_unit: 0 }, { qty: 0, prix_unit: 100 }]
    expect(() => calculateDevisTotals(items, { tvaRate: 20, remise: 0 }))
      .not.toThrow()
  })

  it('tableau vide retourne des zéros', () => {
    const result = calculateDevisTotals([], { tvaRate: 20, remise: 0 })
    expect(result.totalHT).toBe(0)
    expect(result.ttc).toBe(0)
  })
})
```

---

## T9 — TESTS E2E PLAYWRIGHT P1

```javascript
// ─── e2e/auth.spec.js ────────────────────────────────────────────────────────
import { test, expect } from '@playwright/test'

test.describe('Authentification', () => {

  test('Inscription → Login → Accès app', async ({ page }) => {
    const email = `e2e_${Date.now()}@test.com`
    const password = 'SecureE2EPass123!'

    // 1. Inscription
    await page.goto('/register')
    await page.fill('input[type="email"]', email)
    await page.fill('input[type="password"]', password)
    await page.click('button[type="submit"]')

    // Attend la navigation (login ou scan selon le flow)
    await page.waitForURL(/\/(scan|login)/, { timeout: 10_000 })

    // 2. Si redirigé vers login
    if (page.url().includes('/login')) {
      await page.fill('input[type="email"]', email)
      await page.fill('input[type="password"]', password)
      await page.click('button[type="submit"]')
      await page.waitForURL('/scan', { timeout: 10_000 })
    }

    // 3. App accessible
    await expect(page).toHaveURL('/scan')
    await expect(page.locator('h1, [data-testid="page-title"]').first()).toBeVisible()
  })

  test('Page protégée sans auth → redirect /login', async ({ page }) => {
    // Supprimer tout token/cookie existant
    await page.context().clearCookies()
    await page.goto('/catalogue')
    await expect(page).toHaveURL(/\/login/, { timeout: 5_000 })
  })

  test('Login avec mauvais password → message d\'erreur visible', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', 'test@test.com')
    await page.fill('input[type="password"]', 'WrongPassword!')
    await page.click('button[type="submit"]')
    // Message d'erreur visible (pas une redirection)
    await expect(page.locator('[role="alert"], .error, [data-testid="error-message"]'))
      .toBeVisible({ timeout: 5_000 })
    // Toujours sur /login
    await expect(page).toHaveURL('/login')
  })
})

// ─── e2e/catalogue.spec.js ───────────────────────────────────────────────────
test.describe('Catalogue', () => {

  test.beforeEach(async ({ page }) => {
    // Se connecter avant chaque test catalogue
    await page.goto('/login')
    await page.fill('input[type="email"]', process.env.E2E_USER_EMAIL!)
    await page.fill('input[type="password"]', process.env.E2E_USER_PASSWORD!)
    await page.click('button[type="submit"]')
    await page.waitForURL('/scan')
  })

  test('Catalogue vide affiche empty state avec CTA', async ({ page }) => {
    await page.goto('/catalogue')
    // Empty state visible
    const emptyState = page.locator('[data-testid="empty-state"], .empty-state')
    await expect(emptyState).toBeVisible()
    // CTA "Scanner une facture"
    const cta = page.locator('button:has-text("Scanner"), a:has-text("Scanner")')
    await expect(cta).toBeVisible()
  })

  test('Mobile : pas de scroll horizontal sur le catalogue', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/catalogue')
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2) // 2px tolérance
  })

  test('Filtres : recherche filtre les résultats', async ({ page }) => {
    await page.goto('/catalogue')
    const searchInput = page.locator('input[placeholder*="Recherch"], [data-testid="search-input"]')
    if (await searchInput.isVisible()) {
      await searchInput.fill('inexistant_xyz_12345')
      await page.waitForTimeout(400) // Debounce
      // 0 résultats ou message "aucun résultat"
      const noResult = page.locator('[data-testid="no-results"], :text("aucun résultat")')
      const items = page.locator('[data-testid="product-item"], .product-card')
      const count = await items.count()
      const hasNoResultMessage = await noResult.isVisible()
      expect(count === 0 || hasNoResultMessage).toBe(true)
    }
  })
})

// ─── e2e/accessibility.spec.js ───────────────────────────────────────────────
import AxeBuilder from '@axe-core/playwright'

test.describe('Accessibilité WCAG 2.1 AA', () => {

  const pages_to_test = ['/', '/login', '/register', '/catalogue']

  for (const path of pages_to_test) {
    test(`Page ${path} — zéro violation critique`, async ({ page }) => {
      await page.goto(path)
      await page.waitForLoadState('networkidle')

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze()

      const criticalViolations = results.violations.filter(v =>
        ['critical', 'serious'].includes(v.impact)
      )

      if (criticalViolations.length > 0) {
        const messages = criticalViolations.map(v =>
          `[${v.impact}] ${v.id}: ${v.description}\n  ${v.nodes[0]?.html}`
        ).join('\n\n')
        throw new Error(`Violations WCAG sur ${path}:\n${messages}`)
      }
    })
  }
})
```

---

## T10 — CONFIGURATION DES TESTS

### Backend — pytest.ini complet

```ini
# pytest.ini ou pyproject.toml [tool.pytest.ini_options]

[pytest]
testpaths = tests
asyncio_mode = auto
python_files = test_*.py
python_classes = Test*
python_functions = test_*

# Fail si la couverture descend sous 75%
addopts =
  -v
  --tb=short
  --cov=.
  --cov-omit=tests/*,migrations/*,venv/*,.venv/*
  --cov-report=term-missing
  --cov-report=html:coverage_html
  --cov-fail-under=75
  -p no:warnings

# Variables d'env pour les tests (DB de test séparée)
env =
  ENVIRONMENT=test
  DATABASE_URL=postgresql://testuser:testpass@localhost:5432/docling_test
  JWT_SECRET=test-secret-key-min-32-chars-for-testing
  GEMINI_API_KEY=test-fake-key-not-real
```

### Frontend — vitest.config.js complet

```javascript
// docling-pwa/vitest.config.js — FICHIER COMPLET
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  test: {
    // Environnement DOM (pour React)
    environment: 'jsdom',

    // Setup global (jest-dom matchers)
    setupFiles: ['./src/__tests__/setup.js'],

    // Couverture
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/**',
        'dist/**',
        'src/__tests__/**',
        '**/*.test.{js,jsx}',
        '**/*.spec.{js,jsx}',
        'src/main.jsx',     // Point d'entrée
        'vite.config.js',
        'vitest.config.js',
      ],
      thresholds: {
        statements: 70,
        branches: 65,
        functions: 70,
        lines: 70,
      },
    },

    // Timeout par test (éviter les tests qui bloquent)
    testTimeout: 10_000,
    hookTimeout: 10_000,

    // Reporter
    reporter: ['verbose', 'html'],

    // Globals (pas besoin d'importer describe/it/expect)
    globals: true,
  },
})
```

### Setup Vitest — src/__tests__/setup.js

```javascript
// src/__tests__/setup.js
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeAll, vi } from 'vitest'

// Cleanup après chaque test
afterEach(() => {
  cleanup()
})

// Mock localStorage
const localStorageMock = (() => {
  let store = {}
  return {
    getItem: (key) => store[key] ?? null,
    setItem: (key, value) => { store[key] = String(value) },
    removeItem: (key) => { delete store[key] },
    clear: () => { store = {} },
    get length() { return Object.keys(store).length },
    key: (index) => Object.keys(store)[index] ?? null,
  }
})()
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Mock IntersectionObserver (utilisé par les composants de virtualisation)
beforeAll(() => {
  global.IntersectionObserver = class IntersectionObserver {
    constructor(callback) { this.callback = callback }
    observe() { return null }
    unobserve() { return null }
    disconnect() { return null }
  }

  // Mock ResizeObserver
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  // Mock matchMedia (Tailwind responsive hooks)
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
})
```

---

## T11 — CI/CD — PIPELINE TESTS COMPLET

```yaml
# .github/workflows/ci.yml — FICHIER COMPLET RECOMMANDÉ

name: CI — Tests & Quality

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true  # Annule les runs précédents sur la même branche

jobs:

  # ─── BACKEND ─────────────────────────────────────────────────────────────
  backend-tests:
    name: Backend (pytest + coverage)
    runs-on: ubuntu-latest
    timeout-minutes: 15

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: testuser
          POSTGRES_PASSWORD: testpass
          POSTGRES_DB: docling_test
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    env:
      ENVIRONMENT: test
      TEST_DATABASE_URL: postgresql://testuser:testpass@localhost:5432/docling_test
      JWT_SECRET: test-jwt-secret-32-chars-minimum-required
      GEMINI_API_KEY: test-fake-key-for-ci

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          cache: 'pip'

      - name: Install dependencies
        run: pip install -r requirements.txt -r requirements-dev.txt

      - name: Apply migrations on test DB
        run: alembic upgrade head
        env:
          DATABASE_URL: postgresql://testuser:testpass@localhost:5432/docling_test

      - name: Lint (ruff)
        run: ruff check . --output-format=github

      - name: Security scan (pip-audit)
        run: pip-audit --progress-spinner off

      - name: Run tests with coverage
        run: |
          pytest tests/ \
            --cov=. \
            --cov-omit="tests/*,migrations/*" \
            --cov-report=xml \
            --cov-fail-under=75 \
            -v \
            --tb=short \
            2>&1 | tee test_output.txt
          echo "Exit code: $?"

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4
        with:
          file: ./coverage.xml
          fail_ci_if_error: false

      - name: Archive test results
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: test-output-backend
          path: test_output.txt

  # ─── FRONTEND ────────────────────────────────────────────────────────────
  frontend-tests:
    name: Frontend (Vitest + ESLint + Build)
    runs-on: ubuntu-latest
    timeout-minutes: 10

    defaults:
      run:
        working-directory: docling-pwa

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: docling-pwa/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: ESLint
        run: npm run lint

      - name: Run unit tests with coverage
        run: npx vitest run --coverage

      - name: Build (vérifier qu'il n'y a pas d'erreur de build)
        run: npm run build

      - name: Check bundle size
        run: |
          # Vérifier que le bundle principal ne dépasse pas 600KB non gzip
          MAX_SIZE=614400  # 600 KB
          for f in dist/assets/*.js; do
            size=$(wc -c < "$f")
            name=$(basename "$f")
            echo "${size} bytes : ${name}"
            if [ "$size" -gt "$MAX_SIZE" ] && [[ "$name" != *"vendor"* ]]; then
              echo "⚠️ WARNING: ${name} dépasse 600KB (${size} bytes)"
            fi
          done

      - name: npm audit (sécurité)
        run: npm audit --audit-level=high
        continue-on-error: true  # Ne bloque pas mais log les CVE

  # ─── E2E (sur merge main uniquement) ─────────────────────────────────────
  e2e:
    name: E2E Playwright
    runs-on: ubuntu-latest
    timeout-minutes: 30
    if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/develop'
    needs: [backend-tests, frontend-tests]

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: e2euser
          POSTGRES_PASSWORD: e2epass
          POSTGRES_DB: docling_e2e
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: docling-pwa/package-lock.json

      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          cache: 'pip'

      - name: Install backend
        run: pip install -r requirements.txt

      - name: Install frontend
        run: cd docling-pwa && npm ci

      - name: Install Playwright browsers
        run: cd docling-pwa && npx playwright install --with-deps chromium

      - name: Apply migrations
        run: alembic upgrade head
        env:
          DATABASE_URL: postgresql://e2euser:e2epass@localhost:5432/docling_e2e

      - name: Start backend
        run: uvicorn api:app --port 8000 &
        env:
          DATABASE_URL: postgresql://e2euser:e2epass@localhost:5432/docling_e2e
          JWT_SECRET: e2e-secret-key-min-32-chars-testing

      - name: Build & Start frontend
        run: cd docling-pwa && npm run build && npm run preview -- --port 5173 &
        env:
          VITE_API_URL: http://localhost:8000

      - name: Wait for services
        run: |
          npx wait-on http://localhost:8000/health --timeout 30000
          npx wait-on http://localhost:5173 --timeout 30000

      - name: Run Playwright E2E
        run: cd docling-pwa && npx playwright test
        env:
          E2E_USER_EMAIL: ${{ secrets.E2E_USER_EMAIL }}
          E2E_USER_PASSWORD: ${{ secrets.E2E_USER_PASSWORD }}

      - name: Upload Playwright report
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: docling-pwa/playwright-report/
```

---

## SCORECARD TESTS

| Domaine | Score /100 | Couverture actuelle | Couverture objectif | Tests P0 manquants | Tests P1 manquants |
|---------|-----------|--------------------|--------------------|-------------------|--------------------|
| Auth backend (login, register, JWT) | /100 | N% | 90% | N | N |
| Isolation multi-tenant (IDOR) | /100 | N% | 100% | N | N |
| Upload validation | /100 | N% | 85% | N | N |
| Endpoints API CRUD | /100 | N% | 80% | N | N |
| Store Zustand | /100 | N% | 85% | N | N |
| Calculs devis | /100 | N% | 95% | N | N |
| E2E flows critiques | /100 | — | — | N | N |
| Config tests (fixtures, CI) | /100 | — | — | — | — |
| **GLOBAL** | **/100** | **N%** | **75%** | **N TOTAL** | **N TOTAL** |

---

## ✅ GATE T — TESTS

```bash
echo "=== GATE TESTS ==="

# 1. Tests backend — 0 fail
echo "--- Backend ---"
pytest tests/ -v --tb=short 2>&1 | tee /tmp/pytest_gate.txt
fail_count=$(grep -c "^FAILED" /tmp/pytest_gate.txt || echo 0)
echo "Tests FAILED : $fail_count"
[ "$fail_count" -eq 0 ] && echo "✅ Backend tests OK" || echo "❌ Backend tests FAIL"

# 2. Couverture backend >= 75%
pytest tests/ --cov=. --cov-fail-under=75 --cov-omit="tests/*,migrations/*" -q 2>&1 | \
  grep -E "FAIL|Required|percent"

# 3. Tests frontend — 0 fail
echo "--- Frontend ---"
cd docling-pwa
npx vitest run 2>&1 | tee /tmp/vitest_gate.txt
vtest_fail=$(grep -c "^FAIL\b" /tmp/vitest_gate.txt || echo 0)
echo "Vitest FAILED : $vtest_fail"
[ "$vtest_fail" -eq 0 ] && echo "✅ Frontend tests OK" || echo "❌ Frontend tests FAIL"

# 4. Test d'isolation multi-tenant présent
cd ..
isolation_tests=$(grep -l "test_user_cannot_access_other\|IDOR\|test.*isolation" \
  tests/ -r 2>/dev/null | wc -l)
echo "Fichiers de test isolation : $isolation_tests"
[ "$isolation_tests" -gt 0 ] && echo "✅ Tests IDOR présents" || echo "❌ Tests IDOR ABSENTS — P0 BLOCKER"

# 5. Test alg:none présent
alg_none_test=$(grep -r "alg.*none\|none.*alg\|alg_none" tests/ 2>/dev/null | wc -l)
[ "$alg_none_test" -gt 0 ] && echo "✅ Test alg:none présent" || echo "⚠️ Test alg:none absent — P1"

# 6. Fixtures conftest.py complet
conftest_size=$(wc -l < tests/conftest.py 2>/dev/null || echo 0)
echo "conftest.py : $conftest_size lignes"
[ "$conftest_size" -gt 50 ] && echo "✅ conftest.py substantiel" || echo "⚠️ conftest.py minimal"

echo ""
echo "=== RÉSUMÉ ==="
echo "PASS si :"
echo "  ✓ pytest : 0 fail"
echo "  ✓ couverture >= 75%"
echo "  ✓ vitest : 0 fail"
echo "  ✓ tests IDOR présents"

# STATUS FINAL
if [ "$fail_count" -eq 0 ] && [ "$vtest_fail" -eq 0 ] && [ "$isolation_tests" -gt 0 ]; then
  echo ""
  echo "STATUS : ✅ PASS"
else
  echo ""
  echo "STATUS : ❌ FAIL"
fi
```