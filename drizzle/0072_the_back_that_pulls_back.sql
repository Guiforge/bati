-- A beginner circuit that pushes now also works the upper back (roadmap P-02).
--
-- Raise the Shelter and The Squire's Awakening are the two beginner quests with a push in them,
-- and neither had anything for the muscles that pull the shoulder blades back. The two rows the
-- catalogue already has (Table Row, Towel Door Row) need a sturdy table or a door and a towel,
-- which a beginner at home skips mid-session. The Superman W needs only the floor: lying face
-- down, chest and legs just lifted, the elbows drive to the ribs as in a row, unloaded. The arms
-- are what set it apart from the Superman, which holds them straight out. It trains the middle and
-- lower trapezius and the rear shoulder, not the lats, so it is the antagonist to push-ups that a
-- beginner will actually do, not a replacement for a row.
--
-- The slot is appended, never swapped in: a saved quest configuration is keyed by the
-- quest_exercises id (`db/questConfig.ts`), so changing the movement on an existing slot would
-- hand the hero's saved target for the old movement to the new one. A new slot has no config.
-- `MAX(sortOrder) + 1` rather than a literal, so a quest whose slots were rewritten since cannot
-- collide with the unique (questId, sortOrder) index.
--
-- In The Squire's Awakening the appended slot would have followed the Superman: two prone back
-- extensions in a row, on a hero's first session. It moves next to Wall Push-Up, its antagonist.
-- Rows keep their ids, so saved configurations follow their movement, and the slots step out of
-- the way (+100) first because the unique index is checked row by row (as in 0054).
--
-- Not on the row ladder (prerequisiteExerciseId stays null): it is not an easier row, and a rung
-- below Towel Door Row would let `currentRungFor` hand it out in place of The Cellar Hauler's rows.
INSERT INTO `exercises` (
        `enName`,
        `frName`,
        `deName`,
        `esName`,
        `enDescription`,
        `frDescription`,
        `deDescription`,
        `esDescription`,
        `imagePath`,
        `creator`,
        `difficulty`,
        `equipment`,
        `style`,
        `pattern`,
        `measure`,
        `secondsPerRep`,
        `createdAt`,
        `updatedAt`
    )
VALUES (
        'Superman W',
        'Superman en W',
        'Superman W',
        'Superman en W',
        'Lie face down, arms stretched out in front. Lift your chest, arms and legs a little off the floor, eyes on the floor. Pull your elbows back to your ribs, as if into your back pockets, and squeeze your shoulder blades together for two seconds. Reach forward again without touching the floor and repeat.',
        'Allonge-toi sur le ventre, bras tendus devant toi. Décolle un peu du sol la poitrine, les bras et les jambes, le regard vers le sol. Ramène les coudes vers les côtes, comme pour les glisser dans tes poches arrière, et serre les omoplates deux secondes. Retends les bras devant sans toucher le sol et recommence.',
        'Leg dich auf den Bauch, die Arme nach vorn gestreckt. Heb Brust, Arme und Beine leicht vom Boden, den Blick zum Boden. Zieh die Ellbogen zu den Rippen, als wolltest du sie in die Gesäßtaschen stecken, und drück die Schulterblätter zwei Sekunden zusammen. Streck die Arme wieder nach vorn, ohne den Boden zu berühren, und wiederhole.',
        'Túmbate boca abajo con los brazos estirados al frente. Despega un poco del suelo el pecho, los brazos y las piernas, con la mirada al suelo. Lleva los codos hacia las costillas, como si quisieras meterlos en los bolsillos traseros, y junta los omóplatos durante dos segundos. Vuelve a estirar los brazos sin tocar el suelo y repite.',
        'assets/images/exercises/superman_w.webp',
        'Admin',
        'easy',
        'none',
        'strength',
        'pull_horizontal',
        'reps',
        4,
        strftime('%s', 'now') * 1000,
        strftime('%s', 'now') * 1000
    );
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT e.`id`,
    m.`muscle`
FROM `exercises` e
    JOIN (
        SELECT 'back' AS `muscle`
        UNION ALL
        SELECT 'shoulder'
    ) m
WHERE e.`enName` = 'Superman W'
    AND e.`creator` = 'Admin';
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
    (
        SELECT COALESCE(MAX(qe.`sortOrder`), -1) + 1
        FROM `quest_exercises` qe
        WHERE qe.`questId` = q.`id`
    ),
    'reps',
    10,
    12,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Superman W'
    AND e.`creator` = 'Admin'
WHERE q.`author` = 'Admin'
    AND q.`enTitle` IN ('Raise the Shelter', 'The Squire''s Awakening');
--> statement-breakpoint
UPDATE `quest_exercises` SET `sortOrder` = `sortOrder` + 100
WHERE `questId` = (
    SELECT q.`id` FROM `quests` q WHERE q.`enTitle` = 'The Squire''s Awakening' AND q.`author` = 'Admin'
);
--> statement-breakpoint
UPDATE `quest_exercises` SET `sortOrder` = CASE (
        SELECT e.`enName` FROM `exercises` e
        WHERE e.`id` = `quest_exercises`.`exerciseId` AND e.`creator` = 'Admin'
    )
    WHEN 'Wall Push-Up' THEN 0
    WHEN 'Superman W' THEN 1
    WHEN 'Dead Bug' THEN 2
    WHEN 'Glute Bridge' THEN 3
    WHEN 'Superman' THEN 4
    ELSE `sortOrder` - 100
END
WHERE `questId` = (
    SELECT q.`id` FROM `quests` q WHERE q.`enTitle` = 'The Squire''s Awakening' AND q.`author` = 'Admin'
);
