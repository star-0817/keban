import {
  createCourse,
  createScheduleEvent,
  doCoursesConflict,
  doScheduleEventsOverlap,
  restoreCourseFromStorage,
  restoreScheduleEventFromStorage,
  updateCourse,
  updateScheduleEvent,
  type Course,
  type CreateCourseInput as DomainCreateCourseInput,
  type CreateScheduleEventInput as DomainCreateScheduleEventInput,
  type ScheduleEvent,
  type UpdateCourseInput as DomainUpdateCourseInput,
  type UpdateScheduleEventInput as DomainUpdateScheduleEventInput,
  type Weekday,
} from "../domain/schedule";
import type { EntityId, PageRequest, UtcIsoDateTime } from "../domain";
import type { SqliteDatabase, SqliteRow } from "../plugins/sqlite";

import type { WritableRepository } from "./types";

export type CreateCourseInput = DomainCreateCourseInput;
export type UpdateCourseInput = DomainUpdateCourseInput;
export type CreateScheduleEventInput = DomainCreateScheduleEventInput;
export type UpdateScheduleEventInput = DomainUpdateScheduleEventInput;

export type CourseRepository = WritableRepository<
  Course,
  CreateCourseInput,
  UpdateCourseInput
> &
  Readonly<{
    listByWeekdayAndTerm(
      weekday: Weekday,
      termId: string,
    ): Promise<readonly Course[]>;
  }>;

export type ScheduleEventRepository = WritableRepository<
  ScheduleEvent,
  CreateScheduleEventInput,
  UpdateScheduleEventInput
> &
  Readonly<{
    listInUtcRange(
      startsAt: UtcIsoDateTime | string,
      endsAt: UtcIsoDateTime | string,
    ): Promise<readonly ScheduleEvent[]>;
  }>;

type CourseRow = SqliteRow &
  Readonly<{
    id: string;
    name: string;
    teacher: string | null;
    location: string | null;
    weekday: number;
    start_slot: number;
    end_slot: number;
    start_time: string;
    end_time: string;
    term_id: string;
    created_at: string;
    updated_at: string;
  }>;

type ScheduleEventRow = SqliteRow &
  Readonly<{
    id: string;
    title: string;
    note: string | null;
    starts_at: string;
    ends_at: string;
    location: string | null;
    created_at: string;
    updated_at: string;
  }>;

export type CreateScheduleRepositoryOptions = Readonly<{
  database: SqliteDatabase;
  now?: () => Date;
}>;

const COURSE_COLUMNS =
  "id, name, teacher, location, weekday, start_slot, end_slot, start_time, end_time, term_id, created_at, updated_at";
const EVENT_COLUMNS =
  "id, title, note, starts_at, ends_at, location, created_at, updated_at";

