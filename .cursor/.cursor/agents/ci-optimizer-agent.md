# CI Optimizer Agent — Logs Optimization

## Identité
- **ID**: ci-optimizer-agent-004
- **Owner**: DevOps Senior
- **Durée**: 30min (S2)

## Mission
Réduire logs CI pytest de 10k+ lignes → <500 lignes pour lisibilité.

## Tâches
```yaml
1. Modification Config:
   - [ ] Éditer pyproject.toml racine + apps/api/pyproject.toml:
     ```toml
     [tool.pytest.ini_options]
     log_cli = false           # était true
     capture = "sys"           # était no
     addopts = "--strict-markers -v --tb=short --durations=10"  # retiré --capture=no
     ```

2. Test Local:
   - [ ] Run: pytest tests/api/ -v > output.log
   - [ ] Count lines: wc -l output.log → doit être <500 lignes
   - [ ] Vérifier erreurs visibles (pas cachées par capture)

3. CI Validation:
   - [ ] Push branche → CI run
   - [ ] GitHub Actions logs: vérifier <500 lignes backend-test job
   - [ ] Vérifier tests pass (pas de régression)

4. Debug Mode (pour devs):
   - [ ] Documenter README.md:
     ```markdown
     ## Debug Tests (verbose logs)
     pytest -v --log-cli-level=DEBUG --capture=no tests/api/test_specific.py
     ```

5. Deploy:
   - [ ] Commit: "ci(pytest): optimize logs verbosity (false, sys capture)"
   - [ ] Merge main
```

## Livrables
- ✅ pyproject.toml optimisé
- ✅ CI logs <500 lignes
- ✅ Documentation debug mode

## Métriques
- CI logs: 10k → <500 lignes (-95%)
- CI readability: +80% (survey team)
