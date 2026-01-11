import * as Haptics from "expo-haptics";
import { useCallback } from "react";
import { useSettingsStore } from "@/src/stores/settings";

/**
 * Simplified Haptics Hook
 * Only useful, dopamine-triggering feedback
 */
export function useHaptics() {
  const hapticsEnabled = useSettingsStore((s) => s.hapticsEnabled);

  const impact = useCallback(
    (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Medium) => {
      if (hapticsEnabled) {
        Haptics.impactAsync(style).catch(() => {});
      }
    },
    [hapticsEnabled]
  );

  const notification = useCallback(
    (type: Haptics.NotificationFeedbackType) => {
      if (hapticsEnabled) {
        Haptics.notificationAsync(type).catch(() => {});
      }
    },
    [hapticsEnabled]
  );

  return {
    impact,
    success: useCallback(
      () => notification(Haptics.NotificationFeedbackType.Success),
      [notification]
    ),
  };
}
