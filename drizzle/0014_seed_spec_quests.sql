-- The six quests specified in docs/content/content-generation.md that were never seeded.
-- Their covers already exist on disk and are keyed in constants/assetMap.ts, so this is
-- pure SQL: the catalogue goes from 13 to 19 quests with no art to generate.
--
-- Deviations from that spec, all forced by the invariants in §2.2:
--   * The Arcane Gauntlet: 4 rounds -> 3 (four rounds of four core movements is 16 core sets
--     in one session, over the 12-set ceiling), and the hollow body + plank lead instead of
--     trailing, so difficulty is non-increasing.
--   * Morning of the Champion: rest 30 s -> 45 s (it is a full-body circuit, not a metabolic
--     quest), and it opens on the squat rather than the jumping jack — hardest first.
--   * Sprint Through the Shadowlands: the burpee moves from third to first, same reason.
--   * The Druid's Path: warrior pose leads, cobra stretch closes — also a better mobility flow
--     (standing -> lunge -> floor).
-- Escape the Collapsing Mine — metabolic, 3x45s, ~15:48
INSERT INTO `quests` (
        `enTitle`,
        `frTitle`,
        `enDescription`,
        `frDescription`,
        `author`,
        `rounds`,
        `restSeconds`,
        `imagePath`,
        `createdAt`,
        `updatedAt`
    )
