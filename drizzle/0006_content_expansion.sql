-- ============================================================
-- PART 1: EXERCISES (20 items) — defined first so quest_exercises name-joins resolve
-- ============================================================
-- PART 1: NEW EXERCISES (20 Items)
-- ============================================================
-- Exercise 1: Goblin Squat
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
        'Goblin Squat',
        'Squat du Gobelin',
        'Descend into a deep squat, channeling the raw earth power of the mountain goblins. Feel your legs anchor to the ground like stone pillars.',
        'Descendez en squat profond, canalisant la puissance brute des gobelins des montagnes. Sentez vos jambes s''ancrer au sol comme des piliers de pierre.',
        'assets/images/exercises/goblin_squat.png',
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
WHERE e.`enName` = 'Goblin Squat';
--> statement-breakpoint
-- Exercise 2: Dragon Push-up
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
        'Dragon Push-up',
        'Pompe du Dragon',
        'Press the earth away with the force of dragon wings. Each rep ignites the fire in your chest, forging armor from within.',
        'Repoussez la terre avec la force des ailes de dragon. Chaque répétition allume le feu dans votre poitrine, forgeant une armure de l''intérieur.',
        'assets/images/exercises/dragon_pushup.png',
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
    'chest'
FROM `exercises` e
WHERE e.`enName` = 'Dragon Push-up'
UNION ALL
SELECT e.id,
    'arms'
FROM `exercises` e
WHERE e.`enName` = 'Dragon Push-up';
--> statement-breakpoint
-- Exercise 3: Iron Grip Pull-up
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
        'Iron Grip Pull-up',
        'Traction Poigne de Fer',
        'Summon the strength of ancient blacksmiths. Pull your body upward, forging iron willpower with every ascent.',
        'Invoquez la force des anciens forgerons. Tirez votre corps vers le haut, forgeant une volonté de fer à chaque montée.',
        'assets/images/exercises/iron_grip_pullup.png',
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
WHERE e.`enName` = 'Iron Grip Pull-up'
UNION ALL
SELECT e.id,
    'arms'
FROM `exercises` e
WHERE e.`enName` = 'Iron Grip Pull-up';
--> statement-breakpoint
-- Exercise 4: Stone Guardian Plank
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
        'Stone Guardian Plank',
        'Planche du Gardien de Pierre',
        'Hold your body rigid as a fortress wall. Channel the unmoving resolve of mountain guardians carved from stone.',
        'Maintenez votre corps rigide comme un mur de forteresse. Canalisez la résolution immobile des gardiens de montagne sculptés dans la pierre.',
        'assets/images/exercises/stone_guardian_plank.png',
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
WHERE e.`enName` = 'Stone Guardian Plank'
UNION ALL
SELECT e.id,
    'back'
FROM `exercises` e
WHERE e.`enName` = 'Stone Guardian Plank';
--> statement-breakpoint
-- Exercise 5: Shadow Step Lunge
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
        'Shadow Step Lunge',
        'Fente du Pas d''Ombre',
        'Step forward like an assassin emerging from darkness. Each lunge builds the explosive power needed to strike unseen.',
        'Avancez comme un assassin émergeant des ténèbres. Chaque fente construit la puissance explosive nécessaire pour frapper sans être vu.',
        'assets/images/exercises/shadow_step_lunge.png',
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
WHERE e.`enName` = 'Shadow Step Lunge'
UNION ALL
SELECT e.id,
    'abs'
FROM `exercises` e
WHERE e.`enName` = 'Shadow Step Lunge';
--> statement-breakpoint
-- Exercise 6: Berserker Burpee
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
        'Berserker Burpee',
        'Burpee du Berserker',
        'Unleash primal fury in explosive motion. Drop, push, leap — channel the relentless assault of a berserker warrior.',
        'Libérez la fureur primitive en mouvement explosif. Tombez, poussez, bondissez — canalisez l''assaut implacable d''un guerrier berserker.',
        'assets/images/exercises/berserker_burpee.png',
        'Admin',
        'hard',
        'none',
        'cardio',
        5,
        strftime('%s', 'now') * 1000,
        strftime('%s', 'now') * 1000
    );
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT e.id,
    'chest'
FROM `exercises` e
WHERE e.`enName` = 'Berserker Burpee'
UNION ALL
SELECT e.id,
    'calf'
FROM `exercises` e
WHERE e.`enName` = 'Berserker Burpee'
UNION ALL
SELECT e.id,
    'abs'
