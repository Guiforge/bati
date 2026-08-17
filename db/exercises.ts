import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db, schema } from "./client";
import { isEquipmentCode } from "./equipment";
import { isMuscleCode } from "./muscles";
import {
  type DifficultyCode,
  type EquipmentCode,
  type ExerciseStyle,
  exerciseStyles,
  type MovementPattern,
  type MuscleCode,
} from "./schema";

const { exercises, exerciseMuscles } = schema;

const EXERCISE_STYLE_SET = new Set<ExerciseStyle>(exerciseStyles);

function isExerciseStyle(value: unknown): value is ExerciseStyle {
  return typeof value === "string" && EXERCISE_STYLE_SET.has(value as ExerciseStyle);
}

export type Exercise = {
  id: number;
  enName: string;
  frName: string;
  enDescription: string;
  frDescription: string;
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
   * The easier variation this one is built on (`0022`). Carried on the list row so the
   * catalogue can derive the whole ladder from the cached list instead of one query per row —
   * inverted, `prerequisite → this` is "what does this movement lead to".
   */
  prerequisiteExerciseId: number | null;
};

export { isEquipmentCode, isMuscleCode };

// Exercise definitions are static seed content (no in-app editing), so every screen that
// mounts (quest/adventure galleries, adventure details) can share one fetch instead of each
// re-querying on every navigation - the biggest source of the post-navigation loading flash.
let exercisesCache: Promise<Exercise[]> | null = null;

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Exercise list includes muscle groups and equipment filtering
async function fetchExercises(): Promise<Exercise[]> {
  const rows = await db
    .select({
      id: exercises.id,
      enName: exercises.enName,
      frName: exercises.frName,
      enDescription: exercises.enDescription,
      frDescription: exercises.frDescription,
      imagePath: exercises.imagePath,
      creator: exercises.creator,
      difficulty: exercises.difficulty,
      equipment: exercises.equipment,
      style: exercises.style,
      secondsPerRep: exercises.secondsPerRep,
      pattern: exercises.pattern,
      prerequisiteExerciseId: exercises.prerequisiteExerciseId,
      muscle: exerciseMuscles.muscle,
    })
    .from(exercises)
    .leftJoin(exerciseMuscles, eq(exerciseMuscles.exerciseId, exercises.id));

  const byId = new Map<number, Exercise>();

  for (const r of rows) {
    const current = byId.get(r.id);
    if (!current) {
      byId.set(r.id, {
        id: r.id,
        enName: r.enName,
        frName: r.frName,
        enDescription: r.enDescription,
        frDescription: r.frDescription,
        imagePath: r.imagePath,
        creator: r.creator,
        difficulty: r.difficulty,
        equipment: isEquipmentCode(r.equipment) ? r.equipment : "none",
        style: isExerciseStyle(r.style) ? r.style : "strength",
        secondsPerRep: typeof r.secondsPerRep === "number" ? r.secondsPerRep : 3,
        pattern: r.pattern ?? null,
        prerequisiteExerciseId: r.prerequisiteExerciseId,
        muscles: [],
      });
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

export async function getExerciseById(id: number): Promise<Exercise | null> {
  const rows = await db
    .select({
      id: exercises.id,
      enName: exercises.enName,
      frName: exercises.frName,
      enDescription: exercises.enDescription,
      frDescription: exercises.frDescription,
      imagePath: exercises.imagePath,
      creator: exercises.creator,
      difficulty: exercises.difficulty,
      equipment: exercises.equipment,
      style: exercises.style,
      secondsPerRep: exercises.secondsPerRep,
      pattern: exercises.pattern,
      prerequisiteExerciseId: exercises.prerequisiteExerciseId,
      muscle: exerciseMuscles.muscle,
    })
    .from(exercises)
    .leftJoin(exerciseMuscles, eq(exerciseMuscles.exerciseId, exercises.id))
    .where(eq(exercises.id, id));

  const first = rows[0];
  if (!first) return null;
  const ex: Exercise = {
    id: first.id,
    enName: first.enName,
    frName: first.frName,
    enDescription: first.enDescription,
    frDescription: first.frDescription,
    imagePath: first.imagePath,
    creator: first.creator,
    difficulty: first.difficulty,
    equipment: isEquipmentCode(first.equipment) ? first.equipment : "none",
    style: isExerciseStyle(first.style) ? first.style : "strength",
    secondsPerRep: typeof first.secondsPerRep === "number" ? first.secondsPerRep : 3,
    pattern: first.pattern ?? null,
    prerequisiteExerciseId: first.prerequisiteExerciseId,
    muscles: [],
  };

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

/** How many recent rows to scan when looking for the most recently trained movements. */
const RECENT_RESULT_ROWS = 60;

type MovementRef = { id: number; enName: string; frName: string; imagePath: string };

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
async function fetchLadderRows(): Promise<LadderRow[]> {
  return await db
    .select({
      id: exercises.id,
      enName: exercises.enName,
      frName: exercises.frName,
      imagePath: exercises.imagePath,
      prerequisiteExerciseId: exercises.prerequisiteExerciseId,
    })
    .from(exercises);
}

/**
 * How recent a session has to be to still count towards a rung. Ability is current, not
 * historical — three clean sets from last spring say nothing about today. Eight weeks is wide
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
 * ponytail: one indexed seek per movement (`completed_exercises_exercise_idx`), called with a
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

const stripPrerequisite = ({ id, enName, frName, imagePath }: LadderRow): MovementRef => ({
  id,
  enName,
  frName,
  imagePath,
});

async function buildStep(from: LadderRow, next: LadderRow): Promise<VariationStep> {
  const flags = await recentMetFlags(from.id, PROGRESSION_SESSIONS_REQUIRED);
  const metTarget = flags.filter(Boolean).length;

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

/** A rung on the chain leading to a movement, and whether the hero has mastered it. */
export type ChainRung = {
  exercise: MovementRef;
  metTarget: number;
  required: number;
  isEarned: boolean;
};

export type Chain = {
  /** Easiest first, ending on the movement asked for. */
  rungs: ChainRung[];
  /** 1-based rung the hero is standing on: the first one not yet mastered. */
  position: number;
};

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

  const rungs = await Promise.all(
    chain.map(async (row): Promise<ChainRung> => {
      const flags = await recentMetFlags(row.id, PROGRESSION_SESSIONS_REQUIRED);
      const metTarget = flags.filter(Boolean).length;
      return {
        exercise: stripPrerequisite(row),
        metTarget,
        required: PROGRESSION_SESSIONS_REQUIRED,
        isEarned: metTarget >= PROGRESSION_SESSIONS_REQUIRED,
      };
    }),
  );

  // Contiguous from the bottom: mastering a hard variation out of order does not skip the ones
  // below it, and the count would otherwise read as progress the hero has not made.
  let climbed = 0;
  while (rungs[climbed]?.isEarned) climbed++;

  return { rungs, position: Math.min(climbed + 1, rungs.length) };
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

/**
 * The step worth naming right now, across everything the hero has trained lately: one that is
 * already earned if there is one, otherwise the closest to being earned.
 *
 * This is what "progressive overload" means without weights, and it is the answer the journal owes
 * a bodyweight athlete — a harder variation, not a bigger multiplier.
 */
export async function getReadyStep(): Promise<VariationStep | null> {
  const recentRows = await db
    .select({ exerciseId: schema.completedExercises.exerciseId })
    .from(schema.completedExercises)
    .orderBy(desc(schema.completedExercises.performedAt), desc(schema.completedExercises.id))
    .limit(RECENT_RESULT_ROWS);

  // Most recently trained first: it doubles as the tie-break between two equally advanced steps.
  const recentIds = [...new Set(recentRows.map((r) => r.exerciseId))];
  if (recentIds.length === 0) return null;

  const rows = await fetchLadderRows();
  const byId = new Map(rows.map((r) => [r.id, r]));

  let best: VariationStep | null = null;

  for (const id of recentIds) {
    const from = byId.get(id);
    const next = rows.find((r) => r.prerequisiteExerciseId === id);
    if (!from || !next) continue;

    const step = await buildStep(from, next);
    if (!best || step.metTarget > best.metTarget) best = step;
    if (best.isEarned) break;
  }

  return best;
}
