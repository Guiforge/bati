-- Phase E of docs/planning/work-roadmap.md §7.
-- Seeds the four campaigns that were specified in docs/content/content-generation.md and never
-- shipped (their covers and boss art are already on disk and keyed in constants/assetMap.ts),
-- adds a beginner on-ramp, restructures The Iron Lord's Conquest, and re-tunes every boss.
--
-- Boss HP is set so the boss falls on the campaign's last step (~92 % of the campaign's total
-- expected damage, leaving headroom for users who beat their targets). Damage was measured
-- against the real formula in db/bossFights.ts, including the seconds-to-rep normalisation
-- added alongside this migration -- see §E0 of the roadmap.
--
-- Existing rows touched:
--   * The Golem: 200 -> 380 HP. The A2 rebalance took Golem Strike from 2 rounds to 3, so the
--     boss was dying on the first of its two sessions. In-progress fights are reset (below).
--   * The Iron Lord's Conquest: 8 steps but only 4 distinct quests, with the 41-minute Iron
--     Gauntlet repeated four times. Rewritten to alternate patterns, and given the step
--     narratives it never had.
--   * The Lumber Route: sortOrder only, so the catalogue reads as a difficulty ramp.
--> statement-breakpoint
-- The Squire's Path — 4 steps, route
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
            SELECT `id`
            FROM `quests`
            WHERE `enTitle` = 'The Squire''s Awakening'
        ),
        'The Squire''s Path',
        'Le Chemin de l''Écuyer',
        'Every hero begins as the one who carries the shield. Four marches to earn the right to lift a blade — no bar, no weights, no excuses.',
        'Tout héros commence par porter le bouclier des autres. Quatre marches pour gagner le droit de lever une lame — sans barre, sans poids, sans excuse.',
        'Admin',
        0,
        'route',
        1,
        NULL,
        NULL,
        NULL,
        'assets/images/adventures/squire_path.jpg',
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
        `imagePath`,
        `createdAt`,
        `updatedAt`
    )
SELECT ad.`id`,
    0,
    qu.`id`,
    'They handed you a shield you can barely lift. Start there.',
    'On vous a confié un bouclier que vous soulevez à peine. Commencez par là.',
    '',
    '',
    qu.`imagePath`,
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000
FROM `adventures` ad
    JOIN `quests` qu ON qu.`enTitle` = 'The Squire''s Awakening'
WHERE ad.`enTitle` = 'The Squire''s Path';
--> statement-breakpoint
INSERT INTO `adventure_steps` (
        `adventureId`,
        `stepIndex`,
        `questId`,
        `enNarrative`,
        `frNarrative`,
        `enOutroNarrative`,
        `frOutroNarrative`,
        `imagePath`,
        `createdAt`,
        `updatedAt`
    )
SELECT ad.`id`,
    1,
    qu.`id`,
    'The pines swallow the trail. Move on two legs, or four if you must.',
    'Les pins avalent le sentier. Avancez sur deux jambes, ou sur quatre s''il le faut.',
    '',
    '',
    qu.`imagePath`,
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000
FROM `adventures` ad
    JOIN `quests` qu ON qu.`enTitle` = 'The Bear''s Road'
WHERE ad.`enTitle` = 'The Squire''s Path';
--> statement-breakpoint
INSERT INTO `adventure_steps` (
        `adventureId`,
        `stepIndex`,
        `questId`,
        `enNarrative`,
        `frNarrative`,
        `enOutroNarrative`,
        `frOutroNarrative`,
        `imagePath`,
        `createdAt`,
        `updatedAt`
    )
SELECT ad.`id`,
    2,
    qu.`id`,
    'Something is coiled in the underbrush. Hold your centre and it will let you pass.',
    'Quelque chose est lové dans les fourrés. Tenez votre centre et il vous laissera passer.',
    '',
    '',
    qu.`imagePath`,
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000
FROM `adventures` ad
    JOIN `quests` qu ON qu.`enTitle` = 'The Serpent''s Coil'
WHERE ad.`enTitle` = 'The Squire''s Path';
--> statement-breakpoint
INSERT INTO `adventure_steps` (
        `adventureId`,
        `stepIndex`,
        `questId`,
        `enNarrative`,
        `frNarrative`,
        `enOutroNarrative`,
        `frOutroNarrative`,
        `imagePath`,
        `createdAt`,
        `updatedAt`
    )
