-- Chinese gets a column beside the other five on every seeded multilingual row, the same shape
-- 0058 gave German and Spanish: eight columns on four tables, empty until the next migration
-- writes the translations. `localizedText` reads an empty column as English, so a row nobody
-- has translated yet shows English rather than a blank card.
--
-- multi-migration-ok: 0074 and 0075 ship together, one language in the two-step shape 0058 and
-- 0059 set: this file adds the columns empty, the next fills them.
--
-- NOT NULL DEFAULT '' like the columns they sit beside, so a hero's own row written by an older
-- build during an update, and every row already installed, is valid the moment this runs.
ALTER TABLE `exercises` ADD `zhName` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `exercises` ADD `zhDescription` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `quests` ADD `zhTitle` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `quests` ADD `zhDescription` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `adventures` ADD `zhTitle` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `adventures` ADD `zhDescription` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `adventure_steps` ADD `zhNarrative` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `adventure_steps` ADD `zhOutroNarrative` text DEFAULT '' NOT NULL;
