-- The variation ladder, as data.
--
-- Progressive overload without weights comes from harder variations, not from a rep multiplier
-- (docs/raw/bodyweight-app-research.md §2). The ladder was authored into the content in §2.3 of
-- the work roadmap but existed nowhere the app could read it.
--
-- It is a hint, never a gate. Nothing is locked, no quest is hidden, no content is withheld: the
-- exercise screen simply shows what comes next and how close you are. Hiding two thirds of the
-- catalogue from a beginner would be the opposite of what the research says about competence.
ALTER TABLE `exercises` ADD `prerequisiteExerciseId` integer REFERENCES `exercises`(`id`);
--> statement-breakpoint
UPDATE `exercises`
SET `prerequisiteExerciseId` = (
        SELECT `id`
        FROM `exercises`
        WHERE `enName` = 'Wall Push-Up'
    )
WHERE `enName` = 'Push-ups';
--> statement-breakpoint
UPDATE `exercises`
SET `prerequisiteExerciseId` = (
        SELECT `id`
        FROM `exercises`
        WHERE `enName` = 'Push-ups'
    )
WHERE `enName` = 'Dragon Push-up';
--> statement-breakpoint
UPDATE `exercises`
SET `prerequisiteExerciseId` = (
        SELECT `id`
        FROM `exercises`
        WHERE `enName` = 'Dragon Push-up'
    )
WHERE `enName` = 'Knight''s Diamond Push-up';
--> statement-breakpoint
UPDATE `exercises`
SET `prerequisiteExerciseId` = (
        SELECT `id`
        FROM `exercises`
        WHERE `enName` = 'Push-ups'
    )
WHERE `enName` = 'Titan''s Dip';
--> statement-breakpoint
UPDATE `exercises`
SET `prerequisiteExerciseId` = (
        SELECT `id`
        FROM `exercises`
        WHERE `enName` = 'Push-ups'
    )
WHERE `enName` = 'Archer''s Pike Push-up';
--> statement-breakpoint
UPDATE `exercises`
SET `prerequisiteExerciseId` = (
        SELECT `id`
        FROM `exercises`
        WHERE `enName` = 'Archer''s Pike Push-up'
    )
WHERE `enName` = 'Handstand Push-Up';
--> statement-breakpoint
UPDATE `exercises`
SET `prerequisiteExerciseId` = (
        SELECT `id`
        FROM `exercises`
        WHERE `enName` = 'Towel Door Row'
    )
WHERE `enName` = 'Table Row';
--> statement-breakpoint
UPDATE `exercises`
SET `prerequisiteExerciseId` = (
        SELECT `id`
        FROM `exercises`
        WHERE `enName` = 'Table Row'
    )
WHERE `enName` = 'Inverted Row';
--> statement-breakpoint
UPDATE `exercises`
SET `prerequisiteExerciseId` = (
        SELECT `id`
        FROM `exercises`
        WHERE `enName` = 'Inverted Row'
    )
WHERE `enName` = 'Scapular Pull-Up';
--> statement-breakpoint
UPDATE `exercises`
SET `prerequisiteExerciseId` = (
        SELECT `id`
        FROM `exercises`
        WHERE `enName` = 'Scapular Pull-Up'
    )
WHERE `enName` = 'Chin-Up';
--> statement-breakpoint
UPDATE `exercises`
SET `prerequisiteExerciseId` = (
        SELECT `id`
        FROM `exercises`
        WHERE `enName` = 'Chin-Up'
    )
WHERE `enName` = 'Pull-ups';
--> statement-breakpoint
UPDATE `exercises`
SET `prerequisiteExerciseId` = (
        SELECT `id`
        FROM `exercises`
        WHERE `enName` = 'Pull-ups'
    )
WHERE `enName` = 'Iron Grip Pull-up';
--> statement-breakpoint
UPDATE `exercises`
SET `prerequisiteExerciseId` = (
        SELECT `id`
        FROM `exercises`
        WHERE `enName` = 'Wall Sit'
    )
WHERE `enName` = 'Squat';
--> statement-breakpoint
UPDATE `exercises`
SET `prerequisiteExerciseId` = (
        SELECT `id`
        FROM `exercises`
        WHERE `enName` = 'Squat'
    )
WHERE `enName` = 'Jump Squat';
--> statement-breakpoint
UPDATE `exercises`
SET `prerequisiteExerciseId` = (
        SELECT `id`
        FROM `exercises`
        WHERE `enName` = 'Squat'
    )
WHERE `enName` = 'Shadow Step Lunge';
--> statement-breakpoint
UPDATE `exercises`
SET `prerequisiteExerciseId` = (
        SELECT `id`
        FROM `exercises`
        WHERE `enName` = 'Shadow Step Lunge'
    )
WHERE `enName` = 'Curtsy Squat';
--> statement-breakpoint
UPDATE `exercises`
SET `prerequisiteExerciseId` = (
        SELECT `id`
        FROM `exercises`
        WHERE `enName` = 'Glute Bridge'
    )
WHERE `enName` = 'Ranger''s Single Leg Deadlift';
--> statement-breakpoint
UPDATE `exercises`
SET `prerequisiteExerciseId` = (
        SELECT `id`
        FROM `exercises`
        WHERE `enName` = 'Dead Bug'
    )
WHERE `enName` = 'Plank';
--> statement-breakpoint
UPDATE `exercises`
SET `prerequisiteExerciseId` = (
        SELECT `id`
        FROM `exercises`
        WHERE `enName` = 'Plank'
    )
WHERE `enName` = 'Stone Guardian Plank';
--> statement-breakpoint
UPDATE `exercises`
SET `prerequisiteExerciseId` = (
        SELECT `id`
        FROM `exercises`
        WHERE `enName` = 'Plank'
    )
WHERE `enName` = 'Side Plank';
--> statement-breakpoint
UPDATE `exercises`
SET `prerequisiteExerciseId` = (
        SELECT `id`
        FROM `exercises`
        WHERE `enName` = 'Dead Bug'
    )
WHERE `enName` = 'Alchemist''s Hollow Body Hold';
--> statement-breakpoint
UPDATE `exercises`
SET `prerequisiteExerciseId` = (
        SELECT `id`
        FROM `exercises`
        WHERE `enName` = 'Alchemist''s Hollow Body Hold'
    )
WHERE `enName` = 'L-Sit';
--> statement-breakpoint
UPDATE `exercises`
SET `prerequisiteExerciseId` = (
        SELECT `id`
        FROM `exercises`
        WHERE `enName` = 'Crunch'
    )
WHERE `enName` = 'Russian Twist';
--> statement-breakpoint
UPDATE `exercises`
SET `prerequisiteExerciseId` = (
        SELECT `id`
        FROM `exercises`
        WHERE `enName` = 'Russian Twist'
    )
WHERE `enName` = 'Windshield Wipers';
--> statement-breakpoint
UPDATE `exercises`
SET `prerequisiteExerciseId` = (
        SELECT `id`
        FROM `exercises`
        WHERE `enName` = 'Crunch'
    )
WHERE `enName` = 'Reverse Crunch';
--> statement-breakpoint
UPDATE `exercises`
SET `prerequisiteExerciseId` = (
        SELECT `id`
        FROM `exercises`
        WHERE `enName` = 'Reverse Crunch'
    )
WHERE `enName` = 'Hanging Leg Raise';
--> statement-breakpoint
UPDATE `exercises`
SET `prerequisiteExerciseId` = (
        SELECT `id`
        FROM `exercises`
        WHERE `enName` = 'Dead Bug'
    )
WHERE `enName` = 'Flutter Kicks';
