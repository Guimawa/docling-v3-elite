# test_config.py — Ce qu'on vérifie

**Fichier :** `apps/api/core/test_config.py`
**Catégorie :** unit
**Ce qu'on teste :** Que la configuration de l'application (modèles IA disponibles, origines CORS, paramètres Storj, watchdog) est correctement définie et a les bons types.

---

## Le code

```python
"""Tests pour Config (core/config.py) — zéro mock."""
from core.config import Config


class TestConfig:
    def test_models_disponibles_not_empty(self):
        assert len(Config.MODELS_DISPONIBLES) > 0

    def test_default_model_exists_in_models(self):
        assert Config.DEFAULT_MODEL in Config.MODELS_DISPONIBLES

    def test_allowed_origins_is_list(self):
        assert isinstance(Config.ALLOWED_ORIGINS, list)
        assert "http://localhost:5173" in Config.ALLOWED_ORIGINS

    def test_storj_defaults(self):
        assert Config.STORJ_BUCKET == "docling-factures" or isinstance(Config.STORJ_BUCKET, str)
        assert isinstance(Config.STORJ_ENDPOINT, str)

    def test_watchdog_folder_is_string(self):
        assert isinstance(Config.WATCHDOG_FOLDER, str)

    def test_watchdog_enabled_is_bool(self):
        assert isinstance(Config.WATCHDOG_ENABLED, bool)
```

---

## Ce que ces tests vérifient — en clair

**`test_models_disponibles_not_empty`**
Vérifie que la liste des modèles IA disponibles (les différentes versions de Gemini) n'est pas vide. Si quelqu'un supprimait accidentellement tous les modèles de la config, ce test l'attraperait.

**`test_default_model_exists_in_models`**
Vérifie que le modèle par défaut (celui qui sera utilisé si l'utilisateur n'en choisit pas un) est bien dans la liste des modèles disponibles. Sans ce test, on pourrait configurer un modèle par défaut inexistant, ce qui causerait une erreur à l'exécution.

**`test_allowed_origins_is_list`**
Deux vérifications en une : `ALLOWED_ORIGINS` doit être une liste (pas une chaîne de caractères, pas `None`), et cette liste doit contenir `http://localhost:5173` (l'adresse du frontend React en développement). C'est la configuration CORS — si elle est mal configurée, le frontend ne peut pas parler au backend.

**`test_storj_defaults`**
Vérifie que la configuration du stockage cloud Storj est présente : le nom du bucket (accepte `"docling-factures"` ou n'importe quelle chaîne) et l'endpoint doivent être des chaînes de caractères. Storj est le service où sont archivés les PDFs des factures.

**`test_watchdog_folder_is_string`**
Vérifie que le chemin du dossier surveillé par le watchdog (le service qui surveille les nouveaux fichiers) est bien une chaîne de caractères. Si ce n'est pas une chaîne, le système de fichiers planterait.

**`test_watchdog_enabled_is_bool`**
Vérifie que l'indicateur d'activation du watchdog est bien un booléen (`True` ou `False`), pas une chaîne `"true"` ou `"1"` qui pourrait être mal interprétée.

---

## Pourquoi c'est important

La configuration est le socle de toute l'application. Une mauvaise valeur dans `Config` peut causer :
- Des erreurs CORS qui bloquent tout le frontend.
- Un modèle IA inexistant qui fait planter l'OCR à chaque upload.
- Un dossier watchdog manquant qui empêche la synchronisation automatique.
- Un endpoint Storj invalide qui rend impossible l'archivage des PDFs.

Ces tests unitaires s'exécutent en quelques millisecondes et détectent immédiatement les régressions de configuration.

---

## Peut-on améliorer ces tests ?

- **Les tests sont trop permissifs** : `test_storj_defaults` accepte n'importe quelle chaîne pour `STORJ_BUCKET`. On pourrait vérifier que la chaîne n'est pas vide.
- **Pas de test sur les valeurs de sécurité** : il n'y a pas de test vérifiant que `JWT_SECRET` a une longueur minimale, ou que `JWT_EXPIRY_SECONDS` est une valeur raisonnable.
- **Pas de test de la cohérence des modèles IA** : on sait que `MODELS_DISPONIBLES` n'est pas vide et que `DEFAULT_MODEL` y est présent, mais on ne vérifie pas que les noms de modèles ont un format valide (ex: commencent par `"gemini-"`).
- **Pas de test des variables d'environnement** : la config lit probablement des variables d'environnement. On ne teste pas que le fallback (valeur par défaut quand la variable est absente) est sensé.
