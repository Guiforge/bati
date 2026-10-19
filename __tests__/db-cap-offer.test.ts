import assert from "node:assert/strict";

import type { QuestExercise } from "@/db/quests";
import { clientMock, createTestDb } from "./helpers/testDb";

/**
 * "Plafond puis échelon": three sessions at the cap, and the rung above on offer in one tap.
 * Crunch (id 6) opens two movements, Russian Twist (30) and Reverse Crunch (41), which is what
 * the fork fallbacks are tested on.
 */
const t = createTestDb();

jest.resetModules();
jest.doMock("../db/client", () => clientMock(t));

const { checkCapOffers, acceptCapOffer } =
  require("../db/capOffer") as typeof import("../db/capOffer");
const { getQuestConfig, saveQuestConfig } =
  require("../db/questConfig") as typeof import("../db/questConfig");
const { preferences } = require("../db/preferences") as typeof import("../db/preferences");
const { listExercises } = require("../db/exercises") as typeof import("../db/exercises");

const DAY = 86_400;
const NOW = Math.floor(Date.now() / 1000);
const CRUNCH = 6;
const TWIST = 30;
const REVERSE = 41;
const HANGING_LEG_RAISE = 39;

function quest(author = "Admin", exerciseId = CRUNCH): { questId: number; slot: number } {
  const questId = Number(
    t.sqlite
      .prepare(
        "INSERT INTO quests (enTitle, frTitle, enDescription, frDescription, author) VALUES ('Q', 'Q', '', '', ?)",
      )
      .run(author).lastInsertRowid,
  );
  const slot = Number(
    t.sqlite
      .prepare(
        "INSERT INTO quest_exercises (questId, exerciseId, sortOrder, targetType, targetMin, targetMax) VALUES (?, ?, 0, 'reps', 15, 25)",
      )
      .run(questId, exerciseId).lastInsertRowid,
  );
  return { questId, slot };
}

/** `n` sessions of Crunch, newest first by day, each prescribed 20; `missed` sessions miss. */
function sessions(questId: number, n: number, missed: number[] = [], exerciseId = CRUNCH): void {
  for (let i = 0; i < n; i++) {
    const at = NOW - (i + 1) * DAY;
    const id = Number(
      t.sqlite
        .prepare(
          "INSERT INTO completed_sessions (questId, userLevel, xpEarned, performedAt) VALUES (?, 'medium', 10, ?)",
        )
        .run(questId, at).lastInsertRowid,
    );
    t.sqlite
      .prepare(
        `INSERT INTO completed_exercises
           (sessionId, exerciseId, roundIndex, sortOrder, resultType, resultValue, targetType,
            targetValue, prescribedValue, performedAt)
         VALUES (?, ?, 0, 0, 'reps', ?, 'reps', 20, 20, ?)`,
      )
      .run(id, exerciseId, missed.includes(i) ? 19 : 20, at);
  }
}

async function slotOf(slotId: number, over: Partial<QuestExercise> = {}, exerciseId = CRUNCH) {
  const exercise = (await listExercises()).find((e) => e.id === exerciseId);
  assert(exercise);
  return { id: slotId, exercise, target: { type: "reps" as const, value: 20 }, ...over };
}

beforeEach(async () => {
  t.sqlite.exec(
    "DELETE FROM completed_exercises; DELETE FROM completed_sessions; DELETE FROM user_preferences WHERE key LIKE 'quest:%'",
  );
  await preferences.setOwnedEquipment(null);
  await preferences.setSetAsideExercises([]);
});

afterAll(() => t.close());

test("three sessions at 20 met offer the rung above", async () => {
  const { questId, slot } = quest();
  sessions(questId, 3);
  const offers = await checkCapOffers(questId, [await slotOf(slot)], "medium");
  expect(offers).toHaveLength(1);
  expect(offers[0]).toMatchObject({
    questId,
    questExerciseId: slot,
    from: { id: CRUNCH },
    next: { id: TWIST },
    type: "reps",
    value: 20,
  });
});

test("a series of three offers once: not on the 4th or 5th session, again on the 6th", async () => {
  const { questId, slot } = quest();
  const offered = async (n: number) => {
    t.sqlite.exec("DELETE FROM completed_exercises; DELETE FROM completed_sessions");
    sessions(questId, n);
    return (await checkCapOffers(questId, [await slotOf(slot)], "medium")).length;
  };
  expect(await offered(3)).toBe(1);
  expect(await offered(4)).toBe(0);
  expect(await offered(5)).toBe(0);
  expect(await offered(6)).toBe(1);
  expect(await offered(9)).toBe(1);
});

