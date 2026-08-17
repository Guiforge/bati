-- Six summits: the skills the ladder was climbing towards and never named.
--
-- `0032` inserted rungs between movements that already existed, which is why it changed no path
-- names. This one does the opposite and does it deliberately: every movement below is added
-- *above* an existing summit, so it becomes the exercise that ends the route — and a route is
-- named after its summit (`PATH_NAMES`, `db/paths.ts`). Five of the twelve named paths therefore
-- move to a new key in the same commit, and two of the names are retired rather than moved:
--
--   Pull-ups           -> Muscle-Up          keeps "Voie de la Traction" — same route, new top
--   Hanging Leg Raise  -> Toes to Bar        keeps "Voie de la Suspension", likewise
--   Diamond Push-Up    -> Archer Push-Up     "Voie du Diamant" retired for "Voie de l'Archer"
--   Curtsy Squat       -> Pistol Squat       "Voie de la Révérence" retired for "Voie du Pistolet"
--   L-Sit              -> Tuck Planche       "Voie de l'Équerre" retired for "Voie de la Planche"
--   Hollow Body Hold   -> Dragon Flag        a new branch, so nothing is displaced
--
-- « Voie de la Planche » is the payoff of `0031`: the floor hold became « Gainage ventral », which
-- is what frees the word for the skill it actually names.
--
-- Nothing here gates anything. The ladder has always been a hint — no quest is hidden and a hero
-- who wants to try a muscle-up tonight can. What a summit changes is what the route is *called*.
--
-- Art: `getExerciseAsset()` falls back to `placeholder.webp`; prompts are staged in
-- `scripts/generate-exercises.py`, inventory in `docs/content/missing-image.md` §8.

-- ============================================================
-- PULL: Pull-ups -> Muscle-Up
-- ============================================================
INSERT INTO `exercises` (
        `enName`, `frName`, `enDescription`, `frDescription`,
        `creator`, `difficulty`, `equipment`, `style`, `pattern`, `secondsPerRep`,
        `imagePath`, `prerequisiteExerciseId`, `createdAt`, `updatedAt`
    )
SELECT 'Muscle-Up',
    'Muscle-up',
    'Pull explosively until the chest clears the bar, roll the shoulders over it and press out to straight arms above — one continuous movement from hang to support.',
    'Tirez explosivement jusqu''à dégager la poitrine au-dessus de la barre, basculez les épaules par-dessus et repoussez bras tendus au-dessus d''elle — un seul mouvement continu de la suspension à l''appui.',
    'Admin', 'hard', 'pullup_bar', 'calisthenics', 'pull_vertical', 5,
    'assets/images/exercises/muscle_up.jpg',
    e.`id`, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000
FROM `exercises` e
WHERE e.`enName` = 'Pull-ups';
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT e.id, 'arms' FROM `exercises` e WHERE e.`enName` = 'Muscle-Up'
UNION ALL
SELECT e.id, 'back' FROM `exercises` e WHERE e.`enName` = 'Muscle-Up'
UNION ALL
SELECT e.id, 'chest' FROM `exercises` e WHERE e.`enName` = 'Muscle-Up';
--> statement-breakpoint

-- ============================================================
-- CORE HANG: Hanging Leg Raise -> Toes to Bar
-- ============================================================
INSERT INTO `exercises` (
        `enName`, `frName`, `enDescription`, `frDescription`,
        `creator`, `difficulty`, `equipment`, `style`, `pattern`, `secondsPerRep`,
        `imagePath`, `prerequisiteExerciseId`, `createdAt`, `updatedAt`
    )
SELECT 'Toes to Bar',
    'Pointes à la barre',
    'Hang from a bar and raise both legs straight overhead until the toes touch the bar between your hands, then lower them under control without swinging.',
    'Suspendez-vous à une barre et montez les jambes tendues jusqu''à toucher la barre entre les mains avec les pointes de pieds, puis redescendez avec contrôle, sans balancer.',
    'Admin', 'hard', 'pullup_bar', 'calisthenics', 'core', 3,
    'assets/images/exercises/toes_to_bar.jpg',
    e.`id`, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000
FROM `exercises` e
WHERE e.`enName` = 'Hanging Leg Raise';
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT e.id, 'abs' FROM `exercises` e WHERE e.`enName` = 'Toes to Bar'
UNION ALL
SELECT e.id, 'back' FROM `exercises` e WHERE e.`enName` = 'Toes to Bar';
--> statement-breakpoint

-- ============================================================
-- PUSH: Diamond Push-Up -> Archer Push-Up
-- ============================================================
INSERT INTO `exercises` (
        `enName`, `frName`, `enDescription`, `frDescription`,
        `creator`, `difficulty`, `equipment`, `style`, `pattern`, `secondsPerRep`,
        `imagePath`, `prerequisiteExerciseId`, `createdAt`, `updatedAt`
    )
