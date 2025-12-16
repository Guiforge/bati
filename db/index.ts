// Database exports
export { db, schema } from "./client";
export {
  createCompletedSession,
  getCompletedSessionById,
  listCompletedSessions,
} from "./completed";
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
