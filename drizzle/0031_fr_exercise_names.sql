-- French movement names: the ones a French athlete would actually say.
--
-- `0030` fixed the casing; this fixes the vocabulary underneath it. Three conventions had grown
-- side by side — assumed anglicism (Burpee, Crunch, L-Sit, Dips), the real French term (Fente,
-- Tractions, Chaise, Pompes), and word-for-word calque (« Insecte mort », « Grimpeur de
-- montagne »). The third is what reads as untranslated software, so it goes.
--
-- Same mechanism as 0029 and 0030: seed migrations are immutable once shipped, so this is an
-- UPDATE pass keyed on the exact old text. `enName` is deliberately untouched — it is the key
-- `constants/warmup.ts`, `PATH_NAMES` and `OATH_PRESETS` reference movements by, and renaming it
-- is a code change, not a content one.

-- ============================================================
-- PART 1: WRONG, NOT JUST AWKWARD
-- ============================================================

-- « Unijambiste » names a person missing a leg, not an exercise done on one.
UPDATE `exercises` SET `frName` = 'Soulevé de terre à une jambe' WHERE `frName` = 'Soulevé de terre unijambiste';
--> statement-breakpoint
-- Calques of movements whose French name simply is the English one. A coach says « dead bug » and
-- « hollow body »; nobody says « insecte mort ». « Grimpeur de montagne » is doubly redundant —
-- a grimpeur already climbs.
UPDATE `exercises` SET `frName` = 'Dead bug' WHERE `frName` = 'Insecte mort';
--> statement-breakpoint
UPDATE `exercises` SET `frName` = 'Hollow body' WHERE `frName` = 'Maintien corps creux';
--> statement-breakpoint
UPDATE `exercises` SET `frName` = 'Mountain climber' WHERE `frName` = 'Grimpeur de montagne';
--> statement-breakpoint
-- « La planche » is the straight-arm calisthenics skill, not the floor hold — a collision that
-- only gets worse as the catalogue gains calisthenics movements (`0033` seeds Planche groupée).
-- « Gainage ventral »/« Gainage latéral » is the actual French pair. Not bare « Gainage »: that is
-- already the French label of the `core` pattern and the `core` archetype (`db/patterns.ts`), so
-- the exercise sheet would read « Gainage · Gainage ».
UPDATE `exercises` SET `frName` = 'Gainage ventral' WHERE `frName` = 'Planche';
--> statement-breakpoint
UPDATE `exercises` SET `frName` = 'Gainage latéral' WHERE `frName` = 'Planche latérale';
--> statement-breakpoint

-- ============================================================
-- PART 2: UNDERSTOOD, BUT NOT THE TERM OF THE TRADE
-- ============================================================

UPDATE `exercises` SET `frName` = 'Russian twist' WHERE `frName` = 'Rotation russe';
--> statement-breakpoint
-- The English name is just "Superman"; the French one invented a noun the movement never had.
UPDATE `exercises` SET `frName` = 'Superman' WHERE `frName` = 'Extension Superman';
--> statement-breakpoint
UPDATE `exercises` SET `frName` = 'Extensions des mollets debout' WHERE `frName` = 'Extension mollets debout';
--> statement-breakpoint
-- « Suspendu » agreed with « relevé », which made the leg-raise the thing hanging.
UPDATE `exercises` SET `frName` = 'Relevé de jambes à la barre' WHERE `frName` = 'Relevé de jambes suspendu';
--> statement-breakpoint
-- "World's Greatest Stretch" is the movement's name, not a description of its size.
UPDATE `exercises` SET `frName` = 'Le meilleur étirement du monde' WHERE `frName` = 'Le grand étirement';
--> statement-breakpoint

-- ============================================================
-- PART 3: DETAIL
-- ============================================================

-- ATR — appui tendu renversé — is the French gym term, and « Pompe en équilibre sur les mains »
-- is 31 characters in a session card.
UPDATE `exercises` SET `frName` = 'Pompe en ATR' WHERE `frName` = 'Pompe en équilibre sur les mains';
--> statement-breakpoint
UPDATE `exercises` SET `frName` = 'Pompe piquée' WHERE `frName` = 'Pompe pike';
--> statement-breakpoint
UPDATE `exercises` SET `frName` = 'Crunch bicyclette' WHERE `frName` = 'Crunch vélo';
--> statement-breakpoint
-- The yoga postures already speak as « Posture du … » (guerrier, pigeon); the cobra was the one
-- filed as a stretch. « Pince debout » is Uttanasana's French name.
UPDATE `exercises` SET `frName` = 'Posture du cobra' WHERE `frName` = 'Étirement du cobra';
--> statement-breakpoint
UPDATE `exercises` SET `frName` = 'Pince debout' WHERE `frName` = 'Flexion avant debout';
--> statement-breakpoint
UPDATE `exercises` SET `frName` = 'Rotations de poignets' WHERE `frName` = 'Cercles de poignets';
