-- Mobility becomes a real branch of the catalogue, and the amplitude cues become content.
--
-- Two findings from `docs/raw/bodyweight-app-research.md` drive this migration.
--
-- §11.4: a 10-15 min mobility session is the cleanest overlap the dossier found between good
-- programming and good retention design -- low-fatigue by design, so it fits a day the hero
-- should not train hard, and the flame counts that day. Bati already had both halves of the
-- mechanic (the flame counts rest days since `f037d9e`, the `mobility` archetype since `0019`)
-- and exactly ONE mobility quest to put in it, because the catalogue held exactly TWO mobility
-- movements. Seven more, and the branch exists.
--
-- §11.1: full-range resistance training and stretching produce similar range-of-motion gains
-- (Afonso 2021), so training through full range IS the mobility program. That makes an
-- amplitude cue training content rather than prose, and the descriptions of the movements where
-- range is the progression lever are rewritten to name it. Same gesture as `0023`, which turned
-- these descriptions from RPG flavour into execution cues in the first place.
--
-- One of the seven is a prerequisite rather than a nicety: `Wrist Circles` is the wrist prehab
-- §8.6.4 makes non-negotiable before vertical pushing and hand-balancing. `WARMUP_SEQUENCE`
-- draws its steps from this catalogue by `enName`, so the warm-up could not prepare a wrist
-- until a wrist movement existed here.
--
-- Art: the seven have no images yet. `getExerciseAsset()` falls back to `placeholder.jpg`, so
-- the app is correct meanwhile; prompts are staged in `scripts/generate-exercises.py` and the
-- inventory in `docs/content/missing-image.md` §7.

--> statement-breakpoint
-- Wrist Circles
INSERT INTO `exercises` (
        `enName`,
        `frName`,
        `enDescription`,
        `frDescription`,
        `creator`,
        `difficulty`,
        `equipment`,
        `style`,
        `pattern`,
        `secondsPerRep`,
        `imagePath`,
        `createdAt`,
        `updatedAt`
    )
VALUES (
        'Wrist Circles',
        'Cercles de Poignets',
        'On hands and knees, slowly circle your wrists through their full range, then rock gently forward and back over flat palms. Keep every degree pain-free — this is preparation, not a stretch to force.',
        'À quatre pattes, faites tourner lentement les poignets sur toute leur amplitude, puis basculez doucement d''avant en arrière sur les paumes à plat. Chaque degré doit rester indolore — c''est une préparation, pas un étirement à forcer.',
        'Admin',
        'easy',
        'none',
        'yoga',
        'mobility',
        1,
        'assets/images/exercises/wrist_circles.jpg',
        strftime('%s', 'now') * 1000,
        strftime('%s', 'now') * 1000
    );
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT e.id,
    'arms'
FROM `exercises` e
WHERE e.`enName` = 'Wrist Circles';
--> statement-breakpoint
-- Cat-Cow
INSERT INTO `exercises` (
        `enName`,
        `frName`,
        `enDescription`,
        `frDescription`,
        `creator`,
        `difficulty`,
        `equipment`,
        `style`,
        `pattern`,
        `secondsPerRep`,
        `imagePath`,
        `createdAt`,
        `updatedAt`
    )
VALUES (
        'Cat-Cow',
        'Chat-Vache',
        'On hands and knees, alternate between arching the spine toward the ceiling and letting it sink as the chest opens. Move one vertebra at a time and let the breath set the pace.',
        'À quatre pattes, alternez entre arrondir le dos vers le plafond et le laisser creuser en ouvrant la poitrine. Déroulez vertèbre par vertèbre et laissez la respiration donner le rythme.',
        'Admin',
        'easy',
        'none',
        'yoga',
        'mobility',
        1,
        'assets/images/exercises/cat_cow.jpg',
        strftime('%s', 'now') * 1000,
        strftime('%s', 'now') * 1000
    );
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT e.id,
    'back'
FROM `exercises` e
WHERE e.`enName` = 'Cat-Cow'
UNION ALL
SELECT e.id,
    'abs'
FROM `exercises` e
WHERE e.`enName` = 'Cat-Cow';
--> statement-breakpoint
-- Thread the Needle
INSERT INTO `exercises` (
        `enName`,
        `frName`,
        `enDescription`,
        `frDescription`,
        `creator`,
        `difficulty`,
        `equipment`,
        `style`,
        `pattern`,
        `secondsPerRep`,
        `imagePath`,
        `createdAt`,
        `updatedAt`
    )
