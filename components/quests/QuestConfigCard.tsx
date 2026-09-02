import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Separator, Text, XStack, YStack } from "tamagui";
import { AppButton, AppIconButton } from "@/components/common/AppButton";
import { Card } from "@/components/common/Card";
import { Stepper } from "@/components/common/Stepper";
import { Tag } from "@/components/common/Tag";
import { ChevronDown, ChevronUp, Repeat, RotateCcw, SlidersHorizontal } from "@/components/icons";
import { restsBetweenExercises, restsBetweenRounds } from "@/components/quests/questShape";
import {
  hasQuestOverrides,
  type QuestConfig,
  REST_RANGE,
  ROUNDS_RANGE,
  targetRangeFor,
} from "@/db";
import { formatDuration } from "@/db/estimate";
import type { Quest } from "@/db/quests";
import type { AppLanguage } from "@/stores/settings";

/** Seconds move in fives — one second of rest is not a decision anyone makes. */
const REST_STEP = 5;

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

  const unitWord = (type: "time" | "reps") =>
    type === "time" ? t("quests.config_duration", "Duration") : t("quests.config_reps", "Reps");

  const slotLabel = (qex: Quest["exercises"][number]) =>
    singleControl
      ? unitWord(qex.target.type)
      : language === "fr"
        ? qex.exercise.frName
        : qex.exercise.enName;

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

            <Stepper
              label={t("quests.config_rounds", "Rounds")}
              value={quest.rounds}
              min={ROUNDS_RANGE.min}
              max={ROUNDS_RANGE.max}
              onChange={(rounds) => onChange({ ...config, rounds })}
            />

            {/* The label renders on one line, so which rest is which goes in the hint. Both
                steppers answer to the quest's shape: see components/quests/questShape.ts. The
                Rounds stepper above is what brings the round rest back, in the same breath. */}
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

            <Separator borderColor="$borderStrong" />

            {quest.exercises.map((qex) => (
              <XStack key={qex.id} items="center" gap="$2">
                <YStack flex={1}>
                  <Stepper
                    // The movement's name, unless it is the only one: on a one-movement quest
                    // the whole screen is already about it, and repeating it here squeezes the
                    // label column to 70 dp, where "Course du Messager" truncates. Then the
                    // unit word is the label and there is no hint to add under it.
                    label={slotLabel(qex)}
                    {...(singleControl ? {} : { hint: unitWord(qex.target.type) })}
                    value={qex.target.value}
                    min={targetRangeFor(qex.target.type).min}
                    max={targetRangeFor(qex.target.type).max}
                    step={qex.target.type === "time" ? REST_STEP : 1}
                    // The panel opens by itself on a one-movement quest, so this control is now
                    // the first thing an outing shows. It said "900s", which is the unit the
                    // stepper moves in and not the one a walk is measured in.
                    {...(qex.target.type === "time" ? { display: formatDuration } : {})}
                    onChange={(value) => setTarget(qex.id, value)}
                  />
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
