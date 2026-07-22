import { describe, expect, it } from "vitest";

import type {
  OpenSqliteDatabaseOptions,
  SqliteDatabase,
  SqliteDatabaseAdapter,
} from "../plugins/sqlite";
import {
  INITIAL_MIGRATIONS,
  type DatabaseMigration,
} from "../repositories/migrations";
import { createInMemorySqliteDatabase } from "../repositories/testing/inMemorySqliteDatabase";

import { createLocalDatabaseRuntime } from "./localDatabaseService";

function createSuccessfulAdapter(
  database: SqliteDatabase = createInMemorySqliteDatabase(),
): SqliteDatabaseAdapter & { readonly openedNames: readonly string[] } {
  const openedNames: string[] = [];

  return {
    openedNames,
    openDatabase: async (options: OpenSqliteDatabaseOptions) => {
      openedNames.push(options.name);
      return database;
    },
  };
}

describe("createLocalDatabaseRuntime", () => {
  it("uses a native Android SQLite adapter when it opens and initializes", async () => {
    const database = createInMemorySqliteDatabase();
    const adapter = createSuccessfulAdapter(database);
    const runtime = await createLocalDatabaseRuntime({
      nativeAdapter: adapter,
      migrations: [],
      platform: { isAndroidApp: true },
    });

    expect(runtime.isTemporary).toBe(false);
    expect(runtime.notice).toBe("数据仅保存在本机，重启后仍会保留。");
    expect(adapter.openedNames).toEqual(["keban.db"]);
    expect(runtime.database).toBe(database);
    expect(runtime.classToolsService.temporaryDataNotice).toBe(
      "数据仅保存在本机，重启后仍会保留。",
    );
    expect(runtime.studyToolsService.temporaryDataNotice).toBe(
      "数据仅保存在本机，重启后仍会保留。",
    );
  });

  it("falls back to one in-memory database when the native adapter is unavailable", async () => {
    const runtime = await createLocalDatabaseRuntime({
      nativeAdapter: {
        openDatabase: async () => {
          throw new Error("原生数据库不可用");
        },
      },
      migrations: [],
      platform: { isAndroidApp: true },
    });

    expect(runtime.isTemporary).toBe(true);
    expect(runtime.notice).toBe("当前为本地临时数据，重启后会清空。");
    expect(runtime.fallbackReason).toBe(
      "数据库降级为内存模式：原生数据库不可用",
    );
    expect(runtime.classToolsService.isTemporary).toBe(true);
    expect(runtime.studyToolsService.isTemporary).toBe(true);
  });

  it("initializes migrations once while class and study services share the same database", async () => {
    let migrationRuns = 0;
    const runtime = await createLocalDatabaseRuntime({
      nativeAdapter: createSuccessfulAdapter(),
      migrations: [
        ...INITIAL_MIGRATIONS,
        {
          version: 4,
          name: "create_shared_marker",
          up: async (transaction) => {
            migrationRuns += 1;
            await transaction.execute(
              "CREATE TABLE IF NOT EXISTS shared_items (id TEXT PRIMARY KEY)",
            );
          },
        } satisfies DatabaseMigration,
      ],
      platform: { isAndroidApp: true },
    });

    await runtime.classToolsService.addStudent({ name: "张三" });
    await runtime.studyToolsService.addCourse({
      name: "高等数学",
      weekday: 1,
      startSlot: 1,
      endSlot: 2,
      startTime: "08:00",
      endTime: "09:40",
      termId: "2026-fall",
    });

    expect(migrationRuns).toBe(1);
    await expect(
      runtime.classToolsService.listStudents(),
    ).resolves.toHaveLength(1);
    await expect(
      runtime.studyToolsService.listCoursesForDay(1, "2026-fall"),
    ).resolves.toHaveLength(1);
  });

  it("reports initialization errors in Chinese before falling back", async () => {
    const runtime = await createLocalDatabaseRuntime({
      nativeAdapter: createSuccessfulAdapter(),
      migrations: [
        {
          version: 1,
          name: "broken_migration",
          up: async () => {
            throw new Error("boom");
          },
        },
      ],
      platform: { isAndroidApp: true },
    });

    expect(runtime.isTemporary).toBe(true);
    expect(runtime.fallbackReason).toBe(
      "数据库降级为内存模式：数据库初始化失败：迁移 1（broken_migration）执行失败",
    );
  });
});
