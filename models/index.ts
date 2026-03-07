/**
 * LifeRPG data models
 */

export type StatType = 'STR' | 'INT' | 'WIS' | 'CHA' | 'VIT';

export type HabitFrequency = 'daily' | 'weekly';

export interface User {
  id: string;
  level: number;
  xp: number;
  str: number;
  int: number;
  wis: number;
  cha: number;
  vit: number;
  createdAt: string;
  updatedAt: string;
}

export interface Habit {
  id: string;
  title: string;
  statReward: StatType;
  xpReward: number;
  frequency: HabitFrequency;
  createdAt: string;
  updatedAt: string;
}

export interface HabitLog {
  id: string;
  habitId: string;
  completedAt: string;
  streakCount: number;
  bonusXp: number;
}

export interface Item {
  id: string;
  name: string;
  statBonus: StatType;
  bonusAmount: number;
  unlockCondition: string;
  unlockedAt: string | null;
  createdAt: string;
}

export const STAT_LABELS: Record<StatType, string> = {
  STR: 'Strength',
  INT: 'Intelligence',
  WIS: 'Wisdom',
  CHA: 'Charisma',
  VIT: 'Vitality',
};

export const STAT_DESCRIPTIONS: Record<StatType, string> = {
  STR: 'Exercise',
  INT: 'Coding / Studying',
  WIS: 'Reading / Learning',
  CHA: 'Social activities',
  VIT: 'Sleep / Health',
};

/** XP required for next level = 100 * level^1.5 */
export function xpRequiredForLevel(level: number): number {
  return Math.floor(100 * Math.pow(level, 1.5));
}

/** Total XP needed from level 1 to reach a given level */
export function totalXpForLevel(level: number): number {
  let total = 0;
  for (let l = 1; l < level; l++) {
    total += xpRequiredForLevel(l);
  }
  return total;
}
