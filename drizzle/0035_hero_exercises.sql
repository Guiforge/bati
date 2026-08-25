-- Two populations in one table.
--
-- `creator` has been on `exercises` since `0000` and has never been load-bearing: everything was
-- 'Admin'. It becomes the partition key here, because what actually collides between seed content
-- and hero content is the *name*, not the id.
--
-- Ids were never an identity anyone shares. They are AUTOINCREMENT seeding order, nothing outside
-- the database references them, and a backup is a `VACUUM INTO` of the whole file, so there is no
-- row-level merge that could get one wrong. Seed content addresses movements by `enName` — see
-- `0032`'s header, `db/paths.ts` and `constants/warmup.ts` — so the name is the contested
-- namespace, and this is where it gets split in two.
--
-- What the old global index did: seven migrations `INSERT INTO exercises` bare, and `db/migrate.ts`
-- runs the whole journal in one BEGIN IMMEDIATE. A hero row named "Dead Bug" plus a later seed of
-- the official "Dead Bug" is a UNIQUE failure, a rollback of every migration, and an app that never
-- opens again on that phone.
--
-- The rule this buys, enforced by `__tests__/seed-migration-guard.test.ts`: every migration
-- statement that UPDATEs or DELETEs `exercises` scopes itself to `creator`. INSERT needs no guard,
-- the column defaults to 'Admin'.
--
-- `retiredAt`: foreign keys are off on the device and nine queries innerJoin this table, so a hard
-- delete rewrites the hero's own history. Hero rows are retired instead.
ALTER TABLE `exercises` ADD `retiredAt` integer;--> statement-breakpoint
DROP INDEX `exercises_en_name_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX `exercises_admin_name_unique` ON `exercises` (`enName`) WHERE `creator` = 'Admin';--> statement-breakpoint
CREATE UNIQUE INDEX `exercises_hero_name_unique` ON `exercises` (`enName`) WHERE `creator` <> 'Admin';
