import { and, asc, count, desc, eq, sql } from "drizzle-orm";
import { getBossFightByAdventure, resetBossFight } from "./bossFights";
import { db, schema } from "./client";
import { listExercises } from "./exercises";
import {
  listQuestTemplates,
  type QuestTemplate,
  type TrainingFocus,
  trainingFocus,
} from "./quests";
import type { DifficultyCode } from "./schema";

const { adventureRuns, adventureRunSteps, adventures, adventureSteps, questExercises, quests } =
  schema;

function safeParseImages(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export type AdventureKind = "route" | "boss" | "event";

export type AdventureStepTemplate = {
  id: number;
  adventureId: number;
  stepIndex: number;
  questId: number;
  // Localized narratives.
  enNarrative: string;
  frNarrative: string;
  quest: QuestTemplate;
  imagePath: string | null;
};

export type AdventureRun = {
  id: number;
  adventureId: number;
  status: "active" | "finished";
  difficultyOverride: DifficultyCode | null;
  startedAt: Date | null;
  finishedAt: Date | null;
};

export type AdventureRunStep = {
  id: number;
  runId: number;
  stepIndex: number;
  questId: number;
  status: "locked" | "active" | "completed";
  completedSessionId: number | null;
  startedAt: Date | null;
  completedAt: Date | null;
};

export type Adventure = {
  id: number;
  coverQuestId: number;
  sortOrder: number;
  kind: AdventureKind;
  isActive: number;
  author: string;
  enTitle: string;
  frTitle: string;
  enDescription: string;
  frDescription: string;
  coverQuest: QuestTemplate;
  stepsCount: number;
  imagePath: string | null;
  focus: TrainingFocus;
};

export type AdventureDetails = {
  adventure: Pick<
    Adventure,
    | "id"
    | "sortOrder"
    | "kind"
    | "isActive"
    | "author"
    | "enTitle"
    | "frTitle"
    | "enDescription"
    | "frDescription"
    | "coverQuestId"
    | "imagePath"
    | "focus"
  >;
  steps: AdventureStepTemplate[];
};

export type ActiveAdventureRun = {
  run: AdventureRun;
  steps: AdventureRunStep[];
  activeStep: AdventureRunStep | null;
};

function normalizeDate(value: unknown): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return value;
  if (typeof value === "number") return new Date(value);
  return null;
}

// Same static-seed-content reasoning as listQuestTemplates(): no live authoring flow, so the
// gallery fetch can be shared across mounts instead of refetched on every navigation.
let adventuresCache: Promise<Adventure[]> | null = null;

