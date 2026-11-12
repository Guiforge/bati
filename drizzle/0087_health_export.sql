-- What this phone has written to Health Connect (W-04): one row per session, by uuid, with the
-- client record version Health Connect holds. Nothing else: which sessions are owed, and whether a
-- correction or a deletion is waiting, is derived from the journal against this table
-- (src/healthExport/sync.ts).
--
-- Stays on this device: `db/syncTables.ts` classes it `local`, every snapshot that leaves the
-- phone has its rows removed (`snapshotDatabaseTo`), and a restore keeps this phone's rows
-- (`keepDeviceSettings`), since they describe this phone's Health Connect, not the hero.
-- Only adds a table.
CREATE TABLE `health_export` (
	`sessionUuid` text PRIMARY KEY NOT NULL,
	`version` integer NOT NULL
);
