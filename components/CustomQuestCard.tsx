import type { CustomQuest } from '@/models';
import { DIFFICULTY_COLORS, DIFFICULTY_LABELS, STAT_LABELS } from '@/models';
import { useAppColors } from '@/store/useThemeStore';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useCallback } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

type CustomQuestCardProps = {
    quest: CustomQuest;
    onComplete: () => void;
    onDelete: () => void;
};

export function CustomQuestCard({ quest, onComplete, onDelete }: CustomQuestCardProps) {
    const colors = useAppColors();
    const isCompleted = !!quest.completedAt;
    const isMapActivityQuest = quest.source === 'map_activity';
    const isTrackingSession = isMapActivityQuest && !isCompleted;
    const diffColor = DIFFICULTY_COLORS[quest.difficulty];
    const trackedDistanceKm = quest.distanceMeters / 1000;

    const handleComplete = useCallback(() => {
        if (isCompleted || isTrackingSession) return;
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        onComplete();
    }, [isCompleted, isTrackingSession, onComplete]);

    return (
        <Pressable
            onPress={handleComplete}
            onLongPress={onDelete}
            disabled={isCompleted || isTrackingSession}
            className="mb-3"
            style={({ pressed }) => ({ opacity: pressed && !isCompleted && !isTrackingSession ? 0.85 : 1 })}
        >
            <View
                className="rounded-xl border p-4"
                style={{
                    backgroundColor: colors.card,
                    borderColor: isCompleted ? colors.success + '40' : colors.cardBorder,
                }}
            >
                {/* Title row */}
                <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-row items-center flex-1 mr-2">
                        <View
                            className="w-2 h-2 rounded-full mr-2.5"
                            style={{ backgroundColor: diffColor }}
                        />
                        <Text
                            className="text-base font-semibold flex-1"
                            numberOfLines={1}
                            style={{
                                color: colors.text,
                                textDecorationLine: isCompleted ? 'line-through' : 'none',
                            }}
                        >
                            {quest.title}
                        </Text>
                    </View>
                    <View
                        className="px-2 py-0.5 rounded-md"
                        style={{ backgroundColor: diffColor + '18' }}
                    >
                        <Text className="text-[10px] font-bold" style={{ color: diffColor }}>
                            {DIFFICULTY_LABELS[quest.difficulty].toUpperCase()}
                        </Text>
                    </View>
                </View>

                {/* Meta row */}
                <View className="flex-row items-center gap-3 mb-3">
                    {isMapActivityQuest && quest.activityType ? (
                        <View className="flex-row items-center">
                            <Ionicons
                                name={quest.activityType === 'run' ? 'flash-outline' : 'walk-outline'}
                                size={14}
                                color={colors.textSecondary}
                            />
                            <Text className="text-xs ml-1" style={{ color: colors.textSecondary }}>
                                {quest.activityType === 'run' ? 'Run Session' : 'Walk Session'}
                            </Text>
                        </View>
                    ) : null}
                    <View className="flex-row items-center">
                        <Ionicons name="arrow-up-circle-outline" size={14} color={colors.textSecondary} />
                        <Text className="text-xs ml-1" style={{ color: colors.textSecondary }}>
                            {STAT_LABELS[quest.statReward]}
                        </Text>
                    </View>
                    <View className="flex-row items-center">
                        <Ionicons name="star-outline" size={14} color={colors.textSecondary} />
                        <Text className="text-xs ml-1" style={{ color: colors.textSecondary }}>
                            +{quest.xpReward} XP
                        </Text>
                    </View>
                </View>

                {/* Status */}
                {isCompleted ? (
                    <View className="flex-row items-center">
                        <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                        <Text className="text-sm font-medium ml-1.5" style={{ color: colors.success }}>
                            +{quest.xpReward} {quest.statReward} XP earned
                        </Text>
                    </View>
                ) : isTrackingSession ? (
                    <View
                        className="py-2.5 px-3 rounded-lg border"
                        style={{ borderColor: colors.warning + '40', backgroundColor: colors.warning + '12' }}
                    >
                        <Text className="text-sm font-medium" style={{ color: colors.warning }}>
                            Session active · {trackedDistanceKm.toFixed(2)} km tracked
                        </Text>
                        <Text className="text-xs mt-1" style={{ color: colors.textSecondary }}>
                            Completes automatically when you finish in Maps
                        </Text>
                    </View>
                ) : (
                    <View
                        className="flex-row items-center justify-center py-2 rounded-lg border"
                        style={{ borderColor: colors.accent + '40' }}
                    >
                        <Ionicons name="flash-outline" size={14} color={colors.accent} />
                        <Text className="text-sm font-medium ml-1.5" style={{ color: colors.accent }}>
                            Tap to complete
                        </Text>
                    </View>
                )}
            </View>
        </Pressable>
    );
}
