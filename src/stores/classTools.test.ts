import { setActivePinia, createPinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";

import { toUtcIsoDateTime, type EntityId } from "../domain";
import type { Student } from "../domain/roster";
import type { ClassToolsService } from "../services/classToolsService";

import { useClassToolsStore } from "./classTools";

const fixedStudents: readonly Student[] = [
  {
    id: "student-1" as EntityId,
    name: "张三",
    createdAt: toUtcIsoDateTime(new Date("2026-07-22T08:00:00.000Z")),
    updatedAt: toUtcIsoDateTime(new Date("2026-07-22T08:00:00.000Z")),
  },
];

function createFakeService(): ClassToolsService {
  return {
    isTemporary: true,
    temporaryDataNotice: "当前为本地临时数据，重启后会清空。",
    listStudents: async () => fixedStudents,
    addStudent: async (input) => ({
      ...fixedStudents[0],
      id: "student-added" as EntityId,
      name: input.name,
      studentNo: input.studentNo,
      note: input.note,
    }),
    updateStudent: async (id, input) => ({
      ...fixedStudents[0],
      id,
      name: input.name ?? fixedStudents[0].name,
      studentNo: input.studentNo,
      note: input.note,
    }),
    deleteStudent: async () => undefined,
    previewImport: (text) => ({
      sourceText: text,
      records: [{ lineNumber: 1, input: { name: "李四" } }],
      skipped: [],
      errors: [],
      summary: { validCount: 1, skippedCount: 0, errorCount: 0 },
    }),
    confirmImport: async () => [],
    drawStudents: async () => ({
      ok: true,
      value: {
        mode: "draw",
        seed: "seed",
        selectedMembers: fixedStudents,
        excludedMemberIds: [],
      },
    }),
    groupStudents: async () => ({
      ok: true,
      value: {
        mode: "group",
        seed: "seed",
        groups: [{ groupNumber: 1, members: fixedStudents }],
        excludedMemberIds: [],
      },
    }),
  };
}

describe("useClassToolsStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("loads students and exposes the temporary data notice", async () => {
    const store = useClassToolsStore();

    store.setService(createFakeService());
    await store.loadStudents();

    expect(store.students).toEqual(fixedStudents);
    expect(store.totalCount).toBe(1);
    expect(store.temporaryDataNotice).toBe(
      "当前为本地临时数据，重启后会清空。",
    );
  });

  it("keeps import preview separate until confirmImport is called", async () => {
    const store = useClassToolsStore();

    store.setService(createFakeService());
    await store.previewImport("李四");

    expect(store.importPreview?.summary.validCount).toBe(1);
    expect(store.students).toEqual([]);

    await store.confirmImport();

    expect(store.importPreview).toBeNull();
    expect(store.students).toEqual(fixedStudents);
  });

  it("stores draw and grouping results returned by the service", async () => {
    const store = useClassToolsStore();

    store.setService(createFakeService());
    await store.drawStudents({ count: 1 });
    await store.groupStudents({ mode: { type: "group-count", groupCount: 1 } });

    expect(store.drawResult?.seed).toBe("seed");
    expect(store.groupResult?.groups).toHaveLength(1);
  });
});
