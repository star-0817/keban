import type { EntityBase, EntityId, UtcIsoDateTime } from "../index";
import { createId, err, ok, toUtcIsoDateTime, type Result } from "../index";

export const MAX_STUDENT_NAME_LENGTH = 30;
export const MAX_STUDENT_NO_LENGTH = 40;
export const MAX_STUDENT_NOTE_LENGTH = 200;

export type Student = EntityBase &
  Readonly<{
    name: string;
    studentNo?: string;
    note?: string;
  }>;

export type CreateStudentInput = Readonly<{
  id?: EntityId;
  name: string;
  studentNo?: string;
  note?: string;
  now?: () => Date;
}>;

export type UpdateStudentInput = Readonly<{
  name?: string;
  studentNo?: string;
  note?: string;
  now?: () => Date;
}>;

export type StudentValidationField = "name" | "studentNo" | "note";

export type StudentValidationError = Readonly<{
  field: StudentValidationField;
  message: string;
}>;

export type RosterImportRecord = Readonly<{
  lineNumber: number;
  input: Readonly<{
    name: string;
    studentNo?: string;
    note?: string;
  }>;
}>;

export type RosterImportSkippedRecord = Readonly<{
  lineNumber: number;
  reason: string;
}>;

export type RosterImportError = Readonly<{
  lineNumber: number;
  message: string;
}>;

export type RosterImportResult = Readonly<{
  records: readonly RosterImportRecord[];
  skipped: readonly RosterImportSkippedRecord[];
  errors: readonly RosterImportError[];
}>;

type ParsedLine =
  | Readonly<{ ok: true; fields: readonly string[] }>
  | Readonly<{ ok: false; message: string }>;

type ImportColumns = Readonly<{
  name: number;
  studentNo?: number;
  note?: number;
}>;

export function createStudent(
  input: CreateStudentInput,
): Result<Student, StudentValidationError> {
  const normalized = normalizeStudentFields(input);

  if (!normalized.ok) {
    return normalized;
  }

  const now = toUtcIsoDateTime((input.now ?? (() => new Date()))());

  return ok({
    id: input.id ?? createId(),
    name: normalized.value.name,
    studentNo: normalized.value.studentNo,
    note: normalized.value.note,
    createdAt: now,
    updatedAt: now,
  });
}

export function updateStudent(
  student: Student,
  input: UpdateStudentInput,
): Result<Student, StudentValidationError> {
  const normalized = normalizeStudentFields({
    name: input.name ?? student.name,
    studentNo:
      input.studentNo === undefined ? student.studentNo : input.studentNo,
    note: input.note === undefined ? student.note : input.note,
  });

  if (!normalized.ok) {
    return normalized;
  }

  return ok({
    ...student,
    name: normalized.value.name,
    studentNo: normalized.value.studentNo,
    note: normalized.value.note,
    updatedAt: toUtcIsoDateTime((input.now ?? (() => new Date()))()),
  });
}

export function parseRosterImportText(text: string): RosterImportResult {
  const lines = text.replace(/^\uFEFF/, "").split(/\r\n|\n|\r/);
  const firstContentLine = lines.find((line) => line.trim().length > 0);
  const firstParsed =
    firstContentLine === undefined ? undefined : parseCsvLine(firstContentLine);
  const hasCsvShape =
    firstContentLine !== undefined &&
    (firstContentLine.includes(",") || firstContentLine.includes('"'));
  const headerColumns =
    hasCsvShape && firstParsed?.ok === true
      ? detectHeaderColumns(firstParsed.fields)
      : undefined;
  const headerLineIndex =
    headerColumns === undefined
      ? undefined
      : lines.findIndex((line) => line.trim().length > 0);
  const defaultColumns: ImportColumns = { name: 0, studentNo: 1, note: 2 };

  return lines.reduce<RosterImportResult>(
    (result, line, index) => {
      const lineNumber = index + 1;
      const trimmed = line.trim();

      if (trimmed.length === 0) {
        return {
          ...result,
          skipped: [...result.skipped, { lineNumber, reason: "空行已跳过" }],
        };
      }

      if (index === headerLineIndex) {
        return result;
      }

      const parsed: ParsedLine = hasCsvShape
        ? parseCsvLine(line)
        : { ok: true, fields: [line] };

      if (!parsed.ok) {
        return appendImportError(result, lineNumber, parsed.message);
      }

      const columns = headerColumns ?? defaultColumns;
      const input = buildImportInput(parsed.fields, columns);
      const validation = validateStudentInput(input);

      if (!validation.ok) {
        return appendImportError(result, lineNumber, validation.error.message);
      }

      return {
        ...result,
        records: [
          ...result.records,
          {
            lineNumber,
            input: removeEmptyOptionalFields(validation.value),
          },
        ],
      };
    },
    { records: [], skipped: [], errors: [] },
  );
}

