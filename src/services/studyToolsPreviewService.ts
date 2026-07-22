import type { StudyToolsService } from "./studyToolsService";
import { getLocalDatabaseRuntime } from "./localDatabaseService";

export function getStudyToolsPreviewService(): Promise<StudyToolsService> {
  return getLocalDatabaseRuntime().then((runtime) => runtime.studyToolsService);
}
