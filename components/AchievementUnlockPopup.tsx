import type { AchievementStatus } from '@/models';
import { useAppColors } from '@/store/useThemeStore';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, Text, View } from 'react-native';

type AchievementUnlockPopupProps = {
  achievement: AchievementStatus | null;
  onHide: () => void;
};

export function AchievementUnlockPopup({ achievement, onHide }: AchievementUnlockPopupProps) {
  const colors = useAppColors();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-10)).current;

  useEffect(() => {
    if (!achievement) return;
    opacity.setValue(0);
    translateY.setValue(-10);

    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -6, duration: 220, useNativeDriver: true }),
      ]).start(onHide);
    }, 2300);

    return () => clearTimeout(timer);
  }, [achievement, onHide, opacity, translateY]);

  if (!achievement) return null;

  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 84, left: 16, right: 16, zIndex: 1000 }}>
      <Animated.View
        className="rounded-2xl px-4 py-3"
        style={{
          opacity,
          transform: [{ translateY }],
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.warning + '66',
          shadowColor: '#000',
          shadowOpacity: 0.18,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 3 },
          elevation: 4,
        }}
      >
        <View className="flex-row items-center mb-1">
          <Ionicons name="trophy-outline" size={18} color={colors.warning} />
          <Text className="text-sm font-bold ml-1.5" style={{ color: colors.warning }}>
            Achievement Unlocked
          </Text>
        </View>
        <Text className="text-base font-semibold" style={{ color: colors.text }}>
          {achievement.title}
        </Text>
        <Text className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
          &quot;{achievement.description}&quot;
        </Text>
      </Animated.View>
    </View>
  );
}
