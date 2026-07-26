-- ============================================================
-- Bodyweight exercises (20 items) — sourced from hasaneyldrm/exercises-dataset
-- (equipment == "body weight"), curated to a hand-picked set matching the quality
-- bar of the existing catalogue: EN + FR only, no images (see docs/content/missing-image.md).
-- ============================================================
-- Exercise 1: Chin-Up
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
        'Chin-Up',
        'Traction en Supination',
        'Hang from a bar with palms facing you and pull your chest up until your chin clears the bar, then lower with control.',
        'Suspendez-vous à une barre paumes tournées vers vous et tirez la poitrine vers le haut jusqu''à ce que le menton dépasse la barre, puis redescendez avec contrôle.',
        'Admin',
        'hard',
        'pullup_bar',
        'strength',
        4,
        strftime('%s', 'now') * 1000,
        strftime('%s', 'now') * 1000
    );
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT e.id,
    'back'
FROM `exercises` e
WHERE e.`enName` = 'Chin-Up'
UNION ALL
SELECT e.id,
    'arms'
FROM `exercises` e
WHERE e.`enName` = 'Chin-Up';
--> statement-breakpoint
-- Exercise 2: Superman
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
        'Superman',
        'Extension Superman',
        'Lie face down with arms and legs extended, then lift your chest, arms and legs off the ground together and hold before lowering.',
        'Allongez-vous sur le ventre bras et jambes tendus, puis soulevez ensemble la poitrine, les bras et les jambes avant de redescendre.',
        'Admin',
        'easy',
        'none',
        'strength',
        2,
        strftime('%s', 'now') * 1000,
        strftime('%s', 'now') * 1000
    );
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT e.id,
    'back'
FROM `exercises` e
WHERE e.`enName` = 'Superman';
--> statement-breakpoint
-- Exercise 3: Bear Crawl
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
        'Bear Crawl',
        'Marche de l''Ours',
        'Move forward on hands and feet with hips low and core tight, advancing the opposite hand and foot together.',
        'Avancez à quatre pattes, hanches basses et sangle abdominale gainée, en faisant avancer la main et le pied opposés ensemble.',
        'Admin',
        'medium',
        'none',
        'cardio',
        2,
        strftime('%s', 'now') * 1000,
        strftime('%s', 'now') * 1000
    );
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT e.id,
    'abs'
FROM `exercises` e
WHERE e.`enName` = 'Bear Crawl'
UNION ALL
SELECT e.id,
    'shoulder'
FROM `exercises` e
WHERE e.`enName` = 'Bear Crawl';
--> statement-breakpoint
-- Exercise 4: Russian Twist
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
        'Russian Twist',
        'Rotation Russe',
        'Sit with knees bent and feet lifted, lean back slightly and rotate your torso side to side, tapping the floor each time.',
        'Asseyez-vous genoux fléchis et pieds levés, penchez-vous légèrement en arrière et faites pivoter le torse d''un côté à l''autre en touchant le sol à chaque fois.',
        'Admin',
        'medium',
        'none',
        'calisthenics',
        2,
        strftime('%s', 'now') * 1000,
        strftime('%s', 'now') * 1000
    );
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT e.id,
    'abs'
FROM `exercises` e
WHERE e.`enName` = 'Russian Twist';
--> statement-breakpoint
-- Exercise 5: Side Plank
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
        'Side Plank',
        'Planche Latérale',
        'Lie on your side propped on one forearm and lift your hips until your body forms a straight line, then hold.',
        'Allongez-vous sur le côté en appui sur un avant-bras et soulevez les hanches jusqu''à former une ligne droite, puis maintenez la position.',
        'Admin',
        'medium',
        'none',
        'strength',
        1,
        strftime('%s', 'now') * 1000,
        strftime('%s', 'now') * 1000
    );
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT e.id,
    'abs'
FROM `exercises` e
WHERE e.`enName` = 'Side Plank';
--> statement-breakpoint
-- Exercise 6: Glute Bridge
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
        'Glute Bridge',
        'Pont Fessier',
        'Lie on your back with knees bent, then squeeze your glutes to lift your hips into a straight line from knees to shoulders.',
        'Allongez-vous sur le dos genoux fléchis, puis contractez les fessiers pour lever les hanches en ligne droite des genoux aux épaules.',
        'Admin',
        'easy',
        'none',
        'strength',
        2,
        strftime('%s', 'now') * 1000,
        strftime('%s', 'now') * 1000
    );
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT e.id,
    'calf'
FROM `exercises` e
WHERE e.`enName` = 'Glute Bridge';
--> statement-breakpoint
-- Exercise 7: Standing Calf Raise
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
        'Standing Calf Raise',
        'Extension Mollets Debout',
        'Stand tall and slowly rise onto the balls of your feet, pause at the top, then lower your heels back down.',
        'Tenez-vous debout et montez lentement sur la pointe des pieds, marquez une pause, puis redescendez les talons.',
        'Admin',
        'easy',
        'none',
        'strength',
        1,
        strftime('%s', 'now') * 1000,
        strftime('%s', 'now') * 1000
    );
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT e.id,
    'calf'
