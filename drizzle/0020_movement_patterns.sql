-- Movement patterns, and `calf` renamed to `legs`.
--
-- Three design rules in docs/planning/work-roadmap.md §2.2 were abandoned or weakened because
-- the data could not express them: "no two consecutive exercises on the same pattern", "a
-- strength quest needs an antagonist", and "every pattern needs an equipment-free quest". None
-- of them wanted finer muscles — they wanted movement patterns, which `arms/back/chest/abs/
-- shoulder/calf` cannot express: a pull-up and a row are both `back`, a squat and a deadlift are
-- both lower body.
--
-- Muscles are deliberately NOT split further. `muscleToResource` in db/schema.ts maps them 1:1
-- onto the village's six resources, so every muscle added costs a resource, a building, a sprite
-- and a colour. The pattern is a second, orthogonal axis: it costs one column and touches
-- nothing else.
--
-- `calf` becomes `legs` in the same pass because the old name was simply false — the app claimed
-- a squat trained the calves. The village keeps its `grain` resource for it.
ALTER TABLE `exercises` ADD `pattern` text;
--> statement-breakpoint
UPDATE `exercises` SET `pattern` = 'push_horizontal' WHERE `enName` = 'Push-ups';
--> statement-breakpoint
UPDATE `exercises` SET `pattern` = 'push_horizontal' WHERE `enName` = 'Wall Push-Up';
--> statement-breakpoint
UPDATE `exercises` SET `pattern` = 'push_horizontal' WHERE `enName` = 'Dragon Push-up';
--> statement-breakpoint
UPDATE `exercises` SET `pattern` = 'push_horizontal' WHERE `enName` = 'Knight''s Diamond Push-up';
--> statement-breakpoint
UPDATE `exercises` SET `pattern` = 'push_vertical' WHERE `enName` = 'Archer''s Pike Push-up';
--> statement-breakpoint
UPDATE `exercises` SET `pattern` = 'push_vertical' WHERE `enName` = 'Handstand Push-Up';
--> statement-breakpoint
UPDATE `exercises` SET `pattern` = 'push_vertical' WHERE `enName` = 'Titan''s Dip';
--> statement-breakpoint
UPDATE `exercises` SET `pattern` = 'pull_horizontal' WHERE `enName` = 'Table Row';
--> statement-breakpoint
UPDATE `exercises` SET `pattern` = 'pull_horizontal' WHERE `enName` = 'Towel Door Row';
--> statement-breakpoint
UPDATE `exercises` SET `pattern` = 'pull_horizontal' WHERE `enName` = 'Inverted Row';
--> statement-breakpoint
UPDATE `exercises` SET `pattern` = 'pull_vertical' WHERE `enName` = 'Pull-ups';
--> statement-breakpoint
UPDATE `exercises` SET `pattern` = 'pull_vertical' WHERE `enName` = 'Chin-Up';
--> statement-breakpoint
UPDATE `exercises` SET `pattern` = 'pull_vertical' WHERE `enName` = 'Iron Grip Pull-up';
--> statement-breakpoint
UPDATE `exercises` SET `pattern` = 'pull_vertical' WHERE `enName` = 'Scapular Pull-Up';
--> statement-breakpoint
UPDATE `exercises` SET `pattern` = 'squat' WHERE `enName` = 'Squat';
--> statement-breakpoint
UPDATE `exercises` SET `pattern` = 'squat' WHERE `enName` = 'Goblin Squat';
--> statement-breakpoint
UPDATE `exercises` SET `pattern` = 'squat' WHERE `enName` = 'Wall Sit';
--> statement-breakpoint
UPDATE `exercises` SET `pattern` = 'squat' WHERE `enName` = 'Jump Squat';
--> statement-breakpoint
UPDATE `exercises` SET `pattern` = 'squat' WHERE `enName` = 'Curtsy Squat';
--> statement-breakpoint
UPDATE `exercises` SET `pattern` = 'squat' WHERE `enName` = 'Shadow Step Lunge';
--> statement-breakpoint
UPDATE `exercises` SET `pattern` = 'squat' WHERE `enName` = 'Wall Sentinel Hold';
--> statement-breakpoint
UPDATE `exercises` SET `pattern` = 'squat' WHERE `enName` = 'Standing Calf Raise';
--> statement-breakpoint
UPDATE `exercises` SET `pattern` = 'hinge' WHERE `enName` = 'Glute Bridge';
--> statement-breakpoint
UPDATE `exercises` SET `pattern` = 'hinge' WHERE `enName` = 'Ranger''s Single Leg Deadlift';
--> statement-breakpoint
UPDATE `exercises` SET `pattern` = 'core' WHERE `enName` = 'Plank';
--> statement-breakpoint
UPDATE `exercises` SET `pattern` = 'core' WHERE `enName` = 'Stone Guardian Plank';
--> statement-breakpoint
UPDATE `exercises` SET `pattern` = 'core' WHERE `enName` = 'Crunch';
--> statement-breakpoint
UPDATE `exercises` SET `pattern` = 'core' WHERE `enName` = 'Side Plank';
--> statement-breakpoint
UPDATE `exercises` SET `pattern` = 'core' WHERE `enName` = 'Russian Twist';
--> statement-breakpoint
UPDATE `exercises` SET `pattern` = 'core' WHERE `enName` = 'Flutter Kicks';
--> statement-breakpoint
UPDATE `exercises` SET `pattern` = 'core' WHERE `enName` = 'Dead Bug';
--> statement-breakpoint
UPDATE `exercises` SET `pattern` = 'core' WHERE `enName` = 'Reverse Crunch';
--> statement-breakpoint
UPDATE `exercises` SET `pattern` = 'core' WHERE `enName` = 'Hanging Leg Raise';
--> statement-breakpoint
UPDATE `exercises` SET `pattern` = 'core' WHERE `enName` = 'L-Sit';
--> statement-breakpoint
UPDATE `exercises` SET `pattern` = 'core' WHERE `enName` = 'Windshield Wipers';
--> statement-breakpoint
UPDATE `exercises` SET `pattern` = 'core' WHERE `enName` = 'Alchemist''s Hollow Body Hold';
--> statement-breakpoint
UPDATE `exercises` SET `pattern` = 'core' WHERE `enName` = 'Wizard''s Bicycle Crunch';
--> statement-breakpoint
UPDATE `exercises` SET `pattern` = 'core' WHERE `enName` = 'Superman';
--> statement-breakpoint
UPDATE `exercises` SET `pattern` = 'locomotion' WHERE `enName` = 'Bear Crawl';
--> statement-breakpoint
UPDATE `exercises` SET `pattern` = 'locomotion' WHERE `enName` = 'Berserker Burpee';
--> statement-breakpoint
UPDATE `exercises` SET `pattern` = 'locomotion' WHERE `enName` = 'Monk''s Mountain Climber';
--> statement-breakpoint
UPDATE `exercises` SET `pattern` = 'locomotion' WHERE `enName` = 'Thunder Jumping Jack';
--> statement-breakpoint
UPDATE `exercises` SET `pattern` = 'locomotion' WHERE `enName` = 'Paladin''s High Knee';
--> statement-breakpoint
UPDATE `exercises` SET `pattern` = 'locomotion' WHERE `enName` = 'Star Jump';
--> statement-breakpoint
UPDATE `exercises` SET `pattern` = 'locomotion' WHERE `enName` = 'Rogue''s Skater Hop';
--> statement-breakpoint
UPDATE `exercises` SET `pattern` = 'mobility' WHERE `enName` = 'Druid''s Cobra Stretch';
--> statement-breakpoint
UPDATE `exercises` SET `pattern` = 'mobility' WHERE `enName` = 'Samurai''s Warrior Pose';
--> statement-breakpoint
-- exercise_muscles pins the muscle vocabulary in a CHECK, which SQLite cannot alter — the
-- table is rebuilt with the new one and the rows carried across.
CREATE TABLE `exercise_muscles_new` (
    `exerciseId` integer NOT NULL,
    `muscle` text NOT NULL CHECK (
        `muscle` IN (
            'arms',
            'back',
            'shoulder',
            'chest',
            'abs',
            'legs'
        )
    ),
    PRIMARY KEY(`exerciseId`, `muscle`),
    FOREIGN KEY (`exerciseId`) REFERENCES `exercises`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
INSERT INTO `exercise_muscles_new` (`exerciseId`, `muscle`)
SELECT `exerciseId`,
    CASE `muscle` WHEN 'calf' THEN 'legs' ELSE `muscle` END
FROM `exercise_muscles`;
--> statement-breakpoint
DROP TABLE `exercise_muscles`;
--> statement-breakpoint
ALTER TABLE `exercise_muscles_new` RENAME TO `exercise_muscles`;
--> statement-breakpoint
CREATE INDEX `exercise_muscles_muscle_idx` ON `exercise_muscles` (`muscle`);
--> statement-breakpoint
-- Boss modifiers and the damage log carry the same vocabulary, without a CHECK.
UPDATE `adventures` SET `bossWeaknessMuscle` = 'legs' WHERE `bossWeaknessMuscle` = 'calf';
--> statement-breakpoint
UPDATE `adventures` SET `bossResistanceMuscle` = 'legs' WHERE `bossResistanceMuscle` = 'calf';
--> statement-breakpoint
UPDATE `boss_damage_log` SET `muscle` = 'legs' WHERE `muscle` = 'calf';