VALUES (
        'Thread the Needle',
        'Passage du Bras',
        'From hands and knees, slide one arm under the other and rest the shoulder on the floor, rotating through the upper back. Keep the hips stacked over the knees so the rotation comes from the ribs, not the pelvis.',
        'À quatre pattes, glissez un bras sous l''autre et posez l''épaule au sol en ouvrant le haut du dos. Gardez les hanches au-dessus des genoux pour que la rotation vienne des côtes et non du bassin.',
        'Admin',
        'easy',
        'none',
        'yoga',
        'mobility',
        1,
        'assets/images/exercises/thread_the_needle.jpg',
        strftime('%s', 'now') * 1000,
        strftime('%s', 'now') * 1000
    );
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT e.id,
    'back'
FROM `exercises` e
WHERE e.`enName` = 'Thread the Needle'
UNION ALL
SELECT e.id,
    'shoulder'
FROM `exercises` e
WHERE e.`enName` = 'Thread the Needle';
--> statement-breakpoint
-- Standing Forward Fold
INSERT INTO `exercises` (
        `enName`,
        `frName`,
        `enDescription`,
        `frDescription`,
        `creator`,
        `difficulty`,
        `equipment`,
        `style`,
        `pattern`,
        `secondsPerRep`,
        `imagePath`,
        `createdAt`,
        `updatedAt`
    )
VALUES (
        'Standing Forward Fold',
        'Flexion Avant Debout',
        'Hinge from the hips and let the torso hang, knees softly bent. Let gravity do the work down the back of the legs — never bounce.',
        'Basculez depuis les hanches et laissez le buste pendre, genoux légèrement fléchis. Laissez la gravité travailler l''arrière des jambes — ne jamais faire de à-coups.',
        'Admin',
        'easy',
        'none',
        'yoga',
        'mobility',
        1,
        'assets/images/exercises/standing_forward_fold.jpg',
        strftime('%s', 'now') * 1000,
        strftime('%s', 'now') * 1000
    );
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT e.id,
    'legs'
FROM `exercises` e
WHERE e.`enName` = 'Standing Forward Fold'
UNION ALL
SELECT e.id,
    'back'
FROM `exercises` e
WHERE e.`enName` = 'Standing Forward Fold';
--> statement-breakpoint
-- Downward Dog
INSERT INTO `exercises` (
        `enName`,
        `frName`,
        `enDescription`,
        `frDescription`,
        `creator`,
        `difficulty`,
        `equipment`,
        `style`,
        `pattern`,
        `secondsPerRep`,
        `imagePath`,
        `createdAt`,
        `updatedAt`
    )
VALUES (
        'Downward Dog',
        'Chien Tête en Bas',
        'From hands and feet, push the hips high and the heels down, arms straight and ears between the biceps. Pedal the feet to reach the calves and hamstrings in turn.',
        'En appui sur les mains et les pieds, poussez les hanches haut et les talons vers le sol, bras tendus et oreilles entre les biceps. Pédalez avec les pieds pour atteindre tour à tour mollets et ischio-jambiers.',
        'Admin',
        'medium',
        'none',
        'yoga',
        'mobility',
        1,
        'assets/images/exercises/downward_dog.jpg',
        strftime('%s', 'now') * 1000,
        strftime('%s', 'now') * 1000
    );
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT e.id,
    'shoulder'
FROM `exercises` e
WHERE e.`enName` = 'Downward Dog'
UNION ALL
SELECT e.id,
    'legs'
FROM `exercises` e
WHERE e.`enName` = 'Downward Dog'
UNION ALL
SELECT e.id,
    'back'
FROM `exercises` e
WHERE e.`enName` = 'Downward Dog';
--> statement-breakpoint
-- Pigeon Pose
INSERT INTO `exercises` (
        `enName`,
        `frName`,
        `enDescription`,
        `frDescription`,
        `creator`,
        `difficulty`,
        `equipment`,
        `style`,
        `pattern`,
        `secondsPerRep`,
        `imagePath`,
        `createdAt`,
        `updatedAt`
    )
