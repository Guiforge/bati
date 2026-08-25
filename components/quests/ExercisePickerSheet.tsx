import { Check, Search, X } from "@tamagui/lucide-icons";
import type { ReactNode } from "react";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Platform, Pressable } from "react-native";
import { Input, Sheet, Text, XStack, YStack } from "tamagui";

import { AppButton } from "@/components/common/AppButton";
import { ExerciseRow } from "@/components/exercises/ExerciseRow";
import { MineCaption } from "@/components/exercises/MineCaption";
import { getExerciseThumb } from "@/constants/assetMap";
import { filterExercises, NO_EXERCISE_FILTERS } from "@/constants/exerciseFilters";
import { ADMIN_CREATOR, type Exercise } from "@/db/exercises";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { localizedName } from "@/src/i18n/localized";
import type { AppLanguage } from "@/stores/settings";

/** The picker never filters on the ladder, so it has nothing to look one up in. */
const EMPTY_LADDER: ReadonlyMap<number, unknown> = new Map();

type Props = {
  /**
   * Rendered in the order given — the caller decides what "best first" means. The editor passes
   * the catalogue as it comes; a substitution passes it ranked. Keeping the ordering out here is
   * what lets one sheet serve both without growing a mode.
   */
  exercises: Exercise[];
  /**
   * Already in the quest, one entry per pick. Shown as a count on the row, never filtered out:
   * removing the tapped row made every row below jump up under the finger, so a second tap
   * landed on whatever slid into place. A circuit may also repeat a movement on purpose.
   */
  pickedIds: number[];
  language: AppLanguage;
  /** Controlled: the trigger belongs to the screen, because its label names the screen's action. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  onPick: (exercise: Exercise) => void;
  /** Adding builds a list, so the sheet stays open; replacing is one decision, so it closes. */
  closeOnPick?: boolean;
  /** The row's right-hand affordance — a `+` on an add, a swap glyph on a replace. */
  pickAction: ReactNode;
  /**
   * A third line per row, e.g. why a substitute is being offered — the text, not an element.
   *
   * Deliberately not a `ReactNode`: the hero badge below is a *nullish* fallback, and a caller
   * returning `<Caption reason={undefined} />` — an element that renders nothing — wins the
   * coalesce all the same. Every unranked candidate then lost the badge that tells a hero's
   * "Dead Bug" from seed content's. A string can only be empty or absent, and both are nullish.
   */
  captionFor?: (exercise: Exercise) => string | null;
  bottomInset: number;
};

/**
 * The catalogue as a picker. Shared by the quest editor, where picking repeatedly builds a quest,
 * and by substitution, where one pick replaces one slot.
 */
export function ExercisePickerSheet({
  exercises,
  pickedIds,
  language,
  open,
  onOpenChange,
  title,
  onPick,
  closeOnPick = false,
  pickAction,
  captionFor,
  bottomInset,
}: Props) {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();
  const [search, setSearch] = useState("");

  // Android reports a 0 bottom inset even where the system gesture area eats taps.
  const bottomPad = Math.max(bottomInset, Platform.OS === "android" ? 24 : 0) + 10;

  // Closing resets the search: it used to survive, so reopening showed a list still filtered by
  // a word the hero had long forgotten typing, with no visible cue why most exercises were gone.
  const close = useCallback(() => {
    onOpenChange(false);
    setSearch("");
  }, [onOpenChange]);

  // The catalogue's filter, with only the search facet set: one name-matching rule for both
  // screens, and it goes through `localizedName` rather than a fifteenth inline ternary.
  const results = useMemo(
    () => filterExercises(exercises, { ...NO_EXERCISE_FILTERS, search }, language, EMPTY_LADDER),
    [exercises, language, search],
  );

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
    <Sheet
      modal
      open={open}
      onOpenChange={(next: boolean) => (next ? onOpenChange(true) : close())}
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
              {title}
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
              const name = localizedName(exercise, language);
              const caption = captionFor?.(exercise);

              return (
                <ExerciseRow
                  key={exercise.id}
                  exercise={exercise}
                  language={language}
                  thumb={assetByExerciseId.get(exercise.id)}
                  borderColor={picked > 0 ? "$primaryText" : "$borderStrong"}
                  accessibilityLabel={
                    picked > 0
                      ? `${name}, ${t("quests.editor_added_count", { count: picked })}`
                      : name
                  }
                  caption={
                    // The caller's caption wins — a substitution explains *why* it is offering
                    // this movement, which beats saying who wrote it. Otherwise: a hero may own
                    // a name seed content also owns, and two identical rows are unpickable.
                    caption ? (
                      <Text fontSize={12} fontWeight="700" color="$primaryText" numberOfLines={1}>
                        {caption}
                      </Text>
                    ) : exercise.creator === ADMIN_CREATOR ? undefined : (
                      <MineCaption />
                    )
                  }
                  onPress={() => {
                    onPick(exercise);
                    if (closeOnPick) close();
                  }}
                  trailing={
                    <>
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
                      {pickAction}
                    </>
                  }
                />
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
  );
}
