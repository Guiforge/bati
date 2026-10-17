import assert from "node:assert/strict";

import { clientMock, createTestDb } from "./helpers/testDb";

/**
 * M-03, "Fini quand", on a real database and through the path the app calls
 * (`loadConfiguredQuest`, which Home and the quest screen both start a session from).
 *
 * The slots are on quests written here, with a band whose middle at medium is 12, so the first
 * session is served 12 and "12 met gives 13" is the progression and not the band.
 */
const t = createTestDb();

jest.resetModules();
jest.doMock("../db/client", () => clientMock(t));

const { loadConfiguredQuest, saveQuestConfig, getQuestConfig } =
  require("../db/questConfig") as typeof import("../db/questConfig");

const DAY = 86_400;
const NOW = Math.floor(Date.now() / 1000);

function idOf(enName: string): number {
  return (
    t.sqlite.prepare("SELECT id FROM exercises WHERE enName = ?").get(enName) as { id: number }
  ).id;
}
const CRUNCH = idOf("Crunch");
const JACK = idOf("Jumping Jack");
const SKATER = idOf("Skater Hop");
const HOLD = (
  t.sqlite
    .prepare(
      "SELECT id FROM exercises WHERE measure = 'time' AND prerequisiteExerciseId IS NULL AND creator = 'Admin' AND style != 'expedition' LIMIT 1",
    )
    .get() as { id: number }
).id;

/** A quest of one slot. Returns the quest id and the slot's id. */
function quest(
  title: string,
  exerciseId: number,
  type: "reps" | "time",
  min: number,
  max: number,
  author = "Admin",
): { questId: number; slot: number } {
  const info = t.sqlite
    .prepare(
      "INSERT INTO quests (enTitle, frTitle, enDescription, frDescription, author) VALUES (?, ?, '', '', ?)",
    )
    .run(title, title, author);
  const questId = Number(info.lastInsertRowid);
  const slot = Number(
    t.sqlite
      .prepare(
        "INSERT INTO quest_exercises (questId, exerciseId, sortOrder, targetType, targetMin, targetMax) VALUES (?, ?, 0, ?, ?, ?)",
      )
      .run(questId, exerciseId, type, min, max).lastInsertRowid,
  );
  return { questId, slot };
}

/** One session, one row per entry of `results`, all prescribed `prescribed`. */
function play(
  questId: number | null,
  exerciseId: number,
  results: number[],
  prescribed: number,
  secondsAgo: number,
  type: "reps" | "time" = "reps",
): void {
  const at = NOW - secondsAgo;
  const sessionId = Number(
    t.sqlite
      .prepare(
        "INSERT INTO completed_sessions (questId, userLevel, xpEarned, performedAt) VALUES (?, 'medium', 10, ?)",
      )
      .run(questId, at).lastInsertRowid,
  );
  const row = t.sqlite.prepare(
    `INSERT INTO completed_exercises
       (sessionId, exerciseId, roundIndex, sortOrder, resultType, resultValue, targetType,
        targetValue, prescribedValue, performedAt)
     VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?, ?)`,
  );
  results.forEach((value, round) => {
    row.run(sessionId, exerciseId, round, type, value, type, prescribed, prescribed, at);
  });
}

/** What tonight's slot asks, from the path the app calls. */
async function asked(questId: number, slotId?: number): Promise<number | undefined> {
  const loaded = await loadConfiguredQuest(questId, "medium");
  assert(loaded);
  const slot =
    slotId === undefined
      ? loaded.quest.exercises[0]
      : loaded.quest.exercises.find((e) => e.id === slotId);
  return slot?.target.value;
}

beforeEach(() => {
  t.sqlite.exec("DELETE FROM completed_exercises; DELETE FROM completed_sessions");
  t.sqlite.exec("DELETE FROM user_preferences WHERE key LIKE 'quest:%'");
});

afterAll(() => t.close());

test("a quest nobody played yet asks the middle of its band", async () => {
  const { questId } = quest("Band", CRUNCH, "reps", 10, 14);
  expect(await asked(questId)).toBe(12);
});

