# test_auth_bypass.py — Ce qu'on vérifie

**Fichier :** `tests/security/test_auth_bypass.py`
**Catégorie :** security
**Ce qu'on teste :** Que les tentatives de contournement de l'authentification JWT échouent : token expiré, token falsifié, et absence totale de token.

---

## Le code

```python
"""
Tests de sécurité — bypass auth, token expiré/modifié.
"""

import importlib
import os
import time

import pytest

pytestmark = [pytest.mark.security]


def test_expired_token_rejected(ensure_server_running: str):
    """Token expiré → 401 sur /auth/me."""
    import services.auth_service as auth_mod
    orig = os.environ.get("JWT_EXPIRY_HOURS")
    os.environ["JWT_EXPIRY_HOURS"] = "0"
    importlib.reload(auth_mod)
    token = auth_mod.create_token(user_id=1, email="test@test.com")
    time.sleep(0.1)
    if orig is not None:
        os.environ["JWT_EXPIRY_HOURS"] = orig
    else:
        os.environ.pop("JWT_EXPIRY_HOURS", None)
    importlib.reload(auth_mod)

    import httpx
    client = httpx.Client(base_url=ensure_server_running, timeout=10)
    resp = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 401
    client.close()


def test_tampered_token_rejected(ensure_server_running: str, unique_user: dict):
    """Token modifié → 401."""
    import httpx

    from services.auth_service import create_token

    token = create_token(user_id=1, email=unique_user["email"])
    parts = token.split(".")
    parts[1] = parts[1][::-1]
    tampered = ".".join(parts)

    client = httpx.Client(base_url=ensure_server_running, timeout=10)
    resp = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {tampered}"},
    )
    assert resp.status_code == 401
    client.close()


def test_no_token_401(ensure_server_running: str):
    """Sans header Authorization → 401."""
    import httpx
    client = httpx.Client(base_url=ensure_server_running, timeout=10)
    resp = client.get("/api/v1/auth/me")
    assert resp.status_code == 401
    client.close()
```

---

## Ce que ces tests vérifient — en clair

**`test_expired_token_rejected`**
C'est comme un badge d'accès temporaire périmé : même si le badge était valide hier, il doit être refusé aujourd'hui. La technique utilisée est astucieuse : on modifie temporairement la variable d'environnement `JWT_EXPIRY_HOURS` à zéro (expiration immédiate), on génère un token, on attend 100ms, puis on remet la config d'origine. Le token créé est donc déjà expiré au moment où on l'utilise. Le serveur doit refuser (401).

**`test_tampered_token_rejected`**
Un token JWT est composé de 3 parties séparées par des points : `header.payload.signature`. Ce test inverse l'ordre des caractères de la partie `payload` (la charge utile contenant les informations utilisateur). La signature ne correspond plus aux données — c'est comme effacer le cachet d'un chèque et le réécrire avec un autre montant. Le serveur doit détecter la falsification et refuser (401).

**`test_no_token_401`**
Le plus simple : appeler une route protégée sans aucun header d'autorisation. C'est comme essayer d'entrer dans un immeuble sécurisé sans badge ni interphone — la porte ne s'ouvre pas (401).

---

## Pourquoi c'est important

Le JWT est le mécanisme central d'authentification de toute l'application. Si l'une de ces protections était défaillante :
- **Token expiré accepté** : un attaquant qui récupère un ancien token (via un log, une capture réseau, ou une fuite) pourrait continuer à l'utiliser indéfiniment. L'expiration est la seule façon de limiter la durée de vie d'un token volé.
- **Token falsifié accepté** : n'importe qui pourrait créer un token en se déclarant administrateur ou en se faisant passer pour un autre utilisateur, sans connaître la clé secrète du serveur. C'est la faille la plus grave possible.
- **Pas de token accepté** : toutes les routes "protégées" seraient en réalité publiques.

Ces trois tests constituent les cas d'attaque JWT les plus courants dans la vraie vie.

---

## Peut-on améliorer ces tests ?

**Cas non couverts :**
- Modification de la partie `header` du JWT (changer l'algorithme de `HS256` à `none` — une attaque JWT classique connue sous le nom "algorithm confusion").
- Modification de la partie `signature` uniquement.
- Un token signé avec une mauvaise clé secrète (simuler un token créé par un attaquant qui connaît le format mais pas la clé).
- Les tokens des routes autres que `/auth/me` : les mêmes vérifications s'appliquent-elles à `/invoices/process`, `/catalogue/batch`, etc. ?

**Tests fragiles :**
- `test_expired_token_rejected` utilise `importlib.reload()` pour modifier le comportement du module `auth_service`. C'est une technique avancée et fragile : si le service tourne dans un processus séparé (serveur démarré indépendamment), le reload n'aura aucun effet sur lui. Le test ne vérifie que le comportement local du module, pas nécessairement ce que le serveur distant fait avec le token.
- Le `time.sleep(0.1)` de 100ms suppose que le token expire en moins de 100ms. Si la précision de l'horloge est insuffisante, le token pourrait encore être valide.

**Manques évidents :**
- Pas de test du comportement après logout : un token invalide côté serveur (session révoquée) est-il quand même refusé ?
- Pas de test de l'attaque "algorithm none" sur le JWT.
