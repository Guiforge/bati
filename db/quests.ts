import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "./client";
import { dayKey } from "./dates";
import { currentRungFor, type Exercise, listExercises, type MovementRef } from "./exercises";
import { isMuscleCode } from "./muscles";
import { type ExerciseGhost, getExerciseHistory, ghostKey } from "./personalRecords";
import { preferences, type TrainingLevel } from "./preferences";
import { clearCached, setCached } from "./queryCache";
import { clampToRange, REST_RANGE, ROUNDS_RANGE, TARGET_RANGE } from "./questConfig";
import {
  ADMIN_CREATOR,
  type ContentOwner,
  type DifficultyCode,
  type EquipmentCode,
  type ExerciseStyle,
  type MovementPattern,
  type MuscleCode,
  type QuestArchetype,
  type QuestTargetType,
} from "./schema";
import { Difficulty, generateTarget, type Target, type UserLevel } from "./targets";

const { exercises, exerciseMuscles, questExercises, quests } = schema;

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

export type { Target, UserLevel };
export { Difficulty, generateTarget };

export interface QuestExercise {
  /** quest_exercises row id, unique even if the same exercise repeats in a quest */
  id: number;

  /** Reference to the base exercise definition */
  exercise: Exercise;

  /** Optional quest-specific images */
  images: string[];

  /** Target for this quest – either repetitions or seconds */
  target: Target;

  /**
   * The movement the quest template actually names, when the hero is served an easier rung of its
   * chain instead. Absent on every slot that runs as written.
   *
   * Issue #33: a quest that hands classical push-ups to someone whose last session was wall
   * push-ups is a wall, not a stretch. The substitution is silent without this — and a quest that
   * quietly shows something other than its own card reads as a bug from where the hero sits.
   */
  substitutedFor?: MovementRef;

  /**
   * What the hero has already done on this movement, in *this slot's* unit — the best set of
   * their last session, and their all-time best. Absent when they have never trained it.
   *
   * It rides on the quest rather than living in the session store on purpose: `quest` is already
   * inside `SavedSessionState`, so a session recovered after a crash keeps its ghosts with no
   * second field to keep in sync, and the quest screen gets the same numbers from the same read.
   */
  ghost?: ExerciseGhost;
}

export type QuestTemplateExercise = {
  exerciseId: number;
  images: string[];
  baseTarget: {
    type: QuestTargetType;
    min: number;
    max: number;
  };
};

export type QuestTemplate = {
  id: number;
  enTitle: string;
  frTitle: string;
  enDescription: string;
  frDescription: string;
  author: ContentOwner;
  rounds: number;
  restSeconds: number;
  /** Rest between rounds. Null = no separate round rest, `restSeconds` applies there too. */
  roundRestSeconds: number | null;
  /** What kind of session this is. Null for user-authored quests. */
  archetype: QuestArchetype | null;
  imagePath: string;
  exercises: QuestTemplateExercise[];
};

export type Quest = {
  id: number;
  enTitle: string;
  frTitle: string;
  enDescription: string;
  frDescription: string;
  author: ContentOwner;
  rounds: number;
  restSeconds: number;
  /** Rest between rounds. Null = no separate round rest, `restSeconds` applies there too. */
  roundRestSeconds: number | null;
  /** What kind of session this is. Null for user-authored quests. */
  archetype: QuestArchetype | null;
  imagePath: string;
  exercises: QuestExercise[];
};

/** What a session trains — the answer to "is this arms or legs?" without reading its exercises. */
export type TrainingFocus = {
  /** The archetype the quests declare, `null` when none of them do. */
  archetype: QuestArchetype | null;
  /** The muscles carrying the volume, heaviest first, at most three. */
  muscles: MuscleCode[];
};

/**
 * One quest for a gallery card, every step's quest for a campaign poster. Both galleries read
 * this so a quest and the adventure containing it describe themselves the same way.
 */
