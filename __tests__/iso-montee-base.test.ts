// Decisions A and B of the buildings track: an upgrade whose look changes has its own pending
// marker (the base rank it was claimed at, one writer, no schema), every rank waits for a tap
// behind MONTEE_PAR_RANG, and the visit's automatic claim stops evolving buildings on its own.
import { amorce, enAttente } from "@/components/village/iso/montee";
import { claimableBases, claimBases, getClaimedBases } from "@/db/village";

let mockStore: Record<string, string> = {};
jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("@/db/preferences", () => ({
  getPreference: (key: string) => Promise.resolve(mockStore[key] ?? null),
  setPreference: (key: string, value: string) => {
    mockStore[key] = value;
    return Promise.resolve();
  },
}));

beforeEach(() => {
  mockStore = {};
});

// watchtower extends archery_range.
const tour = (level: number, base: number) =>
  [
    { code: "watchtower", level },
    { code: "archery_range", level: base },
  ] as const;

describe("an upgrade's own marker (rule B)", () => {
  it("rises when the base rank changes the look, only on a tap", () => {
    const b = tour(3, 7);
    // Own rank 3 is "grand" until the base reaches 7 (legendary): the hero last saw base 6.
    expect(claimableBases(b, { watchtower: 3, archery_range: 7 }, { watchtower: 6 })).toEqual([
      "watchtower",
    ]);
    // Seen at base 7: nothing waits. Base 8 is the same stage as 7.
    expect(claimableBases(b, { watchtower: 3, archery_range: 7 }, { watchtower: 7 })).toEqual([]);
    expect(
      claimableBases(tour(3, 8), { watchtower: 3, archery_range: 8 }, { watchtower: 7 }),
    ).toEqual([]);
    // Base 10 is mythic: another look.
    expect(
      claimableBases(tour(3, 10), { watchtower: 3, archery_range: 10 }, { watchtower: 7 }),
    ).toEqual(["watchtower"]);
  });

  it("an upgrade below its last stage never waits for the base", () => {
    expect(claimableBases(tour(2, 10), { watchtower: 2 }, {})).toEqual([]);
  });

  it("a base never claimed counts as 0: one marker, not a silent change", () => {
    expect(claimableBases(tour(3, 7), { watchtower: 3 }, {})).toEqual(["watchtower"]);
  });

  it("the look follows the own rank the map draws, not the derived one", () => {
    // Own rank 3 is not claimed yet (drawn at 2): the base cannot change a look not shown.
    expect(claimableBases(tour(3, 10), { watchtower: 2 }, {})).toEqual([]);
  });

  it("a base rank that brings a teaser waits for a tap too, 6 and 9 included", () => {
    const marques = () => [6, 9];
    // Same stage at 6 as at 5 (grand): only the data says something changes.
    const b = tour(3, 6);
    expect(claimableBases(b, { watchtower: 3 }, { watchtower: 5 })).toEqual([]);
    expect(claimableBases(b, { watchtower: 3 }, { watchtower: 5 }, marques)).toEqual([
      "watchtower",
    ]);
    expect(claimableBases(b, { watchtower: 3 }, { watchtower: 6 }, marques)).toEqual([]);
    // 8 to 9: legendary both times.
    expect(claimableBases(tour(3, 9), { watchtower: 3 }, { watchtower: 8 }, marques)).toEqual([
      "watchtower",
    ]);
    // Seen at 9: a later base with no marked rank in between changes nothing.
    expect(claimableBases(tour(3, 9), { watchtower: 3 }, { watchtower: 9 }, marques)).toEqual([]);
  });

  it("one writer, never down, kept beside the claimed stages", async () => {
    await claimBases([{ code: "watchtower", base: 7 }]);
    await claimBases([{ code: "watchtower", base: 5 }]);
    expect(await getClaimedBases()).toEqual({ watchtower: 7 });
    expect(Object.keys(mockStore)).toEqual(["villageUpgradeBases"]);
  });
});

describe("the pending list of the map", () => {
  it("flag off: today's list by stage, the base marker does not exist", () => {
    const b = tour(4, 10);
    expect(enAttente(b, { watchtower: 4, archery_range: 10 }, false, {})).toEqual([]);
  });

  it("flag on: every rank waits for a tap, and so does a base-driven look", () => {
    expect(enAttente(tour(4, 4), { watchtower: 3, archery_range: 4 }, true)).toEqual([
      "watchtower",
    ]);
    expect(enAttente(tour(3, 7), { watchtower: 3, archery_range: 7 }, true, {})).toEqual([
      "watchtower",
    ]);
  });
});

describe("the visit's automatic claim (VI-29)", () => {
  const avant = new Set(["watchtower" as const]);
  const prev = [{ code: "watchtower", level: 3 }] as const;

  it("a building ready before the session is not evolved without a tap", () => {
    expect(amorce(prev, { watchtower: 2 }, { avant })).toEqual([]);
    // the claimed key is untouched, so the building is still pending for the tap
    expect(enAttente(prev, { watchtower: 2 }, false)).toEqual(["watchtower"]);
    expect(enAttente(prev, { watchtower: 2 }, true)).toEqual(["watchtower"]);
  });

  it("an unknown code is still primed at its pre-session level", () => {
    expect(amorce(prev, { forge: 3 }, { avant })).toEqual(prev);
    expect(amorce(prev, {}, { avant: new Set() })).toEqual(prev);
  });
});
