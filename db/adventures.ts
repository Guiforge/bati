import { and, asc, count, desc, eq, or, sql } from "drizzle-orm";
import { FIRST_QUEST_TITLE } from "@/constants/onboarding";
import { getBossFightByAdventure, resetBossFight } from "./bossFights";
import { db, schema } from "./client";
import { nextRunStep } from "./completed";
import { countsAsDeed, DEED_ADVENTURE } from "./deed";
import { listExercises } from "./exercises";
import {
  listQuestTemplates,
  type QuestTemplate,
  type TrainingFocus,
  trainingFocus,
  USER_QUEST_AUTHOR,
} from "./quests";
import { ADMIN_CREATOR, type AdventureRunStatus, type DifficultyCode } from "./schema";

const {
  adventureRuns,
  adventureRunSteps,
  adventures,
  adventureSteps,
  completedQuest,
  questExercises,
  quests,
} = schema;

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
  deNarrative: string;
  esNarrative: string;
  quest: QuestTemplate;
  imagePath: string | null;
};

export type AdventureRun = {
  id: number;
  adventureId: number;
  status: AdventureRunStatus;
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
  deTitle: string;
  esTitle: string;
  enDescription: string;
  frDescription: string;
  deDescription: string;
  esDescription: string;
  coverQuest: QuestTemplate;
  stepsCount: number;
  imagePath: string | null;
  focus: TrainingFocus;
  /** Last edit of the row, for the gallery's "Tes aventures" order. */
  updatedAt: Date | null;
  /**
   * The step-1 quest the row names no longer exists (a content migration removed it, or the hero
   * deleted it). The row stays in the gallery so the hero can repair it from the editor.
   */
  coverMissing: boolean;
  /**
   * The boss's pool as the content tunes it, at medium, before any rematch tier. Null on a route,
   * which has no fight. Read from the adventure rather than from `boss_fights`, because that row
   * only exists once a session has swung at it — and the gallery's whole job is to say which
   * campaign is worth the trip *before* the hero starts one.
   */
  bossTotalHp: number | null;
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
    | "deTitle"
    | "esTitle"
    | "enDescription"
    | "frDescription"
    | "deDescription"
    | "esDescription"
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

// The gallery fetch is shared across mounts instead of refetched on every navigation. It embeds
// resolved quests, so it follows the quest cache (`dropIfQuestsMoved`), and the hero's own writers
// drop it through `invalidateAdventures`.
let adventuresCache: Promise<Adventure[]> | null = null;
let builtFrom: Promise<QuestTemplate[]> | null = null;

/** Both caches embed resolved quests: a rebuilt quest list (any `invalidateQuestTemplates`) drops them. */
function dropIfQuestsMoved(): void {
  const current = listQuestTemplates();
  if (current === builtFrom) return;
  adventuresCache = null;
  adventureDetailsCache.clear();
  builtFrom = current;
}

/** The hero wrote, edited or retired an adventure: the next read rebuilds. */
export function invalidateAdventures(): void {
  builtFrom = null;
}

type CoverQuestRow = {
  coverQuestId: number;
  enTitle: string | null;
  frTitle: string | null;
  deTitle: string | null;
  esTitle: string | null;
  enDescription: string | null;
  frDescription: string | null;
  deDescription: string | null;
  esDescription: string | null;
  questAuthor: QuestTemplate["author"] | null;
  questUuid: string | null;
  rounds: number | null;
  restSeconds: number | null;
  roundRestSeconds: number | null;
  questImagePath: string | null;
};

/**
 * The gallery only needs the cover quest's identity, not its shape. The quest is left-joined: one
 * a content migration removed, or the hero deleted, leaves empty titles and the row stays so the
 * hero can repair the adventure (`coverMissing`).
 */
function coverQuestOf(r: CoverQuestRow): QuestTemplate {
  return {
    id: r.coverQuestId,
    enTitle: r.enTitle ?? "",
    frTitle: r.frTitle ?? "",
    deTitle: r.deTitle ?? "",
    esTitle: r.esTitle ?? "",
    enDescription: r.enDescription ?? "",
    frDescription: r.frDescription ?? "",
    deDescription: r.deDescription ?? "",
    esDescription: r.esDescription ?? "",
    author: r.questAuthor ?? ADMIN_CREATOR,
    uuid: r.questUuid,
    rounds: r.rounds ?? 1,
    restSeconds: r.restSeconds ?? 0,
    roundRestSeconds: r.roundRestSeconds,
    archetype: null,
    imagePath: r.questImagePath ?? "assets/placeholder.jpg",
    exercises: [],
  };
}

async function fetchAdventures(): Promise<Adventure[]> {
  const rows = await db
    .select({
      adventureId: adventures.id,
      coverQuestId: adventures.questId,
      sortOrder: adventures.sortOrder,
      kind: adventures.kind,
      isActive: adventures.isActive,
      bossTotalHp: adventures.bossTotalHp,

      advAuthor: adventures.author,

      advEnTitle: adventures.enTitle,
      advFrTitle: adventures.frTitle,
      advDeTitle: adventures.deTitle,
      advEsTitle: adventures.esTitle,
      advEnDescription: adventures.enDescription,
      advFrDescription: adventures.frDescription,
      advDeDescription: adventures.deDescription,
      advEsDescription: adventures.esDescription,
      advImagePath: adventures.imagePath,
      advUpdatedAt: adventures.updatedAt,

      enTitle: quests.enTitle,
      frTitle: quests.frTitle,
      deTitle: quests.deTitle,
      esTitle: quests.esTitle,
      enDescription: quests.enDescription,
      frDescription: quests.frDescription,
      deDescription: quests.deDescription,
      esDescription: quests.esDescription,
      questAuthor: quests.author,
      questUuid: quests.uuid,
      rounds: quests.rounds,
      restSeconds: quests.restSeconds,
      roundRestSeconds: quests.roundRestSeconds,
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
    .leftJoin(quests, eq(quests.id, adventures.questId))
    .leftJoin(questExercises, eq(questExercises.questId, quests.id))
    // Retired hero rows are in the cache with isActive 0: the gallery decides (an adventure
    // retired elsewhere stays while a run of it is active here).
    .where(or(eq(adventures.isActive, 1), eq(adventures.author, USER_QUEST_AUTHOR)))
    .orderBy(asc(adventures.sortOrder), asc(questExercises.sortOrder));

  const stepRows = await db
    .select({ adventureId: adventureSteps.adventureId, questId: adventureSteps.questId })
    .from(adventureSteps)
    .innerJoin(adventures, eq(adventures.id, adventureSteps.adventureId))
    .where(or(eq(adventures.isActive, 1), eq(adventures.author, USER_QUEST_AUTHOR)));

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
      const quest = coverQuestOf(r);

      byAdventureId.set(r.adventureId, {
        id: r.adventureId,
        coverQuestId: r.coverQuestId,
        sortOrder: r.sortOrder,
        kind: (r.kind as AdventureKind) ?? "route",
        isActive: r.isActive,
        author: r.advAuthor,
        enTitle: r.advEnTitle,
        frTitle: r.advFrTitle,
        deTitle: r.advDeTitle,
        esTitle: r.advEsTitle,
        enDescription: r.advEnDescription,
        frDescription: r.advFrDescription,
        deDescription: r.advDeDescription,
        esDescription: r.advEsDescription,
        coverQuest: quest,
        stepsCount: stepQuestIds.length,
        imagePath: r.advImagePath,
        bossTotalHp: r.bossTotalHp,
        updatedAt: normalizeDate(r.advUpdatedAt),
        coverMissing: r.questAuthor === null,
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
      id: r.questExerciseId,
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

/**
 * The gallery's own order: the campaign under way first, then the ones never beaten, then the
 * ones that are.
 *
 * Not the quest gallery's order, and adventures are not that kind of list. A quest is a shelf
 * item: it means the same thing on the day you finish it as on the day before, so
 * `galleryOrder` leaves the authored sequence alone and only lets the hero's own pins and
 * authorship move it. A campaign is a *run*. One is active at a time, it is beaten or it is
 * not, and a poster for a campaign already felled three times is a poster for a thing that is
 * behind the hero. That is the one fact this screen holds and the quest gallery does not.
 *
 * What it deliberately does not do is rank by threat, which the audit of 2026-09-10 asked for.
 * The seeded `sortOrder` is a ramp, and its first card is the tutorial on purpose ("The
 * Squire's Path", four marches, no equipment); threat does not follow it (821 HP at position 3,
 * 1115 at 5, 770 at 6), so a threat-first list hands a fresh install the Ranger. Saying how
 * dangerous each one is belongs on the card, and it is there now; deciding that a level 44 hero
 * has outgrown the ramp is a balance rule nobody has written.
 *
 * Two stable passes over a copy rather than one comparator, same as `galleryOrder`: these are
 * two separate claims, and everything neither of them touches keeps the order content gave it.
 */
export function adventureOrder<T extends { id: number }>(
  adventures: readonly T[],
  activeAdventureId: number | null,
  finishedCounts: ReadonlyMap<number, number>,
): T[] {
  const isBeaten = (a: T) => (finishedCounts.get(a.id) ?? 0) > 0;
  return [...adventures]
    .sort((a, b) => Number(isBeaten(a)) - Number(isBeaten(b)))
    .sort((a, b) => Number(b.id === activeAdventureId) - Number(a.id === activeAdventureId));
}

export function listAdventures(): Promise<Adventure[]> {
  dropIfQuestsMoved();
  if (!adventuresCache) {
    adventuresCache = fetchAdventures().catch((e) => {
      adventuresCache = null;
      throw e;
    });
  }
  return adventuresCache;
}

// The details of one adventure, shared across mounts instead of re-running the whole query chain
// on every navigation into the screen. Dropped with the gallery's cache (`dropIfQuestsMoved`).
const adventureDetailsCache = new Map<number, Promise<AdventureDetails | null>>();

export function getAdventureDetails(adventureId: number): Promise<AdventureDetails | null> {
  dropIfQuestsMoved();
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
      deTitle: adventures.deTitle,
      esTitle: adventures.esTitle,
      enDescription: adventures.enDescription,
      frDescription: adventures.frDescription,
      deDescription: adventures.deDescription,
      esDescription: adventures.esDescription,
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
      deNarrative: adventureSteps.deNarrative,
      esNarrative: adventureSteps.esNarrative,
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
            deNarrative: "",
            esNarrative: "",
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
      deNarrative: s.deNarrative,
      esNarrative: s.esNarrative,
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
      deTitle: first.deTitle,
      esTitle: first.esTitle,
      enDescription: first.enDescription,
      frDescription: first.frDescription,
      deDescription: first.deDescription,
      esDescription: first.esDescription,
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

/**
 * The newest active run. With `owner`, the newest of that population: Home reads the game's and
 * the hero's separately, so a newer hero run never hides an older game one (spec R6).
 *
 * Does not filter `adventures.isActive`, on purpose: a run of an adventure retired on another
 * device stays offered here until it ends or is left.
 */
export async function getAnyActiveAdventureRun(owner?: "game" | "hero"): Promise<{
  adventureId: number;
  activeRun: ActiveAdventureRun;
} | null> {
  const runRows = await db
    .select({
      adventureId: adventureRuns.adventureId,
    })
    .from(adventureRuns)
    .innerJoin(adventures, eq(adventures.id, adventureRuns.adventureId))
    .where(
      and(
        eq(adventureRuns.status, "active"),
        owner === "game"
          ? DEED_ADVENTURE
          : owner === "hero"
            ? eq(adventures.author, USER_QUEST_AUTHOR)
            : undefined,
      ),
    )
    .orderBy(desc(adventureRuns.id))
    .limit(1);

  const first = runRows[0];
  if (!first) return null;

  const activeRun = await getActiveAdventureRun(first.adventureId);
  if (!activeRun) return null;

  return { adventureId: first.adventureId, activeRun };
}

/** Adventures with a run under way, read by the gallery (an adventure retired elsewhere stays while one is). */
export async function activeRunAdventureIds(): Promise<Set<number>> {
  const rows = await db
    .selectDistinct({ id: adventureRuns.adventureId })
    .from(adventureRuns)
    .where(eq(adventureRuns.status, "active"));
  return new Set(rows.map((r) => r.id));
}

/**
 * Step indexes of an adventure whose quest is gone. A run never starts on one (a step without a
 * quest would end the run at a false victory), and the detail screen says why.
 */
export async function missingStepQuests(adventureId: number): Promise<number[]> {
  const rows = await db
    .select({ stepIndex: adventureSteps.stepIndex, questId: quests.id })
    .from(adventureSteps)
    .leftJoin(quests, eq(quests.id, adventureSteps.questId))
    .where(eq(adventureSteps.adventureId, adventureId))
    .orderBy(asc(adventureSteps.stepIndex));
  return rows.filter((r) => r.questId === null).map((r) => r.stepIndex);
}

/** Adventures the hero has ever started: a run of one, active or finished, makes it theirs (P-04.2). */
export async function startedAdventureIds(): Promise<Set<number>> {
  const rows = await db.selectDistinct({ id: adventureRuns.adventureId }).from(adventureRuns);
  return new Set(rows.map((r) => r.id));
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
  deTitle: string;
  esTitle: string;
  imagePath: string | null;
  /** The monster's own painting for a boss campaign — a trophy shows what you beat, not the poster. */
  bossImagePath: string | null;
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
      deTitle: adventures.deTitle,
      esTitle: adventures.esTitle,
      imagePath: adventures.imagePath,
      bossImagePath: adventures.bossImagePath,
      timesFinished: count(),
      firstFinishedAt: sql<number | null>`min(${adventureRuns.finishedAt})`,
      lastFinishedAt: sql<number | null>`max(${adventureRuns.finishedAt})`,
    })
    .from(adventureRuns)
    .innerJoin(adventures, eq(adventures.id, adventureRuns.adventureId))
    // Deeds count the game's adventures only (R2): the hero's own pay their sessions and nothing else.
    .where(and(eq(adventureRuns.status, "finished"), DEED_ADVENTURE))
    .groupBy(adventureRuns.adventureId);

  const toDate = (seconds: number | null) => (seconds == null ? null : new Date(seconds * 1000));

  return rows
    .map((r) => ({
      adventureId: r.adventureId,
      kind: (r.kind as AdventureKind) ?? "route",
      enTitle: r.enTitle,
      frTitle: r.frTitle,
      deTitle: r.deTitle,
      esTitle: r.esTitle,
      imagePath: r.imagePath,
      bossImagePath: r.bossImagePath,
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

/** Whether this quest row is the seeded on-ramp, by its title and author, never by its id. */
async function isOnRampQuest(questId: number): Promise<boolean> {
  const rows = await db
    .select({ id: quests.id })
    .from(quests)
    .where(
      and(
        eq(quests.id, questId),
        eq(quests.enTitle, FIRST_QUEST_TITLE),
        eq(quests.author, ADMIN_CREATOR),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

/**
 * "Le progrès offert" (P-05): the first session the hero ever did, when it was the on-ramp, counts
 * as step 1 of the adventure that starts with it. Read from the journal, never stored: this answers
 * `{ performedAt }` of that session, or null.
 *
 * One source, two doors: `startAdventureRun` writes the step as done, and the adventure screen
 * before a run exists draws it as done and previews the next one, so what the screen announces is
 * the session "Commencer" opens. All three must hold:
 *
 * 1. this adventure never had a run (a replay starts at step 0, as it always did);
 * 2. its step 0 is the seeded on-ramp quest, and it has a step after it;
 * 3. the hero's oldest session is that quest, matched by the seeded title and not by id, because a
 *    journal that arrived by sync carries the other device's quest ids.
 */
export async function offeredFirstStep(adventureId: number): Promise<{ performedAt: Date } | null> {
  const ran = await db
    .select({ id: adventureRuns.id })
    .from(adventureRuns)
    .where(eq(adventureRuns.adventureId, adventureId))
    .limit(1);
  if (ran.length > 0) return null;

  const details = await getAdventureDetails(adventureId);
  const first = details?.steps.find((s) => s.stepIndex === 0);
  if (!details || !countsAsDeed(details.adventure) || !first || details.steps.length < 2)
    return null;
  if (!(await isOnRampQuest(first.questId))) return null;

  const [oldest] = await db
    .select({ questId: completedQuest.questId, performedAt: completedQuest.performedAt })
    .from(completedQuest)
    .orderBy(asc(completedQuest.performedAt), asc(completedQuest.id))
    .limit(1);
  if (!oldest || oldest.questId == null || !(await isOnRampQuest(oldest.questId))) return null;
  return { performedAt: oldest.performedAt };
}

export async function startAdventureRun(input: {
  adventureId: number;
  difficultyOverride?: DifficultyCode | null;
}): Promise<ActiveAdventureRun> {
  const existing = await getActiveAdventureRun(input.adventureId);
  if (existing) return existing;

  // A step whose quest is gone would make the run finish early (no next step), a false victory.
  if ((await missingStepQuests(input.adventureId)).length > 0) {
    throw new Error("Adventure step quest missing");
  }

  const details = await getAdventureDetails(input.adventureId);
  if (!details) throw new Error("Adventure not found");

  // Before the run row exists: the first condition is that this adventure never had one.
  const offered = await offeredFirstStep(input.adventureId);
  // Read before the insert: a rematch only follows a run that was finished, never one that was left.
  const [previousRun] = await db
    .select({ status: adventureRuns.status })
    .from(adventureRuns)
    .where(eq(adventureRuns.adventureId, input.adventureId))
    .orderBy(desc(adventureRuns.id))
    .limit(1);

  const runId = await insertWithFallback({
    adventureId: input.adventureId,
    difficultyOverride: input.difficultyOverride ?? null,
  });

  const now = new Date();
  // An offered step 0 is done, at the moment of the session that earned it, and tied to no
  // session: `completedSessionId` stays null (a state the schema allows), so deleting that first
  // session is never refused for belonging to a step. `completeAdventureRunStep` is what ties a
  // session to a step, and nothing ever needs to for this one.
  const activeIndex = offered ? 1 : 0;
  await db.insert(adventureRunSteps).values(
    details.steps.map((s) => {
      const done = offered !== null && s.stepIndex === 0;
      const active = s.stepIndex === activeIndex;
      return {
        runId,
        stepIndex: s.stepIndex,
        questId: s.questId,
        status: (done ? "completed" : active ? "active" : "locked") as
          | "completed"
          | "active"
          | "locked",
        completedSessionId: null,
        startedAt: done ? offered.performedAt : active ? now : null,
        completedAt: done ? offered.performedAt : null,
      };
    }),
  );

  // A replay of a beaten boss campaign is a rematch: the boss comes back, one tier up. This is
  // the moment getBossBanners has always described ("resetBossFight() nulls it the moment a
  // replay starts") — the banner survives because the finished run carries the victory. The tier
  // is the tier the felled fight was fought at, plus one, so the first rematch is tier 1.
  if (details.adventure.kind === "boss") {
    const fight = await getBossFightByAdventure(input.adventureId);
    // After a left run the felled boss stays felled (its banner is shown, no finished run carries it).
    if (previousRun?.status === "finished" && fight && (fight.defeatedAt || fight.currentHp <= 0)) {
      await resetBossFight(fight.id, {
        userLevel: input.difficultyOverride ?? "medium",
        // A defeated fight reports the tier it was fought at; the rematch is the next one.
        tier: fight.tier + 1,
      });
    }
  }

  const active = await getActiveAdventureRun(input.adventureId);
  if (!active) throw new Error("Failed to load newly created adventure run");
  return active;
}

/**
 * The hero leaves the run under way (D-34, "Laisser la partie"). The run stays, as `left`: nothing
 * that counts reads it, Home stops offering it, and the next start is a fresh run from step 1. The
 * boss fight is per adventure and is not touched, so it keeps its HP. Its steps are left as they
 * were: no reader looks at the steps of a run that is not active or finished.
 */
export async function leaveAdventureRun(adventureId: number): Promise<void> {
  await db
    .update(adventureRuns)
    .set({ status: "left" })
    .where(and(eq(adventureRuns.adventureId, adventureId), eq(adventureRuns.status, "active")));
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

  const runRows = await db
    .select({ adventureId: adventureRuns.adventureId, status: adventureRuns.status })
    .from(adventureRuns)
    .where(eq(adventureRuns.id, current.runId))
    .limit(1);
  const run = runRows[0];
  if (!run) throw new Error("Adventure run not found");

  if (run.status !== "active") {
    // A session that outlived its run (the hero left it, or a stale step of a finished one) is
    // ordinary training: no step, no second victory. Its boss hits were committed before and stay.
    return {
      adventureId: run.adventureId,
      runId: current.runId,
      isFinished: false,
      nextRunStepId: null,
      nextQuestId: null,
    };
  }

  const now = new Date();
  await db
    .update(adventureRunSteps)
    .set({
      status: "completed",
      completedSessionId: input.completedSessionId,
      completedAt: now,
    })
    .where(eq(adventureRunSteps.id, input.runStepId));

  const next = await nextRunStep(db, current.runId, current.stepIndex);
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
