import type { Quest } from "@/db/quests";
import { Difficulty } from "@/db/targets";
import { clientMock, createTestDb } from "./helpers/testDb";

// questConfig reaches the preferences table, which pulls in the native client: the same
// mock every other db test uses keeps this one honest about what it imports.
const t = createTestDb();

jest.resetModules();
jest.doMock("../db/client", () => clientMock(t));

const { applyQuestConfig, hasQuestOverrides, parseQuestConfig } =
  require("../db/questConfig") as typeof import("../db/questConfig");

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
      { id: 11, exercise, images: [], target: { type: "reps", value: 10 } },
      { id: 12, exercise, images: [], target: { type: "time", value: 30 } },
    ],
  };
}

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
    expect(applyQuestConfig(quest, config).roundRestSeconds).toBe(120);
  });

  test("a level-only config changes nothing about the quest", () => {
    const quest = makeQuest();
    expect(hasQuestOverrides({ level: Difficulty.Hard })).toBe(false);
    expect(applyQuestConfig(quest, { level: Difficulty.Hard })).toBe(quest);
    expect(applyQuestConfig(quest, null)).toBe(quest);
  });

  test("overrides replace rounds, both rests and the targets they name", () => {
    const quest = makeQuest();
    const configured = applyQuestConfig(quest, {
      level: Difficulty.Medium,
      rounds: 5,
      restSeconds: 45,
      roundRestSeconds: 120,
      targets: { 12: 60, 999: 5 },
    });

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
});
