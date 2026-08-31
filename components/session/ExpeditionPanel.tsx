import { useTranslation } from "react-i18next";
import { Paragraph, Text, XStack } from "tamagui";
import { Card } from "@/components/common/Card";
import { formatDistance, formatPace } from "@/constants/distanceFormat";
import { useExpeditionStore } from "@/stores/expedition";
import { useSettingsStore } from "@/stores/settings";

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
  const unit = useSettingsStore((state) => state.distanceUnit);

  const movingMinutes = Math.floor(track.movingMs / 60000);
  const movingSeconds = Math.floor(track.movingMs / 1000) % 60;

  /**
   * One line, and it never lies by omission. A blank readout while the sky is being found looks
   * exactly like a broken one, and on a de-Googled ROM the first fix can take minutes.
   */
  const status = error
    ? t("session.expedition_status_error")
    : track.startedAt === null
      ? t("session.expedition_status_acquiring")
      : track.paused
        ? t("session.expedition_status_paused")
        : t("session.expedition_status_moving");

  return (
    <Card p="$4" gap="$3">
      <Text fontSize={56} fontWeight="700" color="$text" style={{ fontVariant: ["tabular-nums"] }}>
        {formatDistance(track.distanceM, unit)}
      </Text>

      <XStack justify="space-between" items="baseline">
        <Text
          fontSize={24}
          fontWeight="700"
          color="$text"
          style={{ fontVariant: ["tabular-nums"] }}
        >
          {movingMinutes}:{String(movingSeconds).padStart(2, "0")}
        </Text>
        <Text fontSize={20} fontWeight="700" color="$textSecondary">
          {formatPace(track.distanceM, track.movingMs, unit)}
        </Text>
      </XStack>

      <XStack items="center" gap="$2">
        <Text fontSize={13} color={track.paused || error ? "$textSecondary" : "$text"}>
          {status}
        </Text>
        {lastFix ? (
          <Paragraph fontSize={13} color="$textSecondary">
            {t("session.expedition_accuracy", { metres: Math.round(lastFix.acc) })}
          </Paragraph>
        ) : null}
      </XStack>
    </Card>
  );
}
