import { useCallback, useRef, useState } from "react";
import type { ComboState } from "@/src/types/boss-battle";

const DEFAULT_BREAK_THRESHOLD_MS = 5000; // 5 seconds
const COMBO_MULTIPLIER_THRESHOLDS = [5, 10, 20]; // at these counts, multiplier increases

interface UseComboTrackerOptions {
  breakThresholdMs?: number;
  onComboMilestone?: (comboCount: number) => void;
}

/**
 * useComboTracker Hook
 *
 * Manages combo/streak state during exercise.
 * Tracks:
 * - Current combo count
 * - Multiplier (1x, 2x, 3x, etc.)
 * - Whether combo is still active (based on time threshold)
 *
 * Call `recordRep()` when a rep is completed.
 * Combo breaks if > breakThresholdMs passes without a rep.
 */
export function useComboTracker(options: UseComboTrackerOptions = {}) {
  const { breakThresholdMs = DEFAULT_BREAK_THRESHOLD_MS, onComboMilestone } = options;

  const [combo, setCombo] = useState<ComboState>({
    current: 0,
    multiplier: 1,
    lastRepTimestamp: 0,
    breakThresholdMs,
    isActive: false,
  });

  const breakCheckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Record a rep and update combo state
   */
  const recordRep = useCallback(() => {
    const now = Date.now();

    setCombo((prev) => {
      // Check if combo should break (too much time since last rep)
      const timeSinceLastRep = now - prev.lastRepTimestamp;
      const shouldBreak = prev.isActive && timeSinceLastRep > breakThresholdMs;

      const newCount = shouldBreak ? 1 : prev.current + 1;
      const newMultiplier = COMBO_MULTIPLIER_THRESHOLDS.reduce(
        (mult, threshold) => (newCount >= threshold ? mult + 1 : mult),
        1
      );

      const newCombo: ComboState = {
        current: newCount,
        multiplier: newMultiplier,
        lastRepTimestamp: now,
        breakThresholdMs,
        isActive: true,
      };

      // Trigger milestone callbacks
      if (onComboMilestone && COMBO_MULTIPLIER_THRESHOLDS.includes(newCount)) {
        onComboMilestone(newCount);
      }

      return newCombo;
    });

    // Reset break timer
    if (breakCheckTimerRef.current) clearTimeout(breakCheckTimerRef.current);
    breakCheckTimerRef.current = setTimeout(() => {
      setCombo((prev) => ({
        ...prev,
        isActive: false,
      }));
    }, breakThresholdMs);
  }, [breakThresholdMs, onComboMilestone]);

  /**
   * Manually reset combo (e.g., on pause or new exercise)
   */
  const resetCombo = useCallback(() => {
    if (breakCheckTimerRef.current) clearTimeout(breakCheckTimerRef.current);
    setCombo({
      current: 0,
      multiplier: 1,
      lastRepTimestamp: 0,
      breakThresholdMs,
      isActive: false,
    });
  }, [breakThresholdMs]);

  /**
   * Get current damage multiplier based on combo
   */
  const getDamageMultiplier = useCallback(() => {
    return combo.multiplier;
  }, [combo.multiplier]);

  return {
    combo,
    recordRep,
    resetCombo,
    getDamageMultiplier,
  };
}
