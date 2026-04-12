# Docling — orchestrateur audit senior 2026

**Rôle** : piloter l’atteinte de **`REFERENCE-AUDIT-SENIOR.md`** (cadre + synthèse + vérif + plan) et du SKILL projet **`.agents/skills/docling-audit-senior-2026/SKILL.md`**.

## Ordre de travail

0. **Certitude immédiate (avant tout Task d’audit)** : `python scripts/certify_audit_stack_now.py` — **SUCCÈS** requis.
1. **Pour la famille concernée** : `python scripts/build_audit_prompt_bundle.py --family <clé>` — coller **tout** le stdout dans le prompt utilisateur (injection du texte des SKILL dans le contexte ; voir `ORCHESTRATION-AGENTS-SENIOR-2026.md` § *Processus bundle + SHA*).
2. Lire le **SKILL** `docling-audit-senior-2026` (Definition of Done).
3. Lancer un **sous-agent Task** + gabarit **ORCHESTRATION-AGENTS-SENIOR-2026.md** + **PROMPT-TASK-TEMPLATE.txt** (le bundle précède toujours le Task).
4. Écrire le livrable sous `audit/docling-micro/rapports/FAMILLE-NN-…-lot-….md` (Méta avec **SKILL fichier (SHA256)** = ligne du bundle).
5. **Sans quitter la session** : `python scripts/validate_audit_family_reports.py --check-orchestration-paths` jusqu’à **exit 0**.
6. Lancer l’agent **gatekeeper** pour mettre à jour **REFERENCE-AUDIT-SENIOR.md** (§ 2 Synthèse, § 1 matrice si besoin).

## Familles souvent hors périmètre Docling

- **11 / 12** : paiements / email — rapport « hors périmètre » si aucun code.
- **19** : spécialisations (jeu, IoT…) — hors périmètre sauf demande explicite.

## Références

- Référence unique : `orchestrator/workspace/audit/docling-micro/REFERENCE-AUDIT-SENIOR.md`
- Traçabilité agents : `…/ORCHESTRATION-AGENTS-SENIOR-2026.md`
