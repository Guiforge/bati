-- Companions (multiplayer lot 0, D1): two phones that share a secret, and nothing else.
--
-- `id` names the pair on both phones (32 hex digits, random: it travels in clear in every envelope,
-- so it must not say when it was made). `secret` is the key of the pair's envelopes, base64, and
-- the reason this table never reaches a file the hero shares in plaintext: writeSnapshotNow
-- removes these rows from a plain backup, and only the sealed sync carries them to their own other
-- device. `name` is what THIS hero calls the other, like a phone contact, and is never sent.
-- `selfId` is this hero's id in the pair, `peerId` the other's, NULL on the inviting phone until a
-- first envelope names it. Deletion goes through `deleted_content`, like hero content (0074).
CREATE TABLE `pairs` (
	`id` text PRIMARY KEY NOT NULL,
	`secret` text NOT NULL,
	`name` text NOT NULL,
	`selfId` text NOT NULL,
	`peerId` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
