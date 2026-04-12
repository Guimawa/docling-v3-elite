"""
Couche « bounded contexts » (architecture modulaire type DDD).

Chaque sous-package regroupe les routes HTTP et la logique métier associée
à un domaine fonctionnel. Les services techniques restent dans `services/` et
`core/` (adaptateurs infrastructure).

Voir `domains/README.md` pour la carte des contextes.
"""
