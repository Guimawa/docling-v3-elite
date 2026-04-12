# test_auth_service.py — Ce qu'on vérifie

**Fichier :** `apps/api/services/test_auth_service.py`
**Catégorie :** unit
**Ce qu'on teste :** La sécurité du système d'authentification : hachage des mots de passe avec Argon2id, compatibilité avec les anciens hachages PBKDF2, et gestion des tokens JWT (création, vérification, expiration, falsification).

---

## Le code

```python
"""
Tests pour auth_service (JWT PyJWT + Argon2id password hashing) — zéro mock.
"""

import importlib
import os
import time

from services.auth_service import (
    create_token,
    hash_password,
    needs_rehash,
    verify_password,
    verify_token,
)


class TestPasswordHashing:
    def test_hash_and_verify(self):
        pwd = "MonSuperMotDePasse!123"
        hashed = hash_password(pwd)
        assert hashed.startswith("$argon2")
        assert verify_password(pwd, hashed)

    def test_wrong_password_fails(self):
        hashed = hash_password("correct")
        assert not verify_password("incorrect", hashed)

    def test_different_hashes_for_same_password(self):
        h1 = hash_password("test")
        h2 = hash_password("test")
        assert h1 != h2  # salt differs

    def test_empty_password(self):
        hashed = hash_password("")
        assert verify_password("", hashed)
        assert not verify_password("a", hashed)

    def test_malformed_stored_hash(self):
        assert not verify_password("test", "notavalidhash")
        assert not verify_password("test", "")

    def test_needs_rehash_on_new_argon2(self):
        hashed = hash_password("test")
        assert not needs_rehash(hashed)

    def test_needs_rehash_on_legacy_pbkdf2(self):
        import hashlib
        import os as _os
        salt = _os.urandom(16)
        h = hashlib.pbkdf2_hmac("sha256", b"test", salt, 100000)
        legacy = f"{salt.hex()}:{h.hex()}"
        assert needs_rehash(legacy)
        assert verify_password("test", legacy)
        assert not verify_password("wrong", legacy)


class TestJWT:
    def test_create_and_verify_token(self):
        token = create_token(
            user_id=42, email="test@example.com", role="admin"
        )
        payload = verify_token(token)
        assert payload is not None
        assert payload["sub"] == 42
        assert payload["email"] == "test@example.com"
        assert payload["role"] == "admin"

    def test_expired_token_rejected(self):
        """Token expiré via JWT_EXPIRY_SECONDS=0 (sans mock, rechargement module)."""
        import services.auth_service as auth_mod
        orig = os.environ.get("JWT_EXPIRY_SECONDS")
        os.environ["JWT_EXPIRY_SECONDS"] = "0"
        importlib.reload(auth_mod)
        token = auth_mod.create_token(user_id=1, email="a@b.com")
        time.sleep(0.1)
        assert auth_mod.verify_token(token) is None
        if orig is not None:
            os.environ["JWT_EXPIRY_SECONDS"] = orig
        else:
            os.environ.pop("JWT_EXPIRY_SECONDS", None)
        importlib.reload(auth_mod)

    def test_tampered_token_rejected(self):
        token = create_token(user_id=1, email="a@b.com")
        parts = token.split(".")
        parts[1] = parts[1][::-1]
        tampered = ".".join(parts)
        assert verify_token(tampered) is None

    def test_malformed_token_rejected(self):
        assert verify_token("not.a.valid.jwt.token") is None
        assert verify_token("garbage") is None
        assert verify_token("") is None
        assert verify_token("a.b") is None

    def test_default_role_is_user(self):
        token = create_token(user_id=1, email="a@b.com")
        payload = verify_token(token)
        assert payload["role"] == "user"
```

---

## Ce que ces tests vérifient — en clair

### TestPasswordHashing — hachage des mots de passe

**`test_hash_and_verify`**
On hache un mot de passe, on vérifie que le résultat commence par `$argon2` (la signature du format Argon2id), et on confirme que la vérification fonctionne. Argon2id est l'algorithme de hachage recommandé en 2025 pour les mots de passe — il est délibérément lent pour résister aux attaques par force brute.

**`test_wrong_password_fails`**
Un mot de passe incorrect ne doit jamais correspondre à un hachage. Ce test vérifie la base de la sécurité : que la vérification n'est pas cassée au point d'accepter n'importe quel mot de passe.

