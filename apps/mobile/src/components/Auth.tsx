import React, { useState } from 'react';
import { Alert, StyleSheet, View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { authClient } from '../lib/auth-client';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>('login');

  async function signInWithEmail() {
    setLoading(true);
    const { error } = await authClient.signIn.email({ 
      email, 
      password 
    });
    if (error) Alert.alert('Erreur', error.message || 'Échec de connexion');
    setLoading(false);
  }

  async function signUpWithEmail() {
    if (!fullName) return Alert.alert('Attention', 'Veuillez saisir votre nom complet.');
    setLoading(true);
    const { error } = await authClient.signUp.email({
      email,
      password,
      name: fullName,
    });

    if (error) {
      Alert.alert('Erreur', error.message || 'Échec de l\'inscription');
    } else {
      Alert.alert('Succès', 'Votre compte a été créé.');
    }
    setLoading(false);
  }

  return (
    <View className="flex-1 justify-center p-6 bg-crystal-light">
      <View className="bg-white p-8 rounded-3xl shadow-xl shadow-blue-100 border border-white">
        <Text className="text-3xl font-bold text-charcoal mb-2">
          {mode === 'login' ? 'Bon retour !' : 'Bienvenue'}
        </Text>
        <Text className="text-gray-500 mb-8">
          {mode === 'login' ? 'Connectez-vous pour piloter vos prix.' : 'Créez votre compte en quelques secondes.'}
        </Text>

        <View className="gap-y-4">
          {mode === 'register' && (
            <TextInput
              className="bg-gray-50 p-4 h-14 rounded-xl border border-gray-100 text-charcoal"
              onChangeText={setFullName}
              value={fullName}
              placeholder="Prénom et Nom"
            />
          )}

          <TextInput
            className="bg-gray-50 p-4 h-14 rounded-xl border border-gray-100 text-charcoal"
            onChangeText={setEmail}
            value={email}
            placeholder="email@adresse.com"
            autoCapitalize={'none'}
            keyboardType="email-address"
          />

          <TextInput
            className="bg-gray-50 p-4 h-14 rounded-xl border border-gray-100 text-charcoal"
            onChangeText={setPassword}
            value={password}
            secureTextEntry={true}
            placeholder="Mot de passe"
            autoCapitalize={'none'}
          />
        </View>

        <View className="mt-8 gap-y-3">
          <TouchableOpacity
            disabled={loading}
            onPress={() => mode === 'login' ? signInWithEmail() : signUpWithEmail()}
            className="bg-pronto h-16 rounded-2xl items-center justify-center shadow-lg shadow-blue-400/20"
            activeOpacity={0.8}
          >
            {loading ? <ActivityIndicator color="white" /> : (
              <Text className="text-white font-bold text-lg">
                {mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
              </Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => setMode(mode === 'login' ? 'register' : 'login')}
            className="h-12 items-center justify-center"
          >
            <Text className="text-gray-400 font-medium">
              {mode === 'login' ? "Pas de compte ? S'inscrire" : "Déjà inscrit ? Se connecter"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
