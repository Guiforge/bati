/**
 * @jest-environment ./__tests__/helpers/timezoneEnvironment.js
 * @jest-environment-options {"timezone": "America/New_York"}
 */
import { restSuggestionAt } from "@/db/restSuggestions";

// Pure: nothing here touches the database, but the module that holds it does at import.
jest.mock("@/db/client", () => ({ db: {}, schema: jest.requireActual("@/db/schema") }));

/**
 * The pure half of the rest advice, which the reminders ask about every day of their horizon.
 *
 * West of UTC on purpose. `getRestSuggestion` used to rebuild each training day with
 * `new Date("yyyy-MM-dd")`, which JavaScript reads as UTC midnight: in New York that is the evening
 * before, so a hero whose last session was *yesterday* read as training the day before that, the
 * "today or yesterday" gate failed, and five days in a row counted as none.
 */

/** Noon `daysAgo` days before `now`, local. */
function sessionsOn(now: Date, ...daysAgo: number[]): Date[] {
  return daysAgo.map((d) => new Date(now.getFullYear(), now.getMonth(), now.getDate() - d, 12));
}

const now = new Date(2026, 0, 15, 20, 0);

describe("restSuggestionAt", () => {
  test("runs in UTC-5, so the bug below can show", () => {
    expect(now.getTimezoneOffset()).toBe(300);
  });

  test("five days in a row ending yesterday still count, west of UTC", () => {
    const result = restSuggestionAt(sessionsOn(now, 1, 2, 3, 4, 5), now);
    expect(result.reason).toBe("consecutive_days");
    expect(result.daysInARow).toBe(5);
  });

  test("five days in a row ending today", () => {
    expect(restSuggestionAt(sessionsOn(now, 0, 1, 2, 3, 4), now).reason).toBe("consecutive_days");
  });

  test("the run expires two days after it ends", () => {
    const sessions = sessionsOn(now, 0, 1, 2, 3, 4);
    const inTwoDays = new Date(2026, 0, 17, 20, 0);
    expect(restSuggestionAt(sessions, new Date(2026, 0, 16, 20, 0)).reason).toBe(
      "consecutive_days",
    );
    expect(restSuggestionAt(sessions, inTwoDays).daysInARow).toBe(0);
  });

  test("sessions after `now` are not seen: a day is judged on what came before it", () => {
    const earlier = new Date(2026, 0, 10, 20, 0);
    expect(restSuggestionAt(sessionsOn(now, 0, 1, 2, 3, 4), earlier).recentSessionCount).toBe(0);
  });

  test("ten sessions in a week is high volume, six is overtraining", () => {
    expect(restSuggestionAt(sessionsOn(now, 0, 0, 1, 1, 2, 2, 4, 4, 6, 6), now).reason).toBe(
      "high_volume",
    );
    expect(restSuggestionAt(sessionsOn(now, 0, 1, 2, 3, 5, 6), now).reason).toBe("overtraining");
  });

  test("four heavy weeks earn a deload, and it still says shouldRest", () => {
    const days = [0, 1, 2, 3].flatMap((w) => [1, 2, 4, 6].map((o) => w * 7 + o));
    const result = restSuggestionAt(sessionsOn(now, ...days), now);
    expect(result.reason).toBe("deload");
    expect(result.shouldRest).toBe(true);
  });

  test("nothing logged, nothing advised", () => {
    expect(restSuggestionAt([], now)).toEqual({
      shouldRest: false,
      reason: "none",
      daysInARow: 0,
      recentSessionCount: 0,
    });
  });
});
