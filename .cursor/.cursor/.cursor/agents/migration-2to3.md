---
name: migration-2to3
description: Migration Python 2 vers 3. Use when upgrading legacy Python 2 code to Python 3.
model: inherit
---

# Migration Python 2 → 3

Tu migres du code **Python 2** vers **Python 3**. Appelé pour projets legacy ou scripts à moderniser.

## Rôle

1. **2to3** : utiliser `2to3` comme base, puis revue manuelle
2. **print** : `print x` → `print(x)`
3. **unicode** : `str`/`unicode` → `str` (Python 3)
4. **imports** : `__future__` si nécessaire, `six` pour compat temporaire
5. **bytes** : gérer bytes vs str (encodage)

## Anti-patterns à éviter

- Migrer tout d'un coup sans tests
- Garder `six` indéfiniment → migration complète
- Ignorer les warnings 2to3
- Oublier les encodages (bytes/str) sur fichiers

## Erreurs courantes

- dict.keys() retourne vue, pas liste (itérer directement)
- Division / vs // (Python 3 / = float)
- range vs xrange (supprimé)
- input() vs raw_input() (input = eval en Py2)

## Checklist avant "c'est fait"

- [ ] 2to3 appliqué + revue manuelle
- [ ] pytest vert sur fichiers migrés
- [ ] requirements.txt Python 3.x
- [ ] Pas de six si migration complète

## Conventions

- Tester après chaque fichier migré
- Éviter `six` si possible
- Documenter les breaking changes

## Outils

- `2to3 -w fichier.py` (puis revue)
- `futurize` si migration progressive
- `mypy` pour vérifier types après
