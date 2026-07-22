import { describe, expect, it } from "vitest";

import { createDatabaseInitializer } from "./databaseInitializer";
import type { DatabaseMigration } from "./migrations";
import { createInMemorySqliteDatabase } from "./testing/inMemorySqliteDatabase";

function migration(
  version: number,
  statements: readonly string[],
): DatabaseMigration {
  return {
    version,
    name: `migration_${version}`,
    up: async (database) => {
      await statements.reduce(async (previous, sql) => {
        await previous;
        await database.execute(sql);
      }, Promise.resolve());
    },
  };
}

describe("createDatabaseInitializer", () => {
  it("creates schema_version and records the first migration", async () => {
    const database = createInMemorySqliteDatabase();
    const initializer = createDatabaseInitializer({
      database,
      migrations: [
        migration(1, [
          "CREATE TABLE IF NOT EXISTS example_items (id TEXT PRIMARY KEY)",
        ]),
      ],
    });

    const result = await initializer.initialize();

    expect(result.ok).toBe(true);
    expect(await database.getAppliedMigrationVersions()).toEqual([1]);
    expect(database.hasTable("schema_version")).toBe(true);
    expect(database.hasTable("example_items")).toBe(true);
  });

  it("does not run migrations again after repeated initialization", async () => {
    const database = createInMemorySqliteDatabase();
    const initializer = createDatabaseInitializer({
      database,
      migrations: [
        migration(1, [
          "CREATE TABLE IF NOT EXISTS example_items (id TEXT PRIMARY KEY)",
          "INSERT INTO example_items (id) VALUES ('first')",
        ]),
      ],
    });

    await initializer.initialize();
    const secondResult = await initializer.initialize();

    expect(secondResult.ok).toBe(true);
    expect(database.selectAll("example_items")).toEqual([{ id: "first" }]);
    expect(await database.getAppliedMigrationVersions()).toEqual([1]);
  });

  it("runs pending migrations in ascending version order", async () => {
    const database = createInMemorySqliteDatabase();
    const executionOrder: number[] = [];
    const migrations: DatabaseMigration[] = [3, 1, 2].map((version) => ({
      version,
      name: `migration_${version}`,
      up: async () => {
        executionOrder.push(version);
      },
    }));
    const initializer = createDatabaseInitializer({ database, migrations });

    const result = await initializer.initialize();

    expect(result.ok).toBe(true);
    expect(executionOrder).toEqual([1, 2, 3]);
    expect(await database.getAppliedMigrationVersions()).toEqual([1, 2, 3]);
  });

  it("rolls back a failed migration and does not record the failed version", async () => {
    const database = createInMemorySqliteDatabase();
    const initializer = createDatabaseInitializer({
      database,
      migrations: [
        migration(1, [
          "CREATE TABLE IF NOT EXISTS stable_items (id TEXT PRIMARY KEY)",
        ]),
        {
          version: 2,
          name: "broken_migration",
          up: async (transaction) => {
            await transaction.execute(
              "CREATE TABLE IF NOT EXISTS transient_items (id TEXT PRIMARY KEY)",
            );
            throw new Error("模拟迁移失败");
          },
        },
        migration(3, [
          "CREATE TABLE IF NOT EXISTS skipped_items (id TEXT PRIMARY KEY)",
        ]),
      ],
    });

    const result = await initializer.initialize();

    expect(result).toEqual({
      ok: false,
      error: "数据库初始化失败：迁移 2（broken_migration）执行失败",
    });
    expect(await database.getAppliedMigrationVersions()).toEqual([1]);
    expect(database.hasTable("stable_items")).toBe(true);
    expect(database.hasTable("transient_items")).toBe(false);
    expect(database.hasTable("skipped_items")).toBe(false);
  });
});
