-- A hero quest or movement deleted here still exists on the other device (roadmap 4.18b).
--
-- Sessions have had tombstones since 0064. Hero content had none: a quest or movement the hero
-- deleted on one phone was, to the comparison, a row the other phone had and this one lacked, and
-- the merge brought it back, its sessions recreating it through quest_map.
--
-- A row per deletion, keyed by the row's uuid (0066; uuids are random, so one table serves
-- exercises and quests). `deletedAt` is in seconds, like `updatedAt`, and the rule both devices
-- apply is: a copy whose `updatedAt` is later than `deletedAt` is a newer edit and lives; any other
-- copy is gone. Deleting writes max(now, updatedAt + 1) and a merge keeps the larger `deletedAt`,
-- so a deletion is never older than the row it removed, even after a phone whose clock runs ahead.
--
-- It is also the fence for the rest of merge v2: `mergePeer` refuses a device on another newest
-- migration, so a 2.12 device, whose merge would bring back what this one deleted, keep the smaller
-- XP of a session and keep its own copy on a same-second tie, is never merged with this build.
CREATE TABLE `deleted_content` (
	`uuid` text PRIMARY KEY NOT NULL,
	`deletedAt` integer NOT NULL
);
