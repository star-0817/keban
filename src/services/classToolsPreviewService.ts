import { createDatabaseInitializer } from "../repositories/databaseInitializer";
import { INITIAL_MIGRATIONS } from "../repositories/migrations";
import { createRosterRepository } from "../repositories/rosterRepository";
import { createInMemorySqliteDatabase } from "../repositories/testing/inMemorySqliteDatabase";

import {
  createClassToolsService,
  type ClassToolsService,
} from "./classToolsService";

let previewServicePromise: Promise<ClassToolsService> | undefined;

export function getClassToolsPreviewService(): Promise<ClassToolsService> {
  previewServicePromise ??= createPreviewService();

  return previewServicePromise;
}

async function createPreviewService(): Promise<ClassToolsService> {
  const database = createInMemorySqliteDatabase();
  const initializer = createDatabaseInitializer({
    database,
    migrations: INITIAL_MIGRATIONS,
  });
  const initialized = await initializer.initialize();

  if (!initialized.ok) {
    throw new Error(initialized.error);
  }

  return createClassToolsService({
    rosterRepository: createRosterRepository({ database }),
    isTemporary: true,
  });
}
