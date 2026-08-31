-- Where an expedition's fixes land.
--
-- One row a second, which makes this the only table in the app that grows with the clock rather
-- than with what the hero did. `WITHOUT ROWID` with `(sessionId, t)` as the key is what keeps
-- that affordable: the rows are only ever read in time order for one session, so the primary key
-- is the storage order and there is no second copy of it. About 180 kB an hour at 1 Hz, against
-- roughly 450 kB for the same rows with an autoincrement id and an index nothing would use.
--
-- Written by hand rather than by `db:generate`, and not only because that command cannot be
-- trusted here (drizzle/meta stops at 0025, so it re-emits fourteen migrations of ADD COLUMN for
-- columns that already exist). `WITHOUT ROWID` is outside drizzle-kit's vocabulary at all.
--
-- Raw fixes, deliberately. `src/gps/track.ts` decides what a drifting stop or a teleport meant,
-- and it decides it at read time: a rule tuned against real data cannot be re-tuned once the
-- data was recorded through it. See docs/designs/gps-without-google.md.
--
-- `sessionId` is the session uuid, not `completed_sessions.id`: the points are written while the
-- session is still running, before any row exists to point at. There is no foreign key for the
-- same reason, and because foreign keys are off on the device anyway (db/client.ts issues no
-- PRAGMA foreign_keys) — an orphaned run is found by the query in db/gps.ts instead.
CREATE TABLE IF NOT EXISTS `gps_points` (
    `sessionId` text NOT NULL,
    `t` integer NOT NULL,
    `latE7` integer NOT NULL,
    `lonE7` integer NOT NULL,
    `eleCm` integer,
    `accDm` integer NOT NULL,
    `speedCms` integer,
    `distFromPrevCm` integer NOT NULL,
    PRIMARY KEY (`sessionId`, `t`)
) WITHOUT ROWID;
