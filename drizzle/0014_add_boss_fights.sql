-- Boss fight tracking for adventures with kind = "boss"
CREATE TABLE boss_fights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    adventure_id INTEGER NOT NULL REFERENCES adventures(id) ON DELETE CASCADE,
    -- Total HP = sum of all exercise targets across all steps
    total_hp INTEGER NOT NULL,
    -- Current HP remaining (persists across sessions)
    current_hp INTEGER NOT NULL,
    -- Muscle group that deals bonus damage (1.5x)
    weakness_muscle TEXT,
    -- Muscle group that deals reduced damage (0.5x)
    resistance_muscle TEXT,
    -- Timestamp when boss was defeated (null if still alive)
    defeated_at INTEGER,
    created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);
CREATE UNIQUE INDEX boss_fights_adventure_unique ON boss_fights(adventure_id);
-- Damage log tracks each exercise completion during boss fights
CREATE TABLE boss_damage_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    boss_fight_id INTEGER NOT NULL REFERENCES boss_fights(id) ON DELETE CASCADE,
    completed_session_id INTEGER REFERENCES completed_sessions(id) ON DELETE
    SET NULL,
        exercise_id INTEGER REFERENCES exercises(id) ON DELETE
    SET NULL,
        -- Damage dealt (after weakness/resistance modifiers)
        damage_dealt INTEGER NOT NULL,
        -- Whether this was a critical hit (exceeded target)
        is_critical INTEGER NOT NULL DEFAULT 0,
        -- Muscle group that dealt the damage
        muscle TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);
CREATE INDEX boss_damage_log_fight_idx ON boss_damage_log(boss_fight_id);
CREATE INDEX boss_damage_log_session_idx ON boss_damage_log(completed_session_id);
-- Add boss-specific fields to adventures table
ALTER TABLE adventures
ADD COLUMN boss_total_hp INTEGER;
ALTER TABLE adventures
ADD COLUMN boss_weakness_muscle TEXT;
ALTER TABLE adventures
ADD COLUMN boss_resistance_muscle TEXT;