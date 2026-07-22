import { createDatabaseInitializer } from "../repositories/databaseInitializer";
import { INITIAL_MIGRATIONS } from "../repositories/migrations";
import {
  createCourseRepository,
  createScheduleEventRepository,
} from "../repositories/scheduleRepository";
import { createInMemorySqliteDatabase } from "../repositories/testing/inMemorySqliteDatabase";

import {
  createStudyToolsService,
  type StudyToolsService,
} from "./studyToolsService";

let previewServicePromise: Promise<StudyToolsService> | undefined;

export function getStudyToolsPreviewService(): Promise<StudyToolsService> {
  previewServicePromise ??= createPreviewService();

  return previewServicePromise;
}

async function createPreviewService(): Promise<StudyToolsService> {
  const database = createInMemorySqliteDatabase();
  const initializer = createDatabaseInitializer({
    database,
    migrations: INITIAL_MIGRATIONS,
  });
  const initialized = await initializer.initialize();

  if (!initialized.ok) {
    throw new Error(initialized.error);
  }

  return createStudyToolsService({
    courseRepository: createCourseRepository({ database }),
    scheduleEventRepository: createScheduleEventRepository({ database }),
    isTemporary: true,
  });
}
