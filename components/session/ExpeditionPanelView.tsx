import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Linking } from "react-native";
import { Paragraph, XStack, YStack } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { AppText } from "@/components/common/AppText";
import { Card } from "@/components/common/Card";
import { Mountain } from "@/components/icons";
import { formatDistance } from "@/constants/distanceFormat";
import type { OutingMetric, RateKind } from "@/constants/outingDisplay";
import { formatDuration } from "@/db/estimate";
import {
  type FigureContext,
  figureContext,
  figureText,
  type LiveView,
  metricLabelKey,
  resolvePlaces,
} from "@/src/gps/liveFigures";
import type { OutingGoal, TrackState } from "@/src/gps/track";
import { reportError } from "@/src/reportError";
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

/** How long the "you can put the phone away" line stays, in seconds of recorded walking. */
const POCKET_HINT_SECONDS = 30;

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
      <AppText fontSize={15} color="$textSecondary">
        {t("session.expedition_goal_of", { goal: label })}
      </AppText>
    </YStack>
  );
}

/**
 * A figure and the word for it underneath, at the size a glance from a handlebar can still read.
 * `bare` is the big number the hero never chose: it has always stood without a word.
 */
function Reading({
  label,
  end = false,
  bare = false,
  children,
}: {
  label: string;
  end?: boolean;
  bare?: boolean;
  children: ReactNode;
}) {
  if (bare) return <>{children}</>;
  return (
    <YStack items={end ? "flex-end" : "flex-start"} gap="$1">
      {children}
      <AppText fontSize={13} color="$textSecondary">
        {label}
      </AppText>
    </YStack>
  );
}

/** The text size of the big figure: the big-figures layout sets it larger. */
const BIG_SIZE = { normal: 56, large: 72 } as const;

/**
 * The big figure and, when the hero chose it, its word. Read by the panel and by the chip floating
 * on the big map, from one context, so the two cannot show different numbers.
 */
export function BigReading({
  ctx,
  view,
  fontSize,
  empty = false,
  testID,
}: {
  ctx: FigureContext;
  view: LiveView;
  fontSize: number;
  empty?: boolean;
  testID?: string;
}) {
  const { t } = useTranslation();
  const places = resolvePlaces(view, ctx);
  return (
    <Reading label={t(metricLabelKey(places.big, view.rate))} bare={!places.bigLabelled}>
      <AppText
        testID={testID}
        variant="display"
        fontSize={fontSize}
        fontWeight="700"
        color={ctx.track.paused ? "$textSecondary" : "$text"}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.5}
        style={{ fontVariant: ["tabular-nums"] }}
      >
        {empty ? "-" : figureText(places.big, ctx, true)}
      </AppText>
    </Reading>
  );
}

/**
 * The small figures, each with its word under it: "2:18", "0 m" and "..." side by side left a
 * hero guessing which was the climb and what the dots were waiting for. In the big-numbers layout
 * they stack, one per line, bigger. Moving time lives on the recap.
 */
function SmallFigures({
  metrics,
  text,
  rate,
  stacked,
  color,
}: {
  metrics: OutingMetric[];
  text: (metric: OutingMetric) => string;
  rate: RateKind;
  stacked: boolean;
  color: "$text" | "$textSecondary";
}) {
  const { t } = useTranslation();
  return (
    <XStack
      justify="space-between"
      items="flex-start"
      flexDirection={stacked ? "column" : "row"}
      gap={stacked ? "$3" : undefined}
    >
      {metrics.map((metric, index) => (
        <Reading
          key={metric}
          label={t(metricLabelKey(metric, rate))}
          end={!stacked && index === metrics.length - 1 && index > 0}
        >
          <XStack items="center" gap="$1">
            {metric === "climb" ? <Mountain size={16} color={color} /> : null}
            <AppText
              testID={`expedition-${metric}`}
              variant="display"
              fontSize={stacked ? 32 : index === 0 ? 24 : 20}
              fontWeight="700"
              color={color}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.5}
              style={{ fontVariant: ["tabular-nums"] }}
            >
              {text(metric)}
            </AppText>
          </XStack>
        </Reading>
      ))}
    </XStack>
  );
}

/**
 * What is said about the measuring itself: the status in words, the accuracy, and the sentences
 * that keep a hero from deciding the app is broken. A preview has none of it.
 */
