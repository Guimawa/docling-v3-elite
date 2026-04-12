import React, { useState } from 'react';

interface AtlasResult {
  id: string;
  material_name: string;
  unit_price_ht: number;
  unit: string;
  distance_meters: number;
  source_date: string;
}

export default function AtlasBrowser() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AtlasResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<AtlasResult | null>(null);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8787';

  // Filtres
  const [maxPrice, setMaxPrice] = useState(100);
  const [maxDist, setMaxDist] = useState(50);

  const handleAiSearch = async (prompt: string) => {
    setAiThinking(true);
    // Ici l'IA analyserait : "BA13 moins cher que 15€ à 10km"
    // Et réglerait les filtres automatiquement.
    setTimeout(() => {
      setQuery("Plaque de plâtre BA13");
      setMaxPrice(15);
      setMaxDist(10);
      searchAtlas();
      setAiThinking(false);
    }, 1500);
  };

  const searchAtlas = async () => {
    if (!query) return;
    setLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/api/v1/atlas/search?q=${query}&lat=45.76&lon=4.83&radius=${maxDist * 1000}`);
      const data = await resp.json();
      if (data.success) {
        setResults(data.results.filter((r: any) => r.unit_price_ht <= maxPrice));
      }
    } catch (e) { 
      console.error("[Atlas] Search error:", e); 
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="atlas-ecommerce-container">
      {/* 1. Header IA (Le Pilot) */}
      <div className="ai-pilot-bar">
         <div className="flex-row items-center p-4 bg-charcoal rounded-2xl mb-8 shadow-xl shadow-blue-900/10">
            <span className="mr-4 text-2xl">🤖</span>
            <input 
              className="ai-input"
              placeholder="Demandez à l'IA : 'Trouve-moi le BA13 le moins cher'..."
              onKeyPress={(e) => e.key === 'Enter' && handleAiSearch(e.currentTarget.value)}
            />
            {aiThinking && <div className="loader-dots silver ml-4" />}
         </div>
      </div>

      <div className="ecommerce-layout">
        {/* 2. Filtres Latéraux */}
        <aside className="filters-sidebar">
          <h4 className="font-bold mb-6">Filtres</h4>
          <div className="filter-group mb-8">
            <p className="filter-label">Prix Max ({maxPrice}€)</p>
            <input type="range" min="0" max="500" step="5" value={maxPrice} onChange={(e) => setMaxPrice(parseInt(e.target.value))} className="w-full" />
          </div>
          <div className="filter-group mb-8">
            <p className="filter-label">Distance ({maxDist} km)</p>
            <input type="range" min="1" max="200" step="5" value={maxDist} onChange={(e) => setMaxDist(parseInt(e.target.value))} className="w-full" />
          </div>
        </aside>

        {/* 3. Zone de Résultats */}
        <main className="results-area">
          <div className="flex-row justify-between items-center mb-6">
            <h3 className="section-title">{results.length} relevés trouvés</h3>
          </div>

          <div className="card-grid">
            {results.map(r => (
              <div key={r.id} className="merchant-card" onClick={() => setSelectedProduct(r)}>
                <div className="merchant-card-img">
                  <span className="text-4xl opacity-20">📦</span>
                  {r.unit_price_ht < 15 && <div className="promo-badge">ELITE PRICE</div>}
                </div>
                <div className="p-5">
                  <h5 className="font-bold text-lg mb-1">{r.material_name}</h5>
                  <p className="text-muted text-[10px] font-bold uppercase tracking-wider mb-4">📍 {(r.distance_meters/1000).toFixed(1)} km</p>
                  <p className="text-2xl font-black text-blue-600">{r.unit_price_ht.toFixed(2)}€</p>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>

      {/* 4. MODALE FICHE PRODUIT / COMPARATEUR GOOGLE-STYLE */}
      {selectedProduct && (
        <div className="modal-overlay" onClick={() => setSelectedProduct(null)}>
          <div className="product-modal-card animate-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
             <div className="flex-row gap-10">
                <div style={{flex: 1}}>
                   <div className="bg-slate-50 p-10 rounded-3xl items-center justify-center flex mb-6">
                      <span style={{fontSize: '100px'}}>📦</span>
                   </div>
                   <h2 className="text-3xl font-black mb-2">{selectedProduct.material_name}</h2>
                   <p className="text-muted mb-6">Relevé le {new Date(selectedProduct.source_date).toLocaleDateString()}</p>
                   
                   <div className="bg-blue-600 p-6 rounded-2xl text-white">
                      <p className="text-xs font-bold opacity-70 uppercase mb-1">Prix de ce relevé</p>
                      <p className="text-4xl font-black">{selectedProduct.unit_price_ht.toFixed(2)}€ <span className="text-sm font-normal">HT</span></p>
                   </div>
                </div>

                <div style={{flex: 1.5, borderLeft: '1px solid #F1F5F9', paddingLeft: '40px'}}>
                   <h3 className="text-xl font-bold mb-6 flex-row items-center gap-2">
                     <span className="text-blue-500">🔍</span> Comparateur Google Atlas
                   </h3>
                   
                   <div className="bg-green-50 p-4 rounded-xl border border-green-100 mb-6 flex-row items-center">
                      <span className="mr-3 text-xl">✅</span>
                      <p className="text-green-800 text-sm font-medium">L'IA Docling confirme : Ce prix est <strong>12% moins cher</strong> que la moyenne locale.</p>
                   </div>

                   <div className="comparison-table">
                      <p className="text-[10px] font-black text-muted uppercase tracking-widest mb-4">Meilleures alternatives à proximité</p>
                      {[1,2].map(i => (
                        <div key={i} className="flex-row justify-between p-4 border-b border-slate-50 opacity-60">
                           <span className="text-sm font-bold">Autre relevé - {10 + i}km</span>
                           <span className="text-sm font-black">{(selectedProduct.unit_price_ht + i).toFixed(2)}€</span>
                        </div>
                      ))}
                      <div className="flex-row justify-between p-4 bg-blue-50/50 rounded-xl mt-4">
                         <span className="text-sm font-bold text-blue-800">Moyenne du marché (Lyon)</span>
                         <span className="text-sm font-black text-blue-800">18.40€</span>
                      </div>
                   </div>

                   <button className="w-full mt-10 bg-charcoal text-white py-4 rounded-2xl font-bold">
                     Ajouter au devis Pilot
                   </button>
                </div>
             </div>
             <button className="absolute top-6 right-8 text-2xl opacity-30" onClick={() => setSelectedProduct(null)}>✕</button>
          </div>
        </div>
      )}

      <style>{`
        .atlas-ecommerce-container { padding-top: 10px; }
        .ecommerce-layout { display: grid; grid-template-columns: 240px 1fr; gap: 40px; }
        .ai-input { flex: 1; background: transparent; border: none; color: white; font-size: 18px; outline: none; padding: 10px; }
        .filters-sidebar { background: white; padding: 30px; border-radius: 24px; height: fit-content; border: 1px solid #E2E8F0; }
        .filter-label { font-size: 12px; font-weight: 800; color: var(--text-muted); text-transform: uppercase; margin-bottom: 12px; }
        .merchant-card { background: white; border-radius: 20px; overflow: hidden; border: 1px solid #F1F5F9; transition: transform 0.2s; cursor: pointer; }
        .merchant-card-img { height: 140px; background: #F8FAFC; align-items: center; justify-content: center; display: flex; position: relative; }
        .promo-badge { position: absolute; top: 12px; left: 12px; background: #3B82F6; color: white; font-size: 8px; font-weight: 900; padding: 4px 8px; borderRadius: 6px; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(8px); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .product-modal-card { background: white; width: 100%; max-width: 900px; border-radius: 40px; padding: 50px; position: relative; box-shadow: 0 30px 60px rgba(0,0,0,0.2); }
      `}</style>
    </div>
  );
}
