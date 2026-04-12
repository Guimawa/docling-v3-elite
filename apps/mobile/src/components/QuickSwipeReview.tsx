import React from 'react';
import { View, Text, StyleSheet, Dimensions, ImageBackground } from 'react-native';
import { PanGestureHandler, PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import Animated, { 
  useAnimatedGestureHandler, 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring, 
  runOnJS,
  interpolate,
  Extrapolate
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

interface ReviewData {
  fournisseur: string;
  total_ttc: number;
  date_facture: string;
}

export default function QuickSwipeReview({ 
  data, 
  onConfirm, 
  onReject 
}: { 
  data: ReviewData; 
  onConfirm: () => void; 
  onReject: () => void;
}) {
  const translateX = useSharedValue(0);

  const onPanGesture = useAnimatedGestureHandler<PanGestureHandlerGestureEvent, { startX: number }>({
    onStart: (_, ctx) => {
      ctx.startX = translateX.value;
    },
    onActive: (event, ctx) => {
      translateX.value = ctx.startX + event.translationX;
    },
    onEnd: (event) => {
      if (event.translationX > SWIPE_THRESHOLD) {
        translateX.value = withSpring(SCREEN_WIDTH);
        runOnJS(Haptics.notificationAsync)(Haptics.NotificationFeedbackType.Success);
        runOnJS(onConfirm)();
      } else if (event.translationX < -SWIPE_THRESHOLD) {
        translateX.value = withSpring(-SCREEN_WIDTH);
        runOnJS(Haptics.notificationAsync)(Haptics.NotificationFeedbackType.Warning);
        runOnJS(onReject)();
      } else {
        translateX.value = withSpring(0);
      }
    },
  });

  const cardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
      [-10, 0, 10],
      Extrapolate.CLAMP
    );

    return {
      transform: [
        { translateX: translateX.value },
        { rotate: `${rotate}deg` }
      ],
    };
  });

  const likeOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD / 2], [0, 1], Extrapolate.CLAMP),
    transform: [{ scale: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0.8, 1], Extrapolate.CLAMP) }]
  }));

  const rejectOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD / 2, 0], [1, 0], Extrapolate.CLAMP),
    transform: [{ scale: interpolate(translateX.value, [-SWIPE_THRESHOLD, 0], [1, 0.8], Extrapolate.CLAMP) }]
  }));

  return (
    <View style={styles.container}>
      <View className="mb-10 items-center">
        <Text className="text-charcoal text-2xl font-black tracking-tighter">Vérification</Text>
        <Text className="text-blue-500 font-bold uppercase text-[10px] tracking-[3px]">Docling Elite 2026</Text>
      </View>

      <PanGestureHandler onGestureEvent={onPanGesture}>
        <Animated.View style={[styles.cardContainer, cardStyle]}>
          <BlurView intensity={80} tint="light" style={styles.blurCard}>
            <View className="p-8 justify-between flex-1">
              <View>
                <View className="bg-blue-50 self-start px-3 py-1 rounded-full mb-4">
                  <Text className="text-blue-600 font-black text-[10px] uppercase">Facture Détectée</Text>
                </View>
                
                <Text className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mb-1">Émetteur</Text>
                <Text className="text-charcoal text-4xl font-black mb-10 leading-none">{data.fournisseur}</Text>

                <View className="h-[1px] bg-slate-100 w-full mb-8" />

                <Text className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mb-1">Total à payer</Text>
                <Text className="text-blue-600 text-6xl font-black tracking-tighter">{data.total_ttc.toFixed(2)}€</Text>
              </View>

              <View className="flex-row items-baseline">
                <Text className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mr-2">Date du scan</Text>
                <Text className="text-charcoal font-black text-base">{data.date_facture}</Text>
              </View>
            </View>

            {/* Overlays */}
            <Animated.View style={[styles.indicator, styles.likeIndicator, likeOpacity]}>
              <Text style={styles.indicatorText}>OUI ✅</Text>
            </Animated.View>
            <Animated.View style={[styles.indicator, styles.rejectIndicator, rejectOpacity]}>
              <Text style={[styles.indicatorText, { color: '#EF4444' }]}>NON ❌</Text>
            </Animated.View>
          </BlurView>
        </Animated.View>
      </PanGestureHandler>

      <View className="mt-16 items-center">
        <View className="flex-row items-center space-x-4">
           <View className="w-12 h-[1px] bg-slate-200" />
           <Text className="text-slate-300 font-bold text-xs">GLISSER POUR DÉCIDER</Text>
           <View className="w-12 h-[1px] bg-slate-200" />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F9FF', // Crystal Blue Light
    padding: 20
  },
  cardContainer: {
    width: SCREEN_WIDTH * 0.88,
    height: 520,
    borderRadius: 40,
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 10,
  },
  blurCard: {
    flex: 1,
    borderRadius: 40,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  indicator: {
    position: 'absolute',
    top: '35%',
    alignSelf: 'center',
    paddingHorizontal: 30,
    paddingVertical: 15,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  likeIndicator: {
    right: -20,
    transform: [{ rotate: '15deg' }],
  },
  rejectIndicator: {
    left: -20,
    borderColor: '#EF4444',
    transform: [{ rotate: '-15deg' }],
  },
  indicatorText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#3B82F6',
  }
});
