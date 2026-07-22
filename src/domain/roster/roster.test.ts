import { describe, expect, it } from "vitest";

import type { EntityId } from "../ids";

import {
  MAX_STUDENT_NAME_LENGTH,
  createStudent,
  parseRosterImportText,
  updateStudent,
} from "./index";

describe("roster student domain", () => {
  it("creates a student after trimming optional fields", () => {
    const student = createStudent({
      id: "student-1" as EntityId,
      name: "  张三  ",
      studentNo: "  2026001 ",
      note: "  班长 ",
      now: () => new Date("2026-07-22T08:00:00.000Z"),
    });

    expect(student).toEqual({
      ok: true,
      value: {
        id: "student-1",
        name: "张三",
        studentNo: "2026001",
        note: "班长",
        createdAt: "2026-07-22T08:00:00.000Z",
        updatedAt: "2026-07-22T08:00:00.000Z",
      },
    });
  });

  it("rejects blank names and fields beyond the configured limits", () => {
    expect(createStudent({ name: "   " })).toEqual({
      ok: false,
      error: { field: "name", message: "姓名不能为空" },
    });

    expect(
      createStudent({ name: "一".repeat(MAX_STUDENT_NAME_LENGTH + 1) }),
    ).toEqual({
      ok: false,
      error: {
        field: "name",
        message: `姓名不能超过 ${MAX_STUDENT_NAME_LENGTH} 个字符`,
      },
    });

    expect(createStudent({ name: "李四", studentNo: "学号/001" })).toEqual({
      ok: false,
      error: {
        field: "studentNo",
        message: "学号只能包含中文、字母、数字、空格、横线和下划线",
      },
    });
  });

  it("updates only provided fields and refreshes updatedAt", () => {
    const created = createStudent({
      id: "student-2" as EntityId,
      name: "李四",
      studentNo: "1",
      now: () => new Date("2026-07-22T08:00:00.000Z"),
    });
    expect(created.ok).toBe(true);

    const updated = updateStudent(created.ok ? created.value : neverStudent(), {
      note: "  体育委员  ",
      studentNo: "   ",
      now: () => new Date("2026-07-23T08:00:00.000Z"),
    });

    expect(updated).toEqual({
      ok: true,
      value: {
        id: "student-2",
        name: "李四",
        studentNo: undefined,
        note: "体育委员",
        createdAt: "2026-07-22T08:00:00.000Z",
        updatedAt: "2026-07-23T08:00:00.000Z",
      },
    });
  });
});

describe("parseRosterImportText", () => {
  it("parses one-name-per-line text and skips empty lines", () => {
    const result = parseRosterImportText(" 张三 \r\n\r\n李四\n王五 ");

    expect(result.records).toEqual([
      { lineNumber: 1, input: { name: "张三" } },
      { lineNumber: 3, input: { name: "李四" } },
      { lineNumber: 4, input: { name: "王五" } },
    ]);
    expect(result.skipped).toEqual([{ lineNumber: 2, reason: "空行已跳过" }]);
    expect(result.errors).toEqual([]);
  });

  it("parses csv with a recognized header", () => {
    const result = parseRosterImportText(
      "姓名, 学号, 备注\r\n 张三,2026001,班长\r\n李四,,转入",
    );

    expect(result.records).toEqual([
      {
        lineNumber: 2,
        input: { name: "张三", studentNo: "2026001", note: "班长" },
      },
      { lineNumber: 3, input: { name: "李四", note: "转入" } },
    ]);
    expect(result.skipped).toEqual([]);
    expect(result.errors).toEqual([]);
  });

  it("parses csv without a header as name, student number and note", () => {
    const result = parseRosterImportText('张三,2026001,"喜欢,数学"\n李四');

    expect(result.records).toEqual([
      {
        lineNumber: 1,
        input: { name: "张三", studentNo: "2026001", note: "喜欢,数学" },
      },
      { lineNumber: 2, input: { name: "李四" } },
    ]);
    expect(result.errors).toEqual([]);
  });

  it("keeps valid records while reporting invalid lines with line numbers", () => {
    const result = parseRosterImportText(
      `姓名,学号,备注
张三,2026001,
,2026002,缺少姓名
${"一".repeat(MAX_STUDENT_NAME_LENGTH + 1)},2026003,
张三,2026004,重复姓名允许保留
李四,学号/2,无效学号`,
    );

    expect(result.records).toEqual([
      {
        lineNumber: 2,
        input: { name: "张三", studentNo: "2026001" },
      },
      {
        lineNumber: 5,
        input: {
          name: "张三",
          studentNo: "2026004",
          note: "重复姓名允许保留",
        },
      },
    ]);
    expect(result.errors).toEqual([
      { lineNumber: 3, message: "第 3 行：姓名不能为空" },
      {
        lineNumber: 4,
        message: `第 4 行：姓名不能超过 ${MAX_STUDENT_NAME_LENGTH} 个字符`,
      },
      {
        lineNumber: 6,
        message: "第 6 行：学号只能包含中文、字母、数字、空格、横线和下划线",
      },
    ]);
  });

  it("reports malformed csv quotes without dropping following valid lines", () => {
    const result = parseRosterImportText('姓名,备注\n"张三,坏引号\n李四,有效');

    expect(result.records).toEqual([
      { lineNumber: 3, input: { name: "李四", note: "有效" } },
    ]);
    expect(result.errors).toEqual([
      { lineNumber: 2, message: "第 2 行：CSV 引号格式不正确" },
    ]);
  });
});

function neverStudent(): never {
  throw new Error("student should have been created");
}
