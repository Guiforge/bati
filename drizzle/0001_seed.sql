-- Bati v3 - Seed Data
-- Initial exercises, quests, adventures, resources, and buildings
-- ============================================================
-- Exercises
-- ============================================================
INSERT INTO `exercises` (
        `enName`,
        `frName`,
        `enDescription`,
        `frDescription`,
        `difficulty`,
        `equipment`,
        `secondsPerRep`,
        `createdAt`,
        `updatedAt`
    )
VALUES (
        'Squat',
        'Squat',
        'Stand with feet shoulder-width apart and lower your body as if sitting in a chair.',
        'Tenez-vous debout, pieds écartés à largeur d''épaules, et descendez comme pour vous asseoir.',
        'medium',
        'none',
        3,
        strftime('%s', 'now') * 1000,
        strftime('%s', 'now') * 1000
    ),
    (
        'Push-ups',
        'Pompes',
        'Start in a plank position and lower your body until your chest nearly touches the floor.',
        'Commencez en position de planche et descendez jusqu''à ce que votre poitrine touche presque le sol.',
        'medium',
        'none',
        3,
        strftime('%s', 'now') * 1000,
        strftime('%s', 'now') * 1000
    ),
    (
        'Pull-ups',
        'Tractions',
        'Hang from a bar and pull yourself up until your chin is above the bar.',
        'Suspendez-vous à une barre et tirez-vous jusqu''à ce que votre menton dépasse la barre.',
        'hard',
        'pullup_bar',
        4,
        strftime('%s', 'now') * 1000,
        strftime('%s', 'now') * 1000
    ),
    (
        'Wall Sit',
        'Chaise',
        'Slide your back down a wall until your thighs are parallel to the ground and hold.',
        'Glissez le dos contre un mur jusqu''à ce que vos cuisses soient parallèles au sol et maintenez.',
        'easy',
        'none',
        1,
        strftime('%s', 'now') * 1000,
        strftime('%s', 'now') * 1000
    ),
    (
        'Plank',
        'Planche',
        'Hold a push-up position with your body in a straight line.',
        'Maintenez une position de pompe avec le corps en ligne droite.',
        'medium',
        'none',
        1,
        strftime('%s', 'now') * 1000,
        strftime('%s', 'now') * 1000
    ),
    (
        'Crunch',
        'Crunch',
        'Lie on your back and curl your shoulders toward your pelvis.',
        'Allongez-vous sur le dos et soulevez les épaules vers le bassin.',
        'easy',
        'none',
        2,
        strftime('%s', 'now') * 1000,
        strftime('%s', 'now') * 1000
    );
--> statement-breakpoint
-- Exercise muscles
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT `id`,
    'calf'
FROM `exercises`
WHERE `enName` = 'Squat';
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT `id`,
    'chest'
FROM `exercises`
WHERE `enName` = 'Squat';
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT `id`,
    'chest'
FROM `exercises`
WHERE `enName` = 'Push-ups';
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT `id`,
    'arms'
FROM `exercises`
WHERE `enName` = 'Push-ups';
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT `id`,
    'shoulder'
FROM `exercises`
WHERE `enName` = 'Push-ups';
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT `id`,
    'back'
FROM `exercises`
WHERE `enName` = 'Pull-ups';
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT `id`,
    'arms'
FROM `exercises`
WHERE `enName` = 'Pull-ups';
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT `id`,
    'shoulder'
FROM `exercises`
WHERE `enName` = 'Pull-ups';
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT `id`,
    'calf'
FROM `exercises`
WHERE `enName` = 'Wall Sit';
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT `id`,
    'chest'
FROM `exercises`
WHERE `enName` = 'Wall Sit';
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT `id`,
    'abs'
FROM `exercises`
WHERE `enName` = 'Plank';
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT `id`,
    'back'
FROM `exercises`
WHERE `enName` = 'Plank';
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT `id`,
    'shoulder'
