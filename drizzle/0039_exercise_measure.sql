-- A movement is measured one way: Superman is a hold, Squat is counted. Until now only the
-- quest slot knew which — `quest_exercises.targetType` — so every substitution (a hero swap, or
-- the easier rung `getQuestById` serves automatically) kept the slot's unit and put it on a
-- movement that has never been measured that way: "22 reps of Superman", "12 reps of Wall Sit"
-- on every fresh install. The row written from that slot then poisons records, volume, XP and
-- ladder progression, all of which trust `resultType`.
--
-- Backfilled from the seed quests, which never prescribe one movement both ways. Nullable: a
-- hero's own movement created before this column has no answer, and null means "trust the slot"
-- — exactly what happened before, so nothing they built changes under them.
ALTER TABLE `exercises` ADD `measure` text;
--> statement-breakpoint
UPDATE `exercises`
SET `measure` = (
    SELECT qe.`targetType`
    FROM `quest_exercises` qe
        JOIN `quests` q ON q.`id` = qe.`questId`
    WHERE qe.`exerciseId` = `exercises`.`id`
        AND q.`author` = 'Admin'
    LIMIT 1
)
WHERE `creator` = 'Admin';
