-- Phase A1 of docs/planning/work-roadmap.md §3.
-- `0001_seed_exercises.sql` tags two lower-body exercises as `chest`:
--   Squat    -> calf, chest
--   Wall Sit -> calf, chest
-- Neither is a chest movement. The wrong tag leaks into two systems:
--   * db/muscleBalance.ts counts squat volume as chest, which drives the Coach's
--     weak-area nudge and the stats screen;
--   * db/bossFights.ts applies the 1.5x weakness multiplier per muscle, and The Golem
--     (0003) is weak to `chest` — so squat reps currently deal boss-weakness damage.
-- Deliberately NOT touched (they are defensible, do not "re-fix" them):
--   * Druid's Cobra Stretch -> back, chest (loads thoracic extension, stretches the chest)
--   * Shadow Step Lunge     -> abs, calf   (real anti-rotation demand)
DELETE FROM `exercise_muscles`
WHERE `muscle` = 'chest'
    AND `exerciseId` IN (
        SELECT `id`
        FROM `exercises`
        WHERE `enName` IN ('Squat', 'Wall Sit')
    );
