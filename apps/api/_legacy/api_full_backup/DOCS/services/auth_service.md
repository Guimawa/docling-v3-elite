# auth_service — Le vigile et le gestionnaire de badges de l'application

**Fichier :** `services/auth_service.py`
**Rôle :** Créer, vérifier et sécuriser les "badges d'accès" (tokens JWT) des utilisateurs, et protéger les mots de passe.

---

## Le code

> Source de vérité : `services/auth_service.py` (le bloc ci-dessous est une copie ; en cas d’écart, le fichier Python prime).

```python
"""
AuthService - Docling Agent v4
JWT authentication (PyJWT) with Argon2id password hashing.
Backward-compatible: PBKDF2 hashes are verified and silently rehashed to Argon2id on login.
"""

import hashlib
import hmac
import logging
import os
import time
import uuid

import httpx
import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

from core.config import Config

logger = logging.getLogger(__name__)

def _get_jwt_secret() -> str:
    """Lazy accessor — validated at startup by Config.validate(), not at import."""
    secret = os.getenv("JWT_SECRET", "")
    if not secret:
        raise RuntimeError(
            "JWT_SECRET manquant. Définir la variable d'environnement JWT_SECRET "
            "avant de démarrer l'application."
        )
    return secret


def _get_jwt_refresh_secret() -> str:
    """Lazy accessor pour le secret refresh token — différent du secret access token."""
    secret = os.getenv("JWT_REFRESH_SECRET", "")
    if not secret:
        raise RuntimeError(
            "JWT_REFRESH_SECRET manquant. Définir la variable d'environnement JWT_REFRESH_SECRET "
            "avant de démarrer l'application."
        )
    return secret


JWT_ALGORITHM = "HS256"
# Access token : 15 min (900s)
JWT_EXPIRY = int(os.getenv("JWT_EXPIRY_SECONDS", "900"))
# Refresh token : 7 jours
JWT_REFRESH_EXPIRY = 7 * 24 * 3600

# Claims de validation — protection contre les attaques par confusion d'algorithme
# (CVE-2026-22817, CVE-2026-27804, CVE-2026-23552)
JWT_ISSUER = "docling-api"
JWT_AUDIENCE = "docling-pwa"

_ph = PasswordHasher(time_cost=3, memory_cost=65536, parallelism=2)


def create_token(user_id: int, email: str, role: str = "user") -> str:
    """Create a JWT access token signed with HS256 via PyJWT.
    Inclut iss, aud, jti pour protection contre confusion d'algorithme et replay.
    Expiry : 15 minutes (configurable via JWT_EXPIRY_SECONDS).
    """
    now = int(time.time())
    payload = {
        "sub": str(user_id),
        "email": email,
        "role": role,
        "iat": now,
        "exp": now + JWT_EXPIRY,
        "iss": JWT_ISSUER,            # Émetteur — anti-confusion cross-service
        "aud": JWT_AUDIENCE,          # Audience — anti-confusion cross-service
        "jti": str(uuid.uuid4()),     # JWT ID unique — anti-replay
        "type": "access",
    }
    return jwt.encode(payload, _get_jwt_secret(), algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: int) -> tuple[str, str]:
    """Create a JWT refresh token signed with JWT_REFRESH_SECRET.
    Expiry : Config.JWT_REFRESH_EXPIRY_SECONDS (défaut 7 jours).
    Retourne (token, jti) — le jti doit être stocké en DB pour révocation.
    """
    now = int(time.time())
    jti = str(uuid.uuid4())
    refresh_ttl = int(Config.JWT_REFRESH_EXPIRY_SECONDS)
    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + refresh_ttl,
        "iss": JWT_ISSUER,
        "aud": JWT_AUDIENCE,
        "jti": jti,
        "type": "refresh",
    }
    token = jwt.encode(payload, _get_jwt_refresh_secret(), algorithm=JWT_ALGORITHM)
    return token, jti


def verify_refresh_token(token: str) -> dict | None:
    """Verify and decode a refresh token. Returns payload dict or None.
    Vérifie la signature avec JWT_REFRESH_SECRET et le claim type=refresh.
    """
    try:
        data = jwt.decode(
            token,
            _get_jwt_refresh_secret(),
            algorithms=[JWT_ALGORITHM],
            audience=JWT_AUDIENCE,
            issuer=JWT_ISSUER,
        )
        if data.get("type") != "refresh":
            logger.warning("Token type invalide (attendu: refresh)")
            return None
        data["sub"] = int(data["sub"])
        return data
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError, ValueError, KeyError):
        logger.warning("Refresh token invalide ou expiré")
        return None


def verify_token(token: str) -> dict | None:
    """Verify and decode a JWT token. Returns payload dict or None."""
    try:
        data = jwt.decode(
            token,
            _get_jwt_secret(),
            algorithms=[JWT_ALGORITHM],
            audience=JWT_AUDIENCE,    # Valide le claim aud
            issuer=JWT_ISSUER,        # Valide le claim iss
        )
        data["sub"] = int(data["sub"])
        return data
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError, ValueError, KeyError):
        logger.warning("Token invalide ou payload malformé")
        return None


def validate_password(password: str) -> tuple[bool, str]:
    """
    Valide le mot de passe selon NIST SP 800-63B (2024) :
    - Minimum 12 caractères
    - Pas de règles de complexité arbitraires (NIST déconseille)
    Retourne (True, "") si valide, (False, message_erreur) sinon.
    """
    if len(password) < 12:
        return False, "Le mot de passe doit contenir au moins 12 caractères"
    max_len = int(Config.PASSWORD_MAX_LENGTH)
    if len(password) > max_len:
        return False, f"Le mot de passe ne doit pas dépasser {max_len} caractères"
    return True, ""


async def check_pwned_password(password: str) -> bool:
    """
    Vérifie si le mot de passe figure dans la base HIBP via k-anonymity.
    Retourne True si le mot de passe a été compromis, False sinon (ou si HIBP est indisponible).
    Ne bloque jamais l'inscription en cas d'erreur réseau (fail-open).
    """
    clipped = _clip_password_for_processing(password)
    sha1 = hashlib.sha1(clipped.encode("utf-8")).hexdigest().upper()
    prefix, suffix = sha1[:5], sha1[5:]
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(
                f"https://api.pwnedpasswords.com/range/{prefix}",
                headers={"Add-Padding": "true"},
            )
        if resp.status_code == 200:
            for line in resp.text.splitlines():
                h, _ = line.split(":")
                if h == suffix:
                    return True
    except httpx.RequestError:
        pass  # Fail-open — HIBP indisponible ne doit pas bloquer l'inscription
    except Exception:
        logger.warning("check_pwned_password: erreur inattendue (hors réseau)", exc_info=True)
    return False


def hash_password(password: str) -> str:
    """Hash password with Argon2id (default for all new accounts)."""
    return _password_hasher().hash(_clip_password_for_processing(password))


def _verify_pbkdf2(password: str, stored: str) -> bool:
    """Verify a legacy PBKDF2-SHA256 hash (format: salt_hex:hash_hex)."""
    try:
        salt_hex, hash_hex = stored.split(":")
        salt = bytes.fromhex(salt_hex)
        expected = bytes.fromhex(hash_hex)
        actual = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 100000)
        return hmac.compare_digest(actual, expected)
    except Exception:
        return False


def verify_password(password: str, stored: str) -> bool:
    """
    Verify password against stored hash.
    Supports both Argon2id ($argon2...) and legacy PBKDF2 (hex:hex) formats.
    """
    clipped = _clip_password_for_processing(password)
    if stored.startswith("$argon2"):
        try:
            return _password_hasher().verify(stored, clipped)
        except VerifyMismatchError:
            return False
    return _verify_pbkdf2(clipped, stored)


def needs_rehash(stored: str) -> bool:
    """Returns True if the stored hash should be upgraded to Argon2id."""
    if stored.startswith("$argon2"):
        return _password_hasher().check_needs_rehash(stored)
    return True
```

