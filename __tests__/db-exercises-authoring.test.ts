import assert from "node:assert/strict";

import { clientMock, createTestDb } from "./helpers/testDb";

/**
 * Writing an exercise, and — the harder half — un-writing one.
 *
 * Delete is the narrow case here, not the default. Foreign keys are off on the device
 * (`db/client.ts` issues no PRAGMA) and nine queries innerJoin `exercises`, so removing a
 * movement someone has already trained silently rewrites their volume, their village and their
 * records. The count in `getExerciseUsage` is the enforcement, because the constraint is not —
 * note that this test database is *stricter* than the app, so it could never prove that on its
 * own.
 */
describe("hero-authored exercises", () => {
  const t = createTestDb();

  beforeAll(() => {
    jest.resetModules();
    jest.doMock("../db/client", () => clientMock(t));
  });

  afterAll(() => {
    t.close();
  });

  const draft = (name: string) => {
    const { DEFAULT_USER_EXERCISE_DRAFT } =
      require("../db/exercises") as typeof import("../db/exercises");
    return { ...DEFAULT_USER_EXERCISE_DRAFT, name, description: `How to do ${name}.` };
  };

  /** A completed session holding one result on `exerciseId`. */
  const recordOneResult = (exerciseId: number) => {
    t.sqlite
      .prepare("INSERT INTO completed_sessions (userLevel, performedAt) VALUES ('medium', ?)")
      .run(Math.floor(Date.now() / 1000));
    const session = t.sqlite.prepare("SELECT MAX(id) AS id FROM completed_sessions").get() as {
      id: number;
    };
    t.sqlite
      .prepare(
        `INSERT INTO completed_exercises
           (sessionId, exerciseId, roundIndex, sortOrder, resultType, resultValue, performedAt)
         VALUES (?, ?, 0, 0, 'reps', 12, ?)`,
      )
      .run(session.id, exerciseId, Math.floor(Date.now() / 1000));
  };

  test("a created exercise is in the catalogue immediately, without a reload", async () => {
    const { createUserExercise, listExercises } =
      require("../db/exercises") as typeof import("../db/exercises");

    const before = await listExercises();
    const id = await createUserExercise({ ...draft("Archer Squat"), muscles: ["legs"] });
    const after = await listExercises();

    expect(after.length).toBe(before.length + 1);

    const created = after.find((e) => e.id === id);
    assert(created);
    // One input, both locales — nothing in the app should ever show an empty French name.
    expect(created.enName).toBe("Archer Squat");
    expect(created.frName).toBe("Archer Squat");
    expect(created.enDescription).toBe(created.frDescription);
    expect(created.creator).toBe("hero");
    expect(created.muscles).toEqual(["legs"]);
    expect(created.retiredAt).toBeNull();
  });

  test("an edit rewrites both locales and replaces the muscle tags", async () => {
    const { createUserExercise, updateUserExercise, getExerciseById } =
      require("../db/exercises") as typeof import("../db/exercises");

    const id = await createUserExercise({ ...draft("Punch"), muscles: ["arms"] });
    await updateUserExercise(id, { ...draft("Straight Punch"), muscles: ["arms", "shoulder"] });

    const updated = await getExerciseById(id);
    expect(updated?.enName).toBe("Straight Punch");
    expect(updated?.frName).toBe("Straight Punch");
    expect(updated?.muscles.sort()).toEqual(["arms", "shoulder"]);
  });

  test("seed content cannot be edited or retired through these writers", async () => {
    const { listExercises, updateUserExercise, retireUserExercise, deleteUserExercise } =
      require("../db/exercises") as typeof import("../db/exercises");

    const all = await listExercises();
    const squat = all.find((e) => e.enName === "Squat" && e.creator === "Admin");
    assert(squat);

    await expect(updateUserExercise(squat.id, draft("Squat"))).rejects.toThrow(
      /not hero-authored/i,
    );
    await expect(retireUserExercise(squat.id)).rejects.toThrow(/not hero-authored/i);
    await expect(deleteUserExercise(squat.id)).rejects.toThrow(/not hero-authored/i);
  });

  test("an unused exercise is really deleted", async () => {
    const { createUserExercise, deleteUserExercise, getExerciseById, getExerciseUsage } =
      require("../db/exercises") as typeof import("../db/exercises");

    const id = await createUserExercise(draft("Typo"));
    expect(await getExerciseUsage(id)).toEqual({
      completedRows: 0,
      questRows: 0,
      preferenceRows: 0,
    });

    await deleteUserExercise(id);
    expect(await getExerciseById(id)).toBeNull();
  });

  test("a movement a quest swapped in, or an oath named, is refused for deletion", async () => {
    const { createUserExercise, deleteUserExercise, getExerciseUsage } =
      require("../db/exercises") as typeof import("../db/exercises");
    const { saveQuestConfig } = require("../db/questConfig") as typeof import("../db/questConfig");
    const { swearOath } = require("../db/oaths") as typeof import("../db/oaths");

    // Neither of these is a row anywhere `getExerciseUsage` can join to: both ids live inside a
    // JSON blob in `user_preferences`. Delete the movement and the swapped slot silently reverts
    // to the template's, while the oath loses its name and can never progress again.
    const swapped = await createUserExercise(draft("Swapped In"));
    await saveQuestConfig(1, { level: "medium", swaps: { "7": swapped } });
    expect((await getExerciseUsage(swapped)).preferenceRows).toBe(1);
    await expect(deleteUserExercise(swapped)).rejects.toThrow(/in use/i);

    const sworn = await createUserExercise(draft("Sworn On"));
    await swearOath({ metric: "exercise_volume", target: 100, exerciseId: sworn });
    expect((await getExerciseUsage(sworn)).preferenceRows).toBe(1);
    await expect(deleteUserExercise(sworn)).rejects.toThrow(/in use/i);
  });

  test("an exercise with history is refused for deletion", async () => {
    const { createUserExercise, deleteUserExercise, getExerciseUsage } =
      require("../db/exercises") as typeof import("../db/exercises");

    // Tagged, so its volume really is in the totals the retirement must not disturb.
    const id = await createUserExercise({ ...draft("Horse Stance"), muscles: ["legs"] });
    recordOneResult(id);

    expect((await getExerciseUsage(id)).completedRows).toBe(1);
    await expect(deleteUserExercise(id)).rejects.toThrow(/in use/i);
  });

  test("retiring hides the movement from pickers and keeps every reader of history intact", async () => {
    const { listExercises, pickableExercises, retireUserExercise } =
      require("../db/exercises") as typeof import("../db/exercises");
    const { getMuscleBalance } =
      require("../db/muscleBalance") as typeof import("../db/muscleBalance");
    const { clearShortLivedQueries } =
      require("../db/queryCache") as typeof import("../db/queryCache");

    const before = await listExercises();
    const horseStance = before.find((e) => e.enName === "Horse Stance");
    assert(horseStance);

    clearShortLivedQueries();
    const volumeBefore = (await getMuscleBalance("all")).totalVolume;

    await retireUserExercise(horseStance.id);

    const after = await listExercises();
    const retired = after.find((e) => e.id === horseStance.id);
    // Still in the list every quest, adventure and journal screen resolves ids against…
    expect(retired?.retiredAt).toBeInstanceOf(Date);
    // …and gone from the one place the hero chooses.
    expect(pickableExercises(after).some((e) => e.id === horseStance.id)).toBe(false);

    clearShortLivedQueries();
    // The whole point: retiring is not a retroactive edit of what the hero did.
    expect((await getMuscleBalance("all")).totalVolume).toBe(volumeBefore);
  });

  test("a retired movement can be put back", async () => {
    const { listExercises, pickableExercises, unretireUserExercise } =
      require("../db/exercises") as typeof import("../db/exercises");

    const before = await listExercises();
    const retired = before.find((e) => e.enName === "Horse Stance");
    assert(retired);
    expect(retired.retiredAt).toBeInstanceOf(Date);

    await unretireUserExercise(retired.id);

    const after = await listExercises();
    expect(after.find((e) => e.id === retired.id)?.retiredAt).toBeNull();
    // The whole point: it is choosable again, so "Retire" is a door that opens both ways.
    expect(pickableExercises(after).some((e) => e.id === retired.id)).toBe(true);
  });

  test("seed content cannot be un-retired either", async () => {
    const { listExercises, unretireUserExercise } =
      require("../db/exercises") as typeof import("../db/exercises");

    const all = await listExercises();
    const squat = all.find((e) => e.enName === "Squat" && e.creator === "Admin");
    assert(squat);

    await expect(unretireUserExercise(squat.id)).rejects.toThrow(/not hero-authored/i);
  });

  test("a quest slot whose quest is gone does not keep a movement alive", async () => {
    const { createUserExercise, deleteUserExercise, getExerciseById, getExerciseUsage } =
      require("../db/exercises") as typeof import("../db/exercises");

    const id = await createUserExercise(draft("Orphan Test"));

    // Exactly what a deleted quest leaves behind on a phone: foreign keys are OFF there
    // (db/client.ts issues no PRAGMA), so `ON DELETE CASCADE` does nothing and the slot
    // outlives its quest. Counting it would strand the movement as "in use" by a quest that
    // does not exist — undeletable, forever, with nothing on screen to explain why.
    // This database is stricter than a phone and would refuse the orphan outright, which is
    // precisely why it cannot be the evidence — drop the constraint for one statement to get
    // the row a device really holds.
    t.sqlite.pragma("foreign_keys = OFF");
    t.sqlite
      .prepare(
        `INSERT INTO quest_exercises (questId, exerciseId, sortOrder, targetType, targetMin, targetMax)
         VALUES (99999, ?, 0, 'reps', 10, 10)`,
      )
      .run(id);
    t.sqlite.pragma("foreign_keys = ON");

    expect(await getExerciseUsage(id)).toEqual({
      completedRows: 0,
      questRows: 0,
      preferenceRows: 0,
    });

    await deleteUserExercise(id);
    expect(await getExerciseById(id)).toBeNull();

    // …and takes the dead slot with it, rather than leaving litter a phone cannot clean up.
    const leftover = t.sqlite
      .prepare("SELECT COUNT(*) AS n FROM quest_exercises WHERE exerciseId = ?")
      .get(id) as { n: number };
    expect(leftover.n).toBe(0);
  });
});
