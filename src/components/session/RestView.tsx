import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, H1, H3, Progress, Text, XStack, YStack } from "tamagui";
import { getQuestColorTokensFromQuest } from "@/src/constants/exerciseColors";
import { useHaptics } from "@/src/hooks/useHaptics";
import { useReducedMotion } from "@/src/hooks/useReducedMotion";
import { formatTime, useSessionTimer } from "@/src/hooks/useSessionTimer";
import { useSessionStore } from "@/src/stores/session";
import { useSettingsStore } from "@/src/stores/settings";
import { BossHpBar } from "./BossHpBar";
import { SessionProgressBar } from "./SessionProgressBar";

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

  const { bg: screenBg } = getQuestColorTokensFromQuest(quest);

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

  return (
    <YStack
      flex={1}
      bg={screenBg}
      pt={insets.top + 12}
      pb={insets.bottom + 16}
      px="$4"
      gap="$4"
      animation={reducedMotion ? undefined : "quick"}
      enterStyle={reducedMotion ? undefined : { opacity: 0 }}
    >
      {/* Global Session Progress Bar */}
      <SessionProgressBar />

      {/* Header - Rest Cue */}
      <YStack
        items="center"
        gap="$2"
        animation={reducedMotion ? undefined : "bouncy"}
        enterStyle={reducedMotion ? undefined : { opacity: 0, y: -20 }}
      >
        <Text fontSize={40}>🔥</Text>
        <H3 color="$color" fontWeight="900" textTransform="uppercase">
          {t("session.rest_title")}
        </H3>
        <Text color="$color" opacity={0.6} fontSize={14}>
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
        <H1 fontSize={112} fontWeight="900" fontFamily="$body" color="$color">
          {formatTime(remainingSeconds)}
        </H1>
        <Progress
          value={Math.min(1, Math.max(0, progress)) * 100}
          size="$4"
          bg="$bgLight"
          borderWidth={2}
          borderColor="$color"
          rounded="$6"
          width="100%"
          style={{ maxWidth: 360 }}
        >
          <Progress.Indicator animation="quick" bg="$primary" />
        </Progress>
        <XStack gap="$2">
          <Button
            size="$3"
            bg="transparent"
            borderWidth={2}
            borderColor="$color"
            onPress={() => handleAddRestTime(10)}
          >
            <Text fontWeight="800" color="$color" fontSize={12}>
              {t("session.add_seconds", { count: 10 })}
            </Text>
          </Button>
          <Button
            size="$3"
            bg="transparent"
            borderWidth={2}
            borderColor="$color"
            onPress={() => handleAddRestTime(30)}
          >
            <Text fontWeight="800" color="$color" fontSize={12}>
              {t("session.add_seconds", { count: 30 })}
            </Text>
          </Button>
        </XStack>
      </YStack>

      {/* Last Set Adjustment (if reps) */}
      {isLastRepBased && (
        <YStack
          bg="$background"
          p="$4"
          rounded="$6"
          borderWidth={3}
          borderColor="$color"
          gap="$2"
          animation={reducedMotion ? undefined : "quick"}
          enterStyle={reducedMotion ? undefined : { opacity: 0 }}
        >
          <YStack gap="$1" marginBottom="$2">
            <Text
              color="$color"
              opacity={0.8}
              fontSize={13}
              fontWeight="800"
              textTransform="uppercase"
            >
              {t("session.adjust_reps_label")}
            </Text>
            <Text fontSize={12} color="$color" opacity={0.5}>
              {t("session.adjust_reps_hint")}
            </Text>
          </YStack>

          <XStack items="center" gap="$3" justify="space-between">
            <YStack flex={1}>
              <Text fontSize={12} color="$color" opacity={0.6}>
                {t("session.reps_completed")}
              </Text>
            </YStack>

            <XStack items="center" gap="$3">
              <Button
                size="$3"
                circular
                onPress={() => handleUpdateResult(Math.max(1, lastResult.result.value - 1))}
              >
                <Text fontSize={20} fontWeight="900" color="$color">
                  −
                </Text>
              </Button>
              <Text
                fontWeight="900"
                fontSize={24}
                color="$color"
                style={{ minWidth: 40, textAlign: "center" }}
              >
                {lastResult.result.value}
              </Text>
              <Button
                size="$3"
                circular
                onPress={() => handleUpdateResult(lastResult.result.value + 1)}
              >
                <Text fontSize={20} fontWeight="900" color="$color">
                  +
                </Text>
              </Button>
            </XStack>
          </XStack>
        </YStack>
      )}

      {/* Up Next Card - Preview of Next Exercise */}
      <YStack
        bg="$background"
        p="$4"
        rounded="$6"
        borderWidth={3}
        borderColor="$color"
        gap="$2"
        animation={reducedMotion ? undefined : "bouncy"}
        enterStyle={reducedMotion ? undefined : { opacity: 0, x: 30 }}
      >
        <Text color="$color" opacity={0.6} fontSize={12} fontWeight="800" textTransform="uppercase">
          {t("session.up_next")}
        </Text>
        <XStack gap="$3" items="center">
          <YStack width={50} height={50} bg="$bgLight" rounded="$3" items="center" justify="center">
            <Text fontSize={24}>💪</Text>
          </YStack>
          <YStack flex={1}>
            <Text fontWeight="900" fontSize={18} numberOfLines={1} color="$color">
              {nextExName}
            </Text>
            <Text opacity={0.7} color="$color" fontSize={13}>
              {nextExTargetLabel}
            </Text>
          </YStack>
        </XStack>
      </YStack>

      {/* Skip Rest Button */}
      <Button
        size="$6"
        bg="$pastelGreen"
        pressStyle={{ opacity: 0.9 }}
        onPress={handleSkipRest}
        borderWidth={3}
        borderColor="$color"
        rounded="$6"
        mt="auto"
        accessibilityLabel={t("session.skip_rest_accessibility")}
        accessibilityRole="button"
      >
        <Text color="$color" fontSize={18} fontWeight="900" textTransform="uppercase">
          {t("session.skip_rest")}
        </Text>
      </Button>
    </YStack>
  );
}
