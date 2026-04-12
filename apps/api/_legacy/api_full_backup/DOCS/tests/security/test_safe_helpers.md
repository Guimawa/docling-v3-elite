# test_safe_helpers.py — Ce qu'on vérifie

**Fichier :** `tests/security/test_safe_helpers.py`
**Catégorie :** security
**Ce qu'on teste :** Les fonctions utilitaires internes de la base de données (`_safe_float` et `_escape_like`) ainsi que l'isolation entre utilisateurs pour les jobs de traitement de factures.

---

## Le code

```python
"""
Tests de sécurité — _safe_float, _escape_like, isolation utilisateur.
"""

import uuid

import pytest

from core.db_manager import _escape_like, _safe_float


# ─── TestSafeFloat ───────────────────────────────────────────────────────────
class TestSafeFloat:
    """10 cas : None, N/A, "", 12,50, €45, integer, negative, default."""

    def test_none_returns_default(self):
        assert _safe_float(None) == 0.0
        assert _safe_float(None, default=99.5) == 99.5

    def test_na_string_returns_default(self):
        assert _safe_float("N/A") == 0.0
        assert _safe_float("n/a") == 0.0

    def test_empty_string_returns_default(self):
        assert _safe_float("") == 0.0

    def test_comma_decimal_returns_default(self):
        """12,50 (virgule) ou double point → invalide pour float() → default."""
        # "12,50" peut être parsé en locale FR → tester aussi une chaîne invalide
        assert _safe_float("12.50.50") == 0.0  # double point invalide

    def test_currency_prefix_returns_default(self):
        """Chaîne avec préfixe non numérique (ex: €45) → default."""
        assert _safe_float("prix45") == 0.0

    def test_valid_float(self):
        assert _safe_float(12.5) == 12.5
        assert _safe_float("12.5") == 12.5

    def test_integer(self):
        assert _safe_float(42) == 42.0
        assert _safe_float("100") == 100.0

    def test_negative(self):
        assert _safe_float(-3.14) == -3.14
        assert _safe_float("-10") == -10.0

    def test_custom_default(self):
        assert _safe_float("invalid", default=7.0) == 7.0
        assert _safe_float(None, default=-1.0) == -1.0

    def test_invalid_types_return_default(self):
        assert _safe_float({}) == 0.0
        assert _safe_float([]) == 0.0


# ─── TestEscapeIlike ─────────────────────────────────────────────────────────
class TestEscapeIlike:
    """4 cas : %, _, normal string, mixed."""

    def test_percent_escaped(self):
        assert _escape_like("50%") == "50\\%"
        assert _escape_like("%%") == "\\%\\%"

    def test_underscore_escaped(self):
        assert _escape_like("a_b") == "a\\_b"
        assert _escape_like("__") == "\\_\\_"

    def test_normal_string_unchanged(self):
        assert _escape_like("ciment") == "ciment"
        assert _escape_like("Produit 42") == "Produit 42"

    def test_mixed_special_chars(self):
        assert _escape_like("50%_off") == "50\\%\\_off"
        assert _escape_like("\\%\\_") == "\\\\\\%\\\\\\_"


# ─── test_user_isolation ──────────────────────────────────────────────────────
@pytest.mark.security
def test_user_isolation_job_invisible_to_other_user(
    ensure_server_running: str,
    unique_user: dict,
):
    """
    user1 crée un job (scan), user2 ne doit PAS le voir.
    Assertion critique : isolation multi-tenant sur jobs.
    """
    import httpx

    base_url = ensure_server_running

    # User 1 : inscription + login
    client1 = httpx.Client(base_url=base_url, timeout=30)
    reg1 = client1.post(
        "/api/v1/auth/register",
        data={"email": unique_user["email"], "password": unique_user["password"], "name": unique_user.get("name", "")},
    )
    assert reg1.status_code in (200, 409)
    login1 = client1.post(
        "/api/v1/auth/login",
        data={"email": unique_user["email"], "password": unique_user["password"]},
    )
    assert login1.status_code == 200
    token1 = login1.json().get("token")
    assert token1
    client1.headers["Authorization"] = f"Bearer {token1}"

    # User 2 : création d'un second utilisateur
    import random
    import secrets

    from faker import Faker

    fake = Faker("fr_FR")
    pwd2 = f"Test@{secrets.token_hex(8)}!{random.randint(100, 999)}"
    user2 = {
        "email": f"test_{uuid.uuid4().hex[:8]}@{fake.domain_name()}",
        "password": pwd2,
        "name": fake.first_name(),
    }
    client2 = httpx.Client(base_url=base_url, timeout=30)
    client2.post("/api/v1/auth/register", data={"email": user2["email"], "password": user2["password"], "name": user2.get("name", "")})
    login2 = client2.post("/api/v1/auth/login", data={"email": user2["email"], "password": user2["password"]})
    assert login2.status_code == 200
    token2 = login2.json().get("token")
    client2.headers["Authorization"] = f"Bearer {token2}"

    # User 1 : crée un job (upload minimal pour déclencher create_job)
    files = {"file": ("test.pdf", b"%PDF-1.4 minimal", "application/pdf")}
    resp1 = client1.post("/api/v1/invoices/process", files=files)
    assert resp1.status_code == 202
    job_id = resp1.json().get("job_id")
    assert job_id

    # User 2 : tente d'accéder au job de user1 → 404 (CRITIQUE)
    resp2 = client2.get(f"/api/v1/invoices/status/{job_id}")
    assert resp2.status_code == 404, "user2 ne doit PAS voir le job de user1"

    # User 1 : peut voir son propre job
    resp1_status = client1.get(f"/api/v1/invoices/status/{job_id}")
    assert resp1_status.status_code == 200

    client1.close()
    client2.close()
```

