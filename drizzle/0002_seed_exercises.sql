-- Seed default exercises catalogue
-- Safe to run once via migrator; uses OR IGNORE for idempotency.
INSERT
    OR IGNORE INTO `exercises` (
        `enName`,
        `frName`,
        `enDescription`,
        `frDescription`,
        `imagePath`,
        `createdAt`,
        `updatedAt`
    )
VALUES (
        'Squat',
        'Squat',
        'Stand with feet shoulder-width apart, lower hips until thighs are parallel to the floor, then push through the heels to return to standing.',
        'Debout, pieds à la largeur des épaules, descendre les hanches jusqu''à ce que les cuisses soient parallèles au sol, puis pousser sur les talons pour revenir à la position debout.',
        'assets/placeholder.jpg',
        CAST(strftime('%s', 'now') AS integer),
        CAST(strftime('%s', 'now') AS integer)
    ),
    (
        'Push-ups',
        'Pompes',
        'Start in a plank position, lower the chest toward the floor while keeping elbows close to the body, then press back up to full extension.',
        'Commencer en position de planche, abaisser la poitrine vers le sol en gardant les coudes près du corps, puis pousser pour revenir à l’extension complète.',
        'assets/placeholder.jpg',
        CAST(strftime('%s', 'now') AS integer),
        CAST(strftime('%s', 'now') AS integer)
    ),
    (
        'Pull-ups',
        'Tractions',
        'Hang from a bar with an overhand grip, pull the chin above the bar by driving the elbows down and back, then lower under control.',
        'Suspendu à une barre en prise pronation, tirer le menton au-dessus de la barre en ramenant les coudes vers le bas et l’arrière, puis redescendre sous contrôle.',
        'assets/placeholder.jpg',
        CAST(strftime('%s', 'now') AS integer),
        CAST(strftime('%s', 'now') AS integer)
    ),
    (
        'Wall Sit',
        'Chaise',
        'Slide your back down a wall until knees form a 90° angle, hold the “seated” position without moving.',
        'Glisser le dos le long d''un mur jusqu''à ce que les genoux forment un angle de 90°, tenir la position assise sans bouger.',
        'assets/placeholder.jpg',
        CAST(strftime('%s', 'now') AS integer),
        CAST(strftime('%s', 'now') AS integer)
    ),
    (
        'Plank',
        'Planche',
        'Maintain a straight line from head to heels while supporting the body on forearms and toes, engaging core muscles throughout.',
        'Garder une ligne droite de la tête aux talons en s’appuyant sur les avant-bras et les orteils, en contractant les muscles du tronc tout au long de l’exercice.',
        'assets/placeholder.jpg',
        CAST(strftime('%s', 'now') AS integer),
        CAST(strftime('%s', 'now') AS integer)
    ),
    (
        'Crunch',
        'Crunch',
        'Lie on your back with knees bent, lift the shoulders off the floor using abdominal contraction, then lower slowly.',
        'Allongé sur le dos, genoux fléchis, soulever les épaules du sol en contractant les abdominaux, puis redescendre lentement.',
        'assets/placeholder.jpg',
        CAST(strftime('%s', 'now') AS integer),
        CAST(strftime('%s', 'now') AS integer)
    );
--> statement-breakpoint
-- Squat
INSERT
    OR IGNORE INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT `id`,
    'calf'
FROM `exercises`
WHERE `enName` = 'Squat';
INSERT
    OR IGNORE INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT `id`,
    'chest'
FROM `exercises`
WHERE `enName` = 'Squat';
-- Push-ups
INSERT
    OR IGNORE INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT `id`,
    'chest'
FROM `exercises`
WHERE `enName` = 'Push-ups';
INSERT
    OR IGNORE INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT `id`,
    'arms'
FROM `exercises`
WHERE `enName` = 'Push-ups';
INSERT
    OR IGNORE INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT `id`,
    'shoulder'
FROM `exercises`
WHERE `enName` = 'Push-ups';
-- Pull-ups
INSERT
    OR IGNORE INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT `id`,
    'back'
FROM `exercises`
WHERE `enName` = 'Pull-ups';
INSERT
    OR IGNORE INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT `id`,
    'arms'
FROM `exercises`
WHERE `enName` = 'Pull-ups';
INSERT
    OR IGNORE INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT `id`,
    'shoulder'
FROM `exercises`
WHERE `enName` = 'Pull-ups';
-- Wall Sit
INSERT
    OR IGNORE INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT `id`,
    'calf'
FROM `exercises`
WHERE `enName` = 'Wall Sit';
INSERT
    OR IGNORE INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT `id`,
    'chest'
FROM `exercises`
WHERE `enName` = 'Wall Sit';
-- Plank
INSERT
    OR IGNORE INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT `id`,
    'abs'
FROM `exercises`
WHERE `enName` = 'Plank';
INSERT
    OR IGNORE INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT `id`,
    'back'
FROM `exercises`
WHERE `enName` = 'Plank';
INSERT
    OR IGNORE INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT `id`,
    'shoulder'
FROM `exercises`
WHERE `enName` = 'Plank';
-- Crunch
INSERT
    OR IGNORE INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT `id`,
    'abs'
FROM `exercises`
WHERE `enName` = 'Crunch';