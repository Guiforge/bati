-- Seven rungs the ladder was missing, and the two quests that hold them.
--
-- `0022` built the variation ladder out of the movements that happened to already be seeded, so
-- its gaps are wherever the catalogue was thin rather than wherever the progression is steep. The
-- worst of them: Wall Push-Up -> Push-ups asks a hero to go from vertical to horizontal in one
-- step, and Inverted Row -> Scapular Pull-Up asks them to be on a bar before anything ever taught
-- them to hang from one.
--
-- Every movement here is INSERTED BETWEEN two existing rungs. That is deliberate and it is the
-- whole reason this migration is separate from `0033`: a movement added *above* a summit changes
-- which exercise ends the route, and a route is named after its summit (`PATH_NAMES`, `db/paths.ts`).
-- Nothing below renames a path, so "Voie de la Traction" is still the pull-up's.
--
-- Each insertion is two statements: the new row carries the old prerequisite, then the rung above
-- is repointed at the new row. Repointing by `enName` rather than by id — ids are seeding order,
-- names are the key every other seed migration uses.
--
-- Art: the seven have no images yet. `getExerciseAsset()` falls back to `placeholder.webp`, so the
-- app is correct meanwhile; prompts are staged in `scripts/generate-exercises.py`.

-- ============================================================
-- PUSH: Wall Push-Up -> [Knee Push-Up] -> Push-ups
-- ============================================================
INSERT INTO `exercises` (
        `enName`, `frName`, `enDescription`, `frDescription`,
        `creator`, `difficulty`, `equipment`, `style`, `pattern`, `secondsPerRep`,
        `imagePath`, `prerequisiteExerciseId`, `createdAt`, `updatedAt`
    )
SELECT 'Knee Push-Up',
    'Pompe sur les genoux',
    'Take a push-up position with the knees on the floor and the body straight from head to knee, then lower the chest to a fist above the ground and press back up.',
    'Prenez une position de pompe genoux au sol, corps aligné de la tête aux genoux, puis descendez la poitrine jusqu''à un poing du sol avant de repousser.',
    'Admin', 'easy', 'none', 'strength', 'push_horizontal', 3,
    'assets/images/exercises/knee_pushup.jpg',
    e.`id`, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000
FROM `exercises` e
WHERE e.`enName` = 'Wall Push-Up';
--> statement-breakpoint
UPDATE `exercises`
SET `prerequisiteExerciseId` = (SELECT `id` FROM `exercises` WHERE `enName` = 'Knee Push-Up')
WHERE `enName` = 'Push-ups';
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT e.id, 'arms' FROM `exercises` e WHERE e.`enName` = 'Knee Push-Up'
UNION ALL
SELECT e.id, 'chest' FROM `exercises` e WHERE e.`enName` = 'Knee Push-Up';
--> statement-breakpoint

-- ============================================================
-- PUSH VERTICAL: Pike Push-Up -> [Wall Handstand] -> Handstand Push-Up
-- ============================================================
-- The step nobody can skip: being inverted and being able to press while inverted are two
-- different skills, and the catalogue only ever tested the second.
INSERT INTO `exercises` (
        `enName`, `frName`, `enDescription`, `frDescription`,
        `creator`, `difficulty`, `equipment`, `style`, `pattern`, `secondsPerRep`,
        `imagePath`, `prerequisiteExerciseId`, `createdAt`, `updatedAt`
    )
SELECT 'Wall Handstand',
    'ATR au mur',
    'Walk your feet up a wall or kick up to a handstand facing it, arms locked and ribs closed, and hold while breathing normally.',
    'Montez les pieds le long d''un mur ou lancez-vous en équilibre face à lui, bras verrouillés et côtes fermées, et tenez en respirant normalement.',
    'Admin', 'medium', 'none', 'calisthenics', 'push_vertical', 1,
    'assets/images/exercises/wall_handstand.jpg',
    e.`id`, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000
FROM `exercises` e
WHERE e.`enName` = 'Pike Push-Up';
--> statement-breakpoint
UPDATE `exercises`
SET `prerequisiteExerciseId` = (SELECT `id` FROM `exercises` WHERE `enName` = 'Wall Handstand')
WHERE `enName` = 'Handstand Push-Up';
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT e.id, 'arms' FROM `exercises` e WHERE e.`enName` = 'Wall Handstand'
UNION ALL
SELECT e.id, 'shoulder' FROM `exercises` e WHERE e.`enName` = 'Wall Handstand';
--> statement-breakpoint

