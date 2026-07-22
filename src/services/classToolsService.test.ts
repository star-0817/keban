import { describe, expect, it } from "vitest";

import { createDatabaseInitializer } from "../repositories/databaseInitializer";
import { INITIAL_MIGRATIONS } from "../repositories/migrations";
import { createRosterRepository } from "../repositories/rosterRepository";
import { createInMemorySqliteDatabase } from "../repositories/testing/inMemorySqliteDatabase";

import { createClassToolsService } from "./classToolsService";

async function setupService() {
  const database = createInMemorySqliteDatabase();
  const initializer = createDatabaseInitializer({
    database,
    migrations: INITIAL_MIGRATIONS,
  });
  const initialized = await initializer.initialize();
  expect(initialized.ok).toBe(true);

  return createClassToolsService({
    rosterRepository: createRosterRepository({
      database,
      now: () => new Date("2026-07-22T08:00:00.000Z"),
    }),
    seedFactory: () => "seed-issue-7",
  });
}

describe("createClassToolsService", () => {
  it("previews pasted roster text without writing until import is confirmed", async () => {
    const service = await setupService();

    const preview = service.previewImport(
      "姓名,学号,备注\n张三\n\n,2026002\n李四,2026003,组长",
    );

    expect(preview.summary).toEqual({
      validCount: 2,
      skippedCount: 1,
      errorCount: 1,
    });
    await expect(service.listStudents()).resolves.toEqual([]);

    const imported = await service.confirmImport(preview);

    expect(imported).toHaveLength(2);
    await expect(service.listStudents()).resolves.toMatchObject([
      { name: "张三" },
      { name: "李四", studentNo: "2026003", note: "组长" },
    ]);
  });

  it("draws students with typed exclusions and a generated seed", async () => {
    const service = await setupService();
    const [first, second, third] = await Promise.all([
      service.addStudent({ name: "张三" }),
      service.addStudent({ name: "李四" }),
      service.addStudent({ name: "王五" }),
    ]);

    const result = await service.drawStudents({
      count: 2,
      excludedStudentIds: [second.id],
      excludedNamesText: "不存在",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.seed).toBe("seed-issue-7");
    expect(result.value.selectedMembers).toHaveLength(2);
    expect(result.value.selectedMembers.map((member) => member.id)).toEqual(
      expect.arrayContaining([first.id, third.id]),
    );
    expect(
      result.value.selectedMembers.map((member) => member.id),
    ).not.toContain(second.id);
  });

  it("groups students by max size while excluding typed names", async () => {
    const service = await setupService();
    const students = await Promise.all(
      ["张三", "李四", "王五", "赵六", "钱七"].map((name) =>
        service.addStudent({ name }),
      ),
    );
    const excluded = students[4];

    const result = await service.groupStudents({
      mode: { type: "max-members-per-group", maxMembersPerGroup: 2 },
      excludedNamesText: "钱七",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const groupedIds = result.value.groups.flatMap((group) =>
      group.members.map((member) => member.id),
    );

    expect(result.value.seed).toBe("seed-issue-7");
    expect(result.value.groups).toHaveLength(2);
    expect(groupedIds).toHaveLength(4);
    expect(new Set(groupedIds).size).toBe(4);
    expect(groupedIds).not.toContain(excluded.id);
  });

  it("updates and deletes students through the repository boundary", async () => {
    const service = await setupService();
    const created = await service.addStudent({ name: "张三" });

    await service.updateStudent(created.id, { name: "张三同学", note: "班长" });
    await expect(service.listStudents()).resolves.toMatchObject([
      { id: created.id, name: "张三同学", note: "班长" },
    ]);

    await service.deleteStudent(created.id);
    await expect(service.listStudents()).resolves.toEqual([]);
  });
});
