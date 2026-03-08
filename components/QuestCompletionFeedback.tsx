import type { QuestCompletionFeedback as QuestCompletionFeedbackData } from '@/services/habitService';
import { useAppColors } from '@/store/useThemeStore';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type QuestCompletionFeedbackProps = {
  visible: boolean;
  feedback: QuestCompletionFeedbackData | null;
  onHide: () => void;
};

export function QuestCompletionFeedback({ visible, feedback, onHide }: QuestCompletionFeedbackProps) {
  const colors = useAppColors();
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-8)).current;
  const scale = useRef(new Animated.Value(0.98)).current;

  useEffect(() => {
    if (!visible || !feedback) return;

    opacity.setValue(0);
    translateY.setValue(-8);
    scale.setValue(0.98);

    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 8, tension: 120, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -6, duration: 220, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.98, duration: 220, useNativeDriver: true }),
      ]).start(() => onHide());
    }, 1900);

    return () => clearTimeout(timer);
  }, [feedback, onHide, opacity, scale, translateY, visible]);

  if (!visible || !feedback) return null;

  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top: insets.top + 8, left: 16, right: 16, zIndex: 999 }}
    >
      <Animated.View
        className="rounded-2xl px-4 py-3"
        style={{
          opacity,
          transform: [{ translateY }, { scale }],
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.success + '66',
          shadowColor: '#000',
          shadowOpacity: 0.18,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 3 },
          elevation: 4,
        }}
      >
        <View className="flex-row items-center mb-1">
          <Ionicons name="checkmark-circle" size={18} color={colors.success} />
          <Text className="text-sm font-bold ml-1.5" style={{ color: colors.success }}>
            Quest Completed!
          </Text>
        </View>
        <Text className="text-sm font-semibold" style={{ color: colors.text }}>
          +{feedback.xpGained} {feedback.stat} XP
        </Text>
        <Text className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
          {feedback.stat} Level Progress: {feedback.xpIntoLevel} / {feedback.xpRequired}
        </Text>
        {typeof feedback.streakDays === 'number' && (
          <Text className="text-xs mt-0.5" style={{ color: colors.warning }}>
            Streak: {feedback.streakDays} Day{feedback.streakDays === 1 ? '' : 's'}
          </Text>
        )}
      </Animated.View>
    </View>
  );
}
