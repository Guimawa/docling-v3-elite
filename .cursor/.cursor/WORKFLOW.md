# Workflow Cursor — Projet quelconque

Workflow multi-agents pour travailler sur **n'importe quel projet** avec Cursor. Inspiré de [APM](https://github.com/sdi2200262/agentic-project-management) et [cursor-agents](https://github.com/pridiuksson/cursor-agents).

---

## Agents

| Agent | Rôle | Quand |
|-------|------|-------|
| **System Architect** | Plan, spec, design | Features complexes |
| **Feature Developer** | Implémentation, tests | Toute modif code |
| **Security Reviewer** | Revue sécurité | Auth, endpoints, merge |
| **Context Specialist** | Analyse codebase | Refactos, intégrations |
| **Docs Writer** | Documentation | Fin de feature |

---

## Flux

```
User: "Nouvelle feature"
    → @plan : décomposer en tâches (spec + design)
    → @dev : implémenter
    → @review : revue si critique
    → validate : lint + tests
    → @docs : mise à jour doc
```

---

## Commands

| Command | Action |
|---------|--------|
| `/plan` | Décomposer objectif |
| `/dev` | Implémenter |
| `/test` | Générer/exécuter tests |
| `/review` | Revue code |
| `/validate` | Lint + tests |

---

## Règles

1. **Adapter au projet** : lire README, package.json, Makefile pour identifier la stack
2. **Valider avant de terminer** : exécuter lint + tests
3. **Ne pas deviner** : consulter docs/ et conventions existantes
