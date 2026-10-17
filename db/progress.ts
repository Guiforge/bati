import { type SQL, sql } from "drizzle-orm";
import type { ExerciseGhost } from "./personalRecords";
import type { DifficultyCode, QuestTargetType } from "./schema";
import { clampToRange, USER_LEVEL_MULTIPLIER } from "./targets";

/**
 * The one place a movement's progress is defined (roadmap M-01, "Brique A"). Nothing here is
 * stored: sync carries `completed_exercises`, and every device derives the same figures. It is a
 * shared SQL fragment and not a view, because `validateBackup` refuses a backup holding a view
 * and any migration stops `mergePeer` between two versions. Pure: no db client, no schema value.
 *
 * Readers that ask a per-movement question (`getMovementRecords`, the oath) keep their direct
 * aggregate: the per-session fold is 5-7x slower for them. Readers that cut on a set's own time
 * (the wall's firsts and season, `previousBest`, the ladder window) filter sets before any fold.
 */

/**
 * "Did this set meet what the app asked": against the prescription (0070), else the handed
 * target. A set with neither never meets. The one copy; `MIN()` of it over a session is "every
 * set met", and each reader filters `ladderNeutral` sets out in its own WHERE.
 */
// Raw column names on purpose: `${completedExercises.x}` would read the schema at import, and the
// suites that mock the client with half a schema fail to load. Only used where
// `completed_exercises` is the sole table in scope, so the names are unambiguous.
export const setMetSql = sql<number>`CASE WHEN COALESCE(prescribedValue, targetValue) IS NOT NULL
  AND resultValue >= COALESCE(prescribedValue, targetValue) THEN 1 ELSE 0 END`;

/**
 * One row per (movement, unit, session): its best set and when its last set was logged.
 * `where` filters SETS, before the fold, so a reader that cuts on a set's own time keeps its exact
 * meaning. Columns: exerciseId, resultType, sessionId, best, at (seconds, raw, no mapper),
 * prescribed (what the app asked that night) and met (1 every non-neutral set met it, 0 one did
 * not, NULL every set was `ladderNeutral`), which `progressiveTarget` reads.
 */
export function sessionBestsSql(where: SQL): SQL {
  // A row from before 0070 has no `prescribedValue`, so `prescribed` falls back to `targetValue`,
  // which was the hero's own number when they had set one: the first M-03 session after the
  // update can anchor once on a hand-set figure, and every row since carries the app's.
  return sql`SELECT exerciseId, resultType, sessionId,
                    MAX(resultValue) AS best, MAX(performedAt) AS at,
                    MAX(COALESCE(prescribedValue, targetValue)) AS prescribed,
                    MIN(CASE WHEN ladderNeutral = 0 THEN ${setMetSql} END) AS met
             FROM completed_exercises WHERE ${where}
             GROUP BY exerciseId, resultType, sessionId`;
}

/**
 * What beats a record: one more in the movement's own unit. A rep for reps, a second for a hold.
 * A movement never logged is beaten by anything at all, so its target is one.
 */
export function targetToBeat(best: number | null): number {
  return best == null ? 1 : best + 1;
}

const DAY_MS = 24 * 60 * 60 * 1000;
/** How far back "this season" reaches, for a movement whose record has aged. */
export const SEASON_DAYS = 90;
/** A record older than this is an old debt, and the wall says so. */
export const STALE_RECORD_DAYS = 60;

/** The fields the "to beat" rule reads; a `WallEntry` satisfies it. */
export type BeatInput = {
  best: number | null;
  last: number | null;
  seasonBest: number | null;
  recordAt: Date | null;
};

/**
 * Whether a record has aged past being tonight's target: set long ago, and not matched this
 * season. A record first reached ten months ago and equalled last week is still within reach.
 */
export function isOldRecord(entry: BeatInput, now: Date): boolean {
  return (
    entry.recordAt != null &&
    now.getTime() - entry.recordAt.getTime() > STALE_RECORD_DAYS * DAY_MS &&
    (entry.seasonBest == null || entry.best == null || entry.seasonBest < entry.best)
  );
}

/** The one adapter the set and Home use, so they feed `toBeat` exactly what the wall feeds it. */
export function beatInputOf(ghost: ExerciseGhost): BeatInput {
  return {
    best: ghost.best,
    last: ghost.last,
    seasonBest: ghost.seasonBest,
    recordAt: new Date(ghost.bestAt),
  };
}

/**
 * Roadmap "aBattre": the number that beats the row tonight. A recent record is beaten by one more.
 * An old one is not a target for tonight: its season's best is, or the last result when the season
 * has none. The wall, the set (`GhostLine`) and Home all read this one (D-21), the last two through
 * `beatInputOf`.
 */
