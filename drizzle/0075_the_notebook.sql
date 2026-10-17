-- The notebook (roadmap J-01): a note and up to three photos on a session or an outing.
--
-- `notes` has existed on completed_sessions since 0000, and nothing could write it after the save.
-- Now the Journal, the outing recap and the victory screen can, so a note is an edit made after the
-- save, and travels like the two edits 0072 stamped: `notesEditedAt` says when, device sync takes
-- the note from the side that wrote it later, on its own stamp, so a note typed on one phone never
-- carries that phone's older sets or feedback over a correction made on the other.
-- NULL on every existing row: a note nobody edited.
--
-- Photos get a table of their own and not a column on the session: three pictures of ~100 KB in the
-- row would be read by every query that touches a session. One row per photo, named by a uuid
-- minted on the phone that took it, so two devices name it alike. `sessionUuid` is
-- completed_sessions.uuid (0038), as gps_points.sessionId is: row ids differ between devices.
-- `image` is the JPEG itself as a BLOB, not a base64 text: a third fewer bytes in the file that
-- Android backs up under a 25 MB quota. `updatedAt` and `deletedAt` are epoch seconds. A removed
-- photo stays as a row with `deletedAt` set and `image` emptied: that row is what tells the other
-- device to drop it.
--
-- multi-migration-ok: 0074 (merge v2) and 0075 ship together, 0074 is not in any tag yet, and a release with both splits sync across builds once and not twice (mergePeer refuses another newest migration).
ALTER TABLE `completed_sessions` ADD `notesEditedAt` integer;--> statement-breakpoint
CREATE TABLE `session_photos` (
	`uuid` text PRIMARY KEY NOT NULL,
	`sessionUuid` text NOT NULL,
	`sortOrder` integer NOT NULL,
	`image` blob NOT NULL,
	`updatedAt` integer NOT NULL,
	`deletedAt` integer
);--> statement-breakpoint
CREATE INDEX `session_photos_session_idx` ON `session_photos` (`sessionUuid`);
