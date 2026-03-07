import type { CustomQuest, Difficulty, Habit, HabitFrequency, Item, StatType, User } from '@/models';
import { DIFFICULTY_XP } from '@/models';
import {
  dbCountCompletedCustomQuestsToday,
  dbCreateCustomQuest,
  dbCreateHabit,
  dbDeleteCustomQuest,
  dbDeleteHabit,
  dbGetHabits,
  dbGetItems,
  dbGetTodayCustomQuests,
  dbGetUser,
  dbResetAllData,
  dbUpdateUserName,
  dbWasCompletedToday,
  getDb
} from '@/services/database';
import {
  completeCustomQuest as doCompleteCustomQuest,
  completeHabit as doCompleteHabit,
  getEffectiveStat,
  getStreakForHabit,
  type CustomQuestResult,
} from '@/services/habitService';
import { create } from 'zustand';

interface GameState {
  user: User | null;
  habits: Habit[];
  items: Item[];
  customQuests: CustomQuest[];
  hydrated: boolean;
  /** Incremented on every mutation to force re-renders of computed selectors */
  lastAction: number;
}

interface GameActions {
  hydrate: () => void;
  completeHabit: (habitId: string) => void;
  addHabit: (payload: { title: string; statReward: StatType; xpReward: number; frequency: HabitFrequency }) => void;
  removeHabit: (habitId: string) => void;
  resetData: () => void;
  getStreak: (habitId: string) => number;
  isCompletedToday: (habitId: string) => boolean;
  getEffectiveStat: (stat: StatType) => number;
  // Custom quests
  addCustomQuest: (payload: { title: string; statReward: StatType; difficulty: Difficulty }) => void;
  completeCustomQuest: (questId: string) => CustomQuestResult;
  deleteCustomQuest: (questId: string) => void;
  getCustomQuestsCompletedToday: () => number;
  setUserName: (name: string) => void;
}

export const useGameStore = create<GameState & GameActions>((set, get) => ({
  user: null,
  habits: [],
  items: [],
  customQuests: [],
  hydrated: false,
  lastAction: 0,

  hydrate: () => {
    try {
      getDb();
      const user = dbGetUser();
      const habits = dbGetHabits();
      const items = dbGetItems();
      const customQuests = dbGetTodayCustomQuests();
      set({ user, habits, items, customQuests, hydrated: true });
    } catch (e) {
      console.warn('DB hydrate failed', e);
      set({ hydrated: true });
    }
  },

  completeHabit: (habitId: string) => {
    const { habits, lastAction } = get();
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return;
    const user = doCompleteHabit(habitId, habit);
    if (user) {
      const items = dbGetItems();
      const freshHabits = dbGetHabits();
      set({ user, items, habits: freshHabits, lastAction: lastAction + 1 });
    }
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
    const habits = dbGetHabits();
    set({ habits, lastAction: get().lastAction + 1 });
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
    set({ user, habits, items, customQuests, lastAction: get().lastAction + 1 });
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
    });
    const customQuests = dbGetTodayCustomQuests();
    set({ customQuests, lastAction: get().lastAction + 1 });
  },

  completeCustomQuest: (questId: string) => {
    const quest = get().customQuests.find((q) => q.id === questId);
    if (!quest) return { success: false as const, reason: 'daily_limit' as const, message: 'Quest not found' };

    const result = doCompleteCustomQuest(quest);
    if (result.success) {
      const user = dbGetUser();
      const items = dbGetItems();
      const customQuests = dbGetTodayCustomQuests();
      set({ user, items, customQuests, lastAction: get().lastAction + 1 });
    }
    return result;
  },

  deleteCustomQuest: (questId: string) => {
    dbDeleteCustomQuest(questId);
    const customQuests = dbGetTodayCustomQuests();
    set({ customQuests, lastAction: get().lastAction + 1 });
  },

  getCustomQuestsCompletedToday: () => dbCountCompletedCustomQuestsToday(),

  setUserName: (name: string) => {
    dbUpdateUserName(name);
    const user = dbGetUser();
    set({ user, lastAction: get().lastAction + 1 });
  },

  getStreak: (habitId: string) => getStreakForHabit(habitId),
  isCompletedToday: dbWasCompletedToday,
  getEffectiveStat: (stat: StatType) => {
    const user = get().user;
    if (!user) return 0;
    return getEffectiveStat(user, stat);
  },
}));
