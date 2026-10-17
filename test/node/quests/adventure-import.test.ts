/**
 * Importing an adventure file twice, and importing one that fails (data-rules.md R124): the second import changes
 * nothing but the update date, and a refused one leaves every count where it was. The step rows are compared by
 * content, not by id: an update in place deletes and inserts them, as the adventure editor does.
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
  adventures: count("adventures"),
  steps: count("adventure_steps"),
});
const content = () =>
  a.sqlite
    .prepare(
      `SELECT s.stepIndex, s.enNarrative, q.uuid AS quest, q.enTitle
         FROM adventure_steps s JOIN quests q ON q.id = s.questId
        WHERE s.adventureId IN (SELECT id FROM adventures WHERE uuid = '0192b000-0000-7000-8000-000000000001')
        ORDER BY s.stepIndex`,
    )
    .all();

const seedQuests = () =>
  (
    a.sqlite
      .prepare("SELECT enTitle FROM quests WHERE author = 'Admin' ORDER BY id LIMIT 2")
      .all() as {
      enTitle: string;
    }[]
  ).map((r) => r.enTitle);
const seedMovement = () =>
  (
    a.sqlite
      .prepare(
        "SELECT enName FROM exercises WHERE creator = 'Admin' AND style = 'calisthenics' LIMIT 1",
      )
      .get() as { enName: string }
  ).enName;

function fileWith(official: string[], unknownMovement = false) {
  return {
    kind: "bati-adventure",
    version: 1,
    adventure: {
      uuid: "0192b000-0000-7000-8000-000000000001",
      title: "The long road",
      description: "",
      cover: null,
      end: { kind: "route" },
    },
    steps: [
      ...official.map((title) => ({ quest: { official: title }, narrative: "n", outro: "" })),
      {
        quest: {
          own: {
            quest: {
              uuid: "0192b000-0000-7000-8000-000000000002",
              title: { en: "Iron morning" },
              description: { en: "" },
              rounds: 3,
              restSeconds: 30,
              roundRestSeconds: null,
              image: null,
            },
            slots: [
              {
                movement: { official: unknownMovement ? "A movement nobody made" : seedMovement() },
                target: { type: "reps", min: 8, max: 12 },
              },
              {
                movement: {
                  own: {
                    uuid: "0192b000-0000-7000-8000-000000000003",
                    name: "Garden dip",
                    description: "Between two chairs.",
                    image: "",
                    muscles: ["chest", "arms"],
                    style: "calisthenics",
                    difficulty: "medium",
                    equipment: "dip_bar",
                    pattern: "push_vertical",
                    measure: "reps",
                    perSide: false,
                    secondsPerRep: 3,
                  },
                },
                target: { type: "reps", min: 5, max: 10 },
              },
            ],
          },
        },
        narrative: "last",
        outro: "",
      },
    ],
  };
}

describe("importing an adventure file", () => {
  test("twice is once: the same rows, one more update date", async () => {
    const file = a.app.adventure.parseAdventureData(fileWith(seedQuests()));
    const before = counts();

    const first = await a.app.adventure.importAdventure(file, { asCopy: false });
    const afterFirst = counts();
    const content1 = content();
    const second = await a.app.adventure.importAdventure(file, { asCopy: false });

    expect(afterFirst).toEqual({
      quests: before.quests + 1,
      slots: before.slots + 2,
      exercises: before.exercises + 1,
      adventures: before.adventures + 1,
      steps: before.steps + 3,
    });
    expect(counts()).toEqual(afterFirst);
    expect(content()).toEqual(content1);
    expect(second).toEqual({ id: first.id, updated: true });
  });

  test("a file the writer cannot finish is refused and leaves every count as it was", async () => {
    // Two seed steps are fine; the carried quest names a movement this build lacks, so it is left out
    // and the adventure still files with two steps. With one seed step only, nothing is left to file.
    const [one] = seedQuests();
    const file = a.app.adventure.parseAdventureData(fileWith(one ? [one] : [], true));
    const before = counts();

    await expect(a.app.adventure.importAdventure(file, { asCopy: false })).rejects.toMatchObject({
      reason: "unknown_quest",
    });

    expect(counts()).toEqual(before);
  });
});
