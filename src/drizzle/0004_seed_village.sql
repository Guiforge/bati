INSERT INTO `resource_inventory` (`resource`, `amount`)
VALUES ('gold', 0),
    ('essence', 0),
    ('boss_token', 0);
--> statement-breakpoint
-- ============================================================
-- Village Buildings
-- ============================================================
--> statement-breakpoint
INSERT INTO `village_buildings` (`buildingType`, `level`, `xp`, `isUnlocked`)
VALUES -- Tier 1 (unlocked)
    ('campfire', 1, 0, 1),
    ('tent', 1, 0, 1),
    ('training_dummy', 1, 0, 1),
    -- Tier 2 (locked)
    ('archery_range', 1, 0, 0),
    ('quarry', 1, 0, 0),
    ('forge', 1, 0, 0),
    ('well', 1, 0, 0),
    ('windmill', 1, 0, 0),
    ('farm', 1, 0, 0),
    -- Tier 3 (locked)
    ('watchtower', 1, 0, 0),
    ('castle_wall', 1, 0, 0),
    ('armory', 1, 0, 0),
    ('fountain', 1, 0, 0),
    ('observatory', 1, 0, 0),
    ('barn', 1, 0, 0),
    -- Tier 4 (locked)
    ('dragon_lair', 1, 0, 0),
    ('heroes_hall', 1, 0, 0),
    ('wizard_tower', 1, 0, 0),
    ('champion_arena', 1, 0, 0);
--> statement-breakpoint
INSERT INTO `village_stats` (
        `prestigeScore`,
        `totalBuildingsUnlocked`,
        `highestBuildingLevel`
    )
VALUES (0, 3, 1);