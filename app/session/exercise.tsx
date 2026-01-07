import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Dialog, ScrollView, Text, XStack, YStack } from "tamagui";
import { BossHpBar } from "@/src/components/session/BossHpBar";
import { useGameIcon } from "@/src/hooks/useGameIcon";
import { useSessionStore } from "@/src/stores/session";

export default function ExerciseScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { GameIcon } = useGameIcon();

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
  const [showSkipDialog, setShowSkipDialog] = useState(false);
  const [showModifyDialog, setShowModifyDialog] = useState(false);
  const [showXpAnimation, setShowXpAnimation] = useState(false);

  if (!currentExercise) {
    // No active session, redirect
    router.replace("/(tabs)");
    return null;
  }

  const handleComplete = async () => {
    // Story 3.6: Visual + Haptic feedback
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowXpAnimation(true);

    // Simulate XP animation duration
    setTimeout(() => setShowXpAnimation(false), 1500);

    const hasMoreExercises = await completeExercise();

    if (hasMoreExercises) {
      router.push("/session/rest");
    } else {
      router.replace("/session/victory");
    }
  };

  const handleSkip = () => {
    setShowSkipDialog(true);
  };

  const confirmSkip = async () => {
    setShowSkipDialog(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    // Skip exercise - move to rest/next
    const hasMoreExercises = await completeExercise(0); // 0 reps = skipped

    if (hasMoreExercises) {
      router.push("/session/rest");
    } else {
      router.replace("/session/victory");
    }
  };

  const handleModify = () => {
    setShowModifyDialog(true);
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

            <XStack gap="$2">
              <Button
                flex={1}
                size="$4"
                variant="outlined"
                borderColor="$borderStrong"
                color="$textSecondary"
                onPress={handleModify}
              >
                {t("session.modify")}
              </Button>

              <Button
                flex={1}
                size="$4"
                variant="outlined"
                borderColor="$error"
                color="$error"
                onPress={handleSkip}
              >
                {t("session.skip")}
              </Button>
            </XStack>

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

      {/* XP Animation (Story 3.6) */}
      {showXpAnimation && (
        <YStack
          position="absolute"
          top="50%"
          left="50%"
          transform={[{ translateX: -50 }, { translateY: -100 }]}
          animation="bouncy"
          enterStyle={{ opacity: 0, y: 50, scale: 0.5 }}
          exitStyle={{ opacity: 0, y: -50 }}
        >
          <YStack
            bg="$primary"
            px="$6"
            py="$4"
            borderRadius="$6"
            shadowColor="$primaryGlow"
            shadowRadius={20}
            shadowOpacity={0.8}
          >
            <Text fontSize={32} fontWeight="900" color="$text" textAlign="center">
              +50 XP
            </Text>
          </YStack>
        </YStack>
      )}

      {/* Skip Confirmation Dialog (Story 3.5) */}
      <Dialog open={showSkipDialog} onOpenChange={setShowSkipDialog}>
        <Dialog.Portal>
          <Dialog.Overlay
            key="overlay"
            animation="quick"
            opacity={0.5}
            enterStyle={{ opacity: 0 }}
            exitStyle={{ opacity: 0 }}
          />
          <Dialog.Content
            bordered
            elevate
            key="content"
            animation={[
              "quick",
              {
                opacity: {
                  overshootClamping: true,
                },
              },
            ]}
            enterStyle={{ x: 0, y: -20, opacity: 0, scale: 0.9 }}
            exitStyle={{ x: 0, y: 10, opacity: 0, scale: 0.95 }}
            gap="$4"
            bg="$bgDark"
            p="$6"
          >
            <Dialog.Title fontSize="$7" fontWeight="bold" color="$text">
              {t("session.skip_title")}
            </Dialog.Title>
            <Dialog.Description fontSize="$4" color="$textSecondary">
              {t("session.skip_warning")}
            </Dialog.Description>

            <XStack gap="$3" justifyContent="flex-end">
              <Dialog.Close asChild>
                <Button variant="outlined" borderColor="$borderStrong">
                  {t("common.cancel")}
                </Button>
              </Dialog.Close>
              <Button bg="$error" onPress={confirmSkip}>
                {t("session.skip_confirm")}
              </Button>
            </XStack>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>

      {/* Modify Exercise Dialog (Story 3.5) */}
      <Dialog open={showModifyDialog} onOpenChange={setShowModifyDialog}>
        <Dialog.Portal>
          <Dialog.Overlay
            key="overlay"
            animation="quick"
            opacity={0.5}
            enterStyle={{ opacity: 0 }}
            exitStyle={{ opacity: 0 }}
          />
          <Dialog.Content
            bordered
            elevate
            key="content"
            animation={[
              "quick",
              {
                opacity: {
                  overshootClamping: true,
                },
              },
            ]}
            enterStyle={{ x: 0, y: -20, opacity: 0, scale: 0.9 }}
            exitStyle={{ x: 0, y: 10, opacity: 0, scale: 0.95 }}
            gap="$4"
            bg="$bgDark"
            p="$6"
          >
            <Dialog.Title fontSize="$7" fontWeight="bold" color="$text">
              {t("session.modify_title")}
            </Dialog.Title>
            <Dialog.Description fontSize="$4" color="$textSecondary" mb="$3">
              {t("session.modify_subtitle")}
            </Dialog.Description>

            {/* Alternative exercises - simplified for MVP */}
            <YStack gap="$2">
              <Button
                size="$4"
                bg="$glassBg"
                borderColor="$borderStrong"
                borderWidth={1}
                justifyContent="flex-start"
                onPress={() => setShowModifyDialog(false)}
              >
                <XStack gap="$3" alignItems="center">
                  <GameIcon name="dumbbell" size={20} color="$text" />
                  <YStack flex={1}>
                    <Text color="$text" fontSize="$4" fontWeight="600">
                      {t("session.alternative_1")}
                    </Text>
                    <Text color="$textSecondary" fontSize="$2">
                      {t("session.difficulty_easier")}
                    </Text>
                  </YStack>
                </XStack>
              </Button>

              <Button
                size="$4"
                bg="$glassBg"
                borderColor="$borderStrong"
                borderWidth={1}
                justifyContent="flex-start"
                onPress={() => setShowModifyDialog(false)}
              >
                <XStack gap="$3" alignItems="center">
                  <GameIcon name="dumbbell" size={20} color="$text" />
                  <YStack flex={1}>
                    <Text color="$text" fontSize="$4" fontWeight="600">
                      {t("session.alternative_2")}
                    </Text>
                    <Text color="$textSecondary" fontSize="$2">
                      {t("session.difficulty_similar")}
                    </Text>
                  </YStack>
                </XStack>
              </Button>

              <Button
                size="$4"
                bg="$glassBg"
                borderColor="$borderStrong"
                borderWidth={1}
                justifyContent="flex-start"
                onPress={() => setShowModifyDialog(false)}
              >
                <XStack gap="$3" alignItems="center">
                  <GameIcon name="dumbbell" size={20} color="$text" />
                  <YStack flex={1}>
                    <Text color="$text" fontSize="$4" fontWeight="600">
                      {t("session.alternative_3")}
                    </Text>
                    <Text color="$textSecondary" fontSize="$2">
                      {t("session.difficulty_harder")}
                    </Text>
                  </YStack>
                </XStack>
              </Button>
            </YStack>

            <Dialog.Close asChild>
              <Button variant="outlined" borderColor="$borderStrong" mt="$2">
                {t("common.cancel")}
              </Button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    </YStack>
  );
}
