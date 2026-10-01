-- A name for the hero's own quests and movements that survives leaving this database.
--
-- Sessions got theirs in 0038. Hero content was still known by its title, by device sync
-- (db/merge.ts, db/backup.ts) and by a quest file another hero imports (src/questFile.ts): a
-- rename on one phone made two quests on the next sync, and the same quest imported twice was
-- two quests. A uuid v7 (db/uuid.ts), the same layout as the sessions'.
--
-- The backfill is deterministic, on purpose, and that is what 0038 could not be. Two phones that
-- already synced hold the same hero quest with the same `createdAt` (merge copies timestamps
-- verbatim) and the same title, but different row ids. Random bits would give the one quest two
-- names, one per phone, and the first sync after this migration would copy it in twice. So the
-- 48 time bits are `createdAt` and the 74 others are the hex of the name's last nine bytes:
-- both phones compute the same string. Version nibble 7, variant 8, so `UUID_V7_RE` holds.
--
-- Two hero rows of one table, created in the same second under names ending alike, would get the
-- same string, and a UNIQUE index that fails rolls the whole journal back on every launch,
-- forever (the lesson of 0035). The pass after the backfill gives every duplicate but the first a
-- random v7 instead, as 0038 did, so the index cannot fail. Seed rows stay NULL: they are known
-- by their name, and SQLite's UNIQUE tolerates any number of NULLs.
ALTER TABLE `quests` ADD `uuid` text;--> statement-breakpoint
ALTER TABLE `exercises` ADD `uuid` text;--> statement-breakpoint
UPDATE `quests` SET `uuid` =
  substr(printf('%012x', coalesce(`createdAt`, `updatedAt`, 0) * 1000), 1, 8) || '-' ||
  substr(printf('%012x', coalesce(`createdAt`, `updatedAt`, 0) * 1000), 9, 4) || '-7' ||
  substr(substr('000000000000000000' || lower(hex(`enTitle` || '/' || `frTitle`)), -18), 1, 3) || '-8' ||
  substr(substr('000000000000000000' || lower(hex(`enTitle` || '/' || `frTitle`)), -18), 4, 3) || '-' ||
  substr(substr('000000000000000000' || lower(hex(`enTitle` || '/' || `frTitle`)), -18), 7, 12)
WHERE `author` <> 'Admin';--> statement-breakpoint
UPDATE `exercises` SET `uuid` =
  substr(printf('%012x', coalesce(`createdAt`, `updatedAt`, 0) * 1000), 1, 8) || '-' ||
  substr(printf('%012x', coalesce(`createdAt`, `updatedAt`, 0) * 1000), 9, 4) || '-7' ||
  substr(substr('000000000000000000' || lower(hex(`enName`)), -18), 1, 3) || '-8' ||
  substr(substr('000000000000000000' || lower(hex(`enName`)), -18), 4, 3) || '-' ||
  substr(substr('000000000000000000' || lower(hex(`enName`)), -18), 7, 12)
WHERE `creator` <> 'Admin';--> statement-breakpoint
UPDATE `quests` SET `uuid` =
  substr(printf('%012x', coalesce(`createdAt`, `updatedAt`, 0) * 1000), 1, 8) || '-' ||
  substr(printf('%012x', coalesce(`createdAt`, `updatedAt`, 0) * 1000), 9, 4) || '-7' ||
  substr(lower(hex(randomblob(2))), 1, 3) || '-' ||
  substr('89ab', (random() & 3) + 1, 1) || substr(lower(hex(randomblob(2))), 1, 3) || '-' ||
  lower(hex(randomblob(6)))
WHERE `uuid` IS NOT NULL
  AND `id` NOT IN (SELECT min(`id`) FROM `quests` WHERE `uuid` IS NOT NULL GROUP BY `uuid`);--> statement-breakpoint
UPDATE `exercises` SET `uuid` =
  substr(printf('%012x', coalesce(`createdAt`, `updatedAt`, 0) * 1000), 1, 8) || '-' ||
  substr(printf('%012x', coalesce(`createdAt`, `updatedAt`, 0) * 1000), 9, 4) || '-7' ||
  substr(lower(hex(randomblob(2))), 1, 3) || '-' ||
  substr('89ab', (random() & 3) + 1, 1) || substr(lower(hex(randomblob(2))), 1, 3) || '-' ||
  lower(hex(randomblob(6)))
WHERE `creator` <> 'Admin' AND `uuid` IS NOT NULL
  AND `id` NOT IN (SELECT min(`id`) FROM `exercises` WHERE `uuid` IS NOT NULL GROUP BY `uuid`);--> statement-breakpoint
CREATE UNIQUE INDEX `quests_uuid_unique` ON `quests` (`uuid`);--> statement-breakpoint
CREATE UNIQUE INDEX `exercises_uuid_unique` ON `exercises` (`uuid`);
