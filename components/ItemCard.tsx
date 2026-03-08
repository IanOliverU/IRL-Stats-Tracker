import { getItemDefinitionById, type Item } from '@/models';
import { useAppColors } from '@/store/useThemeStore';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';

type ItemCardProps = {
  item: Item;
};

export function ItemCard({ item }: ItemCardProps) {
  const colors = useAppColors();
  const unlocked = !!item.unlockedAt;
  const definition = getItemDefinitionById(item.id);
  const icon = (definition?.icon as keyof typeof Ionicons.glyphMap | undefined) ?? 'cube-outline';
  const effectLabel = definition?.effectLabel ?? (item.bonusAmount > 0 ? `+${item.bonusAmount} ${item.statBonus}` : 'Inventory reward');
  const flavor = definition?.flavor ?? item.unlockCondition;
  const category = definition?.category ?? 'stat';

  return (
    <View
      className="rounded-xl border p-4 mb-3"
      style={{
        backgroundColor: colors.card,
        borderColor: unlocked ? colors.accent + '30' : colors.cardBorder,
        opacity: unlocked ? 1 : 0.6,
      }}
    >
      <View className="flex-row items-center justify-between mb-1.5">
        <View className="flex-row items-center flex-1">
          <View
            className="w-8 h-8 rounded-lg items-center justify-center mr-3"
            style={{
              backgroundColor: unlocked ? colors.accent + '15' : colors.inputBg,
            }}
          >
            <Ionicons
              name={icon as any}
              size={16}
              color={unlocked ? colors.accent : colors.textTertiary}
            />
          </View>
          <Text className="text-sm font-semibold flex-1" style={{ color: colors.text }}>
            {item.name}
          </Text>
        </View>
        {unlocked ? (
          <View
            className="px-2.5 py-1 rounded-lg"
            style={{ backgroundColor: colors.success + '18' }}
          >
            <Text className="text-xs font-semibold" style={{ color: colors.success }}>
              {category.toUpperCase()}
            </Text>
          </View>
        ) : (
          <View className="flex-row items-center">
            <Ionicons name="lock-closed-outline" size={13} color={colors.textTertiary} />
            <Text className="text-xs ml-1" style={{ color: colors.textTertiary }}>
              Locked
            </Text>
          </View>
        )}
      </View>
      <Text
        className="text-xs ml-11"
        numberOfLines={2}
        style={{ color: colors.textSecondary }}
      >
        {effectLabel}
      </Text>
      <Text
        className="text-[11px] ml-11 mt-1"
        numberOfLines={2}
        style={{ color: colors.textTertiary }}
      >
        {unlocked ? flavor : item.unlockCondition}
      </Text>
    </View>
  );
}
