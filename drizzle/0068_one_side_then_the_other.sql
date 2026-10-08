-- Some movements are done on one side, then on the other: a side plank, a pistol squat, a pigeon
-- pose. Their target never said whether "30 s" meant both sides or each, so every hero read it
-- their own way. It means each side now, the way a coach writes "30 s per side", and this column
-- is how the session knows: a timed one runs both sides with a short switch between them, a
-- counted one says "per side" under the count. The result logged stays a per-side figure, so a
-- hero's history of side planks reads the same before and after.
--
-- Movements that alternate inside the set (Lunge, Archer Push-Up, Dead Bug, Skater Hop) are not
-- in the list: their count already covers both sides, rep by rep. Hero movements default to 0,
-- which is what they always behaved as.
ALTER TABLE `exercises` ADD `perSide` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
UPDATE `exercises`
SET `perSide` = 1
WHERE `creator` = 'Admin'
    AND `enName` IN (
        'Side Plank',
        'Single-Leg Glute Bridge',
        'Single-Leg Deadlift',
        'Bulgarian Split Squat',
        'Pistol Squat',
        'Pigeon Pose',
        'Warrior Pose',
        'Thread the Needle',
        'World''s Greatest Stretch'
    );
--> statement-breakpoint
-- A per-side set now hits the boss for both sides, so a campaign with per-side slots deals more
-- than its seeded pool was tuned for, and the Monk fell a step early. Each pool gains exactly the
-- extra its per-side slots now deal at medium (content-invariants: "every boss falls on its
-- campaign's last step"), and only if it still holds the seeded value: a pool someone retuned is
-- theirs. The Scout's Trial has no per-side slot.
UPDATE `adventures` SET `bossTotalHp` = 302
WHERE `author` = 'Admin' AND `enTitle` = 'The Golem' AND `bossTotalHp` = 278;
--> statement-breakpoint
UPDATE `adventures` SET `bossTotalHp` = 791
WHERE `author` = 'Admin' AND `enTitle` = 'The Iron Lord''s Conquest' AND `bossTotalHp` = 764;
--> statement-breakpoint
UPDATE `adventures` SET `bossTotalHp` = 521
WHERE `author` = 'Admin' AND `enTitle` = 'The Monk''s Enlightenment' AND `bossTotalHp` = 425;
--> statement-breakpoint
UPDATE `adventures` SET `bossTotalHp` = 1142
WHERE `author` = 'Admin' AND `enTitle` = 'The Ranger''s Journey' AND `bossTotalHp` = 1115;
--> statement-breakpoint
UPDATE `adventures` SET `bossTotalHp` = 821
WHERE `author` = 'Admin' AND `enTitle` = 'The Guardian''s Oath' AND `bossTotalHp` = 770;
