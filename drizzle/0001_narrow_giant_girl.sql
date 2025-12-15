CREATE TABLE `exercises` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`enName` text NOT NULL,
	`frName` text NOT NULL,
	`enDescription` text NOT NULL,
	`frDescription` text NOT NULL,
	`imagePath` text DEFAULT 'assets/placeholder.jpg' NOT NULL,
	`createdAt` integer,
	`updatedAt` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `exercises_en_name_unique` ON `exercises` (`enName`);
--> statement-breakpoint
CREATE TABLE `exercise_muscles` (
	`exerciseId` integer NOT NULL,
	`muscle` text NOT NULL CHECK (
		`muscle` IN ('arms', 'back', 'shoulder', 'chest', 'abs', 'calf')
	),
	PRIMARY KEY(`exerciseId`, `muscle`),
	FOREIGN KEY (`exerciseId`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `exercise_muscles_muscle_idx` ON `exercise_muscles` (`muscle`);