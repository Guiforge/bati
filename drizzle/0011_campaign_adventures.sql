ALTER TABLE `adventures`
ADD COLUMN `enTitle` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `adventures`
ADD COLUMN `frTitle` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `adventures`
ADD COLUMN `enDescription` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `adventures`
ADD COLUMN `frDescription` text DEFAULT '' NOT NULL;
--> statement-breakpoint
UPDATE `adventures`
SET `enTitle` = (
        SELECT `enTitle`
        FROM `quests`
        WHERE `quests`.`id` = `adventures`.`questId`
    ),
    `frTitle` = (
        SELECT `frTitle`
        FROM `quests`
        WHERE `quests`.`id` = `adventures`.`questId`
    ),
    `enDescription` = (
        SELECT `enDescription`
        FROM `quests`
        WHERE `quests`.`id` = `adventures`.`questId`
    ),
    `frDescription` = (
        SELECT `frDescription`
        FROM `quests`
        WHERE `quests`.`id` = `adventures`.`questId`
    )
WHERE `enTitle` = '';
--> statement-breakpoint
CREATE TABLE `adventure_steps` (
    `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    `adventureId` integer NOT NULL,
    `stepIndex` integer NOT NULL,
    `questId` integer NOT NULL,
    `narrative` text DEFAULT '' NOT NULL,
    `createdAt` integer,
    `updatedAt` integer,
    FOREIGN KEY (`adventureId`) REFERENCES `adventures`(`id`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (`questId`) REFERENCES `quests`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `adventure_steps_adventure_idx` ON `adventure_steps` (`adventureId`);
--> statement-breakpoint
CREATE INDEX `adventure_steps_quest_idx` ON `adventure_steps` (`questId`);
--> statement-breakpoint
CREATE UNIQUE INDEX `adventure_steps_adventure_step_unique` ON `adventure_steps` (`adventureId`, `stepIndex`);
--> statement-breakpoint
INSERT INTO `adventure_steps` (
        `adventureId`,
        `stepIndex`,
        `questId`,
        `narrative`,
        `createdAt`,
        `updatedAt`
    )
SELECT `id`,
    0,
    `questId`,
    '',
    (strftime('%s', 'now') * 1000),
    (strftime('%s', 'now') * 1000)
FROM `adventures`;
--> statement-breakpoint
CREATE TABLE `adventure_runs` (
    `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    `adventureId` integer NOT NULL,
    `status` text DEFAULT 'active' NOT NULL,
    `difficultyOverride` text,
    `startedAt` integer,
    `finishedAt` integer,
    FOREIGN KEY (`adventureId`) REFERENCES `adventures`(`id`) ON UPDATE no action ON DELETE cascade
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
    FOREIGN KEY (`runId`) REFERENCES `adventure_runs`(`id`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (`questId`) REFERENCES `quests`(`id`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (`completedSessionId`) REFERENCES `completed_sessions`(`id`) ON UPDATE no action ON DELETE
    set null
);
--> statement-breakpoint
CREATE INDEX `adventure_run_steps_run_idx` ON `adventure_run_steps` (`runId`);
--> statement-breakpoint
CREATE INDEX `adventure_run_steps_quest_idx` ON `adventure_run_steps` (`questId`);
--> statement-breakpoint
CREATE UNIQUE INDEX `adventure_run_steps_run_step_unique` ON `adventure_run_steps` (`runId`, `stepIndex`);
--> statement-breakpoint
CREATE INDEX `adventure_run_steps_run_status_idx` ON `adventure_run_steps` (`runId`, `status`);