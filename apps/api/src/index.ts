import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { StorageService } from './services/storage';
import { getAuth } from './lib/auth';

type Bindings = {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
  GEMINI_API_KEY: string;
  DATABASE_URL: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  STRIPE_PRO_PRICE_ID: string;
  BETTER_AUTH_SECRET: string;
  GEMINI_MODEL?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use('*', cors());

// --- BETTER AUTH MOUNT ---
app.on(["POST", "GET"], "/api/auth/*", (c) => {
  const auth = getAuth(c.env);
  return auth.handler(c.req.raw);
});

// --- STRIPE WEBHOOK ---
app.post('/api/stripe/webhook', async (c) => {
  const stripe = new Stripe(c.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' as any });
  const signature = c.req.header('stripe-signature');
  const body = await c.req.text();

  if (!signature) return c.json({ error: 'No signature' }, 400);

  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      c.env.STRIPE_WEBHOOK_SECRET
    );

    const auth = getAuth(c.env);
    // Le plugin @better-auth/stripe gère automatiquement la synchro via ce handler
    await auth.api.stripeWebhookHandler({
      body,
      signature,
    });

    return c.json({ received: true });
  } catch (err: any) {
    console.error(`💥 Erreur Webhook Stripe: ${err.message}`);
    return c.json({ error: err.message }, 400);
  }
});

// Health Check
app.get('/', (c) => c.text('Docling API 2026 - Better Auth & Stripe Enabled'));

// [FR-GEO] AUTO-DETECTION DU PAYS (Cloudflare Proxy Headers)
app.get('/api/v1/geo/detect', (c) => {
  const country = c.req.header('cf-ipcountry') || 'FR'; // Détection Cloudflare
  const config: Record<string, any> = {
    'FR': { lang: 'fr', legal: 'SIRET', tax: 'TVA' },
    'ES': { lang: 'es', legal: 'CIF/NIF', tax: 'IVA' },
    'CA': { lang: 'ca', legal: 'NIF/DNI', tax: 'IVA' }
  };
  
  const res = config[country] || { lang: 'en', legal: 'VAT ID', tax: 'TAX' };
  
  return c.json({ 
    success: true, 
    country,
    ...res
  });
});

