import { eq } from "drizzle-orm";

import { movementPatterns, type QuestArchetype } from "../db/schema";
import { clientMock, createTestDb } from "./helpers/testDb";

/**
 * Content invariants — the hard constraints every seeded quest has to satisfy. This file is
 * where they live now: the plan that wrote them in prose is gone, the test is the rule.
 *
 * A quest's archetype is what it is meant to be, and it is now a column (`0019`) rather than a
 * map maintained inside this file: the app needs it too, to say what kind of session a card is
 * before the hero starts. Seeding a quest without one fails the first test below, which is the
 * point — the design intent has to be declared, not inferred.
 */
type Archetype = QuestArchetype;

/** Quests allowed to require equipment. Everything else must be fully equipment-free. */
const EQUIPMENT_QUESTS = new Set([
  "Tower Climb",
  "Climb the Titan's Tower",
  "Build the Stronghold",
  "The Iron Gauntlet Challenge",
  "The Crow's Ascent",
]);

/** Archetypes whose identity IS repeating one pattern: a push day is a push day, core is core. */
const STACKING_ALLOWED = new Set<Archetype>(["strength", "skill", "core", "mobility"]);

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
const MOVEMENT_PATTERNS = [...movementPatterns];

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
    jest.doMock("../db/client", () => clientMock(t));
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

  test("every exercise declares a movement pattern", async () => {
    const all = await loadQuests();

    const undeclared = all.flatMap((q) =>
      q.exercises.filter((qex) => qex.exercise.pattern === null).map((qex) => qex.exercise.enName),
    );

    expect([...new Set(undeclared)]).toEqual([]);
  });

  test("consecutive exercises do not repeat a pattern", async () => {
    const all = await loadQuests();

    const offenders = all
      .filter((quest) => !STACKING_ALLOWED.has(archetypeOf(quest)))
      .flatMap((quest) =>
        quest.exercises.slice(1).flatMap((qex, index) => {
          const prev = quest.exercises[index].exercise;
          return qex.exercise.pattern === prev.pattern
            ? [`${quest.enTitle}: ${prev.enName} → ${qex.exercise.enName} (${prev.pattern})`]
            : [];
        }),
      );

    expect(offenders).toEqual([]);
  });

  // The rule that was abandoned when muscles were the only vocabulary: every core quest reads
  // `abs` four times over and every cardio quest reads `legs`, so it could not be expressed.
  // Patterns can say it, and it is not relaxed for anyone.
  test("no pattern survives four consecutive exercises, anywhere", async () => {
    const all = await loadQuests();
    const offenders: string[] = [];

    for (const quest of all) {
      for (let i = 3; i < quest.exercises.length; i++) {
        const window = quest.exercises.slice(i - 3, i + 1).map((qex) => qex.exercise.pattern);
        // A core quest made of four core movements is the session, not a defect — but a
        // strength quest made of four pushes still is. The exemption is exactly that narrow:
        // the archetype has to name the very pattern being repeated.
        if (window[0] === archetypeOf(quest)) continue;
        if (window.every((p) => p !== null && p === window[0])) {
          offenders.push(`${quest.enTitle}: four in a row on ${window[0]}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  // Also previously impossible: `back` covers a pull-up, a hinge and a plank, so "has an
  // antagonist" false-positived on Climb the Titan's Tower. Patterns tell them apart.
  test("a strength or skill quest balances its lead with another pattern", async () => {
    const all = await loadQuests();
    const offenders: string[] = [];

    for (const quest of all) {
      const archetype = archetypeOf(quest);
      if (archetype !== "strength" && archetype !== "skill") continue;

      const lead = quest.exercises[0].exercise.pattern;
      const balanced = quest.exercises.slice(1).some((qex) => qex.exercise.pattern !== lead);

      if (!balanced) offenders.push(`${quest.enTitle}: every exercise is ${lead}`);
    }

    expect(offenders).toEqual([]);
  });

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

  // The finding the audit could only state in prose: the hinge was invisible because `legs`
  // covered a squat and a deadlift alike. Now it is a test — every pattern a hero can train
  // without equipment must have at least one quest they can reach without any.
  test("every movement pattern has an equipment-free quest", async () => {
    const all = await loadQuests();

    const covered = new Set(
      all
        .filter((q) => q.exercises.every((qex) => qex.exercise.equipment === "none"))
        .flatMap((q) => q.exercises.map((qex) => qex.exercise.pattern)),
    );

    // Vertical pulling needs a bar, and no amount of content design changes that.
    const uncoverable = new Set(["pull_vertical"]);
    const missing = MOVEMENT_PATTERNS.filter((p) => !covered.has(p) && !uncoverable.has(p));

    expect(missing).toEqual([]);
  });

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
  // `buildWarmup` names its movements as strings and resolves them against this catalogue at
  // render time, so a rename or a merge (`0023` did both) silently degrades the warm-up to an
  // English label with a placeholder image instead of failing. This is the check that notices.
  test("every warm-up movement exists in the catalogue", async () => {
    const { buildWarmup } = require("../constants/warmup") as typeof import("../constants/warmup");
    const { listExercises } = require("../db/exercises") as typeof import("../db/exercises");

    const catalogue = new Set((await listExercises()).map((e) => e.enName));

    // Every branch buildWarmup can take, so a movement reachable only by one rule still counts.
    const shapes = [
      { archetype: null, exercises: [{ exercise: { pattern: null } }] },
      {
        archetype: "skill" as const,
        exercises: [{ exercise: { pattern: "push_vertical" as const } }],
      },
      {
        archetype: "strength" as const,
        exercises: [
          { exercise: { pattern: "squat" as const } },
          { exercise: { pattern: "hinge" as const } },
        ],
      },
      {
        archetype: "strength" as const,
        exercises: [
          { exercise: { pattern: "pull_vertical" as const } },
          { exercise: { pattern: "pull_horizontal" as const } },
        ],
      },
    ];

    const missing = shapes
      .flatMap((shape) => buildWarmup(shape))
      .map((step) => step.exerciseName)
      .filter((name) => !catalogue.has(name));

    expect([...new Set(missing)]).toEqual([]);
  });
});
