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

export type AchievementId =
  | 'first-quest'
  | 'second-step'
  | 'getting-serious'
  | 'quest-grinder'
  | 'unstoppable'
  | 'century-club'
  | 'streak-3-days'
  | 'weekly-warrior'
  | 'iron-will'
  | 'relentless'
  | 'habit-hero'
  | 'full-combo'
  | 'locked-in'
  | 'daily-dominator'
  | 'weekend-warrior'
  | 'early-momentum'
  | 'night-owl'
  | 'strength-starter'
  | 'brain-boost'
  | 'page-turner'
  | 'people-person'
  | 'wellness-mode'
  | 'strength-specialist'
  | 'intelligence-specialist'
  | 'wisdom-specialist'
  | 'charisma-specialist'
  | 'vitality-specialist'
  | 'balanced-adventurer'
  | 'hybrid-build'
  | 'maxed-focus'
  | 'level-up'
  | 'rising-legend'
  | 'elite-adventurer'
  | 'power-spike'
  | 'experience-hunter'
  | 'main-character'
  | 'creator'
  | 'habit-architect'
  | 'personalized-path'
  | 'loot-seeker'
  | 'fully-equipped'
  | 'collector'
  | 'comeback-kid'
  | 'recovery-arc'
  | 'no-zero-days'
  | 'double-class'
  | 'all-rounder'
  | 'peak-week'
  | 'discipline-over-mood'
  | 'legendary-routine';

export interface AchievementDefinition {
  id: AchievementId;
  title: string;
  description: string;
  requirement: string;
  icon: string;
}

export interface AchievementStatus extends AchievementDefinition {
  unlockedAt: string | null;
}