VALUES (
        'Pigeon Pose',
        'Posture du Pigeon',
        'Bring one shin forward across the mat and extend the other leg behind, then fold over the front leg. The hip opens as the breath slows; back off the moment the knee complains.',
        'Amenez un tibia vers l''avant en travers du tapis et tendez l''autre jambe derrière, puis penchez-vous sur la jambe avant. La hanche s''ouvre à mesure que le souffle ralentit ; relâchez dès que le genou proteste.',
        'Admin',
        'medium',
        'none',
        'yoga',
        'mobility',
        1,
        'assets/images/exercises/pigeon_pose.jpg',
        strftime('%s', 'now') * 1000,
        strftime('%s', 'now') * 1000
    );
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT e.id,
    'legs'
FROM `exercises` e
WHERE e.`enName` = 'Pigeon Pose';
--> statement-breakpoint
-- World's Greatest Stretch
INSERT INTO `exercises` (
        `enName`,
        `frName`,
        `enDescription`,
        `frDescription`,
        `creator`,
        `difficulty`,
        `equipment`,
        `style`,
        `pattern`,
        `secondsPerRep`,
        `imagePath`,
        `createdAt`,
        `updatedAt`
    )
VALUES (
        'World''s Greatest Stretch',
        'Le Grand Étirement',
        'Step into a deep lunge, plant the opposite hand, then drive the inside elbow toward the floor and rotate the other arm to the ceiling. Hip flexor, adductor and upper back in one movement.',
        'Entrez dans une fente profonde, posez la main opposée, puis amenez le coude intérieur vers le sol et faites tourner l''autre bras vers le plafond. Fléchisseur de hanche, adducteur et haut du dos en un seul mouvement.',
        'Admin',
        'medium',
        'none',
        'yoga',
        'mobility',
        2,
        'assets/images/exercises/worlds_greatest_stretch.jpg',
        strftime('%s', 'now') * 1000,
        strftime('%s', 'now') * 1000
    );
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT e.id,
    'legs'
FROM `exercises` e
WHERE e.`enName` = 'World''s Greatest Stretch'
UNION ALL
SELECT e.id,
    'back'
FROM `exercises` e
WHERE e.`enName` = 'World''s Greatest Stretch'
UNION ALL
SELECT e.id,
    'shoulder'
FROM `exercises` e
WHERE e.`enName` = 'World''s Greatest Stretch';
--> statement-breakpoint
-- The Dawn Ritual — mobility, 2x30s
INSERT INTO `quests` (
        `enTitle`,
        `frTitle`,
        `enDescription`,
        `frDescription`,
        `author`,
        `rounds`,
        `restSeconds`,
        `archetype`,
        `imagePath`,
        `createdAt`,
        `updatedAt`
    )
VALUES (
        'The Dawn Ritual',
        'Le Rituel de l''Aube',
        'Before the keep wakes, the old rite: open the hips, unlock the spine, remember the body is yours. The day does not begin until this is done.',
        'Avant que le donjon ne s''éveille, le vieux rite : ouvrir les hanches, débloquer la colonne, se rappeler que ce corps est le vôtre. La journée ne commence pas avant.',
        'Admin',
        2,
        30,
        'mobility',
        'assets/images/quests/dawn_ritual.jpg',
        strftime('%s', 'now') * 1000,
        strftime('%s', 'now') * 1000
    );
--> statement-breakpoint
INSERT INTO `quest_exercises` (
        `questId`,
        `exerciseId`,
        `sortOrder`,
        `targetType`,
        `targetMin`,
        `targetMax`,
        `imagesJson`
    )
SELECT q.`id`,
    e.`id`,
    0,
    'time',
    40,
    50,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'World''s Greatest Stretch'
WHERE q.`enTitle` = 'The Dawn Ritual';
--> statement-breakpoint
INSERT INTO `quest_exercises` (
        `questId`,
        `exerciseId`,
        `sortOrder`,
        `targetType`,
        `targetMin`,
        `targetMax`,
        `imagesJson`
    )
SELECT q.`id`,
    e.`id`,
    1,
    'time',
    40,
    50,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Downward Dog'
WHERE q.`enTitle` = 'The Dawn Ritual';
--> statement-breakpoint
INSERT INTO `quest_exercises` (
        `questId`,
        `exerciseId`,
        `sortOrder`,
        `targetType`,
        `targetMin`,
        `targetMax`,
        `imagesJson`
    )
SELECT q.`id`,
    e.`id`,
    2,
    'time',
    40,
    50,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Cat-Cow'
WHERE q.`enTitle` = 'The Dawn Ritual';
--> statement-breakpoint
INSERT INTO `quest_exercises` (
        `questId`,
        `exerciseId`,
        `sortOrder`,
        `targetType`,
        `targetMin`,
        `targetMax`,
        `imagesJson`
    )
