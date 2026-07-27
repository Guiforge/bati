import { createTestDb } from "./helpers/testDb";

describe("db/exercises", () => {
  const t = createTestDb();

  beforeAll(() => {
    jest.resetModules();
    jest.doMock("../db/client", () => ({
      db: t.db,
      schema: require("../db/schema"),
    }));
  });

  afterAll(() => {
    t.close();
  });

  test("listExercises aggregates muscles", async () => {
    const { listExercises } = require("../db/exercises") as typeof import("../db/exercises");

    const all = await listExercises();
    expect(all.length).toBeGreaterThanOrEqual(6);

    const squat = all.find((e) => e.enName === "Squat");
    expect(squat).toBeTruthy();
    // imagePath is populated from seed content; assert presence, not a specific asset
    // filename, so content/art swaps don't break this test (they previously did).
    expect(squat?.imagePath).toBeTruthy();
    expect(squat?.creator).toBeTruthy();
    expect(squat?.difficulty).toBeTruthy();
    expect(squat?.equipment).toBeTruthy();
    expect(typeof squat?.secondsPerRep).toBe("number");
    // `chest` was removed by 0012 — a squat is not a chest movement, and the wrong tag
    // fed both the coach's weak-area rule and The Golem's weakness multiplier.
    expect(squat?.muscles.sort()).toEqual(["calf"]);

    const wallSit = all.find((e) => e.enName === "Wall Sit");
    expect(wallSit?.muscles.sort()).toEqual(["calf"]);
  });

  test("getExerciseById returns one exercise with muscles", async () => {
    const { listExercises, getExerciseById } =
      require("../db/exercises") as typeof import("../db/exercises");

    const all = await listExercises();
    const plank = all.find((e) => e.enName === "Plank");
    expect(plank).toBeTruthy();
    if (!plank) throw new Error("Seeded exercise 'Plank' not found");

    const fetched = await getExerciseById(plank.id);
    expect(fetched?.enName).toBe("Plank");
    expect(fetched?.muscles.sort()).toEqual(["abs", "back", "shoulder"].sort());
  });

  test("getExerciseById returns null for missing id", async () => {
    const { getExerciseById } = require("../db/exercises") as typeof import("../db/exercises");
    const fetched = await getExerciseById(999999);
    expect(fetched).toBeNull();
  });
});
