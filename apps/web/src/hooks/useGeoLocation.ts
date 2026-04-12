import { useState, useEffect } from 'react';
import i18n from '../lib/i18n';

interface GeoConfig {
  country: string;
  lang: string;
  legal: string;
  tax: string;
}

export function useGeoLocation() {
  const [config, setConfig] = useState<GeoConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function detect() {
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'https://docling-api.guimawa.workers.dev';
        const response = await fetch(`${API_URL}/api/v1/geo/detect`);
        const data = await response.json();
        
        if (data.success) {
          setConfig(data);
          // Auto-switch language if not manually set
          if (!localStorage.getItem('i18nextLng')) {
            i18n.changeLanguage(data.lang);
          }
        }
      } catch (err) {
        console.error("Géo-détection impossible, repli sur FR:", err);
        setConfig({ country: 'FR', lang: 'fr', legal: 'SIRET', tax: 'TVA' });
      } finally {
        setLoading(false);
      }
    }
    detect();
  }, []);

  return { config, loading };
}
