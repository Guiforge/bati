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
  getAdventureIdForRunStep,
  getAnyActiveAdventureRun,
  listAdventures,
  setAdventureRunDifficultyOverride,
  startAdventureRun,
} from "./adventures";
export { db, schema } from "./client";
export type {
  CompletedSessionListItem,
  MonthlyTrend,
  SessionSummary,
  TrendAnalysis,
  WeeklyTrend,
} from "./completed";
export {
  analyzeTrend,
  createCompletedSession,
  getCompletedSessionById,
  getMonthlyTrends,
  getQuestSessionHistory,
  getRecentSessionHistory,
  getTrendSummary,
  getWeeklyTrends,
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
export type { Oath, OathMetric, OathProgress } from "./oaths";
export {
  breakOath,
  checkOathFulfilled,
  getOath,
  getOathProgress,
  oathNeedsExercise,
  swearOath,
} from "./oaths";
export {
  getAllPreferences,
  getPreference,
  preferences,
  setPreference,
  type TrainingLevel,
} from "./preferences";
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
export {
  createQuestTemplate,
  Difficulty,
  deleteQuest,
  generateTarget,
  getQuestById,
  getQuestTemplateById,
  isUserQuest,
  listQuestTemplates,
  setQuestExercises,
  USER_QUEST_AUTHOR,
  updateQuestMeta,
} from "./quests";
export type { RestSuggestion } from "./restSuggestions";
export { getQuickRestCheck, getRestSuggestion } from "./restSuggestions";
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
