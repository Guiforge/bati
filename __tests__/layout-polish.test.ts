import { leavesWithoutAsking } from "@/components/common/useTabLeaveGuard";
import { questHeaderHeight, WARMUP_PICTURE_MIN_HEIGHT } from "@/constants/layout";

describe("questHeaderHeight", () => {
  it("keeps the 16:9 on a phone", () => {
    expect(questHeaderHeight(411, 891)).toBe(Math.round(((411 - 40) * 9) / 16));
  });

  it("caps at 30% of a landscape tablet window", () => {
    expect(questHeaderHeight(1280, 800)).toBe(240);
  });

  it("measures the column, not a wide window, in portrait", () => {
    expect(questHeaderHeight(800, 1280)).toBe(270);
  });
});

test("the warm-up shows the picture from a tall window", () => {
  expect(WARMUP_PICTURE_MIN_HEIGHT).toBeGreaterThan(640);
});

describe("leavesWithoutAsking", () => {
  const focused = { isFocused: () => true };
  const blurred = { isFocused: () => false };

  it("asks for a dirty, focused editor", () => {
    expect(leavesWithoutAsking(focused, true, { current: false })).toBe(false);
  });

  it("lets popToTopOnBlur remove a dirty editor on a tab the hero already left", () => {
    expect(leavesWithoutAsking(blurred, true, { current: false })).toBe(true);
  });

  it("lets a clean or already confirmed editor go", () => {
    expect(leavesWithoutAsking(focused, false, { current: false })).toBe(true);
    expect(leavesWithoutAsking(focused, true, { current: true })).toBe(true);
  });
});
