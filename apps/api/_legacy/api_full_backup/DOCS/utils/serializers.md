# serializers.py — Le traducteur entre la base de données et le format web

**Fichier :** `apps/api/utils/serializers.py`
**Rôle :** Convertir les données issues de la base de données PostgreSQL en un format que le navigateur web peut lire — notamment en transformant les dates et les nombres décimaux en texte standard.

---

## Le code

Voir le fichier source `utils/serializers.py` — en résumé :

- `_serialize_val(v: Any) -> Any` : typage explicite, récursion sur `dict` / `list` / `tuple`.
- `Decimal` → `str` (montants ; le front peut utiliser Decimal.js).
- `uuid.UUID` → `str`.
- `date` / `datetime` → ISO string.
- `bool` traité avant `int` (évite la confusion `bool` ⊂ `int` en Python).

---

## Ce que ce fichier fait — en clair

### L'analogie du douanier linguistique

Quand la base de données PostgreSQL retourne des données, elle les envoie dans son propre langage interne : les dates sont des objets Python spéciaux, les prix sont des "Decimal" (un type de nombre ultra-précis), les timestamps ont leur propre format. Le navigateur web, lui, ne parle que JSON — un format texte simple. Ce fichier fait office de traducteur à la frontière entre les deux : il reçoit les données "en langage base de données" et les renvoie "en langage JSON".

### Pourquoi le JSON ne comprend pas tout ?

Le format JSON, utilisé pour communiquer entre le serveur et le navigateur, est volontairement simple. Il ne connaît que :
- Les textes (`"bonjour"`)
- Les nombres (`42`, `3.14`)
- Les booléens (`true`, `false`)
- Les listes (`[1, 2, 3]`)
- Les objets (`{"clé": "valeur"}`)
- La valeur nulle (`null`)

La date `2024-03-15` n'est pas un nombre ni du texte pour Python — c'est un objet `date` avec des propriétés (jour, mois, année). Le nombre `3.14159265358979...` peut être stocké en base avec une précision de 28 chiffres dans un `Decimal`. Ces types "riches" n'ont pas d'équivalent direct en JSON — il faut les convertir avant de les envoyer.

### `_serialize_val()` — Le traducteur valeur par valeur

Signature : `_serialize_val(v: Any) -> Any` (structures imbriquées incluses).

**Règle 1 — `None` → `null` JSON.**

**Règle 2 — `UUID` → chaîne** (identifiants asyncpg).

**Règle 3 — `bool` avant `int`** : en Python, `bool` est une sous-classe de `int` ; on renvoie les booléens sans les confondre avec `0`/`1`.

**Règle 4 — `date` / `datetime` → ISO string** via `.isoformat()`.

**Règle 5 — `Decimal` → `str`** : pas de perte binaire ; le navigateur peut parser avec `Decimal.js` ou `parseFloat` pour l’affichage simple.

**Règle 6 — `dict` / `list` / `tuple`** : parcours récursif (champs JSONB, tableaux imbriqués).

**Règle 7 — `int` / `float` / `str`** : inchangés.

**Règle 8 — autre type avec `isoformat()`** : utilisé si présent.

**Règle 9 — types avec `__float__` exotiques** : conversion `float` (hors `Decimal` déjà traité).

**Défaut** : valeur retournée telle quelle si déjà JSON-compatible.

### `serialize_row()` — Le traducteur ligne par ligne

```python
def serialize_row(row: dict) -> dict:
```

C'est la fonction publique, celle que le reste de l'application utilise. Elle prend un dictionnaire (une ligne de résultat de base de données), applique `_serialize_val` sur chaque valeur, et retourne un **nouveau** dictionnaire — elle ne modifie jamais l'original.

Ce point est important : "Does not mutate in-place" signifie que si tu appelles `serialize_row(mon_dict)`, `mon_dict` reste inchangé. C'est une bonne pratique pour éviter les effets de bord surprenants.

La gestion `(row or {})` est une protection discrète : si `row` est `None` (ce qui peut arriver quand une requête SQL ne trouve aucun résultat), la fonction retourne un dictionnaire vide plutôt que de planter.

---

## Peut-on optimiser ce fichier ?

**Ce qui est bien fait :**
- Le fichier est court, focalisé sur une seule responsabilité : la sérialisation.
- Il ne modifie pas l'objet original — bon respect du principe d'immutabilité.
- La règle 5 (types numériques exotiques) est une protection utile contre les surprises d'asyncpg.
- La gestion de `None` en entrée de `serialize_row` évite les plantages silencieux.

**Améliorations appliquées (2026-03) :**

1. **Decimal → `str`** pour les montants.
2. **Récursion** sur `dict` / `list` / `tuple`.
3. **Typage** `_serialize_val(v: Any) -> Any` (sortie peut être imbriquée).
4. **`uuid.UUID` → `str`** explicite.
5. **Tests** : `tests/test_serializers.py` (9 cas : None, UUID, bool/int, dates, Decimal, imbrication, `serialize_row`).
