-- Boss fight tracking for adventures with kind = "boss"
CREATE TABLE boss_fights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    adventureId INTEGER NOT NULL REFERENCES adventures(id) ON DELETE CASCADE,
    -- Total HP = sum of all exercise targets across all steps
    totalHp INTEGER NOT NULL,
    -- Current HP remaining (persists across sessions)
    currentHp INTEGER NOT NULL,
    -- Muscle group that deals bonus damage (1.5x)
    weaknessMuscle TEXT,
    -- Muscle group that deals reduced damage (0.5x)
    resistanceMuscle TEXT,
    -- Timestamp when boss was defeated (null if still alive)
    defeatedAt INTEGER,
    createdAt INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    updatedAt INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);
CREATE UNIQUE INDEX boss_fights_adventure_unique ON boss_fights(adventureId);
-- Damage log tracks each exercise completion during boss fights
CREATE TABLE boss_damage_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bossFightId INTEGER NOT NULL REFERENCES boss_fights(id) ON DELETE CASCADE,
    completedSessionId INTEGER REFERENCES completed_sessions(id) ON DELETE
    SET NULL,
        exerciseId INTEGER REFERENCES exercises(id) ON DELETE
    SET NULL,
        -- Damage dealt (after weakness/resistance modifiers)
        damageDealt INTEGER NOT NULL,
        -- Whether this was a critical hit (exceeded target)
        isCritical INTEGER NOT NULL DEFAULT 0,
        -- Muscle group that dealt the damage
        muscle TEXT,
        createdAt INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);
CREATE INDEX boss_damage_log_fight_idx ON boss_damage_log(bossFightId);
CREATE INDEX boss_damage_log_session_idx ON boss_damage_log(completedSessionId);
-- Add boss-specific fields to adventures table
ALTER TABLE adventures
ADD COLUMN bossTotalHp INTEGER;
ALTER TABLE adventures
ADD COLUMN bossWeaknessMuscle TEXT;
ALTER TABLE adventures
ADD COLUMN bossResistanceMuscle TEXT;