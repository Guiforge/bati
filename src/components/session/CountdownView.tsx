import { useEffect, useRef } from "react";
import { useWindowDimensions } from "react-native";
import { Text, YStack } from "tamagui";
import { useHaptics } from "@/src/hooks/useHaptics";
import { useSessionTimer } from "@/src/hooks/useSessionTimer";
import { useSessionStore } from "@/src/stores/session";

/**
 * Countdown View - 3 Second Countdown
 * Ultra simple: just the number
 */
export function CountdownView() {
  const { height: windowHeight } = useWindowDimensions();
  const { remainingSeconds } = useSessionTimer();
  const { status, finishCountdown } = useSessionStore();
  const { success } = useHaptics();
  const hasCountdownStartedRef = useRef(false);

  useEffect(() => {
    if (status !== "countdown") {
      hasCountdownStartedRef.current = false;
      return;
    }

    if (remainingSeconds > 0) {
      hasCountdownStartedRef.current = true;
    }
  }, [remainingSeconds, status]);

  useEffect(() => {
    if (status !== "countdown") return;
    if (remainingSeconds !== 0) return;
    if (!hasCountdownStartedRef.current) return;

    success();

    const id = setTimeout(() => {
      finishCountdown();
    }, 300);

    return () => clearTimeout(id);
  }, [finishCountdown, remainingSeconds, status, success]);

  const showGo = remainingSeconds === 0;
  const fontSize = Math.max(180, Math.min(320, Math.floor(windowHeight * 0.5)));

  return (
    <YStack flex={1} bg="$bgDarker" items="center" justify="center">
      {showGo ? (
        <Text fontSize={fontSize} fontWeight="900" color="$primary" fontFamily="$heading">
          GO
        </Text>
      ) : (
        <Text fontSize={fontSize} fontWeight="900" color="$text" fontFamily="$heading">
          {remainingSeconds}
        </Text>
      )}
    </YStack>
  );
}
