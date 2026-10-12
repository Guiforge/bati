import { DEFAULT_WEEKLY_TARGET, WEEKLY_TARGETS } from "@/constants/weeklyTargets";

// The oath screen opens on DEFAULT_WEEKLY_TARGET; if no chip offers it, nothing is selected.
describe("weekly targets", () => {
  it("offers the default as one of its chips", () => {
    expect(WEEKLY_TARGETS).toContain(DEFAULT_WEEKLY_TARGET);
  });
});