function StatusBand({
  track,
  error,
  lastFix,
  goalReached,
  recordedSeconds: recorded,
  showPocketHint,
}: {
  track: TrackState;
  error: string | null;
  lastFix: { acc: number } | null;
  goalReached: boolean;
  recordedSeconds: number;
  showPocketHint: boolean;
}) {
  const { t } = useTranslation();
  const unit = useSettingsStore((state) => state.distanceUnit);
  const language = useSettingsStore((state) => state.language);
  const key = statusKey(error, track, goalReached);
  const status = t(key);
  const acquiring = track.startedAt === null;
  /** The one error the hero can undo, and only from a screen this app cannot draw. */
  const denied = key === "session.expedition_status_denied";
  return (
    <>
      {/* The thin band: the status in words, and the accuracy beside it. Worth keeping while the
        sky is being found, it is the one thing on screen that visibly improves. 15 px, not 13:
        it is the line that says the clock stopped on purpose, read at arm's length. */}
      <XStack items="center" gap="$2" flexWrap="wrap">
        <AppText fontSize={15} color={track.paused || error !== null ? "$textSecondary" : "$text"}>
          {status}
        </AppText>
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

        Every other session in this app holds the screen awake; an outing does not unless the hero
        chose it (`screenStaysOn`), so the phone sleeps in a pocket and Android locks it. Unannounced, a black screen during
        a GPS walk reads as "the tracking stopped", the hero takes the phone out to check, and
        the battery this was all for is spent on looking. Said once, early, and gone by the time
        it would be clutter. */}
      {!acquiring && error === null && recorded < POCKET_HINT_SECONDS && showPocketHint ? (
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
    </>
  );
}

/**
 * The panel as a function of its props, so the settings screen can draw it from the hero's last
 * outing with the very components a live outing uses (`preview`). Live, it is fed by
 * `ExpeditionPanel`; in the preview there is no status line, no accuracy and no hint, because
 * nothing is being measured, and `empty` swaps every figure for a dash: nothing invented.
 */
export function ExpeditionPanelView({
  view,
  track,
  error = null,
  lastFix = null,
  recentSpeedMps = null,
  goal = null,
  goalReached = false,
  recordedSeconds,
  showPocketHint = false,
  preview = false,
  empty = false,
  lapFromMs = null,
  hideBig = false,
}: {
  view: LiveView;
  track: TrackState;
  error?: string | null;
  lastFix?: { acc: number } | null;
  recentSpeedMps?: number | null;
  goal?: OutingGoal | null;
  goalReached?: boolean;
  recordedSeconds: number;
  showPocketHint?: boolean;
  preview?: boolean;
  empty?: boolean;
  /** Where the current league started; the settings preview has no live lap and leaves it null. */
  lapFromMs?: number | null;
  /** The big figure floats on the map instead (`bigMap`): the panel keeps everything else. */
  hideBig?: boolean;
}) {
  const unit = useSettingsStore((state) => state.distanceUnit);
  const language = useSettingsStore((state) => state.language);

  const acquiring = track.startedAt === null;

  /**
   * Auto-pause is correct and, until this, unexplained: at a crossing the figures freeze and
   * nothing says the clock stopped on purpose. Dimming them together is what the status line
   * already did alone, and movement returning them to full colour is the un-pause.
   */
  const figureColor = track.paused ? "$textSecondary" : "$text";

  const recorded = recordedSeconds;
  const ctx = figureContext(
    { view, track, recentSpeedMps, goal, goalReached, recordedSeconds: recorded, lapFromMs },
    unit,
    language,
  );
  const text = (metric: OutingMetric) => (empty ? "-" : figureText(metric, ctx, true));
  const places = resolvePlaces(view, ctx);
  const bigFigures = view.layout === "bigFigures";

  return (
    <Card p="$4" gap="$3">
      {hideBig ? null : (
        <BigReading
          ctx={ctx}
          view={view}
          fontSize={bigFigures ? BIG_SIZE.large : BIG_SIZE.normal}
          empty={empty}
          testID="expedition-big"
        />
      )}

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

      {acquiring || places.small.length === 0 ? null : (
        <SmallFigures
          metrics={places.small}
          text={text}
          rate={view.rate}
          stacked={bigFigures}
          color={figureColor}
        />
      )}

      {preview ? null : (
        <StatusBand
          track={track}
          error={error}
          lastFix={lastFix}
          goalReached={goalReached}
          recordedSeconds={recordedSeconds}
          showPocketHint={showPocketHint}
        />
      )}
    </Card>
  );
}
