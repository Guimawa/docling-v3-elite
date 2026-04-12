import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGeoLocation } from '../hooks/useGeoLocation';

export default function AuthPage({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  const { config, loading: geoLoading } = useGeoLocation();
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [legalId, setLegalId] = useState('');

  return (
    <div className="auth-fullscreen">
      <div className="auth-card animate-in zoom-in duration-500">
        <header className="mb-10 items-center flex flex-col">
          <h1 className="text-4xl font-black text-slate-900 mb-2">Docling<span className="text-blue-500">.</span></h1>
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[4px]">
            {t('welcome')}
          </p>
        </header>

        {geoLoading ? (
          <div className="flex flex-col items-center py-10">
            <div className="loader-ring mb-4" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('country_detect')}</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="input-group">
              <label>{t('company_name')}</label>
              <input 
                type="text" 
                placeholder="Ex: Pronto Construction SL" 
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label>{config?.legal || 'ID'}</label>
              <input 
                type="text" 
                placeholder={config?.country === 'FR' ? '14 chiffres' : 'Ex: B12345678'} 
                value={legalId}
                onChange={(e) => setLegalId(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label>Email Pro</label>
              <input 
                type="email" 
                placeholder="mateo@pronto.doc" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <button className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-lg shadow-2xl shadow-slate-900/20 hover:scale-[1.02] transition-transform">
              {t('signup')}
            </button>

            <div className="pt-4 text-center">
              <p className="text-xs text-slate-400 font-medium">
                Détecté en : <span className="text-blue-500 font-black">{config?.country}</span>
              </p>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .auth-fullscreen {
          min-height: 100vh;
          background: #F8FAFC;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background-image: 
            radial-gradient(at 0% 0%, rgba(59, 130, 246, 0.1) 0px, transparent 50%),
            radial-gradient(at 100% 100%, rgba(59, 130, 246, 0.1) 0px, transparent 50%);
        }
        .auth-card {
          background: white;
          width: 100%;
          max-width: 440px;
          padding: 50px;
          border-radius: 40px;
          box-shadow: 0 40px 100px -20px rgba(0,0,0,0.1);
          border: 1px solid rgba(255,255,255,0.8);
        }
        .input-group label {
          display: block;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          color: #94A3B8;
          letter-spacing: 1px;
          margin-bottom: 8px;
          margin-left: 4px;
        }
        .input-group input {
          width: 100%;
          background: #F1F5F9;
          border: 2px solid transparent;
          padding: 16px 20px;
          border-radius: 18px;
          font-weight: 600;
          color: #1E293B;
          transition: all 0.2s;
        }
        .input-group input:focus {
          border-color: #3B82F6;
          background: white;
          outline: none;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
        }
        .loader-ring {
          width: 40px;
          height: 40px;
          border: 4px solid #F1F5F9;
          border-top: 4px solid #3B82F6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
