import { clientMock, createTestDb } from "./helpers/testDb";

/**
 * The bomb this partition defuses.
 *
 * `exercises_en_name_unique` was global, seven seed migrations `INSERT INTO exercises` bare, and
 * `db/migrate.ts` runs the whole journal inside one BEGIN IMMEDIATE. So a hero-named "Dead Bug"
 * plus a later content update seeding the official "Dead Bug" is a UNIQUE failure, a rollback of
 * every migration, and an app that never opens again on that phone — identically on every launch,
 * with no in-app recovery.
 *
 * Ids were never the contested namespace: they are AUTOINCREMENT seeding order, nothing outside
 * the database references them, and a backup is a VACUUM INTO of the whole file. Names are, and
 * these are the four cases that say the split holds.
 */
describe("exercises name partition", () => {
  const t = createTestDb();

  beforeAll(() => {
    jest.resetModules();
    jest.doMock("../db/client", () => clientMock(t));
  });

  afterAll(() => {
    t.close();
  });

  const insert = (enName: string, creator: string) =>
    t.sqlite
      .prepare(
        `INSERT INTO exercises (enName, frName, enDescription, frDescription, creator)
         VALUES (?, ?, '', '', ?)`,
      )
      .run(enName, enName, creator);

  test("a hero may take a name seed content already owns", () => {
    expect(() => insert("Squat", "hero")).not.toThrow();
  });

  test("a later seed may take a name a hero already owns — this is the bomb", () => {
    insert("Chigong Punch", "hero");
    // Exactly the statement shape every seed migration uses.
    expect(() => insert("Chigong Punch", "Admin")).not.toThrow();
  });

  test("a hero cannot own the same name twice", () => {
    insert("Archer Squat", "hero");
    expect(() => insert("Archer Squat", "hero")).toThrow(/UNIQUE/i);
  });

  test("seed content still cannot own the same name twice", () => {
    expect(() => insert("Squat", "Admin")).toThrow(/UNIQUE/i);
  });

  test("retiredAt exists on the row and starts null", async () => {
    const { listExercises } = require("../db/exercises") as typeof import("../db/exercises");

    const all = await listExercises();
    const squat = all.find((e) => e.enName === "Squat" && e.creator === "Admin");
    expect(squat?.retiredAt).toBeNull();
  });

  test("officialByName prefers the seed row when a hero owns the same name", async () => {
    const { listExercises, officialByName, isUserExercise } =
      require("../db/exercises") as typeof import("../db/exercises");

    const all = await listExercises();
    const found = officialByName(all, "Squat");

    expect(found?.enName).toBe("Squat");
    expect(found ? isUserExercise(found) : true).toBe(false);
  });

  test("officialByName returns undefined for a name only a hero owns", async () => {
    const { listExercises, officialByName } =
      require("../db/exercises") as typeof import("../db/exercises");

    const all = await listExercises();
    // Inserted hero-side by an earlier case; the official row was never seeded.
    expect(all.some((e) => e.enName === "Archer Squat")).toBe(true);
    expect(officialByName(all, "Archer Squat")).toBeUndefined();
  });
});
