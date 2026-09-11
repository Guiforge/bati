import { Image } from "expo-image";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, H1, H3, Progress, Text, XStack, YStack } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { Pause, SkipBack, SkipForward } from "@/components/icons";
import { getExerciseAsset } from "@/constants/assetMap";
import { PREP_SECONDS, switchesSides } from "@/constants/warmup";
import { type Exercise, listExercises, officialByName } from "@/db/exercises";
import { useCountdownCues } from "@/hooks/useCountdownCues";
import { useHaptics } from "@/hooks/useHaptics";
import { describeExercise } from "@/hooks/useSessionInstructions";
import { formatTime, useSessionTimer } from "@/hooks/useSessionTimer";
import { useSessionStore } from "@/stores/session";
import { useSettingsStore } from "@/stores/settings";
import { MovementDescription, PrepView } from "./PrepView";

/**
 * The dynamic warm-up, before the start screen (roadmap §14 H2).
 *
 * Every movement is two screens: the wait, which shows what the movement is before its clock
 * runs, then the movement itself. The wait is ten seconds or a tap on GO, whichever the hero chose
 * in Settings, and nothing advances by touch otherwise: a phone on the floor gets the whole
 * warm-up hands-free.
 *
 * Movements come from the seeded catalogue, so their names and art are already bilingual and on
 * disk — nothing here is a second kind of content. Nothing is journaled either: the hero's
 * volume, records and boss damage all start at the first real exercise.
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: one screen, two states read top-to-bottom
export function WarmupView() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const language = useSettingsStore((s) => s.language);
  const prepMode = useSettingsStore((s) => s.prepMode);
  const { selection, mediumImpact } = useHaptics();

  const warmupIndex = useSessionStore((s) => s.warmupIndex);
  // Built per quest at startSession — a squat day and a handstand day do not warm up the same.
  const warmupSequence = useSessionStore((s) => s.warmupSequence);
  const warmupPrep = useSessionStore((s) => s.warmupPrep);
  const timerStartTimestamp = useSessionStore((s) => s.timerStartTimestamp);
  const startWarmupMove = useSessionStore((s) => s.startWarmupMove);
  const nextWarmupStep = useSessionStore((s) => s.nextWarmupStep);
  const previousWarmupStep = useSessionStore((s) => s.previousWarmupStep);
  const skipWarmup = useSessionStore((s) => s.skipWarmup);
  const pauseSession = useSessionStore((s) => s.pauseSession);
  const { remainingSeconds, progress } = useSessionTimer();
  // Declared above the auto-advance effect below, the same way `RestView` does it: on the render
  // where a clock hits zero, this one runs first, so the "go" starts before the store resets the
  // timer under it. The same cue as a rest or a timed set, for the wait and the movement alike.
  useCountdownCues(remainingSeconds);

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

  // The clock runs out on its own, which keeps the sequence moving hands-free: a wait that ends
  // starts its movement, a movement that ends opens the next wait.
  //
  // `remainingSeconds` is the only dependency, and the store is read here rather than through the
  // selectors above, on purpose. The render where a movement becomes a wait still shows the
  // movement's zero, because `useSessionTimer` only reads the new timer in its own effect: with
  // `warmupPrep` in this list, that flip re-ran the effect on the stale zero and the wait was
  // skipped before it was ever shown. A clock reaching zero is the event; the rest is state.
  //
  // No clock means the wait is for GO, and a zero that is not a clock must never move anything.
  useEffect(() => {
    if (remainingSeconds > 0) return;
    const session = useSessionStore.getState();
    if (session.status !== "warmup" || session.timerStartTimestamp === null) return;
    if (session.warmupPrep) session.startWarmupMove();
    else session.nextWarmupStep();
  }, [remainingSeconds]);

  const step = warmupSequence[warmupIndex];

  // A warm-up with no step to show is a dead end: the screen renders nothing and no timer ever
  // fires to move it along, so the hero is stranded on black with their session still open.
  // It happened to every recovered warm-up, back when the sequence was not part of the snapshot.
  // Leaving for the start screen is the honest recovery: a warm-up is not journaled anyway.
  useEffect(() => {
    if (!step) skipWarmup();
  }, [step, skipWarmup]);

  // One-sided movements are fifteen seconds a side, and the swap is felt as well as read: the
  // phone is on the floor, and a line of text changing colour is not something anyone sees from
  // a lunge. No sound, deliberately: the beeps mean the same thing everywhere in a session.
  const sided = !warmupPrep && step !== undefined && switchesSides(step.exerciseName);
  const half = step ? Math.floor(step.seconds / 2) : 0;
  const previousRemaining = useRef(remainingSeconds);
  useEffect(() => {
    const previous = previousRemaining.current;
    previousRemaining.current = remainingSeconds;
    if (sided && previous > half && remainingSeconds <= half && remainingSeconds > 0) {
      mediumImpact();
    }
  }, [remainingSeconds, sided, half, mediumImpact]);

  if (!step) return null;

  // Seed rows only: since `0035` a hero can own a name too, and the warm-up prescribes the
  // seeded movement, and teaching someone their own half-written note would be worse than the
  // English fallback.
  const exercise = officialByName(catalogue, step.exerciseName);
  const instruction = exercise ? describeExercise(exercise, language) : null;
  const label = instruction?.name ?? step.exerciseName;
  const eachSide = switchesSides(step.exerciseName)
    ? t("session.each_side", { seconds: half })
    : null;
  const switched = sided && remainingSeconds <= half;

  // The whole warm-up still ahead, so "2 of 6" says how long it is rather than how many. The
  // waits count only when they run on a clock: a wait for GO lasts as long as the hero wants.
  const perWait = prepMode === "timer" ? PREP_SECONDS : 0;
  const later = warmupSequence
    .slice(warmupIndex + 1)
    .reduce((sum, next) => sum + next.seconds + perWait, 0);
  const left = Math.max(0, remainingSeconds) + (warmupPrep ? step.seconds : 0) + later;

  const isFirst = warmupIndex === 0;

  return (
    <YStack flex={1} bg="$background" pt={insets.top + 16} pb={insets.bottom + 16} px="$5" gap="$4">
      <XStack justify="space-between" items="center">
        <Text fontSize={13} fontWeight="700" color="$textSecondary" letterSpacing={1}>
          {t("session.warmup_title", "WARM-UP")}
        </Text>
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

      {warmupPrep ? (
        <YStack flex={1} justify="center">
          <PrepView
            kicker={t("session.prep_title", {
              current: warmupIndex + 1,
              total: warmupSequence.length,
            })}
            instruction={instruction}
            fallbackName={label}
            target={eachSide ?? `${step.seconds}s`}
            remainingSeconds={timerStartTimestamp === null ? null : remainingSeconds}
            onGo={() => {
              selection();
              startWarmupMove();
            }}
            goTestID="session-prep-go"
          />
        </YStack>
      ) : (
        <YStack flex={1} items="center" justify="center" gap="$4">
          {exercise ? (
            <Image
              source={getExerciseAsset(exercise.imagePath)}
              style={{ width: 180, height: 180, borderRadius: 16 }}
              contentFit="cover"
            />
          ) : null}

          <YStack items="center" gap="$1">
            <H3 color="$text" fontWeight="700" style={{ textAlign: "center" }}>
              {label}
            </H3>
            {eachSide ? (
              <Text
                testID="warmup-sides"
                fontSize={15}
                fontWeight="700"
                color={switched ? "$warning" : "$textSecondary"}
              >
                {switched ? t("session.switch_sides") : t("session.each_side", { seconds: half })}
              </Text>
            ) : null}
          </YStack>

          {/* Still here during the movement: the wait showed it, and a glance mid-movement is
              cheaper than a pause. */}
          {instruction?.description ? <MovementDescription text={instruction.description} /> : null}

          <H1 color="$primaryText" fontSize={64} fontWeight="700">
            {formatTime(Math.max(0, remainingSeconds))}
          </H1>

          <Progress value={Math.min(100, progress * 100)} width="100%" bg="$surface">
            <Progress.Indicator bg="$primary" />
          </Progress>
        </YStack>
      )}

      <XStack items="center" justify="center" gap="$5">
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

        <YStack items="center" minW={96}>
          <Text fontSize={13} color="$textSecondary">
            {t("session.warmup_step", {
              current: warmupIndex + 1,
              total: warmupSequence.length,
              defaultValue: `${warmupIndex + 1} of ${warmupSequence.length}`,
            })}
          </Text>
          <Text testID="warmup-left" fontSize={13} color="$textSecondary">
            {t("session.warmup_left", { time: formatTime(left) })}
          </Text>
        </YStack>

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

      {/* A control, and shaped like one: it used to be the smallest, dimmest text on the screen,
          which is how the hurried-lifter audit found it (2026-09-10). */}
      <AppButton
        testID="session-skip-warmup"
        variant="outline"
        onPress={() => {
          selection();
          skipWarmup();
        }}
        accessibilityRole="button"
      >
        {t("session.warmup_skip", "Skip warm-up")}
      </AppButton>
    </YStack>
  );
}
