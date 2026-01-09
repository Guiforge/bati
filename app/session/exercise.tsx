import { Image } from "expo-image";
import { Redirect } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, H1, Text, XStack, YStack } from "tamagui";
import { BossHpBar } from "@/src/components/session/BossHpBar";
import { ComboMeter } from "@/src/components/session/ComboMeter";
import { CriticalHitNumber } from "@/src/components/session/CriticalHitNumber";
import { PausedOverlay } from "@/src/components/session/PausedOverlay";
import { SessionProgressBar } from "@/src/components/session/SessionProgressBar";
import { resolveImageAsset } from "@/src/constants/assetMap";
import { useComboTracker } from "@/src/hooks/useComboTracker";
import { useCriticalHitDetector } from "@/src/hooks/useCriticalHitDetector";
import { useFeedbackEffects } from "@/src/hooks/useFeedbackEffects";
import { useHaptics } from "@/src/hooks/useHaptics";
import { formatTime, useSessionTimer } from "@/src/hooks/useSessionTimer";
import { useSessionStore } from "@/src/stores/session";
import { useSettingsStore } from "@/src/stores/settings";
import type { CriticalHitEvent } from "@/src/types/boss-battle";

/**
 * Exercise Screen - EXTREME MINIMALISM
 *
 * Design Philosophy: "Focus during effort"
 * - Remove all non-essential UI during exercise
 * - Maximize timer/counter visibility
 * - High contrast for clarity under physical stress
 * - Large tap targets for fatigued users
 * biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex workout screen with multiple state handlers
 */
