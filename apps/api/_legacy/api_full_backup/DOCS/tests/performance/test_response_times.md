# test_response_times.py — Ce qu'on vérifie

**Fichier :** `tests/performance/test_response_times.py`
**Catégorie :** performance
**Ce qu'on teste :** Que les routes principales de l'API répondent dans des délais acceptables, mesurés statistiquement sur plusieurs appels répétés — pas juste une fois, mais en conditions proches de la réalité.

---

## Le code

```python
"""
Tests de performance — temps de réponse réels.
"""

import time

import pytest

pytestmark = [pytest.mark.performance, pytest.mark.slow]

SEUILS = {
    "p50_ms": 500,
    "p95_ms": 1500,
    "p99_ms": 3000,
    "n_iterations": 30,
}


def test_catalogue_response_times(http_client):
    """P50/P95/P99 sur GET /api/v1/catalogue."""
    times = []
    n = SEUILS["n_iterations"]
    for _ in range(n):
        start = time.perf_counter()
        resp = http_client.get("/api/v1/catalogue", params={"limit": 20})
        elapsed_ms = (time.perf_counter() - start) * 1000
        times.append(elapsed_ms)
        assert resp.status_code == 200

    times.sort()
    p50 = times[int(n * 0.50)]
    p95 = times[int(n * 0.95)] if n >= 20 else times[-1]
    p99 = times[int(n * 0.99)] if n >= 100 else times[-1]

    print(f"\nCatalogue (N={n}): P50={p50:.0f}ms P95={p95:.0f}ms P99={p99:.0f}ms")
    assert p50 < SEUILS["p50_ms"], f"P50 trop lent : {p50:.0f}ms"
    assert p95 < SEUILS["p95_ms"], f"P95 trop lent : {p95:.0f}ms"
    assert p99 < SEUILS["p99_ms"], f"P99 trop lent : {p99:.0f}ms"


def test_health_response_time(http_client):
    """Health check < 200ms."""
    times = []
    for _ in range(10):
        start = time.perf_counter()
        resp = http_client.get("/health")
        times.append((time.perf_counter() - start) * 1000)
        assert resp.status_code == 200
    avg = sum(times) / len(times)
    print(f"\nHealth avg: {avg:.0f}ms")
    assert avg < 200
```

---

## Ce que ces tests vérifient — en clair

### Les percentiles — P50, P95, P99 : c'est quoi ?

Avant de lire les tests, il faut comprendre ce vocabulaire statistique, car c'est le coeur de ces tests.

Imaginons qu'on envoie 30 requêtes à l'API et qu'on mesure le temps de chaque réponse. On trie les résultats du plus rapide au plus lent :

- **P50 (médiane)** : La 15e valeur sur 30. La moitié des requêtes sont plus rapides, l'autre moitié plus lentes. C'est le temps "normal".
- **P95** : La 28e valeur sur 30. 95% des requêtes sont plus rapides que ça. C'est le temps dans les cas "pas de chance".
- **P99** : La 30e valeur sur 30 (dans notre cas). 99% des requêtes sont plus rapides. C'est le temps dans les pires cas.

**Pourquoi ne pas juste mesurer la moyenne ?** La moyenne est trompeuse. Si 29 requêtes prennent 100ms et une seule prend 10 secondes, la moyenne est ~430ms — elle cache le cas extrême. Les percentiles, eux, révèlent les cas anormaux.

---

### `test_catalogue_response_times`

Ce test envoie 30 fois la même requête (`GET /api/v1/catalogue?limit=20`), mesure le temps de chaque réponse, et vérifie que les percentiles restent sous les seuils définis :

| Percentile | Seuil maximum |
|-----------|---------------|
| P50       | 500 ms        |
| P95       | 1 500 ms      |
| P99       | 3 000 ms      |

**Lecture en langage courant :**
- La moitié du temps, l'API doit répondre en moins de 500ms.
- Dans 95% des cas, elle doit répondre en moins de 1,5 seconde.
- Dans le pire cas sur 30 essais, elle ne doit jamais dépasser 3 secondes.

**Note technique sur le calcul de P99 :** Avec seulement 30 requêtes, `int(30 * 0.99) = 29` pointe sur la 29e valeur (index 0-basé), soit l'avant-dernière. Ce n'est pas un vrai P99 statistique — pour ça il faudrait 100 requêtes minimum. Le code le reconnaît (`if n >= 100 else times[-1]`) : avec moins de 100 mesures, P99 utilise le maximum observé.

