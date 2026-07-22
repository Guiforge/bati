import { Minus, Plus } from "@tamagui/lucide-icons";
import { Image } from "expo-image";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, H1, H3, Progress, Text, XStack, YStack } from "tamagui";
import { GameIcon } from "@/components/common/GameIcon";
import { getExerciseAsset } from "@/constants/assetMap";
import { getQuestColorTokensFromQuest } from "@/constants/exerciseColors";
import { useHaptics } from "@/hooks/useHaptics";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { formatTime, useSessionTimer } from "@/hooks/useSessionTimer";
import { useSessionStore } from "@/stores/session";
import { useSettingsStore } from "@/stores/settings";
import { BossHpBar } from "./BossHpBar";

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: one screen component, boss/rest branches read top-to-bottom
export function RestView() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const language = useSettingsStore((s) => s.language);
  const { selection, mediumImpact } = useHaptics();
  const reducedMotion = useReducedMotion();
  const quest = useSessionStore((s) => s.quest);
  const currentExerciseIndex = useSessionStore((s) => s.currentExerciseIndex);
  const skipRest = useSessionStore((s) => s.skipRest);
  const addRestTime = useSessionStore((s) => s.addRestTime);
  const results = useSessionStore((s) => s.results);
  const updateLastResult = useSessionStore((s) => s.updateLastResult);
  const bossFight = useSessionStore((s) => s.bossFight);
  const lastDamageResult = useSessionStore((s) => s.lastDamageResult);
  const { remainingSeconds, progress } = useSessionTimer();

  if (!quest) return null;

  // In 'resting' state, currentExerciseIndex points to the UPCOMING exercise
  const nextEx = quest.exercises[currentExerciseIndex];
  const nextExName = language === "fr" ? nextEx.exercise.frName : nextEx.exercise.enName;

  const lastResult = results[results.length - 1];
  // Time-based sets record whatever the timer read when you tapped "done" — often a few seconds
  // off from what you actually held. Same ± control as reps, stepped by 5s.
  const isLastTimeBased = lastResult?.result.type === "time";
  const adjustStep = isLastTimeBased ? 5 : 1;

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
      pt={insets.top + 16}
      pb={insets.bottom + 16}
      px="$4"
      gap="$6"
      justify="center"
      animation={reducedMotion ? undefined : "quick"}
      enterStyle={reducedMotion ? undefined : { opacity: 0 }}
    >
      {/* Header */}
      <YStack
        items="center"
        gap="$2"
        animation={reducedMotion ? undefined : "bouncy"}
        enterStyle={reducedMotion ? undefined : { opacity: 0, y: -20 }}
      >
        <GameIcon name="flame" size={40} color="$warning" />
        <H3 color="$text" fontWeight="700">
          {t("session.rest_title")}
        </H3>
      </YStack>

      {/* Boss HP Bar (only for boss fights) */}
      {bossFight && (
        <BossHpBar
          currentHp={bossFight.currentHp}
          totalHp={bossFight.totalHp}
          bossImagePath={bossFight.imagePath}
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
      )}

      {/* Timer */}
      <YStack items="center" gap="$2">
        <H1 fontSize={112} fontWeight="700" fontFamily="$body" color="$text">
          {formatTime(remainingSeconds)}
        </H1>
        <Progress
          value={Math.min(1, Math.max(0, progress)) * 100}
          size="$4"
          bg="$surface2"
          borderWidth={1}
          borderColor="$borderStrong"
          rounded="$6"
          width="100%"
          style={{ maxWidth: 360 }}
        >
          <Progress.Indicator animation="quick" bg="$primary" />
        </Progress>
        <XStack gap="$3">
          <Button
            size="$3"
            bg="$surface"
            borderWidth={1}
            borderColor="$borderStrong"
            onPress={() => handleAddRestTime(10)}
          >
            <Text fontWeight="700" color="$text">
              +10s
            </Text>
          </Button>
          <Button
            size="$3"
            bg="$surface"
            borderWidth={1}
            borderColor="$borderStrong"
            onPress={() => handleAddRestTime(30)}
          >
            <Text fontWeight="700" color="$text">
              +30s
            </Text>
          </Button>
        </XStack>
      </YStack>

      {/* Last Set Review */}
      {!!lastResult && (
        <YStack
          bg="$surface"
          p="$4"
          rounded="$6"
          borderWidth={1}
          borderColor="$borderStrong"
          gap="$2"
        >
          <XStack justify="space-between" items="center">
            <YStack>
              <Text color="$textSecondary" fontSize={12} fontWeight="700">
                {isLastTimeBased
                  ? t("session.adjust_seconds_label")
                  : t("session.adjust_reps_label")}
              </Text>
              <Text fontSize={12} color="$textSecondary">
                {isLastTimeBased ? t("session.adjust_seconds_hint") : t("session.adjust_reps_hint")}
              </Text>
            </YStack>

            <XStack items="center" gap="$3">
              <Button
                size="$3"
                circular
                icon={<Minus size={16} />}
                accessibilityLabel={t("session.decrease_result_accessibility", "Decrease result")}
                onPress={() =>
                  handleUpdateResult(Math.max(1, lastResult.result.value - adjustStep))
                }
              />
              <Text
                fontWeight="700"
                fontSize={20}
                color="$text"
                style={{ minWidth: 42, textAlign: "center" }}
              >
                {isLastTimeBased ? `${lastResult.result.value}s` : lastResult.result.value}
              </Text>
              <Button
                size="$3"
                circular
                icon={<Plus size={16} />}
                accessibilityLabel={t("session.increase_result_accessibility", "Increase result")}
                onPress={() => handleUpdateResult(lastResult.result.value + adjustStep)}
              />
            </XStack>
          </XStack>
        </YStack>
      )}

      {/* Up Next Card */}
      <YStack
        bg="$surface"
        p="$4"
        rounded="$6"
        borderWidth={1}
        borderColor="$borderStrong"
        gap="$2"
        animation={reducedMotion ? undefined : "bouncy"}
        enterStyle={reducedMotion ? undefined : { opacity: 0, x: 30 }}
      >
        <Text color="$textSecondary" fontSize={12} fontWeight="700">
          {t("session.up_next")}
        </Text>
        <XStack gap="$3" items="center">
          <YStack
            width={50}
            height={50}
            bg="$surface2"
            rounded="$3"
            overflow="hidden"
            items="center"
            justify="center"
            borderWidth={1}
            borderColor="$borderStrong"
          >
            <Image
              source={getExerciseAsset(nextEx.exercise.imagePath)}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
              transition={150}
            />
          </YStack>
          <YStack flex={1}>
            <Text fontWeight="700" fontSize={18} numberOfLines={1} color="$text">
              {nextExName}
            </Text>
            <Text color="$textSecondary">
              {nextEx.target.type === "time"
                ? `${nextEx.target.value}s`
                : `${nextEx.target.value} reps`}
            </Text>
          </YStack>
        </XStack>
      </YStack>

      {/* Skip Button */}
      <Button
        size="$6"
        bg="$primary"
        pressStyle={{ opacity: 0.9 }}
        onPress={handleSkipRest}
        borderWidth={0}
        rounded="$6"
        mt="auto"
        accessibilityLabel={t("session.skip_rest_accessibility")}
        accessibilityRole="button"
      >
        <Text color="$text" fontSize={20} fontWeight="700">
          {t("session.skip_rest")}
        </Text>
      </Button>
    </YStack>
  );
}
