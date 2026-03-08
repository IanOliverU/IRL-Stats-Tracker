import { AchievementUnlockPopup } from '@/components/AchievementUnlockPopup';
import { CustomQuestCard } from '@/components/CustomQuestCard';
import { ItemUnlockPopup } from '@/components/ItemUnlockPopup';
import { QuestCompletionFeedback } from '@/components/QuestCompletionFeedback';
import { QuestCard } from '@/components/QuestCard';
import { useGameHydration } from '@/hooks/useGameHydration';
import type { Difficulty, HabitFrequency, StatType } from '@/models';
import {
  DIFFICULTY_COLORS,
  DIFFICULTY_LABELS,
  DIFFICULTY_XP,
  MAX_CUSTOM_QUESTS_PER_DAY,
  STAT_LABELS,
} from '@/models';
import type { QuestCompletionFeedback as QuestCompletionFeedbackData } from '@/services/habitService';
import { useGameStore } from '@/store/useGameStore';
import { useAppColors } from '@/store/useThemeStore';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import React, { useState } from 'react';
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

const STATS: StatType[] = ['STR', 'INT', 'WIS', 'CHA', 'VIT'];
const FREQUENCIES: HabitFrequency[] = ['daily', 'weekly'];
const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

const STAT_ICONS: Record<StatType, keyof typeof Ionicons.glyphMap> = {
  STR: 'barbell-outline',
  INT: 'bulb-outline',
  WIS: 'book-outline',
  CHA: 'people-outline',
  VIT: 'heart-outline',
};

