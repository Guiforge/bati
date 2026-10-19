import { Image } from "expo-image";
import { useTranslation } from "react-i18next";
import { Input, Text, XStack, YStack } from "tamagui";
import { AppIconButton } from "@/components/common/AppButton";
import { Card } from "@/components/common/Card";
import { ChevronDown, ChevronUp, X } from "@/components/icons";
import { getQuestAsset } from "@/constants/assetMap";
import { formatDurationEstimate } from "@/db/estimate";
import { MAX_STEP_TEXT } from "@/db/heroAdventures";
import type { QuestTemplate } from "@/db/quests";
import type { AppLanguage } from "@/src/i18n/deviceLanguage";
import { localizedTitle } from "@/src/i18n/localized";

/** A step as the editor holds it. `uid` names the row, not the quest: one quest may be two steps. */
export type EditorStep = {
  uid: number;
  questId: number;
  narrative: string;
  outro: string;
  /** The "on the way back" field is shown: it has text, or the hero asked for it. */
  showOutro: boolean;
};

type Props = {
  index: number;
  isLast: boolean;
  step: EditorStep;
  /** Null when the quest is gone: the card says so and the hero can only move or remove it. */
  quest: QuestTemplate | null;
  seconds: number;
  language: AppLanguage;
  /** A playthrough is under way: the quests and the order are fixed, the words are not. */
  frozen: boolean;
  onChange: (patch: Partial<EditorStep>) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
};

/** One step of the adventure being written: its quest, the words before it, and the way back. */
export function EditorStepCard({
  index,
  isLast,
  step,
  quest,
  seconds,
  language,
  frozen,
  onChange,
  onMove,
  onRemove,
}: Props) {
  const { t } = useTranslation();
  const n = index + 1;

  return (
    <Card testID={`editor-step-${index}`}>
      <YStack gap="$3">
        <XStack items="center" gap="$3">
          <YStack width={48} height={48} rounded="$4" overflow="hidden" bg="$background">
            {quest ? (
              <Image
                source={getQuestAsset(quest.imagePath ?? "")}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
                accessible={false}
              />
            ) : null}
          </YStack>
          <YStack flex={1} minW={0}>
            <Text fontSize={12} fontWeight="700" color="$textSecondary">
              {t("adventures.editor_step", { n })}
            </Text>
            <Text fontWeight="700" color="$text" numberOfLines={2}>
              {quest ? localizedTitle(quest, language) : t("adventures.missing_quest")}
            </Text>
            {quest ? (
              <Text fontSize={12} color="$textSecondary">
                {formatDurationEstimate(seconds, language)}
              </Text>
            ) : null}
          </YStack>
        </XStack>
        {/* A row of their own: beside the title, three 44 dp buttons left it one word at 130%. */}
        {frozen ? null : (
          <XStack gap="$1" justify="flex-end">
            <AppIconButton
              disabled={index === 0}
              onPress={() => onMove(-1)}
              accessibilityRole="button"
              accessibilityLabel={t("adventures.editor_step_up", { n })}
            >
              <ChevronUp size={18} color="$text" />
            </AppIconButton>
            <AppIconButton
              disabled={isLast}
              onPress={() => onMove(1)}
              accessibilityRole="button"
              accessibilityLabel={t("adventures.editor_step_down", { n })}
            >
              <ChevronDown size={18} color="$text" />
            </AppIconButton>
            <AppIconButton
              onPress={onRemove}
              accessibilityRole="button"
              accessibilityLabel={t("adventures.editor_step_remove", { n })}
            >
              <X size={18} color="$text" />
            </AppIconButton>
          </XStack>
        )}

        <YStack gap="$2">
          <Text fontWeight="700" fontSize={14} color="$textSecondary">
            {t("adventures.editor_before")}
          </Text>
          <Input
            value={step.narrative}
            onChangeText={(narrative) => onChange({ narrative })}
            maxLength={MAX_STEP_TEXT}
            multiline
            placeholder={t("adventures.editor_before_placeholder")}
            bg="$background"
            borderColor="$borderStrong"
            color="$text"
          />
        </YStack>

        {step.showOutro ? (
          <YStack gap="$2">
            <Text fontWeight="700" fontSize={14} color="$textSecondary">
              {t("adventures.editor_after")}
            </Text>
            <Input
              value={step.outro}
              onChangeText={(outro) => onChange({ outro })}
              maxLength={MAX_STEP_TEXT}
              multiline
              bg="$background"
              borderColor="$borderStrong"
              color="$text"
            />
          </YStack>
        ) : (
          <Text
            onPress={() => onChange({ showOutro: true })}
            minH={44}
            fontWeight="700"
            fontSize={14}
            color="$primaryText"
            accessibilityRole="button"
          >
            {t("adventures.editor_after_add")}
          </Text>
        )}
      </YStack>
    </Card>
  );
}
