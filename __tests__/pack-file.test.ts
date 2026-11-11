/**
 * A pack arrives from someone else's phone, so every field of it is a trust boundary
 * (`src/packFile.ts`). Held here: the shape the reader accepts and each way it refuses one. The
 * fields of a movement, a quest and an adventure are held where those are read
 * (`quest-file.test.ts`, `adventure-file.test.ts`); what an import writes is held on a real
 * database (`test/node/quests/pack-import.test.ts`).
 */
jest.mock("@/db/client", () => ({ db: {}, schema: {}, transactionOrFallback: jest.fn() }));
jest.mock("expo-sharing", () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));

import { AdventureFileError, parseAdventureData } from "@/src/adventureFile";
import { PackFileError, parsePackData } from "@/src/packFile";
import { parseQuestData, QuestFileError } from "@/src/questFile";

const id = (n: number) => `0192c000-0000-7000-8000-0000000000${String(n).padStart(2, "0")}`;
const PUSH = id(1);
const MORNING = id(11);
const EVENING = id(12);
const BOSS = id(21);
const ROAD = id(31);

const movement = (uuid: string, name = "Porch push") => ({
  uuid,
  name,
  description: "",
  image: "",
  muscles: [],
  style: "strength",
  difficulty: "medium",
  equipment: "none",
  pattern: null,
  measure: "reps",
  perSide: false,
  secondsPerRep: 3,
});
const target = { type: "reps", min: 8, max: 12 };
const quest = (uuid: string, slots: unknown[] = [{ movement: { ref: PUSH }, target }]) => ({
  quest: {
    uuid,
    title: { en: "Iron morning" },
    description: { en: "" },
    rounds: 3,
    restSeconds: 30,
    roundRestSeconds: null,
    image: null,
  },
  slots,
});
const boss = { kind: "boss", monster: "stone_golem", name: "The landlord", bossUuid: BOSS };
const adventure = (end: unknown = { kind: "boss", ref: BOSS }) => ({
  adventure: { uuid: ROAD, title: "The long road", description: "", cover: null, end },
  steps: [MORNING, EVENING].map((ref) => ({ quest: { ref }, narrative: "", outro: "" })),
});
const pack = (over: Record<string, unknown> = {}) => ({
  kind: "bati-pack",
  version: 1,
  movements: [movement(PUSH)],
  quests: [quest(MORNING), quest(EVENING)],
  bosses: [boss],
  adventures: [adventure()],
  ...over,
});

const refusal = async (data: unknown) => {
  try {
    await parsePackData(data);
  } catch (error) {
    return error instanceof PackFileError ? error.reason : error;
  }
  return null;
};

test("a pack is read with every reference resolved: one movement, however many quests name it", async () => {
  const file = await parsePackData(pack());

  expect(file.movements).toHaveLength(1);
  const slots = file.quests.map((q) => q.slots[0]?.movement);
  // The same object, not a copy: a photo listed once is held once.
  for (const m of slots)
    expect("own" in (m ?? {}) && (m as { own: unknown }).own).toBe(file.movements[0]);
  const [road] = file.adventures;
  expect(road?.steps.map((s) => "own" in s.quest && s.quest.own)).toEqual(file.quests);
  expect(road?.adventure.end).toBe(file.bosses[0]);
});

test("a list left out is an empty one, and a pack of nothing is no pack", async () => {
  const movementsOnly = await parsePackData({
    kind: "bati-pack",
    version: 1,
    movements: [movement(PUSH)],
  });
  expect(movementsOnly).toMatchObject({ quests: [], bosses: [], adventures: [] });

  expect(await refusal({ kind: "bati-pack", version: 1 })).toBe("not_a_pack");
  expect(await refusal(pack({ movements: "all of them" }))).toBe("not_a_pack");
  expect(await refusal({ ...pack(), kind: "bati-quest" })).toBe("not_a_pack");
});

test("a newer version, and a list past its cap, ask for an update", async () => {
  expect(await refusal(pack({ version: 2 }))).toBe("newer");
  // The length is read before any element: a thousand and one nothings are never looked at.
  expect(await refusal(pack({ movements: Array<null>(1001).fill(null) }))).toBe("newer");
  expect(await refusal(pack({ quests: Array<null>(301).fill(null) }))).toBe("newer");
  expect(await refusal(pack({ bosses: Array<null>(101).fill(null) }))).toBe("newer");
  expect(await refusal(pack({ adventures: Array<null>(101).fill(null) }))).toBe("newer");
});

// The preview lists every entry and the import writes by uuid: two entries under one uuid would
// show one thing and write another.
test("a uuid listed twice is refused, in every list", async () => {
  expect(
    await refusal(pack({ movements: [movement(PUSH), movement(PUSH, "Something else")] })),
  ).toBe("not_a_pack");
  expect(await refusal(pack({ quests: [quest(MORNING), quest(MORNING), quest(EVENING)] }))).toBe(
    "not_a_pack",
  );
  expect(await refusal(pack({ bosses: [boss, boss] }))).toBe("not_a_pack");
  expect(await refusal(pack({ adventures: [adventure(), adventure()] }))).toBe("not_a_pack");
});

test("a reference to what the pack does not list is refused", async () => {
  expect(await refusal(pack({ movements: [] }))).toBe("not_a_pack");
  expect(await refusal(pack({ quests: [quest(MORNING)] }))).toBe("not_a_pack");
  expect(await refusal(pack({ bosses: [] }))).toBe("not_a_pack");
  expect(
    await refusal(pack({ quests: [quest(MORNING, [{ movement: { ref: "push" }, target }])] })),
  ).toBe("not_a_pack");
});

// One form per file: a pack that also carried things whole could hide a second, different copy of
// a movement behind the uuid of a listed one.
test("a pack names its things and never carries one whole inside another", async () => {
  const inline = quest(MORNING, [{ movement: { own: movement(PUSH) }, target }]);
  expect(await refusal(pack({ quests: [inline, quest(EVENING)] }))).toBe("not_a_pack");

  const carried = adventure();
  carried.steps = [quest(MORNING), quest(EVENING)].map((own) => ({
    quest: { own } as never,
    narrative: "",
    outro: "",
  }));
  expect(await refusal(pack({ adventures: [carried] }))).toBe("not_a_pack");
});

test("a boss with no uuid cannot be listed, and a painted monster needs no listing", async () => {
  const { bossUuid: _, ...nameless } = boss;
  expect(await refusal(pack({ bosses: [nameless], adventures: [] }))).toBe("not_a_pack");

  const painted = await parsePackData(
    pack({ bosses: [], adventures: [adventure({ kind: "boss", monster: "stone_golem" })] }),
  );
  expect(painted.adventures[0]?.adventure.end).toEqual({ kind: "boss", monster: "stone_golem" });
});

// The other way round: the two older files never read a reference, so a quest or an adventure
// file cannot point outside itself.
test("a quest file and an adventure file refuse a reference", () => {
  const questFile = { kind: "bati-quest", version: 1, ...quest(MORNING) };
  expect(() => parseQuestData(questFile)).toThrow(QuestFileError);

  const adventureFile = { kind: "bati-adventure", version: 1, ...adventure({ kind: "route" }) };
  expect(() => parseAdventureData(adventureFile)).toThrow(AdventureFileError);
});
