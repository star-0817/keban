import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";

import { toUtcIsoDateTime, type EntityId } from "../domain";
import type { Course } from "../domain/schedule";
import { calculateAttendance, calculateGpa } from "../domain/study";
import type { StudyToolsService } from "../services/studyToolsService";

import { useStudyToolsStore } from "./studyTools";

const fixedCourse: Course = {
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
  createdAt: toUtc("2026-07-23T01:00:00.000Z"),
  updatedAt: toUtc("2026-07-23T01:00:00.000Z"),
};

function createFakeService(): StudyToolsService {
  return {
    isTemporary: true,
    temporaryDataNotice: "当前为本地临时数据，重启后会清空。",
    listCoursesForDay: async () => [fixedCourse],
    addCourse: async () => fixedCourse,
    updateCourse: async () => fixedCourse,
    deleteCourse: async () => undefined,
    listEventsInRange: async () => [],
    addEvent: async (input) => ({
      id: "event-1" as EntityId,
      title: input.title,
      startsAt: toUtc(input.startsAt),
      endsAt: toUtc(input.endsAt),
      location: input.location,
      note: input.note,
      createdAt: toUtc("2026-07-23T01:00:00.000Z"),
      updatedAt: toUtc("2026-07-23T01:00:00.000Z"),
    }),
    updateEvent: async (id, input) => ({
      id,
      title: input.title ?? "期中考试",
      startsAt: toUtc(input.startsAt ?? "2026-07-23T01:00:00.000Z"),
      endsAt: toUtc(input.endsAt ?? "2026-07-23T02:00:00.000Z"),
      location: input.location,
      note: input.note,
      createdAt: toUtc("2026-07-23T01:00:00.000Z"),
      updatedAt: toUtc("2026-07-23T01:00:00.000Z"),
    }),
    deleteEvent: async () => undefined,
    calculateGpa,
    calculateAttendance,
  };
}

describe("useStudyToolsStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("loads courses and exposes the temporary notice", async () => {
    const store = useStudyToolsStore();

    store.setService(createFakeService());
    await store.loadCourses(1, "2026-fall");

    expect(store.courses).toEqual([fixedCourse]);
    expect(store.temporaryDataNotice).toBe(
      "当前为本地临时数据，重启后会清空。",
    );
  });

  it("stores calculator results and Chinese validation errors", async () => {
    const store = useStudyToolsStore();

    store.setService(createFakeService());
    await store.calculateGpa([
      {
        id: "course-1" as EntityId,
        name: "高等数学",
        credit: 3,
        grade: { type: "score", score: 95 },
      },
    ]);
    await store.calculateAttendance([
      {
        id: "record-1" as EntityId,
        courseId: "course-1" as EntityId,
        status: "出勤",
        occurredAt: toUtc("2026-07-23T01:00:00.000Z"),
      },
    ]);

    expect(store.gpaResult?.weightedGpa).toBe(4);
    expect(store.attendanceResult?.attendanceRate).toBe(100);

    await store.calculateGpa([]);

    expect(store.gpaResult).toBeNull();
    expect(store.errorMessage).toBe("没有可计算的课程");
  });
});

function toUtc(value: string) {
  return toUtcIsoDateTime(new Date(value));
}
