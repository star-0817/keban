import { describe, expect, it } from "vitest";

import type { EntityId } from "../ids";
import type { UtcIsoDateTime } from "../time";

import {
  ATTENDANCE_STATUSES,
  DEFAULT_ATTENDANCE_WEIGHTS,
  DEFAULT_GPA_RULE,
  calculateAttendance,
  calculateGpa,
  type AttendanceRecord,
  type CourseGrade,
} from "./index";

describe("calculateGpa", () => {
  it("calculates weighted GPA for default percentage scores and returns details", () => {
    const result = calculateGpa([
      scoreCourse("course-1", "高等数学", 3, 95),
      scoreCourse("course-2", "大学英语", 2, 84),
      scoreCourse("course-3", "体育", 1, 61),
    ]);

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.value.totalCredits).toBe(6);
    expect(result.value.courseCount).toBe(3);
    expect(result.value.weightedGpa).toBe(3.27);
    expect(result.value.details).toEqual([
      {
        courseId: id("course-1"),
        courseName: "高等数学",
        credit: 3,
        gradePoint: 4,
        source: { type: "score", score: 95 },
      },
      {
        courseId: id("course-2"),
        courseName: "大学英语",
        credit: 2,
        gradePoint: 3.3,
        source: { type: "score", score: 84 },
      },
      {
        courseId: id("course-3"),
        courseName: "体育",
        credit: 1,
        gradePoint: 1,
        source: { type: "score", score: 61 },
      },
    ]);
  });

  it("classifies default percentage boundary scores explicitly", () => {
    expect(DEFAULT_GPA_RULE.scoreBands).toEqual([
      { min: 90, max: 100, gradePoint: 4 },
      { min: 85, max: 89, gradePoint: 3.7 },
      { min: 82, max: 84, gradePoint: 3.3 },
      { min: 78, max: 81, gradePoint: 3 },
      { min: 75, max: 77, gradePoint: 2.7 },
      { min: 72, max: 74, gradePoint: 2.3 },
      { min: 68, max: 71, gradePoint: 2 },
      { min: 64, max: 67, gradePoint: 1.5 },
      { min: 60, max: 63, gradePoint: 1 },
      { min: 0, max: 59, gradePoint: 0 },
    ]);

    const result = calculateGpa([
      scoreCourse("score-100", "100", 1, 100),
      scoreCourse("score-90", "90", 1, 90),
      scoreCourse("score-89", "89", 1, 89),
      scoreCourse("score-85", "85", 1, 85),
      scoreCourse("score-84", "84", 1, 84),
      scoreCourse("score-82", "82", 1, 82),
      scoreCourse("score-81", "81", 1, 81),
      scoreCourse("score-78", "78", 1, 78),
      scoreCourse("score-77", "77", 1, 77),
      scoreCourse("score-75", "75", 1, 75),
      scoreCourse("score-74", "74", 1, 74),
      scoreCourse("score-72", "72", 1, 72),
      scoreCourse("score-71", "71", 1, 71),
      scoreCourse("score-68", "68", 1, 68),
      scoreCourse("score-67", "67", 1, 67),
      scoreCourse("score-64", "64", 1, 64),
      scoreCourse("score-63", "63", 1, 63),
      scoreCourse("score-60", "60", 1, 60),
      scoreCourse("score-59", "59", 1, 59),
      scoreCourse("score-0", "0", 1, 0),
    ]);

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.value.details.map((detail) => detail.gradePoint)).toEqual([
      4, 4, 3.7, 3.7, 3.3, 3.3, 3, 3, 2.7, 2.7, 2.3, 2.3, 2, 2, 1.5, 1.5, 1, 1,
      0, 0,
    ]);
  });

  it("calculates default level grades and supports custom level mappings", () => {
    const defaultResult = calculateGpa([
      levelCourse("level-1", "论文", 2, "优秀"),
      levelCourse("level-2", "实验", 1, "良好"),
      levelCourse("level-3", "实习", 1, "及格"),
      levelCourse("level-4", "补考", 1, "不及格"),
    ]);
    const customResult = calculateGpa(
      [
        levelCourse("custom-1", "课程 A", 1, "A"),
        levelCourse("custom-2", "课程 B", 1, "B"),
      ],
      {
        rule: {
          ...DEFAULT_GPA_RULE,
          levelGradePoints: { A: 4.3, B: 3.6 },
        },
      },
    );

    expect(defaultResult.ok && defaultResult.value.weightedGpa).toBe(2.4);
    expect(customResult.ok && customResult.value.weightedGpa).toBe(3.95);
  });

  it("returns Chinese errors for invalid GPA inputs", () => {
    expect(calculateGpa([])).toEqual({
      ok: false,
      error: "没有可计算的课程",
    });
    expect(calculateGpa([scoreCourse("course-1", "无学分", 0, 90)])).toEqual({
      ok: false,
      error: "课程学分必须大于 0",
    });
    expect(
      calculateGpa([scoreCourse("course-1", "非法分数", 1, Number.NaN)]),
    ).toEqual({ ok: false, error: "百分制成绩必须是 0 到 100 的有限数值" });
    expect(calculateGpa([scoreCourse("course-1", "越界", 1, 101)])).toEqual({
      ok: false,
      error: "百分制成绩必须是 0 到 100 的有限数值",
    });
    expect(calculateGpa([levelCourse("course-1", "未知", 1, "A+")])).toEqual({
      ok: false,
      error: "未知等级：A+",
    });
    expect(
      calculateGpa([
        scoreCourse("course-1", "重复 1", 1, 90),
        scoreCourse("course-1", "重复 2", 1, 90),
      ]),
    ).toEqual({ ok: false, error: "课程 ID 不能重复：course-1" });
  });
});

