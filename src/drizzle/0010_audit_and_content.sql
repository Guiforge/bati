-- ============================================================
-- BATI DATABASE AUDIT & IMPROVEMENT MIGRATION
-- Migration 0010: Audit Corrections + New Content
-- ============================================================
-- ============================================================
-- PART 1: AUDIT CORRECTIONS
-- ============================================================
-- 1.1 FIX: Squat muscle assignment (was incorrectly using 'chest' instead of proper leg muscles)
DELETE FROM `exercise_muscles`
WHERE `exerciseId` = (
        SELECT `id`
        FROM `exercises`
        WHERE `enName` = 'Squat'
    )
    AND `muscle` = 'chest';
--> statement-breakpoint
-- Add correct muscle groups for Squat
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT `id`,
    'abs'
FROM `exercises`
WHERE `enName` = 'Squat';
--> statement-breakpoint
-- 1.2 FIX: Wall Sit muscle assignment (was incorrectly using 'chest' instead of abs)
DELETE FROM `exercise_muscles`
WHERE `exerciseId` = (
        SELECT `id`
        FROM `exercises`
        WHERE `enName` = 'Wall Sit'
    )
    AND `muscle` = 'chest';
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT `id`,
    'abs'
FROM `exercises`
WHERE `enName` = 'Wall Sit';
--> statement-breakpoint
-- 1.3 FIX: Enhance basic exercise descriptions with safety instructions
UPDATE `exercises`
SET `enDescription` = 'Stand with feet shoulder-width apart and lower your body as if sitting in a chair. Keep your knees aligned with your toes, back straight, and weight on your heels. Descend until thighs are parallel to the ground.',
    `frDescription` = 'Tenez-vous debout, pieds écartés à largeur d''épaules, et descendez comme pour vous asseoir. Gardez les genoux alignés avec les orteils, le dos droit et le poids sur les talons. Descendez jusqu''à ce que les cuisses soient parallèles au sol.'
WHERE `enName` = 'Squat';
--> statement-breakpoint
UPDATE `exercises`
SET `enDescription` = 'Start in a plank position with hands slightly wider than shoulders. Lower your body until chest nearly touches the floor, keeping your core tight and body in a straight line. Push back up explosively. Avoid sagging hips or flaring elbows.',
    `frDescription` = 'Commencez en position de planche avec les mains légèrement plus larges que les épaules. Descendez jusqu''à ce que la poitrine touche presque le sol, en gardant les abdos contractés et le corps aligné. Poussez vers le haut de façon explosive. Évitez de laisser tomber les hanches ou d''écarter les coudes.'
WHERE `enName` = 'Push-ups';
--> statement-breakpoint
UPDATE `exercises`
SET `enDescription` = 'Hang from a bar with arms fully extended, palms facing away. Pull yourself up until your chin clears the bar, engaging your back and biceps. Lower with control. Avoid swinging or kipping movements for strict form.',
    `frDescription` = 'Suspendez-vous à une barre avec les bras complètement tendus, paumes vers l''extérieur. Tirez-vous jusqu''à ce que le menton dépasse la barre, en engageant le dos et les biceps. Descendez avec contrôle. Évitez les balancements pour une forme stricte.'
WHERE `enName` = 'Pull-ups';
--> statement-breakpoint
UPDATE `exercises`
SET `enDescription` = 'Hold a push-up position with forearms on the ground, body forming a straight line from head to heels. Engage your core, squeeze glutes, and avoid letting hips sag or pike upward. Breathe steadily throughout.',
    `frDescription` = 'Maintenez une position de pompe avec les avant-bras au sol, le corps formant une ligne droite de la tête aux talons. Engagez les abdos, serrez les fessiers et évitez de laisser les hanches s''affaisser ou monter. Respirez régulièrement.'
WHERE `enName` = 'Plank';
--> statement-breakpoint
UPDATE `exercises`
SET `enDescription` = 'Slide your back down a wall until thighs are parallel to the ground, forming a 90-degree angle at the knees. Keep your back flat against the wall and weight distributed evenly. Hold the position without letting knees extend past toes.',
    `frDescription` = 'Glissez le dos contre un mur jusqu''à ce que les cuisses soient parallèles au sol, formant un angle de 90 degrés aux genoux. Gardez le dos plat contre le mur et le poids réparti uniformément. Maintenez la position sans laisser les genoux dépasser les orteils.'
WHERE `enName` = 'Wall Sit';
--> statement-breakpoint
UPDATE `exercises`
SET `enDescription` = 'Lie on your back with knees bent and feet flat on the floor. Place hands behind your head or crossed on chest. Curl your shoulders toward your pelvis, engaging the upper abs. Lower with control without pulling on your neck.',
    `frDescription` = 'Allongez-vous sur le dos avec les genoux pliés et les pieds à plat sur le sol. Placez les mains derrière la tête ou croisées sur la poitrine. Soulevez les épaules vers le bassin en engageant les abdos supérieurs. Descendez avec contrôle sans tirer sur le cou.'
WHERE `enName` = 'Crunch';
--> statement-breakpoint
-- 1.4 FIX: Update quest descriptions to be more immersive and scenario-driven
UPDATE `quests`
SET `enDescription` = 'The winter wind howls through the village. Families shiver in their homes. You grab your axe and head to the ancient forest. Each swing brings warmth to those who depend on you. Chop clean, chop steady, be the hero who defeats the cold.',
    `frDescription` = 'Le vent d''hiver hurle à travers le village. Les familles frissonnent dans leurs maisons. Tu saisis ta hache et te diriges vers la forêt ancienne. Chaque coup apporte de la chaleur à ceux qui comptent sur toi. Coupe net, coupe régulièrement, sois le héros qui vainc le froid.'
