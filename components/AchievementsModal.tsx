import type { AchievementStatus } from '@/models';
import { useAppColors } from '@/store/useThemeStore';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

type AchievementsModalProps = {
  visible: boolean;
  achievements: AchievementStatus[];
  onClose: () => void;
};

export function AchievementsModal({ visible, achievements, onClose }: AchievementsModalProps) {
  const colors = useAppColors();
  const unlockedCount = achievements.filter((achievement) => !!achievement.unlockedAt).length;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
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
            {achievements.map((achievement) => {
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
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
