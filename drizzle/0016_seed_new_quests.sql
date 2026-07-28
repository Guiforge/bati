-- Eight quests covering every hole the audit left: absolute beginner, equipment-free pull,
-- hinge, bar pull, skill, explosive legs, anti-rotation core. They also consume the last of
-- the 20 exercises seeded by 0010 that no quest had ever used.
--
-- Covers do not exist yet: `imagePath` is left NULL, so these resolve to the placeholder
-- until the art pass sets them (§12 of the roadmap).
--
-- Three compositions differ from the roadmap draft, each caught by the invariants before this
-- file was written:
--   * The Cellar Hauler: Dead Bug is inserted between the two rows — Table Row and Towel Door
--     Row carry identical muscle sets, which the consecutive-muscle rule forbids.
--   * The Ploughman's Vow: reordered hardest-first, and it is the one quest on the
--     single-pattern allow-list (every leg movement tags `calf`; the 12-set cap guards it).
--   * The Crow's Ascent: the hanging leg raise moves to second so difficulty is non-increasing.
--> statement-breakpoint
-- The Squire's Awakening — circuit, 2x45s, ~8:25
INSERT INTO `quests` (
        `enTitle`,
        `frTitle`,
        `enDescription`,
        `frDescription`,
        `author`,
        `rounds`,
        `restSeconds`,
        `createdAt`,
        `updatedAt`
    )
