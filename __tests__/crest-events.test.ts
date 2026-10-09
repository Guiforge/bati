import { crestEvents, crestReveal, NO_CREST_EVENTS } from "../db/crestEvents";
import { type Animal, type CrestSession, crestAnimals, type Practice } from "../db/crestRules";

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

  test("the 40th session of a practice makes the animal adult, the 200th venerable", () => {
    expect(step(seq(["strength", 39]), "strength").stageUp).toEqual([
      { animal: "bear", stage: "adult", n: 40, own: true },
    ]);
    expect(step(seq(["strength", 199]), "strength").stageUp).toEqual([
      { animal: "bear", stage: "venerable", n: 200, own: true },
    ]);
  });

  test("the second animal rises on its own practice", () => {
    const h = [...seq(["strength", 60], ["run", 39])];
    const e = step(h, "run");
    expect(e.stageUp).toEqual([{ animal: "stag", stage: "adult", n: 40, own: true }]);
  });

  test("the boar and a hand-picked animal rise on every session, and say the threshold, not a practice count", () => {
    const boar = step(
      seq(["strength", 3], ["run", 3], ["yoga", 2], ["strength", 11], ["run", 10], ["yoga", 10]),
      "yoga",
    );
    expect(boar.stageUp).toEqual([{ animal: "boar", stage: "adult", n: 40, own: false }]);
    const picked = step(seq(["strength", 30], ["run", 9]), "run", "stag");
    expect(picked.stageUp).toEqual([{ animal: "stag", stage: "adult", n: 40, own: false }]);
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
