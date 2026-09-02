import { formatClock, formatDistance, formatPace } from "@/constants/distanceFormat";
import { RULES } from "@/src/gps/track";

// The helper is the only converter in the app, so the numbers below are the contract: a mile is
// 1609.344 m and a foot 0.3048 m, exactly, and nothing here may round its way past a threshold.

describe("formatDistance", () => {
  test("metric reads metres below a kilometre and kilometres above", () => {
    expect(formatDistance(0, "metric")).toBe("0 m");
    expect(formatDistance(100, "metric")).toBe("100 m");
    expect(formatDistance(999, "metric")).toBe("999 m");
    expect(formatDistance(1000, "metric")).toBe("1.00 km");
    expect(formatDistance(42_195, "metric")).toBe("42.20 km");
  });

  /** Rounding happens before the threshold: 999.6 m must not print as "1000 m". */
  test("the metric cut-over is on the rounded metre, not the raw one", () => {
    expect(formatDistance(999.4, "metric")).toBe("999 m");
    expect(formatDistance(999.6, "metric")).toBe("1.00 km");
  });

  test("imperial reads feet below a mile and miles above", () => {
    expect(formatDistance(0, "imperial")).toBe("0 ft");
    expect(formatDistance(100, "imperial")).toBe("328 ft");
    expect(formatDistance(999, "imperial")).toBe("3278 ft");
    // 1000 m is well under a mile, so it is still feet — the unit switches at the mile, not at
    // the kilometre. Getting this wrong is how "1.00 mi" ends up meaning a kilometre.
    expect(formatDistance(1000, "imperial")).toBe("3281 ft");
  });

  test("one mile is 1609.344 m, exactly, and the boundary sits on it", () => {
    expect(formatDistance(1609.344, "imperial")).toBe("1.00 mi");
    expect(formatDistance(1609.0, "imperial")).toBe("5279 ft");
    expect(formatDistance(42_195, "imperial")).toBe("26.22 mi");
  });

  test("a distance that is not a number says so instead of printing NaN", () => {
    expect(formatDistance(Number.NaN, "metric")).toBe("—");
    expect(formatDistance(-1, "imperial")).toBe("—");
  });
});

describe("formatPace", () => {
  test("five minutes for a kilometre", () => {
    expect(formatPace(1000, 300_000, "metric")).toBe("5:00 /km");
  });

  test("the same run, per mile", () => {
    // 300 s/km × 1.609344 = 482.8 s = 8:03.
    expect(formatPace(1000, 300_000, "imperial")).toBe("8:03 /mi");
    expect(formatPace(1609.344, 482_803, "imperial")).toBe("8:03 /mi");
  });

  test("minutes are not clamped to an hour", () => {
    expect(formatPace(100, 378_000, "metric")).toBe("63:00 /km");
  });

  test("nothing covered, or no time on the clock, is not a pace", () => {
    expect(formatPace(0, 300_000, "metric")).toBe("—");
    expect(formatPace(1000, 0, "metric")).toBe("—");
    expect(formatPace(Number.NaN, 1, "metric")).toBe("—");
  });

  // Live on a Fairphone 6, twenty-eight seconds into a walk that had not started: the panel read
  // "0 m" and "20049:10 /km" on the line under it. Receiver noise arrives before the anchor moves,
  // and a pace divided by centimetres is not surprising, it is nonsense.
  test("receiver noise under the reducer's threshold is not a pace", () => {
    expect(formatPace(0.02, 28_000, "metric")).toBe("—");
    expect(formatPace(RULES.movingThresholdM - 0.01, 28_000, "metric")).toBe("—");
    expect(formatPace(RULES.movingThresholdM, 28_000, "metric")).toBe("46:40 /km");
  });
});

/**
 * The recap printed "31 min 33s" through the estimate's formatter, wrapped it onto two lines at
 * 22 px, and disagreed with the panel the hero had just spent half an hour reading, which said
 * "31:33". One shape, one function.
 */
describe("formatClock", () => {
  test("milliseconds in, m:ss out", () => {
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(5_000)).toBe("0:05");
    expect(formatClock(65_000)).toBe("1:05");
    expect(formatClock(1_893_000)).toBe("31:33");
  });

  test("the leftover second is floored, never rounded up past its own minute", () => {
    expect(formatClock(59_999)).toBe("0:59");
    expect(formatClock(119_999)).toBe("1:59");
  });

  test("minutes are not wrapped into hours", () => {
    expect(formatClock(7_214_000)).toBe("120:14");
  });

  test("a clock that is not a number says so instead of printing NaN", () => {
    expect(formatClock(Number.NaN)).toBe("—");
    expect(formatClock(-1)).toBe("—");
  });
});
