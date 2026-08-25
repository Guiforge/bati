import assert from "node:assert/strict";

import type { Quest } from "@/db/quests";
import { Difficulty } from "@/db/targets";
import { clientMock, createTestDb } from "./helpers/testDb";

// questConfig reaches the preferences table, which pulls in the native client: the same
// mock every other db test uses keeps this one honest about what it imports.
const t = createTestDb();

jest.resetModules();
jest.doMock("../db/client", () => clientMock(t));

const {
  applyQuestConfig,
  hasQuestOverrides,
  indexExercises,
  loadConfiguredQuest,
  parseQuestConfig,
  saveQuestConfig,
  clearQuestConfig,
} = require("../db/questConfig") as typeof import("../db/questConfig");

function makeQuest(): Quest {
  const exercise = {
    id: 1,
    enName: "Squat",
    frName: "Squat",
    enDescription: "",
    frDescription: "",
    imagePath: "assets/placeholder.jpg",
    creator: "Admin",
    difficulty: "medium" as const,
    equipment: "none" as const,
    style: "strength" as const,
    secondsPerRep: 3,
    pattern: null,
    prerequisiteExerciseId: null,
    retiredAt: null,
    muscles: [],
  };

  return {
    id: 7,
    enTitle: "Test",
    frTitle: "Test",
    enDescription: "",
    frDescription: "",
    author: "Admin",
    rounds: 3,
    restSeconds: 30,
    roundRestSeconds: null,
    archetype: null,
    imagePath: "assets/placeholder.jpg",
    exercises: [
      {
        id: 11,
        exercise,
        // Quest-specific art *of this movement* — the thing a substitution has to drop.
        images: ["assets/squat_a.webp"],
        target: { type: "reps", value: 10 },
        ghost: { last: 18, best: 25 },
      },
      { id: 12, exercise, images: [], target: { type: "time", value: 30 } },
    ],
  };
}

/** A different movement, to put in a slot. */
const dip: Quest["exercises"][number]["exercise"] = {
  id: 2,
  enName: "Dip",
  frName: "Dip",
  enDescription: "",
  frDescription: "",
  imagePath: "assets/dip.jpg",
  creator: "Admin",
  difficulty: "hard",
  equipment: "none",
  style: "calisthenics",
  secondsPerRep: 3,
  pattern: "push_vertical",
  prerequisiteExerciseId: null,
  retiredAt: null,
  muscles: ["arms"],
};

const CATALOGUE = indexExercises([dip]);

