import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, H1, H3, Progress, Text, YStack } from "tamagui";
import { getExerciseAsset } from "@/constants/assetMap";
import { WARMUP_SEQUENCE } from "@/constants/warmup";
import { type Exercise, listExercises } from "@/db/exercises";
import { useHaptics } from "@/hooks/useHaptics";
import { formatTime, useSessionTimer } from "@/hooks/useSessionTimer";
import { useSessionStore } from "@/stores/session";
import { useSettingsStore } from "@/stores/settings";

/**
 * The dynamic warm-up, before the countdown (roadmap §14 H2).
 *
 * Movements come from the seeded catalogue, so their names and art are already bilingual and on
 * disk — nothing here is a second kind of content. Nothing is journaled either: the hero's
 * volume, records and boss damage all start at the first real exercise.
 */
export function WarmupView() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const language = useSettingsStore((s) => s.language);
  const { selection } = useHaptics();

  const warmupIndex = useSessionStore((s) => s.warmupIndex);
  const nextWarmupStep = useSessionStore((s) => s.nextWarmupStep);
  const skipWarmup = useSessionStore((s) => s.skipWarmup);
  const { remainingSeconds, progress } = useSessionTimer();

  const [catalogue, setCatalogue] = useState<Exercise[]>([]);

  useEffect(() => {
    let cancelled = false;
    listExercises()
      .then((all) => {
        if (!cancelled) setCatalogue(all);
      })
      .catch(() => {
        // Labels fall back to the English constant; the warm-up still runs.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // The timer runs out on its own — advancing here keeps the sequence moving hands-free.
  useEffect(() => {
    if (remainingSeconds > 0) return;
    nextWarmupStep();
  }, [remainingSeconds, nextWarmupStep]);

  const step = WARMUP_SEQUENCE[warmupIndex];
  if (!step) return null;

  const exercise = catalogue.find((e) => e.enName === step.exerciseName);
  const label = exercise
    ? language === "fr"
      ? exercise.frName
      : exercise.enName
    : step.exerciseName;

  return (
    <YStack
      flex={1}
      bg="$background"
      pt={insets.top + 16}
      pb={insets.bottom + 16}
      px="$5"
      items="center"
      justify="center"
      gap="$4"
    >
      <Text fontSize={13} fontWeight="700" color="$textSecondary" letterSpacing={1}>
        {t("session.warmup_title", "WARM-UP")}
      </Text>

      {exercise ? (
        <Image
          source={getExerciseAsset(exercise.imagePath)}
          style={{ width: 180, height: 180, borderRadius: 16 }}
          contentFit="cover"
        />
      ) : null}

      <H3 color="$text" fontWeight="700" style={{ textAlign: "center" }}>
        {label}
      </H3>

      <H1 color="$primary" fontSize={64} fontWeight="700">
        {formatTime(Math.max(0, remainingSeconds))}
      </H1>

      <Progress value={Math.min(100, progress * 100)} width="100%" bg="$surface">
        <Progress.Indicator bg="$primary" />
      </Progress>

      <Text fontSize={13} color="$textSecondary">
        {t("session.warmup_step", {
          current: warmupIndex + 1,
          total: WARMUP_SEQUENCE.length,
          defaultValue: `${warmupIndex + 1} of ${WARMUP_SEQUENCE.length}`,
        })}
      </Text>

      <Button
        testID="session-skip-warmup"
        chromeless
        size="$3"
        onPress={() => {
          selection();
          skipWarmup();
        }}
        accessibilityRole="button"
      >
        <Text color="$textSecondary" fontSize={15}>
          {t("session.warmup_skip", "Skip warm-up")}
        </Text>
      </Button>
    </YStack>
  );
}