SELECT ad.`id`,
    3,
    qu.`id`,
    'The village feeds those who work its fields. Bend your back and earn your bed.',
    'Le village nourrit ceux qui travaillent ses champs. Courbez le dos et gagnez votre lit.',
    '',
    '',
    qu.`imagePath`,
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000
FROM `adventures` ad
    JOIN `quests` qu ON qu.`enTitle` = 'The Ploughman''s Vow'
WHERE ad.`enTitle` = 'The Squire''s Path';
--> statement-breakpoint
-- The Monk's Enlightenment — 4 steps, boss, 680 HP (weak abs, resist calf)
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
            SELECT `id`
            FROM `quests`
            WHERE `enTitle` = 'The Druid''s Path'
        ),
        'The Monk''s Enlightenment',
        'L''Illumination du Moine',
        'Walk the path of balance. Master your body, master your mind. Core steel, spirit calm, movement pure.',
        'Parcourez le chemin de l''équilibre. Maîtrisez votre corps, maîtrisez votre esprit. Tronc d''acier, esprit calme, mouvement pur.',
        'Admin',
        2,
        'boss',
        1,
        680,
        'abs',
        'calf',
        'assets/images/adventures/monk_enlightenment.jpg',
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
        `imagePath`,
        `createdAt`,
        `updatedAt`
    )
SELECT ad.`id`,
    0,
    qu.`id`,
    'The monastery road is long and slow on purpose. Breathe with it.',
    'La route du monastère est longue et lente à dessein. Respirez avec elle.',
    '',
    '',
    qu.`imagePath`,
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000
FROM `adventures` ad
    JOIN `quests` qu ON qu.`enTitle` = 'The Druid''s Path'
WHERE ad.`enTitle` = 'The Monk''s Enlightenment';
--> statement-breakpoint
INSERT INTO `adventure_steps` (
        `adventureId`,
        `stepIndex`,
        `questId`,
        `enNarrative`,
        `frNarrative`,
        `enOutroNarrative`,
        `frOutroNarrative`,
        `imagePath`,
        `createdAt`,
        `updatedAt`
    )
SELECT ad.`id`,
    1,
    qu.`id`,
    'The first gate is not a door. It is how long you can hold still.',
    'La première porte n''est pas une porte. C''est le temps que vous tenez immobile.',
    '',
    '',
    qu.`imagePath`,
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000
FROM `adventures` ad
    JOIN `quests` qu ON qu.`enTitle` = 'The Arcane Gauntlet'
WHERE ad.`enTitle` = 'The Monk''s Enlightenment';
--> statement-breakpoint
INSERT INTO `adventure_steps` (
        `adventureId`,
        `stepIndex`,
        `questId`,
        `enNarrative`,
        `frNarrative`,
        `enOutroNarrative`,
        `frOutroNarrative`,
        `imagePath`,
        `createdAt`,
        `updatedAt`
    )
SELECT ad.`id`,
    2,
    qu.`id`,
    'The serpent tests your centre, not your strength. Do not give it.',
    'Le serpent éprouve votre centre, pas votre force. Ne le lui donnez pas.',
    '',
    '',
    qu.`imagePath`,
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000
FROM `adventures` ad
    JOIN `quests` qu ON qu.`enTitle` = 'The Serpent''s Coil'
WHERE ad.`enTitle` = 'The Monk''s Enlightenment';
--> statement-breakpoint
INSERT INTO `adventure_steps` (
        `adventureId`,
        `stepIndex`,
        `questId`,
        `enNarrative`,
        `frNarrative`,
        `enOutroNarrative`,
        `frOutroNarrative`,
        `imagePath`,
        `createdAt`,
        `updatedAt`
    )
SELECT ad.`id`,
    3,
    qu.`id`,
    'Walk back down the mountain. The climb only counts if you can still breathe.',
    'Redescendez la montagne. L''ascension ne compte que si vous respirez encore.',
    '',
    '',
    qu.`imagePath`,
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000
FROM `adventures` ad
    JOIN `quests` qu ON qu.`enTitle` = 'The Druid''s Path'
