// Database exports

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
  AchievementCode,
  AchievementDefinition,
  AchievementProgress,
  NewAchievementResult,
  UnlockedAchievement,
} from "./achievements";
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
  markSessionWithNewRecords,
} from "./completed";
export type { CompletedSessionListItem, SessionSummary } from "./completed";
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
export { getQuickRestCheck, getRestSuggestion } from "./restSuggestions";
export type { RestSuggestion } from "./restSuggestions";
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
export type {
  CreateScheduledSessionInput,
  ScheduledSession,
  ScheduledSessionStatus,
  ScheduledSessionWithQuest,
} from "./scheduling";
export {
  calculateAndCacheStreak,
  getCachedStreak,
  getStreakInfo,
  updateStreakAfterSession,
} from "./streaks";
export type { StreakInfo } from "./streaks";
export {
  calculateLevelFromXp as calculateUserLevelFromXp,
  getLevelTitle,
  getTotalStats,
  getTotalXp,
  getUserLevelInfo,
  getXpForLevel,
} from "./userLevel";
export type { UserLevelInfo } from "./userLevel";
