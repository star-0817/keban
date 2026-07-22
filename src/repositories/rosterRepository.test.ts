import { describe, expect, it } from "vitest";

import type { EntityId } from "../domain";

import { createDatabaseInitializer } from "./databaseInitializer";
import { INITIAL_MIGRATIONS } from "./migrations";
import {
  createRosterRepository,
  type CreateStudentInput,
} from "./rosterRepository";
import { createInMemorySqliteDatabase } from "./testing/inMemorySqliteDatabase";

async function setupRepository() {
  const database = createInMemorySqliteDatabase();
  const initializer = createDatabaseInitializer({
    database,
    migrations: INITIAL_MIGRATIONS,
    now: () => new Date("2026-07-22T08:00:00.000Z"),
  });
  const initialization = await initializer.initialize();
  expect(initialization.ok).toBe(true);

  return {
    database,
    repository: createRosterRepository({
      database,
      now: () => new Date("2026-07-22T09:00:00.000Z"),
    }),
  };
}

describe("roster migrations", () => {
  it("adds roster tables after the existing migration version", async () => {
    const database = createInMemorySqliteDatabase();
    const initializer = createDatabaseInitializer({
      database,
      migrations: INITIAL_MIGRATIONS,
    });

    const first = await initializer.initialize();
    const second = await initializer.initialize();

    expect(first).toEqual({ ok: true, value: { currentVersion: 3 } });
    expect(second).toEqual({ ok: true, value: { currentVersion: 3 } });
    expect(await database.getAppliedMigrationVersions()).toEqual([1, 2, 3]);
    expect(database.hasTable("rosters")).toBe(true);
    expect(database.hasTable("students")).toBe(true);
  });
});

describe("createRosterRepository", () => {
  it("creates and reads roster students", async () => {
    const { repository } = await setupRepository();
    const input: CreateStudentInput = {
      name: " 张三 ",
      studentNo: "2026001",
      note: "班长",
    };

    const created = await repository.create(input);

    expect(created).toMatchObject({
      name: "张三",
      studentNo: "2026001",
      note: "班长",
      createdAt: "2026-07-22T09:00:00.000Z",
      updatedAt: "2026-07-22T09:00:00.000Z",
    });
    await expect(repository.findById(created.id)).resolves.toEqual(created);
    await expect(repository.list()).resolves.toEqual([created]);
  });

  it("updates and deletes roster students", async () => {
    const { repository } = await setupRepository();
    const created = await repository.create({ name: "李四" });

    const updated = await repository.update(created.id, {
      name: " 李四同学 ",
      studentNo: "2026002",
      now: () => new Date("2026-07-23T09:00:00.000Z"),
    });

    expect(updated).toEqual({
      ...created,
      name: "李四同学",
      studentNo: "2026002",
      updatedAt: "2026-07-23T09:00:00.000Z",
    });

    await repository.delete(created.id);

    await expect(repository.findById(created.id)).resolves.toBeNull();
    await expect(repository.list()).resolves.toEqual([]);
  });

  it("throws Chinese validation and not-found errors", async () => {
    const { repository } = await setupRepository();

    await expect(repository.create({ name: "" })).rejects.toThrow(
      "姓名不能为空",
    );
    await expect(
      repository.update("missing" as EntityId, { name: "王五" }),
    ).rejects.toThrow("学生记录不存在");
  });
});