WHERE ad.`enTitle` = 'The Monk''s Enlightenment';
--> statement-breakpoint
-- The Scout's Trial — 5 steps, boss, 1700 HP (weak calf, resist arms)
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
            SELECT `id`
            FROM `quests`
            WHERE `enTitle` = 'Morning of the Champion'
        ),
        'The Scout''s Trial',
        'L''Épreuve de l''Éclaireur',
        'The kingdom needs scouts who never tire. Run faster, last longer. Your legs become lightning, your lungs endless.',
        'Le royaume a besoin d''éclaireurs qui ne se fatiguent jamais. Courez plus vite, durez plus longtemps. Vos jambes deviennent foudre, vos poumons infinis.',
        'Admin',
        3,
        'boss',
        1,
        1700,
        'calf',
        'arms',
        'assets/images/adventures/scout_trial.jpg',
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
        `imagePath`,
        `createdAt`,
        `updatedAt`
    )
SELECT ad.`id`,
    0,
    qu.`id`,
    'The scouts leave at dawn. Wake every muscle before the horn.',
    'Les éclaireurs partent à l''aube. Réveillez chaque muscle avant le cor.',
    '',
    '',
    qu.`imagePath`,
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000
FROM `adventures` ad
    JOIN `quests` qu ON qu.`enTitle` = 'Morning of the Champion'
WHERE ad.`enTitle` = 'The Scout''s Trial';
--> statement-breakpoint
INSERT INTO `adventure_steps` (
        `adventureId`,
        `stepIndex`,
        `questId`,
        `enNarrative`,
        `frNarrative`,
        `enOutroNarrative`,
        `frOutroNarrative`,
        `imagePath`,
        `createdAt`,
        `updatedAt`
    )
SELECT ad.`id`,
    1,
    qu.`id`,
    'The wraith is wind. You will not outfight it — outrun it.',
    'Le spectre est le vent. Vous ne le vaincrez pas — dépassez-le.',
    '',
    '',
    qu.`imagePath`,
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000
FROM `adventures` ad
    JOIN `quests` qu ON qu.`enTitle` = 'Sprint Through the Shadowlands'
WHERE ad.`enTitle` = 'The Scout''s Trial';
--> statement-breakpoint
INSERT INTO `adventure_steps` (
        `adventureId`,
        `stepIndex`,
        `questId`,
        `enNarrative`,
        `frNarrative`,
        `enOutroNarrative`,
        `frOutroNarrative`,
        `imagePath`,
        `createdAt`,
        `updatedAt`
    )
SELECT ad.`id`,
    2,
    qu.`id`,
    'The dunes come alive with steel. Keep your feet moving or lose them.',
    'Les dunes s''animent d''acier. Gardez les pieds en mouvement ou perdez-les.',
    '',
    '',
    qu.`imagePath`,
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000
FROM `adventures` ad
    JOIN `quests` qu ON qu.`enTitle` = 'Storm of Blades'
WHERE ad.`enTitle` = 'The Scout''s Trial';
--> statement-breakpoint
INSERT INTO `adventure_steps` (
        `adventureId`,
        `stepIndex`,
        `questId`,
        `enNarrative`,
        `frNarrative`,
        `enOutroNarrative`,
        `frOutroNarrative`,
        `imagePath`,
        `createdAt`,
        `updatedAt`
    )
SELECT ad.`id`,
    3,
    qu.`id`,
    'The tunnel gives way behind you. There is no pace but fast.',
    'Le tunnel cède derrière vous. Il n''y a qu''une allure : vite.',
    '',
    '',
    qu.`imagePath`,
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000
FROM `adventures` ad
    JOIN `quests` qu ON qu.`enTitle` = 'Escape the Collapsing Mine'
WHERE ad.`enTitle` = 'The Scout''s Trial';
--> statement-breakpoint
INSERT INTO `adventure_steps` (
        `adventureId`,
        `stepIndex`,
        `questId`,
        `enNarrative`,
        `frNarrative`,
        `enOutroNarrative`,
        `frOutroNarrative`,
        `imagePath`,
        `createdAt`,
        `updatedAt`
    )
SELECT ad.`id`,
    4,
    qu.`id`,
    'Last run. The wraith is thinning — take the wind out of it.',
    'Dernière course. Le spectre s''effiloche — coupez-lui le vent.',
    '',
    '',
    qu.`imagePath`,
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000
FROM `adventures` ad
    JOIN `quests` qu ON qu.`enTitle` = 'Sprint Through the Shadowlands'
