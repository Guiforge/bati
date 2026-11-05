-- The duo challenge (multiplayer lot 1). Spec: docs/designs/multiplayer/LOT1-SPEC.md.
-- multi-migration-ok: ships with 0082 to 0084, the same multiplayer work, unreleased. Only adds columns and a table.
--
-- On `pairs`: `goal` is this hero's weekly goal, frozen when the pair was written (2 for a pair made
-- before this migration, the flame's default). `duel` is the local "compare our weeks" switch, never
-- sent. `reply` is phone B's pairing answer, kept until a week from A proves A has it, so it can ride
-- with B's next send.
--
-- `duo_weeks` holds what this phone heard from a companion about one ISO week: their latest envelope
-- (`stamp`, `goal`, `paused`, `days` as JSON, seven counts Monday first) and `fallenAt`, set once,
-- never cleared: the "fallen together" count is the rows where it is set, so it outlives an unlink.
-- The companion's columns go NULL on an unlink and in any plaintext copy (`scrubPairs`), their days
-- being theirs. No name and no secret here: the name lives on `pairs`.
ALTER TABLE `pairs` ADD `goal` integer DEFAULT 2 NOT NULL;
--> statement-breakpoint
ALTER TABLE `pairs` ADD `duel` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `pairs` ADD `reply` blob;
--> statement-breakpoint
CREATE TABLE `duo_weeks` (
	`pairId` text NOT NULL,
	`isoYear` integer NOT NULL,
	`isoWeek` integer NOT NULL,
	`stamp` integer,
	`goal` integer,
	`paused` integer,
	`days` text,
	`fallenAt` integer,
	PRIMARY KEY(`pairId`, `isoYear`, `isoWeek`)
);
