import { type ReactNode, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Linking } from "react-native";
import { Paragraph, Text, XStack, YStack } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { Card } from "@/components/common/Card";
import { Mountain } from "@/components/icons";
import {
  formatClock,
  formatDistance,
  formatElevation,
  formatRate,
  formatRateAt,
  rateKind,
} from "@/constants/distanceFormat";
import { formatDuration } from "@/db/estimate";
import { outingLocomotion } from "@/db/expeditions";
import type { DistanceUnit } from "@/db/preferences";
import type { Locomotion } from "@/db/schema";
import { useSessionTimer } from "@/hooks/useSessionTimer";
import type { OutingGoal, TrackState } from "@/src/gps/track";
import { reportError } from "@/src/reportError";
import { useExpeditionStore } from "@/stores/expedition";
import { recordedDurationSeconds, useSessionStore } from "@/stores/session";
import { useSettingsStore } from "@/stores/settings";

/**
 * Which of the states the readout is in, as a locale key.
 *
 * "No signal" used to be told for four different problems. `stores/expedition` sets `error` to
 * `unavailable` when the native module is missing, to `permission` when the hero refused the
 * prompt, and to whatever the service reports, so a hero who denied the prompt walked forty
 * minutes being told their phone had no reception. The two the hero can fix say so; the rest
 * genuinely are no signal from where the hero stands.
 */
function statusKey(error: string | null, track: TrackState, goalReached: boolean): string {
  if (error !== null) {
    if (error === "permission" || error === "foreground-denied") {
      return "session.expedition_status_denied";
    }
    // Location switched off mid-walk. The notification has always said this word; the panel used
    // to keep saying "On the road" over figures that had stopped moving.
    if (error === "gps-off") return "session.expedition_gps_off";
    return "session.expedition_status_error";
  }
  if (track.startedAt === null) return "session.expedition_status_acquiring";
  // Ahead of paused: a hero who met the goal and stopped wants the first fact, not the second.
  if (goalReached) return "session.expedition_reached";
  return track.paused ? "session.expedition_status_paused" : "session.expedition_status_moving";
}

/**
 * What a hero sees while they are out.
 *
 * Numbers, under the map `LiveMap` draws in the slot the movement's picture takes on every other
 * set. The screen is still never held awake on an outing: it dominates the power draw of a
 * session far more than the GPS chip does, so the map only costs while the hero is looking. See
 * docs/designs/map-immersion.md § The live map.
 *
 * Everything here reads the live store rather than the fixes: `stores/expedition` folds each
 * fix through the reducer as it lands, and a second derivation on this screen would be a second
 * answer to "how far have I gone".
 */
/**
 * The metres climbed so far, between the second figure and the pace.
 *
 * Only once the receiver has given a height: a phone that reports none would otherwise show a
 * flat "0 m" for a walk up a hill.
 */
function Climb({
  track,
  unit,
  color,
}: {
  track: TrackState;
  unit: DistanceUnit;
  color: "$text" | "$textSecondary";
}) {
  const { t } = useTranslation();
  if (track.climbFrom === null) return null;
  return (
    <Reading label={t("session.expedition_climb")}>
      <XStack items="center" gap="$1">
        <Mountain size={16} color={color} />
        <Text
          testID="expedition-climb"
          fontSize={20}
          fontWeight="700"
          color={color}
          style={{ fontVariant: ["tabular-nums"] }}
        >
          {formatElevation(track.ascentM, unit)}
        </Text>
      </XStack>
    </Reading>
  );
}

/** How long the "you can put the phone away" line stays, in seconds of recorded walking. */
const POCKET_HINT_SECONDS = 30;

/** Under this, a reported speed is a standstill: a slow walk is 1 m/s, a stop wobbles near 0. */
const STILL_SPEED_MPS = 0.3;

/**
 * The pace (or speed) of the last twenty seconds, not of the whole outing.
 *
 * The average is a figure that stops moving: after an hour, a hard four hundred metres shifts it
 * by six seconds per kilometre, so the panel answered "how fast has this walk been" to a hero
 * asking "how fast am I going". The average is still what the recap prints, where looking back is
 * the point. Falls back to it while the window is empty, which is the first few seconds and any
 * receiver that reports no speed at all.
 *
 * And while the receiver swears to a standstill the reducer does not see. Some report a speed of
 * 0 with every fix (the emulator does, always), and the panel read "..." for a whole ride that
 * was covering ground. Standing still for real is the auto-pause's call, and once it holds the
 * instant reading is the honest one again.
 */
function liveRate(
  track: TrackState,
  recentSpeedMps: number | null,
  unit: DistanceUnit,
  language: string,
  locomotion: Locomotion | null,
): string {
  const receiverSaysStopped =
    recentSpeedMps !== null && recentSpeedMps < STILL_SPEED_MPS && !track.paused;
  return recentSpeedMps === null || receiverSaysStopped
    ? formatRate(track.distanceM, track.movingMs, unit, language, locomotion)
    : formatRateAt(recentSpeedMps, unit, language, locomotion);
}