WHERE ad.`enTitle` = 'The Scout''s Trial';
--> statement-breakpoint
-- The Ranger's Journey — 7 steps, boss, 2050 HP (weak calf, resist shoulder)
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
            SELECT `id`
            FROM `quests`
            WHERE `enTitle` = 'Morning of the Champion'
        ),
        'The Ranger''s Journey',
        'Le Voyage du Ranger',
        'The long road awaits. Miles to walk, battles to face, never stopping. Build the endurance to outlast any foe, any trial.',
        'La longue route attend. Des kilomètres à parcourir, des batailles à affronter, ne jamais s''arrêter. Développez l''endurance pour surpasser tout ennemi, toute épreuve.',
        'Admin',
        5,
        'boss',
        1,
        2050,
        'calf',
        'shoulder',
        'assets/images/adventures/ranger_journey.jpg',
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
        `imagePath`,
        `createdAt`,
        `updatedAt`
    )
SELECT ad.`id`,
    0,
    qu.`id`,
    'Seven days on the road start with one honest morning.',
    'Sept jours de route commencent par un matin honnête.',
    '',
    '',
    qu.`imagePath`,
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000
FROM `adventures` ad
    JOIN `quests` qu ON qu.`enTitle` = 'Morning of the Champion'
WHERE ad.`enTitle` = 'The Ranger''s Journey';
--> statement-breakpoint
INSERT INTO `adventure_steps` (
        `adventureId`,
        `stepIndex`,
        `questId`,
        `enNarrative`,
        `frNarrative`,
        `enOutroNarrative`,
        `frOutroNarrative`,
        `imagePath`,
        `createdAt`,
        `updatedAt`
    )
SELECT ad.`id`,
    1,
    qu.`id`,
    'Rangers earn their bread before they draw a bow. Work the field.',
    'Les rangers gagnent leur pain avant de bander un arc. Travaillez le champ.',
    '',
    '',
    qu.`imagePath`,
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000
FROM `adventures` ad
    JOIN `quests` qu ON qu.`enTitle` = 'The Ploughman''s Vow'
WHERE ad.`enTitle` = 'The Ranger''s Journey';
--> statement-breakpoint
INSERT INTO `adventure_steps` (
        `adventureId`,
        `stepIndex`,
        `questId`,
        `enNarrative`,
        `frNarrative`,
        `enOutroNarrative`,
        `frOutroNarrative`,
        `imagePath`,
        `createdAt`,
        `updatedAt`
    )
SELECT ad.`id`,
    2,
    qu.`id`,
    'Something followed you out of the treeline. Do not let it choose the pace.',
    'Quelque chose vous a suivi hors des arbres. Ne le laissez pas choisir l''allure.',
    '',
    '',
    qu.`imagePath`,
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000
FROM `adventures` ad
    JOIN `quests` qu ON qu.`enTitle` = 'Sprint Through the Shadowlands'
WHERE ad.`enTitle` = 'The Ranger''s Journey';
--> statement-breakpoint
INSERT INTO `adventure_steps` (
        `adventureId`,
        `stepIndex`,
        `questId`,
        `enNarrative`,
        `frNarrative`,
        `enOutroNarrative`,
        `frOutroNarrative`,
        `imagePath`,
        `createdAt`,
        `updatedAt`
    )
SELECT ad.`id`,
    3,
    qu.`id`,
    'Halfway. Build a camp that will still stand when you come back through.',
    'À mi-chemin. Bâtissez un camp qui tiendra encore à votre retour.',
    '',
    '',
    qu.`imagePath`,
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000
FROM `adventures` ad
    JOIN `quests` qu ON qu.`enTitle` = 'Build the Stronghold'
WHERE ad.`enTitle` = 'The Ranger''s Journey';
--> statement-breakpoint
INSERT INTO `adventure_steps` (
        `adventureId`,
        `stepIndex`,
        `questId`,
        `enNarrative`,
        `frNarrative`,
        `enOutroNarrative`,
        `frOutroNarrative`,
        `imagePath`,
        `createdAt`,
        `updatedAt`
    )
SELECT ad.`id`,
    4,
    qu.`id`,
    'The titan shakes the canopy and the raiders take it as a signal.',
    'Le titan secoue la canopée et les pillards y voient un signal.',
    '',
    '',
    qu.`imagePath`,
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000
FROM `adventures` ad
    JOIN `quests` qu ON qu.`enTitle` = 'Storm of Blades'
