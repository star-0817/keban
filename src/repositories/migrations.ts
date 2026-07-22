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
];