---

## Ce que ce fichier fait — en clair

Imagine que l'application est une boîte de nuit avec un vigile à l'entrée. Ce fichier, c'est **le vigile, le gestionnaire de badges, et le coffre-fort des mots de passe** réunis en un seul endroit.

---

### `_get_jwt_secret()` et `_get_jwt_refresh_secret()` — Les clés du coffre

Avant de faire quoi que ce soit, le système a besoin de deux "clés secrètes" stockées dans l'environnement du serveur (comme des codes dans un coffre, pas dans le code lui-même). Ces deux petites fonctions vont chercher ces clés. Si elles ne les trouvent pas, elles crient une erreur immédiatement — parce qu'un vigile sans clé ne peut rien faire.

---

### `create_token()` — Fabriquer un badge visiteur (court terme)

Quand quelqu'un se connecte, on lui fabrique un **badge temporaire valable 15 minutes**. Ce badge contient :
- son identifiant (`sub`) — qui il est
- son email et son rôle (simple utilisateur, admin, etc.)
- la date de création (`iat`) et la date d'expiration (`exp`)
- qui a émis le badge (`iss` = "docling-api") et pour qui il est valable (`aud` = "docling-pwa")
- un numéro unique (`jti`) pour éviter qu'on réutilise un badge volé

Le badge est ensuite **signé** avec la clé secrète — comme un hologramme sur un vrai badge. Sans la clé, impossible de fabriquer un faux.

---

### `create_refresh_token()` — Fabriquer une carte de renouvellement (long terme)

