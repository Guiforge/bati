import * as Haptics from "expo-haptics";
import { useCallback } from "react";
import { useSettingsStore } from "@/stores/settings";

/**
 * Hook that returns haptic functions respecting user preferences.
 * If haptics are disabled in settings, these functions do nothing.
 */
export function useHaptics() {
  const hapticsEnabled = useSettingsStore((s) => s.hapticsEnabled);

  const impact = useCallback(
    (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Medium) => {
      if (hapticsEnabled) {
        void Haptics.impactAsync(style);
      }
    },
    [hapticsEnabled],
  );

  const notification = useCallback(
    (type: Haptics.NotificationFeedbackType) => {
      if (hapticsEnabled) {
        void Haptics.notificationAsync(type);
      }
    },
    [hapticsEnabled],
  );

  const selection = useCallback(() => {
    if (hapticsEnabled) {
      void Haptics.selectionAsync();
    }
  }, [hapticsEnabled]);

  return {
    impact,
    notification,
    selection,
    // Common presets
    lightImpact: useCallback(() => impact(Haptics.ImpactFeedbackStyle.Light), [impact]),
    mediumImpact: useCallback(() => impact(Haptics.ImpactFeedbackStyle.Medium), [impact]),
    heavyImpact: useCallback(() => impact(Haptics.ImpactFeedbackStyle.Heavy), [impact]),
    success: useCallback(
      () => notification(Haptics.NotificationFeedbackType.Success),
      [notification],
    ),
    warning: useCallback(
      () => notification(Haptics.NotificationFeedbackType.Warning),
      [notification],
    ),
    error: useCallback(() => notification(Haptics.NotificationFeedbackType.Error), [notification]),
  };
}
