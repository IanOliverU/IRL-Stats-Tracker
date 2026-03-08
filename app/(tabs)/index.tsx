import { CustomQuestCard } from '@/components/CustomQuestCard';
import { ProgressBar } from '@/components/ProgressBar';
import { QuestCard } from '@/components/QuestCard';
import { QuestStartAnimation } from '@/components/QuestStartAnimation';
import { ResetAnimation } from '@/components/ResetAnimation';
import { SettingsModal } from '@/components/SettingsModal';
import { StatCard } from '@/components/StatCard';
import { useGameHydration } from '@/hooks/useGameHydration';
import type { StatType } from '@/models';
import { MAX_CUSTOM_QUESTS_PER_DAY, totalXpForLevel, xpRequiredForLevel } from '@/models';
import { useGameStore } from '@/store/useGameStore';
import { useAppColors } from '@/store/useThemeStore';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

const STAT_ORDER: StatType[] = ['STR', 'INT', 'WIS', 'CHA', 'VIT'];

export default function DashboardScreen() {
  useGameHydration();
  const user = useGameStore((s) => s.user);
  const items = useGameStore((s) => s.items);
  const habits = useGameStore((s) => s.habits);
  const customQuests = useGameStore((s) => s.customQuests);
  const completeHabit = useGameStore((s) => s.completeHabit);
  const completeCustomQuestAction = useGameStore((s) => s.completeCustomQuest);
  const resetData = useGameStore((s) => s.resetData);
  const setUserName = useGameStore((s) => s.setUserName);
  const getStreak = useGameStore((s) => s.getStreak);
  const isCompletedToday = useGameStore((s) => s.isCompletedToday);
  const getCustomQuestsCompletedToday = useGameStore((s) => s.getCustomQuestsCompletedToday);
  const refreshUser = useGameStore((s) => s.refreshUser);

  const colors = useAppColors();
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
  const [showSettings, setShowSettings] = useState(false);
  const [showResetAnimation, setShowResetAnimation] = useState(false);

  // Welcome / name modal state
  const [showNameModal, setShowNameModal] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [showQuestStart, setShowQuestStart] = useState(false);
  const [questStartName, setQuestStartName] = useState('');

  // Re-read user from DB every time this tab comes into focus
  // so level / stats always reflect the latest data.
  useFocusEffect(
    useCallback(() => {
      refreshUser();
    }, [refreshUser])
  );

  // Show name modal if user has no name set
  useEffect(() => {
    if (user && !user.name) {
      setShowNameModal(true);
    }
  }, [user]);

  const handleSetName = useCallback(() => {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    setUserName(trimmed);
    setShowNameModal(false);
    setNameInput('');
    // Trigger quest start animation with the name
    setQuestStartName(trimmed);
    setTimeout(() => {
      setShowQuestStart(true);
    }, 300);
  }, [nameInput, setUserName]);

  const handleResetTriggered = useCallback(() => {
    setShowResetAnimation(true);
  }, []);

  const handleAnimationComplete = useCallback(() => {
    resetData();
    setShowResetAnimation(false);
  }, [resetData]);

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
  const habitCompletedCount = habits.filter((h) => isCompletedToday(h.id)).length;
  const customCompletedToday = getCustomQuestsCompletedToday();

  const handleCompleteCustom = (questId: string) => {
    const result = completeCustomQuestAction(questId);
    if (!result.success) {
      Alert.alert('Limit Reached', result.message);
    }
  };

  const displayName = user.name || 'LifeRPG';

  return (
    <>
      <ScrollView
        className="flex-1"
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      >
        {/* Hero */}
        <View className="mt-4">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-1 mr-3">
              <Text className="text-2xl font-bold" numberOfLines={1} style={{ color: colors.text }}>
                {displayName}
              </Text>
            </View>
            <Pressable
              onPress={() => setShowSettings(true)}
              className="w-9 h-9 items-center justify-center rounded-xl"
              style={({ pressed }) => ({
                backgroundColor: pressed ? colors.inputBg : 'transparent',
              })}
            >
              <Ionicons name="settings-outline" size={22} color={colors.textSecondary} />
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
              <StatCard key={stat} stat={stat} value={effectiveStats[stat]} compact />
            ))}
          </View>
        </View>

        {/* Custom Quests (all today's quests – pending + completed) */}
        {customQuests.length > 0 && (
          <View className="mt-8">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center">
                <Ionicons name="add-circle-outline" size={18} color={colors.text} />
                <Text className="text-lg font-semibold ml-2" style={{ color: colors.text }}>
                  Custom Quests
                </Text>
              </View>
              <Text className="text-xs" style={{ color: colors.textTertiary }}>
                {customCompletedToday}/{MAX_CUSTOM_QUESTS_PER_DAY} today
              </Text>
            </View>
            {customQuests.map((quest) => (
              <CustomQuestCard
                key={quest.id}
                quest={quest}
                onComplete={() => handleCompleteCustom(quest.id)}
                onDelete={() => { }}
              />
            ))}
          </View>
        )}

        {/* Daily Habits */}
        <View className="mt-8">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center">
              <Ionicons name="flash-outline" size={18} color={colors.text} />
              <Text className="text-lg font-semibold ml-2" style={{ color: colors.text }}>
                Today&apos;s Habits
              </Text>
            </View>
            {habits.length > 0 && (
              <Text className="text-xs" style={{ color: colors.textTertiary }}>
                {habitCompletedCount}/{habits.length}
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
      </ScrollView>

      {/* Welcome / Name Modal */}
      <Modal visible={showNameModal} animationType="fade" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)', padding: 24 }}
        >
          <View
            className="rounded-2xl p-6 w-full"
            style={{
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              maxWidth: 340,
            }}
          >
            {/* Icon */}
            <View className="items-center mb-4">
              <View
                className="w-16 h-16 rounded-2xl items-center justify-center mb-3"
                style={{ backgroundColor: colors.accent + '15' }}
              >
                <Ionicons name="person-outline" size={32} color={colors.accent} />
              </View>
              <Text className="text-xl font-bold text-center" style={{ color: colors.text }}>
                Welcome, Adventurer!
              </Text>
              <Text className="text-sm text-center mt-1" style={{ color: colors.textSecondary }}>
                What should we call you?
              </Text>
            </View>

            {/* Name input */}
            <TextInput
              className="rounded-xl px-4 py-3.5 text-base mb-4"
              style={{
                backgroundColor: colors.inputBg,
                color: colors.text,
                borderWidth: 1,
                borderColor: colors.inputBorder,
                textAlign: 'center',
                fontSize: 18,
                fontWeight: '600',
              }}
              placeholder="Enter your name"
              placeholderTextColor={colors.textTertiary}
              value={nameInput}
              onChangeText={setNameInput}
              autoCapitalize="words"
              autoFocus
              maxLength={20}
              onSubmitEditing={handleSetName}
              returnKeyType="done"
            />

            {/* Submit button */}
            <Pressable
              onPress={handleSetName}
              className="items-center py-3.5 rounded-xl"
              style={({ pressed }) => ({
                backgroundColor: nameInput.trim() ? colors.accent : colors.inputBg,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Text
                className="text-sm font-bold"
                style={{ color: nameInput.trim() ? '#fff' : colors.textTertiary }}
              >
                Start Adventure
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Settings */}
      <SettingsModal
        visible={showSettings}
        onClose={() => setShowSettings(false)}
        onResetTriggered={handleResetTriggered}
      />

      {/* SAO Reset Animation */}
      <ResetAnimation
        visible={showResetAnimation}
        onAnimationComplete={handleAnimationComplete}
      />

      {/* Quest Start Animation */}
      <QuestStartAnimation
        visible={showQuestStart}
        playerName={questStartName}
        onAnimationComplete={() => setShowQuestStart(false)}
      />
    </>
  );
}
