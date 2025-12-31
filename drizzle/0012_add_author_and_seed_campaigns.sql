-- Add content attribution fields (author) and seed real multi-step campaigns.
-- 1) Schema changes
ALTER TABLE `quests`
ADD COLUMN `author` text NOT NULL DEFAULT 'Admin';
--> statement-breakpoint
ALTER TABLE `adventures`
ADD COLUMN `author` text NOT NULL DEFAULT 'Admin';
-- 2) Seed additional quest templates for campaigns
--> statement-breakpoint
-- Starter campaign steps (extends the existing "Couper du bois" quest)
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
        'Gather Stones',
        'Rassembler des pierres',
        'Carry, brace, and build. You need materials before night falls.',
        'Porte, gaine, et construis. Il te faut des matériaux avant la nuit.',
        'Admin',
        2,
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
    10,
    16,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Squat'
WHERE q.`frTitle` = 'Rassembler des pierres'
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
    40,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Plank'
WHERE q.`frTitle` = 'Rassembler des pierres'
ORDER BY q.id DESC
LIMIT 1;
--> statement-breakpoint
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
        'Raise the Shelter',
        'Ériger l’abri',
        'Push, brace, and hold. The shelter stands only if you do.',
        'Pousse, gaine, et tiens. L’abri ne tient que si toi aussi.',
        'Admin',
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
    'reps',
    8,
    12,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Push-ups'
WHERE q.`frTitle` = 'Ériger l’abri'
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
    45,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Wall Sit'
WHERE q.`frTitle` = 'Ériger l’abri'
ORDER BY q.id DESC
LIMIT 1;
-- 3) Seed real adventures (campaigns)
--> statement-breakpoint
-- Reuse the historical 1:1 "quest wrapper" adventure for this quest (unique on questId).
UPDATE `adventures`
SET `enTitle` = 'The Lumber Route',
    `frTitle` = 'La route du bûcheron',
    `enDescription` = 'A simple job becomes a small saga: gather, build, and keep the village warm.',
    `frDescription` = 'Un travail simple devient une petite saga : récolter, construire, et garder le village au chaud.',
    `author` = 'Admin',
    `sortOrder` = 100,
    `kind` = 'route',
    `isActive` = 1,
    `updatedAt` = CAST(strftime('%s', 'now') AS integer)
WHERE `questId` = (
        SELECT q.id
        FROM `quests` q
        WHERE q.`frTitle` = 'Couper du bois'
        ORDER BY q.id DESC
        LIMIT 1
    );
--> statement-breakpoint
-- The adventure already has a step 0 from the campaign migration; update its narrative.
UPDATE `adventure_steps`
SET `narrative` = 'The forest edge is close. Chop clean, breathe steady.',
    `updatedAt` = CAST(strftime('%s', 'now') AS integer)
WHERE `adventureId` = (
        SELECT a.id
        FROM `adventures` a
        WHERE a.`frTitle` = 'La route du bûcheron'
        ORDER BY a.id DESC
        LIMIT 1
    )
    AND `stepIndex` = 0;
--> statement-breakpoint
INSERT INTO `adventure_steps` (
        `adventureId`,
        `stepIndex`,
        `questId`,
        `narrative`,
        `createdAt`,
        `updatedAt`
    )
SELECT a.id,
    1,
    q1.id,
    'Stones and timber. Your core is the cart; keep it steady.',
    CAST(strftime('%s', 'now') AS integer),
    CAST(strftime('%s', 'now') AS integer)
FROM `adventures` a
    JOIN `quests` q1 ON q1.`frTitle` = 'Rassembler des pierres'
WHERE a.`frTitle` = 'La route du bûcheron'
ORDER BY a.id DESC
LIMIT 1;
--> statement-breakpoint
INSERT INTO `adventure_steps` (
        `adventureId`,
        `stepIndex`,
        `questId`,
        `narrative`,
        `createdAt`,
        `updatedAt`
    )
