/**
 * @jest-environment ./__tests__/helpers/timezoneEnvironment.js
 * @jest-environment-options {"timezone": "Europe/Paris"}
 */
import { revealedToday } from "@/components/village/crestLine";

// Paris is UTC+2 in October: 00:30 on the 9th is 22:30Z on the 8th, so a UTC comparison gets
// both reads below wrong.
const revealed = new Date("2026-10-08T22:30:00Z");

describe("revealedToday", () => {
  it("is true at 23:00 the same local day", () => {
    expect(revealedToday(revealed, new Date("2026-10-09T21:00:00Z"))).toBe(true);
  });

  it("is false at 00:10 the next local day, though still the 9th in UTC", () => {
    expect(revealedToday(revealed, new Date("2026-10-09T22:10:00Z"))).toBe(false);
  });
});