---

## Ce que ces tests vérifient — en clair

### Classe `TestSafeFloat` — la fonction `_safe_float`

`_safe_float` est une fonction utilitaire qui convertit n'importe quelle valeur en nombre décimal, ou retourne une valeur par défaut si la conversion est impossible. C'est essentiel car Gemini retourne des données textuelles extraites de factures, et les prix peuvent être formatés de toutes les manières imaginables.

C'est comme un caissier expérimenté qui sait lire les prix quelle que soit la façon dont ils sont écrits sur une étiquette, et qui dit "0 euro" s'il ne comprend pas plutôt que de planter.

- **`test_none_returns_default`** : `None` (pas de valeur) → retourne 0.0 ou la valeur par défaut fournie.
- **`test_na_string_returns_default`** : la chaîne `"N/A"` (fréquente dans les exports) → 0.0. Testé en majuscule et minuscule.
- **`test_empty_string_returns_default`** : chaîne vide `""` → 0.0.
- **`test_comma_decimal_returns_default`** : `"12.50.50"` (double point, invalide) → 0.0. Note : la virgule française (`"12,50"`) n'est pas testée directement.
- **`test_currency_prefix_returns_default`** : `"prix45"` (texte avant le chiffre) → 0.0.
- **`test_valid_float`** : `12.5` et `"12.5"` → `12.5`. Cas nominal.
- **`test_integer`** : `42` et `"100"` → convertis en float.
- **`test_negative`** : `-3.14` et `"-10"` → préservés avec leur signe négatif.
- **`test_custom_default`** : on peut passer `default=7.0` pour avoir une valeur de secours différente de 0.
- **`test_invalid_types_return_default`** : un dictionnaire `{}` ou une liste `[]` → 0.0 (pas d'exception).

### Classe `TestEscapeIlike` — la fonction `_escape_like`

`_escape_like` prépare une chaîne pour l'utiliser dans une requête SQL `ILIKE` (recherche insensible à la casse). Dans PostgreSQL, `%` et `_` ont une signification spéciale dans `ILIKE` : `%` signifie "n'importe quoi" et `_` signifie "un caractère quelconque". Si on ne les échappe pas, chercher "50%" retournerait n'importe quel produit commençant par "50".

C'est comme s'assurer qu'un caractère spécial dans une recherche est bien interprété comme un caractère littéral et non comme une commande.

- **`test_percent_escaped`** : `"50%"` → `"50\%"` (le % devient littéral).
- **`test_underscore_escaped`** : `"a_b"` → `"a\_b"` (le _ devient littéral).
- **`test_normal_string_unchanged`** : `"ciment"` reste `"ciment"`.
- **`test_mixed_special_chars`** : `"50%_off"` → `"50\%\_off"` (les deux caractères spéciaux sont échappés).

### `test_user_isolation_job_invisible_to_other_user`

Identique dans son principe au test du fichier `test_isolation.py` : deux utilisateurs distincts, l'un crée un job, l'autre ne peut pas y accéder. Voir la documentation de `test_isolation.md` pour l'explication détaillée.

---

## Pourquoi c'est important

**`_safe_float`** : sans cette protection, une valeur `None` ou `"N/A"` retournée par Gemini dans un champ prix ferait lever une exception Python et planterait le pipeline d'extraction. Pire, une valeur mal parsée pourrait corrompre silencieusement les prix en base (ex: `"12,50"` interprété comme `12.0` par troncature).

**`_escape_like`** : sans l'échappement des caractères SQL spéciaux dans les recherches, chercher un produit contenant `%` (ex: "Remise 10%") retournerait tous les produits au lieu du bon. Plus grave, dans certains moteurs, un `%` non échappé peut provoquer des comportements inattendus ou des performances catastrophiques (requêtes très lentes).

---

## Peut-on améliorer ces tests ?

**Cas non couverts pour `_safe_float` :**
- La notation française avec virgule : `"12,50"` — est-ce que la fonction la gère ou retourne 0.0 ? Ce cas est typique des factures françaises et mérite un test explicite.
- Les très grands nombres (overflow) : `_safe_float("9999999999999.99")`.
- Les chaînes avec espaces : `" 12.5 "` (espaces avant/après) — est-ce converti ou rejeté ?
- La notation scientifique : `"1.5e3"` (1500.0) — acceptée ou non ?

**Cas non couverts pour `_escape_like` :**
- La chaîne vide `""` — retourne-t-elle `""` ?
- Les caractères Unicode (accents, caractères espagnols) — ne sont pas des caractères SQL spéciaux, mais méritent confirmation.
- La barre oblique inverse `\` seule (sans rien après) — est-ce géré ?

**Duplication :**
- `test_user_isolation_job_invisible_to_other_user` apparaît à l'identique dans `test_isolation.py`. Ces deux tests devraient être fusionnés ou l'un supprimé pour éviter la maintenance double.

**Organisation du fichier :**
- Ce fichier mélange des tests unitaires purs (`TestSafeFloat`, `TestEscapeIlike`) avec un test d'intégration complet (`test_user_isolation`). Ce serait plus propre de séparer les tests unitaires de fonctions dans un dossier `tests/unit/`.
