-- One index that answers every question the Journal asks about a movement.
--
-- `completed_exercises_exercise_idx` found a movement's rows and then read each one to check its
-- unit, its date and its value. The Journal asks that on every open: the record wall wants the day
-- a best first fell and the best of the last ninety days, the session screen wants the best before
-- a given date, and "records standing" wants every best at once. At five years of journal the wall
-- read 735 rows for four movements (perf audit, 2026-09-15).
--
-- The new index leads with the same column, so every lookup the old one served still finds it.
DROP INDEX IF EXISTS `completed_exercises_exercise_idx`;--> statement-breakpoint
CREATE INDEX `completed_exercises_exercise_result_idx` ON `completed_exercises` (`exerciseId`,`resultType`,`performedAt`,`resultValue`);
