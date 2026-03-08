import type { AchievementId, AchievementStatus, StatType, User } from '@/models';
import { ACHIEVEMENTS } from '@/models';
import {
  dbGetCompletedQuestEvents,
  dbGetCustomHabitCount,
  dbGetCustomQuestCreatedCount,
  dbGetDailyHabitIds,
  dbGetTotalCompletedQuestCount,
  dbGetTotalItemCount,
  dbGetUnlockedAchievements,
  dbGetUnlockedItemCount,
  dbGetUser,
  dbUnlockAchievement,
} from './database';

const DAY_MS = 24 * 60 * 60 * 1000;
const STATS: StatType[] = ['STR', 'INT', 'WIS', 'CHA', 'VIT'];

type Metrics = {
  totalCompletedQuests: number;
  completedQuestCountByStat: Record<StatType, number>;
  xpByStat: Record<StatType, number>;
  longestQuestStreak: number;
  questDayKeys: string[];
  questCountByDay: Map<string, number>;
  statSetByDay: Map<string, Set<StatType>>;
  maxWeeklyQuestCount: number;
  hasAllRounderWeek: boolean;
  hasWeekendPair: boolean;
  hasEarlyMomentum: boolean;
  hasNightOwl: boolean;
  comebackDayCount: number;
  hasRecoveryArc: boolean;
  maxSingleStatQuestCount: number;
  perfectDailyHabitDays: string[];
  longestPerfectDailyHabitStreak: number;
  customHabitCount: number;
  customQuestCreatedCount: number;
  unlockedItemCount: number;
  totalItemCount: number;
  leveledStatCount: number;
  userLevel: number;
  userXp: number;
};

function toDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseDayKey(dayKey: string): Date {
  return new Date(`${dayKey}T00:00:00.000Z`);
}

function addDays(dayKey: string, delta: number): string {
  const date = parseDayKey(dayKey);
  date.setUTCDate(date.getUTCDate() + delta);
  return toDayKey(date);
}

function dayDistance(a: string, b: string): number {
  const aMs = parseDayKey(a).getTime();
  const bMs = parseDayKey(b).getTime();
  return Math.round((bMs - aMs) / DAY_MS);
}

function getLongestConsecutiveStreak(dayKeys: string[]): number {
  if (dayKeys.length === 0) return 0;
  const uniqueSorted = [...new Set(dayKeys)].sort();
  let longest = 1;
  let current = 1;

  for (let index = 1; index < uniqueSorted.length; index++) {
    if (dayDistance(uniqueSorted[index - 1], uniqueSorted[index]) === 1) {
      current += 1;
    } else {
      current = 1;
    }
    if (current > longest) longest = current;
  }

  return longest;
}

function getWeekStartKey(dayKey: string): string {
  const date = parseDayKey(dayKey);
  const offset = (date.getUTCDay() + 6) % 7; // Monday = 0
  date.setUTCDate(date.getUTCDate() - offset);
  return toDayKey(date);
}

function getLeveledStatCount(user: User | null): number {
  if (!user) return 0;
  return [user.str, user.int, user.wis, user.cha, user.vit].filter((value) => value > 0).length;
}

