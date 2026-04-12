# 🏗️ Audit Bêton — Docling Agent v3

**Objectif** : Audit exhaustif avec agents spécialisés · Sévérité maximale · Zéro tolérance

> Point d'entrée : `.cursor/PROMPT AUDIT/00_MASTER_PROMPT.md`
> Config : `.cursor/PROMPT AUDIT/audit-phases.json`
> Livrables : `AUDIT_BETON/01_NETTOYAGE.md` → `10_RAPPORT_FINAL.md`

---

## Avant de commencer

1. **Lire** `.cursor/PROMPT AUDIT/00_MASTER_PROMPT.md` en entier
2. **Vérifier** que `.cursor/PROMPT AUDIT/audit-phases.json` existe
3. **Exécuter** les étapes INIT du master (via `scripts/run-audit-beton.ps1` ou manuellement)

---

## Activation des agents par phase

Pour **chaque phase** de l'audit, invoquer l'agent spécialisé via `mcp_task` :

| Phase | Agent | Action |
|-------|-------|--------|
| 01 | `context-specialist` | Nettoyage — Fichiers parasites, orphelins |
| 02 | `context-specialist` | Cartographie — Référence exhaustive de TOUS les fichiers |
| 03 | `api-reviewer` | Backend — Audit FastAPI, endpoints, services |
| 04 | `feature-developer` | Frontend — Audit React, hooks, composants |
| 05 | `migration-assistant` | BDD — Migrations, schémas, Neon |
| 06 | `security-reviewer` | Sécurité — OWASP, JWT, injection |
| 07 | `test-generator` | Tests — pytest, Vitest, manquants |
| 08 | `system-architect` | Build — Docker, CI/CD, déploiement |
| 09 | `context-specialist` | Performance — Backend, frontend, bundle |
| 10 | `docs-writer` | Rapport final — Scorecard, verdict |

---

## Instructions d'exécution

### Pour chaque phase

1. **Lire** le contenu du fichier prompt (ex: `01_NETTOYAGE.md`)
2. **Appeler** `mcp_task` avec :
   - `subagent_type` : l'agent de la liste ci-dessus
   - `prompt` : contenu complet du fichier prompt + instructions
   - `description` : "Phase X — [nom court]"

Exemple pour la phase 01 :

```
mcp_task(
  subagent_type="context-specialist",
  description="Phase 01 — Nettoyage projet",
  prompt="[Contenu de 01_NETTOYAGE.md]

Exécute cet audit EN ENTIER. Produis le livrable dans AUDIT_BETON/01_NETTOYAGE.md.
GATE : PASS ou FAIL à la fin."
)
```

### Ordre strict

```
01 → 02 → 03 → 04 → 05 → 06 → 07 → 08 → 09 → 10
```

Chaque phase ne démarre que si la précédente a **GATE : PASS**.

### Si un prompt n'existe pas (09, 10)

Les phases 09 et 10 peuvent être dérivées du master :
- **09** : Perf backend, frontend, bundle
- **10** : Scorecard, plan d'action, verdict PRÊT PROD / NON PRÊT

---

## Règles absolues (du master)

- Lire chaque fichier de la première à la dernière ligne
- Citer les numéros de ligne pour chaque observation
- Code complet uniquement (jamais "à adapter")
- GATE binaire (PASS/FAIL) à la fin de chaque phase

---

## Vérification finale

L'audit est terminé quand :

- `npm run build` → 0 erreur
- `pytest tests/` → 0 fail
- `npm run test` → 0 fail
- `make validate-all` → vert

---

## Lancement rapide

**Option 1** — Via Cursor :
`Cmd/Ctrl + K` → "audit beton" → Exécuter cette commande

**Option 2** — Via script :
`./scripts/run-audit-beton.ps1` (exécute INIT + affiche le prompt à lancer)