FROM `exercises` e
WHERE e.`enName` = 'Berserker Burpee';
--> statement-breakpoint
-- Exercise 7: Monk's Mountain Climber
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
        'Monk''s Mountain Climber',
        'Grimpeur de Montagne du Moine',
        'Ascend imaginary peaks with the discipline of monastery warriors. Rapid leg drives that test spirit and stamina.',
        'Gravissez des sommets imaginaires avec la discipline des guerriers des monastères. Poussées rapides des jambes qui testent l''esprit et l''endurance.',
        'assets/images/exercises/monk_mountain_climber.png',
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
WHERE e.`enName` = 'Monk''s Mountain Climber'
UNION ALL
SELECT e.id,
    'calf'
FROM `exercises` e
WHERE e.`enName` = 'Monk''s Mountain Climber';
--> statement-breakpoint
-- Exercise 8: Titan's Dip
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
        'Titan''s Dip',
        'Dip du Titan',
        'Lower yourself between two pillars, bearing the weight of giants. Rise again with the power of the old titans.',
        'Descendez entre deux piliers, portant le poids des géants. Relevez-vous avec la puissance des anciens titans.',
        'assets/images/exercises/titan_dip.png',
        'Admin',
        'hard',
        'none',
        'strength',
        4,
        strftime('%s', 'now') * 1000,
        strftime('%s', 'now') * 1000
    );
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT e.id,
    'chest'
FROM `exercises` e
WHERE e.`enName` = 'Titan''s Dip'
UNION ALL
SELECT e.id,
    'arms'
FROM `exercises` e
WHERE e.`enName` = 'Titan''s Dip';
--> statement-breakpoint
-- Exercise 9: Archer's Pike Push-up
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
        'Archer''s Pike Push-up',
        'Pompe Pike de l''Archer',
        'Form your body into a bow''s arc. Press upward, building the shoulder strength required to draw the heaviest bows.',
        'Formez votre corps en arc de bow. Poussez vers le haut, développant la force d''épaules nécessaire pour tendre les arcs les plus lourds.',
        'assets/images/exercises/archer_pike_pushup.png',
        'Admin',
        'hard',
        'none',
        'calisthenics',
        3,
        strftime('%s', 'now') * 1000,
        strftime('%s', 'now') * 1000
    );
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT e.id,
    'shoulder'
FROM `exercises` e
WHERE e.`enName` = 'Archer''s Pike Push-up'
UNION ALL
SELECT e.id,
    'arms'
FROM `exercises` e
WHERE e.`enName` = 'Archer''s Pike Push-up';
--> statement-breakpoint
-- Exercise 10: Wall Sentinel Hold
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
        'Wall Sentinel Hold',
        'Maintien du Sentinelle Murale',
        'Press your back against the fortress wall and hold the gate position. Your legs become pillars that never falter.',
        'Appuyez votre dos contre le mur de la forteresse et maintenez la position de garde. Vos jambes deviennent des piliers qui ne faiblissent jamais.',
        'assets/images/exercises/wall_sentinel_hold.png',
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
    'calf'
FROM `exercises` e
WHERE e.`enName` = 'Wall Sentinel Hold';
--> statement-breakpoint
-- Exercise 11: Thunder Jumping Jack
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
        'Thunder Jumping Jack',
        'Jumping Jack du Tonnerre',
        'Explode with lightning speed, arms and legs spreading like thunderbolts. Channel the storm''s endless energy.',
        'Explosez à la vitesse de l''éclair, bras et jambes s''écartant comme des éclairs. Canalisez l''énergie infinie de la tempête.',
        'assets/images/exercises/thunder_jumping_jack.png',
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
WHERE e.`enName` = 'Thunder Jumping Jack'
UNION ALL
SELECT e.id,
    'shoulder'
FROM `exercises` e
WHERE e.`enName` = 'Thunder Jumping Jack';
--> statement-breakpoint
-- Exercise 12: Paladin's High Knee
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
        'Paladin''s High Knee',
        'Genou Haut du Paladin',
        'March with righteous fury, driving knees high like a holy warrior charging into battle. Each step radiates unwavering conviction.',
        'Marchez avec fureur vertueuse, montant les genoux haut comme un guerrier sacré chargeant au combat. Chaque pas irradie une conviction inébranlable.',
        'assets/images/exercises/paladin_high_knee.png',
        'Admin',
        'medium',
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
WHERE e.`enName` = 'Paladin''s High Knee'
UNION ALL
SELECT e.id,
    'abs'
