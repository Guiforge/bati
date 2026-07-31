import { ChevronDown, ChevronUp, RotateCcw, SlidersHorizontal } from "@tamagui/lucide-icons";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Separator, Text, XStack, YStack } from "tamagui";

import { AppButton } from "@/components/common/AppButton";
import { Card } from "@/components/common/Card";
import { Stepper } from "@/components/common/Stepper";
import { Tag } from "@/components/common/Tag";
import { hasQuestOverrides, type QuestConfig, REST_RANGE, ROUNDS_RANGE, TARGET_RANGE } from "@/db";
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
};

export function QuestConfigCard({ quest, config, language, onChange, onReset }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const modified = hasQuestOverrides(config);

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
              {t("quests.config_hint", "Saved for this quest — it comes back next time.")}
            </Text>

            <Stepper
              label={t("quests.config_rounds", "Rounds")}
              value={quest.rounds}
              min={ROUNDS_RANGE.min}
              max={ROUNDS_RANGE.max}
              onChange={(rounds) => onChange({ ...config, rounds })}
            />

            <Stepper
              label={t("quests.config_rest", "Rest")}
              value={quest.restSeconds}
              min={REST_RANGE.min}
              max={REST_RANGE.max}
              step={REST_STEP}
              suffix="s"
              onChange={(restSeconds) => onChange({ ...config, restSeconds })}
            />

            <Separator borderColor="$borderStrong" />

            {quest.exercises.map((qex) => (
              <Stepper
                key={qex.id}
                label={language === "fr" ? qex.exercise.frName : qex.exercise.enName}
                hint={
                  qex.target.type === "time"
                    ? t("quests.config_seconds", "Seconds")
                    : t("quests.config_reps", "Reps")
                }
                value={qex.target.value}
                min={TARGET_RANGE.min}
                max={TARGET_RANGE.max}
                step={qex.target.type === "time" ? REST_STEP : 1}
                suffix={qex.target.type === "time" ? "s" : ""}
                onChange={(value) => setTarget(qex.id, value)}
              />
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
