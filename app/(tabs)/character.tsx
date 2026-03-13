import { ProgressBar } from '@/components/ProgressBar';
import { StatCard } from '@/components/StatCard';
import { useGameHydration } from '@/hooks/useGameHydration';
import type { StatType } from '@/models';
import { STAT_DESCRIPTIONS, totalXpForLevel, xpRequiredForLevel } from '@/models';
import { useGameStore } from '@/store/useGameStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useAppColors } from '@/store/useThemeStore';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

const STAT_ORDER: StatType[] = ['STR', 'INT', 'WIS', 'CHA', 'VIT'];

export default function CharacterScreen() {
  const router = useRouter();
  useGameHydration();
  const user = useGameStore((s) => s.user);
  const items = useGameStore((s) => s.items);
  const getTotalMissionXp = useGameStore((s) => s.getTotalMissionXp);
  const refreshUser = useGameStore((s) => s.refreshUser);
  const authUser = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);

  const colors = useAppColors();
  const [isSigningOut, setIsSigningOut] = useState(false);
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

  // Re-read user from DB every time this tab comes into focus
  // so stats / level always reflect the latest data.
  useFocusEffect(
    useCallback(() => {
      refreshUser();
    }, [refreshUser])
  );

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
  const totalStats = STAT_ORDER.reduce((sum, stat) => sum + effectiveStats[stat], 0);
  const totalMissionXp = getTotalMissionXp();

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await signOut();
      router.replace('/auth');
    } catch (error) {
      console.warn('Failed to sign out', error);
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <ScrollView
      className="flex-1"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
    >
      <View className="mt-4">
        <Text className="text-2xl font-bold mb-3" style={{ color: colors.text }}>
          Character
        </Text>

        {/* Level card */}
        <View
          className="rounded-xl p-4"
          style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder }}
        >
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center">
              <Ionicons name="shield-outline" size={18} color={colors.accent} />
              <Text className="text-base font-bold ml-2" style={{ color: colors.accent }}>
                Level {user.level}
              </Text>
            </View>
            <View className="flex-row items-center">
              <Ionicons name="flash-outline" size={14} color={colors.textTertiary} />
              <Text className="text-xs ml-1" style={{ color: colors.textTertiary }}>
                Power {totalStats}
              </Text>
            </View>
          </View>
          <Text className="text-xs mb-2" style={{ color: colors.textSecondary }}>
            {xpIntoLevel} / {required} XP to next level
          </Text>
          <ProgressBar progress={xpProgress} height={12} />
        </View>
      </View>

      {/* Stats breakdown */}
      <View className="mt-8">
        <View className="flex-row items-center mb-3">
          <Ionicons name="stats-chart-outline" size={18} color={colors.text} />
          <Text className="text-lg font-semibold ml-2" style={{ color: colors.text }}>
            Stats Breakdown
          </Text>
        </View>

        {STAT_ORDER.map((stat) => (
          <View key={stat} className="mb-3">
            <View
              className="rounded-xl p-4 flex-row items-center"
                style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder }}
              >
                <StatCard stat={stat} value={effectiveStats[stat]} />
                <View className="ml-4 flex-1">
                  <Text className="text-xs" style={{ color: colors.textSecondary }}>
                    {STAT_DESCRIPTIONS[stat]}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* Mission Statistics */}
      <View className="mt-8">
        <View className="flex-row items-center mb-3">
          <Ionicons name="trophy-outline" size={18} color={colors.text} />
          <Text className="text-lg font-semibold ml-2" style={{ color: colors.text }}>
            Mission Statistics
          </Text>
        </View>

        <View
          className="rounded-xl p-4"
          style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder }}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Ionicons name="star-outline" size={20} color={colors.accent} />
              <Text className="text-sm font-semibold ml-2" style={{ color: colors.text }}>
                Total Mission XP Earned
              </Text>
            </View>
            <Text className="text-lg font-bold" style={{ color: colors.accent }}>
              {totalMissionXp.toLocaleString()}
            </Text>
          </View>
        </View>
      </View>

      <View className="mt-8">
        <View className="flex-row items-center mb-3">
          <Ionicons name="cloud-outline" size={18} color={colors.text} />
          <Text className="text-lg font-semibold ml-2" style={{ color: colors.text }}>
            Cloud Account
          </Text>
        </View>

        <View
          className="rounded-xl p-4"
          style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder }}
        >
          <Text className="text-xs uppercase tracking-widest" style={{ color: colors.textTertiary }}>
            Signed in as
          </Text>
          <Text className="mt-2 text-sm font-semibold" style={{ color: colors.text }}>
            {authUser?.email ?? 'No email available'}
          </Text>
          <Text className="mt-2 text-xs leading-5" style={{ color: colors.textSecondary }}>
            This account is now connected to Supabase. Your gameplay data is still local until we finish the cloud
            migration layer.
          </Text>

          <Pressable
            onPress={() => void handleSignOut()}
            disabled={isSigningOut}
            className="mt-4 items-center rounded-xl py-3.5"
            style={({ pressed }) => ({
              backgroundColor: colors.inputBg,
              borderWidth: 1,
              borderColor: colors.inputBorder,
              opacity: pressed || isSigningOut ? 0.85 : 1,
            })}
          >
            {isSigningOut ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <Text className="text-sm font-semibold" style={{ color: colors.text }}>
                Sign Out
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
