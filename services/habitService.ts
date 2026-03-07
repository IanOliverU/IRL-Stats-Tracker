import type { CustomQuest, Habit, StatType, User } from '@/models';
import { MAX_CUSTOM_QUESTS_PER_DAY, MAX_CUSTOM_XP_PER_STAT_PER_DAY, totalXpForLevel, xpRequiredForLevel } from '@/models';
import {
  dbCompleteCustomQuest,
  dbCountCompletedCustomQuestsToday,
  dbCustomQuestXpForStatToday,
  dbGetItems,
  dbGetLogsForHabit,
  dbGetUser,
  dbInsertHabitLog,
  dbUnlockItem,
  dbUpdateUser,
} from './database';

const STREAK_BONUS_PER_DAY = 5;
const MAX_STREAK_BONUS = 25;

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

/** Complete a habit: add log, apply XP + stat, level up if needed, check item unlocks. */
export function completeHabit(habitId: string, habit: Habit): User | null {
  const user = dbGetUser();
  if (!user) return null;

  const prevStreak = getStreakForHabit(habitId);
  const nextStreak = prevStreak + 1;
  const bonusXp = getStreakBonusXp(nextStreak);

  const completedAt = new Date().toISOString();
  dbInsertHabitLog({
    habitId,
    completedAt,
    streakCount: nextStreak,
    bonusXp,
  });

  const statKey = habit.statReward.toLowerCase() as keyof Pick<User, 'str' | 'int' | 'wis' | 'cha' | 'vit'>;
  const currentStat = user[statKey] as number;
  const totalXp = user.xp + habit.xpReward + bonusXp;
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

  checkItemUnlocks();
  return dbGetUser();
}

/** Check item unlock conditions based on current user stats and habit logs. */
function checkItemUnlocks(): void {
  const user = dbGetUser();
  const items = dbGetItems();
  if (!user) return;

  for (const item of items) {
    if (item.unlockedAt) continue;
    const statKey = item.statBonus.toLowerCase() as keyof Pick<User, 'str' | 'int' | 'wis' | 'cha' | 'vit'>;
    const count = user[statKey] as number;
    const need = item.unlockCondition.includes('7') ? 7 : 5;
    if (count >= need) {
      dbUnlockItem(item.id);
    }
  }
}

export function getEffectiveStat(user: User, stat: StatType): number {
  const base = user[stat.toLowerCase() as keyof Pick<User, 'str' | 'int' | 'wis' | 'cha' | 'vit'>] as number;
  const items = dbGetItems().filter((i) => i.statBonus === stat && i.unlockedAt);
  const bonus = items.reduce((sum, i) => sum + i.bonusAmount, 0);
  return base + bonus;
}

// ─── Custom Quest Completion ────────────────────────────

export type CustomQuestResult =
  | { success: true }
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
  dbCompleteCustomQuest(quest.id);

  // Award XP and stat point
  const user = dbGetUser();
  if (!user) return { success: true };

  const statKey = quest.statReward.toLowerCase() as keyof Pick<User, 'str' | 'int' | 'wis' | 'cha' | 'vit'>;
  const currentStat = user[statKey] as number;
  const totalXp = user.xp + quest.xpReward;
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

  checkItemUnlocks();
  return { success: true };
}
