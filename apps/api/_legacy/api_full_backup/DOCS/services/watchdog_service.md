# watchdog_service.py — Le gardien qui surveille un dossier et traite les factures automatiquement

**Fichier :** `apps/api/services/watchdog_service.py`
**Rôle :** Surveiller en permanence un dossier sur l'ordinateur et, dès qu'un nouveau fichier (PDF ou photo) y est déposé, le traiter automatiquement comme une facture.

---

## Le code

```python
"""
WatchdogService — Docling Agent v3
Surveille le dossier magique local et traite automatiquement
les nouveaux PDF/images déposés.
Compatible PC Windows/Linux via watchdog library.
"""

import asyncio
import logging
import shutil
from pathlib import Path

from watchdog.events import FileSystemEventHandler
from watchdog.observers import Observer

from core.config import Config
from core.orchestrator import Orchestrator

logger = logging.getLogger(__name__)

# Extensions acceptées
EXTENSIONS_OK = {".pdf", ".jpg", ".jpeg", ".png", ".webp", ".heic"}

# Délai avant traitement (évite les fichiers en cours de copie)
DEBOUNCE_SECONDS = 2.0


class InvoiceFileHandler(FileSystemEventHandler):
    """Handler watchdog — appelé à chaque nouveau fichier."""

    def __init__(self, model_id: str, loop: asyncio.AbstractEventLoop):
        super().__init__()
        self.model_id    = model_id
        self.loop        = loop
        self._processing = set()   # Évite double traitement

    def on_created(self, event):
        if event.is_directory:
            return
        path = Path(event.src_path)
        if path.suffix.lower() not in EXTENSIONS_OK:
            return
        if path.parent.name in ("Traitees", "Erreurs"):
            return   # Ignorer les sous-dossiers de sortie
        if str(path) in self._processing:
            return

        logger.info(f"📂 Nouveau fichier détecté: {path.name}")
        self._processing.add(str(path))
        asyncio.run_coroutine_threadsafe(
            self._process_with_delay(path),
            self.loop
        )

    async def _process_with_delay(self, path: Path):
        """Attente + traitement + déplacement."""
        await asyncio.sleep(DEBOUNCE_SECONDS)

        try:
            # Vérifier que le fichier existe encore (pas supprimé entre temps)
            if not path.exists():
                return

            file_bytes = path.read_bytes()
            result = await Orchestrator.process_file(
                file_bytes=file_bytes,
                filename=path.name,
                model_id=self.model_id,
                source="watchdog",
            )

            if result["success"]:
                # Déplacer vers /Traitees
                dest = path.parent / "Traitees" / path.name
                dest.parent.mkdir(exist_ok=True)
                shutil.move(str(path), str(dest))
                logger.info(
                    f"✅ {path.name}: {result['products_added']} produits "
                    f"→ déplacé vers Traitees/"
                )
                _watchdog_status["last_file"]      = path.name
                _watchdog_status["last_status"]    = "ok"
                _watchdog_status["total_processed"] += 1
                _watchdog_status["total_products"]  += result["products_added"]
            else:
                # Déplacer vers /Erreurs
                dest = path.parent / "Erreurs" / path.name
                dest.parent.mkdir(exist_ok=True)
                shutil.move(str(path), str(dest))
                logger.error(f"❌ {path.name}: {result.get('error')} → Erreurs/")
                _watchdog_status["last_file"]   = path.name
                _watchdog_status["last_status"] = "error"

        except Exception as e:
            logger.error(f"Erreur watchdog {path.name}: {e}")
            _watchdog_status["last_status"] = "error"
        finally:
            self._processing.discard(str(path))


# ─── Statut partagé (accessible via API /api/v1/sync/status) ─────────────────
_watchdog_status = {
    "active":          False,
    "folder":          Config.WATCHDOG_FOLDER,
    "last_file":       None,
    "last_status":     None,
    "total_processed": 0,
    "total_products":  0,
}

_observer: Observer | None = None


def start_watchdog(model_id: str, loop: asyncio.AbstractEventLoop) -> None:
    global _observer

    if not Config.WATCHDOG_ENABLED:
        logger.info("Watchdog désactivé (WATCHDOG_ENABLED=false)")
        return

    folder = Path(Config.WATCHDOG_FOLDER)
    folder.mkdir(parents=True, exist_ok=True)
    (folder / "Traitees").mkdir(exist_ok=True)
    (folder / "Erreurs").mkdir(exist_ok=True)

    handler   = InvoiceFileHandler(model_id=model_id, loop=loop)
    _observer = Observer()
    _observer.schedule(handler, str(folder), recursive=False)
    _observer.start()

    _watchdog_status["active"] = True
    logger.info(f"👁️  Watchdog actif → {folder.resolve()}")


def stop_watchdog() -> None:
    global _observer
    if _observer:
        _observer.stop()
        _observer.join()
        _observer = None
    _watchdog_status["active"] = False
    logger.info("Watchdog arrêté")


def get_watchdog_status() -> dict:
    return {
        **_watchdog_status,
        "folder_absolute": str(Path(Config.WATCHDOG_FOLDER).resolve()),
        "files_en_attente": len([
            f for f in Path(Config.WATCHDOG_FOLDER).glob("*")
            if f.is_file() and f.suffix.lower() in EXTENSIONS_OK
        ]) if Path(Config.WATCHDOG_FOLDER).exists() else 0,
    }
```

