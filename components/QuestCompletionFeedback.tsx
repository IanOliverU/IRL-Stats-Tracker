import type { QuestCompletionFeedback as QuestCompletionFeedbackData } from '@/services/habitService';
import { triggerQuestCompleteHaptic } from '@/lib/feedback';
import { useAppColors } from '@/store/useThemeStore';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProgressBar } from './ProgressBar';

type QuestCompletionFeedbackProps = {
  visible: boolean;
  feedback: QuestCompletionFeedbackData | null;
  onHide: () => void;
};

export function QuestCompletionFeedback({ visible, feedback, onHide }: QuestCompletionFeedbackProps) {
  const colors = useAppColors();
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-18)).current;
  const scale = useRef(new Animated.Value(0.94)).current;
  const xpScale = useRef(new Animated.Value(0.72)).current;
  const burstScale = useRef(new Animated.Value(0.5)).current;
  const burstOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible || !feedback) return;

    opacity.setValue(0);
    translateY.setValue(-18);
    scale.setValue(0.94);
    xpScale.setValue(0.72);
    burstScale.setValue(0.5);
    burstOpacity.setValue(0);
    void triggerQuestCompleteHaptic();

    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, friction: 9, tension: 115, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 8, tension: 135, useNativeDriver: true }),
      Animated.sequence([
        Animated.spring(xpScale, { toValue: 1.12, friction: 6, tension: 160, useNativeDriver: true }),
        Animated.spring(xpScale, { toValue: 1, friction: 8, tension: 120, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(burstOpacity, { toValue: 1, duration: 120, useNativeDriver: true }),
        Animated.timing(burstOpacity, { toValue: 0, duration: 340, useNativeDriver: true }),
      ]),
      Animated.spring(burstScale, { toValue: 1, friction: 7, tension: 150, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -10, duration: 220, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.98, duration: 220, useNativeDriver: true }),
      ]).start(() => onHide());
    }, 2200);

    return () => clearTimeout(timer);
  }, [burstOpacity, burstScale, feedback, onHide, opacity, scale, translateY, visible, xpScale]);

  if (!visible || !feedback) return null;

  const levelProgress = feedback.xpRequired > 0 ? feedback.xpIntoLevel / feedback.xpRequired : 1;

  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top: insets.top + 8, left: 16, right: 16, zIndex: 999 }}
    >
      <Animated.View
        className="rounded-3xl px-4 py-4"
        style={{
          opacity,
          transform: [{ translateY }, { scale }],
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.success + '66',
          shadowColor: '#000',
          shadowOpacity: 0.22,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 8 },
          elevation: 8,
        }}
      >
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 8,
            right: 18,
            opacity: burstOpacity,
            transform: [{ scale: burstScale }],
          }}
        >
          <View style={{ position: 'absolute', top: -2, left: 12 }}>
            <Ionicons name="sparkles" size={12} color={colors.warning} />
          </View>
          <View style={{ position: 'absolute', top: 10, left: 0 }}>
            <Ionicons name="star" size={9} color={colors.warning} />
          </View>
          <View style={{ position: 'absolute', top: 14, left: 26 }}>
            <Ionicons name="sparkles" size={10} color={colors.accent} />
          </View>
        </Animated.View>

        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-3">
            <View className="flex-row items-center">
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text className="ml-1.5 text-sm font-bold" style={{ color: colors.success }}>
                Quest Cleared
              </Text>
            </View>
            <Text className="mt-1 text-lg font-semibold" style={{ color: colors.text }}>
              +{feedback.statIncrease.amount} {feedback.stat}
            </Text>
            <Text className="mt-0.5 text-xs" style={{ color: colors.textSecondary }}>
              XP landed instantly. Your build moved forward.
            </Text>
          </View>

          <Animated.View
            className="rounded-2xl px-3 py-2"
            style={{
              transform: [{ scale: xpScale }],
              backgroundColor: colors.success + '16',
              borderWidth: 1,
              borderColor: colors.success + '40',
            }}
          >
            <Text className="text-lg font-black" style={{ color: colors.success }}>
              +{feedback.xpGained}
            </Text>
            <Text className="text-[10px] font-semibold text-center" style={{ color: colors.success }}>
              XP
            </Text>
          </Animated.View>
        </View>

        <View className="mt-4">
          <ProgressBar progress={levelProgress} height={10} fillColor={colors.success} />
          <View className="mt-2 flex-row items-center justify-between">
            <Text className="text-xs font-medium" style={{ color: colors.textSecondary }}>
              Level progress
            </Text>
            <Text className="text-xs font-semibold" style={{ color: colors.text }}>
              {feedback.xpIntoLevel} / {feedback.xpRequired}
            </Text>
          </View>
        </View>

        <View className="mt-3 flex-row flex-wrap gap-2">
          <View
            className="rounded-full px-3 py-1.5"
            style={{ backgroundColor: colors.accent + '14', borderWidth: 1, borderColor: colors.accent + '30' }}
          >
            <Text className="text-[11px] font-semibold" style={{ color: colors.accent }}>
              {feedback.stat} boosted
            </Text>
          </View>
          {typeof feedback.streakDays === 'number' && (
            <View
              className="rounded-full px-3 py-1.5"
              style={{ backgroundColor: colors.warning + '14', borderWidth: 1, borderColor: colors.warning + '32' }}
            >
              <Text className="text-[11px] font-semibold" style={{ color: colors.warning }}>
                {feedback.streakDays} day streak
              </Text>
            </View>
          )}
        </View>
      </Animated.View>
    </View>
  );
}
