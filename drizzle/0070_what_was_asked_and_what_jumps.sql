-- Three additive columns, one release, for the same reason: the app now tells apart what it asked
-- for from what the hero chose, and what jumps from what does not.
--
-- `completed_exercises.prescribedValue` is the target the app prescribed for a set, before the
-- hero touched the stepper. `targetValue` stays what they were handed, and what the Journal
-- shows. Until now the ladder read only the handed one, so a target lowered to 1 earned a rung on
-- a single rep, and the same lowered target made one extra rep a maximal critical hit. Rung
-- credit, crit odds and the damage cap read the prescribed value from here on. NULL on every row
-- written before this migration, and every read falls back to `targetValue` there: no rung a
-- hero already owns moves, in either direction.
--
-- `completed_exercises.ladderNeutral` marks a set the ladder must not judge: neither a clean
-- session nor a missed one. A target lowered on purpose and not reached at the prescribed value
-- is a careful evening, not a failure. And a movement the hero left mid-session (skipped, or
-- swapped away from) had one good round and then said no, which is not owning it. 0 on every
-- existing row, which is what they always were.
--
-- `exercises.impact` is true for the six movements where both feet leave the ground. A
-- beginner's warm-up no longer opens on a jump, and a quest built on them is not suggested to
-- one. Mountain Climber is not in the list: a foot is always down. Hero movements default to 0.
ALTER TABLE `completed_exercises` ADD `prescribedValue` integer;
--> statement-breakpoint
ALTER TABLE `completed_exercises` ADD `ladderNeutral` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `exercises` ADD `impact` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
UPDATE `exercises`
SET `impact` = 1
WHERE `creator` = 'Admin'
    AND `enName` IN (
        'Jumping Jack',
        'Star Jump',
        'Skater Hop',
        'High Knees',
        'Jump Squat',
        'Burpee'
    );
