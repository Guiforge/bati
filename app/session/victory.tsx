import * as Haptics from "expo-haptics";
import { Redirect } from "expo-router";
import { useEffect, useRef } from "react";
import { YStack } from "tamagui";
import { VictoryView } from "@/src/components/session/VictoryView";
import { useSessionStore } from "@/src/stores/session";

/**
 * Victory Screen - Reward & Satisfaction
 *
 * Goal: Dopamine rush. Celebrate the effort.
 * Design Features:
 * - Confetti & Particles (via VictoryView)
 * - Animated Loot Box opening
 * - Haptic feedback when rewards appear
 * - Audio: Victory fanfare
 * - Clear connection: physical pain → digital gain
 */
export default function VictoryScreen() {
  const quest = useSessionStore((s) => s.quest);
  const status = useSessionStore((s) => s.status);

  // Track if we ever had a quest (to avoid redirect after quitSession)
  const hadQuestRef = useRef(false);
  if (quest) {
    hadQuestRef.current = true;
  }

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  // Only redirect if we never had a quest (user navigated here directly)
  // Don't redirect after quitSession - VictoryView handles its own navigation
  if (!quest && !hadQuestRef.current) {
    return <Redirect href="/(tabs)" />;
  }

  // Redirect to other screens if status changed unexpectedly
  if (status !== "finished" && status !== "idle") {
    return <Redirect href="/session" />;
  }

  return (
    <YStack flex={1} bg="$bgDarker">
      <VictoryView />
    </YStack>
  );
}
