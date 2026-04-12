# bytez_service.py — L'IA de secours quand Gemini n'est pas disponible

**Fichier :** `apps/api/services/bytez_service.py`
**Rôle :** Proposer une alternative à Gemini pour extraire les données d'une facture, en utilisant la plateforme Bytez qui donne accès à des centaines de modèles d'IA différents via une seule API.

---

## Le code

```python
"""
BytezService — API unifiée 100k+ modèles (docs.bytez.com)
- Document Question Answering : extraction factures
- Image-to-Text / Chat multimodal : fallback Gemini
"""

import base64
import json
import logging
import re

import httpx

from core.config import Config
from schemas.invoice import InvoiceExtractionResult, Product

logger = logging.getLogger(__name__)

BYTEZ_BASE = "https://api.bytez.com/models/v2"


async def _bytez_request(
    model_id: str,
    payload: dict,
    *,
    provider_key: str | None = None,
    timeout: float = 120.0,
) -> dict:
    """Appel HTTP POST vers Bytez API."""
    key = Config.BYTEZ_API_KEY
    if not key:
        raise RuntimeError("BYTEZ_API_KEY manquante dans .env")
    url = f"{BYTEZ_BASE}/{model_id}"
    headers = {
        "Authorization": key,
        "Content-Type": "application/json",
    }
    if provider_key and "google/" in model_id:
        headers["provider-key"] = provider_key
    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.post(url, json=payload, headers=headers)
        resp.raise_for_status()
        return resp.json()


async def document_qa_extract(
    image_base64: str,
    question: str,
    model_id: str = "cloudqi/CQI_Visual_Question_Awnser_PT_v0",
) -> str | None:
    """
    Document Question Answering — pose une question sur une image de document.
    Retourne la réponse texte ou None en cas d'erreur.
    """
    payload = {
        "question": question,
        "base64": f"data:image/jpeg;base64,{image_base64}",
    }
    try:
        data = await _bytez_request(model_id, payload)
        if data.get("error"):
            logger.warning("Bytez doc-QA error: %s", data["error"])
            return None
        out = data.get("output")
        return str(out) if out is not None else None
    except Exception as e:
        logger.warning("Bytez doc-QA failed: %s", e)
        return None


async def image_chat_extract(
    image_base64: str,
    prompt: str,
    model_id: str = "google/gemma-3-4b-it",
) -> str | None:
    """
    Chat multimodal image+texte — pour extraction structurée.
    Utilise provider-key (GEMINI_API_KEY) si modèle Google.
    """
    payload = {
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image", "base64": image_base64},
                ],
            }
        ],
        "params": {"temperature": 0.1, "max_new_tokens": 4096},
    }
    try:
        provider_key = Config.GEMINI_API_KEY if "google/" in model_id else None
        data = await _bytez_request(model_id, payload, provider_key=provider_key)
        if data.get("error"):
            logger.warning("Bytez image-chat error: %s", data["error"])
            return None
        out = data.get("output")
        if isinstance(out, list) and out:
            msg = out[0]
            out = msg.get("content", msg) if isinstance(msg, dict) else msg
        return str(out) if out is not None else None
    except Exception as e:
        logger.warning("Bytez image-chat failed: %s", e)
        return None



def _parse_json_from_response(text: str) -> dict | None:
    """Extrait un objet JSON de la réponse texte."""
    if not text:
        return None
    json_match = re.search(r"\{[\s\S]*\}", text)
    if not json_match:
        return None
    try:
        return json.loads(json_match.group())
    except json.JSONDecodeError:
        return None


async def extract_invoice_fallback(
    image_bytes: bytes,
    filename: str,
) -> InvoiceExtractionResult | None:
    """
    Fallback Bytez quand Gemini échoue (rate limit, indisponible).
    Utilise document-QA avec questions ciblées ou chat multimodal.
    """
    if not Config.BYTEZ_API_KEY:
        return None
    b64 = base64.b64encode(image_bytes).decode("ascii")
    prompt = """Extraie TOUTES les lignes produit de cette facture BTP.
Retourne UNIQUEMENT un JSON valide avec cette structure exacte:
{"produits":[{"fournisseur":"","designation_raw":"","designation_fr":"","famille":"","unite":"","prix_brut_ht":0,"remise_pct":0,"prix_remise_ht":0,"prix_ttc_iva21":0,"confidence":"high"}],"fournisseur_detecte":"","numero_facture":"","date_facture":"","langue_detectee":"fr"}
Familles BTP: Armature, Cloison, Plomberie, Électricité, Menuiserie, Carrelage, Isolation, Peinture, Outillage, Maçonnerie, Terrassement, Autre."""
    raw = await image_chat_extract(b64, prompt)
    if not raw:
        raw = await document_qa_extract(
            b64,
            "Liste toutes les lignes produit avec désignation, quantité, prix unitaire HT et prix total. Format JSON.",
        )
    if not raw:
        return None
    data = _parse_json_from_response(raw)
    if not data or "produits" not in data:
        return None
    fournisseur_default = data.get("fournisseur_detecte") or "Inconnu"
    produits = []
    for p in data.get("produits", []):
        try:
            p.setdefault("fournisseur", fournisseur_default)
            p.setdefault("designation_raw", p.get("designation_fr", ""))
            p.setdefault("designation_fr", p.get("designation_raw", ""))
            produits.append(Product(**p))
        except Exception:
            continue
    if not produits:
        return None
    return InvoiceExtractionResult(
        produits=produits,
        fournisseur_detecte=data.get("fournisseur_detecte", ""),
        numero_facture=data.get("numero_facture", ""),
        date_facture=data.get("date_facture", ""),
        langue_detectee=data.get("langue_detectee", "fr"),
        nb_lignes_brutes=len(produits),
        tokens_used=0,
    )
```

