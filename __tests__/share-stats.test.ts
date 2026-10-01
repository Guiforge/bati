import type { TFunction } from "i18next";
import { shareKicker, shareStats } from "@/components/share/shareStats";
import type { CompletedSession } from "@/db/completed";

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
    );
    expect(stats.map((s) => s.label)).toEqual([
      "share.distance",
      "journal.ground_moving",
      "journal.ground_pace",
      "journal.ground_climbed",
      "share.xp",
    ]);
  });

  test("a flat outing does not boast of climbing nothing", () => {
    const stats = shareStats(
      session({ outing: "walk", leaguesM: 5000, movingSeconds: 3000, ascentM: 0 }),
      t,
      "en",
      "metric",
    );
    expect(stats.map((s) => s.label)).not.toContain("journal.ground_climbed");
  });

  test("an outing that measured no ground gives no ground figure", () => {
    const stats = shareStats(session({ outing: "walk", leaguesM: null }), t, "en", "metric");
    expect(stats.map((s) => s.label)).toEqual(["journal.ground_moving", "share.xp"]);
  });

  test("a workout gives its length, its rounds and what it paid", () => {
    const exercises = [{ roundIndex: 0 }, { roundIndex: 0 }, { roundIndex: 1 }];
    const stats = shareStats(
      session({ exercises: exercises as CompletedSession["exercises"] }),
      t,
      "en",
      "metric",
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
