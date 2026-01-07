import { isMuscleCode } from "@/src/db/muscles";

describe("isMuscleCode", () => {
  it("returns true for known codes", () => {
    expect(isMuscleCode("arms")).toBe(true);
    expect(isMuscleCode("abs")).toBe(true);
  });

  it("returns false for unknown values", () => {
    expect(isMuscleCode("biceps")).toBe(false);
    expect(isMuscleCode(123)).toBe(false);
    expect(isMuscleCode(null)).toBe(false);
  });
});
