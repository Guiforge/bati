-- Update Quests with Image Paths
UPDATE `quests` SET `imagePath` = 'assets/images/quests/escape_collapsing_mine.jpg' WHERE `enTitle` = 'Escape the Collapsing Mine';
--> statement-breakpoint
UPDATE `quests` SET `imagePath` = 'assets/images/quests/guard_fortress_gate.jpg' WHERE `enTitle` = 'Guard the Fortress Gate';
--> statement-breakpoint
UPDATE `quests` SET `imagePath` = 'assets/images/quests/forge_dragon_blade.jpg' WHERE `enTitle` = 'Forge the Dragon Blade';
--> statement-breakpoint
UPDATE `quests` SET `imagePath` = 'assets/images/quests/climb_titan_tower.jpg' WHERE `enTitle` = 'Climb the Titan''s Tower';
--> statement-breakpoint
UPDATE `quests` SET `imagePath` = 'assets/images/quests/arcane_gauntlet.jpg' WHERE `enTitle` = 'The Arcane Gauntlet';
--> statement-breakpoint
UPDATE `quests` SET `imagePath` = 'assets/images/quests/druid_path.jpg' WHERE `enTitle` = 'The Druid''s Path';
--> statement-breakpoint
UPDATE `quests` SET `imagePath` = 'assets/images/quests/sprint_shadowlands.jpg' WHERE `enTitle` = 'Sprint Through the Shadowlands';
--> statement-breakpoint
UPDATE `quests` SET `imagePath` = 'assets/images/quests/build_stronghold.jpg' WHERE `enTitle` = 'Build the Stronghold';
--> statement-breakpoint
UPDATE `quests` SET `imagePath` = 'assets/images/quests/iron_gauntlet_challenge.jpg' WHERE `enTitle` = 'The Iron Gauntlet Challenge';
--> statement-breakpoint
UPDATE `quests` SET `imagePath` = 'assets/images/quests/morning_champion.jpg' WHERE `enTitle` = 'Morning of the Champion';

-- Update Adventures with Image Paths
UPDATE `adventures` SET `imagePath` = 'assets/images/adventures/scout_trial.jpg' WHERE `enTitle` = 'The Scout''s Trial';
--> statement-breakpoint
UPDATE `adventures` SET `imagePath` = 'assets/images/adventures/guardian_oath.jpg' WHERE `enTitle` = 'The Guardian''s Oath';
--> statement-breakpoint
UPDATE `adventures` SET `imagePath` = 'assets/images/adventures/monk_enlightenment.jpg' WHERE `enTitle` = 'The Monk''s Enlightenment';
--> statement-breakpoint
UPDATE `adventures` SET `imagePath` = 'assets/images/adventures/ranger_journey.jpg' WHERE `enTitle` = 'The Ranger''s Journey';
--> statement-breakpoint
UPDATE `adventures` SET `imagePath` = 'assets/images/adventures/iron_lord_conquest.jpg' WHERE `enTitle` = 'The Iron Lord''s Conquest';

-- Update Adventure Steps with Quest Images
UPDATE `adventure_steps` SET `imagePath` = (SELECT `imagePath` FROM `quests` WHERE `quests`.`id` = `adventure_steps`.`questId`);
