import { Pause, SkipBack, SkipForward } from "@tamagui/lucide-icons";
import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, H1, H3, Progress, Text, XStack, YStack } from "tamagui";
import { getExerciseAsset, getExerciseThumb } from "@/constants/assetMap";
import { type Exercise, listExercises, officialByName } from "@/db/exercises";
import { useHaptics } from "@/hooks/useHaptics";
import { formatTime, useSessionTimer } from "@/hooks/useSessionTimer";
import { localizedName } from "@/src/i18n/localized";
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
  // Built per quest at startSession — a squat day and a handstand day do not warm up the same.
  const warmupSequence = useSessionStore((s) => s.warmupSequence);
  const nextWarmupStep = useSessionStore((s) => s.nextWarmupStep);
  const previousWarmupStep = useSessionStore((s) => s.previousWarmupStep);
  const skipWarmup = useSessionStore((s) => s.skipWarmup);
  const pauseSession = useSessionStore((s) => s.pauseSession);
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

  const step = warmupSequence[warmupIndex];

  // A warm-up with no step to show is a dead end: the screen renders nothing and no timer ever
  // fires to move it along, so the hero is stranded on black with their session still open.
  // It happened to every recovered warm-up, back when the sequence was not part of the snapshot.
  // Leaving for the countdown is the honest recovery — a warm-up is not journaled anyway.
  useEffect(() => {
    if (!step) skipWarmup();
  }, [step, skipWarmup]);

  if (!step) return null;

  const nameOf = (enName: string) => {
    // Seed rows only: since `0035` a hero can own a name too, and the warm-up prescribes the
    // seeded movement — teaching someone their own half-written note would be worse than the
    // English fallback.
    const found = officialByName(catalogue, enName);
    if (!found) return enName;
    return localizedName(found, language);
  };

  const exercise = officialByName(catalogue, step.exerciseName);
  const label = nameOf(step.exerciseName);
  const description = exercise
    ? language === "fr"
      ? exercise.frDescription
      : exercise.enDescription
    : undefined;

  const nextStep = warmupSequence[warmupIndex + 1];
  const nextExercise = nextStep ? officialByName(catalogue, nextStep.exerciseName) : undefined;

  const isFirst = warmupIndex === 0;

  return (
    <YStack flex={1} bg="$background" pt={insets.top + 16} pb={insets.bottom + 16} px="$5" gap="$4">
      <XStack justify="flex-end">
        <Button
          testID="session-pause"
          size="$3"
          hitSlop={8}
          circular
          icon={<Pause size={20} color="$text" />}
          onPress={pauseSession}
          chromeless
          pressStyle={{ opacity: 0.7 }}
          accessibilityLabel={t("session.pause_accessibility")}
          accessibilityRole="button"
        />
      </XStack>

      <YStack flex={1} items="center" justify="center" gap="$4">
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

        {/* Not truncated, and scrolling rather than growing: this column's siblings are
          fixed-height and RN's flexShrink is 0, so a long movement would otherwise push the
          timer off the bottom edge. Three lines was the old cap, and it cut the one screen
          whose job is teaching a movement off mid-sentence. */}
        {description ? (
          <ScrollView style={{ maxHeight: 120 }} showsVerticalScrollIndicator={false}>
            <Text
              fontSize={14}
              color="$textSecondary"
              lineHeight={20}
              style={{ textAlign: "center" }}
            >
              {description}
            </Text>
          </ScrollView>
        ) : null}

        <H1 color="$primaryText" fontSize={64} fontWeight="700">
          {formatTime(Math.max(0, remainingSeconds))}
        </H1>

        <Progress value={Math.min(100, progress * 100)} width="100%" bg="$surface">
          <Progress.Indicator bg="$primary" />
        </Progress>

        <XStack items="center" gap="$5">
          <Button
            testID="session-warmup-prev"
            size="$4"
            circular
            icon={<SkipBack size={20} color="$text" />}
            disabled={isFirst}
            opacity={isFirst ? 0.35 : 1}
            bg="$surface"
            borderWidth={1}
            borderColor="$borderStrong"
            pressStyle={{ opacity: 0.7 }}
            onPress={() => {
              selection();
              previousWarmupStep();
            }}
            accessibilityLabel={t("session.warmup_prev_accessibility")}
            accessibilityRole="button"
          />

          <Text fontSize={13} color="$textSecondary">
            {t("session.warmup_step", {
              current: warmupIndex + 1,
              total: warmupSequence.length,
              defaultValue: `${warmupIndex + 1} of ${warmupSequence.length}`,
            })}
          </Text>

          <Button
            testID="session-warmup-next"
            size="$4"
            circular
            icon={<SkipForward size={20} color="$text" />}
            bg="$surface"
            borderWidth={1}
            borderColor="$borderStrong"
            pressStyle={{ opacity: 0.7 }}
            onPress={() => {
              selection();
              nextWarmupStep();
            }}
            accessibilityLabel={t("session.warmup_next_accessibility")}
            accessibilityRole="button"
          />
        </XStack>
      </YStack>

      {nextStep ? (
        <XStack
          bg="$surface"
          p="$3"
          rounded="$6"
          borderWidth={1}
          borderColor="$borderStrong"
          gap="$3"
          items="center"
        >
          <YStack
            width={50}
            height={50}
            bg="$surface2"
            rounded="$3"
            overflow="hidden"
            borderWidth={1}
            borderColor="$borderStrong"
          >
            {nextExercise ? (
              <Image
                source={getExerciseThumb(nextExercise.imagePath)}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
                transition={150}
              />
            ) : null}
          </YStack>
          <YStack flex={1}>
            <Text color="$textSecondary" fontSize={12} fontWeight="700">
              {t("session.up_next")}
            </Text>
            <Text fontWeight="700" fontSize={16} numberOfLines={1} color="$text">
              {nameOf(nextStep.exerciseName)}
            </Text>
          </YStack>
          <Text color="$textSecondary" fontSize={13}>
            {nextStep.seconds}s
          </Text>
        </XStack>
      ) : null}

      <Button
        testID="session-skip-warmup"
        chromeless
        size="$3"
        hitSlop={8}
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
