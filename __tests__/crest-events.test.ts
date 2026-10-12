import { type FeastFacts, rankFeasts } from "../components/session/feasts";
import {
  COAT_RARE_KEY,
  crestEvents,
  crestReveal,
  legendaryKey,
  legendaryNews,
  NO_CREST_EVENTS,
  rareCoatNews,
} from "../db/crestEvents";
import {
  type Animal,
  type CrestSession,
  type Practice,
  crestAnimals as rules,
} from "../db/crestRules";
import type { FlameLevel } from "../db/streaks";

/** The crest as the store reads it: the rules' answer plus the hero's longest flame (none by default). */
const crestAnimals = (
  sessions: CrestSession[],
  choice: Animal | "auto",
  longestFlame: FlameLevel = 0,
) => {
  const animals = rules(sessions, choice);
  return animals && { ...animals, longestFlame };
};

let n = 0;
const session = (practice: Practice): CrestSession => {
  n += 1;
  const base = {
    uuid: String(n).padStart(6, "0"),
    outing: null,
    strength: 0,
    calisthenics: 0,
    yoga: 0,
    cardio: 0,
  };
  if (practice === "run") return { ...base, cardio: 1 };
  if (practice === "ride") return { ...base, outing: "ride" };
  return { ...base, [practice]: 1 };
};
const seq = (...parts: [Practice, number][]) =>
  parts.flatMap(([p, k]) => Array.from({ length: k }, () => session(p)));
/** The crest before and after one more session of `practice`, as the store reads them. */
function step(history: CrestSession[], practice: Practice, choice: Animal | "auto" = "auto") {
  const before = crestAnimals(history, choice);
  const after = crestAnimals([...history, session(practice)], choice);
  return crestEvents(before, after);
}

