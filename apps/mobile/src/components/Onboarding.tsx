import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';

const CRAFTS = [
  { id: 'Plomberie', icon: '🚰' },
  { id: 'Électricité', icon: '⚡' },
  { id: 'Maçonnerie', icon: '🧱' },
  { id: 'Peinture', icon: '🎨' },
  { id: 'Menuiserie', icon: '🪚' },
  { id: 'Climatisation', icon: '❄️' },
  { id: 'Autre', icon: '🛠️' }
];

export default function Onboarding({ onComplete }: { onComplete: () => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function saveProfile() {
    if (!selected) return;
    setLoading(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase.from('profiles').update({
        specialization: selected,
        updated_at: new Date().toISOString()
      }).eq('id', user.id);

      if (!error) onComplete();
    }
    setLoading(false);
  }

  return (
    <View className="flex-1 bg-crystal-light p-6 justify-center">
      <Text className="text-3xl font-bold text-charcoal mb-2">Presque prêt !</Text>
      <Text className="text-gray-500 mb-8">Quel est votre corps de métier ? Cela nous aide à mieux classer vos factures.</Text>

      <ScrollView className="max-h-96">
        <View className="flex-row flex-wrap justify-between">
          {CRAFTS.map((craft) => (
            <TouchableOpacity
              key={craft.id}
              onPress={() => setSelected(craft.id)}
              className={`w-[48%] p-4 mb-4 rounded-2xl border-2 items-center ${
                selected === craft.id ? 'border-pronto bg-blue-50' : 'border-gray-100 bg-white'
              }`}
            >
              <Text className="text-3xl mb-2">{craft.icon}</Text>
              <Text className={`font-semibold ${selected === craft.id ? 'text-pronto' : 'text-gray-600'}`}>
                {craft.id}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <TouchableOpacity
        onPress={saveProfile}
        disabled={!selected || loading}
        className={`h-16 rounded-2xl items-center justify-center mt-8 shadow-lg ${
          selected ? 'bg-pronto shadow-blue-400/20' : 'bg-gray-200'
        }`}
      >
        {loading ? <ActivityIndicator color="white" /> : (
          <Text className="text-white font-bold text-lg">Commencer</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
