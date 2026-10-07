import { Image } from "expo-image";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, useWindowDimensions } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, H1, Paragraph, Text, XStack, YStack } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { GameIcon } from "@/components/common/GameIcon";
import { Crosshair, Minus, Pause, Plus } from "@/components/icons";
import { ExercisePickerSheet } from "@/components/quests/ExercisePickerSheet";
import { SetAsideToggle } from "@/components/quests/SetAsideToggle";
import { slotCaption } from "@/components/quests/substitutionCaption";
import { getExerciseAsset, getExerciseThumb } from "@/constants/assetMap";
import { bossDisplayName } from "@/constants/bosses";
import { rankSwapCandidates, type SwapReason } from "@/constants/exerciseFilters";
import { fade, rawColors } from "@/constants/rawColors";
import { critChance } from "@/db/bossFights";
import { type Exercise, listExercises, pickableExercises } from "@/db/exercises";
import { isOutdoors, isOutingSession } from "@/db/expeditions";
import { preferences } from "@/db/preferences";
import { formatSlotTarget, TARGET_RANGE } from "@/db/targets";
import { useCountdownCues } from "@/hooks/useCountdownCues";
import { useHaptics } from "@/hooks/useHaptics";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useSessionInstructions } from "@/hooks/useSessionInstructions";
import { formatOvertime, formatTime, useSessionTimer } from "@/hooks/useSessionTimer";
import { useSetAside } from "@/hooks/useSetAside";
import { useSideSwitch } from "@/hooks/useSideSwitch";
import { localizedName, localizedTitle } from "@/src/i18n/localized";
import {
  perSideSet,
  SECOND_SIDE_GRACE_SECONDS,
  SIDE_SWITCH_SECONDS,
  sidePhase,
} from "@/src/perSide";

import { reportError } from "@/src/reportError";
import { useSessionStore } from "@/stores/session";
import { useSettingsStore } from "@/stores/settings";
import { BossArena } from "./BossArena";
import { getHpPercent, getPhaseFromHp, getPhaseLook } from "./bossPhase";
import { CountInput } from "./CountInput";
import { ExerciseHero } from "./ExerciseHero";
import { ExerciseInstructionsModal } from "./ExerciseInstructions";
import { ExpeditionPanel } from "./ExpeditionPanel";
import { GhostLine } from "./GhostLine";
import { LiveMap } from "./LiveMap";
import { SwitchGlow } from "./SwitchGlow";
import { sessionArtHeight } from "./sessionArt";
import { TimerBar } from "./TimerBar";

/** How long before the switch the first side says it is coming. */
const SIDE_SWITCH_WARNING_SECONDS = 5;

/**
 * A tap aimed at the previous screen's button (GO, "I'm ready") that arrives just after it
 * advanced on its own lands where Done now sits. Done ignores presses for this long after a new
 * exercise becomes active.
 */
const DONE_GUARD_MS = 700;

