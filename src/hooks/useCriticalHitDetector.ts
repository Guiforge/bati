import { useCallback } from "react";
import type { CriticalHitEvent } from "@/src/types/boss-battle";

interface UseCriticalHitDetectorOptions {
  criticalHitChance?: number; // 0-1 (e.g., 0.15 = 15%)
  criticalHitMultiplier?: number; // e.g., 2 = 2x damage
  weaknessBonus?: boolean; // Did user hit weakness?
  onCriticalHit?: (event: CriticalHitEvent) => void;
}

/**
 * useCriticalHitDetector Hook
 *
 * Determines if a rep is a "critical hit" / "perfect rep"
 * with optional visual/haptic feedback.
 *
 * Usage:
 * const { isCritical, damageMultiplier } = useCriticalHitDetector({
 *   criticalHitChance: 0.15,
 *   weaknessBonus: bossFight?.bossWeakness === currentExerciseMuscle,
 *   onCriticalHit: (event) => triggerVFX(event),
 * });
 *
 * if (isCritical()) {
 *   // Apply 2x damage, trigger VFX
 * }
 */
export function useCriticalHitDetector(options: UseCriticalHitDetectorOptions = {}) {
  const {
    criticalHitChance = 0.15,
    criticalHitMultiplier = 2,
    weaknessBonus = false,
    onCriticalHit,
  } = options;

  /**
   * Determine if this rep is a critical hit
   */
  const isCritical = useCallback((): boolean => {
    // Weakness bonus always crits
    if (weaknessBonus) return true;

    // RNG critical hit
    return Math.random() < criticalHitChance;
  }, [criticalHitChance, weaknessBonus]);

  /**
   * Get damage multiplier for a rep
   */
  const getDamageMultiplier = useCallback((): number => {
    return isCritical() ? criticalHitMultiplier : 1;
  }, [isCritical, criticalHitMultiplier]);

  /**
   * Check for critical hit and trigger callback
   */
  const checkAndTrigger = useCallback(
    (baseX: number, baseY: number) => {
      const critical = isCritical();
      if (!critical) return critical;

      if (onCriticalHit) {
        const event: CriticalHitEvent = {
          id: `${Date.now()}-${Math.random()}`,
          timestamp: Date.now(),
          damage: 0, // Will be set by caller
          position: { x: baseX, y: baseY },
          type: weaknessBonus ? "weakness_bonus" : "critical",
        };
        onCriticalHit(event);
      }

      return critical;
    },
    [isCritical, weaknessBonus, onCriticalHit]
  );

  return {
    isCritical,
    getDamageMultiplier,
    checkAndTrigger,
  };
}