FROM `exercises`
WHERE `enName` = 'Plank';
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT `id`,
    'abs'
FROM `exercises`
WHERE `enName` = 'Crunch';
-- ============================================================
-- Quests
-- ============================================================
--> statement-breakpoint
-- Quest: Chop Wood
INSERT INTO `quests` (
        `enTitle`,
        `frTitle`,
        `enDescription`,
        `frDescription`,
        `rounds`,
        `restSeconds`,
        `createdAt`,
        `updatedAt`
    )
VALUES (
        'Chop Wood',
        'Couper du bois',
        'Grab your axe (imaginary counts). Your village needs warmth, so let''s chop some wood the heroic way.',
        'Attrape ta hache (imaginaire, ça compte). Le village a besoin de chaleur : on coupe du bois version héros.',
        3,
        30,
        strftime('%s', 'now') * 1000,
        strftime('%s', 'now') * 1000
    );
INSERT INTO `quest_exercises` (
        `questId`,
        `exerciseId`,
        `sortOrder`,
        `targetType`,
        `targetMin`,
        `targetMax`
    )
SELECT q.id,
    e.id,
    0,
    'reps',
    12,
    16
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Squat'
WHERE q.`enTitle` = 'Chop Wood';
INSERT INTO `quest_exercises` (
        `questId`,
        `exerciseId`,
        `sortOrder`,
        `targetType`,
        `targetMin`,
        `targetMax`
    )
SELECT q.id,
    e.id,
    1,
    'reps',
    8,
    12
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Push-ups'
WHERE q.`enTitle` = 'Chop Wood';
INSERT INTO `quest_exercises` (
        `questId`,
        `exerciseId`,
        `sortOrder`,
        `targetType`,
        `targetMin`,
        `targetMax`
    )
SELECT q.id,
    e.id,
    2,
    'time',
    30,
    45
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Plank'
WHERE q.`enTitle` = 'Chop Wood';
--> statement-breakpoint
-- Quest: Tower Climb
INSERT INTO `quests` (
        `enTitle`,
        `frTitle`,
        `enDescription`,
        `frDescription`,
        `rounds`,
        `restSeconds`,
        `createdAt`,
        `updatedAt`
    )
VALUES (
        'Tower Climb',
        'Ascension de la tour',
        'Climb the ancient tower. Each floor tests your resolve.',
        'Grimpe la tour ancienne. Chaque étage met ta volonté à l''épreuve.',
        2,
        30,
        strftime('%s', 'now') * 1000,
        strftime('%s', 'now') * 1000
    );
INSERT INTO `quest_exercises` (
        `questId`,
        `exerciseId`,
        `sortOrder`,
        `targetType`,
        `targetMin`,
        `targetMax`
    )
SELECT q.id,
    e.id,
    0,
    'reps',
    5,
    8
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Pull-ups'
WHERE q.`enTitle` = 'Tower Climb';
INSERT INTO `quest_exercises` (
        `questId`,
        `exerciseId`,
        `sortOrder`,
        `targetType`,
        `targetMin`,
        `targetMax`
    )
SELECT q.id,
    e.id,
    1,
    'time',
    30,
    45
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Plank'
WHERE q.`enTitle` = 'Tower Climb';
INSERT INTO `quest_exercises` (
        `questId`,
        `exerciseId`,
        `sortOrder`,
        `targetType`,
        `targetMin`,
        `targetMax`
    )
SELECT q.id,
    e.id,
    2,
    'reps',
    15,
    20
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Crunch'
WHERE q.`enTitle` = 'Tower Climb';
--> statement-breakpoint
-- Quest: Knight Push
INSERT INTO `quests` (
        `enTitle`,
        `frTitle`,
        `enDescription`,
        `frDescription`,
        `rounds`,
        `restSeconds`,
        `createdAt`,
        `updatedAt`
    )
