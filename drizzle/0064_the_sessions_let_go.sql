-- A session deleted here still exists on the other device.
--
-- Device sync compares two devices by the uuids of their sessions (db/backup.ts
-- `compareWithPeer`): a device that has sessions this one lacks, and lacks none of this one's, is
-- ahead and is offered as a hand-off. A session the hero *deleted* here and that the tablet still
-- holds looked exactly like one the tablet had and this phone did not, so the tablet was "ahead",
-- and taking its version brought the deleted session back.
--
-- A row per deletion, keyed by the session's uuid: the comparison reads it as something this
-- device knows and the other does not. Written by `deleteSession`, never read by anything else.
CREATE TABLE `deleted_sessions` (
	`uuid` text PRIMARY KEY NOT NULL,
	`deletedAt` integer NOT NULL
);
