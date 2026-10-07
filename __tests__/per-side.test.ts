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
    const S = SIDE_SWITCH_SECONDS;
    expect(at(0)).toEqual({ phase: "first", seconds: 30 });
    expect(at(29)).toEqual({ phase: "first", seconds: 1 });
    expect(at(30)).toEqual({ phase: "switch", seconds: S });
    expect(at(30 + S - 1)).toEqual({ phase: "switch", seconds: 1 });
    expect(at(30 + S)).toEqual({ phase: "second", seconds: 30 });
    expect(at(30 + S + 35)).toEqual({ phase: "second", seconds: -5 });
  });

  test("logs the weaker side, never the switch, and the average past the target", () => {
    const S = SIDE_SWITCH_SECONDS;
    expect(perSideHeldSeconds(25, side)).toBe(25); // stopped on the first side
    expect(perSideHeldSeconds(30 + S - 1, side)).toBe(30); // in the switch: one full side done
    expect(perSideHeldSeconds(30 + S + 8, side)).toBe(8); // 30 left, 8 right
    expect(perSideHeldSeconds(30 + S + 30, side)).toBe(30); // both full
    expect(perSideHeldSeconds(30 + S + 50, side)).toBe(40); // 30 left, 50 right
  });
});
