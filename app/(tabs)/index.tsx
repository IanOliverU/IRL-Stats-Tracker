import { ProgressBar } from '@/components/ProgressBar';
import { useGameHydration } from '@/hooks/useGameHydration';
import {
  getNextAchievementPreview,
  getNextUnlockPreview,
  getProgressSnapshot,
} from '@/lib/progression';
import type { StatType } from '@/models';
import { STAT_LABELS, totalXpForLevel, xpRequiredForLevel } from '@/models';
import { useGameStore } from '@/store/useGameStore';
import { useAppColors } from '@/store/useThemeStore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

const STAT_ORDER: StatType[] = ['STR', 'INT', 'WIS', 'CHA', 'VIT'];

const MOTIVATION_MESSAGES = [
  'Build momentum with one meaningful quest.',
  'Your next reward is closer than it looks.',
  'Small wins today shape the stronger build.',
  'Finish one quest and let the streak carry you.',
  'Progress feels better when the next step is obvious.',
];

function getGreeting(now: Date): string {
  const hour = now.getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
}

function getDailyMessage(now: Date): string {
  const hash = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  return MOTIVATION_MESSAGES[hash % MOTIVATION_MESSAGES.length];
}

function getQueueSourceLabel(source: 'habit' | 'custom', isMapActivityQuest: boolean): string {
  if (source === 'habit') return 'Habit';
  return isMapActivityQuest ? 'Maps Session' : 'Custom';
}

