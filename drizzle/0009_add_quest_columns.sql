ALTER TABLE `quests` ADD `primaryMuscle` text;--> statement-breakpoint
ALTER TABLE `quests` ADD `secondaryMuscles` text;--> statement-breakpoint
ALTER TABLE `quests` ADD `estimatedMinutes` integer;--> statement-breakpoint
ALTER TABLE `quests` ADD `difficulty` text DEFAULT 'Intermediate';
