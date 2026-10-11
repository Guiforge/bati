import {
  type Animal,
  type CrestSession,
  crestAnimals,
  LEGENDARY_AT,
  type Practice,
} from "../db/crestRules";

/** `seq(["strength", 5], ["run", 2])`: sessions in journal order, one practice each. */
let n = 0;
function session(practice: Practice | "mixed" | "none"): CrestSession {
  n += 1;
  const base = {
    uuid: String(n).padStart(6, "0"),
    outing: null,
    strength: 0,
    calisthenics: 0,
    yoga: 0,
    cardio: 0,
  };
  switch (practice) {
    case "run":
      return { ...base, cardio: 1 };
    case "mixed":
      return { ...base, strength: 1, yoga: 3 };
    case "none":
      return base; // a workout whose exercises were all expeditions, or none done
    case "ride":
      return { ...base, outing: "ride" };
    default:
      return { ...base, [practice]: 1 };
  }
}
const outing = (kind: "walk" | "run" | "ride"): CrestSession => ({
  ...session("none"),
  outing: kind,
});
type Step = Practice | "mixed" | "none";
const seq = (...parts: [Step, number][]) =>
  parts.flatMap(([p, k]) => Array.from({ length: k }, () => session(p)));
const of = (steps: Step[]) => steps.map(session);
const auto = (sessions: CrestSession[], choice: Animal | "auto" = "auto") =>
  crestAnimals(sessions, choice);

describe("the session that revealed it", () => {
  test("is the 8th that has a practice, a workout with none not counted", () => {
    const list = of([
      "strength",
      "none",
      "strength",
      "strength",
      "strength",
      "none",
      "strength",
      "strength",
      "strength",
      "run",
    ]);
    expect(auto(list)?.revealedIndex).toBe(9);
  });
});

describe("the spec's examples", () => {
  test("A: 5 strength, 2 run, 1 yoga is a young Bear, and the 8th session reveals it", () => {
    const crest = auto(seq(["strength", 5], ["run", 2], ["yoga", 1]));
    expect(crest).toMatchObject({
      animal: "bear",
      stage: "young",
      manual: false,
      second: null,
      quarters: null,
    });
    expect(auto(seq(["strength", 5], ["run", 2]))).toBeNull();
  });

  test("B: 78 strength, 13 yoga, 39 run: an adult Bear, and the Stag joins at 39/130 exactly", () => {
    const sessions = seq(["strength", 78], ["yoga", 13], ["run", 39]);
    expect(auto(sessions)).toMatchObject({
      animal: "bear",
      stage: "adult",
      second: { animal: "stag", stage: "young" },
    });
    // One session fewer and the Stag is at 38/129: not yet.
    expect(auto(sessions.slice(0, -1))?.second).toBeNull();
  });

  test("C: a venerable Bear and an adult Stag that stays at 17 %", () => {
    const crest = auto(
      seq(
        ["strength", 8],
        ["run", 20],
        ["strength", 200],
        ["yoga", 26],
        ["run", 50],
        ["strength", 112],
      ),
    );
    expect(crest?.evidence.totals).toEqual({
      strength: 320,
      calisthenics: 0,
      yoga: 26,
      run: 70,
      ride: 0,
    });
    expect(70 * 100 < 30 * 416).toBe(true);
    expect(crest).toMatchObject({
      animal: "bear",
      stage: "venerable",
      second: { animal: "stag", stage: "adult" },
    });
  });

  test("E: a runner, 40 runs and 20 rides, is a Stag bordered by a Horse", () => {
    const sessions = Array.from({ length: 20 }, () => [
      outing("run"),
      outing("walk"),
      outing("ride"),
    ]).flat();
    // 40 of 60 are runs or walks (an outing is `ride` or else `run`), 20 rides.
    expect(auto(sessions)).toMatchObject({
      animal: "stag",
      stage: "adult",
      second: { animal: "horse", stage: "young" },
    });
  });

  test("the boar: 14 strength, 13 run, 13 yoga gives strength and run, the run being the latest", () => {
    const sessions = [
      ...Array.from({ length: 13 }, () => of(["strength", "yoga", "run"])).flat(),
      session("strength"),
    ];
    const crest = auto(sessions);
    expect(crest).toMatchObject({ animal: "boar", second: null, quarters: ["strength", "run"] });
    // Reversed, the yoga is the latest of the two tied and takes the quarter.
    const reversed = [
      ...Array.from({ length: 13 }, () => of(["strength", "run", "yoga"])).flat(),
      session("strength"),
    ];
    expect(auto(reversed)?.quarters).toEqual(["strength", "yoga"]);
  });
});

