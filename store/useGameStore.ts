import type {
  AchievementStatus,
  CustomQuest,
  Difficulty,
  Habit,
  HabitFrequency,
  Item,
  MapActivitySession,
  MapActivityType,
  MapCoordinate,
  StatType,
  User,
} from '@/models';
import { DIFFICULTY_XP, totalXpForLevel, xpRequiredForLevel } from '@/models';
import { checkAndUnlockAchievements, getAchievementStatuses } from '@/services/achievementService';
import {
  getCompletedDayKeysForMonth,
  getCurrentWeeklyRecap,
  getCurrentWeekCompletionSummary,
  getQuestStreakSummary,
  getRecentWeekCompletionSummaries,
  processPendingWeeklyBonus,
  type QuestStreakSummary,
  type WeeklyRecap,
  type WeekCompletionSummary,
} from '@/services/calendarService';
import {
  dbCountCompletedCustomQuestsToday,
  dbCreateCustomQuest,
  dbCreateHabit,
  dbCreateMapActivitySession,
  dbDeleteCustomQuest,
  dbDeleteHabit,
  dbGetCustomQuestById,
  dbGetHabits,
  dbGetItems,
  dbGetMapActivitySessions,
  dbGetTodayQuestXp,
  dbGetTodayCustomQuests,
  dbGetTotalMissionXp,
  dbGetUser,
  dbResetAllData,
  dbUpdateCustomQuest,
  dbUpdateUserName,
  dbWasCompletedToday,
  getDb
} from '@/services/database';
import {
  completeCustomQuest as doCompleteCustomQuest,
  completeHabit as doCompleteHabit,
  getStreakForHabit,
  syncItemUnlocks,
  type CustomQuestResult,
  type QuestCompletionFeedback,
} from '@/services/habitService';
import { create } from 'zustand';

interface GameState {
  user: User | null;
  habits: Habit[];
  items: Item[];
  customQuests: CustomQuest[];
  mapSessions: MapActivitySession[];
  achievements: AchievementStatus[];
  achievementUnlockQueue: AchievementStatus[];
  itemUnlockQueue: string[];
  hydrated: boolean;
  /** Incremented on every mutation to force re-renders of computed selectors */
  lastAction: number;
}

interface GameActions {
  hydrate: () => void;
  completeHabit: (habitId: string) => QuestCompletionFeedback | null;
  addHabit: (payload: { title: string; statReward: StatType; xpReward: number; frequency: HabitFrequency }) => void;
  removeHabit: (habitId: string) => void;
  resetData: () => void;
  getStreak: (habitId: string) => number;
  isCompletedToday: (habitId: string) => boolean;
  getEffectiveStat: (stat: StatType) => number;
  // Custom quests
  addCustomQuest: (payload: {
    title: string;
    statReward: StatType;
    difficulty: Difficulty;
    source?: 'manual' | 'map_activity';
    activityType?: MapActivityType | null;
    linkedMapSessionId?: string | null;
    distanceMeters?: number;
  }) => CustomQuest | null;
  updateCustomQuest: (
    questId: string,
    updates: Partial<Pick<CustomQuest, 'title' | 'difficulty' | 'xpReward' | 'activityType' | 'linkedMapSessionId' | 'distanceMeters'>>
  ) => void;
  refreshCustomQuests: () => void;
  completeCustomQuest: (questId: string) => CustomQuestResult;
  deleteCustomQuest: (questId: string) => void;
  getCustomQuestsCompletedToday: () => number;
  getTotalMissionXp: () => number;
  setUserName: (name: string) => void;
  /** Re-read user (+ items) from DB so any screen shows up-to-date stats */
  refreshUser: () => void;
  getCompletedDaysForMonth: (year: number, monthIndex: number) => string[];
  getCurrentWeekSummary: () => WeekCompletionSummary;
  getRecentWeekSummaries: (weeksToInclude: number) => WeekCompletionSummary[];
  getQuestStreakSummary: () => QuestStreakSummary;
  getTodayQuestXp: () => number;
  getCurrentWeeklyRecap: () => WeeklyRecap;
  dismissAchievementUnlock: () => void;
  dismissItemUnlock: () => void;
  dismissItemUnlocks: (itemIds: string[]) => void;
  refreshAchievements: () => void;
  addMapActivitySession: (payload: {
    activityType: MapActivityType;
    difficulty: Difficulty;
    distanceMeters: number;
    elapsedMs: number;
    startedAt: string;
    endedAt: string;
    xpMultiplier: number;
    routeCoordinates: MapCoordinate[];
  }) => MapActivitySession;
  refreshMapActivitySessions: () => void;
}

