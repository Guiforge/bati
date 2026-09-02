import type { Exercise } from "@/db/exercises";
import { hasOutdoorMovement, isOutingQuest } from "@/db/expeditions";
import { listOutings } from "@/db/outings";
import type { QuestTemplate } from "@/db/quests";

/**
 * The two predicates are deliberately not the same question, and this file is where that stays
 * true. A quest that walks for ten minutes and then does push-ups in the yard belongs in the
 * gallery's "Outside" filter and must never be a tile in Home's band: tapping a door out has to
 * mean going out, and the band's tile names a movement the mixed quest is only half made of.
 *
 * It is reachable content, not a hypothetical: the quest editor's picker is
 * `pickableExercises()`, which hides retired movements and nothing else, so a hero can put
 * "Warden's Walk" in a quest next to anything.
 */

const mockState: { quests: QuestTemplate[]; exercises: Exercise[] } = { quests: [], exercises: [] };

jest.mock("@/db/quests", () => ({
  listQuestTemplates: () => Promise.resolve(mockState.quests),
}));

jest.mock("@/db/exercises", () => ({
  listExercises: () => Promise.resolve(mockState.exercises),
}));

function makeExercise(over: Partial<Exercise> & Pick<Exercise, "id">): Exercise {
  return {
    enName: "Exercise",
    frName: "Exercice",
    enDescription: "",
    frDescription: "",
    imagePath: "assets/placeholder.webp",
    creator: "Admin",
    difficulty: "medium",
    equipment: "none",
    style: "calisthenics",
    secondsPerRep: 3,
    muscles: [],
    pattern: null,
    measure: null,
    prerequisiteExerciseId: null,
    retiredAt: null,
    ...over,
  };
}

function makeQuest(id: number, enTitle: string, exerciseIds: number[]): QuestTemplate {
  return {
    id,
    enTitle,
    frTitle: enTitle,
    enDescription: "",
    frDescription: "",
    author: "Admin",
    rounds: 1,
    restSeconds: 30,
    roundRestSeconds: null,
    archetype: "metabolic",
    imagePath: "assets/images/quests/wardens_round.jpg",
    exercises: exerciseIds.map((exerciseId) => ({
      exerciseId,
      images: [],
      baseTarget: { type: "time" as const, min: 600, max: 1200 },
    })),
  };
}

// 0041: the three ways out. 0032: something that happens in the yard.
const walk = makeExercise({
  id: 1,
  enName: "Warden's Walk",
  frName: "Marche",
  style: "expedition",
});
const run = makeExercise({
  id: 2,
  enName: "Messenger's Run",
  frName: "Course",
  style: "expedition",
});
const pushUp = makeExercise({ id: 3, enName: "Push-up", frName: "Pompe" });

const exercisesById: Record<number, Exercise> = { 1: walk, 2: run, 3: pushUp };

const outing = makeQuest(10, "The Warden's Round", [1]);
const mixed = makeQuest(11, "Walk then push", [1, 3]);
const indoors = makeQuest(12, "Yard work", [3]);
const empty = makeQuest(13, "Unfinished", []);

describe("the two questions about going outside", () => {
  it("puts the mixed quest in the gallery's filter and keeps it out of the band", () => {
    expect(hasOutdoorMovement(mixed, exercisesById)).toBe(true);
    expect(isOutingQuest(mixed, exercisesById)).toBe(false);
  });

  it("agrees on a pure outing and on a quest with nothing outdoors", () => {
    expect(hasOutdoorMovement(outing, exercisesById)).toBe(true);
    expect(isOutingQuest(outing, exercisesById)).toBe(true);
    expect(hasOutdoorMovement(indoors, exercisesById)).toBe(false);
    expect(isOutingQuest(indoors, exercisesById)).toBe(false);
  });

  // `every` on an empty array is true, and the editor holds a quest with no slots while the
  // hero is still writing it.
  it("does not call a quest with no exercises a way out", () => {
    expect(isOutingQuest(empty, exercisesById)).toBe(false);
  });

  it("ignores a slot whose exercise is missing rather than assuming it is outdoors", () => {
    const dangling = makeQuest(14, "Points at nothing", [99]);
    expect(hasOutdoorMovement(dangling, exercisesById)).toBe(false);
    expect(isOutingQuest(dangling, exercisesById)).toBe(false);
  });
});

describe("listOutings", () => {
  it("returns only the doors out, each carrying the movement the band names", async () => {
    mockState.quests = [indoors, outing, mixed, makeQuest(15, "Word Must Travel", [2])];
    mockState.exercises = [walk, run, pushUp];

    const outings = await listOutings();

    expect(outings.map((o) => o.quest.enTitle)).toEqual(["The Warden's Round", "Word Must Travel"]);
    // The tile says "Course du Messager", not "La Parole Doit Passer" — the movement is what
    // tells the hero which one is the run.
    expect(outings.map((o) => o.exercise.enName)).toEqual(["Warden's Walk", "Messenger's Run"]);
  });

  it("carries a hero's own outing, because who wrote it is not what makes it a door", async () => {
    const heroOuting = { ...makeQuest(16, "My long run", [2]), author: "hero" as const };
    mockState.quests = [heroOuting];
    mockState.exercises = [walk, run, pushUp];

    expect((await listOutings()).map((o) => o.quest.id)).toEqual([16]);
  });
});
