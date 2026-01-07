-- Create adventure wrappers for quests (excluding boss-specific quests which will be handled by boss adventure)
INSERT INTO `adventures` (
        `questId`,
        `enTitle`,
        `frTitle`,
        `enDescription`,
        `frDescription`,
        `sortOrder`,
        `kind`,
        `isActive`,
        `createdAt`,
        `updatedAt`
    )
SELECT `id`,
    `enTitle`,
    `frTitle`,
    `enDescription`,
    `frDescription`,
    `id`,
    'route',
    1,
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000
FROM `quests`
WHERE `enTitle` NOT IN (
        'Golem Strike',
        'Golem Core',
        'Gather Stones',
        'Raise the Shelter'
    );
--> statement-breakpoint
-- Create adventure steps (one step per adventure pointing to same quest)
INSERT INTO `adventure_steps` (
        `adventureId`,
        `stepIndex`,
        `questId`,
        `createdAt`,
        `updatedAt`
    )
SELECT `id`,
    0,
    `questId`,
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000
FROM `adventures`;
--> statement-breakpoint
-- Campaign: Lumber Route (multi-step)
UPDATE `adventures`
SET `enTitle` = 'The Lumber Route',
    `frTitle` = 'La route du bûcheron',
    `enDescription` = 'Build your first shelter. Chop wood, gather stones, raise the walls.',
    `frDescription` = 'Construis ton premier abri. Coupe du bois, rassemble des pierres, élève les murs.',
    `kind` = 'campaign'
WHERE `questId` = (
        SELECT `id`
        FROM `quests`
        WHERE `enTitle` = 'Chop Wood'
    );
--> statement-breakpoint
-- Add campaign steps
INSERT INTO `adventure_steps` (
        `adventureId`,
        `stepIndex`,
        `questId`,
        `enNarrative`,
        `frNarrative`,
        `createdAt`,
        `updatedAt`
    )
SELECT (
        SELECT `id`
        FROM `adventures`
        WHERE `enTitle` = 'The Lumber Route'
    ),
    1,
    (
        SELECT `id`
        FROM `quests`
        WHERE `enTitle` = 'Gather Stones'
    ),
    'Stones and wood. Your core is the cart: keep it stable.',
    'Pierres et bois. Ton gainage est la charrette : garde-la stable.',
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000;
--> statement-breakpoint
INSERT INTO `adventure_steps` (
        `adventureId`,
        `stepIndex`,
        `questId`,
        `enNarrative`,
        `frNarrative`,
        `createdAt`,
        `updatedAt`
    )
SELECT (
        SELECT `id`
        FROM `adventures`
        WHERE `enTitle` = 'The Lumber Route'
    ),
    2,
    (
        SELECT `id`
        FROM `quests`
        WHERE `enTitle` = 'Raise the Shelter'
    ),
    'Raise the shelter. One last effort now, comfort later.',
    'Dresse l''abri. Un dernier effort maintenant, du confort ensuite.',
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000;
--> statement-breakpoint
-- Update first step narrative
UPDATE `adventure_steps`
SET `enNarrative` = 'The forest edge is near. Chop clean, breathe calm.',
    `frNarrative` = 'La lisière de la forêt est proche. Coupe net, respire calmement.'
WHERE `adventureId` = (
        SELECT `id`
        FROM `adventures`
        WHERE `enTitle` = 'The Lumber Route'
    )
    AND `stepIndex` = 0;
--> statement-breakpoint
-- Boss Adventure: The Golem
INSERT INTO `adventures` (
        `questId`,
        `enTitle`,
        `frTitle`,
        `enDescription`,
        `frDescription`,
        `sortOrder`,
        `kind`,
        `isActive`,
        `bossTotalHp`,
        `bossWeaknessMuscle`,
        `bossResistanceMuscle`,
        `createdAt`,
        `updatedAt`
    )
SELECT (
        SELECT `id`
        FROM `quests`
        WHERE `enTitle` = 'Golem Strike'
    ),
    'The Golem',
    'Le golem',
    'A stone golem blocks your path. Destroy it with strength and endurance.',
    'Un golem de pierre bloque ton chemin. Détruis-le avec force et endurance.',
    100,
    'boss',
    1,
    200,
    'chest',
    'back',
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000;
--> statement-breakpoint
-- Boss adventure steps
INSERT INTO `adventure_steps` (
        `adventureId`,
        `stepIndex`,
        `questId`,
        `enNarrative`,
        `frNarrative`,
        `createdAt`,
        `updatedAt`
    )
SELECT (
        SELECT `id`
        FROM `adventures`
        WHERE `enTitle` = 'The Golem'
    ),
    0,
    (
        SELECT `id`
        FROM `quests`
        WHERE `enTitle` = 'Golem Strike'
    ),
    'The ground trembles. Center yourself.',
    'Le sol tremble. Centre-toi.',
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000;
--> statement-breakpoint
INSERT INTO `adventure_steps` (
        `adventureId`,
        `stepIndex`,
        `questId`,
        `enNarrative`,
        `frNarrative`,
        `createdAt`,
        `updatedAt`
    )
SELECT (
        SELECT `id`
        FROM `adventures`
        WHERE `enTitle` = 'The Golem'
    ),
    1,
    (
        SELECT `id`
        FROM `quests`
        WHERE `enTitle` = 'Golem Core'
    ),
    'Now. Strike harder than it strikes you.',
    'Maintenant. Frappe plus fort qu''il ne te frappe.',
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000;