-- Add scheduled_sessions table for planning workouts
CREATE TABLE IF NOT EXISTS `scheduled_sessions` (
    `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    `questId` integer NOT NULL REFERENCES `quests`(`id`) ON DELETE CASCADE,
    `goalId` integer REFERENCES `goals`(`id`) ON DELETE
    SET NULL,
        `scheduledDate` integer NOT NULL,
        `preferredHour` integer,
        `status` text DEFAULT 'pending' NOT NULL,
        `completedSessionId` integer REFERENCES `completed_sessions`(`id`) ON DELETE
    SET NULL,
        `note` text,
        `createdAt` integer,
        `updatedAt` integer
);
-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS `scheduled_sessions_date_idx` ON `scheduled_sessions` (`scheduledDate`);
CREATE INDEX IF NOT EXISTS `scheduled_sessions_status_idx` ON `scheduled_sessions` (`status`);
CREATE INDEX IF NOT EXISTS `scheduled_sessions_goal_idx` ON `scheduled_sessions` (`goalId`);