-- ============================================================
-- PULL: Inverted Row -> [Dead Hang] -> Scapular Pull-Up -> [Negative Pull-Up] -> Chin-Up
-- ============================================================
-- Grip and shoulder tolerance to hanging is the actual first rung of every vertical pull, and it
-- was missing entirely — the route went from a horizontal row straight to a scapular pull.
INSERT INTO `exercises` (
        `enName`, `frName`, `enDescription`, `frDescription`,
        `creator`, `difficulty`, `equipment`, `style`, `pattern`, `secondsPerRep`,
        `imagePath`, `prerequisiteExerciseId`, `createdAt`, `updatedAt`
    )
SELECT 'Dead Hang',
    'Suspension à la barre',
    'Hang from a bar with straight arms and a full grip, shoulders relaxed away from the ears, and simply stay there — this builds the grip every pull is limited by.',
    'Suspendez-vous à une barre bras tendus, prise pleine, épaules relâchées loin des oreilles, et tenez simplement — c''est la poigne qui limite toutes vos tractions.',
    'Admin', 'easy', 'pullup_bar', 'calisthenics', 'pull_vertical', 1,
    'assets/images/exercises/dead_hang.jpg',
    e.`id`, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000
FROM `exercises` e
WHERE e.`enName` = 'Inverted Row';
--> statement-breakpoint
UPDATE `exercises`
SET `prerequisiteExerciseId` = (SELECT `id` FROM `exercises` WHERE `enName` = 'Dead Hang')
WHERE `enName` = 'Scapular Pull-Up';
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT e.id, 'arms' FROM `exercises` e WHERE e.`enName` = 'Dead Hang'
UNION ALL
SELECT e.id, 'back' FROM `exercises` e WHERE e.`enName` = 'Dead Hang';
--> statement-breakpoint
-- The eccentric is what actually builds a first pull-up, and the ladder jumped straight from a
-- scapular retraction to a full chin-up.
INSERT INTO `exercises` (
        `enName`, `frName`, `enDescription`, `frDescription`,
        `creator`, `difficulty`, `equipment`, `style`, `pattern`, `secondsPerRep`,
        `imagePath`, `prerequisiteExerciseId`, `createdAt`, `updatedAt`
    )
SELECT 'Negative Pull-Up',
    'Traction négative',
    'Jump or step to the top of a pull-up, chin over the bar, then lower yourself as slowly as you can — aim for five seconds — and step back up for the next rep.',
    'Sautez ou montez sur un appui pour atteindre le haut de la traction, menton au-dessus de la barre, puis descendez aussi lentement que possible — visez cinq secondes — et remontez pour la répétition suivante.',
    'Admin', 'medium', 'pullup_bar', 'calisthenics', 'pull_vertical', 5,
    'assets/images/exercises/negative_pullup.jpg',
    e.`id`, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000
FROM `exercises` e
WHERE e.`enName` = 'Scapular Pull-Up';
--> statement-breakpoint
UPDATE `exercises`
SET `prerequisiteExerciseId` = (SELECT `id` FROM `exercises` WHERE `enName` = 'Negative Pull-Up')
WHERE `enName` = 'Chin-Up';
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT e.id, 'arms' FROM `exercises` e WHERE e.`enName` = 'Negative Pull-Up'
UNION ALL
SELECT e.id, 'back' FROM `exercises` e WHERE e.`enName` = 'Negative Pull-Up';
--> statement-breakpoint

-- ============================================================
-- CORE: Hollow Body Hold -> [Tuck L-Sit] -> L-Sit
-- ============================================================
INSERT INTO `exercises` (
        `enName`, `frName`, `enDescription`, `frDescription`,
        `creator`, `difficulty`, `equipment`, `style`, `pattern`, `secondsPerRep`,
        `imagePath`, `prerequisiteExerciseId`, `createdAt`, `updatedAt`
    )
SELECT 'Tuck L-Sit',
    'L-Sit groupé',
    'Sit with the hands flat beside the hips, press down to lift the seat off the floor and pull both knees up to the chest, holding with the elbows locked.',
    'Assis, mains à plat de chaque côté des hanches, poussez pour décoller le bassin du sol et ramenez les deux genoux contre la poitrine, coudes verrouillés.',
    'Admin', 'medium', 'none', 'calisthenics', 'core', 1,
    'assets/images/exercises/tuck_l_sit.jpg',
    e.`id`, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000