describe("crestEvents", () => {
  test("the 8th session reveals the animal the sessions chose", () => {
    const after = crestAnimals(seq(["strength", 8]), "auto");
    expect(crestReveal(after, [])).toEqual({
      animal: "bear",
      quarters: null,
      firstEight: [["strength", 8]],
      late: false,
    });
    expect(crestReveal(crestAnimals(seq(["strength", 7]), "auto"), [])).toBeNull();
  });

  test("the first eight come most done first, whatever order the practices are listed in", () => {
    const reveal = crestReveal(crestAnimals(seq(["yoga", 5], ["strength", 3]), "auto"), []);
    expect(reveal?.firstEight).toEqual([
      ["yoga", 5],
      ["strength", 3],
    ]);
  });

  test("a tie in the first eight puts the most recent practice first, as the colours do", () => {
    const reveal = crestReveal(
      crestAnimals(seq(["strength", 3], ["run", 2], ["yoga", 3]), "auto"),
      [],
    );
    expect(reveal?.firstEight).toEqual([
      ["yoga", 3],
      ["strength", 3],
      ["run", 2],
    ]);
    expect(reveal?.quarters).toEqual(["yoga", "strength"]);
  });

  test("a hero with 300 sessions and no reveal in the key sees it on the first victory", () => {
    const after = crestAnimals(seq(["strength", 300]), "auto");
    expect(crestReveal(after, ["age-50"])?.animal).toBe("bear");
  });

  test("a reveal that comes after the 8th session counts the first eight and says it is late", () => {
    const h = seq(["strength", 5], ["yoga", 3], ["run", 40]);
    const reveal = crestReveal(crestAnimals(h, "auto"), []);
    expect(reveal).toMatchObject({
      animal: "bear",
      firstEight: [
        ["strength", 5],
        ["yoga", 3],
      ],
      late: true,
    });
  });

  test("a key that holds the reveal says nothing", () => {
    expect(crestReveal(crestAnimals(seq(["strength", 8]), "auto"), ["reveal"])).toBeNull();
  });

  test("no crest, or a key that could not be read, says nothing", () => {
    expect(crestReveal(null, [])).toBeNull();
    expect(crestReveal(undefined, [])).toBeNull();
    expect(crestReveal(crestAnimals(seq(["strength", 8]), "auto"), undefined)).toBeNull();
  });

  test("a boar is revealed with its two quarters", () => {
    const h = seq(["strength", 2], ["run", 2], ["yoga", 2], ["ride", 1], ["calisthenics", 1]);
    const reveal = crestReveal(crestAnimals(h, "auto"), []);
    expect(reveal?.animal).toBe("boar");
    expect(reveal?.quarters).toHaveLength(2);
  });

  test("a boar keeps its quarters when the hero put another animal on show", () => {
    const h = seq(["strength", 2], ["run", 2], ["yoga", 2], ["ride", 1], ["calisthenics", 1]);
    const auto = crestReveal(crestAnimals(h, "auto"), []);
    const picked = crestAnimals(h, "bear");
    expect(picked?.quarters).toBeNull();
    expect(crestReveal(picked, [])).toEqual(auto);
    expect(auto?.quarters).toEqual(["yoga", "run"]);
  });

  test("a hand-picked animal never changes what is revealed", () => {
    const after = crestAnimals(seq(["strength", 8]), "stag");
    expect(crestReveal(after, [])?.animal).toBe("bear");
  });

  test("the second animal joins once: the next sessions after the entry say nothing", () => {
    const h = [...seq(["strength", 8], ["run", 11], ["strength", 20])];
    let hist = h;
    let joins = 0;
    let last = step(hist, "run");
    for (let i = 0; i < 30 && joins === 0; i++) {
      last = step(hist, "run");
      hist = [...hist, session("run")];
      if (last.secondJoins) joins += 1;
    }
    expect(joins).toBe(1);
    expect(step(hist, "run").secondJoins).toBeNull();
    hist = [...hist, session("run")];
    expect(step(hist, "run").secondJoins).toBeNull();
  });

  test("the 20th session of a 30 % practice makes the second animal join", () => {
    // 14 strength then 6 run in a row: the 20th session is the 6th run (30 %), then 20 runs needed.
    const h = [...seq(["strength", 8], ["run", 11], ["strength", 20])];
    const before = crestAnimals(h, "auto");
    expect(before?.second).toBeNull();
    // the first run to cross 30 % and 20 sessions
    let hist = h;
    let joined: ReturnType<typeof crestEvents>["secondJoins"] = null;
    for (let i = 0; i < 30 && joined === null; i++) {
      const e = step(hist, "run");
      hist = [...hist, session("run")];
      joined = e.secondJoins;
    }
    expect(joined?.animal).toBe("stag");
    expect(joined?.first).toBe("bear");
    expect(joined?.n).toBeGreaterThanOrEqual(20);
    expect(joined?.n && joined.total && joined.n * 100 >= 30 * joined.total).toBe(true);
  });

  describe("the join card follows the shield on show", () => {
    /** Runs on from 39 strength + runs until the shield on show grows a border; null if it never does. */
    function joinWith(choice: Animal | "auto") {
      let hist = seq(["strength", 8], ["run", 11], ["strength", 20]);
      for (let i = 0; i < 40; i++) {
        const e = step(hist, "run", choice);
        hist = [...hist, session("run")];
        if (e.secondJoins) return e.secondJoins;
      }
      return null;
    }

    test("auto: the stag joins the bear", () => {
      expect(joinWith("auto")).toMatchObject({ animal: "stag", first: "bear" });
    });
    test("a horse on show: the stag joins the horse", () => {
      expect(joinWith("horse")).toMatchObject({ animal: "stag", first: "horse" });
    });
    test("an ermine on show: the stag joins the ermine", () => {
      expect(joinWith("ermine")).toMatchObject({ animal: "stag", first: "ermine" });
    });
    test("the stag on show: the bear steps to the border, and its practice is counted", () => {
      const j = joinWith("stag");
      expect(j).toMatchObject({ animal: "bear", first: "stag" });
      // The bear's own practice, all 28 strength sessions of the history, not the stag's runs.
      expect(j).toMatchObject({ n: 28 });
    });
    test("a boar on show has no border, so no card", () => {
      expect(joinWith("boar")).toBeNull();
    });
  });

  test("the 40th session of a practice makes the animal adult, the 200th venerable", () => {
    expect(step(seq(["strength", 39]), "strength").stageUp).toEqual([
      { animal: "bear", stage: "adult", n: 40, practice: "strength" },
    ]);
    expect(step(seq(["strength", 199]), "strength").stageUp).toEqual([
      { animal: "bear", stage: "venerable", n: 200, practice: "strength" },
    ]);
  });

  test("the 500th session of a practice makes the animal legendary, and says 500", () => {
    expect(step(seq(["strength", 498]), "strength").stageUp).toEqual([]);
    expect(step(seq(["strength", 499]), "strength").stageUp).toEqual([
      { animal: "bear", stage: "legendary", n: 500, practice: "strength" },
    ]);
    expect(step(seq(["strength", 500]), "strength").stageUp).toEqual([]);
  });

  test("the border animal reaches 500 of its own practice on another night than the centre", () => {
    const h = seq(["strength", 8], ["run", 499]);
    expect(step(h, "run").stageUp).toEqual([
      { animal: "stag", stage: "legendary", n: 500, practice: "run" },
    ]);
  });

  test("a picked animal rises with the sessions' animal, on its practice (Guillaume, 11/10)", () => {
    // 499 strength + 99 run, the stag picked over the bear: the 500th strength session is the
    // legendary night, whatever animal is on show. A run session does not move it.
    const h = seq(["strength", 499], ["run", 99]);
    expect(step(h, "strength", "stag").stageUp).toEqual([
      { animal: "stag", stage: "legendary", n: 500, practice: "strength" },
    ]);
    expect(step(h, "run", "stag").stageUp).toEqual([]);
    // Picking never made it rise: the same history reads the same stage with or without the pick.
    expect(step(h, "strength").stageUp).toEqual([
      { animal: "bear", stage: "legendary", n: 500, practice: "strength" },
    ]);
  });

  describe("the swap puts the sessions' animal on the border (Guillaume, 11/10)", () => {
    // 160 runs make the stag the second animal; picking it sends the bear to the border, so the
    // centre and the border read the same strength count.
    const strong = (k: number) => seq(["strength", k], ["run", 160]);

    test("a stage rises once per count: the probe of the audit, 240 strength, 160 run, stag picked", () => {
      const h = strong(199);
      const picked = step(h, "strength", "stag");
      expect(picked.stageUp).toEqual([
        { animal: "stag", stage: "venerable", n: 200, practice: "strength" },
      ]);
      // The same history without the pick says the same thing once, on the bear.
      expect(step(h, "strength").stageUp).toEqual([
        { animal: "bear", stage: "venerable", n: 200, practice: "strength" },
      ]);
      // And the audit's own counts: nothing crosses at 240, 259 or on a run.
      expect(step(strong(240), "strength", "stag").stageUp).toEqual([]);
      expect(step(strong(259), "strength", "stag").stageUp).toEqual([]);
    });

    test("the legendary 500th is announced once too", () => {
      expect(step(strong(499), "strength", "stag").stageUp).toEqual([
        { animal: "stag", stage: "legendary", n: 500, practice: "strength" },
      ]);
    });

    test("a border that is not the sessions' animal still rises on its own practice", () => {
      // Auto: the bear is the centre, the stag the border, and the stag's 200th run is its own.
      const h = seq(["strength", 240], ["run", 199]);
      expect(step(h, "run").stageUp).toEqual([
        { animal: "stag", stage: "venerable", n: 200, practice: "run" },
      ]);
    });
  });

  test("the second animal rises on its own practice", () => {
    const h = [...seq(["strength", 60], ["run", 39])];
    const e = step(h, "run");
    expect(e.stageUp).toEqual([{ animal: "stag", stage: "adult", n: 40, practice: "run" }]);
  });

  test("the boar rises on every session, and says the threshold, not a practice count", () => {
    const boar = step(
      seq(["strength", 3], ["run", 3], ["yoga", 2], ["strength", 11], ["run", 10], ["yoga", 10]),
      "yoga",
    );
    expect(boar.stageUp).toEqual([{ animal: "boar", stage: "adult", n: 40, practice: null }]);
    // A hero of the boar who picks an animal keeps counting every session.
    const picked = step(
      seq(["strength", 3], ["run", 3], ["yoga", 2], ["strength", 11], ["run", 10], ["yoga", 10]),
      "yoga",
      "stag",
    );
    expect(picked.stageUp).toEqual([{ animal: "stag", stage: "adult", n: 40, practice: null }]);
  });

  test("nothing changes, nothing is said", () => {
    expect(step(seq(["strength", 10]), "strength")).toEqual(NO_CREST_EVENTS);
    expect(step(seq(["strength", 3]), "strength")).toEqual(NO_CREST_EVENTS);
  });

  test("an unreadable crest after says nothing", () => {
    expect(crestEvents(null, null)).toEqual(NO_CREST_EVENTS);
    expect(crestEvents(crestAnimals(seq(["strength", 8]), "auto"), null)).toEqual(NO_CREST_EVENTS);
  });
});

