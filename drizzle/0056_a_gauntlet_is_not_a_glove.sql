-- Three seeded French lines that took the wrong sense of an English word, or a verb that cannot
-- carry the object the English gave it.
--
-- "The Arcane Gauntlet" became "Le Gant Arcanique", and a gant is the glove you wear in winter.
-- The quest already next to it in the gallery says "Gantelet de Fer", which is the word: the
-- armoured one. The Iron Lord's fourth step makes the same slip, "Le gant n'est pas une épreuve",
-- about what is left of the men who failed it. A gantelet is masculine, so the line stops agreeing
-- with the trial it was mistaken for.
--
-- The Ranger's Journey fifth step said "Rampe la fin des pins". Ramper takes no object in French;
-- the hero crawls through the last of the pines, they do not crawl the pines.
--
-- English untouched: none of it is wrong. `author = 'Admin'` on quests and adventures scopes each
-- update to the seeded row, the same key 0048 used.
UPDATE `quests` SET
    `frTitle` = 'Le Gantelet Arcanique',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enTitle` = 'The Arcane Gauntlet' AND `author` = 'Admin';
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `frNarrative` = 'Le gantelet n''est pas une épreuve. C''est ce qui reste des hommes qui y ont échoué.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 4
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Iron Lord''s Conquest' AND `author` = 'Admin'
    );
--> statement-breakpoint
UPDATE `adventure_steps` SET
    `frNarrative` = 'Les jambes ne répondent plus. Finis les pins en rampant s''il ne te reste que ça.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `stepIndex` = 5
    AND `adventureId` = (
        SELECT `id` FROM `adventures` WHERE `enTitle` = 'The Ranger''s Journey' AND `author` = 'Admin'
    );
