import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ExercisePickerSheet } from "@/components/quests/ExercisePickerSheet";
import { SetAsideToggle } from "@/components/quests/SetAsideToggle";
import { rankSwapCandidates, type SwapReason } from "@/constants/exerciseFilters";
import { type Exercise, listExercises, pickableExercises } from "@/db/exercises";
import { preferences } from "@/db/preferences";
import { useSetAside } from "@/hooks/useSetAside";
import { reportError } from "@/src/reportError";

/**
 * The replacement of the movement in a slot, during a session: the effort screen and the rest
 * screen open the same sheet. Ladder rungs first, then the same pattern, then the family
 * (`rankSwapCandidates`), and what the hero set aside is never offered back.
 *
 * It owns the loading of the catalogue, the ranking, the "leave it out" choice and its write
 * (`setAside`); it never touches the session. What a pick does to the session is the screen's
 * `onPick`: the effort screen swaps at once, the rest screen resumes first, because a paused
 * session refuses to swap. The sheet closes itself after `onPick`.
 */
export function SessionSwapSheet({
  open,
  onOpenChange,
  slot,
  onPick,
  language,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  /** The slot being replaced: its movement is the one the candidates are ranked against. */
  slot: { exercise: Exercise };
  onPick: (exercise: Exercise) => void;
  language: Parameters<typeof ExercisePickerSheet>[0]["language"];
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  // Loaded when the screen mounts, not when the sheet opens: the moment a hero reaches for this is
  // the moment they are stuck, and a spinner there is the worst possible time. `listExercises()`
  // is promise-cached, so this is free after the first read anywhere in the app. Both screens mount
  // the sheet closed, so the list is ready when it is asked for.
  const [catalogue, setCatalogue] = useState<Exercise[]>([]);
  const [owned, setOwned] = useState<ReadonlySet<string> | null>(null);
  const [setAsideIds, setSetAsideIds] = useState<ReadonlySet<number>>(new Set());
  const [leaveOut, setLeaveOut] = useState(false);
  const { setAside } = useSetAside();

  useEffect(() => {
    let alive = true;
    Promise.all([
      listExercises(),
      preferences.getOwnedEquipment(),
      preferences.getSetAsideExercises(),
    ])
      .then(([all, equipment, aside]) => {
        if (!alive) return;
        setCatalogue(all);
        setOwned(equipment === null ? null : new Set(equipment));
        setSetAsideIds(new Set(aside.map((e) => e.id)));
      })
      .catch((e) => reportError("session.catalogue", e));
    return () => {
      alive = false;
    };
  }, []);

  const candidates = open
    ? rankSwapCandidates(pickableExercises(catalogue), slot.exercise, owned as never).filter(
        // After the ranking: a set-aside rung removed first would cut the ladder walk at the gap.
        (c) => !setAsideIds.has(c.exercise.id),
      )
    : [];
  const reasons = new Map(candidates.map((c) => [c.exercise.id, c.reason] as const));

  const reasonLabel = (reason: SwapReason | null | undefined): string | null => {
    if (reason === "easier") return t("quests.swap_reason_easier");
    if (reason === "harder") return t("quests.swap_reason_harder");
    if (reason === "same_pattern") return t("quests.swap_reason_pattern");
    if (reason === "same_family") return t("quests.swap_reason_family");
    return null;
  };

  return (
    <ExercisePickerSheet
      exercises={candidates.map((c) => c.exercise)}
      pickedIds={[slot.exercise.id]}
      language={language}
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setLeaveOut(false);
      }}
      title={t("quests.swap_exercise")}
      header={<SetAsideToggle exercise={slot.exercise} checked={leaveOut} onToggle={setLeaveOut} />}
      onPick={(exercise) => {
        if (leaveOut) {
          const left = slot.exercise;
          // Offered again in this sheet when it is not set aside after all: the write failed, or
          // the toast's "Put back" undid it. The swap itself stands, it was a choice of its own.
          const offerAgain = () =>
            setSetAsideIds((prev) => new Set([...prev].filter((id) => id !== left.id)));
          setSetAsideIds((prev) => new Set([...prev, left.id]));
          setAside(left, offerAgain)
            .then((ok) => {
              if (!ok) offerAgain();
            })
            .catch(() => {
              // Reported by `useSetAside`, which never rejects.
            });
        }
        onPick(exercise);
        onOpenChange(false);
        setLeaveOut(false);
      }}
      captionFor={(exercise) => reasonLabel(reasons.get(exercise.id))}
      bottomInset={insets.bottom}
      pickAction={null}
    />
  );
}
