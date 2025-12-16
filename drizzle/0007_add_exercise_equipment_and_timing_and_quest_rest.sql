-- Add equipment + time estimation fields
ALTER TABLE `exercises`
ADD COLUMN `equipment` text NOT NULL DEFAULT 'none';
--> statement-breakpoint
ALTER TABLE `exercises`
ADD COLUMN `secondsPerRep` integer NOT NULL DEFAULT 3;
--> statement-breakpoint
ALTER TABLE `quests`
ADD COLUMN `restSeconds` integer NOT NULL DEFAULT 30;
--> statement-breakpoint
-- Backfill sensible defaults for existing seeded exercises
UPDATE `exercises`
SET `equipment` = 'none',
    `secondsPerRep` = 3
WHERE `enName` IN ('Squat', 'Push-ups');
--> statement-breakpoint
UPDATE `exercises`
SET `equipment` = 'pullup_bar',
    `secondsPerRep` = 4
WHERE `enName` = 'Pull-ups';
--> statement-breakpoint
UPDATE `exercises`
SET `equipment` = 'none',
    `secondsPerRep` = 2
WHERE `enName` = 'Crunch';
--> statement-breakpoint
UPDATE `exercises`
SET `equipment` = 'none',
    `secondsPerRep` = 1
WHERE `enName` IN ('Plank', 'Wall Sit');
--> statement-breakpoint
-- Existing seeded quest default rest
UPDATE `quests`
SET `restSeconds` = 30
WHERE `frTitle` = 'Couper du bois';