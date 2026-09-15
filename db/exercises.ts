import { and, count, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db, schema } from "./client";
import { canDo, isEquipmentCode } from "./equipment";
import { isMuscleCode } from "./muscles";
import { getAllPreferences, preferences } from "./preferences";
import {
  ADMIN_CREATOR,
  type DifficultyCode,
  type EquipmentCode,
  type ExerciseStyle,
  exerciseStyles,
  type Locomotion,
  locomotionCodes,
  type MovementPattern,
  type MuscleCode,
  type QuestTargetType,
  questTargetTypes,
  USER_EXERCISE_CREATOR,
} from "./schema";

const { exercises, exerciseMuscles } = schema;

const EXERCISE_STYLE_SET = new Set<ExerciseStyle>(exerciseStyles);

function isExerciseStyle(value: unknown): value is ExerciseStyle {
  return typeof value === "string" && EXERCISE_STYLE_SET.has(value as ExerciseStyle);
}

function isQuestTargetType(value: unknown): value is QuestTargetType {
  return typeof value === "string" && (questTargetTypes as readonly string[]).includes(value);
}

function isLocomotion(value: unknown): value is Locomotion {
  return typeof value === "string" && (locomotionCodes as readonly string[]).includes(value);
}

export type Exercise = {
  id: number;
  enName: string;
  frName: string;
  deName: string;
  esName: string;
  enDescription: string;
  frDescription: string;
  deDescription: string;
  esDescription: string;
  imagePath: string;
  creator: string;
  difficulty: DifficultyCode;
  equipment: EquipmentCode;
  style: ExerciseStyle;
  secondsPerRep: number;
  muscles: MuscleCode[];
  /** Movement family — what the exercise *is*, as opposed to what it works. */
  pattern: MovementPattern | null;
  /**
   * Counted or held. Null when the movement never said (hero rows from before `0039`), in which
   * case the quest slot's unit stands. Seed rows always have one.
   */
  measure: QuestTargetType | null;
  /**
   * How this movement covers ground (`0049`). Null on everything that is not an `expedition`,
   * `walk` on every hero-authored one — the price of a minute outside is read from here, and the
   * editor deliberately does not offer the choice.
   */
  locomotion: Locomotion | null;
  /**
   * The easier variation this one is built on (`0022`). Carried on the list row so the
   * catalogue can derive the whole ladder from the cached list instead of one query per row —
   * inverted, `prerequisite → this` is "what does this movement lead to".
   */
  prerequisiteExerciseId: number | null;
  /** Set when a hero retires their own movement. Seed rows are always null. */
  retiredAt: Date | null;
};

/**
 * `ADMIN_CREATOR` is what seed content carries — the column has defaulted to it since `0000`.
 * `USER_EXERCISE_CREATOR` is stamped on exercises written in the app, exactly as
 * `USER_QUEST_AUTHOR` is on quests: only rows carrying it may be edited or retired from the UI,
 * so a content update can never clobber the hero's work and the hero can never edit the seed.
 *
 * They live in `./schema` beside the column, and are re-exported here because this is where the
 * rest of the app looks for anything about an exercise.
 */
export { ADMIN_CREATOR, isEquipmentCode, isMuscleCode, USER_EXERCISE_CREATOR };

export function isUserExercise(ex: Pick<Exercise, "creator">): boolean {
  return ex.creator !== ADMIN_CREATOR;
}

/**
 * Resolve a movement the *content* named.
 *
 * The warm-up prescribes by `enName` (`constants/warmup.ts` says so in its own docblock), and
 * since `0035` a hero can own names too — a bare `find` on `enName` can land on their row and
 * teach a hero their own half-written note instead of the seeded movement.
 *
 * Pure on purpose: it reads the list `listExercises()` already caches, so this costs no query.
 * Two callers: the warm-up, and `app/oath.tsx`, whose presets name seed content the same way.
 * `db/oaths.ts` stores an id and `db/paths.ts` walks `prerequisiteExerciseId`, which no hero row
 * carries — neither goes through a name, so neither needs this.
 */
export function officialByName(catalogue: Exercise[], enName: string): Exercise | undefined {
  return catalogue.find((e) => e.enName === enName && e.creator === ADMIN_CREATOR);
}

// One fetch shared by every screen that mounts (quest/adventure galleries, adventure details)
// instead of each re-querying on every navigation — the biggest source of the post-navigation
// loading flash. This used to say "static seed content (no in-app editing)"; since `0035` the
// hero writes here too, so every writer below calls `invalidateExercisesCache()`.
//
// The list still includes retired rows on purpose: db/adventures.ts, db/questConfig.ts and the
// quest screen all resolve a quest's exercise ids against it, and a quest holding a retired
// movement has to keep working. Hiding belongs at the moment of choosing — `pickableExercises`.
/**
 * The exercise columns every read of the table selects, and the fold that turns a row into an
 * `Exercise`. Written once: the catalogue and the single-movement read answer the same screens,
 * and the defaults below (`none`, `strength`, three seconds a rep) are what a hero row that
 * predates a column falls back to, and two copies of them is two catalogues.
 *
 * A function, not a constant: several suites mock `schema` as `{}` and never run a query, so the
 * table objects must not be read at import time.
 */
