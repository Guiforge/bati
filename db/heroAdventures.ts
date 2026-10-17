import { and, asc, desc, eq, inArray, isNotNull } from "drizzle-orm";
import {
  ADVENTURE_ASSETS,
  type AdventureAssetKey,
  type BossAssetKey,
  getBossKey,
} from "@/constants/assetMap";
import { invalidateAdventures } from "./adventures";
import { db, schema, transactionOrFallback } from "./client";
import { nextEditStamp } from "./completed";
import { type QuestTemplate, USER_QUEST_AUTHOR } from "./quests";
import { ADMIN_CREATOR, type MuscleCode } from "./schema";
import { uuidv7 } from "./uuid";

/**
 * The one writer of the hero's adventures. An adventure of the hero is a row of `adventures` with
 * `author = 'hero'`, like a quest of the hero is a row of `quests`. It is never deleted: retiring
 * is an edit (`isActive = 0`), so a run, a fight or a victory that names it keeps a row to name.
 */
const { adventureRuns, adventures, adventureSteps, completedQuest, quests } = schema;

export const MIN_STEPS = 2;
export const MAX_STEPS = 8;
export const MAX_TITLE = 60;
export const MAX_DESCRIPTION = 280;
export const MAX_STEP_TEXT = 160;

/** The `adventures.sortOrder` of every hero row: after the game's, ordered by `updatedAt` in the gallery. */
const HERO_SORT_ORDER = 1000;

export type HeroAdventureDraft = {
  title: string;
  description: string;
  imagePath: AdventureAssetKey;
  end: { kind: "route" } | { kind: "boss"; monster: BossAssetKey };
  steps: { questId: number; narrative: string; outro: string }[];
};

/** A monster a hero can pick: a seeded boss adventure, read from the content and not from a table in code. */
export type Monster = {
  key: BossAssetKey;
  bossImagePath: string;
  weakness: MuscleCode | null;
  resistance: MuscleCode | null;
};

/**
 * Every bundled painted boss, one per key, in the content's order. A seventh seeded monster appears
 * here on its own.
 */
export async function listMonsters(): Promise<Monster[]> {
  const rows = await db
    .select({
      bossImagePath: adventures.bossImagePath,
      weakness: adventures.bossWeaknessMuscle,
      resistance: adventures.bossResistanceMuscle,
    })
    .from(adventures)
    .where(
      and(
        eq(adventures.author, ADMIN_CREATOR),
        eq(adventures.kind, "boss"),
        isNotNull(adventures.bossImagePath),
      ),
    )
    .orderBy(asc(adventures.sortOrder), asc(adventures.id));
  const seen = new Set<BossAssetKey>();
  const monsters: Monster[] = [];
  for (const r of rows) {
    const key = getBossKey(r.bossImagePath);
    if (!key || !r.bossImagePath || seen.has(key)) continue;
    seen.add(key);
    monsters.push({
      key,
      bossImagePath: r.bossImagePath,
      weakness: r.weakness,
      resistance: r.resistance,
    });
  }
  return monsters;
}

export async function monsterOf(key: BossAssetKey): Promise<Monster | null> {
  return (await listMonsters()).find((m) => m.key === key) ?? null;
}

/**
 * The quests of the 8 most recent sessions that still have one, oldest first, duplicates kept in the
 * order played: the editor's "start from your last sessions". Empty under 2, nothing to build from.
 */
export async function recentSessionQuests(): Promise<number[]> {
  const rows = await db
    .select({ questId: quests.id })
    .from(completedQuest)
    .innerJoin(quests, eq(quests.id, completedQuest.questId))
    .orderBy(desc(completedQuest.performedAt), desc(completedQuest.id))
    .limit(MAX_STEPS);
  return rows.length < MIN_STEPS ? [] : rows.map((r) => r.questId).reverse();
}

/** A step that is the hero's own quest runs as written (`resolveSlot`, `substitute: false`): it can work a spared zone. */
export function worksSparedZone(quest: QuestTemplate, spared: ReadonlySet<number>): boolean {
  return (
    quest.author === USER_QUEST_AUTHOR && quest.exercises.some((s) => spared.has(s.exerciseId))
  );
}

const clamp = (text: string, max: number) => text.trim().slice(0, max);

type Clean = {
  title: string;
  description: string;
  imagePath: AdventureAssetKey;
  steps: { questId: number; narrative: string; outro: string }[];
};

