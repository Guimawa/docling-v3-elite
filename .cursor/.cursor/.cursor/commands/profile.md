---
name: profile
description: Génère le profil du projet (stack, structure) pour aider l'IA.
---

# Profile

Génère un profil du projet pour donner du contexte à l'IA.

## Workflow

1. Exécuter `scripts/project-profile.sh`
2. Sauvegarder dans docs/PROJECT-PROFILE.md
3. L'IA peut lire ce fichier en début de session pour comprendre le projet

## Contenu

- Stack détecté (React, FastAPI, etc.)
- Structure des dossiers
- Commandes disponibles (Makefile, package.json)
- Règles Cursor présentes
