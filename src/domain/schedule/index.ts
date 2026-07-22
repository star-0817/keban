import type { EntityBase, EntityId, UtcIsoDateTime } from "../index";
import {
  createId,
  err,
  isUtcIsoDateTime,
  ok,
  toUtcIsoDateTime,
  type Result,
} from "../index";

export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type Course = EntityBase &
  Readonly<{
    name: string;
    teacher?: string;
    location?: string;
    weekday: Weekday;
    startSlot: number;
    endSlot: number;
    startTime: string;
    endTime: string;
    termId: string;
  }>;

export type ScheduleEvent = EntityBase &
  Readonly<{
    title: string;
    note?: string;
    startsAt: UtcIsoDateTime;
    endsAt: UtcIsoDateTime;
    location?: string;
  }>;

export type CreateCourseInput = Readonly<{
  id?: EntityId;
  name: string;
  teacher?: string;
  location?: string;
  weekday: number;
  startSlot: number;
  endSlot: number;
  startTime: string;
  endTime: string;
  termId: string;
  now?: () => Date;
}>;

export type UpdateCourseInput = Partial<Omit<CreateCourseInput, "id" | "now">> &
  Readonly<{ now?: () => Date }>;

export type CreateScheduleEventInput = Readonly<{
  id?: EntityId;
  title: string;
  note?: string;
  startsAt: string;
  endsAt: string;
  location?: string;
  now?: () => Date;
}>;

export type UpdateScheduleEventInput = Partial<
  Omit<CreateScheduleEventInput, "id" | "now">
> &
  Readonly<{ now?: () => Date }>;

export type CourseValidationField =
  | "name"
  | "teacher"
  | "location"
  | "weekday"
  | "startSlot"
  | "endSlot"
  | "startTime"
  | "endTime"
  | "termId";

export type ScheduleEventValidationField =
  "title" | "note" | "startsAt" | "endsAt" | "location";

export type ScheduleValidationError<Field extends string> = Readonly<{
  field: Field;
  message: string;
}>;

type NormalizedCourseFields = Omit<Course, keyof EntityBase>;
type NormalizedScheduleEventFields = Omit<ScheduleEvent, keyof EntityBase>;

const HH_MM_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function createCourse(
  input: CreateCourseInput,
): Result<Course, ScheduleValidationError<CourseValidationField>> {
  const normalized = normalizeCourseFields(input);

  if (!normalized.ok) {
    return normalized;
  }

  const now = toUtcIsoDateTime((input.now ?? (() => new Date()))());

  return ok({
    id: input.id ?? createId(),
    ...normalized.value,
    createdAt: now,
    updatedAt: now,
  });
}

export function updateCourse(
  course: Course,
  input: UpdateCourseInput,
): Result<Course, ScheduleValidationError<CourseValidationField>> {
  const normalized = normalizeCourseFields({
    name: input.name ?? course.name,
    teacher: input.teacher === undefined ? course.teacher : input.teacher,
    location: input.location === undefined ? course.location : input.location,
    weekday: input.weekday ?? course.weekday,
    startSlot: input.startSlot ?? course.startSlot,
    endSlot: input.endSlot ?? course.endSlot,
    startTime: input.startTime ?? course.startTime,
    endTime: input.endTime ?? course.endTime,
    termId: input.termId ?? course.termId,
  });

  if (!normalized.ok) {
    return normalized;
  }

  return ok({
    ...course,
    ...normalized.value,
    updatedAt: toUtcIsoDateTime((input.now ?? (() => new Date()))()),
  });
}

export function createScheduleEvent(
  input: CreateScheduleEventInput,
): Result<
  ScheduleEvent,
  ScheduleValidationError<ScheduleEventValidationField>
> {
  const normalized = normalizeScheduleEventFields(input);

  if (!normalized.ok) {
    return normalized;
  }

  const now = toUtcIsoDateTime((input.now ?? (() => new Date()))());

  return ok({
    id: input.id ?? createId(),
    ...normalized.value,
    createdAt: now,
    updatedAt: now,
  });
}

export function updateScheduleEvent(
  event: ScheduleEvent,
  input: UpdateScheduleEventInput,
): Result<
  ScheduleEvent,
  ScheduleValidationError<ScheduleEventValidationField>
> {
  const normalized = normalizeScheduleEventFields({
    title: input.title ?? event.title,
    note: input.note === undefined ? event.note : input.note,
    startsAt: input.startsAt ?? event.startsAt,
    endsAt: input.endsAt ?? event.endsAt,
    location: input.location === undefined ? event.location : input.location,
  });

  if (!normalized.ok) {
    return normalized;
  }

  return ok({
    ...event,
    ...normalized.value,
    updatedAt: toUtcIsoDateTime((input.now ?? (() => new Date()))()),
  });
}

export function restoreCourseFromStorage(
  input: Readonly<{
    id: EntityId;
    name: string;
    teacher?: string;
    location?: string;
    weekday: Weekday;
    startSlot: number;
    endSlot: number;
    startTime: string;
    endTime: string;
    termId: string;
    createdAt: UtcIsoDateTime;
    updatedAt: UtcIsoDateTime;
  }>,
): Course {
  return input;
}

