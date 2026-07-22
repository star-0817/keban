import { describe, expect, it } from "vitest";

import type { EntityId } from "../domain";

import { createDatabaseInitializer } from "./databaseInitializer";
import { INITIAL_MIGRATIONS } from "./migrations";
import {
  createCourseRepository,
  createScheduleEventRepository,
} from "./scheduleRepository";
import { createInMemorySqliteDatabase } from "./testing/inMemorySqliteDatabase";

async function setupRepositories() {
  const database = createInMemorySqliteDatabase();
  const initializer = createDatabaseInitializer({
    database,
    migrations: INITIAL_MIGRATIONS,
    now: () => new Date("2026-07-23T00:00:00.000Z"),
  });
  const initialization = await initializer.initialize();
  expect(initialization.ok).toBe(true);

  return {
    database,
    courses: createCourseRepository({
      database,
      now: () => new Date("2026-07-23T01:00:00.000Z"),
    }),
    events: createScheduleEventRepository({
      database,
      now: () => new Date("2026-07-23T01:00:00.000Z"),
    }),
  };
}

describe("schedule migrations", () => {
  it("adds schedule tables after the existing migrations and skips repeated initialization", async () => {
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
    expect(database.hasTable("courses")).toBe(true);
    expect(database.hasTable("schedule_events")).toBe(true);
  });
});

describe("createCourseRepository", () => {
  it("creates, reads, lists, updates and deletes courses", async () => {
    const { courses } = await setupRepositories();
    const created = await courses.create({
      id: "course-1" as EntityId,
      name: " 数学 ",
      teacher: " 王老师 ",
      location: " A101 ",
      weekday: 1,
      startSlot: 1,
      endSlot: 2,
      startTime: "08:00",
      endTime: "09:40",
      termId: "2026-fall",
    });

    expect(created).toMatchObject({
      name: "数学",
      teacher: "王老师",
      location: "A101",
      createdAt: "2026-07-23T01:00:00.000Z",
      updatedAt: "2026-07-23T01:00:00.000Z",
    });
    await expect(courses.findById(created.id)).resolves.toEqual(created);
    await expect(courses.list()).resolves.toEqual([created]);
    await expect(courses.listByWeekdayAndTerm(1, "2026-fall")).resolves.toEqual(
      [created],
    );

    const updated = await courses.update(created.id, {
      name: "线性代数",
      startSlot: 3,
      endSlot: 4,
      startTime: "10:00",
      endTime: "11:40",
      now: () => new Date("2026-07-24T01:00:00.000Z"),
    });

    expect(updated).toEqual({
      ...created,
      name: "线性代数",
      startSlot: 3,
      endSlot: 4,
      startTime: "10:00",
      endTime: "11:40",
      updatedAt: "2026-07-24T01:00:00.000Z",
    });

    await courses.delete(created.id);
    await expect(courses.findById(created.id)).resolves.toBeNull();
  });

  it("sorts weekday queries by start slot", async () => {
    const { courses } = await setupRepositories();

    await courses.create({
      name: "晚课",
      weekday: 3,
      startSlot: 7,
      endSlot: 8,
      startTime: "19:00",
      endTime: "20:40",
      termId: "2026-fall",
    });
    await courses.create({
      name: "早课",
      weekday: 3,
      startSlot: 1,
      endSlot: 2,
      startTime: "08:00",
      endTime: "09:40",
      termId: "2026-fall",
    });

    await expect(courses.listByWeekdayAndTerm(3, "2026-fall")).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "早课" }),
        expect.objectContaining({ name: "晚课" }),
      ]),
    );
    expect(
      (await courses.listByWeekdayAndTerm(3, "2026-fall")).map(
        (course) => course.name,
      ),
    ).toEqual(["早课", "晚课"]);
  });

  it("rejects duplicate IDs and conflicting courses with Chinese errors", async () => {
    const { courses } = await setupRepositories();
    const input = {
      id: "course-1" as EntityId,
      name: "数学",
      weekday: 1,
      startSlot: 1,
      endSlot: 2,
      startTime: "08:00",
      endTime: "09:40",
      termId: "2026-fall",
    };

    await courses.create(input);

    await expect(courses.create(input)).rejects.toThrow("课程 ID 已存在");
    await expect(
      courses.create({
        name: "英语",
        weekday: 1,
        startSlot: 2,
        endSlot: 3,
        startTime: "09:00",
        endTime: "10:40",
        termId: "2026-fall",
      }),
    ).rejects.toThrow("课程时间与已有课程冲突");

    await expect(
      courses.create({
        name: "物理",
        weekday: 1,
        startSlot: 3,
        endSlot: 4,
        startTime: "10:00",
        endTime: "11:40",
        termId: "2026-fall",
      }),
    ).resolves.toMatchObject({ name: "物理" });
  });
});

