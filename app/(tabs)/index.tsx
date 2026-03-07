import { ProgressBar } from '@/components/ProgressBar';
import { QuestCard } from '@/components/QuestCard';
import { StatCard } from '@/components/StatCard';
import { ThemePicker } from '@/components/ThemePicker';
import { useGameHydration } from '@/hooks/useGameHydration';
import type { StatType } from '@/models';
import { totalXpForLevel, xpRequiredForLevel } from '@/models';
import { useGameStore } from '@/store/useGameStore';
import { useAppColors } from '@/store/useThemeStore';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

const STAT_ORDER: StatType[] = ['STR', 'INT', 'WIS', 'CHA', 'VIT'];

export default function DashboardScreen() {
  useGameHydration();
  const user = useGameStore((s) => s.user);
  const habits = useGameStore((s) => s.habits);
  const completeHabit = useGameStore((s) => s.completeHabit);
  const getStreak = useGameStore((s) => s.getStreak);
  const isCompletedToday = useGameStore((s) => s.isCompletedToday);
  const getEffectiveStat = useGameStore((s) => s.getEffectiveStat);
  const _lastAction = useGameStore((s) => s.lastAction);

  const colors = useAppColors();
  const [showThemePicker, setShowThemePicker] = useState(false);

  if (!user) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.background }}>
        <Text style={{ color: colors.textSecondary }}>Loading...</Text>
      </View>
    );
  }

  const xpIntoLevel = user.xp - totalXpForLevel(user.level);
  const required = xpRequiredForLevel(user.level);
  const xpProgress = required > 0 ? xpIntoLevel / required : 1;
  const completedCount = habits.filter((h) => isCompletedToday(h.id)).length;

  return (
    <ScrollView
      className="flex-1"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
    >
      {/* Hero */}
      <View className="mt-4">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-2xl font-bold" style={{ color: colors.text }}>
            LifeRPG
          </Text>
          <Pressable
            onPress={() => setShowThemePicker(true)}
            className="w-9 h-9 items-center justify-center rounded-xl"
            style={({ pressed }) => ({
              backgroundColor: pressed ? colors.inputBg : 'transparent',
            })}
          >
            <Ionicons name="color-palette-outline" size={22} color={colors.textSecondary} />
          </Pressable>
        </View>

        <View className="flex-row items-center justify-between mb-2">
          <View
            className="flex-row items-center px-3 py-1.5 rounded-lg"
            style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder }}
          >
            <Ionicons name="shield-outline" size={14} color={colors.accent} />
            <Text className="text-sm font-bold ml-1.5" style={{ color: colors.accent }}>
              Level {user.level}
            </Text>
          </View>
          <Text className="text-sm" style={{ color: colors.textSecondary }}>
            {xpIntoLevel} / {required} XP
          </Text>
        </View>
        <ProgressBar progress={xpProgress} height={10} />
        {habits.length > 0 && (
          <Text className="text-xs mt-2 text-center" style={{ color: colors.textTertiary }}>
            {completedCount}/{habits.length} quests completed today
          </Text>
        )}
      </View>

      {/* Stats */}
      <View className="mt-8">
        <View className="flex-row items-center mb-3">
          <Ionicons name="stats-chart-outline" size={18} color={colors.text} />
          <Text className="text-lg font-semibold ml-2" style={{ color: colors.text }}>
            Stats
          </Text>
        </View>
        <View className="flex-row flex-wrap gap-2">
          {STAT_ORDER.map((stat) => (
            <StatCard key={stat} stat={stat} value={getEffectiveStat(stat)} compact />
          ))}
        </View>
      </View>

      {/* Quests */}
      <View className="mt-8">
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center">
            <Ionicons name="flash-outline" size={18} color={colors.text} />
            <Text className="text-lg font-semibold ml-2" style={{ color: colors.text }}>
              Today's Quests
            </Text>
          </View>
          {habits.length > 0 && (
            <Text className="text-xs" style={{ color: colors.textTertiary }}>
              {completedCount}/{habits.length}
            </Text>
          )}
        </View>
        {habits.length === 0 ? (
          <Text className="text-sm italic" style={{ color: colors.textTertiary }}>
            No habits yet. Add some in the Quests tab!
          </Text>
        ) : (
          habits.map((habit) => (
            <QuestCard
              key={habit.id}
              habit={habit}
              streak={getStreak(habit.id)}
              completedToday={isCompletedToday(habit.id)}
              onComplete={() => completeHabit(habit.id)}
            />
          ))
        )}
      </View>

      {/* Theme Picker */}
      <ThemePicker
        visible={showThemePicker}
        onClose={() => setShowThemePicker(false)}
      />
    </ScrollView>
  );
}