VALUES (
        'Knight Push',
        'Poussée du chevalier',
        'Train like a knight. Push your limits.',
        'Entraîne-toi comme un chevalier. Repousse tes limites.',
        3,
        30,
        strftime('%s', 'now') * 1000,
        strftime('%s', 'now') * 1000
    );
INSERT INTO `quest_exercises` (
        `questId`,
        `exerciseId`,
        `sortOrder`,
        `targetType`,
        `targetMin`,
        `targetMax`
    )
SELECT q.id,
    e.id,
    0,
    'reps',
    10,
    15
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Push-ups'
WHERE q.`enTitle` = 'Knight Push';
INSERT INTO `quest_exercises` (
        `questId`,
        `exerciseId`,
        `sortOrder`,
        `targetType`,
        `targetMin`,
        `targetMax`
    )
SELECT q.id,
    e.id,
    1,
    'reps',
    15,
    20
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Squat'
WHERE q.`enTitle` = 'Knight Push';
--> statement-breakpoint
-- Quest: Shield Wall
INSERT INTO `quests` (
        `enTitle`,
        `frTitle`,
        `enDescription`,
        `frDescription`,
        `rounds`,
        `restSeconds`,
        `createdAt`,
        `updatedAt`
    )
VALUES (
        'Shield Wall',
        'Mur de boucliers',
        'Hold the line. Your core is your shield.',
        'Tiens la ligne. Ton gainage est ton bouclier.',
        2,
        30,
        strftime('%s', 'now') * 1000,
        strftime('%s', 'now') * 1000
    );
INSERT INTO `quest_exercises` (
        `questId`,
        `exerciseId`,
        `sortOrder`,
        `targetType`,
        `targetMin`,
        `targetMax`
    )
SELECT q.id,
    e.id,
    0,
    'time',
    45,
    60
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Plank'
WHERE q.`enTitle` = 'Shield Wall';
INSERT INTO `quest_exercises` (
        `questId`,
        `exerciseId`,
        `sortOrder`,
        `targetType`,
        `targetMin`,
        `targetMax`
    )
SELECT q.id,
    e.id,
    1,
    'time',
    30,
    45
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Wall Sit'
WHERE q.`enTitle` = 'Shield Wall';
--> statement-breakpoint
-- Quest: Gather Stones
INSERT INTO `quests` (
        `enTitle`,
        `frTitle`,
        `enDescription`,
        `frDescription`,
        `rounds`,
        `restSeconds`,
        `createdAt`,
        `updatedAt`
    )
VALUES (
        'Gather Stones',
        'Rassembler des pierres',
        'The foundation needs stones. Lift and carry.',
        'Les fondations ont besoin de pierres. Soulève et porte.',
        2,
        30,
        strftime('%s', 'now') * 1000,
        strftime('%s', 'now') * 1000
    );
INSERT INTO `quest_exercises` (
        `questId`,
        `exerciseId`,
        `sortOrder`,
        `targetType`,
        `targetMin`,
        `targetMax`
    )
SELECT q.id,
    e.id,
    0,
    'reps',
    15,
    20
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Squat'
WHERE q.`enTitle` = 'Gather Stones';
INSERT INTO `quest_exercises` (
        `questId`,
        `exerciseId`,
        `sortOrder`,
        `targetType`,
        `targetMin`,
        `targetMax`
    )
SELECT q.id,
    e.id,
    1,
    'time',
    30,
    45
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Plank'
WHERE q.`enTitle` = 'Gather Stones';
--> statement-breakpoint
-- Quest: Raise the Shelter
INSERT INTO `quests` (
        `enTitle`,
        `frTitle`,
        `enDescription`,
        `frDescription`,
        `rounds`,
        `restSeconds`,
        `createdAt`,
        `updatedAt`
    )
VALUES (
        'Raise the Shelter',
        'Ériger l''abri',
        'Build the shelter. Push and hold.',
        'Construis l''abri. Pousse et maintiens.',
        2,
        30,
        strftime('%s', 'now') * 1000,
        strftime('%s', 'now') * 1000
    );
