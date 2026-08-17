import { eq } from "drizzle-orm";

import { type DifficultyCode, movementPatterns, type QuestArchetype } from "../db/schema";
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
        return ranks.some((rank, i) => {
          const prev = ranks[i - 1];
          return prev !== undefined && prev > rank;
        });
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
        quest.exercises.flatMap((qex, index) => {
          const prev = quest.exercises[index - 1]?.exercise;
          return prev && qex.exercise.pattern === prev.pattern
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

      const lead = quest.exercises[0]?.exercise.pattern;
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

  /**
   * The one thing `0017` computed by hand and nothing re-checked since: a boss has to die on its
   * campaign's last step, at every difficulty.
   *
   * Damage is the work the hero did, and every target is scaled 0.75/1.0/1.25 by
   * `USER_LEVEL_MULTIPLIER`, so a pool tuned once at `medium` was unreachable on `easy` — the
   * campaign ran out of steps before the boss ran out of HP, `defeatedAt` was never written, and
   * the village banner never appeared. `getOrCreateBossFight` now scales the pool by the same
   * multiplier, which is what makes the three columns below agree.
   *
   * Nominal damage only: crits, weakness and resistance are the headroom the seeded ~92 % left,
   * not part of the guarantee. The rule is that the *floor* still kills.
   */
  test("every boss falls on its campaign's last step, at every difficulty", async () => {
    const schema = require("../db/schema") as typeof import("../db/schema");
    const { generateTarget } = require("../db/targets") as typeof import("../db/targets");
    const { scaleBossHp } = require("../db/bossFights") as typeof import("../db/bossFights");
    const { toRepEquivalent } = require("../db/workUnits") as typeof import("../db/workUnits");

    const steps = await t.db
      .select({
        title: schema.adventures.enTitle,
        hp: schema.adventures.bossTotalHp,
        stepIndex: schema.adventureSteps.stepIndex,
        questId: schema.adventureSteps.questId,
        rounds: schema.quests.rounds,
      })
      .from(schema.adventures)
      .innerJoin(schema.adventureSteps, eq(schema.adventureSteps.adventureId, schema.adventures.id))
      .innerJoin(schema.quests, eq(schema.quests.id, schema.adventureSteps.questId))
      .where(eq(schema.adventures.kind, "boss"))
      .orderBy(schema.adventures.id, schema.adventureSteps.stepIndex);

    const exercises = await t.db
      .select({
        questId: schema.questExercises.questId,
        targetType: schema.questExercises.targetType,
        targetMin: schema.questExercises.targetMin,
        targetMax: schema.questExercises.targetMax,
      })
      .from(schema.questExercises);

    const byQuest = new Map<number, typeof exercises>();
    for (const ex of exercises) {
      byQuest.set(ex.questId, [...(byQuest.get(ex.questId) ?? []), ex]);
    }

    /** What one step of this quest takes off the boss, at the targets this level prescribes. */
    const stepDamage = (questId: number, rounds: number, level: DifficultyCode) =>
      rounds *
      (byQuest.get(questId) ?? []).reduce((sum, ex) => {
        const target = generateTarget(
          { type: ex.targetType, min: ex.targetMin, max: ex.targetMax },
          level as never,
        );
        return sum + toRepEquivalent(target.value, ex.targetType);
      }, 0);

    const byAdventure = new Map<string, { hp: number; steps: typeof steps }>();
    for (const row of steps) {
      if (row.hp == null) continue;
      const entry = byAdventure.get(row.title) ?? { hp: row.hp, steps: [] };
      entry.steps.push(row);
      byAdventure.set(row.title, entry);
    }

    expect(byAdventure.size).toBeGreaterThan(0);

    const levels: DifficultyCode[] = ["easy", "medium", "hard"];
    const offenders = [...byAdventure].flatMap(([title, { hp, steps: campaign }]) =>
      levels.flatMap((level) => {
        const pool = scaleBossHp(hp, level);
        const perStep = campaign.map((s) => stepDamage(s.questId, s.rounds, level));
        const total = perStep.reduce((a, b) => a + b, 0);
        const beforeLast = total - (perStep.at(-1) ?? 0);

        // The window is printed either way: whoever lands here next needs the number to seed, not
        // just the news that the old one is wrong.
        const window = `wants ${beforeLast + 1}..${total}, has ${pool}`;
        if (pool > total) return [`${title} @${level}: survives the campaign — ${window}`];
        if (pool <= beforeLast)
          return [`${title} @${level}: dies before the last step — ${window}`];
        return [];
      }),
    );

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
  // The warm-up names its movements as strings and resolves them against this catalogue at
  // render time, so a rename or a merge (`0023` did both) silently degrades a step to an English
  // label with a placeholder image instead of failing. This is the check that notices.
  //
  // Swept from the exported pool rather than from built warm-ups: enumerating quest shapes only
  // ever covered the branches the test remembered to write, and a movement reachable by one rule
  // alone is exactly the one a rename breaks unseen.
  test("every warm-up movement exists in the catalogue", async () => {
    const { WARMUP_MOVEMENTS } =
      require("../constants/warmup") as typeof import("../constants/warmup");
    const { listExercises } = require("../db/exercises") as typeof import("../db/exercises");

    const catalogue = new Set((await listExercises()).map((e) => e.enName));

    expect(WARMUP_MOVEMENTS.filter((name) => !catalogue.has(name))).toEqual([]);
  });

  // A warm-up prepares; it does not train. Anything hard enough to cost the session is not a
  // warm-up movement, however well it fits the pattern the quest is about to load.
  test("no warm-up movement is a hard exercise", async () => {
    const { WARMUP_MOVEMENTS } =
      require("../constants/warmup") as typeof import("../constants/warmup");
    const { listExercises } = require("../db/exercises") as typeof import("../db/exercises");

    const byName = new Map((await listExercises()).map((e) => [e.enName, e]));
    const tooHard = WARMUP_MOVEMENTS.filter((name) => byName.get(name)?.difficulty === "hard");

    expect(tooHard).toEqual([]);
  });

  // The length rule is a proportion, so it can only be checked against real content: a quest
  // seeded tomorrow at forty minutes, or at four, is what would push the warm-up somewhere silly.
  // The literature asks for 5–10 min; the app buys specificity instead of length and keeps the
  // warm-up a quarter of the session, which is the trade `workout-best-practices.md` documents.
  test("every seeded quest gets a warm-up proportional to it", async () => {
    const { buildWarmup } = require("../constants/warmup") as typeof import("../constants/warmup");
    const { estimateQuestSeconds } = require("../db/estimate") as typeof import("../db/estimate");
    const all = await loadQuests();

    const offenders = all.flatMap((quest) => {
      const session = estimateQuestSeconds(quest);
      const warmup = buildWarmup(quest).reduce((sum, s) => sum + s.seconds, 0);
      const share = warmup / session;

      // Never under two minutes — the shortest warm-up the app has ever shipped — and never over
      // five and a half, nor more than a third of the session it precedes. The half minute above
      // five is the wrist step, which sits outside the length budget on purpose: the longest
      // quests that press vertically are exactly the ones that must not have it trimmed away.
      const ok = warmup >= 120 && warmup <= 330 && share <= 0.34;
      return ok ? [] : [`${quest.enTitle}: ${warmup}s warm-up on a ${session}s session`];
    });

    expect(offenders).toEqual([]);
  });

  // Every route up the ladder is named after the movement it ends on. A summit with no name still
  // renders — `pathName` returns null and the UI falls back to the movement — but the fallback is
  // there so a ladder edge added mid-flight leaves no hole on screen, not so naming can be
  // skipped. A path that speaks in coordinates is the thing this feature exists to end.
  test("every ladder summit has a path name", () => {
    const { PATH_NAMES } = require("../db/paths") as typeof import("../db/paths");

    const rows = t.sqlite
      .prepare("SELECT enName, prerequisiteExerciseId AS prereq, id FROM exercises")
      .all() as { enName: string; prereq: number | null; id: number }[];

    const isPrerequisite = new Set(rows.map((r) => r.prereq).filter(Boolean));
    const summits = rows.filter((r) => r.prereq !== null && !isPrerequisite.has(r.id));

    expect(summits.length).toBeGreaterThan(0);
    expect(summits.filter((s) => !PATH_NAMES[s.enName]).map((s) => s.enName)).toEqual([]);
  });

  // Rotation must not be able to change what the warm-up *is* — only which movements fill it.
  test("the session count never changes a warm-up's length or its wrist step", async () => {
    const { buildWarmup } = require("../constants/warmup") as typeof import("../constants/warmup");
    const all = await loadQuests();

    const offenders = all.flatMap((quest) => {
      const built = Array.from({ length: 12 }, (_, i) => buildWarmup(quest, i));
      const lengths = new Set(built.map((steps) => steps.length));
      const wrists = new Set(built.map((s) => s.some((x) => x.exerciseName === "Wrist Circles")));

      return lengths.size === 1 && wrists.size === 1 ? [] : [quest.enTitle];
    });

    expect(offenders).toEqual([]);
  });
});
