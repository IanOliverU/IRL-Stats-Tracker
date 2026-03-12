import type { AchievementStatus, Item, ItemDefinition, User } from '@/models';
import { ITEM_DEFINITIONS } from '@/models';
import { getAchievementProgressSnapshot } from '@/services/achievementService';

export type ProgressSnapshot = ReturnType<typeof getAchievementProgressSnapshot>;

export type UnlockPreview = {
  item: ItemDefinition;
  progress: number;
  progressLabel: string;
  requirement: string;
  altProgressLabel?: string;
  remaining: number;
};

export type AchievementPreview = {
  achievement: AchievementStatus;
  progress: number;
  progressLabel: string;
  requirement: string;
  remaining: number;
};

type NumericProgress = {
  current: number;
  target: number;
  progress: number;
  label: string;
  remaining: number;
};

function toProgress(current: number, target: number, label: string): NumericProgress {
  const safeTarget = Math.max(target, 1);
  const clampedCurrent = Math.max(0, Math.min(current, safeTarget));
  return {
    current: clampedCurrent,
    target: safeTarget,
    progress: clampedCurrent / safeTarget,
    label,
    remaining: Math.max(0, safeTarget - clampedCurrent),
  };
}

function getLevelRoute(level: number, targetLevel: number): NumericProgress {
  return toProgress(level, targetLevel, `Level ${level} / ${targetLevel}`);
}

function getStatQuestRoute(currentCount: number, stat: string, targetCount: number): NumericProgress {
  return toProgress(currentCount, targetCount, `${stat} quests ${currentCount} / ${targetCount}`);
}

function getMaxDailyQuestCount(snapshot: ProgressSnapshot): number {
  return [...snapshot.questCountByDay.values()].reduce((max, count) => Math.max(max, count), 0);
}

function getMaxDailyStatVariety(snapshot: ProgressSnapshot): number {
  return [...snapshot.statSetByDay.values()].reduce((max, set) => Math.max(max, set.size), 0);
}

export function getProgressSnapshot(): ProgressSnapshot {
  return getAchievementProgressSnapshot();
}

export function getNextUnlockPreview(params: {
  user: User;
  items: Item[];
  snapshot: ProgressSnapshot;
}): UnlockPreview | null {
  const { user, items, snapshot } = params;
  const unlockedItemIds = new Set(items.filter((item) => !!item.unlockedAt).map((item) => item.id));

  const candidates = ITEM_DEFINITIONS.map((definition, index) => {
    if (unlockedItemIds.has(definition.id)) return null;

    const levelRoute =
      typeof definition.unlockRule.level === 'number'
        ? getLevelRoute(user.level, definition.unlockRule.level)
        : null;
    const statRoute = definition.unlockRule.statQuestCount
      ? getStatQuestRoute(
          snapshot.completedQuestCountByStat[definition.unlockRule.statQuestCount.stat],
          definition.unlockRule.statQuestCount.stat,
          definition.unlockRule.statQuestCount.count
        )
      : null;

    const primaryRoute =
      !levelRoute ? statRoute : !statRoute ? levelRoute : levelRoute.progress >= statRoute.progress ? levelRoute : statRoute;
    const secondaryRoute =
      primaryRoute === levelRoute ? statRoute : levelRoute;

    if (!primaryRoute) return null;

    return {
      index,
      preview: {
        item: definition,
        progress: primaryRoute.progress,
        progressLabel: primaryRoute.label,
        requirement: definition.unlockLabel,
        altProgressLabel: secondaryRoute?.label,
        remaining: primaryRoute.remaining,
      },
    };
  })
    .filter((candidate): candidate is { index: number; preview: UnlockPreview } => candidate !== null)
    .sort((a, b) => {
      if (b.preview.progress !== a.preview.progress) return b.preview.progress - a.preview.progress;
      if (a.preview.remaining !== b.preview.remaining) return a.preview.remaining - b.preview.remaining;
      return a.index - b.index;
    });

  return candidates[0]?.preview ?? null;
}

