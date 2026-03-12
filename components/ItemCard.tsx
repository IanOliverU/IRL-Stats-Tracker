import { getItemDefinitionById, getItemRarityById, type Item, type ItemRarity } from '@/models';
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
  const rarity = getItemRarityById(item.id);
  const icon = (definition?.icon as keyof typeof Ionicons.glyphMap | undefined) ?? 'cube-outline';
  const effectLabel = definition?.effectLabel ?? (item.bonusAmount > 0 ? `+${item.bonusAmount} ${item.statBonus}` : 'Inventory reward');
  const flavor = definition?.flavor ?? item.unlockCondition;
  const category = definition?.category ?? 'stat';
  const rarityColor = getRarityColor(rarity, colors);

  return (
    <View
      className="rounded-xl border p-4 mb-3"
      style={{
        backgroundColor: colors.card,
        borderColor: unlocked ? rarityColor + '55' : colors.cardBorder,
        opacity: unlocked ? 1 : 0.6,
      }}
    >
      <View className="flex-row items-center justify-between mb-1.5">
        <View className="flex-row items-center flex-1">
          <View
            className="w-8 h-8 rounded-lg items-center justify-center mr-3"
            style={{
              backgroundColor: unlocked ? rarityColor + '18' : colors.inputBg,
            }}
          >
            <Ionicons
              name={icon as any}
              size={16}
              color={unlocked ? rarityColor : colors.textTertiary}
            />
          </View>
          <Text className="text-sm font-semibold flex-1" style={{ color: colors.text }}>
            {item.name}
          </Text>
        </View>
        <View className="items-end">
          <View
            className="px-2.5 py-1 rounded-lg"
            style={{ backgroundColor: unlocked ? rarityColor + '18' : colors.inputBg }}
          >
            <Text className="text-xs font-semibold" style={{ color: unlocked ? rarityColor : colors.textTertiary }}>
              {rarity}
            </Text>
          </View>
          <Text className="mt-1 text-[10px] font-semibold uppercase" style={{ color: colors.textTertiary }}>
            {category}
          </Text>
        </View>
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

function getRarityColor(rarity: ItemRarity, colors: ReturnType<typeof useAppColors>): string {
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
