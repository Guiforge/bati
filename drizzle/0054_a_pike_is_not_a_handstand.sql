-- Two rungs were harder than the rungs they unlock.
--
-- Auditing issue #94 walked every ladder edge, and two broke the one reading a ladder allows,
-- "the next rung is at least as hard", inside a single movement pattern:
--
--   Pike Push-Up (hard)      -> Wall Handstand (medium) -> Handstand Push-Up (hard)
--   Hollow Body Hold (hard)  -> Tuck L-Sit (medium)     -> L-Sit (hard)
--
-- The ladders were right and the labels were not. A pike push-up is the beginner's first
-- vertical press and a hollow body hold is a floor position; `hard` put them beside Handstand
-- Push-Up, L-Sit and Dragon Flag, which is what `hard` means everywhere else in the catalogue.
-- Raising the next rung instead would have called Wall Handstand and Tuck L-Sit as hard as
-- those, which is the same mistake one rung up. Both are `medium` now, and their sets weigh
-- `medium` in XP (1.0 per effort second rather than 2.5).
--
-- Two quests opened on a Pike Push-Up that is no longer their hardest movement, and every
-- seeded quest puts its hardest movement first (`content-invariants`). Pike Push-Up moves behind
-- the `hard` slots. Rows keep their ids, and a hero's saved targets and swaps are keyed by
-- quest_exercises id (`db/questConfig.ts`), so a saved configuration follows its movement.
--
--   Forge the Dragon Blade        Diamond Push-Up, Dip, Pike Push-Up, Superman
--   The Iron Gauntlet Challenge   Pull-ups, Dip, Pike Push-Up, Hollow Body Hold
--
-- The unique index on (questId, sortOrder) is checked row by row, so each quest's slots are moved
-- out of the way (+100) before they take their new places.
--
-- `creator = 'Admin'` on every read of an exercise (rule 2, `0035`), `author = 'Admin'` on quests.

UPDATE `exercises` SET
    `difficulty` = 'medium',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` IN ('Pike Push-Up', 'Hollow Body Hold') AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `quest_exercises` SET `sortOrder` = `sortOrder` + 100
WHERE `questId` = (
    SELECT q.`id` FROM `quests` q WHERE q.`enTitle` = 'Forge the Dragon Blade' AND q.`author` = 'Admin'
);
--> statement-breakpoint
UPDATE `quest_exercises` SET `sortOrder` = CASE (
        SELECT e.`enName` FROM `exercises` e
        WHERE e.`id` = `quest_exercises`.`exerciseId` AND e.`creator` = 'Admin'
    )
    WHEN 'Diamond Push-Up' THEN 0
    WHEN 'Dip' THEN 1
    WHEN 'Pike Push-Up' THEN 2
    WHEN 'Superman' THEN 3
    ELSE `sortOrder` - 100
END
WHERE `questId` = (
    SELECT q.`id` FROM `quests` q WHERE q.`enTitle` = 'Forge the Dragon Blade' AND q.`author` = 'Admin'
);
--> statement-breakpoint
UPDATE `quest_exercises` SET `sortOrder` = `sortOrder` + 100
WHERE `questId` = (
    SELECT q.`id` FROM `quests` q WHERE q.`enTitle` = 'The Iron Gauntlet Challenge' AND q.`author` = 'Admin'
);
--> statement-breakpoint
UPDATE `quest_exercises` SET `sortOrder` = CASE (
        SELECT e.`enName` FROM `exercises` e
        WHERE e.`id` = `quest_exercises`.`exerciseId` AND e.`creator` = 'Admin'
    )
    WHEN 'Pull-ups' THEN 0
    WHEN 'Dip' THEN 1
    WHEN 'Pike Push-Up' THEN 2
    WHEN 'Hollow Body Hold' THEN 3
    ELSE `sortOrder` - 100
END
WHERE `questId` = (
    SELECT q.`id` FROM `quests` q WHERE q.`enTitle` = 'The Iron Gauntlet Challenge' AND q.`author` = 'Admin'
);
