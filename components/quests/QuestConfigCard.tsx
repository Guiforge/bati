import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Separator, Text, XStack, YStack } from "tamagui";
import { AppButton, AppIconButton } from "@/components/common/AppButton";
import { Card } from "@/components/common/Card";
import { Stepper } from "@/components/common/Stepper";
import { Tag } from "@/components/common/Tag";
import { ChevronDown, ChevronUp, Repeat, RotateCcw, SlidersHorizontal } from "@/components/icons";
import { OutingGoalSheet } from "@/components/quests/OutingGoalSheet";
import { restsBetweenExercises, restsBetweenRounds } from "@/components/quests/questShape";
import { formatDistance } from "@/constants/distanceFormat";
import {
  DISTANCE_GOAL_RANGE,
  hasQuestOverrides,
  type QuestConfig,
  REST_RANGE,
  ROUNDS_RANGE,
  targetRangeFor,
} from "@/db";
import { formatDuration } from "@/db/estimate";
import { isOutdoors, isOutingSession, outingGoal } from "@/db/expeditions";
import type { DistanceUnit } from "@/db/preferences";
import type { Quest } from "@/db/quests";
import type { OutingGoal } from "@/src/gps/track";
import { localizedName } from "@/src/i18n/localized";
import { type AppLanguage, useSettingsStore } from "@/stores/settings";

/** Seconds move in fives — one second of rest is not a decision anyone makes. */
const REST_STEP = 5;

type SlotStepperProps = {
  qex: Quest["exercises"][number];
  singleControl: boolean;
  label: string;
  hint?: string;
  onChangeTarget: (value: number) => void;
};

/**
 * One slot's duration control. Split out of `QuestConfigCard` so the `.map` over slots stays a
 * plain loop rather than a ternary — that ternary, inline, is what tripped the cognitive-complexity
 * budget. Duration only: `config.distanceM` is one value for the whole quest, not one per slot, so
 * the distance control is rendered once in `QuestConfigCard` itself, never inside this loop — a
 * quest with two outdoor movements otherwise showed the same distance stepper twice.
 */
function SlotTargetStepper({ qex, singleControl, label, hint, onChangeTarget }: SlotStepperProps) {
  return (
    <Stepper
      // The movement's name, unless it is the only one: on a one-movement quest
      // the whole screen is already about it, and repeating it here squeezes the
      // label column to 70 dp, where "Course du Messager" truncates. Then the
      // unit word is the label and there is no hint to add under it.
      label={label}
      {...(singleControl ? {} : { hint })}
      value={qex.target.value}
      min={targetRangeFor(qex.target.type).min}
      max={targetRangeFor(qex.target.type).max}
      step={qex.target.type === "time" ? REST_STEP : 1}
      // The panel opens by itself on a one-movement quest, so this control is now
      // the first thing an outing shows. It said "900s", which is the unit the
      // stepper moves in and not the one a walk is measured in.
      {...(qex.target.type === "time" ? { display: formatDuration } : {})}
      onChange={onChangeTarget}
    />
  );
}

/**
 * What the outing will actually go by, and the one control that changes it.
 *
 * The value is read straight off `outingGoal()` rather than off the config, so the screen shows
 * the goal the session will start with — that rule says a distance beats a duration, and a card
 * that displayed both would be showing one the hero is never going to run.
 */
function OutingGoalRow({
  goal,
  unit,
  onOpen,
}: {
  goal: OutingGoal;
  unit: DistanceUnit;
  onOpen: () => void;
}) {
  const { t } = useTranslation();
  const byDistance = goal.type === "distance";

  return (
    <YStack gap="$2">
      <XStack items="center" justify="space-between" gap="$3">
        <Text fontWeight="700" fontSize={15} color="$text">
          {byDistance
            ? t("quests.config_distance", "Distance")
            : t("quests.config_duration", "Duration")}
        </Text>
        <Text fontWeight="700" fontSize={17} color="$primaryText">
          {byDistance ? formatDistance(goal.metres, unit) : formatDuration(goal.seconds)}
        </Text>
      </XStack>
      <AppButton variant="outline" fontSize={16} onPress={onOpen}>
        {t("quests.goal_sheet_open", "Set up the outing")}
      </AppButton>
    </YStack>
  );
}

/**
 * The steppers that answer to the quest's own shape: how many rounds, and the rests between.
 *
 * Lifted out of the card because each of them is a question the quest may or may not have, and
 * three conditionals in a component that already branches on units, overrides and a fold is how
 * a render function stops being readable.
 */
