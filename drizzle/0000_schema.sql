-- Bati v3 - Complete Schema (Clean Start)
-- All tables with final structure, no legacy columns
-- ============================================================
-- User Preferences
-- ============================================================
CREATE TABLE `user_preferences` (
    `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    `key` text NOT NULL,
    `value` text NOT NULL,
    `updatedAt` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_preferences_key_unique` ON `user_preferences` (`key`);
--> statement-breakpoint
-- ============================================================
-- Exercises Catalogue
-- ============================================================
CREATE TABLE `exercises` (
    `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    `enName` text NOT NULL,
    `frName` text NOT NULL,
    `enDescription` text NOT NULL,
    `frDescription` text NOT NULL,
    `imagePath` text DEFAULT 'assets/placeholder.jpg' NOT NULL,
    `creator` text DEFAULT 'Admin' NOT NULL,
    `difficulty` text DEFAULT 'medium' NOT NULL CHECK (`difficulty` IN ('easy', 'medium', 'hard')),
    `equipment` text DEFAULT 'none' NOT NULL,
    `secondsPerRep` integer DEFAULT 3 NOT NULL,
    `createdAt` integer,
    `updatedAt` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `exercises_en_name_unique` ON `exercises` (`enName`);
--> statement-breakpoint
CREATE INDEX `exercises_creator_idx` ON `exercises` (`creator`);
--> statement-breakpoint
CREATE TABLE `exercise_muscles` (
    `exerciseId` integer NOT NULL,
    `muscle` text NOT NULL CHECK (
        `muscle` IN (
            'arms',
            'back',
            'shoulder',
            'chest',
            'abs',
            'calf'
        )
    ),
    PRIMARY KEY(`exerciseId`, `muscle`),
    FOREIGN KEY (`exerciseId`) REFERENCES `exercises`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `exercise_muscles_muscle_idx` ON `exercise_muscles` (`muscle`);
--> statement-breakpoint
-- ============================================================
-- Quests (Workout Templates)
-- ============================================================
CREATE TABLE `quests` (
    `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    `enTitle` text NOT NULL,
    `frTitle` text NOT NULL,
    `enDescription` text NOT NULL,
    `frDescription` text NOT NULL,
    `author` text DEFAULT 'Admin' NOT NULL,
    `rounds` integer DEFAULT 1 NOT NULL,
    `restSeconds` integer DEFAULT 30 NOT NULL,
    `createdAt` integer,
    `updatedAt` integer
);
--> statement-breakpoint
CREATE TABLE `quest_exercises` (
    `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    `questId` integer NOT NULL,
    `exerciseId` integer NOT NULL,
    `sortOrder` integer NOT NULL,
    `targetType` text NOT NULL CHECK (`targetType` IN ('reps', 'time')),
    `targetMin` integer NOT NULL,
    `targetMax` integer NOT NULL,
    `imagesJson` text DEFAULT '[]' NOT NULL,
    FOREIGN KEY (`questId`) REFERENCES `quests`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`exerciseId`) REFERENCES `exercises`(`id`) ON DELETE CASCADE,
    CHECK (
        `targetMin` > 0
        AND `targetMax` > 0
        AND `targetMax` >= `targetMin`
    )
);
--> statement-breakpoint
CREATE INDEX `quest_exercises_quest_idx` ON `quest_exercises` (`questId`);
--> statement-breakpoint
CREATE UNIQUE INDEX `quest_exercises_quest_sort_unique` ON `quest_exercises` (`questId`, `sortOrder`);
--> statement-breakpoint
-- ============================================================
-- Adventures (Quest Wrappers / Campaigns / Bosses)
-- ============================================================
CREATE TABLE `adventures` (
    `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    `questId` integer NOT NULL,
    `enTitle` text DEFAULT '' NOT NULL,
    `frTitle` text DEFAULT '' NOT NULL,
    `enDescription` text DEFAULT '' NOT NULL,
    `frDescription` text DEFAULT '' NOT NULL,
    `author` text DEFAULT 'Admin' NOT NULL,
    `sortOrder` integer DEFAULT 0 NOT NULL,
    `kind` text DEFAULT 'route' NOT NULL,
    `isActive` integer DEFAULT 1 NOT NULL,
    `bossTotalHp` integer,
    `bossWeaknessMuscle` text,
    `bossResistanceMuscle` text,
    `createdAt` integer,
    `updatedAt` integer,
    FOREIGN KEY (`questId`) REFERENCES `quests`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
DROP INDEX IF EXISTS `adventures_quest_unique`;
--> statement-breakpoint
CREATE INDEX `adventures_active_sort_idx` ON `adventures` (`isActive`, `sortOrder`);
--> statement-breakpoint
CREATE TABLE `adventure_steps` (
    `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    `adventureId` integer NOT NULL,
    `stepIndex` integer NOT NULL,
    `questId` integer NOT NULL,
    `enNarrative` text DEFAULT '' NOT NULL,
    `frNarrative` text DEFAULT '' NOT NULL,
    `enOutroNarrative` text DEFAULT '' NOT NULL,
    `frOutroNarrative` text DEFAULT '' NOT NULL,
    `createdAt` integer,
    `updatedAt` integer,
    FOREIGN KEY (`adventureId`) REFERENCES `adventures`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`questId`) REFERENCES `quests`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `adventure_steps_adventure_idx` ON `adventure_steps` (`adventureId`);
--> statement-breakpoint
CREATE INDEX `adventure_steps_quest_idx` ON `adventure_steps` (`questId`);
--> statement-breakpoint
CREATE UNIQUE INDEX `adventure_steps_adventure_step_unique` ON `adventure_steps` (`adventureId`, `stepIndex`);
--> statement-breakpoint
CREATE TABLE `adventure_runs` (
    `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    `adventureId` integer NOT NULL,
    `status` text DEFAULT 'active' NOT NULL,
    `difficultyOverride` text,
    `startedAt` integer,
    `finishedAt` integer,
    FOREIGN KEY (`adventureId`) REFERENCES `adventures`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `adventure_runs_adventure_idx` ON `adventure_runs` (`adventureId`);
--> statement-breakpoint
CREATE TABLE `adventure_run_steps` (
    `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    `runId` integer NOT NULL,
    `stepIndex` integer NOT NULL,
    `questId` integer NOT NULL,
    `status` text DEFAULT 'locked' NOT NULL,
    `completedSessionId` integer,
    `startedAt` integer,
    `completedAt` integer,
    FOREIGN KEY (`runId`) REFERENCES `adventure_runs`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`questId`) REFERENCES `quests`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`completedSessionId`) REFERENCES `completed_sessions`(`id`) ON DELETE
    SET NULL
);
--> statement-breakpoint
CREATE INDEX `adventure_run_steps_run_idx` ON `adventure_run_steps` (`runId`);
--> statement-breakpoint
CREATE INDEX `adventure_run_steps_quest_idx` ON `adventure_run_steps` (`questId`);
--> statement-breakpoint
CREATE UNIQUE INDEX `adventure_run_steps_run_step_unique` ON `adventure_run_steps` (`runId`, `stepIndex`);
--> statement-breakpoint
CREATE INDEX `adventure_run_steps_run_status_idx` ON `adventure_run_steps` (`runId`, `status`);
--> statement-breakpoint
-- ============================================================
-- Completed Workouts (History)
-- ============================================================
CREATE TABLE `completed_sessions` (
    `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    `questId` integer,
    `userLevel` text DEFAULT 'medium' NOT NULL CHECK (`userLevel` IN ('easy', 'medium', 'hard')),
    `durationSeconds` integer,
    `xpEarned` integer DEFAULT 0 NOT NULL,
    `notes` text DEFAULT '' NOT NULL,
    `feedback` text CHECK (
        `feedback` IS NULL
        OR `feedback` IN ('easy', 'good', 'hard')
    ),
    `hasNewRecords` integer DEFAULT 0 NOT NULL,
    `performedAt` integer NOT NULL,
    FOREIGN KEY (`questId`) REFERENCES `quests`(`id`) ON DELETE
    SET NULL
);
--> statement-breakpoint
CREATE INDEX `completed_sessions_performed_at_idx` ON `completed_sessions` (`performedAt`);
--> statement-breakpoint
CREATE INDEX `completed_sessions_quest_idx` ON `completed_sessions` (`questId`);
--> statement-breakpoint
CREATE TABLE `completed_exercises` (
    `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    `sessionId` integer NOT NULL,
    `exerciseId` integer NOT NULL,
    `roundIndex` integer DEFAULT 0 NOT NULL,
    `sortOrder` integer NOT NULL,
    `resultType` text NOT NULL CHECK (`resultType` IN ('reps', 'time')),
    `resultValue` integer NOT NULL,
    `targetType` text CHECK (
        `targetType` IS NULL
        OR `targetType` IN ('reps', 'time')
    ),
    `targetValue` integer,
    `notes` text DEFAULT '' NOT NULL,
    `performedAt` integer NOT NULL,
    FOREIGN KEY (`sessionId`) REFERENCES `completed_sessions`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`exerciseId`) REFERENCES `exercises`(`id`) ON DELETE NO ACTION,
    CHECK (
        `roundIndex` >= 0
        AND `sortOrder` >= 0
        AND `resultValue` > 0
    ),
    CHECK (
        `targetValue` IS NULL
        OR `targetValue` > 0
    ),
    CHECK (
        `targetType` IS NULL
        OR `targetValue` IS NOT NULL
    )
);
--> statement-breakpoint
CREATE INDEX `completed_exercises_session_idx` ON `completed_exercises` (`sessionId`);
--> statement-breakpoint
CREATE INDEX `completed_exercises_exercise_idx` ON `completed_exercises` (`exerciseId`);
--> statement-breakpoint
CREATE UNIQUE INDEX `completed_exercises_session_round_sort_unique` ON `completed_exercises` (`sessionId`, `roundIndex`, `sortOrder`);
--> statement-breakpoint
-- ============================================================
-- Boss Fights
-- ============================================================
CREATE TABLE `boss_fights` (
    `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    `adventureId` integer NOT NULL,
    `totalHp` integer NOT NULL,
    `currentHp` integer NOT NULL,
    `weaknessMuscle` text,
    `resistanceMuscle` text,
    `defeatedAt` integer,
    `createdAt` integer DEFAULT (strftime('%s', 'now') * 1000),
    `updatedAt` integer DEFAULT (strftime('%s', 'now') * 1000),
    FOREIGN KEY (`adventureId`) REFERENCES `adventures`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE UNIQUE INDEX `boss_fights_adventure_unique` ON `boss_fights` (`adventureId`);
--> statement-breakpoint
CREATE TABLE `boss_damage_log` (
    `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    `bossFightId` integer NOT NULL,
    `completedSessionId` integer,
    `exerciseId` integer,
    `damageDealt` integer NOT NULL,
    `isCritical` integer DEFAULT 0 NOT NULL,
    `muscle` text,
    `createdAt` integer DEFAULT (strftime('%s', 'now') * 1000),
    FOREIGN KEY (`bossFightId`) REFERENCES `boss_fights`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`completedSessionId`) REFERENCES `completed_sessions`(`id`) ON DELETE
    SET NULL,
        FOREIGN KEY (`exerciseId`) REFERENCES `exercises`(`id`) ON DELETE
    SET NULL
);
--> statement-breakpoint
CREATE INDEX `boss_damage_log_fight_idx` ON `boss_damage_log` (`bossFightId`);
--> statement-breakpoint
CREATE INDEX `boss_damage_log_session_idx` ON `boss_damage_log` (`completedSessionId`);
--> statement-breakpoint
-- ============================================================
-- Resources (Simplified: gold, essence, boss_token)
-- ============================================================
CREATE TABLE `resource_inventory` (
    `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    `resource` text NOT NULL,
    `amount` integer DEFAULT 0 NOT NULL,
    `updatedAt` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `resource_inventory_resource_unique` ON `resource_inventory` (`resource`);
--> statement-breakpoint
CREATE TABLE `resource_transactions` (
    `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    `resource` text NOT NULL,
    `amount` integer NOT NULL,
    `transactionType` text DEFAULT 'earned' NOT NULL,
    `completedSessionId` integer,
    `reason` text DEFAULT '' NOT NULL,
    `createdAt` integer,
    FOREIGN KEY (`completedSessionId`) REFERENCES `completed_sessions`(`id`) ON DELETE
    SET NULL
);
--> statement-breakpoint
CREATE INDEX `resource_transactions_resource_idx` ON `resource_transactions` (`resource`);
--> statement-breakpoint
CREATE INDEX `resource_transactions_session_idx` ON `resource_transactions` (`completedSessionId`);
--> statement-breakpoint
CREATE INDEX `resource_transactions_created_at_idx` ON `resource_transactions` (`createdAt`);
--> statement-breakpoint
-- ============================================================
-- Village Buildings
-- ============================================================
CREATE TABLE `village_buildings` (
    `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    `buildingType` text NOT NULL,
    `level` integer DEFAULT 1 NOT NULL,
    `xp` integer DEFAULT 0 NOT NULL,
    `isUnlocked` integer DEFAULT 0 NOT NULL,
    `unlockedAt` integer,
    `updatedAt` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `village_buildings_type_unique` ON `village_buildings` (`buildingType`);
--> statement-breakpoint
CREATE TABLE `village_stats` (
    `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    `prestigeScore` integer DEFAULT 0 NOT NULL,
    `totalBuildingsUnlocked` integer DEFAULT 0 NOT NULL,
    `highestBuildingLevel` integer DEFAULT 1 NOT NULL,
    `updatedAt` integer
);
--> statement-breakpoint
-- ============================================================
-- Goals & Progress
-- ============================================================
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
--> statement-breakpoint
CREATE TABLE `goal_progress` (
    `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    `goalId` integer NOT NULL,
    `weekKey` text NOT NULL,
    `targetSessions` integer NOT NULL,
    `completedSessions` integer DEFAULT 0 NOT NULL,
    `totalMinutes` integer DEFAULT 0 NOT NULL,
    `totalXp` integer DEFAULT 0 NOT NULL,
    `updatedAt` integer,
    FOREIGN KEY (`goalId`) REFERENCES `goals`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE UNIQUE INDEX `goal_progress_goal_week_unique` ON `goal_progress` (`goalId`, `weekKey`);
--> statement-breakpoint
CREATE INDEX `goal_progress_goal_idx` ON `goal_progress` (`goalId`);
--> statement-breakpoint
-- ============================================================
-- Scheduled Sessions
-- ============================================================
CREATE TABLE `scheduled_sessions` (
    `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    `questId` integer NOT NULL,
    `goalId` integer,
    `scheduledDate` integer NOT NULL,
    `preferredHour` integer,
    `status` text DEFAULT 'pending' NOT NULL,
    `completedSessionId` integer,
    `note` text,
    `createdAt` integer,
    `updatedAt` integer,
    FOREIGN KEY (`questId`) REFERENCES `quests`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`goalId`) REFERENCES `goals`(`id`) ON DELETE
    SET NULL,
        FOREIGN KEY (`completedSessionId`) REFERENCES `completed_sessions`(`id`) ON DELETE
    SET NULL
);
--> statement-breakpoint
CREATE INDEX `scheduled_sessions_date_idx` ON `scheduled_sessions` (`scheduledDate`);
--> statement-breakpoint
CREATE INDEX `scheduled_sessions_status_idx` ON `scheduled_sessions` (`status`);
--> statement-breakpoint
CREATE INDEX `scheduled_sessions_goal_idx` ON `scheduled_sessions` (`goalId`);
--> statement-breakpoint