export const useGameStore = create<GameState & GameActions>((set, get) => ({
  user: null,
  habits: [],
  items: [],
  customQuests: [],
  mapSessions: [],
  achievements: [],
  achievementUnlockQueue: [],
  itemUnlockQueue: [],
  hydrated: false,
  lastAction: 0,

  hydrate: () => {
    try {
      getDb();
      processPendingWeeklyBonus();
      const itemUnlocks = syncItemUnlocks();
      const user = dbGetUser();
      const habits = dbGetHabits();
      const items = dbGetItems();
      const customQuests = dbGetTodayCustomQuests();
      const mapSessions = dbGetMapActivitySessions();
      checkAndUnlockAchievements();
      const achievements = getAchievementStatuses();
      set({
        user,
        habits,
        items,
        customQuests,
        mapSessions,
        achievements,
        itemUnlockQueue: itemUnlocks.unlockedItemIds,
        hydrated: true,
      });
    } catch (e) {
      console.warn('DB hydrate failed', e);
      set({ hydrated: true });
    }
  },

  completeHabit: (habitId: string) => {
    const { habits, lastAction } = get();
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return null;
    const result = doCompleteHabit(habitId, habit);
    if (result) {
      processPendingWeeklyBonus();
      const newlyUnlockedAchievements = checkAndUnlockAchievements();
      const achievements = getAchievementStatuses();
      const user = dbGetUser();
      const items = dbGetItems();
      const freshHabits = dbGetHabits();
      set({
        user,
        items,
        habits: freshHabits,
        achievements,
        achievementUnlockQueue: [
          ...get().achievementUnlockQueue,
          ...newlyUnlockedAchievements,
        ],
        itemUnlockQueue: [...get().itemUnlockQueue, ...(result.unlockedItemIds ?? [])],
        lastAction: lastAction + 1,
      });

      const effectiveUser = user ?? result.user;
      return {
        ...result.feedback,
        xpIntoLevel: effectiveUser.xp - totalXpForLevel(effectiveUser.level),
        xpRequired: xpRequiredForLevel(effectiveUser.level),
      };
    }
    return null;
  },

  addHabit: (payload) => {
    const id = `habit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    dbCreateHabit({
      id,
      title: payload.title,
      statReward: payload.statReward,
      xpReward: payload.xpReward,
      frequency: payload.frequency,
    });
    const newlyUnlockedAchievements = checkAndUnlockAchievements();
    const achievements = getAchievementStatuses();
    const habits = dbGetHabits();
    set({
      habits,
      achievements,
      achievementUnlockQueue: [
        ...get().achievementUnlockQueue,
        ...newlyUnlockedAchievements,
      ],
      lastAction: get().lastAction + 1,
    });
  },

  removeHabit: (habitId: string) => {
    dbDeleteHabit(habitId);
    const habits = dbGetHabits();
    set({ habits, lastAction: get().lastAction + 1 });
  },

  resetData: () => {
    dbResetAllData();
    const user = dbGetUser();
    const habits = dbGetHabits();
    const items = dbGetItems();
    const customQuests = dbGetTodayCustomQuests();
    const mapSessions = dbGetMapActivitySessions();
    const achievements = getAchievementStatuses();
    set({
      user,
      habits,
      items,
      customQuests,
      mapSessions,
      achievements,
      achievementUnlockQueue: [],
      itemUnlockQueue: [],
      lastAction: get().lastAction + 1,
    });
  },

  // ─── Custom Quest Actions ─────────────────────────────

  addCustomQuest: (payload) => {
    const id = `cq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const xpReward = DIFFICULTY_XP[payload.difficulty];
    const now = new Date().toISOString();
    dbCreateCustomQuest({
      id,
      title: payload.title,
      statReward: payload.statReward,
      difficulty: payload.difficulty,
      xpReward,
      createdAt: now,
      source: payload.source ?? 'manual',
      activityType: payload.activityType ?? null,
      linkedMapSessionId: payload.linkedMapSessionId ?? null,
      distanceMeters: payload.distanceMeters ?? 0,
    });
    const newlyUnlockedAchievements = checkAndUnlockAchievements();
    const achievements = getAchievementStatuses();
    const customQuests = dbGetTodayCustomQuests();
    const createdQuest = dbGetCustomQuestById(id);
    set({
      customQuests,
      achievements,
      achievementUnlockQueue: [
        ...get().achievementUnlockQueue,
        ...newlyUnlockedAchievements,
      ],
      lastAction: get().lastAction + 1,
    });
    return createdQuest;
  },

  updateCustomQuest: (questId, updates) => {
    dbUpdateCustomQuest(questId, updates);
    const customQuests = dbGetTodayCustomQuests();
    set({ customQuests, lastAction: get().lastAction + 1 });
  },

  refreshCustomQuests: () => {
    const customQuests = dbGetTodayCustomQuests();
    set({ customQuests, lastAction: get().lastAction + 1 });
  },

  completeCustomQuest: (questId: string) => {
    const quest = get().customQuests.find((q) => q.id === questId);
    if (!quest) return { success: false as const, reason: 'daily_limit' as const, message: 'Quest not found' };

    let result = doCompleteCustomQuest(quest);
    if (result.success) {
      processPendingWeeklyBonus();
      const newlyUnlockedAchievements = checkAndUnlockAchievements();
      const achievements = getAchievementStatuses();
      const user = dbGetUser();
      const items = dbGetItems();
      const customQuests = dbGetTodayCustomQuests();
      set({
        user,
        items,
        customQuests,
        achievements,
        achievementUnlockQueue: [
          ...get().achievementUnlockQueue,
          ...newlyUnlockedAchievements,
        ],
        itemUnlockQueue: [...get().itemUnlockQueue, ...(result.unlockedItemIds ?? [])],
        lastAction: get().lastAction + 1,
      });

      if (user) {
        result = {
          success: true,
          feedback: {
            ...result.feedback,
            xpIntoLevel: user.xp - totalXpForLevel(user.level),
            xpRequired: xpRequiredForLevel(user.level),
          },
          unlockedItemIds: result.unlockedItemIds,
          instantXpFromItems: result.instantXpFromItems,
        };
      }
    }
    return result;
  },

  deleteCustomQuest: (questId: string) => {
    dbDeleteCustomQuest(questId);
    const customQuests = dbGetTodayCustomQuests();
    set({ customQuests, lastAction: get().lastAction + 1 });
  },

  getCustomQuestsCompletedToday: () => dbCountCompletedCustomQuestsToday(),
  getTotalMissionXp: () => dbGetTotalMissionXp(),

  setUserName: (name: string) => {
    dbUpdateUserName(name);
    const user = dbGetUser();
    set({ user, lastAction: get().lastAction + 1 });
  },

  refreshUser: () => {
    const user = dbGetUser();
    const items = dbGetItems();
    set({ user, items, lastAction: get().lastAction + 1 });
  },

  dismissAchievementUnlock: () => {
    const queue = get().achievementUnlockQueue;
    if (queue.length === 0) return;
    set({
      achievementUnlockQueue: queue.slice(1),
      lastAction: get().lastAction + 1,
    });
  },

  dismissItemUnlock: () => {
    const queue = get().itemUnlockQueue;
    if (queue.length === 0) return;
    set({
      itemUnlockQueue: queue.slice(1),
      lastAction: get().lastAction + 1,
    });
  },

  dismissItemUnlocks: (itemIds) => {
    if (itemIds.length === 0) return;
    const hiddenIds = new Set(itemIds);
    set({
      itemUnlockQueue: get().itemUnlockQueue.filter((itemId) => !hiddenIds.has(itemId)),
      lastAction: get().lastAction + 1,
    });
  },

  refreshAchievements: () => {
    const achievements = getAchievementStatuses();
    set({ achievements, lastAction: get().lastAction + 1 });
  },

  addMapActivitySession: (payload) => {
    const session: MapActivitySession = {
      id: `map_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      activityType: payload.activityType,
      difficulty: payload.difficulty,
      distanceMeters: payload.distanceMeters,
      elapsedMs: payload.elapsedMs,
      startedAt: payload.startedAt,
      endedAt: payload.endedAt,
      xpMultiplier: payload.xpMultiplier,
      routeCoordinates: payload.routeCoordinates,
    };

    dbCreateMapActivitySession(session);
    const mapSessions = dbGetMapActivitySessions();
    set({
      mapSessions,
      lastAction: get().lastAction + 1,
    });

    return session;
  },

  refreshMapActivitySessions: () => {
    const mapSessions = dbGetMapActivitySessions();
    set({ mapSessions, lastAction: get().lastAction + 1 });
  },

  getCompletedDaysForMonth: (year: number, monthIndex: number) =>
    getCompletedDayKeysForMonth(year, monthIndex),
  getCurrentWeekSummary: () => getCurrentWeekCompletionSummary(),
  getCurrentWeeklyRecap: () => getCurrentWeeklyRecap(),
  getRecentWeekSummaries: (weeksToInclude: number) =>
    getRecentWeekCompletionSummaries(weeksToInclude),
  getQuestStreakSummary: () => getQuestStreakSummary(),
  getTodayQuestXp: () => dbGetTodayQuestXp(),

  getStreak: (habitId: string) => getStreakForHabit(habitId),
  isCompletedToday: dbWasCompletedToday,
  getEffectiveStat: (stat: StatType) => {
    const user = get().user;
    if (!user) return 0;
    const base = user[stat.toLowerCase() as keyof Pick<User, 'str' | 'int' | 'wis' | 'cha' | 'vit'>] as number;
    const bonus = get()
      .items
      .filter((item) => item.statBonus === stat && !!item.unlockedAt)
      .reduce((sum, item) => sum + item.bonusAmount, 0);
    return base + bonus;
  },
}));