function getAchievementNumericProgress(
  achievement: AchievementStatus,
  snapshot: ProgressSnapshot
): NumericProgress | null {
  switch (achievement.id) {
    case 'first-quest':
      return toProgress(snapshot.totalCompletedQuests, 1, `${snapshot.totalCompletedQuests} / 1 quest`);
    case 'second-step':
      return toProgress(snapshot.totalCompletedQuests, 5, `${snapshot.totalCompletedQuests} / 5 quests`);
    case 'getting-serious':
      return toProgress(snapshot.totalCompletedQuests, 10, `${snapshot.totalCompletedQuests} / 10 quests`);
    case 'quest-grinder':
      return toProgress(snapshot.totalCompletedQuests, 25, `${snapshot.totalCompletedQuests} / 25 quests`);
    case 'unstoppable':
      return toProgress(snapshot.totalCompletedQuests, 50, `${snapshot.totalCompletedQuests} / 50 quests`);
    case 'century-club':
      return toProgress(snapshot.totalCompletedQuests, 100, `${snapshot.totalCompletedQuests} / 100 quests`);
    case 'streak-3-days':
      return toProgress(snapshot.longestQuestStreak, 3, `${snapshot.longestQuestStreak} / 3 day streak`);
    case 'weekly-warrior':
      return toProgress(snapshot.longestQuestStreak, 7, `${snapshot.longestQuestStreak} / 7 day streak`);
    case 'iron-will':
      return toProgress(snapshot.longestQuestStreak, 14, `${snapshot.longestQuestStreak} / 14 day streak`);
    case 'relentless':
      return toProgress(snapshot.longestQuestStreak, 30, `${snapshot.longestQuestStreak} / 30 day streak`);
    case 'habit-hero':
      return toProgress(snapshot.perfectDailyHabitDays.length, 1, `${snapshot.perfectDailyHabitDays.length} / 1 perfect day`);
    case 'full-combo':
      return toProgress(
        snapshot.longestPerfectDailyHabitStreak,
        3,
        `${snapshot.longestPerfectDailyHabitStreak} / 3 perfect-day streak`
      );
    case 'locked-in':
      return toProgress(
        snapshot.longestPerfectDailyHabitStreak,
        7,
        `${snapshot.longestPerfectDailyHabitStreak} / 7 perfect-day streak`
      );
    case 'daily-dominator':
      return toProgress(getMaxDailyQuestCount(snapshot), 5, `${getMaxDailyQuestCount(snapshot)} / 5 quests in a day`);
    case 'strength-starter':
      return toProgress(snapshot.xpByStat.STR, 100, `${snapshot.xpByStat.STR} / 100 STR XP`);
    case 'brain-boost':
      return toProgress(snapshot.xpByStat.INT, 100, `${snapshot.xpByStat.INT} / 100 INT XP`);
    case 'page-turner':
      return toProgress(snapshot.xpByStat.WIS, 100, `${snapshot.xpByStat.WIS} / 100 WIS XP`);
    case 'people-person':
      return toProgress(snapshot.xpByStat.CHA, 100, `${snapshot.xpByStat.CHA} / 100 CHA XP`);
    case 'wellness-mode':
      return toProgress(snapshot.xpByStat.VIT, 100, `${snapshot.xpByStat.VIT} / 100 VIT XP`);
    case 'strength-specialist':
      return toProgress(snapshot.xpByStat.STR, 250, `${snapshot.xpByStat.STR} / 250 STR XP`);
    case 'intelligence-specialist':
      return toProgress(snapshot.xpByStat.INT, 250, `${snapshot.xpByStat.INT} / 250 INT XP`);
    case 'wisdom-specialist':
      return toProgress(snapshot.xpByStat.WIS, 250, `${snapshot.xpByStat.WIS} / 250 WIS XP`);
    case 'charisma-specialist':
      return toProgress(snapshot.xpByStat.CHA, 250, `${snapshot.xpByStat.CHA} / 250 CHA XP`);
    case 'vitality-specialist':
      return toProgress(snapshot.xpByStat.VIT, 250, `${snapshot.xpByStat.VIT} / 250 VIT XP`);
    case 'balanced-adventurer': {
      const current = Object.values(snapshot.xpByStat).filter((value) => value >= 50).length;
      return toProgress(current, 5, `${current} / 5 stats at 50 XP`);
    }
    case 'hybrid-build': {
      const current = Object.values(snapshot.xpByStat).filter((value) => value >= 100).length;
      return toProgress(current, 3, `${current} / 3 stats at 100 XP`);
    }
    case 'maxed-focus':
      return toProgress(snapshot.maxSingleStatQuestCount, 10, `${snapshot.maxSingleStatQuestCount} / 10 same-stat quests`);
    case 'level-up':
      return toProgress(snapshot.userLevel, 2, `Level ${snapshot.userLevel} / 2`);
    case 'rising-legend':
      return toProgress(snapshot.userLevel, 5, `Level ${snapshot.userLevel} / 5`);
    case 'elite-adventurer':
      return toProgress(snapshot.userLevel, 10, `Level ${snapshot.userLevel} / 10`);
    case 'power-spike':
      return toProgress(snapshot.userXp, 100, `${snapshot.userXp} / 100 total XP`);
    case 'experience-hunter':
      return toProgress(snapshot.userXp, 500, `${snapshot.userXp} / 500 total XP`);
    case 'main-character':
      return toProgress(snapshot.userXp, 1000, `${snapshot.userXp} / 1000 total XP`);
    case 'creator':
      return toProgress(snapshot.customQuestCreatedCount, 1, `${snapshot.customQuestCreatedCount} / 1 custom quest`);
    case 'habit-architect':
      return toProgress(snapshot.customHabitCount, 1, `${snapshot.customHabitCount} / 1 custom habit`);
    case 'personalized-path': {
      const totalCreated = snapshot.customQuestCreatedCount + snapshot.customHabitCount;
      return toProgress(totalCreated, 5, `${totalCreated} / 5 custom creations`);
    }
    case 'loot-seeker':
      return toProgress(snapshot.unlockedItemCount, 1, `${snapshot.unlockedItemCount} / 1 item unlocked`);
    case 'fully-equipped':
      return toProgress(snapshot.unlockedItemCount, 3, `${snapshot.unlockedItemCount} / 3 items unlocked`);
    case 'collector':
      return snapshot.totalItemCount > 0
        ? toProgress(
            snapshot.unlockedItemCount,
            snapshot.totalItemCount,
            `${snapshot.unlockedItemCount} / ${snapshot.totalItemCount} items unlocked`
          )
        : null;
    case 'comeback-kid':
      return toProgress(snapshot.comebackDayCount, 1, `${snapshot.comebackDayCount} / 1 comeback day`);
    case 'no-zero-days':
      return toProgress(snapshot.longestQuestStreak, 7, `${snapshot.longestQuestStreak} / 7 day streak`);
    case 'double-class':
      return toProgress(getMaxDailyStatVariety(snapshot), 2, `${getMaxDailyStatVariety(snapshot)} / 2 stats in one day`);
    case 'peak-week':
      return toProgress(snapshot.maxWeeklyQuestCount, 20, `${snapshot.maxWeeklyQuestCount} / 20 quests in a week`);
    case 'discipline-over-mood':
      return toProgress(snapshot.comebackDayCount, 3, `${snapshot.comebackDayCount} / 3 comeback days`);
    case 'legendary-routine':
      return toProgress(snapshot.totalCompletedQuests, 200, `${snapshot.totalCompletedQuests} / 200 quests`);
    default:
      return null;
  }
}