FROM `exercises` e
WHERE e.`enName` = 'Paladin''s High Knee';
--> statement-breakpoint
-- Exercise 13: Wizard's Bicycle Crunch
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
        'Wizard''s Bicycle Crunch',
        'Crunch Vélo du Sorcier',
        'Twist your core like casting arcane spirals. Each rotation channels mystical energy through your center, forging a magical core.',
        'Tordez votre tronc comme en lançant des spirales arcaniques. Chaque rotation canalise l''énergie mystique à travers votre centre, forgeant un noyau magique.',
        'assets/images/exercises/wizard_bicycle_crunch.png',
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
WHERE e.`enName` = 'Wizard''s Bicycle Crunch';
--> statement-breakpoint
-- Exercise 14: Knight's Diamond Push-up
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
        'Knight''s Diamond Push-up',
        'Pompe Diamant du Chevalier',
        'Place hands in a diamond formation and descend with honor. This knightly variation forges diamond-hard triceps and unshakable resolve.',
        'Placez les mains en formation diamant et descendez avec honneur. Cette variante chevaleresque forge des triceps durs comme le diamant et une résolution inébranlable.',
        'assets/images/exercises/knight_diamond_pushup.png',
        'Admin',
        'hard',
        'none',
        'strength',
        3,
        strftime('%s', 'now') * 1000,
        strftime('%s', 'now') * 1000
    );
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT e.id,
    'chest'
FROM `exercises` e
WHERE e.`enName` = 'Knight''s Diamond Push-up'
UNION ALL
SELECT e.id,
    'arms'
FROM `exercises` e
WHERE e.`enName` = 'Knight''s Diamond Push-up';
--> statement-breakpoint
-- Exercise 15: Ranger's Single Leg Deadlift
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
        'Ranger''s Single Leg Deadlift',
        'Soulevé de Terre Unijambiste du Ranger',
        'Balance on one leg like navigating forest roots. Hinge forward with the grace of a ranger, building stability and strength.',
        'Équilibrez-vous sur une jambe comme en naviguant sur des racines forestières. Penchez-vous en avant avec la grâce d''un ranger, développant stabilité et force.',
        'assets/images/exercises/ranger_single_leg_deadlift.png',
        'Admin',
        'hard',
        'none',
        'strength',
        4,
        strftime('%s', 'now') * 1000,
        strftime('%s', 'now') * 1000
    );
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT e.id,
    'calf'
FROM `exercises` e
WHERE e.`enName` = 'Ranger''s Single Leg Deadlift'
UNION ALL
SELECT e.id,
    'back'
FROM `exercises` e
WHERE e.`enName` = 'Ranger''s Single Leg Deadlift';
--> statement-breakpoint
-- Exercise 16: Druid's Cobra Stretch
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
        'Druid''s Cobra Stretch',
        'Étirement du Cobra du Druide',
        'Rise from the earth like a serpent greeting the sun. Arch your back, connecting with primal nature energy that flows through all living things.',
        'Élevez-vous de la terre comme un serpent saluant le soleil. Cambrez votre dos, vous connectant à l''énergie naturelle primitive qui traverse tous les êtres vivants.',
        'assets/images/exercises/druid_cobra_stretch.png',
        'Admin',
        'easy',
        'none',
        'yoga',
        1,
        strftime('%s', 'now') * 1000,
        strftime('%s', 'now') * 1000
    );
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT e.id,
    'back'
FROM `exercises` e
WHERE e.`enName` = 'Druid''s Cobra Stretch'
UNION ALL
SELECT e.id,
    'chest'
FROM `exercises` e
WHERE e.`enName` = 'Druid''s Cobra Stretch';
--> statement-breakpoint
-- Exercise 17: Samurai's Warrior Pose
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
        'Samurai''s Warrior Pose',
        'Posture du Guerrier Samouraï',
        'Stand in the proud stance of an eastern warrior. Front knee bent, arms extended, embodying balance, power, and unwavering focus.',
        'Tenez-vous dans la posture fière d''un guerrier oriental. Genou avant plié, bras étendus, incarnant équilibre, puissance et concentration inébranlable.',
        'assets/images/exercises/samurai_warrior_pose.png',
        'Admin',
        'medium',
        'none',
        'yoga',
        1,
        strftime('%s', 'now') * 1000,
        strftime('%s', 'now') * 1000
    );
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT e.id,
    'calf'
FROM `exercises` e
WHERE e.`enName` = 'Samurai''s Warrior Pose'
UNION ALL
SELECT e.id,
    'shoulder'
