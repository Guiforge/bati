import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { XStack } from "tamagui";
import { AppText } from "@/components/common/AppText";
import { GameIcon } from "@/components/common/GameIcon";
import type { ExerciseGhost } from "@/db/personalRecords";
import { beatInputOf, isOldRecord, toBeat } from "@/db/progress";
import type { QuestTargetType } from "@/db/schema";
import { formatTarget, perSideLabel } from "@/db/targets";
import { useHaptics } from "@/hooks/useHaptics";
import { useSettingsStore } from "@/stores/settings";

/**
 * What the hero already did on this movement, and the moment they pass it.
 *
 * Lifted out of `ActiveExerciseView` for two reasons. It is the one part of that screen with a
 * state change of its own, and the screen cannot be mounted in a test for under forty seconds
 * (see the note in `__tests__/session-outing-view.test.tsx`), so the behaviour that matters here
 * was untestable while it lived there. It is also the only node on that screen that changes
 * height mid-set, which is a thing to keep in one place.
 *
 * "Last time" is always there: the target above it is where tonight starts, and what the hero did
 * last time is the number that target is read against. The other half is the "to beat" of the
 * record wall (`toBeat`, one rule for the wall, the set and Home), and the stamp replaces only that
 * half.
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
  objective,
  now,
  perSide = false,
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
  /**
   * What the app asks tonight, already the big number on the screen. The coach's rule (double
   * progression, light week, return after a pause) set it, so "to beat" is never offered above it:
   * the record stays a fact (the stamp, the victory), it is not an invitation past the rule.
   */
  objective: number;
  /** Read once by the screen, not per tick: it decides whether the record has aged. */
  now: Date;
  /**
   * One side then the other (`0068`): every figure here is one side's, as the line above the
   * counter says. Said once, after the last figure, so the line stays one line at a large font.
   */
  perSide?: boolean;
  reducedMotion: boolean;
}) {
  const { t } = useTranslation();
  const language = useSettingsStore((s) => s.language);
  const { success } = useHaptics();

  const beat = toBeat(beatInputOf(ghost), now);
  const beatsBest = live >= beat;
  const aged = isOldRecord(beatInputOf(ghost), now);

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
    <XStack items="baseline" justify="center" gap="2" flexWrap="wrap" minH={30}>
      {/* The labels stay quiet; the numbers step up a size and take the full text colour. */}
      <AppText fontSize={12} color="textSecondary">
        {t("session.ghost_last_label")}
      </AppText>
      <AppText fontSize={15} fontWeight="700" color="text">
        {perSideLabel(
          formatTarget({ type, value: ghost.last }, language),
          perSide && !beatsBest && beat >= objective,
          language,
        )}
      </AppText>
      {beatsBest ? (
        // The same register as `DamageBurst`: a bordered pill over the screen's own ground,
        // entering once, silent under reduced motion. It replaces the "to beat" half and nothing
        // else, so nothing covers the counter or the button and "last time" stays where the
        // hero reads their target against it.
        //
        // Gold is never the only signal here: the trophy and the word carry it for a reader who
        // cannot see the colour.
        <XStack
          items="center"
          // The row above aligns on the baseline, which is what keeps the plain line's 12px labels
          // sitting with its 15px figures. A pill has no business on that baseline.
          self="center"
          gap="2"
          px="3"
          py="1"
          rounded="10"
          bg="bgOverlay"
          borderWidth={1}
          borderColor="resourceGold"
          transition={reducedMotion ? undefined : "bouncy"}
          opacity={reducedMotion ? undefined : "enter:0"}
          scale={reducedMotion ? undefined : "enter:0.6"}
        >
          <GameIcon name="trophy" size={14} color="resourceGold" />
          {/* "Past your best", not "New record". The number here is the one the set *would* log,
              and a hero who taps the reps back down has set nothing. Past an aged record it is
              the season's best that was passed, and the word says so. */}
          <AppText fontSize={12} fontWeight="700" color="resourceGold">
            {t(aged ? "session.ghost_season_label" : "session.ghost_record_label")}
          </AppText>
          <AppText fontSize={15} fontWeight="700" color="text">
            {perSideLabel(formatTarget({ type, value: live }, language), perSide, language)}
          </AppText>
        </XStack>
      ) : beat < objective ? (
        <>
          <AppText fontSize={12} color="textSecondary" opacity={0.5}>
            ·
          </AppText>
          <AppText fontSize={12} color="textSecondary">
            {t("session.ghost_to_beat_label")}
          </AppText>
          <AppText fontSize={15} fontWeight="700" color="resourceGold">
            {perSideLabel(formatTarget({ type, value: beat }, language), perSide, language)}
          </AppText>
        </>
      ) : null}
    </XStack>
  );
}
