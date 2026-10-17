import {
  formatClock,
  formatDistance,
  formatElevation,
  formatRate,
  formatRateAt,
  rateKind,
} from "@/constants/distanceFormat";
import { DEFAULT_VIEW, type OutingMetric, type OutingView } from "@/constants/outingDisplay";
import { isOutdoors, isOutingSession } from "@/db/expeditions";
import type { DistanceUnit } from "@/db/preferences";
import type { Locomotion } from "@/db/schema";
import type { OutingGoal, TrackState } from "@/src/gps/track";

/**
 * The figures of a live outing, as pure functions of the track: which ones the hero's view puts in
 * which place, and the text of each. The panel and the notification both read them, so the two
 * cannot tell different stories about the same outing.
 */

/**
 * What an outing reads, frozen when it begins (`beginTrackingIfOuting`): the hero's choices for
 * the activity really done, plus the three facts the screen needs from the quest. A setting
 * changed mid-outing does not reach it; a resume after a kill reads it again.
 */
export type LiveView = OutingView & {
  /** The tab of "Affichage des sorties" this outing reads, and the word and unit of its rate. */
  locomotion: Locomotion;
  /** A walk-run is paced by the coach: no rate, ever. */
  walkRun: boolean;
  /** Whether the hero chose to keep the screen on for this activity, on this phone. */
  keepAwake: boolean;
};

export const DEFAULT_LIVE_VIEW: LiveView = {
  ...DEFAULT_VIEW,
  locomotion: "walk",
  walkRun: false,
  keepAwake: false,
};

export type FigureContext = {
  track: TrackState;
  /** `recordedDurationSeconds()`: the clock the hero and the journal read. */
  recordedSeconds: number;
  recentSpeedMps: number | null;
  goal: OutingGoal | null;
  goalReached: boolean;
  unit: DistanceUnit;
  language: string;
  locomotion: Locomotion;
  walkRun: boolean;
};

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
export function liveRate(
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

/** Whether a metric has nothing true to say yet, and so takes no place. */
function absent(metric: OutingMetric, ctx: FigureContext): boolean {
  const { track } = ctx;
  switch (metric) {
    case "time":
      return false;
    case "distance":
      return track.startedAt === null;
    case "rate":
    case "rateAvg":
      return track.startedAt === null || ctx.walkRun;
    case "climb":
      return track.climbFrom === null;
    case "remaining":
      return ctx.goal === null || ctx.goalReached;
  }
}

export type ResolvedPlaces = {
  big: OutingMetric;
  /** The big number carries its word under it whenever the hero chose it (D-35 Q6). */
  bigLabelled: boolean;
  small: OutingMetric[];
};

const SMALL_PLACES = 3;

/**
 * Which metric sits in which place, from the hero's view and what exists right now.
 *
 * `auto` in the big place is what the panel always did: the distance for a distance goal, the
 * clock otherwise, and the clock for everyone while the sky is being found (`0 m` in display type
 * is a verdict). In a small place it is the one of time and distance the big is not; a big that is
 * neither leaves the one the goal does not lead with, so the two are both on screen.
 */
export function resolvePlaces(view: OutingView, ctx: FigureContext): ResolvedPlaces {
  const acquiring = ctx.track.startedAt === null;
  const autoBig: OutingMetric = !acquiring && ctx.goal?.type === "distance" ? "distance" : "time";

  const chosen: OutingMetric = view.big === "auto" ? autoBig : view.big;
  const big: OutingMetric = acquiring || absent(chosen, ctx) ? "time" : chosen;
  const bigLabelled = view.big !== "auto";
  if (acquiring) return { big, bigLabelled, small: [] };

  const autoSmall = otherOfTimeAndDistance(big, autoBig);
  const small: OutingMetric[] = [];
  for (const place of view.small) {
    const metric = place === "auto" ? autoSmall : place;
    if (metric === null || metric === big || small.includes(metric) || absent(metric, ctx))
      continue;
    small.push(metric);
    if (small.length === SMALL_PLACES) break;
  }
  return { big, bigLabelled, small };
}

/** The one of time and distance the big is not; a big that is neither leaves the one `auto` did not lead with. */
function otherOfTimeAndDistance(big: OutingMetric, autoBig: OutingMetric): OutingMetric {
  const lead = big === "time" || big === "distance" ? big : autoBig;
  return lead === "time" ? "distance" : "time";
}

/**
 * The text of one metric. `live` is the panel's: the rate is the last twenty seconds. The
 * notification is not live, it is read minutes apart from a pocket, and says the average.
 */
export function figureText(metric: OutingMetric, ctx: FigureContext, live: boolean): string {
  const { track, unit, language, locomotion } = ctx;
  switch (metric) {
    case "time":
      return formatClock(ctx.recordedSeconds * 1000);
    case "distance":
      return formatDistance(track.distanceM, unit, language);
    case "rate":
      return live
        ? liveRate(track, ctx.recentSpeedMps, unit, language, locomotion)
        : formatRate(track.distanceM, track.movingMs, unit, language, locomotion);
    case "rateAvg":
      return formatRate(track.distanceM, track.movingMs, unit, language, locomotion);
    case "climb":
      return formatElevation(track.ascentM, unit);
    case "remaining": {
      const goal = ctx.goal;
      if (goal === null) return "...";
      // Moving seconds, the clock `goalReached` and the goal bar read.
      return goal.type === "distance"
        ? formatDistance(Math.max(0, goal.metres - track.distanceM), unit, language)
        : formatClock(Math.max(0, goal.seconds * 1000 - track.movingMs));
    }
  }
}

/**
 * Whether the phone's screen stays on for this session: a mixed quest holds it for the push-ups
 * whatever the setting says, a pure outing only when the hero chose it for this activity. The one
 * answer, read by the screen lock, the pocket guard and the pocket hint.
 */
export function screenStaysOn(
  quest: Parameters<typeof isOutingSession>[0],
  view: Pick<LiveView, "keepAwake">,
): boolean {
  return !isOutingSession(quest) || view.keepAwake;
}

/**
 * Whether ending takes a confirmation and the map ignores fingers: the screen stays on, so a
 * pocket is awake, and the slot is a walk or a run (a ride has a handlebar and gloves). A mixed
 * quest's walk or run leg is guarded too: its screen is held for the push-ups whatever the
 * setting says.
 */
export function pocketGuarded(
  quest: Parameters<typeof screenStaysOn>[0],
  slot: { exercise: { style: Parameters<typeof isOutdoors>[0]; locomotion: Locomotion | null } },
  view: Pick<LiveView, "keepAwake">,
): boolean {
  const onFoot = (slot.exercise.locomotion ?? "walk") !== "ride";
  return isOutdoors(slot.exercise.style) && onFoot && screenStaysOn(quest, view);
}

/** The word for a metric, as a locale key. The rate follows the activity read (`rateKind`). */
export function metricLabelKey(metric: OutingMetric, locomotion: Locomotion): string {
  switch (metric) {
    case "time":
      return "quests.config_duration";
    case "distance":
      return "session.expedition_ground";
    case "rate":
      return `session.expedition_${rateKind(locomotion)}`;
    case "rateAvg":
      return `session.expedition_${rateKind(locomotion)}_avg`;
    case "climb":
      return "session.expedition_climb";
    case "remaining":
      return "session.expedition_remaining";
  }
}
