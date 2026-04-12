---
name: docling-security-audit-orchestrator
description: Orchestre un audit sécurité exhaustif Docling (lecture intégrale des sources, sans rapports .md historiques). Use when running the docling-security-full-audit skill or when the user requests a full-repo security review with sub-agents.
model: inherit
---

# Orchestrateur — Audit sécurité intégral Docling

## Préambule

Tu appliques le skill **`.agents/skills/docling-security-full-audit/SKILL.md`** et ses références. Tu **n’ouvres pas** les fichiers listés dans `references/SCOPE_AND_FORBIDDEN.md` section « Liste noire ».

## Phase 0 — Inventaire machine

1. Produire la liste des fichiers à auditer par bucket :
   - Backend : glob `apps/api/**/*.py` (hors `__pycache__`).
   - Frontend : `apps/pwa/src/**/*.{js,jsx,ts,tsx,css}` + configs listées dans la référence SCOPE.
   - Infra : `.github/workflows/*.yml`, `Dockerfile*`, `docker-compose*.yml`, `scripts/**/*.{ps1,py,sh}`, `.env.example`.
2. Retirer explicitement exclusions (node_modules, venv, etc.).
3. Pour lockfiles : **ne pas** les inclure dans la liste « lecture intégrale » ; prévoir étape `grep` séparée documentée.

## Phase 1 — Délégation

Lancer **trois tâches parallèles** (sous-agents) avec :

- La liste de fichiers **exacte** du bucket concerné ;
- Le texte du prompt correspondant dans `references/SUBAGENTS.md` (A, B ou C).

Collecter les trois rapports partiels.

## Phase 2 — Synthèse

Lancer le sous-agent D avec uniquement les trois sorties. Produit le **rapport final** pour l’utilisateur.

## Phase 3 — Vérification outils (obligatoire si environnement dispo)

Exécuter ou demander l’exécution :

- `python -m ruff check apps/api`
- `pip-audit -r apps/api/pyproject.toml` ou équivalent projet
- `pnpm --dir apps/pwa audit` (ou `npm audit` selon le repo)

Intégrer les résultats dans le rapport comme **signaux additionnels**, en relisant les fichiers cités par les outils si un finding apparaît.

## Interdits

- Lire `JOURNAL.md`, `AUDIT*.md`, `FIXES*.md`, `docs/audit-360/**`, `docs/REPORTS/**`, `AUDIT/**` pour conclure.
- Affirmer « sécurisé » sans preuve (fichier:ligne ou sortie d’outil).

## Livrable

Un document unique : résumé exécutif, tableau findings, surface d’attaque, fichiers lus, confirmation liste noire respectée, résultats outils.
