import { createTestDb } from "./helpers/testDb";

describe("db/exercises", () => {
  const t = createTestDb();

  beforeAll(() => {
    jest.resetModules();
    jest.doMock("../src/db/client", () => ({
      db: t.db,
      schema: require("../src/db/schema"),
    }));
  });

  afterAll(() => {
    t.close();
  });

  test("listExercises aggregates muscles", async () => {
    const { listExercises } =
      require("../src/db/exercises") as typeof import("../src/db/exercises");

    const all = await listExercises();
    expect(all.length).toBeGreaterThanOrEqual(6);

    const squat = all.find((e) => e.enName === "Squat");
    expect(squat).toBeTruthy();
    expect(squat?.imagePath).toBe("assets/placeholder.jpg");
    expect(squat?.creator).toBeTruthy();
    expect(squat?.difficulty).toBeTruthy();
    expect(squat?.equipment).toBeTruthy();
    expect(typeof squat?.secondsPerRep).toBe("number");
    expect(squat?.muscles.sort()).toEqual(["abs", "calf"].sort());
  });

  test("getExerciseById returns one exercise with muscles", async () => {
    const { listExercises, getExerciseById } =
      require("../src/db/exercises") as typeof import("../src/db/exercises");

    const all = await listExercises();
    const plank = all.find((e) => e.enName === "Plank");
    expect(plank).toBeTruthy();
    if (!plank) throw new Error("Seeded exercise 'Plank' not found");

    const fetched = await getExerciseById(plank.id);
    expect(fetched?.enName).toBe("Plank");
    expect(fetched?.muscles.sort()).toEqual(["abs", "back", "shoulder"].sort());
  });

  test("getExerciseById returns null for missing id", async () => {
    const { getExerciseById } =
      require("../src/db/exercises") as typeof import("../src/db/exercises");
    const fetched = await getExerciseById(999999);
    expect(fetched).toBeNull();
  });
});
