import { ProgressBar } from '@/components/ProgressBar';
import { useGameHydration } from '@/hooks/useGameHydration';
import type { StatType } from '@/models';
import { useGameStore } from '@/store/useGameStore';
import { useAppColors } from '@/store/useThemeStore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

const STAT_ORDER: StatType[] = ['STR', 'INT', 'WIS', 'CHA', 'VIT'];
const DAILY_XP_TARGET = 200;

const MOTIVATION_MESSAGES = [
  'Consistency beats motivation. Complete at least one quest today.',
  'Small wins compound. Clear one quest now.',
  'Momentum starts with one action. Start your easiest quest first.',
  'Progress is built daily. Keep your streak alive.',
  'Done is better than perfect. Finish one meaningful quest.',
];

function getGreeting(now: Date): string {
  const hour = now.getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
}

function getDailyMessage(now: Date): string {
  const hash = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  const index = hash % MOTIVATION_MESSAGES.length;
  return MOTIVATION_MESSAGES[index];
}

export default function WelcomeScreen() {
  const hydrated = useGameHydration();
  const router = useRouter();
  const colors = useAppColors();

  const user = useGameStore((s) => s.user);
  const items = useGameStore((s) => s.items);
  const habits = useGameStore((s) => s.habits);
  const customQuests = useGameStore((s) => s.customQuests);
  const isCompletedToday = useGameStore((s) => s.isCompletedToday);
  const getQuestStreakSummary = useGameStore((s) => s.getQuestStreakSummary);
  const getTodayQuestXp = useGameStore((s) => s.getTodayQuestXp);

  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const effectiveStats = useMemo<Record<StatType, number>>(() => {
    const bonusByStat: Record<StatType, number> = { STR: 0, INT: 0, WIS: 0, CHA: 0, VIT: 0 };
    for (const item of items) {
      if (!item.unlockedAt) continue;
      bonusByStat[item.statBonus] += item.bonusAmount;
    }
    return {
      STR: (user?.str ?? 0) + bonusByStat.STR,
      INT: (user?.int ?? 0) + bonusByStat.INT,
      WIS: (user?.wis ?? 0) + bonusByStat.WIS,
      CHA: (user?.cha ?? 0) + bonusByStat.CHA,
      VIT: (user?.vit ?? 0) + bonusByStat.VIT,
    };
  }, [items, user?.cha, user?.int, user?.str, user?.vit, user?.wis]);

  const strongestStat = useMemo<StatType>(() => {
    return STAT_ORDER.reduce((best, stat) => (effectiveStats[stat] > effectiveStats[best] ? stat : best), 'STR');
  }, [effectiveStats]);

  const streak = getQuestStreakSummary();
  const todayXp = getTodayQuestXp();
  const habitCompletedCount = habits.filter((habit) => isCompletedToday(habit.id)).length;
  const customCompletedToday = customQuests.filter((quest) => !!quest.completedAt).length;
  const questCompletedToday = habitCompletedCount + customCompletedToday;
  const questTargetToday = habits.length + customQuests.length;
  const xpProgress = Math.min(1, todayXp / DAILY_XP_TARGET);

  const todayQuestItems = useMemo(
    () => [
      ...habits.map((habit) => ({
        id: habit.id,
        type: 'habit' as const,
        title: habit.title,
        completed: isCompletedToday(habit.id),
      })),
      ...customQuests.map((quest) => ({
        id: quest.id,
        type: 'custom' as const,
        title: quest.title,
        completed: !!quest.completedAt,
      })),
    ],
    [customQuests, habits, isCompletedToday]
  );

  if (!hydrated || !user) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.background }}>
        <Text style={{ color: colors.textSecondary }}>Loading...</Text>
      </View>
    );
  }

  const displayName = user.name?.trim() || 'Adventurer';
  const greeting = getGreeting(now);
  const weekday = now.toLocaleDateString(undefined, { weekday: 'long' });
  const dateLabel = now.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
  const timeLabel = now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const message = getDailyMessage(now);

  return (
    <ScrollView
      className="flex-1"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
    >
      <View
        className="rounded-2xl p-5 mt-3"
        style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder }}
      >
        <Text className="text-2xl font-bold" style={{ color: colors.text }}>
          {greeting}, {displayName}
        </Text>
        <Text className="mt-3 text-sm" style={{ color: colors.textSecondary }}>
          {weekday}
        </Text>
        <Text className="text-base font-semibold" style={{ color: colors.text }}>
          {dateLabel}
        </Text>
        <Text className="text-sm" style={{ color: colors.accent }}>
          {timeLabel}
        </Text>
      </View>

      <View
        className="rounded-2xl p-4 mt-4"
        style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder }}
      >
        <View className="flex-row items-center">
          <Ionicons name="flame-outline" size={18} color={colors.warning} />
          <Text className="ml-2 text-base font-semibold" style={{ color: colors.text }}>
            Streak
          </Text>
        </View>
        <Text className="mt-2 text-sm" style={{ color: colors.text }}>
          <Text style={{ color: colors.warning }}>Current:</Text> {streak.currentStreak} Days
        </Text>
        <Text className="text-sm" style={{ color: colors.textSecondary }}>
          Longest: {streak.longestStreak} Days
        </Text>
      </View>

      <View
        className="rounded-2xl p-4 mt-4"
        style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder }}
      >
        <Text className="text-base font-semibold" style={{ color: colors.text }}>
          Today&apos;s Progress
        </Text>
        <Text className="mt-2 text-sm" style={{ color: colors.textSecondary }}>
          Quests Completed: {questCompletedToday} / {questTargetToday}
        </Text>
        <Text className="text-sm" style={{ color: colors.textSecondary }}>
          XP Earned Today: {todayXp}
        </Text>
        <View className="mt-3">
          <Text className="text-xs mb-1" style={{ color: colors.textTertiary }}>
            XP Progress {todayXp} / {DAILY_XP_TARGET}
          </Text>
          <ProgressBar progress={xpProgress} height={10} />
        </View>
      </View>

      <View
        className="rounded-2xl p-4 mt-4"
        style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder }}
      >
        <Text className="text-base font-semibold" style={{ color: colors.text }}>
          Today&apos;s Quests
        </Text>
        {todayQuestItems.length === 0 ? (
          <Text className="mt-3 text-sm italic" style={{ color: colors.textTertiary }}>
            No quests yet. Add one to start your streak.
          </Text>
        ) : (
          <View className="mt-2">
            {todayQuestItems.map((quest) => (
              <Pressable
                key={quest.id}
                onPress={() =>
                  router.push({
                    pathname: '/quest/[questType]/[questId]',
                    params: { questType: quest.type, questId: quest.id },
                  })
                }
                className="flex-row items-center py-2"
              >
                <Ionicons
                  name={quest.completed ? 'checkmark-circle' : 'ellipse-outline'}
                  size={17}
                  color={quest.completed ? colors.success : colors.textTertiary}
                />
                <Text className="ml-2 text-sm" style={{ color: colors.text }}>
                  {quest.title}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <View
        className="rounded-2xl p-4 mt-4"
        style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder }}
      >
        <Text className="text-base font-semibold" style={{ color: colors.text }}>
          Level {user.level} Adventurer
        </Text>
        <View className="mt-2 flex-row flex-wrap">
          {STAT_ORDER.map((stat) => (
            <Text key={stat} className="mr-3 mb-1 text-sm" style={{ color: colors.textSecondary }}>
              {stat} {effectiveStats[stat]}
            </Text>
          ))}
        </View>
        <Text className="mt-1 text-sm" style={{ color: colors.accent }}>
          Strongest Stat: {strongestStat}
        </Text>
      </View>

      <View
        className="rounded-2xl p-4 mt-4"
        style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder }}
      >
        <Text className="text-base font-semibold" style={{ color: colors.text }}>
          Tip of the Day
        </Text>
        <Text className="mt-2 text-sm" style={{ color: colors.textSecondary }}>
          {message}
        </Text>
      </View>

      <View className="mt-5 flex-row gap-3">
        <Pressable
          onPress={() => router.push('/(tabs)/habits')}
          className="flex-1 items-center py-3.5 rounded-xl"
          style={({ pressed }) => ({
            backgroundColor: colors.accent,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Text className="text-sm font-semibold text-white">+ Start Quest</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push('/(tabs)/dashboard')}
          className="flex-1 items-center py-3.5 rounded-xl"
          style={({ pressed }) => ({
            backgroundColor: colors.inputBg,
            borderWidth: 1,
            borderColor: colors.inputBorder,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Text className="text-sm font-semibold" style={{ color: colors.text }}>
            Open Dashboard
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
