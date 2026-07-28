-- Content fixes the movement-pattern column made visible (0020).
--
-- Three quests repeated one pattern back to back, which the muscle vocabulary could not see:
-- both cardio quests were four `locomotion` drills in a row — burpees, climbers, high knees and
-- jacks are all the same bouncing, knee-driven movement — and The Squire's Awakening put two
-- core movements side by side.
--
-- Fixed in the content rather than by exempting the rule: a metabolic quest that alternates
-- locomotion with a squat and a core movement is genuinely more varied training, and the point
-- of the pattern column was to make that visible.
--> statement-breakpoint
-- Escape the Collapsing Mine
DELETE FROM `quest_exercises`
WHERE `questId` = (
        SELECT `id`
        FROM `quests`
        WHERE `enTitle` = 'Escape the Collapsing Mine'
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
    JOIN `exercises` e ON e.`enName` = 'Berserker Burpee'
WHERE q.`enTitle` = 'Escape the Collapsing Mine';
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
    JOIN `exercises` e ON e.`enName` = 'Jump Squat'
WHERE q.`enTitle` = 'Escape the Collapsing Mine';
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
    JOIN `exercises` e ON e.`enName` = 'Monk''s Mountain Climber'
WHERE q.`enTitle` = 'Escape the Collapsing Mine';
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
WHERE q.`enTitle` = 'Escape the Collapsing Mine';
--> statement-breakpoint
-- Sprint Through the Shadowlands
DELETE FROM `quest_exercises`
WHERE `questId` = (
        SELECT `id`
        FROM `quests`
        WHERE `enTitle` = 'Sprint Through the Shadowlands'
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
    JOIN `exercises` e ON e.`enName` = 'Berserker Burpee'
WHERE q.`enTitle` = 'Sprint Through the Shadowlands';
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
    JOIN `exercises` e ON e.`enName` = 'Shadow Step Lunge'
WHERE q.`enTitle` = 'Sprint Through the Shadowlands';
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
    JOIN `exercises` e ON e.`enName` = 'Paladin''s High Knee'
WHERE q.`enTitle` = 'Sprint Through the Shadowlands';
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
    16,
    20,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Russian Twist'
WHERE q.`enTitle` = 'Sprint Through the Shadowlands';
--> statement-breakpoint
-- Storm of Blades
DELETE FROM `quest_exercises`
WHERE `questId` = (
        SELECT `id`
        FROM `quests`
        WHERE `enTitle` = 'Storm of Blades'
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
    JOIN `exercises` e ON e.`enName` = 'Standing Calf Raise'
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
    JOIN `exercises` e ON e.`enName` = 'Star Jump'
WHERE q.`enTitle` = 'Storm of Blades';
--> statement-breakpoint
-- The Squire's Awakening
DELETE FROM `quest_exercises`
WHERE `questId` = (
        SELECT `id`
        FROM `quests`
        WHERE `enTitle` = 'The Squire''s Awakening'
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
    2,
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
    3,
    'time',
    20,
    30,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Superman'
WHERE q.`enTitle` = 'The Squire''s Awakening';
