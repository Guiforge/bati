import { Minus, Plus } from "@tamagui/lucide-icons";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, H1, H3, Progress, Text, XStack, YStack } from "tamagui";
import { getQuestColorTokensFromQuest } from "@/constants/exerciseColors";
import { formatTime, useSessionTimer } from "@/hooks/useSessionTimer";
import { useSessionStore } from "@/stores/session";
import { useSettingsStore } from "@/stores/settings";
import { BossHpBar } from "./BossHpBar";

export function RestView() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { language } = useSettingsStore();
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

  const lastResult = results[results.length - 1];
  const isLastRepBased = lastResult?.result.type === "reps";

  const { bg: screenBg } = getQuestColorTokensFromQuest(quest);

  const handleSkipRest = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    skipRest();
  };

  const handleAddRestTime = (seconds: number) => {
    void Haptics.selectionAsync();
    addRestTime(seconds);
  };

  const handleUpdateResult = (value: number) => {
    void Haptics.selectionAsync();
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
    >
      {/* Header */}
      <YStack items="center" gap="$2">
        <Text fontSize={40}>🔥</Text>
        <H3 color="$color" fontWeight="900" textTransform="uppercase">
          {t("session.rest_title")}
        </H3>
      </YStack>

      {/* Boss HP Bar (only for boss fights) */}
      {bossFight && (
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
      )}

      {/* Timer */}
      <YStack items="center" gap="$2">
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
        <XStack gap="$3">
          <Button
            size="$3"
            bg="transparent"
            borderWidth={2}
            borderColor="$color"
            onPress={() => handleAddRestTime(10)}
          >
            <Text fontWeight="800" color="$color">
              +10s
            </Text>
          </Button>
          <Button
            size="$3"
            bg="transparent"
            borderWidth={2}
            borderColor="$color"
            onPress={() => handleAddRestTime(30)}
          >
            <Text fontWeight="800" color="$color">
              +30s
            </Text>
          </Button>
        </XStack>
      </YStack>

      {/* Last Set Review (if reps) */}
      {isLastRepBased && (
        <YStack bg="$background" p="$4" rounded="$6" borderWidth={2} borderColor="$color" gap="$2">
          <XStack justify="space-between" items="center">
            <YStack>
              <Text
                color="$color"
                opacity={0.6}
                fontSize={12}
                fontWeight="800"
                textTransform="uppercase"
              >
                {t("session.adjust_reps_label")}
              </Text>
              <Text fontSize={12} opacity={0.5}>
                {t("session.adjust_reps_hint")}
              </Text>
            </YStack>

            <XStack items="center" gap="$3">
              <Button
                size="$3"
                circular
                icon={<Minus size={16} />}
                onPress={() => handleUpdateResult(Math.max(0, lastResult.result.value - 1))}
              />
              <Text
                fontWeight="900"
                fontSize={20}
                color="$color"
                style={{ minWidth: 30, textAlign: "center" }}
              >
                {lastResult.result.value}
              </Text>
              <Button
                size="$3"
                circular
                icon={<Plus size={16} />}
                onPress={() => handleUpdateResult(lastResult.result.value + 1)}
              />
            </XStack>
          </XStack>
        </YStack>
      )}

      {/* Up Next Card */}
      <YStack bg="$background" p="$4" rounded="$6" borderWidth={2} borderColor="$color" gap="$2">
        <Text color="$color" opacity={0.6} fontSize={12} fontWeight="800" textTransform="uppercase">
          {t("session.up_next")}
        </Text>
        <XStack gap="$3" items="center">
          <YStack width={50} height={50} bg="$bgLight" rounded="$3" items="center" justify="center">
            <Text fontSize={24}>🏋️</Text>
          </YStack>
          <YStack flex={1}>
            <Text fontWeight="900" fontSize={18} numberOfLines={1} color="$color">
              {nextExName}
            </Text>
            <Text opacity={0.7} color="$color">
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
        bg="$pastelGreen"
        pressStyle={{ opacity: 0.9 }}
        onPress={handleSkipRest}
        borderWidth={3}
        borderColor="$color"
        rounded="$6"
        mt="auto"
      >
        <Text color="$color" fontSize={20} fontWeight="900" textTransform="uppercase">
          {t("session.skip_rest")}
        </Text>
      </Button>
    </YStack>
  );
}
