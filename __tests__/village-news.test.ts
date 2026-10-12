import {
  type AgeNews,
  ageKey,
  anniversaryDue,
  anniversaryKey,
  newestAge,
} from "@/db/villageNewsRules";
import { type Age, type Entry, lastYear } from "@/db/villageYearsRules";

const age = (level: number): Age => ({
  level,
  source: "rung",
  exerciseId: 1,
  depth: 3,
  reachedAtLevel: level - 3,
  practice: null,
});
const year = (years: number, sessions = 120) => ({ years, sessions, best: null });

describe("newestAge", () => {
  test("is the newest Age, once: the key is its level", () => {
    expect(newestAge([age(50), age(60)], [])?.level).toBe(60);
    expect(newestAge([age(50), age(60)], [ageKey(60)])).toBeNull();
    expect(ageKey(60)).toBe("age:60");
  });

  test("a hero who updates past two Ages is told the newest only, the older never after", () => {
    expect(newestAge([age(50), age(60)], [])?.level).toBe(60);
    // Once the 60 is marked, the 50 does not come back.
    expect(newestAge([age(50), age(60)], ["age:60"])).toBeNull();
  });

  test("the next Age is news again; no Age and an unreadable list say nothing", () => {
    expect(newestAge([age(50), age(60)], ["age:50"])?.level).toBe(60);
    expect(newestAge([], [])).toBeNull();
    expect(newestAge([age(50)], undefined)).toBeNull();
  });

  test("the news carries what the feast needs and nothing is a movement it cannot name", () => {
    const news: AgeNews = { ...age(50), movement: null };
    expect(news.reachedAtLevel).toBe(47);
  });
});

describe("anniversaryDue", () => {
  test("is the year's feast, once", () => {
    expect(anniversaryDue(year(1), [])?.years).toBe(1);
    expect(anniversaryDue(year(1), [anniversaryKey(1)])).toBeNull();
    expect(anniversaryKey(3)).toBe("anniversary:3");
  });

  test("several years away are one feast under the current count", () => {
    expect(anniversaryDue(year(3), ["anniversary:1"])?.years).toBe(3);
    expect(anniversaryDue(year(3), ["anniversary:3"])).toBeNull();
  });

  test("a hero who updates at 3 years sees it once, then year 4 is new", () => {
    expect(anniversaryDue(year(3), [])?.years).toBe(3);
    expect(anniversaryDue(year(3), ["anniversary:3"])).toBeNull();
    expect(anniversaryDue(year(4), ["anniversary:3"])?.years).toBe(4);
  });

  test("under a year, or an unreadable list, says nothing", () => {
    expect(anniversaryDue(year(0), [])).toBeNull();
    expect(anniversaryDue(year(2), undefined)).toBeNull();
  });
});

describe("lastYear", () => {
  const DAY = 86_400_000;
  const NOW = new Date("2026-10-12T12:00:00Z");
  const entry = (daysAgo: number, over: Partial<Entry> = {}): Entry => ({
    at: new Date(NOW.getTime() - daysAgo * DAY),
    level: 1,
    practice: null,
    breaks: [],
    firstSeen: [],
    ...over,
  });
  const brk = (daysAgo: number, prior: number, value: number) => ({
    exerciseId: 7,
    unit: "reps" as const,
    prior,
    value,
    at: NOW.getTime() - daysAgo * DAY,
  });

  test("counts the whole years since the first session, and only the last 365 days of sessions", () => {
    const got = lastYear([entry(800), entry(400), entry(300), entry(1)], NOW);
    expect(got.years).toBe(2);
    expect(got.sessions).toBe(2);
  });

  test("the best record is the year's own, not an older one", () => {
    const got = lastYear(
      [entry(500, { breaks: [brk(500, 1, 100)] }), entry(10, { breaks: [brk(10, 10, 14)] })],
      NOW,
    );
    expect(got.best).toMatchObject({ prior: 10, value: 14 });
  });

  test("an empty journal has no age", () => {
    expect(lastYear([], NOW)).toEqual({ years: 0, sessions: 0, best: null });
  });
});
