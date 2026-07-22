import { describe, expect, it } from "vitest";

import type { EntityId } from "../ids";

import {
  createCourse,
  createScheduleEvent,
  doCoursesConflict,
  doScheduleEventsOverlap,
  listCoursesForWeekday,
  listScheduleEventsInUtcRange,
  updateCourse,
  updateScheduleEvent,
} from "./index";

const baseNow = () => new Date("2026-07-23T00:00:00.000Z");

describe("schedule domain courses", () => {
  it("creates and updates a normalized course", () => {
    const created = createCourse({
      id: "course-1" as EntityId,
      name: " 高等数学 ",
      teacher: " 王老师 ",
      location: " A101 ",
      weekday: 1,
      startSlot: 1,
      endSlot: 2,
      startTime: "08:00",
      endTime: "09:40",
      termId: "2026-fall",
      now: baseNow,
    });

    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }
    expect(created.value).toMatchObject({
      name: "高等数学",
      teacher: "王老师",
      location: "A101",
      weekday: 1,
      startSlot: 1,
      endSlot: 2,
      startTime: "08:00",
      endTime: "09:40",
      termId: "2026-fall",
      createdAt: "2026-07-23T00:00:00.000Z",
      updatedAt: "2026-07-23T00:00:00.000Z",
    });

    const updated = updateCourse(created.value, {
      teacher: "",
      location: "B202",
      now: () => new Date("2026-07-24T00:00:00.000Z"),
    });

    expect(updated).toEqual({
      ok: true,
      value: {
        ...created.value,
        teacher: undefined,
        location: "B202",
        updatedAt: "2026-07-24T00:00:00.000Z",
      },
    });
  });

  it("rejects invalid weekday, slot and lesson time values with Chinese errors", () => {
    expect(
      createCourse({
        name: "数学",
        weekday: 8,
        startSlot: 1,
        endSlot: 2,
        startTime: "08:00",
        endTime: "09:40",
        termId: "2026-fall",
      }),
    ).toEqual({
      ok: false,
      error: { field: "weekday", message: "星期必须是 1 到 7 的整数" },
    });

    expect(
      createCourse({
        name: "数学",
        weekday: 1,
        startSlot: 3,
        endSlot: 2,
        startTime: "08:00",
        endTime: "09:40",
        termId: "2026-fall",
      }),
    ).toEqual({
      ok: false,
      error: { field: "endSlot", message: "结束节次不能小于开始节次" },
    });

    expect(
      createCourse({
        name: "数学",
        weekday: 1,
        startSlot: 1,
        endSlot: 2,
        startTime: "9:00",
        endTime: "09:40",
        termId: "2026-fall",
      }),
    ).toEqual({
      ok: false,
      error: { field: "startTime", message: "课程时间必须使用 HH:mm 格式" },
    });

    expect(
      createCourse({
        name: "数学",
        weekday: 1,
        startSlot: 1,
        endSlot: 2,
        startTime: "10:00",
        endTime: "09:40",
        termId: "2026-fall",
      }),
    ).toEqual({
      ok: false,
      error: { field: "endTime", message: "课程结束时间必须晚于开始时间" },
    });
  });

  it("detects course conflicts only for same term and weekday overlapping slots", () => {
    const first = mustCreateCourse({
      id: "course-1" as EntityId,
      name: "数学",
      weekday: 2,
      startSlot: 1,
      endSlot: 2,
      startTime: "08:00",
      endTime: "09:40",
      termId: "2026-fall",
    });
    const overlapping = mustCreateCourse({
      id: "course-2" as EntityId,
      name: "英语",
      weekday: 2,
      startSlot: 2,
      endSlot: 4,
      startTime: "09:00",
      endTime: "11:40",
      termId: "2026-fall",
    });
    const adjacent = mustCreateCourse({
      id: "course-3" as EntityId,
      name: "物理",
      weekday: 2,
      startSlot: 3,
      endSlot: 4,
      startTime: "10:00",
      endTime: "11:40",
      termId: "2026-fall",
    });
    const otherTerm = { ...overlapping, termId: "2027-spring" };

    expect(doCoursesConflict(first, overlapping)).toBe(true);
    expect(doCoursesConflict(first, adjacent)).toBe(false);
    expect(doCoursesConflict(first, otherTerm)).toBe(false);
  });

  it("lists courses for a weekday sorted by start slot", () => {
    const courses = [
      mustCreateCourse({
        name: "晚课",
        weekday: 4,
        startSlot: 7,
        endSlot: 8,
        startTime: "19:00",
        endTime: "20:40",
        termId: "2026-fall",
      }),
      mustCreateCourse({
        name: "早课",
        weekday: 4,
        startSlot: 1,
        endSlot: 2,
        startTime: "08:00",
        endTime: "09:40",
        termId: "2026-fall",
      }),
      mustCreateCourse({
        name: "别天",
        weekday: 5,
        startSlot: 1,
        endSlot: 2,
        startTime: "08:00",
        endTime: "09:40",
        termId: "2026-fall",
      }),
    ];

    expect(
      listCoursesForWeekday(courses, 4).map((course) => course.name),
    ).toEqual(["早课", "晚课"]);
  });
});

