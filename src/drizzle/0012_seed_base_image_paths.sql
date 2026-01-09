-- Backfill image paths for early seeded content (0001 / 0002)
-- Ensures the UI doesn't fall back to assets/placeholder.jpg for built-in exercises and quests.
-- Exercises (map the original basic exercises to existing RPG exercise art)
UPDATE `exercises`
SET `imagePath` = 'assets/images/exercises/goblin_squat.png'
WHERE `enName` = 'Squat'
  AND `imagePath` = 'assets/placeholder.jpg';
--> statement-breakpoint
UPDATE `exercises`
SET `imagePath` = 'assets/images/exercises/dragon_pushup.png'
WHERE `enName` = 'Push-ups'
  AND `imagePath` = 'assets/placeholder.jpg';
--> statement-breakpoint
UPDATE `exercises`
SET `imagePath` = 'assets/images/exercises/iron_grip_pullup.png'
WHERE `enName` = 'Pull-ups'
  AND `imagePath` = 'assets/placeholder.jpg';
--> statement-breakpoint
UPDATE `exercises`
SET `imagePath` = 'assets/images/exercises/wall_sentinel_hold.png'
WHERE `enName` = 'Wall Sit'
  AND `imagePath` = 'assets/placeholder.jpg';
--> statement-breakpoint
UPDATE `exercises`
SET `imagePath` = 'assets/images/exercises/stone_guardian_plank.png'
WHERE `enName` = 'Plank'
  AND `imagePath` = 'assets/placeholder.jpg';
--> statement-breakpoint
UPDATE `exercises`
SET `imagePath` = 'assets/images/exercises/wizard_bicycle_crunch.png'
WHERE `enName` = 'Crunch'
  AND `imagePath` = 'assets/placeholder.jpg';
-- Quests (cover images for the original quest templates)
--> statement-breakpoint
UPDATE `quests`
SET `imagePath` = 'assets/images/quests/build_stronghold.jpg'
WHERE `enTitle` = 'Chop Wood'
  AND (
    `imagePath` IS NULL
    OR `imagePath` = ''
  );
--> statement-breakpoint
UPDATE `quests`
SET `imagePath` = 'assets/images/quests/climb_titan_tower.jpg'
WHERE `enTitle` = 'Tower Climb'
  AND (
    `imagePath` IS NULL
    OR `imagePath` = ''
  );
--> statement-breakpoint
UPDATE `quests`
SET `imagePath` = 'assets/images/quests/iron_gauntlet_challenge.jpg'
WHERE `enTitle` = 'Knight Push'
  AND (
    `imagePath` IS NULL
    OR `imagePath` = ''
  );
--> statement-breakpoint
UPDATE `quests`
SET `imagePath` = 'assets/images/quests/guard_fortress_gate.jpg'
WHERE `enTitle` = 'Shield Wall'
  AND (
    `imagePath` IS NULL
    OR `imagePath` = ''
  );
--> statement-breakpoint
UPDATE `quests`
SET `imagePath` = 'assets/images/quests/escape_collapsing_mine.jpg'
WHERE `enTitle` = 'Gather Stones'
  AND (
    `imagePath` IS NULL
    OR `imagePath` = ''
  );
--> statement-breakpoint
UPDATE `quests`
SET `imagePath` = 'assets/images/quests/build_stronghold.jpg'
WHERE `enTitle` = 'Raise the Shelter'
  AND (
    `imagePath` IS NULL
    OR `imagePath` = ''
  );
--> statement-breakpoint
UPDATE `quests`
SET `imagePath` = 'assets/images/quests/forge_dragon_blade.jpg'
WHERE `enTitle` = 'Core Forge'
  AND (
    `imagePath` IS NULL
    OR `imagePath` = ''
  );
--> statement-breakpoint
UPDATE `quests`
SET `imagePath` = 'assets/images/quests/arcane_gauntlet.jpg'
WHERE `enTitle` = 'Golem Strike'
  AND (
    `imagePath` IS NULL
    OR `imagePath` = ''
  );
--> statement-breakpoint
UPDATE `quests`
SET `imagePath` = 'assets/images/quests/sprint_shadowlands.jpg'
WHERE `enTitle` = 'Golem Core'
  AND (
    `imagePath` IS NULL
    OR `imagePath` = ''
  );
-- Additional quests from 0010_audit_and_content.sql
--> statement-breakpoint
UPDATE `quests`
SET `imagePath` = 'assets/images/quests/escape_collapsing_mine.jpg'
WHERE `enTitle` = 'Carry the Sacred Stones'
  AND (
    `imagePath` IS NULL
    OR `imagePath` = ''
  );
--> statement-breakpoint
UPDATE `quests`
SET `imagePath` = 'assets/images/quests/climb_titan_tower.jpg'
WHERE `enTitle` = 'Mountain Summit Push'
  AND (
    `imagePath` IS NULL
    OR `imagePath` = ''
  );
--> statement-breakpoint
UPDATE `quests`
SET `imagePath` = 'assets/images/quests/sprint_shadowlands.jpg'
WHERE `enTitle` = 'Race Against the Tide'
  AND (
    `imagePath` IS NULL
    OR `imagePath` = ''
  );
-- Adventures (map to existing adventure images or fallback to related quest images)
--> statement-breakpoint
UPDATE `adventures`
SET `imagePath` = 'assets/images/quests/forge_dragon_blade.jpg'
WHERE `enTitle` = 'Core Forge'
  AND (
    `imagePath` IS NULL
    OR `imagePath` = ''
  );
--> statement-breakpoint
UPDATE `adventures`
SET `imagePath` = 'assets/images/quests/iron_gauntlet_challenge.jpg'
WHERE `enTitle` = 'Knight Push'
  AND (
    `imagePath` IS NULL
    OR `imagePath` = ''
  );
--> statement-breakpoint
UPDATE `adventures`
SET `imagePath` = 'assets/images/quests/guard_fortress_gate.jpg'
WHERE `enTitle` = 'Shield Wall'
  AND (
    `imagePath` IS NULL
    OR `imagePath` = ''
  );
--> statement-breakpoint
UPDATE `adventures`
SET `imagePath` = 'assets/images/quests/arcane_gauntlet.jpg'
WHERE `enTitle` = 'The Golem'
  AND (
    `imagePath` IS NULL
    OR `imagePath` = ''
  );
--> statement-breakpoint
UPDATE `adventures`
SET `imagePath` = 'assets/images/quests/build_stronghold.jpg'
WHERE `enTitle` = 'The Lumber Route'
  AND (
    `imagePath` IS NULL
    OR `imagePath` = ''
  );
--> statement-breakpoint
UPDATE `adventures`
SET `imagePath` = 'assets/images/quests/climb_titan_tower.jpg'
WHERE `enTitle` = 'Tower Climb'
  AND (
    `imagePath` IS NULL
    OR `imagePath` = ''
  );