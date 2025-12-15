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

    // Stored as lowercase string: easy | medium | hard
    difficulty: text().notNull().default("easy").$type<DifficultyCode>(),

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
