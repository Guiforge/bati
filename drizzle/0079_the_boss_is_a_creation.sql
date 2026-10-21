-- A boss is something the hero creates, beside exercises, quests and adventures.
--
-- Until now a hero adventure that ended on a boss still fought a painted monster, and the hero only
-- added words to it (0077: `bossName`, `bossLinesJson` on the adventure). A boss now has a life of
-- its own: a name, an image for each form (a photo from the hero's album or the painted monster's
-- own), a weakness and a resistance of the hero's choosing, and its lines. Several adventures may
-- face the same boss, and device sync carries it as it carries a quest.
--
-- `hero_bosses` holds hero rows only: there is no `author`, no seed row exists. `uuid` names the
-- boss off this database (a uuid v7, written by db/heroBosses.ts and by this migration), UNIQUE, the
-- key sync matches on. `monster` is the painted monster the images fall back to, as the adventure's
-- `bossImagePath` writes it. `linesJson` is the 0077 shape ({"intro":[...],...}); `artJson` is
-- {"fresh":"data:...","wounded":...,"defeated":...,"legendary":...}, each form optional, both written
-- by db/bossVoice.ts and nothing else. `weaknessMuscle` and `resistanceMuscle` are NULL when the hero
-- chose none (a boss with none takes every muscle alike).
--
-- `adventures.heroBossUuid` names the boss an adventure ends on, by uuid and not by id, so sync
-- copies it verbatim and it means the same row on every phone. NULL on every seeded row, on a route
-- and on a boss picked among the painted ones, which fights exactly as before.
--
-- The voice 0077 gave an adventure moves into a boss of its own, so no word a hero wrote is lost and
-- nothing is read from two places: the adventure's uuid is the boss's uuid (the same adventure
-- synced to two phones yields one boss, not two), the weakness and resistance of the monster it
-- fought are kept, and the two 0077 columns are emptied. 0077 is in no tag, so only a dev build
-- holds such rows. A row with no uuid cannot be named and keeps its columns.
--
-- Both statements that write `adventures` are scoped to author = 'hero': from 0076 on a seed
-- statement must never reach a hero row, and this one must never reach a seed row.
--
-- destructive-ok: the UPDATE empties `bossName` and `bossLinesJson` only on rows whose uuid the INSERT just
-- copied them under, in the same transaction; a row it could not copy keeps both. Not a DELETE, so the guard
-- does not ask, but it overwrites what a hero wrote, and that deserves the line.
--
-- multi-migration-ok: one new table, one nullable column, and the move of two columns no tag has shipped; 0074 to 0078 are in no tag yet and ship with it.
CREATE TABLE `hero_bosses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uuid` text NOT NULL,
	`name` text NOT NULL,
	`monster` text NOT NULL,
	`weaknessMuscle` text,
	`resistanceMuscle` text,
	`linesJson` text,
	`artJson` text,
	`createdAt` integer,
	`updatedAt` integer
);--> statement-breakpoint
CREATE UNIQUE INDEX `hero_bosses_uuid_unique` ON `hero_bosses` (`uuid`);--> statement-breakpoint
ALTER TABLE `adventures` ADD `heroBossUuid` text;--> statement-breakpoint
INSERT INTO `hero_bosses` (`uuid`, `name`, `monster`, `weaknessMuscle`, `resistanceMuscle`, `linesJson`, `createdAt`, `updatedAt`)
SELECT `uuid`, ifnull(`bossName`, ''), `bossImagePath`, `bossWeaknessMuscle`, `bossResistanceMuscle`, `bossLinesJson`, `createdAt`, `updatedAt`
FROM `adventures`
WHERE `author` = 'hero' AND `kind` = 'boss' AND `uuid` IS NOT NULL AND `bossImagePath` IS NOT NULL
  AND (`bossName` IS NOT NULL OR `bossLinesJson` IS NOT NULL);--> statement-breakpoint
UPDATE `adventures` SET `heroBossUuid` = `uuid`, `bossName` = NULL, `bossLinesJson` = NULL
WHERE `author` = 'hero' AND `uuid` IN (SELECT `uuid` FROM `hero_bosses`);