export function restoreScheduleEventFromStorage(
  input: Readonly<{
    id: EntityId;
    title: string;
    note?: string;
    startsAt: UtcIsoDateTime;
    endsAt: UtcIsoDateTime;
    location?: string;
    createdAt: UtcIsoDateTime;
    updatedAt: UtcIsoDateTime;
  }>,
): ScheduleEvent {
  return input;
}

export function doCoursesConflict(left: Course, right: Course): boolean {
  return (
    left.id !== right.id &&
    left.termId === right.termId &&
    left.weekday === right.weekday &&
    left.startSlot <= right.endSlot &&
    right.startSlot <= left.endSlot
  );
}

export function doScheduleEventsOverlap(
  left: ScheduleEvent,
  right: ScheduleEvent,
): boolean {
  return (
    left.id !== right.id &&
    left.startsAt < right.endsAt &&
    right.startsAt < left.endsAt
  );
}

export function listCoursesForWeekday(
  courses: readonly Course[],
  weekday: Weekday,
): readonly Course[] {
  return courses
    .filter((course) => course.weekday === weekday)
    .sort((left, right) => left.startSlot - right.startSlot);
}

export function listScheduleEventsInUtcRange(
  events: readonly ScheduleEvent[],
  startsAt: UtcIsoDateTime | string,
  endsAt: UtcIsoDateTime | string,
): readonly ScheduleEvent[] {
  return events
    .filter((event) => event.startsAt < endsAt && startsAt < event.endsAt)
    .sort((left, right) => left.startsAt.localeCompare(right.startsAt));
}

function normalizeCourseFields(
  input: Omit<CreateCourseInput, "id" | "now">,
): Result<
  NormalizedCourseFields,
  ScheduleValidationError<CourseValidationField>
> {
  const name = input.name.trim();
  const termId = input.termId.trim();
  const teacher = normalizeOptionalText(input.teacher);
  const location = normalizeOptionalText(input.location);

  if (name.length === 0) {
    return err({ field: "name", message: "课程名称不能为空" });
  }

  if (termId.length === 0) {
    return err({ field: "termId", message: "学期标识不能为空" });
  }

  if (!isWeekday(input.weekday)) {
    return err({ field: "weekday", message: "星期必须是 1 到 7 的整数" });
  }

  if (!Number.isInteger(input.startSlot) || input.startSlot <= 0) {
    return err({ field: "startSlot", message: "开始节次必须是正整数" });
  }

  if (!Number.isInteger(input.endSlot) || input.endSlot <= 0) {
    return err({ field: "endSlot", message: "结束节次必须是正整数" });
  }

  if (input.endSlot < input.startSlot) {
    return err({ field: "endSlot", message: "结束节次不能小于开始节次" });
  }

  const startMinutes = parseLessonTime(input.startTime);
  if (startMinutes === undefined) {
    return err({ field: "startTime", message: "课程时间必须使用 HH:mm 格式" });
  }

  const endMinutes = parseLessonTime(input.endTime);
  if (endMinutes === undefined) {
    return err({ field: "endTime", message: "课程时间必须使用 HH:mm 格式" });
  }

  if (endMinutes <= startMinutes) {
    return err({ field: "endTime", message: "课程结束时间必须晚于开始时间" });
  }

  return ok({
    name,
    teacher,
    location,
    weekday: input.weekday,
    startSlot: input.startSlot,
    endSlot: input.endSlot,
    startTime: input.startTime,
    endTime: input.endTime,
    termId,
  });
}

function normalizeScheduleEventFields(
  input: Omit<CreateScheduleEventInput, "id" | "now">,
): Result<
  NormalizedScheduleEventFields,
  ScheduleValidationError<ScheduleEventValidationField>
> {
  const title = input.title.trim();
  const note = normalizeOptionalText(input.note);
  const location = normalizeOptionalText(input.location);

  if (title.length === 0) {
    return err({ field: "title", message: "日程标题不能为空" });
  }

  if (!isUtcIsoDateTime(input.startsAt)) {
    return err({
      field: "startsAt",
      message: "日程时间必须是合法 UTC ISO 时间",
    });
  }

  if (!isUtcIsoDateTime(input.endsAt)) {
    return err({
      field: "endsAt",
      message: "日程时间必须是合法 UTC ISO 时间",
    });
  }

  if (input.endsAt <= input.startsAt) {
    return err({ field: "endsAt", message: "日程结束时间必须晚于开始时间" });
  }

  return ok({
    title,
    note,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    location,
  });
}

function isWeekday(value: number): value is Weekday {
  return Number.isInteger(value) && value >= 1 && value <= 7;
}

function parseLessonTime(value: string): number | undefined {
  const match = HH_MM_PATTERN.exec(value);

  if (!match) {
    return undefined;
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  const normalized = value?.trim();

  return normalized === undefined || normalized.length === 0
    ? undefined
    : normalized;
}