function clean(draft: HeroAdventureDraft): Clean {
  const title = clamp(draft.title, MAX_TITLE);
  if (!title) throw new Error("Adventure needs a title");
  if (draft.steps.length < MIN_STEPS || draft.steps.length > MAX_STEPS) {
    throw new Error(`Adventure needs ${MIN_STEPS} to ${MAX_STEPS} steps`);
  }
  if (!Object.hasOwn(ADVENTURE_ASSETS, draft.imagePath)) throw new Error("Unknown adventure cover");
  return {
    title,
    description: clamp(draft.description, MAX_DESCRIPTION),
    imagePath: draft.imagePath,
    steps: draft.steps.map((s) => ({
      questId: s.questId,
      narrative: clamp(s.narrative, MAX_STEP_TEXT),
      outro: clamp(s.outro, MAX_STEP_TEXT),
    })),
  };
}

/** The columns that depend on how the adventure ends. */
async function endColumns(end: HeroAdventureDraft["end"]) {
  if (end.kind === "route") {
    return {
      kind: "route",
      bossImagePath: null,
      bossWeaknessMuscle: null,
      bossResistanceMuscle: null,
    } as const;
  }
  const monster = await monsterOf(end.monster);
  if (!monster) throw new Error("Unknown monster");
  return {
    kind: "boss",
    bossImagePath: monster.bossImagePath,
    bossWeaknessMuscle: monster.weakness,
    bossResistanceMuscle: monster.resistance,
  } as const;
}

/** The hero's text sits in the four language columns, the same in each (ru reads en). */
const texts = (t: string) => ({ en: t, fr: t, de: t, es: t });

function titleColumns(c: Clean) {
  const title = texts(c.title);
  const description = texts(c.description);
  return {
    enTitle: title.en,
    frTitle: title.fr,
    deTitle: title.de,
    esTitle: title.es,
    enDescription: description.en,
    frDescription: description.fr,
    deDescription: description.de,
    esDescription: description.es,
    imagePath: c.imagePath,
  };
}

function stepColumns(step: Clean["steps"][number]) {
  return {
    enNarrative: step.narrative,
    frNarrative: step.narrative,
    deNarrative: step.narrative,
    esNarrative: step.narrative,
    enOutroNarrative: step.outro,
    frOutroNarrative: step.outro,
    deOutroNarrative: step.outro,
    esOutroNarrative: step.outro,
  };
}

async function assertQuestsExist(questIds: readonly number[]): Promise<void> {
  const unique = [...new Set(questIds)];
  const found = await db.select({ id: quests.id }).from(quests).where(inArray(quests.id, unique));
  if (found.length !== unique.length) throw new Error("A step names a quest that does not exist");
}

async function hasActiveRun(adventureId: number): Promise<boolean> {
  const rows = await db
    .select({ id: adventureRuns.id })
    .from(adventureRuns)
    .where(and(eq(adventureRuns.adventureId, adventureId), eq(adventureRuns.status, "active")))
    .limit(1);
  return rows.length > 0;
}

async function assertHeroAdventure(id: number): Promise<void> {
  const [row] = await db
    .select({ author: adventures.author })
    .from(adventures)
    .where(eq(adventures.id, id))
    .limit(1);
  if (row?.author !== USER_QUEST_AUTHOR) throw new Error("Not an adventure of the hero");
}

/** `uuid` is there for the file import of phase 2 only. */
export async function createHeroAdventure(
  draft: HeroAdventureDraft,
  { uuid }: { uuid?: string } = {},
): Promise<number> {
  const c = clean(draft);
  const end = await endColumns(draft.end);
  await assertQuestsExist(c.steps.map((s) => s.questId));
  const first = c.steps[0];
  if (!first) throw new Error("Adventure needs steps");

  const id = await transactionOrFallback(async (tx) => {
    const [row] = await tx
      .insert(adventures)
      .values({
        ...titleColumns(c),
        ...end,
        author: USER_QUEST_AUTHOR,
        uuid: uuid ?? uuidv7(),
        questId: first.questId,
        sortOrder: HERO_SORT_ORDER,
        isActive: 1,
        bossTotalHp: null,
      })
      .returning({ id: adventures.id });
    if (!row) throw new Error("Failed to create adventure");
    await tx.insert(adventureSteps).values(
      c.steps.map((s, stepIndex) => ({
        adventureId: row.id,
        stepIndex,
        questId: s.questId,
        imagePath: null,
        ...stepColumns(s),
      })),
    );
    return row.id;
  });
  invalidateAdventures();
  return id;
}