WHERE `enTitle` = 'Chop Wood';
--> statement-breakpoint
UPDATE `quests`
SET `enDescription` = 'The beacon has been lit atop the ancient tower. Dark forces approach, and only you can reach the signal before dawn. Each floor tests your resolve with narrow stairs and crumbling stone. Climb higher. The realm depends on your strength.',
    `frDescription` = 'Le signal a été allumé au sommet de la tour ancienne. Des forces obscures approchent, et toi seul peux atteindre le signal avant l''aube. Chaque étage teste ta détermination avec des escaliers étroits et de la pierre qui s''effrite. Monte plus haut. Le royaume dépend de ta force.'
WHERE `enTitle` = 'Tower Climb';
--> statement-breakpoint
UPDATE `quests`
SET `enDescription` = 'Dawn breaks over the training grounds. The Knight Commander watches from the ramparts. Today you prove your worth with push and power. Each rep is a strike against weakness. Rise like steel forged in fire.',
    `frDescription` = 'L''aube se lève sur les terrains d''entraînement. Le Commandant des Chevaliers observe depuis les remparts. Aujourd''hui tu prouves ta valeur avec poussée et puissance. Chaque répétition est un coup contre la faiblesse. Élève-toi comme l''acier forgé dans le feu.'
WHERE `enTitle` = 'Knight Push';
--> statement-breakpoint
UPDATE `quests`
SET `enDescription` = 'The enemy cavalry charges across the plains. You and your shield-brothers form the last defense. Your core must become an unbreakable wall of muscle. Hold the line. If you fall, the kingdom falls with you.',
    `frDescription` = 'La cavalerie ennemie charge à travers les plaines. Toi et tes frères d''armes formez la dernière défense. Ton tronc doit devenir un mur de muscles incassable. Tiens la ligne. Si tu tombes, le royaume tombe avec toi.'
WHERE `enTitle` = 'Shield Wall';
--> statement-breakpoint
UPDATE `quests`
SET `enDescription` = 'The village forge burns cold without proper stone. The quarry lies beyond the valley, and each boulder is a test of will. Squat deep, lift true, and carry the future of your people on your back.',
    `frDescription` = 'La forge du village reste froide sans pierres appropriées. La carrière se trouve au-delà de la vallée, et chaque rocher est un test de volonté. Accroupis-toi profondément, soulève avec précision, et porte l''avenir de ton peuple sur ton dos.'
WHERE `enTitle` = 'Gather Stones';
--> statement-breakpoint
UPDATE `quests`
SET `enDescription` = 'The refugees have arrived. They need shelter before the storm breaks. Wooden beams must be raised, walls must be pushed into place. Your arms become the cranes, your legs the foundations. Build or perish.',
    `frDescription` = 'Les réfugiés sont arrivés. Ils ont besoin d''un abri avant que la tempête n''éclate. Les poutres en bois doivent être levées, les murs doivent être mis en place. Tes bras deviennent les grues, tes jambes les fondations. Construis ou péris.'
WHERE `enTitle` = 'Raise the Shelter';
--> statement-breakpoint
UPDATE `quests`
SET `enDescription` = 'Deep in the mountain forge, the legendary smith awaits. To earn your weapon, you must prove your body is worthy of the blade. Planks that test patience, crunches that forge steel abs. Only the strongest leave with a forged core.',
    `frDescription` = 'Au fond de la forge de la montagne, le forgeron légendaire attend. Pour mériter ton arme, tu dois prouver que ton corps est digne de la lame. Des planches qui testent la patience, des crunchs qui forgent des abdos d''acier. Seuls les plus forts repartent avec un tronc forgé.'
WHERE `enTitle` = 'Core Forge';
--> statement-breakpoint
UPDATE `quests`
SET `enDescription` = 'The stone giant awakens from its thousand-year slumber. Its fists are boulders, its skin is granite. You must strike first and strike hard. Push-ups that channel fury, squats that anchor your stance. Hit the golem before it hits you.',
    `frDescription` = 'Le géant de pierre s''éveille de son sommeil millénaire. Ses poings sont des rochers, sa peau est du granit. Tu dois frapper en premier et frapper fort. Des pompes qui canalisent la fureur, des squats qui ancrent ta position. Frappe le golem avant qu''il ne te frappe.'
WHERE `enTitle` = 'Golem Strike';
--> statement-breakpoint
UPDATE `quests`
SET `enDescription` = 'The golem staggers but does not fall. You''ve found its weakness: the glowing rune at its center. Hold your ground, maintain your core, and strike where it burns brightest. This is the final blow. Make it count.',
    `frDescription` = 'Le golem chancelle mais ne tombe pas. Tu as trouvé sa faiblesse : la rune brillante en son centre. Tiens bon, maintiens ton tronc, et frappe là où ça brille le plus. C''est le coup final. Fais-le compter.'
WHERE `enTitle` = 'Golem Core';
--> statement-breakpoint
-- 1.5 FIX: Add missing narrative content to adventure steps
UPDATE `adventure_steps`
SET `enNarrative` = 'The shadows are watching. Your heartbeat echoes in the darkness. Run!',
    `frNarrative` = 'Les ombres observent. Ton cœur bat dans l''obscurité. Cours!'
