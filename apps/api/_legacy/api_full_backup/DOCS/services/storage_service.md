# storage_service — Le déménageur qui range et retrouve les cartons dans l'entrepôt cloud

**Fichier :** `services/storage_service.py`
**Rôle :** Envoyer les fichiers (PDFs de factures) vers un entrepôt de stockage cloud (Storj S3), les retrouver, et générer des liens d'accès temporaires sécurisés.

---

## Le code

```python
"""
StorageService - Docling Agent v3
Upload/download S3-compatible (Storj, R2, MinIO).
Utilise boto3 avec endpoint configurable.
"""

import hashlib
import logging
from datetime import UTC, datetime

import boto3
from botocore.exceptions import ClientError, NoCredentialsError

from core.config import Config

logger = logging.getLogger(__name__)


class StorageService:
    _client = None

    @classmethod
    def _get_client(cls):
        if cls._client is None:
            if not Config.STORJ_ACCESS_KEY or not Config.STORJ_SECRET_KEY:
                return None
            cls._client = boto3.client(
                "s3",
                endpoint_url=Config.STORJ_ENDPOINT,
                aws_access_key_id=Config.STORJ_ACCESS_KEY,
                aws_secret_access_key=Config.STORJ_SECRET_KEY,
            )
        return cls._client

    @classmethod
    def is_configured(cls) -> bool:
        return bool(Config.STORJ_ACCESS_KEY and Config.STORJ_SECRET_KEY)

    @classmethod
    def upload_file(
        cls,
        file_bytes: bytes,
        filename: str,
        content_type: str = "application/pdf",
    ) -> str | None:
        """
        Upload un fichier vers le bucket S3.
        Retourne l'URL publique ou None si le stockage n'est pas configure.
        La cle S3 est : YYYY/MM/hash8_filename
        """
        client = cls._get_client()
        if client is None:
            logger.debug("Stockage cloud non configure, upload ignore")
            return None

        file_hash = hashlib.md5(file_bytes).hexdigest()[:8]
        now = datetime.now(UTC)
        # Sanitize filename: prevent path traversal (.., /, \)
        base = (filename or "file").split("/")[-1].split("\\")[-1]
        safe_name = "".join(c if c.isalnum() or c in "._-" else "_" for c in base) or "file"
        key = f"{now.strftime('%Y/%m')}/{file_hash}_{safe_name}"

        try:
            client.put_object(
                Bucket=Config.STORJ_BUCKET,
                Key=key,
                Body=file_bytes,
                ContentType=content_type,
            )
            url = f"{Config.STORJ_ENDPOINT}/{Config.STORJ_BUCKET}/{key}"
            logger.info("Fichier uploade -> .../%s", key.split("/")[-1])
            return url

        except (ClientError, NoCredentialsError) as e:
            logger.error("Erreur upload S3 : %s", type(e).__name__)
            return None

    @classmethod
    def _extract_key_from_url(cls, pdf_url: str) -> str | None:
        """
        Extrait la clé S3 depuis une URL au format endpoint/bucket/key.
        Retourne None si l'URL ne correspond pas au format attendu.
        """
        if not pdf_url:
            return None
        prefix = f"{Config.STORJ_ENDPOINT.rstrip('/')}/{Config.STORJ_BUCKET}/"
        if not pdf_url.startswith(prefix):
            return None
        return pdf_url[len(prefix):]

    @classmethod
    def get_presigned_url_from_pdf_url(cls, pdf_url: str, expires_in: int = 3600) -> str | None:
        """
        Génère une URL pré-signée à partir de pdf_url (format endpoint/bucket/key).
        Nécessaire pour Storj où l'URL directe n'est pas accessible.
        Retourne pdf_url en fallback si Storj non configuré ou URL d'un autre format.
        """
        key = cls._extract_key_from_url(pdf_url)
        if not key:
            return pdf_url  # Fallback: retourner l'URL telle quelle (bucket public)
        presigned = cls.get_presigned_url(key, expires_in)
        return presigned if presigned else pdf_url

    @classmethod
    def get_presigned_url(cls, key: str, expires_in: int = 3600) -> str | None:
        """Genere une URL pre-signee pour acces temporaire (clampée [60s, 3600s])."""
        client = cls._get_client()
        if client is None:
            return None
        expires_in = max(60, min(expires_in, 3600))  # Borne : min 1 min, max 1 heure
        try:
            return client.generate_presigned_url(
                "get_object",
                Params={"Bucket": Config.STORJ_BUCKET, "Key": key},
                ExpiresIn=expires_in,
            )
        except ClientError as e:
            logger.error("Erreur presigned URL : %s", type(e).__name__)
            return None
```

