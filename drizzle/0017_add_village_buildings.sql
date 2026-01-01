-- Village buildings table
CREATE TABLE `village_buildings` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `buildingType` text NOT NULL,
  `level` integer DEFAULT 1 NOT NULL,
  `xp` integer DEFAULT 0 NOT NULL,
  `isUnlocked` integer DEFAULT false NOT NULL,
  `unlockedAt` integer,
  `updatedAt` integer
);

CREATE UNIQUE INDEX `village_buildings_type_unique` ON `village_buildings` (`buildingType`);

-- Initialize all building types (locked by default, except Tier 1)
INSERT INTO `village_buildings` (`buildingType`, `level`, `xp`, `isUnlocked`) VALUES
  -- Tier 1 - Starter (unlocked by default)
  ('campfire', 1, 0, 1),
  ('tent', 1, 0, 1),
  ('training_dummy', 1, 0, 1),
  -- Tier 2 - Basic (locked, unlock via reps)
  ('archery_range', 1, 0, 0),
  ('quarry', 1, 0, 0),
  ('forge', 1, 0, 0),
  ('well', 1, 0, 0),
  ('windmill', 1, 0, 0),
  ('farm', 1, 0, 0),
  -- Tier 3 - Advanced (locked, unlock via Tier 2 level 3)
  ('watchtower', 1, 0, 0),
  ('castle_wall', 1, 0, 0),
  ('armory', 1, 0, 0),
  ('fountain', 1, 0, 0),
  ('observatory', 1, 0, 0),
  ('barn', 1, 0, 0),
  -- Tier 4 - Legendary (locked, unlock via boss defeats)
  ('dragon_lair', 1, 0, 0),
  ('heroes_hall', 1, 0, 0),
  ('wizard_tower', 1, 0, 0),
  ('champion_arena', 1, 0, 0);

-- Village stats table
CREATE TABLE `village_stats` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `prestigeScore` integer DEFAULT 0 NOT NULL,
  `totalBuildingsUnlocked` integer DEFAULT 0 NOT NULL,
  `highestBuildingLevel` integer DEFAULT 1 NOT NULL,
  `updatedAt` integer
);

-- Initialize village stats with defaults (3 starter buildings unlocked)
INSERT INTO `village_stats` (`prestigeScore`, `totalBuildingsUnlocked`, `highestBuildingLevel`) VALUES
  (0, 3, 1);
