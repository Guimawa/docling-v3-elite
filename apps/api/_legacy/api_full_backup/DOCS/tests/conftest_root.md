# conftest.py (racine apps/api) — Ce qu'on vérifie

**Fichier :** `apps/api/conftest.py`
**Catégorie :** conftest
**Ce qu'on teste :** Ce fichier ne contient pas de tests — il configure l'environnement de base pour tous les tests du projet, avant même que pytest charge les autres fichiers.

---

## Le code

```python
"""Conftest racine apps/api — variables d'environnement communes à tous les tests."""
import os

os.environ.setdefault("JWT_SECRET", "test-secret-32-chars-minimum-for-pytest")
```

---

## Ce que cette configuration prépare

Ce fichier fait une seule chose : s'assurer que la variable d'environnement `JWT_SECRET` existe quand les tests s'exécutent.

`os.environ.setdefault(...)` fonctionne comme ceci : "si la variable `JWT_SECRET` n'existe pas déjà dans l'environnement, alors crée-la avec cette valeur par défaut". Si la variable est déjà définie (par exemple dans un fichier `.env` ou dans la configuration CI), elle n'est pas écrasée.

La valeur `"test-secret-32-chars-minimum-for-pytest"` est une clé secrète fictive utilisée uniquement en test. Elle respecte la contrainte de longueur minimale pour la génération de tokens JWT (32 caractères).

**Pourquoi à la racine de `apps/api/` et pas dans `tests/` ?**
Parce que certains tests unitaires se trouvent directement dans les sous-dossiers du code (`core/`, `services/`, `schemas/`) et non dans `tests/`. La racine `apps/api/conftest.py` est le seul endroit qui s'applique à absolument tous ces tests.

---

## Pourquoi c'est important

Sans cette ligne, les tests qui importent `auth_service` (ou tout module qui lit `JWT_SECRET` au démarrage) planteraient avec une erreur de configuration avant même d'avoir exécuté la moindre assertion. Cela se produirait même pour des tests qui n'ont rien à voir avec l'authentification.

C'est une "graine" d'environnement : elle garantit que l'application peut démarrer en mode test sans avoir besoin d'un vrai fichier `.env` de production.

---

## Peut-on améliorer cette configuration ?

- **Un seul réglage** : ce fichier est très minimal. On pourrait y ajouter d'autres variables d'environnement de test courantes (DATABASE_URL de test, GEMINI_API_KEY fictive, etc.).
- **Redondance avec `tests/conftest.py`** : le fichier `tests/conftest.py` fait exactement la même chose (`os.environ.setdefault("JWT_SECRET", ...)`). Cette duplication est intentionnelle pour la robustesse (les deux chemins sont couverts), mais pourrait être documentée plus clairement.
- **La clé est dans le code source** : la valeur `"test-secret-32-chars-minimum-for-pytest"` est hardcodée et visible dans le dépôt Git. C'est acceptable pour les tests (ce n'est pas une vraie clé de production), mais il faut s'assurer qu'aucun test n'utilise accidentellement cette clé en dehors de l'environnement de test.
