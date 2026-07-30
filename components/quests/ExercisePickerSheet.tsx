import { Plus, Search, X } from "@tamagui/lucide-icons";
import { Image } from "expo-image";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Platform, Pressable } from "react-native";
import { Input, Sheet, Text, XStack, YStack } from "tamagui";

import { AppButton } from "@/components/common/AppButton";
import { getExerciseAsset } from "@/constants/assetMap";
import { EQUIPMENT_LABELS } from "@/db/equipment";
import type { Exercise } from "@/db/exercises";
import { MUSCLE_LABELS } from "@/db/muscles";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import type { AppLanguage } from "@/stores/settings";

type Props = {
  exercises: Exercise[];
  /** Already in the quest — hidden from the list, since adding twice does nothing. */
  pickedIds: number[];
  language: AppLanguage;
  onAdd: (exercise: Exercise) => void;
  bottomInset: number;
};

/** The sheet stays open after each pick, so building a five-move quest is five taps, not five sheets. */
export function ExercisePickerSheet({ exercises, pickedIds, language, onAdd, bottomInset }: Props) {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Same reason as QuestFiltersSheet: Android reports a 0 bottom inset over the gesture area.
  const bottomPad = Math.max(bottomInset, Platform.OS === "android" ? 24 : 0) + 10;

  const results = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const chosen = new Set(pickedIds);
    return exercises.filter(
      (e) =>
        !chosen.has(e.id) &&
        (language === "fr" ? e.frName : e.enName).toLowerCase().includes(needle),
    );
  }, [exercises, language, pickedIds, search]);

  return (
    <>
      <AppButton
        variant="outline"
        icon={<Plus size={20} color="$text" strokeWidth={2.5} />}
        onPress={() => setOpen(true)}
        accessibilityLabel={t("quests.editor_add_exercise", "Add an exercise")}
      >
        {t("quests.editor_add_exercise", "Add an exercise")}
      </AppButton>

      <Sheet
        modal
        open={open}
        onOpenChange={setOpen}
        snapPoints={[85]}
        dismissOnSnapToBottom
        transition={reducedMotion ? undefined : "quick"}
        zIndex={100_000}
      >
        <Sheet.Overlay
          bg="rgba(0,0,0,0.5)"
          transition={reducedMotion ? undefined : "quick"}
          enterStyle={{ opacity: 0 }}
          exitStyle={{ opacity: 0 }}
        />
        <Sheet.Handle bg="$borderStrong" />
        <Sheet.Frame bg="$surface" flex={1}>
          <YStack px="$4" pt="$4" pb="$3" gap="$3">
            <XStack items="center" justify="space-between">
              <Text fontWeight="700" fontSize={18} color="$text">
                {t("quests.editor_add_exercise", "Add an exercise")}
              </Text>
              <Pressable
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={t("common.close", "Close")}
                onPress={() => setOpen(false)}
              >
                <X size={20} color="$textSecondary" />
              </Pressable>
            </XStack>

            <XStack items="center" gap="$2">
              <Input
                flex={1}
                value={search}
                onChangeText={setSearch}
                placeholder={t("quests.editor_search", "Search")}
                bg="$background"
                borderColor="$borderStrong"
                color="$text"
              />
              <Search size={18} color="$textSecondary" />
            </XStack>
          </YStack>

          <Sheet.ScrollView flex={1} px="$4" keyboardShouldPersistTaps="handled">
            <YStack gap="$2" pb="$3">
              {results.map((exercise) => (
                <XStack
                  key={exercise.id}
                  items="center"
                  gap="$3"
                  p="$2"
                  rounded="$6"
                  bg="$background"
                  borderWidth={1}
                  borderColor="$borderStrong"
                  pressStyle={{ opacity: 0.92, scale: 0.99 }}
                  accessibilityRole="button"
                  accessibilityLabel={language === "fr" ? exercise.frName : exercise.enName}
                  onPress={() => onAdd(exercise)}
                >
                  <YStack width={56} height={56} rounded="$4" overflow="hidden" bg="$surface">
                    <Image
                      source={getExerciseAsset(exercise.imagePath)}
                      style={{ width: "100%", height: "100%" }}
                      contentFit="cover"
                      transition={0}
                    />
                  </YStack>

                  <YStack flex={1} gap="$1">
                    <Text fontWeight="700" fontSize={15} color="$text">
                      {language === "fr" ? exercise.frName : exercise.enName}
                    </Text>
                    <Text fontSize={12} color="$textSecondary">
                      {[
                        ...exercise.muscles.map((m) => MUSCLE_LABELS[m]?.[language] ?? m),
                        EQUIPMENT_LABELS[exercise.equipment]?.[language] ?? exercise.equipment,
                      ].join(" · ")}
                    </Text>
                  </YStack>

                  <Plus size={20} color="$primary" strokeWidth={2.5} />
                </XStack>
              ))}

              {results.length === 0 ? (
                <Text fontSize={14} color="$textSecondary" p="$3">
                  {t("quests.editor_no_results", "No exercise matches that.")}
                </Text>
              ) : null}
            </YStack>
          </Sheet.ScrollView>

          <XStack p="$4" pb={bottomPad} borderTopWidth={1} borderColor="$borderStrong">
            <AppButton onPress={() => setOpen(false)}>{t("common.done", "Done")}</AppButton>
          </XStack>
        </Sheet.Frame>
      </Sheet>
    </>
  );
}