VALUES (
        'The Squire''s Awakening',
        'L''Éveil de l''Écuyer',
        'You are not a hero yet. You are the one who carries the shield — and today, that is enough.',
        'Vous n''êtes pas encore un héros. Vous êtes celui qui porte le bouclier, et aujourd''hui, cela suffit.',
        'Admin',
        2,
        45,
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
    'reps',
    8,
    12,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Wall Push-Up'
WHERE q.`enTitle` = 'The Squire''s Awakening';
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
    'reps',
    12,
    15,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Glute Bridge'
WHERE q.`enTitle` = 'The Squire''s Awakening';
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
    'reps',
    10,
    12,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Dead Bug'
WHERE q.`enTitle` = 'The Squire''s Awakening';
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
    20,
    30,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Superman'
WHERE q.`enTitle` = 'The Squire''s Awakening';
--> statement-breakpoint
-- The Bear's Road — circuit, 3x45s, ~14:39
INSERT INTO `quests` (
        `enTitle`,
        `frTitle`,
        `enDescription`,
        `frDescription`,
        `author`,
        `rounds`,
        `restSeconds`,
        `createdAt`,
        `updatedAt`
    )
VALUES (
        'The Bear''s Road',
        'La Route de l''Ours',
        'The keep is half a day''s march through the pines. Walk it on two legs or four, but arrive before the light fails.',
        'Le donjon est à une demi-journée de marche à travers les pins. Faites-la sur deux jambes ou sur quatre, mais arrivez avant que la lumière ne tombe.',
        'Admin',
        3,
        45,
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
    30,
    40,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Bear Crawl'
WHERE q.`enTitle` = 'The Bear''s Road';
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
    'reps',
    12,
    15,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Goblin Squat'
WHERE q.`enTitle` = 'The Bear''s Road';
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
    'reps',
    10,
    15,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Wall Push-Up'
WHERE q.`enTitle` = 'The Bear''s Road';
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
    20,
    30,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Superman'
WHERE q.`enTitle` = 'The Bear''s Road';
--> statement-breakpoint
-- The Cellar Hauler — hypertrophy, 3x60s, ~16:48
INSERT INTO `quests` (
        `enTitle`,
        `frTitle`,
        `enDescription`,
        `frDescription`,
        `author`,
        `rounds`,
        `restSeconds`,
        `createdAt`,
        `updatedAt`
    )
VALUES (
        'The Cellar Hauler',
        'Le Tirage du Cellier',
        'The cellar hatch is jammed and the storm is already on the ridge. Pull, or sleep in the rain.',
        'La trappe du cellier est coincée et l''orage est déjà sur la crête. Tirez, ou dormez sous la pluie.',
        'Admin',
        3,
        60,
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
    'reps',
    8,
    12,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Table Row'
WHERE q.`enTitle` = 'The Cellar Hauler';
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
    'reps',
    10,
    12,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Dead Bug'
WHERE q.`enTitle` = 'The Cellar Hauler';
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
    'reps',
    10,
    15,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Towel Door Row'
WHERE q.`enTitle` = 'The Cellar Hauler';
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
    20,
    30,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Superman'
WHERE q.`enTitle` = 'The Cellar Hauler';
--> statement-breakpoint
-- The Ploughman's Vow — hypertrophy, 3x60s, ~17:09
INSERT INTO `quests` (
        `enTitle`,
        `frTitle`,
        `enDescription`,
        `frDescription`,
        `author`,
        `rounds`,
        `restSeconds`,
        `createdAt`,
        `updatedAt`
    )
VALUES (
        'The Ploughman''s Vow',
        'Le Serment du Laboureur',
        'No village eats from a warrior''s blade alone. Bend your back to the field and earn your place in it.',
        'Aucun village ne se nourrit de la seule lame d''un guerrier. Courbez le dos sur le champ et gagnez-y votre place.',
        'Admin',
        3,
        60,
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
    'reps',
    8,
    10,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Ranger''s Single Leg Deadlift'
WHERE q.`enTitle` = 'The Ploughman''s Vow';
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
    'reps',
    10,
    12,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Curtsy Squat'
WHERE q.`enTitle` = 'The Ploughman''s Vow';
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
    'reps',
    15,
    20,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Glute Bridge'
WHERE q.`enTitle` = 'The Ploughman''s Vow';
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
    'reps',
    15,
    20,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Standing Calf Raise'
WHERE q.`enTitle` = 'The Ploughman''s Vow';
--> statement-breakpoint
-- The Crow's Ascent — strength, 3x90s, ~21:06
INSERT INTO `quests` (
        `enTitle`,
        `frTitle`,
        `enDescription`,
        `frDescription`,
        `author`,
        `rounds`,
        `restSeconds`,
        `createdAt`,
        `updatedAt`
    )
VALUES (
        'The Crow''s Ascent',
        'L''Ascension du Corbeau',
        'The crows nest where no ladder reaches. Take the wall with your hands and hang there until it lets you up.',
        'Les corbeaux nichent là où aucune échelle ne monte. Prenez le mur à mains nues et restez suspendu jusqu''à ce qu''il vous laisse passer.',
        'Admin',
        3,
        90,
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
    'reps',
    4,
    6,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Chin-Up'
WHERE q.`enTitle` = 'The Crow''s Ascent';
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
    'reps',
    6,
    10,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Hanging Leg Raise'
WHERE q.`enTitle` = 'The Crow''s Ascent';
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
    'reps',
    8,
    12,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Inverted Row'
WHERE q.`enTitle` = 'The Crow''s Ascent';
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
    'reps',
    8,
    10,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Scapular Pull-Up'
WHERE q.`enTitle` = 'The Crow''s Ascent';
--> statement-breakpoint
-- The Colossus Trial — skill, 3x120s, ~18:48
INSERT INTO `quests` (
        `enTitle`,
        `frTitle`,
        `enDescription`,
        `frDescription`,
        `author`,
        `rounds`,
        `restSeconds`,
        `createdAt`,
        `updatedAt`
    )
VALUES (
        'The Colossus Trial',
        'L''Épreuve du Colosse',
        'The colossus stands on its hands and the world hangs beneath it. Hold. Do not fall.',
        'Le colosse se tient sur ses mains et le monde pend sous lui. Tenez. Ne tombez pas.',
        'Admin',
        3,
        120,
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
    'reps',
    3,
    5,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Handstand Push-Up'
WHERE q.`enTitle` = 'The Colossus Trial';
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
    15,
    25,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'L-Sit'
WHERE q.`enTitle` = 'The Colossus Trial';
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
    'reps',
    6,
    10,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Windshield Wipers'
WHERE q.`enTitle` = 'The Colossus Trial';
--> statement-breakpoint
-- Storm of Blades — metabolic, 3x40s, ~12:44
INSERT INTO `quests` (
        `enTitle`,
        `frTitle`,
        `enDescription`,
        `frDescription`,
        `author`,
        `rounds`,
        `restSeconds`,
        `createdAt`,
        `updatedAt`
    )
VALUES (
        'Storm of Blades',
        'La Tempête de Lames',
        'The raiders come over the dunes in a line of steel. Meet them moving, or be trampled where you stand.',
        'Les pillards franchissent les dunes en une ligne d''acier. Affrontez-les en mouvement, ou soyez piétiné sur place.',
        'Admin',
        3,
        40,
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
    'reps',
    10,
    15,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Jump Squat'
WHERE q.`enTitle` = 'Storm of Blades';
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
    'reps',
    16,
    20,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Rogue''s Skater Hop'
WHERE q.`enTitle` = 'Storm of Blades';
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
    'reps',
    20,
    25,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Star Jump'
WHERE q.`enTitle` = 'Storm of Blades';
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
    'reps',
    20,
    25,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Standing Calf Raise'
WHERE q.`enTitle` = 'Storm of Blades';
--> statement-breakpoint
-- The Serpent's Coil — core, 3x40s, ~13:02
INSERT INTO `quests` (
        `enTitle`,
        `frTitle`,
        `enDescription`,
        `frDescription`,
        `author`,
        `rounds`,
        `restSeconds`,
        `createdAt`,
        `updatedAt`
    )
VALUES (
        'The Serpent''s Coil',
        'L''Étreinte du Serpent',
        'The serpent does not strike. It wraps, and waits for your centre to give. Do not give.',
        'Le serpent ne frappe pas. Il enserre, et attend que votre centre cède. Ne cédez pas.',
        'Admin',
        3,
        40,
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
    20,
    30,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Side Plank'
WHERE q.`enTitle` = 'The Serpent''s Coil';
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
    'reps',
    16,
    20,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Russian Twist'
WHERE q.`enTitle` = 'The Serpent''s Coil';
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
    20,
    30,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Flutter Kicks'
WHERE q.`enTitle` = 'The Serpent''s Coil';
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
    'reps',
    12,
    15,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Reverse Crunch'
WHERE q.`enTitle` = 'The Serpent''s Coil';