SELECT q.`id`,
    e.`id`,
    3,
    'time',
    40,
    50,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Thread the Needle'
WHERE q.`enTitle` = 'The Dawn Ritual';
--> statement-breakpoint
INSERT INTO `quest_exercises` (
        `questId`,
        `exerciseId`,
        `sortOrder`,
        `targetType`,
        `targetMin`,
        `targetMax`,
        `imagesJson`
    )
SELECT q.`id`,
    e.`id`,
    4,
    'time',
    40,
    50,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Cobra Stretch'
WHERE q.`enTitle` = 'The Dawn Ritual';
--> statement-breakpoint
-- The Hearthside Unbinding — mobility, 2x30s
INSERT INTO `quests` (
        `enTitle`,
        `frTitle`,
        `enDescription`,
        `frDescription`,
        `author`,
        `rounds`,
        `restSeconds`,
        `archetype`,
        `imagePath`,
        `createdAt`,
        `updatedAt`
    )
VALUES (
        'The Hearthside Unbinding',
        'Le Dénouement près de l''Âtre',
        'The march is over, the fire is lit. Undo what the road tied in knots — hips first, they carried you furthest.',
        'La marche est finie, le feu est allumé. Défaites ce que la route a noué — les hanches d''abord, ce sont elles qui vous ont porté le plus loin.',
        'Admin',
        2,
        30,
        'mobility',
        'assets/images/quests/hearthside_unbinding.jpg',
        strftime('%s', 'now') * 1000,
        strftime('%s', 'now') * 1000
    );
--> statement-breakpoint
INSERT INTO `quest_exercises` (
        `questId`,
        `exerciseId`,
        `sortOrder`,
        `targetType`,
        `targetMin`,
        `targetMax`,
        `imagesJson`
    )
SELECT q.`id`,
    e.`id`,
    0,
    'time',
    45,
    60,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Pigeon Pose'
WHERE q.`enTitle` = 'The Hearthside Unbinding';
--> statement-breakpoint
INSERT INTO `quest_exercises` (
        `questId`,
        `exerciseId`,
        `sortOrder`,
        `targetType`,
        `targetMin`,
        `targetMax`,
        `imagesJson`
    )
SELECT q.`id`,
    e.`id`,
    1,
    'time',
    40,
    50,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Warrior Pose'
WHERE q.`enTitle` = 'The Hearthside Unbinding';
--> statement-breakpoint
INSERT INTO `quest_exercises` (
        `questId`,
        `exerciseId`,
        `sortOrder`,
        `targetType`,
        `targetMin`,
        `targetMax`,
        `imagesJson`
    )
SELECT q.`id`,
    e.`id`,
    2,
    'time',
    40,
    50,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Standing Forward Fold'
WHERE q.`enTitle` = 'The Hearthside Unbinding';
--> statement-breakpoint
INSERT INTO `quest_exercises` (
        `questId`,
        `exerciseId`,
        `sortOrder`,
        `targetType`,
        `targetMin`,
        `targetMax`,
        `imagesJson`
    )
SELECT q.`id`,
    e.`id`,
    3,
    'time',
    30,
    40,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Cat-Cow'
WHERE q.`enTitle` = 'The Hearthside Unbinding';
--> statement-breakpoint
-- The Handler's Vigil — mobility, 2x30s
INSERT INTO `quests` (
        `enTitle`,
        `frTitle`,
        `enDescription`,
        `frDescription`,
        `author`,
        `rounds`,
        `restSeconds`,
        `archetype`,
        `imagePath`,
        `createdAt`,
        `updatedAt`
    )
VALUES (
        'The Handler''s Vigil',
        'La Veille du Porteur',
        'Every hand-balancer learns it the hard way: the wrists give out long before the shoulders do. Tend them the night before, not the morning after.',
        'Tout équilibriste l''apprend à ses dépens : les poignets lâchent bien avant les épaules. Occupez-vous-en la veille, pas le lendemain.',
        'Admin',
        2,
        30,
        'mobility',
        'assets/images/quests/handlers_vigil.jpg',
        strftime('%s', 'now') * 1000,
        strftime('%s', 'now') * 1000
    );
--> statement-breakpoint
INSERT INTO `quest_exercises` (
        `questId`,
        `exerciseId`,
        `sortOrder`,
        `targetType`,
        `targetMin`,
        `targetMax`,
        `imagesJson`
    )
SELECT q.`id`,
    e.`id`,
    0,
    'time',
    40,
    50,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Downward Dog'
