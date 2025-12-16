-- Seed 4 additional quests
-- 1) Tower Climb
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
        'Pull, brace, and hold. Climb the tower one rep at a time — the village is watching.',
        'Tire, gainage, et courage. Monte la tour une rep à la fois — le village te regarde.',
        2,
        35,
        CAST(strftime('%s', 'now') AS integer),
        CAST(strftime('%s', 'now') AS integer)
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
SELECT q.id,
    e.id,
    0,
    'reps',
    4,
    7,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Pull-ups'
WHERE q.`frTitle` = 'Ascension de la tour'
ORDER BY q.id DESC
LIMIT 1;
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
SELECT q.id,
    e.id,
    1,
    'time',
    25,
    35,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Plank'
WHERE q.`frTitle` = 'Ascension de la tour'
ORDER BY q.id DESC
LIMIT 1;
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
SELECT q.id,
    e.id,
    2,
    'reps',
    12,
    18,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Crunch'
WHERE q.`frTitle` = 'Ascension de la tour'
ORDER BY q.id DESC
LIMIT 1;
-- 2) Knight Push
--> statement-breakpoint
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
        'Quick strength for quick wins: push, squat, repeat. Simple, brutal, effective.',
        'Force rapide pour victoires rapides : pompes, squats, on recommence. Simple, brutal, efficace.',
        4,
        25,
        CAST(strftime('%s', 'now') AS integer),
        CAST(strftime('%s', 'now') AS integer)
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
SELECT q.id,
    e.id,
    0,
    'reps',
    8,
    12,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Push-ups'
WHERE q.`frTitle` = 'Poussée du chevalier'
ORDER BY q.id DESC
LIMIT 1;
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
SELECT q.id,
    e.id,
    1,
    'reps',
    10,
    16,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Squat'
WHERE q.`frTitle` = 'Poussée du chevalier'
ORDER BY q.id DESC
LIMIT 1;
-- 3) Shield Wall
--> statement-breakpoint
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
        'Endurance is the real armor. Hold, brace, and press through.',
        'L’endurance, c’est la vraie armure. Tiens, gaine, et pousse.',
        3,
        30,
        CAST(strftime('%s', 'now') AS integer),
        CAST(strftime('%s', 'now') AS integer)
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
SELECT q.id,
    e.id,
    0,
    'time',
    25,
    45,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Wall Sit'
WHERE q.`frTitle` = 'Mur de boucliers'
ORDER BY q.id DESC
LIMIT 1;
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
SELECT q.id,
    e.id,
    1,
    'time',
    20,
    35,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Plank'
WHERE q.`frTitle` = 'Mur de boucliers'
ORDER BY q.id DESC
LIMIT 1;
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
SELECT q.id,
    e.id,
    2,
    'reps',
    6,
    10,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Push-ups'
WHERE q.`frTitle` = 'Mur de boucliers'
ORDER BY q.id DESC
LIMIT 1;
-- 4) Core Forge
--> statement-breakpoint
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
        'A hot core builds a cold-blooded champion. Crunch, hold, and squat to finish.',
        'Un tronc solide forge un champion. Crunch, gainage, et squats pour finir.',
        3,
        20,
        CAST(strftime('%s', 'now') AS integer),
        CAST(strftime('%s', 'now') AS integer)
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
SELECT q.id,
    e.id,
    0,
    'reps',
    10,
    18,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Crunch'
WHERE q.`frTitle` = 'Forge du tronc'
ORDER BY q.id DESC
LIMIT 1;
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
SELECT q.id,
    e.id,
    1,
    'time',
    20,
    30,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Plank'
WHERE q.`frTitle` = 'Forge du tronc'
ORDER BY q.id DESC
LIMIT 1;
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
SELECT q.id,
    e.id,
    2,
    'reps',
    10,
    14,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Squat'
WHERE q.`frTitle` = 'Forge du tronc'
ORDER BY q.id DESC
LIMIT 1;