ALTER TABLE `exercises`
ADD `creator` text DEFAULT 'Admin' NOT NULL;
--> statement-breakpoint
CREATE INDEX `exercises_creator_idx` ON `exercises` (`creator`);