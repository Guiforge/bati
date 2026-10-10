import { MAX_BUILDING_LEVEL } from "@/constants/buildingLevels";
import { buildingDefinitions, type ExerciseStyle, type MuscleCode } from "./schema";
import type { VillageBuilding } from "./village";

/** How many of the latest sessions that fed a building the average reads. */
export const MILESTONE_WINDOW = 5;

/**
 * What each of the latest sessions brought, per thing that raises a building, oldest first: work
 * units for a muscle or a style, leagues for the outings. Only sessions that brought something.
 */
export type RecentFeeds = {
  muscle: Partial<Record<MuscleCode, number[]>>;
  style: Partial<Record<ExerciseStyle, number[]>>;
  outing: number[];
};

export type Milestone = {
  /** The rank the building reaches. */
  rank: number;
  /** At least 1: "in about 0 sessions" is never a sentence. */
  count: number;
  unit: "sessions" | "outings";
  /** What the sessions are of: a muscle or a style. Outings need none. */
  subject: { muscle: MuscleCode } | { style: ExerciseStyle } | null;
};

type Rising = Pick<
  VillageBuilding,
  "code" | "level" | "driver" | "metricValue" | "nextTarget" | "exactValue"
>;

/** What lacks over what a typical recent session brings, rounded up; null with no average to go by. */
export function sessionsToGo(missing: number, recent: readonly number[]): number | null {
  const last = recent.slice(-MILESTONE_WINDOW);
  if (last.length === 0 || missing <= 0) return null;
  const average = last.reduce((sum, n) => sum + n, 0) / last.length;
  if (!(average > 0)) return null;
  // The epsilon keeps 3 / 1.5 = 2.0000000000000004 from becoming 3.
  return Math.max(1, Math.ceil(missing / average - 1e-9));
}

/**
 * When a building next rises, in sessions or in outings: what it lacks for the next rank over the
 * average of the latest 5 sessions that fed it, rounded up. Null when there is nothing honest to
 * say: the top rank, a building that nothing has fed yet, and the buildings that do not advance
 * with sessions.
 *
 * Those are the deeds (the Lair, the Hall, the Arena: a finished campaign, a replay, a route) and
 * the starter and upgrade buildings (they follow the hero's level or another building). A deed
 * lands once in weeks, so no average of recent sessions says when; the village's own XP bar
 * already covers the starters.
 */
export function nextMilestone(b: Rising, feeds: RecentFeeds): Milestone | null {
  if (b.nextTarget === null || b.level >= MAX_BUILDING_LEVEL) return null;
  const feed = feedOf(b, feeds);
  if (feed === null) return null;
  const count = sessionsToGo(b.nextTarget - (b.exactValue ?? b.metricValue), feed.recent);
  return count === null
    ? null
    : { rank: b.level + 1, count, unit: feed.unit, subject: feed.subject };
}

/** What raises this building and what the latest sessions of it brought; null when sessions do not. */
function feedOf(
  b: Rising,
  feeds: RecentFeeds,
): { recent: number[]; unit: Milestone["unit"]; subject: Milestone["subject"] } | null {
  const def = buildingDefinitions[b.code];
  if (b.driver === "leagues") return { recent: feeds.outing, unit: "outings", subject: null };
  if (b.driver === "muscle" && def.relatedMuscle) {
    const muscle = def.relatedMuscle;
    return { recent: feeds.muscle[muscle] ?? [], unit: "sessions", subject: { muscle } };
  }
  if (b.driver === "style") {
    const style = def.relatedStyle ?? "strength";
    return { recent: feeds.style[style] ?? [], unit: "sessions", subject: { style } };
  }
  return null;
}

/** What one session brought: the muscles and styles it did work for, and whether it left the walls. */
export type SessionFed = { muscles: MuscleCode[]; styles: ExerciseStyle[]; outing: boolean };

/**
 * The building the victory screen names: among those THIS session fed, the one whose rank is
 * nearest in sessions (the Forge for a strength session, the Grand Chemin for an outing). A tie goes
 * to the earlier building in `buildings`, the Village's own fixed order. Null when the session fed
 * nothing that has an estimate; the caller then falls back to the Village's "Next to rise".
 */
export function pickSessionMilestone<B extends Rising>(
  buildings: readonly B[],
  feeds: RecentFeeds,
  fed: SessionFed,
): { building: B; milestone: Milestone } | null {
  let best: { building: B; milestone: Milestone } | null = null;
  for (const building of buildings) {
    const m = nextMilestone(building, feeds);
    if (m === null) continue;
    const def = buildingDefinitions[building.code];
    const nourished =
      m.unit === "outings"
        ? fed.outing
        : m.subject !== null && "muscle" in m.subject
          ? fed.muscles.some((x) => x === def.relatedMuscle)
          : m.subject !== null && fed.styles.includes(m.subject.style);
    if (nourished && (best === null || m.count < best.milestone.count)) {
      best = { building, milestone: m };
    }
  }
  return best;
}