describe("calculateAttendance", () => {
  it("calculates default attendance rate and status counts", () => {
    expect(ATTENDANCE_STATUSES).toEqual([
      "出勤",
      "迟到",
      "早退",
      "请假",
      "缺勤",
    ]);
    expect(DEFAULT_ATTENDANCE_WEIGHTS).toEqual({
      出勤: 1,
      迟到: 0.5,
      早退: 0.5,
      请假: 0,
      缺勤: 0,
    });

    const result = calculateAttendance([
      attendance("record-1", "math", "出勤", "2026-07-01T00:00:00.000Z"),
      attendance("record-2", "math", "迟到", "2026-07-02T00:00:00.000Z"),
      attendance("record-3", "math", "早退", "2026-07-03T00:00:00.000Z"),
      attendance("record-4", "math", "请假", "2026-07-04T00:00:00.000Z"),
      attendance("record-5", "math", "缺勤", "2026-07-05T00:00:00.000Z"),
    ]);

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.value.totalRecords).toBe(5);
    expect(result.value.weightedAttendance).toBe(2);
    expect(result.value.attendanceRate).toBe(40);
    expect(result.value.statusCounts).toEqual({
      出勤: 1,
      迟到: 1,
      早退: 1,
      请假: 1,
      缺勤: 1,
    });
  });

  it("supports custom attendance weights", () => {
    const result = calculateAttendance(
      [
        attendance("record-1", "math", "出勤", "2026-07-01T00:00:00.000Z"),
        attendance("record-2", "math", "请假", "2026-07-02T00:00:00.000Z"),
      ],
      { weights: { ...DEFAULT_ATTENDANCE_WEIGHTS, 请假: 0.8 } },
    );

    expect(result.ok && result.value.attendanceRate).toBe(90);
  });

  it("summarizes attendance by course and by month", () => {
    const byCourse = calculateAttendance(
      [
        attendance("record-1", "math", "出勤", "2026-07-01T00:00:00.000Z"),
        attendance("record-2", "math", "迟到", "2026-07-02T00:00:00.000Z"),
        attendance("record-3", "english", "缺勤", "2026-08-01T00:00:00.000Z"),
      ],
      { groupBy: { type: "course" } },
    );
    const byMonth = calculateAttendance(
      [
        attendance("record-1", "math", "出勤", "2026-07-01T00:00:00.000Z"),
        attendance("record-2", "math", "迟到", "2026-07-02T00:00:00.000Z"),
        attendance("record-3", "english", "缺勤", "2026-08-01T00:00:00.000Z"),
      ],
      { groupBy: { type: "period", period: "month" } },
    );

    expect(byCourse.ok && byCourse.value.groups).toEqual([
      {
        key: "math",
        totalRecords: 2,
        weightedAttendance: 1.5,
        attendanceRate: 75,
        statusCounts: { 出勤: 1, 迟到: 1, 早退: 0, 请假: 0, 缺勤: 0 },
      },
      {
        key: "english",
        totalRecords: 1,
        weightedAttendance: 0,
        attendanceRate: 0,
        statusCounts: { 出勤: 0, 迟到: 0, 早退: 0, 请假: 0, 缺勤: 1 },
      },
    ]);
    expect(
      byMonth.ok && byMonth.value.groups.map((group) => group.key),
    ).toEqual(["2026-07", "2026-08"]);
  });

  it("returns Chinese errors for invalid attendance inputs", () => {
    expect(calculateAttendance([])).toEqual({
      ok: false,
      error: "没有可计算的考勤记录",
    });
    expect(
      calculateAttendance([
        attendance("record-1", "math", "未知状态", "2026-07-01T00:00:00.000Z"),
      ]),
    ).toEqual({ ok: false, error: "未知考勤状态：未知状态" });
    expect(
      calculateAttendance([
        attendance("record-1", "math", "出勤", "2026-07-01T00:00:00.000Z"),
        attendance("record-1", "math", "出勤", "2026-07-02T00:00:00.000Z"),
      ]),
    ).toEqual({ ok: false, error: "考勤记录 ID 不能重复：record-1" });
    expect(
      calculateAttendance(
        [attendance("record-1", "math", "出勤", "2026-07-01T00:00:00.000Z")],
        { weights: { ...DEFAULT_ATTENDANCE_WEIGHTS, 出勤: 1.2 } },
      ),
    ).toEqual({ ok: false, error: "考勤状态权重必须是 0 到 1 的有限数值" });
    expect(
      calculateAttendance(
        [
          {
            id: id("record-1"),
            courseId: id("math"),
            status: "出勤",
          },
        ],
        { groupBy: { type: "period", period: "day" } },
      ),
    ).toEqual({ ok: false, error: "按时间段汇总时必须提供 UTC 时间" });
  });
});

function scoreCourse(
  courseId: string,
  name: string,
  credit: number,
  score: number,
): CourseGrade {
  return {
    id: id(courseId),
    name,
    credit,
    grade: { type: "score", score },
  };
}

function levelCourse(
  courseId: string,
  name: string,
  credit: number,
  level: string,
): CourseGrade {
  return {
    id: id(courseId),
    name,
    credit,
    grade: { type: "level", level },
  };
}

function attendance(
  recordId: string,
  courseId: string,
  status: string,
  occurredAt: string,
): AttendanceRecord {
  return {
    id: id(recordId),
    courseId: id(courseId),
    status,
    occurredAt: occurredAt as UtcIsoDateTime,
  };
}

function id(value: string): EntityId {
  return value as EntityId;
}
