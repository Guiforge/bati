// Database exports

export type {
  ActiveAdventureRun,
  Adventure,
  AdventureDetails,
  AdventureKind,
  AdventureRun,
  AdventureRunStep,
  AdventureStepTemplate,
} from "./adventures";
export {
  completeAdventureRunStep,
  getActiveAdventureRun,
  getAdventureDetails,
  getAnyActiveAdventureRun,
  listAdventures,
  setAdventureRunDifficultyOverride,
  startAdventureRun,
} from "./adventures";
export { db, schema } from "./client";
export type { SessionSummary } from "./completed";
export {
  createCompletedSession,
  getCompletedSessionById,
  getQuestSessionHistory,
  getRecentSessionHistory,
  listCompletedSessions,
} from "./completed";
export { suggestDifficultyFromSessions } from "./difficultySuggestion";
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
export { estimateQuestTemplateSeconds } from "./preview";
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
export type { ResourceAmount, ResourceLoot, ResourceTransaction } from "./resources";
export {
  addResources,
  calculateSessionResources,
  ensureResourceInventoryExists,
  getDifficultyMultiplier,
  getResourceAmount,
  getResourceInventory,
  spendResources,
} from "./resources";
