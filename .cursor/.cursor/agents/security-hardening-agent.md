# Security Hardening Agent — Rate Limit Vitals

## Identité
- **ID**: security-hardening-agent-002
- **Spécialité**: API security, rate limiting, OWASP
- **Owner**: Security Reviewer
- **Durée**: 2h (S1)

## Mission Précise
Ajouter rate limit 60/minute sur endpoint POST /api/vitals pour éviter spam pollution DB.

## Contexte
Endpoint POST /api/vitals (Web Vitals logging) est public (pas d'auth) → vulnérable spam → coût Neon + pollution analytics.

## Tâches Détaillées
```yaml
1. Analyse Existante:
   - [ ] Read apps/api/main.py ligne 823-843 (endpoint POST /api/vitals)
   - [ ] Vérifier rate limiter config: ligne 80 (Limiter instance)
   - [ ] Vérifier autres endpoints publics rate limited: grep "@limiter.limit" apps/api/main.py

2. Implémentation Rate Limit:
   - [ ] Éditer apps/api/main.py ligne 823:
     ```python
     @app.post("/api/vitals")
     @limiter.limit("60/minute")  # ← AJOUTER cette ligne
     async def log_vitals(
         request: Request,
         metric: str = Form(...),
         value: float = Form(...),
         url: str = Form(default=""),
     ):
         # ... reste du code inchangé
     ```

3. Tests Locaux:
   - [ ] Start API: cd apps/api && uv run uvicorn main:app --reload
   - [ ] Test rate limit: bash script:
     ```bash
     #!/bin/bash
     for i in {1..65}; do
       curl -X POST http://localhost:8000/api/vitals \
         -F "metric=LCP" \
         -F "value=1.5" &
     done
     wait
     # Expected: 60 success (200), 5 rate limited (429)
     ```
   - [ ] Vérifier response 429: {"detail": "Trop de tentatives. Réessayez dans quelques instants."}

4. Tests Unitaires:
   - [ ] Créer apps/api/tests/security/test_vitals_rate_limit.py:
     ```python
     import pytest
     from httpx import AsyncClient

     @pytest.mark.asyncio
     async def test_vitals_rate_limit_enforced(api_client: AsyncClient):
         # Send 65 requests rapidly
         responses = []
         for _ in range(65):
             resp = await api_client.post("/api/vitals", data={
                 "metric": "LCP", "value": 1.5
             })
             responses.append(resp.status_code)

         # Assert: at least 60 success, at least 1 rate limited
         assert responses.count(200) >= 60
         assert 429 in responses

     @pytest.mark.asyncio
     async def test_vitals_rate_limit_reset_after_minute():
         # Wait 61s, try again → should succeed
         pass
     ```
   - [ ] Run: pytest tests/security/test_vitals_rate_limit.py -v

5. Security Review:
   - [ ] Review autres endpoints publics:
     - GET /health → OK (health check, pas de limite)
     - GET / → OK (redirect /docs)
     - POST /api/v1/auth/login → TODO: ajouter rate limit 10/minute (prevent brute force)
     - POST /api/v1/auth/register → TODO: ajouter rate limit 5/minute (prevent spam accounts)
   - [ ] Créer ticket follow-up: "Add rate limits auth endpoints" (Phase 4 security audit)

6. Documentation:
   - [ ] Update docs/api/rate-limits.md (créer si absent):
     ```markdown
     # Rate Limits

     | Endpoint | Limit | Reason |
     |----------|-------|--------|
     | POST /api/v1/invoices/process | 20/min | Extraction IA coûteuse |
     | POST /api/vitals | 60/min | Prevent spam analytics |
     | POST /api/v1/auth/login | 10/min | Brute force protection |
     | POST /api/v1/auth/register | 5/min | Spam accounts prevention |

     Rate limit exceeded → HTTP 429 JSON response.
     ```

7. Deploy:
   - [ ] Git branch: git checkout -b security/rate-limit-vitals
   - [ ] Commit: git commit -m "security(api): add rate limit 60/min POST /api/vitals"
   - [ ] PR → Review Security Reviewer
   - [ ] Merge → staging → wait 24h → prod

8. Monitoring:
   - [ ] Sentry: Vérifier pas de spike errors 429 (légitime traffic bloqué)
   - [ ] Logs: grep "429" logs/api.log → analyser IPs si suspicious
   - [ ] Analytics: Vérifier volume Web Vitals stable (pas de perte données légitimes)
```

## Livrables
1. ✅ Code rate limit (1 ligne ajoutée main.py)
2. ✅ Tests unitaires (test_vitals_rate_limit.py)
3. ✅ Documentation (docs/api/rate-limits.md)
4. ✅ Ticket follow-up (auth endpoints rate limits)

## Métriques Succès
- Rate limit actif: 100% (tests pass)
- False positives: 0 (users légitimes bloqués)
- Spam vitals réduit: -95% (baseline vs post-deploy)

## Risques
- **Risque**: 60/min trop strict (mobile app multi-pages)
  **Mitigation**: Monitor analytics 1 semaine, ajuster 120/min si needed

## Communication
- **S1 Jour 1**: Slack #tech-security "Rate limit vitals deployed staging"
- **S1 Fin**: Screenshot test curl (60 OK, 5x 429)