function ShapeSteppers({
  quest,
  config,
  outing,
  onChange,
}: {
  quest: Quest;
  config: QuestConfig;
  outing: boolean;
  onChange: (config: QuestConfig) => void;
}) {
  const { t } = useTranslation();

  return (
    <>
      {/* Rounds, but not on a walk. Three rounds of walking is not a thing anyone does,
          and a control offered on a screen is a decision asked of the hero: this one asked
          a question with no honest answer, sat above the only control that matters here,
          and cost a scroll to get past. An outing is one round of one movement by
          definition (`isOutingQuest`), so there was never a second value to pick. */}
      {outing ? null : (
        <Stepper
          label={t("quests.config_rounds", "Rounds")}
          value={quest.rounds}
          min={ROUNDS_RANGE.min}
          max={ROUNDS_RANGE.max}
          onChange={(rounds) => onChange({ ...config, rounds })}
        />
      )}

      {/* The label renders on one line, so which rest is which goes in the hint. Both
          steppers answer to the quest's shape: see components/quests/questShape.ts. The
          Rounds stepper above is what brings the round rest back, in the same breath, on
          every quest that still has one. */}
      {restsBetweenExercises(quest) ? (
        <Stepper
          label={t("quests.config_rest", "Rest")}
          hint={t("quests.config_rest_hint", "Between exercises")}
          value={quest.restSeconds}
          min={REST_RANGE.min}
          max={REST_RANGE.max}
          step={REST_STEP}
          suffix="s"
          onChange={(restSeconds) => onChange({ ...config, restSeconds })}
        />
      ) : null}

      {/* Null means the quest has no separate round rest, so the short one is what runs. */}
      {restsBetweenRounds(quest) ? (
        <Stepper
          label={t("quests.config_round_rest", "Round rest")}
          hint={t("quests.config_round_rest_hint", "Between rounds")}
          value={quest.roundRestSeconds ?? quest.restSeconds}
          min={REST_RANGE.min}
          max={REST_RANGE.max}
          step={REST_STEP}
          suffix="s"
          onChange={(roundRestSeconds) => onChange({ ...config, roundRestSeconds })}
        />
      ) : null}
    </>
  );
}

type Props = {
  /** The quest with the config already applied, so the steppers show what will actually run. */
  quest: Quest;
  config: QuestConfig;
  language: AppLanguage;
  onChange: (next: QuestConfig) => void;
  onReset: () => void;
  /** Opens the picker for one slot. Lives here because a substitution *is* a config override. */
  onSwap: (questExerciseId: number) => void;
};

