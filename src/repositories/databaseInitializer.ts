import { ok, err, type Result, toUtcIsoDateTime } from "../domain";
import type { SqliteDatabase } from "../plugins/sqlite";

import {
  SCHEMA_VERSION_TABLE_SQL,
  type AppliedMigrationRow,
  type DatabaseMigration,
} from "./migrations";

export type DatabaseInitializationResult = Result<
  { readonly currentVersion: number },
  string
>;

export type DatabaseInitializer = Readonly<{
  initialize(): Promise<DatabaseInitializationResult>;
}>;

export type CreateDatabaseInitializerOptions = Readonly<{
  database: SqliteDatabase;
  migrations: readonly DatabaseMigration[];
  now?: () => Date;
}>;

export function createDatabaseInitializer(
  options: CreateDatabaseInitializerOptions,
): DatabaseInitializer {
  const sortedMigrations = sortAndValidateMigrations(options.migrations);
  const now = options.now ?? (() => new Date());

  return {
    initialize: async () => {
      const { database } = options;

      try {
        await database.execute(SCHEMA_VERSION_TABLE_SQL);
        const appliedVersions = await readAppliedVersions(database);
        const pendingMigrations = sortedMigrations.filter(
          (migration) => !appliedVersions.has(migration.version),
        );

        for (const migration of pendingMigrations) {
          try {
            await database.withTransaction(async (transaction) => {
              await migration.up(transaction);
              await transaction.execute(
                "INSERT INTO schema_version (version, name, applied_at) VALUES (?, ?, ?)",
                [migration.version, migration.name, toUtcIsoDateTime(now())],
              );
            });
          } catch {
            return err(
              `数据库初始化失败：迁移 ${migration.version}（${migration.name}）执行失败`,
            );
          }
        }

        const currentVersion =
          sortedMigrations.length === 0
            ? 0
            : sortedMigrations[sortedMigrations.length - 1].version;

        return ok({ currentVersion });
      } catch {
        return err("数据库初始化失败：无法准备版本记录表");
      }
    },
  };
}

async function readAppliedVersions(
  database: SqliteDatabase,
): Promise<ReadonlySet<number>> {
  const result = await database.query<AppliedMigrationRow>(
    "SELECT version, name, applied_at FROM schema_version ORDER BY version ASC",
  );

  return new Set(result.rows.map((row) => row.version));
}

function sortAndValidateMigrations(
  migrations: readonly DatabaseMigration[],
): readonly DatabaseMigration[] {
  const sorted = [...migrations].sort(
    (left, right) => left.version - right.version,
  );
  const seen = new Set<number>();

  sorted.forEach((migration) => {
    if (!Number.isInteger(migration.version) || migration.version <= 0) {
      throw new Error(`Invalid migration version: ${migration.version}`);
    }

    if (seen.has(migration.version)) {
      throw new Error(`Duplicate migration version: ${migration.version}`);
    }

    seen.add(migration.version);
  });

  return sorted;
}