describe("schedule domain events", () => {
  it("creates and updates a normalized schedule event", () => {
    const created = createScheduleEvent({
      id: "event-1" as EntityId,
      title: " 考试 ",
      note: " 带学生证 ",
      startsAt: "2026-07-23T01:00:00.000Z",
      endsAt: "2026-07-23T02:00:00.000Z",
      location: " 教学楼 ",
      now: baseNow,
    });

    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }
    expect(created.value).toMatchObject({
      title: "考试",
      note: "带学生证",
      startsAt: "2026-07-23T01:00:00.000Z",
      endsAt: "2026-07-23T02:00:00.000Z",
      location: "教学楼",
    });

    const updated = updateScheduleEvent(created.value, {
      note: "",
      endsAt: "2026-07-23T03:00:00.000Z",
      now: () => new Date("2026-07-24T00:00:00.000Z"),
    });

    expect(updated).toEqual({
      ok: true,
      value: {
        ...created.value,
        note: undefined,
        endsAt: "2026-07-23T03:00:00.000Z",
        updatedAt: "2026-07-24T00:00:00.000Z",
      },
    });
  });

  it("rejects invalid utc and non-positive event duration", () => {
    expect(
      createScheduleEvent({
        title: "考试",
        startsAt: "2026-07-23T09:00:00+08:00",
        endsAt: "2026-07-23T02:00:00.000Z",
      }),
    ).toEqual({
      ok: false,
      error: { field: "startsAt", message: "日程时间必须是合法 UTC ISO 时间" },
    });

    expect(
      createScheduleEvent({
        title: "考试",
        startsAt: "2026-07-23T02:00:00.000Z",
        endsAt: "2026-07-23T02:00:00.000Z",
      }),
    ).toEqual({
      ok: false,
      error: { field: "endsAt", message: "日程结束时间必须晚于开始时间" },
    });
  });

  it("detects overlapping events while treating adjacent boundaries as available", () => {
    const first = mustCreateEvent({
      title: "考试",
      startsAt: "2026-07-23T01:00:00.000Z",
      endsAt: "2026-07-23T02:00:00.000Z",
    });
    const overlapping = mustCreateEvent({
      title: "班会",
      startsAt: "2026-07-23T01:30:00.000Z",
      endsAt: "2026-07-23T02:30:00.000Z",
    });
    const adjacent = mustCreateEvent({
      title: "自习",
      startsAt: "2026-07-23T02:00:00.000Z",
      endsAt: "2026-07-23T03:00:00.000Z",
    });

    expect(doScheduleEventsOverlap(first, overlapping)).toBe(true);
    expect(doScheduleEventsOverlap(first, adjacent)).toBe(false);
  });

  it("lists events that overlap a utc range sorted by start time", () => {
    const events = [
      mustCreateEvent({
        title: "中间",
        startsAt: "2026-07-23T03:00:00.000Z",
        endsAt: "2026-07-23T04:00:00.000Z",
      }),
      mustCreateEvent({
        title: "跨入",
        startsAt: "2026-07-23T00:30:00.000Z",
        endsAt: "2026-07-23T01:30:00.000Z",
      }),
      mustCreateEvent({
        title: "边界前",
        startsAt: "2026-07-23T00:00:00.000Z",
        endsAt: "2026-07-23T01:00:00.000Z",
      }),
      mustCreateEvent({
        title: "边界后",
        startsAt: "2026-07-23T04:00:00.000Z",
        endsAt: "2026-07-23T05:00:00.000Z",
      }),
    ];

    expect(
      listScheduleEventsInUtcRange(
        events,
        "2026-07-23T01:00:00.000Z",
        "2026-07-23T04:00:00.000Z",
      ).map((event) => event.title),
    ).toEqual(["跨入", "中间"]);
  });
});

function mustCreateCourse(input: Parameters<typeof createCourse>[0]) {
  const result = createCourse(input);
  if (!result.ok) {
    throw new Error(result.error.message);
  }
  return result.value;
}

function mustCreateEvent(input: Parameters<typeof createScheduleEvent>[0]) {
  const result = createScheduleEvent(input);
  if (!result.ok) {
    throw new Error(result.error.message);
  }
  return result.value;
}
