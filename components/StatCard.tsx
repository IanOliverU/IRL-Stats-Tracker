import type { StatType } from '@/models';
import { STAT_LABELS } from '@/models';
import { useAppColors } from '@/store/useThemeStore';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';

const STAT_ICONS: Record<StatType, keyof typeof Ionicons.glyphMap> = {
  STR: 'barbell-outline',
  INT: 'bulb-outline',
  WIS: 'book-outline',
  CHA: 'people-outline',
  VIT: 'heart-outline',
};

type StatCardProps = {
  stat: StatType;
  value: number;
  compact?: boolean;
};

function getStatColor(colors: ReturnType<typeof useAppColors>, stat: StatType): string {
  const map: Record<StatType, string> = {
    STR: colors.statSTR,
    INT: colors.statINT,
    WIS: colors.statWIS,
    CHA: colors.statCHA,
    VIT: colors.statVIT,
  };
  return map[stat];
}

export function StatCard({ stat, value, compact }: StatCardProps) {
  const colors = useAppColors();
  const color = getStatColor(colors, stat);
  const icon = STAT_ICONS[stat];

  return (
    <View
      className={`items-center rounded-xl ${compact ? 'px-2 py-2' : 'px-3 py-3'}`}
      style={{ backgroundColor: colors.card, minWidth: compact ? 58 : 76 }}
    >
      <View
        className="items-center justify-center rounded-lg mb-1"
        style={{ backgroundColor: color + '18', width: compact ? 28 : 34, height: compact ? 28 : 34 }}
      >
        <Ionicons name={icon} size={compact ? 15 : 18} color={color} />
      </View>
      <Text
        className={`font-bold ${compact ? 'text-base' : 'text-xl'}`}
        style={{ color: colors.text }}
      >
        {value}
      </Text>
      {!compact && (
        <Text className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
          {STAT_LABELS[stat]}
        </Text>
      )}
      {compact && (
        <Text className="text-[10px] mt-0.5" style={{ color: colors.textTertiary }}>
          {stat}
        </Text>
      )}
    </View>
  );
}