async function fetchAdventures(): Promise<Adventure[]> {
  const rows = await db
    .select({
      adventureId: adventures.id,
      coverQuestId: adventures.questId,
      sortOrder: adventures.sortOrder,
      kind: adventures.kind,
      isActive: adventures.isActive,

      advAuthor: adventures.author,

      advEnTitle: adventures.enTitle,
      advFrTitle: adventures.frTitle,
      advEnDescription: adventures.enDescription,
      advFrDescription: adventures.frDescription,
      advImagePath: adventures.imagePath,

      enTitle: quests.enTitle,
      frTitle: quests.frTitle,
      enDescription: quests.enDescription,
      frDescription: quests.frDescription,
      questAuthor: quests.author,
      rounds: quests.rounds,
      restSeconds: quests.restSeconds,
      questImagePath: quests.imagePath,

      questExerciseId: questExercises.id,
      qexSortOrder: questExercises.sortOrder,
      exerciseId: questExercises.exerciseId,
      targetType: questExercises.targetType,
      targetMin: questExercises.targetMin,
      targetMax: questExercises.targetMax,
      imagesJson: questExercises.imagesJson,
    })
    .from(adventures)
    .innerJoin(quests, eq(quests.id, adventures.questId))
    .leftJoin(questExercises, eq(questExercises.questId, quests.id))
    .where(eq(adventures.isActive, 1))
    .orderBy(asc(adventures.sortOrder), asc(questExercises.sortOrder));

  const stepRows = await db
    .select({ adventureId: adventureSteps.adventureId, questId: adventureSteps.questId })
    .from(adventureSteps)
    .innerJoin(adventures, eq(adventures.id, adventureSteps.adventureId))
    .where(eq(adventures.isActive, 1));

  const stepQuestIdsByAdventureId = new Map<number, number[]>();
  for (const r of stepRows) {
    const ids = stepQuestIdsByAdventureId.get(r.adventureId);
    if (ids) ids.push(r.questId);
    else stepQuestIdsByAdventureId.set(r.adventureId, [r.questId]);
  }

  // Both are cached module-wide (see listQuestTemplates / listExercises), so resolving what every
  // step actually trains costs no extra round-trip.
  const [templates, exercises] = await Promise.all([listQuestTemplates(), listExercises()]);
  const templatesById = new Map(templates.map((q) => [q.id, q] as const));
  const exercisesById = Object.fromEntries(exercises.map((e) => [e.id, e] as const));

  const byAdventureId = new Map<number, Adventure>();

  for (const r of rows) {
    if (!byAdventureId.has(r.adventureId)) {
      const stepQuestIds = stepQuestIdsByAdventureId.get(r.adventureId) ?? [];
      const quest: QuestTemplate = {
        id: r.coverQuestId,
        enTitle: r.enTitle,
        frTitle: r.frTitle,
        enDescription: r.enDescription,
        frDescription: r.frDescription,
        author: r.questAuthor,
        rounds: r.rounds,
        restSeconds: r.restSeconds,
        // The adventure gallery only needs the cover quest's identity, not its shape.
        archetype: null,
        imagePath: r.questImagePath ?? "assets/placeholder.jpg",
        exercises: [],
      };

      byAdventureId.set(r.adventureId, {
        id: r.adventureId,
        coverQuestId: r.coverQuestId,
        sortOrder: r.sortOrder,
        kind: (r.kind as AdventureKind) ?? "route",
        isActive: r.isActive,
        author: r.advAuthor,
        enTitle: r.advEnTitle,
        frTitle: r.advFrTitle,
        enDescription: r.advEnDescription,
        frDescription: r.advFrDescription,
        coverQuest: quest,
        stepsCount: stepQuestIds.length,
        imagePath: r.advImagePath,
        focus: trainingFocus(
          stepQuestIds.flatMap((id) => templatesById.get(id) ?? []),
          exercisesById,
        ),
      });
    }

    const adv = byAdventureId.get(r.adventureId);
    if (!adv) continue;

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

    adv.coverQuest.exercises.push({
      exerciseId: r.exerciseId,
      images: safeParseImages(r.imagesJson),
      baseTarget: {
        type: r.targetType,
        min: r.targetMin,
        max: r.targetMax,
      },
    });
  }

  // Adventures are campaigns: only return multi-step content.
  return [...byAdventureId.values()].filter((a) => a.stepsCount >= 2);
}

export function listAdventures(): Promise<Adventure[]> {
  if (!adventuresCache) {
    adventuresCache = fetchAdventures().catch((e) => {
      adventuresCache = null;
      throw e;
    });
  }
  return adventuresCache;
}

// Static seed content (same reasoning as listAdventures/listQuestTemplates): the details for a
// given adventure never change at runtime, so share one fetch across mounts instead of re-running
// the whole query chain on every navigation into the screen.
const adventureDetailsCache = new Map<number, Promise<AdventureDetails | null>>();

export function getAdventureDetails(adventureId: number): Promise<AdventureDetails | null> {
  let cached = adventureDetailsCache.get(adventureId);
  if (!cached) {
    cached = fetchAdventureDetails(adventureId).catch((e) => {
      adventureDetailsCache.delete(adventureId);
      throw e;
    });
    adventureDetailsCache.set(adventureId, cached);
  }
  return cached;
}

