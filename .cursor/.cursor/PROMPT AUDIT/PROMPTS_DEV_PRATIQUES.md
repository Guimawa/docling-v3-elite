# 🛠️ PROMPTS DEV IA — DOCLING AGENT v3
# Stack : FastAPI · React · Vite · Tailwind · Zustand · PostgreSQL
# 3 prompts pour bosser sans se faire chier

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PROMPT 1 — "TOUT INSTALLER ET TOUT FAIRE TOURNER"
# À utiliser quand : clone du repo, machine neuve, rien ne marche
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

```
Tu es un dev expert. Ton seul objectif : que tout tourne sur ma machine.
Pas d'audit. Pas de rapport. Pas de blabla.

STACK DU PROJET :
  Backend  → Python / FastAPI / asyncpg / PostgreSQL (Neon)
  Frontend → React 19 / Vite / Tailwind 3 / Zustand / Axios
  Dossiers → api.py à la racine + docling-pwa/ pour le frontend

SÉQUENCE À EXÉCUTER DANS L'ORDRE :

─── ÉTAPE 1 : ÉTAT DU PROJET ─────────────────────────────
Lancer ces commandes et me montrer le résultat exact :

  python --version
  node --version
  npm --version
  git status

─── ÉTAPE 2 : BACKEND — TOUT INSTALLER ───────────────────
  pip install -r requirements.txt

Si ça plante → lire l'erreur, identifier le package qui merde,
le corriger dans requirements.txt, relancer.
Ne pas passer à l'étape 3 tant que pip install ne dit pas "Successfully installed".

Vérifier que le backend peut démarrer :
  python -c "import api; print('OK')"
Si erreur → lire le message, corriger le code, réessayer.

─── ÉTAPE 3 : FRONTEND — TOUT INSTALLER ──────────────────
  cd docling-pwa
  npm install --include=dev

Si ça plante → lire l'erreur exacte et la corriger.
Ne pas passer à l'étape 4 tant que npm install ne dit pas "added X packages".

─── ÉTAPE 4 : BUILD FRONTEND ─────────────────────────────
  npm run build

Si ça plante → lire l'erreur, corriger le fichier concerné, relancer.
Les erreurs fréquentes et leur fix :

  "Cannot find module X"
  → Le module X est utilisé dans le code mais pas installé
  → Fix : npm install X --include=dev

  "X is not defined"
  → Une variable ou import manque dans le fichier
  → Fix : ajouter l'import manquant dans le fichier concerné

  "Failed to resolve import"
  → Le chemin d'import est mauvais
  → Fix : corriger le chemin relatif dans le fichier

─── ÉTAPE 5 : LANCEMENT BACKEND ──────────────────────────
  cd ..  (retour à la racine)
  uvicorn api:app --reload --port 8000

Si ça plante → corriger l'erreur affichée.
Erreurs fréquentes :

  "ModuleNotFoundError"
  → pip install [module manquant]

  "ValidationError" sur la config
  → Il manque une variable dans le .env
  → Créer/compléter le fichier .env à la racine

  "could not connect to server" (PostgreSQL)
  → Vérifier DATABASE_URL dans .env
  → Tester la connexion : python -c "import asyncpg; print('asyncpg OK')"

─── ÉTAPE 6 : LANCEMENT FRONTEND DEV ─────────────────────
  cd docling-pwa
  npm run dev

Si ça plante → corriger l'erreur affichée.

─── RÉSULTAT ATTENDU ──────────────────────────────────────
À la fin de ces 6 étapes, me confirmer :

  ✅ Backend tourne sur http://localhost:8000
  ✅ Frontend tourne sur http://localhost:5173
  ✅ http://localhost:8000/health répond
  ✅ http://localhost:5173 charge l'app dans le navigateur

Si l'un des 4 ne fonctionne pas → continuer à débugger.
Ne pas me dire "ça devrait marcher" — me montrer la preuve.
```

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PROMPT 2 — "DÉVELOPPER UNE FEATURE SANS TOUT CASSER"
# À utiliser quand : tu veux ajouter quelque chose de nouveau
# Remplir [FEATURE] avant d'envoyer
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

