-- A session the hero writes down instead of playing (a gym session, a walk without the phone), and
-- an outing whose distance the hero typed after going out without GPS. `byHand` says which part is
-- the hero's word: 'session' for the whole row, 'distance' for `leaguesM` alone. NULL on every
-- existing row: everything Bati measured. Records, achievements of count, hour and length, the
-- outing habit and the day's outing decay read it to leave typed figures out; the flame, the oath,
-- the road and the village's presence read the row like any other.
-- `label` is the name the hero gave a session written down ("gym"). `byHandEditedAt` stamps a
-- correction made after the save, so device sync sees it and takes the typed fields from the side
-- that wrote them later, on its own stamp, as 0072 and 0075 do.
--
-- A hand-written row has no completed_exercises. For such a row `outing` and `byHand` are the
-- source, never its exercises: a migration that derives `outing` from them, as 0049 did, would
-- write NULL on a hand-written outing.
--
-- multi-migration-ok: column additions only, every new value is NULL, no row is read or rewritten; 0074 to 0077 are not in any tag yet and ship with it (0077 names the rest).
ALTER TABLE `completed_sessions` ADD `byHand` text;--> statement-breakpoint
ALTER TABLE `completed_sessions` ADD `label` text;--> statement-breakpoint
ALTER TABLE `completed_sessions` ADD `byHandEditedAt` integer;
