-- Before this migration the catalogue has exactly one equipment-free pulling movement
-- (Superman). Every row and every pull-up needs a bar, so a user without one cannot train
-- their back at all — the single biggest hole the content audit found.
--
-- Both movements come from the research dossier's own list of no-equipment pull solutions
-- (docs/raw/bodyweight-app-research.md §2, "Pulling without equipment"). They are tagged
-- `equipment = 'none'`: a kitchen table and a door handle are furniture, not fitness gear,
-- and the requirement is carried by the description. Art lands in a later migration, so both
-- rows resolve to the placeholder until then (same pattern as 0010 -> 0011).
-- Table Row
INSERT INTO `exercises` (
        `enName`,
        `frName`,
        `enDescription`,
        `frDescription`,
        `creator`,
        `difficulty`,
        `equipment`,
        `style`,
        `secondsPerRep`,
        `createdAt`,
        `updatedAt`
    )
VALUES (
        'Table Row',
        'Rowing sous la Table',
        'Lie under a sturdy table, grip the edge with both hands, keep your body straight from heels to shoulders, then pull your chest to the table and lower with control.',
        'Allongez-vous sous une table solide, saisissez le bord à deux mains, gardez le corps droit des talons aux épaules, puis tirez la poitrine vers la table et redescendez avec contrôle.',
        'Admin',
        'medium',
        'none',
        'strength',
        3,
        strftime('%s', 'now') * 1000,
        strftime('%s', 'now') * 1000
    );
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT e.`id`,
    'back'
FROM `exercises` e
WHERE e.`enName` = 'Table Row';
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT e.`id`,
    'arms'
FROM `exercises` e
WHERE e.`enName` = 'Table Row';
--> statement-breakpoint
-- Towel Door Row
INSERT INTO `exercises` (
        `enName`,
        `frName`,
        `enDescription`,
        `frDescription`,
        `creator`,
        `difficulty`,
        `equipment`,
        `style`,
        `secondsPerRep`,
        `createdAt`,
        `updatedAt`
    )
VALUES (
        'Towel Door Row',
        'Rowing à la Serviette',
        'Loop a towel around a door handle, grip both ends and lean back with straight arms, then pull yourself upright by driving your elbows past your ribs. Step your feet closer to the door to make it easier.',
        'Passez une serviette autour d''une poignée de porte, saisissez les deux extrémités et penchez-vous en arrière bras tendus, puis redressez-vous en tirant les coudes vers l''arrière. Rapprochez les pieds de la porte pour alléger l''exercice.',
        'Admin',
        'easy',
        'none',
        'strength',
        3,
        strftime('%s', 'now') * 1000,
        strftime('%s', 'now') * 1000
    );
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT e.`id`,
    'back'
FROM `exercises` e
WHERE e.`enName` = 'Towel Door Row';
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT e.`id`,
    'arms'
FROM `exercises` e
WHERE e.`enName` = 'Towel Door Row';