WHERE ad.`enTitle` = 'The Ranger''s Journey';
--> statement-breakpoint
INSERT INTO `adventure_steps` (
        `adventureId`,
        `stepIndex`,
        `questId`,
        `enNarrative`,
        `frNarrative`,
        `enOutroNarrative`,
        `frOutroNarrative`,
        `imagePath`,
        `createdAt`,
        `updatedAt`
    )
SELECT ad.`id`,
    5,
    qu.`id`,
    'Legs are gone. Crawl the last of the pines if that is what is left.',
    'Les jambes ne répondent plus. Rampez la fin des pins s''il ne vous reste que ça.',
    '',
    '',
    qu.`imagePath`,
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000
FROM `adventures` ad
    JOIN `quests` qu ON qu.`enTitle` = 'The Bear''s Road'
WHERE ad.`enTitle` = 'The Ranger''s Journey';
--> statement-breakpoint
INSERT INTO `adventure_steps` (
        `adventureId`,
        `stepIndex`,
        `questId`,
        `enNarrative`,
        `frNarrative`,
        `enOutroNarrative`,
        `frOutroNarrative`,
        `imagePath`,
        `createdAt`,
        `updatedAt`
    )
SELECT ad.`id`,
    6,
    qu.`id`,
    'Last dawn. The titan is bark and moss — and you are still walking.',
    'Dernière aube. Le titan n''est qu''écorce et mousse — et vous marchez encore.',
    '',
    '',
    qu.`imagePath`,
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000
FROM `adventures` ad
    JOIN `quests` qu ON qu.`enTitle` = 'Morning of the Champion'
WHERE ad.`enTitle` = 'The Ranger''s Journey';
--> statement-breakpoint
-- The Guardian's Oath — 6 steps, boss, 1070 HP (weak back, resist chest)
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
            SELECT `id`
            FROM `quests`
            WHERE `enTitle` = 'Guard the Fortress Gate'
        ),
        'The Guardian''s Oath',
        'Le Serment du Gardien',
        'Swear to protect. Your back becomes armor. Your core becomes an unbreakable shield. Stand firm, guard the realm.',
        'Jurez de protéger. Votre dos devient armure. Votre tronc devient un bouclier incassable. Tenez ferme, gardez le royaume.',
        'Admin',
        6,
        'boss',
        1,
        1070,
        'back',
        'chest',
        'assets/images/adventures/guardian_oath.jpg',
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
        `imagePath`,
        `createdAt`,
        `updatedAt`
    )
SELECT ad.`id`,
    0,
    qu.`id`,
    'You swore to hold this gate. Nothing about that oath is fast.',
    'Vous avez juré de tenir cette porte. Rien dans ce serment n''est rapide.',
    '',
    '',
    qu.`imagePath`,
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000
FROM `adventures` ad
    JOIN `quests` qu ON qu.`enTitle` = 'Guard the Fortress Gate'
WHERE ad.`enTitle` = 'The Guardian''s Oath';
--> statement-breakpoint
INSERT INTO `adventure_steps` (
        `adventureId`,
        `stepIndex`,
        `questId`,
        `enNarrative`,
        `frNarrative`,
        `enOutroNarrative`,
        `frOutroNarrative`,
        `imagePath`,
        `createdAt`,
        `updatedAt`
    )
SELECT ad.`id`,
    1,
    qu.`id`,
    'The armoury is under the floor and the hatch has swollen shut. Pull.',
    'L''armurerie est sous le plancher et la trappe a gonflé. Tirez.',
    '',
    '',
    qu.`imagePath`,
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000
FROM `adventures` ad
    JOIN `quests` qu ON qu.`enTitle` = 'The Cellar Hauler'
WHERE ad.`enTitle` = 'The Guardian''s Oath';
--> statement-breakpoint
INSERT INTO `adventure_steps` (
        `adventureId`,
        `stepIndex`,
        `questId`,
        `enNarrative`,
        `frNarrative`,
        `enOutroNarrative`,
        `frOutroNarrative`,
        `imagePath`,
        `createdAt`,
        `updatedAt`
    )