describe("rareCoatNews", () => {
  const adult = (longestFlame: 4 | 5, picked: Animal | "auto" = "auto", sessions = 40) =>
    crestAnimals(seq(["strength", sessions]), picked, longestFlame);
  const ships = new Set([
    "bear-young-rare",
    "bear-adult-rare",
    "bear-venerable-rare",
    "boar-adult-rare",
  ]);

  test("an adult with an Eternal flame, a shipped portrait and an unshown card: the card", () => {
    expect(rareCoatNews(adult(5), [], ships)).toEqual({ animal: "bear", stage: "adult" });
  });

  test("a hero who won it before the update sees it once, on their first session", () => {
    const veteran = crestAnimals(seq(["strength", 250]), "auto", 5);
    expect(rareCoatNews(veteran, ["reveal"], ships)).toEqual({
      animal: "bear",
      stage: "venerable",
    });
    expect(rareCoatNews(veteran, ["reveal", COAT_RARE_KEY], ships)).toBeNull();
  });

  test.each([
    ["a flame short of Eternal", adult(4), []],
    ["a young animal", adult(5, "auto", 39), []],
    ["the key not readable", adult(5), undefined],
    ["no crest yet", null, []],
  ] as const)("no card for %s", (_n, after, shown) => {
    expect(rareCoatNews(after, shown as string[] | undefined, ships)).toBeNull();
  });

  test("no card while the portrait of this stage does not ship", () => {
    expect(rareCoatNews(adult(5), [], new Set(["bear-venerable-rare"]))).toBeNull();
  });

  test("it is the hero's: a picked boar wears it as much as the sessions' animal", () => {
    const boar = adult(5, "boar");
    expect(rareCoatNews(boar, [], ships)).toEqual({ animal: "boar", stage: "adult" });
  });
});

