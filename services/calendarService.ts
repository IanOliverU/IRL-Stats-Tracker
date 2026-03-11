import { totalXpForLevel, weeklyBonusForCompletedDays, xpRequiredForLevel } from '@/models';
import {
  dbGetAllCompletedQuestDayKeys,
  dbGetCompletedDayKeysBetween,
  dbGetFirstQuestCompletionAt,
  dbGetSetting,
  dbGetUser,
  dbSetSetting,
  dbUpdateUser,
} from './database';

const DAYS_PER_WEEK = 7;

export interface WeekCompletionSummary {
  weekStartKey: string;
  weekEndKey: string;
  completedDays: number;
  consistencyPercent: number;
  currentStreak: number;
  bonusXp: number;
  dayKeys: string[];
}

export interface WeeklyBonusAwardResult {
  awarded: boolean;
  weekStartKey: string;
  completedDays: number;
  bonusXp: number;
}

export interface QuestStreakSummary {
  currentStreak: number;
  longestStreak: number;
  lastCompletedDayKey: string | null;
}

function formatDateKeyUtc(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseDateKeyToUtc(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map((value) => parseInt(value, 10));
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function getUtcDayDistance(from: Date, to: Date): number {
  const fromStart = getStartOfUtcDay(from);
  const toStart = getStartOfUtcDay(to);
  return Math.round((toStart.getTime() - fromStart.getTime()) / (24 * 60 * 60 * 1000));
}

function getStartOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}

function getWeekStartDateUtc(referenceDate: Date): Date {
  const date = getStartOfUtcDay(referenceDate);
  const weekday = (date.getUTCDay() + 6) % DAYS_PER_WEEK; // Monday=0 ... Sunday=6
  date.setUTCDate(date.getUTCDate() - weekday);
  return date;
}

function getWeekBoundsIso(weekStartKey: string): { startIso: string; endIso: string; weekEndKey: string } {
  const weekStartDate = parseDateKeyToUtc(weekStartKey);
  const weekEndDate = addUtcDays(weekStartDate, DAYS_PER_WEEK - 1);
  const startIso = `${weekStartKey}T00:00:00.000Z`;
  const endIso = `${formatDateKeyUtc(weekEndDate)}T23:59:59.999Z`;
  return { startIso, endIso, weekEndKey: formatDateKeyUtc(weekEndDate) };
}

function getCurrentStreakWithinWeek(
  completedDaySet: Set<string>,
  weekStartDate: Date,
  weekEndDate: Date,
  referenceDate: Date
): number {
  const referenceStart = getStartOfUtcDay(referenceDate);
  const streakEndDate = referenceStart > weekEndDate ? weekEndDate : referenceStart;
  if (streakEndDate < weekStartDate) return 0;

  let streak = 0;
  let cursor = streakEndDate;
  while (cursor >= weekStartDate) {
    const key = formatDateKeyUtc(cursor);
    if (!completedDaySet.has(key)) break;
    streak++;
    cursor = addUtcDays(cursor, -1);
  }
  return streak;
}

function getPreviousDayKey(dayKey: string): string {
  const date = parseDateKeyToUtc(dayKey);
  return formatDateKeyUtc(addUtcDays(date, -1));
}

function getLongestConsecutiveStreak(dayKeys: string[]): number {
  if (dayKeys.length === 0) return 0;

  let longest = 1;
  let current = 1;
  for (let index = 1; index < dayKeys.length; index++) {
    const prevDate = parseDateKeyToUtc(dayKeys[index - 1]);
    const currentDate = parseDateKeyToUtc(dayKeys[index]);
    if (getUtcDayDistance(prevDate, currentDate) === 1) {
      current += 1;
    } else {
      current = 1;
    }
    if (current > longest) longest = current;
  }
  return longest;
}

function getCurrentQuestStreak(dayKeySet: Set<string>, referenceDate: Date): number {
  if (dayKeySet.size === 0) return 0;

  const referenceStart = getStartOfUtcDay(referenceDate);
  const todayKey = formatDateKeyUtc(referenceStart);
  const yesterdayKey = formatDateKeyUtc(addUtcDays(referenceStart, -1));
  let cursorKey: string | null = dayKeySet.has(todayKey)
    ? todayKey
    : dayKeySet.has(yesterdayKey)
      ? yesterdayKey
      : null;

  if (!cursorKey) return 0;

  let streak = 0;
  while (cursorKey && dayKeySet.has(cursorKey)) {
    streak += 1;
    cursorKey = getPreviousDayKey(cursorKey);
  }
  return streak;
}

export function getCurrentWeekStartKey(referenceDate: Date = new Date()): string {
  return formatDateKeyUtc(getWeekStartDateUtc(referenceDate));
}

export function getCompletedDayKeysForMonth(year: number, monthIndex: number): string[] {
  const monthStart = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
  const monthEnd = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999));
  return dbGetCompletedDayKeysBetween(monthStart.toISOString(), monthEnd.toISOString());
}

