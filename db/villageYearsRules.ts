import { differenceInYears, startOfDay } from "date-fns";
import { ANIMAL_OF, type Animal, type Practice, ranked, tally } from "./crestRules";
import type { QuestTargetType } from "./schema";

/**
 * What the village keeps for years, from the journal alone: stones on the ramparts, a banner per
 * season, an Age per ten levels. Pure: no database, no clock (`now` is a parameter), so the same
 * journal on two phones gives the same answer, and deleting a session takes its stone back.
 * The reading of the journal is in `db/villageYears.ts`.
 */

/** The best a session did on one movement, in that movement's own unit (reps and seconds never mix). */
export type SetBest = { exerciseId: number; unit: QuestTargetType; value: number };

/** One session of the journal, in `performedAt` then `uuid` order. Sessions that do not count still pay XP. */
export type JournalRow = {
  at: Date;
  xp: number;
  /** `countsAsSession()`: a short outing earns XP and is not a session. */
  counts: boolean;
  practice: Practice | null;
  /** Only read when `counts`. */
  bests: SetBest[];
};

/** A record broken: `value` over the standing best `prior`. */
export type Break = {
  exerciseId: number;
  unit: QuestTargetType;
  prior: number;
  value: number;
  at: number;
};

/** A session that counts, with the level it ended on and what it did. */
export type Entry = {
  at: Date;
  level: number;
  practice: Practice | null;
  breaks: Break[];
  /** Movements done for the first time in this session. */
  firstSeen: number[];
};

/** What a stone or a banner says: the best record broken, else how many sessions. */
export type Fact = ({ kind: "record" } & Break) | { kind: "sessions"; count: number };

/** D4: a session belongs to the level reached after it, XP of every session before it included. */
export function levelAfterEachSession(
  rows: readonly Pick<JournalRow, "xp">[],
  levelOf: (totalXp: number) => number,
): number[] {
  let total = 0;
  return rows.map((r) => {
    total += r.xp;
    return levelOf(total);
  });
}

/** One best per movement and unit, in a fixed order so that no read order changes a tie. */
function bestPerMovement(bests: readonly SetBest[]): SetBest[] {
  const best = new Map<string, SetBest>();
  for (const b of bests) {
    const key = `${b.exerciseId}:${b.unit}`;
    if ((best.get(key)?.value ?? 0) < b.value) best.set(key, b);
  }
  return [...best.values()].sort(
    (a, b) => a.exerciseId - b.exerciseId || (a.unit < b.unit ? -1 : 1),
  );
}

/** The sessions that count, each with its level, its records broken and its new movements. */
export function timeline(rows: readonly JournalRow[], levelOf: (xp: number) => number): Entry[] {
  const levels = levelAfterEachSession(rows, levelOf);
  const standing = new Map<string, number>();
  const seen = new Set<number>();
  const out: Entry[] = [];
  for (const [i, row] of rows.entries()) {
    if (!row.counts) continue;
    const sets = bestPerMovement(row.bests);
    const breaks: Break[] = [];
    const firstSeen: number[] = [];
    for (const s of sets) {
      const key = `${s.exerciseId}:${s.unit}`;
      const prior = standing.get(key);
      if (prior !== undefined && s.value > prior) {
        breaks.push({
          exerciseId: s.exerciseId,
          unit: s.unit,
          prior,
          value: s.value,
          at: row.at.getTime(),
        });
      }
      standing.set(key, Math.max(prior ?? 0, s.value));
      if (!seen.has(s.exerciseId)) {
        seen.add(s.exerciseId);
        firstSeen.push(s.exerciseId);
      }
    }
    out.push({ at: row.at, level: levels[i] ?? 1, practice: row.practice, breaks, firstSeen });
  }
  return out;
}

/** Sorts `a` before `b` when `a` is the better break: bigger relative gain, then more recent. */
function betterBreak(a: Break, b: Break): number {
  const gain = (b.value - b.prior) * a.prior - (a.value - a.prior) * b.prior; // a.gain/a.prior vs b.gain/b.prior, no float
  return (
    gain ||
    b.at - a.at ||
    a.exerciseId - b.exerciseId ||
    (a.unit < b.unit ? -1 : a.unit > b.unit ? 1 : 0)
  );
}