En plus du badge 15 minutes, on donne aussi une **carte de renouvellement valable 7 jours**. Cette carte permet d'obtenir un nouveau badge sans se reconnecter. Elle utilise une clé secrète *différente* du badge normal — comme si le coffre-fort des cartes longue durée avait une autre serrure. La fonction retourne aussi le numéro unique (`jti`) pour que la base de données puisse l'enregistrer et l'invalider si besoin (déconnexion forcée).

---

### `verify_token()` et `verify_refresh_token()` — Contrôler un badge à l'entrée

Le vigile à l'entrée prend le badge, vérifie l'hologramme (la signature), regarde si la date n'est pas dépassée, contrôle que le badge vient bien de "docling-api" et qu'il est destiné à "docling-pwa". Si tout est bon, il lit les infos dessus et les transmet. Si quelque chose cloche — badge expiré, falsifié, mauvaise cible — il refuse sans donner de détails (pour ne pas aider un attaquant).

---

### `validate_password()` — Vérifier qu'un mot de passe est acceptable

Selon les recommandations officielles américaines (NIST 2024), un bon mot de passe doit juste être **long** (au moins 12 caractères). Pas besoin d'imposer "un chiffre + une majuscule + un symbole" — c'est une vieille règle prouvée inefficace. Cette fonction vérifie simplement la longueur.

---

### `check_pwned_password()` — Vérifier si le mot de passe a déjà été volé quelque part

Avant d'accepter un nouveau mot de passe, on consulte discrètement la base **HaveIBeenPwned** (HIBP) — un service qui recense des milliards de mots de passe volés lors de piratages. Astucieux : on n'envoie **jamais** le mot de passe complet sur internet. On envoie seulement les 5 premiers caractères de son empreinte numérique (SHA1), et on reçoit une liste de résultats qu'on compare localement. C'est ce qu'on appelle la "k-anonymité" — personne ne sait ce qu'on cherche vraiment. Si le service HIBP est indisponible, on laisse passer quand même (on ne bloque pas l'inscription pour un problème réseau externe).

---

### `hash_password()` — Mettre le mot de passe dans un coffre indéchiffrable

On ne stocke **jamais** un mot de passe en clair en base de données. On utilise **Argon2id** — l'algorithme le plus solide en 2026 pour protéger les mots de passe — qui transforme le mot de passe en une chaîne illisible. Même si quelqu'un vole la base de données, il ne peut pas retrouver les mots de passe d'origine sans des années de calcul.

---

### `verify_password()` et `_verify_pbkdf2()` — Vérifier un mot de passe à la connexion

Quand quelqu'un se connecte, on compare ce qu'il tape avec ce qui est en base. La vérification gère deux cas :
- Les nouveaux comptes utilisent **Argon2id** (reconnaissable parce que la chaîne commence par `$argon2`)
- Les anciens comptes utilisent peut-être encore l'ancien format **PBKDF2** (une ancienne méthode moins solide mais encore acceptable). La vérification PBKDF2 utilise `hmac.compare_digest` pour éviter les attaques par "timing" (mesurer le temps de réponse pour deviner un mot de passe).

---

### `needs_rehash()` — Savoir si un mot de passe doit être mis à jour

Si un ancien compte se connecte avec un mot de passe PBKDF2, cette fonction dit "oui, il faut le passer en Argon2id au prochain login". C'est une **migration silencieuse** : l'utilisateur ne voit rien, mais son mot de passe est automatiquement mieux protégé.

---

## Peut-on optimiser ce fichier ?

**Ce qui est très bien fait :**
- La séparation des deux secrets JWT (access vs refresh) est une bonne pratique souvent négligée.
- La k-anonymité pour HIBP est parfaitement implémentée.
- La migration silencieuse PBKDF2 → Argon2id est élégante et transparente pour l'utilisateur.
- Les claims `iss`, `aud`, `jti` protègent contre des attaques connues (confusions cross-service, replay).
- `hmac.compare_digest` dans `_verify_pbkdf2` évite les attaques par timing.

**Améliorations appliquées (mars 2026) :**

1. **`check_pwned_password`** : `httpx.RequestError` → fail-open silencieux ; autres exceptions → log `warning` avec stack trace.

2. **Refresh token** : durée via `Config.JWT_REFRESH_EXPIRY_SECONDS` (env `JWT_REFRESH_EXPIRY_SECONDS`, défaut 604800 s). `main.py` utilise la même valeur pour cookies et `expires_at` en base.

3. **Argon2id** : `ARGON2_TIME_COST`, `ARGON2_MEMORY_COST`, `ARGON2_PARALLELISM` dans `core.config` ; `PasswordHasher` lazy (`_password_hasher()`).

4. **Anti-DoS mot de passe** : `PASSWORD_MAX_LENGTH` (défaut 1000) — `validate_password` refuse au-delà ; troncature défensive dans `hash_password`, `verify_password`, `check_pwned_password`.

5. **`verify_token`** : exige `type == "access"` (comme `verify_refresh_token` exige `refresh`).