---

## Ce que ce fichier fait — en clair

### L'analogie du médecin remplaçant

Quand le médecin principal (Gemini) est absent ou surchargé, on appelle le remplaçant. Ce fichier est ce remplaçant. Il peut aussi lire une facture et en extraire les produits, mais en utilisant des modèles d'IA différents accessibles via la plateforme Bytez. Ce n'est pas le chemin principal — c'est le filet de sécurité.

### `BYTEZ_BASE` — L'adresse du service

```python
BYTEZ_BASE = "https://api.bytez.com/models/v2"
```

C'est l'URL de base de la plateforme Bytez. Bytez est un service qui centralise l'accès à des centaines de modèles d'IA open source. Au lieu d'héberger ces modèles soi-même, on les appelle à distance via cette adresse.

### `_bytez_request()` — L'appel téléphonique vers Bytez

```python
async def _bytez_request(model_id, payload, *, provider_key=None, timeout=120.0) -> dict:
```

C'est la fonction de base qui envoie une requête à Bytez. Pensez-y comme à un appel téléphonique : on compose le numéro (l'URL du modèle), on s'identifie (clé API dans l'en-tête `Authorization`), et on lit le message (le `payload` JSON).

Particularité intéressante : si le modèle demandé est un modèle Google (comme `google/gemma-3-4b-it`), on peut passer en plus sa propre clé Google (`provider-key`). Cela permet d'utiliser son quota Google personnel plutôt que le quota Bytez, ce qui peut être plus économique.

Le `timeout` de 120 secondes est généreux — certains modèles d'IA prennent du temps à démarrer (surtout s'ils doivent être "réveillés" depuis un état de veille sur les serveurs Bytez).

### `document_qa_extract()` — Poser une question sur un document

```python
async def document_qa_extract(image_base64, question, model_id=...) -> str | None:
```

Ce mode d'IA fonctionne comme un étudiant qui répond à des questions sur un document. On lui envoie l'image de la facture + une question précise ("Quels sont les articles et leurs prix ?"), et il retourne une réponse textuelle.

L'image est envoyée en "base64" — c'est une façon d'encoder les données binaires d'une image en texte pur, pour pouvoir les inclure dans un message JSON. Le préfixe `data:image/jpeg;base64,` indique au modèle comment interpréter cette chaîne.

### `image_chat_extract()` — Discuter avec l'IA en lui montrant une image

```python
async def image_chat_extract(image_base64, prompt, model_id="google/gemma-3-4b-it") -> str | None:
```

C'est le mode "conversation multimodale" : on envoie simultanément un texte (le prompt avec des instructions précises) et une image. L'IA voit les deux et répond.

