import * as Haptics from "expo-haptics";
import { Redirect } from "expo-router";
import { useEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
  const insets = useSafeAreaInsets();

  const quest = useSessionStore((s) => s.quest);

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  if (!quest) {
    // No session: render-safe redirect (avoid navigation updates during render)
    return <Redirect href="/(tabs)" />;
  }

  return (
    <YStack flex={1} bg="$bgDarker" paddingTop={insets.top + 12} paddingBottom={insets.bottom + 12}>
      <VictoryView />
    </YStack>
  );
}
