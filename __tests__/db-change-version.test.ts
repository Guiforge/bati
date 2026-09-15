import assert from "node:assert/strict";

import { clientMock, createTestDb } from "./helpers/testDb";

// Home re-reads only when `getChangeVersion` moves. Two things make that safe, and both are held
// here against the real schema: every write Home displays moves it, and Home's own reads do not,
// or it would move on every focus and gate nothing.
const t = createTestDb();
jest.doMock("../db/client", () => clientMock(t));

const { getChangeVersion } = require("../db/changeVersion") as typeof import("../db/changeVersion");
const adventures = require("../db/adventures") as typeof import("../db/adventures");
const { listExercises, getChainTo } =
  require("../db/exercises") as typeof import("../db/exercises");
const { toggleFavouriteQuest } = require("../db/favourites") as typeof import("../db/favourites");
const { getSuggestedQuestsForWeakAreas } =
  require("../db/muscleBalance") as typeof import("../db/muscleBalance");
const oaths = require("../db/oaths") as typeof import("../db/oaths");
const { listOutings } = require("../db/outings") as typeof import("../db/outings");
const { preferences } = require("../db/preferences") as typeof import("../db/preferences");
const { previewOutingGoal } = require("../db/preview") as typeof import("../db/preview");
const questConfig = require("../db/questConfig") as typeof import("../db/questConfig");
const { findQuestWithExercise, listQuestTemplates } =
  require("../db/quests") as typeof import("../db/quests");
const { getRestSuggestion } =
  require("../db/restSuggestions") as typeof import("../db/restSuggestions");
const { getStreakInfo } = require("../db/streaks") as typeof import("../db/streaks");
const { getUserLevelInfo } = require("../db/userLevel") as typeof import("../db/userLevel");
const { getRecentSessionHistory } = require("../db/completed") as typeof import("../db/completed");
const { outingGoal } = require("../db/expeditions") as typeof import("../db/expeditions");

/** Everything Home's focus effects read, in one pass. */
async function readHome(): Promise<void> {
  const [exercises] = await Promise.all([
    listExercises(),
    getUserLevelInfo(),
    getStreakInfo(),
    getRestSuggestion(),
    getSuggestedQuestsForWeakAreas(1),
    getRecentSessionHistory(1),
    questConfig.getAllQuestConfigs(),
    preferences.getGuidesSeen(),
  ]);
  const oath = await oaths.getOathProgress();
  if (oath?.oath.exerciseId != null) await getChainTo(oath.oath.exerciseId);
  const active = await adventures.getAnyActiveAdventureRun();
  if (active) await adventures.getAdventureDetails(active.adventureId);
  const pushUp = exercises.find((e) => e.enName === "Push-ups");
  if (pushUp) await findQuestWithExercise(pushUp.id);
  for (const { quest } of await listOutings()) await questConfig.loadConfiguredQuest(quest.id);
  const [first] = await listQuestTemplates();
  if (first) await questConfig.loadConfiguredQuest(first.id);
}

function logSession(): void {
  t.sqlite.exec(
    `INSERT INTO completed_sessions (userLevel, xpEarned, performedAt)
     VALUES ('medium', 40, ${Math.floor(Date.now() / 1000)})`,
  );
}

test("Home's reads leave the version where it was, once the day's caches are written", async () => {
  logSession();
  // The first pass may write the streak cache, which is one extra reload per change and no more.
  await readHome();
  const warm = await getChangeVersion();
  await readHome();
  expect(await getChangeVersion()).toBe(warm);
});

test("every write Home shows moves the version", async () => {
  const [quest] = await listQuestTemplates();
  assert(quest);
  const [adventure] = await adventures.listAdventures();
  assert(adventure);
  const pushUp = (await listExercises()).find((e) => e.enName === "Push-ups");
  assert(pushUp);

  const writes: [string, () => Promise<unknown>][] = [
    ["a session", async () => logSession()],
    [
      "an oath",
      () => oaths.swearOath({ metric: "exercise_pr", target: 20, exerciseId: pushUp.id }),
    ],
    ["a quest config", () => questConfig.saveQuestConfig(quest.id, { level: "hard" })],
    ["a favourite", () => toggleFavouriteQuest(quest.id)],
    ["an adventure", () => adventures.startAdventureRun({ adventureId: adventure.id })],
    ["the language", () => preferences.setLanguage("de")],
  ];
  for (const [what, write] of writes) {
    const before = await getChangeVersion();
    await write();
    expect([what, await getChangeVersion()]).not.toEqual([what, before]);
  }
});

test("a way out's tile says the goal its tap runs, with and without a saved one", async () => {
  const outings = await listOutings();
  expect(outings.length).toBeGreaterThan(0);
  const exercisesById = questConfig.indexExercises(await listExercises());

  for (const { quest } of outings) {
    const slot = quest.exercises[0];
    assert(slot);
    for (const saved of [null, { level: "hard" as const, targets: { [String(slot.id)]: 1800 } }]) {
      if (saved) await questConfig.saveQuestConfig(quest.id, saved);
      else await questConfig.clearQuestConfig(quest.id);

      const loaded = await questConfig.loadConfiguredQuest(quest.id, "medium");
      assert(loaded);
      expect(previewOutingGoal(quest, exercisesById, saved)).toEqual(
        outingGoal(loaded.quest, loaded.config?.distanceM ?? null),
      );
    }
  }
});