function buildMetrics(): Metrics {
  const user = dbGetUser();
  const events = dbGetCompletedQuestEvents();
  const totalCompletedQuests = dbGetTotalCompletedQuestCount();
  const questDayKeys = [...new Set(events.map((event) => event.dayKey))].sort();
  const longestQuestStreak = getLongestConsecutiveStreak(questDayKeys);

  const completedQuestCountByStat: Record<StatType, number> = {
    STR: 0,
    INT: 0,
    WIS: 0,
    CHA: 0,
    VIT: 0,
  };
  const xpByStat: Record<StatType, number> = {
    STR: 0,
    INT: 0,
    WIS: 0,
    CHA: 0,
    VIT: 0,
  };
  const questCountByDay = new Map<string, number>();
  const statSetByDay = new Map<string, Set<StatType>>();
  const habitSetByDay = new Map<string, Set<string>>();
  const weeklyQuestCount = new Map<string, number>();
  const weeklyStatSet = new Map<string, Set<StatType>>();

  let hasEarlyMomentum = false;
  let hasNightOwl = false;

  for (const event of events) {
    completedQuestCountByStat[event.statReward] += 1;
    xpByStat[event.statReward] += event.xpReward;
    questCountByDay.set(event.dayKey, (questCountByDay.get(event.dayKey) ?? 0) + 1);

    const dayStatSet = statSetByDay.get(event.dayKey) ?? new Set<StatType>();
    dayStatSet.add(event.statReward);
    statSetByDay.set(event.dayKey, dayStatSet);

    const weekKey = getWeekStartKey(event.dayKey);
    weeklyQuestCount.set(weekKey, (weeklyQuestCount.get(weekKey) ?? 0) + 1);
    const weekStatSet = weeklyStatSet.get(weekKey) ?? new Set<StatType>();
    weekStatSet.add(event.statReward);
    weeklyStatSet.set(weekKey, weekStatSet);

    if (event.source === 'habit' && event.habitId) {
      const set = habitSetByDay.get(event.dayKey) ?? new Set<string>();
      set.add(event.habitId);
      habitSetByDay.set(event.dayKey, set);
    }

    const hour = new Date(event.completedAt).getUTCHours();
    if (hour < 9) hasEarlyMomentum = true;
    if (hour >= 22) hasNightOwl = true;
  }

  const hasWeekendPair = questDayKeys.some((dayKey) => {
    const day = parseDayKey(dayKey).getUTCDay();
    if (day !== 6) return false; // Saturday
    return questCountByDay.has(addDays(dayKey, 1));
  });

  let comebackDayCount = 0;
  let hasRecoveryArc = false;
  for (let index = 1; index < questDayKeys.length; index++) {
    if (dayDistance(questDayKeys[index - 1], questDayKeys[index]) <= 1) continue;
    comebackDayCount += 1;
    if ((questCountByDay.get(questDayKeys[index]) ?? 0) >= 3) {
      hasRecoveryArc = true;
    }
  }

  const dailyHabitIds = dbGetDailyHabitIds();
  const perfectDailyHabitDays: string[] = [];
  if (dailyHabitIds.length > 0) {
    for (const [dayKey, completedHabitSet] of habitSetByDay.entries()) {
      const isPerfect = dailyHabitIds.every((habitId) => completedHabitSet.has(habitId));
      if (isPerfect) perfectDailyHabitDays.push(dayKey);
    }
  }
  perfectDailyHabitDays.sort();
  const longestPerfectDailyHabitStreak = getLongestConsecutiveStreak(perfectDailyHabitDays);

  const maxWeeklyQuestCount = [...weeklyQuestCount.values()].reduce(
    (max, count) => (count > max ? count : max),
    0
  );
  const hasAllRounderWeek = [...weeklyStatSet.values()].some((set) => set.size === 5);
  const maxSingleStatQuestCount = Math.max(...STATS.map((stat) => completedQuestCountByStat[stat]), 0);

  return {
    totalCompletedQuests,
    completedQuestCountByStat,
    xpByStat,
    longestQuestStreak,
    questDayKeys,
    questCountByDay,
    statSetByDay,
    maxWeeklyQuestCount,
    hasAllRounderWeek,
    hasWeekendPair,
    hasEarlyMomentum,
    hasNightOwl,
    comebackDayCount,
    hasRecoveryArc,
    maxSingleStatQuestCount,
    perfectDailyHabitDays,
    longestPerfectDailyHabitStreak,
    customHabitCount: dbGetCustomHabitCount(),
    customQuestCreatedCount: dbGetCustomQuestCreatedCount(),
    unlockedItemCount: dbGetUnlockedItemCount(),
    totalItemCount: dbGetTotalItemCount(),
    leveledStatCount: getLeveledStatCount(user),
    userLevel: user?.level ?? 1,
    userXp: user?.xp ?? 0,
  };
}

