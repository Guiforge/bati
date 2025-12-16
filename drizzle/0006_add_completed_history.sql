CREATE TABLE `completed_sessions` (
    `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    `questId` integer,
    `userLevel` text DEFAULT 'medium' NOT NULL CHECK (`userLevel` IN ('easy', 'medium', 'hard')),
    `durationSeconds` integer,
    `notes` text DEFAULT '' NOT NULL,
    `performedAt` integer NOT NULL,
    FOREIGN KEY (`questId`) REFERENCES `quests`(`id`) ON UPDATE no action ON DELETE
    set null
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
    FOREIGN KEY (`sessionId`) REFERENCES `completed_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (`exerciseId`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE no action,
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