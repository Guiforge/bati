import { claimable, claimStage, drawnLevel, getClaimedStages, parseClaimed } from "@/db/village";

// The claimed stages (L6-T13): a preference, JSON code -> level, one writer.
let mockStore: Record<string, string> = {};
const mockSet = jest.fn((key: string, value: string) => {
  mockStore[key] = value;
});
jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("@/db/preferences", () => ({
  getPreference: (key: string) => Promise.resolve(mockStore[key] ?? null),
  setPreference: (key: string, value: string) => Promise.resolve(mockSet(key, value)),
}));

const KEY = "villageScenesPlayed";
const b = (code: "forge" | "farm" | "barn", level: number) => ({ code, level });

beforeEach(() => {
  mockStore = {};
  mockSet.mockClear();
});

describe("claimable", () => {
  test("no key: nothing is claimable, whatever the levels", () => {
    expect(claimable([b("forge", 1), b("farm", 3), b("barn", 5)], {})).toEqual([]);
  });

  test("a stage passed since the claim is claimable, a rank inside a stage is not", () => {
    const claimed = { forge: 2, farm: 3, barn: 3 };
    expect(claimable([b("forge", 3), b("farm", 4), b("barn", 5)], claimed)).toEqual([
      "forge",
      "barn",
    ]);
  });

  test("a building not built is never claimable", () => {
    expect(claimable([b("forge", 0)], { forge: 0 })).toEqual([]);
  });

  test("the map draws the lower of derived and claimed, a missing code as derived", () => {
    expect(drawnLevel(b("forge", 5), { forge: 2 })).toBe(2);
    expect(drawnLevel(b("forge", 5), {})).toBe(5);
    expect(drawnLevel(b("forge", 2), { forge: 4 })).toBe(2);
  });
});

describe("claimStage", () => {
  test("several codes, one write, at the derived levels", async () => {
    mockStore[KEY] = JSON.stringify({ farm: 1 });
    await claimStage([b("forge", 3), b("barn", 5)]);
    expect(mockSet).toHaveBeenCalledTimes(1);
    expect(JSON.parse(mockStore[KEY] ?? "")).toEqual({ farm: 1, forge: 3, barn: 5 });
  });

  test("two writes in flight lose nothing", async () => {
    await Promise.all([claimStage([b("forge", 3)]), claimStage([b("farm", 2)])]);
    expect(mockSet).toHaveBeenCalledTimes(2);
    expect(JSON.parse(mockStore[KEY] ?? "")).toEqual({ forge: 3, farm: 2 });
  });

  test("never down", async () => {
    mockStore[KEY] = JSON.stringify({ forge: 5 });
    await claimStage([b("forge", 3)]);
    expect(JSON.parse(mockStore[KEY] ?? "")).toEqual({ forge: 5 });
  });

  test("an interrupted site writes nothing: the building stays claimable", async () => {
    // The scene writes in the site's end callback only; before it, the key is untouched.
    const buildings = [b("forge", 3)];
    expect(claimable(buildings, { forge: 2 })).toEqual(["forge"]);
    expect(mockSet).not.toHaveBeenCalled();
    await claimStage(buildings);
    expect(claimable(buildings, await getClaimedStages())).toEqual([]);
  });
});

describe("parseClaimed", () => {
  test("drops what is not a building or a level, survives bad JSON", () => {
    expect(parseClaimed('{"forge":3,"nope":2,"farm":"x","barn":0}')).toEqual({ forge: 3 });
    expect(parseClaimed("{oops")).toEqual({});
    expect(parseClaimed("[1]")).toEqual({});
    expect(parseClaimed(null)).toEqual({});
  });
});