```
Tu es un dev expert sur ce stack :
  Backend  → FastAPI / Python / asyncpg
  Frontend → React / Vite / Tailwind / Zustand

FEATURE À DÉVELOPPER : [DÉCRIRE ICI EN 2-3 PHRASES]

RÈGLES ABSOLUES AVANT DE CODER :

RÈGLE 1 — LIRE D'ABORD
  Avant de toucher quoi que ce soit, lire les fichiers concernés.
  Me dire exactement quels fichiers tu vas modifier et pourquoi.

RÈGLE 2 — DÉCLARER LES DÉPENDANCES
  Si tu as besoin d'un nouveau package npm ou pip :
  → Me dire son nom exact
  → Vérifier qu'il existe : https://www.npmjs.com ou https://pypi.org
  → L'installer AVANT d'écrire le code qui l'utilise
  → L'ajouter dans package.json (dependencies) ou requirements.txt

  Format pour me le signaler :
  "J'ai besoin du package [NOM]. Je l'installe avec : npm install [NOM]"
  Attendre ma confirmation avant d'utiliser ce package dans le code.

RÈGLE 3 — PETITES ÉTAPES
  Coder par étapes de maximum 50 lignes à la fois.
  Après chaque étape → vérifier que ça compile encore :
    Backend  : python -c "import api"
    Frontend : npm run build

  Si une étape casse le build → corriger AVANT de continuer.

RÈGLE 4 — IMPORTS COMPLETS
  Chaque fichier que tu modifies doit avoir tous ses imports en haut.
  Jamais d'import partiel ou "tu verras l'import plus tard".
  Si tu utilises {useState} → l'import react est en ligne 1.
  Si tu utilises apiClient → l'import apiClient est en ligne N.

RÈGLE 5 — PAS D'INVENTIONS
  Utiliser uniquement ce qui existe déjà dans le projet.
  Les fonctions du store → lire useStore.js avant de les appeler.
  Les endpoints backend → vérifier dans api.py qu'ils existent.
  Les composants → vérifier qu'ils sont exportés avant de les importer.

SÉQUENCE DE DÉVELOPPEMENT :

  1. Lire les fichiers concernés → me résumer ce qui existe
  2. Décrire ce que tu vas faire exactement (plan en 5 lignes max)
  3. Si nouveaux packages nécessaires → les déclarer et installer
  4. Coder étape par étape avec vérification build à chaque étape
  5. Tester manuellement : me décrire comment tester la feature
  6. Me donner la liste exacte des fichiers modifiés

RÉSULTAT ATTENDU :
  → npm run build : 0 erreur
  → python -c "import api" : 0 erreur
  → La feature fonctionne quand je teste manuellement
```

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PROMPT 3 — "QUELQUE CHOSE PLANTE, RÉPARE ÇA"
# À utiliser quand : il y a une erreur et tu sais pas pourquoi
# Copier-coller l'erreur exacte dans [ERREUR]
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

