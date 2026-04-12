---
name: setup-dev
description: Configure l'environnement de développement Docling — venv Python, npm install, .env, migrations.
---

# Setup Dev

Configure l'environnement de développement complet pour Docling.

## Étapes

```bash
# 1. Cloner et entrer dans le projet
cd docling

# 2. Créer venv Python
python -m venv venv
# Windows: venv\Scripts\activate
# Linux/Mac: source venv/bin/activate

# 3. Installer dépendances Python
pip install -r requirements.txt -r requirements-dev.txt

# 4. Installer dépendances frontend
cd docling-pwa && npm install && cd ..

# 5. Configurer .env
cp .env.example .env
# Remplir: GEMINI_API_KEY, DATABASE_URL, JWT_SECRET

# 6. Appliquer migrations
alembic upgrade head
```

Ou via Makefile :

```bash
make install
# Puis configurer .env manuellement
make migrate
```

## Variables .env obligatoires

- GEMINI_API_KEY
- DATABASE_URL (PostgreSQL Neon)
- JWT_SECRET (openssl rand -hex 32)
