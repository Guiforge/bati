import { crestEvents, NO_CREST_EVENTS } from "../db/crestEvents";
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
    expect(step(seq(["strength", 7]), "strength").reveal).toEqual({
      animal: "bear",
      quarters: null,
    });
  });

  test("a boar is revealed with its two quarters", () => {
    const h = seq(["strength", 2], ["run", 2], ["yoga", 2], ["ride", 1]);
    const { reveal } = step(h, "calisthenics");
    expect(reveal?.animal).toBe("boar");
    expect(reveal?.quarters).toHaveLength(2);
  });

  test("a hand-picked animal never changes what is revealed", () => {
    expect(step(seq(["strength", 7]), "strength", "stag").reveal?.animal).toBe("bear");
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
      { animal: "bear", stage: "adult", n: 40 },
    ]);
    expect(step(seq(["strength", 199]), "strength").stageUp).toEqual([
      { animal: "bear", stage: "venerable", n: 200 },
    ]);
  });

  test("the second animal rises on its own practice", () => {
    const h = [...seq(["strength", 60], ["run", 39])];
    const e = step(h, "run");
    expect(e.stageUp).toEqual([{ animal: "stag", stage: "adult", n: 40 }]);
  });

  test("the boar and a hand-picked animal rise on every session, with no count of a practice", () => {
    const boar = step(
      seq(["strength", 3], ["run", 3], ["yoga", 2], ["strength", 11], ["run", 10], ["yoga", 10]),
      "yoga",
    );
    expect(boar.stageUp).toEqual([{ animal: "boar", stage: "adult", n: null }]);
    const picked = step(seq(["strength", 30], ["run", 9]), "run", "stag");
    expect(picked.stageUp).toEqual([{ animal: "stag", stage: "adult", n: null }]);
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
