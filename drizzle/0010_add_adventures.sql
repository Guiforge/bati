CREATE TABLE `adventures` (
    `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    `questId` integer NOT NULL,
    `sortOrder` integer DEFAULT 0 NOT NULL,
    `kind` text DEFAULT 'route' NOT NULL,
    `isActive` integer DEFAULT 1 NOT NULL,
    `createdAt` integer,
    `updatedAt` integer,
    FOREIGN KEY (`questId`) REFERENCES `quests`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `adventures_quest_unique` ON `adventures` (`questId`);
--> statement-breakpoint
CREATE INDEX `adventures_active_sort_idx` ON `adventures` (`isActive`, `sortOrder`);
--> statement-breakpoint
INSERT INTO `adventures` (
        `questId`,
        `sortOrder`,
        `kind`,
        `isActive`,
        `createdAt`,
        `updatedAt`
    )
SELECT `id`,
    `id`,
    'route',
    1,
    (strftime('%s', 'now') * 1000),
    (strftime('%s', 'now') * 1000)
FROM `quests`;