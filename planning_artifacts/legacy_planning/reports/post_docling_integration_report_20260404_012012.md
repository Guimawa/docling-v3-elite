# Post-Docling Integration Report

- Date: 2026-04-04T01:20:12.4047977+02:00
- Base URL: http://127.0.0.1:8001
- Allowed Origin: https://pronto-staging.example
- Denied Origin: https://evil.example
- Service Key test value: docling-test-service-key

| Check | Status | Details |
|---|---|---|
| health | PASS | GET /health = 200 |
| service_key_invalid | PASS | Invalid X-Service-Key rejected with 401 |
| service_key_valid | PASS | Valid X-Service-Key accepted |
| cors_allowed_origin | PASS | Preflight allows configured origin |
| cors_denied_origin | PASS | Denied origin not whitelisted |
| auth_register | PASS | Register returned 200 |
| auth_login | PASS | Login returned 200 |
| observability_summary | PASS | Summary endpoint reachable with user session |

- PASS: 8
- FAIL: 0

Verdict: GO (local integration checks green)
