import { addDays, isSameDay, isYesterday, set } from "date-fns";
import * as Notifications from "expo-notifications";
import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { getAnyActiveAdventureRun, getAdventureDetails } from "@/db/adventures";
import { getStreakInfo } from "@/db/streaks";
import { useSettingsStore } from "@/stores/settings";

// Configure global notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function useNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>(undefined);
  const [notification, setNotification] = useState<Notifications.Notification | undefined>(
    undefined,
  );
  const notificationListener = useRef<Notifications.Subscription>(null);
  const responseListener = useRef<Notifications.Subscription>(null);
  const { notificationsEnabled, notificationTime } = useSettingsStore();

  useEffect(() => {
    if (!notificationsEnabled) return;

    registerForPushNotificationsAsync().then((token) => setExpoPushToken(token));

    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      setNotification(notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log(response);
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [notificationsEnabled]);

  const scheduleSmartNotifications = async () => {
    if (!notificationsEnabled) {
      await Notifications.cancelAllScheduledNotificationsAsync();
      return;
    }

    // Cancel existing to avoid duplicates
    await Notifications.cancelAllScheduledNotificationsAsync();

    // 1. Standard Daily Reminder
    // Uses the user's preferred time
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Time to train! ⚔️",
        body: "Your village needs you. Complete a quest to keep the flame alive!",
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: notificationTime.hour,
        minute: notificationTime.minute,
      },
    });

    // 2. Smart Streak & Inactivity Logic
    try {
      const streakInfo = await getStreakInfo();
      const now = new Date();
      const lastWorkout = streakInfo.lastWorkoutDate ? new Date(streakInfo.lastWorkoutDate) : null;

      // A. Streak Rescue (Warning before streak breaks)
      if (streakInfo.current > 0 && lastWorkout) {
        let warningDate: Date | null = null;

        if (isSameDay(lastWorkout, now)) {
          // Worked out today -> Danger is TOMORROW evening
          warningDate = set(addDays(now, 1), {
            hours: 20,
            minutes: 0,
            seconds: 0,
            milliseconds: 0,
          });
        } else if (isYesterday(lastWorkout)) {
          // Worked out yesterday -> Danger is TONIGHT
          const tonight = set(now, {
            hours: 20,
            minutes: 0,
            seconds: 0,
            milliseconds: 0,
          });
          if (now.getTime() < tonight.getTime()) {
            warningDate = tonight;
          }
        }

        if (warningDate) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: "🔥 Streak at Risk!",
              body: `You have a ${streakInfo.current}-day streak. Don't let the fire die out!`,
              sound: true,
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: warningDate,
            },
          });
        }
      }

      // B. Inactivity Reminder (3 days of no activity)
      // We schedule this for 3 days from NOW. If the user opens the app tomorrow,
      // this function runs again and pushes it back another day.
      const inactivityDate = addDays(now, 3);
      // Set to 10 AM
      const inactivityTrigger = set(inactivityDate, {
        hours: 10,
        minutes: 0,
        seconds: 0,
        milliseconds: 0,
      });

      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Your village misses you 🏚️",
          body: "It's been a while. The monsters are getting closer...",
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: inactivityTrigger,
        },
      });

      // C. Boss Ready Notification
      // Check if user has an active boss adventure on the final step
      const activeAdventure = await getAnyActiveAdventureRun();
      if (activeAdventure) {
        const details = await getAdventureDetails(activeAdventure.adventureId);
        if (details && details.adventure.kind === "boss") {
          const { steps, activeStep } = activeAdventure.activeRun;
          const totalSteps = steps.length;
          // Check if on last step (boss fight)
          if (activeStep && activeStep.stepIndex === totalSteps - 1) {
            // Schedule for tomorrow at 9 AM as a reminder
            const bossReminderDate = set(addDays(now, 1), {
              hours: 9,
              minutes: 0,
              seconds: 0,
              milliseconds: 0,
            });

            await Notifications.scheduleNotificationAsync({
              content: {
                title: "⚔️ The Boss Awaits!",
                body: "You're at the final step. Face the boss and claim victory!",
                sound: true,
              },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: bossReminderDate,
              },
            });
          }
        }
      }
    } catch (e) {
      console.error("Failed to schedule smart notifications:", e);
    }
  };

  const cancelAllNotifications = async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
  };

  const showAchievementNotification = async (title: string, body: string, icon?: string) => {
    if (!notificationsEnabled) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: icon ? `${icon} ${title}` : `🏆 ${title}`,
        body,
        sound: true,
      },
      trigger: null, // Immediate notification
    });
  };

  return {
    expoPushToken,
    notification,
    scheduleSmartNotifications,
    cancelAllNotifications,
    showAchievementNotification,
  };
}

async function registerForPushNotificationsAsync() {
  let token: string | undefined;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") {
    return;
  }

  return token;
}
