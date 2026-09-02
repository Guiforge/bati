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
export {
  deleteUserExercise,
  getExerciseById,
  getExerciseUsage,
  heroFirst,
  isUserExercise,
  listExercises,
  pickableExercises,
  retireUserExercise,
  unretireUserExercise,
} from "./exercises";
export { preferences, type TrainingLevel } from "./preferences";
export { estimateQuestTemplateSeconds, estimateQuestTemplateXp } from "./preview";
export type { QuestConfig } from "./questConfig";
export {
  applyQuestConfig,
  clearQuestConfig,
  getQuestConfig,
  hasQuestOverrides,
  indexExercises,
  saveQuestConfig,
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
  DEFAULT_DISTANCE_GOAL_M,
  DISTANCE_GOAL_RANGE,
  DISTANCE_GOAL_STEP,
  REST_RANGE,
  ROUNDS_RANGE,
  TARGET_RANGE,
  targetRangeFor,
} from "./targets";
export {
  calculateLevelFromXp as calculateUserLevelFromXp,
  getTotalXp,
  getXpForLevel,
} from "./userLevel";
// `db/xp.ts` is the only place the XP arithmetic and its constants live. Only the screens' entry
// point is re-exported here; `saveSession` and the tests import the module itself.
export { estimateQuestXp } from "./xp";
