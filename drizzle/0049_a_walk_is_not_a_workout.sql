-- Two columns, so the app can finally tell a walk from a workout.
--
-- Nothing in `completed_sessions` says which kind of session a row is. The nearest thing is
-- `leaguesM IS NOT NULL`, and it is wrong twice: an outing whose GPS never locked writes null and
-- reads as a workout, while a home-made "walk five minutes then do push-ups" writes leagues and
-- would be thrown out of statistics that should count its push-ups. So eight families of
-- aggregate count a walk as a training session -- the journal's average duration, the calendar
-- dots, the weekly trends, the longest-session and most-XP records, the 30 and 60 minute
-- achievements whose own wording says "workout", the flame, the oaths, the rest suggestion. A
-- tester's six-hour hike put his average training duration at 77 minutes and took the longest
-- session record for good.
--
-- The rule that decides this already exists and is already tested: `isOutingQuest` in
-- `db/expeditions.ts`, the strict one -- every slot outdoors, and at least one. It reads the
-- style of the movements, which no statistics query joins. `outing` is that predicate, decided
-- once at save and written down, so the queries can ask a column instead of a join.
--
-- `locomotion` is the second half, and it is what the price of a minute outside will be read from
-- (0050). Walking, running and riding are three different efforts and the catalogue had no word
-- for the difference: `difficulty` says easy/medium/hard, which is a judgement about a repetition
-- and means nothing for a road.
--
-- Nullable, no default, no CHECK. SQLite cannot add a constrained column to an existing table,
-- and this schema holds its string vocabularies in TypeScript (`$type<>()` in `db/schema.ts`)
-- rather than in the database -- `style`, `equipment`, `pattern` and `measure` all do.
--
-- Null on `outing` means workout, which is what every row written before today was. Null on
-- `locomotion` means the movement is not one that covers ground.
--
-- Nothing here rewrites XP. A hero who banked 2000 for a hike keeps it: `0037` is the only
-- migration that ever reached backwards, and it did so because `most_xp` is a per-session record
-- read live off the journal, so the exploiting session would have stood as an unbeatable trophy.
-- Here the trophy problem is solved by the marker itself -- that record stops looking at outings
-- -- and no journalled number has to move.

ALTER TABLE `exercises` ADD `locomotion` text;
--> statement-breakpoint
ALTER TABLE `completed_sessions` ADD `outing` text;
--> statement-breakpoint
UPDATE `exercises` SET
    `locomotion` = 'walk',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Warden''s Walk' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `locomotion` = 'run',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Messenger''s Run' AND `creator` = 'Admin';
--> statement-breakpoint
UPDATE `exercises` SET
    `locomotion` = 'ride',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `enName` = 'Outrider''s Ride' AND `creator` = 'Admin';
--> statement-breakpoint
-- A hero's own way out. The lowest rate is the safe default: a movement that says nothing about
-- how it covers ground is not handed the fastest answer. The editor does not offer the choice,
-- so this is the only value a hero movement can ever hold.
UPDATE `exercises` SET
    `locomotion` = 'walk',
    `updatedAt` = strftime('%s', 'now') * 1000
WHERE `style` = 'expedition' AND `locomotion` IS NULL AND `creator` = 'hero';
--> statement-breakpoint
-- Read from what was performed, not from the quest. A quest can be edited or deleted after the
-- fact, and `createCompletedSession` refuses a session with no exercises, so the journal is the
-- one account of a session that cannot have moved since.
--
-- `NOT EXISTS` is the strict predicate said in SQL: no logged movement of this session was
-- anything other than an expedition. A mixed session fails it and stays null, which is the right
-- answer -- it contains real work, and its minutes belong in the training average.
--
-- Cheapest of the ways out, not the first one logged, because `outingLocomotion`
-- (`db/expeditions.ts`) says cheapest and the two must agree: the same walk-then-run session
-- would otherwise be a `run` in the backfilled journal and a `walk` in every row saved after.
-- The `ORDER BY` below is `BY_RATE` in that file, and `COALESCE` is its `?? 'walk'` -- a movement
-- that never said is a walk, because unknown is not a door out.
UPDATE `completed_sessions` SET `outing` = (
    SELECT COALESCE(e.`locomotion`, 'walk')
    FROM `completed_exercises` ce JOIN `exercises` e ON e.`id` = ce.`exerciseId`
    WHERE ce.`sessionId` = `completed_sessions`.`id`
    ORDER BY CASE COALESCE(e.`locomotion`, 'walk')
        WHEN 'walk' THEN 0
        WHEN 'ride' THEN 1
        ELSE 2
    END
    LIMIT 1
)
WHERE NOT EXISTS (
    SELECT 1
    FROM `completed_exercises` ce JOIN `exercises` e ON e.`id` = ce.`exerciseId`
    WHERE ce.`sessionId` = `completed_sessions`.`id` AND e.`style` <> 'expedition'
);
