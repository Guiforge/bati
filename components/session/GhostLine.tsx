import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Text, XStack } from "tamagui";
import { GameIcon } from "@/components/common/GameIcon";
import type { ExerciseGhost } from "@/db/personalRecords";
import type { QuestTargetType } from "@/db/schema";
import { formatTarget } from "@/db/targets";
import { useHaptics } from "@/hooks/useHaptics";

/**
 * What the hero already did on this movement, and the moment they pass it.
 *
 * Lifted out of `ActiveExerciseView` for two reasons. It is the one part of that screen with a
 * state change of its own, and the screen cannot be mounted in a test for under forty seconds
 * (see the note in `__tests__/session-outing-view.test.tsx`), so the behaviour that matters here
 * was untestable while it lived there. It is also the only node on that screen that changes
 * height mid-set, which is a thing to keep in one place.
 *
 * The record half is the whole point of the component. Everything needed to say "this beats your
 * best" was already on this screen: the counter says 50s, the line under it says best 45s, and
 * the app stayed silent until the victory screen four movements later, where a reward is
 * attributed to the victory screen rather than to the set that earned it.
 */
export function GhostLine({
  ghost,
  type,
  live,
  reducedMotion,
}: {
  ghost: ExerciseGhost;
  /** The slot's unit. Reps and seconds are separate records on one movement (`ghostKey`). */
  type: QuestTargetType;
  /**
   * The value this set would log right now: the adjusted reps, or the seconds elapsed. It is what
   * the hero is about to commit rather than what they have committed, which is the point. A hold
   * that has already passed the best should say so while it is still being held, and a hero who
   * taps the reps back down has not set a record.
   */
  live: number;
  reducedMotion: boolean;
}) {
  const { t } = useTranslation();
  const { success } = useHaptics();

  const beatsBest = live > ghost.best;

  // The phone is on the floor under a plank, so the crossing gets a buzz as well as a stamp.
  //
  // On the edge only, and the ref starts at the mounted value rather than at `false`, which
  // settles two cases at once. This re-renders on every tick of the session clock and a hold
  // stays past its record for as long as the hero holds it, so a buzz per render would be a
  // rattle. And a rep slot whose prescribed target already sits above the best opens with the
  // stamp showing: nothing was crossed there, the set simply started ahead.
  const wasBeating = useRef(beatsBest);
  useEffect(() => {
    if (beatsBest && !wasBeating.current) success();
    wasBeating.current = beatsBest;
  }, [beatsBest, success]);

  return (
    // A floor rather than a height: the stamp is a pill and the plain line is bare text, so
    // without this the column jumps the instant the record falls, mid-set, on the screen whose
    // one rule is that nothing may move under the hero's thumb. `flexWrap` still lets a narrow
    // screen grow past it.
    <XStack items="baseline" justify="center" gap="$2" flexWrap="wrap" minH={30}>
      {beatsBest ? (
        // The same register as `DamageBurst`: a bordered pill over the screen's own ground,
        // entering once, silent under reduced motion. It replaces the line it beats instead of
        // being stacked over it, so nothing covers the counter or the button, and the number the
        // hero was chasing turns into the number they now hold, in the same place.
        //
        // Gold is never the only signal here: the trophy and the word carry it for a reader who
        // cannot see the colour.
        <XStack
          items="center"
          // The row above aligns on the baseline, which is what keeps the plain line's 12px labels
          // sitting with its 15px figures. A pill has no business on that baseline.
          self="center"
          gap="$2"
          px="$3"
          py="$1"
          rounded="$10"
          bg="$bgOverlay"
          borderWidth={1}
          borderColor="$resourceGold"
          transition={reducedMotion ? undefined : "bouncy"}
          enterStyle={reducedMotion ? undefined : { opacity: 0, scale: 0.6 }}
        >
          <GameIcon name="trophy" size={14} color="$resourceGold" />
          {/* "Past your best", not "New record". The number here is the one the set *would* log,
              and a hero who taps the reps back down has set nothing: the word the victory screen
              spends on a record that actually happened is worth more if this screen does not
              spend it first on a promise. True in both units and at both moments, which is the
              other half of it, because a hold past its best has already done the thing while a
              rep count past it has not. */}
          <Text fontSize={12} fontWeight="700" color="$resourceGold">
            {t("session.ghost_record_label", "Past your best")}
          </Text>
          <Text fontSize={15} fontWeight="700" color="$text">
            {formatTarget({ type, value: live })}
          </Text>
        </XStack>
      ) : (
        <>
          {/* The word and the number no longer weigh the same. This used to be one flat grey
              sentence at 12px, so "La dernière fois 12 · record 15" asked the hero to read a
              line to find two figures, mid-set, which is the one moment reading is expensive.
              The labels stay quiet; the numbers step up a size and take the full text colour,
              and the best takes the gold this app already spends on progression everywhere
              else.

              Composed rather than interpolated, which is also why the two phrasings collapsed
              into one. On a first-ever session `last` and `best` are the same number and
              "last time 12 · best 12" reads like a bug, so the best half simply does not
              render, instead of a second sentence existing to say the same thing. */}
          <Text fontSize={12} color="$textSecondary">
            {t("session.ghost_last_label", "Last time")}
          </Text>
          <Text fontSize={15} fontWeight="700" color="$text">
            {formatTarget({ type, value: ghost.last })}
          </Text>
          {ghost.best > ghost.last ? (
            <>
              <Text fontSize={12} color="$textSecondary" opacity={0.5}>
                ·
              </Text>
              <Text fontSize={12} color="$textSecondary">
                {t("session.ghost_best_label", "best")}
              </Text>
              <Text fontSize={15} fontWeight="700" color="$resourceGold">
                {formatTarget({ type, value: ghost.best })}
              </Text>
            </>
          ) : null}
        </>
      )}
    </XStack>
  );
}
