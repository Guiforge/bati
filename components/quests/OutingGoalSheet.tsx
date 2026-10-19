import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Keyboard, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Input, Sheet, Text, XStack, YStack } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { Chip } from "@/components/common/Chip";
import { X } from "@/components/icons";
import { formatDistance } from "@/constants/distanceFormat";
import { CONTENT_MAX_WIDTH } from "@/constants/layout";
import { formatDuration } from "@/db/estimate";
import { getOutingHabit } from "@/db/outingHabit";
import { LONGEST_RUN_CEILING, NO_HABIT, type OutingHabit } from "@/db/outingRule";
import type { DistanceUnit } from "@/db/preferences";
import type { Locomotion } from "@/db/schema";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import type { OutingGoal } from "@/src/gps/track";
import { reportError } from "@/src/reportError";
import { useSettingsStore } from "@/stores/settings";

/**
 * What a hero actually says out loud before going out: twenty minutes, half an hour, ten
 * kilometres. The stepper this replaces moved in five-second steps, so 15 min to 45 min was
 * 360 taps and 21.1 km was not on its grid at all.
 */
const minutes = (list: number[]) => list.map((m) => m * 60);

/** A ride's hour is a short one: thirty minutes on a bike is the walk to the bakery. */
const DURATION_PRESETS_SECONDS: Record<Locomotion, number[]> = {
  walk: minutes([20, 30, 45, 60]),
  run: minutes([20, 30, 45, 60]),
  ride: minutes([30, 60, 90, 120]),
};

/**
 * Round numbers per kind of outing, in both unit systems, stored in metres because metres are
 * the only storage unit (`constants/distanceFormat.ts`). A run reads the three races (5 km /
 * 10 km / half marathon, 3 / 6 / 13.1 mi); a walk and a ride read what each actually goes out
 * for. One list for all three offered a cyclist a fifteen-minute 5 km and a walker a half
 * marathon. The imperial values are the round numbers of that system, not "3.11 mi" for a 5 km.
 */
const DISTANCE_PRESETS_M: Record<Locomotion, Record<DistanceUnit, number[]>> = {
  walk: { metric: [3000, 5000, 10_000], imperial: [3219, 4828, 9656] },
  run: { metric: [5000, 10_000, 21_100], imperial: [4828, 9656, 21_082] },
  ride: { metric: [15_000, 30_000, 50_000], imperial: [16_093, 32_187, 48_280] },
};

/** A habit read back as a goal: a tenth of a kilometre or a whole minute, not "5.23 km". */
const roundMetres = (metres: number) => Math.max(100, Math.round(metres / 100) * 100);
const roundSeconds = (seconds: number) => Math.max(60, Math.round(seconds / 60) * 60);

/**
 * ponytail: second copy of the mile, `constants/distanceFormat.ts` holds the first and owns the
 * conversion. Export `M_PER_MILE` from there and delete this the next time that file is open.
 */
const METRES_PER_TYPED_UNIT: Record<DistanceUnit, number> = { metric: 1000, imperial: 1609.344 };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * The goal that would start right now — `outingGoal()` is the rule, and it says a distance
   * beats a duration. The sheet opens on that goal's own tab, so the hero never edits the unit
   * the session is about to ignore.
   */
  goal: OutingGoal;
  unit: DistanceUnit;
  /**
   * What the outing is, which picks the presets and whose history is the habit. `null` is a
   * mixed quest (`outingLocomotion`): it gets the run presets it always had, and no habit.
   */
  locomotion: Locomotion | null;
  /**
   * The tab of "Affichage des sorties" this outing reads (`displayLocomotion`): a mixed quest
   * included, where `locomotion` above is null. The link under the goals opens it.
   */
  displayLocomotion: Locomotion;
  /**
   * The goal on this sheet is still the app's walk-run proposal (`proposesWalkRun`). The caller
   * knows, because it holds the slots the proposal was made on; from the habit alone the sheet
   * could not tell a hero's own run quest, which is never proposed one.
   */
  walkRun: boolean;
  /** One goal at a time: the caller writes a duration or a distance, never both. */
  onPick: (goal: OutingGoal) => void;
};

/**
 * The longest run of the month in the tab's own unit, moving seconds or metres, for the line
 * that names the ceiling above it. `shown` false when the line has no business there: another
 * kind of outing, or a goal that is still the walk-run proposal.
 */