INSERT INTO `quest_exercises` (
        `questId`,
        `exerciseId`,
        `sortOrder`,
        `targetType`,
        `targetMin`,
        `targetMax`
    )
SELECT q.id,
    e.id,
    0,
    'reps',
    10,
    15
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Push-ups'
WHERE q.`enTitle` = 'Raise the Shelter';
INSERT INTO `quest_exercises` (
        `questId`,
        `exerciseId`,
        `sortOrder`,
        `targetType`,
        `targetMin`,
        `targetMax`
    )
SELECT q.id,
    e.id,
    1,
    'time',
    30,
    45
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Wall Sit'
WHERE q.`enTitle` = 'Raise the Shelter';
--> statement-breakpoint
-- Quest: Core Forge (Forge du tronc)
INSERT INTO `quests` (
        `enTitle`,
        `frTitle`,
        `enDescription`,
        `frDescription`,
        `rounds`,
        `restSeconds`,
        `createdAt`,
        `updatedAt`
    )
VALUES (
        'Core Forge',
        'Forge du tronc',
        'Forge your core like steel. Planks, crunches, and holds.',
        'Forge ton tronc comme l''acier. Planches, crunchs et maintiens.',
        3,
        30,
        strftime('%s', 'now') * 1000,
        strftime('%s', 'now') * 1000
    );
INSERT INTO `quest_exercises` (
        `questId`,
        `exerciseId`,
        `sortOrder`,
        `targetType`,
        `targetMin`,
        `targetMax`
    )
SELECT q.id,
    e.id,
    0,
    'time',
    45,
    60
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Plank'
WHERE q.`enTitle` = 'Core Forge';
INSERT INTO `quest_exercises` (
        `questId`,
        `exerciseId`,
        `sortOrder`,
        `targetType`,
        `targetMin`,
        `targetMax`
    )
SELECT q.id,
    e.id,
    1,
    'reps',
    20,
    30
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Crunch'
WHERE q.`enTitle` = 'Core Forge';
--> statement-breakpoint
-- Quest: Golem Strike (for boss)
INSERT INTO `quests` (
        `enTitle`,
        `frTitle`,
        `enDescription`,
        `frDescription`,
        `rounds`,
        `restSeconds`,
        `createdAt`,
        `updatedAt`
    )
VALUES (
        'Golem Strike',
        'Frappe du golem',
        'Strike the stone golem with all your might.',
        'Frappe le golem de pierre de toutes tes forces.',
        2,
        30,
        strftime('%s', 'now') * 1000,
        strftime('%s', 'now') * 1000
    );
INSERT INTO `quest_exercises` (
        `questId`,
        `exerciseId`,
        `sortOrder`,
        `targetType`,
        `targetMin`,
        `targetMax`
    )
SELECT q.id,
    e.id,
    0,
    'reps',
    15,
    20
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Push-ups'
WHERE q.`enTitle` = 'Golem Strike';
INSERT INTO `quest_exercises` (
        `questId`,
        `exerciseId`,
        `sortOrder`,
        `targetType`,
        `targetMin`,
        `targetMax`
    )
SELECT q.id,
    e.id,
    1,
    'reps',
    20,
    25
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Squat'
WHERE q.`enTitle` = 'Golem Strike';
--> statement-breakpoint
-- Quest: Golem Core (for boss step 2)
INSERT INTO `quests` (
        `enTitle`,
        `frTitle`,
        `enDescription`,
        `frDescription`,
        `rounds`,
        `restSeconds`,
        `createdAt`,
        `updatedAt`
    )
VALUES (
        'Golem Core',
        'Cœur du golem',
        'Target the golem''s core. Hold and strike.',
        'Vise le cœur du golem. Maintiens et frappe.',
        2,
        30,
        strftime('%s', 'now') * 1000,
        strftime('%s', 'now') * 1000
    );