function isAchievementUnlockedByCondition(id: AchievementId, metrics: Metrics): boolean {
  const quests = metrics.totalCompletedQuests;
  const level = metrics.userLevel;
  const xp = metrics.userXp;

  switch (id) {
    case 'first-quest':
      return quests >= 1;
    case 'second-step':
      return quests >= 5;
    case 'getting-serious':
      return quests >= 10;
    case 'quest-grinder':
      return quests >= 25;
    case 'unstoppable':
      return quests >= 50;
    case 'century-club':
      return quests >= 100;
    case 'streak-3-days':
      return metrics.longestQuestStreak >= 3;
    case 'weekly-warrior':
      return metrics.longestQuestStreak >= 7;
    case 'iron-will':
      return metrics.longestQuestStreak >= 14;
    case 'relentless':
      return metrics.longestQuestStreak >= 30;
    case 'habit-hero':
      return metrics.perfectDailyHabitDays.length >= 1;
    case 'full-combo':
      return metrics.longestPerfectDailyHabitStreak >= 3;
    case 'locked-in':
      return metrics.longestPerfectDailyHabitStreak >= 7;
    case 'daily-dominator':
      return [...metrics.questCountByDay.values()].some((count) => count >= 5);
    case 'weekend-warrior':
      return metrics.hasWeekendPair;
    case 'early-momentum':
      return metrics.hasEarlyMomentum;
    case 'night-owl':
      return metrics.hasNightOwl;
    case 'strength-starter':
      return metrics.xpByStat.STR >= 100;
    case 'brain-boost':
      return metrics.xpByStat.INT >= 100;
    case 'page-turner':
      return metrics.xpByStat.WIS >= 100;
    case 'people-person':
      return metrics.xpByStat.CHA >= 100;
    case 'wellness-mode':
      return metrics.xpByStat.VIT >= 100;
    case 'strength-specialist':
      return metrics.xpByStat.STR >= 250;
    case 'intelligence-specialist':
      return metrics.xpByStat.INT >= 250;
    case 'wisdom-specialist':
      return metrics.xpByStat.WIS >= 250;
    case 'charisma-specialist':
      return metrics.xpByStat.CHA >= 250;
    case 'vitality-specialist':
      return metrics.xpByStat.VIT >= 250;
    case 'balanced-adventurer':
      return STATS.every((stat) => metrics.xpByStat[stat] >= 50);
    case 'hybrid-build':
      return STATS.filter((stat) => metrics.xpByStat[stat] >= 100).length >= 3;
    case 'maxed-focus':
      return metrics.maxSingleStatQuestCount >= 10;
    case 'level-up':
      return level >= 2;
    case 'rising-legend':
      return level >= 5;
    case 'elite-adventurer':
      return level >= 10;
    case 'power-spike':
      return xp >= 100;
    case 'experience-hunter':
      return xp >= 500;
    case 'main-character':
      return xp >= 1000;
    case 'creator':
      return metrics.customQuestCreatedCount >= 1;
    case 'habit-architect':
      return metrics.customHabitCount >= 1;
    case 'personalized-path':
      return metrics.customQuestCreatedCount + metrics.customHabitCount >= 5;
    case 'loot-seeker':
      return metrics.unlockedItemCount >= 1;
    case 'fully-equipped':
      return metrics.unlockedItemCount >= 3;
    case 'collector':
      return metrics.totalItemCount > 0 && metrics.unlockedItemCount >= metrics.totalItemCount;
    case 'comeback-kid':
      return metrics.comebackDayCount >= 1;
    case 'recovery-arc':
      return metrics.hasRecoveryArc;
    case 'no-zero-days':
      return metrics.longestQuestStreak >= 7;
    case 'double-class':
      return [...metrics.statSetByDay.values()].some((set) => set.size >= 2);
    case 'all-rounder':
      return metrics.hasAllRounderWeek;
    case 'peak-week':
      return metrics.maxWeeklyQuestCount >= 20;
    case 'discipline-over-mood':
      return metrics.comebackDayCount >= 3;
    case 'legendary-routine':
      return quests >= 200;
    default:
      return false;
  }
}

export function getAchievementStatuses(): AchievementStatus[] {
  const unlockedRows = dbGetUnlockedAchievements();
  const unlockedMap = new Map(unlockedRows.map((row) => [row.achievementId, row.unlockedAt]));
  return ACHIEVEMENTS.map((achievement) => ({
    ...achievement,
    unlockedAt: unlockedMap.get(achievement.id) ?? null,
  }));
}

export function checkAndUnlockAchievements(): AchievementStatus[] {
  const currentlyUnlocked = new Set(dbGetUnlockedAchievements().map((row) => row.achievementId));
  const metrics = buildMetrics();
  const newlyUnlockedIds: AchievementId[] = [];

  for (const achievement of ACHIEVEMENTS) {
    if (currentlyUnlocked.has(achievement.id)) continue;
    if (!isAchievementUnlockedByCondition(achievement.id, metrics)) continue;
    dbUnlockAchievement(achievement.id);
    newlyUnlockedIds.push(achievement.id);
    currentlyUnlocked.add(achievement.id);
  }

  if (newlyUnlockedIds.length === 0) return [];
  const statuses = getAchievementStatuses();
  const newlyUnlockedSet = new Set(newlyUnlockedIds);
  return statuses.filter((status) => newlyUnlockedSet.has(status.id));
}

// Exported for potential debugging/analytics in future screens.
export function getAchievementProgressSnapshot() {
  return buildMetrics();
}