export function toBeat(entry: BeatInput, now: Date): number {
  if (entry.best == null) return targetToBeat(null);
  if (!isOldRecord(entry, now)) return targetToBeat(entry.best);
  return targetToBeat(entry.seasonBest ?? entry.last ?? entry.best);
}

/** Sessions meeting the target before the next variation is considered earned. */
export const PROGRESSION_SESSIONS_REQUIRED = 3;

/**
 * How many of the most recent sessions in a row met their target, capped at what a rung asks for.
 *
 * The run at the head, not a count: `[hit, miss, hit]` used to read as 2, and "1 more time" was
 * then a lie, because one more clean session makes `[hit, hit, miss]`, still not earned.
 */
export function streakOf(flags: readonly boolean[]): number {
  const miss = flags.indexOf(false);
  return Math.min(miss === -1 ? flags.length : miss, PROGRESSION_SESSIONS_REQUIRED);
}

/**
 * Roadmap "positionSurVoie": where a rung leads, the index in `chain` the hero stands at.
 * Recency still decides what opens *upwards* (`getNextProgression`, the victory screen). It no
 * longer decides the floor: under the old rule, a hero who climbed to push-ups and stopped doing
 * wall push-ups was sent back to the wall eight weeks later (exercise sheet audit, 2026-09-15).
 *
 * The one reader of "where does the hero stand", shared by `getChainTo` and `currentRungFor` so
 * the path card and the quest slot can never disagree.
 *
 * ponytail: one clean session on a rung puts everything below it behind the hero. "Clean" is
 * measured against what the app prescribed since `0070` (`setMetSql`), so a lowered target no
 * longer buys it. A hero's own quest still sets its own bar: tighten that if rungs get skipped.
 */
export function ladderPosition(
  chain: readonly number[],
  everEarned: ReadonlySet<number>,
  recentFlags: ReadonlyMap<number, boolean[]>,
): number {
  let behind = 0;
  chain.forEach((id, index) => {
    if (everEarned.has(id)) behind = index + 1;
    else if (recentFlags.get(id)?.some(Boolean)) behind = Math.max(behind, index);
  });
  return behind;
}

// ------------------------------------------------------------
// Tonight's target (roadmap M-03)
// ------------------------------------------------------------

/** +1 rep per set, +5 s per hold. */
export const TARGET_STEP = { reps: 1, time: 5 } as const;
/** "Plafond": the progression stops here, and the victory offers the rung above. */
export const TARGET_CAP = { reps: 20, time: 60 } as const;
/** A hold is never prescribed above this share of its record. */
export const HOLD_RECORD_FRACTION = 0.75;
/** More than this many days without the movement is a comeback. */
export const COMEBACK_GAP_DAYS = 14;
/** Sessions at the cap before the victory offers the rung above. */
export const CAP_SESSIONS = 3;
/** One level down, for a comeback. Easy has no level under it and takes medium's step. */
const COMEBACK_LOWER: Record<DifficultyCode, number> = { hard: 0.8, medium: 0.75, easy: 0.75 };

/** One session on one movement in one unit, as `progressiveTarget` reads it from the journal. */
export type SessionMark = {
  /** What the app prescribed that night. Null: nothing was (a row from before 0070 with no target). */
  prescribed: number | null;
  /** Every non-neutral set met it. Null when every set was `ladderNeutral`. */
  met: boolean | null;
  /** The session's last set, ms. */
  at: number;
  /** The level the session was played at. */
  level: DifficultyCode;
};

export type TargetWhy = "band" | "rung_start" | "progress" | "same" | "comeback" | "hold_cap";

type TargetInput = Parameters<typeof progressiveTarget>[0];

