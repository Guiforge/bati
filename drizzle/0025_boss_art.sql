-- The boss fight showed the campaign poster. Five boss paintings have shipped in
-- assets/images/bosses/ since the art drop and getBossAsset() was already exported, but nothing
-- ever pointed at them: BossFight.imagePath resolved to adventures.imagePath, the cover for the
-- whole journey. This column gives the monster its own portrait, kept separate from the cover so
-- the gallery still shows a poster and the fight shows the thing you are hitting.
--
-- Hand-written on purpose. `drizzle-kit generate` re-emitted `pattern`, `prerequisiteExerciseId`
-- and `archetype` (already added by 0019/0020/0022) plus a bare DROP INDEX, because the snapshot
-- had drifted from the hand-written migrations. Applying that would abort on a duplicate column.
ALTER TABLE `adventures` ADD `bossImagePath` text;--> statement-breakpoint

-- Six boss campaigns, five paintings: the two wilderness-endurance campaigns share the titan.
UPDATE `adventures` SET `bossImagePath` = 'assets/images/bosses/forest_titan.jpg'
  WHERE `enTitle` = 'The Lumber Route';--> statement-breakpoint
UPDATE `adventures` SET `bossImagePath` = 'assets/images/bosses/fire_dragon.jpg'
  WHERE `enTitle` = 'The Iron Lord''s Conquest';--> statement-breakpoint
UPDATE `adventures` SET `bossImagePath` = 'assets/images/bosses/shadow_serpent.jpg'
  WHERE `enTitle` = 'The Monk''s Enlightenment';--> statement-breakpoint
UPDATE `adventures` SET `bossImagePath` = 'assets/images/bosses/wind_wraith.jpg'
  WHERE `enTitle` = 'The Scout''s Trial';--> statement-breakpoint
UPDATE `adventures` SET `bossImagePath` = 'assets/images/bosses/forest_titan.jpg'
  WHERE `enTitle` = 'The Ranger''s Journey';--> statement-breakpoint
UPDATE `adventures` SET `bossImagePath` = 'assets/images/bosses/stone_golem.jpg'
  WHERE `enTitle` = 'The Guardian''s Oath';
