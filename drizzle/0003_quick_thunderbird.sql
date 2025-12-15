CREATE TABLE `quests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`enTitle` text NOT NULL,
	`frTitle` text NOT NULL,
	`enDescription` text NOT NULL,
	`frDescription` text NOT NULL,
	`rounds` integer DEFAULT 1 NOT NULL,
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
	FOREIGN KEY (`questId`) REFERENCES `quests`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`exerciseId`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE cascade,
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
ALTER TABLE `exercises`
ADD `difficulty` text DEFAULT 'medium' NOT NULL CHECK (`difficulty` IN ('easy', 'medium', 'hard'));
--> statement-breakpoint
UPDATE `exercises`
SET `difficulty` = 'medium'
WHERE `enName` IN ('Squat', 'Push-ups', 'Plank');
--> statement-breakpoint
UPDATE `exercises`
SET `difficulty` = 'easy'
WHERE `enName` IN ('Wall Sit', 'Crunch');
--> statement-breakpoint
UPDATE `exercises`
SET `difficulty` = 'hard'
WHERE `enName` IN ('Pull-ups');