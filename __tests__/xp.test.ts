import { computeSessionXp } from "@/db/xp";

describe("db/xp", () => {
  test("gives a small floor even for very short sessions", () => {
    expect(computeSessionXp({ durationSeconds: 0, userLevel: "medium" })).toBeGreaterThanOrEqual(
      10,
    );
    expect(computeSessionXp({ durationSeconds: 3, userLevel: "medium" })).toBeGreaterThanOrEqual(
      10,
    );
  });

  test("scales with duration", () => {
    const short = computeSessionXp({
      durationSeconds: 60,
      userLevel: "medium",
    });
    const long = computeSessionXp({
      durationSeconds: 600,
      userLevel: "medium",
    });
    expect(long).toBeGreaterThan(short);
  });

  test("difficulty multiplier affects xp", () => {
    const base = computeSessionXp({
      durationSeconds: 300,
      userLevel: "medium",
    });
    const easy = computeSessionXp({ durationSeconds: 300, userLevel: "easy" });
    const hard = computeSessionXp({ durationSeconds: 300, userLevel: "hard" });

    expect(easy).toBeLessThan(base);
    expect(hard).toBeGreaterThan(base);
  });
});
