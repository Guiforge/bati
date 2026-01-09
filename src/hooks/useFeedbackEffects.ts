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
   * Critical hit feedback (heavy haptic + sound)
   */
  const triggerCriticalHit = useCallback(() => {
    if (enableHaptics) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Double tap for extra impact
      setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 100);
    }

    // Could add sound effect here
    // if (enableSound) playSound(SOUNDS.criticalHit);
  }, [enableHaptics]);

  /**
   * Combo milestone reached (e.g., x10, x20)
   */
  const triggerComboMilestone = useCallback(
    (comboCount: number) => {
      if (enableHaptics) {
        // Scale haptic to combo intensity
        if (comboCount >= 20) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else if (comboCount >= 10) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        } else {
          Haptics.selectionAsync();
        }
      }

      // Could add sound effect here
      // if (enableSound) playSound(SOUNDS.comboMilestone);
    },
    [enableHaptics]
  );

  /**
   * Rep completed feedback
   */
  const triggerRepCompleted = useCallback(
    (intensity: FeedbackIntensity = "light") => {
      if (enableHaptics) {
        switch (intensity) {
          case "light":
            Haptics.selectionAsync();
            break;
          case "medium":
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            break;
          case "heavy":
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            break;
        }
      }
    },
    [enableHaptics]
  );

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