SELECT a.id,
    2,
    q2.id,
    'Raise the shelter. One more effort now, comfort later.',
    CAST(strftime('%s', 'now') AS integer),
    CAST(strftime('%s', 'now') AS integer)
FROM `adventures` a
    JOIN `quests` q2 ON q2.`frTitle` = 'Ériger l’abri'
WHERE a.`frTitle` = 'La route du bûcheron'
ORDER BY a.id DESC
LIMIT 1;
-- Boss mini-campaign (data-only for now)
--> statement-breakpoint
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
        'Approach the Golem',
        'Approcher le golem',
        'Prepare your body: brace and breathe before the clash.',
        'Prépare ton corps : gaine et respire avant le choc.',
        'Admin',
        2,
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
    'time',
    30,
    45,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Plank'
WHERE q.`frTitle` = 'Approcher le golem'
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
    JOIN `exercises` e ON e.`enName` = 'Crunch'
WHERE q.`frTitle` = 'Approcher le golem'
ORDER BY q.id DESC
LIMIT 1;
--> statement-breakpoint
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
        'Golem Clash',
        'Choc du golem',
        'Explosive strength. Push and squat like the earth is moving.',
        'Force explosive. Pompes et squats comme si la terre bougeait.',
        'Admin',
        4,
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
    8,
    12,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Push-ups'
WHERE q.`frTitle` = 'Choc du golem'
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
WHERE q.`frTitle` = 'Choc du golem'
ORDER BY q.id DESC
LIMIT 1;
--> statement-breakpoint
INSERT INTO `adventures` (
        `questId`,
        `enTitle`,
        `frTitle`,
        `enDescription`,
        `frDescription`,
        `author`,
        `sortOrder`,
        `kind`,
        `isActive`,
        `createdAt`,
        `updatedAt`
    )
SELECT q.id,
    'The Golem',
    'Le golem',
    'A boss awaits. Prepare, then face it.',
    'Un boss t’attend. Prépare-toi, puis affronte-le.',
    'Admin',
    200,
    'boss',
    1,
    CAST(strftime('%s', 'now') AS integer),
    CAST(strftime('%s', 'now') AS integer)
FROM `quests` q
WHERE q.`frTitle` = 'Approcher le golem'
ORDER BY q.id DESC
LIMIT 1;
--> statement-breakpoint
INSERT INTO `adventure_steps` (
        `adventureId`,
        `stepIndex`,
        `questId`,
        `narrative`,
        `createdAt`,
        `updatedAt`
    )
SELECT a.id,
    0,
    q0.id,
    'The ground trembles. Center yourself.',
    CAST(strftime('%s', 'now') AS integer),
    CAST(strftime('%s', 'now') AS integer)
FROM `adventures` a
    JOIN `quests` q0 ON q0.id = a.`questId`
WHERE a.`frTitle` = 'Le golem'
ORDER BY a.id DESC
LIMIT 1;
--> statement-breakpoint
INSERT INTO `adventure_steps` (
        `adventureId`,
        `stepIndex`,
        `questId`,
        `narrative`,
        `createdAt`,
        `updatedAt`
    )
SELECT a.id,
    1,
    q1.id,
    'Now. Hit back harder than it hits you.',
    CAST(strftime('%s', 'now') AS integer),
    CAST(strftime('%s', 'now') AS integer)
FROM `adventures` a
    JOIN `quests` q1 ON q1.`frTitle` = 'Choc du golem'
WHERE a.`frTitle` = 'Le golem'
ORDER BY a.id DESC
LIMIT 1;
-- 4) Deactivate old 1-step "quest wrapper" adventures
--> statement-breakpoint
UPDATE `adventures`
SET `isActive` = 0
WHERE `id` IN (
        SELECT a.id
        FROM `adventures` a
            LEFT JOIN `adventure_steps` s ON s.`adventureId` = a.`id`
        GROUP BY a.id
        HAVING COUNT(s.id) < 2
    );