const exerciseColumns = () => ({
  id: exercises.id,
  enName: exercises.enName,
  frName: exercises.frName,
  deName: exercises.deName,
  esName: exercises.esName,
  enDescription: exercises.enDescription,
  frDescription: exercises.frDescription,
  deDescription: exercises.deDescription,
  esDescription: exercises.esDescription,
  imagePath: exercises.imagePath,
  creator: exercises.creator,
  difficulty: exercises.difficulty,
  equipment: exercises.equipment,
  style: exercises.style,
  secondsPerRep: exercises.secondsPerRep,
  pattern: exercises.pattern,
  measure: exercises.measure,
  locomotion: exercises.locomotion,
  prerequisiteExerciseId: exercises.prerequisiteExerciseId,
  retiredAt: exercises.retiredAt,
  muscle: exerciseMuscles.muscle,
});

type ExerciseRow = {
  id: number;
  enName: string;
  frName: string;
  deName: string;
  esName: string;
  enDescription: string;
  frDescription: string;
  deDescription: string;
  esDescription: string;
  imagePath: string;
  creator: string;
  difficulty: DifficultyCode;
  equipment: EquipmentCode;
  style: ExerciseStyle;
  secondsPerRep: number;
  pattern: MovementPattern | null;
  measure: QuestTargetType | null;
  locomotion: Locomotion | null;
  prerequisiteExerciseId: number | null;
  retiredAt: Date | null;
};

/** A movement with no muscles yet, from any row an `exerciseColumns` read returned. */
function exerciseFromRow(r: ExerciseRow): Exercise {
  return {
    id: r.id,
    enName: r.enName,
    frName: r.frName,
    deName: r.deName,
    esName: r.esName,
    enDescription: r.enDescription,
    frDescription: r.frDescription,
    deDescription: r.deDescription,
    esDescription: r.esDescription,
    imagePath: r.imagePath,
    creator: r.creator,
    difficulty: r.difficulty,
    equipment: isEquipmentCode(r.equipment) ? r.equipment : "none",
    style: isExerciseStyle(r.style) ? r.style : "strength",
    secondsPerRep: typeof r.secondsPerRep === "number" ? r.secondsPerRep : 3,
    pattern: r.pattern ?? null,
    measure: isQuestTargetType(r.measure) ? r.measure : null,
    locomotion: isLocomotion(r.locomotion) ? r.locomotion : null,
    prerequisiteExerciseId: r.prerequisiteExerciseId,
    retiredAt: r.retiredAt,
    muscles: [],
  };
}

let exercisesCache: Promise<Exercise[]> | null = null;

async function fetchExercises(): Promise<Exercise[]> {
  const rows = await db
    .select({
      ...exerciseColumns(),
    })
    .from(exercises)
    .leftJoin(exerciseMuscles, eq(exerciseMuscles.exerciseId, exercises.id));

  const byId = new Map<number, Exercise>();

  for (const r of rows) {
    const current = byId.get(r.id);
    if (!current) {
      byId.set(r.id, exerciseFromRow(r));
    }

    if (isMuscleCode(r.muscle)) {
      const ex = byId.get(r.id);
      if (ex && !ex.muscles.includes(r.muscle)) ex.muscles.push(r.muscle);
    }
  }

  return [...byId.values()];
}

export function listExercises(): Promise<Exercise[]> {
  if (!exercisesCache) {
    exercisesCache = fetchExercises().catch((e) => {
      exercisesCache = null; // don't cache a failure - let the next caller retry
      throw e;
    });
  }
  return exercisesCache;
}

/**
 * The names of the movements this hero cannot do, because they need kit that was not declared in
 * Settings. Names rather than ids: the warm-up names its movements as strings and resolves them
 * against the catalogue at render time, so this is the shape its caller needs.
 *
 * Hero-authored movements are in scope too. Someone who writes down a movement, tags it with a
 * barbell and then says they own none has answered the question twice; the second answer wins.
 *
 * So are the rungs the hero has not reached. A hero still earning Squat was warmed up with Jump
 * Squats, the rung above it, while every quest slot of that same session had already been walked
 * back down to Squat by `currentRungFor`. Same rule here, so the warm-up never asks for a movement
 * the ladder is telling the hero to work up to.
 */
export async function unavailableMovements(): Promise<Set<string>> {
  const [catalogue, ownedEquipment] = await Promise.all([
    listExercises(),
    preferences.getOwnedEquipment(),
  ]);
  const owned = ownedEquipment === null ? null : new Set(ownedEquipment);
  const rungs = await currentRungFor(
    catalogue.filter((ex) => ex.prerequisiteExerciseId !== null).map((ex) => ex.id),
  );

  return new Set(
    catalogue
      .filter((ex) => !canDo(ex.equipment, owned) || (rungs.get(ex.id) ?? ex.id) !== ex.id)
      .map((ex) => ex.enName),
  );
}

export async function getExerciseById(id: number): Promise<Exercise | null> {
  const rows = await db
    .select({
      ...exerciseColumns(),
    })
    .from(exercises)
    .leftJoin(exerciseMuscles, eq(exerciseMuscles.exerciseId, exercises.id))
    .where(eq(exercises.id, id));

  const first = rows[0];
  if (!first) return null;
  const ex = exerciseFromRow(first);

  for (const r of rows) {
    if (isMuscleCode(r.muscle) && !ex.muscles.includes(r.muscle)) ex.muscles.push(r.muscle);
  }

  return ex;
}

