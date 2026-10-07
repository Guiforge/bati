import {
  perSideClockSeconds,
  perSideSet,
  SECOND_SIDE_GRACE_SECONDS,
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
    const G = SECOND_SIDE_GRACE_SECONDS;
    expect(perSideSet(25, side)).toEqual({ seconds: 25, sides: 1 }); // stopped on the first side
    expect(perSideSet(30 + S - 1, side)).toEqual({ seconds: 30, sides: 1 }); // in the switch
    expect(perSideSet(30 + S + G - 1, side)).toEqual({ seconds: 30, sides: 1 }); // Done on the "go"
    expect(perSideSet(30 + S + 8, side)).toEqual({ seconds: 8, sides: 2 }); // 30 left, 8 right
    expect(perSideSet(30 + S + 30, side)).toEqual({ seconds: 30, sides: 2 }); // both full
    expect(perSideSet(30 + S + 50, side)).toEqual({ seconds: 40, sides: 2 }); // 30 left, 50 right
  });

  // "Next side" after 10 s (`nextSide`): that side's real time stands, and the weaker side is logged.
  test("a first side cut short logs the weaker of the two sides", () => {
    const S = SIDE_SWITCH_SECONDS;
    const G = SECOND_SIDE_GRACE_SECONDS;
    expect(perSideSet(30 + S + G - 1, side, 10)).toEqual({ seconds: 10, sides: 1 }); // stopped on the "go"
    expect(perSideSet(30 + S + 5, side, 10)).toEqual({ seconds: 5, sides: 2 }); // 10 then 5
    expect(perSideSet(30 + S + 20, side, 10)).toEqual({ seconds: 10, sides: 2 }); // 10 then 20
    expect(perSideSet(30 + S + 40, side, 10)).toEqual({ seconds: 10, sides: 2 }); // 10 then 40
  });
});
