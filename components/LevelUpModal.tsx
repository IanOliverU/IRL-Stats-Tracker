import { getModalBackdropColor } from '@/lib/modalBackdrop';
import { getItemDefinitionById, getItemRarityById, STAT_LABELS, type ItemRarity } from '@/models';
import type { QuestCompletionFeedback as QuestCompletionFeedbackData } from '@/services/habitService';
import { useAppColors, useIsDarkTheme } from '@/store/useThemeStore';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

type LevelUpModalProps = {
  visible: boolean;
  feedback: QuestCompletionFeedbackData | null;
  onContinue: () => void;
  onViewReward?: () => void;
};

export function LevelUpModal({
  visible,
  feedback,
  onContinue,
  onViewReward,
}: LevelUpModalProps) {
  const colors = useAppColors();
  const isDarkTheme = useIsDarkTheme();
  const backdropColor = getModalBackdropColor(colors.background, isDarkTheme, 'strong');

  if (!visible || !feedback) return null;

  const unlockedRewardIds = feedback.unlockedItemIds ?? [];
  const primaryReward = unlockedRewardIds.length > 0 ? getItemDefinitionById(unlockedRewardIds[0]) : null;
  const primaryRewardRarity = unlockedRewardIds.length > 0 ? getItemRarityById(unlockedRewardIds[0]) : null;
  const hasRewardAction = !!primaryReward && !!onViewReward;
  const totalXpGained = feedback.xpGained + (feedback.instantXpFromItems ?? 0);
  const rarityColor = getRarityColor(primaryRewardRarity, colors);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onContinue}>
      <View
        className="flex-1 items-center justify-center px-6"
        style={{ backgroundColor: backdropColor }}
      >
        <View
          className="w-full rounded-3xl p-6"
          style={{
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.warning + '55',
            maxWidth: 380,
          }}
        >
          <View className="items-center">
            <View
              className="h-20 w-20 items-center justify-center rounded-full"
              style={{ backgroundColor: colors.warning + '18' }}
            >
              <Ionicons name="sparkles-outline" size={38} color={colors.warning} />
            </View>
            <Text className="mt-4 text-3xl font-bold" style={{ color: colors.text }}>
              Level Up
            </Text>
            <Text className="mt-1 text-sm text-center" style={{ color: colors.textSecondary }}>
              A clear step forward for your build.
            </Text>
          </View>

          <View
            className="mt-6 rounded-2xl px-4 py-3"
            style={{ backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.inputBorder }}
          >
            <View className="flex-row items-center justify-center">
              <Text className="text-lg font-semibold" style={{ color: colors.textSecondary }}>
                Level {feedback.previousLevel}
              </Text>
              <Ionicons name="arrow-forward" size={20} color={colors.warning} style={{ marginHorizontal: 12 }} />
              <Text className="text-2xl font-bold" style={{ color: colors.warning }}>
                Level {feedback.newLevel}
              </Text>
            </View>
          </View>

          <View className="mt-5 gap-3">
            <View
              className="rounded-2xl p-4"
              style={{ backgroundColor: colors.background, borderWidth: 1, borderColor: colors.cardBorder }}
            >
              <Text className="text-xs uppercase tracking-widest" style={{ color: colors.textTertiary }}>
                XP Gained
              </Text>
              <Text className="mt-1 text-xl font-bold" style={{ color: colors.text }}>
                +{totalXpGained} XP
              </Text>
              {(feedback.instantXpFromItems ?? 0) > 0 && (
                <Text className="mt-1 text-xs" style={{ color: colors.accent }}>
                  Includes +{feedback.instantXpFromItems} bonus XP from unlocked rewards
                </Text>
              )}
            </View>

            <View
              className="rounded-2xl p-4"
              style={{ backgroundColor: colors.background, borderWidth: 1, borderColor: colors.cardBorder }}
            >
              <Text className="text-xs uppercase tracking-widest" style={{ color: colors.textTertiary }}>
                Stat Increase
              </Text>
              <Text className="mt-1 text-base font-semibold" style={{ color: colors.text }}>
                +{feedback.statIncrease.amount} {STAT_LABELS[feedback.statIncrease.stat]}
              </Text>
            </View>

            <View
              className="rounded-2xl p-4"
              style={{
                backgroundColor: primaryReward ? colors.warning + '10' : colors.background,
                borderWidth: 1,
                borderColor: primaryReward ? colors.warning + '45' : colors.cardBorder,
              }}
            >
              <Text className="text-xs uppercase tracking-widest" style={{ color: colors.textTertiary }}>
                Reward
              </Text>
              {primaryReward ? (
                <>
                  <View className="mt-2 flex-row items-center">
                    <Ionicons name={primaryReward.icon as keyof typeof Ionicons.glyphMap} size={18} color={colors.warning} />
                    <Text className="ml-2 text-base font-semibold" style={{ color: colors.text }}>
                      {primaryReward.name}
                    </Text>
                  </View>
                  <View className="mt-2 self-start px-2.5 py-1 rounded-lg" style={{ backgroundColor: rarityColor + '18' }}>
                    <Text className="text-[10px] font-semibold" style={{ color: rarityColor }}>
                      {primaryRewardRarity}
                    </Text>
                  </View>
                  <Text className="mt-1 text-sm" style={{ color: colors.textSecondary }}>
                    {primaryReward.effectLabel}
                  </Text>
                  <Text className="mt-1 text-xs" style={{ color: colors.accent }}>
                    Reward bonuses are active as soon as they unlock.
                  </Text>
                  {unlockedRewardIds.length > 1 && (
                    <Text className="mt-2 text-xs" style={{ color: colors.textTertiary }}>
                      +{unlockedRewardIds.length - 1} more reward{unlockedRewardIds.length === 2 ? '' : 's'} unlocked
                    </Text>
                  )}
                </>
              ) : (
                <Text className="mt-2 text-sm" style={{ color: colors.textSecondary }}>
                  No new reward on this level, but your build just got stronger.
                </Text>
              )}
            </View>
          </View>

          <View className="mt-6 flex-row gap-3">
            {hasRewardAction && (
              <Pressable
                onPress={onViewReward}
                className="flex-1 items-center rounded-2xl py-3.5"
                style={({ pressed }) => ({
                  backgroundColor: colors.inputBg,
                  borderWidth: 1,
                  borderColor: colors.inputBorder,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Text className="text-sm font-semibold" style={{ color: colors.text }}>
                  View Reward
                </Text>
              </Pressable>
            )}
            <Pressable
              onPress={onContinue}
              className="flex-1 items-center rounded-2xl py-3.5"
              style={({ pressed }) => ({
                backgroundColor: colors.warning,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Text className="text-sm font-semibold" style={{ color: '#0f172a' }}>
                Continue
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function getRarityColor(rarity: ItemRarity | null, colors: ReturnType<typeof useAppColors>): string {
  switch (rarity) {
    case 'Rare':
      return colors.accent;
    case 'Epic':
      return colors.warning;
    case 'Legendary':
      return '#f97316';
    case 'Common':
    default:
      return colors.textSecondary;
  }
}
