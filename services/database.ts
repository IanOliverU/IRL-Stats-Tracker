import {
  ITEM_DEFINITIONS,
  normalizeHabitXpReward,
  type AchievementId,
  type CustomQuest,
  type Habit,
  type HabitLog,
  type Item,
  type ItemDefinition,
  type MapActivitySession,
  type MapCoordinate,
  type StatType,
  type User,
} from '@/models';
import * as SQLite from 'expo-sqlite';

const DB_NAME = 'liferpg.db';

let db: SQLite.SQLiteDatabase | null = null;

function insertItemDefinition(database: SQLite.SQLiteDatabase, item: ItemDefinition, createdAt: string): void {
  database.runSync(
    'INSERT INTO item (id, name, statBonus, bonusAmount, unlockCondition, unlockedAt, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [item.id, item.name, item.stat, 0, item.unlockLabel, null, createdAt]
  );
}

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
      createdAt TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'manual',
      activityType TEXT,
      linkedMapSessionId TEXT,
      distanceMeters REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS achievement_unlock (
      achievementId TEXT PRIMARY KEY,
      unlockedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS map_activity_session (
      id TEXT PRIMARY KEY,
      activityType TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      distanceMeters REAL NOT NULL,
      elapsedMs INTEGER NOT NULL,
      startedAt TEXT NOT NULL,
      endedAt TEXT NOT NULL,
      xpMultiplier REAL NOT NULL,
      routeCoordinatesJson TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_map_activity_session_ended_at
      ON map_activity_session(endedAt DESC);
  `);

  // Migration: add name column if not present
  try {
    database.runSync('ALTER TABLE user ADD COLUMN name TEXT');
  } catch {
    // Column already exists — ignore
  }

  try {
    database.runSync("ALTER TABLE custom_quest ADD COLUMN source TEXT NOT NULL DEFAULT 'manual'");
  } catch {
    // Column already exists
  }

  try {
    database.runSync('ALTER TABLE custom_quest ADD COLUMN activityType TEXT');
  } catch {
    // Column already exists
  }

  try {
    database.runSync('ALTER TABLE custom_quest ADD COLUMN linkedMapSessionId TEXT');
  } catch {
    // Column already exists
  }

  try {
    database.runSync('ALTER TABLE custom_quest ADD COLUMN distanceMeters REAL NOT NULL DEFAULT 0');
  } catch {
    // Column already exists
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
      ['gym', 'Gym', 'STR', 25, 'daily', now, now],
      ['coding', 'Coding', 'INT', 25, 'daily', now, now],
      ['reading', 'Reading', 'WIS', 20, 'daily', now, now],
      ['social', 'Social', 'CHA', 25, 'weekly', now, now],
      ['sleep', 'Sleep well', 'VIT', 20, 'daily', now, now],
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
    for (const item of ITEM_DEFINITIONS) {
      insertItemDefinition(database, item, now);
    }
  }

  // Migration: ensure any newly added catalog items are present.
  const now = new Date().toISOString();
  for (const item of ITEM_DEFINITIONS) {
    const exists = database.getFirstSync<{ count: number }>(
      'SELECT COUNT(*) as count FROM item WHERE id = ?',
      [item.id]
    );
    if ((exists?.count ?? 0) > 0) {
      // Keep unlockedAt, but normalize catalog fields for consistent effects/UI.
      database.runSync(
        'UPDATE item SET name = ?, statBonus = ?, bonusAmount = ?, unlockCondition = ? WHERE id = ?',
        [item.name, item.stat, 0, item.unlockLabel, item.id]
      );
      continue;
    }
    insertItemDefinition(database, item, now);
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
      normalizeHabitXpReward(habit.xpReward),
      habit.frequency,
      now,
      now,
    ]
  );
}

export function dbNormalizeHabitRewards(): void {
  const database = getDb();
  const habits = database.getAllSync<Pick<Habit, 'id' | 'xpReward'>>('SELECT id, xpReward FROM habit');
  const now = new Date().toISOString();

  for (const habit of habits ?? []) {
    const normalizedXp = normalizeHabitXpReward(habit.xpReward);
    if (normalizedXp === habit.xpReward) continue;

    database.runSync('UPDATE habit SET xpReward = ?, updatedAt = ? WHERE id = ?', [
      normalizedXp,
      now,
      habit.id,
    ]);
  }
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

// --- Achievements ---
export function dbGetUnlockedAchievements(): { achievementId: AchievementId; unlockedAt: string }[] {
  const database = getDb();
  const rows = database.getAllSync<{ achievementId: AchievementId; unlockedAt: string }>(
    'SELECT achievementId, unlockedAt FROM achievement_unlock ORDER BY unlockedAt ASC'
  );
  return rows ?? [];
}

export function dbUnlockAchievement(achievementId: AchievementId): void {
  const database = getDb();
  const now = new Date().toISOString();
  database.runSync(
    'INSERT OR IGNORE INTO achievement_unlock (achievementId, unlockedAt) VALUES (?, ?)',
    [achievementId, now]
  );
}

/** Total completed quests across recurring habits and custom quests. */
export function dbGetTotalCompletedQuestCount(): number {
  const database = getDb();
  const row = database.getFirstSync<{ total: number }>(
    `
      SELECT
        (SELECT COUNT(*) FROM habit_log) +
        (SELECT COUNT(*) FROM custom_quest WHERE completedAt IS NOT NULL) AS total
    `
  );
  return row?.total ?? 0;
}

/** Completed quest count for a stat across habits + custom quests. */
export function dbGetCompletedQuestCountForStat(stat: StatType): number {
  const database = getDb();
  const row = database.getFirstSync<{ total: number }>(
    `
      SELECT
        (SELECT COUNT(*)
         FROM habit_log hl
         INNER JOIN habit h ON h.id = hl.habitId
         WHERE h.statReward = ?) +
        (SELECT COUNT(*)
         FROM custom_quest cq
         WHERE cq.completedAt IS NOT NULL AND cq.statReward = ?) AS total
    `,
    [stat, stat]
  );
  return row?.total ?? 0;
}

/** Distinct UTC quest completion day keys (YYYY-MM-DD) across all quest types. */
export function dbGetAllCompletedQuestDayKeys(): string[] {
  const database = getDb();
  const rows = database.getAllSync<{ day: string }>(
    `
      SELECT day
      FROM (
        SELECT SUBSTR(completedAt, 1, 10) AS day FROM habit_log
        UNION
        SELECT SUBSTR(completedAt, 1, 10) AS day FROM custom_quest WHERE completedAt IS NOT NULL
      )
      ORDER BY day ASC
    `
  );
  return (rows ?? []).map((row) => row.day);
}

/** Total XP earned today from completed habits + custom quests. */
export function dbGetTodayQuestXp(): number {
  const database = getDb();
  const today = new Date().toISOString().slice(0, 10);
  const start = `${today}T00:00:00.000Z`;
  const end = `${today}T23:59:59.999Z`;
  const row = database.getFirstSync<{ total: number }>(
    `
      SELECT
        COALESCE(
          (SELECT SUM(h.xpReward + hl.bonusXp)
           FROM habit_log hl
           INNER JOIN habit h ON h.id = hl.habitId
           WHERE hl.completedAt >= ? AND hl.completedAt <= ?),
          0
        ) +
        COALESCE(
          (SELECT SUM(cq.xpReward)
           FROM custom_quest cq
           WHERE cq.completedAt IS NOT NULL AND cq.completedAt >= ? AND cq.completedAt <= ?),
          0
        ) AS total
    `,
    [start, end, start, end]
  );
  return row?.total ?? 0;
}

export interface CompletedQuestEvent {
  completedAt: string;
  dayKey: string;
  statReward: StatType;
  xpReward: number;
  source: 'habit' | 'custom';
  habitId: string | null;
}

/** Full quest completion timeline across habits and custom quests. */
export function dbGetCompletedQuestEvents(): CompletedQuestEvent[] {
  const database = getDb();
  const rows = database.getAllSync<{
    completedAt: string;
    dayKey: string;
    statReward: StatType;
    xpReward: number;
    source: string;
    habitId: string | null;
  }>(
    `
      SELECT
        hl.completedAt AS completedAt,
        SUBSTR(hl.completedAt, 1, 10) AS dayKey,
        h.statReward AS statReward,
        (h.xpReward + hl.bonusXp) AS xpReward,
        'habit' AS source,
        hl.habitId AS habitId
      FROM habit_log hl
      INNER JOIN habit h ON h.id = hl.habitId
      UNION ALL
      SELECT
        cq.completedAt AS completedAt,
        SUBSTR(cq.completedAt, 1, 10) AS dayKey,
        cq.statReward AS statReward,
        cq.xpReward AS xpReward,
        'custom' AS source,
        NULL AS habitId
      FROM custom_quest cq
      WHERE cq.completedAt IS NOT NULL
      ORDER BY completedAt ASC
    `
  );

  return (rows ?? []).map((row) => ({
    completedAt: row.completedAt,
    dayKey: row.dayKey,
    statReward: row.statReward,
    xpReward: row.xpReward,
    source: row.source === 'habit' ? 'habit' : 'custom',
    habitId: row.habitId,
  }));
}

export function dbGetCustomHabitCount(): number {
  const database = getDb();
  const row = database.getFirstSync<{ count: number }>(
    "SELECT COUNT(*) as count FROM habit WHERE id LIKE 'habit_%'"
  );
  return row?.count ?? 0;
}

export function dbGetCustomQuestCreatedCount(): number {
  const database = getDb();
  const row = database.getFirstSync<{ count: number }>(
    'SELECT COUNT(*) as count FROM custom_quest'
  );
  return row?.count ?? 0;
}

export function dbGetUnlockedItemCount(): number {
  const database = getDb();
  const row = database.getFirstSync<{ count: number }>(
    'SELECT COUNT(*) as count FROM item WHERE unlockedAt IS NOT NULL'
  );
  return row?.count ?? 0;
}

export function dbGetTotalItemCount(): number {
  const database = getDb();
  const row = database.getFirstSync<{ count: number }>(
    'SELECT COUNT(*) as count FROM item'
  );
  return row?.count ?? 0;
}

export function dbGetDailyHabitIds(): string[] {
  const database = getDb();
  const rows = database.getAllSync<{ id: string }>(
    "SELECT id FROM habit WHERE frequency = 'daily'"
  );
  return (rows ?? []).map((row) => row.id);
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
    DELETE FROM achievement_unlock;
    DELETE FROM map_activity_session;
    DELETE FROM settings WHERE key LIKE 'weekly_bonus_processed_%' OR key = 'quest_longest_streak';
  `);

  // Re-seed user (name = null so welcome modal appears)
  const now = new Date().toISOString();
  database.runSync(
    'INSERT INTO user (id, name, level, xp, str, int, wis, cha, vit, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    ['default', null, 1, 0, 0, 0, 0, 0, 0, now, now]
  );

  // Re-seed default habits
  const defaults = [
    ['gym', 'Gym', 'STR', 25, 'daily', now, now],
    ['coding', 'Coding', 'INT', 25, 'daily', now, now],
    ['reading', 'Reading', 'WIS', 20, 'daily', now, now],
    ['social', 'Social', 'CHA', 25, 'weekly', now, now],
    ['sleep', 'Sleep well', 'VIT', 20, 'daily', now, now],
  ];
  for (const row of defaults) {
    database.runSync(
      'INSERT INTO habit (id, title, statReward, xpReward, frequency, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
      row
    );
  }

  // Re-seed default items (MVP catalog)
  for (const item of ITEM_DEFINITIONS) {
    insertItemDefinition(database, item, now);
  }
}