WHERE `adventureId` = (
        SELECT `id`
        FROM `adventures`
        WHERE `enTitle` = 'The Scout''s Trial'
    )
    AND `stepIndex` = 0;
--> statement-breakpoint
UPDATE `adventure_steps`
SET `enNarrative` = 'They''re getting closer. Faster now. Don''t look back.',
    `frNarrative` = 'Ils se rapprochent. Plus vite maintenant. Ne regarde pas en arrière.'
WHERE `adventureId` = (
        SELECT `id`
        FROM `adventures`
        WHERE `enTitle` = 'The Scout''s Trial'
    )
    AND `stepIndex` = 1;
--> statement-breakpoint
UPDATE `adventure_steps`
SET `enNarrative` = 'Light ahead! The mine exit glimmers. Just a bit more!',
    `frNarrative` = 'De la lumière devant! La sortie de la mine scintille. Encore un peu!'
WHERE `adventureId` = (
        SELECT `id`
        FROM `adventures`
        WHERE `enTitle` = 'The Scout''s Trial'
    )
    AND `stepIndex` = 2;
--> statement-breakpoint
UPDATE `adventure_steps`
SET `enNarrative` = 'You made it. But the mission isn''t over. Keep moving.',
    `frNarrative` = 'Tu as réussi. Mais la mission n''est pas terminée. Continue d''avancer.'
WHERE `adventureId` = (
        SELECT `id`
        FROM `adventures`
        WHERE `enTitle` = 'The Scout''s Trial'
    )
    AND `stepIndex` = 3;
--> statement-breakpoint
UPDATE `adventure_steps`
SET `enNarrative` = 'Final sprint. Prove you deserve the scout''s badge.',
    `frNarrative` = 'Sprint final. Prouve que tu mérites l''insigne de l''éclaireur.',
    `enOutroNarrative` = 'You emerge from the shadows, heart pounding but unbroken. The Scout Master nods. You have earned your place.',
    `frOutroNarrative` = 'Tu émerges des ombres, le cœur battant mais intact. Le Maître Éclaireur hoche la tête. Tu as gagné ta place.'
WHERE `adventureId` = (
        SELECT `id`
        FROM `adventures`
        WHERE `enTitle` = 'The Scout''s Trial'
    )
    AND `stepIndex` = 4;
--> statement-breakpoint
UPDATE `adventure_steps`
SET `enNarrative` = 'The fortress gate looms. Enemies approach. Take your position.',
    `frNarrative` = 'La porte de la forteresse se profile. Les ennemis approchent. Prends position.'
WHERE `adventureId` = (
        SELECT `id`
        FROM `adventures`
        WHERE `enTitle` = 'The Guardian''s Oath'
    )
    AND `stepIndex` = 0;
--> statement-breakpoint
UPDATE `adventure_steps`
SET `enNarrative` = 'Reinforcements need time. Build the barricades!',
    `frNarrative` = 'Les renforts ont besoin de temps. Construis les barricades!'
WHERE `adventureId` = (
        SELECT `id`
        FROM `adventures`
        WHERE `enTitle` = 'The Guardian''s Oath'
    )
    AND `stepIndex` = 1;
--> statement-breakpoint
UPDATE `adventure_steps`
SET `enNarrative` = 'The watchtower must be secured. Climb now!',
    `frNarrative` = 'La tour de guet doit être sécurisée. Grimpe maintenant!'
WHERE `adventureId` = (
        SELECT `id`
        FROM `adventures`
        WHERE `enTitle` = 'The Guardian''s Oath'
    )
    AND `stepIndex` = 2;
--> statement-breakpoint
UPDATE `adventure_steps`
SET `enNarrative` = 'They breach the outer wall! Hold them back!',
    `frNarrative` = 'Ils percent le mur extérieur! Retiens-les!'
WHERE `adventureId` = (
        SELECT `id`
        FROM `adventures`
        WHERE `enTitle` = 'The Guardian''s Oath'
    )
    AND `stepIndex` = 3;
--> statement-breakpoint
UPDATE `adventure_steps`
SET `enNarrative` = 'The arcane seal must be activated. Channel your energy!',
    `frNarrative` = 'Le sceau arcanique doit être activé. Canalise ton énergie!'
WHERE `adventureId` = (
        SELECT `id`
        FROM `adventures`
        WHERE `enTitle` = 'The Guardian''s Oath'
    )
    AND `stepIndex` = 4;
--> statement-breakpoint
UPDATE `adventure_steps`
SET `enNarrative` = 'Final stand. The gate holds or falls with you.',
    `frNarrative` = 'Dernier stand. La porte tient ou tombe avec toi.',
    `enOutroNarrative` = 'Dawn breaks over the fortress. The enemy retreats. Your oath fulfilled, you stand as a true Guardian.',
    `frOutroNarrative` = 'L''aube se lève sur la forteresse. L''ennemi bat en retraite. Ton serment accompli, tu te tiens en vrai Gardien.'
WHERE `adventureId` = (
        SELECT `id`
        FROM `adventures`
        WHERE `enTitle` = 'The Guardian''s Oath'
    )
    AND `stepIndex` = 5;
--> statement-breakpoint
UPDATE `adventure_steps`
SET `enNarrative` = 'The ancient path begins. Breathe deep, find your center.',
    `frNarrative` = 'Le chemin ancien commence. Respire profondément, trouve ton centre.'
