/**
 * Boss Battle & Dopamine Features Types
 *
 * Defines all interfaces and types for the boss battle system,
 * including combo mechanics, critical hits, and feedback systems.
 */

/**
 * Represents a single boss encounter during a workout session.
 */
export interface BossFightState {
  totalHp: number;
  currentHp: number;
  phase: BossFightPhase;
  nextPhaseChangeAt: number; // timestamp
  totalDamageDealt: number;
}

/**
 * Boss fight phase types
 * - "player_attack": User performs reps to deal damage
 * - "boss_attack": Boss charges and attacks, user must defend (isometric hold)
 * - "cooldown": Brief pause between phases
 */
export type BossFightPhase = "player_attack" | "boss_attack" | "cooldown";

/**
 * Result of a damage calculation (from reps or time)
 */
export interface DamageResult {
  damage: number;
  isCritical: boolean;
  weaknessBonus: boolean; // Did user hit boss weakness?
  timestamp: number;
}

/**
 * Combo/Streak state - tracks consecutive reps at good pace
 */
export interface ComboState {
  current: number; // current combo count
  multiplier: number; // 1x, 2x, 3x, etc.
  lastRepTimestamp: number;
  breakThresholdMs: number; // if > 5s between reps, combo breaks
  isActive: boolean;
}

/**
 * Critical hit / "Perfect Rep" event
 */
export interface CriticalHitEvent {
  id: string;
  timestamp: number;
  damage: number;
  position: { x: number; y: number }; // screen position for animation
  type: "critical" | "weakness_bonus" | "combo_milestone";
}

/**
 * Feedback/VFX trigger
 */
export interface FeedbackEvent {
  id: string;
  type: "screen_shake" | "haptic" | "sound" | "visual";
  intensity: "light" | "medium" | "heavy";
  duration: number; // ms
  timestamp: number;
}

/**
 * Props for boss health bar component
 */
export interface BossHealthBarProps {
  currentHp: number;
  totalHp: number;
  bossName: string;
  isUnderAttack?: boolean;
  phase?: BossFightPhase;
}

/**
 * Props for combo meter component
 */
export interface ComboMeterProps {
  combo: ComboState;
  isVisible: boolean;
}

/**
 * Props for damage number floating animation
 */
export interface DamageNumberProps {
  damage: number;
  isCritical: boolean;
  x: number;
  y: number;
  key: string;
  duration: number; // ms
}

/**
 * Configuration for boss battle difficulty scaling
 */
export interface BossBattleConfig {
  baseHp: number;
  phaseChangeIntervalMs: number;
  defenseExerciseMinDuration: number; // seconds user must hold to block
  comboBreakThresholdMs: number;
  criticalHitChance: number; // 0-1 probability
  criticalHitMultiplier: number; // 2x, 3x, etc.
  musicIntensifyThreshold: number; // HP % when music gets intense
}

/**
 * Session metadata for boss battles
 */
export interface BossSessionMetadata {
  bossName: string;
  difficulty: "easy" | "normal" | "hard";
  startedAt: number; // timestamp
  config: BossBattleConfig;
}