function longestOf(habit: OutingHabit, durationTab: boolean, shown: boolean): number | null {
  if (!shown) return null;
  return durationTab ? habit.longestSeconds : habit.longestM;
}

/**
 * The outing's whole decision, on the model of `ExercisePickerSheet` — including its `disableDrag`,
 * which is not a preference: with the drag on, the pane drifts off its snap point and a close
 * leaves the frame painted where it drifted, taps falling through to the screen behind.
 */
export function OutingGoalSheet({
  open,
  onOpenChange,
  goal,
  unit,
  locomotion,
  displayLocomotion,
  walkRun,
  onPick,
}: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const language = useSettingsStore((s) => s.language);
  const insets = useSafeAreaInsets();
  // The caller mounts this on open, so the initialiser is the reset: a hero who saved a distance
  // and came back lands on Distance rather than editing minutes `outingGoal` has already decided
  // to ignore, and yesterday's half-typed number is not still in the box.
  const [tab, setTab] = useState<OutingGoal["type"]>(goal.type);
  const [custom, setCustom] = useState("");
  // Read on every open, never cached: the habit is the journal's, and a run deleted there must
  // stop being "usual" here the next time the sheet opens.
  const [habit, setHabit] = useState<OutingHabit>(NO_HABIT);
  useEffect(() => {
    if (locomotion === null) return;
    getOutingHabit(locomotion)
      .then(setHabit)
      .catch((e) => reportError("goalSheet.habit", e));
  }, [locomotion]);
  const kind = locomotion ?? "run";

  // Same lesson as the picker: the sheet leaves, its input keeps the focus, and every keystroke
  // aimed at the screen behind lands in a box nobody can see.
  const close = () => {
    Keyboard.dismiss();
    onOpenChange(false);
  };

  const pick = (next: OutingGoal) => {
    onPick(next);
    close();
  };

  // A comma is what a French keyboard puts under the thumb, and "21,1" parses to NaN.
  const applyCustom = () => {
    const typed = Number(custom.replace(",", "."));
    if (!Number.isFinite(typed) || typed <= 0) return close();
    return pick(
      tab === "time"
        ? { type: "time", seconds: Math.round(typed * 60) }
        : { type: "distance", metres: Math.round(typed * METRES_PER_TYPED_UNIT[unit]) },
    );
  };

  const durationTab = tab === "time";
  const unitWord = durationTab ? "min" : unit === "imperial" ? "mi" : "km";
  const asTime = (seconds: number): OutingGoal => ({ type: "time", seconds });
  const asDistance = (metres: number): OutingGoal => ({ type: "distance", metres });
  const labelOf = (g: OutingGoal) =>
    g.type === "time"
      ? formatDuration(g.seconds, language)
      : formatDistance(g.metres, unit, language);

  const fixed = durationTab
    ? DURATION_PRESETS_SECONDS[kind].map(asTime)
    : DISTANCE_PRESETS_M[kind][unit].map(asDistance);
  const presets: { key: string; label: string; goal: OutingGoal }[] = fixed.map((g) => ({
    key: labelOf(g),
    label: labelOf(g),
    goal: g,
  }));

  // First, ahead of the round numbers: what this hero already does. Never "+10%", which proposed
  // on every outing doubles a distance in seven of them.
  if (habit.usual !== null) {
    const usual = durationTab
      ? asTime(roundSeconds(habit.usual.seconds))
      : asDistance(roundMetres(habit.usual.metres));
    presets.unshift({
      key: "usual",
      label: t("quests.goal_usual", { value: labelOf(usual) }),
      goal: usual,
    });
  }

  // The ceiling, shown before the choice rather than after it: picking a chip closes the sheet,
  // so a warning on the chosen goal would never be read. Runs only, because that is what the
  // study measured; nothing equivalent exists for walking or riding.
  // On both tabs, each in its own unit: the line was on the distance tab alone, and a hero who
  // sets a run by its duration is the one the proposal below it speaks to.
  // And not at all, on either tab, while the goal is the walk-run proposal: "your body copes
  // better under 13 min", or under 1.3 km, over a proposal of twenty minutes contradicted it.
  // The walk-run is mostly walking, which is why it may be longer than their longest run.
  const longestRun = longestOf(habit, durationTab, kind === "run" && !walkRun);
  const longestLabel = durationTab
    ? (seconds: number) => formatDuration(seconds, language)
    : (metres: number) => formatDistance(metres, unit, language);

  return (
    <Sheet
      modal
      open={open}
      onOpenChange={(next: boolean) => (next ? onOpenChange(true) : close())}
      snapPointsMode="fit"
      disableDrag
      transition={reducedMotion ? undefined : "quick"}
      zIndex={100_000}
    >
      <Sheet.Overlay
        bg="$sheetScrim"
        transition={reducedMotion ? undefined : "quick"}
        enterStyle={{ opacity: 0 }}
        exitStyle={{ opacity: 0 }}
      />
      {/* No handle, for the same reason the picker has none: with the drag off it would promise
          a gesture that answers nothing. The X and hardware back are the way out. */}
      <Sheet.Frame
        width="100%"
        maxW={CONTENT_MAX_WIDTH}
        self="center"
        bg="$surface"
        borderTopLeftRadius="$6"
        borderTopRightRadius="$6"
      >
        <YStack px="$4" pt="$4" pb={insets.bottom + 16} gap="$4">
          <XStack items="center" justify="space-between" gap="$3">
            <Text flex={1} fontWeight="700" fontSize={18} color="$text">
              {t("quests.goal_sheet_title")}
            </Text>
            <Pressable
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={t("common.close")}
              onPress={close}
            >
              <X size={20} color="$textSecondary" />
            </Pressable>
          </XStack>

          <XStack gap="$2">
            <Chip
              label={t("quests.config_duration")}
              tone={durationTab ? "primary" : "default"}
              accessibilityState={{ selected: durationTab }}
              onPress={() => setTab("time")}
            />
            <Chip
              label={t("quests.config_distance")}
              tone={durationTab ? "default" : "primary"}
              accessibilityState={{ selected: !durationTab }}
              onPress={() => setTab("distance")}
            />
          </XStack>

          {/* Wrapping, not scrolling: four chips at 44 dp fit two rows on the narrowest phone,
              and a scroll view here would hand part of every touch to a pane that cannot move. */}
          <XStack gap="$2" flexWrap="wrap">
            {presets.map((preset) => (
              <Chip
                key={preset.key}
                label={preset.label}
                tone="default"
                onPress={() => pick(preset.goal)}
              />
            ))}
          </XStack>

          {longestRun === null ? null : (
            <Text testID="goal-longest-run" fontSize={13} color="$textSecondary">
              {t("quests.goal_longest_run", {
                longest: longestLabel(longestRun),
                ceiling: longestLabel(longestRun * LONGEST_RUN_CEILING),
              })}
            </Text>
          )}

          <YStack gap="$2">
            <Text fontWeight="700" fontSize={15} color="$text">
              {t("quests.goal_sheet_custom")}
            </Text>
            <XStack items="center" gap="$2">
              <Input
                flex={1}
                minH={44}
                value={custom}
                onChangeText={setCustom}
                keyboardType="decimal-pad"
                returnKeyType="done"
                onSubmitEditing={applyCustom}
                placeholder={t("quests.goal_sheet_custom_hint")}
                bg="$background"
                borderColor="$borderStrong"
                color="$text"
              />
              {/* The unit words are the same in both languages Bati speaks, so `formatDistance`
                  owns them and there is nothing here for i18n to translate. */}
              <Text fontWeight="700" fontSize={15} color="$textSecondary">
                {unitWord}
              </Text>
            </XStack>
          </YStack>

          <AppButton variant="outline" onPress={applyCustom}>
            {t("common.done")}
          </AppButton>

          {/* Quiet, under the goals: what the hero sees while out is a setting of the outing too. */}
          <Pressable
            testID="goal-sheet-outing-display"
            accessibilityRole="link"
            hitSlop={8}
            style={{ minHeight: 44, justifyContent: "center", alignItems: "center" }}
            onPress={() => {
              close();
              router.push(`/outing-display?tab=${displayLocomotion}` as never);
            }}
          >
            <Text fontSize={14} color="$textSecondary" textDecorationLine="underline">
              {t("quests.outing_display_link")}
            </Text>
          </Pressable>
        </YStack>
      </Sheet.Frame>
    </Sheet>
  );
}