export default function HabitsScreen() {
  useGameHydration();
  const habits = useGameStore((s) => s.habits);
  const customQuests = useGameStore((s) => s.customQuests);
  const achievementUnlockQueue = useGameStore((s) => s.achievementUnlockQueue);
  const itemUnlockQueue = useGameStore((s) => s.itemUnlockQueue);
  const completeHabit = useGameStore((s) => s.completeHabit);
  const addHabit = useGameStore((s) => s.addHabit);
  const removeHabit = useGameStore((s) => s.removeHabit);
  const addCustomQuest = useGameStore((s) => s.addCustomQuest);
  const completeCustomQuestAction = useGameStore((s) => s.completeCustomQuest);
  const dismissAchievementUnlock = useGameStore((s) => s.dismissAchievementUnlock);
  const dismissItemUnlock = useGameStore((s) => s.dismissItemUnlock);
  const deleteCustomQuest = useGameStore((s) => s.deleteCustomQuest);
  const getStreak = useGameStore((s) => s.getStreak);
  const isCompletedToday = useGameStore((s) => s.isCompletedToday);
  const getCustomQuestsCompletedToday = useGameStore((s) => s.getCustomQuestsCompletedToday);

  const colors = useAppColors();
  const isFocused = useIsFocused();

  // Habit modal state
  const [habitModalVisible, setHabitModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [statReward, setStatReward] = useState<StatType>('STR');
  const [xpReward, setXpReward] = useState('40');
  const [frequency, setFrequency] = useState<HabitFrequency>('daily');

  // Custom quest modal state
  const [customModalVisible, setCustomModalVisible] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customStat, setCustomStat] = useState<StatType>('STR');
  const [customDifficulty, setCustomDifficulty] = useState<Difficulty>('medium');
  const [completionFeedback, setCompletionFeedback] = useState<QuestCompletionFeedbackData | null>(null);
  const [showCompletionFeedback, setShowCompletionFeedback] = useState(false);

  const handleAddHabit = () => {
    const t = title.trim();
    const xp = parseInt(xpReward, 10);
    if (!t) return;
    if (isNaN(xp) || xp < 1 || xp > 999) {
      Alert.alert('Invalid XP', 'Enter 1–999');
      return;
    }
    addHabit({ title: t, statReward, xpReward: xp, frequency });
    setTitle('');
    setXpReward('40');
    setStatReward('STR');
    setFrequency('daily');
    setHabitModalVisible(false);
  };

  const handleAddCustomQuest = () => {
    const t = customTitle.trim();
    if (!t) return;
    addCustomQuest({ title: t, statReward: customStat, difficulty: customDifficulty });
    setCustomTitle('');
    setCustomStat('STR');
    setCustomDifficulty('medium');
    setCustomModalVisible(false);
  };

  const handleCompleteCustomQuest = (questId: string) => {
    const result = completeCustomQuestAction(questId);
    if (!result.success) {
      Alert.alert('Limit Reached', result.message);
      return;
    }
    setCompletionFeedback(result.feedback);
    setShowCompletionFeedback(true);
  };

  const handleCompleteHabit = (habitId: string) => {
    const feedback = completeHabit(habitId);
    if (!feedback) return;
    setCompletionFeedback(feedback);
    setShowCompletionFeedback(true);
  };

  const handleDeleteCustomQuest = (questId: string, questTitle: string) => {
    Alert.alert('Delete quest', `Remove "${questTitle}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteCustomQuest(questId) },
    ]);
  };

  const handleLongPressHabit = (habitId: string, habitTitle: string) => {
    Alert.alert('Delete habit', `Remove "${habitTitle}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeHabit(habitId) },
    ]);
  };

  const habitCompletedCount = habits.filter((h) => isCompletedToday(h.id)).length;
  const customCompletedToday = getCustomQuestsCompletedToday();
  const pendingCustomQuests = customQuests.filter((q) => !q.completedAt);
  const completedCustomQuests = customQuests.filter((q) => !!q.completedAt);
  const activeAchievementUnlock = achievementUnlockQueue[0] ?? null;
  const activeItemUnlock = itemUnlockQueue[0] ?? null;
  const shouldShowQuestFeedback = showCompletionFeedback;
  const shouldShowAchievement = isFocused && !shouldShowQuestFeedback && !!activeAchievementUnlock;
  const shouldShowItem =
    isFocused && !shouldShowQuestFeedback && !activeAchievementUnlock && !!activeItemUnlock;

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {/* Header */}
        <View className="flex-row items-start justify-between mb-4">
          <View>
            <Text className="text-2xl font-bold" style={{ color: colors.text }}>
              Quests
            </Text>
          </View>
          <View className="flex-row gap-2">
            <Pressable
              onPress={() => setCustomModalVisible(true)}
              className="flex-row items-center px-3.5 py-2.5 rounded-xl"
              style={({ pressed }) => ({
                backgroundColor: 'transparent',
                borderWidth: 1,
                borderColor: colors.accent,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Ionicons name="add-circle-outline" size={16} color={colors.accent} />
              <Text className="text-xs font-semibold ml-1" style={{ color: colors.accent }}>
                Custom
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setHabitModalVisible(true)}
              className="flex-row items-center px-3.5 py-2.5 rounded-xl"
              style={({ pressed }) => ({
                backgroundColor: colors.accent,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Ionicons name="add" size={16} color="#fff" />
              <Text className="text-xs font-semibold text-white ml-1">Habit</Text>
            </Pressable>
          </View>
        </View>

        {/* Custom Quests Section */}
        {(customQuests.length > 0 || habits.length === 0) && (
          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center">
                <Ionicons name="add-circle-outline" size={18} color={colors.text} />
                <Text className="text-base font-semibold ml-2" style={{ color: colors.text }}>
                  Custom Quests
                </Text>
              </View>
              <Text className="text-xs" style={{ color: colors.textTertiary }}>
                {customCompletedToday}/{MAX_CUSTOM_QUESTS_PER_DAY} today
              </Text>
            </View>

            {customQuests.length === 0 ? (
              <Pressable
                onPress={() => setCustomModalVisible(true)}
                className="rounded-xl border border-dashed py-6 items-center"
                style={({ pressed }) => ({
                  borderColor: pressed ? colors.accent : colors.cardBorder,
                })}
              >
                <Ionicons name="add-circle-outline" size={28} color={colors.textTertiary} />
                <Text className="text-sm mt-2" style={{ color: colors.textSecondary }}>
                  Create a custom quest
                </Text>
                <Text className="text-xs mt-1" style={{ color: colors.textTertiary }}>
                  One-time tasks with difficulty-based XP
                </Text>
              </Pressable>
            ) : (
              <>
                {pendingCustomQuests.map((quest) => (
                  <CustomQuestCard
                    key={quest.id}
                    quest={quest}
                    onComplete={() => handleCompleteCustomQuest(quest.id)}
                    onDelete={() => handleDeleteCustomQuest(quest.id, quest.title)}
                  />
                ))}
                {completedCustomQuests.map((quest) => (
                  <CustomQuestCard
                    key={quest.id}
                    quest={quest}
                    onComplete={() => { }}
                    onDelete={() => handleDeleteCustomQuest(quest.id, quest.title)}
                  />
                ))}
              </>
            )}
          </View>
        )}

        {/* Daily Habits Section */}
        <View>
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center">
              <Ionicons name="repeat-outline" size={18} color={colors.text} />
              <Text className="text-base font-semibold ml-2" style={{ color: colors.text }}>
                Daily Habits
              </Text>
            </View>
            {habits.length > 0 && (
              <Text className="text-xs" style={{ color: colors.textTertiary }}>
                {habitCompletedCount}/{habits.length}
              </Text>
            )}
          </View>

          {habits.length === 0 ? (
            <Pressable
              onPress={() => setHabitModalVisible(true)}
              className="rounded-xl border border-dashed py-6 items-center"
              style={({ pressed }) => ({
                borderColor: pressed ? colors.accent : colors.cardBorder,
              })}
            >
              <Ionicons name="repeat-outline" size={28} color={colors.textTertiary} />
              <Text className="text-sm mt-2" style={{ color: colors.textSecondary }}>
                Create a recurring habit
              </Text>
              <Text className="text-xs mt-1" style={{ color: colors.textTertiary }}>
                Daily or weekly habits that build streaks
              </Text>
            </Pressable>
          ) : (
            habits.map((habit) => (
              <QuestCard
                key={habit.id}
                habit={habit}
                streak={getStreak(habit.id)}
                completedToday={isCompletedToday(habit.id)}
                onComplete={() => handleCompleteHabit(habit.id)}
                onLongPress={() => handleLongPressHabit(habit.id, habit.title)}
              />
            ))
          )}
        </View>
      </ScrollView>

      <QuestCompletionFeedback
        visible={shouldShowQuestFeedback}
        feedback={completionFeedback}
        onHide={() => {
          setShowCompletionFeedback(false);
          setCompletionFeedback(null);
        }}
      />

      <AchievementUnlockPopup
        achievement={shouldShowAchievement ? activeAchievementUnlock : null}
        onHide={dismissAchievementUnlock}
      />

      <ItemUnlockPopup
        itemId={shouldShowItem ? activeItemUnlock : null}
        onHide={dismissItemUnlock}
      />

      {/* ─── Add Habit Modal ─────────────────────────────── */}
      <Modal visible={habitModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', padding: 20 }}
        >
          <View
            className="rounded-2xl p-5"
            style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder }}
          >
            <Text className="text-lg font-bold mb-4" style={{ color: colors.text }}>
              New Habit
            </Text>

            <TextInput
              className="rounded-xl px-4 py-3 text-base mb-3"
              style={{
                backgroundColor: colors.inputBg,
                color: colors.text,
                borderWidth: 1,
                borderColor: colors.inputBorder,
              }}
              placeholder="Habit name"
              placeholderTextColor={colors.textTertiary}
              value={title}
              onChangeText={setTitle}
              autoCapitalize="words"
            />

            <Text className="text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>
              Stat reward
            </Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {STATS.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => setStatReward(s)}
                  className="flex-row items-center px-3 py-2 rounded-xl"
                  style={{
                    backgroundColor: statReward === s ? colors.accent : colors.inputBg,
                    borderWidth: 1,
                    borderColor: statReward === s ? colors.accent : colors.inputBorder,
                  }}
                >
                  <Ionicons
                    name={STAT_ICONS[s]}
                    size={14}
                    color={statReward === s ? '#fff' : colors.textSecondary}
                  />
                  <Text
                    className="text-xs font-semibold ml-1"
                    style={{ color: statReward === s ? '#fff' : colors.textSecondary }}
                  >
                    {STAT_LABELS[s]}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text className="text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>
              XP reward
            </Text>
            <TextInput
              className="rounded-xl px-4 py-3 text-base mb-3"
              style={{
                backgroundColor: colors.inputBg,
                color: colors.text,
                borderWidth: 1,
                borderColor: colors.inputBorder,
              }}
              placeholder="40"
              placeholderTextColor={colors.textTertiary}
              keyboardType="number-pad"
              value={xpReward}
              onChangeText={setXpReward}
            />

            <Text className="text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>
              Frequency
            </Text>
            <View className="flex-row gap-2 mb-4">
              {FREQUENCIES.map((f) => (
                <Pressable
                  key={f}
                  onPress={() => setFrequency(f)}
                  className="flex-row items-center px-4 py-2.5 rounded-xl"
                  style={{
                    backgroundColor: frequency === f ? colors.accent : colors.inputBg,
                    borderWidth: 1,
                    borderColor: frequency === f ? colors.accent : colors.inputBorder,
                  }}
                >
                  <Ionicons
                    name={f === 'daily' ? 'today-outline' : 'calendar-outline'}
                    size={14}
                    color={frequency === f ? '#fff' : colors.textSecondary}
                  />
                  <Text
                    className="text-sm font-medium ml-1.5 capitalize"
                    style={{ color: frequency === f ? '#fff' : colors.textSecondary }}
                  >
                    {f}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View className="flex-row gap-3 mt-2">
              <Pressable
                onPress={() => setHabitModalVisible(false)}
                className="flex-1 items-center py-3.5 rounded-xl"
                style={({ pressed }) => ({
                  backgroundColor: colors.inputBg,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Text className="text-sm font-medium" style={{ color: colors.text }}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={handleAddHabit}
                className="flex-1 items-center py-3.5 rounded-xl"
                style={({ pressed }) => ({
                  backgroundColor: colors.accent,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Text className="text-sm font-semibold text-white">Add Habit</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── Add Custom Quest Modal ──────────────────────── */}
      <Modal visible={customModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', padding: 20 }}
        >
          <View
            className="rounded-2xl p-5"
            style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder }}
          >
            <Text className="text-lg font-bold mb-1" style={{ color: colors.text }}>
              Custom Quest
            </Text>
            <Text className="text-xs mb-4" style={{ color: colors.textTertiary }}>
              One-time quest • {customCompletedToday}/{MAX_CUSTOM_QUESTS_PER_DAY} used today
            </Text>

            <TextInput
              className="rounded-xl px-4 py-3 text-base mb-4"
              style={{
                backgroundColor: colors.inputBg,
                color: colors.text,
                borderWidth: 1,
                borderColor: colors.inputBorder,
              }}
              placeholder="Quest name (e.g. 30 min workout)"
              placeholderTextColor={colors.textTertiary}
              value={customTitle}
              onChangeText={setCustomTitle}
              autoCapitalize="words"
            />

            {/* Stat selection */}
            <Text className="text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>
              Stat affected
            </Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {STATS.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => setCustomStat(s)}
                  className="flex-row items-center px-3 py-2 rounded-xl"
                  style={{
                    backgroundColor: customStat === s ? colors.accent : colors.inputBg,
                    borderWidth: 1,
                    borderColor: customStat === s ? colors.accent : colors.inputBorder,
                  }}
                >
                  <Ionicons
                    name={STAT_ICONS[s]}
                    size={14}
                    color={customStat === s ? '#fff' : colors.textSecondary}
                  />
                  <Text
                    className="text-xs font-semibold ml-1"
                    style={{ color: customStat === s ? '#fff' : colors.textSecondary }}
                  >
                    {STAT_LABELS[s]}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Difficulty selection */}
            <Text className="text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>
              Difficulty
            </Text>
            <View className="flex-row gap-2 mb-4">
              {DIFFICULTIES.map((d) => {
                const isSelected = customDifficulty === d;
                const dColor = DIFFICULTY_COLORS[d];
                return (
                  <Pressable
                    key={d}
                    onPress={() => setCustomDifficulty(d)}
                    className="flex-1 items-center py-3 rounded-xl"
                    style={{
                      backgroundColor: isSelected ? dColor + '20' : colors.inputBg,
                      borderWidth: 1.5,
                      borderColor: isSelected ? dColor : colors.inputBorder,
                    }}
                  >
                    <Text
                      className="text-sm font-semibold"
                      style={{ color: isSelected ? dColor : colors.textSecondary }}
                    >
                      {DIFFICULTY_LABELS[d]}
                    </Text>
                    <Text
                      className="text-xs mt-0.5"
                      style={{ color: isSelected ? dColor : colors.textTertiary }}
                    >
                      {DIFFICULTY_XP[d]} XP
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* XP preview */}
            <View
              className="rounded-xl p-3 mb-4 flex-row items-center justify-between"
              style={{ backgroundColor: colors.inputBg }}
            >
              <Text className="text-xs" style={{ color: colors.textSecondary }}>
                Reward
              </Text>
              <Text className="text-sm font-bold" style={{ color: colors.accent }}>
                +{DIFFICULTY_XP[customDifficulty]} {customStat} XP
              </Text>
            </View>

            {/* Actions */}
            <View className="flex-row gap-3">
              <Pressable
                onPress={() => {
                  setCustomModalVisible(false);
                  setCustomTitle('');
                }}
                className="flex-1 items-center py-3.5 rounded-xl"
                style={({ pressed }) => ({
                  backgroundColor: colors.inputBg,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Text className="text-sm font-medium" style={{ color: colors.text }}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={handleAddCustomQuest}
                className="flex-1 items-center py-3.5 rounded-xl"
                style={({ pressed }) => ({
                  backgroundColor: colors.accent,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Text className="text-sm font-semibold text-white">Create Quest</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