SELECT ad.`id`,
    2,
    qu.`id`,
    'Stone answers stone. Raise the wall before the golem tests it.',
    'La pierre répond à la pierre. Montez le mur avant que le golem ne l''éprouve.',
    '',
    '',
    qu.`imagePath`,
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000
FROM `adventures` ad
    JOIN `quests` qu ON qu.`enTitle` = 'Build the Stronghold'
WHERE ad.`enTitle` = 'The Guardian''s Oath';
--> statement-breakpoint
INSERT INTO `adventure_steps` (
        `adventureId`,
        `stepIndex`,
        `questId`,
        `enNarrative`,
        `frNarrative`,
        `enOutroNarrative`,
        `frOutroNarrative`,
        `imagePath`,
        `createdAt`,
        `updatedAt`
    )
SELECT ad.`id`,
    3,
    qu.`id`,
    'Armour is useless if the body inside it folds. Brace.',
    'Une armure ne sert à rien si le corps dedans plie. Gainez.',
    '',
    '',
    qu.`imagePath`,
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000
FROM `adventures` ad
    JOIN `quests` qu ON qu.`enTitle` = 'The Serpent''s Coil'
WHERE ad.`enTitle` = 'The Guardian''s Oath';
--> statement-breakpoint
INSERT INTO `adventure_steps` (
        `adventureId`,
        `stepIndex`,
        `questId`,
        `enNarrative`,
        `frNarrative`,
        `enOutroNarrative`,
        `frOutroNarrative`,
        `imagePath`,
        `createdAt`,
        `updatedAt`
    )
SELECT ad.`id`,
    4,
    qu.`id`,
    'Take the tower by the hands. The golem cannot follow you up.',
    'Prenez la tour à mains nues. Le golem ne peut pas vous y suivre.',
    '',
    '',
    qu.`imagePath`,
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000
FROM `adventures` ad
    JOIN `quests` qu ON qu.`enTitle` = 'Climb the Titan''s Tower'
WHERE ad.`enTitle` = 'The Guardian''s Oath';
--> statement-breakpoint
INSERT INTO `adventure_steps` (
        `adventureId`,
        `stepIndex`,
        `questId`,
        `enNarrative`,
        `frNarrative`,
        `enOutroNarrative`,
        `frOutroNarrative`,
        `imagePath`,
        `createdAt`,
        `updatedAt`
    )
SELECT ad.`id`,
    5,
    qu.`id`,
    'Back to the gate, one last watch. Stone breaks stone.',
    'Retour à la porte, une dernière garde. La pierre brise la pierre.',
    '',
    '',
    qu.`imagePath`,
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000
FROM `adventures` ad
    JOIN `quests` qu ON qu.`enTitle` = 'Guard the Fortress Gate'
WHERE ad.`enTitle` = 'The Guardian''s Oath';
--> statement-breakpoint
-- The Iron Lord's Conquest — rewritten step list (was 4 distinct quests over 8 steps)
DELETE FROM `adventure_steps`
WHERE `adventureId` = (
        SELECT `id`
        FROM `adventures`
        WHERE `enTitle` = 'The Iron Lord''s Conquest'
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
        `imagePath`,
        `createdAt`,
        `updatedAt`
    )
SELECT ad.`id`,
    0,
    qu.`id`,
    'You do not walk into the Iron Lord''s hall unarmed. Forge first.',
    'On n''entre pas désarmé dans la salle du Seigneur de Fer. Forgez d''abord.',
    '',
    '',
    qu.`imagePath`,
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000
FROM `adventures` ad
    JOIN `quests` qu ON qu.`enTitle` = 'Forge the Dragon Blade'
WHERE ad.`enTitle` = 'The Iron Lord''s Conquest';
--> statement-breakpoint
INSERT INTO `adventure_steps` (
        `adventureId`,
        `stepIndex`,
        `questId`,
        `enNarrative`,
        `frNarrative`,
        `enOutroNarrative`,
        `frOutroNarrative`,
        `imagePath`,
        `createdAt`,
        `updatedAt`
    )
SELECT ad.`id`,
    1,
    qu.`id`,
    'The outer wall has no stair. The crows got up somehow.',
    'Le mur extérieur n''a pas d''escalier. Les corbeaux y sont bien montés.',
    '',
    '',
    qu.`imagePath`,
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000
FROM `adventures` ad
    JOIN `quests` qu ON qu.`enTitle` = 'The Crow''s Ascent'
