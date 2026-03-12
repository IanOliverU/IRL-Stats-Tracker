import { ItemCard } from '@/components/ItemCard';
import { useGameHydration } from '@/hooks/useGameHydration';
import { getItemRarityById, type ItemRarity } from '@/models';
import { useGameStore } from '@/store/useGameStore';
import { useAppColors } from '@/store/useThemeStore';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';

export default function InventoryScreen() {
  useGameHydration();
  const items = useGameStore((s) => s.items);

  const colors = useAppColors();

  const unlocked = items.filter((i) => i.unlockedAt);
  const locked = items.filter((i) => !i.unlockedAt);
  const rarityOrder: ItemRarity[] = ['Common', 'Rare', 'Epic', 'Legendary'];
  const rarityCounts = useMemo(() => {
    const counts: Record<ItemRarity, number> = {
      Common: 0,
      Rare: 0,
      Epic: 0,
      Legendary: 0,
    };

    for (const item of items) {
      counts[getItemRarityById(item.id)] += 1;
    }

    return counts;
  }, [items]);

  return (
    <ScrollView
      className="flex-1"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
    >
      <Text className="text-2xl font-bold mt-4 mb-1" style={{ color: colors.text }}>
        Inventory
      </Text>
      <Text className="text-sm mb-6" style={{ color: colors.textSecondary }}>
        Unlock collectible rewards through levels and quest milestones. Stronger tiers feel rarer for a reason.
      </Text>

      <View
        className="rounded-xl p-4 mb-5"
        style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder }}
      >
        <View className="flex-row items-center mb-3">
          <Ionicons name="diamond-outline" size={18} color={colors.warning} />
          <Text className="text-base font-semibold ml-2" style={{ color: colors.text }}>
            Rarity Breakdown
          </Text>
        </View>
        <View className="flex-row flex-wrap gap-2">
          {rarityOrder.map((rarity) => (
            <View
              key={rarity}
              className="rounded-full px-3 py-1.5"
              style={{ backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.inputBorder }}
            >
              <Text className="text-xs font-semibold" style={{ color: colors.text }}>
                {rarity}: {rarityCounts[rarity]}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {unlocked.length > 0 && (
        <View className="mb-4">
          <View className="flex-row items-center mb-3">
            <Ionicons name="checkmark-circle-outline" size={18} color={colors.success} />
            <Text className="text-base font-semibold ml-2" style={{ color: colors.text }}>
              Unlocked ({unlocked.length})
            </Text>
          </View>
          {unlocked.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </View>
      )}

      <View>
        <View className="flex-row items-center mb-3">
          <Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} />
          <Text className="text-base font-semibold ml-2" style={{ color: colors.text }}>
            Locked ({locked.length})
          </Text>
        </View>
        {locked.length === 0 ? (
          <Text className="text-sm italic" style={{ color: colors.textTertiary }}>
            All items unlocked!
          </Text>
        ) : (
          locked.map((item) => <ItemCard key={item.id} item={item} />)
        )}
      </View>
    </ScrollView>
  );
}
