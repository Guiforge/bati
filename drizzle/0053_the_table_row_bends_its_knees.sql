-- Table Row and Inverted Row were the same movement on two different anchors.
--
-- Issue #94: "I could not understand how Table Row has a lower difficulty than Inverted Row ...
-- it appears that they are the same exercise, also known as Australian Pull-Ups, just with
-- different equipment." It was. Both were seeded `medium` (`0010`, `0015`), both descriptions
-- said "body straight, pull your chest to the edge", and only the ladder (`0022`: Towel Door Row
-- -> Table Row -> Inverted Row) said one came before the other. What actually makes a row harder
-- is the body angle and the lever, not whether the hands hold a table or a bar: the research
-- dossier's own pulling note is "reduce body angle" (docs/raw/bodyweight-app-research.md §2).
--
-- The rungs keep their order and become two different positions:
--
--   Table Row      knees bent, feet flat: a short lever, the easier row, still no equipment
--   Inverted Row   legs straight, one line from heels to shoulders, and lower is harder
--
-- So Table Row is `easy` now, which also means its sets are weighed as easy by XP. The art for
-- Table Row still shows straight legs; that is recorded in docs/content/missing-image.md.
--
-- `AND creator = 'Admin'` on every statement: rule 2 of the two-population model (`0035`).

UPDATE `exercises` SET
    `difficulty` = 'easy',
    `enDescription` = 'Lie under a sturdy table, grip the edge with both hands, bend your knees and plant your feet flat, then pull your chest to the table and lower with control. Walking your feet further out makes it harder.',
    `frDescription` = 'Allonge-toi sous une table solide, saisis le bord à deux mains, plie les genoux et pose les pieds à plat, puis tire la poitrine vers la table et redescends avec contrôle. Éloigner les pieds rend l''exercice plus dur.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Table Row' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `enDescription` = 'Hang under a low bar with your legs straight and your body in one line from heels to shoulders, pull your chest up to the bar by squeezing your shoulder blades, then lower with control. The lower the bar, the harder it gets.',
    `frDescription` = 'Suspends-toi sous une barre basse jambes tendues, le corps aligné des talons aux épaules, tire la poitrine vers la barre en rapprochant les omoplates, puis redescends avec contrôle. Plus la barre est basse, plus c''est dur.',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Inverted Row' AND `creator` = 'Admin';
