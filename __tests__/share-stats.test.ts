import type { TFunction } from "i18next";
import { chronicleStats, shareKicker, shareStats } from "@/components/share/shareStats";
import type { Chronicle } from "@/db/chronicle";
import type { CompletedSession } from "@/db/completed";
import type { PeriodFigures } from "@/db/journal";
import { TIER_NAMES } from "@/db/village";

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));

/** The key itself, so the assertions read which figure was chosen rather than its wording. */
const t = ((key: string) => key) as unknown as TFunction;

const session = (over: Partial<CompletedSession>): CompletedSession =>
  ({
    id: 1,
    uuid: "u",
    questId: 1,
    userLevel: "medium",
    durationSeconds: 1800,
    xpEarned: 120,
    notes: "",
    feedback: null,
    performedAt: new Date(2026, 8, 20),
    leaguesM: null,
    movingSeconds: null,
    ascentM: null,
    outing: null,
    byHand: null,
    label: null,
    hasNewRecords: false,
    exercises: [],
    ...over,
  }) as CompletedSession;

/**
 * The figures under a shared card. A zero is a failure printed in public, so it is left out: a
 * flat walk says nothing about climbing, and a walk whose GPS never started says nothing at all
 * about its ground.
 */
describe("shareStats", () => {
  test("an outing gives its ground, its moving time, its pace, its climb and what it paid", () => {
    const stats = shareStats(
      session({ outing: "walk", leaguesM: 5000, movingSeconds: 3000, ascentM: 40 }),
      t,
      "en",
      "metric",
      "pace",
    );
    expect(stats.map((s) => s.label)).toEqual([
      "share.distance",
      "journal.ground_moving",
      "journal.ground_pace",
      "journal.ground_climbed",
      "share.xp",
    ]);
  });

  test("a distance the hero typed carries the mark where its label is, and makes no pace", () => {
    const stats = shareStats(
      session({
        outing: "walk",
        leaguesM: 3800,
        durationSeconds: 2520,
        byHand: "distance",
      }),
      t,
      "en",
      "metric",
      "pace",
    );
    expect(stats.map((s) => s.label)).toEqual([
      "past_session.hand_mark_distance",
      "journal.ground_moving",
      "share.xp",
    ]);
  });

  test("a session written down gives its time and what it paid, never a pace or a round", () => {
    const stats = shareStats(
      session({ byHand: "session", durationSeconds: 2700, xpEarned: 75 }),
      t,
      "en",
      "metric",
      "pace",
    );
    expect(stats.map((s) => s.label)).toEqual(["share.duration", "share.xp"]);
  });

  test("a pace or a speed, as the hero chose, is the one on the card", () => {
    const walk = session({ outing: "walk", leaguesM: 5000, movingSeconds: 3000 });
    const at = (rate: "pace" | "speed") =>
      shareStats(walk, t, "en", "metric", rate).find((s) => s.label.startsWith("journal.ground_p"));
    expect(at("pace")).toEqual({ value: "10:00 /km", label: "journal.ground_pace" });
    const ride = session({ outing: "ride", leaguesM: 5000, movingSeconds: 3000 });
    expect(
      shareStats(ride, t, "en", "metric", "speed").find((s) => s.label === "journal.ground_speed"),
    ).toEqual({ value: "6.0 km/h", label: "journal.ground_speed" });
  });

  test("a flat outing does not boast of climbing nothing", () => {
    const stats = shareStats(
      session({ outing: "walk", leaguesM: 5000, movingSeconds: 3000, ascentM: 0 }),
      t,
      "en",
      "metric",
      "pace",
    );
    expect(stats.map((s) => s.label)).not.toContain("journal.ground_climbed");
  });

  test("an outing that measured no ground gives no ground figure", () => {
    const stats = shareStats(
      session({ outing: "walk", leaguesM: null }),
      t,
      "en",
      "metric",
      "pace",
    );
    expect(stats.map((s) => s.label)).toEqual(["journal.ground_moving", "share.xp"]);
  });

  test("a workout gives its length, its rounds and what it paid", () => {
    const exercises = [{ roundIndex: 0 }, { roundIndex: 0 }, { roundIndex: 1 }];
    const stats = shareStats(
      session({ exercises: exercises as CompletedSession["exercises"] }),
      t,
      "en",
      "metric",
      "pace",
    );
    expect(stats.map((s) => [s.label, s.value])).toEqual([
      ["share.duration", expect.any(String)],
      ["share.rounds", "2"],
      ["share.xp", "+120"],
    ]);
  });
});