export function createCourseRepository(
  options: CreateScheduleRepositoryOptions,
): CourseRepository {
  const { database } = options;
  const defaultNow = options.now;

  return {
    findById: async (id) => findCourseById(database, id),
    list: async (page?: PageRequest) => {
      const result =
        page === undefined
          ? await database.query<CourseRow>(
              `SELECT ${COURSE_COLUMNS} FROM courses ORDER BY created_at ASC`,
            )
          : await database.query<CourseRow>(
              `SELECT ${COURSE_COLUMNS} FROM courses ORDER BY created_at ASC LIMIT ? OFFSET ?`,
              [page.pageSize, (page.page - 1) * page.pageSize],
            );

      return result.rows.map(rowToCourse);
    },
    listByWeekdayAndTerm: async (weekday, termId) => {
      const result = await database.query<CourseRow>(
        `SELECT ${COURSE_COLUMNS} FROM courses WHERE weekday = ? AND term_id = ? ORDER BY start_slot ASC`,
        [weekday, termId],
      );

      return result.rows.map(rowToCourse);
    },
    create: async (input) => {
      if (
        input.id !== undefined &&
        (await findCourseById(database, input.id))
      ) {
        throw new Error("课程 ID 已存在");
      }

      const course = createCourse({ ...input, now: input.now ?? defaultNow });
      if (!course.ok) {
        throw new Error(course.error.message);
      }

      await assertNoCourseConflict(database, course.value);
      await database.execute(
        "INSERT INTO courses (id, name, teacher, location, weekday, start_slot, end_slot, start_time, end_time, term_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          course.value.id,
          course.value.name,
          course.value.teacher ?? null,
          course.value.location ?? null,
          course.value.weekday,
          course.value.startSlot,
          course.value.endSlot,
          course.value.startTime,
          course.value.endTime,
          course.value.termId,
          course.value.createdAt,
          course.value.updatedAt,
        ],
      );

      return course.value;
    },
    update: async (id, input) => {
      const current = await findCourseOrThrow(database, id);
      const updated = updateCourse(current, {
        ...input,
        now: input.now ?? defaultNow,
      });
      if (!updated.ok) {
        throw new Error(updated.error.message);
      }

      await assertNoCourseConflict(database, updated.value);
      await database.execute(
        "UPDATE courses SET name = ?, teacher = ?, location = ?, weekday = ?, start_slot = ?, end_slot = ?, start_time = ?, end_time = ?, term_id = ?, updated_at = ? WHERE id = ?",
        [
          updated.value.name,
          updated.value.teacher ?? null,
          updated.value.location ?? null,
          updated.value.weekday,
          updated.value.startSlot,
          updated.value.endSlot,
          updated.value.startTime,
          updated.value.endTime,
          updated.value.termId,
          updated.value.updatedAt,
          id,
        ],
      );

      return updated.value;
    },
    delete: async (id) => {
      await database.execute("DELETE FROM courses WHERE id = ?", [id]);
    },
  };
}

export function createScheduleEventRepository(
  options: CreateScheduleRepositoryOptions,
): ScheduleEventRepository {
  const { database } = options;
  const defaultNow = options.now;

  return {
    findById: async (id) => findEventById(database, id),
    list: async (page?: PageRequest) => {
      const result =
        page === undefined
          ? await database.query<ScheduleEventRow>(
              `SELECT ${EVENT_COLUMNS} FROM schedule_events ORDER BY starts_at ASC`,
            )
          : await database.query<ScheduleEventRow>(
              `SELECT ${EVENT_COLUMNS} FROM schedule_events ORDER BY starts_at ASC LIMIT ? OFFSET ?`,
              [page.pageSize, (page.page - 1) * page.pageSize],
            );

      return result.rows.map(rowToEvent);
    },
    listInUtcRange: async (startsAt, endsAt) => {
      const result = await database.query<ScheduleEventRow>(
        `SELECT ${EVENT_COLUMNS} FROM schedule_events WHERE starts_at < ? AND ends_at > ? ORDER BY starts_at ASC`,
        [endsAt, startsAt],
      );

      return result.rows.map(rowToEvent);
    },
    create: async (input) => {
      if (input.id !== undefined && (await findEventById(database, input.id))) {
        throw new Error("日程 ID 已存在");
      }

      const event = createScheduleEvent({
        ...input,
        now: input.now ?? defaultNow,
      });
      if (!event.ok) {
        throw new Error(event.error.message);
      }

      await assertNoEventConflict(database, event.value);
      await database.execute(
        "INSERT INTO schedule_events (id, title, note, starts_at, ends_at, location, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [
          event.value.id,
          event.value.title,
          event.value.note ?? null,
          event.value.startsAt,
          event.value.endsAt,
          event.value.location ?? null,
          event.value.createdAt,
          event.value.updatedAt,
        ],
      );

      return event.value;
    },
    update: async (id, input) => {
      const current = await findEventOrThrow(database, id);
      const updated = updateScheduleEvent(current, {
        ...input,
        now: input.now ?? defaultNow,
      });
      if (!updated.ok) {
        throw new Error(updated.error.message);
      }

      await assertNoEventConflict(database, updated.value);
      await database.execute(
        "UPDATE schedule_events SET title = ?, note = ?, starts_at = ?, ends_at = ?, location = ?, updated_at = ? WHERE id = ?",
        [
          updated.value.title,
          updated.value.note ?? null,
          updated.value.startsAt,
          updated.value.endsAt,
          updated.value.location ?? null,
          updated.value.updatedAt,
          id,
        ],
      );

      return updated.value;
    },
    delete: async (id) => {
      await database.execute("DELETE FROM schedule_events WHERE id = ?", [id]);
    },
  };
}