---

## Ce que ce fichier fait — en clair

Imagine un **déménageur professionnel** qui travaille avec un entrepôt géant dans le cloud. Quand tu lui donne un carton (un fichier PDF de facture), il l'étiquette soigneusement, le range dans une allée précise de l'entrepôt, et te donne un reçu. Plus tard, si tu as besoin de ce carton, il peut te donner un **laissez-passer temporaire** pour aller le récupérer toi-même — sans que tout le monde y ait accès.

L'entrepôt ici s'appelle **Storj** — un service de stockage cloud décentralisé compatible avec le protocole S3 (le même que Amazon AWS).

---

### `_get_client()` — Ouvrir la connexion avec l'entrepôt (une seule fois)

Avant de pouvoir déposer ou récupérer quoi que ce soit, il faut d'abord "ouvrir la porte" de l'entrepôt avec les bonnes clés (ACCESS_KEY et SECRET_KEY — comme un login + mot de passe pour l'entrepôt cloud).

Le système est malin : il ne crée la connexion **qu'une seule fois** et la garde en mémoire (`_client = None` au départ, puis stocké une fois créé). C'est comme garder la clé de l'entrepôt dans sa poche plutôt que de la refaire à chaque visite. Si les clés ne sont pas configurées, la fonction retourne `None` — et toutes les autres fonctions qui en dépendent s'arrêtent proprement sans planter.

---

### `is_configured()` — Vérifier que l'entrepôt est disponible

Simple vérification : est-ce que les clés d'accès à l'entrepôt sont configurées ? Si non, les fonctions d'upload et de téléchargement ne feront rien (elles retournent `None`). Cela permet à l'application de fonctionner sans stockage cloud — utile en développement local.

---

### `upload_file()` — Déposer un fichier dans l'entrepôt

C'est la fonction principale. Quand on lui donne un fichier (en octets), elle :

**1 — Calcule une empreinte du fichier**
Elle prend les 8 premiers caractères d'un "fingerprint" MD5 du contenu. C'est comme un mini code-barres du fichier — si deux factures ont le même contenu, elles auront le même code.

**2 — Construit l'adresse de rangement**
L'adresse (appelée "clé S3") est construite ainsi : `2026/03/a1b2c3d4_nom_du_fichier.pdf`. C'est comme ranger les cartons par année et mois dans l'entrepôt, avec un code unique pour éviter les collisions.

**3 — Nettoie le nom du fichier**
Avant de construire l'adresse, le nom de fichier est "sanitisé" : on enlève tout ce qui pourrait ressembler à un chemin piégé (`../`, `\..`, etc.). Quelqu'un qui enverrait un fichier nommé `../../../../etc/passwd` ne pourrait pas écraser des fichiers système.

**4 — Envoie le fichier**
Le fichier est envoyé à l'entrepôt Storj avec son type MIME (PDF par défaut). En cas d'erreur réseau ou d'identifiants invalides, la fonction retourne `None` plutôt que de faire planter l'application.

---

### `_extract_key_from_url()` — Retrouver l'adresse de rangement depuis une URL

L'entrepôt stocke les fichiers à une adresse interne (la "clé S3"). Quand on a une URL complète du type `https://link.storjshare.io/mon-bucket/2026/03/a1b2c3d4_facture.pdf`, cette fonction extrait juste la partie `2026/03/a1b2c3d4_facture.pdf` — l'adresse précise dans l'entrepôt. Si l'URL ne correspond pas au format attendu, elle retourne `None`.

---

### `get_presigned_url()` et `get_presigned_url_from_pdf_url()` — Le laissez-passer temporaire

Dans Storj, les fichiers ne sont pas accessibles publiquement par défaut. Pour permettre à un utilisateur de voir sa facture, on génère une **URL pré-signée** : c'est une URL spéciale qui contient une signature cryptographique et une date d'expiration. C'est comme un laissez-passer temporaire : "Tu peux entrer dans l'allée 3, rangée 2, pendant 1 heure maximum."

La durée est **bornée entre 60 secondes et 3600 secondes** (1 heure) — on ne peut pas générer de laissez-passer d'un an même si on le demande.

`get_presigned_url_from_pdf_url` est la version "pratique" : elle prend l'URL complète stockée en base de données, en extrait la clé, et génère le laissez-passer — le tout en un seul appel. Si quelque chose ne va pas (Storj non configuré, URL d'un autre format), elle retourne l'URL originale en fallback.