async function fetchAdventureDetails(adventureId: number): Promise<AdventureDetails | null> {
  const base = await db
    .select({
      id: adventures.id,
      coverQuestId: adventures.questId,
      sortOrder: adventures.sortOrder,
      kind: adventures.kind,
      isActive: adventures.isActive,
      author: adventures.author,
      enTitle: adventures.enTitle,
      frTitle: adventures.frTitle,
      enDescription: adventures.enDescription,
      frDescription: adventures.frDescription,
      imagePath: adventures.imagePath,
    })
    .from(adventures)
    .where(eq(adventures.id, adventureId))
    .limit(1);

  const first = base[0];
  if (!first) return null;

  const steps = await db
    .select({
      id: adventureSteps.id,
      adventureId: adventureSteps.adventureId,
      stepIndex: adventureSteps.stepIndex,
      questId: adventureSteps.questId,
      enNarrative: adventureSteps.enNarrative,
      frNarrative: adventureSteps.frNarrative,
      imagePath: adventureSteps.imagePath,
    })
    .from(adventureSteps)
    .where(eq(adventureSteps.adventureId, adventureId))
    .orderBy(asc(adventureSteps.stepIndex));

  const effectiveSteps =
    steps.length > 0
      ? steps
      : [
          {
            id: 0,
            adventureId,
            stepIndex: 0,
            questId: first.coverQuestId,
            enNarrative: "",
            frNarrative: "",
            imagePath: first.imagePath,
          },
        ];

  // All quest templates and exercises are already cached in memory; resolve steps from those maps
  // instead of one sequential DB query per step (the old N+1). Zero extra round-trips.
  const [templates, exercises] = await Promise.all([listQuestTemplates(), listExercises()]);
  const templatesById = new Map(templates.map((q) => [q.id, q] as const));

  const resolved: AdventureStepTemplate[] = [];
  for (const s of effectiveSteps) {
    const q = templatesById.get(s.questId);
    if (!q) continue;
    resolved.push({
      id: s.id,
      adventureId: s.adventureId,
      stepIndex: s.stepIndex,
      questId: s.questId,
      enNarrative: s.enNarrative,
      frNarrative: s.frNarrative,
      quest: q,
      imagePath: s.imagePath,
    });
  }

  return {
    adventure: {
      id: first.id,
      coverQuestId: first.coverQuestId,
      sortOrder: first.sortOrder,
      kind: (first.kind as AdventureKind) ?? "route",
      isActive: first.isActive,
      author: first.author,
      enTitle: first.enTitle,
      frTitle: first.frTitle,
      enDescription: first.enDescription,
      frDescription: first.frDescription,
      imagePath: first.imagePath,
      focus: trainingFocus(
        resolved.map((s) => s.quest),
        Object.fromEntries(exercises.map((e) => [e.id, e] as const)),
      ),
    },
    steps: resolved,
  };
}

export async function getActiveAdventureRun(
  adventureId: number,
): Promise<ActiveAdventureRun | null> {
  const runRows = await db
    .select({
      id: adventureRuns.id,
      adventureId: adventureRuns.adventureId,
      status: adventureRuns.status,
      difficultyOverride: adventureRuns.difficultyOverride,
      startedAt: adventureRuns.startedAt,
      finishedAt: adventureRuns.finishedAt,
    })
    .from(adventureRuns)
    .where(and(eq(adventureRuns.adventureId, adventureId), eq(adventureRuns.status, "active")))
    .orderBy(desc(adventureRuns.id))
    .limit(1);

  const r = runRows[0];
  if (!r) return null;

  const steps = await db
    .select({
      id: adventureRunSteps.id,
      runId: adventureRunSteps.runId,
      stepIndex: adventureRunSteps.stepIndex,
      questId: adventureRunSteps.questId,
      status: adventureRunSteps.status,
      completedSessionId: adventureRunSteps.completedSessionId,
      startedAt: adventureRunSteps.startedAt,
      completedAt: adventureRunSteps.completedAt,
    })
    .from(adventureRunSteps)
    .where(eq(adventureRunSteps.runId, r.id))
    .orderBy(asc(adventureRunSteps.stepIndex));

  const normalizedSteps: AdventureRunStep[] = steps.map((s) => ({
    id: s.id,
    runId: s.runId,
    stepIndex: s.stepIndex,
    questId: s.questId,
    status: (s.status as AdventureRunStep["status"]) ?? "locked",
    completedSessionId: s.completedSessionId ?? null,
    startedAt: normalizeDate(s.startedAt),
    completedAt: normalizeDate(s.completedAt),
  }));

  const run: AdventureRun = {
    id: r.id,
    adventureId: r.adventureId,
    status: (r.status as AdventureRun["status"]) ?? "active",
    difficultyOverride: (r.difficultyOverride as DifficultyCode | null) ?? null,
    startedAt: normalizeDate(r.startedAt),
    finishedAt: normalizeDate(r.finishedAt),
  };

  const activeStep = normalizedSteps.find((s) => s.status === "active") ?? null;

  return { run, steps: normalizedSteps, activeStep };
}