WHERE ad.`enTitle` = 'The Iron Lord''s Conquest';
--> statement-breakpoint
INSERT INTO `adventure_steps` (
        `adventureId`,
        `stepIndex`,
        `questId`,
        `enNarrative`,
        `frNarrative`,
        `enOutroNarrative`,
        `frOutroNarrative`,
        `imagePath`,
        `createdAt`,
        `updatedAt`
    )
SELECT ad.`id`,
    2,
    qu.`id`,
    'His guards stand on their hands to mock you. Answer them.',
    'Ses gardes se tiennent sur les mains pour vous narguer. Répondez-leur.',
    '',
    '',
    qu.`imagePath`,
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000
FROM `adventures` ad
    JOIN `quests` qu ON qu.`enTitle` = 'The Colossus Trial'
WHERE ad.`enTitle` = 'The Iron Lord''s Conquest';
--> statement-breakpoint
INSERT INTO `adventure_steps` (
        `adventureId`,
        `stepIndex`,
        `questId`,
        `enNarrative`,
        `frNarrative`,
        `enOutroNarrative`,
        `frOutroNarrative`,
        `imagePath`,
        `createdAt`,
        `updatedAt`
    )
SELECT ad.`id`,
    3,
    qu.`id`,
    'Take the keep, then make it yours. You will need somewhere to fall back to.',
    'Prenez le donjon, puis faites-le vôtre. Il vous faudra un repli.',
    '',
    '',
    qu.`imagePath`,
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000
FROM `adventures` ad
    JOIN `quests` qu ON qu.`enTitle` = 'Build the Stronghold'
WHERE ad.`enTitle` = 'The Iron Lord''s Conquest';
--> statement-breakpoint
INSERT INTO `adventure_steps` (
        `adventureId`,
        `stepIndex`,
        `questId`,
        `enNarrative`,
        `frNarrative`,
        `enOutroNarrative`,
        `frOutroNarrative`,
        `imagePath`,
        `createdAt`,
        `updatedAt`
    )
SELECT ad.`id`,
    4,
    qu.`id`,
    'The gauntlet is not a test. It is what is left of the men who failed it.',
    'Le gant n''est pas une épreuve. C''est ce qui reste des hommes qui l''ont ratée.',
    '',
    '',
    qu.`imagePath`,
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000
FROM `adventures` ad
    JOIN `quests` qu ON qu.`enTitle` = 'The Iron Gauntlet Challenge'
WHERE ad.`enTitle` = 'The Iron Lord''s Conquest';
--> statement-breakpoint
INSERT INTO `adventure_steps` (
        `adventureId`,
        `stepIndex`,
        `questId`,
        `enNarrative`,
        `frNarrative`,
        `enOutroNarrative`,
        `frOutroNarrative`,
        `imagePath`,
        `createdAt`,
        `updatedAt`
    )
SELECT ad.`id`,
    5,
    qu.`id`,
    'His throne is at the top and there is still no stair.',
    'Son trône est au sommet et il n''y a toujours pas d''escalier.',
    '',
    '',
    qu.`imagePath`,
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000
FROM `adventures` ad
    JOIN `quests` qu ON qu.`enTitle` = 'Climb the Titan''s Tower'
WHERE ad.`enTitle` = 'The Iron Lord''s Conquest';
--> statement-breakpoint
INSERT INTO `adventure_steps` (
        `adventureId`,
        `stepIndex`,
        `questId`,
        `enNarrative`,
        `frNarrative`,
        `enOutroNarrative`,
        `frOutroNarrative`,
        `imagePath`,
        `createdAt`,
        `updatedAt`
    )
SELECT ad.`id`,
    6,
    qu.`id`,
    'The Iron Lord fights upside down. So will you.',
    'Le Seigneur de Fer combat à l''envers. Vous ferez de même.',
    '',
    '',
    qu.`imagePath`,
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000
FROM `adventures` ad
    JOIN `quests` qu ON qu.`enTitle` = 'The Colossus Trial'
WHERE ad.`enTitle` = 'The Iron Lord''s Conquest';
--> statement-breakpoint
INSERT INTO `adventure_steps` (
        `adventureId`,
        `stepIndex`,
        `questId`,
        `enNarrative`,
        `frNarrative`,
        `enOutroNarrative`,
        `frOutroNarrative`,
        `imagePath`,
        `createdAt`,
        `updatedAt`
    )
