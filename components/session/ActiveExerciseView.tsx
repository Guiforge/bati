import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, H1, Paragraph, Progress, Text, XStack, YStack } from "tamagui";
import { GameIcon } from "@/components/common/GameIcon";
import { Crosshair, Pause } from "@/components/icons";
import { ExercisePickerSheet } from "@/components/quests/ExercisePickerSheet";
import { getExerciseAsset, getExerciseThumb } from "@/constants/assetMap";
import { bossDisplayName } from "@/constants/bosses";
import {
  getExerciseBgForSessionStep,
  getExerciseBgRawForSessionStep,
} from "@/constants/exerciseColors";
import { rankSwapCandidates, type SwapReason } from "@/constants/exerciseFilters";
import { critChance } from "@/db/bossFights";
import { type Exercise, listExercises, pickableExercises } from "@/db/exercises";
import { preferences } from "@/db/preferences";
import { formatTarget } from "@/db/targets";
import { useHaptics } from "@/hooks/useHaptics";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useSessionInstructions } from "@/hooks/useSessionInstructions";
import { formatOvertime, formatTime, useSessionTimer } from "@/hooks/useSessionTimer";
import { localizedName } from "@/src/i18n/localized";
import { reportError } from "@/src/reportError";
import { useSessionStore } from "@/stores/session";
import { useSettingsStore } from "@/stores/settings";
import { BossArena } from "./BossArena";
import { getHpPercent, getPhaseFromHp, getPhaseLook } from "./bossPhase";
import { ExerciseHero } from "./ExerciseHero";
import { ExerciseInstructionsModal } from "./ExerciseInstructions";
import { sessionArtHeight } from "./sessionArt";

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
  const skipExercise = useSessionStore((s) => s.skipExercise);
  const swapCurrentExercise = useSessionStore((s) => s.swapCurrentExercise);

  // Loaded when the session screen mounts, not when the sheet opens: the moment a hero reaches
  // for this is the moment they are stuck, and a spinner there is the worst possible time.
  // `listExercises()` is promise-cached, so this is free after the first read anywhere in the app.
  const [catalogue, setCatalogue] = useState<Exercise[]>([]);
  const [owned, setOwned] = useState<ReadonlySet<string> | null>(null);
  const [swapOpen, setSwapOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([listExercises(), preferences.getOwnedEquipment()])
      .then(([all, equipment]) => {
        if (!alive) return;
        setCatalogue(all);
        setOwned(equipment === null ? null : new Set(equipment));
      })
      .catch((e) => reportError("session.catalogue", e));
    return () => {
      alive = false;
    };
  }, []);
  const pauseSession = useSessionStore((s) => s.pauseSession);
  const bossFight = useSessionStore((s) => s.bossFight);
  const lastDamageResult = useSessionStore((s) => s.lastDamageResult);

  const { remainingSeconds, elapsedSeconds, isOvertime, progress } = useSessionTimer();

  // Get current exercise safely
  const currentEx = quest?.exercises[currentExerciseIndex];
  const targetValue = currentEx?.target.value ?? 0;
  const [adjustedReps, setAdjustedReps] = useState(targetValue);
  const [showHowTo, setShowHowTo] = useState(false);
  // The same reader the paused screen uses, rather than a second derivation of "which movement
  // is this, drawn and described" built out of `currentEx` right here.
  const instruction = useSessionInstructions();

  if (!quest || !currentEx) return null;

  const isTimeBased = currentEx.target.type === "time";
  const ghost = currentEx.ghost;

  const exerciseName = localizedName(currentEx.exercise, language);

  // Progress calculation
  const exercisesPerRound = quest.exercises.length;
  const totalSteps = exercisesPerRound * quest.rounds;
  const currentStep = currentRoundIndex * exercisesPerRound + currentExerciseIndex + 1;
  const progressPercent = (currentStep / totalSteps) * 100;

  const handleShowHowTo = () => {
    selection();
    setShowHowTo(true);
  };

  const handleComplete = () => {
    // Heavy haptic feedback on exercise completion
    heavyImpact();

    // For time-based exercises, record actual elapsed time
    // For rep-based, record the adjusted value
    if (isTimeBased) {
      // DB constraints require resultValue > 0.
      completeExercise(Math.max(1, elapsedSeconds));
    } else {
      completeExercise(Math.max(1, adjustedReps));
    }
  };

  const handleSkip = () => {
    selection();
    skipExercise();
  };

  // Ladder rungs first, then the same pattern, then the family — `rankSwapCandidates` already
  // encodes that order for the quest screen, and a hero stuck mid-set wants the easier rung at
  // the top of the list.
  const swapCandidates = swapOpen
    ? rankSwapCandidates(pickableExercises(catalogue), currentEx.exercise, owned as never)
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
    setAdjustedReps((prev) => Math.max(1, prev + delta));
  };

  // Calculate overtime seconds for display
  const overtimeSeconds = isOvertime ? Math.abs(remainingSeconds) : 0;

  // A fight owns the room's colour. Without this the fire dragon is fought on the "shoulders"
  // pastel, because both branches read the exercise's muscle. Derived from the same pure function
  // the arena uses on the same inputs, so the scrim and the screen it fades into cannot drift.
  const phaseLook = bossFight
    ? getPhaseLook(getPhaseFromHp(getHpPercent(bossFight.currentHp, bossFight.totalHp)))
    : null;
  const screenBg =
    phaseLook?.bgToken ??
    getExerciseBgForSessionStep({
      exercise: currentEx.exercise,
      targetType: currentEx.target.type,
    });
  const screenBgRaw =
    phaseLook?.bgRaw ??
    getExerciseBgRawForSessionStep({
      exercise: currentEx.exercise,
      targetType: currentEx.target.type,
    });

  // The hero is the elastic part of the column: the counter and the CTA take their own height
  // and the picture gets everything left over, so nothing below it is ever clipped and a tall
  // screen shows more movement rather than more empty tint. This is only its floor.
  const heroMinHeight = Math.round(sessionArtHeight(width, height) * 0.6);
  const targetMuscle = currentEx.exercise.muscles[0];

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
      ) : (
        <ExerciseHero
          source={getExerciseAsset(currentEx.exercise.imagePath)}
          name={exerciseName}
          minHeight={heroMinHeight}
          fadeTo={screenBgRaw}
          topInset={insets.top}
          onPress={handleShowHowTo}
          accessibilityLabel={t("session.how_to_do_it")}
        />
      )}

      {/* The HUD: where you are, how far in, and the way out — one row floating over the art
          instead of the two-row header plus framed progress block plus its own label row that
          used to sit above the picture. Every value is the one that was already here; `ROUND`
          simply stopped being printed twice. */}
      <YStack position="absolute" t={insets.top + 8} l={0} r={0} px="$4" gap="$2" z={10}>
        <XStack items="center" justify="space-between" gap="$2">
          {/* 12px, not 13: "MANCHE 1 / 3 · EXERCICE 2 / 5" is the long form and it has to survive
              a 320dp screen without ellipsing away the exercise counter. */}
          <Text
            color="$text"
            fontSize={12}
            fontWeight="700"
            numberOfLines={1}
            flex={1}
            // Its own contrast, so the scrim above it can stop covering the movement. Same trade
            // ExerciseHero's title makes one gradient down.
            textShadowColor="rgba(6, 8, 18, 0.9)"
            textShadowOffset={{ width: 0, height: 1 }}
            textShadowRadius={6}
          >
            {t("session.round_label", {
              count: currentRoundIndex + 1,
              total: quest.rounds,
            })}
            {" · "}
            {t("session.exercise_label", {
              count: currentExerciseIndex + 1,
              total: exercisesPerRound,
            })}
          </Text>
          <XStack items="center" gap="$2">
            <Text
              fontSize={12}
              fontWeight="700"
              color="$textSecondary"
              textShadowColor="rgba(6, 8, 18, 0.9)"
              textShadowOffset={{ width: 0, height: 1 }}
              textShadowRadius={6}
            >
              {Math.round(progressPercent)}%
            </Text>
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
            it was never doing any work. */}
        <YStack height={3} rounded="$10" bg="$bgOverlay" overflow="hidden">
          <YStack
            height={3}
            width={`${progressPercent}%`}
            bg="$text"
            opacity={0.55}
            transition={reducedMotion ? undefined : "bouncy"}
          />
        </YStack>
      </YStack>

      {/* Content-sized on purpose — no flex. The hero above is the only elastic child, so this
          column's height is exactly what its children need and the CTA can never be pushed off
          screen. Give this flex back and Yoga splits the screen between it and the hero by grow
          factor instead of by content, which is how the CTA ended up below the fold.
          The boss branch is the exception: the arena is fixed-height, so with nothing elastic
          above, this column grows instead — the counter wrapper below carries the same grow, so
          the slack lands around the counter and the CTA stays on the bottom edge. */}
      <YStack px="$4" pt="$4" gap="$4" style={bossFight ? { flexGrow: 1 } : undefined}>
        {/* Within-exercise timer progress (only for time-based exercises) */}
        {isTimeBased && (
          <YStack gap="$2">
            {/* No label row: the numeral below is the same figure at 72px. */}
            <Progress
              value={Math.min(1, Math.max(0, progress)) * 100}
              size="$4"
              bg="$surface2"
              borderWidth={0}
              rounded="$6"
            >
              <Progress.Indicator
                transition="quick"
                bg={isOvertime ? "$success" : "$primary"}
                opacity={isOvertime ? 0.9 : 1}
              />
            </Progress>
          </YStack>
        )}

        {/* Main Content — its own height, no scroll. It used to be a centred ScrollView, and
          centring inside a ScrollView clips the *top* of anything taller than the viewport, so
          the counter lost its head instead of gaining a scrollbar. The hero above is the
          elastic sibling now; if this ever overflows again, it is the hero's floor to lower,
          not a scroll to bring back.
          ponytail: a 640dp screen on a boss fight (fixed-height arena) in overtime with a ghost
          line is the ceiling. Past it, drop the ghost line or shrink the numeral. */}
        <YStack justify="center" style={bossFight ? { flexGrow: 1 } : undefined}>
          <YStack items="center" justify="center" gap="$2">
            {/* The exercise's name is on the artwork either way now — the hero paints it, and in a
              fight the arena carries it on its own scrim. Nothing repeats it here. */}
            <YStack items="center" gap="$2" width="100%">
              {/* The template named a harder movement and the hero is not on that rung yet
                (issue #33). Named here too: mid-session is where the substitution is felt, and
                a hero who thinks the app got it wrong is a hero who logs a lie. */}
              {currentEx.substitutedFor ? (
                <Text fontSize={12} color="$textSecondary" fontFamily="$body" text="center">
                  {t("quests.served_easier_rung", {
                    name: localizedName(currentEx.substitutedFor, language),
                    defaultValue: `Working up to ${localizedName(currentEx.substitutedFor, language)}`,
                  })}
                </Text>
              ) : null}

              {/* The written half of "how do I do this?". The picture is the other half, and it
                  is why this opens a modal instead of unfolding text under the counter — the art
                  is already on screen but cropped into a hero, and an accordion could not show
                  it. Tapping the art itself does the same thing; this row is what makes that
                  discoverable. */}
              {instruction?.description ? (
                <Pressable
                  testID="session-how-to"
                  onPress={handleShowHowTo}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel={t("session.how_to_do_it")}
                >
                  <XStack
                    items="center"
                    justify="center"
                    gap="$2"
                    py="$2"
                    opacity={0.7}
                    hoverStyle={{ opacity: 1 }}
                  >
                    <Text fontSize={12} fontWeight="700" color="$textSecondary">
                      {t("session.how_to_do_it")}
                    </Text>
                  </XStack>
                </Pressable>
              ) : null}
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
              you press, and the count is not. */}
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
                      {/* Normal countdown */}
                      <H1
                        fontSize={72}
                        lineHeight={80}
                        fontWeight="700"
                        fontFamily="$body"
                        color="$text"
                      >
                        {formatTime(remainingSeconds)}
                      </H1>
                      <Paragraph fontWeight="700" color="$textSecondary">
                        {t("session.seconds")}
                      </Paragraph>
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
                      <Text fontSize={24} fontWeight="700" color="$text">
                        −
                      </Text>
                    </Button>
                    <YStack
                      items="center"
                      key={reducedMotion ? undefined : adjustedReps}
                      transition={reducedMotion ? undefined : "bouncy"}
                      enterStyle={reducedMotion ? undefined : { scale: 1.15 }}
                      scale={1}
                    >
                      <H1
                        fontSize={80}
                        lineHeight={88}
                        fontWeight="700"
                        fontFamily="$body"
                        color="$text"
                      >
                        {adjustedReps}
                      </H1>
                      <Paragraph fontWeight="700" color="$textSecondary">
                        {t("session.reps")}
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
                      <Text fontSize={24} fontWeight="700" color="$text">
                        +
                      </Text>
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
                    {bossFight
                      ? t("session.crit_hint", {
                          percent: Math.round(critChance(adjustedReps, targetValue) * 100),
                        })
                      : t("session.reserve_hint")}
                  </Text>
                </YStack>
              )}
            </YStack>

            {/* Hint for time-based exercises */}
            {isTimeBased && !isOvertime && (
              <Text fontSize={12} color="$textSecondary" style={{ textAlign: "center" }}>
                {t("session.keep_going_hint")}
              </Text>
            )}

            {/* What the hero already did on this movement. Outside the reps/time ternary above so
                one line serves both units, and read straight off the quest — `getQuestById` put it
                there, so nothing is queried mid-workout and a recovered session keeps it.
                Two phrasings: on a first-ever session `last` and `best` are the same number, and
                "last time 12 · best 12" reads like a bug. */}
            {/* The word and the number no longer weigh the same. This used to be one flat grey
                sentence at 12px, so "La dernière fois 12 · record 15" asked the hero to read a
                line to find two figures — mid-set, which is the one moment reading is expensive.
                The labels stay quiet; the numbers step up a size and take the full text colour,
                and the best takes the gold this app already spends on progression everywhere
                else. Gold is never the only signal: the word "record" is right beside it.

                Composed rather than interpolated, which is also why the two phrasings collapsed
                into one. On a first-ever session `last` and `best` are the same number and
                "last time 12 · best 12" reads like a bug — so the best half simply does not
                render, instead of a second sentence existing to say the same thing. */}
            {ghost ? (
              <XStack items="baseline" justify="center" gap="$2" flexWrap="wrap">
                <Text fontSize={12} color="$textSecondary">
                  {t("session.ghost_last_label", "Last time")}
                </Text>
                <Text fontSize={15} fontWeight="700" color="$text">
                  {formatTarget({ type: currentEx.target.type, value: ghost.last })}
                </Text>
                {ghost.best > ghost.last ? (
                  <>
                    <Text fontSize={12} color="$textSecondary" opacity={0.5}>
                      ·
                    </Text>
                    <Text fontSize={12} color="$textSecondary">
                      {t("session.ghost_best_label", "best")}
                    </Text>
                    <Text fontSize={15} fontWeight="700" color="$resourceGold">
                      {formatTarget({ type: currentEx.target.type, value: ghost.best })}
                    </Text>
                  </>
                ) : null}
              </XStack>
            ) : null}
          </YStack>
        </YStack>

        {/* One decision at two intensities — "I cannot do this set as prescribed" — so one row.
          Out of reach is not always "I cannot": often it is "not this variation", and the sheet
          the quest screen has always had is reachable at the moment it is actually needed. The
          other is the honest way past a movement, deliberately quiet next to the primary action;
          it is a release valve, not a choice being offered. Before it existed, `CHECK
          (resultValue > 0)` made "1" the only way through, and that 1 went on to feed muscle
          volume, the weak-area read and every target generated from them (issue #33).

          Stacked, they were two full-width rows and ~100dp of link between the counter and the
          button that ends the set — the two things that have to read as one gesture. Side by
          side they are half that, and they finally look like what they are: siblings. The swap
          gets its short label here; the sheet it opens still carries the full sentence. */}
        <XStack items="center" justify="center" gap="$3" opacity={0.7}>
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
              fontSize={13}
              fontWeight="700"
              color="$textSecondary"
              fontFamily="$body"
              numberOfLines={1}
            >
              {t("session.swap_short", "Replace")}
            </Text>
          </Pressable>

          <Text fontSize={13} color="$textSecondary" opacity={0.5}>
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
              fontSize={13}
              fontWeight="700"
              color="$textSecondary"
              fontFamily="$body"
              numberOfLines={1}
            >
              {t("session.skip_exercise")}
            </Text>
          </Pressable>
        </XStack>

        {/* Footer Action */}
        <Button
          testID="session-complete-exercise"
          size="$6"
          bg={isOvertime ? "$success" : "$primary"}
          pressStyle={{ opacity: 0.8 }}
          onPress={handleComplete}
          borderWidth={0}
          rounded="$6"
          accessibilityLabel={
            isOvertime
              ? t("session.finish_exercise_accessibility")
              : t("session.complete_exercise_accessibility")
          }
          accessibilityRole="button"
        >
          <Text color="$text" fontSize={24} fontWeight="700">
            {isOvertime ? t("session.complete_overtime") : t("session.complete_button")}
          </Text>
        </Button>
      </YStack>

      <ExerciseInstructionsModal
        instruction={instruction}
        visible={showHowTo}
        onClose={() => setShowHowTo(false)}
      />

      <ExercisePickerSheet
        exercises={swapCandidates.map((c) => c.exercise)}
        pickedIds={[currentEx.exercise.id]}
        language={language}
        open={swapOpen}
        onOpenChange={setSwapOpen}
        title={t("quests.swap_exercise", "Replace this movement")}
        onPick={(exercise) => {
          swapCurrentExercise(exercise);
          setSwapOpen(false);
        }}
        captionFor={(exercise) => swapReasonLabel(swapReasons.get(exercise.id))}
        bottomInset={insets.bottom}
        pickAction={null}
      />
    </YStack>
  );
}
