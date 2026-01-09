import { resolveImageAsset } from "@/src/constants/assetMap";
import { useHaptics } from "@/src/hooks/useHaptics";
import { useReducedMotion } from "@/src/hooks/useReducedMotion";
import { formatTime, useSessionTimer } from "@/src/hooks/useSessionTimer";
import { useSessionStore } from "@/src/stores/session";
import { useSettingsStore } from "@/src/stores/settings";
import { Image } from "expo-image";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, H1, H3, Progress, Text, XStack, YStack } from "tamagui";
import { BossHpBar } from "./BossHpBar";
import { SessionTimer } from "./SessionProgressBar";

/**
 * Rest & Recovery View
 * biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Post-exercise rest screen with timers and rep adjustment
 */
export function RestView() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { language } = useSettingsStore();
  const { selection, mediumImpact } = useHaptics();
  const reducedMotion = useReducedMotion();
  const {
    quest,
    currentExerciseIndex,
    skipRest,
    addRestTime,
    results,
    updateLastResult,
    bossFight,
    lastDamageResult,
  } = useSessionStore();
  const { remainingSeconds, progress } = useSessionTimer();

  if (!quest) return null;

  // In 'resting' state, currentExerciseIndex points to the UPCOMING exercise
  const nextEx = quest.exercises[currentExerciseIndex];
  const nextExName = language === "fr" ? nextEx.exercise.frName : nextEx.exercise.enName;

  const nextExTargetLabel =
    nextEx.target.type === "time"
      ? t("session.target_time_value", { count: nextEx.target.value })
      : t("session.target_reps_value", { count: nextEx.target.value });

  const lastResult = results[results.length - 1];
  const isLastRepBased = lastResult?.result.type === "reps";
  const isLastTimeBased = lastResult?.result.type === "time";

  // Get next exercise image
  const nextExImage = resolveImageAsset(nextEx.exercise.imagePath);

  const handleSkipRest = () => {
    mediumImpact();
    skipRest();
  };

  const handleAddRestTime = (seconds: number) => {
    selection();
    addRestTime(seconds);
  };

  const handleUpdateResult = (value: number) => {
    selection();
    updateLastResult(value);
  };

  const handleUpdateResultDelta = (delta: number) => {
    if (!lastResult) return;
    handleUpdateResult(Math.max(1, lastResult.result.value + delta));
  };

  return (
    <YStack
      flex={1}
      bg="$bgDarker"
      pt={insets.top + 12}
      pb={insets.bottom + 16}
      px="$4"
      gap="$4"
      animation={reducedMotion ? undefined : "quick"}
      enterStyle={reducedMotion ? undefined : { opacity: 0 }}
    >
      {/* Global Session Timer */}
      <XStack justifyContent="flex-end">
        <SessionTimer />
      </XStack>

      {/* Header - Rest Cue */}
      <YStack
        items="center"
        gap="$2"
        animation={reducedMotion ? undefined : "bouncy"}
        enterStyle={reducedMotion ? undefined : { opacity: 0, y: -20 }}
      >
        <Text fontSize={32}>⏸️</Text>
        <H3 color="$text" fontWeight="900" textTransform="uppercase">
          {t("session.rest_title")}
        </H3>
        <Text color="$textSecondary" fontSize={14}>
          {t("session.recover_and_prepare")}
        </Text>
      </YStack>

      {/* Boss HP Bar (only for boss fights) */}
      {bossFight && (
        <YStack
          animation={reducedMotion ? undefined : "bouncy"}
          enterStyle={reducedMotion ? undefined : { opacity: 0 }}
        >
          <BossHpBar
            currentHp={bossFight.currentHp}
            totalHp={bossFight.totalHp}
            lastDamage={
              lastDamageResult
                ? {
                  damage: lastDamageResult.damage,
                  isCritical: lastDamageResult.isCritical,
                  weaknessBonus: lastDamageResult.weaknessBonus,
                }
                : null
            }
          />
        </YStack>
      )}

      {/* Timer Section */}
      <YStack items="center" gap="$3">
        <H1 fontSize={80} fontWeight="900" fontFamily="$body" color="$text">
          {formatTime(remainingSeconds)}
        </H1>
        <Progress
          value={Math.min(1, Math.max(0, progress)) * 100}
          size="$3"
          bg="$bgOverlay"
          borderWidth={1}
          borderColor="$borderStrong"
          rounded="$4"
          width="100%"
          style={{ maxWidth: 320 }}
        >
          <Progress.Indicator animation="quick" bg="$primary" />
        </Progress>
        <XStack gap="$2">
          <Button
            size="$3"
            bg="$glassBg"
            borderWidth={1}
            borderColor="$borderStrong"
            onPress={() => handleAddRestTime(10)}
          >
            <Text fontWeight="800" color="$text" fontSize={12}>
              {t("session.add_seconds", { count: 10 })}
            </Text>
          </Button>
          <Button
            size="$3"
            bg="$glassBg"
            borderWidth={1}
            borderColor="$borderStrong"
            onPress={() => handleAddRestTime(30)}
          >
            <Text fontWeight="800" color="$text" fontSize={12}>
              {t("session.add_seconds", { count: 30 })}
            </Text>
          </Button>
        </XStack>
      </YStack>

      {/* Last Set Adjustment (reps or time) */}
      {(isLastRepBased || isLastTimeBased) && lastResult && (
        <YStack
          bg="$glassBg"
          p="$4"
          rounded="$4"
          borderWidth={1}
          borderColor="$borderStrong"
          gap="$2"
          animation={reducedMotion ? undefined : "quick"}
          enterStyle={reducedMotion ? undefined : { opacity: 0 }}
        >
          <YStack gap="$1" marginBottom="$2">
            <Text
              color="$text"
              opacity={0.8}
              fontSize={13}
              fontWeight="800"
              textTransform="uppercase"
            >
              {isLastTimeBased ? t("session.adjust_time_label") : t("session.adjust_reps_label")}
            </Text>
            <Text fontSize={12} color="$textSecondary">
              {t("session.adjust_reps_hint")}
            </Text>
          </YStack>

          <XStack items="center" gap="$3" justify="space-between">
            <YStack flex={1}>
              <Text fontSize={12} color="$textSecondary">
                {isLastTimeBased ? t("session.time_completed") : t("session.reps_completed")}
              </Text>
            </YStack>

            {isLastTimeBased ? (
              <XStack items="center" gap="$2">
                <Button
                  size="$3"
                  bg="$glassBg"
                  borderWidth={1}
                  borderColor="$borderStrong"
                  onPress={() => handleUpdateResultDelta(-10)}
                >
                  <Text fontSize={14} fontWeight="900" color="$text">
                    −10
                  </Text>
                </Button>
                <Button
                  size="$3"
                  bg="$glassBg"
                  borderWidth={1}
                  borderColor="$borderStrong"
                  onPress={() => handleUpdateResultDelta(-1)}
                >
                  <Text fontSize={14} fontWeight="900" color="$text">
                    −1
                  </Text>
                </Button>

                <Text
                  fontWeight="900"
                  fontSize={20}
                  color="$text"
                  style={{ minWidth: 72, textAlign: "center" }}
                >
                  {formatTime(lastResult.result.value)}
                </Text>

                <Button
                  size="$3"
                  bg="$glassBg"
                  borderWidth={1}
                  borderColor="$borderStrong"
                  onPress={() => handleUpdateResultDelta(1)}
                >
                  <Text fontSize={14} fontWeight="900" color="$text">
                    +1
                  </Text>
                </Button>
                <Button
                  size="$3"
                  bg="$glassBg"
                  borderWidth={1}
                  borderColor="$borderStrong"
                  onPress={() => handleUpdateResultDelta(10)}
                >
                  <Text fontSize={14} fontWeight="900" color="$text">
                    +10
                  </Text>
                </Button>
              </XStack>
            ) : (
              <XStack items="center" gap="$3">
                <Button
                  size="$3"
                  circular
                  bg="$glassBg"
                  borderWidth={1}
                  borderColor="$borderStrong"
                  onPress={() => handleUpdateResultDelta(-1)}
                >
                  <Text fontSize={20} fontWeight="900" color="$text">
                    −
                  </Text>
                </Button>
                <Text
                  fontWeight="900"
                  fontSize={24}
                  color="$text"
                  style={{ minWidth: 40, textAlign: "center" }}
                >
                  {lastResult.result.value}
                </Text>
                <Button
                  size="$3"
                  circular
                  bg="$glassBg"
                  borderWidth={1}
                  borderColor="$borderStrong"
                  onPress={() => handleUpdateResultDelta(1)}
                >
                  <Text fontSize={20} fontWeight="900" color="$text">
                    +
                  </Text>
                </Button>
              </XStack>
            )}
          </XStack>
        </YStack>
      )}

      {/* Up Next Card - Preview of Next Exercise */}
      <YStack
        bg="$glassBg"
        p="$4"
        rounded="$4"
        borderWidth={1}
        borderColor="$borderStrong"
        gap="$2"
        animation={reducedMotion ? undefined : "bouncy"}
        enterStyle={reducedMotion ? undefined : { opacity: 0, x: 30 }}
      >
        <Text color="$textSecondary" fontSize={12} fontWeight="800" textTransform="uppercase">
          {t("session.up_next")}
        </Text>
        <XStack gap="$3" items="center">
          <YStack
            width={56}
            height={56}
            bg="$bgOverlay"
            rounded="$3"
            overflow="hidden"
            borderWidth={1}
            borderColor="$primary"
          >
            <Image source={nextExImage} style={{ width: 56, height: 56 }} contentFit="cover" />
          </YStack>
          <YStack flex={1}>
            <Text fontWeight="900" fontSize={18} numberOfLines={1} color="$text">
              {nextExName}
            </Text>
            <Text color="$textSecondary" fontSize={13}>
              {nextExTargetLabel}
            </Text>
          </YStack>
        </XStack>
      </YStack>

      {/* Skip Rest Button */}
      <Button
        size="$6"
        bg="$primary"
        pressStyle={{ opacity: 0.9, scale: 0.98 }}
        onPress={handleSkipRest}
        borderRadius="$4"
        mt="auto"
        shadowColor="$primaryGlow"
        shadowOpacity={0.5}
        shadowRadius={16}
        accessibilityLabel={t("session.skip_rest_accessibility")}
        accessibilityRole="button"
      >
        <Text color="$text" fontSize={18} fontWeight="900" textTransform="uppercase">
          {t("session.skip_rest")}
        </Text>
      </Button>
    </YStack>
  );
}
