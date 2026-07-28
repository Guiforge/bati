-- Phase F3 of docs/planning/work-roadmap.md §8.
-- Every quest was authored against a declared archetype -- what kind of session it is meant to
-- be, which sets its rest range, its rep targets and how its exercises may stack. That
-- declaration lived only in a hand-maintained map inside __tests__/content-invariants.test.ts,
-- which meant the app itself could not tell a strength day from a cardio one, and the plan's
-- own idea of deriving it at read time does not survive contact with the muscle taxonomy: a
-- metabolic quest and a full-body circuit are indistinguishable from rest length and tags alone.
--
-- So it becomes a column. The test now reads it from here instead of duplicating it, and the
-- quest card can say what kind of session it is before the hero starts.
--
-- Nullable on purpose: user-authored quests have no archetype, and their card simply shows one
-- badge fewer.
ALTER TABLE `quests` ADD `archetype` text;
--> statement-breakpoint
UPDATE `quests` SET `archetype` = 'circuit' WHERE `enTitle` = 'Chop Wood';
--> statement-breakpoint
UPDATE `quests` SET `archetype` = 'hypertrophy' WHERE `enTitle` = 'Tower Climb';
--> statement-breakpoint
UPDATE `quests` SET `archetype` = 'circuit' WHERE `enTitle` = 'Knight Push';
--> statement-breakpoint
UPDATE `quests` SET `archetype` = 'core' WHERE `enTitle` = 'Shield Wall';
--> statement-breakpoint
UPDATE `quests` SET `archetype` = 'circuit' WHERE `enTitle` = 'Gather Stones';
--> statement-breakpoint
UPDATE `quests` SET `archetype` = 'circuit' WHERE `enTitle` = 'Raise the Shelter';
--> statement-breakpoint
UPDATE `quests` SET `archetype` = 'core' WHERE `enTitle` = 'Core Forge';
--> statement-breakpoint
UPDATE `quests` SET `archetype` = 'circuit' WHERE `enTitle` = 'Golem Strike';
--> statement-breakpoint
UPDATE `quests` SET `archetype` = 'core' WHERE `enTitle` = 'Golem Core';
--> statement-breakpoint
UPDATE `quests` SET `archetype` = 'strength' WHERE `enTitle` = 'Forge the Dragon Blade';
--> statement-breakpoint
UPDATE `quests` SET `archetype` = 'strength' WHERE `enTitle` = 'Climb the Titan''s Tower';
--> statement-breakpoint
UPDATE `quests` SET `archetype` = 'hypertrophy' WHERE `enTitle` = 'Build the Stronghold';
--> statement-breakpoint
UPDATE `quests` SET `archetype` = 'strength' WHERE `enTitle` = 'The Iron Gauntlet Challenge';
--> statement-breakpoint
UPDATE `quests` SET `archetype` = 'metabolic' WHERE `enTitle` = 'Escape the Collapsing Mine';
--> statement-breakpoint
UPDATE `quests` SET `archetype` = 'core' WHERE `enTitle` = 'Guard the Fortress Gate';
--> statement-breakpoint
UPDATE `quests` SET `archetype` = 'core' WHERE `enTitle` = 'The Arcane Gauntlet';
--> statement-breakpoint
UPDATE `quests` SET `archetype` = 'mobility' WHERE `enTitle` = 'The Druid''s Path';
--> statement-breakpoint
UPDATE `quests` SET `archetype` = 'metabolic' WHERE `enTitle` = 'Sprint Through the Shadowlands';
--> statement-breakpoint
UPDATE `quests` SET `archetype` = 'circuit' WHERE `enTitle` = 'Morning of the Champion';
--> statement-breakpoint
UPDATE `quests` SET `archetype` = 'circuit' WHERE `enTitle` = 'The Squire''s Awakening';
--> statement-breakpoint
UPDATE `quests` SET `archetype` = 'circuit' WHERE `enTitle` = 'The Bear''s Road';
--> statement-breakpoint
UPDATE `quests` SET `archetype` = 'hypertrophy' WHERE `enTitle` = 'The Cellar Hauler';
--> statement-breakpoint
UPDATE `quests` SET `archetype` = 'hypertrophy' WHERE `enTitle` = 'The Ploughman''s Vow';
--> statement-breakpoint
UPDATE `quests` SET `archetype` = 'strength' WHERE `enTitle` = 'The Crow''s Ascent';
--> statement-breakpoint
UPDATE `quests` SET `archetype` = 'skill' WHERE `enTitle` = 'The Colossus Trial';
--> statement-breakpoint
UPDATE `quests` SET `archetype` = 'metabolic' WHERE `enTitle` = 'Storm of Blades';
--> statement-breakpoint
UPDATE `quests` SET `archetype` = 'core' WHERE `enTitle` = 'The Serpent''s Coil';