export const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: 'first-quest',
    title: 'First Quest',
    description: 'Your journey begins.',
    requirement: 'Complete 1 quest',
    icon: 'flag-outline',
  },
  {
    id: 'second-step',
    title: 'Second Step',
    description: 'Momentum is building.',
    requirement: 'Complete 5 total quests',
    icon: 'footsteps-outline',
  },
  {
    id: 'getting-serious',
    title: 'Getting Serious',
    description: 'This is becoming a habit.',
    requirement: 'Complete 10 total quests',
    icon: 'trending-up-outline',
  },
  {
    id: 'quest-grinder',
    title: 'Quest Grinder',
    description: 'Small wins stack up.',
    requirement: 'Complete 25 total quests',
    icon: 'hammer-outline',
  },
  {
    id: 'unstoppable',
    title: 'Unstoppable',
    description: 'You don’t wait for motivation.',
    requirement: 'Complete 50 total quests',
    icon: 'rocket-outline',
  },
  {
    id: 'century-club',
    title: 'Century Club',
    description: 'Consistency made visible.',
    requirement: 'Complete 100 total quests',
    icon: 'medal-outline',
  },
  {
    id: 'streak-3-days',
    title: '3 Day Streak',
    description: 'Consistency beats intensity.',
    requirement: 'Complete quests for 3 consecutive days',
    icon: 'flame-outline',
  },
  {
    id: 'weekly-warrior',
    title: 'Weekly Warrior',
    description: 'Seven days. No excuses.',
    requirement: 'Complete quests for 7 consecutive days',
    icon: 'calendar-outline',
  },
  {
    id: 'iron-will',
    title: 'Iron Will',
    description: 'Discipline is your superpower.',
    requirement: 'Complete quests for 14 consecutive days',
    icon: 'shield-checkmark-outline',
  },
  {
    id: 'relentless',
    title: 'Relentless',
    description: 'You kept showing up.',
    requirement: 'Complete quests for 30 consecutive days',
    icon: 'thunderstorm-outline',
  },
  {
    id: 'habit-hero',
    title: 'Habit Hero',
    description: 'A perfect day.',
    requirement: 'Complete all daily habits in one day',
    icon: 'checkmark-done-circle-outline',
  },
  {
    id: 'full-combo',
    title: 'Full Combo',
    description: 'No weak links.',
    requirement: 'Complete all daily habits for 3 days in a row',
    icon: 'git-merge-outline',
  },
  {
    id: 'locked-in',
    title: 'Locked In',
    description: 'This is what focus looks like.',
    requirement: 'Complete all daily habits for 7 days in a row',
    icon: 'lock-closed-outline',
  },
  {
    id: 'daily-dominator',
    title: 'Daily Dominator',
    description: 'You owned the day.',
    requirement: 'Complete 5 quests in a single day',
    icon: 'today-outline',
  },
  {
    id: 'weekend-warrior',
    title: 'Weekend Warrior',
    description: 'Rest can wait. Progress doesn’t.',
    requirement: 'Complete at least 1 quest on both Saturday and Sunday',
    icon: 'sunny-outline',
  },
  {
    id: 'early-momentum',
    title: 'Early Momentum',
    description: 'Win the morning, win the day.',
    requirement: 'Complete your first quest before 9 AM',
    icon: 'alarm-outline',
  },
  {
    id: 'night-owl',
    title: 'Night Owl',
    description: 'Progress doesn’t punch out.',
    requirement: 'Complete a quest after 10 PM',
    icon: 'moon-outline',
  },
  {
    id: 'strength-starter',
    title: 'Strength Starter',
    description: 'Muscle memory begins.',
    requirement: 'Earn 100 STR XP',
    icon: 'barbell-outline',
  },
  {
    id: 'brain-boost',
    title: 'Brain Boost',
    description: 'Sharpening the mind.',
    requirement: 'Earn 100 INT XP',
    icon: 'bulb-outline',
  },
  {
    id: 'page-turner',
    title: 'Page Turner',
    description: 'Knowledge adds up.',
    requirement: 'Earn 100 WIS XP',
    icon: 'book-outline',
  },
  {
    id: 'people-person',
    title: 'People Person',
    description: 'Connection is a skill too.',
    requirement: 'Earn 100 CHA XP',
    icon: 'people-outline',
  },
  {
    id: 'wellness-mode',
    title: 'Wellness Mode',
    description: 'Health is a stat worth grinding.',
    requirement: 'Earn 100 VIT XP',
    icon: 'heart-outline',
  },
  {
    id: 'strength-specialist',
    title: 'Strength Specialist',
    description: 'Power is built, not found.',
    requirement: 'Earn 250 STR XP',
    icon: 'fitness-outline',
  },
  {
    id: 'intelligence-specialist',
    title: 'Intelligence Specialist',
    description: 'Your mind is leveling up.',
    requirement: 'Earn 250 INT XP',
    icon: 'school-outline',
  },
  {
    id: 'wisdom-specialist',
    title: 'Wisdom Specialist',
    description: 'Insight takes repetition.',
    requirement: 'Earn 250 WIS XP',
    icon: 'library-outline',
  },
  {
    id: 'charisma-specialist',
    title: 'Charisma Specialist',
    description: 'Presence is practiced.',
    requirement: 'Earn 250 CHA XP',
    icon: 'chatbubbles-outline',
  },
  {
    id: 'vitality-specialist',
    title: 'Vitality Specialist',
    description: 'Recovery is part of the grind.',
    requirement: 'Earn 250 VIT XP',
    icon: 'pulse-outline',
  },
  {
    id: 'balanced-adventurer',
    title: 'Balanced Adventurer',
    description: 'No stat left behind.',
    requirement: 'Earn at least 50 XP in all 5 stats',
    icon: 'options-outline',
  },
  {
    id: 'hybrid-build',
    title: 'Hybrid Build',
    description: 'Versatility is power.',
    requirement: 'Earn at least 100 XP in 3 different stats',
    icon: 'layers-outline',
  },
  {
    id: 'maxed-focus',
    title: 'Maxed Focus',
    description: 'You chose your lane and owned it.',
    requirement: 'Complete 10 quests in the same stat',
    icon: 'locate-outline',
  },
  {
    id: 'level-up',
    title: 'Level Up',
    description: 'The journey has only started.',
    requirement: 'Reach Level 2',
    icon: 'arrow-up-circle-outline',
  },
  {
    id: 'rising-legend',
    title: 'Rising Legend',
    description: 'You’re no longer a beginner.',
    requirement: 'Reach Level 5',
    icon: 'trophy-outline',
  },
  {
    id: 'elite-adventurer',
    title: 'Elite Adventurer',
    description: 'Now it’s getting serious.',
    requirement: 'Reach Level 10',
    icon: 'diamond-outline',
  },
  {
    id: 'power-spike',
    title: 'Power Spike',
    description: 'Momentum achieved.',
    requirement: 'Gain 100 total XP',
    icon: 'flash-outline',
  },
  {
    id: 'experience-hunter',
    title: 'Experience Hunter',
    description: 'The grind is paying off.',
    requirement: 'Gain 500 total XP',
    icon: 'bonfire-outline',
  },
  {
    id: 'main-character',
    title: 'Main Character',
    description: 'You’ve become the build.',
    requirement: 'Gain 1000 total XP',
    icon: 'star-outline',
  },
  {
    id: 'creator',
    title: 'Creator',
    description: 'Built for your own journey.',
    requirement: 'Create your first custom quest',
    icon: 'create-outline',
  },
  {
    id: 'habit-architect',
    title: 'Habit Architect',
    description: 'Systems beat motivation.',
    requirement: 'Create your first custom habit',
    icon: 'construct-outline',
  },
  {
    id: 'personalized-path',
    title: 'Personalized Path',
    description: 'This journey is truly yours.',
    requirement: 'Create 5 custom quests or habits',
    icon: 'color-wand-outline',
  },
  {
    id: 'loot-seeker',
    title: 'Loot Seeker',
    description: 'Rewards make the grind sweeter.',
    requirement: 'Unlock your first inventory item',
    icon: 'bag-handle-outline',
  },
  {
    id: 'fully-equipped',
    title: 'Fully Equipped',
    description: 'You’re building your lifestyle loadout.',
    requirement: 'Unlock 3 inventory items',
    icon: 'shield-outline',
  },
  {
    id: 'collector',
    title: 'Collector',
    description: 'Nothing left behind.',
    requirement: 'Unlock all starter inventory items',
    icon: 'albums-outline',
  },
  {
    id: 'comeback-kid',
    title: 'Comeback Kid',
    description: 'Falling off isn’t the end.',
    requirement: 'Complete a quest after missing a day',
    icon: 'refresh-outline',
  },
  {
    id: 'recovery-arc',
    title: 'Recovery Arc',
    description: 'The rebuild begins.',
    requirement: 'Return and complete 3 quests in one day after a missed streak',
    icon: 'medkit-outline',
  },
  {
    id: 'no-zero-days',
    title: 'No Zero Days',
    description: 'Progress, no matter how small.',
    requirement: 'Complete at least 1 quest every day for 7 days',
    icon: 'checkmark-done-outline',
  },
  {
    id: 'double-class',
    title: 'Double Class',
    description: 'More than one side of you is growing.',
    requirement: 'Complete quests in 2 different stats in one day',
    icon: 'swap-horizontal-outline',
  },
  {
    id: 'all-rounder',
    title: 'All Rounder',
    description: 'A well-built character.',
    requirement: 'Complete quests in all 5 stats across one week',
    icon: 'apps-outline',
  },
  {
    id: 'peak-week',
    title: 'Peak Week',
    description: 'That week was different.',
    requirement: 'Complete 20 quests in one week',
    icon: 'analytics-outline',
  },
  {
    id: 'discipline-over-mood',
    title: 'Discipline Over Mood',
    description: 'You showed up anyway.',
    requirement: 'Complete a quest on 3 separate days despite low streak progress',
    icon: 'compass-outline',
  },
  {
    id: 'legendary-routine',
    title: 'Legendary Routine',
    description: 'This is no longer a phase.',
    requirement: 'Complete 200 total quests',
    icon: 'ribbon-outline',
  },
];

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
