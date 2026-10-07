-- Some movements are done on one side, then on the other: a side plank, a pistol squat, a pigeon
-- pose. Their target never said whether "30 s" meant both sides or each, so every hero read it
-- their own way. It means each side now, the way a coach writes "30 s per side", and this column
-- is how the session knows: a timed one runs twice the target and beeps the switch at halfway, a
-- counted one says "per side" under the count. The result logged stays the per-side figure, so a
-- hero's history of side planks reads the same before and after.
--
-- Movements that alternate inside the set (Lunge, Archer Push-Up, Dead Bug, Skater Hop) are not
-- in the list: their count already covers both sides, rep by rep. Hero movements default to 0,
-- which is what they always behaved as.
ALTER TABLE `exercises` ADD `perSide` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
UPDATE `exercises`
SET `perSide` = 1
WHERE `creator` = 'Admin'
    AND `enName` IN (
        'Side Plank',
        'Single-Leg Glute Bridge',
        'Single-Leg Deadlift',
        'Bulgarian Split Squat',
        'Pistol Squat',
        'Pigeon Pose',
        'Warrior Pose',
        'Thread the Needle',
        'World''s Greatest Stretch'
    );