export default function ExerciseScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const language = useSettingsStore((s) => s.language);
  const { warning } = useHaptics();

  // Get individual values from store
  const status = useSessionStore((s) => s.status);
  const quest = useSessionStore((s) => s.quest);
  const currentExerciseIndex = useSessionStore((s) => s.currentExerciseIndex);
  const currentRoundIndex = useSessionStore((s) => s.currentRoundIndex);
  const bossFight = useSessionStore((s) => s.bossFight);
  const lastDamageResult = useSessionStore((s) => s.lastDamageResult);
  const completeExercise = useSessionStore((s) => s.completeExercise);
  const pauseSession = useSessionStore((s) => s.pauseSession);

  const { remainingSeconds, elapsedSeconds } = useSessionTimer();

  // Compute values locally
  const currentExercise = quest?.exercises[currentExerciseIndex] ?? null;
  const currentSet = currentRoundIndex + 1;
  const totalSets = quest?.rounds ?? 0;
  const totalExercises = quest?.exercises.length ?? 0;

  const [criticalHits, setCriticalHits] = useState<CriticalHitEvent[]>([]);

  // Dopamine hooks
  const { recordRep, resetCombo, combo } = useComboTracker({
    breakThresholdMs: 5000,
    onComboMilestone: (count) => {
      triggerComboMilestone(count);
    },
  });

  const { checkAndTrigger: checkCritical } = useCriticalHitDetector({
    criticalHitChance: 0.15,
    criticalHitMultiplier: 2,
    weaknessBonus: false,
    onCriticalHit: (event) => {
      setCriticalHits((prev) => [...prev, event]);
      triggerCriticalHit();
      // Clean up after animation
      setTimeout(() => {
        setCriticalHits((prev) => prev.filter((h) => h.id !== event.id));
      }, 1500);
    },
  });

  const { triggerCriticalHit, triggerComboMilestone, triggerRepCompleted } = useFeedbackEffects();

  // Redirect based on status - each screen handles its own redirects
  if (status === "idle" || !quest || !currentExercise) {
    return <Redirect href="/(tabs)" />;
  }
  if (status === "countdown") {
    return <Redirect href="/session/countdown" />;
  }
  if (status === "resting") {
    return <Redirect href="/session/rest" />;
  }
  if (status === "finished") {
    return <Redirect href="/session/victory" />;
  }

  // running or paused (with prePauseStatus === running)

  const handleComplete = async () => {
    // Record rep for combo tracking
    recordRep();

    // Check for critical hit
    const isCritical = checkCritical(0, 0);

    // Trigger haptic feedback (single feedback, not double)
    const intensity = isCritical ? "heavy" : "medium";
    triggerRepCompleted(intensity);

    const targetValue = currentExercise.target.value;
    await completeExercise(targetValue);

    // Reset combo if session finished
    const { status: newStatus } = useSessionStore.getState();
    if (newStatus === "finished") {
      resetCombo();
    }
    // Navigation is handled reactively by session/index.tsx based on status
  };

  const handleSkip = () => {
    Alert.alert(t("session.skip_title"), t("session.skip_warning"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("session.skip_confirm"),
        style: "destructive",
        onPress: async () => {
          warning();
          await completeExercise(0);
          // Navigation is handled reactively by session/index.tsx based on status
        },
      },
    ]);
  };

  const handlePause = () => {
    pauseSession();
  };

  const isBossFight = !!bossFight;

  const title =
    language === "fr" ? currentExercise.exercise.frName : currentExercise.exercise.enName;
  const imageSource = resolveImageAsset(currentExercise.exercise.imagePath);

  const isTimeBased = currentExercise.target.type === "time";
  const heroTime = isTimeBased
    ? formatTime(Math.max(0, remainingSeconds))
    : formatTime(elapsedSeconds);

  return (
    <YStack flex={1} bg="$bgDarker" pt={insets.top + 12} pb={insets.bottom + 20} px="$5">
      {/* Global Session Progress Bar */}
      <YStack mb="$3">
        <SessionProgressBar />
      </YStack>

      {/* Boss HP Bar - Only for boss fights */}
      {bossFight && lastDamageResult && (
        <YStack mb="$3">
          <BossHpBar
            currentHp={bossFight.currentHp}
            totalHp={bossFight.totalHp}
            bossName={t("boss.title")}
            lastDamage={{
              damage: lastDamageResult.damage,
              isCritical: lastDamageResult.isCritical,
              weaknessBonus: lastDamageResult.weaknessBonus,
            }}
            showPhaseImage={false}
          />
        </YStack>
      )}

      {/* Header row: progress + pause */}
      <XStack items="center" justifyContent="space-between" mb="$4">
        <YStack>
          <Text
            fontSize={12}
            color="$textSecondary"
            fontWeight="700"
            textTransform="uppercase"
            letterSpacing={2}
            fontFamily="$heading"
          >
            {t("session.exercise")} {currentExerciseIndex + 1}/{totalExercises} • {t("common.set")}{" "}
            {currentSet}/{totalSets}
          </Text>
        </YStack>

        <Button
          size="$3"
          circular
          chromeless
          onPress={handlePause}
          pressStyle={{ opacity: 0.7, scale: 0.96 }}
          accessibilityLabel={t("session.pause_accessibility", { defaultValue: "Pause" })}
          accessibilityRole="button"
        >
          <Text color="$text" fontSize={18} fontWeight="900">
            ||
          </Text>
        </Button>
      </XStack>

      {/* Main content */}
      <YStack flex={1} justifyContent="center" gap="$4">
        {/* Exercise Image */}
        <YStack
          bg="$glassBg"
          borderWidth={1}
          borderColor="$glassBorder"
          borderRadius="$4"
          p="$3"
          shadowColor="$primaryGlow"
          shadowOpacity={0.35}
          shadowRadius={18}
          overflow="hidden"
        >
          <YStack borderRadius="$4" overflow="hidden" borderWidth={1} borderColor="$primary">
            <Image
              source={imageSource}
              style={{ width: "100%", height: 240 }}
              contentFit="contain"
              transition={150}
            />
          </YStack>
        </YStack>

        {/* Exercise Name */}
        <Text
          fontSize={28}
          fontWeight="700"
          fontFamily="$heading"
          color="$text"
          textAlign="center"
          textTransform="uppercase"
          letterSpacing={2}
          numberOfLines={2}
        >
          {title}
        </Text>

        {/* Timer Hero */}
        <YStack items="center" gap="$2">
          <H1
            fontSize={72}
            lineHeight={78}
            fontWeight="900"
            fontFamily="$body"
            color={isBossFight ? "$error" : "$text"}
          >
            {heroTime}
          </H1>
          <Text color="$textSecondary" fontSize={16} fontWeight="600">
            {isTimeBased ? t("session.seconds") : t("session.reps")}
          </Text>
        </YStack>

        {/* Target line */}
        <YStack items="center">
          <Text color="$textSecondary" fontSize={16} fontWeight="600">
            {t("session.target")}: {currentExercise.target.value}{" "}
            {isTimeBased ? t("session.seconds") : t("session.reps")}
          </Text>
        </YStack>

        {/* Combo Meter - keep subtle, but only if active */}
        {combo.isActive && combo.current > 0 ? (
          <YStack items="center">
            <ComboMeter combo={combo} isVisible={combo.isActive && combo.current > 0} />
          </YStack>
        ) : null}
      </YStack>

      {/* Bottom actions */}
      <YStack gap="$3">
        <Button
          size="$6"
          bg={isBossFight ? "$error" : "$primary"}
          color="$text"
          fontSize={20}
          fontWeight="900"
          onPress={handleComplete}
          pressStyle={{ opacity: 0.9, scale: 0.98 }}
          shadowColor={isBossFight ? "$error" : "$primaryGlow"}
          shadowOffset={{ width: 0, height: 10 }}
          shadowOpacity={0.7}
          shadowRadius={20}
        >
          {t("session.complete_set", { defaultValue: "Complete Set" })} →
        </Button>

        <Button
          size="$4"
          variant="outlined"
          borderColor="$borderStrong"
          color="$textSecondary"
          onPress={handleSkip}
          pressStyle={{ opacity: 0.7 }}
        >
          {t("session.skip")}
        </Button>
      </YStack>

      {/* Critical Hit Numbers */}
      {criticalHits.map((hit) => (
        <CriticalHitNumber
          key={hit.id}
          damage={hit.damage}
          isCritical={hit.type === "critical" || hit.type === "weakness_bonus"}
          x={hit.position.x}
          y={hit.position.y}
          duration={1500}
        />
      ))}

      <PausedOverlay />
    </YStack>
  );
}
