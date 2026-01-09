import { Redirect } from "expo-router";
import { useEffect, useRef } from "react";
import { YStack } from "tamagui";
import { PausedOverlay } from "@/src/components/session/PausedOverlay";
import { RestView } from "@/src/components/session/RestView";
import { useSessionTimer } from "@/src/hooks/useSessionTimer";
import { useSessionStore } from "@/src/stores/session";

export default function RestScreen() {
  const status = useSessionStore((s) => s.status);
  const quest = useSessionStore((s) => s.quest);
  const skipRest = useSessionStore((s) => s.skipRest);
  const timerDuration = useSessionStore((s) => s.timerDuration);
  const { remainingSeconds } = useSessionTimer();
  const hasAutoSkippedRef = useRef(false);
  const hasSeenPositiveRemainingRef = useRef(false);

  // Auto-advance when rest reaches 0
  useEffect(() => {
    if (status !== "resting") {
      hasAutoSkippedRef.current = false;
      hasSeenPositiveRemainingRef.current = false;
      return;
    }

    // Ensure the timer has actually started ticking before we allow auto-skip.
    // This prevents a mount-time 0 (timer not yet computed) from immediately skipping.
    if (remainingSeconds > 0) {
      hasSeenPositiveRemainingRef.current = true;
    }

    // Guard to avoid accidental immediate skip when no timer is configured.
    if (timerDuration <= 0) return;

    if (!hasSeenPositiveRemainingRef.current) return;

    if (remainingSeconds === 0 && !hasAutoSkippedRef.current) {
      hasAutoSkippedRef.current = true;
      skipRest();
    }
  }, [remainingSeconds, skipRest, status, timerDuration]);

  // Redirect based on status - each screen handles its own redirects
  if (status === "idle" || !quest) {
    return <Redirect href="/(tabs)" />;
  }
  if (status === "running") {
    return <Redirect href="/session/exercise" />;
  }
  if (status === "countdown") {
    return <Redirect href="/session/countdown" />;
  }
  if (status === "finished") {
    return <Redirect href="/session/victory" />;
  }

  // resting or paused (with prePauseStatus === resting)
  return (
    <YStack flex={1} bg="$bgDarker">
      <RestView />
      <PausedOverlay />
    </YStack>
  );
}
