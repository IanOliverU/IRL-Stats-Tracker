import { triggerLevelUpHaptic } from '@/lib/feedback';
import { getModalBackdropColor } from '@/lib/modalBackdrop';
import { getItemDefinitionById, getItemRarityById, STAT_LABELS, type ItemRarity } from '@/models';
import type { QuestCompletionFeedback as QuestCompletionFeedbackData } from '@/services/habitService';
import { useAppColors, useIsDarkTheme } from '@/store/useThemeStore';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, Text, View } from 'react-native';

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
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(26)).current;
  const cardScale = useRef(new Animated.Value(0.9)).current;
  const haloScale = useRef(new Animated.Value(0.72)).current;
  const haloOpacity = useRef(new Animated.Value(0)).current;
  const badgeScale = useRef(new Animated.Value(0.65)).current;

  useEffect(() => {
    if (!visible || !feedback) return;

    backdropOpacity.setValue(0);
    cardOpacity.setValue(0);
    cardTranslateY.setValue(26);
    cardScale.setValue(0.9);
    haloScale.setValue(0.72);
    haloOpacity.setValue(0);
    badgeScale.setValue(0.65);
    void triggerLevelUpHaptic();

    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.spring(cardTranslateY, {
        toValue: 0,
        friction: 8,
        tension: 120,
        useNativeDriver: true,
      }),
      Animated.spring(cardScale, {
        toValue: 1,
        friction: 7,
        tension: 130,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(haloOpacity, {
          toValue: 0.95,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.timing(haloOpacity, {
          toValue: 0.4,
          duration: 360,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.spring(haloScale, {
          toValue: 1.08,
          friction: 6,
          tension: 120,
          useNativeDriver: true,
        }),
        Animated.timing(haloScale, {
          toValue: 1,
          duration: 260,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(80),
        Animated.spring(badgeScale, {
          toValue: 1.08,
          friction: 6,
          tension: 150,
          useNativeDriver: true,
        }),
        Animated.spring(badgeScale, {
          toValue: 1,
          friction: 7,
          tension: 120,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [
    backdropOpacity,
    badgeScale,
    cardOpacity,
    cardScale,
    cardTranslateY,
    feedback,
    haloOpacity,
    haloScale,
    visible,
  ]);

  if (!visible || !feedback) return null;

  const unlockedRewardIds = feedback.unlockedItemIds ?? [];
  const primaryReward = unlockedRewardIds.length > 0 ? getItemDefinitionById(unlockedRewardIds[0]) : null;
  const primaryRewardRarity = unlockedRewardIds.length > 0 ? getItemRarityById(unlockedRewardIds[0]) : null;
  const hasRewardAction = !!primaryReward && !!onViewReward;
  const totalXpGained = feedback.xpGained + (feedback.instantXpFromItems ?? 0);
  const rarityColor = getRarityColor(primaryRewardRarity, colors);
  const actionButtonBackground = colors.text;
  const actionButtonText = colors.background;

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={onContinue}>
      <Animated.View
        className="flex-1 items-center justify-center px-6"
        style={{ backgroundColor: backdropColor, opacity: backdropOpacity }}
      >
        <Animated.View
          className="w-full rounded-3xl p-6"
          style={{
            opacity: cardOpacity,
            transform: [{ translateY: cardTranslateY }, { scale: cardScale }],
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.warning + '55',
            maxWidth: 380,
          }}
        >
          <View className="items-center">
            <Animated.View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: -18,
                width: 116,
                height: 116,
                borderRadius: 58,
                backgroundColor: colors.warning + '18',
                opacity: haloOpacity,
                transform: [{ scale: haloScale }],
              }}
            />
            <Animated.View
              className="h-20 w-20 items-center justify-center rounded-full"
              style={{
                backgroundColor: colors.warning + '18',
                borderWidth: 1,
                borderColor: colors.warning + '30',
                transform: [{ scale: badgeScale }],
              }}
            >
              <Ionicons name="sparkles-outline" size={38} color={colors.warning} />
            </Animated.View>
            <Text className="mt-4 text-3xl font-bold" style={{ color: colors.text }}>
              Level Up
            </Text>
            <Text className="mt-1 text-sm text-center" style={{ color: colors.textSecondary }}>
              That one should feel good. Your build just broke through.
            </Text>
          </View>

          <View
            className="mt-6 rounded-2xl px-4 py-3"
            style={{
              backgroundColor: colors.warning + '10',
              borderWidth: 1,
              borderColor: colors.warning + '35',
            }}
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
              style={{
                backgroundColor: colors.background,
                borderWidth: 1,
                borderColor: colors.cardBorder,
              }}
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
              style={{
                backgroundColor: colors.background,
                borderWidth: 1,
                borderColor: colors.cardBorder,
              }}
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
                  backgroundColor: actionButtonBackground,
                  borderWidth: 1,
                  borderColor: actionButtonBackground,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Text className="text-sm font-semibold" style={{ color: actionButtonText }}>
                  View Reward
                </Text>
              </Pressable>
            )}
            <Pressable
              onPress={onContinue}
              className="flex-1 items-center rounded-2xl py-3.5"
              style={({ pressed }) => ({
                backgroundColor: actionButtonBackground,
                borderWidth: 1,
                borderColor: actionButtonBackground,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Text className="text-sm font-semibold" style={{ color: actionButtonText }}>
                Continue
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
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