// ------------------------------------------------------------
// Variation ladder
// ------------------------------------------------------------

/** Sessions meeting the target before the next variation is considered earned. */
export const PROGRESSION_SESSIONS_REQUIRED = 3;

export type MovementRef = {
  id: number;
  enName: string;
  frName: string;
  deName: string;
  esName: string;
  imagePath: string;
};

/** One rung of the ladder, seen from below: the movement, and how close its next step is. */
export type VariationStep = {
  /** The movement being mastered. */
  from: MovementRef;
  /** The harder variation it leads to. */
  next: MovementRef;
  /** How many of the last sessions on `from` met or beat their target. */
  metTarget: number;
  required: number;
  isEarned: boolean;
};

/** Kept for the exercise screen, which imported this name before the ladder had other readers. */
export type NextProgression = VariationStep;

type LadderRow = MovementRef & { prerequisiteExerciseId: number | null };

/** The whole ladder in one query — `exercises` is static seed content and ~50 rows deep. */
export async function fetchLadderRows(): Promise<LadderRow[]> {
  return await db
    .select({
      id: exercises.id,
      enName: exercises.enName,
      frName: exercises.frName,
      deName: exercises.deName,
      esName: exercises.esName,
      imagePath: exercises.imagePath,
      prerequisiteExerciseId: exercises.prerequisiteExerciseId,
    })
    .from(exercises);
}

/**
 * How recent a session has to be to still count towards opening the next rung. That ability is
 * current, not historical: three clean sets from last spring say nothing about today. The floor is
 * another matter, and the window does not govern it (`rungsBehind`). Eight weeks is wide
 * enough that a rest week or a deload costs nothing (the research asks for >=2 sessions a week
 * per movement, so three of them span about a fortnight of normal training).
 */
const PROGRESSION_WINDOW_DAYS = 56;

/**
 * The last `limit` *sessions* on one movement, most recent first, as "did it meet its target?".
 *
 * Sessions, not rows. A three-round quest writes three rows in a single evening, so counting rows
 * handed a hero the next variation after **one workout** — the "program hopping before
 * progressing" the research names as beginner mistake number one. A session counts only when
 * *every* set logged for the movement met its target: the dossier asks for "3x12 clean reps", not
 * one good set out of three.
 *
 * `sessionId` breaks the tie because sessions written in the same second share a timestamp —
 * without it "the last three" is not a stable set.
 *
 * ponytail: strict on purpose — one short round sinks the whole session. Loosen it to a majority
 * of rounds if real logs show good sessions being refused.
 *
 * ponytail: one indexed seek per movement (`completed_exercises_exercise_result_idx`), called with a
 * handful of ids at a time. If a caller ever needs the whole ladder at once, replace it with a
 * single ROW_NUMBER() window query.
 */
