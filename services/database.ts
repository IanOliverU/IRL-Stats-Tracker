import type { CustomQuest, Habit, HabitLog, Item, StatType, User } from '@/models';
import * as SQLite from 'expo-sqlite';

const DB_NAME = 'liferpg.db';

let db: SQLite.SQLiteDatabase | null = null;

export function getDb(): SQLite.SQLiteDatabase {
  if (!db) {
    db = SQLite.openDatabaseSync(DB_NAME);
    initSchema(db);
  }
  return db;
}

function initSchema(database: SQLite.SQLiteDatabase) {
  database.execSync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS user (
      id TEXT PRIMARY KEY,
      level INTEGER NOT NULL DEFAULT 1,
      xp INTEGER NOT NULL DEFAULT 0,
      str INTEGER NOT NULL DEFAULT 0,
      int INTEGER NOT NULL DEFAULT 0,
      wis INTEGER NOT NULL DEFAULT 0,
      cha INTEGER NOT NULL DEFAULT 0,
      vit INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS habit (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      statReward TEXT NOT NULL,
      xpReward INTEGER NOT NULL,
      frequency TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS habit_log (
      id TEXT PRIMARY KEY,
      habitId TEXT NOT NULL,
      completedAt TEXT NOT NULL,
      streakCount INTEGER NOT NULL DEFAULT 1,
      bonusXp INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (habitId) REFERENCES habit(id)
    );

    CREATE TABLE IF NOT EXISTS item (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      statBonus TEXT NOT NULL,
      bonusAmount INTEGER NOT NULL,
      unlockCondition TEXT NOT NULL,
      unlockedAt TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (statBonus) REFERENCES stat
    );

    CREATE INDEX IF NOT EXISTS idx_habit_log_habit ON habit_log(habitId);
    CREATE INDEX IF NOT EXISTS idx_habit_log_completed ON habit_log(completedAt);

    CREATE TABLE IF NOT EXISTS custom_quest (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      statReward TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      xpReward INTEGER NOT NULL,
      completedAt TEXT,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Migration: add name column if not present
  try {
    database.runSync('ALTER TABLE user ADD COLUMN name TEXT');
  } catch (_e) {
    // Column already exists — ignore
  }

  // Seed default user if none exists
  const userRow = database.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM user');
  if (userRow && userRow.count === 0) {
    const now = new Date().toISOString();
    database.runSync(
      'INSERT INTO user (id, name, level, xp, str, int, wis, cha, vit, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      ['default', null, 1, 0, 0, 0, 0, 0, 0, now, now]
    );
  }

  // Seed default habits if none exist
  const habitRow = database.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM habit');
  if (habitRow && habitRow.count === 0) {
    const now = new Date().toISOString();
    const defaults = [
      ['gym', 'Gym', 'STR', 50, 'daily', now, now],
      ['coding', 'Coding', 'INT', 40, 'daily', now, now],
      ['reading', 'Reading', 'WIS', 30, 'daily', now, now],
      ['social', 'Social', 'CHA', 35, 'weekly', now, now],
      ['sleep', 'Sleep well', 'VIT', 25, 'daily', now, now],
    ];
    for (const row of defaults) {
      database.runSync(
        'INSERT INTO habit (id, title, statReward, xpReward, frequency, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
        row
      );
    }
  }

  // Seed default items if none exist
  const itemRow = database.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM item');
  if (itemRow && itemRow.count === 0) {
    const now = new Date().toISOString();
    const items: [string, string, string, number, string, string][] = [
      ['running-shoes', 'Running Shoes', 'STR', 2, 'Complete 7 STR habits', now],
      ['laptop', 'Laptop', 'INT', 2, 'Complete 7 INT habits', now],
      ['bookmark', 'Bookmark', 'WIS', 2, 'Complete 7 WIS habits', now],
      ['name-tag', 'Name Tag', 'CHA', 2, 'Complete 5 CHA habits', now],
      ['water-bottle', 'Water Bottle', 'VIT', 2, 'Complete 7 VIT habits', now],
    ];
    for (const [id, name, stat, amount, condition, createdAt] of items) {
      database.runSync(
        'INSERT INTO item (id, name, statBonus, bonusAmount, unlockCondition, unlockedAt, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, name, stat, amount, condition, null, createdAt]
      );
    }
  }
}

// --- User ---
export function dbGetUser(): User | null {
  const database = getDb();
  const row = database.getFirstSync<Record<string, unknown>>('SELECT * FROM user LIMIT 1');
  if (!row) return null;
  return row as unknown as User;
}

export function dbUpdateUser(updates: Partial<Omit<User, 'id'>>): void {
  const database = getDb();
  const user = dbGetUser();
  if (!user) return;
  const updatedAt = new Date().toISOString();
  const level = updates.level ?? user.level;
  const xp = updates.xp ?? user.xp;
  const str = updates.str ?? user.str;
  const int = updates.int ?? user.int;
  const wis = updates.wis ?? user.wis;
  const cha = updates.cha ?? user.cha;
  const vit = updates.vit ?? user.vit;
  database.runSync(
    'UPDATE user SET level = ?, xp = ?, str = ?, int = ?, wis = ?, cha = ?, vit = ?, updatedAt = ? WHERE id = ?',
    [level, xp, str, int, wis, cha, vit, updatedAt, user.id]
  );
}

export function dbUpdateUserName(name: string): void {
  const database = getDb();
  database.runSync('UPDATE user SET name = ?, updatedAt = ? WHERE id = ?', [
    name,
    new Date().toISOString(),
    'default',
  ]);
}

// --- Habits ---
export function dbGetHabits(): Habit[] {
  const database = getDb();
  const rows = database.getAllSync<Record<string, unknown>>('SELECT * FROM habit ORDER BY createdAt');
  return (rows ?? []) as unknown as Habit[];
}

export function dbCreateHabit(habit: Omit<Habit, 'createdAt' | 'updatedAt'>): void {
  const database = getDb();
  const now = new Date().toISOString();
  database.runSync(
    'INSERT INTO habit (id, title, statReward, xpReward, frequency, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      habit.id,
      habit.title,
      habit.statReward,
      habit.xpReward,
      habit.frequency,
      now,
      now,
    ]
  );
}

export function dbDeleteHabit(id: string): void {
  const database = getDb();
  database.runSync('DELETE FROM habit_log WHERE habitId = ?', [id]);
  database.runSync('DELETE FROM habit WHERE id = ?', [id]);
}

// --- Habit logs ---
export function dbGetLogsForHabit(habitId: string): HabitLog[] {
  const database = getDb();
  const rows = database.getAllSync<Record<string, unknown>>(
    'SELECT * FROM habit_log WHERE habitId = ? ORDER BY completedAt DESC',
    [habitId]
  );
  return (rows ?? []) as unknown as HabitLog[];
}

export function dbGetLogsSince(habitId: string, sinceIso: string): HabitLog[] {
  const database = getDb();
  const rows = database.getAllSync<Record<string, unknown>>(
    'SELECT * FROM habit_log WHERE habitId = ? AND completedAt >= ? ORDER BY completedAt DESC',
    [habitId, sinceIso]
  );
  return (rows ?? []) as unknown as HabitLog[];
}

export function dbWasCompletedToday(habitId: string): boolean {
  const database = getDb();
  const today = new Date().toISOString().slice(0, 10);
  const start = `${today}T00:00:00.000Z`;
  const end = `${today}T23:59:59.999Z`;
  const row = database.getFirstSync<{ count: number }>(
    'SELECT COUNT(*) as count FROM habit_log WHERE habitId = ? AND completedAt >= ? AND completedAt <= ?',
    [habitId, start, end]
  );
  return (row?.count ?? 0) > 0;
}

export function dbInsertHabitLog(log: Omit<HabitLog, 'id'>): void {
  const database = getDb();
  const id = `log_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  database.runSync(
    'INSERT INTO habit_log (id, habitId, completedAt, streakCount, bonusXp) VALUES (?, ?, ?, ?, ?)',
    [id, log.habitId, log.completedAt, log.streakCount, log.bonusXp]
  );
}

/** Distinct UTC day keys (YYYY-MM-DD) where at least one habit/custom quest was completed. */
export function dbGetCompletedDayKeysBetween(startIso: string, endIso: string): string[] {
  const database = getDb();
  const rows = database.getAllSync<{ day: string }>(
    `
      SELECT day
      FROM (
        SELECT SUBSTR(completedAt, 1, 10) AS day
        FROM habit_log
        WHERE completedAt >= ? AND completedAt <= ?
        UNION
        SELECT SUBSTR(completedAt, 1, 10) AS day
        FROM custom_quest
        WHERE completedAt IS NOT NULL AND completedAt >= ? AND completedAt <= ?
      )
      ORDER BY day ASC
    `,
    [startIso, endIso, startIso, endIso]
  );

  return (rows ?? []).map((row) => row.day);
}

/** First timestamp where the user completed any habit or custom quest. */
export function dbGetFirstQuestCompletionAt(): string | null {
  const database = getDb();
  const row = database.getFirstSync<{ firstCompletedAt: string | null }>(
    `
      SELECT MIN(ts) AS firstCompletedAt
      FROM (
        SELECT MIN(completedAt) AS ts FROM habit_log
        UNION ALL
        SELECT MIN(completedAt) AS ts FROM custom_quest WHERE completedAt IS NOT NULL
      )
      WHERE ts IS NOT NULL
    `
  );
  return row?.firstCompletedAt ?? null;
}

// --- Items ---
export function dbGetItems(): Item[] {
  const database = getDb();
  const rows = database.getAllSync<Record<string, unknown>>('SELECT * FROM item ORDER BY createdAt');
  return (rows ?? []) as unknown as Item[];
}

export function dbUnlockItem(itemId: string): void {
  const database = getDb();
  const now = new Date().toISOString();
  database.runSync('UPDATE item SET unlockedAt = ? WHERE id = ?', [now, itemId]);
}

// --- Settings ---
export function dbGetSetting(key: string): string | null {
  const database = getDb();
  const row = database.getFirstSync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    [key]
  );
  return row?.value ?? null;
}

export function dbSetSetting(key: string, value: string): void {
  const database = getDb();
  database.runSync(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    [key, value]
  );
}

// --- Reset ---
/** Wipes all game data and re-seeds defaults. Preserves settings. */
export function dbResetAllData(): void {
  const database = getDb();
  database.execSync(`
    DELETE FROM habit_log;
    DELETE FROM habit;
    DELETE FROM item;
    DELETE FROM user;
    DELETE FROM custom_quest;
    DELETE FROM settings WHERE key LIKE 'weekly_bonus_processed_%';
  `);

  // Re-seed user (name = null so welcome modal appears)
  const now = new Date().toISOString();
  database.runSync(
    'INSERT INTO user (id, name, level, xp, str, int, wis, cha, vit, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    ['default', null, 1, 0, 0, 0, 0, 0, 0, now, now]
  );

  // Re-seed default habits
  const defaults = [
    ['gym', 'Gym', 'STR', 50, 'daily', now, now],
    ['coding', 'Coding', 'INT', 40, 'daily', now, now],
    ['reading', 'Reading', 'WIS', 30, 'daily', now, now],
    ['social', 'Social', 'CHA', 35, 'weekly', now, now],
    ['sleep', 'Sleep well', 'VIT', 25, 'daily', now, now],
  ];
  for (const row of defaults) {
    database.runSync(
      'INSERT INTO habit (id, title, statReward, xpReward, frequency, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
      row
    );
  }

  // Re-seed default items
  const items: [string, string, string, number, string, string][] = [
    ['running-shoes', 'Running Shoes', 'STR', 2, 'Complete 7 STR habits', now],
    ['laptop', 'Laptop', 'INT', 2, 'Complete 7 INT habits', now],
    ['bookmark', 'Bookmark', 'WIS', 2, 'Complete 7 WIS habits', now],
    ['name-tag', 'Name Tag', 'CHA', 2, 'Complete 5 CHA habits', now],
    ['water-bottle', 'Water Bottle', 'VIT', 2, 'Complete 7 VIT habits', now],
  ];
  for (const [id, name, stat, amount, condition, createdAt] of items) {
    database.runSync(
      'INSERT INTO item (id, name, statBonus, bonusAmount, unlockCondition, unlockedAt, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, name, stat, amount, condition, null, createdAt]
    );
  }
}

// --- Custom Quests ---

export function dbCreateCustomQuest(quest: Omit<CustomQuest, 'completedAt'>): void {
  const database = getDb();
  database.runSync(
    'INSERT INTO custom_quest (id, title, statReward, difficulty, xpReward, completedAt, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [quest.id, quest.title, quest.statReward, quest.difficulty, quest.xpReward, null, quest.createdAt]
  );
}

/** Get all custom quests created today (both completed and pending) */
export function dbGetTodayCustomQuests(): CustomQuest[] {
  const database = getDb();
  const today = new Date().toISOString().slice(0, 10);
  const start = `${today}T00:00:00.000Z`;
  const end = `${today}T23:59:59.999Z`;
  const rows = database.getAllSync<Record<string, unknown>>(
    'SELECT * FROM custom_quest WHERE createdAt >= ? AND createdAt <= ? ORDER BY createdAt DESC',
    [start, end]
  );
  return (rows ?? []) as unknown as CustomQuest[];
}

/** Complete a custom quest by ID */
export function dbCompleteCustomQuest(questId: string): void {
  const database = getDb();
  const now = new Date().toISOString();
  database.runSync('UPDATE custom_quest SET completedAt = ? WHERE id = ?', [now, questId]);
}

/** Delete a custom quest */
export function dbDeleteCustomQuest(questId: string): void {
  const database = getDb();
  database.runSync('DELETE FROM custom_quest WHERE id = ?', [questId]);
}

/** Count how many custom quests were completed today */
export function dbCountCompletedCustomQuestsToday(): number {
  const database = getDb();
  const today = new Date().toISOString().slice(0, 10);
  const start = `${today}T00:00:00.000Z`;
  const end = `${today}T23:59:59.999Z`;
  const row = database.getFirstSync<{ count: number }>(
    'SELECT COUNT(*) as count FROM custom_quest WHERE completedAt IS NOT NULL AND completedAt >= ? AND completedAt <= ?',
    [start, end]
  );
  return row?.count ?? 0;
}

/** Total XP earned from custom quests for a given stat today */
export function dbCustomQuestXpForStatToday(stat: StatType): number {
  const database = getDb();
  const today = new Date().toISOString().slice(0, 10);
  const start = `${today}T00:00:00.000Z`;
  const end = `${today}T23:59:59.999Z`;
  const row = database.getFirstSync<{ total: number }>(
    'SELECT COALESCE(SUM(xpReward), 0) as total FROM custom_quest WHERE completedAt IS NOT NULL AND statReward = ? AND completedAt >= ? AND completedAt <= ?',
    [stat, start, end]
  );
  return row?.total ?? 0;
}

/** Total XP earned from all completed custom quests (all-time) */
export function dbGetTotalMissionXp(): number {
  const database = getDb();
  const row = database.getFirstSync<{ total: number }>(
    'SELECT COALESCE(SUM(xpReward), 0) as total FROM custom_quest WHERE completedAt IS NOT NULL'
  );
  return row?.total ?? 0;
}
