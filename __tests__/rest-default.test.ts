import assert from "node:assert/strict";

import { REST_RANGE } from "@/db/targets";
import { clientMock, createTestDb } from "./helpers/testDb";

/**
 * The rest between exercises a hero asked for in Settings, read through every door that builds a
 * quest. Asserts the quest a session is started from (`Quest.restSeconds` is what
 * `advanceAfterSet` hands the rest timer), not a screen: Home, the quest screen's loader and the
 * gallery estimate must agree, and a quest the hero tuned keeps its own number.
 */
const t = createTestDb();

jest.resetModules();
jest.doMock("../db/client", () => clientMock(t));

const { loadConfiguredQuest, saveQuestConfig } =
  require("../db/questConfig") as typeof import("../db/questConfig");
const { preferences } = require("../db/preferences") as typeof import("../db/preferences");
const quests = require("../db/quests") as typeof import("../db/quests");

afterEach(() => {
  t.sqlite.exec(
    "DELETE FROM user_preferences WHERE key LIKE 'quest:%:config' OR key = 'restDefault'",
  );
  quests.invalidateQuestTemplates();
});
afterAll(() => t.close());

async function restingQuest() {
  const found = (await quests.listQuestTemplates()).find(
    (q) => q.restSeconds > 0 && q.restSeconds !== 20 && q.author === "Admin" && q.archetype,
  );
  assert(found);
  return found;
}

test("with no setting the template's own rest runs", async () => {
  const q = await restingQuest();
  expect((await loadConfiguredQuest(q.id))?.quest.restSeconds).toBe(q.restSeconds);
  expect(await preferences.getRestDefault()).toBeNull();
});

test("the setting reaches Home's loader, the quest screen's read and the gallery", async () => {
  const q = await restingQuest();
  await quests.setRestDefault(20);

  expect((await loadConfiguredQuest(q.id))?.quest.restSeconds).toBe(20);
  expect((await quests.getQuestById(q.id, "medium"))?.restSeconds).toBe(20);
  expect((await quests.getQuestTemplateById(q.id))?.restSeconds).toBe(20);
  expect((await quests.listQuestTemplates()).find((x) => x.id === q.id)?.restSeconds).toBe(20);
});

test("the rest between rounds is not moved", async () => {
  const q = await restingQuest();
  const before = (await loadConfiguredQuest(q.id))?.quest;
  assert(before);
  await quests.setRestDefault(20);
  const after = (await loadConfiguredQuest(q.id))?.quest;
  assert(after);
  expect(after.roundRestSeconds ?? after.restSeconds).toBe(
    before.roundRestSeconds ?? before.restSeconds,
  );
});

test("a quest the hero tuned keeps its own rest", async () => {
  const q = await restingQuest();
  await saveQuestConfig(q.id, { level: "medium", restSeconds: 75 });
  await quests.setRestDefault(20);
  expect((await loadConfiguredQuest(q.id))?.quest.restSeconds).toBe(75);
});

test("a quest the hero wrote and a quest with no rest are left alone", async () => {
  const q = await restingQuest();
  t.sqlite.prepare("UPDATE quests SET author = 'hero' WHERE id = ?").run(q.id);
  quests.invalidateQuestTemplates();
  await quests.setRestDefault(20);
  expect((await loadConfiguredQuest(q.id))?.quest.restSeconds).toBe(q.restSeconds);
  t.sqlite.prepare("UPDATE quests SET author = 'Admin' WHERE id = ?").run(q.id);

  t.sqlite.prepare("UPDATE quests SET restSeconds = 0 WHERE id = ?").run(q.id);
  quests.invalidateQuestTemplates();
  expect((await loadConfiguredQuest(q.id))?.quest.restSeconds).toBe(0);
  t.sqlite.prepare("UPDATE quests SET restSeconds = ? WHERE id = ?").run(q.restSeconds, q.id);
});

test("the stored value is clamped to the range and null clears it", async () => {
  await quests.setRestDefault(9999);
  expect(await preferences.getRestDefault()).toBe(REST_RANGE.max);
  await quests.setRestDefault(null);
  expect(await preferences.getRestDefault()).toBeNull();
});