FROM `exercises` e
WHERE e.`enName` = 'Standing Calf Raise';
--> statement-breakpoint
-- Exercise 8: Handstand Push-Up
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
        'Handstand Push-Up',
        'Pompe en Équilibre sur les Mains',
        'Kick up into a handstand against a wall, bend your elbows to lower your head toward the floor, then press back up.',
        'Montez en équilibre sur les mains contre un mur, pliez les coudes pour abaisser la tête vers le sol, puis repoussez pour remonter.',
        'Admin',
        'hard',
        'none',
        'calisthenics',
        5,
        strftime('%s', 'now') * 1000,
        strftime('%s', 'now') * 1000
    );
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT e.id,
    'shoulder'
FROM `exercises` e
WHERE e.`enName` = 'Handstand Push-Up'
UNION ALL
SELECT e.id,
    'arms'
FROM `exercises` e
WHERE e.`enName` = 'Handstand Push-Up';
--> statement-breakpoint
-- Exercise 9: Wall Push-Up
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
        'Wall Push-Up',
        'Pompe au Mur',
        'Stand an arm''s length from a wall, hands at shoulder height, and bend your elbows to bring your chest toward the wall before pushing back.',
        'Tenez-vous à une longueur de bras d''un mur, mains à hauteur d''épaules, pliez les coudes pour amener la poitrine vers le mur puis repoussez.',
        'Admin',
        'easy',
        'none',
        'strength',
        2,
        strftime('%s', 'now') * 1000,
        strftime('%s', 'now') * 1000
    );
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT e.id,
    'chest'
FROM `exercises` e
WHERE e.`enName` = 'Wall Push-Up'
UNION ALL
SELECT e.id,
    'arms'
FROM `exercises` e
WHERE e.`enName` = 'Wall Push-Up';
--> statement-breakpoint
-- Exercise 10: Flutter Kicks
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
        'Flutter Kicks',
        'Battements de Jambes',
        'Lie on your back with legs extended a few inches off the ground and alternate small up-and-down kicks.',
        'Allongez-vous sur le dos jambes tendues à quelques centimètres du sol et alternez de petits battements de jambes.',
        'Admin',
        'medium',
        'none',
        'calisthenics',
        1,
        strftime('%s', 'now') * 1000,
        strftime('%s', 'now') * 1000
    );
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT e.id,
    'abs'
FROM `exercises` e
WHERE e.`enName` = 'Flutter Kicks';
--> statement-breakpoint
-- Exercise 11: Inverted Row
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
        'Inverted Row',
        'Rowing Inversé',
        'Hang under a low bar with your body straight, pull your chest up to the bar by squeezing your shoulder blades, then lower with control.',
        'Suspendez-vous sous une barre basse le corps droit, tirez la poitrine vers la barre en rapprochant les omoplates, puis redescendez avec contrôle.',
        'Admin',
        'medium',
        'pullup_bar',
        'strength',
        3,
        strftime('%s', 'now') * 1000,
        strftime('%s', 'now') * 1000
    );
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT e.id,
    'back'
FROM `exercises` e
WHERE e.`enName` = 'Inverted Row'
UNION ALL
SELECT e.id,
    'arms'
FROM `exercises` e
WHERE e.`enName` = 'Inverted Row';
--> statement-breakpoint
-- Exercise 12: Dead Bug
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
        'Dead Bug',
        'Insecte Mort',
        'Lie on your back with arms up and knees bent at 90 degrees, then lower one arm and the opposite leg toward the floor before returning and switching sides.',
        'Allongez-vous sur le dos bras tendus vers le plafond et genoux à 90 degrés, puis abaissez un bras et la jambe opposée vers le sol avant de revenir et de changer de côté.',
        'Admin',
        'easy',
        'none',
        'calisthenics',
        2,
        strftime('%s', 'now') * 1000,
        strftime('%s', 'now') * 1000
    );
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT e.id,
    'abs'
FROM `exercises` e
WHERE e.`enName` = 'Dead Bug';
--> statement-breakpoint
-- Exercise 13: Hanging Leg Raise
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
        'Hanging Leg Raise',
        'Relevé de Jambes Suspendu',
        'Hang from a bar with arms extended and raise your straight legs in front of you until parallel to the ground, then lower with control.',
        'Suspendez-vous à une barre bras tendus et levez les jambes tendues devant vous jusqu''à l''horizontale, puis redescendez avec contrôle.',
        'Admin',
        'hard',
        'pullup_bar',
        'calisthenics',
        3,
        strftime('%s', 'now') * 1000,
        strftime('%s', 'now') * 1000
    );
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT e.id,
    'abs'
