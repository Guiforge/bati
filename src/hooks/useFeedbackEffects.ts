import * as Haptics from "expo-haptics";
import { useCallback } from "react";

export type FeedbackIntensity = "light" | "medium" | "heavy";

interface UseFeedbackEffectsOptions {
  enableHaptics?: boolean;
  enableSound?: boolean;
}

/**
 * useFeedbackEffects Hook
 *
 * Provides haptic feedback, sound, and visual cues.
 * Encapsulates feedback logic so it's easy to disable for accessibility.
 *
 * Usage:
 * const { triggerCriticalHit, triggerComboMilestone } = useFeedbackEffects();
 *
 * if (isCritical) {
 *   triggerCriticalHit();
 * }
 */
export function useFeedbackEffects(options: UseFeedbackEffectsOptions = {}) {
  const { enableHaptics = true } = options;

  /**
   * Critical hit feedback
   */
  const triggerCriticalHit = useCallback(() => {
    if (enableHaptics) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [enableHaptics]);

  /**
   * Combo milestone reached
   */
  const triggerComboMilestone = useCallback(
    (comboCount: number) => {
      if (enableHaptics) {
        if (comboCount >= 10) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
      }
    },
    [enableHaptics]
  );

  /**
   * Rep completed feedback - simple impact
   */
  const triggerRepCompleted = useCallback(() => {
    if (enableHaptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [enableHaptics]);

  /**
   * Boss attack warning
   */
  const triggerBossAttackWarning = useCallback(() => {
    if (enableHaptics) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  }, [enableHaptics]);

  return {
    triggerCriticalHit,
    triggerComboMilestone,
    triggerRepCompleted,
    triggerBossAttackWarning,
  };
}
