import { useTranslation } from "react-i18next";
import { Paragraph, Text, XStack } from "tamagui";
import { Card } from "@/components/common/Card";
import { formatDistance, formatPace } from "@/constants/distanceFormat";
import type { TrackState } from "@/src/gps/track";
import { useExpeditionStore } from "@/stores/expedition";
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
    return error === "permission" || error === "foreground-denied"
      ? "session.expedition_status_denied"
      : "session.expedition_status_error";
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
export function ExpeditionPanel() {
  const { t } = useTranslation();
  const track = useExpeditionStore((state) => state.track);
  const error = useExpeditionStore((state) => state.error);
  const lastFix = useExpeditionStore((state) => state.lastFix);
  const goalReached = useExpeditionStore((state) => state.goalReached);
  const unit = useSettingsStore((state) => state.distanceUnit);

  const movingMinutes = Math.floor(track.movingMs / 60000);
  const movingSeconds = Math.floor(track.movingMs / 1000) % 60;

  /**
   * One line, and it never lies by omission. A blank readout while the sky is being found looks
   * exactly like a broken one, and on a de-Googled ROM the first fix can take minutes.
   */
  const status = t(statusKey(error, track, goalReached));
  const acquiring = track.startedAt === null;

  /**
   * Auto-pause is correct and, until this, unexplained: at a crossing the three figures freeze
   * and nothing says the clock stopped on purpose. Dimming them together is what the status line
   * already did alone, and movement returning them to full colour is the un-pause.
   */
  const figureColor = track.paused ? "$textSecondary" : "$text";

  return (
    <Card p="$4" gap="$3">
      {acquiring ? (
        /* A loading state must not assert. `0 m` at 56px is a verdict in display type, and on a
           phone with no SUPL it is a verdict the hero reads for minutes, so the figures wait
           and the status takes the slot they had. */
        <>
          <Text fontSize={32} fontWeight="700" color="$text">
            {status}
          </Text>
          {error === null ? (
            <Paragraph fontSize={13} color="$textSecondary">
              {t("session.expedition_acquiring_hint")}
            </Paragraph>
          ) : null}
        </>
      ) : (
        <>
          <Text
            fontSize={56}
            fontWeight="700"
            color={figureColor}
            style={{ fontVariant: ["tabular-nums"] }}
          >
            {formatDistance(track.distanceM, unit)}
          </Text>

          <XStack justify="space-between" items="baseline">
            <Text
              fontSize={24}
              fontWeight="700"
              color={figureColor}
              style={{ fontVariant: ["tabular-nums"] }}
            >
              {movingMinutes}:{String(movingSeconds).padStart(2, "0")}
            </Text>
            <Text fontSize={20} fontWeight="700" color={figureColor}>
              {formatPace(track.distanceM, track.movingMs, unit)}
            </Text>
          </XStack>
        </>
      )}

      {/* Acquiring already said it above, in display type. What is left down here is the
          accuracy, which is worth keeping while the sky is being found: it is the one thing on
          screen that visibly improves. */}
      {acquiring && lastFix === null ? null : (
        <XStack items="center" gap="$2">
          {acquiring ? null : (
            <Text fontSize={13} color={track.paused || error !== null ? "$textSecondary" : "$text"}>
              {status}
            </Text>
          )}
          {lastFix ? (
            <Paragraph fontSize={13} color="$textSecondary">
              {t("session.expedition_accuracy", { metres: Math.round(lastFix.acc) })}
            </Paragraph>
          ) : null}
        </XStack>
      )}
    </Card>
  );
}
