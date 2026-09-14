-- The moment this install started counting deeds the new way.
--
-- Until this release one finished boss campaign raised three buildings: the Dragon Lair, the
-- Champion Arena (every boss victory) and the Hall of Heroes (every finished campaign). They are
-- recut so a run feeds one of them (docs/screens/village.md § Deeds). Levels are derived, never
-- stored, so the recut would lower some buildings with nothing on screen to explain it.
-- `getLegacyDeedLevels` counts the runs finished before this timestamp the old way too, and each deed
-- building keeps the higher level.
--
-- A migration and not a date in the code: it runs exactly once per install, at the first launch of
-- the version that ships it. A date fixed in advance either comes before the release, and a run on
-- the old app drops a level, or after it, and every run in between is counted both ways for good.
-- A fresh install runs it before any run exists, so it has nothing to keep. A backup restored from
-- before this release opens without the row, runs this, and keeps what it had.
INSERT OR IGNORE INTO `user_preferences` (`key`, `value`)
VALUES ('deedsRecutAt', CAST(strftime('%s', 'now') AS TEXT));