export function validateStudentInput(
  input: Readonly<{ name: string; studentNo?: string; note?: string }>,
): Result<
  Readonly<{ name: string; studentNo?: string; note?: string }>,
  StudentValidationError
> {
  return normalizeStudentFields(input);
}

function normalizeStudentFields(
  input: Readonly<{ name: string; studentNo?: string; note?: string }>,
): Result<
  Readonly<{ name: string; studentNo?: string; note?: string }>,
  StudentValidationError
> {
  const name = input.name.trim();

  if (name.length === 0) {
    return err({ field: "name", message: "姓名不能为空" });
  }

  if (name.length > MAX_STUDENT_NAME_LENGTH) {
    return err({
      field: "name",
      message: `姓名不能超过 ${MAX_STUDENT_NAME_LENGTH} 个字符`,
    });
  }

  const studentNo = normalizeOptionalText(input.studentNo);
  const note = normalizeOptionalText(input.note);

  if (studentNo !== undefined && studentNo.length > MAX_STUDENT_NO_LENGTH) {
    return err({
      field: "studentNo",
      message: `学号不能超过 ${MAX_STUDENT_NO_LENGTH} 个字符`,
    });
  }

  if (
    studentNo !== undefined &&
    !/^[\p{Script=Han}\p{Letter}\p{Number}_ -]+$/u.test(studentNo)
  ) {
    return err({
      field: "studentNo",
      message: "学号只能包含中文、字母、数字、空格、横线和下划线",
    });
  }

  if (note !== undefined && note.length > MAX_STUDENT_NOTE_LENGTH) {
    return err({
      field: "note",
      message: `备注不能超过 ${MAX_STUDENT_NOTE_LENGTH} 个字符`,
    });
  }

  return ok(removeEmptyOptionalFields({ name, studentNo, note }));
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  const normalized = value?.trim();

  return normalized === undefined || normalized.length === 0
    ? undefined
    : normalized;
}

function removeEmptyOptionalFields<
  T extends { studentNo?: string; note?: string },
>(input: T): T {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  ) as T;
}

function appendImportError(
  result: RosterImportResult,
  lineNumber: number,
  message: string,
): RosterImportResult {
  return {
    ...result,
    errors: [
      ...result.errors,
      {
        lineNumber,
        message: `第 ${lineNumber} 行：${message}`,
      },
    ],
  };
}

function buildImportInput(
  fields: readonly string[],
  columns: ImportColumns,
): Readonly<{ name: string; studentNo?: string; note?: string }> {
  return {
    name: fields[columns.name] ?? "",
    studentNo:
      columns.studentNo === undefined ? undefined : fields[columns.studentNo],
    note: columns.note === undefined ? undefined : fields[columns.note],
  };
}

function detectHeaderColumns(
  fields: readonly string[],
): ImportColumns | undefined {
  const normalized = fields.map((field) => field.trim().toLowerCase());
  const nameIndex = normalized.findIndex((field) =>
    ["姓名", "名字", "name", "studentname", "student_name"].includes(field),
  );

  if (nameIndex < 0) {
    return undefined;
  }

  return {
    name: nameIndex,
    studentNo: findColumn(normalized, [
      "学号",
      "学生号",
      "studentno",
      "student_no",
      "number",
      "no",
    ]),
    note: findColumn(normalized, ["备注", "说明", "note", "remark", "remarks"]),
  };
}

function findColumn(
  normalizedFields: readonly string[],
  candidates: readonly string[],
): number | undefined {
  const index = normalizedFields.findIndex((field) =>
    candidates.includes(field),
  );

  return index < 0 ? undefined : index;
}

function parseCsvLine(line: string): ParsedLine {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  if (inQuotes) {
    return { ok: false, message: "CSV 引号格式不正确" };
  }

  fields.push(current.trim());

  return { ok: true, fields };
}

export function restoreStudentFromStorage(
  input: Readonly<{
    id: EntityId;
    name: string;
    studentNo?: string;
    note?: string;
    createdAt: UtcIsoDateTime;
    updatedAt: UtcIsoDateTime;
  }>,
): Student {
  return input;
}