---

## Ce que ce fichier fait — en clair

### L'analogie du facteur automatique

Imagine un employé de bureau dont l'unique mission est de surveiller la boîte aux lettres de l'entreprise. Dès qu'une lettre arrive, il la ramasse, la traite (ici : lit la facture avec l'IA), puis la range dans le classeur "Traité" ou "Erreurs" selon que ça a marché ou non. C'est exactement ce que fait ce fichier — mais pour un dossier sur le disque dur.

### `EXTENSIONS_OK` et `DEBOUNCE_SECONDS` — Les règles de base

```python
EXTENSIONS_OK = {".pdf", ".jpg", ".jpeg", ".png", ".webp", ".heic"}
DEBOUNCE_SECONDS = 2.0
```

Le gardien n'accepte pas n'importe quel fichier. Si quelqu'un dépose un `.xlsx` ou un `.docx`, il l'ignore.

Le délai de 2 secondes (`DEBOUNCE_SECONDS`) est une protection pratique : quand tu copies un gros PDF, le fichier apparaît dans le dossier avant d'être entièrement copié. Sans ce délai, le gardien essaierait de lire un fichier à moitié écrit, ce qui provoquerait une erreur. Attendre 2 secondes laisse le temps à la copie de se terminer.

### `InvoiceFileHandler` — Le gardien lui-même

C'est la classe principale. Elle hérite de `FileSystemEventHandler`, un outil de la bibliothèque `watchdog` qui sait écouter les événements du système de fichiers (création, suppression, modification de fichiers).

#### `__init__()` — La mise en place

Le gardien mémorise deux choses : le modèle d'IA à utiliser (`model_id`) et la "boucle d'événements" (`loop`). Cette dernière est un concept technique lié au fait que le gardien tourne dans un fil d'exécution séparé (`thread`), alors que le reste de l'application tourne de manière asynchrone. Le `loop` sert de pont entre les deux.

`self._processing` est une liste de fichiers en cours de traitement. C'est une protection contre le double-traitement : si le système signale deux fois l'arrivée du même fichier (ce qui peut arriver), le fichier ne sera traité qu'une seule fois.

#### `on_created()` — La détection

```python
def on_created(self, event):
```

Cette méthode est appelée automatiquement chaque fois qu'un nouveau fichier apparaît dans le dossier surveillé. Elle applique plusieurs filtres en cascade :
- C'est un dossier ? On ignore.
- L'extension n'est pas dans la liste ? On ignore.
- C'est dans le sous-dossier `Traitees` ou `Erreurs` ? On ignore (sinon le déplacement déclencherait une nouvelle détection, créant une boucle infinie).
- Le fichier est déjà en cours de traitement ? On ignore.

Si tous les filtres sont passés, le fichier est confié à `_process_with_delay` pour traitement asynchrone.

#### `_process_with_delay()` — Le traitement