---

## Peut-on optimiser ce fichier ?

**Ce qui est très bien fait :**
- La protection contre les path traversal dans `upload_file` est correcte et explicitement commentée.
- Le pattern singleton pour le client boto3 (`_client = None`) évite de rouvrir des connexions TCP à chaque upload.
- La borne sur la durée des URLs pré-signées (`max(60, min(expires_in, 3600))`) est une bonne pratique de sécurité.
- Le comportement "fail-open" (retourner `None` ou l'URL originale plutôt que lever une exception) est cohérent avec le reste du projet.

**Ce qui pourrait être amélioré :**

1. **Le client boto3 est synchrone dans une application async** — `boto3` est une librairie bloquante. Quand `upload_file` ou `get_presigned_url` s'exécute, elle bloque le thread entier de FastAPI pendant la durée de l'appel réseau. La solution est d'utiliser `aioboto3` (la version async de boto3) ou d'envelopper les appels dans `asyncio.to_thread()` pour ne pas bloquer les autres requêtes.

2. **Le hash MD5 est utilisé comme identifiant de fichier** — MD5 n'est pas sécurisé cryptographiquement (collisions connues). Bien que ce ne soit pas un usage de sécurité ici (juste pour nommer le fichier), utiliser SHA256 tronqué serait plus moderne et cohérent avec les pratiques du reste du code (qui utilise SHA1 pour HIBP et PBKDF2-SHA256 pour les mots de passe).

3. **Le singleton `_client` est partagé entre tous les threads** — si un rechargement de configuration change les clés Storj en cours d'exécution (ex. : rotation de clés), l'ancien client restera en cache. Il n'y a pas de mécanisme pour forcer la recréation du client.

4. **Pas de vérification d'existence avant upload** — si la même facture est envoyée deux fois, elle sera uploadée deux fois (avec deux hash8 différents si les octets sont identiques... non, en fait le même hash, donc la même clé — elle sera écrasée silencieusement). Ce comportement est acceptable mais mériterait d'être documenté explicitement.

5. **`upload_file` retourne une URL construite manuellement** (`f"{endpoint}/{bucket}/{key}"`) plutôt que l'URL réelle retournée par Storj** — si l'endpoint a un slash final ou pas, la construction peut générer une URL malformée. Il serait plus robuste d'utiliser `urljoin` ou de normaliser l'endpoint une fois à la configuration.

6. **Pas de retry sur upload** — contrairement à `GeminiService` qui réessaie automatiquement sur rate limit, `StorageService` abandonne immédiatement sur toute erreur réseau. Un retry avec backoff exponentiel sur les erreurs temporaires (`ClientError` avec code 503 ou timeout) améliorerait la résilience.
