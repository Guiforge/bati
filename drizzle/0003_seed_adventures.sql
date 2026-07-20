-- Seed the two hand-authored adventures: The Lumber Route (route) and The Golem (boss).
-- Cover quests and step quests come from 0002; boss stats live on the adventures row and a
-- boss_fights row is created lazily by the app (db/bossFights.ts).
DROP INDEX IF EXISTS `adventures_quest_unique`;
--> statement-breakpoint
-- Adventure: The Lumber Route (multi-step route)
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
    'The Lumber Route',
    'La route du bûcheron',
    'Build your first shelter. Chop wood, gather stones, raise the walls.',
    'Construis ton premier abri. Coupe du bois, rassemble des pierres, élève les murs.',
    0,
    'route',
    1,
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000
FROM `quests`
WHERE `enTitle` = 'Chop Wood';
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
SELECT (SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Lumber Route'),
    0,
    (SELECT `id` FROM `quests` WHERE `enTitle` = 'Chop Wood'),
    'The forest edge is near. Chop clean, breathe calm.',
    'La lisière de la forêt est proche. Coupe net, respire calmement.',
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
SELECT (SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Lumber Route'),
    1,
    (SELECT `id` FROM `quests` WHERE `enTitle` = 'Gather Stones'),
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
SELECT (SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Lumber Route'),
    2,
    (SELECT `id` FROM `quests` WHERE `enTitle` = 'Raise the Shelter'),
    'Raise the shelter. One last effort now, comfort later.',
    'Dresse l''abri. Un dernier effort maintenant, du confort ensuite.',
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000;
--> statement-breakpoint
-- Adventure: The Golem (boss)
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
SELECT (SELECT `id` FROM `quests` WHERE `enTitle` = 'Golem Strike'),
    'The Golem',
    'Le golem',
    'A stone golem blocks your path. Destroy it with strength and endurance.',
    'Un golem de pierre bloque ton chemin. Détruis-le avec force et endurance.',
    1,
    'boss',
    1,
    200,
    'chest',
    'back',
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
SELECT (SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Golem'),
    0,
    (SELECT `id` FROM `quests` WHERE `enTitle` = 'Golem Strike'),
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
SELECT (SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Golem'),
    1,
    (SELECT `id` FROM `quests` WHERE `enTitle` = 'Golem Core'),
    'Now. Strike harder than it strikes you.',
    'Maintenant. Frappe plus fort qu''il ne te frappe.',
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000;
