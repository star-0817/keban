import {
  createAndroidUniAppSqliteAdapter,
  isAndroidUniAppRuntime,
  type SqliteDatabase,
  type SqliteDatabaseAdapter,
} from "../plugins/sqlite";
import { createDatabaseInitializer } from "../repositories/databaseInitializer";
import {
  INITIAL_MIGRATIONS,
  type DatabaseMigration,
} from "../repositories/migrations";
import { createRosterRepository } from "../repositories/rosterRepository";
import {
  createCourseRepository,
  createScheduleEventRepository,
} from "../repositories/scheduleRepository";
import { createInMemorySqliteDatabase } from "../repositories/testing/inMemorySqliteDatabase";

import {
  createClassToolsService,
  type ClassToolsService,
} from "./classToolsService";
import {
  createStudyToolsService,
  type StudyToolsService,
} from "./studyToolsService";

export type LocalDatabasePlatform = Readonly<{
  isAndroidApp: boolean;
}>;

export type LocalDatabaseRuntime = Readonly<{
  database: SqliteDatabase;
  isTemporary: boolean;
  notice: string;
  fallbackReason?: string;
  classToolsService: ClassToolsService;
  studyToolsService: StudyToolsService;
}>;

export type CreateLocalDatabaseRuntimeOptions = Readonly<{
  nativeAdapter: SqliteDatabaseAdapter;
  platform: LocalDatabasePlatform;
  migrations?: readonly DatabaseMigration[];
}>;

const DATABASE_NAME = "keban.db";
const TEMPORARY_DATA_NOTICE = "当前为本地临时数据，重启后会清空。";
const PERSISTENT_DATA_NOTICE = "数据仅保存在本机，重启后仍会保留。";

let runtimePromise: Promise<LocalDatabaseRuntime> | undefined;

export function getLocalDatabaseRuntime(
  options?: Partial<CreateLocalDatabaseRuntimeOptions>,
): Promise<LocalDatabaseRuntime> {
  runtimePromise ??= createDefaultRuntime(options);

  return runtimePromise;
}

export async function createLocalDatabaseRuntime(
  options: CreateLocalDatabaseRuntimeOptions,
): Promise<LocalDatabaseRuntime> {
  if (!options.platform.isAndroidApp) {
    return createTemporaryRuntime("当前平台不支持 Android 本地 SQLite");
  }

  try {
    const database = await options.nativeAdapter.openDatabase({
      name: DATABASE_NAME,
    });
    const initialized = await createDatabaseInitializer({
      database,
      migrations: options.migrations ?? INITIAL_MIGRATIONS,
    }).initialize();

    if (!initialized.ok) {
      return createTemporaryRuntime(initialized.error);
    }

    return createRuntime({ database, isTemporary: false });
  } catch (error) {
    return createTemporaryRuntime(getErrorMessage(error));
  }
}

function createDefaultRuntime(
  options?: Partial<CreateLocalDatabaseRuntimeOptions>,
): Promise<LocalDatabaseRuntime> {
  return createLocalDatabaseRuntime({
    nativeAdapter: options?.nativeAdapter ?? createDefaultNativeAdapter(),
    platform: options?.platform ?? detectPlatform(),
    migrations: options?.migrations ?? INITIAL_MIGRATIONS,
  });
}

async function createTemporaryRuntime(
  reason: string,
): Promise<LocalDatabaseRuntime> {
  const database = createInMemorySqliteDatabase();
  const initialized = await createDatabaseInitializer({
    database,
    migrations: INITIAL_MIGRATIONS,
  }).initialize();

  if (!initialized.ok) {
    throw new Error(initialized.error);
  }

  return createRuntime({
    database,
    isTemporary: true,
    fallbackReason: `数据库降级为内存模式：${reason}`,
  });
}

function createRuntime(options: {
  readonly database: SqliteDatabase;
  readonly isTemporary: boolean;
  readonly fallbackReason?: string;
}): LocalDatabaseRuntime {
  const { database, isTemporary } = options;

  return {
    database,
    isTemporary,
    notice: isTemporary ? TEMPORARY_DATA_NOTICE : PERSISTENT_DATA_NOTICE,
    fallbackReason: options.fallbackReason,
    classToolsService: createClassToolsService({
      rosterRepository: createRosterRepository({ database }),
      isTemporary,
    }),
    studyToolsService: createStudyToolsService({
      courseRepository: createCourseRepository({ database }),
      scheduleEventRepository: createScheduleEventRepository({ database }),
      isTemporary,
    }),
  };
}

function createDefaultNativeAdapter(): SqliteDatabaseAdapter {
  return createAndroidUniAppSqliteAdapter();
}

function detectPlatform(): LocalDatabasePlatform {
  return { isAndroidApp: isAndroidUniAppRuntime() };
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "未知数据库错误";
}
