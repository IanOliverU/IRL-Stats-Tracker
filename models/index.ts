/**
 * LifeRPG data models
 */

export type StatType = 'STR' | 'INT' | 'WIS' | 'CHA' | 'VIT';

export type HabitFrequency = 'daily' | 'weekly';

export interface User {
  id: string;
  name: string | null;
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

// ─── Custom Quests ──────────────────────────────────────

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface CustomQuest {
  id: string;
  title: string;
  statReward: StatType;
  difficulty: Difficulty;
  xpReward: number;
  completedAt: string | null;
  createdAt: string;
}

export const DIFFICULTY_XP: Record<Difficulty, number> = {
  easy: 20,
  medium: 40,
  hard: 60,
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

export const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  easy: '#22c55e',
  medium: '#f59e0b',
  hard: '#ef4444',
};

/** Max custom quests a user can complete per day */
export const MAX_CUSTOM_QUESTS_PER_DAY = 3;

/** Max XP a user can earn per stat per day from custom quests */
export const MAX_CUSTOM_XP_PER_STAT_PER_DAY = 100;

export const WEEKLY_COMPLETION_BONUSES = [
  { days: 7, bonusXp: 100 },
  { days: 5, bonusXp: 50 },
  { days: 3, bonusXp: 20 },
] as const;

export function weeklyBonusForCompletedDays(completedDays: number): number {
  for (const tier of WEEKLY_COMPLETION_BONUSES) {
    if (completedDays >= tier.days) return tier.bonusXp;
  }
  return 0;
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
