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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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