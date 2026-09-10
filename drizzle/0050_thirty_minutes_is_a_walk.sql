-- Fifteen minutes is a walk to the baker's.
--
-- The three ways out were seeded at 600-1200 s (`0042`), which `generateTarget` turns into the
-- midpoint: fifteen minutes at medium. A tester's words: "he does that going to fetch his bread."
-- Nothing about fifteen was a decision about walking. `content-invariants` holds every seeded
-- quest to an 8-to-25-minute design window, that window was written for circuits of push-ups,
-- and a walk was simply the thing it happened to also apply to.
--
-- So each way out gets a band of its own, and each is the shortest version of itself that is
-- worth putting shoes on for:
--
--   The Warden's Round   1800-3600   45 min   a walk you feel afterwards
--   Word Must Travel     1200-2400   30 min   running is dearer per minute, so it is shorter
--   The Long Reach       1800-3600   45 min   a ride covers four times the ground in that time
--
-- The window these are held to is now their own, 20 to 60 minutes, and the same test enforces it
-- (`__tests__/content-invariants.test.ts`). Sixty rather than the twelve hours a hero may now
-- *set* for themselves: this is shipped content, and content that suggests a two-hour hike to
-- someone who opened the app yesterday is content that gets ignored.
--
-- The hero's own duration lives in their quest config and is untouched by this. Anyone who has
-- already edited one of these keeps what they chose; anyone who has not is now offered a walk.
--
-- The level no longer scales these bands either (`buildSlot`, `db/quests.ts`). It used to, so the
-- same walk read as 34, 45 or 56 minutes depending on a slider about how hard push-ups should be,
-- and paid all three the same for the same hour.
--
-- `AND e.creator = 'Admin'` on every read: rule 2 of the two-population model.

UPDATE `quest_exercises` SET `targetMin` = 1800, `targetMax` = 3600
WHERE `id` IN (
    SELECT qe.`id`
    FROM `quest_exercises` qe
    JOIN `exercises` e ON e.`id` = qe.`exerciseId`
    WHERE e.`enName` = 'Warden''s Walk' AND e.`creator` = 'Admin'
);
--> statement-breakpoint
UPDATE `quest_exercises` SET `targetMin` = 1200, `targetMax` = 2400
WHERE `id` IN (
    SELECT qe.`id`
    FROM `quest_exercises` qe
    JOIN `exercises` e ON e.`id` = qe.`exerciseId`
    WHERE e.`enName` = 'Messenger''s Run' AND e.`creator` = 'Admin'
);
--> statement-breakpoint
UPDATE `quest_exercises` SET `targetMin` = 1800, `targetMax` = 3600
WHERE `id` IN (
    SELECT qe.`id`
    FROM `quest_exercises` qe
    JOIN `exercises` e ON e.`id` = qe.`exerciseId`
    WHERE e.`enName` = 'Outrider''s Ride' AND e.`creator` = 'Admin'
);
