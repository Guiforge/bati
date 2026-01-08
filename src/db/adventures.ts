import { and, asc, desc, eq } from "drizzle-orm";
import { db, schema } from "./client";
import { getQuestTemplateById, type QuestTemplate } from "./quests";
import type { DifficultyCode } from "./schema";

const {
  adventureRuns,
  adventureRunSteps,
  adventures,
  adventureSteps,
  questExercises,
  quests,
} = schema;

function safeParseImages(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((x) => typeof x === "string")
      : [];
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
  imagePath: string | null;
  coverQuest: QuestTemplate;
  stepsCount: number;
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

export async function listAdventures(): Promise<Adventure[]> {
  const rows = await db
    .select({
      adventureId: adventures.id,
      coverQuestId: adventures.questId,
      sortOrder: adventures.sortOrder,
      kind: adventures.kind,
      isActive: adventures.isActive,

      advAuthor: adventures.author,
      advImagePath: adventures.imagePath,

      advEnTitle: adventures.enTitle,
      advFrTitle: adventures.frTitle,
      advEnDescription: adventures.enDescription,
      advFrDescription: adventures.frDescription,

      enTitle: quests.enTitle,
      frTitle: quests.frTitle,
      enDescription: quests.enDescription,
      frDescription: quests.frDescription,
      questAuthor: quests.author,
      rounds: quests.rounds,
      restSeconds: quests.restSeconds,

      questImagePath: quests.imagePath,
      questPrimaryMuscle: quests.primaryMuscle,
      questEstimatedMinutes: quests.estimatedMinutes,
      questDifficulty: quests.difficulty,

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
    .select({ adventureId: adventureSteps.adventureId })
    .from(adventureSteps)
    .innerJoin(adventures, eq(adventures.id, adventureSteps.adventureId))
    .where(eq(adventures.isActive, 1));

  function buildStepsCountByAdventureId(): Map<number, number> {
    const map = new Map<number, number>();
    for (const r of stepRows) {
      map.set(r.adventureId, (map.get(r.adventureId) ?? 0) + 1);
    }
    return map;
  }

  function buildAdventureMap(
    stepsCountByAdventureId: Map<number, number>
  ): Map<number, Adventure> {
    type Row = (typeof rows)[number];

    const byAdventureId = new Map<number, Adventure>();

    function ensureAdventure(row: Row): Adventure {
      const existing = byAdventureId.get(row.adventureId);
      if (existing) return existing;

      const quest: QuestTemplate = {
        id: row.coverQuestId,
        enTitle: row.enTitle,
        frTitle: row.frTitle,
        enDescription: row.enDescription,
        frDescription: row.frDescription,
        author: row.questAuthor,
        rounds: row.rounds,
        restSeconds: row.restSeconds,
        imagePath: row.questImagePath ?? null,
        primaryMuscle: row.questPrimaryMuscle ?? null,
        estimatedMinutes: row.questEstimatedMinutes ?? null,
        difficulty: row.questDifficulty ?? null,
        exercises: [],
      };

      const created: Adventure = {
        id: row.adventureId,
        coverQuestId: row.coverQuestId,
        sortOrder: row.sortOrder,
        kind: (row.kind as AdventureKind) ?? "route",
        isActive: row.isActive,
        author: row.advAuthor,
        imagePath: row.advImagePath,
        enTitle: row.advEnTitle,
        frTitle: row.advFrTitle,
        enDescription: row.advEnDescription,
        frDescription: row.advFrDescription,
        coverQuest: quest,
        stepsCount: stepsCountByAdventureId.get(row.adventureId) ?? 0,
      };

      byAdventureId.set(row.adventureId, created);
      return created;
    }

    function appendCoverQuestExerciseIfPresent(row: Row, adv: Adventure) {
      if (
        row.questExerciseId == null ||
        row.exerciseId == null ||
        row.targetType == null ||
        row.targetMin == null ||
        row.targetMax == null ||
        row.imagesJson == null
      ) {
        return;
      }

      adv.coverQuest.exercises.push({
        exerciseId: row.exerciseId,
        images: safeParseImages(row.imagesJson),
        baseTarget: {
          type: row.targetType,
          min: row.targetMin,
          max: row.targetMax,
        },
      });
    }

    for (const r of rows) {
      const adv = ensureAdventure(r);
      appendCoverQuestExerciseIfPresent(r, adv);
    }

    return byAdventureId;
  }

  const stepsCountByAdventureId = buildStepsCountByAdventureId();
  const byAdventureId = buildAdventureMap(stepsCountByAdventureId);

  // Adventures are campaigns: only return multi-step content.
  return [...byAdventureId.values()].filter((a) => a.stepsCount >= 2);
}

export async function getAdventureById(
  adventureId: number
): Promise<Adventure | null> {
  const rows = await db
    .select({
      adventureId: adventures.id,
      coverQuestId: adventures.questId,
      sortOrder: adventures.sortOrder,
      kind: adventures.kind,
      isActive: adventures.isActive,
      advAuthor: adventures.author,
      advImagePath: adventures.imagePath,
      advEnTitle: adventures.enTitle,
      advFrTitle: adventures.frTitle,
      advEnDescription: adventures.enDescription,
      advFrDescription: adventures.frDescription,
    })
    .from(adventures)
    .where(eq(adventures.id, adventureId))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  const stepRows = await db
    .select({ adventureId: adventureSteps.adventureId })
    .from(adventureSteps)
    .where(eq(adventureSteps.adventureId, adventureId));

  // Get the cover quest
  const questData = await getQuestTemplateById(row.coverQuestId);
  if (!questData) return null;

  return {
    id: row.adventureId,
    coverQuestId: row.coverQuestId,
    sortOrder: row.sortOrder,
    kind: (row.kind as AdventureKind) ?? "route",
    isActive: row.isActive,
    author: row.advAuthor,
    imagePath: row.advImagePath,
    enTitle: row.advEnTitle,
    frTitle: row.advFrTitle,
    enDescription: row.advEnDescription,
    frDescription: row.advFrDescription,
    coverQuest: questData,
    stepsCount: stepRows.length,
  };
}

export async function getAdventureDetails(
  adventureId: number
): Promise<AdventureDetails | null> {
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
          },
        ];

  const resolved: AdventureStepTemplate[] = [];
  for (const s of effectiveSteps) {
    const q = await getQuestTemplateById(s.questId);
    if (!q) continue;
    resolved.push({
      id: s.id,
      adventureId: s.adventureId,
      stepIndex: s.stepIndex,
      questId: s.questId,
      enNarrative: s.enNarrative,
      frNarrative: s.frNarrative,
      quest: q,
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
    },
    steps: resolved,
  };
}

export async function getActiveAdventureRun(
  adventureId: number
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
    .where(
      and(
        eq(adventureRuns.adventureId, adventureId),
        eq(adventureRuns.status, "active")
      )
    )
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
    }))
  );

  const active = await getActiveAdventureRun(input.adventureId);
  if (!active) throw new Error("Failed to load newly created adventure run");
  return active;
}

export async function setAdventureRunDifficultyOverride(input: {
  runId: number;
  difficultyOverride: DifficultyCode | null;
}): Promise<void> {
  await db
    .update(adventureRuns)
    .set({ difficultyOverride: input.difficultyOverride })
    .where(eq(adventureRuns.id, input.runId));
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
        eq(adventureRunSteps.stepIndex, current.stepIndex + 1)
      )
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
