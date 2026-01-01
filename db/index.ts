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
export type {
  BuildingLevelUp,
  BuildingUnlock,
  SessionBuildingResult,
  VillageBuilding,
  VillageBuildingWithMeta,
  VillageStatsType,
} from "./buildings";
export {
  addBuildingXp,
  calculateLevelFromXp,
  ensureVillageBuildingsExist,
  getAllBuildings,
  getBuildingByType,
  getUnlockedBuildings,
  getVillageStats,
  processSessionBuildings,
  unlockBuilding,
} from "./buildings";
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
export type { CreateGoalInput, Goal, GoalProgress } from "./goals";
export {
  createGoal,
  getActiveGoal,
  getAllGoals,
  getCurrentWeekCompletion,
  getGoalById,
  getGoalProgressHistory,
  getOrCreateWeekProgress,
  getWeekKey,
  goalTypeInfo,
  recordSessionForGoal,
  updateGoal,
  updateGoalStatus,
} from "./goals";
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
export type {
  ExerciseResultForResources,
  ResourceAmount,
  ResourceLoot,
  ResourceTransaction,
} from "./resources";
export {
  addResources,
  awardSessionResources,
  calculateSessionResources,
  ensureResourceInventoryExists,
  getDifficultyMultiplier,
  getResourceAmount,
  getResourceInventory,
  previewSessionLoot,
  spendResources,
} from "./resources";
