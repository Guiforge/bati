import {
  index,
  int,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

// ------------------------------------------------------------
// Exercises catalogue
// ------------------------------------------------------------

export const muscleCodes = [
  "arms",
  "back",
  "shoulder",
  "chest",
  "abs",
  "calf",
] as const;
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
  })
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
  })
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
    sortUnique: uniqueIndex("quest_exercises_quest_sort_unique").on(
      table.questId,
      table.sortOrder
    ),
  })
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
    activeSortIdx: index("adventures_active_sort_idx").on(
      table.isActive,
      table.sortOrder
    ),
  })
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
    createdAt: int({ mode: "timestamp" }).$defaultFn(() => new Date()),
    updatedAt: int({ mode: "timestamp" }).$defaultFn(() => new Date()),
  },
  (table) => ({
    adventureIdx: index("adventure_steps_adventure_idx").on(table.adventureId),
    questIdx: index("adventure_steps_quest_idx").on(table.questId),
    orderUnique: uniqueIndex("adventure_steps_adventure_step_unique").on(
      table.adventureId,
      table.stepIndex
    ),
  })
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
  })
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
      table.stepIndex
    ),
    runStatusIdx: index("adventure_run_steps_run_status_idx").on(
      table.runId,
      table.status
    ),
  })
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

    // When the session was performed.
    performedAt: int({ mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    performedAtIdx: index("completed_sessions_performed_at_idx").on(
      table.performedAt
    ),
    questIdx: index("completed_sessions_quest_idx").on(table.questId),
  })
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
    orderUnique: uniqueIndex(
      "completed_exercises_session_round_sort_unique"
    ).on(table.sessionId, table.roundIndex, table.sortOrder),
  })
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
    adventureUnique: uniqueIndex("boss_fights_adventure_unique").on(
      table.adventureId
    ),
  })
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
    sessionIdx: index("boss_damage_log_session_idx").on(
      table.completedSessionId
    ),
  })
);
