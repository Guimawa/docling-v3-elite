---
name: test
description: (Feature Developer) Génère ou exécute les tests. Use with test-generator agent for new tests.
---

# Test — Feature Developer

Génère ou exécute les tests. **Applicable à tout projet.**

## Génération

Utiliser l'agent `test-generator` si présent pour :
- Nouveaux endpoints / API
- Nouveaux composants / modules

## Exécution

Exécuter les tests du projet :
- npm test, pytest, cargo test, go test, etc.
- Adapter selon la stack (package.json, pyproject.toml, Makefile)

## Règle

Tests réels — pas de mock des API externes.
