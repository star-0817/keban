import type { EntityId, Result, UtcIsoDateTime } from "../domain";
import type {
  AttendanceCalculationOptions,
  AttendanceCalculationResult,
  AttendanceRecord,
  CourseGrade,
  GpaCalculationOptions,
  GpaCalculationResult,
} from "../domain/study";
import { calculateAttendance, calculateGpa } from "../domain/study";
import type { Course, ScheduleEvent, Weekday } from "../domain/schedule";
import type {
  CourseRepository,
  CreateCourseInput,
  CreateScheduleEventInput,
  ScheduleEventRepository,
  UpdateCourseInput,
  UpdateScheduleEventInput,
} from "../repositories/scheduleRepository";

export type StudyToolsService = Readonly<{
  isTemporary: boolean;
  temporaryDataNotice: string;
  listCoursesForDay(
    weekday: Weekday,
    termId: string,
  ): Promise<readonly Course[]>;
  addCourse(input: CreateCourseInput): Promise<Course>;
  updateCourse(id: EntityId, input: UpdateCourseInput): Promise<Course>;
  deleteCourse(id: EntityId): Promise<void>;
  listEventsInRange(
    startsAt: UtcIsoDateTime | string,
    endsAt: UtcIsoDateTime | string,
  ): Promise<readonly ScheduleEvent[]>;
  addEvent(input: CreateScheduleEventInput): Promise<ScheduleEvent>;
  updateEvent(
    id: EntityId,
    input: UpdateScheduleEventInput,
  ): Promise<ScheduleEvent>;
  deleteEvent(id: EntityId): Promise<void>;
  calculateGpa(
    courses: readonly CourseGrade[],
    options?: GpaCalculationOptions,
  ): Result<GpaCalculationResult, string>;
  calculateAttendance(
    records: readonly AttendanceRecord[],
    options?: AttendanceCalculationOptions,
  ): Result<AttendanceCalculationResult, string>;
}>;

export type CreateStudyToolsServiceOptions = Readonly<{
  courseRepository: CourseRepository;
  scheduleEventRepository: ScheduleEventRepository;
  isTemporary?: boolean;
}>;

const TEMPORARY_DATA_NOTICE = "当前为本地临时数据，重启后会清空。";
const PERSISTENT_DATA_NOTICE = "数据仅保存在本机，重启后仍会保留。";

export function createStudyToolsService(
  options: CreateStudyToolsServiceOptions,
): StudyToolsService {
  const { courseRepository, scheduleEventRepository } = options;

  return {
    isTemporary: options.isTemporary ?? false,
    temporaryDataNotice:
      options.isTemporary === true
        ? TEMPORARY_DATA_NOTICE
        : PERSISTENT_DATA_NOTICE,
    listCoursesForDay: (weekday, termId) =>
      courseRepository.listByWeekdayAndTerm(weekday, termId),
    addCourse: (input) => courseRepository.create(input),
    updateCourse: (id, input) => courseRepository.update(id, input),
    deleteCourse: (id) => courseRepository.delete(id),
    listEventsInRange: (startsAt, endsAt) =>
      scheduleEventRepository.listInUtcRange(startsAt, endsAt),
    addEvent: (input) => scheduleEventRepository.create(input),
    updateEvent: (id, input) => scheduleEventRepository.update(id, input),
    deleteEvent: (id) => scheduleEventRepository.delete(id),
    calculateGpa: (courses, options) => calculateGpa(courses, options),
    calculateAttendance: (records, options) =>
      calculateAttendance(records, options),
  };
}
