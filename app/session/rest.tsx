import { Redirect } from "expo-router";
import { useEffect, useRef } from "react";
import { YStack } from "tamagui";
import { PausedOverlay } from "@/src/components/session/PausedOverlay";
import { RestView } from "@/src/components/session/RestView";
import { useSessionTimer } from "@/src/hooks/useSessionTimer";
import { useSessionStore } from "@/src/stores/session";

export default function RestScreen() {
  const status = useSessionStore((s) => s.status);
  const skipRest = useSessionStore((s) => s.skipRest);
  const timerDuration = useSessionStore((s) => s.timerDuration);
  const { remainingSeconds } = useSessionTimer();
  const hasAutoSkippedRef = useRef(false);

  // Auto-advance when rest reaches 0 (store transition to "running" will redirect below).
  useEffect(() => {
    if (status !== "resting") {
      hasAutoSkippedRef.current = false;
      return;
    }

    // Guard to avoid accidental immediate skip when no timer is configured.
    if (timerDuration <= 0) return;

    if (remainingSeconds === 0 && !hasAutoSkippedRef.current) {
      hasAutoSkippedRef.current = true;
      skipRest();
    }
  }, [remainingSeconds, skipRest, status, timerDuration]);

  if (status === "idle") return <Redirect href="/(tabs)" />;
  if (status === "countdown") return <Redirect href="/session/countdown" />;
  if (status === "running") return <Redirect href="/session/exercise" />;
  if (status === "finished") return <Redirect href="/session/victory" />;

  return (
    <YStack flex={1} bg="$bgDarker">
      <RestView />
      <PausedOverlay />
    </YStack>
  );
}