WHERE `adventureId` = (
        SELECT `id`
        FROM `adventures`
        WHERE `enTitle` = 'The Monk''s Enlightenment'
    )
    AND `stepIndex` = 0;
--> statement-breakpoint
UPDATE `adventure_steps`
SET `enNarrative` = 'The arcane energies test your core. Channel them.',
    `frNarrative` = 'Les énergies arcaniques testent ton tronc. Canalise-les.'
WHERE `adventureId` = (
        SELECT `id`
        FROM `adventures`
        WHERE `enTitle` = 'The Monk''s Enlightenment'
    )
    AND `stepIndex` = 1;
--> statement-breakpoint
UPDATE `adventure_steps`
SET `enNarrative` = 'Return to nature. Let the forest restore you.',
    `frNarrative` = 'Retourne à la nature. Laisse la forêt te restaurer.'
WHERE `adventureId` = (
        SELECT `id`
        FROM `adventures`
        WHERE `enTitle` = 'The Monk''s Enlightenment'
    )
    AND `stepIndex` = 2;
--> statement-breakpoint
UPDATE `adventure_steps`
SET `enNarrative` = 'Final trial. Balance body, mind, and spirit.',
    `frNarrative` = 'Épreuve finale. Équilibre corps, esprit et âme.',
    `enOutroNarrative` = 'Light surrounds you. The monastery bells ring in the distance. You have achieved enlightenment.',
    `frOutroNarrative` = 'La lumière t''entoure. Les cloches du monastère sonnent au loin. Tu as atteint l''illumination.'
WHERE `adventureId` = (
        SELECT `id`
        FROM `adventures`
        WHERE `enTitle` = 'The Monk''s Enlightenment'
    )
    AND `stepIndex` = 3;
--> statement-breakpoint
-- ============================================================
-- PART 2: NEW EXERCISES (5 Loaded Carry / Port Exercises)
-- ============================================================
-- Exercise 1: Farmer's Stone Carry
INSERT INTO `exercises` (
        `enName`,
        `frName`,
        `enDescription`,
        `frDescription`,
        `imagePath`,
        `creator`,
        `difficulty`,
        `equipment`,
        `style`,
        `secondsPerRep`,
        `createdAt`,
        `updatedAt`
    )
VALUES (
        'Farmer''s Stone Carry',
        'Port de Pierres du Fermier',
        'Grip heavy imaginary stones at your sides and walk with controlled steps. Keep shoulders back, core braced, and take steady breaths. This foundational carry builds grip strength, traps, and full-body stability. Safety: maintain neutral spine, avoid shrugging shoulders.',
        'Saisissez des pierres imaginaires lourdes à vos côtés et marchez à pas contrôlés. Gardez les épaules en arrière, les abdos gainés, et respirez régulièrement. Ce port fondamental développe la force de préhension, les trapèzes et la stabilité du corps entier. Sécurité : maintenez la colonne vertébrale neutre, évitez de hausser les épaules.',
        'assets/images/exercises/farmer_stone_carry.png',
        'Admin',
        'medium',
        'weighted_bag',
        'strength',
        1,
        strftime('%s', 'now') * 1000,
        strftime('%s', 'now') * 1000
    );
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT e.id,
    'back'
FROM `exercises` e
WHERE e.`enName` = 'Farmer''s Stone Carry';
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT e.id,
    'abs'
FROM `exercises` e
WHERE e.`enName` = 'Farmer''s Stone Carry';
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT e.id,
    'shoulder'
FROM `exercises` e
WHERE e.`enName` = 'Farmer''s Stone Carry';
--> statement-breakpoint
-- Exercise 2: Goblet Hold March
INSERT INTO `exercises` (
        `enName`,
        `frName`,
        `enDescription`,
        `frDescription`,
        `imagePath`,
        `creator`,
        `difficulty`,
        `equipment`,
        `style`,
        `secondsPerRep`,
        `createdAt`,
        `updatedAt`
    )
VALUES (
        'Goblet Hold March',
        'Marche en Position Goblet',
        'Hold an imaginary goblet or weighted bag at chest height, elbows tucked. March in place with high knees while maintaining the load position. Engages core stabilizers, shoulders, and legs simultaneously. Safety: keep the weight close to your body center, avoid rounding upper back.',
        'Tenez un gobelet imaginaire ou un sac lesté à hauteur de poitrine, coudes rentrés. Marchez sur place avec les genoux hauts tout en maintenant la charge. Engage les stabilisateurs du tronc, les épaules et les jambes simultanément. Sécurité : gardez le poids près du centre du corps, évitez d''arrondir le haut du dos.',
        'assets/images/exercises/goblet_hold_march.png',
        'Admin',
        'easy',
        'weighted_bag',
        'cardio',
        1,
        strftime('%s', 'now') * 1000,
        strftime('%s', 'now') * 1000
    );
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT e.id,
    'shoulder'
FROM `exercises` e
WHERE e.`enName` = 'Goblet Hold March';
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT e.id,
    'abs'
FROM `exercises` e
WHERE e.`enName` = 'Goblet Hold March';
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT e.id,
    'calf'
FROM `exercises` e
WHERE e.`enName` = 'Goblet Hold March';
--> statement-breakpoint
-- Exercise 3: Overhead Burden Walk
INSERT INTO `exercises` (
        `enName`,
        `frName`,
        `enDescription`,
        `frDescription`,
        `imagePath`,
        `creator`,
        `difficulty`,
        `equipment`,
        `style`,
        `secondsPerRep`,
        `createdAt`,
        `updatedAt`
    )
