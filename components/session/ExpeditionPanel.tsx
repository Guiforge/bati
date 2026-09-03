import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Linking } from "react-native";
import { Paragraph, Text, XStack } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { Card } from "@/components/common/Card";
import { formatClock, formatDistance, formatPace } from "@/constants/distanceFormat";
import { useSessionTimer } from "@/hooks/useSessionTimer";
import type { TrackState } from "@/src/gps/track";
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
 * Numbers and nothing else, which is a battery decision before it is a design one: the screen
 * dominates the power draw of a session far more than the GPS chip does, so the map waits for
 * the recap where it can be looked at once. See docs/designs/gps-without-google.md.
 *
 * Everything here reads the live store rather than the fixes: `stores/expedition` folds each
 * fix through the reducer as it lands, and a second derivation on this screen would be a second
 * answer to "how far have I gone".
 */
/** How long the "you can put the phone away" line stays, in seconds of recorded walking. */
const POCKET_HINT_SECONDS = 30;

export function ExpeditionPanel() {
  const { t } = useTranslation();
  const track = useExpeditionStore((state) => state.track);
  const error = useExpeditionStore((state) => state.error);
  const lastFix = useExpeditionStore((state) => state.lastFix);
  const goalReached = useExpeditionStore((state) => state.goalReached);
  const unit = useSettingsStore((state) => state.distanceUnit);
  const goal = useSessionStore((state) => state.goal);

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
  const distance = formatDistance(track.distanceM, unit);
  const pace = formatPace(track.distanceM, track.movingMs, unit);

  /**
   * The big figure carries the unit the hero set out in: metres when the goal is metres, the
   * clock otherwise. While the sky is being found there is no distance to carry, whatever the
   * goal says, so the clock takes the slot for everyone. `0 m` at 56px is a verdict in display
   * type, and on a phone with no SUPL it is a verdict the hero reads for minutes.
   */
  const distanceLeads = !acquiring && goal?.type === "distance";
  const bigFigure = distanceLeads ? distance : clock;
  const secondFigure = distanceLeads ? clock : distance;

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

      {/* Two values, never three: the total in 56px and the moving time in 24 are two durations
          with no label between them, minutes apart on an urban walk, and nothing on the card
          says which one the journal will keep. Moving time lives on the recap. */}
      {acquiring ? null : (
        <XStack justify="space-between" items="baseline">
          <Text
            fontSize={24}
            fontWeight="700"
            color={figureColor}
            style={{ fontVariant: ["tabular-nums"] }}
          >
            {secondFigure}
          </Text>
          <Text fontSize={20} fontWeight="700" color={figureColor}>
            {pace}
          </Text>
        </XStack>
      )}

      {/* The thin band: the status in words, and the accuracy beside it. Worth keeping while the
          sky is being found, it is the one thing on screen that visibly improves. */}
      <XStack items="center" gap="$2">
        <Text fontSize={13} color={track.paused || error !== null ? "$textSecondary" : "$text"}>
          {status}
        </Text>
        {lastFix ? (
          <Paragraph fontSize={13} color="$textSecondary">
            {/* Through the same formatter as the distance above, and for the same reason: a hero
                walking in feet was reading "1.2 mi" over "within 8 m", two units on one line,
                from the one file that is allowed to convert. */}
            {t("session.expedition_accuracy", { distance: formatDistance(lastFix.acc, unit) })}
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
