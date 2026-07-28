-- Official movement names for the 0006 batch.
--
-- `0006_content_expansion.sql` seeded 20 exercises under heroic-fantasy names — Goblin Squat,
-- Thunder Jumping Jack, Titan's Dip — while 0001, 0010 and 0015 use the movement's real name.
-- The catalogue therefore shipped two naming conventions in one list, and five of the fantasy
-- entries were plain duplicates of an exercise already seeded in 0001.
--
-- This migration ends the split: five merges, fourteen renames (the twentieth,
-- Barbarian's Overhead Press, was already deleted by `0018`). Names and descriptions become
-- factual; the quests, adventures and bosses keep their theme — the fantasy is the world, not
-- the exercise list.
--
-- ============================================================
-- PART 1: MERGE THE FIVE DUPLICATES
-- ============================================================
--
--   Goblin Squat          -> Squat
--   Dragon Push-up        -> Push-ups
--   Iron Grip Pull-up     -> Pull-ups
--   Stone Guardian Plank  -> Plank
--   Wall Sentinel Hold    -> Wall Sit
--
-- Every reference is repointed BEFORE the delete, and that order is not cosmetic (same reasoning
-- as `0018`): `completed_exercises.exerciseId` is ON DELETE NO ACTION, so deleting an exercise
-- that appears in someone's journal aborts the whole migration and bricks the install;
-- `quest_exercises.exerciseId` is ON DELETE CASCADE, so it would silently gut a quest — including
-- a user-authored one. Repointing first means no session is lost: a past journal entry that read
-- "Goblin Squat" now reads "Squat", with its reps and date intact.
--
-- The surviving row keeps its own columns. Difficulty, equipment and secondsPerRep already match
-- pair for pair (only Wall Sit `easy` vs Wall Sentinel Hold `medium` differs), and the muscle tags
-- are deliberately NOT merged: `0012` curated those by hand, and unioning would quietly make Plank
-- a back movement for every quest that uses it.
--
-- No seeded quest holds both members of a pair, so no quest ends up with the same exercise twice.
-- A user-authored quest holding both would — harmless, and not worth guessing what they meant.
UPDATE `completed_exercises`
SET `exerciseId` = (
        SELECT `official`.`id`
        FROM `exercises` `fantasy`
            JOIN `exercises` `official` ON `official`.`enName` = CASE `fantasy`.`enName`
                WHEN 'Goblin Squat' THEN 'Squat'
                WHEN 'Dragon Push-up' THEN 'Push-ups'
                WHEN 'Iron Grip Pull-up' THEN 'Pull-ups'
                WHEN 'Stone Guardian Plank' THEN 'Plank'
                WHEN 'Wall Sentinel Hold' THEN 'Wall Sit'
            END
        WHERE `fantasy`.`id` = `completed_exercises`.`exerciseId`
    )
WHERE `exerciseId` IN (
        SELECT `id`
        FROM `exercises`
        WHERE `enName` IN (
                'Goblin Squat',
                'Dragon Push-up',
                'Iron Grip Pull-up',
                'Stone Guardian Plank',
                'Wall Sentinel Hold'
            )
    );
--> statement-breakpoint
UPDATE `quest_exercises`
SET `exerciseId` = (
        SELECT `official`.`id`
        FROM `exercises` `fantasy`
            JOIN `exercises` `official` ON `official`.`enName` = CASE `fantasy`.`enName`
                WHEN 'Goblin Squat' THEN 'Squat'
                WHEN 'Dragon Push-up' THEN 'Push-ups'
                WHEN 'Iron Grip Pull-up' THEN 'Pull-ups'
                WHEN 'Stone Guardian Plank' THEN 'Plank'
                WHEN 'Wall Sentinel Hold' THEN 'Wall Sit'
            END
        WHERE `fantasy`.`id` = `quest_exercises`.`exerciseId`
    )
WHERE `exerciseId` IN (
        SELECT `id`
        FROM `exercises`
        WHERE `enName` IN (
                'Goblin Squat',
                'Dragon Push-up',
                'Iron Grip Pull-up',
                'Stone Guardian Plank',
                'Wall Sentinel Hold'
            )
    );
--> statement-breakpoint
UPDATE `boss_damage_log`
SET `exerciseId` = (
        SELECT `official`.`id`
        FROM `exercises` `fantasy`
            JOIN `exercises` `official` ON `official`.`enName` = CASE `fantasy`.`enName`
                WHEN 'Goblin Squat' THEN 'Squat'
                WHEN 'Dragon Push-up' THEN 'Push-ups'
                WHEN 'Iron Grip Pull-up' THEN 'Pull-ups'
                WHEN 'Stone Guardian Plank' THEN 'Plank'
                WHEN 'Wall Sentinel Hold' THEN 'Wall Sit'
            END
        WHERE `fantasy`.`id` = `boss_damage_log`.`exerciseId`
    )
WHERE `exerciseId` IN (
        SELECT `id`
        FROM `exercises`
        WHERE `enName` IN (
                'Goblin Squat',
                'Dragon Push-up',
                'Iron Grip Pull-up',
                'Stone Guardian Plank',
                'Wall Sentinel Hold'
            )
    );
--> statement-breakpoint
-- The variation ladder from `0022`: Knight's Diamond Push-up has Dragon Push-up as its
-- prerequisite. Left alone it would point at a deleted row (the column carries no FK, so nothing
-- would complain — the exercise screen would just stop showing the hint).
UPDATE `exercises`
SET `prerequisiteExerciseId` = (
        SELECT `official`.`id`
        FROM `exercises` `fantasy`
            JOIN `exercises` `official` ON `official`.`enName` = CASE `fantasy`.`enName`
                WHEN 'Goblin Squat' THEN 'Squat'
                WHEN 'Dragon Push-up' THEN 'Push-ups'
                WHEN 'Iron Grip Pull-up' THEN 'Pull-ups'
                WHEN 'Stone Guardian Plank' THEN 'Plank'
                WHEN 'Wall Sentinel Hold' THEN 'Wall Sit'
            END
        WHERE `fantasy`.`id` = `exercises`.`prerequisiteExerciseId`
    )
WHERE `prerequisiteExerciseId` IN (
        SELECT `id`
        FROM `exercises`
        WHERE `enName` IN (
                'Goblin Squat',
                'Dragon Push-up',
                'Iron Grip Pull-up',
                'Stone Guardian Plank',
                'Wall Sentinel Hold'
            )
    );
--> statement-breakpoint
-- Nothing references them any more; `exercise_muscles` follows in CASCADE.
DELETE FROM `exercises`
WHERE `enName` IN (
        'Goblin Squat',
        'Dragon Push-up',
        'Iron Grip Pull-up',
        'Stone Guardian Plank',
        'Wall Sentinel Hold'
    );
--> statement-breakpoint
-- ============================================================
-- PART 2: RENAME THE FOURTEEN SURVIVORS
-- ============================================================
--
-- Same rows, same ids: quests, journals and the progression ladder are untouched. What changes is
-- the label, the description — rewritten as execution cues, matching the tone of the 0010 batch —
-- and the image basename, which `assetMap` resolves by (`keyFromPath` strips the extension).
UPDATE `exercises`
SET `enName` = 'Lunge',
    `frName` = 'Fente',
    `enDescription` = 'Step forward and lower until both knees are bent to about 90 degrees, front knee over the ankle, then push back to standing and alternate legs.',
    `frDescription` = 'Avancez d''un pas et descendez jusqu''à ce que les deux genoux forment un angle d''environ 90 degrés, genou avant à l''aplomb de la cheville, puis repoussez pour revenir debout en alternant les jambes.',
    `imagePath` = 'assets/images/exercises/lunge.jpg',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Shadow Step Lunge';
--> statement-breakpoint
UPDATE `exercises`
SET `enName` = 'Burpee',
    `frName` = 'Burpee',
    `enDescription` = 'From standing, drop into a squat, kick your legs back to a push-up position, return them under you and finish with a jump, arms overhead.',
    `frDescription` = 'Depuis la position debout, descendez en squat, projetez les jambes en arrière en position de pompe, ramenez-les sous vous et terminez par un saut, bras au-dessus de la tête.',
    `imagePath` = 'assets/images/exercises/burpee.jpg',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Berserker Burpee';
--> statement-breakpoint
UPDATE `exercises`
SET `enName` = 'Mountain Climber',
    `frName` = 'Grimpeur de Montagne',
    `enDescription` = 'Hold a push-up position with the hands under the shoulders and drive one knee at a time toward your chest, alternating quickly without letting the hips rise.',
    `frDescription` = 'Tenez une position de pompe, mains sous les épaules, et ramenez alternativement un genou vers la poitrine à rythme rapide, sans laisser monter les hanches.',
    `imagePath` = 'assets/images/exercises/mountain_climber.jpg',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Monk''s Mountain Climber';
--> statement-breakpoint
UPDATE `exercises`
SET `enName` = 'Dip',
    `frName` = 'Dips',
    `enDescription` = 'Support yourself on two parallel bars or a sturdy edge, lower until the elbows reach about 90 degrees, then press back up to straight arms.',
    `frDescription` = 'En appui sur deux barres parallèles ou un rebord stable, descendez jusqu''à ce que les coudes atteignent environ 90 degrés, puis remontez bras tendus.',
    `imagePath` = 'assets/images/exercises/dip.jpg',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Titan''s Dip';
--> statement-breakpoint
UPDATE `exercises`
SET `enName` = 'Pike Push-Up',
    `frName` = 'Pompe Pike',
    `enDescription` = 'From a push-up position, walk the feet in and lift the hips into an inverted V, then bend the elbows to lower the top of your head toward the floor and press back up.',
    `frDescription` = 'Depuis la position de pompe, rapprochez les pieds et levez les hanches en V inversé, puis fléchissez les coudes pour amener le sommet du crâne vers le sol avant de repousser.',
    `imagePath` = 'assets/images/exercises/pike_pushup.jpg',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Archer''s Pike Push-up';
--> statement-breakpoint
UPDATE `exercises`
SET `enName` = 'Jumping Jack',
    `frName` = 'Jumping Jack',
    `enDescription` = 'Jump the feet out wide while raising the arms overhead, then jump back to feet together with the arms at your sides, keeping a steady rhythm.',
    `frDescription` = 'Sautez en écartant les pieds tout en levant les bras au-dessus de la tête, puis revenez pieds joints, bras le long du corps, à rythme régulier.',
    `imagePath` = 'assets/images/exercises/jumping_jack.jpg',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Thunder Jumping Jack';
--> statement-breakpoint
UPDATE `exercises`
SET `enName` = 'High Knees',
    `frName` = 'Montées de Genoux',
    `enDescription` = 'Run in place driving each knee up to hip height, landing on the balls of the feet and keeping the torso upright.',
    `frDescription` = 'Courez sur place en montant chaque genou à hauteur de hanche, en amortissant sur l''avant du pied et en gardant le buste droit.',
    `imagePath` = 'assets/images/exercises/high_knees.jpg',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Paladin''s High Knee';
--> statement-breakpoint
UPDATE `exercises`
SET `enName` = 'Bicycle Crunch',
    `frName` = 'Crunch Vélo',
    `enDescription` = 'Lie on your back, hands beside the head, and bring one elbow toward the opposite knee while the other leg extends, alternating without pulling on the neck.',
    `frDescription` = 'Allongé sur le dos, mains près de la tête, amenez un coude vers le genou opposé pendant que l''autre jambe s''étend, en alternant sans tirer sur la nuque.',
    `imagePath` = 'assets/images/exercises/bicycle_crunch.jpg',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Wizard''s Bicycle Crunch';
--> statement-breakpoint
UPDATE `exercises`
SET `enName` = 'Diamond Push-Up',
    `frName` = 'Pompe Diamant',
    `enDescription` = 'Perform a push-up with the hands close together under the chest, thumbs and index fingers forming a diamond, elbows brushing the ribs.',
    `frDescription` = 'Réalisez une pompe mains rapprochées sous la poitrine, pouces et index formant un losange, coudes frôlant les côtes.',
    `imagePath` = 'assets/images/exercises/diamond_pushup.jpg',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Knight''s Diamond Push-up';
--> statement-breakpoint
UPDATE `exercises`
SET `enName` = 'Single-Leg Deadlift',
    `frName` = 'Soulevé de Terre Unijambiste',
    `enDescription` = 'Standing on one leg, hinge at the hip and reach toward the floor while the free leg extends behind you, then return upright with a flat back.',
    `frDescription` = 'En appui sur une jambe, basculez à la hanche et tendez les mains vers le sol pendant que la jambe libre s''étend derrière vous, puis redressez-vous dos plat.',
    `imagePath` = 'assets/images/exercises/single_leg_deadlift.jpg',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Ranger''s Single Leg Deadlift';
--> statement-breakpoint
UPDATE `exercises`
SET `enName` = 'Cobra Stretch',
    `frName` = 'Étirement du Cobra',
    `enDescription` = 'Lie face down with the hands under the shoulders and press the chest up, extending the spine while the hips stay on the floor, and keep breathing.',
    `frDescription` = 'Allongé sur le ventre, mains sous les épaules, poussez la poitrine vers le haut en étendant la colonne, hanches au sol, et continuez de respirer.',
    `imagePath` = 'assets/images/exercises/cobra_stretch.jpg',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Druid''s Cobra Stretch';
--> statement-breakpoint
UPDATE `exercises`
SET `enName` = 'Warrior Pose',
    `frName` = 'Posture du Guerrier',
    `enDescription` = 'Take a wide stance, turn the front foot out and bend that knee over the ankle, arms extended at shoulder height, and hold.',
    `frDescription` = 'Adoptez une position large, pointe du pied avant tournée vers l''extérieur et genou fléchi à l''aplomb de la cheville, bras tendus à hauteur d''épaules, et tenez.',
    `imagePath` = 'assets/images/exercises/warrior_pose.jpg',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Samurai''s Warrior Pose';
--> statement-breakpoint
UPDATE `exercises`
SET `enName` = 'Skater Hop',
    `frName` = 'Saut du Patineur',
    `enDescription` = 'Bound sideways from one foot to the other, landing softly with a slight knee bend and the free leg crossing behind you.',
    `frDescription` = 'Bondissez latéralement d''un pied sur l''autre, en amortissant genou légèrement fléchi, la jambe libre passant derrière vous.',
    `imagePath` = 'assets/images/exercises/skater_hop.jpg',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Rogue''s Skater Hop';
--> statement-breakpoint
UPDATE `exercises`
SET `enName` = 'Hollow Body Hold',
    `frName` = 'Maintien Corps Creux',
    `enDescription` = 'Lie on your back, press the lower back into the floor and lift the shoulders and legs a few centimetres, arms overhead, holding that banana shape.',
    `frDescription` = 'Allongé sur le dos, plaquez le bas du dos au sol et décollez les épaules et les jambes de quelques centimètres, bras dans le prolongement, en tenant cette position en banane.',
    `imagePath` = 'assets/images/exercises/hollow_body_hold.jpg',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Alchemist''s Hollow Body Hold';
--> statement-breakpoint
-- ============================================================
-- PART 3: ONE QUEST REORDERED, AS A CONSEQUENCE OF THE MERGE
-- ============================================================
--
-- Guard the Fortress Gate opened on Wall Sentinel Hold (`medium`), which merged into Wall Sit
-- (`easy`) — leaving the quest to start on its easiest movement and breaking the hardest-first
-- invariant (`__tests__/content-invariants.test.ts`). The wall sit moves to the end rather than
-- the difficulty being bumped to satisfy one quest: a wall sit is an easy hold wherever it
-- appears, and the fix belongs to the quest that now leads with it.
--
-- Two statements because `quest_exercises_quest_sort_unique` is checked row by row: shift the
-- whole quest out of range first, then map back (100 -> 3, 101 -> 0, 102 -> 1, 103 -> 2).
UPDATE `quest_exercises`
SET `sortOrder` = `sortOrder` + 100
WHERE `questId` = (
        SELECT `id`
        FROM `quests`
        WHERE `enTitle` = 'Guard the Fortress Gate'
    );
--> statement-breakpoint
UPDATE `quest_exercises`
SET `sortOrder` = CASE `sortOrder`
        WHEN 100 THEN 3
        ELSE `sortOrder` - 101
    END
WHERE `questId` = (
        SELECT `id`
        FROM `quests`
        WHERE `enTitle` = 'Guard the Fortress Gate'
    );