FROM `exercises` e
WHERE e.`enName` = 'Hollow Body Hold';
--> statement-breakpoint
UPDATE `exercises`
SET `prerequisiteExerciseId` = (SELECT `id` FROM `exercises` WHERE `enName` = 'Tuck L-Sit')
WHERE `enName` = 'L-Sit';
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT e.id, 'abs' FROM `exercises` e WHERE e.`enName` = 'Tuck L-Sit';
--> statement-breakpoint

-- ============================================================
-- HINGE: Glute Bridge -> [Single-Leg Glute Bridge] -> Single-Leg Deadlift
-- ============================================================
INSERT INTO `exercises` (
        `enName`, `frName`, `enDescription`, `frDescription`,
        `creator`, `difficulty`, `equipment`, `style`, `pattern`, `secondsPerRep`,
        `imagePath`, `prerequisiteExerciseId`, `createdAt`, `updatedAt`
    )
SELECT 'Single-Leg Glute Bridge',
    'Pont fessier à une jambe',
    'Lie on your back with one foot planted and the other leg extended, then drive through the planted heel to lift the hips without letting them tilt to one side.',
    'Allongé sur le dos, un pied au sol et l''autre jambe tendue, poussez dans le talon en appui pour lever les hanches sans les laisser basculer d''un côté.',
    'Admin', 'medium', 'none', 'strength', 'hinge', 3,
    'assets/images/exercises/single_leg_glute_bridge.jpg',
    e.`id`, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000
FROM `exercises` e
WHERE e.`enName` = 'Glute Bridge';
--> statement-breakpoint
UPDATE `exercises`
SET `prerequisiteExerciseId` = (SELECT `id` FROM `exercises` WHERE `enName` = 'Single-Leg Glute Bridge')
WHERE `enName` = 'Single-Leg Deadlift';
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT e.id, 'legs' FROM `exercises` e WHERE e.`enName` = 'Single-Leg Glute Bridge'
UNION ALL
SELECT e.id, 'back' FROM `exercises` e WHERE e.`enName` = 'Single-Leg Glute Bridge';
--> statement-breakpoint

-- ============================================================
-- SQUAT: Lunge -> [Bulgarian Split Squat] -> Curtsy Squat
-- ============================================================
INSERT INTO `exercises` (
        `enName`, `frName`, `enDescription`, `frDescription`,
        `creator`, `difficulty`, `equipment`, `style`, `pattern`, `secondsPerRep`,
        `imagePath`, `prerequisiteExerciseId`, `createdAt`, `updatedAt`
    )
SELECT 'Bulgarian Split Squat',
    'Fente bulgare',
    'Rest the top of the back foot on a chair behind you, then lower straight down until the front thigh is parallel and press back up, keeping the torso tall.',
    'Posez le dessus du pied arrière sur une chaise derrière vous, puis descendez à la verticale jusqu''à ce que la cuisse avant soit parallèle au sol, et remontez en gardant le buste droit.',
    'Admin', 'medium', 'none', 'strength', 'squat', 3,
    'assets/images/exercises/bulgarian_split_squat.jpg',
    e.`id`, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000
FROM `exercises` e
WHERE e.`enName` = 'Lunge';
--> statement-breakpoint
UPDATE `exercises`
SET `prerequisiteExerciseId` = (SELECT `id` FROM `exercises` WHERE `enName` = 'Bulgarian Split Squat')
WHERE `enName` = 'Curtsy Squat';
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT e.id, 'legs' FROM `exercises` e WHERE e.`enName` = 'Bulgarian Split Squat'
UNION ALL
SELECT e.id, 'abs' FROM `exercises` e WHERE e.`enName` = 'Bulgarian Split Squat';
--> statement-breakpoint

-- ============================================================
-- THE TWO QUESTS THAT HOLD THEM
-- ============================================================
--
-- `content-invariants` refuses an exercise no quest uses, and rightly: a movement reachable only
-- from the catalogue screen is a movement nobody trains. Two new quests rather than seven edits to
-- the existing thirty — an easy movement wedged into a tuned quest breaks the hardest-first order
-- or the duration window, and the fix is always to redesign the quest anyway.

-- The Patient Ascent — skill, 3 rounds, 90s rest, ~21 min. Needs a bar, so its title is on the
-- `EQUIPMENT_QUESTS` list in `content-invariants.test.ts`.
INSERT INTO `quests` (
        `enTitle`, `frTitle`, `enDescription`, `frDescription`,
        `author`, `rounds`, `restSeconds`, `archetype`, `imagePath`, `createdAt`, `updatedAt`
    )