// --- Custom Quests ---

export function dbCreateCustomQuest(quest: Omit<CustomQuest, 'completedAt'>): void {
  const database = getDb();
  database.runSync(
    `
      INSERT INTO custom_quest (
        id,
        title,
        statReward,
        difficulty,
        xpReward,
        completedAt,
        createdAt,
        source,
        activityType,
        linkedMapSessionId,
        distanceMeters
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      quest.id,
      quest.title,
      quest.statReward,
      quest.difficulty,
      quest.xpReward,
      null,
      quest.createdAt,
      quest.source,
      quest.activityType ?? null,
      quest.linkedMapSessionId ?? null,
      quest.distanceMeters,
    ]
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

export function dbGetCustomQuestById(questId: string): CustomQuest | null {
  const database = getDb();
  const row = database.getFirstSync<Record<string, unknown>>(
    'SELECT * FROM custom_quest WHERE id = ? LIMIT 1',
    [questId]
  );

  return row ? (row as unknown as CustomQuest) : null;
}

export function dbUpdateCustomQuest(
  questId: string,
  updates: Partial<Pick<CustomQuest, 'title' | 'difficulty' | 'xpReward' | 'activityType' | 'linkedMapSessionId' | 'distanceMeters'>>
): void {
  const database = getDb();
  const quest = dbGetCustomQuestById(questId);
  if (!quest) return;

  database.runSync(
    `
      UPDATE custom_quest
      SET title = ?, difficulty = ?, xpReward = ?, activityType = ?, linkedMapSessionId = ?, distanceMeters = ?
      WHERE id = ?
    `,
    [
      updates.title ?? quest.title,
      updates.difficulty ?? quest.difficulty,
      updates.xpReward ?? quest.xpReward,
      updates.activityType ?? quest.activityType ?? null,
      updates.linkedMapSessionId ?? quest.linkedMapSessionId ?? null,
      updates.distanceMeters ?? quest.distanceMeters,
      questId,
    ]
  );
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

/** Whether at least one quest for a given stat has been completed today. */
export function dbHasCompletedQuestForStatToday(stat: StatType): boolean {
  return dbGetCompletedQuestCountForStatToday(stat) > 0;
}

/** Completed quest count for a stat across habits + custom quests for today. */
export function dbGetCompletedQuestCountForStatToday(stat: StatType): number {
  const database = getDb();
  const today = new Date().toISOString().slice(0, 10);
  const start = `${today}T00:00:00.000Z`;
  const end = `${today}T23:59:59.999Z`;
  const row = database.getFirstSync<{ count: number }>(
    `
      SELECT
        (SELECT COUNT(*)
         FROM habit_log hl
         INNER JOIN habit h ON h.id = hl.habitId
         WHERE h.statReward = ? AND hl.completedAt >= ? AND hl.completedAt <= ?) +
        (SELECT COUNT(*)
         FROM custom_quest cq
         WHERE cq.completedAt IS NOT NULL AND cq.statReward = ? AND cq.completedAt >= ? AND cq.completedAt <= ?) AS count
    `,
    [stat, start, end, stat, start, end]
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

type MapActivitySessionRow = Omit<MapActivitySession, 'routeCoordinates'> & {
  routeCoordinatesJson: string;
};

function deserializeMapActivitySession(row: MapActivitySessionRow): MapActivitySession {
  let routeCoordinates: MapCoordinate[] = [];

  try {
    const parsed = JSON.parse(row.routeCoordinatesJson) as unknown;
    if (Array.isArray(parsed)) {
      routeCoordinates = parsed.filter(
        (coordinate): coordinate is MapCoordinate =>
          typeof coordinate === 'object' &&
          coordinate !== null &&
          typeof (coordinate as MapCoordinate).latitude === 'number' &&
          typeof (coordinate as MapCoordinate).longitude === 'number'
      );
    }
  } catch {
    routeCoordinates = [];
  }

  return {
    id: row.id,
    activityType: row.activityType,
    difficulty: row.difficulty,
    distanceMeters: row.distanceMeters,
    elapsedMs: row.elapsedMs,
    startedAt: row.startedAt,
    endedAt: row.endedAt,
    xpMultiplier: row.xpMultiplier,
    routeCoordinates,
  };
}

export function dbCreateMapActivitySession(session: MapActivitySession): void {
  const database = getDb();
  database.runSync(
    `
      INSERT INTO map_activity_session (
        id,
        activityType,
        difficulty,
        distanceMeters,
        elapsedMs,
        startedAt,
        endedAt,
        xpMultiplier,
        routeCoordinatesJson
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      session.id,
      session.activityType,
      session.difficulty,
      session.distanceMeters,
      session.elapsedMs,
      session.startedAt,
      session.endedAt,
      session.xpMultiplier,
      JSON.stringify(session.routeCoordinates),
    ]
  );
}

export function dbGetMapActivitySessions(): MapActivitySession[] {
  const database = getDb();
  const rows = database.getAllSync<MapActivitySessionRow>(
    'SELECT * FROM map_activity_session ORDER BY endedAt DESC'
  );

  return (rows ?? []).map(deserializeMapActivitySession);
}

export function dbGetMapActivitySessionById(sessionId: string): MapActivitySession | null {
  const database = getDb();
  const row = database.getFirstSync<MapActivitySessionRow>(
    'SELECT * FROM map_activity_session WHERE id = ? LIMIT 1',
    [sessionId]
  );

  return row ? deserializeMapActivitySession(row) : null;
}
