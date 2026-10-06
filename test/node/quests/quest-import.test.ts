/**
 * Importing a quest file twice, and importing one that fails (data-rules.md R69): the second import changes
 * nothing but the update date, and a refused one leaves every count where it was.
 */
import { type Device, newDevice } from "../harness/device";
import { useDeviceClocks } from "../harness/world";

beforeAll(() => useDeviceClocks());

let a: Device;
beforeEach(async () => {
  a = await newDevice("Q");
});
afterEach(() => a.close());

const count = (table: string) =>
  (a.sqlite.prepare(`SELECT count(*) AS n FROM ${table}`).get() as { n: number }).n;
const counts = () => ({
  quests: count("quests"),
  slots: count("quest_exercises"),
  exercises: count("exercises"),
  muscles: count("exercise_muscles"),
});

function fileWith(official: string[], uuid = "0192a000-0000-7000-8000-000000000001") {
  return {
    kind: "bati-quest",
    version: 1,
    quest: {
      uuid,
      title: { en: "Iron morning", fr: "Matin de fer", de: "Eisenmorgen", es: "Mañana de hierro" },
      description: { en: "Three rounds.", fr: "", de: "", es: "" },
      rounds: 3,
      restSeconds: 30,
      roundRestSeconds: 60,
      image: null,
    },
    slots: [
      ...official.map((name) => ({
        movement: { official: name },
        target: { type: "reps", min: 8, max: 12 },
      })),
      {
        movement: {
          own: {
            uuid: "0192a000-0000-7000-8000-000000000002",
            name: "Garden dip",
            description: "Between two chairs.",
            image: "",
            muscles: ["chest", "arms"],
            style: "calisthenics",
            difficulty: "medium",
            equipment: "dip_bar",
            pattern: "push_vertical",
            measure: "reps",
            secondsPerRep: 3,
          },
        },
        target: { type: "reps", min: 5, max: 10 },
      },
    ],
  };
}

const officials = () =>
  (
    a.sqlite
      .prepare(
        "SELECT enName FROM exercises WHERE creator = 'Admin' AND style = 'calisthenics' LIMIT 2",
      )
      .all() as { enName: string }[]
  ).map((r) => r.enName);

const parse = (file: unknown) => a.app.quest.parseQuestFile(JSON.stringify(file));

describe("importing a quest file", () => {
  test("twice is once: the same quests, slots and movements, one more update date", async () => {
    const names = officials();
    expect(names).toHaveLength(2);
    const file = parse(fileWith(names));
    const before = counts();

    const first = await a.app.quest.importQuest(file);
    const afterFirst = counts();
    const second = await a.app.quest.importQuest(file);

    expect(afterFirst).toEqual({
      quests: before.quests + 1,
      slots: before.slots + 3,
      exercises: before.exercises + 1,
      muscles: before.muscles + 2,
    });
    expect(counts()).toEqual(afterFirst);
    expect(second).toEqual({ id: first.id, updated: true });
  });

  test("a file naming a movement this build does not have is refused and leaves every count as it was", async () => {
    const before = counts();
    const file = parse(fileWith(["A movement nobody ever made"]));

    await expect(a.app.quest.importQuest(file)).rejects.toMatchObject({
      reason: "unknown_movement",
    });

    expect(counts()).toEqual(before);
  });

  test("the same title under another uuid is a second quest, never an overwrite", async () => {
    const names = officials();
    await a.app.quest.importQuest(parse(fileWith(names)));
    const before = counts();

    await a.app.quest.importQuest(parse(fileWith(names, "0192a000-0000-7000-8000-000000000009")));

    expect(counts().quests).toBe(before.quests + 1);
    // The hero movement travels by uuid: the second file reuses the row the first one made.
    expect(counts().exercises).toBe(before.exercises);
  });
});