export default function WelcomeScreen() {
  const hydrated = useGameHydration();
  const router = useRouter();
  const colors = useAppColors();

  const user = useGameStore((s) => s.user);
  const items = useGameStore((s) => s.items);
  const habits = useGameStore((s) => s.habits);
  const customQuests = useGameStore((s) => s.customQuests);
  const achievements = useGameStore((s) => s.achievements);
  const isCompletedToday = useGameStore((s) => s.isCompletedToday);
  const getQuestStreakSummary = useGameStore((s) => s.getQuestStreakSummary);

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

  const snapshot = user ? getProgressSnapshot() : null;

  const nextUnlock = useMemo(() => {
    if (!user || !snapshot) return null;
    return getNextUnlockPreview({ user, items, snapshot });
  }, [items, snapshot, user]);

  const nextAchievement = useMemo(() => {
    if (!snapshot) return null;
    return getNextAchievementPreview({ achievements, snapshot });
  }, [achievements, snapshot]);

  const streak = getQuestStreakSummary();
  const completedHabitsToday = habits.filter((habit) => isCompletedToday(habit.id));
  const pendingHabitsToday = habits.filter((habit) => !isCompletedToday(habit.id));
  const pendingCustomQuests = customQuests.filter((quest) => !quest.completedAt);
  const completedCustomQuests = customQuests.filter((quest) => !!quest.completedAt);
  const questCompletedToday = completedHabitsToday.length + completedCustomQuests.length;
  const questTargetToday = habits.length + customQuests.length;

  const activeChallenge = useMemo(() => {
    const pendingQuestOptions = [
      ...pendingCustomQuests.map((quest) => ({
        id: quest.id,
        title: quest.title,
        subtitle:
          quest.source === 'map_activity'
            ? `${quest.activityType === 'run' ? 'Run' : 'Walk'} session - ${(
                quest.distanceMeters / 1000
              ).toFixed(2)} km tracked`
            : `Custom quest - +${quest.xpReward} ${quest.statReward} XP`,
        xpReward: quest.xpReward,
      })),
      ...pendingHabitsToday.map((habit) => ({
        id: habit.id,
        title: habit.title,
        subtitle: `Habit - +${habit.xpReward} ${habit.statReward} XP`,
        xpReward: habit.xpReward,
      })),
    ].sort((a, b) => b.xpReward - a.xpReward);

    if (pendingQuestOptions.length > 0) {
      const nextQuest = pendingQuestOptions[0];
      return {
        title: nextQuest.title,
        subtitle: nextQuest.subtitle,
        helper: `${pendingQuestOptions.length} quest${pendingQuestOptions.length === 1 ? '' : 's'} still open today`,
        cta: 'Open Quests',
        route: '/(tabs)/habits' as const,
      };
    }

    if (nextUnlock) {
      return {
        title: `Push for ${nextUnlock.item.name}`,
        subtitle: nextUnlock.requirement,
        helper: 'Daily quests are done. Your next milestone is the next reward unlock.',
        cta: 'Open Inventory',
        route: '/(tabs)/inventory' as const,
      };
    }

    return {
      title: 'Daily run complete',
      subtitle: 'All current quests are finished.',
      helper: 'Review your build and inventory while waiting for the next reset.',
      cta: 'Open Character',
      route: '/(tabs)/character' as const,
    };
  }, [nextUnlock, pendingCustomQuests, pendingHabitsToday]);

  const todayQuestPreview = useMemo(
    () =>
      [
        ...pendingCustomQuests.map((quest) => ({
          id: quest.id,
          title: quest.title,
          done: false,
          source: getQueueSourceLabel('custom', quest.source === 'map_activity'),
        })),
        ...pendingHabitsToday.map((habit) => ({
          id: habit.id,
          title: habit.title,
          done: false,
          source: getQueueSourceLabel('habit', false),
        })),
        ...completedCustomQuests.map((quest) => ({
          id: quest.id,
          title: quest.title,
          done: true,
          source: getQueueSourceLabel('custom', quest.source === 'map_activity'),
        })),
        ...completedHabitsToday.map((habit) => ({
          id: habit.id,
          title: habit.title,
          done: true,
          source: getQueueSourceLabel('habit', false),
        })),
      ].slice(0, 4),
    [completedCustomQuests, completedHabitsToday, pendingCustomQuests, pendingHabitsToday]
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
  const message = getDailyMessage(now);

  const xpIntoLevel = user.xp - totalXpForLevel(user.level);
  const xpRequired = xpRequiredForLevel(user.level);
  const xpRemaining = Math.max(0, xpRequired - xpIntoLevel);
  const xpProgress = xpRequired > 0 ? xpIntoLevel / xpRequired : 1;

  return (
    <ScrollView
      className="flex-1"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
    >
      <View
        className="mt-3 rounded-3xl p-5"
        style={{
          backgroundColor: colors.accent + '14',
          borderWidth: 1,
          borderColor: colors.accent + '35',
        }}
      >
        <Text className="text-sm font-semibold" style={{ color: colors.accent }}>
          {greeting}
        </Text>
        <Text className="mt-1 text-3xl font-bold" style={{ color: colors.text }}>
          {displayName}
        </Text>
        <Text className="mt-2 text-sm" style={{ color: colors.textSecondary }}>
          {weekday} - {dateLabel}
        </Text>
        <Text className="mt-3 text-sm leading-5" style={{ color: colors.text }}>
          {message}
        </Text>

        <View className="mt-4 flex-row flex-wrap gap-2">
          <View
            className="rounded-full px-3 py-1.5"
            style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder }}
          >
            <Text className="text-xs font-semibold" style={{ color: colors.warning }}>
              {streak.currentStreak} day streak
            </Text>
          </View>
          <View
            className="rounded-full px-3 py-1.5"
            style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder }}
          >
            <Text className="text-xs font-semibold" style={{ color: colors.text }}>
              {questCompletedToday}/{questTargetToday || 0} quests today
            </Text>
          </View>
          <View
            className="rounded-full px-3 py-1.5"
            style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder }}
          >
            <Text className="text-xs font-semibold" style={{ color: colors.text }}>
              Strongest: {strongestStat}
            </Text>
          </View>
        </View>
      </View>

      <View
        className="mt-4 rounded-3xl p-5"
        style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder }}
      >
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-sm font-semibold" style={{ color: colors.textTertiary }}>
              Next Level
            </Text>
            <Text className="mt-1 text-2xl font-bold" style={{ color: colors.text }}>
              Level {user.level} to Level {user.level + 1}
            </Text>
          </View>
          <View
            className="rounded-2xl px-3 py-2"
            style={{ backgroundColor: colors.accent + '12', borderWidth: 1, borderColor: colors.accent + '35' }}
          >
            <Text className="text-xs font-semibold" style={{ color: colors.accent }}>
              {xpRemaining} XP left
            </Text>
          </View>
        </View>
        <View className="mt-4">
          <ProgressBar progress={xpProgress} height={12} />
        </View>
        <Text className="mt-2 text-sm" style={{ color: colors.textSecondary }}>
          {xpIntoLevel} / {xpRequired} XP into this level
        </Text>
      </View>

      <View
        className="mt-4 rounded-3xl p-5"
        style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder }}
      >
        <View className="flex-row items-center">
          <Ionicons name="gift-outline" size={18} color={colors.warning} />
          <Text className="ml-2 text-base font-semibold" style={{ color: colors.text }}>
            Next Unlock
          </Text>
        </View>
        {nextUnlock ? (
          <>
            <View className="mt-3 flex-row items-center">
              <View
                className="h-11 w-11 items-center justify-center rounded-2xl"
                style={{ backgroundColor: colors.warning + '12' }}
              >
                <Ionicons
                  name={nextUnlock.item.icon as keyof typeof Ionicons.glyphMap}
                  size={20}
                  color={colors.warning}
                />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-lg font-semibold" style={{ color: colors.text }}>
                  {nextUnlock.item.name}
                </Text>
                <Text className="text-sm" style={{ color: colors.textSecondary }}>
                  {nextUnlock.item.effectLabel}
                </Text>
              </View>
            </View>
            <Text className="mt-3 text-xs uppercase tracking-widest" style={{ color: colors.textTertiary }}>
              Unlock requirement
            </Text>
            <Text className="mt-1 text-sm" style={{ color: colors.text }}>
              {nextUnlock.requirement}
            </Text>
            <View className="mt-3">
              <ProgressBar progress={nextUnlock.progress} height={10} />
            </View>
            <Text className="mt-2 text-sm" style={{ color: colors.accent }}>
              {nextUnlock.progressLabel}
            </Text>
            {nextUnlock.altProgressLabel && (
              <Text className="mt-1 text-xs" style={{ color: colors.textTertiary }}>
                Alternate path: {nextUnlock.altProgressLabel}
              </Text>
            )}
          </>
        ) : (
          <Text className="mt-3 text-sm" style={{ color: colors.textSecondary }}>
            All current inventory rewards are unlocked.
          </Text>
        )}
      </View>

      <View
        className="mt-4 rounded-3xl p-5"
        style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder }}
      >
        <View className="flex-row items-center">
          <Ionicons name="trophy-outline" size={18} color={colors.accent} />
          <Text className="ml-2 text-base font-semibold" style={{ color: colors.text }}>
            Next Achievement
          </Text>
        </View>
        {nextAchievement ? (
          <>
            <View className="mt-3 flex-row items-center">
              <View
                className="h-11 w-11 items-center justify-center rounded-2xl"
                style={{ backgroundColor: colors.accent + '12' }}
              >
                <Ionicons
                  name={nextAchievement.achievement.icon as keyof typeof Ionicons.glyphMap}
                  size={20}
                  color={colors.accent}
                />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-lg font-semibold" style={{ color: colors.text }}>
                  {nextAchievement.achievement.title}
                </Text>
                <Text className="text-sm" style={{ color: colors.textSecondary }}>
                  {nextAchievement.achievement.description}
                </Text>
              </View>
            </View>
            <Text className="mt-3 text-sm" style={{ color: colors.text }}>
              {nextAchievement.requirement}
            </Text>
            <View className="mt-3">
              <ProgressBar progress={nextAchievement.progress} height={10} />
            </View>
            <Text className="mt-2 text-sm" style={{ color: colors.accent }}>
              {nextAchievement.progressLabel}
            </Text>
          </>
        ) : (
          <Text className="mt-3 text-sm" style={{ color: colors.textSecondary }}>
            Every current achievement is unlocked.
          </Text>
        )}
      </View>

      <View
        className="mt-4 rounded-3xl p-5"
        style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder }}
      >
        <View className="flex-row items-center">
          <Ionicons name="navigate-outline" size={18} color={colors.success} />
          <Text className="ml-2 text-base font-semibold" style={{ color: colors.text }}>
            Current Focus
          </Text>
        </View>
        <Text className="mt-3 text-xl font-bold" style={{ color: colors.text }}>
          {activeChallenge.title}
        </Text>
        <Text className="mt-2 text-sm" style={{ color: colors.textSecondary }}>
          {activeChallenge.subtitle}
        </Text>
        <Text className="mt-2 text-xs" style={{ color: colors.textTertiary }}>
          {activeChallenge.helper}
        </Text>
        <Pressable
          onPress={() => router.push(activeChallenge.route)}
          className="mt-4 items-center rounded-2xl py-3.5"
          style={({ pressed }) => ({
            backgroundColor: colors.accent,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Text className="text-sm font-semibold text-white">{activeChallenge.cta}</Text>
        </Pressable>
      </View>

      <View
        className="mt-4 rounded-3xl p-5"
        style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder }}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Ionicons name="list-outline" size={18} color={colors.text} />
            <Text className="ml-2 text-base font-semibold" style={{ color: colors.text }}>
              Today&apos;s Queue
            </Text>
          </View>
          <Text className="text-xs" style={{ color: colors.textTertiary }}>
            {questCompletedToday}/{questTargetToday || 0} done
          </Text>
        </View>

        {todayQuestPreview.length === 0 ? (
          <Text className="mt-3 text-sm italic" style={{ color: colors.textTertiary }}>
            No quests yet. Create one to start the loop.
          </Text>
        ) : (
          <View className="mt-3">
            {todayQuestPreview.map((quest) => (
              <View key={quest.id} className="flex-row items-center py-2.5">
                <Ionicons
                  name={quest.done ? 'checkmark-circle' : 'ellipse-outline'}
                  size={17}
                  color={quest.done ? colors.success : colors.textTertiary}
                />
                <View className="ml-2 flex-1">
                  <Text className="text-sm font-medium" style={{ color: colors.text }}>
                    {quest.title}
                  </Text>
                  <Text className="text-xs" style={{ color: colors.textTertiary }}>
                    {quest.source}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      <View className="mt-5 flex-row gap-3">
        <Pressable
          onPress={() => router.push('/(tabs)/habits')}
          className="flex-1 items-center rounded-2xl py-3.5"
          style={({ pressed }) => ({
            backgroundColor: colors.accent,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Text className="text-sm font-semibold text-white">Start Quest</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push('/(tabs)/dashboard')}
          className="flex-1 items-center rounded-2xl py-3.5"
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

      <Text className="mt-4 text-center text-xs" style={{ color: colors.textTertiary }}>
        Strongest stat: {STAT_LABELS[strongestStat]} - Longest streak: {streak.longestStreak} days
      </Text>
    </ScrollView>
  );
}
