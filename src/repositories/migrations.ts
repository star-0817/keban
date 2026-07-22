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
];
