import {
  formatClock,
  formatDistance,
  formatElevation,
  formatRate,
  formatRateAt,
} from "@/constants/distanceFormat";
import {
  DEFAULT_VIEW,
  type OutingMetric,
  type OutingView,
  type RateKind,
} from "@/constants/outingDisplay";
import { isOutdoors, isOutingSession } from "@/db/expeditions";
import type { DistanceUnit } from "@/db/preferences";
import type { Locomotion } from "@/db/schema";
import { METRES_PER_LEAGUE, type OutingGoal, type TrackState } from "@/src/gps/track";

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
  /** The tab of "Affichage des sorties" this outing reads: the activity really done. */
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
  /** Pace or speed, the hero's choice for this activity, frozen with the rest of the view. */
  rate: RateKind;
  /** A walk-run is paced by the coach: no rate, ever. */
  walkRun: boolean;
  /** Where the current league started on the moving clock, `null` where there is no live lap. */
  lapFromMs: number | null;
};

/** Where the current league started, on the moving clock: a high-water mark, like `leaguesCrossed`. */
export type Lap = { league: number; fromMs: number };
export const LAP_START: Lap = { league: 0, fromMs: 0 };

/**
 * The lap after one more fix. High-water: a pause refund that brings `distanceM` back under the
 * league does not move it back, and the resume replay lands on the reducer's own figure.
 */
export function nextLap(lap: Lap, track: TrackState): Lap {
  const league = Math.floor(track.distanceM / METRES_PER_LEAGUE);
  return league > lap.league ? { league, fromMs: track.movingMs } : lap;
}

/** What a figure needs from the live outing to be read. The one place the context is built. */
export type FigureSource = {
  view: LiveView;
  track: TrackState;
  recentSpeedMps: number | null;
  goal: OutingGoal | null;
  goalReached: boolean;
  recordedSeconds: number;
  lapFromMs: number | null;
};

export function figureContext(
  source: FigureSource,
  unit: DistanceUnit,
  language: string,
): FigureContext {
  return {
    track: source.track,
    recordedSeconds: source.recordedSeconds,
    recentSpeedMps: source.recentSpeedMps,
    goal: source.goal,
    goalReached: source.goalReached,
    unit,
    language,
    rate: source.view.rate,
    walkRun: source.view.walkRun,
    lapFromMs: source.lapFromMs,
  };
}

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
  kind: RateKind,
): string {
  const receiverSaysStopped =
    recentSpeedMps !== null && recentSpeedMps < STILL_SPEED_MPS && !track.paused;
  return recentSpeedMps === null || receiverSaysStopped
    ? formatRate(track.distanceM, track.movingMs, unit, language, kind)
    : formatRateAt(recentSpeedMps, unit, language, kind);
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
    case "lap":
      return false;
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
  const { track, unit, language, rate } = ctx;
  switch (metric) {
    case "time":
      return formatClock(ctx.recordedSeconds * 1000);
    case "distance":
      return formatDistance(track.distanceM, unit, language);
    case "rate":
      return live
        ? liveRate(track, ctx.recentSpeedMps, unit, language, rate)
        : formatRate(track.distanceM, track.movingMs, unit, language, rate);
    case "rateAvg":
      return formatRate(track.distanceM, track.movingMs, unit, language, rate);
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
    case "lap":
      // Accepted: a stop of 40 s or more makes this climb, then fall back when the reducer takes
      // its advance back. `rateAvg` does the same, and the table times on the same clock.
      return ctx.lapFromMs === null
        ? "-"
        : formatClock(Math.max(0, track.movingMs - ctx.lapFromMs));
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

/** The word for a metric, as a locale key. The rate word follows pace or speed. */
export function metricLabelKey(metric: OutingMetric, rate: RateKind): string {
  switch (metric) {
    case "time":
      return "quests.config_duration";
    case "distance":
      return "session.expedition_ground";
    case "rate":
      return `session.expedition_${rate}`;
    case "rateAvg":
      return `session.expedition_${rate}_avg`;
    case "climb":
      return "session.expedition_climb";
    case "remaining":
      return "session.expedition_remaining";
    case "lap":
      return "session.expedition_lap";
  }
}