/**
 * Rewrite an adventure of the hero. Never touches `isActive`: editing a retired adventure (reachable
 * while a run of it is active here) keeps it retired, so do not share an insert-shaped "whole row"
 * helper with `createHeroAdventure`.
 *
 * With a run under way the steps and the end are frozen: the quests and the end of the draft are
 * ignored, and only the texts, the cover and the title change, the step texts by position.
 *
 * ponytail: a fight kept after a left partie keeps the pool of the old steps (PARK-1). Fix (c)
 * rescales it to the new pool keeping the fraction of HP already taken, if a hero reports it.
 */
export async function updateHeroAdventure(id: number, draft: HeroAdventureDraft): Promise<void> {
  await assertHeroAdventure(id);
  const c = clean(draft);
  const frozen = await hasActiveRun(id);
  const end = frozen ? null : await endColumns(draft.end);
  if (!frozen) await assertQuestsExist(c.steps.map((s) => s.questId));
  const first = c.steps[0];
  if (!first) throw new Error("Adventure needs steps");

  await transactionOrFallback(async (tx) => {
    await tx
      .update(adventures)
      .set({
        ...titleColumns(c),
        ...(end ? { ...end, questId: first.questId } : {}),
        updatedAt: nextEditStamp(adventures.updatedAt),
      })
      .where(eq(adventures.id, id));

    if (!frozen) {
      await tx.delete(adventureSteps).where(eq(adventureSteps.adventureId, id));
      await tx.insert(adventureSteps).values(
        c.steps.map((s, stepIndex) => ({
          adventureId: id,
          stepIndex,
          questId: s.questId,
          imagePath: null,
          ...stepColumns(s),
        })),
      );
      return;
    }
    // An update by position, never a delete and insert: the run copied the steps' quests.
    const rows = await tx
      .select({ id: adventureSteps.id })
      .from(adventureSteps)
      .where(eq(adventureSteps.adventureId, id))
      .orderBy(asc(adventureSteps.stepIndex));
    for (const [i, row] of rows.entries()) {
      const step = c.steps[i];
      if (!step) break;
      await tx.update(adventureSteps).set(stepColumns(step)).where(eq(adventureSteps.id, row.id));
    }
  });
  invalidateAdventures();
}

/** Retire: the row stays with `isActive = 0`, nothing deleted, no tombstone. Refused while a run is under way. */
export async function retireHeroAdventure(id: number): Promise<void> {
  await assertHeroAdventure(id);
  if (await hasActiveRun(id))
    throw new Error("Leave the playthrough before retiring the adventure");
  await db
    .update(adventures)
    .set({ isActive: 0, updatedAt: nextEditStamp(adventures.updatedAt) })
    .where(eq(adventures.id, id));
  invalidateAdventures();
}

/**
 * What the editor opens on: the raw rows, so the "on the way back" texts and the monster survive a
 * save (the detail reader carries neither). `questId` is as stored, a step whose quest is gone
 * included; the editor decides what to show of it. `frozen`: a run is under way.
 */
export async function loadHeroAdventureDraft(
  id: number,
): Promise<(HeroAdventureDraft & { frozen: boolean }) | null> {
  const [row] = await db.select().from(adventures).where(eq(adventures.id, id)).limit(1);
  if (!row || row.author !== USER_QUEST_AUTHOR) return null;
  const steps = await db
    .select()
    .from(adventureSteps)
    .where(eq(adventureSteps.adventureId, id))
    .orderBy(asc(adventureSteps.stepIndex));
  const key = getBossKey(row.bossImagePath);
  const monster = row.kind === "boss" ? (key ?? (await listMonsters())[0]?.key ?? null) : null;
  const cover = Object.hasOwn(ADVENTURE_ASSETS, row.imagePath ?? "")
    ? (row.imagePath as AdventureAssetKey)
    : (Object.keys(ADVENTURE_ASSETS)[0] as AdventureAssetKey);
  return {
    title: row.enTitle,
    description: row.enDescription,
    imagePath: cover,
    end: monster ? { kind: "boss", monster } : { kind: "route" },
    steps: steps.map((s) => ({
      questId: s.questId,
      narrative: s.enNarrative,
      outro: s.enOutroNarrative,
    })),
    frozen: await hasActiveRun(id),
  };
}