export async function getAnyActiveAdventureRun(): Promise<{
  adventureId: number;
  activeRun: ActiveAdventureRun;
} | null> {
  const runRows = await db
    .select({
      adventureId: adventureRuns.adventureId,
    })
    .from(adventureRuns)
    .where(eq(adventureRuns.status, "active"))
    .orderBy(desc(adventureRuns.id))
    .limit(1);

  const first = runRows[0];
  if (!first) return null;

  const activeRun = await getActiveAdventureRun(first.adventureId);
  if (!activeRun) return null;

  return { adventureId: first.adventureId, activeRun };
}

/** How many times each adventure has been completed — feeds the gallery's replay stars. */
export async function getFinishedRunCountsByAdventure(): Promise<Map<number, number>> {
  const rows = await db
    .select({ adventureId: adventureRuns.adventureId, finished: count() })
    .from(adventureRuns)
    .where(eq(adventureRuns.status, "finished"))
    .groupBy(adventureRuns.adventureId);

  return new Map(rows.map((r) => [r.adventureId, Number(r.finished)]));
}

export type FinishedAdventureSummary = {
  adventureId: number;
  kind: AdventureKind;
  enTitle: string;
  frTitle: string;
  imagePath: string | null;
  timesFinished: number;
  firstFinishedAt: Date | null;
  lastFinishedAt: Date | null;
};

/**
 * Every adventure the hero has finished, with how many times and when — the accomplishment
 * log behind the Hall of Heroes. `getFinishedRunCountsByAdventure()` answers the same question
 * for the gallery's replay stars but throws the dates away.
 */
export async function listFinishedRunSummaries(): Promise<FinishedAdventureSummary[]> {
  // Raw min/max instead of drizzle's aggregates: those re-apply the column's timestamp
  // decoder, these return the stored unix seconds, so the conversion stays visible here.
  const rows = await db
    .select({
      adventureId: adventureRuns.adventureId,
      kind: adventures.kind,
      enTitle: adventures.enTitle,
      frTitle: adventures.frTitle,
      imagePath: adventures.imagePath,
      timesFinished: count(),
      firstFinishedAt: sql<number | null>`min(${adventureRuns.finishedAt})`,
      lastFinishedAt: sql<number | null>`max(${adventureRuns.finishedAt})`,
    })
    .from(adventureRuns)
    .innerJoin(adventures, eq(adventures.id, adventureRuns.adventureId))
    .where(eq(adventureRuns.status, "finished"))
    .groupBy(adventureRuns.adventureId);

  const toDate = (seconds: number | null) => (seconds == null ? null : new Date(seconds * 1000));

  return rows
    .map((r) => ({
      adventureId: r.adventureId,
      kind: (r.kind as AdventureKind) ?? "route",
      enTitle: r.enTitle,
      frTitle: r.frTitle,
      imagePath: r.imagePath,
      timesFinished: Number(r.timesFinished),
      firstFinishedAt: toDate(r.firstFinishedAt),
      lastFinishedAt: toDate(r.lastFinishedAt),
    }))
    .sort((a, b) => (b.lastFinishedAt?.getTime() ?? 0) - (a.lastFinishedAt?.getTime() ?? 0));
}

async function insertWithFallback(input: {
  adventureId: number;
  difficultyOverride: DifficultyCode | null;
}): Promise<number> {
  const inserted = await db
    .insert(adventureRuns)
    .values({
      adventureId: input.adventureId,
      status: "active",
      difficultyOverride: input.difficultyOverride,
      startedAt: new Date(),
      finishedAt: null,
    })
    .returning({ id: adventureRuns.id });

  let id = inserted[0]?.id;
  if (id == null) {
    const last = await db
      .select({ id: adventureRuns.id })
      .from(adventureRuns)
      .where(eq(adventureRuns.adventureId, input.adventureId))
      .orderBy(desc(adventureRuns.id))
      .limit(1);
    id = last[0]?.id;
  }

  if (id == null) throw new Error("Failed to create adventure run");
  return id;
}

