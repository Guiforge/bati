import {
  perSideClockSeconds,
  perSideHeldSeconds,
  SIDE_SWITCH_SECONDS,
  sidePhase,
} from "@/src/perSide";

/**
 * One clock, three phases: a 30 s side plank runs 30 + 5 + 30. The store sets it, the view reads
 * it, the estimate prices it; these pin where the boundaries fall and what each moment logs.
 */
describe("a per-side hold of 30 s a side", () => {
  const side = 30;
  const clock = perSideClockSeconds(side);
  const at = (elapsed: number) => sidePhase(clock - elapsed, side);

  test("runs both sides and the switch", () => {
    expect(clock).toBe(30 + SIDE_SWITCH_SECONDS + 30);
  });

  test("counts the first side, then the switch, then the second side down", () => {
    expect(at(0)).toEqual({ phase: "first", seconds: 30 });
    expect(at(29)).toEqual({ phase: "first", seconds: 1 });
    expect(at(30)).toEqual({ phase: "switch", seconds: 5 });
    expect(at(34)).toEqual({ phase: "switch", seconds: 1 });
    expect(at(35)).toEqual({ phase: "second", seconds: 30 });
    expect(at(70)).toEqual({ phase: "second", seconds: -5 });
  });

  test("logs the first side as held, never counts the switch, then the average", () => {
    expect(perSideHeldSeconds(25, side)).toBe(25);
    expect(perSideHeldSeconds(33, side)).toBe(30);
    expect(perSideHeldSeconds(50, side)).toBe(30);
    expect(perSideHeldSeconds(65, side)).toBe(30);
    expect(perSideHeldSeconds(85, side)).toBe(40);
  });

  test("the logged figure never drops while the hero keeps holding", () => {
    const figures = Array.from({ length: 100 }, (_, e) => perSideHeldSeconds(e, side));
    expect(figures.every((f, i) => i === 0 || f >= (figures[i - 1] ?? 0))).toBe(true);
  });
});