/** The seconds a hold counts for: one side's worth on a per-side hold (`src/perSide.ts`). */
function heldSeconds(
  elapsedSeconds: number,
  perSide: boolean,
  targetSeconds: number,
  firstSideSeconds: number | null,
): number {
  return perSide
    ? perSideSet(elapsedSeconds, targetSeconds, firstSideSeconds).seconds
    : elapsedSeconds;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Main workout session view with multiple UI states
export function ActiveExerciseView() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const language = useSettingsStore((s) => s.language);
  const { selection, heavyImpact } = useHaptics();
  const reducedMotion = useReducedMotion();

  const quest = useSessionStore((s) => s.quest);
  const currentRoundIndex = useSessionStore((s) => s.currentRoundIndex);
  const currentExerciseIndex = useSessionStore((s) => s.currentExerciseIndex);
  const completeExercise = useSessionStore((s) => s.completeExercise);
  const completeOuting = useSessionStore((s) => s.completeOuting);
  const skipExercise = useSessionStore((s) => s.skipExercise);
  const swapCurrentExercise = useSessionStore((s) => s.swapCurrentExercise);

  // Loaded when the session screen mounts, not when the sheet opens: the moment a hero reaches
  // for this is the moment they are stuck, and a spinner there is the worst possible time.
  // `listExercises()` is promise-cached, so this is free after the first read anywhere in the app.
  const [catalogue, setCatalogue] = useState<Exercise[]>([]);
  const [owned, setOwned] = useState<ReadonlySet<string> | null>(null);
  const [setAsideIds, setSetAsideIds] = useState<ReadonlySet<number>>(new Set());
  const [swapOpen, setSwapOpen] = useState(false);
  const [leaveOut, setLeaveOut] = useState(false);
  const { setAside } = useSetAside();

  useEffect(() => {
    let alive = true;
    Promise.all([
      listExercises(),
      preferences.getOwnedEquipment(),
      preferences.getSetAsideExercises(),
    ])
      .then(([all, equipment, aside]) => {
        if (!alive) return;
        setCatalogue(all);
        setOwned(equipment === null ? null : new Set(equipment));
        setSetAsideIds(new Set(aside.map((e) => e.id)));
      })
      .catch((e) => reportError("session.catalogue", e));
    return () => {
      alive = false;
    };
  }, []);
  const pauseSession = useSessionStore((s) => s.pauseSession);
  const resumeSession = useSessionStore((s) => s.resumeSession);
  const nextSide = useSessionStore((s) => s.nextSide);
  const firstSideSeconds = useSessionStore((s) => s.firstSideSeconds);
  const bossFight = useSessionStore((s) => s.bossFight);
  const lastDamageResult = useSessionStore((s) => s.lastDamageResult);

  // Get current exercise safely. Read here rather than below the early return, because the cues
  // need to know what kind of set this is before they are given a number to count down.
  const currentEx = quest?.exercises[currentExerciseIndex];
  /** An expedition measures ground rather than repetitions, and shows it. */
  const isOuting = isOutdoors(currentEx?.exercise.style);

  const { remainingSeconds, elapsedSeconds, isOvertime, progress } = useSessionTimer();
  // An outing has nothing to announce. Left on the real count, this fired three ticks and a "go"
  // from a phone in a pocket at the target mark, while the hero was a third of the way round the
  // lake. A counted set has no countdown either, and says so with null rather than the 0 its idle
  // clock reads: swapping a hold for a counted movement mid-set made that 0 sound like the hold's.
  useCountdownCues(isOuting || currentEx?.target.type !== "time" ? null : remainingSeconds);
  const targetValue = currentEx?.target.value ?? 0;
  // One side, a short switch, then the other (`0068`, `src/perSide.ts`): the store runs the
  // clock for all three, and the numeral counts down the phase in progress.
  const perSideHold = !isOuting && currentEx?.target.type === "time" && currentEx.exercise.perSide;
  // No clock yet reads as zero left, which is the second side: nothing to turn before it starts.
  const clockStarted = useSessionStore((s) => s.timerStartTimestamp !== null);
  // The second side matches the first: its target, or what the first side lasted when "Next side"
  // cut it short (`nextSide`), since past that the weaker side is all that counts.
  const secondSideSeconds = firstSideSeconds ?? targetValue;
  const side = perSideHold && clockStarted ? sidePhase(remainingSeconds, secondSideSeconds) : null;
  /** What the numeral counts down: the side in progress, not the whole clock. */
  const sideRemainingSeconds = side ? side.seconds : remainingSeconds;
  // The switch read as a timer: a 0:08 counting down where the second side's clock would be, under
  // "keep going, the clock runs past the target". The product owner tried it and could not tell
  // which side he was on. So it is announced before it comes, says what it is while it lasts, and
  // the second side is greeted when it starts (audit of 2026-10-07, option B).
  const inSwitch = side?.phase === "switch";
  const switchSoon = side?.phase === "first" && side.seconds <= SIDE_SWITCH_WARNING_SECONDS;
  const secondSideStarting =
    side?.phase === "second" && secondSideSeconds - side.seconds < SECOND_SIDE_GRACE_SECONDS;
  useSideSwitch(remainingSeconds, secondSideSeconds, SIDE_SWITCH_SECONDS, perSideHold);
  const [adjustedReps, setAdjustedReps] = useState(targetValue);
  // Counts ± taps, and keys the numeral's bounce. Keyed on the count itself, a typed "150"
  // remounted the field on its first digit and put the keyboard away.
  const [stepCount, setStepCount] = useState(0);
  const [showHowTo, setShowHowTo] = useState(false);
  // When this slot became active: `app/session.tsx` keys the view on the slot, so the mount is it.
  const shownAt = useRef(Date.now());
  // The same reader the paused screen uses, rather than a second derivation of "which movement
  // is this, drawn and described" built out of `currentEx` right here.
  const instruction = useSessionInstructions();

  if (!quest || !currentEx) return null;

  const isTimeBased = currentEx.target.type === "time";
  const ghost = currentEx.ghost;

  /**
   * What this set would log if the hero finished it now. The DB constraint is `resultValue > 0`,
   * which is where the floor comes from.
   *
   * One value, read by the button that writes it and by the line that compares it to the record:
   * two expressions would be two answers to "did that beat your best", and the one the hero sees
   * is the one that would be wrong.
   */
  const liveValue = Math.max(
    1,
    isTimeBased
      ? heldSeconds(elapsedSeconds, perSideHold, targetValue, firstSideSeconds)
      : adjustedReps,
  );

  const exerciseName = localizedName(currentEx.exercise, language);

  // Progress calculation
  const exercisesPerRound = quest.exercises.length;
  const totalSteps = exercisesPerRound * quest.rounds;
  const currentStep = currentRoundIndex * exercisesPerRound + currentExerciseIndex + 1;
  const progressPercent = (currentStep / totalSteps) * 100;

  // Reading the movement stops the clock, and closing starts it again. The pause was already the
  // one moment reading is free — it draws this same block — so a modal that answered "what is a
  // dead bug?" without stopping the timer charged the hero for not knowing. Paired here rather
  // than left to the paused screen's Resume: the hero asked to read, not to pause, so the way out
  // of reading has to be the way back into the set.
  //
  // The paused overlay renders underneath, invisible: two stacked `$bgOverlay` at 0.92 leave it
  // under a percent of a percent. Both calls are batched with the visibility flag, so no render
  // ever shows one without the other.
  const handleShowHowTo = () => {
    selection();
    pauseSession();
    setShowHowTo(true);
  };

  const handleCloseHowTo = () => {
    resumeSession();
    setShowHowTo(false);
  };

  const handleComplete = () => {
    // Heavy haptic feedback on exercise completion
    heavyImpact();

    // An outing has one way to end, and the view is not it.
    //
    // The store times a walk by its trace, the same rule the journal reads, because the stopwatch
    // on screen restarts at zero after the OS kills the app. The button here and the Finish
    // action on the notification therefore call the same thing: the notification has no view to
    // compute anything with, and two ways to end one walk would be two durations for it.
    //
    // Asked of the *session*, where the button below asks it of the slot. `completeOuting` is
    // deaf to anything but a walk under way, because a broadcast can outlive the session that
    // started it, so a walk slot inside a mixed quest keeps the ordinary path: the store has no
    // per-slot span to read off the trace, which is the shortcut `recordOf` already marks.
    if (isOutingSession(quest)) {
      completeOuting();
      return;
    }

    // Elapsed seconds for a hold, the adjusted value for reps: `liveValue` above, which is the
    // same number the ghost line has been comparing to the record.
    // A per-side hold says how many sides were worked: tapping Done in the switch is one.
    completeExercise(
      liveValue,
      perSideHold ? perSideSet(elapsedSeconds, targetValue, firstSideSeconds).sides : undefined,
    );
  };

  const handleDonePress = () => {
    if (Date.now() - shownAt.current < DONE_GUARD_MS) return;
    handleComplete();
  };

  const handleSkip = () => {
    selection();
    skipExercise();
  };

  // Ladder rungs first, then the same pattern, then the family — `rankSwapCandidates` already
  // encodes that order for the quest screen, and a hero stuck mid-set wants the easier rung at
  // the top of the list.
  // What the hero set aside is never offered back as a replacement.
  const swapCandidates = swapOpen
    ? rankSwapCandidates(pickableExercises(catalogue), currentEx.exercise, owned as never).filter(
        // After the ranking: a set-aside rung removed first would cut the ladder walk at the gap.
        (c) => !setAsideIds.has(c.exercise.id),
      )
    : [];
  const swapReasons = new Map(swapCandidates.map((c) => [c.exercise.id, c.reason] as const));

  const swapReasonLabel = (reason: SwapReason | null | undefined): string | null => {
    if (reason === "easier") return t("quests.swap_reason_easier", "An easier rung");
    if (reason === "harder") return t("quests.swap_reason_harder", "A harder rung");
    if (reason === "same_pattern") return t("quests.swap_reason_pattern", "Same movement");
    if (reason === "same_family") return t("quests.swap_reason_family", "Same family");
    return null;
  };

  const handleAdjustReps = (delta: number) => {
    selection();
    setStepCount((n) => n + 1);
    setAdjustedReps((prev) => Math.max(1, prev + delta));
  };

  // Calculate overtime seconds for display
  const overtimeSeconds = isOvertime ? Math.abs(remainingSeconds) : 0;

  // An outing has no overtime. Its target is a suggestion the hero is free to walk past, and the
  // moment they do is the moment they are furthest from the phone: the countdown is already
  // hidden, so a green CTA reading "Finish" a third of the way round the lake announces an end
  // to a walk nobody had finished, with nothing on screen left to explain it.
  const isPastTarget = isOvertime && !isOuting;

  // A fight owns the room's colour. Without this the fire dragon is fought on the "shoulders"
  // pastel, because both branches read the exercise's muscle. Derived from the same pure function
  // the arena uses on the same inputs, so the scrim and the screen it fades into cannot drift.
  const phaseLook = bossFight
    ? getPhaseLook(getPhaseFromHp(getHpPercent(bossFight.currentHp, bossFight.totalHp)))
    : null;
  /**
   * The room is dark, whatever the muscle.
   *
   * The screen used to take the exercise's own pastel as its ground, so a leg day painted the
   * lower half of the session khaki and an arm day pink. On a card that is a tint; across a whole
   * screen, in a dark-mode-only game whose anti-references rule out "flat white dashboards", it
   * is the one place the app stops looking like itself, and the audit's player said so of the
   * screen he spends ninety percent of his time on.
   *
   * The boss keeps its phase colour: a room that reddens as the monster enrages is the register
   * this game *does* want, and it is the arena's own doing rather than a property of the muscle
   * being trained.
   */
  const screenBg = phaseLook?.bgToken ?? "$bgDark";
  const screenBgRaw = phaseLook?.bgRaw ?? rawColors.bgDark;

  // The hero is the elastic part of the column: the counter and the CTA take their own height
  // and the picture gets everything left over, so nothing below it is ever clipped and a tall
  // screen shows more movement rather than more empty tint. This is only its floor.
  const heroMinHeight = Math.round(sessionArtHeight(width, height) * 0.6);
  const hero = (
    <ExerciseHero
      source={getExerciseAsset(currentEx.exercise.imagePath)}
      name={exerciseName}
      minHeight={heroMinHeight}
      fadeTo={screenBgRaw}
      topInset={insets.top}
      onPress={handleShowHowTo}
      accessibilityLabel={t("session.how_to_do_it")}
      // Turned from the switch on, so the hero sees how to set up the second side while getting
      // there, not once its clock is already running.
      mirrored={side !== null && side.phase !== "first"}
    />
  );
  const targetMuscle = currentEx.exercise.muscles[0];
  // A boss at 0 HP takes no damage (computeDamage returns 0), so nothing about crits or armour
  // is true any more, though the fight stays in the store until the session saves.
  const fightLive = !!bossFight && bossFight.currentHp > 0 && !bossFight.defeatedAt;

  /**
   * What this set is worth against this monster, in words.
   *
   * The screen already knew: a target ring on one muscle and a shield on another, at the top of
   * the arena, two unlabelled glyphs with nothing connecting them to the movement in progress.
   * So a hero holding a Wall Sit against a boss that resists legs was told "Keep going!" while
   * the set was quietly worth half. The rule is `db/bossFights.ts`'s, 1.5x on a weakness and
   * 0.5x on a resistance, and this says which one is happening now (audit 2026-09-10, blocker 6).
   */
  const setStanding =
    fightLive && targetMuscle && bossFight.weaknessMuscle === targetMuscle
      ? t("session.boss_weak_point", { muscle: t(`muscles.${targetMuscle}`) })
      : fightLive && targetMuscle && bossFight.resistanceMuscle === targetMuscle
        ? t("session.boss_resisted", { muscle: t(`muscles.${targetMuscle}`) })
        : null;

  return (
    <YStack
      flex={1}
      bg={screenBg}
      pb={insets.bottom + 16}
      transition={reducedMotion ? undefined : "quick"}
      enterStyle={reducedMotion ? undefined : { opacity: 0 }}
    >
      {/* The top of the screen is a picture, not a card — the same full-bleed slot either way. In
          a fight the arena owns it and the exercise rides on the arena's own scrim, so both images
          are on screen at once and the column is no taller than the hero branch. */}
      {bossFight ? (
        <BossArena
          currentHp={bossFight.currentHp}
          totalHp={bossFight.totalHp}
          bossImagePath={bossFight.imagePath}
          bossName={bossDisplayName(bossFight, language)}
          tier={bossFight.tier}
          shiny={bossFight.shiny}
          weaknessMuscle={bossFight.weaknessMuscle}
          resistanceMuscle={bossFight.resistanceMuscle}
          lastDamage={lastDamageResult}
        >
          {/* The exercise is still what you are doing — it just does it on the boss's ground.
              It used to shrink to a 52 px chip below the fold, so you could not see the movement
              you were performing. */}
          <XStack
            items="center"
            gap="$2"
            onPress={handleShowHowTo}
            pressStyle={{ opacity: 0.8 }}
            accessibilityRole="button"
            accessibilityLabel={t("session.how_to_do_it")}
          >
            <YStack
              width={36}
              height={36}
              rounded={18}
              overflow="hidden"
              borderWidth={1}
              borderColor="$borderStrong"
            >
              <Image
                source={getExerciseThumb(currentEx.exercise.imagePath)}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
                transition={150}
              />
            </YStack>
            <Text flex={1} fontWeight="700" fontSize={16} color="$text" numberOfLines={1}>
              {exerciseName}
            </Text>
            {!!targetMuscle && (
              <XStack items="center" gap="$1">
                <Crosshair size={12} color="$textSecondary" />
                <Text fontSize={12} color="$textSecondary">
                  {t(`muscles.${targetMuscle}`)}
                </Text>
              </XStack>
            )}
          </XStack>
        </BossArena>
      ) : isOuting ? (
        // The movement's picture until the sky gives a position, then the map in its place.
        <LiveMap minHeight={heroMinHeight} topInset={insets.top} placeholder={hero} />
      ) : (
        hero
      )}

      {/* The HUD: where you are, how far in, and the way out — one row floating over the art
          instead of the two-row header plus framed progress block plus its own label row that
          used to sit above the picture. Every value is the one that was already here; `ROUND`
          simply stopped being printed twice. */}
      <YStack position="absolute" t={insets.top + 8} l={0} r={0} px="$4" gap="$2" z={10}>
        <XStack items="center" justify="space-between" gap="$2">
          {/* 12px, not 13: "TOUR 1 / 3 · EXERCICE 2 / 5" is the long form and it has to survive
              a 320dp screen without ellipsing away the exercise counter.

              An outing has one round and one movement, so that long form collapses to two counts
              of one, and the percentage beside it measures a target the panel below already
              refuses to print, because on an outing the target is a suggestion. The quest's own
              name is the one thing the row can say that the hero does not already know. */}
          <Text
            color="$text"
            fontSize={12}
            fontWeight="700"
            numberOfLines={1}
            flex={1}
            // Its own contrast, so the scrim above it can stop covering the movement. Same trade
            // ExerciseHero's title makes one gradient down.
            textShadowColor={fade(rawColors.shadowColor, 0.9)}
            textShadowOffset={{ width: 0, height: 1 }}
            textShadowRadius={6}
          >
            {isOuting
              ? localizedTitle(quest, language)
              : `${t("session.round_label", {
                  count: currentRoundIndex + 1,
                  total: quest.rounds,
                })} · ${t("session.exercise_label", {
                  count: currentExerciseIndex + 1,
                  total: exercisesPerRound,
                })}`}
          </Text>
          <XStack items="center" gap="$2">
            {isOuting ? null : (
              <Text
                fontSize={12}
                fontWeight="700"
                color="$textSecondary"
                textShadowColor={fade(rawColors.shadowColor, 0.9)}
                textShadowOffset={{ width: 0, height: 1 }}
                textShadowRadius={6}
              >
                {Math.round(progressPercent)}%
              </Text>
            )}
            <Button
              testID="session-pause"
              size="$3"
              hitSlop={8}
              circular
              icon={<Pause size={20} color="$text" />}
              onPress={pauseSession}
              chromeless
              hoverStyle={{ bg: "$pastelBlue" }}
              pressStyle={{ opacity: 0.7 }}
              accessibilityLabel={t("session.pause_accessibility")}
              accessibilityRole="button"
            />
          </XStack>
        </XStack>

        {/* Overall progress as a hairline: the bar was already the subtle element, a frame around
            it was never doing any work.

            A quest of one step has no progress to draw: the bar is full from the first second to
            the last, which is a full bar that means nothing. That is every outing, and the few
            single-movement quests besides. */}
        {totalSteps > 1 ? (
          <YStack
            testID="session-progress-bar"
            height={3}
            rounded="$10"
            bg="$bgOverlay"
            overflow="hidden"
          >
            <YStack
              height={3}
              width={`${progressPercent}%`}
              bg="$text"
              opacity={0.55}
              transition={reducedMotion ? undefined : "bouncy"}
            />
          </YStack>
        ) : null}
      </YStack>

      {/* Content-sized on purpose — no flex. The hero above is the only elastic child, so this
          column's height is exactly what its children need and the CTA can never be pushed off
          screen. Give this flex back and Yoga splits the screen between it and the hero by grow
          factor instead of by content, which is how the CTA ended up below the fold.
          The boss branch is no exception: the arena grows (`flexGrow`, floored at its art cut), so
          the slack lands in the monster's painting, not as a void around the counter. */}
      <YStack px="$4" pt="$4" gap="$4">
        {/* An outing replaces the countdown entirely: what a hero wants at kilometre three is
            how far they have gone, not how much of a prescribed duration is left. The clock is
            still running underneath — `completeExercise` records the elapsed seconds either
            way — but it is not what the screen is about. */}
        {isOuting ? <ExpeditionPanel /> : null}

        {/* Within-exercise timer progress (only for time-based exercises) */}
        {isTimeBased && !isOuting && (
          <YStack gap="$2">
            {/* No label row: the numeral below is the same figure at 72px. */}
            <TimerBar
              value={progress}
              fill={isOvertime ? "$success" : inSwitch ? "$warning" : "$primary"}
              fillOpacity={isOvertime ? 0.9 : 1}
              bg="$surface2"
            />
          </YStack>
        )}

        {/* Main Content — its own height, no scroll. It used to be a centred ScrollView, and
          centring inside a ScrollView clips the *top* of anything taller than the viewport, so
          the counter lost its head instead of gaining a scrollbar. The hero above is the
          elastic sibling now; if this ever overflows again, it is the hero's floor to lower,
          not a scroll to bring back.
          ponytail: a 640dp screen on a boss fight (fixed-height arena) in overtime with a ghost
          line is the ceiling. Past it, drop the ghost line or shrink the numeral. */}
        <YStack justify="center">
          <YStack items="center" justify="center" gap="$2">
            {/* The exercise's name is on the artwork either way now — the hero paints it, and in a
              fight the arena carries it on its own scrim. Nothing repeats it here. */}
            <YStack items="center" gap="$2" width="100%">
              {/* The template named a harder movement and the hero is not on that rung yet
                (issue #33). Named here too: mid-session is where the substitution is felt, and
                a hero who thinks the app got it wrong is a hero who logs a lie. */}
              {slotCaption(t, currentEx, language) ? (
                <Text fontSize={12} color="$textSecondary" fontFamily="$body" text="center">
                  {slotCaption(t, currentEx, language)}
                </Text>
              ) : null}

              {/* The written half of "how do I do this?". The picture is the other half, and it
                  is why this opens a modal instead of unfolding text under the counter — the art
                  is already on screen but cropped into a hero, and an accordion could not show
                  it. Tapping the art itself does the same thing; this row is what makes that
                  discoverable. */}
              {/* Three links about the movement, on one row under its name.
                  "Replace" and "I couldn't do this one" used to sit one line above the
                  full-width Done button, in the landing zone of the thumb that hammers Done
                  between two sets: a mis-tap there swapped the exercise or wrote a failure. They
                  belong with "How to do it", which is the other thing a hero asks about the
                  movement rather than about the set, and the counter now stands between all
                  three and the button. */}
              <XStack items="center" justify="center" gap="$3" opacity={0.7} flexWrap="wrap">
                {instruction?.description ? (
                  <Pressable
                    testID="session-how-to"
                    onPress={handleShowHowTo}
                    hitSlop={12}
                    accessibilityRole="button"
                    accessibilityLabel={t("session.how_to_do_it")}
                  >
                    <Text py="$2" fontSize={12} fontWeight="700" color="$textSecondary">
                      {t("session.how_to_do_it")}
                    </Text>
                  </Pressable>
                ) : null}

                {/* The first side gave out before its target: go to the switch now instead of
                    waiting on a clock for a side that is over. Here with the other links, away
                    from Done, which would end the whole set and never offer the second side. */}
                {/* Mounted for the whole per-side set and live on the first side only: a link that
                    left at the switch would shorten this row and move the counter and Done. */}
                {perSideHold ? (
                  <XStack
                    items="center"
                    gap="$3"
                    opacity={side?.phase === "first" ? 1 : 0}
                    pointerEvents={side?.phase === "first" ? "auto" : "none"}
                    accessibilityElementsHidden={side?.phase !== "first"}
                    importantForAccessibility={
                      side?.phase === "first" ? "auto" : "no-hide-descendants"
                    }
                  >
                    <Text fontSize={12} color="$textSecondary" opacity={0.5}>
                      ·
                    </Text>
                    <Pressable
                      testID="session-next-side"
                      hitSlop={12}
                      disabled={side?.phase !== "first"}
                      onPress={() => {
                        selection();
                        nextSide();
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={t("session.next_side")}
                    >
                      <Text
                        py="$2"
                        fontSize={12}
                        fontWeight="700"
                        color="$textSecondary"
                        numberOfLines={1}
                      >
                        {t("session.next_side")}
                      </Text>
                    </Pressable>
                  </XStack>
                ) : null}

                {/* Not on an outing: a walk has no movement to swap and no set to fail. */}
                {isOuting ? null : (
                  <>
                    <Text fontSize={12} color="$textSecondary" opacity={0.5}>
                      ·
                    </Text>
                    <Pressable
                      testID="session-swap-exercise"
                      hitSlop={12}
                      onPress={() => {
                        selection();
                        setSwapOpen(true);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={t("quests.swap_exercise")}
                    >
                      <Text
                        py="$2"
                        fontSize={12}
                        fontWeight="700"
                        color="$textSecondary"
                        numberOfLines={1}
                      >
                        {t("session.swap_short", "Replace")}
                      </Text>
                    </Pressable>

                    <Text fontSize={12} color="$textSecondary" opacity={0.5}>
                      ·
                    </Text>
                    <Pressable
                      testID="session-skip-exercise"
                      hitSlop={12}
                      onPress={handleSkip}
                      accessibilityRole="button"
                      accessibilityLabel={t("session.skip_exercise")}
                    >
                      <Text
                        py="$2"
                        fontSize={12}
                        fontWeight="700"
                        color="$textSecondary"
                        numberOfLines={1}
                      >
                        {t("session.skip_exercise")}
                      </Text>
                    </Pressable>
                  </>
                )}
              </XStack>
            </YStack>

            {/* Big Counter — the loudest thing on the screen. The numerals set their own
              lineHeight: the heading default at this size leaves ~50dp of air between the
              figure and its unit label, which read as two separate things. so it needs no outline to be found,
              and on second thought no surface either. The border went first, then this: the box
              was `py="$6"` twice over, 64dp of padding wrapped around an 80px numeral that was
              never going to be missed, and those 64dp were the reason the counter overflowed its
              own scroll view and got clipped on a boss fight. The number now sits straight on the
              room's colour — the exercise's muscle tint, or the boss phase — which is what the
              screen was already painting behind the box.

              Overtime loses nothing by it: the flame pair, the "overtime" label and the green
              numeral all still say so, so the state was never carried by the border alone. The
              only surfaces left in here are the two ± buttons, which is right — they are objects
              you press, and the count is not. It is typed into, for the set that went forty past
              the target: an underline says so, not a surface.

              An outing has no counter at all. It is time-based underneath, so this used to show
              a 72px countdown that did not pause while the panel's own moving clock did, then
              turned green and said OVERTIME at the target mark, a verdict on a walk the hero
              was still halfway through. The panel above is the readout. */}
            {isOuting ? null : (
              <YStack width="100%" items="center" justify="center">
                {isTimeBased ? (
                  <YStack items="center" gap="$2">
                    {isOvertime ? (
                      <>
                        {/* Overtime display - counting UP */}
                        <XStack items="center" gap="$2">
                          <GameIcon name="flame" size={16} color="$success" />
                          <Text fontSize={14} fontWeight="700" color="$textSecondary">
                            {t("session.overtime")}
                          </Text>
                          <GameIcon name="flame" size={16} color="$success" />
                        </XStack>
                        <H1
                          fontSize={72}
                          lineHeight={80}
                          fontWeight="700"
                          fontFamily="$body"
                          fontVariant={["tabular-nums"]}
                          color="$success"
                        >
                          {formatOvertime(overtimeSeconds)}
                        </H1>
                        <Paragraph fontWeight="700" color="$textSecondary">
                          {t("session.target_reached")}
                        </Paragraph>
                      </>
                    ) : (
                      <>
                        {/* The switch takes the numeral's box, so nothing below moves: a word where
                            a timer was is what tells the hero no side is being timed. */}
                        {inSwitch ? (
                          <H1
                            testID="session-switch-title"
                            fontSize={44}
                            lineHeight={80}
                            fontWeight="700"
                            fontFamily="$body"
                            color="$warning"
                            numberOfLines={1}
                            adjustsFontSizeToFit
                          >
                            {t("session.switch_sides")}
                          </H1>
                        ) : (
                          // Normal countdown
                          <H1
                            fontSize={72}
                            lineHeight={80}
                            fontWeight="700"
                            fontFamily="$body"
                            fontVariant={["tabular-nums"]}
                            color="$text"
                          >
                            {formatTime(sideRemainingSeconds)}
                          </H1>
                        )}
                        {/* Not "Seconds". The number counts *down* to the target, and the hint
                            below it talks about carrying on past that target, so a caption that
                            only named the unit left the two readings of 0:24 (elapsed? left?)
                            equally available. The audit of 2026-09-10 read it as counting up. */}
                        {/* Not during the switch: its five seconds are not "left of 20 s per
                            side", and the line under the numeral already says what they are. */}
                        {/* The same component in every phase, so the line keeps its height. */}
                        {side?.phase === "switch" ? (
                          <Paragraph testID="session-side-two-in" fontWeight="700" color="$text">
                            {t("session.side_two_in", { seconds: side.seconds })}
                          </Paragraph>
                        ) : (
                          <Paragraph fontWeight="700" color="$textSecondary">
                            {t("session.seconds_left_of", {
                              target: formatSlotTarget(
                                {
                                  target: { ...currentEx.target, value: secondSideSeconds },
                                  exercise: currentEx.exercise,
                                },
                                language,
                              ),
                            })}
                          </Paragraph>
                        )}
                        {/* One line height whatever it says, and kept blank through the switch: the
                            art above is the elastic part of the screen, so a line that grows or
                            leaves makes the whole picture jump while the hero is changing sides. */}
                        {side && inSwitch ? (
                          <Text fontSize={20} lineHeight={28}>
                            {" "}
                          </Text>
                        ) : null}
                        {side && !inSwitch ? (
                          <Text
                            testID="session-side"
                            lineHeight={28}
                            // Bigger when it announces something: it is read from the floor.
                            fontSize={switchSoon || secondSideStarting ? 20 : 14}
                            fontWeight="700"
                            color={switchSoon || secondSideStarting ? "$warning" : "$text"}
                          >
                            {switchSoon
                              ? t("session.side_switch_soon")
                              : secondSideStarting
                                ? t("session.side_two_go")
                                : t("session.side_of", { side: side.phase === "first" ? 1 : 2 })}
                          </Text>
                        ) : null}
                      </>
                    )}
                  </YStack>
                ) : (
                  <YStack items="center" gap="$2">
                    <XStack items="center" gap="$4">
                      <Button
                        size="$4"
                        circular
                        bg="$surface2"
                        borderWidth={0}
                        onPress={() => handleAdjustReps(-1)}
                        pressStyle={{ opacity: 0.8, scale: 0.95 }}
                        disabled={adjustedReps <= 1}
                        opacity={adjustedReps <= 1 ? 0.4 : 1}
                        accessibilityLabel={t("session.decrease_reps_accessibility")}
                        accessibilityRole="button"
                      >
                        <Minus size={24} color="$text" strokeWidth={2.5} />
                      </Button>
                      <YStack
                        items="center"
                        key={reducedMotion ? undefined : stepCount}
                        transition={reducedMotion ? undefined : "bouncy"}
                        enterStyle={reducedMotion ? undefined : { scale: 1.15 }}
                        scale={1}
                      >
                        <CountInput
                          testID="session-reps-input"
                          value={adjustedReps}
                          onChange={setAdjustedReps}
                          max={TARGET_RANGE.max}
                          fontSize={80}
                          accessibilityLabel={t("session.reps_count_accessibility")}
                        />
                        <Paragraph fontWeight="700" color="$textSecondary">
                          {currentEx.exercise.perSide
                            ? t("session.reps_per_side")
                            : t("session.reps")}
                        </Paragraph>
                      </YStack>
                      <Button
                        size="$4"
                        circular
                        bg="$surface2"
                        borderWidth={0}
                        onPress={() => handleAdjustReps(1)}
                        pressStyle={{ opacity: 0.8, scale: 0.95 }}
                        accessibilityLabel={t("session.increase_reps_accessibility")}
                        accessibilityRole="button"
                      >
                        <Plus size={24} color="$text" strokeWidth={2.5} />
                      </Button>
                    </XStack>
                    {adjustedReps !== targetValue && (
                      <Text fontSize={12} color="$textSecondary">
                        {t("session.adjust_reps_hint")}
                      </Text>
                    )}
                    {/* In a fight the ± control *is* the decision, so say what it buys. Crit odds
                  scale with how far past the target you go, and nothing on screen has ever
                  admitted the rule exists. Outside a fight, intensity as reps-in-reserve rather
                  than "go to failure" — the safer and more teachable framing, and one the app can
                  give as a cue instead of collecting as data. */}
                    <Text fontSize={12} color="$textSecondary" style={{ textAlign: "center" }}>
                      {fightLive
                        ? t("session.crit_hint", {
                            percent: Math.round(critChance(adjustedReps, targetValue) * 100),
                          })
                        : t("session.reserve_hint")}
                    </Text>
                  </YStack>
                )}
              </YStack>
            )}

            {/* Hint for time-based exercises. In a fight the same overshoot rule applies to a
                hold as to a rep, and the seconds past the target are exactly the moment the hero
                is deciding about: the crit line replaces the generic one there. */}
            {/* Not during the switch: "the clock keeps running past the target" and the crit odds
                both say a side is being timed, and none is. On the first side the plain hint is
                wrong too (the clock does not run on past it), so it says what comes next. */}
            {isTimeBased && !isOuting && (
              <Text fontSize={12} color="$textSecondary" style={{ textAlign: "center" }}>
                {/* Kept, blank, during the switch: a line that leaves lets the art above grow
                    and the whole screen jumps under a hero who is mid-move. */}
                {inSwitch
                  ? " "
                  : side?.phase === "first" && !fightLive
                    ? t("session.side_switch_ahead", { seconds: SIDE_SWITCH_SECONDS })
                    : fightLive
                      ? t("session.crit_hint_time", {
                          percent: Math.round(
                            critChance(
                              heldSeconds(
                                elapsedSeconds,
                                perSideHold,
                                currentEx.target.value,
                                firstSideSeconds,
                              ),
                              currentEx.target.value,
                            ) * 100,
                          ),
                        })
                      : t("session.keep_going_hint")}
              </Text>
            )}

            {bossFight && !fightLive ? (
              <Text fontSize={12} color="$textSecondary" style={{ textAlign: "center" }}>
                {t("session.boss_down", { boss: bossDisplayName(bossFight, language) })}
              </Text>
            ) : null}

            {/* Which way this set lands, when the monster cares. One line, in the colour of what
                it does: braise for a weak point, ash for armour. */}
            {setStanding ? (
              <Text
                fontSize={12}
                fontWeight="700"
                color={
                  bossFight?.weaknessMuscle === targetMuscle ? "$primaryText" : "$textSecondary"
                }
                style={{ textAlign: "center" }}
              >
                {setStanding}
              </Text>
            ) : null}

            {/* What the hero already did on this movement, and the moment they pass it. Outside
                the reps/time ternary above so one line serves both units, and read straight off
                the quest — `getQuestById` put it there, so nothing is queried mid-workout and a
                recovered session keeps it.

                `liveValue` is what this set would log on the next tap, which is the whole reason
                the record can be announced here rather than on the victory screen.

                Not on an outing: `formatTarget` speaks the units of a prescribed set, so a walk
                got "last time 900s", a duration nobody set out to beat, under a panel that
                measures ground. */}
            {ghost && !isOuting ? (
              <GhostLine
                ghost={ghost}
                type={currentEx.target.type}
                live={liveValue}
                reducedMotion={reducedMotion}
              />
            ) : null}
          </YStack>
        </YStack>

        {/* Footer Action */}
        {isOuting ? (
          <OutingFinishButton onFinish={handleComplete} />
        ) : (
          <AppButton
            testID="session-complete-exercise"
            height={64}
            fontSize={24}
            backgroundColor={isPastTarget ? "$success" : undefined}
            onPress={handleDonePress}
            accessibilityLabel={
              isPastTarget
                ? t("session.finish_exercise_accessibility")
                : t("session.complete_exercise_accessibility")
            }
            accessibilityRole="button"
          >
            {isPastTarget ? t("session.complete_overtime") : t("session.complete_button")}
          </AppButton>
        )}
      </YStack>

      <ExerciseInstructionsModal
        instruction={instruction}
        visible={showHowTo}
        onClose={handleCloseHowTo}
      />

      <ExercisePickerSheet
        exercises={swapCandidates.map((c) => c.exercise)}
        pickedIds={[currentEx.exercise.id]}
        language={language}
        open={swapOpen}
        onOpenChange={(next) => {
          setSwapOpen(next);
          if (!next) setLeaveOut(false);
        }}
        title={t("quests.swap_exercise", "Replace this exercise")}
        header={
          <SetAsideToggle exercise={currentEx.exercise} checked={leaveOut} onToggle={setLeaveOut} />
        }
        onPick={(exercise) => {
          if (leaveOut) {
            const left = currentEx.exercise;
            // Offered again in this sheet when it is not set aside after all: the write failed,
            // or the toast's "Put back" undid it. The swap itself stands, it was a choice of its own.
            const offerAgain = () =>
              setSetAsideIds((prev) => new Set([...prev].filter((id) => id !== left.id)));
            setSetAsideIds((prev) => new Set([...prev, left.id]));
            setAside(left, offerAgain)
              .then((ok) => {
                if (!ok) offerAgain();
              })
              .catch(() => {
                // Reported by `useSetAside`, which never rejects.
              });
          }
          swapCurrentExercise(exercise);
          setSwapOpen(false);
          setLeaveOut(false);
        }}
        captionFor={(exercise) => swapReasonLabel(swapReasons.get(exercise.id))}
        bottomInset={insets.bottom}
        pickAction={null}
      />

      {/* Last, so it lies over everything, and touches nothing. */}
      <SwitchGlow visible={switchSoon} reducedMotion={reducedMotion} />
    </YStack>
  );
}

/** How long the hero holds before a walk is over. */
const HOLD_TO_FINISH_MS = 800;

/**
 * The name TalkBack announces in its actions menu, and the string the handler matches on. Custom
 * accessibility actions are matched by name, so the two have to be the same constant.
 */
const FINISH_ACTION = "finishOuting";

/**
 * How a walk ends: held, not tapped.
 *
 * The phone spends an outing in a pocket, against a leg, screen off but not locked on a device
 * with no secure lock, and the session screen no longer keeps it awake. A tap is what a pocket
 * produces by accident, and the accident here throws away the walk. So the button ends the outing
 * on a hold, and a tap only buzzes.
 *
 * A button that does nothing for 799 ms is indistinguishable from a broken one, so the hold is
 * drawn while it lasts: the finish colour fills the button left to right, and lands with the same
 * heavy haptic every completed set gets. Under reduced motion the fill jumps rather than travels,
 * which is what every other animation on this screen does.
 *
 * TalkBack is the reason there are two ways in. A long press is not reliable under a screen
 * reader, and the notification's own "Finish" action is a version away: without a second path a
 * hero reading the screen could only end a walk by throwing it away. A named accessibility action
 * costs three props and no extra state, which the alternative - a tap plus a confirmation, gated
 * on `AccessibilityInfo.isScreenReaderEnabled()` - does not.
 *
 * The label is the gesture. It said "Finish the outing", which reads as a tap, and a tap is the
 * one thing this button refuses: heroes pressed it, felt a buzz and decided it was broken. Now it
 * says "Hold to finish", and the name TalkBack offers in its actions menu keeps the plain verb,
 * because there the action is chosen rather than held.
 */
function OutingFinishButton({ onFinish }: { onFinish: () => void }) {
  const { t } = useTranslation();
  const { selection } = useHaptics();
  const reducedMotion = useReducedMotion();

  const fill = useSharedValue(0);
  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));

  const label = t("session.expedition_finish");

  return (
    <Pressable
      testID="session-complete-exercise"
      // The fill travels even under reduced motion, and takes exactly as long either way.
      //
      // It is not decoration: it is the only thing that says the thumb is being counted, and a
      // button that does nothing for 799 ms is indistinguishable from a broken one. Jumping
      // straight to full on press was worse than nothing, painting the button in the colour that
      // means "done" everywhere else on this screen, at the moment nothing had been done.
      //
      // Reduced motion asks for no travel that carries no information. This one carries the only
      // information there is, so what it drops instead is the springy retreat: releasing puts it
      // back at once rather than gliding.
      onPressIn={() => {
        fill.value = withTiming(1, { duration: HOLD_TO_FINISH_MS });
      }}
      onPressOut={() => {
        fill.value = reducedMotion ? 0 : withTiming(0, { duration: 150 });
      }}
      // A tap is the wrong gesture, not a failed one: it answers, and the fill it starts is the
      // lesson. Nothing is written.
      onPress={() => selection()}
      onLongPress={onFinish}
      delayLongPress={HOLD_TO_FINISH_MS}
      accessibilityRole="button"
      accessibilityLabel={t("session.expedition_hold_to_finish_a11y")}
      accessibilityActions={[{ name: FINISH_ACTION, label }]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === FINISH_ACTION) onFinish();
      }}
    >
      <YStack
        height={64}
        rounded="$3"
        bg="$primary"
        overflow="hidden"
        items="center"
        justify="center"
      >
        <Animated.View
          style={[{ position: "absolute", left: 0, top: 0, bottom: 0 }, fillStyle]}
          pointerEvents="none"
        >
          <YStack flex={1} bg="$success" />
        </Animated.View>
        {/* 20 and not 24: "Maintiens pour terminer" is the long form, and it has to hold one
            line on a 320dp screen. */}
        {/* On an ink plate: the sweep crosses the label, braise then green, and no single label
            colour clears AA on both (bone on green is 1.95:1). Ink under bone reads on either. */}
        <YStack bg="$bgDark" rounded="$4" px="$3" py="$1">
          <Text
            color="$text"
            fontFamily="$heading"
            fontSize={20}
            fontWeight="700"
            numberOfLines={1}
          >
            {t("session.expedition_hold_to_finish")}
          </Text>
        </YStack>
      </YStack>
    </Pressable>
  );
}