VALUES (
        'Overhead Burden Walk',
        'Marche avec Charge au-dessus de la Tête',
        'Press your load overhead and walk forward with controlled, deliberate steps. Keep arms locked, core braced, and avoid arching lower back excessively. This advanced carry builds tremendous shoulder stability and full-body coordination. Safety: start light, focus on shoulder stability before adding distance.',
        'Poussez votre charge au-dessus de la tête et avancez avec des pas contrôlés et délibérés. Gardez les bras verrouillés, les abdos gainés, et évitez de cambrer excessivement le bas du dos. Ce port avancé développe une stabilité d''épaule extraordinaire et une coordination du corps entier. Sécurité : commencez léger, concentrez-vous sur la stabilité des épaules avant d''ajouter de la distance.',
        'assets/images/exercises/overhead_burden_walk.png',
        'Admin',
        'hard',
        'weighted_bag',
        'strength',
        1,
        strftime('%s', 'now') * 1000,
        strftime('%s', 'now') * 1000
    );
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT e.id,
    'shoulder'
FROM `exercises` e
WHERE e.`enName` = 'Overhead Burden Walk';
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT e.id,
    'abs'
FROM `exercises` e
WHERE e.`enName` = 'Overhead Burden Walk';
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT e.id,
    'arms'
FROM `exercises` e
WHERE e.`enName` = 'Overhead Burden Walk';
--> statement-breakpoint
-- Exercise 4: Bear Hug Carry
INSERT INTO `exercises` (
        `enName`,
        `frName`,
        `enDescription`,
        `frDescription`,
        `imagePath`,
        `creator`,
        `difficulty`,
        `equipment`,
        `style`,
        `secondsPerRep`,
        `createdAt`,
        `updatedAt`
    )
VALUES (
        'Bear Hug Carry',
        'Port en Étreinte d''Ours',
        'Wrap your arms around an imaginary sandbag or boulder at chest height, squeezing tight. Walk forward while maintaining the crushing grip. Engages chest, biceps, and core as primary movers. Safety: keep hips under shoulders, breathe into your belly rather than chest.',
        'Enroulez vos bras autour d''un sac de sable ou d''un rocher imaginaire à hauteur de poitrine, en serrant fort. Avancez tout en maintenant la prise écrasante. Engage la poitrine, les biceps et les abdos comme muscles principaux. Sécurité : gardez les hanches sous les épaules, respirez dans le ventre plutôt que dans la poitrine.',
        'assets/images/exercises/bear_hug_carry.png',
        'Admin',
        'medium',
        'weighted_bag',
        'strength',
        1,
        strftime('%s', 'now') * 1000,
        strftime('%s', 'now') * 1000
    );
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT e.id,
    'chest'
FROM `exercises` e
WHERE e.`enName` = 'Bear Hug Carry';
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT e.id,
    'arms'
FROM `exercises` e
WHERE e.`enName` = 'Bear Hug Carry';
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT e.id,
    'abs'
FROM `exercises` e
WHERE e.`enName` = 'Bear Hug Carry';
--> statement-breakpoint
-- Exercise 5: Sandbag Shouldering
INSERT INTO `exercises` (
        `enName`,
        `frName`,
        `enDescription`,
        `frDescription`,
        `imagePath`,
        `creator`,
        `difficulty`,
        `equipment`,
        `style`,
        `secondsPerRep`,
        `createdAt`,
        `updatedAt`
    )
