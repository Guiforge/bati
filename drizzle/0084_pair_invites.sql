-- An invitation sent by link and not answered yet (multiplayer lot 0 bis, B6).
-- multi-migration-ok: ships with 0082 and 0083, the same multiplayer foundation. Only adds a table.
--
-- `privateKey` is half of an X25519 pair, base64: what lets this phone derive the pair's key once the
-- other phone answers. The row goes the moment the answer arrives, or after seven days whatever
-- happens (`sweepExpiredInvites`), with secure_delete. `id` is the future pair's id and
-- `selfId` this hero's id in it. No name: the hero chooses one when an answer comes back.
--
-- Stays on this device: `db/syncTables.ts` classes it `local`, and a plain backup has its rows removed
-- with the pairs (`scrubPairs`).
CREATE TABLE `pair_invites` (
	`id` text PRIMARY KEY NOT NULL,
	`privateKey` text NOT NULL,
	`selfId` text NOT NULL,
	`madeAt` integer NOT NULL
);
