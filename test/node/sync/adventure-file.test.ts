/**
 * An adventure file imported (data-rules.md R124) is an ordinary write of the hero's rows, so two devices that each
 * import the same file meet by uuid and agree, and a copy is a second adventure on both. The real
 * `importAdventure` on each device, the real `deviceSync` between them, and a last visit that finds nothing to take.
 */
import { type Device, newDevice, reports } from "../harness/device";
import { SERVERS, wipe } from "../harness/servers";
import { HERO_PASSWORD, joinVault, startVault, sync, useDeviceClocks } from "../harness/world";

beforeAll(() => useDeviceClocks());

const server = SERVERS.faulty as (typeof SERVERS)[string];
let a: Device;
let b: Device;
const UUID = "0192b000-0000-7000-8000-000000000001";

beforeEach(async () => {
  wipe(server);
  reports.length = 0;
  [a, b] = [await newDevice("A"), await newDevice("B")];
  await startVault(a, server);
  await joinVault(b, server, HERO_PASSWORD);
});
afterEach(() => {
  for (const d of [a, b]) d.close();
});

const seedQuests = (d: Device) =>
  (
    d.sqlite
      .prepare("SELECT enTitle FROM quests WHERE author = 'Admin' ORDER BY id LIMIT 2")
      .all() as {
      enTitle: string;
    }[]
  ).map((r) => r.enTitle);

function fileOf(d: Device) {
  const [one, two] = seedQuests(d);
  return d.app.adventure.parseAdventureData({
    kind: "bati-adventure",
    version: 1,
    adventure: {
      uuid: UUID,
      title: "The long road",
      description: "",
      cover: null,
      end: { kind: "route" },
    },
    steps: [
      { quest: { official: one }, narrative: "one", outro: "" },
      { quest: { official: two }, narrative: "two", outro: "" },
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
                movement: {
                  own: {
                    uuid: "0192b000-0000-7000-8000-000000000003",
                    name: "Garden dip",
                    description: "",
                    image: "",
                    muscles: ["arms"],
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
        narrative: "three",
        outro: "",
      },
    ],
  });
}

/** What a hero sees of their adventures, by uuid and not by local id. */
function view(d: Device) {
  const adventures = d.sqlite
    .prepare("SELECT uuid, enTitle, isActive FROM adventures WHERE author = 'hero' ORDER BY uuid")
    .all() as { uuid: string; enTitle: string; isActive: number }[];
  return adventures.map((adv) => ({
    ...adv,
    steps: d.sqlite
      .prepare(
        `SELECT q.uuid AS quest, q.enTitle, s.enNarrative FROM adventure_steps s
           JOIN adventures a ON a.id = s.adventureId JOIN quests q ON q.id = s.questId
          WHERE a.uuid = ? ORDER BY s.stepIndex`,
      )
      .all(adv.uuid) as { quest: string; enTitle: string; enNarrative: string }[],
  }));
}
const count = (d: Device, table: string, where = "1") =>
  (d.sqlite.prepare(`SELECT count(*) AS n FROM ${table} WHERE ${where}`).get() as { n: number }).n;

/** Both devices visit twice, then a third visit each that must find nothing to take. */
async function settle() {
  await sync(a);
  await sync(b);
  await sync(a);
  await sync(b);
  const [lastA, lastB] = [await sync(a), await sync(b)];
  for (const rounds of [lastA, lastB]) {
    for (const round of rounds) {
      expect(round.merged).toEqual([]);
      expect(Object.values(round.states).filter((s) => s === "ahead" || s === "diverged")).toEqual(
        [],
      );
    }
  }
}

describe("an adventure file imported on two devices", () => {
  test("one file on both is one adventure with one set of quests, and a third visit finds nothing", async () => {
    await a.app.adventure.importAdventure(fileOf(a), { asCopy: false });
    await b.app.adventure.importAdventure(fileOf(b), { asCopy: false });

    await settle();

    expect(view(a)).toEqual(view(b));
    expect(view(a)).toHaveLength(1);
    for (const d of [a, b]) {
      expect(count(d, "quests", "uuid = '0192b000-0000-7000-8000-000000000002'")).toBe(1);
      expect(count(d, "exercises", "uuid = '0192b000-0000-7000-8000-000000000003'")).toBe(1);
    }
    expect(reports.map((r) => r.context).filter((x) => !/^sync\.(peer|run)$/.test(x))).toEqual([]);
  });

  test("a copy on one device is a second adventure on both, naming the same quests", async () => {
    await a.app.adventure.importAdventure(fileOf(a), { asCopy: false });
    await settle();
    expect(view(b)).toHaveLength(1);

    await b.app.adventure.importAdventure(fileOf(b), { asCopy: true });
    await settle();

    expect(view(a)).toEqual(view(b));
    expect(view(a)).toHaveLength(2);
    const [first, second] = view(a);
    expect(first?.steps.map((s) => s.quest)).toEqual(second?.steps.map((s) => s.quest));
    expect(count(a, "quests", "uuid = '0192b000-0000-7000-8000-000000000002'")).toBe(1);
  });
});
