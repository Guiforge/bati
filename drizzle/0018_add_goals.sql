-- Goals table for fitness objectives
CREATE TABLE `goals` (
    `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    `goalType` text NOT NULL,
    `daysPerWeek` integer DEFAULT 3 NOT NULL,
    `sessionMinutes` integer DEFAULT 20 NOT NULL,
    `status` text DEFAULT 'active' NOT NULL,
    `startDate` integer NOT NULL,
    `endDate` integer,
    `createdAt` integer,
    `updatedAt` integer
);

-- Weekly goal progress tracking
CREATE TABLE `goal_progress` (
    `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    `goalId` integer NOT NULL REFERENCES `goals` (`id`) ON DELETE CASCADE,
    `weekKey` text NOT NULL,
    `targetSessions` integer NOT NULL,
    `completedSessions` integer DEFAULT 0 NOT NULL,
    `totalMinutes` integer DEFAULT 0 NOT NULL,
    `totalXp` integer DEFAULT 0 NOT NULL,
    `updatedAt` integer
);

CREATE UNIQUE INDEX `goal_progress_goal_week_unique` ON `goal_progress` (`goalId`, `weekKey`);
CREATE INDEX `goal_progress_goal_idx` ON `goal_progress` (`goalId`);