INSERT INTO `quest_exercises` (
        `questId`,
        `exerciseId`,
        `sortOrder`,
        `targetType`,
        `targetMin`,
        `targetMax`
    )
SELECT q.id,
    e.id,
    0,
    'time',
    45,
    60
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Plank'
WHERE q.`enTitle` = 'Golem Core';
INSERT INTO `quest_exercises` (
        `questId`,
        `exerciseId`,
        `sortOrder`,
        `targetType`,
        `targetMin`,
        `targetMax`
    )
SELECT q.id,
    e.id,
    1,
    'reps',
    25,
    30
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Crunch'
WHERE q.`enTitle` = 'Golem Core';
-- ============================================================
-- Adventures (One per quest as route, plus campaigns)
-- ============================================================
--> statement-breakpoint
-- Create adventure wrappers for quests (excluding boss-specific quests which will be handled by boss adventure)
INSERT INTO `adventures` (
        `questId`,
        `enTitle`,
        `frTitle`,
        `enDescription`,
        `frDescription`,
        `sortOrder`,
        `kind`,
        `isActive`,
        `createdAt`,
        `updatedAt`
    )
SELECT `id`,
    `enTitle`,
    `frTitle`,
    `enDescription`,
    `frDescription`,
    `id`,
    'route',
    1,
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000
FROM `quests`
WHERE `enTitle` NOT IN (
        'Golem Strike',
        'Golem Core',
        'Gather Stones',
        'Raise the Shelter'
    );
-- Create adventure steps (one step per adventure pointing to same quest)
INSERT INTO `adventure_steps` (
        `adventureId`,
        `stepIndex`,
        `questId`,
        `createdAt`,
        `updatedAt`
    )
SELECT `id`,
    0,
    `questId`,
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000
FROM `adventures`;
--> statement-breakpoint
-- Campaign: Lumber Route (multi-step)
UPDATE `adventures`
SET `enTitle` = 'The Lumber Route',
    `frTitle` = 'La route du bûcheron',
    `enDescription` = 'Build your first shelter. Chop wood, gather stones, raise the walls.',
    `frDescription` = 'Construis ton premier abri. Coupe du bois, rassemble des pierres, élève les murs.',
    `kind` = 'campaign'
WHERE `questId` = (
        SELECT `id`
        FROM `quests`
        WHERE `enTitle` = 'Chop Wood'
    );
-- Add campaign steps
INSERT INTO `adventure_steps` (
        `adventureId`,
        `stepIndex`,
        `questId`,
        `enNarrative`,
        `frNarrative`,
        `createdAt`,
        `updatedAt`
    )
SELECT (
        SELECT `id`
        FROM `adventures`
        WHERE `enTitle` = 'The Lumber Route'
    ),
    1,
    (
        SELECT `id`
        FROM `quests`
        WHERE `enTitle` = 'Gather Stones'
    ),
    'Stones and wood. Your core is the cart: keep it stable.',
    'Pierres et bois. Ton gainage est la charrette : garde-la stable.',
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000;
INSERT INTO `adventure_steps` (
        `adventureId`,
        `stepIndex`,
        `questId`,
        `enNarrative`,
        `frNarrative`,
        `createdAt`,
        `updatedAt`
    )
SELECT (
        SELECT `id`
        FROM `adventures`
        WHERE `enTitle` = 'The Lumber Route'
    ),
    2,
    (
        SELECT `id`
        FROM `quests`
        WHERE `enTitle` = 'Raise the Shelter'
    ),
    'Raise the shelter. One last effort now, comfort later.',
    'Dresse l''abri. Un dernier effort maintenant, du confort ensuite.',
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000;
-- Update first step narrative
UPDATE `adventure_steps`
SET `enNarrative` = 'The forest edge is near. Chop clean, breathe calm.',
    `frNarrative` = 'La lisière de la forêt est proche. Coupe net, respire calmement.'
