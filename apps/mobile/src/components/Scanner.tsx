import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { useSyncStore } from '../lib/syncStore';

export default function Scanner({ onComplete }: { onComplete: (data?: any) => void }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const cameraRef = useRef<any>(null);
  const locationRef = useRef<{lat: number, lon: number} | null>(null);
  const { addToQueue, syncNow, isSyncing } = useSyncStore();

  useEffect(() => {
    if (permission?.granted) {
      // 1. Pré-chargement de la position GPS pour éviter la latence au clic
      Location.requestForegroundPermissionsAsync().then(({ status }) => {
        if (status === 'granted') {
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
            .then(loc => {
              locationRef.current = { lat: loc.coords.latitude, lon: loc.coords.longitude };
            });
        }
      });

      // 2. Démarrage du compte à rebours
      const timer = setTimeout(() => {
        setCountdown(3);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [permission]);

  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && !isScanning) {
      takePicture();
    }
  }, [countdown]);

  async function takePicture() {
    if (cameraRef.current && !isScanning) {
      try {
        setIsScanning(true);
        // Secousse de confirmation de capture
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        // Capture GPS (Gérée par pré-chargement locationRef.current)
        const location = locationRef.current;

        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          skipProcessing: false,
        });

        const fileName = `${Date.now()}.jpg`;
        const localUri = `${FileSystem.documentDirectory}scans/${fileName}`;
        
        await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}scans/`, { intermediates: true });
        await FileSystem.moveAsync({ from: photo.uri, to: localUri });

        addToQueue(localUri, location || undefined);
        const extractionData = await syncNow();
        
        if (extractionData) {
          onComplete(extractionData);
        } else {
          Alert.alert('Silent Scan', 'Document enregistré pour synchronisation ultérieure.');
          onComplete();
        }
      } catch (err) {
        console.error('Erreur scan:', err);
        setCountdown(3); // Reset
      } finally {
        setIsScanning(false);
      }
    }
  }

  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <View className="flex-1 items-center justify-center p-6 bg-white">
        <Text className="text-center mb-4 font-medium">Caméra requise pour le scan Docling.</Text>
        <TouchableOpacity onPress={requestPermission} className="bg-blue-600 px-8 py-4 rounded-2xl">
          <Text className="text-white font-bold">ACTIVER</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <CameraView ref={cameraRef} className="flex-1">
        <View className="flex-1 items-center justify-center">
          {/* Viseur Crystal Design */}
          <View className={`w-72 h-[450px] border-4 ${countdown === 0 ? 'border-blue-400' : 'border-white/20'} rounded-[40px] border-dashed items-center justify-center overflow-hidden`}>
             <View className="absolute inset-0 bg-white/5" />
             {countdown !== null && countdown > 0 && (
               <Text className="text-white text-8xl font-black opacity-30">{countdown}</Text>
             )}
             {(isScanning || isSyncing) && (
               <ActivityIndicator size="large" color="#3B82F6" />
             )}
          </View>
          
          <View className="mt-12 items-center">
            <Text className="text-white/60 font-bold tracking-[4px] uppercase text-xs mb-2">
              Docling Silent Pilot
            </Text>
            <Text className="text-white/40 text-sm">
              Stabilisez pour capturer automatiquement
            </Text>
          </View>
        </View>
      </CameraView>
    </View>
  );
}
