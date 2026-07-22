import type { ClassToolsService } from "./classToolsService";
import { getLocalDatabaseRuntime } from "./localDatabaseService";

export function getClassToolsPreviewService(): Promise<ClassToolsService> {
  return getLocalDatabaseRuntime().then((runtime) => runtime.classToolsService);
}
