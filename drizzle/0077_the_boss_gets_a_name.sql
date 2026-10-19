-- The hero names their boss and writes its lines (lot adventure-builder, phase 3).
--
-- A hero adventure that ends on a boss still fights a painted monster of the APK: its art, its
-- weakness, its resistance and its own lines stay those of the seeded boss (db/heroAdventures.ts
-- copies them). What the hero adds is words: a name shown instead of the painted one, and up to three
-- lines for each of three moments (idle, crit, enrage), added to the painted pool, never replacing it.
--
-- `bossName`: one line, 40 characters at most. `bossLinesJson`: {"idle":[...],"crit":[...],"enrage":[...]}
-- in that key order, 3 lines of 60 characters at most per moment, written by db/bossVoice.ts and
-- nothing else. Both NULL on every seeded row, on a route, and on a boss the hero left unnamed and
-- silent. Text the hero wrote, the same in every language, as the adventure's title.
--
-- Two ALTERs and no data: no seed statement, nothing scoped to author (the guard in
-- __tests__/seed-migration-guard.test.ts matches UPDATE and DELETE, not ALTER).
--
-- multi-migration-ok: 0074 (merge v2), 0075 (the notebook), 0076 and 0077 are not in any tag yet; 0076 and 0077 are one feature, the hero's adventures, and 0077 only adds two nullable columns no older build reads.
ALTER TABLE `adventures` ADD `bossName` text;--> statement-breakpoint
ALTER TABLE `adventures` ADD `bossLinesJson` text;