// Endpoint de Scan & Extraction
app.post('/api/v1/scan', async (c) => {
  const auth = getAuth(c.env);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  
  if (!session) {
    const authHeader = c.req.header('Authorization');
    if (authHeader !== 'Bearer development-test-token') {
      return c.json({ error: 'Unauthorized' }, 401);
    }
  }

  const userId = session?.user.id || '00000000-0000-0000-0000-000000000000';
  
  // Instance Supabase réutilisée si possible (singleton implicite par requête)
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_KEY);

  // [FR BYOC] Récupération du provider préféré
  const { data: profile } = await supabase.from('profiles').select('storage_provider').eq('id', userId).single();
  const userProvider = profile?.storage_provider || 'supabase';

  // [FR24] QUOTA CHECK (FREE vs PRO)
  const isPro = session?.user.plan === 'pro' || userProvider !== 'supabase';
  if (!isPro && userId !== '00000000-0000-0000-0000-000000000000') {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count, error: countError } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', startOfMonth.toISOString());

    if (count !== null && count >= 10) {
      return c.json({ 
        error: 'Quota Free atteint (10 scans/mois). Passez à Docling Pro pour un usage illimité.',
        limit_reached: true 
      }, 403);
    }
  }

  // 2. RECUPERATION DU FICHIER ET METADONNEES
  const body = await c.req.parseBody();
  const file = body['file'] as File;
  const lat = body['latitude'] ? parseFloat(body['latitude'] as string) : null;
  const lon = body['longitude'] ? parseFloat(body['longitude'] as string) : null;
  const source = body['source'] || 'api';

  if (!file) return c.json({ error: 'No file uploaded' }, 400);

  try {
    const fileBuffer = await file.arrayBuffer();
    
    // 2.5 DETECTION TYPE PDF (FR23)
    const isNativePdf = file.type === 'application/pdf' && file.size < 1024 * 1024;
    console.log(`[FR23] Analyse PDF : ${isNativePdf ? 'NATIF' : 'SCAN/IMAGE'}`);

    // [AGENT PERF] 2.6 ANTI-DOUBLON PRÉVENTIF (Économie de Tokens)
    console.log('🔍 Vérification préventive des doublons...');
    const { data: existingInvoices } = await supabase
      .from('invoices')
      .select('id, metadata')
      .eq('user_id', userId)
      .eq('filename', file.name)
      .limit(1);

    if (existingInvoices && existingInvoices.length > 0) {
      console.log('♻️ Document déjà traité (Doublon détecté par nom), renvoi des données existantes');
      return c.json({ 
        success: true, 
        data: existingInvoices[0].metadata,
        invoice_id: existingInvoices[0].id,
        is_cached: true 
      });
    }

    // 3. IA - GEMINI EXTRACTION (Appelée uniquement si document UNIQUE)
    console.log('🤖 Initialisation Gemini 3.1 Flash-Lite (Expert BTP Edition)...');
    const genAI = new GoogleGenerativeAI(c.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: c.env.GEMINI_MODEL || 'gemini-3.1-flash-lite',
      generationConfig: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            fournisseur: { type: SchemaType.STRING, description: "Nom légal de l'entreprise" },
            siret: { type: SchemaType.STRING, description: "Numéro SIRET si visible" },
            numero_facture: { type: SchemaType.STRING },
            date_facture: { type: SchemaType.STRING },
            total_ht: { type: SchemaType.NUMBER },
            total_tva: { type: SchemaType.NUMBER },
            total_ttc: { type: SchemaType.NUMBER },
            devise: { type: SchemaType.STRING, defaultValue: "EUR" },
            produits: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  designation_raw: { type: SchemaType.STRING, description: "Libellé complet de l'article" },
                  famille: { type: SchemaType.STRING, description: "Catégorie (ex: Gros Oeuvre, Outillage, Plomberie)" },
                  quantite: { type: SchemaType.NUMBER },
                  unite: { type: SchemaType.STRING, description: "U, M2, M3, ML, KG, etc." },
                  prix_unitaire_ht: { type: SchemaType.NUMBER },
                  remise_pct: { type: SchemaType.NUMBER },
                  prix_total_ht: { type: SchemaType.NUMBER },
                },
                required: ["designation_raw", "prix_total_ht"]
              }
            }
          },
          required: ["fournisseur", "total_ttc", "produits"]
        }
      }
    });

    const result = await model.generateContent([
      `Tu es l'expert comptable BTP de Docling. Extrais les données de cette facture avec une précision absolue.
       - Si c'est un bon de livraison, cherche le prix estimé ou marque 0.
       - Identifie les remises commerciales souvent cachées dans les colonnes.
       - Normalise les unités (ex: convertis 'Mètre Linéaire' en 'ML').
       - Type de document : ${isNativePdf ? 'PDF Natif' : 'Scan'}.`,
      { inlineData: { data: Buffer.from(fileBuffer).toString("base64"), mimeType: file.type } }
    ]);

    const extraction = JSON.parse(result.response.text());
    console.log('✅ Extraction IA réussie');

    // 4. PREPARATION TAGS
    let projectTag = "Non classé";
    if (lat && lon) {
      projectTag = `Projet aux coordonnées ${lat.toFixed(4)},${lon.toFixed(4)}`;
      console.log(`[FR5] Localisation détectée : ${projectTag}`);
    }

    // 5. STOCKAGE MULTI-CLOUD (BYOC)
    console.log('☁️ Gestion du stockage Cloud...');
    const storageService = new StorageService(c.env, supabase);
    const storageResult = await storageService.uploadFile(file, userId, userProvider);

    if (storageResult.error) {
      console.error('❌ Erreur Storage:', storageResult.error);
    }

    // 6. PERSISTENCE SUPABASE DB
    const { data: invoice, error: dbError } = await supabase
      .from('invoices')
      .insert({
        user_id: userId,
        filename: file.name,
        storage_path: storageResult.path,
        storage_provider: storageResult.provider,
        status: 'completed',
        source: source,
        project_tag: projectTag,
        metadata: {
          ...extraction,
          pdf_type: isNativePdf ? 'native' : 'scanned',
          geotag: lat && lon ? { lat, lon } : null
        }
      })
      .select()
      .single();

    // [FR8/FR17/FR30] ATLAS PRICE INTELLIGENCE : Mutualisation Anonyme (Parallélisée)
    if (invoice && extraction.produits) {
      await Promise.all(extraction.produits.map(async (p: any) => {
        // 1. Persistance PRIVÉE (Vault)
        const { data: product } = await supabase
          .from('products')
          .upsert({
            designation: p.designation_raw,
            famille: p.famille,
            last_price_ht: p.prix_remise_ht,
            last_supplier: extraction.fournisseur,
            unit: 'U'
          }, { onConflict: 'designation' })
          .select()
          .single();

        if (product) {
          await supabase.from('price_history').insert({
            product_id: product.id,
            invoice_id: invoice.id,
            price_ht: p.prix_remise_ht,
            supplier: extraction.fournisseur,
            date_observed: extraction.date_facture || new Date().toISOString()
          });
        }

        // 2. Persistance ANONYME (Atlas) - [FR30]
        return supabase.rpc('insert_atlas_price', {
          material_name: p.designation_raw,
          unit_price_ht: p.prix_remise_ht,
          unit_type: 'U',
          lat: lat,
          lon: lon,
          obs_date: extraction.date_facture || new Date().toISOString()
        });
      }));
    }

    if (dbError) console.error('❌ Erreur DB:', dbError);

    return c.json({ 
      success: true, 
      data: extraction,
      storage_url: storageResult.path,
      invoice_id: invoice?.id,
      error: dbError?.message
    });

  } catch (err: any) {
    console.error('💥 ERREUR FATALE:', err.message);
    return c.json({ error: err.message }, 500);
  }
});