/**
 * D5: the biggest relative gain on one movement and one unit, over a value that existed. Ties go
 * to the most recent, then to the lower movement id so that no input order can change the answer.
 */
export function bestBreak(breaks: readonly Break[]): Break | null {
  return [...breaks].sort(betterBreak)[0] ?? null;
}

const factOf = (entries: readonly Entry[]): Fact => {
  const best = bestBreak(entries.flatMap((e) => e.breaks));
  return best ? { kind: "record", ...best } : { kind: "sessions", count: entries.length };
};

/** The first level that has a stone: they start after level 20 (the thresholds are a table up to there). */
export const FIRST_STONE_LEVEL = 21;

export type Stone = { level: number; decade: number; fact: Fact };

/**
 * D6: one stone per level reached after 20 in which a session was done. The stone engraves the
 * level; the fact (the level's best record, else its session count) is text beside it. `decade`
 * is how a long wall is grouped. A level no session ended on (a jump over it) has no stone.
 */
export function stones(entries: readonly Entry[]): Stone[] {
  const byLevel = new Map<number, Entry[]>();
  for (const e of entries) {
    if (e.level < FIRST_STONE_LEVEL) continue;
    byLevel.set(e.level, [...(byLevel.get(e.level) ?? []), e]);
  }
  return [...byLevel.entries()]
    .sort(([a], [b]) => a - b)
    .map(([level, list]) => ({ level, decade: Math.floor(level / 10), fact: factOf(list) }));
}

export type SeasonKind = "winter" | "spring" | "summer" | "autumn";

/** D8: December to February, March to May, June to August, September to November, local time. */
const NORTH: Record<number, SeasonKind> = { 11: "winter", 2: "spring", 5: "summer", 8: "autumn" };
const SOUTH: Record<number, SeasonKind> = { 11: "summer", 2: "autumn", 5: "winter", 8: "spring" };

/** Local midnight of the season's first day. January and February belong to December before them. */
export function seasonStart(d: Date): Date {
  const m = d.getMonth();
  const start = m === 11 ? 11 : m >= 8 ? 8 : m >= 5 ? 5 : m >= 2 ? 2 : 11;
  return new Date(m <= 1 ? d.getFullYear() - 1 : d.getFullYear(), start, 1);
}

export const seasonEnd = (start: Date): Date =>
  new Date(start.getFullYear(), start.getMonth() + 3, 1);

export type Banner = {
  /** Local midnight of the season's first day, ms: the identity of the banner. */
  start: number;
  kind: SeasonKind;
  /** 1 in the first year of the village, counted from the first session's day. */
  villageYear: number;
  sessions: number;
  fact: Fact;
  /** The first animal's colour; the boar has none, so its banner takes the season's leading practice. Null: no practice that season. */
  animal: Animal | null;
};

/**
 * D8-D10: a banner per finished season with a session that counts, oldest first. The season in
 * progress has none yet. `southern` (the region's hemisphere) only picks the name of the season, the windows are fixed.
 */
export function seasons(
  entries: readonly Entry[],
  now: Date,
  southern: boolean,
  firstAnimal: Animal | null,
): Banner[] {
  const first = entries[0];
  if (first === undefined) return [];
  const origin = startOfDay(first.at);
  const groups = new Map<number, Entry[]>();
  for (const e of entries) {
    const key = seasonStart(e.at).getTime();
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }
  const names = southern ? SOUTH : NORTH;
  return [...groups.entries()]
    .sort(([a], [b]) => a - b)
    .filter(([start]) => seasonEnd(new Date(start)).getTime() <= now.getTime())
    .map(([start, list]) => {
      const date = new Date(start);
      const counts = tally();
      const last = tally();
      for (const [i, e] of list.entries()) {
        if (e.practice === null) continue;
        counts[e.practice]++;
        last[e.practice] = i + 1;
      }
      const leading = ranked(counts, last)[0];
      return {
        start,
        kind: names[date.getMonth()] ?? "winter",
        villageYear: differenceInYears(date < origin ? origin : date, origin) + 1,
        sessions: list.length,
        fact: factOf(list),
        animal:
          firstAnimal !== null && firstAnimal !== "boar"
            ? firstAnimal
            : leading
              ? ANIMAL_OF[leading]
              : null,
      };
    });
}

