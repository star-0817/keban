import {
  createStudent,
  restoreStudentFromStorage,
  updateStudent,
  type Student,
  type CreateStudentInput as DomainCreateStudentInput,
  type UpdateStudentInput as DomainUpdateStudentInput,
} from "../domain/roster";
import type { EntityId, PageRequest, UtcIsoDateTime } from "../domain";
import type { SqliteDatabase, SqliteRow } from "../plugins/sqlite";

import type { WritableRepository } from "./types";

export type CreateStudentInput = Omit<DomainCreateStudentInput, "id">;
export type UpdateStudentInput = DomainUpdateStudentInput;

export type RosterRepository = WritableRepository<
  Student,
  CreateStudentInput,
  UpdateStudentInput
>;

type StudentRow = SqliteRow &
  Readonly<{
    id: string;
    name: string;
    student_no: string | null;
    note: string | null;
    created_at: string;
    updated_at: string;
  }>;

export type CreateRosterRepositoryOptions = Readonly<{
  database: SqliteDatabase;
  now?: () => Date;
}>;

export function createRosterRepository(
  options: CreateRosterRepositoryOptions,
): RosterRepository {
  const { database } = options;
  const defaultNow = options.now;

  return {
    findById: async (id) => {
      const result = await database.query<StudentRow>(
        "SELECT id, name, student_no, note, created_at, updated_at FROM students WHERE id = ?",
        [id],
      );
      const row = result.rows[0];

      return row === undefined ? null : rowToStudent(row);
    },
    list: async (page?: PageRequest) => {
      const result =
        page === undefined
          ? await database.query<StudentRow>(
              "SELECT id, name, student_no, note, created_at, updated_at FROM students ORDER BY created_at ASC",
            )
          : await database.query<StudentRow>(
              "SELECT id, name, student_no, note, created_at, updated_at FROM students ORDER BY created_at ASC LIMIT ? OFFSET ?",
              [page.pageSize, (page.page - 1) * page.pageSize],
            );

      return result.rows.map(rowToStudent);
    },
    create: async (input) => {
      const student = createStudent({
        ...input,
        now: input.now ?? defaultNow,
      });

      if (!student.ok) {
        throw new Error(student.error.message);
      }

      await database.execute(
        "INSERT INTO students (id, name, student_no, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
        [
          student.value.id,
          student.value.name,
          student.value.studentNo ?? null,
          student.value.note ?? null,
          student.value.createdAt,
          student.value.updatedAt,
        ],
      );

      return student.value;
    },
    update: async (id, input) => {
      const current = await findStudentOrThrow(database, id);
      const updated = updateStudent(current, {
        ...input,
        now: input.now ?? defaultNow,
      });

      if (!updated.ok) {
        throw new Error(updated.error.message);
      }

      await database.execute(
        "UPDATE students SET name = ?, student_no = ?, note = ?, updated_at = ? WHERE id = ?",
        [
          updated.value.name,
          updated.value.studentNo ?? null,
          updated.value.note ?? null,
          updated.value.updatedAt,
          id,
        ],
      );

      return updated.value;
    },
    delete: async (id) => {
      await database.execute("DELETE FROM students WHERE id = ?", [id]);
    },
  };
}

async function findStudentOrThrow(
  database: SqliteDatabase,
  id: EntityId,
): Promise<Student> {
  const result = await database.query<StudentRow>(
    "SELECT id, name, student_no, note, created_at, updated_at FROM students WHERE id = ?",
    [id],
  );
  const row = result.rows[0];

  if (row === undefined) {
    throw new Error("学生记录不存在");
  }

  return rowToStudent(row);
}

function rowToStudent(row: StudentRow): Student {
  return restoreStudentFromStorage({
    id: row.id as EntityId,
    name: row.name,
    studentNo: row.student_no ?? undefined,
    note: row.note ?? undefined,
    createdAt: row.created_at as UtcIsoDateTime,
    updatedAt: row.updated_at as UtcIsoDateTime,
  });
}