describe("the first animal", () => {
  test("40 % is 4 of 8: yes, and 3 of 8 is the boar", () => {
    expect(
      auto(of(["strength", "strength", "strength", "strength", "yoga", "yoga", "run", "run"]))
        ?.animal,
    ).toBe("bear");
    expect(
      auto(of(["strength", "strength", "strength", "yoga", "yoga", "yoga", "run", "run"]))?.animal,
    ).toBe("boar");
  });

  test("two at 4 of 8: the most recent wins", () => {
    expect(
      auto(of(["strength", "strength", "strength", "strength", "run", "run", "run", "run"]))
        ?.animal,
    ).toBe("stag");
    expect(
      auto(of(["run", "run", "run", "run", "strength", "strength", "strength", "strength"]))
        ?.animal,
    ).toBe("bear");
  });

  test("it is fixed at the 8th session, whatever follows", () => {
    expect(auto([...seq(["yoga", 8]), ...seq(["run", 300])])).toMatchObject({
      animal: "salmon",
      second: { animal: "stag" },
    });
  });

  test("a mixed workout is the practice with the most movements done, a tie going to the fixed order", () => {
    expect(auto(seq(["mixed", 8]))?.animal).toBe("salmon");
    // 3 strength and 4 yoga around a tied session: it is the 8th, and the totals say where it went
    // (strength 4, yoga 4 if the fixed order broke the tie; a later-wins tie would give yoga 5).
    const tied = { ...session("none"), strength: 2, yoga: 2 };
    expect(auto([...seq(["yoga", 4], ["strength", 3]), tied])?.evidence.totals).toMatchObject({
      strength: 4,
      yoga: 4,
    });
  });

  test("a workout with no movement counted has no practice, and the 8th session is the 8th with one", () => {
    expect(auto([...seq(["strength", 7], ["none", 5])])).toBeNull();
    expect(auto([...seq(["strength", 7], ["none", 5], ["strength", 1])])?.animal).toBe("bear");
  });

  test("deleting a session from the start replays the whole journal", () => {
    const journal = of([
      "run",
      "strength",
      "strength",
      "strength",
      "strength",
      "run",
      "run",
      "run",
      "strength",
    ]);
    expect(auto(journal)?.animal).toBe("stag");
    expect(auto(journal.slice(1))?.animal).toBe("bear");
  });
});

describe("the stages", () => {
  test("adult from 40 sessions of the practice, venerable from 200", () => {
    expect(auto(seq(["strength", 39]))?.stage).toBe("young");
    expect(auto(seq(["strength", 40]))?.stage).toBe("adult");
    expect(auto(seq(["strength", 199]))?.stage).toBe("adult");
    expect(auto(seq(["strength", 200]))?.stage).toBe("venerable");
  });

  test("legendary from 500 sessions of the sessions' animal's practice, every session for a boar", () => {
    expect(LEGENDARY_AT).toBe(500);
    expect(auto(seq(["strength", 499]))?.stage).toBe("venerable");
    expect(auto(seq(["strength", 500]))?.stage).toBe("legendary");
    // 500 sessions in all, only 450 of them strength: the bear is venerable, and so is the stag
    // picked over it (Guillaume, 11/10: a pick never moves the stage).
    const mixed = seq(["strength", 450], ["run", 50]);
    expect(crestAnimals(mixed, "stag")?.stage).toBe("venerable");
    expect(crestAnimals(seq(["strength", 500], ["run", 50]), "stag")?.stage).toBe("legendary");
  });
});

describe("the second animal", () => {
  test("30 % in integers, at the limit: 21 of 70 joins, 21 of 71 does not", () => {
    expect(auto(seq(["strength", 49], ["run", 21]))?.second?.animal).toBe("stag");
    expect(auto(seq(["strength", 50], ["run", 21]))?.second).toBeNull();
  });

  test("it needs 20 sessions of its own, at any share", () => {
    expect(auto(seq(["strength", 8], ["run", 19]))?.second).toBeNull();
    expect(auto(seq(["strength", 8], ["run", 20]))?.second?.animal).toBe("stag");
  });

  test("once in, it stays when its practice falls back", () => {
    const crest = auto(seq(["strength", 8], ["run", 20], ["strength", 400]));
    expect(crest?.second?.animal).toBe("stag");
  });

  test("the first practice to cross is the one that stays", () => {
    const crest = auto(seq(["strength", 8], ["run", 20], ["yoga", 200]));
    expect(crest?.second?.animal).toBe("stag");
  });

  test("a boar never has one, however much it runs", () => {
    const boar = of(["strength", "yoga", "run", "strength", "yoga", "run", "strength", "yoga"]);
    expect(auto([...boar, ...seq(["run", 100])])).toMatchObject({
      animal: "boar",
      second: null,
      stage: "adult",
    });
  });
});

