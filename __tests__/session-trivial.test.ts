import { isTrivialSession, TRIVIAL_SESSION_SECONDS } from "@/src/session/trivial";

describe("src/session/trivial", () => {
  test("a five-second outing is asked about, not banked", () => {
    expect(isTrivialSession(5)).toBe(true);
  });

  test("a real session is never questioned", () => {
    // Seeded quests are held to an 8-to-25-minute design window, so anything a hero finishes
    // normally is an order of magnitude past this.
    expect(isTrivialSession(8 * 60)).toBe(false);
    expect(isTrivialSession(25 * 60)).toBe(false);
  });

  test("the boundary belongs to the session, not to the doubt", () => {
    expect(isTrivialSession(TRIVIAL_SESSION_SECONDS - 1)).toBe(true);
    expect(isTrivialSession(TRIVIAL_SESSION_SECONDS)).toBe(false);
  });

  // A clock that has not started yet must not read as a completed two-hour session.
  test("zero is trivial, and so is a negative clock", () => {
    expect(isTrivialSession(0)).toBe(true);
    expect(isTrivialSession(-1)).toBe(true);
  });
});