C'est ici que le vrai travail se fait :
1. On attend 2 secondes (le fameux debounce).
2. On vérifie que le fichier existe toujours (il a peut-être été supprimé entre-temps).
3. On lit le contenu du fichier en mémoire (`read_bytes()`).
4. On envoie les données à l'`Orchestrator` — le chef d'orchestre qui décide comment traiter la facture (prétraitement, OCR, Gemini, fallback).
5. **Si succès** : le fichier est déplacé dans le sous-dossier `Traitees/` et les compteurs globaux sont mis à jour.
6. **Si échec** : le fichier est déplacé dans `Erreurs/` pour qu'un humain puisse examiner le problème.

Le bloc `finally` s'assure que le fichier est retiré de la liste `_processing` quoi qu'il arrive, même si une exception s'est produite.

### `_watchdog_status` — Le tableau de bord

```python
_watchdog_status = {
    "active": False,
    "folder": Config.WATCHDOG_FOLDER,
    ...
}
```

C'est un dictionnaire global (partagé dans tout le programme) qui garde en mémoire l'état du gardien : est-il actif ? Quel est le dernier fichier traité ? Combien de produits ont été extraits au total ? Ces informations sont exposées via l'API REST à l'adresse `/api/v1/sync/status` pour que l'interface web puisse afficher un tableau de bord en temps réel.

### `start_watchdog()` — Démarrer la surveillance

Crée les sous-dossiers `Traitees/` et `Erreurs/` si ils n'existent pas, installe le gardien sur le dossier configuré, et lance l'observation. Si `WATCHDOG_ENABLED=false` dans la configuration, la fonction ne fait rien — pratique pour désactiver la fonctionnalité sans modifier le code.

### `stop_watchdog()` — Arrêter proprement

Arrête le processus d'observation et attend qu'il se termine complètement (`_observer.join()`). C'est important pour ne pas laisser de processus fantôme qui consomme des ressources.

### `get_watchdog_status()` — Lire le tableau de bord

Retourne le statut actuel en ajoutant deux informations calculées à la volée :
- Le chemin absolu du dossier (utile pour l'affichage).
- Le nombre de fichiers encore en attente dans le dossier (ceux qui n'ont pas encore été traités).

---

## Peut-on optimiser ce fichier ?

**Ce qui est bien fait :**
- Le mécanisme de debounce protège contre les lectures de fichiers incomplets.
- La protection `_processing` évite le double-traitement.
- L'arrêt propre avec `_observer.join()` évite les fuites de ressources.
- Les sous-dossiers `Traitees/` et `Erreurs/` sont créés automatiquement.

**Ce qui pourrait être amélioré :**

1. **`_watchdog_status` est un dictionnaire global mutable** : n'importe quelle partie du code peut le modifier directement, ce qui peut provoquer des comportements imprévisibles. Une approche plus robuste serait d'utiliser une classe avec des attributs typés et des méthodes d'accès contrôlées.

2. **Pas de protection contre les collisions de noms de fichiers** : si un fichier `facture.pdf` est déjà présent dans `Traitees/` et qu'un nouveau `facture.pdf` arrive, `shutil.move` va écraser silencieusement l'ancien fichier. Ajouter un horodatage au nom du fichier destination éviterait cette perte de données.

3. **La lecture du fichier est bloquante** : `path.read_bytes()` lit le fichier entier en mémoire de manière synchrone. Pour des PDF très volumineux, cela pourrait bloquer brièvement la boucle asynchrone. Une lecture asynchrone avec `aiofiles` serait plus propre.

4. **`get_watchdog_status()` fait un `glob()` à chaque appel** : si le dossier contient beaucoup de fichiers, cette opération peut être lente. Un compteur mis à jour lors des déplacements serait plus efficace.

5. **Pas de limite sur la taille des fichiers** : un fichier de 2 Go déposé dans le dossier sera lu entièrement en mémoire sans avertissement. Une vérification de la taille avant lecture (`path.stat().st_size`) protégerait contre les cas extrêmes.

6. **`recursive=False`** : la surveillance n'est pas récursive, ce qui est un bon choix ici pour éviter de surveiller les sous-dossiers `Traitees/` et `Erreurs/`. C'est documenté implicitement par le filtre `path.parent.name in ("Traitees", "Erreurs")`, mais un commentaire expliquant la redondance serait utile.