FROM `exercises` e
WHERE e.`enName` = 'Samurai''s Warrior Pose';
--> statement-breakpoint
-- Exercise 18: Rogue's Skater Hop
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
        'Rogue''s Skater Hop',
        'Saut Patineur du Voleur',
        'Leap side to side with a thief''s agility. Each bound builds explosive lateral power, perfect for dodging and quick escapes.',
        'Bondissez de côté avec l''agilité d''un voleur. Chaque saut développe une puissance latérale explosive, parfaite pour esquiver et fuir rapidement.',
        'assets/images/exercises/rogue_skater_hop.png',
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
WHERE e.`enName` = 'Rogue''s Skater Hop';
--> statement-breakpoint
-- Exercise 19: Barbarian's Overhead Press
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
        'Barbarian''s Overhead Press',
        'Développé au-dessus de la Tête du Barbare',
        'Hoist imaginary boulders skyward with primal might. Press overhead, building shoulders that can bear any burden.',
        'Soulevez des rochers imaginaires vers le ciel avec une puissance primitive. Pressez au-dessus de la tête, développant des épaules capables de porter n''importe quel fardeau.',
        'assets/images/exercises/barbarian_overhead_press.png',
        'Admin',
        'medium',
        'dumbbell',
        'strength',
        3,
        strftime('%s', 'now') * 1000,
        strftime('%s', 'now') * 1000
    );
--> statement-breakpoint
INSERT INTO `exercise_muscles` (`exerciseId`, `muscle`)
SELECT e.id,
    'shoulder'
FROM `exercises` e
WHERE e.`enName` = 'Barbarian''s Overhead Press'
UNION ALL
SELECT e.id,
    'arms'
FROM `exercises` e
WHERE e.`enName` = 'Barbarian''s Overhead Press';
--> statement-breakpoint
-- Exercise 20: Alchemist's Hollow Body Hold
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
        'Alchemist''s Hollow Body Hold',
        'Maintien Corps Creux de l''Alchimiste',
        'Create perfect stillness in motion, body curved like a potion flask. Hold this alchemical tension, transmuting effort into core steel.',
        'Créez une immobilité parfaite en mouvement, corps courbé comme une fiole de potion. Maintenez cette tension alchimique, transmutant l''effort en acier abdominal.',
        'assets/images/exercises/alchemist_hollow_body_hold.png',
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
WHERE e.`enName` = 'Alchemist''s Hollow Body Hold';
--> statement-breakpoint
-- ============================================================
-- PART 2: QUESTS (Iron Lord's Conquest chain) + their exercises
-- ============================================================
-- Quest 3: Forge the Dragon Blade
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
        'Forge the Dragon Blade',
        'Forger la Lame du Dragon',
        'The forge burns hot. Each strike of the hammer shapes legendary steel. Your chest and arms become the anvil.',
        'La forge brûle. Chaque coup de marteau façonne l''acier légendaire. Votre poitrine et vos bras deviennent l''enclume.',
        'Admin',
        4,
        60,
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
    'reps',
    12,
    15,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Dragon Push-up'
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
SELECT q.id,
    e.id,
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
SELECT q.id,
    e.id,
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
SELECT q.id,
    e.id,
    3,
    'reps',
    8,
    10,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Archer''s Pike Push-up'
WHERE q.`enTitle` = 'Forge the Dragon Blade';
--> statement-breakpoint
-- Quest 4: Climb the Titan's Tower
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
        'Climb the Titan''s Tower',
        'Escalader la Tour du Titan',
        'An ancient tower reaches the clouds. Each floor demands you pull yourself higher. Reach the summit or fall trying.',
        'Une tour antique atteint les nuages. Chaque étage exige que vous vous tiriez plus haut. Atteignez le sommet ou tombez en essayant.',
        'Admin',
        3,
        90,
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
    'reps',
    5,
    8,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Iron Grip Pull-up'
WHERE q.`enTitle` = 'Climb the Titan''s Tower';
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
    10,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Ranger''s Single Leg Deadlift'
WHERE q.`enTitle` = 'Climb the Titan''s Tower';
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
    JOIN `exercises` e ON e.`enName` = 'Stone Guardian Plank'
WHERE q.`enTitle` = 'Climb the Titan''s Tower';
--> statement-breakpoint
-- Quest 8: Build the Stronghold
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
        'Build the Stronghold',
        'Construire le Bastion',
        'Stone by stone, you raise mighty walls. Every muscle contributes. A balanced fortress requires a balanced hero.',
        'Pierre par pierre, vous élevez de puissants murs. Chaque muscle contribue. Une forteresse équilibrée nécessite un héros équilibré.',
        'Admin',
        4,
        60,
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
SELECT q.id,
    e.id,
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
SELECT q.id,
    e.id,
    2,
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
SELECT q.id,
    e.id,
    3,
    'time',
    45,
    60,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Stone Guardian Plank'
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
SELECT q.id,
    e.id,
    4,
    'reps',
    12,
    15,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Shadow Step Lunge'
WHERE q.`enTitle` = 'Build the Stronghold';
--> statement-breakpoint
-- Quest 9: The Iron Gauntlet Challenge
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
        'The Iron Gauntlet Challenge',
        'Défi du Gantelet de Fer',
        'Only the strongest dare enter. This trial breaks the weak, forges legends from the resilient. Prove your iron will.',
        'Seuls les plus forts osent entrer. Cette épreuve brise les faibles, forge des légendes des résilients. Prouvez votre volonté de fer.',
        'Admin',
        4,
        90,
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
    'reps',
    10,
    12,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Knight''s Diamond Push-up'
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
SELECT q.id,
    e.id,
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
SELECT q.id,
    e.id,
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
SELECT q.id,
    e.id,
    3,
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
SELECT q.id,
    e.id,
    4,
    'time',
    30,
    45,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Alchemist''s Hollow Body Hold'
WHERE q.`enTitle` = 'The Iron Gauntlet Challenge';
--> statement-breakpoint
-- ============================================================
-- PART 3: ADVENTURE — The Iron Lord's Conquest (boss)
-- ============================================================
DROP INDEX IF EXISTS `adventures_quest_unique`;
--> statement-breakpoint
-- Adventure 5: The Iron Lord's Conquest
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
        `createdAt`,
        `updatedAt`
    )
