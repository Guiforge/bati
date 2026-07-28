-- Barbarian's Overhead Press (0006) is the only `dumbbell` movement in a bodyweight app and
-- the only exercise no quest can use, since the declared equipment envelope is bodyweight +
-- pull-up bar + dip bar.
--
-- The delete is guarded, not unconditional. `completed_exercises.exerciseId` is ON DELETE
-- NO ACTION, so removing an exercise that appears in someone's journal would abort the whole
-- migration and brick the install; `quest_exercises.exerciseId` is ON DELETE CASCADE, so it
-- would silently gut a user-authored quest that referenced it. Both are only reachable through
-- a custom quest (no seeded quest uses this exercise), but "unlikely" is not "impossible".
-- Where either exists, the row simply stays — harmless, and the coverage invariant only ever
-- runs against the seed.
DELETE FROM `exercises`
WHERE `enName` = 'Barbarian''s Overhead Press'
    AND `id` NOT IN (
        SELECT `exerciseId`
        FROM `completed_exercises`
    )
    AND `id` NOT IN (
        SELECT `exerciseId`
        FROM `quest_exercises`
    );
