-- Update Quests with Image Paths (Iron Lord's Conquest chain)
UPDATE `quests` SET `imagePath` = 'assets/images/quests/forge_dragon_blade.jpg' WHERE `enTitle` = 'Forge the Dragon Blade';
--> statement-breakpoint
UPDATE `quests` SET `imagePath` = 'assets/images/quests/climb_titan_tower.jpg' WHERE `enTitle` = 'Climb the Titan''s Tower';
--> statement-breakpoint
UPDATE `quests` SET `imagePath` = 'assets/images/quests/build_stronghold.jpg' WHERE `enTitle` = 'Build the Stronghold';
--> statement-breakpoint
UPDATE `quests` SET `imagePath` = 'assets/images/quests/iron_gauntlet_challenge.jpg' WHERE `enTitle` = 'The Iron Gauntlet Challenge';
--> statement-breakpoint
-- Update Adventures with Image Paths
UPDATE `adventures` SET `imagePath` = 'assets/images/adventures/iron_lord_conquest.jpg' WHERE `enTitle` = 'The Iron Lord''s Conquest';
--> statement-breakpoint
-- Update Adventure Steps with Quest Images
UPDATE `adventure_steps` SET `imagePath` = (SELECT `imagePath` FROM `quests` WHERE `quests`.`id` = `adventure_steps`.`questId`);
