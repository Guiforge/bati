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
    );
--> statement-breakpoint
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
        'Push-ups',
        'Pompes',
        'Start in a plank position and lower your body until your chest nearly touches the floor.',
        'Commencez en position de planche et descendez jusqu''à ce que votre poitrine touche presque le sol.',
        'medium',
        'none',
        3,
        strftime('%s', 'now') * 1000,
        strftime('%s', 'now') * 1000
    );
--> statement-breakpoint
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
        'Pull-ups',
        'Tractions',
        'Hang from a bar and pull yourself up until your chin is above the bar.',
        'Suspendez-vous à une barre et tirez-vous jusqu''à ce que votre menton dépasse la barre.',
        'hard',
        'pullup_bar',
        4,
        strftime('%s', 'now') * 1000,
        strftime('%s', 'now') * 1000
    );
--> statement-breakpoint
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
        'Wall Sit',
        'Chaise',
        'Slide your back down a wall until your thighs are parallel to the ground and hold.',
        'Glissez le dos contre un mur jusqu''à ce que vos cuisses soient parallèles au sol et maintenez.',
        'easy',
        'none',
        1,
        strftime('%s', 'now') * 1000,
        strftime('%s', 'now') * 1000
    );
--> statement-breakpoint
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
        'Plank',
        'Planche',
        'Hold a push-up position with your body in a straight line.',
        'Maintenez une position de pompe avec le corps en ligne droite.',
        'medium',
        'none',
        1,
        strftime('%s', 'now') * 1000,
        strftime('%s', 'now') * 1000
    );
--> statement-breakpoint
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
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT `id`,
    'chest'
FROM `exercises`
WHERE `enName` = 'Squat';
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT `id`,
    'chest'
FROM `exercises`
WHERE `enName` = 'Push-ups';
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT `id`,
    'arms'
FROM `exercises`
WHERE `enName` = 'Push-ups';
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT `id`,
    'shoulder'
FROM `exercises`
WHERE `enName` = 'Push-ups';
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT `id`,
    'back'
FROM `exercises`
WHERE `enName` = 'Pull-ups';
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT `id`,
    'arms'
FROM `exercises`
WHERE `enName` = 'Pull-ups';
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT `id`,
    'shoulder'
FROM `exercises`
WHERE `enName` = 'Pull-ups';
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT `id`,
    'calf'
FROM `exercises`
WHERE `enName` = 'Wall Sit';
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT `id`,
    'chest'
FROM `exercises`
WHERE `enName` = 'Wall Sit';
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT `id`,
    'abs'
FROM `exercises`
WHERE `enName` = 'Plank';
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT `id`,
    'back'
FROM `exercises`
WHERE `enName` = 'Plank';
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT `id`,
    'shoulder'
FROM `exercises`
WHERE `enName` = 'Plank';
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT `id`,
    'abs'
FROM `exercises`
WHERE `enName` = 'Crunch';