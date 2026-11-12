-- Towel Door Row retires (Guillaume, 2026-11-11). It needs a door and a towel shut in it, a set-up
-- the app cannot show safely, and its illustration failed in every animation pilot. It leaves our own
-- content and the pickers, and stays in the table.
--
-- Retired, not deleted: foreign keys are off on the device and nine queries innerJoin `exercises`,
-- so a deleted row would silently take a hero's past volume, records and village progress with it,
-- and a hero's own quest that holds the movement would stop resolving. `retiredAt` is the mechanism
-- hero movements already use (0035): `pickableExercises` hides the row from the catalogue, the quest
-- editor and the oath screen, while every screen that resolves an id it already holds keeps working.
-- This is the first seed row to carry it.
--
-- In this order:
--
-- 1. The pull ladder now starts at Table Row. `currentRungFor` walks a movement down to the first
--    rung the hero has not earned, so with Towel Door Row still under Table Row a beginner asked for
--    a Table Row, an Inverted Row or anything above would be handed the retired movement.
--
-- 2. The Cellar Hauler, the one seed quest that held it, gets the Superman W in that place: the only
--    other equipment-free horizontal pull (Table Row is already its first slot). A new slot is inserted
--    out of the way (+1000, the unique (questId, sortOrder) index is checked row by row), the old one
--    deleted, and the new one moved to the old sortOrder. It lands before the Superman, two prone
--    movements in a row, but the patterns still alternate pull, core, pull, core, which is the order
--    `content-invariants` holds every quest to; moving it up would put two pulls together. Never
--    swapped in place: a saved quest configuration is keyed by the quest_exercises id (`db/questConfig.ts`), so changing the movement
--    on the old slot would hand the hero's saved Towel Door Row target to the Superman W. The orphaned
--    key is a stale key like any edit leaves, and the config reader skips those. 10 to 12 reps, the
--    target the two other quests give it (0073). Seed quests only, by author: a hero's own quest that
--    holds Towel Door Row keeps it.
--
-- 3. The row is retired. Seconds since the epoch, the unit Drizzle's timestamp mode reads.
--
-- destructive-ok: the only row deleted is The Cellar Hauler's Towel Door Row slot in seed content,
-- replaced in the same migration. No hero data is deleted: past sets reference the exercise, not the
-- slot, and the exercise row stays.
UPDATE `exercises`
SET `prerequisiteExerciseId` = NULL
WHERE `creator` = 'Admin'
    AND `enName` = 'Table Row'
    AND `prerequisiteExerciseId` = (
        SELECT `id` FROM `exercises` WHERE `creator` = 'Admin' AND `enName` = 'Towel Door Row'
    );
--> statement-breakpoint
INSERT INTO `quest_exercises` (`questId`, `exerciseId`, `sortOrder`, `targetType`, `targetMin`, `targetMax`, `imagesJson`)
SELECT `qe`.`questId`,
    (SELECT `id` FROM `exercises` WHERE `creator` = 'Admin' AND `enName` = 'Superman W'),
    `qe`.`sortOrder` + 1000,
    'reps', 10, 12, '[]'
FROM `quest_exercises` `qe`
JOIN `quests` `q` ON `q`.`id` = `qe`.`questId` AND `q`.`author` = 'Admin'
WHERE `qe`.`exerciseId` = (
    SELECT `id` FROM `exercises` WHERE `creator` = 'Admin' AND `enName` = 'Towel Door Row'
);
--> statement-breakpoint
DELETE FROM `quest_exercises`
WHERE `exerciseId` = (SELECT `id` FROM `exercises` WHERE `creator` = 'Admin' AND `enName` = 'Towel Door Row')
    AND `questId` IN (SELECT `id` FROM `quests` WHERE `author` = 'Admin');
--> statement-breakpoint
UPDATE `quest_exercises`
SET `sortOrder` = `sortOrder` - 1000
WHERE `sortOrder` >= 1000
    AND `exerciseId` = (SELECT `id` FROM `exercises` WHERE `creator` = 'Admin' AND `enName` = 'Superman W')
    AND `questId` IN (SELECT `id` FROM `quests` WHERE `author` = 'Admin');
--> statement-breakpoint
UPDATE `exercises`
SET `retiredAt` = CAST(strftime('%s', 'now') AS INTEGER),
    `updatedAt` = CAST(strftime('%s', 'now') AS INTEGER)
WHERE `creator` = 'Admin'
    AND `enName` = 'Towel Door Row';
