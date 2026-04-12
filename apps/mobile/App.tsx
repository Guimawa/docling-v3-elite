import "./global.css";
import React, { useState, useEffect } from 'react';
import { supabase } from './src/lib/supabase';
import Scanner from './src/components/Scanner';
import QuickSwipeReview from './src/components/QuickSwipeReview';
import Auth from './src/components/Auth';
import Onboarding from './src/components/Onboarding';
import { View, Text, SafeAreaView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Session } from '@supabase/supabase-js';
import { StatusBar } from 'expo-status-bar';
import { useSyncStore } from './src/lib/syncStore';

import { authClient } from './src/lib/auth-client';

export default function App() {
  const { data: sessionData, isPending } = authClient.useSession();
  const session = sessionData?.user;
  
  const [view, setView] = useState<'home' | 'scanner' | 'review' | 'onboarding'>('home');
  const [currentInvoice, setCurrentInvoice] = useState<any>(null);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const { queue, syncNow } = useSyncStore();

  useEffect(() => {
    if (session) {
      checkProfile(session.id);
    }
  }, [session]);

  useEffect(() => {
    // Background Sync Watchdog (FR10)
    if (queue.length > 0) syncNow();
    const interval = setInterval(() => {
      if (queue.length > 0) syncNow();
    }, 30000);
    return () => clearInterval(interval);
  }, [queue.length]);

  async function checkProfile(userId: string) {
    try {
      const { data: profile } = await supabase.from('profiles').select('specialization').eq('id', userId).single();
      if (profile && profile.specialization && profile.specialization !== 'Autre') {
        setHasProfile(true);
      } else {
        setHasProfile(false);
        setView('onboarding');
      }
    } catch (e) {
      setHasProfile(false);
      setView('onboarding');
    }
  }

  if (isPending) return (
    <View className="flex-1 items-center justify-center bg-crystal-light">
      <ActivityIndicator size="large" color="#3B82F6" />
    </View>
  );

  if (!session) return <Auth />;
  
  if (hasProfile === false || view === 'onboarding') {
    return <Onboarding onComplete={() => {
      setHasProfile(true);
      setView('home');
    }} />;
  }

  if (view === 'scanner') {
    return <Scanner onComplete={(data?: any) => {
      if (data) {
        setCurrentInvoice(data);
        setView('review');
      } else {
        setView('home');
      }
    }} />;
  }

  if (view === 'review' && currentInvoice) {
    return (
      <QuickSwipeReview 
        data={{
          fournisseur: currentInvoice.fournisseur || 'Inconnu',
          total_ht: currentInvoice.total_ht || 0,
          total_tva: currentInvoice.total_tva || 0,
          total_ttc: currentInvoice.total_ttc || 0,
          date_facture: currentInvoice.date_facture || 'N/A'
        }}
        onConfirm={async () => {
          await supabase.from('invoices').update({ status: 'completed' }).eq('id', currentInvoice.id);
          setView('home');
          Alert.alert('Succès', 'Facture validée et archivée.');
        }}
        onReject={() => setView('home')}
      />
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-crystal-light">
      <View className="flex-1 items-center justify-center p-6">
        <View className="bg-white p-8 rounded-3xl shadow-xl shadow-blue-200/50 w-full max-w-sm border border-white">
          <Text className="text-4xl font-black text-charcoal mb-2 tracking-tighter">Pronto</Text>
          <Text className="text-pronto font-semibold mb-6">{session.email}</Text>
          
          {queue.length > 0 && (
            <View className="bg-orange-50 p-4 rounded-2xl mb-6 border border-orange-100 flex-row items-center">
              <View className="w-2.5 h-2.5 bg-orange-400 rounded-full mr-3" />
              <Text className="text-orange-700 text-sm font-bold">
                {queue.length} facture(s) en attente
              </Text>
            </View>
          )}

          <Text className="text-gray-500 mb-8 leading-6 text-base">
            Intelligence prix BTP. Scannez, validez, comparez.
          </Text>

          <TouchableOpacity 
            onPress={() => setView('scanner')}
            className="bg-pronto h-20 rounded-2xl items-center justify-center shadow-2xl shadow-blue-400/40 mb-4"
            activeOpacity={0.8}
          >
            <Text className="text-white font-black text-xl">SCAN RAPIDE</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => authClient.signOut()}
            className="h-12 items-center justify-center mt-2"
          >
            <Text className="text-gray-300 font-bold">Déconnexion</Text>
          </TouchableOpacity>
        </View>
        <StatusBar style="dark" />
      </View>
    </SafeAreaView>
  );
}
