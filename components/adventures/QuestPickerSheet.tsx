import { Image } from "expo-image";
import { useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Keyboard, Platform, Pressable, type ScrollViewInstance } from "react-native";
import { Input, Sheet, ScrollView as TamaguiScrollView, Text, XStack, YStack } from "tamagui";
import { heroQuestsFirst } from "@/components/adventures/heroQuestsFirst";
import { AppButton } from "@/components/common/AppButton";
import { tamaguiRef } from "@/components/common/tamaguiRef";
import { Plus, X } from "@/components/icons";
import { getQuestAsset } from "@/constants/assetMap";
import { CONTENT_MAX_WIDTH } from "@/constants/layout";
import { formatDuration } from "@/db/estimate";
import type { QuestTemplate } from "@/db/quests";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import type { AppLanguage } from "@/src/i18n/deviceLanguage";
import { localizedTitle } from "@/src/i18n/localized";

type Props = {
  /** Every quest a step may be. The sheet puts the hero's own first, keeping each group's order. */
  quests: readonly QuestTemplate[];
  /** Seconds per quest, as the gallery prices them: the row says how long it is. */
  seconds: ReadonlyMap<number, number>;
  language: AppLanguage;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (quest: QuestTemplate) => void;
  bottomInset: number;
};

/**
 * The quest picker of the adventure editor, modelled on the exercise picker: a controlled sheet that
 * stays open while the hero builds a list. The drag is off for the same reason (the pane strands),
 * and the list is a plain scroll view, not `Sheet.ScrollView`.
 *
 * ponytail: a name search only. The quest gallery's duration and equipment filters are the upgrade
 * if a hero with fifty quests asks for them.
 */
export function QuestPickerSheet({
  quests,
  seconds,
  language,
  open,
  onOpenChange,
  onPick,
  bottomInset,
}: Props) {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();
  const [search, setSearch] = useState("");
  const listRef = useRef<ScrollViewInstance>(null);
  const bottomPad = Math.max(bottomInset, Platform.OS === "android" ? 24 : 0) + 10;

  const close = useCallback(() => {
    Keyboard.dismiss();
    onOpenChange(false);
    setSearch("");
    listRef.current?.scrollTo({ y: 0, animated: false });
  }, [onOpenChange]);

  const ordered = useMemo(() => heroQuestsFirst(quests), [quests]);
  const results = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return needle
      ? ordered.filter((q) => localizedTitle(q, language).toLowerCase().includes(needle))
      : ordered;
  }, [ordered, language, search]);

  return (
    <Sheet
      modal
      open={open}
      onOpenChange={(next: boolean) => (next ? onOpenChange(true) : close())}
      snapPoints={[85]}
      disableDrag
      // Closed, the sheet still drew every quest row and its picture under the editor, and each
      // scroll frame of the editor paid for them (gfxinfo: 97 ms median, 16 ms without).
      unmountChildrenWhenHidden
      transition={reducedMotion ? undefined : "quick"}
      zIndex={100_000}
    >
      <Sheet.Overlay
        bg="$sheetScrim"
        transition={reducedMotion ? undefined : "quick"}
        enterStyle={{ opacity: 0 }}
        exitStyle={{ opacity: 0 }}
      />
      <Sheet.Frame
        width="100%"
        maxW={CONTENT_MAX_WIDTH}
        self="center"
        bg="$surface"
        borderTopLeftRadius="$6"
        borderTopRightRadius="$6"
      >
        <YStack px="$4" pt="$4" pb="$3" gap="$3">
          <XStack items="center" justify="space-between">
            <Text fontWeight="700" fontSize={18} color="$text">
              {t("adventures.picker_title")}
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
          <Input
            testID="quest-picker-search"
            value={search}
            onChangeText={setSearch}
            placeholder={t("quests.editor_search")}
            bg="$background"
            borderColor="$borderStrong"
            color="$text"
          />
        </YStack>

        <TamaguiScrollView
          ref={tamaguiRef(listRef)}
          flex={1}
          px="$4"
          keyboardShouldPersistTaps="handled"
        >
          <YStack gap="$2" pb="$3">
            {results.map((quest) => (
              <XStack
                key={quest.id}
                testID={`quest-pick-${quest.id}`}
                onPress={() => onPick(quest)}
                items="center"
                gap="$3"
                p="$2"
                bg="$background"
                borderWidth={1}
                borderColor="$borderStrong"
                rounded="$3"
                pressStyle={{ opacity: 0.85 }}
                accessibilityRole="button"
                accessibilityLabel={localizedTitle(quest, language)}
              >
                <YStack width={48} height={48} rounded="$3" overflow="hidden" bg="$surface2">
                  <Image
                    source={getQuestAsset(quest.imagePath ?? "")}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                    accessible={false}
                  />
                </YStack>
                <YStack flex={1} minW={0}>
                  <Text fontWeight="700" color="$text" numberOfLines={2}>
                    {localizedTitle(quest, language)}
                  </Text>
                  <Text fontSize={12} color="$textSecondary">
                    {formatDuration(seconds.get(quest.id) ?? 0, language)}
                  </Text>
                </YStack>
                <Plus size={20} color="$primaryText" strokeWidth={2.5} />
              </XStack>
            ))}
            {results.length === 0 ? (
              <Text fontSize={14} color="$textSecondary" p="$3">
                {t("adventures.picker_empty")}
              </Text>
            ) : null}
          </YStack>
        </TamaguiScrollView>

        <XStack p="$4" pb={bottomPad} borderTopWidth={1} borderColor="$borderStrong">
          <AppButton onPress={close}>{t("common.done")}</AppButton>
        </XStack>
      </Sheet.Frame>
    </Sheet>
  );
}
