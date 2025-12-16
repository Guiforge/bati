import { index, int, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

// ------------------------------------------------------------
// Exercises catalogue
// ------------------------------------------------------------

export const muscleCodes = ["arms", "back", "shoulder", "chest", "abs", "calf"] as const;
export type MuscleCode = (typeof muscleCodes)[number];

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

  rounds: int().notNull().default(1),

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

    // Optional: free text notes.
    notes: text().notNull().default(""),

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