```
Quelque chose plante. Répare-le. Voici l'erreur exacte :

[COLLER ICI L'ERREUR COMPLÈTE — tout le texte rouge/orange du terminal]

CONTEXTE :
  Projet : Docling Agent v3
  Stack  : FastAPI backend + React/Vite frontend
  Quand ça arrive : [décrire ce que tu faisais quand c'est planté]
  Dernier truc modifié : [quel fichier ou commande tu as lancé juste avant]

MÉTHODE DE DIAGNOSTIC — dans cet ordre :

ÉTAPE 1 — LIRE L'ERREUR
  Identifier dans l'erreur :
  → Le fichier concerné (souvent indiqué dans la stack trace)
  → La ligne concernée
  → La nature de l'erreur (ModuleNotFound / TypeError / SyntaxError / etc.)

ÉTAPE 2 — CHERCHER LA CAUSE RACINE
  Ne pas corriger le symptôme, corriger la cause.

  Si "Cannot find module X" ou "ModuleNotFoundError: No module named X" :
  → Le module X est utilisé dans le code mais pas installé
  → Solution : npm install X  ou  pip install X
  → Puis l'ajouter dans package.json ou requirements.txt

  Si "X is not exported from Y" ou "does not provide an export named X" :
  → L'import est mauvais — vérifier le nom exact de l'export dans le fichier source
  → Solution : corriger l'import dans le fichier qui l'utilise

  Si "SyntaxError" :
  → Erreur de syntaxe dans le fichier indiqué à la ligne indiquée
  → Solution : corriger la syntaxe (parenthèse manquante, virgule, etc.)

  Si "TypeError: X is not a function" :
  → X n'est pas ce qu'on croit (undefined, string, objet)
  → Solution : vérifier que X est bien importé et initialisé avant usage

  Si erreur de connexion PostgreSQL :
  → Vérifier le fichier .env : DATABASE_URL est-il correct ?
  → Tester : python -c "import asyncpg; print('OK')"

  Si erreur CORS :
  → Le frontend appelle l'API mais le backend refuse
  → Vérifier VITE_API_URL dans docling-pwa/.env
  → Vérifier allow_origins dans api.py

  Si erreur "vite: command not found" ou "uvicorn: command not found" :
  → npm install --include=dev  (pour vite)
  → pip install -r requirements.txt  (pour uvicorn)

ÉTAPE 3 — CORRIGER ET VÉRIFIER
  Appliquer la correction.
  Relancer exactement la même commande qui plantait.
  Me montrer le résultat.

  Si ça plante encore avec une NOUVELLE erreur → recommencer étape 1.
  Si ça plante encore avec la MÊME erreur → chercher plus en profondeur.

ÉTAPE 4 — CONFIRMER QUE TOUT MARCHE
  Après la correction :
    npm run build  (0 erreur ?)
    python -c "import api"  (0 erreur ?)
  
  Me dire : "C'est réparé. Voici ce qui plantait et pourquoi."

RÈGLE ABSOLUE :
  Ne jamais me dire "ça devrait marcher maintenant" sans avoir
  lancé la commande et vu le résultat de tes propres yeux (terminal).
  Montrer le résultat réel de la commande, pas un résultat imaginé.
```

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# BONUS — AIDE-MÉMOIRE ERREURS FRÉQUENTES
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Erreurs npm les plus fréquentes

```
ERREUR : "Cannot find module 'X'"
FIX    : npm install X --include=dev
         puis relancer npm run build

ERREUR : "ERESOLVE unable to resolve dependency tree"
FIX    : npm install --legacy-peer-deps

ERREUR : "vite: not found" ou "sh: vite: command not found"
FIX    : npm install --include=dev
         (vite est en devDependencies et n'est pas installé)

ERREUR : "ENOENT: no such file or directory, open 'package-lock.json'"
FIX    : npm install
         (régénère le package-lock.json)

ERREUR : "node_modules/.bin/vite: Permission denied"
FIX    : chmod +x node_modules/.bin/vite
         ou supprimer node_modules/ et refaire npm install

ERREUR : Module installé mais dossier vide dans node_modules/
FIX    : rm -rf node_modules/ package-lock.json
         npm install --include=dev
         (repart de zéro proprement)
```

## Erreurs Python les plus fréquentes

```
ERREUR : "ModuleNotFoundError: No module named 'X'"
FIX    : pip install X
         puis ajouter X dans requirements.txt

ERREUR : "ImportError: cannot import name 'X' from 'Y'"
FIX    : L'export n'existe pas ou le nom a changé
         Chercher le bon nom : grep -rn "def X\|class X" backend/

ERREUR : "pydantic_core._pydantic_core.ValidationError"
FIX    : Une variable d'env obligatoire est manquante dans .env
         Lire le message d'erreur — il dit quelle variable manque

ERREUR : "asyncpg.exceptions.ConnectionFailureError"
FIX    : DATABASE_URL incorrecte dans .env
         Format correct : postgresql://user:pass@host:5432/dbname

ERREUR : "Address already in use ::8000"
FIX    : Un autre processus utilise le port 8000
         lsof -i :8000 | grep LISTEN
         kill -9 [PID trouvé]
         puis relancer uvicorn
```

## Variables .env minimales pour que ça tourne

```bash
# Fichier : .env (à la racine du projet)
DATABASE_URL=postgresql://user:password@host:5432/dbname
JWT_SECRET=une-chaine-de-minimum-32-caracteres-aleatoires
GEMINI_API_KEY=ta-vraie-cle-api-google

# Fichier : docling-pwa/.env
VITE_API_URL=http://localhost:8000
```