WHERE `adventureId` = (
        SELECT `id`
        FROM `adventures`
        WHERE `enTitle` = 'The Lumber Route'
    )
    AND `stepIndex` = 0;
--> statement-breakpoint
-- Boss Adventure: The Golem
INSERT INTO `adventures` (
        `questId`,
        `enTitle`,
        `frTitle`,
        `enDescription`,
        `frDescription`,
        `sortOrder`,
        `kind`,
        `isActive`,
        `bossTotalHp`,
        `bossWeaknessMuscle`,
        `bossResistanceMuscle`,
        `createdAt`,
        `updatedAt`
    )
SELECT (
        SELECT `id`
        FROM `quests`
        WHERE `enTitle` = 'Golem Strike'
    ),
    'The Golem',
    'Le golem',
    'A stone golem blocks your path. Destroy it with strength and endurance.',
    'Un golem de pierre bloque ton chemin. Détruis-le avec force et endurance.',
    100,
    'boss',
    1,
    200,
    'chest',
    'back',
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000;
-- Boss adventure steps
INSERT INTO `adventure_steps` (
        `adventureId`,
        `stepIndex`,
        `questId`,
        `enNarrative`,
        `frNarrative`,
        `createdAt`,
        `updatedAt`
    )
SELECT (
        SELECT `id`
        FROM `adventures`
        WHERE `enTitle` = 'The Golem'
    ),
    0,
    (
        SELECT `id`
        FROM `quests`
        WHERE `enTitle` = 'Golem Strike'
    ),
    'The ground trembles. Center yourself.',
    'Le sol tremble. Centre-toi.',
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000;
INSERT INTO `adventure_steps` (
        `adventureId`,
        `stepIndex`,
        `questId`,
        `enNarrative`,
        `frNarrative`,
        `createdAt`,
        `updatedAt`
    )
SELECT (
        SELECT `id`
        FROM `adventures`
        WHERE `enTitle` = 'The Golem'
    ),
    1,
    (
        SELECT `id`
        FROM `quests`
        WHERE `enTitle` = 'Golem Core'
    ),
    'Now. Strike harder than it strikes you.',
    'Maintenant. Frappe plus fort qu''il ne te frappe.',
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000;
-- ============================================================
-- Resources (Simplified: 3 types)
-- ============================================================
--> statement-breakpoint
INSERT INTO `resource_inventory` (`resource`, `amount`)
VALUES ('gold', 0),
    ('essence', 0),
    ('boss_token', 0);
-- ============================================================
-- Village Buildings
-- ============================================================
--> statement-breakpoint
INSERT INTO `village_buildings` (`buildingType`, `level`, `xp`, `isUnlocked`)
VALUES -- Tier 1 (unlocked)
    ('campfire', 1, 0, 1),
    ('tent', 1, 0, 1),
    ('training_dummy', 1, 0, 1),
    -- Tier 2 (locked)
    ('archery_range', 1, 0, 0),
    ('quarry', 1, 0, 0),
    ('forge', 1, 0, 0),
    ('well', 1, 0, 0),
    ('windmill', 1, 0, 0),
    ('farm', 1, 0, 0),
    -- Tier 3 (locked)
    ('watchtower', 1, 0, 0),
    ('castle_wall', 1, 0, 0),
    ('armory', 1, 0, 0),
    ('fountain', 1, 0, 0),
    ('observatory', 1, 0, 0),
    ('barn', 1, 0, 0),
    -- Tier 4 (locked)
    ('dragon_lair', 1, 0, 0),
    ('heroes_hall', 1, 0, 0),
    ('wizard_tower', 1, 0, 0),
    ('champion_arena', 1, 0, 0);
--> statement-breakpoint
INSERT INTO `village_stats` (
        `prestigeScore`,
        `totalBuildingsUnlocked`,
        `highestBuildingLevel`
    )
VALUES (0, 3, 1);