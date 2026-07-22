import type { SqliteTransaction } from "../plugins/sqlite";

export type DatabaseMigration = Readonly<{
  version: number;
  name: string;
  up(transaction: SqliteTransaction): Promise<void>;
}>;

export type AppliedMigrationRow = Readonly<{
  version: number;
  name: string;
  applied_at: string;
}>;

export const SCHEMA_VERSION_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TEXT NOT NULL
)`;

export const INITIAL_MIGRATIONS: readonly DatabaseMigration[] = [
  {
    version: 1,
    name: "create_schema_version",
    up: async () => {
      return;
    },
  },
  {
    version: 2,
    name: "create_roster_tables",
    up: async (transaction) => {
      await transaction.execute(`
        CREATE TABLE IF NOT EXISTS rosters (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          metadata TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `);
      await transaction.execute(`
        CREATE TABLE IF NOT EXISTS students (
          id TEXT PRIMARY KEY,
          roster_id TEXT,
          name TEXT NOT NULL,
          student_no TEXT,
          note TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `);
    },
  },
  {
    version: 3,
    name: "create_schedule_tables",
    up: async (transaction) => {
      await transaction.execute(`
        CREATE TABLE IF NOT EXISTS courses (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          teacher TEXT,
          location TEXT,
          weekday INTEGER NOT NULL,
          start_slot INTEGER NOT NULL,
          end_slot INTEGER NOT NULL,
          start_time TEXT NOT NULL,
          end_time TEXT NOT NULL,
          term_id TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `);
      await transaction.execute(`
        CREATE TABLE IF NOT EXISTS schedule_events (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          note TEXT,
          starts_at TEXT NOT NULL,
          ends_at TEXT NOT NULL,
          location TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `);
    },
  },
];
