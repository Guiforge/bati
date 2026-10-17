-- The hero writes adventures (lot adventure-builder, phase 1).
--
-- An adventure of the hero is a row of `adventures` with author = 'hero', like a quest of the hero
-- is a row of `quests`: no new table. It needs what hero quests got in 0066, a name off this
-- database, so device sync matches the same adventure on two phones whatever its title and a
-- rename is an edit, not a second adventure. A uuid v7, written by `db/heroAdventures.ts` and
-- nothing else, NULL on every seeded row, as on seeded quests.
--
-- Two populations, two namespaces, as `exercises` in 0035. A hero may call an adventure "The
-- Golem", and the merge maps the game's adventures by enTitle, so the seeded titles must stay
-- unique among themselves and only among themselves. The 8 Admin titles are distinct today.
--
-- From here on, every statement that writes `adventures` or `adventure_steps`, or reads an
-- adventure by enTitle, scopes itself to author = 'Admin' (`__tests__/seed-migration-guard.test.ts`).
-- 0026 changed adventures by enTitle alone, it ran before any hero row could exist.
ALTER TABLE `adventures` ADD `uuid` text;--> statement-breakpoint
CREATE UNIQUE INDEX `adventures_uuid_unique` ON `adventures` (`uuid`);--> statement-breakpoint
CREATE UNIQUE INDEX `adventures_admin_title_unique` ON `adventures` (`enTitle`) WHERE `author` = 'Admin';
