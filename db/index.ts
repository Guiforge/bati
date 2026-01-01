// Database exports

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
  ActiveAdventureRun,
  Adventure,
  AdventureDetails,
  AdventureKind,
  AdventureRun,
  AdventureRunStep,
  AdventureStepTemplate,
} from "./adventures";
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
export type {
  BuildingLevelUp,
  BuildingUnlock,
  SessionBuildingResult,
  VillageBuilding,
  VillageBuildingWithMeta,
  VillageStatsType,
} from "./buildings";
export { db, schema } from "./client";
export {
  createCompletedSession,
  getCompletedSessionById,
  getQuestSessionHistory,
  getRecentSessionHistory,
  listCompletedSessions,
} from "./completed";
export type { SessionSummary } from "./completed";
export { suggestDifficultyFromSessions } from "./difficultySuggestion";
export { EQUIPMENT_LABELS, isEquipmentCode } from "./equipment";
export {
  estimateExerciseSeconds,
  estimateQuestSeconds,
  formatDuration,
} from "./estimate";
export { getExerciseById, listExercises } from "./exercises";
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
export type { CreateGoalInput, Goal, GoalProgress } from "./goals";
export {
  getAllPreferences,
  getPreference,
  preferences,
  setPreference,
} from "./preferences";
export { estimateQuestTemplateSeconds } from "./preview";
export {
  Difficulty,
  createQuestTemplate,
  deleteQuest,
  generateTarget,
  getQuestById,
  getQuestTemplateById,
  listQuestTemplates,
  setQuestExercises,
  updateQuestMeta,
} from "./quests";
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
export type {
  ExerciseResultForResources,
  ResourceAmount,
  ResourceLoot,
  ResourceTransaction,
} from "./resources";
