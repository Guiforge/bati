import { Check, Plus, Search, X } from "@tamagui/lucide-icons";
import { Image } from "expo-image";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Platform, Pressable } from "react-native";
import { Input, Sheet, Text, XStack, YStack } from "tamagui";

import { AppButton } from "@/components/common/AppButton";
import { getExerciseThumb } from "@/constants/assetMap";
import { EQUIPMENT_LABELS } from "@/db/equipment";
import type { Exercise } from "@/db/exercises";
import { MUSCLE_LABELS } from "@/db/muscles";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import type { AppLanguage } from "@/stores/settings";

type Props = {
  exercises: Exercise[];
  /**
   * Already in the quest, one entry per pick. Shown as a count on the row, never filtered out:
   * removing the tapped row made every row below jump up under the finger, so a second tap
   * landed on whatever slid into place. A circuit may also repeat a movement on purpose.
   */
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

  // Android reports a 0 bottom inset even where the system gesture area eats taps.
  const bottomPad = Math.max(bottomInset, Platform.OS === "android" ? 24 : 0) + 10;

  // Closing resets the search: it used to survive, so reopening showed a list still filtered by
  // a word the hero had long forgotten typing, with no visible cue why most exercises were gone.
  const close = useCallback(() => {
    setOpen(false);
    setSearch("");
  }, []);

  const results = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return exercises.filter((e) =>
      (language === "fr" ? e.frName : e.enName).toLowerCase().includes(needle),
    );
  }, [exercises, language, search]);

  const countByExerciseId = useMemo(() => {
    const counts = new Map<number, number>();
    for (const id of pickedIds) counts.set(id, (counts.get(id) ?? 0) + 1);
    return counts;
  }, [pickedIds]);

  // `exercises` (the full catalog) only changes on mount, unlike `results`, which is
  // recomputed on every keystroke — keying the memo on the stable list keeps the
  // split+regex asset lookup from re-running per row on every search character.
  const assetByExerciseId = useMemo(
    () => new Map(exercises.map((e) => [e.id, getExerciseThumb(e.imagePath)] as const)),
    [exercises],
  );

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
        onOpenChange={(next: boolean) => (next ? setOpen(true) : close())}
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
        {/* No flex={1}: the snap point already sets the frame's height, and letting it also grow
            left the frame stranded mid-screen after a close — visible, but with open already
            false, so nothing in it answered. VillageDetailSheet, which works, has no flex here. */}
        <Sheet.Frame bg="$surface">
          <YStack px="$4" pt="$4" pb="$3" gap="$3">
            <XStack items="center" justify="space-between">
              <Text fontWeight="700" fontSize={18} color="$text">
                {t("quests.editor_add_exercise", "Add an exercise")}
              </Text>
              <Pressable
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={t("common.close", "Close")}
                onPress={close}
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
              {results.map((exercise) => {
                const picked = countByExerciseId.get(exercise.id) ?? 0;
                const name = language === "fr" ? exercise.frName : exercise.enName;

                return (
                  <XStack
                    key={exercise.id}
                    items="center"
                    gap="$3"
                    p="$2"
                    rounded="$6"
                    bg="$background"
                    borderWidth={1}
                    borderColor={picked > 0 ? "$primaryText" : "$borderStrong"}
                    pressStyle={{ opacity: 0.92, scale: 0.99 }}
                    accessibilityRole="button"
                    accessibilityLabel={
                      picked > 0
                        ? `${name}, ${t("quests.editor_added_count", { count: picked })}`
                        : name
                    }
                    onPress={() => onAdd(exercise)}
                  >
                    <YStack width={56} height={56} rounded="$4" overflow="hidden" bg="$surface">
                      <Image
                        source={assetByExerciseId.get(exercise.id)}
                        style={{ width: "100%", height: "100%" }}
                        contentFit="cover"
                        transition={0}
                      />
                    </YStack>

                    <YStack flex={1} gap="$1">
                      <Text fontWeight="700" fontSize={15} color="$text">
                        {name}
                      </Text>
                      <Text fontSize={12} color="$textSecondary">
                        {[
                          ...exercise.muscles.map((m) => MUSCLE_LABELS[m]?.[language] ?? m),
                          EQUIPMENT_LABELS[exercise.equipment]?.[language] ?? exercise.equipment,
                        ].join(" · ")}
                      </Text>
                    </YStack>

                    {picked > 0 ? (
                      <XStack
                        items="center"
                        gap="$1"
                        px="$2"
                        py="$1"
                        rounded="$10"
                        bg="$surface"
                        borderWidth={1}
                        borderColor="$primaryText"
                      >
                        <Check size={14} color="$primaryText" strokeWidth={3} />
                        <Text fontSize={12} fontWeight="700" color="$primaryText">
                          {picked}
                        </Text>
                      </XStack>
                    ) : null}

                    <Plus size={20} color="$primaryText" strokeWidth={2.5} />
                  </XStack>
                );
              })}

              {results.length === 0 ? (
                <Text fontSize={14} color="$textSecondary" p="$3">
                  {t("quests.editor_no_results", "No exercise matches that.")}
                </Text>
              ) : null}
            </YStack>
          </Sheet.ScrollView>

          <XStack p="$4" pb={bottomPad} borderTopWidth={1} borderColor="$borderStrong">
            <AppButton onPress={close}>{t("common.done", "Done")}</AppButton>
          </XStack>
        </Sheet.Frame>
      </Sheet>
    </>
  );
}
