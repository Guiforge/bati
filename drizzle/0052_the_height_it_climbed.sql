-- How much the hero climbed, kept beside the ground and the moving time.
--
-- Same writer and same moment as `leaguesM` (0044) and `movingSeconds` (0046): `saveSession`,
-- from the reducer's reading, when the session is banked. The recap and the journal print it
-- and never replay `gps_points` for it, for the reason 0046 gives: a flush that failed leaves
-- fixes out of the table that the live reading still holds.
--
-- Null on every outing saved before this, on every workout, and on an outing whose receiver
-- never reported an altitude. A null says nothing about the hill; a zero would say it was flat.
ALTER TABLE `completed_sessions` ADD `ascentM` integer;
