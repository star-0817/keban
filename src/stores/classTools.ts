import { defineStore } from "pinia";

import type { EntityId } from "../domain";
import type {
  DrawRandomMembersResult,
  GroupRandomMembersResult,
  GroupingMode,
} from "../domain/grouping";
import type { Student } from "../domain/roster";
import { getClassToolsPreviewService } from "../services/classToolsPreviewService";
import type {
  ClassToolsService,
  DrawStudentsInput,
  GroupStudentsInput,
  RosterImportPreview,
} from "../services/classToolsService";

type StudentFormInput = Readonly<{
  name: string;
  studentNo?: string;
  note?: string;
}>;

export const useClassToolsStore = defineStore("classTools", {
  state: () => ({
    students: [] as Student[],
    loading: false,
    errorMessage: "",
    importPreview: null as RosterImportPreview | null,
    drawResult: null as DrawRandomMembersResult<Student> | null,
    groupResult: null as GroupRandomMembersResult<Student> | null,
    service: null as ClassToolsService | null,
  }),
  getters: {
    totalCount: (state) => state.students.length,
    temporaryDataNotice: (state) =>
      state.service?.temporaryDataNotice ??
      "当前为本地临时数据，重启后会清空。",
  },
  actions: {
    setService(service: ClassToolsService) {
      this.service = service;
    },
    async getService(): Promise<ClassToolsService> {
      if (this.service === null) {
        this.service = await getClassToolsPreviewService();
      }

      return this.service;
    },
    async loadStudents() {
      await this.run(async (service) => {
        this.students = [...(await service.listStudents())];
      });
    },
    async addStudent(input: StudentFormInput) {
      await this.run(async (service) => {
        await service.addStudent(input);
        this.students = [...(await service.listStudents())];
      });
    },
    async updateStudent(id: EntityId, input: StudentFormInput) {
      await this.run(async (service) => {
        await service.updateStudent(id, input);
        this.students = [...(await service.listStudents())];
      });
    },
    async deleteStudent(id: EntityId) {
      await this.run(async (service) => {
        await service.deleteStudent(id);
        this.students = [...(await service.listStudents())];
      });
    },
    async previewImport(text: string) {
      const service = await this.getService();

      this.importPreview = service.previewImport(text);
    },
    async confirmImport() {
      if (this.importPreview === null) {
        return;
      }

      await this.run(async (service) => {
        await service.confirmImport(this.importPreview!);
        this.importPreview = null;
        this.students = [...(await service.listStudents())];
      });
    },
    clearImportPreview() {
      this.importPreview = null;
    },
    async drawStudents(input: DrawStudentsInput) {
      await this.run(async (service) => {
        const result = await service.drawStudents(input);

        if (!result.ok) {
          this.errorMessage = result.error;
          this.drawResult = null;
          return;
        }

        this.drawResult = result.value;
      });
    },
    async groupStudents(input: GroupStudentsInput) {
      await this.run(async (service) => {
        const result = await service.groupStudents(input);

        if (!result.ok) {
          this.errorMessage = result.error;
          this.groupResult = null;
          return;
        }

        this.groupResult = result.value;
      });
    },
    async groupByCount(groupCount: number, excludedStudentIds: EntityId[]) {
      await this.groupStudents({
        mode: { type: "group-count", groupCount } satisfies GroupingMode,
        excludedStudentIds,
      });
    },
    async run(operation: (service: ClassToolsService) => Promise<void>) {
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
