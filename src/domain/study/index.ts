import type { EntityId, Result, UtcIsoDateTime } from "../index";
import { err, isUtcIsoDateTime, ok } from "../index";

export type PercentageGrade = Readonly<{
  type: "score";
  score: number;
}>;

export type LevelGrade = Readonly<{
  type: "level";
  level: string;
}>;

export type CourseGradeInput = PercentageGrade | LevelGrade;

export type CourseGrade = Readonly<{
  id: EntityId;
  name: string;
  credit: number;
  grade: CourseGradeInput;
}>;

export type GpaScoreBand = Readonly<{
  min: number;
  max: number;
  gradePoint: number;
}>;

export type GpaRule = Readonly<{
  scoreBands: readonly GpaScoreBand[];
  levelGradePoints: Readonly<Record<string, number>>;
}>;

export type GpaCalculationOptions = Readonly<{
  rule?: GpaRule;
}>;

export type GpaCourseDetail = Readonly<{
  courseId: EntityId;
  courseName: string;
  credit: number;
  gradePoint: number;
  source: CourseGradeInput;
}>;

export type GpaCalculationResult = Readonly<{
  totalCredits: number;
  weightedGpa: number;
  courseCount: number;
  details: readonly GpaCourseDetail[];
}>;

export const DEFAULT_GPA_RULE: GpaRule = {
  scoreBands: [
    { min: 90, max: 100, gradePoint: 4.0 },
    { min: 85, max: 89, gradePoint: 3.7 },
    { min: 82, max: 84, gradePoint: 3.3 },
    { min: 78, max: 81, gradePoint: 3.0 },
    { min: 75, max: 77, gradePoint: 2.7 },
    { min: 72, max: 74, gradePoint: 2.3 },
    { min: 68, max: 71, gradePoint: 2.0 },
    { min: 64, max: 67, gradePoint: 1.5 },
    { min: 60, max: 63, gradePoint: 1.0 },
    { min: 0, max: 59, gradePoint: 0 },
  ],
  levelGradePoints: {
    优秀: 4.0,
    良好: 3.0,
    中等: 2.0,
    及格: 1.0,
    不及格: 0,
  },
};

export function calculateGpa(
  courses: readonly CourseGrade[],
  options: GpaCalculationOptions = {},
): Result<GpaCalculationResult, string> {
  if (courses.length === 0) {
    return err("没有可计算的课程");
  }

  const rule = options.rule ?? DEFAULT_GPA_RULE;
  const seenCourseIds = new Set<EntityId>();
  const calculatedCourses: Array<
    Readonly<{
      credit: number;
      gradePoint: number;
      detail: GpaCourseDetail;
    }>
  > = [];

  for (const course of courses) {
    if (seenCourseIds.has(course.id)) {
      return err(`课程 ID 不能重复：${course.id}`);
    }

    seenCourseIds.add(course.id);

    if (!Number.isFinite(course.credit) || course.credit <= 0) {
      return err("课程学分必须大于 0");
    }

    const gradePoint = resolveGradePoint(course.grade, rule);

    if (!gradePoint.ok) {
      return gradePoint;
    }

    calculatedCourses.push({
      credit: course.credit,
      gradePoint: gradePoint.value,
      detail: {
        courseId: course.id,
        courseName: course.name,
        credit: roundToTwoDecimals(course.credit),
        gradePoint: roundToTwoDecimals(gradePoint.value),
        source: course.grade,
      },
    });
  }

  const totalCredits = calculatedCourses.reduce(
    (sum, course) => sum + course.credit,
    0,
  );

  if (totalCredits <= 0) {
    return err("没有可计算的课程");
  }

  const weightedGradePointSum = calculatedCourses.reduce(
    (sum, course) => sum + course.gradePoint * course.credit,
    0,
  );

  return ok({
    totalCredits: roundToTwoDecimals(totalCredits),
    weightedGpa: roundToTwoDecimals(weightedGradePointSum / totalCredits),
    courseCount: calculatedCourses.length,
    details: calculatedCourses.map((course) => course.detail),
  });
}

export const ATTENDANCE_STATUSES = [
  "出勤",
  "迟到",
  "早退",
  "请假",
  "缺勤",
] as const;

export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export type AttendanceRecord = Readonly<{
  id: EntityId;
  courseId: EntityId;
  status: string;
  occurredAt?: UtcIsoDateTime;
}>;

export type AttendanceWeights = Readonly<Record<string, number>>;

export type AttendancePeriod = "day" | "month";

export type AttendanceGroupBy =
  | Readonly<{ type: "course" }>
  | Readonly<{ type: "period"; period: AttendancePeriod }>;

export type AttendanceCalculationOptions = Readonly<{
  weights?: AttendanceWeights;
  groupBy?: AttendanceGroupBy;
}>;

export type AttendanceStatusCounts = Readonly<Record<string, number>>;

export type AttendanceSummary = Readonly<{
  totalRecords: number;
  weightedAttendance: number;
  attendanceRate: number;
  statusCounts: AttendanceStatusCounts;
}>;