/** Steps 2 to 4: the prescribed number moved by the last sessions, before any clamp. */
function anchoredValue(
  input: TargetInput,
  s0: SessionMark,
  p0: number,
): { value: number; why: TargetWhy } {
  const { level, now } = input;
  const unit = input.type === "time" ? "time" : "reps";
  const ratio = (from: DifficultyCode) =>
    USER_LEVEL_MULTIPLIER[level] / USER_LEVEL_MULTIPLIER[from];
  const gap = (later: number, earlier: number) => later - earlier > COMEBACK_GAP_DAYS * DAY_MS;

  const next =
    s0.met === true && p0 < TARGET_CAP[unit]
      ? Math.min(p0 + TARGET_STEP[unit], TARGET_CAP[unit])
      : p0;
  const why: TargetWhy = s0.met === true ? "progress" : "same";
  // A session whose prescription is unknown is absent: it opens no comeback and is never read
  // (a pre-0070 row with no target would otherwise be NaN, and clampToRange turns that into 1).
  const [, r1, r2] = input.recent;
  const s1 = r1?.prescribed != null ? r1 : undefined;
  const s2 = r2?.prescribed != null ? r2 : undefined;
  const base = next * ratio(s0.level);

  // More than 14 days since the movement, in any quest: a level lower, and no +1.
  if (input.lastAt != null && gap(now, input.lastAt)) {
    return { value: p0 * ratio(s0.level) * COMEBACK_LOWER[level], why: "comeback" };
  }
  // The first session after a gap: still a level down (`p0` is already the lowered one), +1 earned.
  if (s1 && gap(s0.at, s1.at)) return { value: base, why: "comeback" };
  // The second: back to the prescription from before the gap.
  if (s1 && s2?.prescribed != null && gap(s1.at, s2.at)) {
    return { value: Math.max(base, s2.prescribed * ratio(s2.level)), why };
  }
  return { value: base, why };
}

/**
 * Tonight's quest sets the floor; progression may run past the band's top up to the cap, never
 * past both. A comeback lowers on purpose, so it is never raised to the floor.
 *
 * ponytail: `completed_sessions.questId` is NULL once a quest is deleted, and a deleted hero
 * quest then reads as a seeded one. Its sessions feed `recent`, bounded by this clamp (and a
 * comeback by the upper half of it). Fix: carry the author on the session if it ever shows.
 *
 * ponytail: `progressiveTarget` sees 3 sessions (`RECENT_SESSIONS`), so the comeback window is
 * 2 gaps. Ceiling: a rule needing longer memory (E-03's 5 weeks). Fix: raise the window.
 */
function clampToBand(value: number, why: TargetWhy, floor: number, ceiling: number) {
  const raised = why === "comeback" ? value : Math.max(value, floor);
  const clamped = Math.min(raised, ceiling);
  return { value: clamped, why: clamped !== value && why !== "comeback" ? ("band" as const) : why };
}

/** A hold is never above 75 % of its record, on the 5 s grid, even if that is under the band. */
function capHold(value: number, why: TargetWhy, record: number) {
  const cap = Math.max(5, Math.floor((HOLD_RECORD_FRACTION * record) / 5) * 5);
  return value > cap ? { value: cap, why: "hold_cap" as const } : { value, why };
}

/**
 * The one birthplace of the target the app asks for (roadmap M-03), read from the journal and
 * never stored. Double progression: every set met, one more rep (five more seconds); otherwise
 * the same. Stops at the cap; a hold never passes 75 % of its record; after more than 14 days
 * away the next two sessions are a level lower. The hero's own number is laid over this by
 * `applyConfigToSlots` and never replaced by it.
 */
export function progressiveTarget(input: {
  type: QuestTargetType;
  /** `generateTarget` for this slot: what is asked when nothing is known. */
  band: number;
  /** The bottom of the band at tonight's level, on the 5 s grid for a hold. */
  floor: number;
  /** The top of the band at tonight's level. */
  top: number;
  /** ms of the movement's newest session in this unit, in any quest. Null: none. */
  lastAt: number | null;
  /** "floor" for a swapped movement with no history: the new rung starts at the bottom. */
  start: "band" | "floor";
  level: DifficultyCode;
  /** Newest first, at most 3, this movement in this unit, hero-quest sessions left out. */
  recent: readonly SessionMark[];
  /** All-time best in this unit. */
  record: number | null;
  now: number;
  range: { min: number; max: number };
}): { value: number; why: TargetWhy } {
  const { type, band, floor, top, record, range } = input;
  const unit = type === "time" ? "time" : "reps";
  const s0 = input.recent[0];
  const p0 = s0?.prescribed;

  let value: number;
  let why: TargetWhy;
  let clamp = true;
  if (!s0 || p0 == null) {
    // Nothing to anchor on: the band, or the bottom of it for a rung just entered.
    value = input.start === "floor" ? floor : band;
    why = input.start === "floor" ? "rung_start" : "band";
    clamp = false;
  } else {
    ({ value, why } = anchoredValue(input, s0, p0));
  }
  // Reps whole, holds on the 5 s grid `generateTarget` writes.
  value = type === "time" ? Math.max(1, Math.round(value / 5) * 5) : Math.round(value);
  if (clamp) ({ value, why } = clampToBand(value, why, floor, Math.max(top, TARGET_CAP[unit])));
  if (type === "time" && record != null) ({ value, why } = capHold(value, why, record));

  if (!Number.isFinite(value)) return { value: clampToRange(band, range), why: "band" };
  return { value: clampToRange(value, range), why };
}
