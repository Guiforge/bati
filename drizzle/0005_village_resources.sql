ALTER TABLE exercises ADD COLUMN style text DEFAULT 'strength' NOT NULL;

INSERT INTO resource_inventory (resource, amount) VALUES 
('wood', 0),
('stone', 0),
('fire', 0),
('water', 0),
('wind', 0),
('grain', 0),
('mana', 0),
('leaf', 0)
ON CONFLICT(resource) DO NOTHING;

INSERT INTO village_buildings (buildingType, level, xp, isUnlocked) VALUES 
('druid_grove', 1, 0, 0),
('wizard_tower', 1, 0, 0)
ON CONFLICT(buildingType) DO NOTHING;
