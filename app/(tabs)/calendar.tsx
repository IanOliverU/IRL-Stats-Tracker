import { ProgressBar } from '@/components/ProgressBar';
import { useGameHydration } from '@/hooks/useGameHydration';
import { WEEKLY_COMPLETION_BONUSES } from '@/models';
import { useGameStore } from '@/store/useGameStore';
import { useAppColors } from '@/store/useThemeStore';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function toDayKey(year: number, monthIndex: number, day: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function shiftMonth(date: Date, delta: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + delta, 1, 0, 0, 0, 0));
}

function formatShortDateKey(dayKey: string): string {
  const [, month, day] = dayKey.split('-');
  return `${parseInt(month, 10)}/${parseInt(day, 10)}`;
}

export default function CalendarScreen() {
  useGameHydration();
  const getCompletedDaysForMonth = useGameStore((s) => s.getCompletedDaysForMonth);
  const getCurrentWeekSummary = useGameStore((s) => s.getCurrentWeekSummary);
  const getRecentWeekSummaries = useGameStore((s) => s.getRecentWeekSummaries);
  const refreshVersion = useGameStore((s) => s.lastAction);

  const colors = useAppColors();

  const [visibleMonth, setVisibleMonth] = useState(() => {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
  });

  const year = visibleMonth.getUTCFullYear();
  const monthIndex = visibleMonth.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const firstWeekdayOffset = (new Date(Date.UTC(year, monthIndex, 1)).getUTCDay() + 6) % 7;

  const todayKey = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const completedDaySet = useMemo(
    () => {
      void refreshVersion;
      return new Set(getCompletedDaysForMonth(year, monthIndex));
    },
    [getCompletedDaysForMonth, monthIndex, year, refreshVersion]
  );
  const currentWeek = useMemo(
    () => {
      void refreshVersion;
      return getCurrentWeekSummary();
    },
    [getCurrentWeekSummary, refreshVersion]
  );
  const recentWeeks = useMemo(
    () => {
      void refreshVersion;
      return getRecentWeekSummaries(8);
    },
    [getRecentWeekSummaries, refreshVersion]
  );
  const weekCells = useMemo(() => Array.from({ length: firstWeekdayOffset }, () => null), [firstWeekdayOffset]);
  const bonusTiersAscending = useMemo(
    () => [...WEEKLY_COMPLETION_BONUSES].sort((a, b) => a.days - b.days),
    []
  );

  return (
    <ScrollView
      className="flex-1"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
    >
      <Text className="text-2xl font-bold mt-4 mb-5" style={{ color: colors.text }}>
        Calendar
      </Text>

      <View
        className="rounded-xl p-4 mb-5"
        style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder }}
      >
        <View className="flex-row items-center justify-between mb-3">
          <Pressable
            onPress={() => setVisibleMonth((current) => shiftMonth(current, -1))}
            className="w-9 h-9 items-center justify-center rounded-lg"
            style={({ pressed }) => ({ backgroundColor: pressed ? colors.inputBg : 'transparent' })}
          >
            <Ionicons name="chevron-back" size={18} color={colors.textSecondary} />
          </Pressable>
          <Text className="text-base font-semibold" style={{ color: colors.text }}>
            {MONTH_LABELS[monthIndex]} {year}
          </Text>
          <Pressable
            onPress={() => setVisibleMonth((current) => shiftMonth(current, 1))}
            className="w-9 h-9 items-center justify-center rounded-lg"
            style={({ pressed }) => ({ backgroundColor: pressed ? colors.inputBg : 'transparent' })}
          >
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </Pressable>
        </View>

        <View className="flex-row mb-1">
          {WEEKDAY_LABELS.map((label) => (
            <View key={label} className="items-center" style={{ width: '14.2857%' }}>
              <Text className="text-xs font-medium" style={{ color: colors.textTertiary }}>
                {label}
              </Text>
            </View>
          ))}
        </View>

        <View className="flex-row flex-wrap">
          {weekCells.map((_, index) => (
            <View key={`empty-${index}`} style={{ width: '14.2857%', height: 38 }} />
          ))}
          {Array.from({ length: daysInMonth }, (_, index) => {
            const day = index + 1;
            const dayKey = toDayKey(year, monthIndex, day);
            const isCompleted = completedDaySet.has(dayKey);
            const isToday = dayKey === todayKey;
            return (
              <View key={dayKey} className="items-center justify-center" style={{ width: '14.2857%', height: 38 }}>
                <View
                  className="items-center justify-center"
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    backgroundColor: isCompleted ? colors.accent : 'transparent',
                    borderWidth: isToday ? 1 : 0,
                    borderColor: isToday ? colors.accent : 'transparent',
                  }}
                >
                  <Text
                    className="text-xs font-semibold"
                    style={{ color: isCompleted ? '#fff' : colors.text }}
                  >
                    {day}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        <View className="flex-row items-center mt-3">
          <View className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: colors.accent }} />
          <Text className="text-xs" style={{ color: colors.textSecondary }}>
            Completed at least one quest
          </Text>
        </View>
      </View>

      <View
        className="rounded-xl p-4 mb-5"
        style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder }}
      >
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-base font-semibold" style={{ color: colors.text }}>
            This Week
          </Text>
          <Text className="text-sm font-semibold" style={{ color: colors.accent }}>
            {currentWeek.completedDays}/7 days
          </Text>
        </View>
        <ProgressBar progress={currentWeek.completedDays / 7} height={10} />
        <View className="flex-row items-center justify-between mt-3">
          <Text className="text-xs" style={{ color: colors.textSecondary }}>
            Streak: {currentWeek.currentStreak} day{currentWeek.currentStreak === 1 ? '' : 's'}
          </Text>
          <Text className="text-xs" style={{ color: colors.textSecondary }}>
            Consistency: {currentWeek.consistencyPercent}%
          </Text>
        </View>
        <Text className="text-xs mt-2" style={{ color: colors.textTertiary }}>
          Current week bonus target: +{currentWeek.bonusXp} XP
        </Text>
      </View>

      <View
        className="rounded-xl p-4 mb-5"
        style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder }}
      >
        <Text className="text-base font-semibold mb-3" style={{ color: colors.text }}>
          Questing Days Per Week
        </Text>
        {recentWeeks.map((week) => (
          <View key={week.weekStartKey} className="flex-row items-center justify-between py-2.5">
            <Text className="text-xs" style={{ color: colors.textSecondary }}>
              {formatShortDateKey(week.weekStartKey)} - {formatShortDateKey(week.weekEndKey)}
            </Text>
            <View className="flex-row items-center">
              <Text className="text-xs mr-3" style={{ color: colors.text }}>
                {week.completedDays}/7
              </Text>
              <Text className="text-xs font-semibold" style={{ color: colors.accent }}>
                +{week.bonusXp} XP
              </Text>
            </View>
          </View>
        ))}
      </View>

      <View
        className="rounded-xl p-4"
        style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder }}
      >
        <Text className="text-base font-semibold mb-3" style={{ color: colors.text }}>
          Weekly Completion Bonus
        </Text>
        {bonusTiersAscending.map((tier) => (
          <View key={tier.days} className="flex-row items-center justify-between py-2">
            <Text className="text-sm" style={{ color: colors.textSecondary }}>
              {tier.days} days completed
            </Text>
            <Text className="text-sm font-semibold" style={{ color: colors.accent }}>
              +{tier.bonusXp} XP
            </Text>
          </View>
        ))}
        <Text className="text-xs mt-2" style={{ color: colors.textTertiary }}>
          Bonus is processed automatically once a new week starts.
        </Text>
      </View>
    </ScrollView>
  );
}
