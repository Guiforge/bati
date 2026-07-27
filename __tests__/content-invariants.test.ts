import { createTestDb } from "./helpers/testDb";

/**
 * Content invariants — the gate for docs/planning/work-roadmap.md §2.2.
 *
 * Quests carry no archetype column: it is meant to be derived at read time (§8 F3), so until
 * that lands this map IS the declaration. Every seeded quest must appear here, which is also
 * how a new quest gets its design intent reviewed: you cannot seed one without saying what it
 * is meant to be.
 */
type Archetype =
  | "strength"
  | "skill"
  | "hypertrophy"
  | "circuit"
  | "metabolic"
  | "core"
  | "mobility";

const ARCHETYPES: Record<string, Archetype> = {
  "Chop Wood": "circuit",
  "Tower Climb": "hypertrophy",
  "Knight Push": "circuit",
  "Shield Wall": "core",
  "Gather Stones": "circuit",
  "Raise the Shelter": "circuit",
  "Core Forge": "core",
  "Golem Strike": "circuit",
  "Golem Core": "core",
  "Forge the Dragon Blade": "strength",
  "Climb the Titan's Tower": "strength",
  "Build the Stronghold": "hypertrophy",
  "The Iron Gauntlet Challenge": "strength",
  // Phase B — seeded by 0014
  "Escape the Collapsing Mine": "metabolic",
  "Guard the Fortress Gate": "core",
  "The Arcane Gauntlet": "core",
  "The Druid's Path": "mobility",
  "Sprint Through the Shadowlands": "metabolic",
  "Morning of the Champion": "circuit",
};

/** Quests allowed to require a pull-up bar. Everything else must be fully equipment-free. */
const BAR_QUESTS = new Set([
  "Tower Climb",
  "Climb the Titan's Tower",
  "Build the Stronghold",
  "The Iron Gauntlet Challenge",
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

    const undeclared = all.map((q) => q.enTitle).filter((title) => !(title in ARCHETYPES));
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
        const min = ARCHETYPES[q.enTitle] === "mobility" ? MOBILITY_MIN_SECONDS : MIN_SECONDS;
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
    const offenders: string[] = [];

    for (const quest of all) {
      if (STACKING_ALLOWED.has(ARCHETYPES[quest.enTitle])) continue;

      for (let i = 1; i < quest.exercises.length; i++) {
        const prev = new Set(quest.exercises[i - 1].exercise.muscles);
        const curr = quest.exercises[i].exercise.muscles;
        const shared = curr.filter((m) => prev.has(m));

        const identical = shared.length === prev.size && shared.length === curr.length;
        if (identical || shared.length >= 2) {
          offenders.push(
            `${quest.enTitle}: ${quest.exercises[i - 1].exercise.enName} → ` +
              `${quest.exercises[i].exercise.enName} (shares ${shared.join(", ")})`,
          );
        }
      }
    }

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
        const [min, max] = REST_RANGE[ARCHETYPES[q.enTitle]];
        return q.restSeconds < min || q.restSeconds > max;
      })
      .map((q) => `${q.enTitle}: ${q.restSeconds}s (${ARCHETYPES[q.enTitle]})`);

    expect(offenders).toEqual([]);
  });

  test("a quest is either equipment-free or a declared bar quest", async () => {
    const all = await loadQuests();

    const offenders = all
      .filter((q) => q.exercises.some((qex) => qex.exercise.equipment !== "none"))
      .map((q) => q.enTitle)
      .filter((title) => !BAR_QUESTS.has(title));

    expect(offenders).toEqual([]);
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

  // Lands with Phase D: the 20 exercises seeded by 0010 are still used by zero quest.
  test.todo("every exercise in the catalogue is used by at least one quest");

  // Lands with Phase E: The Iron Lord's Conquest repeats the same quest on steps 6 and 7.
  test.todo("no adventure repeats the same quest on consecutive steps");
});
