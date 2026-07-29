import * as Haptics from "expo-haptics";
import { useSettingsStore } from "@/stores/settings";

/**
 * Hook that returns haptic functions respecting user preferences.
 * If haptics are disabled in settings, these functions do nothing.
 */
export function useHaptics() {
  const hapticsEnabled = useSettingsStore((s) => s.hapticsEnabled);

  function impact(style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Medium) {
    if (hapticsEnabled) {
      Haptics.impactAsync(style).catch(() => {
        // Haptics errors are non-critical
      });
    }
  }

  function notification(type: Haptics.NotificationFeedbackType) {
    if (hapticsEnabled) {
      Haptics.notificationAsync(type).catch(() => {
        // Haptics errors are non-critical
      });
    }
  }

  function selection() {
    if (hapticsEnabled) {
      Haptics.selectionAsync().catch(() => {
        // Haptics errors are non-critical
      });
    }
  }

  return {
    impact,
    notification,
    selection,
    // Common presets
    lightImpact: () => impact(Haptics.ImpactFeedbackStyle.Light),
    mediumImpact: () => impact(Haptics.ImpactFeedbackStyle.Medium),
    heavyImpact: () => impact(Haptics.ImpactFeedbackStyle.Heavy),
    success: () => notification(Haptics.NotificationFeedbackType.Success),
    warning: () => notification(Haptics.NotificationFeedbackType.Warning),
    error: () => notification(Haptics.NotificationFeedbackType.Error),
  };
}
