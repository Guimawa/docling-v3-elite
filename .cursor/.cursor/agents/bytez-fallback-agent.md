# Bytez Fallback Agent — API Unifiée 100k+ Modèles

## Identité
- **ID**: bytez-fallback-agent-008
- **Spécialité**: API integration, fallback mechanisms, error handling
- **Owner**: Backend Lead
- **Durée**: 2 jours (S7)

## Mission Précise
Intégrer BytezService dans orchestrator.py comme fallback si Gemini down/rate limited.

## Contexte
BytezService existe (apps/api/services/bytez_service.py) mais jamais appelé.
Besoin : Resilience extraction IA (Gemini 99.9% uptime, mais si incident → fallback).

## Tâches Détaillées
```yaml
1. Analyse Existante:
   - [ ] Read apps/api/services/bytez_service.py (comprendre API)
   - [ ] Read apps/api/core/orchestrator.py ligne 62-85 (extract Gemini)
   - [ ] Vérifier BYTEZ_API_KEY config (apps/api/core/config.py)

2. Modification Orchestrator:
   - [ ] Éditer apps/api/core/orchestrator.py:
     ```python
     # Ligne 62-85, remplacer:
     try:
         service = GeminiService.get_or_create(model_id=model_id)
         result = await service.extract_products_from_file(...)
         await _gemini_cb.record_success()

     except Exception as gemini_err:
         logger.warning(f"Gemini extraction failed: {gemini_err}")

         # Fallback Bytez si configuré
         if Config.BYTEZ_API_KEY:
             logger.info("Trying Bytez fallback...")
             from services.bytez_service import BytezService
             bytez = BytezService(Config.BYTEZ_API_KEY)

             # asyncio.to_thread car BytezService sync
             result = await asyncio.to_thread(
                 bytez.extract_invoice,
                 processed_bytes,
                 filename
             )

             if result and result.get("fournisseur_detecte"):
                 logger.info("Bytez fallback OK")
                 # Tag Sentry pour monitoring
                 if sentry_sdk:
                     sentry_sdk.set_tag("extraction_provider", "bytez")
                 # Continue pipeline normalement
             else:
                 raise ValueError("Bytez extraction returned empty")
         else:
             # Pas de fallback configuré → re-raise
             logger.error("No Bytez API key, cannot fallback")
             raise gemini_err
     ```

3. BytezService Adaptation (si needed):
   - [ ] Vérifier apps/api/services/bytez_service.py:
     - extract_invoice() retourne InvoiceExtractionResult compatible ?
     - Si non : adapter format response → match Gemini output

4. Tests Mock Gemini Down:
   - [ ] Créer apps/api/tests/external_services/test_bytez_fallback.py:
     ```python
     import pytest
     from unittest.mock import patch, MagicMock
     from core.orchestrator import Orchestrator

     @pytest.mark.asyncio
     async def test_gemini_down_bytez_fallback():
         # Mock Gemini raise exception
         with patch('services.gemini_service.GeminiService.extract_products_from_file') as mock_gemini:
             mock_gemini.side_effect = Exception("Gemini 429 rate limit")

             # Mock Bytez success
             with patch('services.bytez_service.BytezService.extract_invoice') as mock_bytez:
                 mock_bytez.return_value = {
                     "fournisseur_detecte": "BigMat",
                     "produits": [{"designation_raw": "Test", ...}]
                 }

                 # Process file
                 with patch('core.config.Config.BYTEZ_API_KEY', 'test-key'):
                     result = await Orchestrator.process_file(
                         b"fake pdf bytes",
                         "test.pdf",
                         "gemini-3-flash-preview"
                     )

                 # Assert: Bytez called, result OK
                 assert mock_bytez.called
                 assert result["success"]
                 assert result["products_added"] > 0

     @pytest.mark.asyncio
     async def test_no_bytez_key_raises():
         with patch('services.gemini_service.GeminiService.extract_products_from_file') as mock_gemini:
             mock_gemini.side_effect = Exception("Gemini down")

             with patch('core.config.Config.BYTEZ_API_KEY', ''):
                 with pytest.raises(Exception, match="Gemini down"):
                     await Orchestrator.process_file(b"bytes", "test.pdf")
     ```

5. Documentation .env.example:
   - [ ] Ajouter .env.example:
     ```bash
     # --- Fallback IA (optionnel) ---
     # BYTEZ_API_KEY=  # API unifiée 100k+ modèles (docs.bytez.com)
     ```
   - [ ] Update docs/guides/installation.md section "Configuration Bytez Fallback"

6. Sentry Monitoring:
   - [ ] Tag "extraction_provider" : gemini / bytez / facturx
   - [ ] Alert si bytez_fallback utilisé >10% (indica Gemini instable)

7. Metrics:
   - [ ] Logger.info() avec timing:
     ```python
     logger.info(f"Extraction: provider={provider}, duration={duration}ms, products={count}")
     ```

8. Deploy:
   - [ ] Branch: feature/bytez-fallback-agent-008
   - [ ] PR → Review Backend Lead + Security (API key handling)
   - [ ] Staging: Test manuel (mock Gemini error → vérifier Bytez appelé)
   - [ ] Prod après validation

9. Runbook:
   - [ ] Créer docs/runbooks/gemini-incident.md:
     ```markdown
     # Incident Gemini Indisponible

     ## Symptômes
     - Sentry spike errors "Gemini 429" ou "Gemini timeout"
     - Extractions échouent massivement

     ## Actions
     1. Vérifier Gemini status: https://status.cloud.google.com
     2. Si incident confirmé:
        - Activer Bytez fallback (déjà auto si BYTEZ_API_KEY configuré)
        - Monitor Sentry tag "extraction_provider=bytez"
     3. Communication users (si >30min downtime)

     ## Rollback
     - Bytez fallback auto, pas d'action manuelle
     ```
```

## Livrables
1. ✅ Orchestrator.py fallback intégré
2. ✅ Tests mock Gemini down
3. ✅ Documentation .env.example + runbook
4. ✅ Sentry tags monitoring

## Métriques Succès
- Fallback success rate: 100% (tests)
- Bytez usage prod: <5% (Gemini stable)
- 0 data loss si Gemini incident

## Risques
- **Bytez API lent (>20s)** → Timeout 20s, message user "Extraction longue"
- **Bytez quota dépassé** → Escalade manuel, désactiver feature temporairement

## Communication
- S7 Jour 1: Tests mock pass
- S7 Fin: Runbook incident Gemini prêt
