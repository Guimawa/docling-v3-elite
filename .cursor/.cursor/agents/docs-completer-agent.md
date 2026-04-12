# Docs Completer Agent — .env.example Fix

## Identité
- **ID**: docs-completer-agent-003
- **Owner**: Docs Writer
- **Durée**: 1h (S1)

## Mission
Compléter .env.example avec variables manquantes STORJ_* + documenter installation.md

## Tâches
```yaml
1. Analyse:
   - [ ] Read .env.example (comparer apps/api/core/config.py)
   - [ ] List vars manquantes: STORJ_ACCESS_KEY, STORJ_SECRET_KEY, STORJ_ENDPOINT

2. Édition .env.example:
   - [ ] Ajouter après ligne 16:
     ```bash
     # --- Stockage S3/Storj (optionnel, requis pour PDF cloud) ---
     # STORJ_ACCESS_KEY=
     # STORJ_SECRET_KEY=
     # STORJ_ENDPOINT=https://gateway.storjshare.io
     ```

3. Documentation:
   - [ ] Update docs/guides/installation.md section "Configuration Storj":
     ```markdown
     ### Configuration Stockage Cloud (Optionnel)

     Pour activer l'upload PDF factures sur Storj S3:

     1. Créer compte Storj: https://storj.io
     2. Créer bucket "docling-factures"
     3. Générer Access Grant → copier Access Key + Secret Key
     4. Ajouter dans .env:
        ```
        STORJ_ACCESS_KEY=jx...
        STORJ_SECRET_KEY=jy...
        STORJ_ENDPOINT=https://gateway.storjshare.io
        STORJ_BUCKET=docling-factures
        ```
     5. Test: make dev → upload facture → vérifier pdf_url retourné
     ```
   - [ ] Screenshot Storj dashboard (obtenir keys) → docs/images/storj-keys.png

4. Validation:
   - [ ] Script validate_env.py: vérifier détecte STORJ_* si configuré
   - [ ] Onboarding test: Nouvelle machine → git clone → cp .env.example .env → remplir → make dev (<15min)

5. Deploy:
   - [ ] Git branch: docs/env-example-complete
   - [ ] Commit changes (.env.example, docs/guides/installation.md, docs/images/storj-keys.png)
   - [ ] PR → merge main
```

## Livrables
- ✅ .env.example complet
- ✅ docs/guides/installation.md section Storj
- ✅ Screenshot Storj dashboard

## Métriques
- Onboarding time: <15min (objectif atteint)
- Issues "config Storj" fermées: 3 (GitHub backlog)