export function trainingFocus(
  quests: QuestTemplate[],
  exercisesById: Record<number, Exercise>,
): TrainingFocus {
  const archetypes = new Map<QuestArchetype, number>();
  const muscles = new Map<MuscleCode, number>();

  for (const q of quests) {
    if (q.archetype) archetypes.set(q.archetype, (archetypes.get(q.archetype) ?? 0) + 1);
    for (const qex of q.exercises) {
      for (const m of exercisesById[qex.exerciseId]?.muscles ?? []) {
        muscles.set(m, (muscles.get(m) ?? 0) + 1);
      }
    }
  }

  // Maps iterate in insertion order and sort is stable, so ties break on the earliest exercise.
  const rankedMuscles = [...muscles.entries()].sort((a, b) => b[1] - a[1]);
  const leader = rankedMuscles[0]?.[1] ?? 0;

  return {
    archetype: [...archetypes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
    // An eight-session campaign touches all six muscle groups somewhere, and so does a long
    // quest; only the ones above half the leader's count say what it is actually *for*.
    muscles: rankedMuscles
      .filter(([, n]) => n * 2 >= leader)
      .slice(0, 3)
      .map(([m]) => m),
  };
}

// ------------------------------------------------------------
// Target generation
// ------------------------------------------------------------

// generateTarget moved to `db/targets.ts` for testability

function safeParseImages(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

// ------------------------------------------------------------
// DB helpers
// ------------------------------------------------------------

/**
 * Author stamped on quests written in the app. Seed content is "Admin"; only quests carrying this
 * author may be edited or deleted from the UI, so a content update can never be clobbered.
 */
export const USER_QUEST_AUTHOR = "hero";

export function isUserQuest(quest: Pick<QuestTemplate, "author">): boolean {
  return quest.author === USER_QUEST_AUTHOR;
}

export type CreateQuestTemplateInput = Omit<
  QuestTemplate,
  "id" | "author" | "imagePath" | "archetype"
> & {
  /** Seed quests carry authored art; a hero picks theirs, and null falls back to the placeholder. */
  imagePath?: string | null;
  author?: ContentOwner;
  /** Optional: user-authored quests declare no archetype. */
  archetype?: QuestArchetype | null;
};

export async function createQuestTemplate(input: CreateQuestTemplateInput): Promise<number> {
  // .returning() avoids the id race a "select the newest row with this title" lookup would
  // have: enTitle isn't unique, so two concurrent same-titled creations could both resolve
  // to the same (most recent) id and attach their exercises to the wrong quest.
  const inserted = await db
    .insert(quests)
    .values({
      enTitle: input.enTitle,
      frTitle: input.frTitle,
      enDescription: input.enDescription,
      frDescription: input.frDescription,
      author: input.author ?? ADMIN_CREATOR,
      imagePath: input.imagePath ?? null,
      rounds: clampToRange(input.rounds, ROUNDS_RANGE),
      restSeconds: clampToRange(input.restSeconds, REST_RANGE),
      roundRestSeconds:
        input.roundRestSeconds === null ? null : clampToRange(input.roundRestSeconds, REST_RANGE),
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning({ id: quests.id });

  let questId = inserted[0]?.id;
  if (questId == null) {
    const row = await db
      .select({ id: quests.id })
      .from(quests)
      .where(eq(quests.enTitle, input.enTitle))
      .orderBy(desc(quests.id))
      .limit(1);
    questId = row[0]?.id;
  }

  if (questId == null) throw new Error("Failed to create quest");

  if (input.exercises.length > 0) {
    await db.insert(questExercises).values(
      input.exercises.map((qex, i) => ({
        questId,
        exerciseId: qex.exerciseId,
        sortOrder: i,
        targetType: qex.baseTarget.type,
        targetMin: clampToRange(qex.baseTarget.min, TARGET_RANGE),
        targetMax: clampToRange(qex.baseTarget.max, TARGET_RANGE),
        imagesJson: JSON.stringify(qex.images ?? []),
      })),
    );
  }

  invalidateQuestTemplates();
  return questId;
}

// The gallery is read far more often than it is written, so every screen that mounts it shares one
// fetch instead of refetching on every navigation. Authoring writes go through the helpers below,
// which all call `invalidateQuestTemplates`.
let questTemplatesCache: Promise<QuestTemplate[]> | null = null;

/** Drop the shared list and any cached quest detail, so the next read sees the write. */
export function invalidateQuestTemplates(questId?: number): void {
  questTemplatesCache = null;
  clearCached(questId == null ? "quest:" : `quest:${questId}:`);
}

async function fetchQuestTemplates(): Promise<QuestTemplate[]> {
  const rows = await db
    .select({
      questId: quests.id,
      enTitle: quests.enTitle,
      frTitle: quests.frTitle,
      enDescription: quests.enDescription,
      frDescription: quests.frDescription,
      author: quests.author,
      rounds: quests.rounds,
      restSeconds: quests.restSeconds,
      roundRestSeconds: quests.roundRestSeconds,
      archetype: quests.archetype,
      imagePath: quests.imagePath,

      questExerciseId: questExercises.id,
      sortOrder: questExercises.sortOrder,
      exerciseId: questExercises.exerciseId,
      targetType: questExercises.targetType,
      targetMin: questExercises.targetMin,
      targetMax: questExercises.targetMax,
      imagesJson: questExercises.imagesJson,
    })
    .from(quests)
    .leftJoin(questExercises, eq(questExercises.questId, quests.id))
    .orderBy(quests.id, questExercises.sortOrder);

  const byId = new Map<number, QuestTemplate>();

  for (const r of rows) {
    if (!byId.has(r.questId)) {
      byId.set(r.questId, {
        id: r.questId,
        enTitle: r.enTitle,
        frTitle: r.frTitle,
        enDescription: r.enDescription,
        frDescription: r.frDescription,
        author: r.author,
        rounds: r.rounds,
        restSeconds: r.restSeconds,
        roundRestSeconds: r.roundRestSeconds,
        archetype: r.archetype ?? null,
        imagePath: r.imagePath ?? "assets/placeholder.jpg",
        exercises: [],
      });
    }

    if (
      r.questExerciseId == null ||
      r.exerciseId == null ||
      r.targetType == null ||
      r.targetMin == null ||
      r.targetMax == null ||
      r.imagesJson == null
    ) {
      continue;
    }

    byId.get(r.questId)?.exercises.push({
      exerciseId: r.exerciseId,
      images: safeParseImages(r.imagesJson),
      baseTarget: {
        type: r.targetType,
        min: r.targetMin,
        max: r.targetMax,
      },
    });
  }

  return [...byId.values()];
}

export function listQuestTemplates(): Promise<QuestTemplate[]> {
  if (!questTemplatesCache) {
    questTemplatesCache = fetchQuestTemplates().catch((e) => {
      questTemplatesCache = null;
      throw e;
    });
  }
  return questTemplatesCache;
}

export async function getQuestTemplateById(id: number): Promise<QuestTemplate | null> {
  const rows = await db
    .select({
      questId: quests.id,
      enTitle: quests.enTitle,
      frTitle: quests.frTitle,
      enDescription: quests.enDescription,
      frDescription: quests.frDescription,
      author: quests.author,
      rounds: quests.rounds,
      restSeconds: quests.restSeconds,
      roundRestSeconds: quests.roundRestSeconds,
      archetype: quests.archetype,
      imagePath: quests.imagePath,

      questExerciseId: questExercises.id,
      sortOrder: questExercises.sortOrder,
      exerciseId: questExercises.exerciseId,
      targetType: questExercises.targetType,
      targetMin: questExercises.targetMin,
      targetMax: questExercises.targetMax,
      imagesJson: questExercises.imagesJson,
    })
    .from(quests)
    .leftJoin(questExercises, eq(questExercises.questId, quests.id))
    .where(eq(quests.id, id))
    .orderBy(questExercises.sortOrder);

  const first = rows[0];
  if (!first) return null;

  const quest: QuestTemplate = {
    id: first.questId,
    enTitle: first.enTitle,
    frTitle: first.frTitle,
    enDescription: first.enDescription,
    frDescription: first.frDescription,
    author: first.author,
    rounds: first.rounds,
    restSeconds: first.restSeconds,
    roundRestSeconds: first.roundRestSeconds,
    archetype: first.archetype ?? null,
    imagePath: first.imagePath ?? "assets/placeholder.jpg",
    exercises: [],
  };

  for (const r of rows) {
    if (
      r.questExerciseId == null ||
      r.exerciseId == null ||
      r.targetType == null ||
      r.targetMin == null ||
      r.targetMax == null ||
      r.imagesJson == null
    ) {
      continue;
    }

    quest.exercises.push({
      exerciseId: r.exerciseId,
      images: safeParseImages(r.imagesJson),
      baseTarget: {
        type: r.targetType,
        min: r.targetMin,
        max: r.targetMax,
      },
    });
  }

  return quest;
}

type SlotRow = {
  qexId: number;
  targetType: QuestTargetType;
  targetMin: number;
  targetMax: number;
  imagesJson: string;
  exId: number;
  exEnName: string;
  exFrName: string;
  exEnDescription: string;
  exFrDescription: string;
  exImagePath: string;
  exCreator: ContentOwner;
  exDifficulty: DifficultyCode;
  exEquipment: EquipmentCode;
  exStyle: ExerciseStyle | null;
  exSecondsPerRep: number;
  exPattern: MovementPattern | null;
  exPrerequisiteId: number | null;
  exRetiredAt: Date | null;
};

/**
 * One slot of a quest, resolved for this hero.
 *
 * Split out of `getQuestById` so the substitution (issue #33) does not push one function past
 * what anyone can hold in their head — the loop that calls this only has to know that a row
 * either opens a slot or adds a muscle to one.
 */
function buildSlot(
  r: SlotRow,
  ctx: {
    userLevel: UserLevel;
    servedId: (exerciseId: number) => number;
    catalogue: Map<number, Exercise>;
    history: Map<string, ExerciseGhost>;
  },
): QuestExercise {
  const base = { type: r.targetType, min: r.targetMin, max: r.targetMax };

  // The movement this slot will actually run. Identical to the written one unless the hero is
  // still working a rung below it — and never for a quest they authored themselves.
  const served = ctx.catalogue.get(ctx.servedId(r.exId));
  const isSubstituted = served !== undefined && served.id !== r.exId;
  const effectiveId = ctx.servedId(r.exId);

  return {
    id: r.qexId,
    exercise: served ?? {
      id: r.exId,
      enName: r.exEnName,
      frName: r.exFrName,
      enDescription: r.exEnDescription,
      frDescription: r.exFrDescription,
      imagePath: r.exImagePath,
      creator: r.exCreator,
      difficulty: r.exDifficulty,
      equipment: r.exEquipment,
      style: r.exStyle ?? "strength",
      secondsPerRep: r.exSecondsPerRep,
      pattern: r.exPattern ?? null,
      prerequisiteExerciseId: r.exPrerequisiteId,
      retiredAt: r.exRetiredAt,
      muscles: [],
    },
    // The quest's own art is *of the movement the template wrote*; on a substituted slot it
    // would illustrate the wrong exercise. Same call `applyQuestConfig` makes on a swap.
    images: isSubstituted ? [] : safeParseImages(r.imagesJson),
    target: generateTarget(
      base,
      ctx.userLevel,
      ctx.history.get(ghostKey(effectiveId, "time"))?.best,
    ),
    // In the slot's own unit: a movement trained both ways has two records, and showing the
    // hold next to a rep target would be a number the hero cannot act on.
    ghost: ctx.history.get(ghostKey(effectiveId, r.targetType)),
    // What the template asked for, when that is not what runs — the screens owe the hero an
    // explanation and a way back, and nothing else in the object can tell them.
    substitutedFor: isSubstituted
      ? { id: r.exId, enName: r.exEnName, frName: r.exFrName, imagePath: r.exImagePath }
      : undefined,
  };
}

export async function getQuestById(id: number, userLevel: UserLevel): Promise<Quest | null> {
  // Join quests -> quest_exercises -> exercises -> exercise_muscles and aggregate.
  const rows = await db
    .select({
      questId: quests.id,
      enTitle: quests.enTitle,
      frTitle: quests.frTitle,
      enDescription: quests.enDescription,
      frDescription: quests.frDescription,
      author: quests.author,
      rounds: quests.rounds,
      restSeconds: quests.restSeconds,
      roundRestSeconds: quests.roundRestSeconds,
      archetype: quests.archetype,
      imagePath: quests.imagePath,

      qexId: questExercises.id,
      sortOrder: questExercises.sortOrder,
      targetType: questExercises.targetType,
      targetMin: questExercises.targetMin,
      targetMax: questExercises.targetMax,
      imagesJson: questExercises.imagesJson,

      exId: exercises.id,
      exEnName: exercises.enName,
      exFrName: exercises.frName,
      exEnDescription: exercises.enDescription,
      exFrDescription: exercises.frDescription,
      exImagePath: exercises.imagePath,
      exCreator: exercises.creator,
      exDifficulty: exercises.difficulty,
      exEquipment: exercises.equipment,
      exStyle: exercises.style,
      exSecondsPerRep: exercises.secondsPerRep,
      exPattern: exercises.pattern,
      exPrerequisiteId: exercises.prerequisiteExerciseId,
      exRetiredAt: exercises.retiredAt,

      muscle: exerciseMuscles.muscle,
    })
    .from(quests)
    .innerJoin(questExercises, eq(questExercises.questId, quests.id))
    .innerJoin(exercises, eq(exercises.id, questExercises.exerciseId))
    .leftJoin(exerciseMuscles, eq(exerciseMuscles.exerciseId, exercises.id))
    .where(eq(quests.id, id))
    .orderBy(questExercises.sortOrder);

  const first = rows[0];
  if (!first) return null;

  // What the hero is actually working, per slot — a quest that names classical push-ups serves
  // wall push-ups to someone who has not earned the rungs below (issue #33). Resolved before the
  // journal read below, because a substituted slot must be priced and ghosted against the movement
  // it will actually run, not the one the template wrote.
  //
  // Hero-authored quests are left exactly as written: substituting there would be correcting
  // someone's own authoring, which is not this function's business.
  const substitutes = isUserQuest(first)
    ? new Map<number, number>()
    : await currentRungFor(rows.map((r) => r.exId));
  const servedId = (exerciseId: number): number => substitutes.get(exerciseId) ?? exerciseId;

  // Two things come out of the journal here, in one grouped query: the longest hold, because a
  // hold is prescribed from the hero's own maximum (60-75% of it), and the ghost every slot shows
  // — what they did last time on this movement. Both are per (movement, unit), so one read
  // answers both and nothing is fetched again mid-session.
  const history = await getExerciseHistory([
    ...new Set(rows.flatMap((r) => [r.exId, servedId(r.exId)])),
  ]);

  // A substituted slot needs the whole movement, not the four fields the ladder carries: the
  // session prices it by `difficulty` and `secondsPerRep`, and the village counts its muscles.
  // `listExercises()` is promise-cached, so this is free after the first read anywhere.
  const catalogue = new Map<number, Exercise>(
    substitutes.size > 0 ? (await listExercises()).map((e) => [e.id, e]) : [],
  );

  const quest: Quest = {
    id: first.questId,
    enTitle: first.enTitle,
    frTitle: first.frTitle,
    enDescription: first.enDescription,
    frDescription: first.frDescription,
    author: first.author,
    rounds: first.rounds,
    restSeconds: first.restSeconds,
    roundRestSeconds: first.roundRestSeconds,
    archetype: first.archetype ?? null,
    imagePath: first.imagePath ?? "assets/placeholder.jpg",
    exercises: [],
  };

  const byQuestExercise = new Map<number, QuestExercise>();

  for (const r of rows) {
    let qex = byQuestExercise.get(r.qexId);
    if (!qex) {
      qex = buildSlot(r, { userLevel, servedId, catalogue, history });
      byQuestExercise.set(r.qexId, qex);
      quest.exercises.push(qex);
    }

    // The join carries the *written* movement's muscles; a substituted slot already arrived with
    // its own from the catalogue and must not collect the other one's.
    if (
      qex.exercise.id === r.exId &&
      isMuscleCode(r.muscle) &&
      !qex.exercise.muscles.includes(r.muscle)
    ) {
      qex.exercise.muscles.push(r.muscle);
    }
  }

  setCached(`quest:${id}:${userLevel}`, quest);
  return quest;
}

export async function deleteQuest(id: number): Promise<void> {
  await db.delete(quests).where(eq(quests.id, id));
  invalidateQuestTemplates(id);
}

export async function updateQuestMeta(
  id: number,
  patch: Partial<
    Pick<
      QuestTemplate,
      | "enTitle"
      | "frTitle"
      | "enDescription"
      | "frDescription"
      | "rounds"
      | "restSeconds"
      | "roundRestSeconds"
    >
  > & {
    /**
     * Widened from `QuestTemplate`, where readers default it to the placeholder path: null is a
     * real answer here — "this quest has no cover" — and the gallery paints a muscle-tinted
     * banner for it rather than a grey plate.
     */
    imagePath?: string | null;
  },
): Promise<void> {
  await db
    .update(quests)
    .set({
      ...patch,
      // Spread first, then re-state the bounded columns: `...patch` is a partial, so each one is
      // only touched when the caller actually sent it.
      ...(patch.rounds === undefined ? {} : { rounds: clampToRange(patch.rounds, ROUNDS_RANGE) }),
      ...(patch.restSeconds === undefined
        ? {}
        : { restSeconds: clampToRange(patch.restSeconds, REST_RANGE) }),
      ...(patch.roundRestSeconds === undefined || patch.roundRestSeconds === null
        ? {}
        : { roundRestSeconds: clampToRange(patch.roundRestSeconds, REST_RANGE) }),
      updatedAt: new Date(),
    })
    .where(eq(quests.id, id));

  invalidateQuestTemplates(id);
}

export async function setQuestExercises(
  questId: number,
  next: QuestTemplateExercise[],
): Promise<void> {
  type TransactionCallback = Parameters<(typeof db)["transaction"]>[0];
  type TransactionTx = Parameters<TransactionCallback>[0];

  const run = async (tx: TransactionTx) => {
    await tx.delete(questExercises).where(eq(questExercises.questId, questId));

    if (next.length === 0) return;

    await tx.insert(questExercises).values(
      next.map((qex, i) => ({
        questId,
        exerciseId: qex.exerciseId,
        sortOrder: i,
        targetType: qex.baseTarget.type,
        targetMin: clampToRange(qex.baseTarget.min, TARGET_RANGE),
        targetMax: clampToRange(qex.baseTarget.max, TARGET_RANGE),
        imagesJson: JSON.stringify(qex.images ?? []),
      })),
    );
  };

  try {
    await db.transaction(run);
  } catch (e) {
    if (
      e instanceof TypeError &&
      typeof e.message === "string" &&
      e.message.includes("Transaction function cannot return a promise")
    ) {
      await run(db as unknown as TransactionTx);
      invalidateQuestTemplates(questId);
      return;
    }
    throw e;
  }

  invalidateQuestTemplates(questId);
}

/** @legacy Garde-fou de seed ; les invariants de contenu sont testés à la place. */
export async function ensureQuestHasExercise(
  questId: number,
  exerciseId: number,
  baseTarget: { type: QuestTargetType; min: number; max: number },
): Promise<void> {
  const existing = await db
    .select({ id: questExercises.id })
    .from(questExercises)
    .where(and(eq(questExercises.questId, questId), eq(questExercises.exerciseId, exerciseId)))
    .limit(1);

  if (existing.length > 0) return;

  const last = await db
    .select({ sortOrder: questExercises.sortOrder })
    .from(questExercises)
    .where(eq(questExercises.questId, questId))
    .orderBy(desc(questExercises.sortOrder))
    .limit(1);

  const sortOrder = (last[0]?.sortOrder ?? -1) + 1;

  await db.insert(questExercises).values({
    questId,
    exerciseId,
    sortOrder,
    targetType: baseTarget.type,
    targetMin: baseTarget.min,
    targetMax: baseTarget.max,
    imagesJson: "[]",
  });

  invalidateQuestTemplates(questId);
}

// ------------------------------------------------------------
// Eligibility — what the app is allowed to put in front of this user
// ------------------------------------------------------------

const DIFFICULTY_RANK: Record<DifficultyCode, number> = { easy: 0, medium: 1, hard: 2 };
const LEVEL_BY_RANK: TrainingLevel[] = ["beginner", "regular", "advanced"];

/**
 * The level a quest is written for, derived from the difficulty of its exercises rather than
 * stored: quests have no level column, and one hard movement should not make a whole session
 * advanced. The upper median is used, so a lone easy finisher cannot soften a hard quest either.
 */
export function questTrainingLevel(difficulties: DifficultyCode[]): TrainingLevel {
  if (difficulties.length === 0) return "regular";

  const ranks = difficulties.map((d) => DIFFICULTY_RANK[d]).sort((a, b) => a - b);
  const median = ranks[Math.ceil(ranks.length / 2) - 1];
  // In range by construction — the index comes from the array's own length — but the type
  // cannot see it. Falls back to the same value the empty case returns.
  return median === undefined ? "regular" : (LEVEL_BY_RANK[median] ?? "regular");
}

/**
 * Quest ids the app may suggest, given what the hero owns and where they are starting from.
 *
 * Only two things are excluded, both because they leave the user stuck rather than challenged:
 * equipment they do not have, and advanced quests for someone who said they are a beginner.
 * A "regular" hero still gets offered advanced work — that is a stretch, not a wall — and a
 * hero who skipped the onboarding question (`null`) is not filtered at all.
 */
/**
 * ponytail: eligibility reads the template, so a quest the hero has swapped the barbell movement
 * out of is still hidden from them. Half-serves the case substitution exists for. Folding saved
 * swaps in means scanning `user_preferences` here, on a path Home hits on every mount — do it
 * when someone reports the quest staying hidden after they fixed it.
 */
export async function getEligibleQuestIds(): Promise<Set<number>> {
  const [ownedEquipment, trainingLevel, rows] = await Promise.all([
    preferences.getOwnedEquipment(),
    preferences.getTrainingLevel(),
    db
      .select({
        questId: questExercises.questId,
        difficulty: exercises.difficulty,
        equipment: exercises.equipment,
      })
      .from(questExercises)
      .innerJoin(exercises, eq(exercises.id, questExercises.exerciseId)),
  ]);

  const byQuest = new Map<number, { difficulties: DifficultyCode[]; equipment: Set<string> }>();
  for (const row of rows) {
    const entry = byQuest.get(row.questId) ?? { difficulties: [], equipment: new Set<string>() };
    entry.difficulties.push(row.difficulty);
    if (row.equipment !== "none") entry.equipment.add(row.equipment);
    byQuest.set(row.questId, entry);
  }

  const owned = ownedEquipment === null ? null : new Set<string>(ownedEquipment);
  const eligible = new Set<number>();

  for (const [questId, entry] of byQuest) {
    const hasKit = owned === null || [...entry.equipment].every((code) => owned.has(code));
    const tooHard =
      trainingLevel === "beginner" && questTrainingLevel(entry.difficulties) === "advanced";

    if (hasKit && !tooHard) eligible.add(questId);
  }

  return eligible;
}

/**
 * A quest the hero can train tonight that contains this movement.
 *
 * The bridge from an oath to a session: swearing "15 pull-ups" names an exercise, the ladder names
 * the rung to train for it, and this turns that rung into something to press play on. Without it
 * the objective the hero chose never reaches the content — Home would keep suggesting whatever
 * muscle was lagging instead.
 *
 * Seed content first, then the fewest exercises: a four-movement quest built around the rung beats
 * a twelve-movement circuit that happens to include it.
 */
export async function findQuestWithExercise(exerciseId: number): Promise<number | null> {
  const [eligible, rows] = await Promise.all([
    getEligibleQuestIds(),
    db
      .select({
        questId: questExercises.questId,
        exerciseId: questExercises.exerciseId,
        author: quests.author,
      })
      .from(questExercises)
      .innerJoin(quests, eq(quests.id, questExercises.questId)),
  ]);

  const byQuest = new Map<number, { size: number; hasIt: boolean; author: ContentOwner }>();
  for (const row of rows) {
    const entry = byQuest.get(row.questId) ?? { size: 0, hasIt: false, author: row.author };
    entry.size++;
    if (row.exerciseId === exerciseId) entry.hasIt = true;
    byQuest.set(row.questId, entry);
  }

  const pool = [...byQuest].filter(([id, entry]) => entry.hasIt && eligible.has(id));
  if (pool.length === 0) return null;

  pool.sort(
    ([idA, a], [idB, b]) =>
      Number(a.author === USER_QUEST_AUTHOR) - Number(b.author === USER_QUEST_AUTHOR) ||
      a.size - b.size ||
      idA - idB,
  );

  // `pool` is non-empty (guarded above), but the type does not say so.
  return pool[0]?.[0] ?? null;
}

/**
 * Get the daily quest based on the current date.
 * Deterministically picks a quest from all available quests the user can actually train.
 */
async function pickDailyTemplate(): Promise<QuestTemplate | null> {
  const templates = await listQuestTemplates();
  if (templates.length === 0) return null;

  // Falling back to the whole catalogue keeps the daily bonus reachable even if the hero's
  // filters leave nothing — an empty pool would silently remove the bonus altogether.
  const eligible = await getEligibleQuestIds();
  const pool = templates.filter((tpl) => eligible.has(tpl.id));
  const candidates = pool.length > 0 ? pool : templates;

  const today = dayKey(new Date());
  let hash = 0;
  for (let i = 0; i < today.length; i++) {
    hash = (hash << 5) - hash + today.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }

  // Modulo the array's own length, so always in range; the type does not know that.
  return candidates[Math.abs(hash) % candidates.length] ?? null;
}

/** @legacy La quête du jour ; l'accueil décide autrement depuis useSmartAction. */
export async function getDailyQuest(userLevel: UserLevel): Promise<Quest | null> {
  const template = await pickDailyTemplate();
  return template ? await getQuestById(template.id, userLevel) : null;
}

export async function isDailyQuest(questId: number): Promise<boolean> {
  const template = await pickDailyTemplate();
  return template?.id === questId;
}