SELECT 'Archer Push-Up',
    'Pompe archer',
    'Set the hands wider than a push-up and lower towards one hand while the opposite arm stays straight, then press back up and alternate sides — most of the load sits on the bending arm.',
    'Placez les mains plus larges qu''en pompe et descendez vers une main pendant que le bras opposé reste tendu, puis repoussez et changez de côté — l''essentiel de la charge est sur le bras qui plie.',
    'Admin', 'hard', 'none', 'calisthenics', 'push_horizontal', 3,
    'assets/images/exercises/archer_pushup.jpg',
    e.`id`, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000
FROM `exercises` e
WHERE e.`enName` = 'Diamond Push-Up';
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT e.id, 'arms' FROM `exercises` e WHERE e.`enName` = 'Archer Push-Up'
UNION ALL
SELECT e.id, 'chest' FROM `exercises` e WHERE e.`enName` = 'Archer Push-Up'
UNION ALL
SELECT e.id, 'shoulder' FROM `exercises` e WHERE e.`enName` = 'Archer Push-Up';
--> statement-breakpoint

-- ============================================================
-- LEGS: Curtsy Squat -> Pistol Squat
-- ============================================================
INSERT INTO `exercises` (
        `enName`, `frName`, `enDescription`, `frDescription`,
        `creator`, `difficulty`, `equipment`, `style`, `pattern`, `secondsPerRep`,
        `imagePath`, `prerequisiteExerciseId`, `createdAt`, `updatedAt`
    )
SELECT 'Pistol Squat',
    'Squat pistolet',
    'Standing on one leg with the other extended forward, lower all the way to the bottom of a squat and stand back up without the free heel ever touching the floor.',
    'En appui sur une jambe, l''autre tendue devant vous, descendez jusqu''au bas du squat et remontez sans que le talon libre ne touche jamais le sol.',
    'Admin', 'hard', 'none', 'calisthenics', 'squat', 4,
    'assets/images/exercises/pistol_squat.jpg',
    e.`id`, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000
FROM `exercises` e
WHERE e.`enName` = 'Curtsy Squat';
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT e.id, 'legs' FROM `exercises` e WHERE e.`enName` = 'Pistol Squat'
UNION ALL
SELECT e.id, 'abs' FROM `exercises` e WHERE e.`enName` = 'Pistol Squat';
--> statement-breakpoint

-- ============================================================
-- CORE LEVER: Hollow Body Hold -> Dragon Flag
-- ============================================================
-- A branch rather than a replacement: the hollow body already leads to the Tuck L-Sit
-- (compression), and this is the other thing it leads to (the lever). Branching upward is
-- exactly what the ladder allows, and it is why a route is identified by its top and not its root.
INSERT INTO `exercises` (
        `enName`, `frName`, `enDescription`, `frDescription`,
        `creator`, `difficulty`, `equipment`, `style`, `pattern`, `secondsPerRep`,
        `imagePath`, `prerequisiteExerciseId`, `createdAt`, `updatedAt`
    )
SELECT 'Dragon Flag',
    'Dragon flag',
    'Lying on a bench or the floor, grip something solid behind your head and lift the whole body onto the shoulders in one rigid line, then lower it slowly without letting the hips fold.',
    'Allongé sur un banc ou au sol, agrippez un point fixe derrière la tête et soulevez tout le corps en appui sur les épaules, d''une seule ligne rigide, puis redescendez lentement sans laisser les hanches se plier.',
    'Admin', 'hard', 'none', 'calisthenics', 'core', 4,
    'assets/images/exercises/dragon_flag.jpg',
    e.`id`, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000
FROM `exercises` e
WHERE e.`enName` = 'Hollow Body Hold';
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT e.id, 'abs' FROM `exercises` e WHERE e.`enName` = 'Dragon Flag'
UNION ALL
SELECT e.id, 'back' FROM `exercises` e WHERE e.`enName` = 'Dragon Flag';
--> statement-breakpoint

-- ============================================================
-- STRAIGHT ARM: L-Sit -> Tuck Planche
-- ============================================================
-- Filed as `push_horizontal`, not `core`: the planche is a straight-arm push against gravity, and
-- the pattern is what the quest balance rules read. Its prerequisite is still the L-sit, because
-- what the two share — locked elbows carrying the whole body — is the quality that has to exist
-- before either is possible.
INSERT INTO `exercises` (
        `enName`, `frName`, `enDescription`, `frDescription`,
        `creator`, `difficulty`, `equipment`, `style`, `pattern`, `secondsPerRep`,
        `imagePath`, `prerequisiteExerciseId`, `createdAt`, `updatedAt`
    )
SELECT 'Tuck Planche',
    'Planche groupée',
    'From hands flat on the floor, lean the shoulders well forward of the wrists with the elbows locked and lift both knees to the chest until the feet leave the ground entirely.',
    'Mains à plat au sol, portez les épaules bien en avant des poignets, coudes verrouillés, et montez les genoux contre la poitrine jusqu''à ce que les pieds quittent complètement le sol.',
    'Admin', 'hard', 'none', 'calisthenics', 'push_horizontal', 1,
    'assets/images/exercises/tuck_planche.jpg',
    e.`id`, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000
