import type { CustomQuest, Difficulty, Habit, ItemDefinition, ItemSource, StatType, User } from '@/models';
import {
  ITEM_DEFINITIONS,
  getItemDefinitionById,
  MAX_CUSTOM_QUESTS_PER_DAY,
  MAX_CUSTOM_XP_PER_STAT_PER_DAY,
  totalXpForLevel,
  xpRequiredForLevel,
} from '@/models';
import {
  dbGetCompletedQuestCountForStat,
  dbCompleteCustomQuest,
  dbCountCompletedCustomQuestsToday,
  dbCustomQuestXpForStatToday,
  dbGetCompletedQuestCountForStatToday,
  dbGetSetting,
  dbGetItems,
  dbGetLogsForHabit,
  dbGetUser,
  dbInsertHabitLog,
  dbSetSetting,
  dbUnlockItem,
  dbUpdateUser,
} from './database';

const STREAK_BONUS_PER_DAY = 5;
const MAX_STREAK_BONUS = 25;

export interface QuestCompletionFeedback {
  stat: StatType;
  xpGained: number;
  xpIntoLevel: number;
  xpRequired: number;
  streakDays?: number;
  previousLevel: number;
  newLevel: number;
  statIncrease: {
    stat: StatType;
    amount: number;
  };
  unlockedItemIds?: string[];
  instantXpFromItems?: number;
}

export interface HabitCompletionResult {
  user: User;
  feedback: QuestCompletionFeedback;
  unlockedItemIds?: string[];
  instantXpFromItems?: number;
}

