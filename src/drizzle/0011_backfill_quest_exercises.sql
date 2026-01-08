-- Backfill quest_exercises for quests seeded in 0006_content_expansion.sql
--
-- Root cause: 0006_content_expansion.sql inserts quests + quest_exercises BEFORE inserting the referenced exercises.
-- Those INSERT INTO quest_exercises ... SELECT ... JOIN exercises statements silently insert 0 rows.
--
-- This migration safely re-inserts the expected quest_exercises mappings once exercises exist.
-- It is idempotent thanks to NOT EXISTS guards.
WITH mappings(
    questTitle,
    exerciseName,
    sortOrder,
    targetType,
    targetMin,
    targetMax
) AS (
    VALUES -- Quest 2: Guard the Fortress Gate
        (
            'Guard the Fortress Gate',
            'Wall Sentinel Hold',
            0,
            'time',
            30,
            45
        ),
        (
            'Guard the Fortress Gate',
            'Stone Guardian Plank',
            1,
            'time',
            30,
            60
        ),
        (
            'Guard the Fortress Gate',
            'Goblin Squat',
            2,
            'reps',
            12,
            15
        ),
        (
            'Guard the Fortress Gate',
            'Shadow Step Lunge',
            3,
            'reps',
            10,
            12
        ),
        -- Quest 3: Forge the Dragon Blade
        (
            'Forge the Dragon Blade',
            'Dragon Push-up',
            0,
            'reps',
            12,
            15
        ),
        (
            'Forge the Dragon Blade',
            'Knight''s Diamond Push-up',
            1,
            'reps',
            8,
            10
        ),
        (
            'Forge the Dragon Blade',
            'Titan''s Dip',
            2,
            'reps',
            8,
            12
        ),
        (
            'Forge the Dragon Blade',
            'Archer''s Pike Push-up',
            3,
            'reps',
            8,
            10
        ),
        -- Quest 4: Climb the Titan's Tower
        (
            'Climb the Titan''s Tower',
            'Iron Grip Pull-up',
            0,
            'reps',
            5,
            8
        ),
        (
            'Climb the Titan''s Tower',
            'Ranger''s Single Leg Deadlift',
            1,
            'reps',
            8,
            10
        ),
        (
            'Climb the Titan''s Tower',
            'Stone Guardian Plank',
            2,
            'time',
            45,
            60
        ),
        -- Quest 5: The Arcane Gauntlet
        (
            'The Arcane Gauntlet',
            'Wizard''s Bicycle Crunch',
            0,
            'reps',
            15,
            20
        ),
        (
            'The Arcane Gauntlet',
            'Alchemist''s Hollow Body Hold',
            1,
            'time',
            20,
            30
        ),
        (
            'The Arcane Gauntlet',
            'Stone Guardian Plank',
            2,
            'time',
            45,
            60
        ),
        (
            'The Arcane Gauntlet',
            'Monk''s Mountain Climber',
            3,
            'time',
            30,
            40
        ),
        -- Quest 6: The Druid's Path
        (
            'The Druid''s Path',
            'Druid''s Cobra Stretch',
            0,
            'time',
            30,
            45
        ),
        (
            'The Druid''s Path',
            'Samurai''s Warrior Pose',
            1,
            'time',
            45,
            60
        ),
        (
            'The Druid''s Path',
            'Shadow Step Lunge',
            2,
            'reps',
            8,
            10
        ),
        -- Quest 7: Sprint Through the Shadowlands
        (
            'Sprint Through the Shadowlands',
            'Paladin''s High Knee',
            0,
            'time',
            40,
            50
        ),
        (
            'Sprint Through the Shadowlands',
            'Rogue''s Skater Hop',
            1,
            'reps',
            15,
            20
        ),
        (
            'Sprint Through the Shadowlands',
            'Berserker Burpee',
            2,
            'reps',
            10,
            12
        ),
        (
            'Sprint Through the Shadowlands',
            'Thunder Jumping Jack',
            3,
            'reps',
            25,
            30
        ),
        -- Quest 8: Build the Stronghold
        (
            'Build the Stronghold',
            'Goblin Squat',
            0,
            'reps',
            15,
            18
        ),
        (
            'Build the Stronghold',
            'Dragon Push-up',
            1,
            'reps',
            12,
            15
        ),
        (
            'Build the Stronghold',
            'Iron Grip Pull-up',
            2,
            'reps',
            5,
            7
        ),
        (
            'Build the Stronghold',
            'Stone Guardian Plank',
            3,
            'time',
            45,
            60
        ),
        (
            'Build the Stronghold',
            'Shadow Step Lunge',
            4,
            'reps',
            12,
            15
        ),
        -- Quest 9: The Iron Gauntlet Challenge
        (
            'The Iron Gauntlet Challenge',
            'Knight''s Diamond Push-up',
            0,
            'reps',
            10,
            12
        ),
        (
            'The Iron Gauntlet Challenge',
            'Iron Grip Pull-up',
            1,
            'reps',
            8,
            10
        ),
        (
            'The Iron Gauntlet Challenge',
            'Titan''s Dip',
            2,
            'reps',
            10,
            12
        ),
        (
            'The Iron Gauntlet Challenge',
            'Archer''s Pike Push-up',
            3,
            'reps',
            10,
            12
        ),
        (
            'The Iron Gauntlet Challenge',
            'Alchemist''s Hollow Body Hold',
            4,
            'time',
            30,
            45
        ),
        -- Quest 10: Morning of the Champion
        (
            'Morning of the Champion',
            'Thunder Jumping Jack',
            0,
            'reps',
            20,
            25
        ),
        (
            'Morning of the Champion',
            'Goblin Squat',
            1,
            'reps',
            12,
            15
        ),
        (
            'Morning of the Champion',
            'Dragon Push-up',
            2,
            'reps',
            10,
            12
        ),
        (
            'Morning of the Champion',
            'Druid''s Cobra Stretch',
            3,
            'time',
            30,
            40
        )
)
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
    m.sortOrder,
    m.targetType,
    m.targetMin,
    m.targetMax,
    '[]'
FROM mappings m
    JOIN `quests` q ON q.`enTitle` = m.questTitle
    JOIN `exercises` e ON e.`enName` = m.exerciseName
WHERE NOT EXISTS (
        SELECT 1
        FROM `quest_exercises` qe
        WHERE qe.`questId` = q.id
            AND qe.`exerciseId` = e.id
    );
--> statement-breakpoint