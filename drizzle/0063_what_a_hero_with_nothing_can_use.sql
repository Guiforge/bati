-- Two movements tagged "No equipment" that opened by naming equipment.
--
-- The Dips page showed "Sans matériel" over a description whose first words asked for two
-- parallel bars (exercise sheet audit, 2026-09-15). Dragon Flag did the same with a bench. Both
-- already offered the free alternative, second: "or a sturdy edge", "or the floor". Only the
-- order was wrong, so only the order changes.
--
-- The tag is not what is wrong here. `equipment` is read by `canDo`, which decides what a hero
-- who answered "I own nothing" is offered — and a sturdy edge is furniture, not kit. Moving Dip
-- to `dip_bar` would take "Forge the Dragon Blade" and "The Iron Gauntlet Challenge" away from
-- that hero, and widen the `EQUIPMENT_QUESTS` list in `content-invariants` to let the first of
-- them through. The catalogue is equipment-free apart from the vertical pulls on purpose, and
-- that is the decision this keeps.
--
-- These are the only two: every other `equipment = 'none'` movement that names a thing names one
-- nobody buys, a wall, a table, a door handle, a chair.
--
-- `creator = 'Admin'` on both, per `0035`: a hero may have written their own "Dip".
UPDATE `exercises` SET
  `enDescription` = 'Support yourself on a sturdy edge or two parallel bars, lower until the shoulders drop to elbow height, then press back to fully locked arms. Stop short of pain in the shoulder, never short of the lockout.',
  `frDescription` = 'En appui sur un rebord stable ou deux barres parallèles, descends jusqu''à ce que les épaules arrivent à hauteur des coudes, puis remonte bras complètement verrouillés. Arrête-toi avant la douleur à l''épaule, jamais avant le verrouillage.',
  `deDescription` = 'Stütz dich auf eine stabile Kante oder zwei Barren, senk dich ab, bis die Schultern auf Ellbogenhöhe sind, und drück dich wieder bis zu durchgestreckten Armen hoch. Hör vor dem Schmerz in der Schulter auf, nie vor dem Durchstrecken.',
  `esDescription` = 'Apóyate en un borde firme o en dos barras paralelas, baja hasta que los hombros lleguen a la altura de los codos y vuelve a subir hasta bloquear los brazos. Para antes del dolor en el hombro, nunca antes del bloqueo.'
WHERE `enName` = 'Dip' AND `creator` = 'Admin';--> statement-breakpoint
UPDATE `exercises` SET
  `enDescription` = 'Lying on the floor or a bench, grip something solid behind your head and lift the whole body onto the shoulders in one rigid line, then lower it slowly without letting the hips fold.',
  `frDescription` = 'Allongé au sol ou sur un banc, agrippe un point fixe derrière la tête et soulève tout le corps en appui sur les épaules, d''une seule ligne rigide, puis redescends lentement sans laisser les hanches se plier.',
  `deDescription` = 'Auf dem Boden oder einer Bank liegend greifst du hinter dem Kopf etwas Festes und hebst den ganzen Körper in einer starren Linie auf die Schultern, dann senkst du ihn langsam ab, ohne in der Hüfte einzuknicken.',
  `esDescription` = 'Túmbate en el suelo o en un banco, agarra algo firme detrás de la cabeza y eleva todo el cuerpo sobre los hombros en una línea rígida, y luego bájalo despacio sin dejar que la cadera se doble.'
WHERE `enName` = 'Dragon Flag' AND `creator` = 'Admin';