---

### `test_health_response_time`

Ce test envoie 10 requêtes au endpoint `/health` (un endpoint minimal qui vérifie que le serveur est vivant) et vérifie que la **moyenne** est inférieure à 200ms.

**Pourquoi 200ms pour le health check ?** Ce endpoint ne fait quasiment rien — pas de requête DB, pas de traitement. S'il est lent, cela indique un problème au niveau du serveur lui-même (overhead réseau, surcharge, mauvaise configuration). 200ms est un seuil généreux pour ce type de route.

**Différence avec le test précédent :** Ici on utilise la **moyenne** et non les percentiles. C'est moins rigoureux statistiquement (10 mesures, moyenne), mais suffisant pour un endpoint aussi simple.

---

### Les marqueurs `pytest.mark.performance` et `pytest.mark.slow`

La ligne `pytestmark = [pytest.mark.performance, pytest.mark.slow]` ajoute des étiquettes à tous les tests de ce fichier. Cela permet d'exclure ces tests des exécutions rapides habituelles :

```bash
# Exécuter TOUS les tests sauf les lents :
pytest -m "not slow"

# Exécuter UNIQUEMENT les tests de performance :
pytest -m performance
```

Ces tests prennent plusieurs secondes (30 requêtes × ~quelques centaines de ms), donc on ne veut pas les lancer à chaque modification de code.

---

## Pourquoi c'est important

Sans mesures de performance, une régression peut s'installer progressivement et imperceptiblement. Un développeur ajoute une requête SQL non optimisée, le temps de réponse passe de 100ms à 800ms — personne ne s'en aperçoit immédiatement. Avec ces tests :

- **Une régression de performance est détectée automatiquement** en CI/CD.
- **Les contrats de performance sont documentés** dans le code : on sait explicitement ce qu'on s'est engagé à respecter.
- **La dégradation cloud est visible** : si Neon (la base PostgreSQL cloud) ralentit, ou si Render (l'hébergement) subit une charge, ces tests le signalent.

Pour les artisans BTP qui utilisent l'application sur mobile (PWA), une API lente est particulièrement pénalisante — leur connexion internet sur les chantiers est souvent limitée.

---

## Peut-on améliorer ces tests ?

**Points forts actuels :**
- L'utilisation de percentiles (plutôt que la moyenne seule) est la bonne approche pour mesurer les performances.
- Les seuils sont centralisés dans le dictionnaire `SEUILS`, faciles à ajuster.
- Les marqueurs pytest permettent d'isoler ces tests.
- L'affichage des valeurs mesurées (`print(...)`) aide au diagnostic.

**Améliorations possibles :**

1. **30 itérations est insuffisant pour un vrai P99.** Le code lui-même le reconnaît. Il faudrait 100 itérations pour avoir un P99 statistiquement significatif. Le compromis actuel (vitesse vs précision) est acceptable, mais devrait être documenté clairement.

2. **Ces tests mesurent le temps depuis le client de test, pas le temps serveur réel.** Le `http_client` de pytest tourne dans le même processus que le serveur (ou via HTTP local), ce qui peut fausser les mesures par rapport à un vrai client réseau.

3. **Les tests de performance ne sont pas isolés du bruit environnemental.** Si la machine qui exécute les tests est chargée (autre processus, CI/CD partagé), les temps mesurés seront artificiellement élevés. Une marge ou une tolérance devrait être prévue.

4. **Aucun test sur des routes critiques comme `/api/v1/catalogue/batch`.** L'insertion d'un lot de produits est probablement plus lente que la lecture du catalogue — ce serait pertinent à mesurer aussi.

5. **Les seuils sont fixes et non contextuels.** En environnement local, 500ms P50 est peut-être trop strict. En production avec Neon cloud, c'est peut-être trop permissif. Des profils de seuils selon l'environnement (local / CI / production) rendraient ces tests plus utiles.

6. **Le test `test_health_response_time` utilise la moyenne au lieu des percentiles.** Pour cohérence avec le test précédent, et pour une meilleure robustesse statistique, les percentiles seraient préférables même pour ce test simple.
