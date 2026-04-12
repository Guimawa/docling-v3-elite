# test_auth.py — Ce qu'on vérifie

**Fichier :** `tests/api/test_auth.py`
**Catégorie :** api
**Ce qu'on teste :** Le bon fonctionnement de l'inscription, de la connexion et de la protection des routes par token JWT.

---

## Le code

```python
"""
Tests API — authentification (Form data, pas JSON).
"""

import httpx


def test_register_success(ensure_server_running: str, unique_user: dict):
    client = httpx.Client(base_url=ensure_server_running, timeout=30)
    resp = client.post(
        "/api/v1/auth/register",
        data={
            "email": unique_user["email"],
            "password": unique_user["password"],
            "name": unique_user.get("name", ""),
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "token" in data
    assert "user_id" in data
    assert data["email"] == unique_user["email"]
    client.close()


def test_register_duplicate_email_409(ensure_server_running: str, unique_user: dict):
    client = httpx.Client(base_url=ensure_server_running, timeout=30)
    # Premier enregistrement
    client.post(
        "/api/v1/auth/register",
        data={
            "email": unique_user["email"],
            "password": unique_user["password"],
            "name": unique_user.get("name", ""),
        },
    )
    # Doublon
    resp = client.post(
        "/api/v1/auth/register",
        data={
            "email": unique_user["email"],
            "password": "OtherPass123!",
            "name": "Other",
        },
    )
    assert resp.status_code == 409
    detail = resp.json().get("detail", "").lower()
    assert "utilise" in detail or "deja" in detail or "already" in detail
    client.close()


def test_register_missing_fields_422(ensure_server_running: str):
    client = httpx.Client(base_url=ensure_server_running, timeout=30)
    resp = client.post("/api/v1/auth/register", data={})
    assert resp.status_code in (422, 400)
    client.close()


def test_login_success(authenticated_client):
    client, user = authenticated_client
    # Déjà authentifié, vérifier /me
    resp = client.get("/api/v1/auth/me")
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == user["email"]


def test_login_wrong_password_401(ensure_server_running: str, unique_user: dict):
    client = httpx.Client(base_url=ensure_server_running, timeout=30)
    client.post(
        "/api/v1/auth/register",
        data={
            "email": unique_user["email"],
            "password": unique_user["password"],
            "name": unique_user.get("name", ""),
        },
    )
    resp = client.post(
        "/api/v1/auth/login",
        data={
            "email": unique_user["email"],
            "password": "WrongPassword123!",
        },
    )
    assert resp.status_code == 401
    client.close()


def test_me_no_token_401(http_client: httpx.Client):
    resp = http_client.get("/api/v1/auth/me")
    assert resp.status_code == 401


def test_me_invalid_token_401(ensure_server_running: str):
    client = httpx.Client(
        base_url=ensure_server_running,
        timeout=30,
        headers={"Authorization": "Bearer invalid.token.here"},
    )
    resp = client.get("/api/v1/auth/me")
    assert resp.status_code == 401
    client.close()


def test_login_nonexistent_email_401(ensure_server_running: str):
    """Login avec email inexistant → 401 (même comportement qu'un mauvais password)."""
    client = httpx.Client(base_url=ensure_server_running, timeout=30)
    resp = client.post(
        "/api/v1/auth/login",
        data={
            "email": "doesnotexist@example.com",
            "password": "anypass123",
        },
    )
    assert resp.status_code == 401
    # Pas de leak d'info (user enumeration) : pas de "email inexistant" explicite
    client.close()
```

---

## Ce que ces tests vérifient — en clair

**`test_register_success`**
C'est comme tester qu'on peut bien créer un compte sur un site : on envoie un email et un mot de passe, et on vérifie qu'on reçoit en retour un token (la "clé d'accès") et l'identifiant de l'utilisateur créé.

**`test_register_duplicate_email_409`**
C'est comme essayer de s'inscrire deux fois avec le même email sur un forum : ça doit être refusé avec un message d'erreur clair (code 409 = "conflit"). Le test vérifie aussi que le message d'erreur mentionne bien que l'adresse est déjà utilisée.

**`test_register_missing_fields_422`**
C'est comme envoyer un formulaire vide : le serveur doit refuser avec une erreur de validation (422 ou 400) plutôt que de planter ou de créer un compte sans données.

**`test_login_success`**
Vérifie qu'un utilisateur déjà connecté (via le fixture `authenticated_client`) peut bien accéder à sa propre fiche `/auth/me` et que l'email retourné correspond bien au sien.

**`test_login_wrong_password_401`**
C'est comme taper le mauvais code PIN à une porte : la porte reste fermée (code 401 = "non autorisé"). Le test crée un compte, puis tente de se connecter avec un mauvais mot de passe.

**`test_me_no_token_401`**
C'est comme essayer d'entrer dans une zone réservée sans badge : sans token du tout, l'accès à `/auth/me` est refusé (401).

**`test_me_invalid_token_401`**
C'est comme essayer d'entrer avec un faux badge : un token JWT bricolé à la main ne doit pas fonctionner. Le serveur doit reconnaître la fraude et refuser (401).

**`test_login_nonexistent_email_401`**
C'est comme taper un numéro de chambre qui n'existe pas à l'hôtel : on reçoit la même réponse que si le mot de passe était faux. Ce comportement est volontaire : si le serveur répondait différemment pour un email inconnu, un attaquant pourrait en déduire quels emails sont enregistrés dans la base (technique appelée "user enumeration").

---

## Pourquoi c'est important

Sans ces tests, on pourrait introduire des régressions graves :
- Permettre à quelqu'un de créer deux comptes avec le même email (confusion de données).
- Accepter des formulaires vides et créer des comptes corrompus en base.
- Laisser des routes protégées accessibles sans token (fuite de données).
- Oublier de valider les tokens et accepter n'importe quelle chaîne comme "connecté".
- Fuiter l'information sur quels emails existent en base (aide les attaquants).

L'authentification est la porte d'entrée de toute l'application. Si elle est défaillante, tout le reste est compromis.

---

## Peut-on améliorer ces tests ?

**Cas non couverts :**
- La déconnexion (logout) : on ne vérifie pas que le cookie/token est bien invalidé après un logout.
- La validation du format d'email : que se passe-t-il avec `"pasun@email"` ou `"@."` ?
- La politique de mot de passe : un mot de passe `"a"` est-il accepté ou refusé ?
- Le renouvellement de token (refresh token) si cette fonctionnalité existe.
- Le comportement après de nombreuses tentatives de connexion échouées (rate limiting).

**Tests fragiles :**
- `test_register_duplicate_email_409` vérifie le message d'erreur en cherchant des mots-clés (`"utilise"`, `"deja"`, `"already"`). Si le message change légèrement, le test peut casser sans raison fonctionnelle.

**Manques évidents :**
- Pas de test de `logout` → on ne sait pas si la session est bien détruite côté serveur.
- Pas de test de changement de mot de passe.
- Pas de test de la longueur maximale des champs (que se passe-t-il avec un email de 10 000 caractères ?).
