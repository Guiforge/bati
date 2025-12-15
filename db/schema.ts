import { index, int, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

// ------------------------------------------------------------
// Exercises catalogue
// ------------------------------------------------------------

export const muscleCodes = ["arms", "back", "shoulder", "chest", "abs", "calf"] as const;
export type MuscleCode = (typeof muscleCodes)[number];

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
    muscle: text().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.exerciseId, table.muscle] }),
    muscleIdx: index("exercise_muscles_muscle_idx").on(table.muscle),
  }),
);
