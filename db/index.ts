// Barrel for the symbols actually imported via "@/db" — most callers import their
// submodule directly; add here only when a screen genuinely needs the shorthand.

export type {
  ActiveAdventureRun,
  Adventure,
  AdventureDetails,
  AdventureStepTemplate,
} from "./adventures";
export {
  completeAdventureRunStep,
  getActiveAdventureRun,
  getAdventureDetails,
  getAdventureIdForRunStep,
  getAnyActiveAdventureRun,
  getFinishedRunCountsByAdventure,
  listAdventures,
  startAdventureRun,
} from "./adventures";
export { db, schema } from "./client";
export type { SessionSummary } from "./completed";
export {
  getCompletedSessionById,
  getQuestSessionHistory,
  getRecentSessionHistory,
} from "./completed";
export { suggestDifficultyFromSessions } from "./difficultySuggestion";
export {
  adventureWeeks,
  estimateQuestSeconds,
  formatDuration,
  formatDurationEstimate,
} from "./estimate";
export { getExerciseById, listExercises } from "./exercises";
export { preferences, type TrainingLevel } from "./preferences";
export { estimateQuestTemplateSeconds } from "./preview";
export type { QuestConfig } from "./questConfig";
export {
  applyQuestConfig,
  clearQuestConfig,
  getQuestConfig,
  hasQuestOverrides,
  REST_RANGE,
  ROUNDS_RANGE,
  saveQuestConfig,
  TARGET_RANGE,
} from "./questConfig";
export type { TrainingFocus } from "./quests";
export {
  createQuestTemplate,
  Difficulty,
  deleteQuest,
  getQuestById,
  getQuestTemplateById,
  isUserQuest,
  listQuestTemplates,
  setQuestExercises,
  trainingFocus,
  USER_QUEST_AUTHOR,
  updateQuestMeta,
} from "./quests";
export {
  calculateLevelFromXp as calculateUserLevelFromXp,
  getTotalXp,
  getXpForLevel,
} from "./userLevel";