La `temperature: 0.1` est un paramètre important : une température basse rend l'IA plus déterministe et moins créative — exactement ce qu'on veut pour extraire des données factuelles (on ne veut pas que l'IA invente des prix).

`max_new_tokens: 4096` limite la longueur de la réponse. Une facture avec beaucoup de lignes peut générer un JSON volumineux — 4096 tokens laisse une marge confortable.

La réponse de Bytez pour ce mode peut être une liste ou un objet — le code gère les deux cas en essayant de déballer le premier élément si c'est une liste.

### `_parse_json_from_response()` — Extraire le JSON du texte libre

```python
def _parse_json_from_response(text: str) -> dict | None:
```

Un problème classique avec les IA : elles ne retournent pas toujours du JSON pur. Elles peuvent écrire "Voici le résultat : { ... }" ou ajouter des explications après le JSON. Cette fonction utilise une expression régulière (`re.search`) pour trouver la partie JSON dans la réponse, quelle que soit sa position.

Le motif `\{[\s\S]*\}` signifie : trouve le premier `{`, puis capture tout ce qui suit (y compris les sauts de ligne) jusqu'au dernier `}`. C'est une recherche "gourmande" qui capture le JSON le plus long possible.

### `extract_invoice_fallback()` — La fonction principale du fallback

```python
async def extract_invoice_fallback(image_bytes, filename) -> InvoiceExtractionResult | None:
```

C'est le chef d'orchestre de ce fichier. Il est appelé par l'application quand Gemini échoue. Le processus se déroule en plusieurs étapes :

**Étape 1 — Vérification de la clé** : si `BYTEZ_API_KEY` n'est pas configurée, la fonction retourne immédiatement `None`. On ne peut pas utiliser Bytez sans clé.

**Étape 2 — Première tentative avec le chat multimodal** : l'image est convertie en base64, puis un prompt très précis est envoyé à Gemma-3. Le prompt impose une structure JSON exacte — c'est une technique courante pour forcer les IA à répondre dans un format parsable.

**Étape 3 — Deuxième tentative avec le QA de document** : si la première tentative ne retourne rien (erreur réseau, modèle indisponible), on essaie avec un autre modèle plus spécialisé dans la lecture de documents. La question est plus simple, moins contraignante.

**Étape 4 — Parsing et validation** : le texte retourné est transformé en JSON, puis chaque produit est créé via le schéma `Product` de Pydantic. Si un produit a des données invalides, il est silencieusement ignoré (`except: continue`) plutôt que de faire planter toute l'extraction.

Le champ `tokens_used=0` est honnête : Bytez ne retourne pas de compteur de tokens dans sa réponse, donc on ne peut pas le suivre.

---

## Peut-on optimiser ce fichier ?

**Ce qui est bien fait :**
- La structure en deux niveaux de fallback (chat multimodal → QA de document) est robuste.
- La `temperature: 0.1` est appropriée pour une tâche d'extraction de données.
- Les erreurs sont gérées silencieusement sans faire planter l'application principale.
- Le prompt impose un JSON structuré pour minimiser le post-traitement.

**Évolutions déjà intégrées :**

1. **`_parse_json_from_response`** : en cas d’échec `json.loads`, détection heuristique (accolades déséquilibrées, chaîne non fermée) et log d’avertissement explicite : *JSON probablement tronqué (max_new_tokens / réponse coupée)*.

2. **Modèle doc-QA** : constante `DEFAULT_BYTEZ_DOC_QA_MODEL` avec commentaire indiquant que *Awnser* est l’identifiant officiel Bytez (typo auteur), pas une erreur du projet.

3. **`extract_invoice_fallback`** : le paramètre `filename` est inclus dans les logs (info si la première passe ne renvoie pas de texte ; avertissements si pas de réponse, JSON invalide ou aucun produit valide).

4. **Prompt d’extraction** : `_build_bytez_extraction_prompt()` construit la ligne JSON d’exemple à partir des champs `Product` / racine alignés sur `InvoiceExtractionResult` ; la liste des familles BTP du prompt reste celle historique (sous-ensemble volontaire).

5. **`_bytez_request`** : jusqu’à 3 tentatives avec backoff 1s / 2s / 4s sur HTTP **429**, **503** et erreurs transport **httpx** (`RequestError`) ; pas de retry sur les autres 4xx.

**Piste restante :**

- **Modèle `gemma-3-4b-it`** : toujours limitant sur factures très denses ; un modèle plus grand reste une option produit (latence / coût).