/** The Ages come every ten levels from 50; the first one looks back to level 40. */
export const AGE_FROM = 50;
export const AGE_EVERY = 10;

/** How deep a movement sits in its chain of prerequisites: 0 for the first rung, 1 for the next. Cycle-safe. */
export function rungDepths(prerequisite: ReadonlyMap<number, number | null>): Map<number, number> {
  const depth = new Map<number, number>();
  for (const id of prerequisite.keys()) {
    let n = 0;
    const seen = new Set([id]);
    for (
      let cur = prerequisite.get(id);
      cur != null && !seen.has(cur);
      cur = prerequisite.get(cur)
    ) {
      seen.add(cur);
      n++;
    }
    depth.set(id, n);
  }
  return depth;
}

export type Age = {
  level: number;
  /** `rung`: the highest rung first done in the window; `held`: none was new, the highest ever done; `practice`: no rung at all. */
  source: "rung" | "held" | "practice" | "none";
  exerciseId: number | null;
  depth: number | null;
  /** The level the hero was at when they first did that movement: "your 1st diamond push-up, at level 47". */
  reachedAtLevel: number | null;
  practice: Practice | null;
};

/**
 * D14-D15: the Age of `level` (50, 60, ...), or null before it is reached. Its window is the
 * sessions after the one that reached `level - 10` up to the one that reached `level`; the Age is
 * named after the deepest rung (one with a prerequisite) first done in it, the latest on a tie.
 * With none, after the deepest rung done so far; with none at all, after the practice in the lead.
 */
export function ageOf(
  level: number,
  entries: readonly Entry[],
  depth: ReadonlyMap<number, number>,
): Age | null {
  const end = entries.findIndex((e) => e.level >= level);
  if (end < 0) return null;
  const start = entries.findIndex((e) => e.level >= level - AGE_EVERY);
  // First time each movement was done, up to the Age: [index, id].
  const firsts = entries
    .slice(0, end + 1)
    .flatMap((e, i) => e.firstSeen.map((id) => [i, id] as const));
  const deepest = (from: number) =>
    firsts
      .filter(([i, id]) => i >= from && (depth.get(id) ?? 0) > 0)
      .sort(([ai, a], [bi, b]) => (depth.get(b) ?? 0) - (depth.get(a) ?? 0) || bi - ai || a - b)[0];
  const window = deepest(start + 1);
  const pick = window ?? deepest(0);
  if (pick) {
    const [i, id] = pick;
    return {
      level,
      source: window ? "rung" : "held",
      exerciseId: id,
      depth: depth.get(id) ?? 0,
      reachedAtLevel: entries[i]?.level ?? null,
      practice: null,
    };
  }
  const counts = tally();
  const last = tally();
  for (const [i, e] of entries.slice(start + 1, end + 1).entries()) {
    if (e.practice === null) continue;
    counts[e.practice]++;
    last[e.practice] = i + 1;
  }
  const practice = ranked(counts, last)[0] ?? null;
  return {
    level,
    source: practice ? "practice" : "none",
    exerciseId: null,
    depth: null,
    reachedAtLevel: null,
    practice,
  };
}

/** Every Age the hero has reached, the oldest first. */
export function agesReached(entries: readonly Entry[], depth: ReadonlyMap<number, number>): Age[] {
  const top = entries.reduce((m, e) => Math.max(m, e.level), 0);
  const ages: Age[] = [];
  for (let level = AGE_FROM; level <= top; level += AGE_EVERY) {
    const age = ageOf(level, entries, depth);
    if (age) ages.push(age);
  }
  return ages;
}