test("a miss starts the count over", async () => {
  const { questId, slot } = quest();
  sessions(questId, 6, [3]);
  // Newest first: three clean sessions, then the miss.
  expect(await checkCapOffers(questId, [await slotOf(slot)], "medium")).toHaveLength(1);
  t.sqlite.exec("DELETE FROM completed_exercises; DELETE FROM completed_sessions");
  sessions(questId, 6, [2]);
  expect(await checkCapOffers(questId, [await slotOf(slot)], "medium")).toEqual([]);
});

test("two sessions, or a miss among the three, offer nothing", async () => {
  const { questId, slot } = quest();
  sessions(questId, 2);
  expect(await checkCapOffers(questId, [await slotOf(slot)], "medium")).toEqual([]);

  t.sqlite.exec("DELETE FROM completed_exercises; DELETE FROM completed_sessions");
  sessions(questId, 3, [1]);
  expect(await checkCapOffers(questId, [await slotOf(slot)], "medium")).toEqual([]);
});

test("no offer when the slot stands on an easier rung of its written movement", async () => {
  const { questId, slot } = quest();
  sessions(questId, 3);
  const stepped = await slotOf(slot, {
    substitutedFor: { id: 1, enName: "Squat", frName: "", deName: "", esName: "", imagePath: "" },
  });
  expect(await checkCapOffers(questId, [stepped], "medium")).toEqual([]);
});

test("no offer on a hero-authored quest", async () => {
  const { questId, slot } = quest("hero");
  sessions(questId, 3);
  expect(await checkCapOffers(questId, [await slotOf(slot)], "medium")).toEqual([]);
});

test("no offer when the config already swaps the slot to the successor", async () => {
  const { questId, slot } = quest();
  sessions(questId, 3);
  await saveQuestConfig(questId, { level: "medium", swaps: { [slot]: TWIST } });
  expect(await checkCapOffers(questId, [await slotOf(slot)], "medium")).toEqual([]);
});

test("the successor is filtered by the kit the hero owns", async () => {
  // Reverse Crunch opens one movement, Hanging Leg Raise, which wants a pull-up bar.
  const { questId, slot } = quest("Admin", REVERSE);
  sessions(questId, 3, [], REVERSE);
  const reverse = await slotOf(slot, {}, REVERSE);

  await preferences.setOwnedEquipment([]);
  expect(await checkCapOffers(questId, [reverse], "medium")).toEqual([]);

  await preferences.setOwnedEquipment(["pullup_bar"]);
  const [offer] = await checkCapOffers(questId, [reverse], "medium");
  expect(offer?.next.id).toBe(HANGING_LEG_RAISE);
});

test("a set-aside successor gives way to the fork's other branch, and to nothing", async () => {
  const { questId, slot } = quest();
  sessions(questId, 3);

  await preferences.setSetAsideExercises([{ id: TWIST, at: Date.now() }]);
  const [viaAside] = await checkCapOffers(questId, [await slotOf(slot)], "medium");
  expect(viaAside?.next.id).toBe(REVERSE);

  await preferences.setSetAsideExercises([
    { id: TWIST, at: Date.now() },
    { id: REVERSE, at: Date.now() },
  ]);
  expect(await checkCapOffers(questId, [await slotOf(slot)], "medium")).toEqual([]);
});

test("the tap writes the swap and drops the target tuned for the old movement", async () => {
  const { questId, slot } = quest();
  sessions(questId, 3);
  await saveQuestConfig(questId, { level: "hard", targets: { [slot]: 18 }, rounds: 4 });
  const [offer] = await checkCapOffers(questId, [await slotOf(slot)], "medium");
  assert(offer);

  await acceptCapOffer(offer);

  expect(await getQuestConfig(questId)).toEqual({
    level: "hard",
    rounds: 4,
    swaps: { [String(slot)]: TWIST },
  });
});

test("with no config yet the swap is saved at the level the session was played at", async () => {
  const { questId, slot } = quest();
  sessions(questId, 3);
  const [offer] = await checkCapOffers(questId, [await slotOf(slot)], "easy");
  assert(offer);

  await acceptCapOffer(offer);

  expect(await getQuestConfig(questId)).toEqual({
    level: "easy",
    swaps: { [String(slot)]: TWIST },
  });
});

test("the config is read when the hero taps, not when the offer was made", async () => {
  const { questId, slot } = quest();
  sessions(questId, 3);
  const [offer] = await checkCapOffers(questId, [await slotOf(slot)], "medium");
  assert(offer);

  // Changed after the offer, before the tap.
  await saveQuestConfig(questId, { level: "medium", rounds: 5 });
  await acceptCapOffer(offer);

  expect(await getQuestConfig(questId)).toMatchObject({
    rounds: 5,
    swaps: { [String(slot)]: TWIST },
  });
});
