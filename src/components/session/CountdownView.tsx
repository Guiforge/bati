import { BlurView } from "expo-blur";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { H1, Text, YStack } from "tamagui";
import { useHaptics } from "@/src/hooks/useHaptics";
import { useReducedMotion } from "@/src/hooks/useReducedMotion";
import { useSessionTimer } from "@/src/hooks/useSessionTimer";
import { useSessionStore } from "@/src/stores/session";
import { useSettingsStore } from "@/src/stores/settings";

/**
 * Countdown View
 *
 * Goal: Get the user into physical position.
 * - Massive, centered, pulsing number
 * - Hands-free interface (no interaction needed)
 * - Haptic/audio feedback on each second
 * - Motivational message when ready
 */
export function CountdownView() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const { remainingSeconds } = useSessionTimer();
  const { status, finishCountdown, quest, currentExerciseIndex } = useSessionStore();
  const { language } = useSettingsStore();
  const { lightImpact, success } = useHaptics();
  const reducedMotion = useReducedMotion();
  const prevSecondsRef = useRef(remainingSeconds);

  // Light haptic tick on each countdown second
  useEffect(() => {
    if (status !== "countdown") return;
    if (remainingSeconds !== prevSecondsRef.current && remainingSeconds > 0) {
      lightImpact();
    }
    prevSecondsRef.current = remainingSeconds;
  }, [remainingSeconds, status, lightImpact]);

  // Success haptic on "Let's go!"
  useEffect(() => {
    if (status !== "countdown") return;
    if (remainingSeconds !== 0) return;

    success();

    const id = setTimeout(() => {
      finishCountdown();
    }, 450);

    return () => clearTimeout(id);
  }, [finishCountdown, remainingSeconds, status, success]);

  const showLetsGo = remainingSeconds === 0;

  const nextExercise = quest?.exercises?.[currentExerciseIndex] ?? null;
  const nextLabel = nextExercise?.exercise
    ? language === "fr"
      ? nextExercise.exercise.frName
      : nextExercise.exercise.enName
    : "";

  // Spec: number should occupy ~40% of screen height.
  // We clamp to keep it readable on very small/very tall screens.
  const countdownFontSize = Math.max(120, Math.min(220, Math.floor(windowHeight * 0.4)));

  return (
    <YStack flex={1} bg="$bgDarker">
      {/* Heavy blur + deep black overlay to eliminate distractions */}
      <BlurView
        intensity={85}
        tint="dark"
        style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
      />
      <YStack
        flex={1}
        bg="$bgOverlay"
        pt={insets.top + 20}
        pb={insets.bottom + 20}
        px="$5"
        items="center"
        justify="center"
        gap="$5"
      >
        <Text
          fontSize={14}
          fontWeight="800"
          color="$textSecondary"
          textTransform="uppercase"
          letterSpacing={3}
          textAlign="center"
          fontFamily="$heading"
        >
          {t("session.get_ready")}
        </Text>

        {showLetsGo ? (
          <YStack
            items="center"
            gap="$3"
            animation={reducedMotion ? undefined : "bouncy"}
            enterStyle={reducedMotion ? undefined : { scale: 0.9, opacity: 0 }}
          >
            <H1
              fontWeight="700"
              fontSize={Math.max(80, Math.min(140, Math.floor(windowHeight * 0.22)))}
              lineHeight={Math.max(84, Math.min(150, Math.floor(windowHeight * 0.24)))}
              color="$gold"
              textTransform="uppercase"
              fontFamily="$heading"
              style={{ textAlign: "center" }}
            >
              {t("session.countdown_letsgo")}
            </H1>
            <Text
              fontWeight="700"
              fontSize={16}
              color="$textSecondary"
              textAlign="center"
              lineHeight={22}
            >
              {t("session.countdown_warmup_done")}
            </Text>
          </YStack>
        ) : (
          <YStack items="center" gap="$4">
            <H1
              fontWeight="700"
              fontSize={countdownFontSize}
              lineHeight={countdownFontSize}
              color="$text"
              fontFamily="$heading"
              animation={reducedMotion ? undefined : "quick"}
              // Trigger per-second zoom-out effect.
              key={reducedMotion ? undefined : String(remainingSeconds)}
              enterStyle={reducedMotion ? undefined : { scale: 1.18, opacity: 0.9 }}
              style={{ textAlign: "center" }}
            >
              {remainingSeconds}
            </H1>

            {nextLabel ? (
              <YStack
                bg="$glassBg"
                borderWidth={1}
                borderColor="$glassBorder"
                px="$4"
                py="$3"
                borderRadius="$4"
                maxWidth={420}
              >
                <Text
                  fontSize={14}
                  fontWeight="800"
                  color="$textSecondary"
                  textAlign="center"
                  textTransform="uppercase"
                  letterSpacing={2}
                  fontFamily="$heading"
                >
                  {t("session.next", { defaultValue: "Next" })}: {nextLabel}
                </Text>
              </YStack>
            ) : null}
          </YStack>
        )}
      </YStack>
    </YStack>
  );
}
