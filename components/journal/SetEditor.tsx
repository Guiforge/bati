import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, XStack, YStack } from "tamagui";
import { Minus, Plus } from "@/components/icons";
import { NButton, NText } from "@/components/journal/nocturne";
import { CountInput } from "@/components/session/CountInput";
import type { ExerciseStyle, QuestTargetType } from "@/db/schema";
import { targetRangeFor } from "@/db/targets";

/**
 * One logged set, corrected in place. The rest screen's Adjust row (same stepper, same 5 s step
 * on a hold) opened on a set that is already in the journal; saving is the caller's business.
 */
export function SetEditor({
  initial,
  type,
  style,
  onSave,
  onCancel,
}: {
  initial: number;
  type: QuestTargetType;
  style: ExerciseStyle;
  onSave: (value: number) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [value, setValue] = useState(initial);
  const time = type === "time";
  const { min, max } = targetRangeFor(type, style);
  const step = time ? 5 : 1;
  const clamp = (v: number) => Math.min(max, Math.max(min, v));

  return (
    <YStack testID="journal-set-editor" gap={8} pb={8}>
      <XStack items="center" justify="space-between" gap={11}>
        <NText fontSize={12} fontWeight="700" flex={1} shrink={1}>
          {t(time ? "session.adjust_seconds_label" : "session.adjust_reps_label")}
        </NText>
        <XStack items="center" gap={11} shrink={0}>
          <Button
            size="$3"
            circular
            hitSlop={8}
            icon={<Minus size={16} />}
            accessibilityLabel={t("session.decrease_result_accessibility")}
            onPress={() => setValue(clamp(value - step))}
          />
          <XStack minW={42} items="baseline" justify="center">
            <CountInput
              testID="journal-set-input"
              value={value}
              onChange={(v) => setValue(clamp(v))}
              max={max}
              fontSize={20}
              accessibilityLabel={t("session.result_count_accessibility")}
            />
            {time ? <NText fontSize={20}>s</NText> : null}
          </XStack>
          <Button
            size="$3"
            circular
            hitSlop={8}
            icon={<Plus size={16} />}
            accessibilityLabel={t("session.increase_result_accessibility")}
            onPress={() => setValue(clamp(value + step))}
          />
        </XStack>
      </XStack>
      <XStack gap={8}>
        <NButton testID="journal-set-save" variant="primary" onPress={() => onSave(value)}>
          {t("journal.set_edit_save")}
        </NButton>
        <NButton testID="journal-set-cancel" onPress={onCancel}>
          {t("journal.set_edit_cancel")}
        </NButton>
      </XStack>
    </YStack>
  );
}
