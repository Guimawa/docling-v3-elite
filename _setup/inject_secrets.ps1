# Script d'injection des secrets Docling V3 pour Cloudflare Edge
# Usage: ./inject_secrets.ps1

Write-Host "--- DOCLING V3 ELITE : CONFIGURATION PRODUCTION ---" -ForegroundColor Cyan
Write-Host "Assurez-vous d'avoir exécuté 'npx wrangler login' avant de commencer.`n"

function Put-Secret {
    param($Name)
    Write-Host "`n>>> Configuration de : $Name" -ForegroundColor Yellow
    npx wrangler secret put $Name --project apps/api
}

# Liste des secrets requis
$secrets = @("GEMINI_API_KEY", "STRIPE_SECRET_KEY", "SUPABASE_URL", "SUPABASE_ANON_KEY", "BETTER_AUTH_SECRET")

foreach ($s in $secrets) {
    Put-Secret -Name $s
}

Write-Host "`n✅ Configuration terminée ! Vous pouvez maintenant lancer : npm run deploy -w docling-api" -ForegroundColor Green