/**
 * How far into the goal, in the unit the goal was set in. "261 m" said nothing about whether that
 * was a warm-up for 15 km or most of a 300 m stroll: the hero had to remember the number they
 * picked on another screen. The track is the bar's parent and always renders with it, so the
 * percentage always measures the same node.
 */
function GoalBar({
  goal,
  metres,
  seconds,
  reached,
}: {
  goal: OutingGoal | null;
  metres: number;
  seconds: number;
  reached: boolean;
}) {
  const { t } = useTranslation();
  const unit = useSettingsStore((state) => state.distanceUnit);
  const language = useSettingsStore((state) => state.language);
  // A free outing has nothing to measure against.
  if (goal === null) return null;
  const distance = goal.type === "distance";
  const target = distance ? goal.metres : goal.seconds;
  // A typed goal can round to zero; an empty bar beats a NaN width.
  const share = target > 0 ? Math.min(1, (distance ? metres : seconds) / target) : 0;
  const label = distance
    ? formatDistance(goal.metres, unit, language)
    : formatDuration(goal.seconds, language);
  return (
    <YStack gap="$2" testID="expedition-goal">
      <YStack height={4} rounded="$10" bg="$bgOverlay" overflow="hidden">
        <YStack
          height={4}
          testID="expedition-goal-fill"
          width={`${share * 100}%`}
          bg={reached ? "$success" : "$text"}
          opacity={reached ? 1 : 0.55}
        />
      </YStack>
      <Text fontSize={15} color="$textSecondary">
        {t("session.expedition_goal_of", { goal: label })}
      </Text>
    </YStack>
  );
}

/** A figure and the word for it underneath, at the size a glance from a handlebar can still read. */
function Reading({
  label,
  end = false,
  children,
}: {
  label: string;
  end?: boolean;
  children: ReactNode;
}) {
  return (
    <YStack items={end ? "flex-end" : "flex-start"} gap="$1">
      {children}
      <Text fontSize={13} color="$textSecondary">
        {label}
      </Text>
    </YStack>
  );
}

