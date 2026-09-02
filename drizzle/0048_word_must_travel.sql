-- An adventure finally leaves the walls.
--
-- 0042 seeded three outings and nothing traversed them: they sat in the gallery as a door with
-- no story behind it. This makes one of them a chapter. The Squire's Path is the on-ramp every
-- new hero meets first (sortOrder 0, no bar, no boss), and its four steps end with the squire
-- working the fields. A message that has to reach the next village before dark is the errand a
-- squire runs before being handed a blade, so 'Word Must Travel' is its fifth and last step.
--
-- Why The Squire's Path and not The Lumber Route: a boss campaign cannot host a march (a walk
-- does not deal damage, and the boss has to fall on the last step), which leaves two routes.
-- __tests__/db-adventures-campaign.test.ts plays The Lumber Route end to end and expects it to
-- finish on its third step; The Squire's Path is played by nothing but the hero.
--
-- A hero mid-way through the campaign is not shifted. `startAdventureRun` (db/adventures.ts)
-- copies the template steps into `adventure_run_steps` when the run starts, and
-- `completeAdventureRunStep` walks the run's own rows, never the template. An active run
-- therefore finishes after The Ploughman's Vow exactly as it would have yesterday; the new step
-- shows as locked on that run's screen and is played on the next one. Appended rather than
-- inserted, because the campaign screen matches run statuses to template steps by `stepIndex`.
--
-- Nothing here reaches `exercises`. `quests` is looked up by title, and a hero can name a quest
-- too, so the read is scoped to `author = 'Admin'` for the same reason 0045 scoped its writes.
--
-- The campaign's description said "four marches" and carried an em dash into the gallery. Both
-- fixed here, in the same voice: no addressee, the story and only the story.

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
    'The shield sits right on the arm now. What remains before the blade is a message for the next village, due before dark, with only a squire''s legs to carry it.',
    'Le bouclier tient sur le bras, désormais. Reste, avant la lame, un pli pour le village voisin, attendu avant la nuit, et seules les jambes d''un écuyer pour le porter.',
    'The word arrived while there was still light to read it by. A squire who can carry a message that far can carry a blade.',
    'La parole est arrivée avec encore assez de jour pour la lire. Un écuyer qui porte un message aussi loin peut porter une lame.',
    qu.`imagePath`,
    strftime('%s', 'now') * 1000,
    strftime('%s', 'now') * 1000
FROM `adventures` ad
    JOIN `quests` qu ON qu.`enTitle` = 'Word Must Travel' AND qu.`author` = 'Admin'
WHERE ad.`enTitle` = 'The Squire''s Path' AND ad.`author` = 'Admin';
--> statement-breakpoint
UPDATE `adventures` SET
    `enDescription` = 'Every hero begins as the one who carries the shield. Five marches to earn the right to lift a blade: no bar, no weights, no excuses.',
    `frDescription` = 'Tout héros commence par porter le bouclier des autres. Cinq marches pour gagner le droit de lever une lame : sans barre, sans poids, sans excuse.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Squire''s Path' AND `author` = 'Admin';