VALUES (
        'Sandbag Shouldering',
        'Épaulé de Sac Lesté',
        'From standing, squat down to grip an imaginary sandbag, then explosively stand and pull it onto one shoulder. Alternate shoulders each rep. This functional movement builds power, grip, and real-world strength. Safety: lead with hips, keep bag close to body, brace core before lift.',
        'Depuis la position debout, accroupissez-vous pour saisir un sac de sable imaginaire, puis levez-vous explosivitement et tirez-le sur une épaule. Alternez les épaules à chaque répétition. Ce mouvement fonctionnel développe la puissance, la préhension et la force réelle. Sécurité : menez avec les hanches, gardez le sac près du corps, gainez les abdos avant de soulever.',
        'assets/images/exercises/sandbag_shouldering.png',
        'Admin',
        'hard',
        'weighted_bag',
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
WHERE e.`enName` = 'Sandbag Shouldering';
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT e.id,
    'shoulder'
FROM `exercises` e
WHERE e.`enName` = 'Sandbag Shouldering';
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT e.id,
    'calf'
FROM `exercises` e
WHERE e.`enName` = 'Sandbag Shouldering';
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT e.id,
    'abs'
FROM `exercises` e
WHERE e.`enName` = 'Sandbag Shouldering';
--> statement-breakpoint
-- ============================================================
-- PART 3: NEW QUESTS (2 Quests - Force + Endurance)
-- ============================================================
-- Quest 1: Le Port des Pierres Sacrées (Force)
INSERT INTO `quests` (
        `enTitle`,
        `frTitle`,
        `enDescription`,
        `frDescription`,
        `author`,
        `rounds`,
        `restSeconds`,
        `primaryMuscle`,
        `secondaryMuscles`,
        `estimatedMinutes`,
        `difficulty`,
        `createdAt`,
        `updatedAt`
    )
VALUES (
        'Carry the Sacred Stones',
        'Le Port des Pierres Sacrées',
        'The ancient temple lies in ruins. The elders speak of sacred stones scattered across the valley that must be returned to rebuild the shrine. Each stone weighs like the burden of generations. Carry them with honor, carry them with strength. The ancestors watch your every step.',
        'Le temple ancien est en ruines. Les anciens parlent de pierres sacrées dispersées dans la vallée qui doivent être rapportées pour reconstruire le sanctuaire. Chaque pierre pèse comme le fardeau des générations. Porte-les avec honneur, porte-les avec force. Les ancêtres observent chacun de tes pas.',
        'Admin',
        3,
        60,
        'back',
        '["shoulder", "abs", "calf"]',
        20,
        'Intermediate',
        strftime('%s', 'now') * 1000,
        strftime('%s', 'now') * 1000
    );
--> statement-breakpoint
-- Quest 1 Exercises
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
    45,
    60,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Farmer''s Stone Carry'
WHERE q.`enTitle` = 'Carry the Sacred Stones';
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
    8,
    12,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Sandbag Shouldering'
WHERE q.`enTitle` = 'Carry the Sacred Stones';
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
    2,
    'time',
    30,
    45,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Bear Hug Carry'
WHERE q.`enTitle` = 'Carry the Sacred Stones';
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
    3,
    'time',
    45,
    60,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Stone Guardian Plank'
WHERE q.`enTitle` = 'Carry the Sacred Stones';
--> statement-breakpoint
-- Quest 2: La Course contre la Marée (Endurance)
INSERT INTO `quests` (
        `enTitle`,
        `frTitle`,
        `enDescription`,
        `frDescription`,
        `author`,
        `rounds`,
        `restSeconds`,
        `primaryMuscle`,
        `secondaryMuscles`,
        `estimatedMinutes`,
        `difficulty`,
        `createdAt`,
        `updatedAt`
    )
VALUES (
        'Race Against the Tide',
        'La Course contre la Marée',
        'The warning horns blare across the coastal village. The tide rises faster than any elder can remember. You must carry supplies to higher ground before the waters consume everything. Your weighted pack holds the village''s winter provisions. Run, carry, survive. The sea shows no mercy to the slow.',
        'Les cors d''alerte résonnent à travers le village côtier. La marée monte plus vite que tout ce dont les anciens se souviennent. Tu dois porter les provisions vers les hauteurs avant que les eaux n''engloutissent tout. Ton sac lesté contient les provisions d''hiver du village. Cours, porte, survis. La mer ne montre aucune pitié aux lents.',
        'Admin',
        4,
        45,
        'calf',
        '["abs", "shoulder", "back"]',
        25,
        'Advanced',
        strftime('%s', 'now') * 1000,
        strftime('%s', 'now') * 1000
    );
--> statement-breakpoint
-- Quest 2 Exercises
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
    60,
    90,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Goblet Hold March'
WHERE q.`enTitle` = 'Race Against the Tide';
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
    40,
    60,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Paladin''s High Knee'
WHERE q.`enTitle` = 'Race Against the Tide';
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
    2,
    'time',
    45,
    60,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Farmer''s Stone Carry'
WHERE q.`enTitle` = 'Race Against the Tide';
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
    3,
    'reps',
    10,
    15,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Berserker Burpee'
WHERE q.`enTitle` = 'Race Against the Tide';
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
    4,
    'time',
    30,
    45,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Overhead Burden Walk'
WHERE q.`enTitle` = 'Race Against the Tide';
--> statement-breakpoint
-- ============================================================
-- PART 4: NEW ADVENTURE (Mountain Survival Campaign)
-- ============================================================
-- Quest 3: Mountain Summit Push (for the adventure)
INSERT INTO `quests` (
        `enTitle`,
        `frTitle`,
        `enDescription`,
        `frDescription`,
        `author`,
        `rounds`,
        `restSeconds`,
        `primaryMuscle`,
        `secondaryMuscles`,
        `estimatedMinutes`,
        `difficulty`,
        `createdAt`,
        `updatedAt`
    )
VALUES (
        'Mountain Summit Push',
        'L''Ascension du Sommet',
        'The refuge lies just beyond the peak. Thin air burns your lungs, but stopping means freezing. Your pack grows heavier with each step. The mountain tests those who dare climb. Push through the pain, push toward survival.',
        'Le refuge se trouve juste au-delà du sommet. L''air mince brûle tes poumons, mais s''arrêter signifie geler. Ton sac devient plus lourd à chaque pas. La montagne teste ceux qui osent grimper. Pousse à travers la douleur, pousse vers la survie.',
        'Admin',
        3,
        60,
        'shoulder',
        '["abs", "back", "calf"]',
        18,
        'Advanced',
        strftime('%s', 'now') * 1000,
        strftime('%s', 'now') * 1000
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
    45,
    60,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Overhead Burden Walk'
WHERE q.`enTitle` = 'Mountain Summit Push';
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
    8,
    12,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Archer''s Pike Push-up'
WHERE q.`enTitle` = 'Mountain Summit Push';
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
    2,
    'time',
    30,
    45,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Monk''s Mountain Climber'
WHERE q.`enTitle` = 'Mountain Summit Push';
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
    3,
    'time',
    45,
    60,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Stone Guardian Plank'
WHERE q.`enTitle` = 'Mountain Summit Push';
--> statement-breakpoint
-- Adventure: Survive the Mountain
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
        `bossTotalHp`,
        `bossWeaknessMuscle`,
        `bossResistanceMuscle`,
        `imagePath`,
        `createdAt`,
        `updatedAt`
    )
VALUES (
        (
            SELECT id
            FROM `quests`
            WHERE `enTitle` = 'Carry the Sacred Stones'
        ),
        'Survive the Mountain',
        'Survivre en Montagne',
        'A blizzard descends upon the mountain pass. The refuge lies three valleys away, and your pack holds everything you need to survive. Carry your equipment through treacherous terrain, race the setting sun, and push through the final ascent. Only the strong reach shelter.',
        'Une tempête de neige s''abat sur le col de montagne. Le refuge se trouve à trois vallées de distance, et ton sac contient tout ce dont tu as besoin pour survivre. Porte ton équipement à travers un terrain traître, course le soleil couchant, et pousse à travers l''ascension finale. Seuls les forts atteignent l''abri.',
        'Admin',
        10,
        'campaign',
        1,
        NULL,
        NULL,
        NULL,
        'assets/images/adventures/survive_mountain.jpg',
        strftime('%s', 'now') * 1000,
        strftime('%s', 'now') * 1000
    );
--> statement-breakpoint
-- Adventure Steps
INSERT INTO `adventure_steps` (
        `adventureId`,
        `stepIndex`,
        `questId`,
        `enNarrative`,
        `frNarrative`,
        `enOutroNarrative`,
        `frOutroNarrative`,
        `createdAt`,
        `updatedAt`
    )
SELECT a.id,
    0,
    q.id,
    'The storm breaks. You shoulder your pack and begin the descent into the first valley. Every stone you carry brings survival closer.',
    'La tempête éclate. Tu mets ton sac sur l''épaule et commences la descente dans la première vallée. Chaque pierre que tu portes rapproche la survie.',
    'The first valley conquered. Your shoulders burn, but the next challenge awaits.',
    'La première vallée conquise. Tes épaules brûlent, mais le prochain défi attend.',
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000
FROM `adventures` a
    JOIN `quests` q ON q.`enTitle` = 'Carry the Sacred Stones'
WHERE a.`enTitle` = 'Survive the Mountain';
--> statement-breakpoint
INSERT INTO `adventure_steps` (
        `adventureId`,
        `stepIndex`,
        `questId`,
        `enNarrative`,
        `frNarrative`,
        `enOutroNarrative`,
        `frOutroNarrative`,
        `createdAt`,
        `updatedAt`
    )
SELECT a.id,
    1,
    q.id,
    'A river cuts across your path. The water rises fast. Run! Carry your supplies to higher ground before they''re lost to the flood.',
    'Une rivière coupe ton chemin. L''eau monte vite. Cours! Porte tes provisions vers les hauteurs avant qu''elles ne soient perdues dans l''inondation.',
    'You made it across. Soaked but alive. Keep moving before hypothermia sets in.',
    'Tu as traversé. Trempé mais vivant. Continue d''avancer avant que l''hypothermie ne s''installe.',
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000
FROM `adventures` a
    JOIN `quests` q ON q.`enTitle` = 'Race Against the Tide'
WHERE a.`enTitle` = 'Survive the Mountain';
--> statement-breakpoint
INSERT INTO `adventure_steps` (
        `adventureId`,
        `stepIndex`,
        `questId`,
        `enNarrative`,
        `frNarrative`,
        `enOutroNarrative`,
        `frOutroNarrative`,
        `createdAt`,
        `updatedAt`
    )
SELECT a.id,
    2,
    q.id,
    'The second valley stretches before you. Your pack weighs like iron, but the refuge gets closer with every step.',
    'La deuxième vallée s''étend devant toi. Ton sac pèse comme du fer, mais le refuge se rapproche à chaque pas.',
    'Halfway there. Your body screams, but your will is unbreakable.',
    'À mi-chemin. Ton corps hurle, mais ta volonté est incassable.',
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000
FROM `adventures` a
    JOIN `quests` q ON q.`enTitle` = 'Build the Stronghold'
WHERE a.`enTitle` = 'Survive the Mountain';
--> statement-breakpoint
INSERT INTO `adventure_steps` (
        `adventureId`,
        `stepIndex`,
        `questId`,
        `enNarrative`,
        `frNarrative`,
        `enOutroNarrative`,
        `frOutroNarrative`,
        `createdAt`,
        `updatedAt`
    )
SELECT a.id,
    3,
    q.id,
    'The final ascent. The peak looms above, wreathed in clouds. Your shoulders bear the weight of survival. One last push.',
    'L''ascension finale. Le sommet se profile au-dessus, enveloppé de nuages. Tes épaules portent le poids de la survie. Une dernière poussée.',
    'You see smoke rising from the refuge. Warmth awaits. You''ve conquered the mountain.',
    'Tu vois de la fumée s''élever du refuge. La chaleur attend. Tu as conquis la montagne.',
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000
FROM `adventures` a
    JOIN `quests` q ON q.`enTitle` = 'Mountain Summit Push'
WHERE a.`enTitle` = 'Survive the Mountain';
--> statement-breakpoint
-- ============================================================
-- PART 5: POPULATE NEW COLUMNS FOR EXISTING QUESTS
-- ============================================================
UPDATE `quests`
SET `primaryMuscle` = 'calf',
    `secondaryMuscles` = '["abs", "chest"]',
    `estimatedMinutes` = 15,
    `difficulty` = 'Beginner'
WHERE `enTitle` = 'Chop Wood';
--> statement-breakpoint
UPDATE `quests`
SET `primaryMuscle` = 'back',
    `secondaryMuscles` = '["abs", "arms"]',
    `estimatedMinutes` = 12,
    `difficulty` = 'Intermediate'
WHERE `enTitle` = 'Tower Climb';
--> statement-breakpoint
UPDATE `quests`
SET `primaryMuscle` = 'chest',
    `secondaryMuscles` = '["arms", "calf"]',
    `estimatedMinutes` = 15,
    `difficulty` = 'Beginner'
WHERE `enTitle` = 'Knight Push';
--> statement-breakpoint
UPDATE `quests`
SET `primaryMuscle` = 'abs',
    `secondaryMuscles` = '["calf", "back"]',
    `estimatedMinutes` = 10,
    `difficulty` = 'Intermediate'
WHERE `enTitle` = 'Shield Wall';
--> statement-breakpoint
UPDATE `quests`
SET `primaryMuscle` = 'calf',
    `secondaryMuscles` = '["abs"]',
    `estimatedMinutes` = 12,
    `difficulty` = 'Beginner'
WHERE `enTitle` = 'Gather Stones';
--> statement-breakpoint
UPDATE `quests`
SET `primaryMuscle` = 'chest',
    `secondaryMuscles` = '["calf", "arms"]',
    `estimatedMinutes` = 12,
    `difficulty` = 'Beginner'
WHERE `enTitle` = 'Raise the Shelter';
--> statement-breakpoint
UPDATE `quests`
SET `primaryMuscle` = 'abs',
    `secondaryMuscles` = '["back"]',
    `estimatedMinutes` = 18,
    `difficulty` = 'Intermediate'
WHERE `enTitle` = 'Core Forge';
--> statement-breakpoint
UPDATE `quests`
SET `primaryMuscle` = 'chest',
    `secondaryMuscles` = '["calf", "arms"]',
    `estimatedMinutes` = 12,
    `difficulty` = 'Intermediate'
WHERE `enTitle` = 'Golem Strike';
--> statement-breakpoint
UPDATE `quests`
SET `primaryMuscle` = 'abs',
    `secondaryMuscles` = '["chest"]',
    `estimatedMinutes` = 12,
    `difficulty` = 'Intermediate'
WHERE `enTitle` = 'Golem Core';
--> statement-breakpoint
UPDATE `quests`
SET `primaryMuscle` = 'calf',
    `secondaryMuscles` = '["abs", "shoulder"]',
    `estimatedMinutes` = 15,
    `difficulty` = 'Intermediate'
WHERE `enTitle` = 'Guard the Fortress Gate';
--> statement-breakpoint
UPDATE `quests`
SET `primaryMuscle` = 'chest',
    `secondaryMuscles` = '["arms", "shoulder"]',
    `estimatedMinutes` = 20,
    `difficulty` = 'Advanced'
WHERE `enTitle` = 'Forge the Dragon Blade';
--> statement-breakpoint
UPDATE `quests`
SET `primaryMuscle` = 'back',
    `secondaryMuscles` = '["calf", "abs"]',
    `estimatedMinutes` = 18,
    `difficulty` = 'Advanced'
WHERE `enTitle` = 'Climb the Titan''s Tower';
--> statement-breakpoint
UPDATE `quests`
SET `primaryMuscle` = 'abs',
    `secondaryMuscles` = '["shoulder", "calf"]',
    `estimatedMinutes` = 20,
    `difficulty` = 'Intermediate'
WHERE `enTitle` = 'The Arcane Gauntlet';
--> statement-breakpoint
UPDATE `quests`
SET `primaryMuscle` = 'calf',
    `secondaryMuscles` = '["shoulder", "back"]',
    `estimatedMinutes` = 10,
    `difficulty` = 'Beginner'
WHERE `enTitle` = 'The Druid''s Path';
--> statement-breakpoint
UPDATE `quests`
SET `primaryMuscle` = 'calf',
    `secondaryMuscles` = '["abs", "chest"]',
    `estimatedMinutes` = 18,
    `difficulty` = 'Intermediate'
WHERE `enTitle` = 'Sprint Through the Shadowlands';
--> statement-breakpoint
UPDATE `quests`
SET `primaryMuscle` = 'calf',
    `secondaryMuscles` = '["chest", "back", "abs"]',
    `estimatedMinutes` = 25,
    `difficulty` = 'Intermediate'
WHERE `enTitle` = 'Build the Stronghold';
--> statement-breakpoint
UPDATE `quests`
SET `primaryMuscle` = 'arms',
    `secondaryMuscles` = '["chest", "back", "abs"]',
    `estimatedMinutes` = 30,
    `difficulty` = 'Advanced'
WHERE `enTitle` = 'The Iron Gauntlet Challenge';
--> statement-breakpoint
UPDATE `quests`
SET `primaryMuscle` = 'calf',
    `secondaryMuscles` = '["shoulder", "chest", "back"]',
    `estimatedMinutes` = 15,
    `difficulty` = 'Beginner'
WHERE `enTitle` = 'Morning of the Champion';
--> statement-breakpoint
UPDATE `quests`
SET `primaryMuscle` = 'abs',
    `secondaryMuscles` = '["chest", "calf"]',
    `estimatedMinutes` = 18,
    `difficulty` = 'Intermediate'
WHERE `enTitle` = 'Escape the Collapsing Mine';
--> statement-breakpoint
-- ============================================================
-- END OF MIGRATION 0010
-- ============================================================