export function ExpeditionPanel() {
  const { t } = useTranslation();
  const track = useExpeditionStore((state) => state.track);
  const error = useExpeditionStore((state) => state.error);
  const lastFix = useExpeditionStore((state) => state.lastFix);
  const recentSpeedMps = useExpeditionStore((state) => state.recentSpeedMps);
  const goalReached = useExpeditionStore((state) => state.goalReached);
  const unit = useSettingsStore((state) => state.distanceUnit);
  const language = useSettingsStore((state) => state.language);
  const goal = useSessionStore((state) => state.goal);
  /**
   * The same answer the saved row's `outing` holds, so the speed read here is the shape the
   * victory screen, the recap and the journal print afterwards. Read per slot, a ride leg of a
   * walk-and-ride quest showed km/h live and a pace for the same outing one screen later.
   */
  const locomotion = useSessionStore((state) =>
    state.quest === null ? null : outingLocomotion(state.quest),
  );

  /**
   * One line, and it never lies by omission. A blank readout while the sky is being found looks
   * exactly like a broken one, and on a de-Googled ROM the first fix can take minutes.
   */
  const key = statusKey(error, track, goalReached);
  const status = t(key);
  const acquiring = track.startedAt === null;
  /** The one error the hero can undo, and only from a screen this app cannot draw. */
  const denied = key === "session.expedition_status_denied";

  /**
   * Auto-pause is correct and, until this, unexplained: at a crossing the figures freeze and
   * nothing says the clock stopped on purpose. Dimming them together is what the status line
   * already did alone, and movement returning them to full colour is the un-pause.
   */
  const figureColor = track.paused ? "$textSecondary" : "$text";

  /**
   * How long the session will be *recorded* as, which is not what the session timer reads.
   *
   * `useSessionTimer` is only the pulse here. Its value restarts at zero after a resume, because
   * `useSessionRecovery` pushes `timerStartTimestamp` forward by the whole dead time, so a hero
   * who came back to a 45-minute walk would watch the panel say `0:12` while the victory screen
   * and the journal both said 45 min. `recordedDurationSeconds()` reads the trace, and it is the
   * one rule those two already read. One rule, three readers.
   *
   * Frozen while the auto-pause holds: `credited` counts elapsed time from the last fix, and a
   * standing hero still gets fixes, so without this the big figure keeps climbing under the words
   * "Standing still" and cancels them.
   */
  const { elapsedSeconds } = useSessionTimer();
  const [recorded, setRecorded] = useState(recordedDurationSeconds);
  // biome-ignore lint/correctness/useExhaustiveDependencies: the timer is the pulse, not the value, so the body deliberately never reads it
  useEffect(() => {
    if (!track.paused) setRecorded(recordedDurationSeconds());
  }, [elapsedSeconds, track.paused]);

  const clock = formatClock(recorded * 1000);
  const distance = formatDistance(track.distanceM, unit, language);
  const pace = liveRate(track, recentSpeedMps, unit, language, locomotion);

  /**
   * The big figure carries the unit the hero set out in: metres when the goal is metres, the
   * clock otherwise. While the sky is being found there is no distance to carry, whatever the
   * goal says, so the clock takes the slot for everyone. `0 m` at 56px is a verdict in display
   * type, and on a phone with no SUPL it is a verdict the hero reads for minutes.
   */
  const distanceLeads = !acquiring && goal?.type === "distance";
  const [bigFigure, secondFigure, secondKey] = distanceLeads
    ? [distance, clock, "quests.config_duration"]
    : [clock, distance, "session.expedition_ground"];

  return (
    <Card p="$4" gap="$3">
      <Text
        fontSize={56}
        fontWeight="700"
        color={figureColor}
        style={{ fontVariant: ["tabular-nums"] }}
      >
        {bigFigure}
      </Text>

      {acquiring ? null : (
        // Moving seconds, the clock `goalReached` reads: the recorded total counts red lights,
        // and filled the bar minutes before the goal was met.
        <GoalBar
          goal={goal}
          metres={track.distanceM}
          seconds={Math.floor(track.movingMs / 1000)}
          reached={goalReached}
        />
      )}

      {/* Two values, never three: the total in 56px and the moving time in 24 are two durations
          with no label between them, minutes apart on an urban walk, and nothing on the card
          says which one the journal will keep. Moving time lives on the recap.

          Each with its word under it: "2:18", "0 m" and "..." side by side left a hero guessing
          which was the climb and what the dots were waiting for. */}
      {acquiring ? null : (
        <XStack justify="space-between" items="flex-start">
          <Reading label={t(secondKey)}>
            <Text
              fontSize={24}
              fontWeight="700"
              color={figureColor}
              style={{ fontVariant: ["tabular-nums"] }}
            >
              {secondFigure}
            </Text>
          </Reading>
          <Climb track={track} unit={unit} color={figureColor} />
          <Reading label={t(`session.expedition_${rateKind(locomotion)}`)} end>
            <Text
              testID="expedition-rate"
              fontSize={20}
              fontWeight="700"
              color={figureColor}
              style={{ fontVariant: ["tabular-nums"] }}
            >
              {pace}
            </Text>
          </Reading>
        </XStack>
      )}

      {/* The thin band: the status in words, and the accuracy beside it. Worth keeping while the
          sky is being found, it is the one thing on screen that visibly improves. 15 px, not 13:
          it is the line that says the clock stopped on purpose, read at arm's length. */}
      <XStack items="center" gap="$2" flexWrap="wrap">
        <Text fontSize={15} color={track.paused || error !== null ? "$textSecondary" : "$text"}>
          {status}
        </Text>
        {lastFix ? (
          <Paragraph fontSize={15} color="$textSecondary">
            {/* Through the same formatter as the distance above, and for the same reason: a hero
                walking in feet was reading "1.2 mi" over "within 8 m", two units on one line,
                from the one file that is allowed to convert. */}
            {t("session.expedition_accuracy", {
              distance: formatDistance(lastFix.acc, unit, language),
            })}
          </Paragraph>
        ) : null}
      </XStack>

      {/* The sentence that keeps a hero from deciding the app is broken while nothing moves. */}
      {acquiring && error === null ? (
        <Paragraph fontSize={13} color="$textSecondary">
          {t("session.expedition_acquiring_hint")}
        </Paragraph>
      ) : null}

      {/* And the one that keeps them from deciding it broke when the screen goes dark.

          Every other session in this app holds the screen awake; an outing deliberately does not,
          so the phone sleeps in a pocket and Android locks it. Unannounced, a black screen during
          a GPS walk reads as "the tracking stopped", the hero takes the phone out to check, and
          the battery this was all for is spent on looking. Said once, early, and gone by the time
          it would be clutter. */}
      {!acquiring && error === null && recorded < POCKET_HINT_SECONDS ? (
        <Paragraph fontSize={13} color="$textSecondary">
          {t("session.expedition_pocket_hint")}
        </Paragraph>
      ) : null}

      {/* "Location is off for Bati" was the whole screen: true, and a dead end. The grant lives
          in Android's own settings and nothing in the app can ask for it a second time once it
          has been refused for good. */}
      {denied ? (
        <AppButton
          variant="outline"
          backgroundColor="$surface2"
          onPress={() =>
            Linking.openSettings().catch((e: unknown) => reportError("expedition.openSettings", e))
          }
          accessibilityRole="button"
          accessibilityLabel={t("session.expedition_open_settings")}
        >
          {t("session.expedition_open_settings")}
        </AppButton>
      ) : null}
    </Card>
  );
}
