import assert from "node:assert/strict";

import { FIRST_QUEST_TITLE } from "@/constants/onboarding";
import { Difficulty } from "@/db/targets";
import { clientMock, createTestDb } from "./helpers/testDb";

/**
 * The level a quest starts at when the hero never configured it (docs/gameplay/progression.md).
 *
 * Onboarding hard-coded Easy and Home defaulted to Medium, so the same first quest asked 8 wall
 * push-ups by one door and 10 by the other, whatever the hero had answered
 * (docs/design/audits/2026-10-11-onboarding.md, B3). One rule now, and every door loads through
 * `loadConfiguredQuest`.
 */
const t = createTestDb();

jest.resetModules();
jest.doMock("../db/client", () => clientMock(t));

const { isStartingOut, loadConfiguredQuest, loadDefaultLevels, startingDifficulty } =
  require("../db/questConfig") as typeof import("../db/questConfig");
const { preferences } = require("../db/preferences") as typeof import("../db/preferences");
const quests = require("../db/quests") as typeof import("../db/quests");
const outings = require("../db/outings") as typeof import("../db/outings");

afterEach(() => {
  t.sqlite.exec("DELETE FROM completed_sessions");
  t.sqlite.exec("DELETE FROM user_preferences WHERE key = 'trainingLevel'");
});

afterAll(() => t.close());

async function firstQuestId(): Promise<number> {
  const match = (await quests.listQuestTemplates()).find((q) => q.enTitle === FIRST_QUEST_TITLE);
  assert(match);
  return match.id;
}

function played(questId: number, level: string, daysAgo: number): void {
  const at = Math.floor(Date.now() / 1000) - daysAgo * 24 * 60 * 60;
  t.sqlite
    .prepare(
      "INSERT INTO completed_sessions (questId, userLevel, xpEarned, performedAt) VALUES (?, ?, 10, ?)",
    )
    .run(questId, level, at);
}

test("the rule: no answer and beginner start Easy, the rest Medium, never Hard", () => {
  expect(startingDifficulty(null, 0)).toBe(Difficulty.Easy);
  expect(startingDifficulty("beginner", 0)).toBe(Difficulty.Easy);
  expect(startingDifficulty("regular", 0)).toBe(Difficulty.Medium);
  // An answer stored before the question had two choices.
  expect(startingDifficulty("advanced", 0)).toBe(Difficulty.Medium);
});

// The question is recent and skippable: a hero who was here before it, or skipped it long ago,
// has no answer and two hundred sessions. An update must not read them as a beginner.
test("no answer stops meaning 'starting' once the journal is no longer short", () => {
  expect(isStartingOut(null, 4)).toBe(true);
  expect(isStartingOut(null, 5)).toBe(false);
  expect(startingDifficulty(null, 200)).toBe(Difficulty.Medium);
  // An answer is an answer, however long ago.
  expect(isStartingOut("beginner", 200)).toBe(true);
  expect(isStartingOut("regular", 0)).toBe(false);
});

test("a settled hero with no answer keeps Medium on a quest never played", async () => {
  const id = await firstQuestId();
  const other = (await quests.listQuestTemplates()).find((q) => q.id !== id);
  assert(other);
  for (const day of [1, 2, 3, 4, 5]) played(other.id, "medium", day);

  expect((await loadConfiguredQuest(id))?.level).toBe(Difficulty.Medium);
});

// Easy is three quarters of the written numbers: on a quest the hero wrote, "12 squats" opened
// at 9.
test("a quest the hero wrote starts as written, whatever they answered", async () => {
  await preferences.setTrainingLevel("beginner");
  const id = await firstQuestId();
  t.sqlite.prepare("UPDATE quests SET author = 'hero' WHERE id = ?").run(id);
  quests.invalidateQuestTemplates();

  expect((await loadDefaultLevels())(id)).toBe(Difficulty.Medium);

  t.sqlite.prepare("UPDATE quests SET author = 'Admin' WHERE id = ?").run(id);
  quests.invalidateQuestTemplates();
});

test("the first quest starts at the level the answer asks for", async () => {
  const id = await firstQuestId();

  expect((await loadConfiguredQuest(id))?.level).toBe(Difficulty.Easy);

  await preferences.setTrainingLevel("beginner");
  const gentle = await loadConfiguredQuest(id);
  expect(gentle?.level).toBe(Difficulty.Easy);

  await preferences.setTrainingLevel("regular");
  const standard = await loadConfiguredQuest(id);
  expect(standard?.level).toBe(Difficulty.Medium);

  // And the level is the dose, not a label beside it.
  const reps = (loaded: typeof gentle) => loaded?.quest.exercises.map((qex) => qex.target.value);
  expect(reps(gentle)).not.toEqual(reps(standard));
});

test("a quest already played restarts where the hero last played it", async () => {
  const id = await firstQuestId();
  await preferences.setTrainingLevel("beginner");
  played(id, "hard", 9);
  played(id, "medium", 2);

  expect((await loadConfiguredQuest(id))?.level).toBe(Difficulty.Medium);
  // The answer changing later moves the quests never played, not this one.
  await preferences.setTrainingLevel("regular");
  played(id, "easy", 0);
  expect((await loadDefaultLevels())(id)).toBe(Difficulty.Easy);
});

test("an outing has no level: a beginner's walk is still Medium", async () => {
  await preferences.setTrainingLevel("beginner");
  // A real door out, from the same list Home's band reads.
  const [door] = await outings.listOutings();
  assert(door);

  expect((await loadConfiguredQuest(door.quest.id))?.level).toBe(Difficulty.Medium);
});
