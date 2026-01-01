-- Migration: Simplify resources from 8 types to 3 types
-- Before: gold, wood, stone, fire, water, wind, grain, boss_token
-- After: gold, essence, boss_token

-- Step 1: Add essence row if it doesn't exist
INSERT OR IGNORE INTO resource_inventory (resource, amount, updatedAt)
VALUES ('essence', 0, strftime('%s', 'now') * 1000);

-- Step 2: Combine all material resources into essence
UPDATE resource_inventory
SET amount = (
  SELECT COALESCE(SUM(amount), 0)
  FROM resource_inventory
  WHERE resource IN ('wood', 'stone', 'fire', 'water', 'wind', 'grain', 'essence')
)
WHERE resource = 'essence';

-- Step 3: Delete the old material resources
DELETE FROM resource_inventory
WHERE resource IN ('wood', 'stone', 'fire', 'water', 'wind', 'grain');

-- Step 4: Update transaction history to use 'essence' for all old material types
UPDATE resource_transactions
SET resource = 'essence'
WHERE resource IN ('wood', 'stone', 'fire', 'water', 'wind', 'grain');