export type AttendanceGroupSummary = AttendanceSummary &
  Readonly<{
    key: string;
  }>;

export type AttendanceCalculationResult = AttendanceSummary &
  Readonly<{
    groups: readonly AttendanceGroupSummary[];
  }>;

export const DEFAULT_ATTENDANCE_WEIGHTS: Readonly<
  Record<AttendanceStatus, number>
> = {
  出勤: 1,
  迟到: 0.5,
  早退: 0.5,
  请假: 0,
  缺勤: 0,
};

export function calculateAttendance(
  records: readonly AttendanceRecord[],
  options: AttendanceCalculationOptions = {},
): Result<AttendanceCalculationResult, string> {
  if (records.length === 0) {
    return err("没有可计算的考勤记录");
  }

  const weights = options.weights ?? DEFAULT_ATTENDANCE_WEIGHTS;
  const weightValidation = validateAttendanceWeights(weights);

  if (!weightValidation.ok) {
    return weightValidation;
  }

  const seenRecordIds = new Set<EntityId>();

  for (const record of records) {
    if (seenRecordIds.has(record.id)) {
      return err(`考勤记录 ID 不能重复：${record.id}`);
    }

    seenRecordIds.add(record.id);

    if (!(record.status in weights)) {
      return err(`未知考勤状态：${record.status}`);
    }

    if (
      options.groupBy?.type === "period" &&
      (record.occurredAt === undefined || !isUtcIsoDateTime(record.occurredAt))
    ) {
      return err("按时间段汇总时必须提供 UTC 时间");
    }
  }

  return ok({
    ...summarizeAttendance(records, weights),
    groups:
      options.groupBy === undefined
        ? []
        : groupAttendance(records, weights, options.groupBy),
  });
}

function resolveGradePoint(
  grade: CourseGradeInput,
  rule: GpaRule,
): Result<number, string> {
  if (grade.type === "score") {
    if (!Number.isFinite(grade.score) || grade.score < 0 || grade.score > 100) {
      return err("百分制成绩必须是 0 到 100 的有限数值");
    }

    const band = rule.scoreBands.find(
      (item) => grade.score >= item.min && grade.score <= item.max,
    );

    if (band === undefined) {
      return err("百分制成绩没有匹配的绩点规则");
    }

    return ok(band.gradePoint);
  }

  const gradePoint = rule.levelGradePoints[grade.level];

  if (gradePoint === undefined) {
    return err(`未知等级：${grade.level}`);
  }

  if (!Number.isFinite(gradePoint) || gradePoint < 0) {
    return err("等级绩点必须是不小于 0 的有限数值");
  }

  return ok(gradePoint);
}

function validateAttendanceWeights(
  weights: AttendanceWeights,
): Result<AttendanceWeights, string> {
  const invalid = Object.values(weights).some(
    (weight) => !Number.isFinite(weight) || weight < 0 || weight > 1,
  );

  if (invalid) {
    return err("考勤状态权重必须是 0 到 1 的有限数值");
  }

  return ok(weights);
}

function summarizeAttendance(
  records: readonly AttendanceRecord[],
  weights: AttendanceWeights,
): AttendanceSummary {
  const statusCounts = createEmptyStatusCounts(weights);
  const weightedAttendance = records.reduce((sum, record) => {
    statusCounts[record.status] = (statusCounts[record.status] ?? 0) + 1;

    return sum + weights[record.status];
  }, 0);

  return {
    totalRecords: records.length,
    weightedAttendance: roundToTwoDecimals(weightedAttendance),
    attendanceRate: roundToTwoDecimals(
      records.length === 0 ? 0 : (weightedAttendance / records.length) * 100,
    ),
    statusCounts,
  };
}

function groupAttendance(
  records: readonly AttendanceRecord[],
  weights: AttendanceWeights,
  groupBy: AttendanceGroupBy,
): readonly AttendanceGroupSummary[] {
  const grouped = records.reduce<Map<string, AttendanceRecord[]>>(
    (groups, record) => {
      const key =
        groupBy.type === "course"
          ? record.courseId
          : getPeriodKey(record.occurredAt!, groupBy.period);
      const existing = groups.get(key) ?? [];

      groups.set(key, [...existing, record]);

      return groups;
    },
    new Map<string, AttendanceRecord[]>(),
  );

  return Array.from(grouped.entries()).map(([key, groupRecords]) => ({
    key,
    ...summarizeAttendance(groupRecords, weights),
  }));
}

function createEmptyStatusCounts(
  weights: AttendanceWeights,
): Record<string, number> {
  return Object.keys(weights).reduce<Record<string, number>>(
    (counts, status) => {
      counts[status] = 0;

      return counts;
    },
    {},
  );
}

function getPeriodKey(
  occurredAt: UtcIsoDateTime,
  period: AttendancePeriod,
): string {
  if (period === "day") {
    return occurredAt.slice(0, 10);
  }

  return occurredAt.slice(0, 7);
}

function roundToTwoDecimals(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
