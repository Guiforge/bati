-- Three tables that never held a row, and never could.
--
-- `goals`, `goal_progress` and `scheduled_sessions` arrived together as a "Goals & Planning
-- System" and were then never wired to anything: no reader, no writer, no screen, no query, in
-- any file but `db/schema.ts` itself. Not even `db/backup.ts` mentioned them, so a hero who
-- somehow filled them would have lost the contents at the first export.
--
-- They are not simply unused, they are a worse answer to a question the app already answers.
-- An oath (`db/oaths.ts`) is a target expressed as a predicate over the journal, storing no
-- progress at all; `goal_progress` stores a weekly tally that the journal can always recompute.
-- Two writers for one truth, and the one that shipped is the one that cannot drift.
--
-- Dropped rather than left in place, because dead schema is not free: it answers "can Bati do
-- programs?" with a yes that no screen can honour, and the next person to design that feature
-- would have built on it. See docs/designs/expeditions.md, premise 6.
DROP TABLE IF EXISTS `scheduled_sessions`;
--> statement-breakpoint
DROP TABLE IF EXISTS `goal_progress`;
--> statement-breakpoint
DROP TABLE IF EXISTS `goals`;
