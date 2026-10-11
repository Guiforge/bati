import { type Feast, type FeastFacts, feastKey, rankFeasts } from "@/components/session/feasts";
import { type CrestReveal, NO_CREST_EVENTS } from "@/db/crestEvents";

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
  crestReveal: null,
};
const reveal: CrestReveal = { animal: "bear", quarters: null, firstEight: [], late: false };
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

  test("the epilogue holds the big place and is listed nowhere", () => {
    const f = facts(
      {
        tierUp,
        levelUp: { oldLevel: 4, newLevel: 5 },
        crestReveal: reveal,
      },
      { epilogue: true, age: { name: "Age" }, anniversary: { years: 2 } },
    );
    expect(sizes(f)).toEqual(["reveal:medium", "age:medium", "anniversary:medium", "tier:medium"]);
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
        crestReveal: "reveal" in set ? reveal : null,
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
          stageUp: [{ animal: "bear", stage: "adult", n: 40, practice: "strength" }],
        },
      },
      { epilogue: true },
    );
    expect(sizes(f)).toEqual([
      "level:small",
      "growth:small",
      "growth:small",
      "record:small",
      "standing:small",
      "stageUp:medium",
      "achievement:medium",
    ]);
  });

  test("a tier this phone has shown is a card, and the next one leads", () => {
    const shown = (key: string) => rankFeasts(facts({ tierUp }, { shown: [key] }));
    expect(shown("tier:3").map((x) => `${x.kind}:${x.size}`)).toEqual(["tier:medium"]);
    expect(shown("tier:2").map((x) => `${x.kind}:${x.size}`)).toEqual(["tier:large"]);
  });

  test("the level reached with a tier is the tier's, said once", () => {
    const list = rankFeasts(facts({ tierUp, levelUp: { oldLevel: 4, newLevel: 5 } }));
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ kind: "tier", size: "large", level: 5 });
  });

  describe("the legendary animal", () => {
    const legendary = (animal: "bear" | "stag") =>
      ({
        animal,
        stage: "legendary",
        n: 500,
        practice: animal === "bear" ? "strength" : "run",
      }) as const;
    // The night of the crossing: the event and the state after it say the same thing.
    const crossing = (...up: ReturnType<typeof legendary>[]) => ({
      crestEvents: { ...NO_CREST_EVENTS, stageUp: up },
      crestLegendary: up,
    });
    // A hero past 500 at the update: the state says it, no event crossed tonight.
    const past = (...up: ReturnType<typeof legendary>[]) => ({ crestLegendary: up });

    test("is a big feast, after the anniversary and before the tier, keyed by its practice", () => {
      const list = rankFeasts(
        facts({ tierUp, ...crossing(legendary("bear")) }, { anniversary: { years: 1 } }),
      );
      expect(list.map((x) => `${x.kind}:${x.size}`)).toEqual([
        "anniversary:large",
        "legendary:medium",
        "tier:medium",
      ]);
      expect(feastKey({ kind: "legendary", late: false, ...legendary("stag") })).toBe(
        "legendary:run",
      );
      expect(
        feastKey({ kind: "legendary", late: false, ...legendary("bear"), practice: null }),
      ).toBe("legendary:all");
    });

    test("leads when nothing outranks it, and is listed once: no stage-up card for it", () => {
      const list = rankFeasts(facts({ tierUp, ...crossing(legendary("bear")) }));
      expect(list.map((x) => `${x.kind}:${x.size}`)).toEqual(["legendary:large", "tier:medium"]);
      expect(list[0]).toMatchObject({
        animal: "bear",
        stage: "legendary",
        n: 500,
        practice: "strength",
        late: false,
      });
    });

    test("the reveal and an Age outrank it", () => {
      const e = crossing(legendary("bear"));
      expect(sizes(facts({ crestReveal: reveal, ...e }))[0]).toBe("reveal:large");
      expect(sizes(facts(e, { age: { name: "A" } }))[0]).toBe("age:large");
    });

    test("the second animal's own night is not silenced by the first's: the practices differ", () => {
      const first = rankFeasts(facts(crossing(legendary("bear")), { shown: [] }));
      expect(first[0]?.kind).toBe("legendary");
      const second = rankFeasts(facts(past(legendary("stag")), { shown: ["legendary:strength"] }));
      expect(second[0]).toMatchObject({ kind: "legendary", size: "large", animal: "stag" });
      const again = rankFeasts(
        facts(crossing(legendary("bear")), { shown: ["legendary:strength"] }),
      );
      expect(again[0]).toMatchObject({ kind: "legendary", size: "medium" });
    });

    test("both animals on one night: one large, the other a card", () => {
      const list = rankFeasts(facts(crossing(legendary("bear"), legendary("stag"))));
      expect(list.map((x) => `${x.kind}:${x.size}`)).toEqual([
        "legendary:large",
        "legendary:medium",
      ]);
    });

    test("an adult card beside it is still a card", () => {
      const list = rankFeasts(
        facts({
          crestLegendary: [legendary("bear")],
          crestEvents: {
            ...NO_CREST_EVENTS,
            stageUp: [
              legendary("bear"),
              { animal: "stag", stage: "adult", n: 40, practice: "run" },
            ],
          },
        }),
      );
      expect(list.map((x) => `${x.kind}:${x.size}`)).toEqual(["legendary:large", "stageUp:medium"]);
    });

    test("a hero already past 500 at the update gets it once, as a late feast", () => {
      const list = rankFeasts(facts(past(legendary("bear")), { shown: [] }));
      expect(list[0]).toMatchObject({ kind: "legendary", size: "large", late: true });
      expect(feastKey(list[0] as Feast)).toBe("legendary:strength");
    });

    test("the night that crosses is not late", () => {
      expect(rankFeasts(facts(crossing(legendary("bear"))))[0]).toMatchObject({ late: false });
    });

    test("nothing in the state, nothing said: a feast already shown is not a nightly card", () => {
      expect(rankFeasts(facts({ crestLegendary: [] }, { shown: ["legendary:strength"] }))).toEqual(
        [],
      );
    });
  });

  describe("the rare coat's card", () => {
    const coat = { animal: "bear", stage: "adult" } as const;
    const adultUp = { animal: "bear", stage: "adult", n: 40, practice: "strength" } as const;
    const venerableUp = {
      animal: "bear",
      stage: "venerable",
      n: 200,
      practice: "strength",
    } as const;

    test("is a card, never a big feast", () => {
      expect(sizes(facts({ rareCoat: coat }))).toEqual(["coat:medium"]);
    });

    test("absorbs the adult card of its animal when both fall on one session", () => {
      const list = rankFeasts(
        facts({ rareCoat: coat, crestEvents: { ...NO_CREST_EVENTS, stageUp: [adultUp] } }),
      );
      expect(list.map((x) => x.kind)).toEqual(["coat"]);
    });

    test("keeps the card of another stage or another animal", () => {
      const list = rankFeasts(
        facts({
          rareCoat: { animal: "bear", stage: "venerable" },
          crestEvents: {
            ...NO_CREST_EVENTS,
            stageUp: [venerableUp, { animal: "stag", stage: "adult", n: 40, practice: "run" }],
          },
        }),
      );
      expect(list.map((x) => x.kind)).toEqual(["coat", "stageUp", "stageUp"]);
    });

    test("without the coat the adult card stays", () => {
      expect(sizes(facts({ crestEvents: { ...NO_CREST_EVENTS, stageUp: [adultUp] } }))).toEqual([
        "stageUp:medium",
      ]);
    });
  });

  test("every fact is said once, with its own id", () => {
    const list: Feast[] = rankFeasts(
      facts({
        newRecords: [{} as never, {} as never],
        newRungs: [{} as never, {} as never],
        crestReveal: reveal,
        crestEvents: {
          secondJoins: { animal: "stag", first: "bear", n: 20, total: 60 },
          stageUp: [{ animal: "bear", stage: "adult", n: 40, practice: "strength" }],
        },
      }),
    );
    expect(list).toHaveLength(7);
    expect(new Set(list.map((x) => x.id)).size).toBe(7);
  });
});
