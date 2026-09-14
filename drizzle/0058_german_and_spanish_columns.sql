-- German and Spanish get a column beside English and French on every seeded multilingual row.
--
-- The same shape the content already has, one column per language (option A of the i18n plan, over
-- moving seeded text out of the database): sixteen columns on four tables, empty until a later
-- migration writes the translations. `localizedText` reads an empty column as English, so a row
-- nobody has translated yet shows English rather than a blank card.
--
-- NOT NULL DEFAULT '' like the columns they sit beside, so a hero's own row written by an older
-- build during an update, and every row already installed, is valid the moment this runs.
ALTER TABLE `exercises` ADD `deName` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `exercises` ADD `esName` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `exercises` ADD `deDescription` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `exercises` ADD `esDescription` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `quests` ADD `deTitle` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `quests` ADD `esTitle` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `quests` ADD `deDescription` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `quests` ADD `esDescription` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `adventures` ADD `deTitle` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `adventures` ADD `esTitle` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `adventures` ADD `deDescription` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `adventures` ADD `esDescription` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `adventure_steps` ADD `deNarrative` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `adventure_steps` ADD `esNarrative` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `adventure_steps` ADD `deOutroNarrative` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `adventure_steps` ADD `esOutroNarrative` text DEFAULT '' NOT NULL;