async function assertNoCourseConflict(
  database: SqliteDatabase,
  course: Course,
): Promise<void> {
  const result = await database.query<CourseRow>(
    `SELECT ${COURSE_COLUMNS} FROM courses WHERE weekday = ? AND term_id = ? ORDER BY start_slot ASC`,
    [course.weekday, course.termId],
  );
  const conflict = result.rows
    .map(rowToCourse)
    .some((existing) => doCoursesConflict(existing, course));

  if (conflict) {
    throw new Error("课程时间与已有课程冲突");
  }
}

async function assertNoEventConflict(
  database: SqliteDatabase,
  event: ScheduleEvent,
): Promise<void> {
  const result = await database.query<ScheduleEventRow>(
    `SELECT ${EVENT_COLUMNS} FROM schedule_events WHERE starts_at < ? AND ends_at > ? ORDER BY starts_at ASC`,
    [event.endsAt, event.startsAt],
  );
  const conflict = result.rows
    .map(rowToEvent)
    .some((existing) => doScheduleEventsOverlap(existing, event));

  if (conflict) {
    throw new Error("日程时间与已有日程冲突");
  }
}

async function findCourseById(
  database: SqliteDatabase,
  id: EntityId,
): Promise<Course | null> {
  const result = await database.query<CourseRow>(
    `SELECT ${COURSE_COLUMNS} FROM courses WHERE id = ?`,
    [id],
  );
  const row = result.rows[0];

  return row === undefined ? null : rowToCourse(row);
}

async function findCourseOrThrow(
  database: SqliteDatabase,
  id: EntityId,
): Promise<Course> {
  const course = await findCourseById(database, id);

  if (course === null) {
    throw new Error("课程记录不存在");
  }

  return course;
}

async function findEventById(
  database: SqliteDatabase,
  id: EntityId,
): Promise<ScheduleEvent | null> {
  const result = await database.query<ScheduleEventRow>(
    `SELECT ${EVENT_COLUMNS} FROM schedule_events WHERE id = ?`,
    [id],
  );
  const row = result.rows[0];

  return row === undefined ? null : rowToEvent(row);
}

async function findEventOrThrow(
  database: SqliteDatabase,
  id: EntityId,
): Promise<ScheduleEvent> {
  const event = await findEventById(database, id);

  if (event === null) {
    throw new Error("日程记录不存在");
  }

  return event;
}

function rowToCourse(row: CourseRow): Course {
  return restoreCourseFromStorage({
    id: row.id as EntityId,
    name: row.name,
    teacher: row.teacher ?? undefined,
    location: row.location ?? undefined,
    weekday: row.weekday as Weekday,
    startSlot: row.start_slot,
    endSlot: row.end_slot,
    startTime: row.start_time,
    endTime: row.end_time,
    termId: row.term_id,
    createdAt: row.created_at as UtcIsoDateTime,
    updatedAt: row.updated_at as UtcIsoDateTime,
  });
}

function rowToEvent(row: ScheduleEventRow): ScheduleEvent {
  return restoreScheduleEventFromStorage({
    id: row.id as EntityId,
    title: row.title,
    note: row.note ?? undefined,
    startsAt: row.starts_at as UtcIsoDateTime,
    endsAt: row.ends_at as UtcIsoDateTime,
    location: row.location ?? undefined,
    createdAt: row.created_at as UtcIsoDateTime,
    updatedAt: row.updated_at as UtcIsoDateTime,
  });
}