export function getWeekCompletionSummary(
  weekStartKey: string,
  referenceDate: Date = new Date()
): WeekCompletionSummary {
  const { startIso, endIso, weekEndKey } = getWeekBoundsIso(weekStartKey);
  const dayKeys = dbGetCompletedDayKeysBetween(startIso, endIso);
  const completedDays = dayKeys.length;
  const completedDaySet = new Set(dayKeys);
  const weekStartDate = parseDateKeyToUtc(weekStartKey);
  const weekEndDate = parseDateKeyToUtc(weekEndKey);
  const currentStreak = getCurrentStreakWithinWeek(completedDaySet, weekStartDate, weekEndDate, referenceDate);

  return {
    weekStartKey,
    weekEndKey,
    completedDays,
    consistencyPercent: Math.round((completedDays / DAYS_PER_WEEK) * 100),
    currentStreak,
    bonusXp: weeklyBonusForCompletedDays(completedDays),
    dayKeys,
  };
}

export function getCurrentWeekCompletionSummary(referenceDate: Date = new Date()): WeekCompletionSummary {
  return getWeekCompletionSummary(getCurrentWeekStartKey(referenceDate), referenceDate);
}

export function getQuestStreakSummary(referenceDate: Date = new Date()): QuestStreakSummary {
  const dayKeys = [...new Set(dbGetAllCompletedQuestDayKeys())].sort();
  const dayKeySet = new Set(dayKeys);

  const currentStreak = getCurrentQuestStreak(dayKeySet, referenceDate);
  const computedLongest = getLongestConsecutiveStreak(dayKeys);

  const storedLongestRaw = dbGetSetting('quest_longest_streak');
  const storedLongest = storedLongestRaw ? parseInt(storedLongestRaw, 10) : 0;
  const safeStoredLongest = Number.isFinite(storedLongest) ? storedLongest : 0;
  const longestStreak = Math.max(computedLongest, safeStoredLongest);

  if (longestStreak > safeStoredLongest) {
    dbSetSetting('quest_longest_streak', String(longestStreak));
  }

  return {
    currentStreak,
    longestStreak,
    lastCompletedDayKey: dayKeys[dayKeys.length - 1] ?? null,
  };
}

export function getRecentWeekCompletionSummaries(
  weeksToInclude: number,
  referenceDate: Date = new Date()
): WeekCompletionSummary[] {
  const results: WeekCompletionSummary[] = [];
  let cursor = getWeekStartDateUtc(referenceDate);
  const safeWeeksToInclude = Math.max(1, weeksToInclude);

  for (let index = 0; index < safeWeeksToInclude; index++) {
    const weekStartKey = formatDateKeyUtc(cursor);
    results.push(getWeekCompletionSummary(weekStartKey, referenceDate));
    cursor = addUtcDays(cursor, -DAYS_PER_WEEK);
  }

  return results;
}

export function processPendingWeeklyBonus(referenceDate: Date = new Date()): WeeklyBonusAwardResult[] {
  const firstCompletionAt = dbGetFirstQuestCompletionAt();
  if (!firstCompletionAt) return [];

  const previousWeekAnchor = addUtcDays(referenceDate, -DAYS_PER_WEEK);
  const lastProcessableWeekStart = getWeekStartDateUtc(previousWeekAnchor);
  let cursorWeekStart = getWeekStartDateUtc(new Date(firstCompletionAt));

  const awardedBonuses: WeeklyBonusAwardResult[] = [];
  while (cursorWeekStart <= lastProcessableWeekStart) {
    const weekStartKey = formatDateKeyUtc(cursorWeekStart);
    const processedKey = `weekly_bonus_processed_${weekStartKey}`;

    if (!dbGetSetting(processedKey)) {
      const summary = getWeekCompletionSummary(weekStartKey, referenceDate);
      const bonusXp = summary.bonusXp;

      if (bonusXp > 0) {
        const user = dbGetUser();
        if (user) {
          const totalXp = user.xp + bonusXp;
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
            xp: totalXpForLevel(newLevel) + xpIntoLevel,
            level: newLevel,
          });
        }
      }

      dbSetSetting(
        processedKey,
        JSON.stringify({
          processedAt: new Date().toISOString(),
          completedDays: summary.completedDays,
          bonusXp,
        })
      );

      awardedBonuses.push({
        awarded: bonusXp > 0,
        weekStartKey,
        completedDays: summary.completedDays,
        bonusXp,
      });
    }

    cursorWeekStart = addUtcDays(cursorWeekStart, DAYS_PER_WEEK);
  }

  return awardedBonuses;
}
