import { describe, expect, it } from "vitest";

import { toUtcIsoDateTime, type EntityId } from "../domain";
import { createDatabaseInitializer } from "../repositories/databaseInitializer";
import { INITIAL_MIGRATIONS } from "../repositories/migrations";
import {
  createCourseRepository,
  createScheduleEventRepository,
} from "../repositories/scheduleRepository";
import { createInMemorySqliteDatabase } from "../repositories/testing/inMemorySqliteDatabase";

import { createStudyToolsService } from "./studyToolsService";

async function createService() {
  const database = createInMemorySqliteDatabase();
  const initializer = createDatabaseInitializer({
    database,
    migrations: INITIAL_MIGRATIONS,
    now: () => new Date("2026-07-23T00:00:00.000Z"),
  });
  const initialized = await initializer.initialize();
  expect(initialized.ok).toBe(true);

  return createStudyToolsService({
    courseRepository: createCourseRepository({
      database,
      now: () => new Date("2026-07-23T01:00:00.000Z"),
    }),
    scheduleEventRepository: createScheduleEventRepository({
      database,
      now: () => new Date("2026-07-23T01:00:00.000Z"),
    }),
    isTemporary: true,
  });
}

describe("createStudyToolsService", () => {
  it("manages courses through the course repository", async () => {
    const service = await createService();

    const created = await service.addCourse({
      id: "course-1" as EntityId,
      name: "高等数学",
      teacher: "王老师",
      location: "A101",
      weekday: 1,
      startSlot: 1,
      endSlot: 2,
      startTime: "08:00",
      endTime: "09:40",
      termId: "2026-fall",
    });

    expect(await service.listCoursesForDay(1, "2026-fall")).toEqual([created]);

    const updated = await service.updateCourse(created.id, {
      name: "线性代数",
      startSlot: 3,
      endSlot: 4,
      startTime: "10:00",
      endTime: "11:40",
    });

    expect(updated.name).toBe("线性代数");
    expect(
      (await service.listCoursesForDay(1, "2026-fall"))[0]?.startSlot,
    ).toBe(3);

    await service.deleteCourse(created.id);

    expect(await service.listCoursesForDay(1, "2026-fall")).toEqual([]);
  });

  it("surfaces Chinese conflict errors from schedule repositories", async () => {
    const service = await createService();

    await service.addCourse({
      name: "高等数学",
      weekday: 2,
      startSlot: 1,
      endSlot: 2,
      startTime: "08:00",
      endTime: "09:40",
      termId: "2026-fall",
    });

    await expect(
      service.addCourse({
        name: "大学英语",
        weekday: 2,
        startSlot: 2,
        endSlot: 3,
        startTime: "09:00",
        endTime: "10:40",
        termId: "2026-fall",
      }),
    ).rejects.toThrow("课程时间与已有课程冲突");
  });

  it("manages schedule events by UTC range", async () => {
    const service = await createService();

    const created = await service.addEvent({
      id: "event-1" as EntityId,
      title: "期中考试",
      startsAt: "2026-07-23T01:00:00.000Z",
      endsAt: "2026-07-23T02:00:00.000Z",
      location: "A101",
      note: "带学生证",
    });

    expect(
      await service.listEventsInRange(
        "2026-07-23T00:00:00.000Z",
        "2026-07-23T03:00:00.000Z",
      ),
    ).toEqual([created]);

    await expect(
      service.addEvent({
        title: "班会",
        startsAt: "2026-07-23T01:30:00.000Z",
        endsAt: "2026-07-23T02:30:00.000Z",
      }),
    ).rejects.toThrow("日程时间与已有日程冲突");

    await service.deleteEvent(created.id);

    expect(
      await service.listEventsInRange(
        "2026-07-23T00:00:00.000Z",
        "2026-07-23T03:00:00.000Z",
      ),
    ).toEqual([]);
  });

  it("calculates GPA and attendance through study domain rules", async () => {
    const service = await createService();

    const gpa = service.calculateGpa([
      {
        id: "course-1" as EntityId,
        name: "高等数学",
        credit: 3,
        grade: { type: "score", score: 95 },
      },
      {
        id: "course-2" as EntityId,
        name: "体育",
        credit: 1,
        grade: { type: "level", level: "及格" },
      },
    ]);
    const attendance = service.calculateAttendance(
      [
        {
          id: "record-1" as EntityId,
          courseId: "course-1" as EntityId,
          status: "出勤",
          occurredAt: toUtc("2026-07-23T01:00:00.000Z"),
        },
        {
          id: "record-2" as EntityId,
          courseId: "course-1" as EntityId,
          status: "迟到",
          occurredAt: toUtc("2026-07-24T01:00:00.000Z"),
        },
      ],
      { groupBy: { type: "course" } },
    );

    expect(gpa.ok && gpa.value.weightedGpa).toBe(3.25);
    expect(attendance.ok && attendance.value.attendanceRate).toBe(75);
    expect(attendance.ok && attendance.value.groups[0]?.key).toBe("course-1");
    expect(service.temporaryDataNotice).toBe(
      "当前为本地临时数据，重启后会清空。",
    );
  });
});

function toUtc(value: string) {
  return toUtcIsoDateTime(new Date(value));
}