**`test_different_hashes_for_same_password`**
Le même mot de passe haché deux fois doit donner deux résultats différents. C'est grâce au "sel" (salt) : une valeur aléatoire ajoutée avant le hachage. Sans sel, si deux utilisateurs ont le même mot de passe, leurs hachages seraient identiques en base, facilitant les attaques.

**`test_empty_password`**
Un mot de passe vide doit pouvoir être haché et vérifié. Un mot de passe différent (même `"a"`) ne doit pas correspondre. Ce test assure que les cas limites ne provoquent pas de comportement inattendu.

**`test_malformed_stored_hash`**
Si la base de données contient une valeur corrompue ou vide à la place d'un hachage, la vérification doit retourner `False` sans planter. C'est la robustesse face aux données invalides.

**`test_needs_rehash_on_new_argon2`**
Un hachage Argon2id récent ne nécessite pas d'être re-haché. Cette fonction est utilisée lors de la connexion pour migrer automatiquement les anciens hachages.

**`test_needs_rehash_on_legacy_pbkdf2`**
C'est le test de migration : si un utilisateur a un ancien mot de passe haché en PBKDF2 (un algorithme plus ancien), trois choses sont vérifiées :
1. `needs_rehash` retourne `True` (on doit mettre à jour ce hachage).
2. Le bon mot de passe est quand même accepté (l'utilisateur peut toujours se connecter).
3. Un mauvais mot de passe est refusé.

Cela permet de faire la migration de PBKDF2 vers Argon2id de façon transparente, au moment de la connexion.

### TestJWT — tokens d'authentification

**`test_create_and_verify_token`**
Crée un token JWT pour l'utilisateur ID 42 avec le rôle "admin", puis le vérifie. On contrôle que le payload (les données dans le token) contient bien les bons champs : `sub` (subject = l'ID utilisateur), `email`, et `role`.

**`test_expired_token_rejected`**
Test sans mock : on change la variable d'environnement `JWT_EXPIRY_SECONDS` à `0`, on recharge le module Python, on crée un token (qui expire immédiatement), on attend 100ms, et on vérifie que ce token est rejeté. Puis on remet les variables à leur état d'origine. C'est une technique avancée pour tester l'expiration sans simuler le temps.

**`test_tampered_token_rejected`**
Un JWT a 3 parties séparées par des points : header, payload, signature. Ce test prend le payload (partie du milieu) et le retourne à l'envers (`[::-1]`), puis vérifie que le token falsifié est rejeté. C'est le test de l'intégrité cryptographique.

**`test_malformed_token_rejected`**
Toutes sortes de tokens invalides doivent être rejetés sans exception : un token avec trop de parties, du texte aléatoire, une chaîne vide, ou un token tronqué.

**`test_default_role_is_user`**
Si on crée un token sans spécifier de rôle, le rôle par défaut doit être `"user"` (et non `"admin"`). C'est le principe du moindre privilège : on n'accorde pas plus de droits que nécessaire par défaut.

---

## Pourquoi c'est important

L'authentification est la couche de sécurité la plus critique de l'application. Sans ces tests :
- Un bug dans Argon2id pourrait laisser des mots de passe non hachés en base.
- Un token JWT expiré pourrait continuer à être accepté.
- Un token falsifié pourrait permettre de se faire passer pour un autre utilisateur ou prendre le rôle admin.
- La migration PBKDF2 → Argon2id pourrait bloquer les anciens utilisateurs à la connexion.

---

## Peut-on améliorer ces tests ?

- **`test_expired_token_rejected` est fragile** : recharger un module Python (`importlib.reload`) dans un test est une technique délicate qui peut avoir des effets de bord si d'autres tests tournent en parallèle. Un vrai mock de `datetime.now()` serait plus propre.
- **Pas de test des claims standards JWT** : on ne vérifie pas que le token contient `iat` (issued at) et `exp` (expiry) dans le payload.
- **Pas de test de la durée d'expiration par défaut** : on ne vérifie pas que les tokens durent le bon nombre d'heures/jours par défaut.
- **Pas de test du cookie httpOnly** : les tokens doivent être transmis via cookie httpOnly (pas localStorage). Les tests unitaires ne peuvent pas tester cela — c'est un manque à compenser par des tests d'intégration.
