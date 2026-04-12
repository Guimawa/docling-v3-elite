import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import AtlasBrowser from './components/AtlasBrowser'
import PilotChat from './components/PilotChat'

function App() {
  const [view, setView] = useState<'dashboard' | 'atlas'>('dashboard')
  const [showPilot, setShowPilot] = useState(false)
  const [invoices, setInvoices] = useState<any[]>([])
  const [_error, _setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchInvoices()
  }, [])

  async function fetchInvoices() {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(6)
      
      if (data) setInvoices(data)
    } catch (e) {
      console.error("Fetch failed");
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="dashboard-container">
      <nav className="sidebar">
        <div style={{marginBottom: '50px'}}>
           <h1 style={{fontSize: '32px', fontWeight: '900', letterSpacing: '-2px', color: 'var(--accent-pronto)'}}>Docling<span style={{color: '#94A3B8'}}>.</span></h1>
           <span style={{fontSize: '10px', fontWeight: '800', letterSpacing: '2px', color: '#94A3B8', textTransform: 'uppercase'}}>Elite Pro 2026</span>
        </div>
        
        <div className="nav-group">
          <div 
            className={`nav-item ${view === 'dashboard' ? 'active' : ''}`}
            onClick={() => setView('dashboard')}
          >
            <span>📈</span> Tableau de bord
          </div>
          <div className="nav-item">
            <span>📂</span> Le Vault
          </div>
          <div 
            className={`nav-item ${view === 'atlas' ? 'active' : ''}`}
            onClick={() => setView('atlas')}
          >
            <span>🌍</span> L'Atlas Prix
          </div>
          <div 
            className={`nav-item ${showPilot ? 'active' : ''}`}
            onClick={() => setShowPilot(!showPilot)}
          >
            <span>🤖</span> Pilot Chat
          </div>
        </div>
      </nav>

      <main className="main-content">
        {view === 'dashboard' ? (
          <>
            <header className="header">
              <div>
                <p style={{color: 'var(--text-muted)', fontWeight: '600', fontSize: '14px', marginBottom: '4px'}}>Lundi 12 Avril 2026</p>
                <h2>Bonjour Sophie 👋</h2>
              </div>
              <button className="btn-primary">+ Nouveau Scan</button>
            </header>

            {/* Atlas Widget */}
            <div className="atlas-widget" onClick={() => setView('atlas')} style={{cursor: 'pointer'}}>
               <div style={{position: 'relative', zIndex: 1}}>
                 <h3 style={{fontSize: '24px', fontWeight: '800', marginBottom: '8px'}}>Atlas Intelligence.</h3>
                 <p style={{color: '#94A3B8', fontSize: '14px', maxWidth: '500px'}}>
                   Nous avons analysé 1 240 prix dans votre région cette semaine. 
                   Le prix moyen du sac de ciment à Lyon est en baisse de 4%.
                 </p>
               </div>
               <button style={{
                 background: 'white', 
                 color: 'black', 
                 padding: '12px 20px', 
                 borderRadius: '12px', 
                 border: 'none', 
                 fontWeight: '800',
                 cursor: 'pointer',
                 fontSize: '13px'
               }}>Explorer l'Atlas</button>
            </div>

            <div className="section-title">
               <h3>Dernières Captures</h3>
               <span style={{color: 'var(--accent-pronto)', fontSize: '14px', cursor: 'pointer', fontWeight: '700'}}>Voir tout</span>
            </div>

            <section className="card-grid">
              {loading ? (
                <p>Chargement des factures...</p>
              ) : invoices.length > 0 ? (
                invoices.map(inv => (
                  <div key={inv.id} className="invoice-card">
                    <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '20px'}}>
                      <span className={`status-badge status-${inv.status || 'completed'}`}>
                        {inv.status || 'Terminé'}
                      </span>
                      <span style={{color: 'var(--text-muted)', fontSize: '13px', fontWeight: '500'}}>
                        {new Date(inv.created_at).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    
                    <h4 style={{fontSize: '14px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px'}}>
                      {inv.metadata?.fournisseur || 'Facture'}
                    </h4>
                    <p style={{fontSize: '22px', fontWeight: '900', marginBottom: '24px'}}>
                       {inv.metadata?.total_ttc?.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                    </p>

                    <div style={{display: 'flex', borderTop: '1px solid #F1F5F9', paddingTop: '16px'}}>
                       <span style={{color: 'var(--accent-pronto)', fontSize: '13px', fontWeight: '800'}}>OUVRIR LE PDF →</span>
                    </div>
                  </div>
                ))
              ) : (
                <p style={{color: 'var(--text-muted)'}}>Aucune facture trouvée. Commencez à scanner avec l'app mobile !</p>
              )}
            </section>
          </>
        ) : (
          <AtlasBrowser />
        )}
      </main>

      {showPilot && <PilotChat />}
    </div>
  )
}

export default App