const NO_RESULT: FeastFacts["result"] = {
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

describe("legendaryNews", () => {
  const at = (h: CrestSession[], choice: Animal | "auto" = "auto") => crestAnimals(h, choice);
  const bear = { animal: "bear", stage: "legendary", n: 500, practice: "strength" } as const;
  const stag = { animal: "stag", stage: "legendary", n: 500, practice: "run" } as const;

  test("is keyed by the practice whose count reached 500, and `all` for the boar", () => {
    expect(legendaryKey("strength")).toBe("legendary:strength");
    expect(legendaryKey("run")).toBe("legendary:run");
    expect(legendaryKey(null)).toBe("legendary:all");
  });

  test("a hero already past 500 at the update gets it, once: the key silences it", () => {
    const after = at(seq(["strength", 650]));
    expect(legendaryNews(after, ["age-50"])).toEqual([bear]);
    expect(legendaryNews(after, ["legendary:strength"])).toEqual([]);
  });

  test("below 500, a key that could not be read, or no crest says nothing", () => {
    expect(legendaryNews(at(seq(["strength", 499])), [])).toEqual([]);
    expect(legendaryNews(at(seq(["strength", 650])), undefined)).toEqual([]);
    expect(legendaryNews(null, [])).toEqual([]);
  });

  test("the centre and the border each say their own count, and a shown one is skipped", () => {
    const after = at(seq(["strength", 500], ["run", 500]));
    expect(legendaryNews(after, [])).toEqual([bear, stag]);
    expect(legendaryNews(after, ["legendary:strength"])).toEqual([stag]);
    expect(legendaryNews(after, ["legendary:run"])).toEqual([bear]);
  });

  test("a stag picked over a bear hero says the bear's count once, and the stag's own run later", () => {
    const h = seq(["strength", 500], ["run", 500]);
    // Picked: the centre is the stag wearing the bear's stage; the border is the bear again.
    expect(legendaryNews(at(h, "stag"), [])).toEqual([{ ...bear, animal: "stag" }]);
    // The hero feasted on that count, then goes back to auto: the stag's own 500th is still owed.
    expect(legendaryNews(at(h, "auto"), ["legendary:strength"])).toEqual([stag]);
  });

  test("a picked animal stays silent on its own 500th, and the late feast arrives back on auto", () => {
    // A bear hero (strength 500) with the stag picked and 500 runs: the stag's own count is not news.
    const h = seq(["strength", 500], ["run", 500]);
    expect(legendaryNews(at(h, "stag"), ["legendary:strength"])).toEqual([]);
    expect(legendaryNews(at(h, "auto"), ["legendary:strength"])).toEqual([stag]);
    const feasts = rankFeasts({
      result: {
        ...NO_RESULT,
        crestLegendary: legendaryNews(at(h, "auto"), ["legendary:strength"]),
      },
    });
    expect(feasts.find((f) => f.kind === "legendary")).toMatchObject({
      animal: "stag",
      late: true,
    });
  });

  test("the boar is `all`, whatever animal the hero put on show", () => {
    const h = [
      ...seq(["strength", 2], ["run", 2], ["yoga", 2], ["ride", 1], ["calisthenics", 1]),
      ...seq(["strength", 170], ["run", 170], ["yoga", 170]),
    ];
    expect(legendaryNews(at(h), [])).toEqual([
      { animal: "boar", stage: "legendary", n: 500, practice: null },
    ]);
    expect(legendaryNews(at(h, "bear"), ["legendary:all"])).toEqual([]);
  });
});
