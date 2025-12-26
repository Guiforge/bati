// Database exports
export { db, schema } from "./client";
export type { SessionSummary } from "./completed";
export {
  createCompletedSession,
  getCompletedSessionById,
  getQuestSessionHistory,
  getRecentSessionHistory,
  listCompletedSessions,
} from "./completed";
export { EQUIPMENT_LABELS, isEquipmentCode } from "./equipment";
export {
  estimateExerciseSeconds,
  estimateQuestSeconds,
  formatDuration,
} from "./estimate";
export { getExerciseById, listExercises } from "./exercises";
export {
  getAllPreferences,
  getPreference,
  preferences,
  setPreference,
} from "./preferences";
export {
  createQuestTemplate,
  Difficulty,
  deleteQuest,
  generateTarget,
  getQuestById,
  getQuestTemplateById,
  listQuestTemplates,
  setQuestExercises,
  updateQuestMeta,
} from "./quests";
