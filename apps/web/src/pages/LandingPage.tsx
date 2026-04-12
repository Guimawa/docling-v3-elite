import { useTranslation } from 'react-i18next';

export default function LandingPage({ onGoAuth }: { onGoAuth: () => void }) {
  const { t } = useTranslation();

  return (
    <div className="landing-multiverse">
      {/* Dynamic Background */}
      <div className="mesh-gradient"></div>

      <nav className="glass-nav">
        <div className="nav-content">
          <h2 className="logo">Docling<span>.</span></h2>
          <div className="nav-links">
            <button className="btn-secondary" onClick={onGoAuth}>{t('login')}</button>
            <button className="btn-primary-ghost" onClick={onGoAuth}>{t('signup')}</button>
          </div>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-content">
          <div className="badge animate-in fade-in slide-in-from-bottom duration-700">
             <span>NEW</span> Docling v3.1 Elite is here
          </div>
          <h1 className="title animate-in fade-in slide-in-from-bottom duration-1000">
            L'intelligence IA<br /> 
            <span className="text-gradient">pour le BTP Moderne.</span>
          </h1>
          <p className="subtitle animate-in fade-in slide-in-from-bottom duration-1000">
            {t('welcome')} - Automatisez vos scans, analysez vos prix, et dominez votre marché local en France, Espagne et Catalogne.
          </p>
          
          <div className="cta-group animate-in fade-in slide-in-from-bottom duration-1000">
            <button className="btn-mega-primary" onClick={onGoAuth}>{t('scan_now')}</button>
            <button className="btn-mega-secondary">Voir la démo Pilot</button>
          </div>
        </div>

        {/* Floating Scanner Preview */}
        <div className="preview-container">
           <div className="floating-card">
              <div className="laser-beam"></div>
              <div className="card-mock-content">
                 <div className="h-4 w-20 bg-slate-100 rounded mb-4"></div>
                 <div className="h-8 w-32 bg-slate-200 rounded mb-6"></div>
                 <div className="space-y-2">
                    <div className="h-2 w-full bg-slate-50 rounded"></div>
                    <div className="h-2 w-full bg-slate-50 rounded"></div>
                    <div className="h-2 w-3/4 bg-slate-50 rounded"></div>
                 </div>
              </div>
           </div>
        </div>
      </section>

      <style>{`
        .landing-multiverse {
          min-height: 100vh;
          background: #0F172A;
          color: white;
          overflow-x: hidden;
          font-family: 'Inter', sans-serif;
        }
        .mesh-gradient {
          position: fixed;
          top: 0; left: 0; width: 100%; height: 100%;
          background: 
            radial-gradient(at 0% 0%, rgba(59, 130, 246, 0.15) 0px, transparent 50%),
            radial-gradient(at 100% 0%, rgba(37, 99, 235, 0.1) 0px, transparent 50%),
            radial-gradient(at 50% 100%, rgba(15, 23, 42, 1) 0px, transparent 100%);
          z-index: 0;
        }
        .glass-nav {
          position: fixed;
          top: 20px; left: 50%; transform: translateX(-50%);
          width: 90%; max-width: 1200px;
          background: rgba(255,255,255,0.03);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 24px;
          padding: 15px 30px;
          z-index: 100;
        }
        .nav-content { display: flex; justify-content: space-between; align-items: center; }
        .logo { font-size: 24px; font-weight: 900; letter-spacing: -1.5px; }
        .logo span { color: #3B82F6; }
        .hero {
          position: relative;
          z-index: 1;
          padding-top: 180px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        .badge {
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.2);
          padding: 8px 16px;
          border-radius: 100px;
          font-size: 12px;
          font-weight: 800;
          color: #60A5FA;
          margin-bottom: 30px;
        }
        .title {
          font-size: 84px;
          font-weight: 900;
          line-height: 0.95;
          letter-spacing: -4px;
          margin-bottom: 30px;
        }
        .text-gradient {
          background: linear-gradient(to right, #60A5FA, #3B82F6);
          background-clip: text;
          -webkit-background-clip: text;
          color: transparent;
        }
        .subtitle {
          color: #94A3B8;
          font-size: 20px;
          max-width: 700px;
          margin-bottom: 50px;
          line-height: 1.6;
        }
        .btn-mega-primary {
          background: #3B82F6;
          color: white;
          padding: 20px 40px;
          border-radius: 20px;
          font-size: 18px;
          font-weight: 900;
          border: none;
          box-shadow: 0 20px 40px rgba(59, 130, 246, 0.3);
          cursor: pointer;
          transition: transform 0.2s;
        }
        .btn-mega-primary:hover { transform: scale(1.05); }
        .preview-container {
          margin-top: 100px;
          perspective: 1000px;
        }
        .floating-card {
           width: 320px;
           height: 440px;
           background: rgba(255,255,255,0.02);
           border: 1px solid rgba(255,255,255,0.05);
           border-radius: 40px;
           backdrop-filter: blur(40px);
           transform: rotateX(15deg) rotateY(-10deg);
           padding: 40px;
           position: relative;
           animation: float 6s infinite ease-in-out;
        }
        .laser-beam {
           position: absolute;
           top: 0; left: 0; width: 100%; height: 2px;
           background: #3B82F6;
           box-shadow: 0 0 20px #3B82F6;
           animation: scan-line 4s infinite linear;
        }
        @keyframes scan-line { 0% { top: 0% } 100% { top: 100% } }
        @keyframes float { 0%, 100% { transform: translateV(0) rotateX(15deg) } 50% { transform: translateY(-20px) rotateX(20deg) } }
      `}</style>
    </div>
  );
}