FROM `exercises` e
WHERE e.`enName` = 'L-Sit';
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT e.id, 'shoulder' FROM `exercises` e WHERE e.`enName` = 'Tuck Planche'
UNION ALL
SELECT e.id, 'abs' FROM `exercises` e WHERE e.`enName` = 'Tuck Planche'
UNION ALL
SELECT e.id, 'arms' FROM `exercises` e WHERE e.`enName` = 'Tuck Planche';
--> statement-breakpoint

-- ============================================================
-- THE TWO QUESTS THAT HOLD THEM
-- ============================================================
--
-- Both `skill`, both three hard movements at 120s rest: that is what a skill session is, and it is
-- the archetype whose rest range goes that high. Splitting by equipment rather than by body part —
-- one needs a bar and one needs nothing — is what keeps the second reachable from a living room.

-- The Summit Trial — skill, bar required, 3 rounds, 120s rest, ~18 min.
INSERT INTO `quests` (
        `enTitle`, `frTitle`, `enDescription`, `frDescription`,
        `author`, `rounds`, `restSeconds`, `archetype`, `imagePath`, `createdAt`, `updatedAt`
    )
VALUES (
        'The Summit Trial',
        'L''Épreuve du Sommet',
        'Every route in the keep ends at a bar somewhere above your head. This is the day you find out which of them you have actually climbed.',
        'Toutes les voies du donjon finissent sur une barre quelque part au-dessus de ta tête. C''est le jour où tu découvres lesquelles tu as vraiment gravies.',
        'Admin', 3, 120, 'skill',
        'assets/images/quests/summit_trial.jpg',
        strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000
    );
--> statement-breakpoint
INSERT INTO `quest_exercises` (`questId`, `exerciseId`, `sortOrder`, `targetType`, `targetMin`, `targetMax`, `imagesJson`)
SELECT q.`id`, e.`id`, 0, 'reps', 1, 3, '[]'
FROM `quests` q JOIN `exercises` e ON e.`enName` = 'Muscle-Up'
WHERE q.`enTitle` = 'The Summit Trial';
--> statement-breakpoint
INSERT INTO `quest_exercises` (`questId`, `exerciseId`, `sortOrder`, `targetType`, `targetMin`, `targetMax`, `imagesJson`)
SELECT q.`id`, e.`id`, 1, 'reps', 5, 9, '[]'
FROM `quests` q JOIN `exercises` e ON e.`enName` = 'Toes to Bar'
WHERE q.`enTitle` = 'The Summit Trial';
--> statement-breakpoint
INSERT INTO `quest_exercises` (`questId`, `exerciseId`, `sortOrder`, `targetType`, `targetMin`, `targetMax`, `imagesJson`)
SELECT q.`id`, e.`id`, 2, 'reps', 4, 8, '[]'
FROM `quests` q JOIN `exercises` e ON e.`enName` = 'Archer Push-Up'
WHERE q.`enTitle` = 'The Summit Trial';
--> statement-breakpoint

-- The Straight-Arm Vigil — skill, no equipment at all, 3 rounds, 120s rest, ~18 min.
INSERT INTO `quests` (
        `enTitle`, `frTitle`, `enDescription`, `frDescription`,
        `author`, `rounds`, `restSeconds`, `archetype`, `imagePath`, `createdAt`, `updatedAt`
    )
VALUES (
        'The Straight-Arm Vigil',
        'La Veille des Bras Tendus',
        'No bar, no wall, nothing to hang from. Only the floor, locked elbows, and however long you can refuse to fold.',
        'Pas de barre, pas de mur, rien à quoi se suspendre. Seulement le sol, les coudes verrouillés, et le temps que tu tiendras avant de plier.',
        'Admin', 3, 120, 'skill',
        'assets/images/quests/straight_arm_vigil.jpg',
        strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000
    );
--> statement-breakpoint
INSERT INTO `quest_exercises` (`questId`, `exerciseId`, `sortOrder`, `targetType`, `targetMin`, `targetMax`, `imagesJson`)
SELECT q.`id`, e.`id`, 0, 'time', 10, 20, '[]'
FROM `quests` q JOIN `exercises` e ON e.`enName` = 'Tuck Planche'
WHERE q.`enTitle` = 'The Straight-Arm Vigil';
--> statement-breakpoint
INSERT INTO `quest_exercises` (`questId`, `exerciseId`, `sortOrder`, `targetType`, `targetMin`, `targetMax`, `imagesJson`)
SELECT q.`id`, e.`id`, 1, 'reps', 3, 6, '[]'
FROM `quests` q JOIN `exercises` e ON e.`enName` = 'Dragon Flag'
WHERE q.`enTitle` = 'The Straight-Arm Vigil';
--> statement-breakpoint
INSERT INTO `quest_exercises` (`questId`, `exerciseId`, `sortOrder`, `targetType`, `targetMin`, `targetMax`, `imagesJson`)
SELECT q.`id`, e.`id`, 2, 'reps', 3, 6, '[]'
FROM `quests` q JOIN `exercises` e ON e.`enName` = 'Pistol Squat'
WHERE q.`enTitle` = 'The Straight-Arm Vigil';
