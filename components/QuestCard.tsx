import type { Habit } from '@/models';
import { STAT_LABELS } from '@/models';
import { useAppColors } from '@/store/useThemeStore';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useCallback } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

type QuestCardProps = {
  habit: Habit;
  streak?: number;
  completedToday?: boolean;
  onComplete: () => void;
  onLongPress?: () => void;
};

export function QuestCard({
  habit,
  streak = 0,
  completedToday,
  onComplete,
  onLongPress,
}: QuestCardProps) {
  const colors = useAppColors();

  const handlePress = useCallback(() => {
    if (completedToday) return;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onComplete();
  }, [completedToday, onComplete]);

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={onLongPress}
      disabled={completedToday}
      className="mb-3"
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      <View
        className="rounded-xl border p-4"
        style={{
          backgroundColor: colors.card,
          borderColor: completedToday ? colors.success + '40' : colors.cardBorder,
        }}
      >
        {/* Title row */}
        <View className="flex-row items-center justify-between mb-2">
          <Text
            className="text-base font-semibold flex-1 mr-2"
            numberOfLines={1}
            style={{ color: colors.text }}
          >
            {habit.title}
          </Text>
          {streak > 0 && (
            <View
              className="flex-row items-center px-2.5 py-1 rounded-lg"
              style={{ backgroundColor: colors.warning + '20' }}
            >
              <Ionicons name="flame" size={13} color={colors.warning} />
              <Text className="text-xs font-semibold ml-1" style={{ color: colors.warning }}>
                {streak}
              </Text>
            </View>
          )}
        </View>

        {/* Meta row */}
        <View className="flex-row items-center gap-3 mb-3">
          <View className="flex-row items-center">
            <Ionicons name="arrow-up-circle-outline" size={14} color={colors.textSecondary} />
            <Text className="text-xs ml-1" style={{ color: colors.textSecondary }}>
              {STAT_LABELS[habit.statReward]}
            </Text>
          </View>
          <View className="flex-row items-center">
            <Ionicons name="star-outline" size={14} color={colors.textSecondary} />
            <Text className="text-xs ml-1" style={{ color: colors.textSecondary }}>
              {habit.xpReward} XP
            </Text>
          </View>
          <Text className="text-xs capitalize" style={{ color: colors.textTertiary }}>
            {habit.frequency}
          </Text>
        </View>

        {/* Status */}
        {completedToday ? (
          <View className="flex-row items-center">
            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
            <Text className="text-sm font-medium ml-1.5" style={{ color: colors.success }}>
              Completed
            </Text>
          </View>
        ) : (
          <View
            className="flex-row items-center justify-center py-2 rounded-lg border"
            style={{ borderColor: colors.accent + '40' }}
          >
            <Ionicons name="flash-outline" size={14} color={colors.accent} />
            <Text className="text-sm font-medium ml-1.5" style={{ color: colors.accent }}>
              Tap to complete
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}
