import { eq } from "drizzle-orm";

import type { QuestArchetype } from "../db/schema";
import { createTestDb } from "./helpers/testDb";

/**
 * Content invariants — the gate for docs/planning/work-roadmap.md §2.2.
 *
 * A quest's archetype is what it is meant to be, and it is now a column (`0019`) rather than a
 * map maintained inside this file: the app needs it too, to say what kind of session a card is
 * before the hero starts. Seeding a quest without one fails the first test below, which is the
 * point — the design intent has to be declared, not inferred.
 */
type Archetype = QuestArchetype;

/**
 * Quests that train one movement pattern on purpose. With six muscle codes the taxonomy cannot
 * tell a hinge from a squat from a calf raise — they all read `calf` — so the consecutive-muscle
 * rule would make a leg-focused quest impossible to write. The 12-set cap is what guards these.
 */
const SINGLE_PATTERN = new Set(["The Ploughman's Vow"]);

/** Quests allowed to require equipment. Everything else must be fully equipment-free. */
const EQUIPMENT_QUESTS = new Set([
  "Tower Climb",
  "Climb the Titan's Tower",
  "Build the Stronghold",
  "The Iron Gauntlet Challenge",
  "The Crow's Ascent",
]);

/**
 * Archetypes whose identity IS stacking one pattern (a push day is a push day, a core quest is
 * core). `metabolic` is here for a different reason: with a six-muscle taxonomy every cardio
 * movement tags `calf` and `abs`, which describes which limbs move, not where the stimulus
 * lands. The 12-sets-per-muscle cap is what actually guards those quests.
 */
const STACKING_ALLOWED = new Set<Archetype>(["strength", "skill", "core", "metabolic"]);

const REST_RANGE: Record<Archetype, [number, number]> = {
  strength: [90, 120],
  skill: [90, 120],
  hypertrophy: [60, 90],
  circuit: [40, 50],
  metabolic: [30, 45],
  core: [40, 60],
  mobility: [25, 35],
};

const DIFFICULTY_RANK = { hard: 0, medium: 1, easy: 2 } as const;

const MIN_SECONDS = 8 * 60;
const MAX_SECONDS = 25 * 60;
const MOBILITY_MIN_SECONDS = 5 * 60;
const MAX_SETS_PER_MUSCLE = 12;

/** A seeded quest always has one; the fallback only keeps the helpers total. */
function archetypeOf(quest: { archetype: Archetype | null }): Archetype {
  return quest.archetype ?? "circuit";
}

/** One round through the quest = one set per exercise, so a muscle scores `rounds` per tag. */
function setsPerMuscle(quest: {
  rounds: number;
  exercises: { exercise: { muscles: string[] } }[];
}): Map<string, number> {
  const sets = new Map<string, number>();

  for (const qex of quest.exercises) {
    for (const muscle of qex.exercise.muscles) {
      sets.set(muscle, (sets.get(muscle) ?? 0) + quest.rounds);
    }
  }

  return sets;
}