WHERE q.`enTitle` = 'The Handler''s Vigil';
--> statement-breakpoint
INSERT INTO `quest_exercises` (
        `questId`,
        `exerciseId`,
        `sortOrder`,
        `targetType`,
        `targetMin`,
        `targetMax`,
        `imagesJson`
    )
SELECT q.`id`,
    e.`id`,
    1,
    'time',
    40,
    50,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Thread the Needle'
WHERE q.`enTitle` = 'The Handler''s Vigil';
--> statement-breakpoint
INSERT INTO `quest_exercises` (
        `questId`,
        `exerciseId`,
        `sortOrder`,
        `targetType`,
        `targetMin`,
        `targetMax`,
        `imagesJson`
    )
SELECT q.`id`,
    e.`id`,
    2,
    'time',
    40,
    50,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Wrist Circles'
WHERE q.`enTitle` = 'The Handler''s Vigil';
--> statement-breakpoint
INSERT INTO `quest_exercises` (
        `questId`,
        `exerciseId`,
        `sortOrder`,
        `targetType`,
        `targetMin`,
        `targetMax`,
        `imagesJson`
    )
SELECT q.`id`,
    e.`id`,
    3,
    'time',
    30,
    40,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Cobra Stretch'
WHERE q.`enTitle` = 'The Handler''s Vigil';
--> statement-breakpoint
-- §11.1: full-range resistance training and stretching produce similar ROM gains, so range is
-- not a stylistic detail of a cue -- it is the training. These five are the movements where
-- amplitude is the progression lever, and where a shallow rep is the most common way to make a
-- session easier without noticing. `0023` turned these descriptions from RPG flavour into
-- execution cues; this names the range they were still leaving to the hero's judgement.
--> statement-breakpoint
UPDATE `exercises`
SET `enDescription` = 'Stand with feet shoulder-width apart and lower as if sitting into a chair. Go until the hip crease drops below the knee — depth is the progression, not speed. Drive back up through the whole foot.',
    `frDescription` = 'Tenez-vous debout, pieds écartés à largeur d''épaules, et descendez comme pour vous asseoir. Descendez jusqu''à ce que le pli de la hanche passe sous le genou — c''est la profondeur qui progresse, pas la vitesse. Remontez en poussant dans tout le pied.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Squat';
--> statement-breakpoint
UPDATE `exercises`
SET `enDescription` = 'Start in a plank and lower until the chest touches the floor, elbows tracking back rather than flaring. Push all the way to straight arms at the top: half a rep trains half the range.',
    `frDescription` = 'Commencez en planche et descendez jusqu''à ce que la poitrine touche le sol, coudes vers l''arrière plutôt qu''écartés. Remontez bras complètement tendus : une demi-répétition n''entraîne que la moitié de l''amplitude.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Push-ups';
--> statement-breakpoint
UPDATE `exercises`
SET `enDescription` = 'Step forward and lower until the back knee grazes the floor and both knees are near 90 degrees, front knee over the ankle. Take the full depth — a short step trains a short range.',
    `frDescription` = 'Avancez d''un pas et descendez jusqu''à ce que le genou arrière frôle le sol, les deux genoux proches de 90 degrés, genou avant à l''aplomb de la cheville. Prenez toute la profondeur — un pas court n''entraîne qu''une amplitude courte.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Lunge';
--> statement-breakpoint
UPDATE `exercises`
SET `enDescription` = 'Hang from a bar with the arms completely straight and the shoulders relaxed, then pull until the chin clears it. Return to the full hang every rep: the dead hang is part of the movement, not a rest.',
    `frDescription` = 'Suspendez-vous à une barre bras complètement tendus et épaules relâchées, puis tirez jusqu''à ce que le menton dépasse la barre. Revenez en suspension complète à chaque répétition : la suspension fait partie du mouvement, pas de la pause.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Pull-ups';
--> statement-breakpoint
UPDATE `exercises`
SET `enDescription` = 'Support yourself on two parallel bars or a sturdy edge, lower until the shoulders drop to elbow height, then press back to fully locked arms. Stop short of pain in the shoulder, never short of the lockout.',
    `frDescription` = 'En appui sur deux barres parallèles ou un rebord stable, descendez jusqu''à ce que les épaules arrivent à hauteur des coudes, puis remontez bras complètement verrouillés. Arrêtez-vous avant la douleur à l''épaule, jamais avant le verrouillage.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Dip';
