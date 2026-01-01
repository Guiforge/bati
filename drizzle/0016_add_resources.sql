-- Resource inventory table
CREATE TABLE `resource_inventory` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `resource` text NOT NULL,
  `amount` integer DEFAULT 0 NOT NULL,
  `updatedAt` integer
);

CREATE UNIQUE INDEX `resource_inventory_resource_unique` ON `resource_inventory` (`resource`);

-- Initialize resource inventory with all resource types
INSERT INTO `resource_inventory` (`resource`, `amount`) VALUES
  ('gold', 0),
  ('wood', 0),
  ('stone', 0),
  ('fire', 0),
  ('water', 0),
  ('wind', 0),
  ('grain', 0);

-- Resource transaction log for analytics
CREATE TABLE `resource_transactions` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `resource` text NOT NULL,
  `amount` integer NOT NULL,
  `transactionType` text DEFAULT 'earned' NOT NULL,
  `completedSessionId` integer REFERENCES `completed_sessions` (`id`) ON DELETE SET NULL,
  `reason` text DEFAULT '' NOT NULL,
  `createdAt` integer
);

CREATE INDEX `resource_transactions_resource_idx` ON `resource_transactions` (`resource`);
CREATE INDEX `resource_transactions_session_idx` ON `resource_transactions` (`completedSessionId`);
CREATE INDEX `resource_transactions_created_at_idx` ON `resource_transactions` (`createdAt`);