SELECT ad.`id`,
    7,
    qu.`id`,
    'Nothing clever left. Outlast him.',
    'Plus rien d''astucieux. Survivez-lui.',
    '',
    '',
    qu.`imagePath`,
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000
FROM `adventures` ad
    JOIN `quests` qu ON qu.`enTitle` = 'The Iron Gauntlet Challenge'
WHERE ad.`enTitle` = 'The Iron Lord''s Conquest';
--> statement-breakpoint
-- Re-tune the two shipped bosses and order the catalogue as a difficulty ramp.
UPDATE `adventures`
SET `bossTotalHp` = 1080,
    `sortOrder` = 7,
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Iron Lord''s Conquest';
--> statement-breakpoint
UPDATE `adventures`
SET `bossTotalHp` = 380,
    `sortOrder` = 4,
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Golem';
--> statement-breakpoint
UPDATE `adventures`
SET `sortOrder` = 1,
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Lumber Route';
--> statement-breakpoint
-- Boss fight rows are created lazily by db/bossFights.ts and cache totalHp at creation
-- time, so an install that already opened The Golem or the Iron Lord keeps the old value.
-- Undefeated fights are reset to the new total; defeated ones are left alone so a win stays won.
UPDATE `boss_fights`
SET `totalHp` = (
        SELECT ad.`bossTotalHp`
        FROM `adventures` ad
        WHERE ad.`id` = `boss_fights`.`adventureId`
    ),
    `currentHp` = (
        SELECT ad.`bossTotalHp`
        FROM `adventures` ad
        WHERE ad.`id` = `boss_fights`.`adventureId`
    ),
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `defeatedAt` IS NULL
    AND (
        SELECT ad.`bossTotalHp`
        FROM `adventures` ad
        WHERE ad.`id` = `boss_fights`.`adventureId`
    ) IS NOT NULL;
--> statement-breakpoint
-- Intended art paths for the phase C/D content. The files do not exist yet; getQuestAsset /
-- getExerciseAsset resolve an unknown key to the placeholder, so setting the target now means
-- the art pass is a matter of dropping files in and adding assetMap keys, with no more SQL.
--> statement-breakpoint
UPDATE `quests` SET `imagePath` = 'assets/images/quests/squire_awakening.jpg' WHERE `enTitle` = 'The Squire''s Awakening';
--> statement-breakpoint
UPDATE `quests` SET `imagePath` = 'assets/images/quests/bears_road.jpg' WHERE `enTitle` = 'The Bear''s Road';
--> statement-breakpoint
UPDATE `quests` SET `imagePath` = 'assets/images/quests/cellar_hauler.jpg' WHERE `enTitle` = 'The Cellar Hauler';
--> statement-breakpoint
UPDATE `quests` SET `imagePath` = 'assets/images/quests/ploughmans_vow.jpg' WHERE `enTitle` = 'The Ploughman''s Vow';
--> statement-breakpoint
UPDATE `quests` SET `imagePath` = 'assets/images/quests/crows_ascent.jpg' WHERE `enTitle` = 'The Crow''s Ascent';
--> statement-breakpoint
UPDATE `quests` SET `imagePath` = 'assets/images/quests/colossus_trial.jpg' WHERE `enTitle` = 'The Colossus Trial';
--> statement-breakpoint
UPDATE `quests` SET `imagePath` = 'assets/images/quests/storm_of_blades.jpg' WHERE `enTitle` = 'Storm of Blades';
--> statement-breakpoint
UPDATE `quests` SET `imagePath` = 'assets/images/quests/serpents_coil.jpg' WHERE `enTitle` = 'The Serpent''s Coil';
--> statement-breakpoint
UPDATE `exercises` SET `imagePath` = 'assets/images/exercises/table_row.png' WHERE `enName` = 'Table Row';
--> statement-breakpoint
UPDATE `exercises` SET `imagePath` = 'assets/images/exercises/towel_door_row.png' WHERE `enName` = 'Towel Door Row';
--> statement-breakpoint
UPDATE `adventure_steps`
SET `imagePath` = (
        SELECT qu.`imagePath`
        FROM `quests` qu
        WHERE qu.`id` = `adventure_steps`.`questId`
    );
