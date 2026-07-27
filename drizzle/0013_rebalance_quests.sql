-- Phase A2 of docs/planning/work-roadmap.md §3.
-- The seeded quests sit outside their own design window: the 0002 starter quests estimate
-- at 4-9 min (two-exercise stubs at 30 s rest), the 0006 expansion quests at 24-41 min with
-- single-pattern volume (16 straight push sets in Forge, 15 of 20 in Iron Gauntlet).
--
-- This migration retimes all 13 and rewrites the composition of 11 of them so every quest
-- lands in 10-25 min, alternates muscles, leads with the hardest movement, and stays under
-- 12 sets on any one muscle. Estimates below are from db/estimate.ts at `medium` level.
-- Invariants are enforced by __tests__/content-invariants.test.ts.
--
-- Climb the Titan's Tower is untouched: it is already 3 rounds / 90 s / 17:36.
-- Chop Wood — circuit, 3x45s, ~11:30
UPDATE `quests`
SET `rounds` = 3,
    `restSeconds` = 45,
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'Chop Wood';
--> statement-breakpoint
-- Tower Climb — hypertrophy, 3x60s, ~13:24
UPDATE `quests`
SET `rounds` = 3,
    `restSeconds` = 60,
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'Tower Climb';
--> statement-breakpoint
DELETE FROM `quest_exercises`
WHERE `questId` = (
        SELECT `id`
        FROM `quests`
        WHERE `enTitle` = 'Tower Climb'
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
    5,
    8,
    '[]'
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
WHERE q.`enTitle` = 'Tower Climb';
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
    30,
    45,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Plank'
WHERE q.`enTitle` = 'Tower Climb';
--> statement-breakpoint
-- Knight Push — circuit, 3x45s, ~11:54
UPDATE `quests`
SET `rounds` = 3,
    `restSeconds` = 45,
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'Knight Push';
--> statement-breakpoint
DELETE FROM `quest_exercises`
WHERE `questId` = (
        SELECT `id`
        FROM `quests`
        WHERE `enTitle` = 'Knight Push'
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
    JOIN `exercises` e ON e.`enName` = 'Push-ups'
WHERE q.`enTitle` = 'Knight Push';
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
    15,
    20,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Squat'
WHERE q.`enTitle` = 'Knight Push';
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
    JOIN `exercises` e ON e.`enName` = 'Superman'
WHERE q.`enTitle` = 'Knight Push';
--> statement-breakpoint
-- Shield Wall — core, 3x45s, ~11:48
UPDATE `quests`
SET `rounds` = 3,
    `restSeconds` = 45,
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'Shield Wall';
--> statement-breakpoint
DELETE FROM `quest_exercises`
WHERE `questId` = (
        SELECT `id`
        FROM `quests`
        WHERE `enTitle` = 'Shield Wall'
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
    JOIN `exercises` e ON e.`enName` = 'Plank'
WHERE q.`enTitle` = 'Shield Wall';
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
    30,
    45,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Wall Sit'
WHERE q.`enTitle` = 'Shield Wall';
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
    JOIN `exercises` e ON e.`enName` = 'Superman'
WHERE q.`enTitle` = 'Shield Wall';
--> statement-breakpoint
-- Gather Stones — circuit, 3x45s, ~12:00
UPDATE `quests`
SET `rounds` = 3,
    `restSeconds` = 45,
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'Gather Stones';
--> statement-breakpoint
DELETE FROM `quest_exercises`
WHERE `questId` = (
        SELECT `id`
        FROM `quests`
        WHERE `enTitle` = 'Gather Stones'
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
    15,
    20,
    '[]'
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
        `targetMax`,
        `imagesJson`
    )
SELECT q.`id`,
    e.`id`,
    1,
    'time',
    30,
    45,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Plank'
WHERE q.`enTitle` = 'Gather Stones';
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
    12,
    15,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Glute Bridge'
WHERE q.`enTitle` = 'Gather Stones';
--> statement-breakpoint
-- Raise the Shelter — circuit, 3x45s, ~10:57
UPDATE `quests`
SET `rounds` = 3,
    `restSeconds` = 45,
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'Raise the Shelter';
--> statement-breakpoint
DELETE FROM `quest_exercises`
WHERE `questId` = (
        SELECT `id`
        FROM `quests`
        WHERE `enTitle` = 'Raise the Shelter'
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
    JOIN `exercises` e ON e.`enName` = 'Push-ups'
WHERE q.`enTitle` = 'Raise the Shelter';
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
    30,
    45,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Wall Sit'
WHERE q.`enTitle` = 'Raise the Shelter';
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
WHERE q.`enTitle` = 'Raise the Shelter';
--> statement-breakpoint
-- Core Forge — core, 3x60s, ~13:18
UPDATE `quests`
SET `rounds` = 3,
    `restSeconds` = 60,
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'Core Forge';
--> statement-breakpoint
DELETE FROM `quest_exercises`
WHERE `questId` = (
        SELECT `id`
        FROM `quests`
        WHERE `enTitle` = 'Core Forge'
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
    JOIN `exercises` e ON e.`enName` = 'Stone Guardian Plank'
WHERE q.`enTitle` = 'Core Forge';
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
    JOIN `exercises` e ON e.`enName` = 'Reverse Crunch'
WHERE q.`enTitle` = 'Core Forge';
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
    JOIN `exercises` e ON e.`enName` = 'Side Plank'
WHERE q.`enTitle` = 'Core Forge';
--> statement-breakpoint
-- Golem Strike — circuit, 3x45s, ~13:24
UPDATE `quests`
SET `rounds` = 3,
    `restSeconds` = 45,
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'Golem Strike';
--> statement-breakpoint
DELETE FROM `quest_exercises`
WHERE `questId` = (
        SELECT `id`
        FROM `quests`
        WHERE `enTitle` = 'Golem Strike'
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
    15,
    20,
    '[]'
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
        `targetMax`,
        `imagesJson`
    )
SELECT q.`id`,
    e.`id`,
    1,
    'reps',
    20,
    25,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Squat'
WHERE q.`enTitle` = 'Golem Strike';
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
    JOIN `exercises` e ON e.`enName` = 'Superman'
WHERE q.`enTitle` = 'Golem Strike';
--> statement-breakpoint
-- Golem Core — core, 3x60s, ~14:42
UPDATE `quests`
SET `rounds` = 3,
    `restSeconds` = 60,
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'Golem Core';
--> statement-breakpoint
DELETE FROM `quest_exercises`
WHERE `questId` = (
        SELECT `id`
        FROM `quests`
        WHERE `enTitle` = 'Golem Core'
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
    JOIN `exercises` e ON e.`enName` = 'Plank'
WHERE q.`enTitle` = 'Golem Core';
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
    20,
    30,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Side Plank'
WHERE q.`enTitle` = 'Golem Core';
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
    25,
    30,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Crunch'
WHERE q.`enTitle` = 'Golem Core';
--> statement-breakpoint
-- Forge the Dragon Blade — strength, 3x90s, ~22:27
UPDATE `quests`
SET `rounds` = 3,
    `restSeconds` = 90,
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'Forge the Dragon Blade';
--> statement-breakpoint
DELETE FROM `quest_exercises`
WHERE `questId` = (
        SELECT `id`
        FROM `quests`
        WHERE `enTitle` = 'Forge the Dragon Blade'
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
    JOIN `exercises` e ON e.`enName` = 'Archer''s Pike Push-up'
WHERE q.`enTitle` = 'Forge the Dragon Blade';
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
    8,
    10,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Knight''s Diamond Push-up'
WHERE q.`enTitle` = 'Forge the Dragon Blade';
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
    JOIN `exercises` e ON e.`enName` = 'Titan''s Dip'
WHERE q.`enTitle` = 'Forge the Dragon Blade';
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
WHERE q.`enTitle` = 'Forge the Dragon Blade';
--> statement-breakpoint
-- Build the Stronghold — hypertrophy, 3x60s, ~19:30
UPDATE `quests`
SET `rounds` = 3,
    `restSeconds` = 60,
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'Build the Stronghold';
--> statement-breakpoint
DELETE FROM `quest_exercises`
WHERE `questId` = (
        SELECT `id`
        FROM `quests`
        WHERE `enTitle` = 'Build the Stronghold'
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
    5,
    7,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Iron Grip Pull-up'
WHERE q.`enTitle` = 'Build the Stronghold';
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
    JOIN `exercises` e ON e.`enName` = 'Dragon Push-up'
WHERE q.`enTitle` = 'Build the Stronghold';
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
    18,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Goblin Squat'
WHERE q.`enTitle` = 'Build the Stronghold';
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
    45,
    60,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Stone Guardian Plank'
WHERE q.`enTitle` = 'Build the Stronghold';
--> statement-breakpoint
-- The Iron Gauntlet Challenge — strength, 3x90s, ~24:03
UPDATE `quests`
SET `rounds` = 3,
    `restSeconds` = 90,
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Iron Gauntlet Challenge';
--> statement-breakpoint
DELETE FROM `quest_exercises`
WHERE `questId` = (
        SELECT `id`
        FROM `quests`
        WHERE `enTitle` = 'The Iron Gauntlet Challenge'
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
    12,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Archer''s Pike Push-up'
WHERE q.`enTitle` = 'The Iron Gauntlet Challenge';
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
    8,
    10,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Iron Grip Pull-up'
WHERE q.`enTitle` = 'The Iron Gauntlet Challenge';
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
    JOIN `exercises` e ON e.`enName` = 'Titan''s Dip'
WHERE q.`enTitle` = 'The Iron Gauntlet Challenge';
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
    45,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Alchemist''s Hollow Body Hold'
WHERE q.`enTitle` = 'The Iron Gauntlet Challenge';
