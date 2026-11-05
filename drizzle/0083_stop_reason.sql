-- Why a session ended, and which sets a light week set aside (multiplayer lot 0 bis).
-- multi-migration-ok: 0082 and this one ship in the same release, the first with companions, this one
-- with the pain stop that has to exist before any shared boss. Both only add: no row moves.
--
-- `stopReason`: NULL is a normal end, and so is every row from before this file. 'pain' is the hero
-- saying "I'm stopping, it hurts", which is all a journal ever keeps of it: no place, no degree.
-- Only `countsForPlay` reads it: XP, the flame, oaths and the village treat the session as they do any
-- other, on the sets it holds.
--
-- `lightWeekNeutral`: a set `ladderNeutral` holds only because a light week lightened its quest. The
-- older flag merges that with "a movement left mid-session", which hid a skipped movement inside
-- a light week. Old rows keep 0, with no backfill: nothing in them says which of the two they were.
ALTER TABLE `completed_sessions` ADD `stopReason` text;
--> statement-breakpoint
ALTER TABLE `completed_exercises` ADD `lightWeekNeutral` integer DEFAULT 0 NOT NULL;
