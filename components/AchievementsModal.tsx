import {
  ACHIEVEMENT_CATEGORIES,
  getAchievementCategory,
  type AchievementCategory,
  type AchievementStatus,
} from '@/models';
import { getModalBackdropColor } from '@/lib/modalBackdrop';
import { useAppColors, useIsDarkTheme } from '@/store/useThemeStore';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

type AchievementsModalProps = {
  visible: boolean;
  achievements: AchievementStatus[];
  onClose: () => void;
};

export function AchievementsModal({ visible, achievements, onClose }: AchievementsModalProps) {
  const colors = useAppColors();
  const isDarkTheme = useIsDarkTheme();
  const unlockedCount = achievements.filter((achievement) => !!achievement.unlockedAt).length;
  const backdropColor = getModalBackdropColor(colors.background, isDarkTheme);
  const [selectedCategory, setSelectedCategory] = useState<AchievementCategory | 'All'>('All');
  const groupedAchievements = useMemo(() => {
    const groups = new Map<AchievementCategory, AchievementStatus[]>();

    for (const category of ACHIEVEMENT_CATEGORIES) {
      groups.set(category, []);
    }

    for (const achievement of achievements) {
      const category = getAchievementCategory(achievement.id);
      groups.get(category)?.push(achievement);
    }

    return groups;
  }, [achievements]);
  const visibleCategories =
    selectedCategory === 'All'
      ? ACHIEVEMENT_CATEGORIES
      : ACHIEVEMENT_CATEGORIES.filter((category) => category === selectedCategory);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        <Pressable
          onPress={onClose}
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundColor: backdropColor,
          }}
        />
        <View
          className="rounded-t-3xl"
          style={{
            backgroundColor: colors.card,
            borderTopWidth: 1,
            borderColor: colors.cardBorder,
            maxHeight: '88%',
          }}
        >
          <View
            className="flex-row items-center justify-between px-5 py-4"
            style={{ borderBottomWidth: 1, borderColor: colors.cardBorder }}
          >
            <View>
              <Text className="text-lg font-bold" style={{ color: colors.text }}>
                Achievements
              </Text>
              <Text className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
                {unlockedCount} / {achievements.length} unlocked
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              className="w-8 h-8 items-center justify-center rounded-full"
              style={{ backgroundColor: colors.inputBg }}
            >
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 12 }}
            >
              {(['All', ...ACHIEVEMENT_CATEGORIES] as const).map((category) => {
                const isActive = selectedCategory === category;
                const count =
                  category === 'All'
                    ? achievements.length
                    : groupedAchievements.get(category)?.length ?? 0;
                return (
                  <Pressable
                    key={category}
                    onPress={() => setSelectedCategory(category)}
                    className="mr-2 rounded-full px-3 py-2"
                    style={{
                      backgroundColor: isActive ? colors.accent + '18' : colors.inputBg,
                      borderWidth: 1,
                      borderColor: isActive ? colors.accent : colors.inputBorder,
                    }}
                  >
                    <Text className="text-xs font-semibold" style={{ color: isActive ? colors.accent : colors.textSecondary }}>
                      {category} ({count})
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {visibleCategories.map((category) => {
              const categoryAchievements = groupedAchievements.get(category) ?? [];
              if (categoryAchievements.length === 0) return null;

              return (
                <View key={category} className="mb-4">
                  {selectedCategory === 'All' && (
                    <Text className="text-xs font-semibold uppercase mb-3" style={{ color: colors.textTertiary }}>
                      {category}
                    </Text>
                  )}
                  {categoryAchievements.map((achievement) => {
                    const unlocked = !!achievement.unlockedAt;
                    return (
                      <View
                        key={achievement.id}
                        className="rounded-xl p-4 mb-3"
                        style={{
                          backgroundColor: unlocked ? colors.warning + '12' : colors.background,
                          borderWidth: 1,
                          borderColor: unlocked ? colors.warning + '55' : colors.cardBorder,
                        }}
                      >
                        <View className="flex-row items-start">
                          <View
                            className="w-10 h-10 rounded-xl items-center justify-center mr-3"
                            style={{
                              backgroundColor: unlocked ? colors.warning + '22' : colors.inputBg,
                            }}
                          >
                            <Ionicons
                              name={achievement.icon as keyof typeof Ionicons.glyphMap}
                              size={18}
                              color={unlocked ? colors.warning : colors.textTertiary}
                            />
                          </View>
                          <View className="flex-1">
                            <View className="flex-row items-center justify-between">
                              <Text className="text-sm font-semibold" style={{ color: colors.text }}>
                                {achievement.title}
                              </Text>
                              {unlocked ? (
                                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                              ) : (
                                <Ionicons name="lock-closed-outline" size={14} color={colors.textTertiary} />
                              )}
                            </View>
                            {selectedCategory !== 'All' && (
                              <Text className="text-[10px] mt-1 uppercase" style={{ color: colors.textTertiary }}>
                                {category}
                              </Text>
                            )}
                            <Text className="text-xs mt-1" style={{ color: colors.textSecondary }}>
                              {achievement.requirement}
                            </Text>
                            <Text className="text-xs mt-1" style={{ color: colors.textTertiary }}>
                              &quot;{achievement.description}&quot;
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
