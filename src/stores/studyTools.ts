import { defineStore } from "pinia";

import type { EntityId, UtcIsoDateTime } from "../domain";
import type { Course, ScheduleEvent, Weekday } from "../domain/schedule";
import type {
  AttendanceCalculationOptions,
  AttendanceCalculationResult,
  AttendanceRecord,
  CourseGrade,
  GpaCalculationOptions,
  GpaCalculationResult,
} from "../domain/study";
import { getStudyToolsPreviewService } from "../services/studyToolsPreviewService";
import type { StudyToolsService } from "../services/studyToolsService";
import type {
  CreateCourseInput,
  CreateScheduleEventInput,
  UpdateCourseInput,
  UpdateScheduleEventInput,
} from "../repositories/scheduleRepository";

export const useStudyToolsStore = defineStore("studyTools", {
  state: () => ({
    courses: [] as Course[],
    events: [] as ScheduleEvent[],
    gpaResult: null as GpaCalculationResult | null,
    attendanceResult: null as AttendanceCalculationResult | null,
    loading: false,
    errorMessage: "",
    service: null as StudyToolsService | null,
  }),
  getters: {
    temporaryDataNotice: (state) =>
      state.service?.temporaryDataNotice ??
      "当前为本地临时数据，重启后会清空。",
  },
  actions: {
    setService(service: StudyToolsService) {
      this.service = service;
    },
    async getService(): Promise<StudyToolsService> {
      if (this.service === null) {
        this.service = await getStudyToolsPreviewService();
      }

      return this.service;
    },
    async loadCourses(weekday: Weekday, termId: string) {
      await this.run(async (service) => {
        this.courses = [...(await service.listCoursesForDay(weekday, termId))];
      });
    },
    async addCourse(
      input: CreateCourseInput,
      weekday: Weekday,
      termId: string,
    ) {
      await this.run(async (service) => {
        await service.addCourse(input);
        this.courses = [...(await service.listCoursesForDay(weekday, termId))];
      });
    },
    async updateCourse(
      id: EntityId,
      input: UpdateCourseInput,
      weekday: Weekday,
      termId: string,
    ) {
      await this.run(async (service) => {
        await service.updateCourse(id, input);
        this.courses = [...(await service.listCoursesForDay(weekday, termId))];
      });
    },
    async deleteCourse(id: EntityId, weekday: Weekday, termId: string) {
      await this.run(async (service) => {
        await service.deleteCourse(id);
        this.courses = [...(await service.listCoursesForDay(weekday, termId))];
      });
    },
    async loadEvents(
      startsAt: UtcIsoDateTime | string,
      endsAt: UtcIsoDateTime | string,
    ) {
      await this.run(async (service) => {
        this.events = [...(await service.listEventsInRange(startsAt, endsAt))];
      });
    },
    async addEvent(
      input: CreateScheduleEventInput,
      startsAt: UtcIsoDateTime | string,
      endsAt: UtcIsoDateTime | string,
    ) {
      await this.run(async (service) => {
        await service.addEvent(input);
        this.events = [...(await service.listEventsInRange(startsAt, endsAt))];
      });
    },
    async updateEvent(
      id: EntityId,
      input: UpdateScheduleEventInput,
      startsAt: UtcIsoDateTime | string,
      endsAt: UtcIsoDateTime | string,
    ) {
      await this.run(async (service) => {
        await service.updateEvent(id, input);
        this.events = [...(await service.listEventsInRange(startsAt, endsAt))];
      });
    },
    async deleteEvent(
      id: EntityId,
      startsAt: UtcIsoDateTime | string,
      endsAt: UtcIsoDateTime | string,
    ) {
      await this.run(async (service) => {
        await service.deleteEvent(id);
        this.events = [...(await service.listEventsInRange(startsAt, endsAt))];
      });
    },
    async calculateGpa(
      courses: readonly CourseGrade[],
      options?: GpaCalculationOptions,
    ) {
      const service = await this.getService();
      const result = service.calculateGpa(courses, options);

      if (!result.ok) {
        this.gpaResult = null;
        this.errorMessage = result.error;
        return;
      }

      this.errorMessage = "";
      this.gpaResult = result.value;
    },
    async calculateAttendance(
      records: readonly AttendanceRecord[],
      options?: AttendanceCalculationOptions,
    ) {
      const service = await this.getService();
      const result = service.calculateAttendance(records, options);

      if (!result.ok) {
        this.attendanceResult = null;
        this.errorMessage = result.error;
        return;
      }

      this.errorMessage = "";
      this.attendanceResult = result.value;
    },
    async run(operation: (service: StudyToolsService) => Promise<void>) {
      this.loading = true;
      this.errorMessage = "";

      try {
        await operation(await this.getService());
      } catch (error) {
        this.errorMessage =
          error instanceof Error ? error.message : "操作失败，请稍后重试";
      } finally {
        this.loading = false;
      }
    },
  },
});
