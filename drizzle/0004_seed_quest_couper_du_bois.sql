-- Seed 1 fun quest: "Couper du bois"
INSERT INTO `quests` (
        `enTitle`,
        `frTitle`,
        `enDescription`,
        `frDescription`,
        `rounds`,
        `createdAt`,
        `updatedAt`
    )
VALUES (
        'Chop Wood',
        'Couper du bois',
        'Grab your axe (imaginary counts). Your village needs warmth, so let''s chop some wood the heroic way — sweat included.',
        'Attrape ta hache (imaginaire, ça compte). Le village a besoin de chaleur : on coupe du bois version héros — sueur incluse.',
        3,
        CAST(strftime('%s', 'now') AS integer),
        CAST(strftime('%s', 'now') AS integer)
    );
--> statement-breakpoint
-- Exercises list (ordered)
-- 1) Squat (lift logs)
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
    12,
    16,
    '["assets/placeholder.jpg"]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Squat'
WHERE q.`frTitle` = 'Couper du bois'
ORDER BY q.id DESC
LIMIT 1;
-- 2) Push-ups (saw power)
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
    8,
    12,
    '["assets/placeholder.jpg"]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Push-ups'
WHERE q.`frTitle` = 'Couper du bois'
ORDER BY q.id DESC
LIMIT 1;
-- 3) Plank (carry the log)
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
    'time',
    30,
    45,
    '["assets/placeholder.jpg"]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Plank'
WHERE q.`frTitle` = 'Couper du bois'
ORDER BY q.id DESC
LIMIT 1;