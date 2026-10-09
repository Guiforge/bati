import { type Feast, type FeastFacts, rankFeasts } from "@/components/session/feasts";
import { NO_CREST_EVENTS } from "@/db/crestEvents";

const empty: FeastFacts["result"] = {
  levelUp: null,
  tierUp: null,
  villageGrowth: [],
  newRecords: [],
  standing: null,
  newRungs: [],
  newAchievements: [],
  fulfilledOath: null,
  oathBonusXp: 0,
  crestEvents: NO_CREST_EVENTS,
};
const reveal = { animal: "bear", quarters: null } as const;
const tierUp = { oldTier: 2, newTier: 3 } as const;
const facts = (over: Partial<FeastFacts["result"]>, rest: Omit<FeastFacts, "result"> = {}) => ({
  result: { ...empty, ...over },
  ...rest,
});
const sizes = (f: FeastFacts) => rankFeasts(f).map((x) => `${x.kind}:${x.size}`);

describe("rankFeasts", () => {
  test("nothing tonight, nothing listed", () => {
    expect(rankFeasts(facts({}))).toEqual([]);
  });

  test("the epilogue is the only large one", () => {
    const f = facts(
      {
        tierUp,
        levelUp: { oldLevel: 4, newLevel: 5 },
        crestEvents: { ...NO_CREST_EVENTS, reveal },
      },
      { epilogue: true, age: { name: "Age" }, anniversary: { years: 2 } },
    );
    expect(sizes(f)).toEqual([
      "epilogue:large",
      "reveal:medium",
      "age:medium",
      "anniversary:medium",
      "tier:medium",
    ]);
  });

  test.each([
    ["the reveal", { reveal, tierUp, age: { name: "A" }, anniversary: { years: 1 } }, "reveal"],
    ["an Age", { tierUp, age: { name: "A" }, anniversary: { years: 1 } }, "age"],
    ["the anniversary", { tierUp, anniversary: { years: 1 } }, "anniversary"],
    ["a village tier", { tierUp }, "tier"],
  ] as const)("without an epilogue, %s leads", (_n, set, lead) => {
    const f = facts(
      {
        tierUp: set.tierUp,
        crestEvents: { ...NO_CREST_EVENTS, reveal: "reveal" in set ? reveal : null },
      },
      {
        age: "age" in set ? set.age : null,
        anniversary: "anniversary" in set ? set.anniversary : null,
      },
    );
    const list = rankFeasts(f);
    expect(list.filter((x) => x.size === "large")).toHaveLength(1);
    expect(list[0]?.kind).toBe(lead);
    expect(list.slice(1).every((x) => x.size === "medium")).toBe(true);
  });

  test("a boss and an oath stay cards, even alone", () => {
    const list = rankFeasts(
      facts({ fulfilledOath: { oath: {} } as never, oathBonusXp: 50 }, { boss: { name: "Golem" } }),
    );
    expect(list.map((x) => `${x.kind}:${x.size}`)).toEqual(["boss:medium", "oath:medium"]);
  });

  test("records, buildings, standing and a plain level are lines, ahead of the cards", () => {
    const f = facts(
      {
        levelUp: { oldLevel: 5, newLevel: 6 },
        villageGrowth: [{ code: "forge" } as never, { code: "farm" } as never],
        newRecords: [{ recordType: "exercise_max_reps" } as never],
        standing: {} as never,
        newAchievements: [{ code: "x" } as never],
        crestEvents: {
          ...NO_CREST_EVENTS,
          stageUp: [{ animal: "bear", stage: "adult", n: 40 }],
        },
      },
      { epilogue: true },
    );
    expect(sizes(f)).toEqual([
      "epilogue:large",
      "level:small",
      "growth:small",
      "growth:small",
      "record:small",
      "standing:small",
      "stageUp:medium",
      "achievement:medium",
    ]);
  });

  test("the level reached with a tier is the tier's, said once", () => {
    const list = rankFeasts(facts({ tierUp, levelUp: { oldLevel: 4, newLevel: 5 } }));
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ kind: "tier", size: "large", level: 5 });
  });

  test("every fact is said once, with its own id", () => {
    const list: Feast[] = rankFeasts(
      facts({
        newRecords: [{} as never, {} as never],
        newRungs: [{} as never, {} as never],
        crestEvents: {
          reveal,
          secondJoins: { animal: "stag", first: "bear", n: 20, total: 60 },
          stageUp: [{ animal: "bear", stage: "adult", n: 40 }],
        },
      }),
    );
    expect(list).toHaveLength(7);
    expect(new Set(list.map((x) => x.id)).size).toBe(7);
  });
});