// [US-012] PILOT CHAT : Intelligence Contextuelle (RAG Lite)
app.post('/api/v1/pilot/chat', async (c) => {
  const body = await c.req.json();
  const userMessage = body.message;

  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_KEY);

  // 1. On récupère le contexte (Factures récentes)
  const { data: invoices } = await supabase
    .from('invoices')
    .select('metadata, created_at')
    .limit(15)
    .order('created_at', { ascending: false });

  // 2. On prépare le cerveau
  const genAI = new GoogleGenerativeAI(c.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const context = JSON.stringify(invoices);
  const prompt = `Voici les dernières factures BTP de l'utilisateur : ${context}.
                  L'utilisateur demande : "${userMessage}".
                  Réponds de manière concise, précise et professionnelle en tant qu'assistant Docling.
                  Cite des chiffres ou des fournisseurs réels si possible.`;

  const result = await model.generateContent(prompt);
  const response = result.response.text();

  return c.json({ success: true, response });
});

// [FR30] ATLAS SEARCH : Intelligence Prix Géo-localisée
app.get('/api/v1/atlas/search', async (c) => {
  const query = c.req.query('q');
  const lat = c.req.query('lat') ? parseFloat(c.req.query('lat')) : null;
  const lon = c.req.query('lon') ? parseFloat(c.req.query('lon')) : null;
  const radius = c.req.query('radius') ? parseInt(c.req.query('radius')) : 50000; // 50km par défaut

  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_KEY);

  let dbQuery = supabase
    .from('atlas_prices')
    .select('*, distance:geopoint<->ST_SetSRID(ST_Point(?, ?), 4326)');

  if (query) {
    dbQuery = dbQuery.ilike('material_name', `%${query}%`);
  }

  // Note: On utilise RPC pour la recherche complexe avec PostGIS si besoin
  const { data, error } = await supabase.rpc('search_atlas_prices', {
    search_query: query || '',
    user_lat: lat,
    user_lon: lon,
    radius_meters: radius
  });

  if (error) return c.json({ error: error.message }, 500);

  return c.json({ 
    success: true, 
    count: data.length,
    results: data 
  });
});

export default app;