export function QuestConfigCard({ quest, config, language, onChange, onReset, onSwap }: Props) {
  const { t } = useTranslation();
  // Open on a quest that is one movement in one round, closed on everything else. On such a
  // quest this panel holds a single control, the target, and on an outing that target is the
  // whole decision the hero came here to make: how long they are going out for. Collapsed, it
  // cost a scroll, a tap to expand and a tap to set, behind a "Start" button that was already
  // on screen. `useState` initialiser, so a hero who folds it away keeps it folded.
  const singleControl = !restsBetweenExercises(quest) && !restsBetweenRounds(quest);
  const [open, setOpen] = useState(singleControl);
  const modified = hasQuestOverrides(config);

  // On an outing the one control is the goal, and `outingGoal` is the rule that says which one
  // that is: a distance beats a duration. Reading it here rather than re-deriving from the config
  // is what stops the card from showing a target the session will not run. `null` means this
  // quest has no goal to set at all — no outdoor timed slot — so its plain steppers stay.
  const outing = isOutingSession(quest);
  const goal = outing ? outingGoal(quest, config.distanceM) : null;
  const unit = useSettingsStore((s) => s.distanceUnit);
  const [goalOpen, setGoalOpen] = useState(false);

  /**
   * One goal at a time, written the way `outingGoal` reads it: a distance is `config.distanceM`,
   * a duration is the outdoor slots' targets *and* the removal of any distance, because a
   * distance left behind would keep winning.
   *
   * The seconds are spread over the outdoor timed slots in proportion to what they hold now, so
   * a two-leg outing whose goal is the sum still sums to the number the hero just picked. On the
   * one-slot shape every outing ships with, that is simply "write it".
   */
  const setGoal = (next: OutingGoal) => {
    const range = targetRangeFor("time");
    if (next.type === "distance") {
      const metres = Math.min(
        Math.max(next.metres, DISTANCE_GOAL_RANGE.min),
        DISTANCE_GOAL_RANGE.max,
      );
      onChange({ ...config, distanceM: metres });
      return;
    }

    const timed = quest.exercises.filter(
      (qex) => isOutdoors(qex.exercise.style) && qex.target.type === "time",
    );
    const current = timed.reduce((sum, qex) => sum + qex.target.value, 0) || 1;
    const targets = { ...config.targets };
    let left = Math.round(next.seconds);
    timed.forEach((qex, index) => {
      const share =
        index === timed.length - 1 ? left : Math.round((next.seconds * qex.target.value) / current);
      const value = Math.min(Math.max(share, range.min), range.max);
      targets[String(qex.id)] = value;
      left -= value;
    });

    const written = { ...config, targets };
    delete written.distanceM;
    onChange(written);
  };

  const unitWord = (type: "time" | "reps") =>
    type === "time" ? t("quests.config_duration", "Duration") : t("quests.config_reps", "Reps");

  const slotLabel = (qex: Quest["exercises"][number]) =>
    singleControl ? unitWord(qex.target.type) : localizedName(qex.exercise, language);

  const setTarget = (questExerciseId: number, value: number) => {
    onChange({ ...config, targets: { ...config.targets, [questExerciseId]: value } });
  };

  return (
    <Card bg="$surface">
      <YStack gap="$3">
        <XStack
          items="center"
          gap="$2"
          onPress={() => setOpen((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={t("quests.config_title", "Adjust this quest")}
          accessibilityState={{ expanded: open }}
        >
          <SlidersHorizontal size={18} color="$text" />
          <Text flex={1} fontWeight="700" fontSize={16} color="$text">
            {t("quests.config_title", "Adjust this quest")}
          </Text>
          {modified ? <Tag label={t("quests.config_modified", "Custom")} tone="secondary" /> : null}
          {open ? (
            <ChevronUp size={20} color="$text" opacity={0.6} />
          ) : (
            <ChevronDown size={20} color="$text" opacity={0.6} />
          )}
        </XStack>

        {open ? (
          <YStack gap="$3">
            <Text fontSize={12} color="$textSecondary">
              {t("quests.config_hint", "Saved for this quest. It comes back next time.")}
            </Text>

            <ShapeSteppers quest={quest} config={config} outing={outing} onChange={onChange} />

            <Separator borderColor="$borderStrong" />

            {goal ? (
              <>
                <OutingGoalRow goal={goal} unit={unit} onOpen={() => setGoalOpen(true)} />
                {/* Mounted only while it is open, unlike the picker sheet beside it: a closed
                    Sheet still renders its frame into the tree, so its chips and its input stay
                    reachable by a screen reader and by anything else that walks the page. The
                    mount is also what sets the tab, so the sheet has no state to reset. */}
                {goalOpen ? (
                  <OutingGoalSheet
                    open
                    onOpenChange={setGoalOpen}
                    goal={goal}
                    unit={unit}
                    onPick={setGoal}
                  />
                ) : null}
              </>
            ) : null}

            {quest.exercises.map((qex) => (
              <XStack key={qex.id} items="center" gap="$2">
                <YStack flex={1}>
                  {goal ? (
                    // The goal above is the outing's only control, in either unit: a five-second
                    // stepper per slot would be a second way to say the same thing, and it was
                    // 360 taps to go from 15 minutes to 45. The swap button still needs a row of
                    // its own to sit beside — otherwise the icon floats next to nothing and the
                    // movement it swaps is unnamed.
                    <Text fontWeight="700" fontSize={15} color="$text" numberOfLines={2}>
                      {localizedName(qex.exercise, language)}
                    </Text>
                  ) : (
                    <SlotTargetStepper
                      qex={qex}
                      singleControl={singleControl}
                      label={slotLabel(qex)}
                      hint={unitWord(qex.target.type)}
                      onChangeTarget={(value) => setTarget(qex.id, value)}
                    />
                  )}
                </YStack>
                <AppIconButton
                  accessibilityLabel={t("quests.swap_exercise", "Replace this movement")}
                  onPress={() => onSwap(qex.id)}
                >
                  <Repeat size={18} color="$text" strokeWidth={2.5} />
                </AppIconButton>
              </XStack>
            ))}

            {modified ? (
              <AppButton
                variant="outline"
                fullWidth={false}
                height={40}
                // Same 44×44 floor as the difficulty chips; vertical only, it shares its row.
                hitSlop={{ top: 4, bottom: 4 }}
                fontSize={14}
                icon={<RotateCcw size={14} />}
                onPress={onReset}
              >
                {t("quests.config_reset", "Back to defaults")}
              </AppButton>
            ) : null}
          </YStack>
        ) : null}
      </YStack>
    </Card>
  );
}