async function recentMetFlags(exerciseId: number, limit: number): Promise<boolean[]> {
  const since = new Date(Date.now() - PROGRESSION_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  // ponytail: the bar is the target the hero was handed, and `QuestConfig` lets them lower it to
  // 1 — so a self-lowered target earns rungs faster. Reading the quest template's own value
  // instead means joining `quest_exercises` into every ladder read; do it if anyone reports it.
  const met = sql<number>`min(case when ${schema.completedExercises.targetValue} is not null
      and ${schema.completedExercises.resultValue} >= ${schema.completedExercises.targetValue}
    then 1 else 0 end)`;
  const at = sql<number>`max(${schema.completedExercises.performedAt})`;

  const rows = await db
    .select({ met })
    .from(schema.completedExercises)
    .where(
      and(
        eq(schema.completedExercises.exerciseId, exerciseId),
        gte(schema.completedExercises.performedAt, since),
      ),
    )
    .groupBy(schema.completedExercises.sessionId)
    .orderBy(desc(at), desc(schema.completedExercises.sessionId))
    .limit(limit);

  return rows.map((r) => r.met === 1);
}

const stripPrerequisite = ({
  id,
  enName,
  frName,
  deName,
  esName,
  imagePath,
}: LadderRow): MovementRef => ({
  id,
  enName,
  frName,
  deName,
  esName,
  imagePath,
});

/**
 * How many of the most recent sessions in a row met their target, capped at what a rung asks for.
 *
 * The run at the head, not a count: `[hit, miss, hit]` used to read as 2, and "1 more time" was
 * then a lie, because one more clean session makes `[hit, hit, miss]`, still not earned.
 */
function streakOf(flags: readonly boolean[]): number {
  const miss = flags.indexOf(false);
  return Math.min(miss === -1 ? flags.length : miss, PROGRESSION_SESSIONS_REQUIRED);
}

async function buildStep(from: LadderRow, next: LadderRow): Promise<VariationStep> {
  const flags = await recentMetFlags(from.id, PROGRESSION_SESSIONS_REQUIRED);
  const metTarget = streakOf(flags);

  return {
    from: stripPrerequisite(from),
    next: stripPrerequisite(next),
    metTarget,
    required: PROGRESSION_SESSIONS_REQUIRED,
    isEarned: metTarget >= PROGRESSION_SESSIONS_REQUIRED,
  };
}

/**
 * What comes after this movement, and how close the hero is to it.
 *
 * Progressive overload without weights is a harder variation, not a bigger multiplier. This is a
 * hint and nothing else: no quest is hidden, no exercise is locked, and a hero who wants to try
 * the next step tonight can. The threshold is something the app can actually observe — the last
 * three logged sets met their target — rather than "3×12 clean reps", which would require seeing
 * technique the app cannot see.
 */
export async function getNextProgression(exerciseId: number): Promise<VariationStep | null> {
  const rows = await fetchLadderRows();
  const from = rows.find((r) => r.id === exerciseId);
  const next = rows.find((r) => r.prerequisiteExerciseId === exerciseId);
  if (!from || !next) return null;

  return await buildStep(from, next);
}

/** A rung on the chain leading to a movement, and whether the hero has mastered it *lately*. */
export type ChainRung = {
  exercise: MovementRef;
  /** The run of on-target sessions at the head of the recency window (`streakOf`). */
  metTarget: number;
  required: number;
  /** Current, windowed: what opens the next rung today. Where the hero stands is `Chain`'s. */
  isEarned: boolean;
};

export type Chain = {
  /** Easiest first, ending on the movement asked for. */
  rungs: ChainRung[];
  /** 1-based rung the hero is standing on: the one just above the highest rung behind them. */
  position: number;
  /** Every rung, the last one included, is behind the hero (`rungsBehind`). */
  climbed: boolean;
};

/**
 * How many rungs of a chain (ids, easiest first) are behind the hero. What is behind you stays
 * there: a rung is behind once it has been earned *ever*, or once any rung above it has been
 * earned ever, or has a single on-target session inside the recency window.
 *
 * Recency still decides what opens *upwards* (`getNextProgression`, the victory screen). It no
 * longer decides the floor: under the old rule, a hero who climbed to push-ups and stopped doing
 * wall push-ups was sent back to the wall eight weeks later, on the exercise page and in every
 * quest (exercise sheet audit, 2026-09-15).
 *
 * The one reader of "where does the hero stand", shared by `getChainTo` and `currentRungFor` so
 * the path card and the quest slot can never disagree.
 *
 * ponytail: one clean session on a rung puts everything below it behind the hero, and a target the
 * hero lowered to 1 counts as clean (see `recentMetFlags`). Read the template's own target if
 * heroes start skipping rungs that way.
 */
function rungsBehind(
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

/**
 * The whole path up to a movement — what the hero has to own before it, and where they stand.
 *
 * Returns `null` when the movement is not on the ladder at all, so a caller can stay silent rather
 * than render a chain of one. Nothing here gates anything: a hero can attempt the top of the chain
 * tonight, this only says how far along the authored path they are.
 */
export async function getChainTo(exerciseId: number): Promise<Chain | null> {
  const rows = await fetchLadderRows();
  const byId = new Map(rows.map((r) => [r.id, r]));

  const chain: LadderRow[] = [];
  const seen = new Set<number>();
  let cursor = byId.get(exerciseId);

  // Walk down to the easiest variation. `seen` guards against a cycle in the seed data, which
  // would otherwise hang the caller rather than fail.
  while (cursor && !seen.has(cursor.id)) {
    seen.add(cursor.id);
    chain.unshift(cursor);
    cursor = cursor.prerequisiteExerciseId ? byId.get(cursor.prerequisiteExerciseId) : undefined;
  }

  if (chain.length < 2) return null;

  const ids = chain.map((row) => row.id);
  const [flags, everEarned] = await Promise.all([recentMetFlagsBatch(ids), everEarnedMovements()]);

  const rungs = chain.map((row): ChainRung => {
    const metTarget = streakOf(flags.get(row.id) ?? []);
    return {
      exercise: stripPrerequisite(row),
      metTarget,
      required: PROGRESSION_SESSIONS_REQUIRED,
      isEarned: metTarget >= PROGRESSION_SESSIONS_REQUIRED,
    };
  });

  const behind = rungsBehind(ids, everEarned, flags);
  return { rungs, position: Math.min(behind + 1, rungs.length), climbed: behind === rungs.length };
}

/**
 * Every movement that ever had its run of on-target sessions, in one pass over the journal.
 *
 * The per-movement read above is deliberately windowed — `isEarned` is a *current* state, and a
 * conversation about what to train tonight should forget last spring. A trophy cannot work that
 * way: one that unlocks and then vanishes because the hero took a summer off is a bug, and the
 * research is blunt that punishing an absence pushes people to abandon rather than restart.
 *
 * So mastery-for-keeps asks a different question — "did three consecutive on-target sessions
 * *ever* happen?" — which is monotonic, and therefore irreversible. The current state may fall;
 * the shelf never gives anything back.
 *
 * The runs are found in SQL: a running count of misses numbers each unbroken stretch of hits, and
 * a stretch long enough is a movement earned. It used to return a flag per movement per session
 * and fold them in JS, 3 200 rows at five years of journal, on every Journal open (perf audit,
 * 2026-09-15).
 *
 * It also decides where the hero stands (`rungsBehind`), so it runs for every quest Home resolves.
 * The answer is kept for as long as the journal is the same journal: the row count and the last
 * row id change on every session saved or deleted (`completed_exercises.id` is AUTOINCREMENT, so an
 * id is never handed out twice), and reading both is an index walk instead of a window over the
 * whole table. No writer has to remember to invalidate it.
 *
 * ponytail: an in-place UPDATE of a result would go unseen. Nothing writes one today; the day a
 * set becomes editable, clear `everEarnedCache` in that writer.
 */
let everEarnedCache: { stamp: string; earned: Promise<Set<number>> } | null = null;

async function everEarnedMovements(): Promise<Set<number>> {
  const [journal] = await db.all<{ rows: number; lastId: number | null }>(
    sql`SELECT COUNT(*) AS rows, MAX(id) AS lastId FROM completed_exercises`,
  );
  const stamp = `${journal?.rows}:${journal?.lastId}`;
  if (everEarnedCache?.stamp !== stamp) {
    const entry = { stamp, earned: readEverEarnedMovements() };
    everEarnedCache = entry;
    entry.earned.catch(() => {
      // Don't cache a failure: this caller still gets the rejection, the next one retries.
      if (everEarnedCache === entry) everEarnedCache = null;
    });
  }
  return everEarnedCache.earned;
}

async function readEverEarnedMovements(): Promise<Set<number>> {
  const rows = await db.all<{ exerciseId: number }>(sql`
    SELECT DISTINCT exerciseId FROM (
      SELECT exerciseId, met,
             SUM(1 - met) OVER (
               PARTITION BY exerciseId ORDER BY at, sessionId ROWS UNBOUNDED PRECEDING
             ) AS misses
      FROM (
        SELECT exerciseId, sessionId, MIN(performedAt) AS at,
               MIN(CASE WHEN targetValue IS NOT NULL AND resultValue >= targetValue
                   THEN 1 ELSE 0 END) AS met
        FROM completed_exercises
        GROUP BY exerciseId, sessionId
      )
    )
    WHERE met = 1
    GROUP BY exerciseId, misses
    HAVING COUNT(*) >= ${PROGRESSION_SESSIONS_REQUIRED}
  `);
  return new Set(rows.map((row) => row.exerciseId));
}

/**
 * `recentMetFlags` for many movements at once — the *current* state, windowed, most recent first.
 *
 * Every session inside the window, not only the last three: `rungsBehind` asks whether *any* of
 * them was clean, `streakOf` stops at the first miss anyway, and the window bounds the length.
 * `everEarnedMovements` above answers the other question (did a run *ever* happen, unwindowed).
 * This is the same seek `recentMetFlags` does, hoisted out of the per-movement loop because
 * `currentRungFor` needs it for every rung of every slot of a quest.
 */
export async function recentMetFlagsBatch(exerciseIds: number[]): Promise<Map<number, boolean[]>> {
  if (exerciseIds.length === 0) return new Map();

  const since = new Date(Date.now() - PROGRESSION_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const met = sql<number>`min(case when ${schema.completedExercises.targetValue} is not null
      and ${schema.completedExercises.resultValue} >= ${schema.completedExercises.targetValue}
    then 1 else 0 end)`;
  const at = sql<number>`max(${schema.completedExercises.performedAt})`;

  const rows = await db
    .select({ exerciseId: schema.completedExercises.exerciseId, met })
    .from(schema.completedExercises)
    .where(
      and(
        inArray(schema.completedExercises.exerciseId, exerciseIds),
        gte(schema.completedExercises.performedAt, since),
      ),
    )
    .groupBy(schema.completedExercises.exerciseId, schema.completedExercises.sessionId)
    .orderBy(
      schema.completedExercises.exerciseId,
      desc(at),
      desc(schema.completedExercises.sessionId),
    );

  const byExercise = new Map<number, boolean[]>();
  for (const row of rows) {
    const flags = byExercise.get(row.exerciseId) ?? [];
    flags.push(row.met === 1);
    byExercise.set(row.exerciseId, flags);
  }
  return byExercise;
}

/**
 * For each movement asked about, the one the hero is actually working: the rung just above the
 * highest one behind them (`rungsBehind`), or the movement itself once everything below it is.
 *
 * This is what stops a quest handing classical push-ups to someone whose last session was wall
 * push-ups (issue #33). It reads the same standing the exercise screen shows, so the app never
 * prescribes something it is simultaneously telling the hero to work up to.
 *
 * Batched rather than `getChainTo` per slot: that walks the whole `exercises` table and seeks the
 * journal once per rung, and this runs for every slot of every quest Home resolves.
 *
 * A movement off the ladder, or one whose chain is fully earned, maps to itself — callers can
 * treat the result as a total function and never special-case.
 */
export async function currentRungFor(exerciseIds: number[]): Promise<Map<number, number>> {
  const wanted = [...new Set(exerciseIds)];
  if (wanted.length === 0) return new Map();

  const rows = await fetchLadderRows();
  const byId = new Map(rows.map((r) => [r.id, r]));

  // Walk each request down to its easiest variation first, so one journal read covers every rung
  // of every chain involved.
  const chains = new Map<number, number[]>();
  for (const id of wanted) {
    const chain: number[] = [];
    const seen = new Set<number>();
    let cursor = byId.get(id);
    // `seen` guards a cycle in the data, which would otherwise hang rather than fail.
    while (cursor && !seen.has(cursor.id)) {
      seen.add(cursor.id);
      chain.unshift(cursor.id);
      cursor = cursor.prerequisiteExerciseId ? byId.get(cursor.prerequisiteExerciseId) : undefined;
    }
    chains.set(id, chain);
  }

  const [flags, everEarned] = await Promise.all([
    recentMetFlagsBatch([...new Set([...chains.values()].flat())]),
    everEarnedMovements(),
  ]);

  const result = new Map<number, number>();
  for (const id of wanted) {
    const chain = chains.get(id) ?? [];
    // `chain[behind]` is the rung the hero stands on; past the top it is undefined, which means
    // everything is behind them and the movement as written is the right one.
    result.set(id, chain[rungsBehind(chain, everEarned, flags)] ?? id);
  }
  return result;
}

/**
 * How many paths the hero has ever climbed: routes whose summit is behind them.
 *
 * A path is identified by its summit: walking a chain *down* is unambiguous (one prerequisite per
 * movement) and branching only happens going up, so a movement nobody else builds on ends exactly
 * one route. A summit earned once puts every rung under it behind the hero (`rungsBehind`), which
 * is what the path card reads as climbed, so the trophy asks nothing more. Derived from the
 * journal on read, like everything else here; nothing is stored.
 */
export async function countClimbedPaths(): Promise<number> {
  const [rows, earned] = await Promise.all([fetchLadderRows(), everEarnedMovements()]);

  const isPrerequisite = new Set(rows.map((r) => r.prerequisiteExerciseId));
  return rows.filter(
    (r) => r.prerequisiteExerciseId !== null && !isPrerequisite.has(r.id) && earned.has(r.id),
  ).length;
}

/**
 * The variations this session just unlocked.
 *
 * Same shape as `checkForNewRecords(sessionId)`: it answers "what did *this* session change?", so
 * the victory screen can celebrate it once. A rung already earned before tonight returns nothing —
 * otherwise every subsequent session would re-announce the same step.
 */
export async function checkForNewRungs(sessionId: number): Promise<VariationStep[]> {
  const [rows, sessionRows] = await Promise.all([
    fetchLadderRows(),
    db
      .selectDistinct({ exerciseId: schema.completedExercises.exerciseId })
      .from(schema.completedExercises)
      .where(eq(schema.completedExercises.sessionId, sessionId)),
  ]);

  const byId = new Map(rows.map((r) => [r.id, r]));
  const unlocked: VariationStep[] = [];

  for (const { exerciseId } of sessionRows) {
    const from = byId.get(exerciseId);
    const next = rows.find((r) => r.prerequisiteExerciseId === exerciseId);
    if (!from || !next) continue;

    // One row deeper than the threshold: the extra row is what the streak looked like *before*
    // tonight's set joined it.
    const flags = await recentMetFlags(from.id, PROGRESSION_SESSIONS_REQUIRED + 1);
    const met = (offset: number) =>
      flags.length >= offset + PROGRESSION_SESSIONS_REQUIRED &&
      flags.slice(offset, offset + PROGRESSION_SESSIONS_REQUIRED).every(Boolean);

    if (met(0) && !met(1)) {
      unlocked.push({
        from: stripPrerequisite(from),
        next: stripPrerequisite(next),
        metTarget: PROGRESSION_SESSIONS_REQUIRED,
        required: PROGRESSION_SESSIONS_REQUIRED,
        isEarned: true,
      });
    }
  }

  return unlocked;
}

// ------------------------------------------------------------
// Hero-authored exercises
// ------------------------------------------------------------

/**
 * What a hero owns on an exercise.
 *
 * `Pick`ed from `Exercise` rather than spelled out so the field *types* cannot drift from the
 * table's. It is an explicit key list, though, not `Omit`: a new column produces no error here,
 * and the comment that used to promise one was read as a guarantee by a plan that then skipped
 * the decision. Adding a column means coming here on purpose.
 *
 * `locomotion` is deliberately absent, and that is the decision rather than an omission. The
 * price of a minute outside is read off it (`LOCOMOTION_RATE`, `db/xp.ts`), so a hero who marked
 * their walk `run` would double their XP on identical GPS traces — a lie the phone cannot catch,
 * unlike the reps it also trusts, because the trace says the same thing either way. Every
 * hero-authored expedition is written `walk`, the lowest rate, by the writers below.
 */
export type UserExerciseDraft = {
  /** One name for both locales — the row is bilingual, the hero is not. */
  name: string;
  /** One description for both locales. */
  description: string;
} & Pick<
  Exercise,
  | "muscles"
  | "style"
  | "difficulty"
  | "equipment"
  | "pattern"
  | "measure"
  | "secondsPerRep"
  | "imagePath"
>;

/**
 * What the editor's fold starts at — the table's own defaults, restated once so the screen and
 * the writer cannot disagree about them.
 *
 * `muscles: []` is a real answer, not a missing one: an unclassified movement is counted nowhere,
 * and `getMuscleBalance` reports how much it is not counting rather than quietly shrinking a
 * total.
 */
/**
 * The tempo a hero may claim for their own movement.
 *
 * The stepper in `app/exercises/new.tsx` was the only thing enforcing this — the writers below
 * took `draft.secondsPerRep` raw — and it allowed up to 30. That is not cosmetic: XP counts
 * seconds of effort at this tempo, so 30 was a ×10 multiplier on every rep of a hero's own
 * movement, against a seeded catalogue that spans 1 to 5.
 *
 * 10 is twice the slowest movement anyone has authored. Past that it is not a repetition at all,
 * it is a hold, and holds have their own target type — which is measured rather than declared.
 */
export const SECONDS_PER_REP_RANGE = { min: 1, max: 10 };

function clampSecondsPerRep(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_SECONDS_PER_REP;
  return Math.min(
    SECONDS_PER_REP_RANGE.max,
    Math.max(SECONDS_PER_REP_RANGE.min, Math.round(value)),
  );
}

const DEFAULT_SECONDS_PER_REP = 3;

/**
 * How a hero's own movement covers ground, when it covers any.
 *
 * Not a field on the draft: see `UserExerciseDraft`. A movement that stops being an expedition
 * gives its locomotion back, so a row cannot keep a rate its style no longer earns.
 */
function locomotionFor(style: ExerciseStyle): Locomotion | null {
  return style === "expedition" ? "walk" : null;
}

export const DEFAULT_USER_EXERCISE_DRAFT: Omit<UserExerciseDraft, "name" | "description"> = {
  muscles: [],
  style: "strength",
  difficulty: "medium",
  equipment: "none",
  pattern: null,
  measure: "reps",
  secondsPerRep: DEFAULT_SECONDS_PER_REP,
  imagePath: "assets/placeholder.webp",
};

/** Drops the cached catalogue. Every writer below calls it; nothing else should have to. */
export function invalidateExercisesCache(): void {
  exercisesCache = null;
}

/**
 * The rows a hero may choose from — the catalogue, the quest editor's picker, the oath screen.
 *
 * Separate from `listExercises()` because that list is also how every screen resolves an id it
 * already holds, and those must keep resolving after a movement is retired.
 */
export function pickableExercises(all: Exercise[]): Exercise[] {
  return all.filter((e) => e.retiredAt === null);
}

/**
 * What the hero wrote, first.
 *
 * Ordering only — `pickableExercises` is what hides. Stable, so the caller's own order survives
 * inside each group: the catalogue sorts by name and keeps that, the quest picker keeps the
 * catalogue's. A hero-authored movement is one needle in sixty-odd, and its author is the one
 * person who cannot browse to find it.
 */
export function heroFirst(list: Exercise[]): Exercise[] {
  return [...list].sort((a, b) => Number(isUserExercise(b)) - Number(isUserExercise(a)));
}

async function assertHeroAuthored(id: number): Promise<void> {
  const rows = await db
    .select({ creator: exercises.creator })
    .from(exercises)
    .where(eq(exercises.id, id))
    .limit(1);

  const row = rows[0];
  if (!row) throw new Error(`Exercise ${id} not found`);
  if (row.creator === ADMIN_CREATOR) {
    throw new Error(`Exercise ${id} is not hero-authored — seed content is not editable`);
  }
}

/** Replace, not merge: the editor sends the whole set, and a stale tag is a wrong village. */
async function writeMuscles(exerciseId: number, muscles: MuscleCode[]): Promise<void> {
  await db.delete(exerciseMuscles).where(eq(exerciseMuscles.exerciseId, exerciseId));
  if (muscles.length === 0) return;
  await db
    .insert(exerciseMuscles)
    .values([...new Set(muscles)].map((muscle) => ({ exerciseId, muscle })));
}

export async function createUserExercise(draft: UserExerciseDraft): Promise<number> {
  // `.returning()` rather than "select the newest row with this name": the same id race
  // `createQuestTemplate` documents, and here two rows really can share a name across creators.
  const inserted = await db
    .insert(exercises)
    .values({
      // A hero writes in one language, so every column carries the same words.
      enName: draft.name,
      frName: draft.name,
      deName: draft.name,
      esName: draft.name,
      enDescription: draft.description,
      frDescription: draft.description,
      deDescription: draft.description,
      esDescription: draft.description,
      imagePath: draft.imagePath,
      creator: USER_EXERCISE_CREATOR,
      difficulty: draft.difficulty,
      equipment: draft.equipment,
      style: draft.style,
      pattern: draft.pattern,
      locomotion: locomotionFor(draft.style),
      measure: draft.measure,
      secondsPerRep: clampSecondsPerRep(draft.secondsPerRep),
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning({ id: exercises.id });

  const id = inserted[0]?.id;
  if (id == null) throw new Error("Failed to create exercise");

  await writeMuscles(id, draft.muscles);
  invalidateExercisesCache();
  return id;
}

export async function updateUserExercise(id: number, draft: UserExerciseDraft): Promise<void> {
  await assertHeroAuthored(id);

  await db
    .update(exercises)
    .set({
      // A hero writes in one language, so every column carries the same words.
      enName: draft.name,
      frName: draft.name,
      deName: draft.name,
      esName: draft.name,
      enDescription: draft.description,
      frDescription: draft.description,
      deDescription: draft.description,
      esDescription: draft.description,
      imagePath: draft.imagePath,
      difficulty: draft.difficulty,
      equipment: draft.equipment,
      style: draft.style,
      pattern: draft.pattern,
      locomotion: locomotionFor(draft.style),
      measure: draft.measure,
      secondsPerRep: clampSecondsPerRep(draft.secondsPerRep),
      updatedAt: new Date(),
    })
    .where(eq(exercises.id, id));

  await writeMuscles(id, draft.muscles);
  invalidateExercisesCache();
}

/**
 * What a delete would take with it. Every count is zero, or the row is retired instead.
 *
 * Read with `Object.values(...)`, never field by field: a caller that names the fields it knows
 * about keeps saying "deletable" after a new kind of reference is added here, which is exactly
 * how `swaps` and the oath went unnoticed until they were.
 */
export type ExerciseUsage = { completedRows: number; questRows: number; preferenceRows: number };

/**
 * References that live inside `user_preferences` JSON, where no join can reach them: a quest
 * config's `swaps` map (`db/questConfig.ts`) and the active oath's `exerciseId` (`db/oaths.ts`).
 * Delete a movement a quest swapped in and the slot silently reverts to the template's; delete
 * the one an oath names and the oath loses its title and can never progress again.
 *
 * Matched by shape rather than by key because `questConfig` imports this module — the key
 * builders cannot be imported back — and a shape survives a key being renamed.
 */
async function countPreferenceRefs(id: number): Promise<number> {
  const prefs = await getAllPreferences();
  let refs = 0;

  for (const raw of Object.values(prefs)) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Not JSON, or corrupt: every reader of these blobs already treats that as "absent".
      continue;
    }
    if (typeof parsed !== "object" || parsed === null) continue;

    const blob = parsed as { exerciseId?: unknown; swaps?: unknown };
    if (blob.exerciseId === id) refs += 1;
    if (typeof blob.swaps === "object" && blob.swaps !== null) {
      refs += Object.values(blob.swaps).filter((v) => v === id).length;
    }
  }

  return refs;
}

export async function getExerciseUsage(id: number): Promise<ExerciseUsage> {
  const [completedRows, questRows, preferenceRows] = await Promise.all([
    db
      .select({ n: count() })
      .from(schema.completedExercises)
      .where(eq(schema.completedExercises.exerciseId, id)),
    // Joined to `quests`, not counted straight off `quest_exercises`: foreign keys are OFF on
    // the device, so deleting a quest leaves its slots behind and the `ON DELETE CASCADE` in the
    // schema does nothing. Counting an orphan would strand the movement as "in use" by a quest
    // that no longer exists — undeletable forever, with nothing on screen to explain why.
    db
      .select({ n: count() })
      .from(schema.questExercises)
      .innerJoin(schema.quests, eq(schema.quests.id, schema.questExercises.questId))
      .where(eq(schema.questExercises.exerciseId, id)),
    countPreferenceRefs(id),
  ]);

  return {
    completedRows: completedRows[0]?.n ?? 0,
    questRows: questRows[0]?.n ?? 0,
    preferenceRows,
  };
}

export async function retireUserExercise(id: number): Promise<void> {
  await assertHeroAuthored(id);
  await db.update(exercises).set({ retiredAt: new Date() }).where(eq(exercises.id, id));
  invalidateExercisesCache();
}

/**
 * Puts a retired movement back where it can be chosen.
 *
 * Without this, "Retirer" is a one-way door while its own copy promises the opposite — *it
 * leaves the lists you pick from* — and the catalogue's "Retired" facet finds the movement
 * without being able to do anything with it.
 */
export async function unretireUserExercise(id: number): Promise<void> {
  await assertHeroAuthored(id);
  await db.update(exercises).set({ retiredAt: null }).where(eq(exercises.id, id));
  invalidateExercisesCache();
}

/**
 * Only ever the movement nothing has used — the typo made ten seconds ago.
 *
 * Foreign keys are off on the device, so SQLite would not stop this; nine queries innerJoin this
 * table, so it would silently take past volume, a village level and a personal record with it.
 * The count is the enforcement.
 */
export async function deleteUserExercise(id: number): Promise<void> {
  await assertHeroAuthored(id);

  const usage = await getExerciseUsage(id);
  if (Object.values(usage).some((n) => n > 0)) {
    throw new Error(
      `Exercise ${id} is in use (${usage.completedRows} results, ${usage.questRows} quest slots, ${usage.preferenceRows} saved choices) — retire it instead`,
    );
  }

  await db.delete(exerciseMuscles).where(eq(exerciseMuscles.exerciseId, id));
  // Slots whose quest is already gone are the only ones that can be here — `getExerciseUsage`
  // refuses the delete otherwise. Sweeping them keeps this path from leaving litter of its own,
  // since `ON DELETE CASCADE` does nothing on a device.
  await db.delete(schema.questExercises).where(eq(schema.questExercises.exerciseId, id));
  await db.delete(exercises).where(eq(exercises.id, id));
  invalidateExercisesCache();
}
