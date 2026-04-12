import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';
import { authClient } from './auth-client';

interface SyncItem {
  uri: string;
  timestamp: number;
  attempts: number;
  location?: { lat: number; lon: number };
}

interface SyncState {
  queue: SyncItem[];
  isSyncing: boolean;
  addToQueue: (uri: string, location?: { lat: number; lon: number }) => void;
  syncNow: () => Promise<any | null>;
}

// Utiliser l'IP de votre machine pour les tests sur mobile physique
const API_URL = 'http://192.168.1.1:8787/api/v1/scan'; 
const MAX_ATTEMPTS = 5;

export const useSyncStore = create<SyncState>()(
  persist(
    (set, get) => ({
      queue: [],
      isSyncing: false,
      
      addToQueue: (uri: string, location?: { lat: number; lon: number }) => {
        set((state) => ({ 
          queue: [...state.queue, { uri, timestamp: Date.now(), attempts: 0, location }] 
        }));
      },

      syncNow: async (): Promise<any | null> => {
        const { queue, isSyncing } = get();
        if (isSyncing || queue.length === 0) return null;

        const net = await Network.getNetworkStateAsync();
        if (!net.isConnected || !net.isInternetReachable) return null;

        set({ isSyncing: true });
        let lastResult = null;
        const currentQueue = [...get().queue];

        try {
          while (currentQueue.length > 0) {
            const item = currentQueue[0];
            
            // On saute les items qui ont trop échoué
            if (item.attempts >= MAX_ATTEMPTS) {
              console.warn(`⚠️ Abandon de l'item ${item.uri} (trop d'échecs)`);
              currentQueue.shift();
              continue;
            }

            const formData = new FormData();
            formData.append('file', {
              uri: item.uri,
              name: `scan_${item.timestamp}.jpg`,
              type: 'image/jpeg',
            } as any);
            formData.append('source', 'mobile');
            if (item.location) {
              formData.append('latitude', item.location.lat.toString());
              formData.append('longitude', item.location.lon.toString());
            }

            const response = await fetch(API_URL, {
              method: 'POST',
              headers: { 'Authorization': 'Bearer development-test-token' },
              body: formData
            });

            if (response.ok) {
              const res = await response.json();
              lastResult = res.data;
              currentQueue.shift();
              console.log('✅ Un élément synchronisé');
            } else {
              item.attempts++;
              // On arrête la boucle pour cet essai si c'est une erreur serveur
              break; 
            }
            
            // Mise à jour de la queue après chaque réussite
            set({ queue: [...currentQueue] });
          }
          return lastResult;
        } catch (err) {
          console.error('💥 Erreur durant le drainage de la file:', err);
          return null;
        } finally {
          set({ isSyncing: false });
        }
      }
    }),
    {
      name: 'docling-sync-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
