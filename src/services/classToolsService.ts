import type { EntityId, Result } from "../domain";
import {
  drawRandomMembers,
  groupRandomMembers,
  type DrawRandomMembersResult,
  type GroupRandomMembersResult,
  type GroupingMode,
} from "../domain/grouping";
import {
  parseRosterImportText,
  type RosterImportError,
  type RosterImportRecord,
  type RosterImportSkippedRecord,
  type Student,
} from "../domain/roster";
import type {
  CreateStudentInput,
  RosterRepository,
  UpdateStudentInput,
} from "../repositories/rosterRepository";

export type RosterImportPreview = Readonly<{
  sourceText: string;
  records: readonly RosterImportRecord[];
  skipped: readonly RosterImportSkippedRecord[];
  errors: readonly RosterImportError[];
  summary: Readonly<{
    validCount: number;
    skippedCount: number;
    errorCount: number;
  }>;
}>;

export type DrawStudentsInput = Readonly<{
  count: number;
  excludedStudentIds?: readonly EntityId[];
  excludedNamesText?: string;
  seed?: string;
}>;

export type GroupStudentsInput = Readonly<{
  mode: GroupingMode;
  excludedStudentIds?: readonly EntityId[];
  excludedNamesText?: string;
  seed?: string;
}>;

export type ClassToolsService = Readonly<{
  isTemporary: boolean;
  temporaryDataNotice: string;
  listStudents(): Promise<readonly Student[]>;
  addStudent(input: CreateStudentInput): Promise<Student>;
  updateStudent(id: EntityId, input: UpdateStudentInput): Promise<Student>;
  deleteStudent(id: EntityId): Promise<void>;
  previewImport(text: string): RosterImportPreview;
  confirmImport(preview: RosterImportPreview): Promise<readonly Student[]>;
  drawStudents(
    input: DrawStudentsInput,
  ): Promise<Result<DrawRandomMembersResult<Student>, string>>;
  groupStudents(
    input: GroupStudentsInput,
  ): Promise<Result<GroupRandomMembersResult<Student>, string>>;
}>;

export type CreateClassToolsServiceOptions = Readonly<{
  rosterRepository: RosterRepository;
  seedFactory?: () => string;
  isTemporary?: boolean;
}>;

const TEMPORARY_DATA_NOTICE = "当前为本地临时数据，重启后会清空。";
const PERSISTENT_DATA_NOTICE = "数据仅保存在本机，重启后仍会保留。";

export function createClassToolsService(
  options: CreateClassToolsServiceOptions,
): ClassToolsService {
  const { rosterRepository } = options;
  const seedFactory = options.seedFactory ?? createDefaultSeed;

  return {
    isTemporary: options.isTemporary ?? false,
    temporaryDataNotice:
      options.isTemporary === true
        ? TEMPORARY_DATA_NOTICE
        : PERSISTENT_DATA_NOTICE,
    listStudents: () => rosterRepository.list(),
    addStudent: (input) => rosterRepository.create(input),
    updateStudent: (id, input) => rosterRepository.update(id, input),
    deleteStudent: (id) => rosterRepository.delete(id),
    previewImport: (text) => {
      const parsed = parseRosterImportText(text);

      return {
        sourceText: text,
        records: parsed.records,
        skipped: parsed.skipped,
        errors: parsed.errors,
        summary: {
          validCount: parsed.records.length,
          skippedCount: parsed.skipped.length,
          errorCount: parsed.errors.length,
        },
      };
    },
    confirmImport: async (preview) =>
      Promise.all(
        preview.records.map((record) => rosterRepository.create(record.input)),
      ),
    drawStudents: async (input) => {
      const students = await rosterRepository.list();

      return drawRandomMembers({
        members: students,
        count: input.count,
        excludedMemberIds: resolveExcludedStudentIds(students, input),
        seed: input.seed ?? seedFactory(),
      });
    },
    groupStudents: async (input) => {
      const students = await rosterRepository.list();

      return groupRandomMembers({
        members: students,
        excludedMemberIds: resolveExcludedStudentIds(students, input),
        mode: input.mode,
        seed: input.seed ?? seedFactory(),
      });
    },
  };
}

function resolveExcludedStudentIds(
  students: readonly Student[],
  input: Readonly<{
    excludedStudentIds?: readonly EntityId[];
    excludedNamesText?: string;
  }>,
): readonly EntityId[] {
  const selectedIds = input.excludedStudentIds ?? [];
  const typedNames = parseExcludedNames(input.excludedNamesText);

  if (typedNames.size === 0) {
    return [...selectedIds];
  }

  const typedIds = students
    .filter((student) => typedNames.has(student.name))
    .map((student) => student.id);

  return [...new Set<EntityId>([...selectedIds, ...typedIds])];
}

function parseExcludedNames(value: string | undefined): ReadonlySet<string> {
  return new Set(
    (value ?? "")
      .split(/[,\n，、\s]+/u)
      .map((item) => item.trim())
      .filter((item) => item.length > 0),
  );
}

function createDefaultSeed(): string {
  return `kb-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}