describe("createScheduleEventRepository", () => {
  it("creates, reads, lists, updates and deletes schedule events", async () => {
    const { events } = await setupRepositories();
    const created = await events.create({
      id: "event-1" as EntityId,
      title: " 考试 ",
      note: " 带学生证 ",
      startsAt: "2026-07-23T01:00:00.000Z",
      endsAt: "2026-07-23T02:00:00.000Z",
      location: " A101 ",
    });

    expect(created).toMatchObject({
      title: "考试",
      note: "带学生证",
      location: "A101",
    });
    await expect(events.findById(created.id)).resolves.toEqual(created);
    await expect(events.list()).resolves.toEqual([created]);
    await expect(
      events.listInUtcRange(
        "2026-07-23T00:00:00.000Z",
        "2026-07-23T03:00:00.000Z",
      ),
    ).resolves.toEqual([created]);

    const updated = await events.update(created.id, {
      title: "期中考试",
      note: "",
      endsAt: "2026-07-23T03:00:00.000Z",
      now: () => new Date("2026-07-24T01:00:00.000Z"),
    });

    expect(updated).toEqual({
      ...created,
      title: "期中考试",
      note: undefined,
      endsAt: "2026-07-23T03:00:00.000Z",
      updatedAt: "2026-07-24T01:00:00.000Z",
    });

    await events.delete(created.id);
    await expect(events.findById(created.id)).resolves.toBeNull();
  });

  it("returns range-overlapping events sorted by startsAt and excludes adjacent boundaries", async () => {
    const { events } = await setupRepositories();

    await events.create({
      title: "后一个",
      startsAt: "2026-07-23T03:00:00.000Z",
      endsAt: "2026-07-23T04:00:00.000Z",
    });
    await events.create({
      title: "前一个",
      startsAt: "2026-07-23T01:00:00.000Z",
      endsAt: "2026-07-23T01:30:00.000Z",
    });
    await events.create({
      title: "边界前",
      startsAt: "2026-07-23T00:00:00.000Z",
      endsAt: "2026-07-23T01:00:00.000Z",
    });

    expect(
      (
        await events.listInUtcRange(
          "2026-07-23T01:00:00.000Z",
          "2026-07-23T04:00:00.000Z",
        )
      ).map((event) => event.title),
    ).toEqual(["前一个", "后一个"]);
  });

  it("rejects duplicate IDs and overlapping events with Chinese errors", async () => {
    const { events } = await setupRepositories();
    const input = {
      id: "event-1" as EntityId,
      title: "考试",
      startsAt: "2026-07-23T01:00:00.000Z",
      endsAt: "2026-07-23T02:00:00.000Z",
    };

    await events.create(input);

    await expect(events.create(input)).rejects.toThrow("日程 ID 已存在");
    await expect(
      events.create({
        title: "班会",
        startsAt: "2026-07-23T01:30:00.000Z",
        endsAt: "2026-07-23T02:30:00.000Z",
      }),
    ).rejects.toThrow("日程时间与已有日程冲突");

    await expect(
      events.create({
        title: "自习",
        startsAt: "2026-07-23T02:00:00.000Z",
        endsAt: "2026-07-23T03:00:00.000Z",
      }),
    ).resolves.toMatchObject({ title: "自习" });
  });
});
