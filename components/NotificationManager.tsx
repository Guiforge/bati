import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { useNotifications } from "@/hooks/useNotifications";
import { useSettingsStore } from "@/stores/settings";

export function NotificationManager() {
  const { scheduleSmartNotifications } = useNotifications();
  const { notificationsEnabled, notificationTime } = useSettingsStore();
  const appState = useRef(AppState.currentState);
  const hasScheduled = useRef(false);

  // Schedule on mount
  useEffect(() => {
    if (!hasScheduled.current) {
      scheduleSmartNotifications();
      hasScheduled.current = true;
    }
  }, [scheduleSmartNotifications]);

  // Re-schedule when settings change (use a separate effect with a trigger)
  const prevSettingsRef = useRef({ notificationsEnabled, notificationTime });
  useEffect(() => {
    const prev = prevSettingsRef.current;
    if (
      prev.notificationsEnabled !== notificationsEnabled ||
      prev.notificationTime.hour !== notificationTime.hour ||
      prev.notificationTime.minute !== notificationTime.minute
    ) {
      scheduleSmartNotifications();
      prevSettingsRef.current = { notificationsEnabled, notificationTime };
    }
  }, [notificationsEnabled, notificationTime, scheduleSmartNotifications]);

  // Schedule on app resume
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === "active") {
        scheduleSmartNotifications();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [scheduleSmartNotifications]);

  return null;
}
