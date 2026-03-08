import { getItemDefinitionById } from '@/models';
import { useAppColors } from '@/store/useThemeStore';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ItemUnlockPopupProps = {
  itemId: string | null;
  onHide: () => void;
};

export function ItemUnlockPopup({ itemId, onHide }: ItemUnlockPopupProps) {
  const colors = useAppColors();
  const insets = useSafeAreaInsets();
  const item = itemId ? getItemDefinitionById(itemId) : null;
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-12)).current;

  useEffect(() => {
    if (!item) return;

    opacity.setValue(0);
    translateY.setValue(-12);

    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -6, duration: 220, useNativeDriver: true }),
      ]).start(onHide);
    }, 2500);

    return () => clearTimeout(timer);
  }, [item, onHide, opacity, translateY]);

  if (!item) return null;

  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top: insets.top + 8, left: 16, right: 16, zIndex: 1000 }}
    >
      <Animated.View
        className="rounded-2xl px-4 py-3"
        style={{
          opacity,
          transform: [{ translateY }],
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.accent + '66',
          shadowColor: '#000',
          shadowOpacity: 0.18,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 3 },
          elevation: 4,
        }}
      >
        <View className="flex-row items-center mb-1">
          <Ionicons name="gift-outline" size={18} color={colors.accent} />
          <Text className="text-sm font-bold ml-1.5" style={{ color: colors.accent }}>
            Reward Unlocked
          </Text>
        </View>
        <Text className="text-base font-semibold" style={{ color: colors.text }}>
          {item.name}
        </Text>
        <Text className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
          {item.effectLabel}
        </Text>
      </Animated.View>
    </View>
  );
}