FROM `exercises` e
WHERE e.`enName` = 'Hanging Leg Raise';
--> statement-breakpoint
-- Exercise 14: Jump Squat
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
        'Jump Squat',
        'Squat Sauté',
        'Drop into a squat, then explode upward into a jump, landing softly back into the next squat.',
        'Descendez en squat, puis explosez vers le haut en sautant, et atterrissez en douceur pour enchaîner le squat suivant.',
        'Admin',
        'medium',
        'none',
        'cardio',
        2,
        strftime('%s', 'now') * 1000,
        strftime('%s', 'now') * 1000
    );
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT e.id,
    'calf'
FROM `exercises` e
WHERE e.`enName` = 'Jump Squat';
--> statement-breakpoint
-- Exercise 15: Reverse Crunch
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
        'Reverse Crunch',
        'Crunch Inversé',
        'Lie on your back with knees bent, then curl your hips off the floor to bring your knees toward your chest.',
        'Allongez-vous sur le dos genoux fléchis, puis enroulez les hanches en les décollant du sol pour ramener les genoux vers la poitrine.',
        'Admin',
        'medium',
        'none',
        'calisthenics',
        2,
        strftime('%s', 'now') * 1000,
        strftime('%s', 'now') * 1000
    );
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT e.id,
    'abs'
FROM `exercises` e
WHERE e.`enName` = 'Reverse Crunch';
--> statement-breakpoint
-- Exercise 16: Curtsy Squat
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
        'Curtsy Squat',
        'Squat Révérence',
        'Step one leg diagonally behind the other into a curtsy, bending both knees, then push through the front foot to stand back up.',
        'Faites un pas en diagonale vers l''arrière comme une révérence, fléchissez les deux genoux, puis poussez sur le pied avant pour vous relever.',
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
SELECT e.id,
    'calf'
FROM `exercises` e
WHERE e.`enName` = 'Curtsy Squat';
--> statement-breakpoint
-- Exercise 17: Scapular Pull-Up
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
        'Scapular Pull-Up',
        'Traction Scapulaire',
        'Hang from a bar with arms straight and, without bending your elbows, pull your shoulder blades down and together to lift your body slightly.',
        'Suspendez-vous à une barre bras tendus et, sans plier les coudes, tirez les omoplates vers le bas et l''une vers l''autre pour soulever légèrement le corps.',
        'Admin',
        'medium',
        'pullup_bar',
        'calisthenics',
        2,
        strftime('%s', 'now') * 1000,
        strftime('%s', 'now') * 1000
    );
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT e.id,
    'back'
FROM `exercises` e
WHERE e.`enName` = 'Scapular Pull-Up';
--> statement-breakpoint
-- Exercise 18: L-Sit
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
        'L-Sit',
        'L-Sit',
        'Sit with legs extended, press your hands into the floor beside your hips and lift your legs to form an L shape, then hold.',
        'Assis jambes tendues, poussez sur les mains posées à côté des hanches et levez les jambes pour former un L, puis maintenez la position.',
        'Admin',
        'hard',
        'none',
        'calisthenics',
        1,
        strftime('%s', 'now') * 1000,
        strftime('%s', 'now') * 1000
    );
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT e.id,
    'abs'
FROM `exercises` e
WHERE e.`enName` = 'L-Sit'
UNION ALL
SELECT e.id,
    'arms'
FROM `exercises` e
WHERE e.`enName` = 'L-Sit';
--> statement-breakpoint
-- Exercise 19: Star Jump
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
        'Star Jump',
        'Saut en Étoile',
        'Jump up explosively while spreading your arms and legs out into a star shape, then land softly and repeat.',
        'Sautez de façon explosive en écartant bras et jambes pour former une étoile, puis atterrissez en douceur et recommencez.',
        'Admin',
        'easy',
        'none',
        'cardio',
        1,
        strftime('%s', 'now') * 1000,
        strftime('%s', 'now') * 1000
    );
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT e.id,
    'calf'
FROM `exercises` e
WHERE e.`enName` = 'Star Jump'
UNION ALL
SELECT e.id,
    'shoulder'
FROM `exercises` e
WHERE e.`enName` = 'Star Jump';
--> statement-breakpoint
-- Exercise 20: Windshield Wipers
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
        'Windshield Wipers',
        'Essuie-Glaces',
        'Lie on your back with arms out to the sides and legs lifted together, then rotate your legs side to side like windshield wipers using your core.',
        'Allongez-vous sur le dos bras écartés et jambes levées jointes, puis faites pivoter les jambes d''un côté à l''autre comme des essuie-glaces en utilisant la sangle abdominale.',
        'Admin',
        'hard',
        'none',
        'calisthenics',
        2,
        strftime('%s', 'now') * 1000,
        strftime('%s', 'now') * 1000
    );
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT e.id,
    'abs'
FROM `exercises` e
WHERE e.`enName` = 'Windshield Wipers';
