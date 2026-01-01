import { index, int, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

// ------------------------------------------------------------
// Exercises catalogue
// ------------------------------------------------------------

export const muscleCodes = ["arms", "back", "shoulder", "chest", "abs", "calf"] as const;
export type MuscleCode = (typeof muscleCodes)[number];

export const equipmentCodes = [
  "none",
  "pullup_bar",
  "dumbbell",
  "barbell",
  "kettlebell",
  "band",
  "bench",
] as const;
export type EquipmentCode = (typeof equipmentCodes)[number];

export const difficultyCodes = ["easy", "medium", "hard"] as const;
export type DifficultyCode = (typeof difficultyCodes)[number];

export const questTargetTypes = ["reps", "time"] as const;
export type QuestTargetType = (typeof questTargetTypes)[number];

export const feedbackCodes = ["easy", "good", "hard"] as const;
export type FeedbackCode = (typeof feedbackCodes)[number];

// User preferences table - stores onboarding and settings
export const userPreferences = sqliteTable("user_preferences", {
  id: int().primaryKey({ autoIncrement: true }),
  key: text().notNull().unique(),
  value: text().notNull(),
  updatedAt: int({ mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const exercises = sqliteTable(
  "exercises",
  {
    id: int().primaryKey({ autoIncrement: true }),

    enName: text().notNull(),
    frName: text().notNull(),
    enDescription: text().notNull(),
    frDescription: text().notNull(),

    // Store a simple asset path; UI can map it to `require()`.
    imagePath: text().notNull().default("assets/placeholder.jpg"),

    // Exercise owner: user id (string) or "Admin" for built-in content.
    creator: text().notNull().default("Admin"),

    // Stored as lowercase string: easy | medium | hard
    difficulty: text().notNull().default("medium").$type<DifficultyCode>(),

    // Minimal equipment requirements (used for filtering + UI hints)
    equipment: text().notNull().default("none").$type<EquipmentCode>(),

    // For rep-based targets: rough average seconds per repetition.
    // Used to estimate quest duration. (Time-based exercises ignore it.)
    secondsPerRep: int().notNull().default(3),

    createdAt: int({ mode: "timestamp" }).$defaultFn(() => new Date()),
    updatedAt: int({ mode: "timestamp" }).$defaultFn(() => new Date()),
  },
  (table) => ({
    enNameUnique: uniqueIndex("exercises_en_name_unique").on(table.enName),
  }),
);

export const exerciseMuscles = sqliteTable(
  "exercise_muscles",
  {
    exerciseId: int()
      .notNull()
      .references(() => exercises.id, { onDelete: "cascade" }),
    muscle: text().notNull().$type<MuscleCode>(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.exerciseId, table.muscle] }),
    muscleIdx: index("exercise_muscles_muscle_idx").on(table.muscle),
  }),
);

// ------------------------------------------------------------
// Quests (workout sessions)
// ------------------------------------------------------------

export const quests = sqliteTable("quests", {
  id: int().primaryKey({ autoIncrement: true }),

  enTitle: text().notNull(),
  frTitle: text().notNull(),
  enDescription: text().notNull(),
  frDescription: text().notNull(),

  // Content attribution (user id / name or "Admin" for built-in content).
  author: text().notNull().default("Admin"),

  rounds: int().notNull().default(1),

  // Rest between sets (a "set" = one exercise target). In seconds.
  restSeconds: int().notNull().default(30),

  createdAt: int({ mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: int({ mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const questExercises = sqliteTable(
  "quest_exercises",
  {
    id: int().primaryKey({ autoIncrement: true }),

    questId: int()
      .notNull()
      .references(() => quests.id, { onDelete: "cascade" }),
    exerciseId: int()
      .notNull()
      .references(() => exercises.id, { onDelete: "cascade" }),

    sortOrder: int().notNull(),

    // Base target range used by `generateTarget`.
    targetType: text().notNull().$type<QuestTargetType>(),
    targetMin: int().notNull(),
    targetMax: int().notNull(),

    // JSON stringified array of image asset paths.
    imagesJson: text().notNull().default("[]"),
  },
  (table) => ({
    questIdx: index("quest_exercises_quest_idx").on(table.questId),
    sortUnique: uniqueIndex("quest_exercises_quest_sort_unique").on(table.questId, table.sortOrder),
  }),
);

// ------------------------------------------------------------
// Adventures (quest wrappers)
// ------------------------------------------------------------

export const adventures = sqliteTable(
  "adventures",
  {
    id: int().primaryKey({ autoIncrement: true }),

    // Adventure points to an existing quest template.
    questId: int()
      .notNull()
      .references(() => quests.id, { onDelete: "cascade" }),

    // Adventure-level narrative (can differ from the underlying quests).
    enTitle: text().notNull().default(""),
    frTitle: text().notNull().default(""),
    enDescription: text().notNull().default(""),
    frDescription: text().notNull().default(""),

    // Content attribution (user id / name or "Admin" for built-in content).
    author: text().notNull().default("Admin"),

    // Ordering in the gallery.
    sortOrder: int().notNull().default(0),

    // Future-proofing (boss/route/event...).
    kind: text().notNull().default("route"),

    // Soft flag to hide adventures without deleting content.
    isActive: int().notNull().default(1),

    // Boss-specific fields (only used when kind = "boss")
    bossTotalHp: int(),
    bossWeaknessMuscle: text().$type<MuscleCode>(),
    bossResistanceMuscle: text().$type<MuscleCode>(),

    createdAt: int({ mode: "timestamp" }).$defaultFn(() => new Date()),
    updatedAt: int({ mode: "timestamp" }).$defaultFn(() => new Date()),
  },
  (table) => ({
    questUnique: uniqueIndex("adventures_quest_unique").on(table.questId),
    activeSortIdx: index("adventures_active_sort_idx").on(table.isActive, table.sortOrder),
  }),
);

export const adventureStepStatuses = ["locked", "active", "completed"] as const;
export type AdventureStepStatus = (typeof adventureStepStatuses)[number];

export const adventureRunStatuses = ["active", "finished"] as const;
export type AdventureRunStatus = (typeof adventureRunStatuses)[number];

export const adventureSteps = sqliteTable(
  "adventure_steps",
  {
    id: int().primaryKey({ autoIncrement: true }),
    adventureId: int()
      .notNull()
      .references(() => adventures.id, { onDelete: "cascade" }),
    stepIndex: int().notNull(),
    questId: int()
      .notNull()
      .references(() => quests.id, { onDelete: "cascade" }),
    // Legacy single-language narrative (kept for backward compatibility).
    narrative: text().notNull().default(""),

    // New localized narratives.
    enNarrative: text().notNull().default(""),
    frNarrative: text().notNull().default(""),
    enOutroNarrative: text().notNull().default(""),
    frOutroNarrative: text().notNull().default(""),
    createdAt: int({ mode: "timestamp" }).$defaultFn(() => new Date()),
    updatedAt: int({ mode: "timestamp" }).$defaultFn(() => new Date()),
  },
  (table) => ({
    adventureIdx: index("adventure_steps_adventure_idx").on(table.adventureId),
    questIdx: index("adventure_steps_quest_idx").on(table.questId),
    orderUnique: uniqueIndex("adventure_steps_adventure_step_unique").on(
      table.adventureId,
      table.stepIndex,
    ),
  }),
);

export const adventureRuns = sqliteTable(
  "adventure_runs",
  {
    id: int().primaryKey({ autoIncrement: true }),
    adventureId: int()
      .notNull()
      .references(() => adventures.id, { onDelete: "cascade" }),
    status: text().notNull().default("active").$type<AdventureRunStatus>(),
    // If null: follow suggestion; if set: pins the whole campaign.
    difficultyOverride: text().$type<DifficultyCode>(),
    startedAt: int({ mode: "timestamp" }).$defaultFn(() => new Date()),
    finishedAt: int({ mode: "timestamp" }),
  },
  (table) => ({
    adventureIdx: index("adventure_runs_adventure_idx").on(table.adventureId),
  }),
);

export const adventureRunSteps = sqliteTable(
  "adventure_run_steps",
  {
    id: int().primaryKey({ autoIncrement: true }),
    runId: int()
      .notNull()
      .references(() => adventureRuns.id, { onDelete: "cascade" }),
    stepIndex: int().notNull(),
    questId: int()
      .notNull()
      .references(() => quests.id, { onDelete: "cascade" }),
    status: text().notNull().default("locked").$type<AdventureStepStatus>(),
    completedSessionId: int().references(() => completedQuest.id, {
      onDelete: "set null",
    }),
    startedAt: int({ mode: "timestamp" }),
    completedAt: int({ mode: "timestamp" }),
  },
  (table) => ({
    runIdx: index("adventure_run_steps_run_idx").on(table.runId),
    questIdx: index("adventure_run_steps_quest_idx").on(table.questId),
    orderUnique: uniqueIndex("adventure_run_steps_run_step_unique").on(
      table.runId,
      table.stepIndex,
    ),
    runStatusIdx: index("adventure_run_steps_run_status_idx").on(table.runId, table.status),
  }),
);

// ------------------------------------------------------------
// Completed workouts (history)
// ------------------------------------------------------------

export const completedQuest = sqliteTable(
  "completed_sessions",
  {
    id: int().primaryKey({ autoIncrement: true }),

    // If the session comes from a quest template, keep a link.
    questId: int().references(() => quests.id, { onDelete: "set null" }),

    // User level used to generate targets at the time of the session.
    userLevel: text().notNull().default("medium").$type<DifficultyCode>(),

    // Optional: total session duration.
    durationSeconds: int(),

    // XP earned for this session (resources/items are intentionally out of scope for now).
    xpEarned: int().notNull().default(0),

    // Optional: free text notes.
    notes: text().notNull().default(""),

    // User feedback on the session difficulty: 'easy', 'good', or 'hard'.
    feedback: text().$type<FeedbackCode>(),

    // Whether this session achieved new personal records.
    hasNewRecords: int().notNull().default(0),

    // When the session was performed.
    performedAt: int({ mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    performedAtIdx: index("completed_sessions_performed_at_idx").on(table.performedAt),
    questIdx: index("completed_sessions_quest_idx").on(table.questId),
  }),
);

export const completedExercises = sqliteTable(
  "completed_exercises",
  {
    id: int().primaryKey({ autoIncrement: true }),

    sessionId: int()
      .notNull()
      .references(() => completedQuest.id, { onDelete: "cascade" }),

    exerciseId: int()
      .notNull()
      .references(() => exercises.id),

    // For quests with multiple rounds; default 0 for a single pass.
    roundIndex: int().notNull().default(0),

    // Display/order within a round.
    sortOrder: int().notNull(),

    // What the user actually did.
    resultType: text().notNull().$type<QuestTargetType>(),
    resultValue: int().notNull(),

    // Optional: what was asked (target) at the time.
    targetType: text().$type<QuestTargetType>(),
    targetValue: int(),

    notes: text().notNull().default(""),
    performedAt: int({ mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    sessionIdx: index("completed_exercises_session_idx").on(table.sessionId),
    exerciseIdx: index("completed_exercises_exercise_idx").on(table.exerciseId),
    orderUnique: uniqueIndex("completed_exercises_session_round_sort_unique").on(
      table.sessionId,
      table.roundIndex,
      table.sortOrder,
    ),
  }),
);

// ------------------------------------------------------------
// Boss Fights (for adventures with kind = "boss")
// ------------------------------------------------------------

export const bossFights = sqliteTable(
  "boss_fights",
  {
    id: int().primaryKey({ autoIncrement: true }),
    adventureId: int()
      .notNull()
      .references(() => adventures.id, { onDelete: "cascade" }),
    // Total HP = sum of all exercise targets across all steps
    totalHp: int().notNull(),
    // Current HP remaining (persists across sessions)
    currentHp: int().notNull(),
    // Muscle group that deals bonus damage (1.5x)
    weaknessMuscle: text().$type<MuscleCode>(),
    // Muscle group that deals reduced damage (0.5x)
    resistanceMuscle: text().$type<MuscleCode>(),
    // Timestamp when boss was defeated (null if still alive)
    defeatedAt: int({ mode: "timestamp" }),
    createdAt: int({ mode: "timestamp" }).$defaultFn(() => new Date()),
    updatedAt: int({ mode: "timestamp" }).$defaultFn(() => new Date()),
  },
  (table) => ({
    adventureUnique: uniqueIndex("boss_fights_adventure_unique").on(table.adventureId),
  }),
);

export const bossDamageLog = sqliteTable(
  "boss_damage_log",
  {
    id: int().primaryKey({ autoIncrement: true }),
    bossFightId: int()
      .notNull()
      .references(() => bossFights.id, { onDelete: "cascade" }),
    completedSessionId: int().references(() => completedQuest.id, {
      onDelete: "set null",
    }),
    exerciseId: int().references(() => exercises.id, { onDelete: "set null" }),
    // Damage dealt (after weakness/resistance modifiers)
    damageDealt: int().notNull(),
    // Whether this was a critical hit (exceeded target)
    isCritical: int().notNull().default(0),
    // Muscle group that dealt the damage
    muscle: text().$type<MuscleCode>(),
    createdAt: int({ mode: "timestamp" }).$defaultFn(() => new Date()),
  },
  (table) => ({
    fightIdx: index("boss_damage_log_fight_idx").on(table.bossFightId),
    sessionIdx: index("boss_damage_log_session_idx").on(table.completedSessionId),
  }),
);

// ------------------------------------------------------------
// Resources (Phase 2 - Village Economy)
// ------------------------------------------------------------

// Resource codes mapped to muscle groups + universal currency
export const resourceCodes = [
	"gold", // Universal currency (from all workouts)
	"wood", // Arms exercises
	"stone", // Back exercises
	"fire", // Chest exercises
	"water", // Abs exercises
	"wind", // Shoulder exercises
	"grain", // Legs/calf exercises
	"boss_token", // From defeating bosses
] as const;
export type ResourceCode = (typeof resourceCodes)[number];

// Muscle to resource mapping
export const muscleToResource: Record<MuscleCode, ResourceCode> = {
  arms: "wood",
  back: "stone",
  chest: "fire",
  abs: "water",
  shoulder: "wind",
  calf: "grain",
} as const;

// User's current resource inventory
export const resourceInventory = sqliteTable(
  "resource_inventory",
  {
    id: int().primaryKey({ autoIncrement: true }),
    // Resource type
    resource: text().notNull().$type<ResourceCode>(),
    // Current amount (always >= 0)
    amount: int().notNull().default(0),
    updatedAt: int({ mode: "timestamp" }).$defaultFn(() => new Date()),
  },
  (table) => ({
    resourceUnique: uniqueIndex("resource_inventory_resource_unique").on(table.resource),
  }),
);

// Transaction types for analytics
export const resourceTransactionTypes = ["earned", "spent", "bonus"] as const;
export type ResourceTransactionType = (typeof resourceTransactionTypes)[number];

// Resource transaction log (for analytics and debugging)
export const resourceTransactions = sqliteTable(
  "resource_transactions",
  {
    id: int().primaryKey({ autoIncrement: true }),
    // Resource type
    resource: text().notNull().$type<ResourceCode>(),
    // Amount changed (positive for earn/bonus, could be negative for spend)
    amount: int().notNull(),
    // Transaction type
    transactionType: text().notNull().default("earned").$type<ResourceTransactionType>(),
    // Optional: link to the session that earned this resource
    completedSessionId: int().references(() => completedQuest.id, {
      onDelete: "set null",
    }),
    // Optional: description/reason for the transaction
    reason: text().notNull().default(""),
    createdAt: int({ mode: "timestamp" }).$defaultFn(() => new Date()),
  },
  (table) => ({
    resourceIdx: index("resource_transactions_resource_idx").on(table.resource),
    sessionIdx: index("resource_transactions_session_idx").on(table.completedSessionId),
    createdAtIdx: index("resource_transactions_created_at_idx").on(table.createdAt),
  }),
);

// ------------------------------------------------------------
// Village Buildings
// ------------------------------------------------------------

// Building type codes matching muscle-to-building mapping
export const buildingCodes = [
  // Tier 1 - Starter (unlocked by default)
  "campfire",
  "tent",
  "training_dummy",
  // Tier 2 - Basic (muscle-related)
  "archery_range", // arms
  "quarry", // back
  "forge", // chest
  "well", // abs
  "windmill", // shoulders
  "farm", // legs
  // Tier 3 - Advanced (requires Tier 2 level 3)
  "watchtower", // arms upgrade
  "castle_wall", // back upgrade
  "armory", // chest upgrade
  "fountain", // abs upgrade
  "observatory", // shoulders upgrade
  "barn", // legs upgrade
  // Tier 4 - Legendary (boss rewards)
  "dragon_lair",
  "heroes_hall",
  "wizard_tower",
  "champion_arena",
] as const;
export type BuildingCode = (typeof buildingCodes)[number];

// Building tier for categorization
export const buildingTiers = [1, 2, 3, 4] as const;
export type BuildingTier = (typeof buildingTiers)[number];

// Mapping muscles to their related buildings
export const muscleToBuilding: Record<MuscleCode, BuildingCode> = {
  arms: "archery_range",
  back: "quarry",
  chest: "forge",
  abs: "well",
  shoulder: "windmill",
  calf: "farm",
};

// Building definitions (static metadata)
export const buildingDefinitions: Record<
  BuildingCode,
  {
    tier: BuildingTier;
    emoji: string;
    relatedMuscle: MuscleCode | null;
    unlockCondition: string; // Human-readable condition
    prerequisiteBuilding: BuildingCode | null;
    prerequisiteLevel: number | null;
  }
> = {
  // Tier 1 - Starter
  campfire: {
    tier: 1,
    emoji: "🔥",
    relatedMuscle: null,
    unlockCondition: "default",
    prerequisiteBuilding: null,
    prerequisiteLevel: null,
  },
  tent: {
    tier: 1,
    emoji: "⛺",
    relatedMuscle: null,
    unlockCondition: "default",
    prerequisiteBuilding: null,
    prerequisiteLevel: null,
  },
  training_dummy: {
    tier: 1,
    emoji: "🎯",
    relatedMuscle: null,
    unlockCondition: "default",
    prerequisiteBuilding: null,
    prerequisiteLevel: null,
  },
  // Tier 2 - Basic muscle buildings
  archery_range: {
    tier: 2,
    emoji: "🏹",
    relatedMuscle: "arms",
    unlockCondition: "50+ arm exercise reps",
    prerequisiteBuilding: null,
    prerequisiteLevel: null,
  },
  quarry: {
    tier: 2,
    emoji: "⛏️",
    relatedMuscle: "back",
    unlockCondition: "50+ back exercise reps",
    prerequisiteBuilding: null,
    prerequisiteLevel: null,
  },
  forge: {
    tier: 2,
    emoji: "🔨",
    relatedMuscle: "chest",
    unlockCondition: "50+ chest exercise reps",
    prerequisiteBuilding: null,
    prerequisiteLevel: null,
  },
  well: {
    tier: 2,
    emoji: "💧",
    relatedMuscle: "abs",
    unlockCondition: "50+ abs exercise reps",
    prerequisiteBuilding: null,
    prerequisiteLevel: null,
  },
  windmill: {
    tier: 2,
    emoji: "🌬️",
    relatedMuscle: "shoulder",
    unlockCondition: "50+ shoulder exercise reps",
    prerequisiteBuilding: null,
    prerequisiteLevel: null,
  },
  farm: {
    tier: 2,
    emoji: "🌾",
    relatedMuscle: "calf",
    unlockCondition: "50+ leg exercise reps",
    prerequisiteBuilding: null,
    prerequisiteLevel: null,
  },
  // Tier 3 - Advanced
  watchtower: {
    tier: 3,
    emoji: "🗼",
    relatedMuscle: "arms",
    unlockCondition: "Archery Range Level 3",
    prerequisiteBuilding: "archery_range",
    prerequisiteLevel: 3,
  },
  castle_wall: {
    tier: 3,
    emoji: "🏰",
    relatedMuscle: "back",
    unlockCondition: "Quarry Level 3",
    prerequisiteBuilding: "quarry",
    prerequisiteLevel: 3,
  },
  armory: {
    tier: 3,
    emoji: "⚔️",
    relatedMuscle: "chest",
    unlockCondition: "Forge Level 3",
    prerequisiteBuilding: "forge",
    prerequisiteLevel: 3,
  },
  fountain: {
    tier: 3,
    emoji: "⛲",
    relatedMuscle: "abs",
    unlockCondition: "Well Level 3",
    prerequisiteBuilding: "well",
    prerequisiteLevel: 3,
  },
  observatory: {
    tier: 3,
    emoji: "🔭",
    relatedMuscle: "shoulder",
    unlockCondition: "Windmill Level 3",
    prerequisiteBuilding: "windmill",
    prerequisiteLevel: 3,
  },
  barn: {
    tier: 3,
    emoji: "🏚️",
    relatedMuscle: "calf",
    unlockCondition: "Farm Level 3",
    prerequisiteBuilding: "farm",
    prerequisiteLevel: 3,
  },
  // Tier 4 - Legendary
  dragon_lair: {
    tier: 4,
    emoji: "🐉",
    relatedMuscle: null,
    unlockCondition: "Defeat Fire Dragon",
    prerequisiteBuilding: null,
    prerequisiteLevel: null,
  },
  heroes_hall: {
    tier: 4,
    emoji: "🏆",
    relatedMuscle: null,
    unlockCondition: "Complete 50 adventures",
    prerequisiteBuilding: null,
    prerequisiteLevel: null,
  },
  wizard_tower: {
    tier: 4,
    emoji: "🧙",
    relatedMuscle: null,
    unlockCondition: "Defeat Archmage Boss",
    prerequisiteBuilding: null,
    prerequisiteLevel: null,
  },
  champion_arena: {
    tier: 4,
    emoji: "🏟️",
    relatedMuscle: null,
    unlockCondition: "Defeat 10 bosses",
    prerequisiteBuilding: null,
    prerequisiteLevel: null,
  },
};

// XP thresholds for building levels
export const buildingLevelThresholds: Record<number, number> = {
  1: 0, // Level 1 at 0 XP
  2: 100, // Level 2 at 100 XP
  3: 300, // Level 3 at 300 XP
  4: 600, // Level 4 at 600 XP
  5: 1000, // Level 5 at 1000 XP
};

// Building level bonuses - what each level provides
export type BuildingLevelBonus = {
  xpPercent?: number; // Bonus XP percentage for related muscle
  resourcePercent?: number; // Bonus resource gain percentage
  prestigePoints?: number; // Prestige points for village score
};

export const buildingLevelBonuses: Record<number, BuildingLevelBonus> = {
  1: { xpPercent: 0, resourcePercent: 0, prestigePoints: 10 },
  2: { xpPercent: 5, resourcePercent: 5, prestigePoints: 25 },
  3: { xpPercent: 10, resourcePercent: 10, prestigePoints: 50 },
  4: { xpPercent: 15, resourcePercent: 15, prestigePoints: 100 },
  5: { xpPercent: 25, resourcePercent: 25, prestigePoints: 200 },
};

// Village buildings table (player's building state)
export const villageBuildings = sqliteTable(
  "village_buildings",
  {
    id: int().primaryKey({ autoIncrement: true }),
    buildingType: text().notNull().$type<BuildingCode>(),
    level: int().notNull().default(1),
    xp: int().notNull().default(0), // Progress toward next level
    isUnlocked: int({ mode: "boolean" }).notNull().default(false),
    unlockedAt: int({ mode: "timestamp" }),
    updatedAt: int({ mode: "timestamp" }).$defaultFn(() => new Date()),
  },
  (table) => ({
    buildingTypeUnique: uniqueIndex("village_buildings_type_unique").on(table.buildingType),
  }),
);

// Village stats table (aggregate stats for the village)
export const villageStats = sqliteTable("village_stats", {
  id: int().primaryKey({ autoIncrement: true }),
  prestigeScore: int().notNull().default(0),
  totalBuildingsUnlocked: int().notNull().default(0),
  highestBuildingLevel: int().notNull().default(1),
  updatedAt: int({ mode: "timestamp" }).$defaultFn(() => new Date()),
});

// ------------------------------------------------------------
// Goals & Planning System (Phase 3)
// ------------------------------------------------------------

// Goal types for different training focuses
export const goalTypeCodes = ["strength", "endurance", "flexibility", "balanced"] as const;
export type GoalTypeCode = (typeof goalTypeCodes)[number];

// Goal status
export const goalStatusCodes = ["active", "paused", "completed", "abandoned"] as const;
export type GoalStatusCode = (typeof goalStatusCodes)[number];

// User goals table - tracks fitness objectives
export const goals = sqliteTable("goals", {
  id: int().primaryKey({ autoIncrement: true }),

  // Goal configuration
  goalType: text().notNull().$type<GoalTypeCode>(),
  daysPerWeek: int().notNull().default(3), // 1-7
  sessionMinutes: int().notNull().default(20), // Preferred session duration

  // Status tracking
  status: text().notNull().default("active").$type<GoalStatusCode>(),
  startDate: int({ mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  endDate: int({ mode: "timestamp" }), // Optional end date for time-bound goals

  // Timestamps
  createdAt: int({ mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: int({ mode: "timestamp" }).$defaultFn(() => new Date()),
});

// Weekly goal progress tracking
export const goalProgress = sqliteTable(
  "goal_progress",
  {
    id: int().primaryKey({ autoIncrement: true }),
    goalId: int()
      .notNull()
      .references(() => goals.id, { onDelete: "cascade" }),

    // Week identifier (ISO week: YYYY-WW format stored as text)
    weekKey: text().notNull(),

    // Progress data
    targetSessions: int().notNull(), // Based on daysPerWeek
    completedSessions: int().notNull().default(0),
    totalMinutes: int().notNull().default(0),
    totalXp: int().notNull().default(0),

    // Timestamps
    updatedAt: int({ mode: "timestamp" }).$defaultFn(() => new Date()),
  },
  (table) => ({
    goalWeekUnique: uniqueIndex("goal_progress_goal_week_unique").on(table.goalId, table.weekKey),
    goalIdx: index("goal_progress_goal_idx").on(table.goalId),
  }),
);

// ------------------------------------------------------------
// Scheduled Sessions (Phase 3 - Scheduling)
// ------------------------------------------------------------

// Status of a scheduled session
export const scheduledSessionStatusCodes = ["pending", "completed", "skipped", "missed"] as const;
export type ScheduledSessionStatusCode = (typeof scheduledSessionStatusCodes)[number];

// Scheduled sessions table - planned workouts for the future
export const scheduledSessions = sqliteTable(
  "scheduled_sessions",
  {
    id: int().primaryKey({ autoIncrement: true }),

    // What to do
    questId: int()
      .notNull()
      .references(() => quests.id, { onDelete: "cascade" }),

    // Optional: link to goal/plan
    goalId: int().references(() => goals.id, { onDelete: "set null" }),

    // When to do it (date only, as timestamp at midnight)
    scheduledDate: int({ mode: "timestamp" }).notNull(),

    // Optional: preferred time of day (hours 0-23)
    preferredHour: int(),

    // Status tracking
    status: text().notNull().default("pending").$type<ScheduledSessionStatusCode>(),

    // Link to completed session if done
    completedSessionId: int().references(() => completedQuest.id, {
      onDelete: "set null",
    }),

    // Optional note from user
    note: text(),

    // Timestamps
    createdAt: int({ mode: "timestamp" }).$defaultFn(() => new Date()),
    updatedAt: int({ mode: "timestamp" }).$defaultFn(() => new Date()),
  },
  (table) => ({
    dateIdx: index("scheduled_sessions_date_idx").on(table.scheduledDate),
    statusIdx: index("scheduled_sessions_status_idx").on(table.status),
    goalIdx: index("scheduled_sessions_goal_idx").on(table.goalId),
  }),
);