/**
 * The card's first word. The journal's list badges a session from its flag alone, and a session
 * saved before the detail was kept has nothing else, so the card read the detail only and sent
 * a record session out as an ordinary one.
 */
describe("shareKicker", () => {
  test("a felled boss outranks everything", () => {
    expect(shareKicker({ records: [{}], session: session({}) }, true)).toBe("share.kicker_kill");
  });

  test("a record is announced from its detail or from the row's flag alone", () => {
    expect(shareKicker({ records: [{}], session: session({}) }, false)).toBe("share.kicker_record");
    expect(shareKicker({ records: [], session: session({ hasNewRecords: true }) }, false)).toBe(
      "share.kicker_record",
    );
  });

  test("otherwise it says what kind of session it was", () => {
    expect(shareKicker({ records: [], session: session({}) }, false)).toBe("share.kicker_quest");
    expect(shareKicker({ records: [], session: session({ outing: "walk" }) }, false)).toBe(
      "share.kicker_outing",
    );
  });
});

const year = (figures: Partial<PeriodFigures>, over: Partial<Chronicle> = {}): Chronicle => ({
  year: 2026,
  since: new Date(2026, 0, 1),
  to: new Date(2026, 11, 15),
  figures: {
    quests: 0,
    outings: 0,
    handOutings: 0,
    reps: 0,
    questSeconds: 0,
    timedQuests: 0,
    outingSeconds: 0,
    leaguesM: 0,
    xp: 0,
    records: 0,
    latestRecord: null,
    ...figures,
  },
  bosses: 0,
  longestFlame: 0,
  villageTier: 1,
  ...over,
});

/**
 * The year's figures. The sessions, the time and the village are always there, so a week-old
 * hero's card has the same shape as a veteran's; everything else is left out at zero.
 */
describe("chronicleStats", () => {
  test("a veteran's year gives every figure, in the card's order", () => {
    const figures = {
      quests: 140,
      outings: 30,
      questSeconds: 90_000,
      outingSeconds: 60_000,
      leaguesM: 210_000,
      records: 12,
    };
    const stats = chronicleStats(
      year(figures, { bosses: 3, longestFlame: 41, villageTier: 9 }),
      t,
      "en",
      "metric",
    );
    // Each figure under its own label: three counts that all differ, so a swap cannot pass.
    expect(stats.map((s) => [s.label, s.value])).toEqual([
      ["chronicle.sessions", "170"],
      ["share.duration", expect.any(String)],
      ["share.distance", "210.00 km"],
      ["chronicle.records", "12"],
      ["chronicle.bosses", "3"],
      ["chronicle.flame_days", "41"],
      // The village by its name, in the hero's language, at the tier the year ended on.
      ["chronicle.village", TIER_NAMES[9].en],
    ]);
    const fr = chronicleStats(year(figures, { villageTier: 9 }), t, "fr", "metric");
    expect(fr.at(-1)?.value).toBe(TIER_NAMES[9].fr);
  });

  test("the village's label never repeats a tier's name, in any language", () => {
    // "Village" over "village", then over "your village", read as a bug on the picture of every
    // hero at tier 3: the label names the place without the word a tier could be.
    for (const language of ["en", "fr", "de", "es", "ru", "zh"] as const) {
      const label = (
        require(`../locales/${language}.json`) as { chronicle: { village: string } }
      ).chronicle.village.toLowerCase();
      for (const name of Object.values(TIER_NAMES)) {
        expect(label).not.toContain(name[language].toLowerCase());
      }
    }
  });

  test("a week-old hero keeps the sessions, the time and the village, and no zero", () => {
    const stats = chronicleStats(year({ quests: 2, questSeconds: 1200 }), t, "en", "metric");
    expect(stats.map((s) => s.label)).toEqual([
      "chronicle.sessions",
      "share.duration",
      "chronicle.village",
    ]);
  });

  test("the time adds the quests' and the outings' own, in hours as the Journal writes them", () => {
    // The key and its values, so the assertion reads which format was chosen and what it was fed.
    const spelled = ((key: string, values?: object) =>
      `${key}${JSON.stringify(values ?? {})}`) as unknown as TFunction;
    const [, time] = chronicleStats(
      year({ quests: 1, outings: 1, questSeconds: 1800, outingSeconds: 9000 }),
      spelled,
      "en",
      "metric",
    );
    // A year's 3 h, not "180 min 0s": `formatHoursMinutes`, the Journal's own.
    expect(time?.value).toBe('journal.duration_hm{"h":3,"m":"00"}');
  });
});