export function getNextAchievementPreview(params: {
  achievements: AchievementStatus[];
  snapshot: ProgressSnapshot;
}): AchievementPreview | null {
  const { achievements, snapshot } = params;

  const candidates = achievements
    .map((achievement, index) => {
      if (achievement.unlockedAt) return null;
      const progress = getAchievementNumericProgress(achievement, snapshot);
      if (!progress) return null;

      return {
        index,
        preview: {
          achievement,
          progress: progress.progress,
          progressLabel: progress.label,
          requirement: achievement.requirement,
          remaining: progress.remaining,
        },
      };
    })
    .filter((candidate): candidate is { index: number; preview: AchievementPreview } => candidate !== null)
    .sort((a, b) => {
      if (b.preview.progress !== a.preview.progress) return b.preview.progress - a.preview.progress;
      if (a.preview.remaining !== b.preview.remaining) return a.preview.remaining - b.preview.remaining;
      return a.index - b.index;
    });

  if (candidates.length > 0) return candidates[0].preview;

  const firstLocked = achievements.find((achievement) => !achievement.unlockedAt);
  if (!firstLocked) return null;

  return {
    achievement: firstLocked,
    progress: 0,
    progressLabel: 'Progress will update after your next milestone.',
    requirement: firstLocked.requirement,
    remaining: 1,
  };
}
