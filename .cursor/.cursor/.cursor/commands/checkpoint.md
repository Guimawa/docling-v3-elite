---
name: checkpoint
description: Crée un commit checkpoint avant modifications. Travail avec certitude.
---

# Checkpoint

Crée un point de sauvegarde git avant des modifications.

## Workflow

1. Vérifier git status
2. Si changements non commités : git add -A, git commit -m "checkpoint: avant [description]"
3. Rapporter le hash du commit

## Usage

Exécuter `scripts/git-checkpoint.sh` ou équivalent manuel :

```bash
git add -A
git commit -m "checkpoint: avant [description]"
```

## Quand

Avant refacto majeur, avant que l'agent modifie beaucoup de fichiers, début de session.
