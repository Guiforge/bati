-- Covers for the hand-authored content (adventures 0003, quests 0002) that previously
-- fell back to placeholder.jpg. Images generated via scripts/generate-covers.py.
-- See docs/content/missing-covers.md.
UPDATE `adventures` SET `imagePath` = 'assets/images/adventures/lumber_route.jpg' WHERE `enTitle` = 'The Lumber Route';
--> statement-breakpoint
UPDATE `adventures` SET `imagePath` = 'assets/images/adventures/the_golem.jpg' WHERE `enTitle` = 'The Golem';
--> statement-breakpoint
UPDATE `quests` SET `imagePath` = 'assets/images/quests/chop_wood.jpg' WHERE `enTitle` = 'Chop Wood';
--> statement-breakpoint
UPDATE `quests` SET `imagePath` = 'assets/images/quests/gather_stones.jpg' WHERE `enTitle` = 'Gather Stones';
--> statement-breakpoint
UPDATE `quests` SET `imagePath` = 'assets/images/quests/raise_the_shelter.jpg' WHERE `enTitle` = 'Raise the Shelter';
--> statement-breakpoint
UPDATE `quests` SET `imagePath` = 'assets/images/quests/golem_strike.jpg' WHERE `enTitle` = 'Golem Strike';
--> statement-breakpoint
UPDATE `quests` SET `imagePath` = 'assets/images/quests/golem_core.jpg' WHERE `enTitle` = 'Golem Core';
--> statement-breakpoint
UPDATE `quests` SET `imagePath` = 'assets/images/quests/tower_climb.jpg' WHERE `enTitle` = 'Tower Climb';
--> statement-breakpoint
UPDATE `quests` SET `imagePath` = 'assets/images/quests/knight_push.jpg' WHERE `enTitle` = 'Knight Push';
--> statement-breakpoint
UPDATE `quests` SET `imagePath` = 'assets/images/quests/shield_wall.jpg' WHERE `enTitle` = 'Shield Wall';
--> statement-breakpoint
UPDATE `quests` SET `imagePath` = 'assets/images/quests/core_forge.jpg' WHERE `enTitle` = 'Core Forge';
--> statement-breakpoint
-- Re-sync adventure step covers from their quest (0008 ran before these quests had images).
UPDATE `adventure_steps` SET `imagePath` = (SELECT `imagePath` FROM `quests` WHERE `quests`.`id` = `adventure_steps`.`questId`);
--> statement-breakpoint
-- The 6 generic exercises (0001) used by the hand-authored quests had no imagePath and rendered
-- placeholder.jpg during workouts. Dedicated art generated via scripts/generate-exercises.py.
UPDATE `exercises` SET `imagePath` = 'assets/images/exercises/squat.png'    WHERE `enName` = 'Squat';
--> statement-breakpoint
UPDATE `exercises` SET `imagePath` = 'assets/images/exercises/pushups.png'  WHERE `enName` = 'Push-ups';
--> statement-breakpoint
UPDATE `exercises` SET `imagePath` = 'assets/images/exercises/pullups.png'  WHERE `enName` = 'Pull-ups';
--> statement-breakpoint
UPDATE `exercises` SET `imagePath` = 'assets/images/exercises/wall_sit.png' WHERE `enName` = 'Wall Sit';
--> statement-breakpoint
UPDATE `exercises` SET `imagePath` = 'assets/images/exercises/plank.png'    WHERE `enName` = 'Plank';
--> statement-breakpoint
UPDATE `exercises` SET `imagePath` = 'assets/images/exercises/crunch.png'   WHERE `enName` = 'Crunch';
