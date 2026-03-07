import { QuestCard } from '@/components/QuestCard';
import { useGameHydration } from '@/hooks/useGameHydration';
import type { HabitFrequency, StatType } from '@/models';
import { STAT_LABELS } from '@/models';
import { useGameStore } from '@/store/useGameStore';
import { useAppColors } from '@/store/useThemeStore';
import { Ionicons } from '@expo/vector-icons';
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
  const completeHabit = useGameStore((s) => s.completeHabit);
  const addHabit = useGameStore((s) => s.addHabit);
  const removeHabit = useGameStore((s) => s.removeHabit);
  const getStreak = useGameStore((s) => s.getStreak);
  const isCompletedToday = useGameStore((s) => s.isCompletedToday);
  const _lastAction = useGameStore((s) => s.lastAction);

  const colors = useAppColors();

  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [statReward, setStatReward] = useState<StatType>('STR');
  const [xpReward, setXpReward] = useState('40');
  const [frequency, setFrequency] = useState<HabitFrequency>('daily');

  const handleAdd = () => {
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
    setModalVisible(false);
  };

  const handleLongPress = (habitId: string, habitTitle: string) => {
    Alert.alert('Delete habit', `Remove "${habitTitle}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeHabit(habitId) },
    ]);
  };

  const completedCount = habits.filter((h) => isCompletedToday(h.id)).length;

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <View className="flex-row items-start justify-between mb-4">
          <View>
            <Text className="text-2xl font-bold" style={{ color: colors.text }}>
              Quests
            </Text>
            {habits.length > 0 && (
              <Text className="text-xs mt-1" style={{ color: colors.textTertiary }}>
                {completedCount}/{habits.length} completed today
              </Text>
            )}
          </View>
          <Pressable
            onPress={() => setModalVisible(true)}
            className="flex-row items-center px-4 py-2.5 rounded-xl"
            style={({ pressed }) => ({
              backgroundColor: colors.accent,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text className="text-sm font-semibold text-white ml-1">Add</Text>
          </Pressable>
        </View>

        {habits.length === 0 ? (
          <Text className="text-sm italic" style={{ color: colors.textTertiary }}>
            No habits. Tap "Add" to create a quest.
          </Text>
        ) : (
          habits.map((habit) => (
            <QuestCard
              key={habit.id}
              habit={habit}
              streak={getStreak(habit.id)}
              completedToday={isCompletedToday(habit.id)}
              onComplete={() => completeHabit(habit.id)}
              onLongPress={() => handleLongPress(habit.id, habit.title)}
            />
          ))
        )}
      </ScrollView>

      {/* Add Quest Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', padding: 20 }}
        >
          <View
            className="rounded-2xl p-5"
            style={{
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.cardBorder,
            }}
          >
            <Text className="text-lg font-bold mb-4" style={{ color: colors.text }}>
              New Quest
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
                onPress={() => setModalVisible(false)}
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
                onPress={handleAdd}
                className="flex-1 items-center py-3.5 rounded-xl"
                style={({ pressed }) => ({
                  backgroundColor: colors.accent,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Text className="text-sm font-semibold text-white">Add Quest</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