test("12 met on every set asks 13, and one set missed asks 12", async () => {
  const { questId } = quest("Twelve", CRUNCH, "reps", 10, 14);
  play(null, CRUNCH, [12, 12, 12], 12, 2 * DAY);
  expect(await asked(questId)).toBe(13);

  t.sqlite.exec("DELETE FROM completed_exercises; DELETE FROM completed_sessions");
  play(null, CRUNCH, [12, 11, 12], 12, 2 * DAY);
  expect(await asked(questId)).toBe(12);
});

test("a number the hero set is never overwritten, and the app's line climbs under it", async () => {
  const { questId, slot } = quest("Own", CRUNCH, "reps", 10, 14);
  await saveQuestConfig(questId, { level: "medium", targets: { [slot]: 10 } });
  play(null, CRUNCH, [12, 12, 12], 12, 2 * DAY);
  const before = await getQuestConfig(questId);

  const loaded = await loadConfiguredQuest(questId, "medium");
  assert(loaded);
  const out = loaded.quest.exercises[0];
  assert(out);
  expect(out.target.value).toBe(10);
  expect(out.prescribed).toBe(13);
  expect(out.targetWhy).toBeUndefined();
  expect(await getQuestConfig(questId)).toEqual(before);
});

test("a hold is never lowered and gains 5 s per met session, whatever its record", async () => {
  const { questId } = quest("Hold", HOLD, "time", 30, 45);
  // The record is 30 s, set at its last target: no max effort is marked, so no 75 % cap applies.
  play(null, HOLD, [30], 30, 6 * DAY, "time");
  let previous = 30;
  for (let n = 5; n > 0; n--) {
    const value = await asked(questId);
    assert(value !== undefined);
    expect(value).toBe(previous + 5);
    previous = value;
    play(null, HOLD, [value], value, n * DAY, "time");
  }
});

test("15 days without the movement lowers the next two sessions, the third is back", async () => {
  const { questId } = quest("Comeback", CRUNCH, "reps", 10, 14);
  play(null, CRUNCH, [12, 12], 12, 15 * DAY);
  expect(await asked(questId)).toBe(9);

  play(null, CRUNCH, [9, 9], 9, 3600);
  expect(await asked(questId)).toBe(10);

  play(null, CRUNCH, [10, 10], 10, 1800);
  expect(await asked(questId)).toBe(12);
});

test("14 days away is not a comeback", async () => {
  const { questId } = quest("Fourteen", CRUNCH, "reps", 10, 14);
  play(null, CRUNCH, [12], 12, 14 * DAY - 3600);
  expect(await asked(questId)).toBe(13);
});

test("a swap onto a movement never done starts at the bottom of the band, then progresses", async () => {
  const { questId, slot } = quest("Swap", JACK, "reps", 8, 12);
  await saveQuestConfig(questId, { level: "medium", swaps: { [slot]: SKATER } });
  expect(await asked(questId, slot)).toBe(8);

  play(null, SKATER, [8, 8], 8, 2 * DAY);
  expect(await asked(questId, slot)).toBe(9);
});

test("one movement, one progression, but every quest keeps inside its own band", async () => {
  const big = quest("Big", CRUNCH, "reps", 20, 25);
  const small = quest("Small", CRUNCH, "reps", 12, 16);
  play(big.questId, CRUNCH, [22, 22], 22, 2 * DAY);
  expect(await asked(small.questId)).toBe(20);

  // A hero's own quest writes its numbers in the same journal and never leaks into the app's.
  const mine = quest("Mine", CRUNCH, "reps", 50, 50, "hero");
  play(mine.questId, CRUNCH, [50, 50], 50, 3600);
  expect(await asked(small.questId)).toBe(20);
  expect(await asked(mine.questId)).toBe(50);
});

test("a deleted hero quest's 50 is bounded by the band on a comeback", async () => {
  const small = quest("Small", CRUNCH, "reps", 12, 16);
  // questId NULL: the quest was deleted, so the session reads as a seeded one.
  play(null, CRUNCH, [50], 50, 15 * DAY);
  expect(await asked(small.questId)).toBeLessThanOrEqual(20);
});
