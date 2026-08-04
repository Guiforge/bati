-- The final blow, applied retroactively.
--
-- Before finishBossFight() existed, a campaign could finish with its boss alive: one session on
-- the last step cannot drain a full pool, so the run went to 'finished', the victory screen
-- showed, and a live boss sat there that no remaining step could ever kill (a real device shows
-- exactly this: a finished run beside a boss at 395/425). The guarantee is now "finishing the
-- campaign IS the kill", and stored data that predates it has to honour the same promise — it is
-- also what lets the rematch reset trigger, which only resurrects *defeated* fights.
--
-- Same bookkeeping as the live final blow: the remainder lands in the damage log first (with no
-- session to attribute — the session that earned it predates the rule), so the log still sums to
-- the pool. defeatedAt takes the run's own finish date: the kill happened when the campaign did.
--
-- Timestamps are SECONDS, not the `* 1000` older migrations used: drizzle's `mode: "timestamp"`
-- reads seconds, runtime writes store seconds, and `defeatedAt` is actually displayed (village
-- banners) — a ms value here would date the kill in year 58,000.

INSERT INTO `boss_damage_log` (`bossFightId`, `completedSessionId`, `exerciseId`, `damageDealt`, `isCritical`, `muscle`, `createdAt`)
SELECT bf.`id`, NULL, NULL, bf.`currentHp`, 0, NULL, strftime('%s', 'now')
FROM `boss_fights` bf
WHERE bf.`defeatedAt` IS NULL
    AND bf.`currentHp` > 0
    AND EXISTS (
        SELECT 1 FROM `adventure_runs` ar
        WHERE ar.`adventureId` = bf.`adventureId` AND ar.`status` = 'finished'
    );--> statement-breakpoint

UPDATE `boss_fights`
SET `currentHp` = 0,
    `defeatedAt` = COALESCE(
        (
            SELECT MAX(ar.`finishedAt`) FROM `adventure_runs` ar
            WHERE ar.`adventureId` = `boss_fights`.`adventureId` AND ar.`status` = 'finished'
        ),
        strftime('%s', 'now')
    ),
    `updatedAt` = strftime('%s', 'now')
WHERE `defeatedAt` IS NULL
    AND `currentHp` > 0
    AND EXISTS (
        SELECT 1 FROM `adventure_runs` ar
        WHERE ar.`adventureId` = `boss_fights`.`adventureId` AND ar.`status` = 'finished'
    );
