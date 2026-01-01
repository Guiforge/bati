// Database exports

export type {
  AchievementCode,
  AchievementDefinition,
  AchievementProgress,
  NewAchievementResult,
  UnlockedAchievement,
} from "./achievements";
export {
  achievementCodes,
  achievementDefinitions,
  checkForNewAchievements,
  getAchievementDefinition,
  getAchievementStats,
  getAllAchievementsWithProgress,
  getUnlockedAchievements,
  unlockAchievement,
} from "./achievements";
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
export type { CompletedSessionListItem, SessionSummary } from "./completed";
export {
  createCompletedSession,
  getCompletedSessionById,
  getQuestSessionHistory,
  getRecentSessionHistory,
  listCompletedSessions,
  markSessionWithNewRecords,
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
export { generatePlanForGoal, type PlannedSession, previewPlanForGoal } from "./plans";
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
export type { RestSuggestion } from "./restSuggestions";
export { getQuickRestCheck, getRestSuggestion } from "./restSuggestions";
export type {
  CreateScheduledSessionInput,
  ScheduledSession,
  ScheduledSessionStatus,
  ScheduledSessionWithQuest,
} from "./scheduling";
export {
  createScheduledSession,
  deleteScheduledSession,
  getPendingScheduledSessions,
  getScheduledSessionsForWeek,
  getScheduledSessionsInRange,
  getTodaysScheduledSessions,
  getWeekStartDate,
  markMissedSessions,
  markScheduledSessionCompleted,
  rescheduleSession,
  scheduleWeekFromGoal,
  skipScheduledSession,
  updateScheduledSessionStatus,
} from "./scheduling";
export type { StreakInfo } from "./streaks";
export {
  calculateAndCacheStreak,
  getCachedStreak,
  getStreakInfo,
  updateStreakAfterSession,
} from "./streaks";
export type { UserLevelInfo } from "./userLevel";
export {
  calculateLevelFromXp as calculateUserLevelFromXp,
  getLevelTitle,
  getTotalStats,
  getTotalXp,
  getUserLevelInfo,
  getXpForLevel,
} from "./userLevel";