VALUES (
        'The Patient Ascent',
        'L''Ascension Patiente',
        'No one is pulled to the top of the tower in a day. Hang, then hold, then lower slowly — the bar gives nothing away, and everything it does give, it keeps giving.',
        'Personne n''atteint le sommet de la tour en un jour. Suspends-toi, tiens, puis descends lentement — la barre ne cède rien, et tout ce qu''elle cède, elle te le laisse.',
        'Admin', 3, 90, 'skill',
        'assets/images/quests/patient_ascent.jpg',
        strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000
    );
--> statement-breakpoint
INSERT INTO `quest_exercises` (`questId`, `exerciseId`, `sortOrder`, `targetType`, `targetMin`, `targetMax`, `imagesJson`)
SELECT q.`id`, e.`id`, 0, 'reps', 3, 5, '[]'
FROM `quests` q JOIN `exercises` e ON e.`enName` = 'Negative Pull-Up'
WHERE q.`enTitle` = 'The Patient Ascent';
--> statement-breakpoint
INSERT INTO `quest_exercises` (`questId`, `exerciseId`, `sortOrder`, `targetType`, `targetMin`, `targetMax`, `imagesJson`)
SELECT q.`id`, e.`id`, 1, 'time', 20, 30, '[]'
FROM `quests` q JOIN `exercises` e ON e.`enName` = 'Wall Handstand'
WHERE q.`enTitle` = 'The Patient Ascent';
--> statement-breakpoint
INSERT INTO `quest_exercises` (`questId`, `exerciseId`, `sortOrder`, `targetType`, `targetMin`, `targetMax`, `imagesJson`)
SELECT q.`id`, e.`id`, 2, 'time', 15, 25, '[]'
FROM `quests` q JOIN `exercises` e ON e.`enName` = 'Tuck L-Sit'
WHERE q.`enTitle` = 'The Patient Ascent';
--> statement-breakpoint
INSERT INTO `quest_exercises` (`questId`, `exerciseId`, `sortOrder`, `targetType`, `targetMin`, `targetMax`, `imagesJson`)
SELECT q.`id`, e.`id`, 3, 'time', 20, 30, '[]'
FROM `quests` q JOIN `exercises` e ON e.`enName` = 'Dead Hang'
WHERE q.`enTitle` = 'The Patient Ascent';
--> statement-breakpoint

-- The Mason's Footing — strength, 3 rounds, 90s rest, ~16 min, no equipment at all.
INSERT INTO `quests` (
        `enTitle`, `frTitle`, `enDescription`, `frDescription`,
        `author`, `rounds`, `restSeconds`, `archetype`, `imagePath`, `createdAt`, `updatedAt`
    )
VALUES (
        'The Mason''s Footing',
        'L''Assise du Maçon',
        'Every wall the village ever raised stands on a footing someone dug on one knee. One leg at a time, one side at a time — this is the work nobody sees and everything rests on.',
        'Chaque mur que le village a dressé repose sur une assise que quelqu''un a creusée à genoux. Une jambe après l''autre, un côté après l''autre — c''est le travail que personne ne voit et sur lequel tout tient.',
        'Admin', 3, 90, 'strength',
        'assets/images/quests/masons_footing.jpg',
        strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000
    );
--> statement-breakpoint
INSERT INTO `quest_exercises` (`questId`, `exerciseId`, `sortOrder`, `targetType`, `targetMin`, `targetMax`, `imagesJson`)
SELECT q.`id`, e.`id`, 0, 'reps', 6, 10, '[]'
FROM `quests` q JOIN `exercises` e ON e.`enName` = 'Bulgarian Split Squat'
WHERE q.`enTitle` = 'The Mason''s Footing';
--> statement-breakpoint
INSERT INTO `quest_exercises` (`questId`, `exerciseId`, `sortOrder`, `targetType`, `targetMin`, `targetMax`, `imagesJson`)
SELECT q.`id`, e.`id`, 1, 'reps', 8, 12, '[]'
FROM `quests` q JOIN `exercises` e ON e.`enName` = 'Single-Leg Glute Bridge'
WHERE q.`enTitle` = 'The Mason''s Footing';
--> statement-breakpoint
INSERT INTO `quest_exercises` (`questId`, `exerciseId`, `sortOrder`, `targetType`, `targetMin`, `targetMax`, `imagesJson`)
SELECT q.`id`, e.`id`, 2, 'reps', 8, 12, '[]'
FROM `quests` q JOIN `exercises` e ON e.`enName` = 'Knee Push-Up'
WHERE q.`enTitle` = 'The Mason''s Footing';
