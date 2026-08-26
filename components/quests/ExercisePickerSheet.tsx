import { Check, Search, X } from "@tamagui/lucide-icons";
import type { ReactNode } from "react";
import { useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Keyboard, Platform, Pressable, type ScrollView } from "react-native";
import { Input, Sheet, ScrollView as TamaguiScrollView, Text, XStack, YStack } from "tamagui";

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
   * Rendered in the order given — the caller decides what "best first" means. The editor leads
   * with what the hero wrote (`heroFirst`); a substitution passes its own ranking, which must
   * not be reshuffled. Keeping the ordering out here is what lets one sheet serve both without
   * growing a mode.
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

  // Nothing else ever moves the list, and neither a close nor a narrowing search clamps its
  // offset: reopening the picker landed mid-catalogue, and a search that cut 34 rows to 3 left
  // them — and the "nothing matches" line — above the fold, so the sheet read as empty.
  const listRef = useRef<ScrollView>(null);
  const toTop = useCallback(() => listRef.current?.scrollTo({ y: 0, animated: false }), []);

  // Closing resets the search: it used to survive, so reopening showed a list still filtered by
  // a word the hero had long forgotten typing, with no visible cue why most exercises were gone.
  // `Keyboard.dismiss()` is what makes that reset stick: the sheet leaves, its search input keeps
  // the focus, and every keystroke after — the hero typing at the screen behind — lands back in a
  // box nobody can see. That is how a picker reopened pre-filled with "ZZZ" and no rows.
  const close = useCallback(() => {
    Keyboard.dismiss();
    onOpenChange(false);
    setSearch("");
    toTop();
  }, [onOpenChange, toTop]);

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
      // ponytail: drag-to-dismiss off, because the drag is what breaks the sheet. Scrolling the
      // list hands part of the gesture to the pane, which drifts down and never returns to its
      // snap point; from there a close leaves the frame *painted where it drifted* with `open`
      // already false — a corpse of a picker whose rows still show, answer nothing, and let taps
      // fall through to the "Save quest" button behind (measured: the title sat 291px low, and a
      // tap on a row raised "Your quest needs a name"). That is the "stranded mid-screen" note
      // this file carried, blamed on `flex` and never actually fixed. With the drag off,
      // `scrollBridge.drag` stays the no-op default and the pane cannot leave its snap point.
      // Three deliberate exits remain: the X, "Done", and hardware back. Revisit when a Tamagui
      // bump fixes the pane strand — `dismissOnSnapToBottom` goes back with it.
      disableDrag
      transition={reducedMotion ? undefined : "quick"}
      zIndex={100_000}
    >
      <Sheet.Overlay
        bg="rgba(0,0,0,0.5)"
        transition={reducedMotion ? undefined : "quick"}
        enterStyle={{ opacity: 0 }}
        exitStyle={{ opacity: 0 }}
      />
      {/* No handle: it is the universal "drag me" mark, and with the drag off it would promise a
          gesture that no longer answers — a control wired to nothing. */}
      {/* Nothing to set here: `createSheet` already gives the frame `flex={1}` and
          `height={frameSize}` before spreading these props. The stranding this once tried to fix
          by dropping a `flex` was the pane drift above, and `VillageDetailSheet` was never the
          reference — it is `snapPointsMode="fit"` with no ScrollView, so no pan to lose to. */}
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
              onChangeText={(next) => {
                setSearch(next);
                toTop();
              }}
              placeholder={t("quests.editor_search", "Search")}
              bg="$background"
              borderColor="$borderStrong"
              color="$text"
            />
            <Search size={18} color="$textSecondary" />
          </XStack>
        </YStack>

        {/* A plain scroll view, not `Sheet.ScrollView`: that one exists to feed the sheet's drag,
            which is off above, and it keeps a `lastPageY` it never resets between gestures. The
            first move of any new touch is therefore compared against where the *previous* gesture
            ended, reads as >10px, and the scroll view seizes the responder — cancelling the row's
            press. So the first tap did nothing and the second, landing within 10px of the first,
            worked. Measured: one tap on "Tractions", no badge; the identical tap again, added. */}
        <TamaguiScrollView ref={listRef} flex={1} px="$4" keyboardShouldPersistTaps="handled">
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
        </TamaguiScrollView>

        <XStack p="$4" pb={bottomPad} borderTopWidth={1} borderColor="$borderStrong">
          <AppButton onPress={close}>{t("common.done", "Done")}</AppButton>
        </XStack>
      </Sheet.Frame>
    </Sheet>
  );
}