function getStartOfDay(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function getDaysBetween(a: Date, b: Date): number {
  const start = new Date(a);
  const end = new Date(b);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
}

/** Compute current streak for a habit (consecutive days up to today). */
export function getStreakForHabit(habitId: string): number {
  const logs = dbGetLogsForHabit(habitId);
  if (logs.length === 0) return 0;
  const sortedByDate = [...logs].sort(
    (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
  );
  let streak = 0;
  let expectedDate = new Date();
  expectedDate.setHours(0, 0, 0, 0);
  for (const log of sortedByDate) {
    const logDay = getStartOfDay(new Date(log.completedAt));
    const logDate = new Date(logDay);
    logDate.setHours(0, 0, 0, 0);
    const daysDiff = getDaysBetween(logDate, expectedDate);
    if (daysDiff === 0) {
      streak++;
      expectedDate.setDate(expectedDate.getDate() - 1);
    } else if (daysDiff > 1) {
      break;
    }
  }
  return streak;
}

/** Get bonus XP from streak (capped). */
function getStreakBonusXp(streakCount: number): number {
  const bonus = streakCount * STREAK_BONUS_PER_DAY;
  return Math.min(bonus, MAX_STREAK_BONUS);
}

function matchesEffectSource(effectSource: ItemSource | undefined, source: ItemSource): boolean {
  return !effectSource || effectSource === 'any' || effectSource === source;
}

function isNightTime(date: Date): boolean {
  const hour = date.getHours();
  return hour >= 22;
}

function isMorningTime(date: Date): boolean {
  const hour = date.getHours();
  return hour < 12;
}

function matchesEffectDifficulty(effectDifficulty: Difficulty | undefined, difficulty: Difficulty | undefined): boolean {
  return !effectDifficulty || effectDifficulty === difficulty;
}

function matchesEffectTimeOfDay(effectTimeOfDay: 'morning' | 'night' | undefined, completedAt: Date): boolean {
  if (!effectTimeOfDay) return true;
  if (effectTimeOfDay === 'morning') return isMorningTime(completedAt);
  return isNightTime(completedAt);
}

function matchesQuestCountLimit(questCountLimit: number | undefined, completedStatQuestCountToday: number): boolean {
  return !questCountLimit || completedStatQuestCountToday < questCountLimit;
}

interface ItemXpBonusResult {
  bonusXp: number;
  consumeOnUseItemIds: string[];
}

function calculateItemXpBonus(params: {
  baseXp: number;
  stat: StatType;
  source: ItemSource;
  completedAt: Date;
  completedStatQuestCountToday: number;
  difficulty?: Difficulty;
}): ItemXpBonusResult {
  const unlockedItems = dbGetItems().filter((item) => !!item.unlockedAt);
  let percentBonus = 0;
  let flatBonus = 0;
  const consumeOnUseItemIds: string[] = [];

  for (const item of unlockedItems) {
    const definition = getItemDefinitionById(item.id);
    if (!definition) continue;
    const effect = definition.effect;
    if (effect.stat && effect.stat !== params.stat) continue;
    if (!matchesEffectSource(effect.source, params.source)) continue;
    if (!matchesEffectDifficulty(effect.difficulty, params.difficulty)) continue;
    if (!matchesEffectTimeOfDay(effect.timeOfDay, params.completedAt)) continue;
    if (!matchesQuestCountLimit(effect.questCountLimit, params.completedStatQuestCountToday)) continue;

    if (effect.type === 'stat_xp_percent' || effect.type === 'conditional_stat_xp_percent') {
      percentBonus += effect.percent ?? 0;
      continue;
    }

    if (effect.type === 'first_stat_quest_flat_xp' && params.completedStatQuestCountToday === 0) {
      flatBonus += effect.flatXp ?? 0;
      continue;
    }

    if (effect.type === 'night_stat_flat_xp' && isNightTime(params.completedAt)) {
      flatBonus += effect.flatXp ?? 0;
      continue;
    }

    if (effect.type === 'conditional_stat_flat_xp') {
      flatBonus += effect.flatXp ?? 0;
      continue;
    }

    if (effect.type === 'next_quest_double_xp_once') {
      const claimKey = `item_claimed_${definition.id}`;
      if (dbGetSetting(claimKey)) continue;
      flatBonus += params.baseXp;
      consumeOnUseItemIds.push(definition.id);
    }
  }

  const percentXp = Math.floor((params.baseXp * percentBonus) / 100);
  return { bonusXp: percentXp + flatBonus, consumeOnUseItemIds };
}

function applyLevelAndXp(currentUser: User, xpToAdd: number): User | null {
  const totalXp = currentUser.xp + xpToAdd;
  const currentLevel = currentUser.level;
  let xpIntoLevel = totalXp - totalXpForLevel(currentLevel);
  let required = xpRequiredForLevel(currentLevel);
  let newLevel = currentLevel;

  while (xpIntoLevel >= required) {
    xpIntoLevel -= required;
    newLevel++;
    required = xpRequiredForLevel(newLevel);
  }

  dbUpdateUser({
    xp: totalXpForLevel(newLevel) + xpIntoLevel,
    level: newLevel,
  });

  return dbGetUser();
}

function isUnlockConditionMet(definition: ItemDefinition, user: User): boolean {
  const rule = definition.unlockRule;
  const mode = rule.mode ?? (rule.level && rule.statQuestCount ? 'level_or_stat' : rule.level ? 'level_only' : 'stat_only');
  const levelOk = typeof rule.level === 'number' ? user.level >= rule.level : false;
  const statOk = rule.statQuestCount
    ? dbGetCompletedQuestCountForStat(rule.statQuestCount.stat) >= rule.statQuestCount.count
    : false;

  if (mode === 'level_only') return levelOk;
  if (mode === 'stat_only') return statOk;
  return levelOk || statOk;
}

function unlockItemsPass(): { unlockedItemIds: string[]; instantXpAwarded: number } {
  const user = dbGetUser();
  if (!user) return { unlockedItemIds: [], instantXpAwarded: 0 };

  const items = dbGetItems();
  const itemById = new Map(items.map((item) => [item.id, item]));
  const unlockedItemIds: string[] = [];
  let instantXpAwarded = 0;

  for (const definition of [
    ...ITEM_DEFINITIONS_LEVEL_FIRST,
    ...ITEM_DEFINITIONS_STAT_OR_LEVEL,
  ]) {
    const dbItem = itemById.get(definition.id);
    if (!dbItem || dbItem.unlockedAt) continue;
    if (!isUnlockConditionMet(definition, user)) continue;

    dbUnlockItem(definition.id);
    unlockedItemIds.push(definition.id);

    if (definition.effect.type === 'instant_xp_once') {
      const claimKey = `item_claimed_${definition.id}`;
      if (dbGetSetting(claimKey)) continue;
      const instantXp = definition.effect.instantXp ?? 0;
      if (instantXp > 0) {
        instantXpAwarded += instantXp;
      }
      dbSetSetting(claimKey, new Date().toISOString());
    }
  }

  if (instantXpAwarded > 0) {
    const latestUser = dbGetUser();
    if (latestUser) {
      applyLevelAndXp(latestUser, instantXpAwarded);
    }
  }

  return { unlockedItemIds, instantXpAwarded };
}

const ITEM_DEFINITIONS_LEVEL_FIRST: ItemDefinition[] = [];
const ITEM_DEFINITIONS_STAT_OR_LEVEL: ItemDefinition[] = [];
for (const definition of ITEM_DEFINITIONS) {
  const mode = definition.unlockRule.mode ?? (definition.unlockRule.level && definition.unlockRule.statQuestCount ? 'level_or_stat' : definition.unlockRule.level ? 'level_only' : 'stat_only');
  if (mode === 'level_or_stat') ITEM_DEFINITIONS_STAT_OR_LEVEL.push(definition);
  else ITEM_DEFINITIONS_LEVEL_FIRST.push(definition);
}

/** Unlock newly eligible items and apply utility rewards (e.g. XP scroll). */
export function syncItemUnlocks(): { unlockedItemIds: string[]; instantXpAwarded: number } {
  const allUnlocked: string[] = [];
  let totalInstantXp = 0;

  const firstPass = unlockItemsPass();
  allUnlocked.push(...firstPass.unlockedItemIds);
  totalInstantXp += firstPass.instantXpAwarded;

  // Re-run once because instant XP can cause extra level-based unlocks.
  if (firstPass.instantXpAwarded > 0) {
    const secondPass = unlockItemsPass();
    allUnlocked.push(...secondPass.unlockedItemIds);
    totalInstantXp += secondPass.instantXpAwarded;
  }

  return { unlockedItemIds: allUnlocked, instantXpAwarded: totalInstantXp };
}

/** Complete a habit: add log, apply XP + stat, level up if needed, check item unlocks. */
export function completeHabit(habitId: string, habit: Habit): HabitCompletionResult | null {
  const user = dbGetUser();
  if (!user) return null;

  const prevStreak = getStreakForHabit(habitId);
  const nextStreak = prevStreak + 1;
  const bonusXp = getStreakBonusXp(nextStreak);
  const now = new Date();
  const completedStatQuestCountToday = dbGetCompletedQuestCountForStatToday(habit.statReward);
  const itemXpBonus = calculateItemXpBonus({
    baseXp: habit.xpReward,
    stat: habit.statReward,
    source: 'habit',
    completedAt: now,
    completedStatQuestCountToday,
  });
  const questXpGained = habit.xpReward + itemXpBonus.bonusXp;

  const completedAt = now.toISOString();
  dbInsertHabitLog({
    habitId,
    completedAt,
    streakCount: nextStreak,
    bonusXp,
  });

  const statKey = habit.statReward.toLowerCase() as keyof Pick<User, 'str' | 'int' | 'wis' | 'cha' | 'vit'>;
  const currentStat = user[statKey] as number;
  const totalXp = user.xp + questXpGained + bonusXp;
  const currentLevel = user.level;
  let xpIntoLevel = totalXp - totalXpForLevel(currentLevel);
  let required = xpRequiredForLevel(currentLevel);
  let newLevel = currentLevel;
  while (xpIntoLevel >= required) {
    xpIntoLevel -= required;
    newLevel++;
    required = xpRequiredForLevel(newLevel);
  }

  dbUpdateUser({
    [statKey]: currentStat + 1,
    xp: totalXpForLevel(newLevel) + xpIntoLevel,
    level: newLevel,
  });

  for (const itemId of itemXpBonus.consumeOnUseItemIds) {
    dbSetSetting(`item_claimed_${itemId}`, new Date().toISOString());
  }

  const itemUnlocks = syncItemUnlocks();
  const updatedUser = dbGetUser();
  if (!updatedUser) return null;

  return {
    user: updatedUser,
    feedback: {
      stat: habit.statReward,
      xpGained: questXpGained + bonusXp,
      xpIntoLevel: updatedUser.xp - totalXpForLevel(updatedUser.level),
      xpRequired: xpRequiredForLevel(updatedUser.level),
      streakDays: nextStreak,
      previousLevel: currentLevel,
      newLevel: updatedUser.level,
      statIncrease: {
        stat: habit.statReward,
        amount: 1,
      },
      unlockedItemIds: itemUnlocks.unlockedItemIds,
      instantXpFromItems: itemUnlocks.instantXpAwarded,
    },
    unlockedItemIds: itemUnlocks.unlockedItemIds,
    instantXpFromItems: itemUnlocks.instantXpAwarded,
  };
}

export function getEffectiveStat(user: User, stat: StatType): number {
  const base = user[stat.toLowerCase() as keyof Pick<User, 'str' | 'int' | 'wis' | 'cha' | 'vit'>] as number;
  const items = dbGetItems().filter((i) => i.statBonus === stat && i.unlockedAt);
  const bonus = items.reduce((sum, i) => sum + i.bonusAmount, 0);
  return base + bonus;
}

// ─── Custom Quest Completion ────────────────────────────

export type CustomQuestResult =
  | {
      success: true;
      feedback: QuestCompletionFeedback;
      unlockedItemIds?: string[];
      instantXpFromItems?: number;
    }
  | { success: false; reason: 'daily_limit' | 'stat_limit'; message: string };

/** Complete a custom quest with safety limit checks. */
export function completeCustomQuest(quest: CustomQuest): CustomQuestResult {
  // Safety check 1: max quests per day
  const completedToday = dbCountCompletedCustomQuestsToday();
  if (completedToday >= MAX_CUSTOM_QUESTS_PER_DAY) {
    return {
      success: false,
      reason: 'daily_limit',
      message: `Daily limit reached (${MAX_CUSTOM_QUESTS_PER_DAY} per day)`,
    };
  }

  // Safety check 2: max XP per stat per day
  const xpForStat = dbCustomQuestXpForStatToday(quest.statReward);
  if (xpForStat + quest.xpReward > MAX_CUSTOM_XP_PER_STAT_PER_DAY) {
    return {
      success: false,
      reason: 'stat_limit',
      message: `${quest.statReward} XP limit reached (${MAX_CUSTOM_XP_PER_STAT_PER_DAY}/day)`,
    };
  }

  // Complete the quest in DB
  const now = new Date();
  const completedStatQuestCountToday = dbGetCompletedQuestCountForStatToday(quest.statReward);
  const itemXpBonus = calculateItemXpBonus({
    baseXp: quest.xpReward,
    stat: quest.statReward,
    source: 'custom',
    completedAt: now,
    completedStatQuestCountToday,
    difficulty: quest.difficulty,
  });
  const questXpGained = quest.xpReward + itemXpBonus.bonusXp;

  dbCompleteCustomQuest(quest.id);

  // Award XP and stat point
  const user = dbGetUser();
  if (!user) {
    return {
      success: true,
      feedback: {
        stat: quest.statReward,
        xpGained: questXpGained,
        xpIntoLevel: 0,
        xpRequired: 0,
        previousLevel: 1,
        newLevel: 1,
        statIncrease: {
          stat: quest.statReward,
          amount: 1,
        },
      },
    };
  }

  const statKey = quest.statReward.toLowerCase() as keyof Pick<User, 'str' | 'int' | 'wis' | 'cha' | 'vit'>;
  const currentStat = user[statKey] as number;
  const totalXp = user.xp + questXpGained;
  const currentLevel = user.level;
  let xpIntoLevel = totalXp - totalXpForLevel(currentLevel);
  let required = xpRequiredForLevel(currentLevel);
  let newLevel = currentLevel;
  while (xpIntoLevel >= required) {
    xpIntoLevel -= required;
    newLevel++;
    required = xpRequiredForLevel(newLevel);
  }

  dbUpdateUser({
    [statKey]: currentStat + 1,
    xp: totalXpForLevel(newLevel) + xpIntoLevel,
    level: newLevel,
  });

  for (const itemId of itemXpBonus.consumeOnUseItemIds) {
    dbSetSetting(`item_claimed_${itemId}`, new Date().toISOString());
  }

  const itemUnlocks = syncItemUnlocks();
  const updatedUser = dbGetUser();
  if (!updatedUser) {
    return {
      success: true,
      feedback: {
        stat: quest.statReward,
        xpGained: questXpGained,
        xpIntoLevel: 0,
        xpRequired: 0,
        previousLevel: currentLevel,
        newLevel: newLevel,
        statIncrease: {
          stat: quest.statReward,
          amount: 1,
        },
        unlockedItemIds: itemUnlocks.unlockedItemIds,
        instantXpFromItems: itemUnlocks.instantXpAwarded,
      },
      unlockedItemIds: itemUnlocks.unlockedItemIds,
      instantXpFromItems: itemUnlocks.instantXpAwarded,
    };
  }

  return {
    success: true,
    feedback: {
      stat: quest.statReward,
      xpGained: questXpGained,
      xpIntoLevel: updatedUser.xp - totalXpForLevel(updatedUser.level),
      xpRequired: xpRequiredForLevel(updatedUser.level),
      previousLevel: currentLevel,
      newLevel: updatedUser.level,
      statIncrease: {
        stat: quest.statReward,
        amount: 1,
      },
      unlockedItemIds: itemUnlocks.unlockedItemIds,
      instantXpFromItems: itemUnlocks.instantXpAwarded,
    },
    unlockedItemIds: itemUnlocks.unlockedItemIds,
    instantXpFromItems: itemUnlocks.instantXpAwarded,
  };
}