describe("the hero's choice", () => {
  const bearAndStag = () => seq(["strength", 8], ["run", 20], ["strength", 30]);

  test("it puts the animal in the centre with the diamond, the border staying", () => {
    expect(auto(bearAndStag(), "ermine")).toMatchObject({
      animal: "ermine",
      manual: true,
      second: { animal: "stag" },
    });
  });

  test("a pick equal to the sessions' own animal is the sessions' animal: no diamond, the practice's stage", () => {
    const sessions = [...seq(["strength", 8]), ...seq(["yoga", 35])];
    const crest = auto(sessions, "bear");
    // Everything but `picked`, which keeps what is stored.
    expect({ ...crest, picked: "auto" }).toEqual(auto(sessions));
    expect(crest).toMatchObject({ manual: false, stage: "young", picked: "bear" });
    const boar = of(["strength", "yoga", "run", "strength", "yoga", "run", "strength", "yoga"]);
    expect(auto(boar, "boar")).toMatchObject({ manual: false });
  });

  test("a pick never moves the stage: the sessions' animal's stage, picked or back on auto (Guillaume, 11/10)", () => {
    // 38 strength sessions of 58: a young bear. Picking the boar (58 sessions, adult by the old
    // rule) or the stag (20 run) must not change that.
    const sessions = bearAndStag();
    const own = auto(sessions)?.stage;
    expect(own).toBe("young");
    for (const a of ["boar", "stag", "salmon", "ermine", "horse"] as const) {
      expect(auto(sessions, a)?.stage).toBe(own);
    }
    expect(auto(sessions, "auto")?.stage).toBe(own);
  });

  test("choosing the second animal swaps it with the first", () => {
    expect(auto(bearAndStag(), "stag")).toMatchObject({
      animal: "stag",
      stage: "young",
      manual: true,
      // The bear steps out to the border with the stage of its own 38 strength sessions, not all 58.
      second: { animal: "bear", stage: "young" },
    });
  });

  test("any other animal takes the centre; the sessions' second stays on the border, the stage stays the bear's", () => {
    expect(auto(bearAndStag(), "salmon")).toMatchObject({
      animal: "salmon",
      stage: "young",
      second: { animal: "stag" },
    });
  });

  test("a chosen boar has no border and the quarters of the two leading practices", () => {
    expect(auto(bearAndStag(), "boar")).toMatchObject({
      animal: "boar",
      second: null,
      quarters: ["strength", "run"],
    });
  });

  test("the boar preview of a bear hero carries the quarters the chosen boar gets", () => {
    const sessions = bearAndStag();
    expect(auto(sessions)).toMatchObject({ animal: "bear" });
    const chosen = auto(sessions, "boar");
    expect(chosen?.quarters).toEqual(["strength", "run"]);
    expect(auto(sessions)?.evidence.boarQuarters).toEqual(chosen?.quarters);
  });

  test("a boar's tie reads the same order in the fact and in the colours: count, then recency", () => {
    const boar = auto(seq(["strength", 3], ["run", 2], ["yoga", 3]));
    expect(boar).toMatchObject({ animal: "boar", quarters: ["yoga", "strength"] });
    expect(boar?.evidence.firstEightOrder).toEqual(["yoga", "strength", "run"]);
  });

  test("the boar's stage reads every session that counts, practice or not", () => {
    const thirtyNine = Array.from({ length: 13 }, () => of(["strength", "yoga", "run"])).flat();
    expect(auto(thirtyNine)).toMatchObject({ animal: "boar", stage: "young" });
    // An expedition-only workout has no practice, and still counts toward the 40.
    expect(auto([...thirtyNine, session("none")])).toMatchObject({
      animal: "boar",
      stage: "adult",
    });
    expect(auto([...thirtyNine, session("none")], "boar")).toMatchObject({ stage: "adult" });
    // A hero whose sessions' animal is the boar and who picks another animal keeps the boar's stage.
    expect(auto([...thirtyNine, session("none")], "bear")).toMatchObject({
      animal: "bear",
      stage: "adult",
    });
  });

  test("a chosen boar over a single practice shows only that practice, in both quarters", () => {
    expect(auto(seq(["yoga", 8]), "boar")).toMatchObject({
      animal: "boar",
      quarters: ["yoga", "yoga"],
    });
  });

  test("a chosen animal over a boar of the sessions takes the centre alone", () => {
    const boar = of(["strength", "yoga", "run", "strength", "yoga", "run", "strength", "yoga"]);
    expect(auto(boar, "bear")).toMatchObject({
      animal: "bear",
      manual: true,
      second: null,
      quarters: null,
    });
  });

  test("before the reveal the choice is ignored: no crest", () => {
    expect(auto(seq(["strength", 7]), "stag")).toBeNull();
  });

  test("its evidence says why: the first eight and the totals", () => {
    const crest = auto(bearAndStag());
    expect(crest?.evidence).toMatchObject({
      first: "bear",
      secondFromSessions: "stag",
      firstEight: { strength: 8, run: 0 },
      totals: { strength: 38, run: 20 },
    });
  });
});
