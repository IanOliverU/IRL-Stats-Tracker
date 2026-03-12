import { LevelUpModal } from '@/components/LevelUpModal';
import { QuestCompletionFeedback } from '@/components/QuestCompletionFeedback';
import { useGameHydration } from '@/hooks/useGameHydration';
import { DIFFICULTY_LABELS } from '@/models';
import type { QuestCompletionFeedback as QuestCompletionFeedbackData } from '@/services/habitService';
import { useGameStore } from '@/store/useGameStore';
import { useAppColors } from '@/store/useThemeStore';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

export default function QuestDetailScreen() {
  const hydrated = useGameHydration();
  const colors = useAppColors();
  const router = useRouter();
  const { questType, questId } = useLocalSearchParams<{ questType?: string; questId?: string }>();

  const habits = useGameStore((s) => s.habits);
  const customQuests = useGameStore((s) => s.customQuests);
  const completeHabit = useGameStore((s) => s.completeHabit);
  const completeCustomQuest = useGameStore((s) => s.completeCustomQuest);
  const dismissItemUnlocks = useGameStore((s) => s.dismissItemUnlocks);
  const isCompletedToday = useGameStore((s) => s.isCompletedToday);
  const getStreak = useGameStore((s) => s.getStreak);

  const [feedback, setFeedback] = useState<QuestCompletionFeedbackData | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [levelUpFeedback, setLevelUpFeedback] = useState<QuestCompletionFeedbackData | null>(null);

  const habit = useMemo(() => {
    if (questType !== 'habit' || !questId) return null;
    return habits.find((item) => item.id === questId) ?? null;
  }, [habits, questId, questType]);

  const customQuest = useMemo(() => {
    if (questType !== 'custom' || !questId) return null;
    return customQuests.find((item) => item.id === questId) ?? null;
  }, [customQuests, questId, questType]);

  if (!hydrated) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.background }}>
        <Text style={{ color: colors.textSecondary }}>Loading...</Text>
      </View>
    );
  }

  const isHabit = questType === 'habit';
  const isCustom = questType === 'custom';
  const notFound = (isHabit && !habit) || (isCustom && !customQuest) || (!isHabit && !isCustom);

  if (notFound) {
    return (
      <View className="flex-1 items-center justify-center px-6" style={{ backgroundColor: colors.background }}>
        <Text className="text-lg font-semibold mb-2" style={{ color: colors.text }}>
          Quest not found
        </Text>
        <Text className="text-sm text-center mb-5" style={{ color: colors.textSecondary }}>
          This quest might not exist for today.
        </Text>
        <Pressable
          onPress={() => router.push('/(tabs)/habits')}
          className="px-4 py-2.5 rounded-xl"
          style={{ backgroundColor: colors.accent }}
        >
          <Text className="text-sm font-semibold text-white">Open Quests</Text>
        </Pressable>
      </View>
    );
  }

  const completed = isHabit ? isCompletedToday(habit!.id) : !!customQuest!.completedAt;
  const isTrackingMapQuest = isCustom && !!customQuest && customQuest.source === 'map_activity' && !completed;

  const handleComplete = () => {
    if (isHabit && habit && !completed) {
      const result = completeHabit(habit.id);
      if (!result) return;
      if (result.newLevel > result.previousLevel) {
        setLevelUpFeedback(result);
        setShowFeedback(false);
        setFeedback(null);
        return;
      }
      setFeedback(result);
      setShowFeedback(true);
      return;
    }

    if (isCustom && customQuest && !completed && !isTrackingMapQuest) {
      const result = completeCustomQuest(customQuest.id);
      if (!result.success) {
        Alert.alert('Limit Reached', result.message);
        return;
      }
      if (result.feedback.newLevel > result.feedback.previousLevel) {
        setLevelUpFeedback(result.feedback);
        setShowFeedback(false);
        setFeedback(null);
        return;
      }
      setFeedback(result.feedback);
      setShowFeedback(true);
    }
  };

  const handleCloseLevelUpModal = () => {
    dismissItemUnlocks(levelUpFeedback?.unlockedItemIds ?? []);
    setLevelUpFeedback(null);
  };

  const handleViewReward = () => {
    dismissItemUnlocks(levelUpFeedback?.unlockedItemIds ?? []);
    setLevelUpFeedback(null);
    router.push('/(tabs)/inventory');
  };

  return (
    <>
      <ScrollView
        className="flex-1"
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
      >
        <Text className="text-2xl font-bold mt-3" style={{ color: colors.text }}>
          {isHabit ? habit!.title : customQuest!.title}
        </Text>
        <Text className="text-sm mt-1" style={{ color: colors.textSecondary }}>
          {isHabit ? 'Habit Quest' : 'Custom Quest'}
        </Text>

        <View
          className="rounded-2xl p-4 mt-4"
          style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder }}
        >
          <View className="flex-row items-center">
            <Ionicons
              name={completed ? 'checkmark-circle' : 'ellipse-outline'}
              size={18}
              color={completed ? colors.success : colors.textTertiary}
            />
            <Text className="ml-2 text-sm font-medium" style={{ color: colors.text }}>
              {completed ? 'Completed today' : 'Not completed yet'}
            </Text>
          </View>

          {isHabit && habit && (
            <View className="mt-3">
              <Text className="text-sm mb-1" style={{ color: colors.textSecondary }}>
                Stat Reward: {habit.statReward}
              </Text>
              <Text className="text-sm mb-1" style={{ color: colors.textSecondary }}>
                Base XP: {habit.xpReward}
              </Text>
              <Text className="text-sm mb-1 capitalize" style={{ color: colors.textSecondary }}>
                Frequency: {habit.frequency}
              </Text>
              <Text className="text-sm" style={{ color: colors.textSecondary }}>
                Streak: {getStreak(habit.id)} days
              </Text>
            </View>
          )}

          {isCustom && customQuest && (
            <View className="mt-3">
              <Text className="text-sm mb-1" style={{ color: colors.textSecondary }}>
                Stat Reward: {customQuest.statReward}
              </Text>
              <Text className="text-sm mb-1" style={{ color: colors.textSecondary }}>
                Base XP: {customQuest.xpReward}
              </Text>
              <Text className="text-sm mb-1" style={{ color: colors.textSecondary }}>
                Difficulty: {DIFFICULTY_LABELS[customQuest.difficulty]}
              </Text>
              {customQuest.source === 'map_activity' ? (
                <>
                  <Text className="text-sm mb-1" style={{ color: colors.textSecondary }}>
                    Activity: {customQuest.activityType === 'run' ? 'Run Session' : 'Walk Session'}
                  </Text>
                  <Text className="text-sm mb-1" style={{ color: colors.textSecondary }}>
                    Distance Tracked: {(customQuest.distanceMeters / 1000).toFixed(2)} km
                  </Text>
                </>
              ) : null}
              <Text className="text-sm" style={{ color: colors.textSecondary }}>
                Created: {new Date(customQuest.createdAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
              </Text>
            </View>
          )}
        </View>

        <View className="mt-5 flex-row gap-3">
          <Pressable
            onPress={handleComplete}
            disabled={completed || isTrackingMapQuest}
            className="flex-1 items-center py-3.5 rounded-xl"
            style={({ pressed }) => ({
              backgroundColor: completed || isTrackingMapQuest ? colors.inputBg : colors.accent,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text
              className="text-sm font-semibold"
              style={{ color: completed || isTrackingMapQuest ? colors.textTertiary : '#fff' }}
            >
              {completed ? 'Completed Today' : isTrackingMapQuest ? 'Completes on Session Finish' : 'Complete Quest'}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => router.push(isTrackingMapQuest ? '/(tabs)/maps' : '/(tabs)/habits')}
            className="flex-1 items-center py-3.5 rounded-xl"
            style={({ pressed }) => ({
              backgroundColor: colors.inputBg,
              borderWidth: 1,
              borderColor: colors.inputBorder,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text className="text-sm font-semibold" style={{ color: colors.text }}>
              {isTrackingMapQuest ? 'Open Maps' : 'Open Quests'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      <QuestCompletionFeedback
        visible={showFeedback}
        feedback={feedback}
        onHide={() => {
          setShowFeedback(false);
          setFeedback(null);
        }}
      />

      <LevelUpModal
        visible={!!levelUpFeedback}
        feedback={levelUpFeedback}
        onContinue={handleCloseLevelUpModal}
        onViewReward={handleViewReward}
      />
    </>
  );
}
