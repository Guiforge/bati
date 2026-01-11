import { Image } from "expo-image";
import { Redirect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Text, XStack, YStack } from "tamagui";
import { BossHpBar } from "@/src/components/session/BossHpBar";
import { ComboMeter } from "@/src/components/session/ComboMeter";
import { CriticalHitNumber } from "@/src/components/session/CriticalHitNumber";
import { PausedOverlay } from "@/src/components/session/PausedOverlay";
import { SessionTimer } from "@/src/components/session/SessionProgressBar";
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
  const { impact } = useHaptics();

  // Get individual values from store
  const status = useSessionStore((s) => s.status);
  const quest = useSessionStore((s) => s.quest);
  const currentExerciseIndex = useSessionStore((s) => s.currentExerciseIndex);
  const currentRoundIndex = useSessionStore((s) => s.currentRoundIndex);
  const bossFight = useSessionStore((s) => s.bossFight);
  const lastDamageResult = useSessionStore((s) => s.lastDamageResult);
  const completeExercise = useSessionStore((s) => s.completeExercise);
  const pauseSession = useSessionStore((s) => s.pauseSession);

  const { elapsedSeconds } = useSessionTimer();

  const [criticalHits, setCriticalHits] = useState<CriticalHitEvent[]>([]);
  const targetReachedRef = useRef(false);

  // Compute values locally
  const currentExercise = quest?.exercises[currentExerciseIndex] ?? null;
  const currentSet = currentRoundIndex + 1;
  const totalSets = quest?.rounds ?? 0;
  const totalExercises = quest?.exercises.length ?? 0;

  // Memoized computed values
  const isBossFight = useMemo(() => !!bossFight, [bossFight]);

  const title = useMemo(
    () =>
      currentExercise
        ? language === "fr"
          ? currentExercise.exercise.frName
          : currentExercise.exercise.enName
        : "",
    [language, currentExercise]
  );

  const imageSource = useMemo(
    () => (currentExercise ? resolveImageAsset(currentExercise.exercise.imagePath) : null),
    [currentExercise]
  );

  const isTimeBased = useMemo(
    () => currentExercise?.target.type === "time",
    [currentExercise?.target.type]
  );

  const heroTime = useMemo(() => {
    if (!isTimeBased) {
      return String(currentExercise?.target.value ?? 0);
    }

    // For time-based: show elapsed time (chrono counting up)
    return formatTime(elapsedSeconds);
  }, [isTimeBased, elapsedSeconds, currentExercise?.target.value]);

  const targetValue = currentExercise?.target.value ?? 0;

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
      setTimeout(() => {
        setCriticalHits((prev) => prev.filter((h) => h.id !== event.id));
      }, 1500);
    },
  });

  const { triggerCriticalHit, triggerComboMilestone, triggerRepCompleted } = useFeedbackEffects();
  const { success } = useHaptics();

  // Haptic feedback when target reached on time-based exercises
  useEffect(() => {
    if (!isTimeBased || !currentExercise) {
      targetReachedRef.current = false;
      return;
    }

    const target = currentExercise.target.value;

    if (elapsedSeconds >= target && !targetReachedRef.current && status === "running") {
      targetReachedRef.current = true;
      success();
    }

    if (elapsedSeconds < target) {
      targetReachedRef.current = false;
    }
  }, [elapsedSeconds, isTimeBased, status, success, currentExercise]);

  const handleComplete = useCallback(async () => {
    if (!currentExercise) return;

    recordRep();
    checkCritical(0, 0);
    triggerRepCompleted();

    // For time-based, record elapsed time; for reps, record target
    const resultValue = isTimeBased ? Math.max(1, elapsedSeconds) : currentExercise.target.value;
    await completeExercise(resultValue);

    const { status: newStatus } = useSessionStore.getState();
    if (newStatus === "finished") {
      resetCombo();
    }
  }, [
    currentExercise,
    recordRep,
    checkCritical,
    triggerRepCompleted,
    completeExercise,
    resetCombo,
    isTimeBased,
    elapsedSeconds,
  ]);

  const handleSkip = useCallback(() => {
    Alert.alert(t("session.skip_title"), t("session.skip_warning"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("session.skip_confirm"),
        style: "destructive",
        onPress: async () => {
          impact();
          await completeExercise(0);
        },
      },
    ]);
  }, [t, impact, completeExercise]);

  const handlePause = useCallback(() => {
    pauseSession();
  }, [pauseSession]);

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

  return (
    <YStack flex={1} bg="$bgDarker" pt={insets.top + 12} pb={insets.bottom + 16} px="$4">
      {/* Header: Compact Timer + Pause */}
      <XStack alignItems="center" justifyContent="space-between" mb="$3">
        <SessionTimer />

        <Button
          size="$3"
          circular
          chromeless
          onPress={handlePause}
          pressStyle={{ opacity: 0.6, scale: 0.94 }}
          accessibilityLabel={t("session.pause_accessibility", { defaultValue: "Pause" })}
          accessibilityRole="button"
        >
          <Text color="$text" fontSize={20} fontWeight="900">
            ⏸
          </Text>
        </Button>
      </XStack>

      {/* Boss HP Bar - Always show for boss fights */}
      {bossFight && (
        <YStack mb="$3">
          <BossHpBar
            currentHp={bossFight.currentHp}
            totalHp={bossFight.totalHp}
            bossName={t("boss.title")}
            lastDamage={
              lastDamageResult
                ? {
                    damage: lastDamageResult.damage,
                    isCritical: lastDamageResult.isCritical,
                    weaknessBonus: lastDamageResult.weaknessBonus,
                  }
                : null
            }
            showPhaseImage={false}
          />
        </YStack>
      )}

      {/* Progress - Compact badge style */}
      <XStack alignItems="center" justifyContent="center" mb="$3">
        <XStack
          bg="$glassBg"
          borderWidth={1}
          borderColor="$borderStrong"
          px="$3"
          py="$2"
          borderRadius="$3"
          gap="$2"
        >
          <Text
            fontSize={11}
            color="$textSecondary"
            fontWeight="800"
            textTransform="uppercase"
            letterSpacing={1.5}
            fontFamily="$heading"
          >
            {t("session.exercise")} {currentExerciseIndex + 1}/{totalExercises}
          </Text>
          <Text color="$primary" fontWeight="900">
            •
          </Text>
          <Text
            fontSize={11}
            color="$textSecondary"
            fontWeight="800"
            textTransform="uppercase"
            letterSpacing={1.5}
            fontFamily="$heading"
          >
            {t("common.set")} {currentSet}/{totalSets}
          </Text>
        </XStack>
      </XStack>

      {/* Main content - Optimized layout */}
      <YStack flex={1} justifyContent="center" gap="$3">
        {/* Exercise Image - Smaller, cleaner */}
        <YStack
          bg="$glassBg"
          borderWidth={1}
          borderColor="$primary"
          borderRadius="$5"
          overflow="hidden"
          shadowColor="$primaryGlow"
          shadowOpacity={0.3}
          shadowRadius={16}
        >
          <Image
            source={imageSource}
            style={{ width: "100%", height: 200 }}
            contentFit="contain"
            transition={120}
          />
        </YStack>

        {/* Exercise Name - Compact */}
        <Text
          fontSize={24}
          fontWeight="800"
          fontFamily="$heading"
          color="$text"
          textAlign="center"
          textTransform="uppercase"
          letterSpacing={1.5}
          numberOfLines={2}
        >
          {title}
        </Text>

        {/* Timer/Counter Hero - Prominent */}
        <YStack alignItems="center" gap="$1">
          <Text
            fontSize={isTimeBased ? 68 : 88}
            lineHeight={isTimeBased ? 72 : 92}
            fontWeight="900"
            fontFamily="$body"
            color={
              isTimeBased && elapsedSeconds >= targetValue
                ? "$success"
                : isBossFight
                  ? "$error"
                  : "$primary"
            }
          >
            {heroTime}
          </Text>
          <Text color="$textSecondary" fontSize={14} fontWeight="700">
            {isTimeBased
              ? elapsedSeconds >= targetValue
                ? `${t("session.target")} ✓`
                : `${t("session.target")}: ${targetValue}s`
              : t("session.reps")}
          </Text>
        </YStack>

        {/* Combo Meter - Positioned */}
        {combo.isActive && combo.current > 0 && <ComboMeter combo={combo} isVisible />}
      </YStack>

      {/* Bottom actions - Optimized spacing */}
      <YStack gap="$2.5">
        <Button
          size="$6"
          bg={isBossFight ? "$error" : "$primary"}
          color="$text"
          fontSize={18}
          fontWeight="900"
          onPress={handleComplete}
          pressStyle={{ opacity: 0.85, scale: 0.97 }}
          shadowColor={isBossFight ? "$error" : "$primaryGlow"}
          shadowOffset={{ width: 0, height: 8 }}
          shadowOpacity={0.6}
          shadowRadius={20}
          fontFamily="$heading"
        >
          {t("session.complete_set", { defaultValue: "Complete Set" })} ✓
        </Button>

        <Button
          size="$3"
          variant="outlined"
          borderColor="$borderStrong"
          color="$textSecondary"
          onPress={handleSkip}
          pressStyle={{ opacity: 0.6 }}
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