VALUES (
        'Escape the Collapsing Mine',
        'Fuite de la Mine Effondrée',
        'The tunnel rumbles. Rocks fall. You have minutes to reach sunlight. Move fast, move now, or be buried forever!',
        'Le tunnel gronde. Des rochers tombent. Vous avez quelques minutes pour atteindre la lumière du jour. Bougez vite, bougez maintenant, ou soyez enterré à jamais !',
        'Admin',
        3,
        45,
        'assets/images/quests/escape_collapsing_mine.jpg',
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
    2,
    'time',
    30,
    45,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Paladin''s High Knee'
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
    20,
    30,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Thunder Jumping Jack'
WHERE q.`enTitle` = 'Escape the Collapsing Mine';
--> statement-breakpoint
-- Guard the Fortress Gate — core, 3x60s, ~18:54
INSERT INTO `quests` (
        `enTitle`,
        `frTitle`,
        `enDescription`,
        `frDescription`,
        `author`,
        `rounds`,
        `restSeconds`,
        `imagePath`,
        `createdAt`,
        `updatedAt`
    )
VALUES (
        'Guard the Fortress Gate',
        'Garder la Porte de la Forteresse',
        'The enemy charges. You hold the line. Your body is the wall. Do not falter. Do not break.',
        'L''ennemi charge. Vous tenez la ligne. Votre corps est le mur. Ne faiblissez pas. Ne cassez pas.',
        'Admin',
        3,
        60,
        'assets/images/quests/guard_fortress_gate.jpg',
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
SELECT q.`id`,
    e.`id`,
    0,
    'time',
    30,
    45,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Wall Sentinel Hold'
WHERE q.`enTitle` = 'Guard the Fortress Gate';
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
    60,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Stone Guardian Plank'
WHERE q.`enTitle` = 'Guard the Fortress Gate';
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
    JOIN `exercises` e ON e.`enName` = 'Goblin Squat'
WHERE q.`enTitle` = 'Guard the Fortress Gate';
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
    10,
    12,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Shadow Step Lunge'
WHERE q.`enTitle` = 'Guard the Fortress Gate';
--> statement-breakpoint
-- The Arcane Gauntlet — core, 3x45s, ~15:42
INSERT INTO `quests` (
        `enTitle`,
        `frTitle`,
        `enDescription`,
        `frDescription`,
        `author`,
        `rounds`,
        `restSeconds`,
        `imagePath`,
        `createdAt`,
        `updatedAt`
    )
VALUES (
        'The Arcane Gauntlet',
        'Le Gant Arcanique',
        'The wizard''s trial begins. Channel raw mana through perfect body control. Only those with iron cores pass.',
        'L''épreuve du sorcier commence. Canalisez le mana brut par un contrôle corporel parfait. Seuls ceux qui ont des abdos de fer réussissent.',
        'Admin',
        3,
        45,
        'assets/images/quests/arcane_gauntlet.jpg',
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
SELECT q.`id`,
    e.`id`,
    0,
    'time',
    20,
    30,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Alchemist''s Hollow Body Hold'
WHERE q.`enTitle` = 'The Arcane Gauntlet';
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
    45,
    60,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Stone Guardian Plank'
WHERE q.`enTitle` = 'The Arcane Gauntlet';
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
    20,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Wizard''s Bicycle Crunch'
WHERE q.`enTitle` = 'The Arcane Gauntlet';
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
    40,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Monk''s Mountain Climber'
WHERE q.`enTitle` = 'The Arcane Gauntlet';
--> statement-breakpoint
-- The Druid's Path — mobility, 2x30s, ~6:26
INSERT INTO `quests` (
        `enTitle`,
        `frTitle`,
        `enDescription`,
        `frDescription`,
        `author`,
        `rounds`,
        `restSeconds`,
        `imagePath`,
        `createdAt`,
        `updatedAt`
    )
VALUES (
        'The Druid''s Path',
        'Le Chemin du Druide',
        'Walk the forest trail. Connect with earth energy. Stretch, breathe, restore. Nature heals the warrior''s weary body.',
        'Parcourez le sentier forestier. Connectez-vous à l''énergie de la terre. Étirez-vous, respirez, restaurez. La nature guérit le corps fatigué du guerrier.',
        'Admin',
        2,
        30,
        'assets/images/quests/druid_path.jpg',
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
SELECT q.`id`,
    e.`id`,
    0,
    'time',
    45,
    60,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Samurai''s Warrior Pose'
WHERE q.`enTitle` = 'The Druid''s Path';
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
    JOIN `exercises` e ON e.`enName` = 'Shadow Step Lunge'
WHERE q.`enTitle` = 'The Druid''s Path';
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
    JOIN `exercises` e ON e.`enName` = 'Druid''s Cobra Stretch'
WHERE q.`enTitle` = 'The Druid''s Path';
--> statement-breakpoint
-- Sprint Through the Shadowlands — metabolic, 3x45s, ~16:27
INSERT INTO `quests` (
        `enTitle`,
        `frTitle`,
        `enDescription`,
        `frDescription`,
        `author`,
        `rounds`,
        `restSeconds`,
        `imagePath`,
        `createdAt`,
        `updatedAt`
    )
VALUES (
        'Sprint Through the Shadowlands',
        'Sprint à Travers les Terres d''Ombre',
        'Darkness hunts you. Run. Don''t look back. Speed and stamina are your only weapons in this cursed realm.',
        'Les ténèbres vous chassent. Courez. Ne regardez pas en arrière. Vitesse et endurance sont vos seules armes dans ce royaume maudit.',
        'Admin',
        3,
        45,
        'assets/images/quests/sprint_shadowlands.jpg',
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
    2,
    'reps',
    15,
    20,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Rogue''s Skater Hop'
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
    25,
    30,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Thunder Jumping Jack'
WHERE q.`enTitle` = 'Sprint Through the Shadowlands';
--> statement-breakpoint
-- Morning of the Champion — circuit, 3x45s, ~14:54
INSERT INTO `quests` (
        `enTitle`,
        `frTitle`,
        `enDescription`,
        `frDescription`,
        `author`,
        `rounds`,
        `restSeconds`,
        `imagePath`,
        `createdAt`,
        `updatedAt`
    )
VALUES (
        'Morning of the Champion',
        'Matin du Champion',
        'Greet the dawn like a warrior. Wake every muscle, ignite your spirit. This is how heroes start their day.',
        'Saluez l''aube comme un guerrier. Réveillez chaque muscle, allumez votre esprit. C''est ainsi que les héros commencent leur journée.',
        'Admin',
        3,
        45,
        'assets/images/quests/morning_champion.jpg',
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
SELECT q.`id`,
    e.`id`,
    0,
    'reps',
    12,
    15,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Goblin Squat'
WHERE q.`enTitle` = 'Morning of the Champion';
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
    JOIN `exercises` e ON e.`enName` = 'Dragon Push-up'
WHERE q.`enTitle` = 'Morning of the Champion';
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
    JOIN `exercises` e ON e.`enName` = 'Thunder Jumping Jack'
WHERE q.`enTitle` = 'Morning of the Champion';
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
    40,
    '[]'
FROM `quests` q
    JOIN `exercises` e ON e.`enName` = 'Druid''s Cobra Stretch'
WHERE q.`enTitle` = 'Morning of the Champion';
