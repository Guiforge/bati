-- W-04 PR 2: two facts about what this phone wrote to Health Connect, on the ledger of 0087.
--
-- `route`: 1 when the record holds the outing's GPS route. Decided once, at the first write, from
-- the "with the GPS route" option at that moment: a later correction rewrites the record with the
-- same choice, so turning the option off never strips a route already sent, and turning it on
-- never adds one to an outing sent without.
-- `failed`: why Health Connect refused this version of the entry (bad data). Not retried until the
-- entry changes (a higher version); counted on the settings screen.
--
-- multi-migration-ok: 0087 ships in the same release and holds no row yet on any released app;
-- this only adds two columns to its local table, every row keeps its meaning (route 0, not failed).
ALTER TABLE `health_export` ADD `route` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `health_export` ADD `failed` text;