VALUES (
        (
            SELECT id
            FROM `quests`
            WHERE `enTitle` = 'Forge the Dragon Blade'
        ),
        'The Iron Lord''s Conquest',
        'La Conquête du Seigneur de Fer',
        'The ultimate challenge. Face every trial, defeat every boss, emerge as the Iron Lord. Only legends complete this path.',
        'Le défi ultime. Affrontez chaque épreuve, vainquez chaque boss, émergez comme le Seigneur de Fer. Seules les légendes achèvent ce chemin.',
        'Admin',
        4,
        'boss',
        1,
        800,
        'abs',
        'chest',
        strftime('%s', 'now') * 1000,
        strftime('%s', 'now') * 1000
    );
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
    0,
    q.id,
    '',
    '',
    '',
    '',
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000
FROM `adventures` a
    JOIN `quests` q ON q.`enTitle` = 'Forge the Dragon Blade'
WHERE a.`enTitle` = 'The Iron Lord''s Conquest';
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
    '',
    '',
    '',
    '',
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000
FROM `adventures` a
    JOIN `quests` q ON q.`enTitle` = 'The Iron Gauntlet Challenge'
WHERE a.`enTitle` = 'The Iron Lord''s Conquest';
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
    '',
    '',
    '',
    '',
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000
FROM `adventures` a
    JOIN `quests` q ON q.`enTitle` = 'Climb the Titan''s Tower'
WHERE a.`enTitle` = 'The Iron Lord''s Conquest';
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
    '',
    '',
    '',
    '',
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000
FROM `adventures` a
    JOIN `quests` q ON q.`enTitle` = 'Forge the Dragon Blade'
WHERE a.`enTitle` = 'The Iron Lord''s Conquest';
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
    4,
    q.id,
    '',
    '',
    '',
    '',
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000
FROM `adventures` a
    JOIN `quests` q ON q.`enTitle` = 'The Iron Gauntlet Challenge'
WHERE a.`enTitle` = 'The Iron Lord''s Conquest';
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
    5,
    q.id,
    '',
    '',
    '',
    '',
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000
FROM `adventures` a
    JOIN `quests` q ON q.`enTitle` = 'Build the Stronghold'
WHERE a.`enTitle` = 'The Iron Lord''s Conquest';
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
    6,
    q.id,
    '',
    '',
    '',
    '',
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000
FROM `adventures` a
    JOIN `quests` q ON q.`enTitle` = 'The Iron Gauntlet Challenge'
WHERE a.`enTitle` = 'The Iron Lord''s Conquest';
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
    7,
    q.id,
    '',
    '',
    '',
    '',
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000
FROM `adventures` a
    JOIN `quests` q ON q.`enTitle` = 'The Iron Gauntlet Challenge'
WHERE a.`enTitle` = 'The Iron Lord''s Conquest';
--> statement-breakpoint
INSERT INTO `boss_fights` (
        `adventureId`,
        `totalHp`,
        `currentHp`,
        `weaknessMuscle`,
        `resistanceMuscle`,
        `createdAt`,
        `updatedAt`
    )
SELECT a.id,
    800,
    800,
    'abs',
    'chest',
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000
FROM `adventures` a
WHERE a.`enTitle` = 'The Iron Lord''s Conquest';