describe("db/questConfig", () => {
  afterAll(() => {
    t.close();
  });

  test("parse falls back instead of trusting stored text", () => {
    expect(parseQuestConfig(null)).toBeNull();
    expect(parseQuestConfig("not json")).toBeNull();
    expect(parseQuestConfig("[1,2]")).toEqual({ level: Difficulty.Medium });

    // Unknown level, out-of-range numbers and non-numeric targets are repaired, not kept.
    expect(
      parseQuestConfig(
        JSON.stringify({
          level: "godlike",
          rounds: 99,
          restSeconds: -5,
          roundRestSeconds: 9000,
          targets: { 11: "x" },
        }),
      ),
    ).toEqual({ level: Difficulty.Medium, rounds: 10, restSeconds: 0, roundRestSeconds: 300 });

    expect(
      parseQuestConfig(JSON.stringify({ level: "hard", rounds: 4, targets: { 11: 12 } })),
    ).toEqual({ level: Difficulty.Hard, rounds: 4, targets: { 11: 12 } });
  });

  test("a round rest on its own counts as an override", () => {
    const quest = makeQuest();
    const config = { level: Difficulty.Medium, roundRestSeconds: 120 };

    expect(hasQuestOverrides(config)).toBe(true);
    expect(applyQuestConfig(quest, config, CATALOGUE).roundRestSeconds).toBe(120);
  });

  test("a level-only config changes nothing about the quest", () => {
    const quest = makeQuest();
    expect(hasQuestOverrides({ level: Difficulty.Hard })).toBe(false);
    expect(applyQuestConfig(quest, { level: Difficulty.Hard }, CATALOGUE)).toBe(quest);
    expect(applyQuestConfig(quest, null, CATALOGUE)).toBe(quest);
  });

  test("overrides replace rounds, both rests and the targets they name", () => {
    const quest = makeQuest();
    const configured = applyQuestConfig(
      quest,
      {
        level: Difficulty.Medium,
        rounds: 5,
        restSeconds: 45,
        roundRestSeconds: 120,
        targets: { 12: 60, 999: 5 },
      },
      CATALOGUE,
    );

    expect(configured.rounds).toBe(5);
    expect(configured.restSeconds).toBe(45);
    expect(configured.roundRestSeconds).toBe(120);
    // Untouched exercise keeps its generated target; the stale id 999 is ignored.
    expect(configured.exercises[0]?.target).toEqual({ type: "reps", value: 10 });
    expect(configured.exercises[1]?.target).toEqual({ type: "time", value: 60 });

    // The template the rest of the app shares must not be mutated.
    expect(quest.rounds).toBe(3);
    expect(quest.exercises[1]?.target.value).toBe(30);
  });
  test("parse repairs a swaps map the same way it repairs targets", () => {
    // An exercise id is either an id or nothing. Clamping a corrupt 3.7 would round it into
    // exercise 4, which exists — a silently wrong movement is worse than no override.
    expect(
      parseQuestConfig(
        JSON.stringify({ level: "medium", swaps: { 11: 3.7, 12: 0, 13: "x", 14: -2 } }),
      ),
    ).toEqual({ level: Difficulty.Medium });

    expect(parseQuestConfig(JSON.stringify({ level: "medium", swaps: { 11: 2 } }))).toEqual({
      level: Difficulty.Medium,
      swaps: { 11: 2 },
    });
  });

  test("a swap on its own counts as an override", () => {
    // Otherwise the "Custom" tag and "Back to defaults" would both lie about a changed quest.
    expect(hasQuestOverrides({ level: Difficulty.Medium, swaps: { 11: 2 } })).toBe(true);
  });

  test("a swap replaces the movement and drops the art of the one it replaced", () => {
    const quest = makeQuest();
    const configured = applyQuestConfig(
      quest,
      { level: Difficulty.Medium, swaps: { 11: dip.id } },
      CATALOGUE,
    );

    const slot = configured.exercises[0];
    expect(slot?.exercise.enName).toBe("Dip");
    // `images` is the quest's art of the *old* movement, off `quest_exercises.imagesJson`. Kept,
    // the card would illustrate a squat above the word "Dip".
    expect(slot?.images).toEqual([]);
    // Same for the ghost: it is the old movement's history, and the substitute's is not here.
    expect(slot?.ghost).toBeUndefined();

    // The slot that was not swapped is untouched, art and ghost included.
    expect(configured.exercises[1]?.exercise.enName).toBe("Squat");

    // And the shared template is not mutated.
    expect(quest.exercises[0]?.exercise.enName).toBe("Squat");
    expect(quest.exercises[0]?.images).toEqual(["assets/squat_a.webp"]);
  });

  test("a swap naming an exercise the catalogue does not have is ignored", () => {
    const quest = makeQuest();
    const configured = applyQuestConfig(
      quest,
      // 4242 is not in CATALOGUE; 999 is not a slot in this quest. Both are reachable states —
      // content updates rewrite `quest_exercises` rows and retire exercises.
      { level: Difficulty.Medium, swaps: { 11: 4242, 999: 2 } },
      CATALOGUE,
    );

    expect(configured.exercises[0]?.exercise.enName).toBe("Squat");
    expect(configured.exercises[0]?.images).toEqual(["assets/squat_a.webp"]);
  });

  test("a target and a swap on different slots both apply", () => {
    const quest = makeQuest();
    const configured = applyQuestConfig(
      quest,
      { level: Difficulty.Medium, swaps: { 11: dip.id }, targets: { 12: 45 } },
      CATALOGUE,
    );

    expect(configured.exercises[0]?.exercise.enName).toBe("Dip");
    expect(configured.exercises[1]?.target.value).toBe(45);
  });
  /**
   * The one that matters most. AGENTS.md's known-debt entry says Home and the quest screen must
   * keep reading the same saved config "or they will start different sessions for the same
   * quest" — and a substitution is exactly what would make them diverge: Home starts the movement
   * the template names, the quest screen starts the one the hero chose.
   *
   * This exercises Home's path (`loadConfiguredQuest`) against the real seeded database, which is
   * the only way to catch the catalogue never being threaded in.
   */
  test("Home's path starts the movement the hero swapped in", async () => {
    const quests = require("../db/quests") as typeof import("../db/quests");
    const exercisesDb = require("../db/exercises") as typeof import("../db/exercises");

    const templates = await quests.listQuestTemplates();
    const seeded = templates.find((q) => q.frTitle === "Couper du bois");
    assert(seeded);

    const before = await loadConfiguredQuest(seeded.id);
    assert(before);
    const slot = before.quest.exercises[0];
    assert(slot);
    expect(slot.exercise.enName).toBe("Squat");

    const all = await exercisesDb.listExercises();
    const substitute = all.find((e) => e.enName === "Wall Sit");
    assert(substitute);

    await saveQuestConfig(seeded.id, {
      level: Difficulty.Medium,
      swaps: { [String(slot.id)]: substitute.id },
    });

    const after = await loadConfiguredQuest(seeded.id);
    assert(after);
    expect(after.quest.exercises[0]?.exercise.enName).toBe("Wall Sit");

    await clearQuestConfig(seeded.id);
  });
});
