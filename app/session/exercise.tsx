import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, ScrollView, Text, XStack, YStack } from "tamagui";
import { useSessionStore } from "@/stores/session";
import { BossHpBar } from "@/components/session/BossHpBar";

export default function ExerciseScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const {
    currentExercise,
    currentSet,
    totalSets,
    exerciseIndex,
    totalExercises,
    completeExercise,
    pauseSession,
    bossFight,
    lastDamageResult,
  } = useSessionStore();

  const [isPaused, setIsPaused] = useState(false);

  if (!currentExercise) {
    // No active session, redirect
    router.replace("/(tabs)");
    return null;
  }

  const handleComplete = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const hasMoreExercises = await completeExercise();

    if (hasMoreExercises) {
      router.push("/session/rest");
    } else {
      router.replace("/session/victory");
    }
  };

  const handlePause = () => {
    setIsPaused(true);
    pauseSession();
  };

  const handleResume = () => {
    setIsPaused(false);
  };

  const isBossFight = !!bossFight;

  return (
    <YStack flex={1} bg={isBossFight ? "#0A0A0F" : "$bgDark"}>
      {/* Boss HP Bar */}
      {bossFight && lastDamageResult && (
        <YStack p="$4" pt="$6">
          <BossHpBar
            currentHp={bossFight.currentHp}
            totalHp={bossFight.totalHp}
            bossName={t("boss.title")}
            lastDamage={
              lastDamageResult
                ? {
                    damage: lastDamageResult.damage,
                    isCritical: lastDamageResult.isCrit,
                    weaknessBonus: lastDamageResult.isWeaknessBonus,
                  }
                : null
            }
            showPhaseImage={false}
          />
        </YStack>
      )}

      {/* Progress Header */}
      <YStack bg="$surface" padding="$4" borderBottomWidth={1} borderBottomColor="$borderStrong">
        <Text fontSize={14} color="$textSecondary" textAlign="center">
          {t("session.exercise")} {exerciseIndex + 1} {t("common.of")} {totalExercises} •{" "}
          {t("common.set")} {currentSet} {t("common.of")} {totalSets}
        </Text>
        <YStack bg="$glassBg" height={4} borderRadius="$2" marginTop="$2" overflow="hidden">
          <YStack
            bg={isBossFight ? "$error" : "$primary"}
            height="100%"
            width={`${(exerciseIndex / totalExercises) * 100}%`}
          />
        </YStack>
      </YStack>

      <ScrollView flex={1} padding="$6">
        {/* Exercise Name */}
        <Text fontSize={32} fontWeight="bold" color="$text" marginBottom="$4">
          {currentExercise.enName}
        </Text>

        {/* Exercise Instructions */}
        <YStack
          bg="$glassBg"
          padding="$4"
          borderRadius="$4"
          borderWidth={1}
          borderColor="$glassBorder"
          marginBottom="$4"
        >
          <Text fontSize={16} color="$text" lineHeight={24}>
            {currentExercise.instructions}
          </Text>
        </YStack>

        {/* Target */}
        <XStack gap="$3" marginBottom="$6">
          <YStack flex={1} bg="$surface" padding="$4" borderRadius="$4" alignItems="center">
            <Text fontSize={14} color="$textSecondary" marginBottom="$2">
              {t("session.target")}
            </Text>
            <Text fontSize={24} fontWeight="bold" color="$primary">
              {currentExercise.baseReps || currentExercise.baseTime}
            </Text>
            <Text fontSize={12} color="$textSecondary">
              {currentExercise.baseReps ? t("session.reps") : t("session.seconds")}
            </Text>
          </YStack>

          <YStack flex={1} bg="$surface" padding="$4" borderRadius="$4" alignItems="center">
            <Text fontSize={14} color="$textSecondary" marginBottom="$2">
              {t("session.difficulty")}
            </Text>
            <Text fontSize={18} fontWeight="600" color="$text">
              {currentExercise.difficulty}
            </Text>
          </YStack>
        </XStack>
      </ScrollView>

      {/* Action Buttons */}
      <YStack padding="$4" gap="$3" bg="$surface" borderTopWidth={1} borderTopColor="$borderStrong">
        {!isPaused ? (
          <>
            <Button
              size="$5"
              bg="$primary"
              color="$text"
              onPress={handleComplete}
              pressStyle={{ opacity: 0.8 }}
            >
              {t("session.complete")}
            </Button>
            <Button
              size="$4"
              variant="outlined"
              borderColor="$borderStrong"
              color="$textSecondary"
              onPress={handlePause}
            >
              {t("session.pause")}
            </Button>
          </>
        ) : (
          <Button size="$5" bg="$primary" color="$text" onPress={handleResume}>
            {t("session.resume")}
          </Button>
        )}
      </YStack>
    </YStack>
  );
}