export async function startAdventureRun(input: {
  adventureId: number;
  difficultyOverride?: DifficultyCode | null;
}): Promise<ActiveAdventureRun> {
  const existing = await getActiveAdventureRun(input.adventureId);
  if (existing) return existing;

  const details = await getAdventureDetails(input.adventureId);
  if (!details) throw new Error("Adventure not found");

  const runId = await insertWithFallback({
    adventureId: input.adventureId,
    difficultyOverride: input.difficultyOverride ?? null,
  });

  const now = new Date();
  await db.insert(adventureRunSteps).values(
    details.steps.map((s) => ({
      runId,
      stepIndex: s.stepIndex,
      questId: s.questId,
      status: (s.stepIndex === 0 ? "active" : "locked") as "active" | "locked",
      completedSessionId: null,
      startedAt: s.stepIndex === 0 ? now : null,
      completedAt: null,
    })),
  );

  // A replay of a beaten boss campaign is a rematch: the boss comes back, one tier up. This is
  // the moment getBossBanners has always described ("resetBossFight() nulls it the moment a
  // replay starts") — the banner survives because the finished run carries the victory. The tier
  // is the fight's own finished-run count, read after this run was inserted, so a still-active
  // run never counts and the first rematch is tier 1.
  if (details.adventure.kind === "boss") {
    const fight = await getBossFightByAdventure(input.adventureId);
    if (fight && (fight.defeatedAt || fight.currentHp <= 0)) {
      await resetBossFight(fight.id, {
        userLevel: input.difficultyOverride ?? "medium",
        tier: fight.tier,
      });
    }
  }

  const active = await getActiveAdventureRun(input.adventureId);
  if (!active) throw new Error("Failed to load newly created adventure run");
  return active;
}

/**
 * Which adventure a run step belongs to. A session only ever carries its `runStepId` (the URL
 * an adventure step pushes, and the one the victory screen chains to), so this is how the
 * store finds the adventure a boss fight hangs off without a second route param to keep in
 * sync across three screens.
 */
export async function getAdventureIdForRunStep(runStepId: number): Promise<number | null> {
  const rows = await db
    .select({ adventureId: adventureRuns.adventureId })
    .from(adventureRunSteps)
    .innerJoin(adventureRuns, eq(adventureRuns.id, adventureRunSteps.runId))
    .where(eq(adventureRunSteps.id, runStepId))
    .limit(1);

  return rows[0]?.adventureId ?? null;
}

export async function completeAdventureRunStep(input: {
  runStepId: number;
  completedSessionId: number;
}): Promise<{
  adventureId: number;
  runId: number;
  isFinished: boolean;
  nextRunStepId: number | null;
  nextQuestId: number | null;
}> {
  const currentRows = await db
    .select({
      id: adventureRunSteps.id,
      runId: adventureRunSteps.runId,
      stepIndex: adventureRunSteps.stepIndex,
      questId: adventureRunSteps.questId,
    })
    .from(adventureRunSteps)
    .where(eq(adventureRunSteps.id, input.runStepId))
    .limit(1);

  const current = currentRows[0];
  if (!current) throw new Error("Adventure run step not found");

  const now = new Date();
  await db
    .update(adventureRunSteps)
    .set({
      status: "completed",
      completedSessionId: input.completedSessionId,
      completedAt: now,
    })
    .where(eq(adventureRunSteps.id, input.runStepId));

  const nextRows = await db
    .select({ id: adventureRunSteps.id, questId: adventureRunSteps.questId })
    .from(adventureRunSteps)
    .where(
      and(
        eq(adventureRunSteps.runId, current.runId),
        eq(adventureRunSteps.stepIndex, current.stepIndex + 1),
      ),
    )
    .limit(1);

  const runRows = await db
    .select({ adventureId: adventureRuns.adventureId })
    .from(adventureRuns)
    .where(eq(adventureRuns.id, current.runId))
    .limit(1);
  const run = runRows[0];
  if (!run) throw new Error("Adventure run not found");

  const next = nextRows[0];
  if (!next) {
    await db
      .update(adventureRuns)
      .set({ status: "finished", finishedAt: now })
      .where(eq(adventureRuns.id, current.runId));

    return {
      adventureId: run.adventureId,
      runId: current.runId,
      isFinished: true,
      nextRunStepId: null,
      nextQuestId: null,
    };
  }

  await db
    .update(adventureRunSteps)
    .set({ status: "active", startedAt: now })
    .where(eq(adventureRunSteps.id, next.id));

  return {
    adventureId: run.adventureId,
    runId: current.runId,
    isFinished: false,
    nextRunStepId: next.id,
    nextQuestId: next.questId,
  };
}