describe("content invariants", () => {
  const t = createTestDb();

  beforeAll(() => {
    jest.resetModules();
    jest.doMock("../db/client", () => ({
      db: t.db,
      schema: require("../db/schema"),
    }));
  });

  afterAll(() => {
    t.close();
  });

  async function loadQuests() {
    const quests = require("../db/quests") as typeof import("../db/quests");
    const templates = await quests.listQuestTemplates();

    const loaded = await Promise.all(
      templates.map((tpl) => quests.getQuestById(tpl.id, quests.Difficulty.Medium)),
    );

    return loaded.filter((q): q is NonNullable<typeof q> => q !== null);
  }

  test("every seeded quest declares an archetype", async () => {
    const all = await loadQuests();
    expect(all.length).toBeGreaterThan(0);

    const undeclared = all.filter((q) => q.archetype === null).map((q) => q.enTitle);
    expect(undeclared).toEqual([]);
  });

  test("estimated duration stays inside the design window", async () => {
    const { estimateQuestSeconds } = require("../db/estimate") as typeof import("../db/estimate");
    const all = await loadQuests();

    const outOfWindow = all
      .map((q) => {
        const seconds = estimateQuestSeconds({
          rounds: q.rounds,
          restSeconds: q.restSeconds,
          exercises: q.exercises.map((qex) => ({ exercise: qex.exercise, target: qex.target })),
        });
        const min = archetypeOf(q) === "mobility" ? MOBILITY_MIN_SECONDS : MIN_SECONDS;
        return { title: q.enTitle, seconds, ok: seconds >= min && seconds <= MAX_SECONDS };
      })
      .filter((r) => !r.ok);

    expect(outOfWindow).toEqual([]);
  });

  test("the hardest exercise comes first", async () => {
    const all = await loadQuests();

    const misordered = all
      .filter((q) => {
        const ranks = q.exercises.map((qex) => DIFFICULTY_RANK[qex.exercise.difficulty]);
        return ranks.some((rank, i) => i > 0 && ranks[i - 1] > rank);
      })
      .map((q) => `${q.enTitle}: ${q.exercises.map((e) => e.exercise.difficulty).join(" → ")}`);

    expect(misordered).toEqual([]);
  });

  test("consecutive exercises do not stack the same muscles", async () => {
    const all = await loadQuests();

    const offenders = all
      .filter(
        (quest) => !STACKING_ALLOWED.has(archetypeOf(quest)) && !SINGLE_PATTERN.has(quest.enTitle),
      )
      .flatMap((quest) =>
        quest.exercises.slice(1).flatMap((qex, index) => {
          const prev = quest.exercises[index].exercise;
          const shared = qex.exercise.muscles.filter((m) => prev.muscles.includes(m));
          const identical =
            shared.length === prev.muscles.length && shared.length === qex.exercise.muscles.length;

          return identical || shared.length >= 2
            ? [
                `${quest.enTitle}: ${prev.enName} → ${qex.exercise.enName} (shares ${shared.join(", ")})`,
              ]
            : [];
        }),
      );

    expect(offenders).toEqual([]);
  });

  // There is no "no muscle across four consecutive exercises" test. It was written to catch
  // Forge's four straight push movements, but with this taxonomy it also fails every legitimate
  // four-exercise core quest (`abs` in all four) and every cardio quest (`calf` in all four).
  // The 12-sets-per-muscle cap below catches the original defect on its own: pre-0013 Forge and
  // Iron Gauntlet both ran 4 rounds with `arms` in four exercises = 16 sets.

  test("no quest puts more than 12 sets on one muscle", async () => {
    const all = await loadQuests();

    const offenders = all.flatMap((quest) =>
      [...setsPerMuscle(quest)]
        .filter(([, count]) => count > MAX_SETS_PER_MUSCLE)
        .map(([muscle, count]) => `${quest.enTitle}: ${count} sets on ${muscle}`),
    );

    expect(offenders).toEqual([]);
  });

  test("rest matches the archetype", async () => {
    const all = await loadQuests();

    const offenders = all
      .filter((q) => {
        const [min, max] = REST_RANGE[archetypeOf(q)];
        return q.restSeconds < min || q.restSeconds > max;
      })
      .map((q) => `${q.enTitle}: ${q.restSeconds}s (${archetypeOf(q)})`);

    expect(offenders).toEqual([]);
  });

  test("a quest is either equipment-free or a declared equipment quest", async () => {
    const all = await loadQuests();

    const offenders = all
      .filter((q) => q.exercises.some((qex) => qex.exercise.equipment !== "none"))
      .map((q) => q.enTitle)
      .filter((title) => !EQUIPMENT_QUESTS.has(title));

    expect(offenders).toEqual([]);
  });

  test("every exercise in the catalogue is used by at least one quest", async () => {
    const exerciseApi = require("../db/exercises") as typeof import("../db/exercises");
    const all = await loadQuests();

    const used = new Set(all.flatMap((q) => q.exercises.map((qex) => qex.exercise.id)));
    const orphans = (await exerciseApi.listExercises())
      .filter((e) => !used.has(e.id))
      .map((e) => e.enName);

    expect(orphans).toEqual([]);
  });

  // No "strength quests need an antagonist" test: the muscle taxonomy cannot express movement
  // patterns (`back` covers a pull-up, a hinge and a spinal-erector hold), so the rule either
  // false-positives on Climb the Titan's Tower — pull + hinge + core, all tagged `back` — or is
  // toothless. The defect it was written for (Forge's 4 straight push exercises) is caught twice
  // over by the four-in-a-row and the 12-sets-per-muscle tests above.

  test("boss adventures declare hp, weakness and resistance", async () => {
    const schema = require("../db/schema") as typeof import("../db/schema");
    const rows = await t.db
      .select({
        enTitle: schema.adventures.enTitle,
        kind: schema.adventures.kind,
        hp: schema.adventures.bossTotalHp,
        weakness: schema.adventures.bossWeaknessMuscle,
        resistance: schema.adventures.bossResistanceMuscle,
      })
      .from(schema.adventures);

    expect(rows.length).toBeGreaterThan(0);

    const offenders = rows
      .filter((a) => a.kind === "boss")
      .filter((a) => !a.hp || !a.weakness || !a.resistance)
      .map((a) => a.enTitle);

    expect(offenders).toEqual([]);
  });

  test("adventures have at least two steps and never repeat a quest back to back", async () => {
    const schema = require("../db/schema") as typeof import("../db/schema");
    const rows = await t.db
      .select({
        title: schema.adventures.enTitle,
        stepIndex: schema.adventureSteps.stepIndex,
        questId: schema.adventureSteps.questId,
      })
      .from(schema.adventures)
      .innerJoin(schema.adventureSteps, eq(schema.adventureSteps.adventureId, schema.adventures.id))
      .orderBy(schema.adventures.id, schema.adventureSteps.stepIndex);

    const byAdventure = new Map<string, number[]>();
    for (const row of rows) {
      byAdventure.set(row.title, [...(byAdventure.get(row.title) ?? []), row.questId]);
    }

    expect(byAdventure.size).toBeGreaterThan(0);

    const offenders = [...byAdventure].flatMap(([title, questIds]) => {
      if (questIds.length < 2) return [`${title}: only ${questIds.length} step`];
      return questIds
        .slice(1)
        .flatMap((id, i) =>
          id === questIds[i] ? [`${title}: step ${i + 1} repeats step ${i}`] : [],
        );
    });

    expect(offenders).toEqual([]);
  });
});
