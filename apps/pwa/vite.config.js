/// <reference types="vitest/config" />
import basicSsl from '@vitejs/plugin-basic-ssl'
import react from '@vitejs/plugin-react'
import path from 'path'
import { defineConfig, loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { seoAssetsPlugin } from './vite-plugin-seo-assets.js'

export default defineConfig(({ mode }) => {
  const rootDir = path.resolve(__dirname, '../..')
  const env = loadEnv(mode, rootDir, '')
  return {
  envDir: rootDir,
  plugins: [
    seoAssetsPlugin({ env, mode }),
    react(),
    // basicSsl uniquement en dev local — Netlify gère TLS en prod (certificat auto-signé inutile)
    ...(mode === 'development' ? [basicSsl()] : []),
    VitePWA({
      // En dev, ne pas activer le SW par défaut (évite bundle JS obsolète / « je ne vois pas le changement »)
      devOptions: { enabled: false },
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'icons/*.svg'],
manifest: {
      name: 'Docling Agent BTP',
      short_name: 'Docling',
      description:
        'Factures fournisseurs BTP : extraction IA, catalogue de prix, export CSV/Excel. Web mobile et bureau.',
      lang: 'fr',
      theme_color: '#B45309',
      background_color: '#0f172a',
      display: 'standalone',
      orientation: 'portrait',
      start_url: '/',
      scope: '/',
      categories: ['business', 'productivity', 'finance'],
      icons: [
        { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
        { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
      ]
    },
      workbox: {
        // Extensions listées sans accolades — évite le bug glob Workbox
        // « brace_expansion_1.expand is not a function » (brace-expansion / minimatch).
        globPatterns: [
          '**/*.js',
          '**/*.css',
          '**/*.html',
          '**/*.png',
        ],
        // Aucun cache pour /api/v1/* — endpoints authentifiés, pas de cache Workbox
        runtimeCaching: []
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/shared': path.resolve(__dirname, './src/shared'),
      '@/features': path.resolve(__dirname, './src/features'),
    },
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    // Dépendances réelles uniquement — @splinetool retiré du package.json (SplineScene supprimé)
    include: ['react', 'react-dom'],
  },
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL || 'http://localhost:8000'),
    'import.meta.env.VITE_AUTH_REQUIRED': JSON.stringify(env.VITE_AUTH_REQUIRED ?? 'false'),
    'import.meta.env.VITE_SENTRY_DSN': JSON.stringify(env.VITE_SENTRY_DSN || ''),
    'import.meta.env.VITE_TVA_RATE': JSON.stringify(env.VITE_TVA_RATE || '0.21'),
  },
  server: {
    port: 5173,
    host: true,
    // HTTP en dev (evite mixed content avec API http://localhost:8000)
    https: false
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.js'],
    server: {
      deps: {
        // Même instance React que l’app (évite « Invalid hook call » avec QueryClientProvider)
        inline: ['@tanstack/react-query'],
      },
    },
    include: ['src/__tests__/**/*.{test,spec}.{js,jsx}', 'src/**/__tests__/**/*.{test,spec}.{js,jsx}'],
    env: { NODE_ENV: 'test' },
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify('http://localhost:8000'),
      'import.meta.env.VITE_AUTH_REQUIRED': JSON.stringify('false'),
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{js,jsx}'],
      exclude: [
        'src/__tests__/**',
        'src/**/__tests__/**',
        'src/**/setup.js',
        'src/main.jsx',
        'src/design-system/tokens.js',
        'src/constants/**',
        '**/*.config.{js,ts}',
        '**/node_modules/**'
      ],
      all: true,
      clean: true,
      thresholds: {
        lines: 60,
        // Marketing + landing + PublicNav inclus dans la couverture (plus d’exclusions dédiées)
        functions: 56,
        branches: 60,
        statements: 60
      }
    }
  },
  build: {
    sourcemap: false,         // Pas de source maps en prod (ne pas exposer le code source)
    // Les chunks "excel-gen" / "pdf-gen" sont isolés volontairement (lazy-load), on relève le seuil d'alerte.
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-core': ['react', 'react-dom'],
          'router': ['react-router-dom'],
          'ui-motion': ['framer-motion', 'lucide-react'],
          'charts': ['recharts'],
          'pdf-gen': ['jspdf', 'jspdf-autotable'],
          'excel-gen': ['exceljs'],
          'dropzone': ['react-dropzone']
        }
      }
    }
  }
  }
})
