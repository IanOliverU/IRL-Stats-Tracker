import type { Habit, HabitFrequency, Item, StatType, User } from '@/models';
import {
  dbCreateHabit,
  dbDeleteHabit,
  dbGetHabits,
  dbGetItems,
  dbGetUser,
  dbWasCompletedToday,
  getDb,
} from '@/services/database';
import { completeHabit as doCompleteHabit, getEffectiveStat, getStreakForHabit } from '@/services/habitService';
import { create } from 'zustand';

interface GameState {
  user: User | null;
  habits: Habit[];
  items: Item[];
  hydrated: boolean;
  /** Incremented on every mutation to force re-renders of computed selectors */
  lastAction: number;
}

interface GameActions {
  hydrate: () => void;
  completeHabit: (habitId: string) => void;
  addHabit: (payload: { title: string; statReward: StatType; xpReward: number; frequency: HabitFrequency }) => void;
  removeHabit: (habitId: string) => void;
  getStreak: (habitId: string) => number;
  isCompletedToday: (habitId: string) => boolean;
  getEffectiveStat: (stat: StatType) => number;
}

export const useGameStore = create<GameState & GameActions>((set, get) => ({
  user: null,
  habits: [],
  items: [],
  hydrated: false,
  lastAction: 0,

  hydrate: () => {
    try {
      getDb();
      const user = dbGetUser();
      const habits = dbGetHabits();
      const items = dbGetItems();
      set({ user, habits, items, hydrated: true });
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

  getStreak: (habitId: string) => getStreakForHabit(habitId),
  isCompletedToday: dbWasCompletedToday,
  getEffectiveStat: (stat: StatType) => {
    const user = get().user;
    if (!user) return 0;
    return getEffectiveStat(user, stat);
  },
}));
