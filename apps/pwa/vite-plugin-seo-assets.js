/**
 * Génère public/sitemap.xml et public/robots.txt au démarrage du build (et en dev)
 * à partir de VITE_SITE_URL (racine .env du monorepo via loadEnv).
 */
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

/** Routes publiques indexables (hors espace connecté et hors page design system dev). */
const PUBLIC_PATHS = [
  '/',
  '/tarifs',
  '/a-propos',
  '/aide',
  '/integrations',
  '/login',
  '/register',
  '/mentions-legales',
  '/cgu',
  '/confidentialite',
  '/accessibilite',
  '/cookies',
  '/plan-du-site',
]

function normalizeBase(url) {
  const u = (url || 'http://localhost:5173').trim().replace(/\/$/, '')
  return u.startsWith('http') ? u : `https://${u}`
}

export function seoAssetsPlugin({ env, mode }) {
  const today = new Date().toISOString().slice(0, 10)

  return {
    name: 'docling-seo-assets',
    buildStart() {
      const siteUrl = (env.VITE_SITE_URL || '').trim()
      const strictProd =
        mode === 'production' &&
        (process.env.NETLIFY === 'true' || process.env.CI === 'true')
      if (strictProd) {
        if (
          !siteUrl ||
          siteUrl.includes('localhost') ||
          siteUrl.includes('127.0.0.1') ||
          !siteUrl.startsWith('https://')
        ) {
          throw new Error(
            '[docling-seo-assets] En build production sur Netlify/CI, définir VITE_SITE_URL=' +
              ' une URL HTTPS canonique du site (pas localhost). Voir .env.example et ' +
              'docs/PRODUCTION-DEPLOYMENT-CHECKLIST.md'
          )
        }
      }
      const base = normalizeBase(siteUrl || 'http://localhost:5173')
      const publicDir = join(__dirname, 'public')
      const body = PUBLIC_PATHS.map((p) => {
        const loc = p === '/' ? `${base}/` : `${base}${p}`
        const priority = p === '/' ? '1.0' : '0.7'
        return `  <url>
    <loc>${loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${priority}</priority>
  </url>`
      }).join('\n')

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`
      writeFileSync(join(publicDir, 'sitemap.xml'), xml, 'utf8')

      const robots = `# Docling PWA — pages publiques explorables.
# Fichier régénéré au démarrage Vite (voir vite-plugin-seo-assets.js). Sitemap : VITE_SITE_URL.

User-agent: *
Allow: /

Disallow: /design-system

Sitemap: ${base}/sitemap.xml
`
      writeFileSync(join(publicDir, 'robots.txt'), robots, 'utf8')
    },
  }
}
