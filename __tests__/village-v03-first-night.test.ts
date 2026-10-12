/**
 * @jest-environment ./__tests__/helpers/timezoneEnvironment.js
 * @jest-environment-options {"timezone": "Europe/Paris"}
 */
import assert from "node:assert/strict";

import { GOLDEN_NOW, pinClock } from "./helpers/goldenHero";
import { clientMock, createTestDb } from "./helpers/testDb";

jest.mock("@/src/widget", () => ({ requestWidgetsUpdate: jest.fn().mockResolvedValue(undefined) }));

/**
 * The first victory after the update, for a veteran: V-03 lifts the starter buildings' ceiling from
 * rank 5 to rank 10, so a three-year hero (level 34) is at rank 8 where V-02 showed 5.
 *
 * Nothing stores the old ranks. `saveSession` reads the buildings before the session lands and
 * again after, both from the journal and today's rules (`getVillageBuildings`), so the lift is in
 * both reads and cancels out of the diff. These tests drive the real `saveSession` on a real
 * database with the golden hero's history and read what "Tonight" would list (`tonight`).
 */

/** A level-34 hero's evening: shown = what this phone has shown before the update. */
async function firstNight(opts: { shown: string[]; levelBefore?: number }) {
  const t = createTestDb();
  jest.resetModules();
  jest.doMock("../db/client", () => clientMock(t));
  pinClock();
  try {
    const { seedHistory } =
      require("../db/devSeedHistory") as typeof import("../db/devSeedHistory");
    await seedHistory(3, Math.floor(GOLDEN_NOW / 1000));
    const { getXpForLevel, getTotalXp } =
      require("../db/userLevel") as typeof import("../db/userLevel");
    if (opts.levelBefore) {
      // One XP short of the next level, as a hero who has been training toward it would be.
      const gap = getXpForLevel(opts.levelBefore + 1) - 1 - (await getTotalXp());
      t.sqlite
        .prepare("INSERT INTO completed_sessions (xpEarned, performedAt) VALUES (?, ?)")
        .run(gap, Math.floor(GOLDEN_NOW / 1000) - 40 * 86400);
    }
    // The seed unlocks nothing; a real veteran unlocked these one night at a time, long ago.
    const { checkForNewAchievements } =
      require("../db/achievements") as typeof import("../db/achievements");
    await checkForNewAchievements({
      durationSeconds: 1200,
      xpEarned: 80,
      performedAt: new Date(GOLDEN_NOW - 86400_000),
      questId: null,
      outing: null,
    });
    const { preferences } = require("../db/preferences") as typeof import("../db/preferences");
    for (const id of opts.shown) await preferences.markBigFeastShown(id);

    const { getVillageBuildings } = require("../db/village") as typeof import("../db/village");
    const { clearShortLivedQueries } =
      require("../db/queryCache") as typeof import("../db/queryCache");
    clearShortLivedQueries();
    const buildingsBefore = await getVillageBuildings();

    const { getQuestById } = require("../db/quests") as typeof import("../db/quests");
    const quest = await getQuestById(1, "medium");
    assert(quest);
    const { useSessionStore } = require("../stores/session") as typeof import("../stores/session");
    await useSessionStore.getState().startSession(quest, "medium");
    // Every set done at its target, half an hour ago: an ordinary session.
    useSessionStore.setState({
      status: "finished",
      startTime: GOLDEN_NOW - 30 * 60 * 1000,
      results: Array.from({ length: quest.rounds }, (_, round) =>
        quest.exercises.map((slot, i) => ({
          exerciseId: slot.exercise.id,
          roundIndex: round,
          sortOrder: round * quest.exercises.length + i,
          result: { ...slot.target },
          target: { ...slot.target },
        })),
      ).flat(),
    });
    const result = await useSessionStore.getState().saveSession(null);
    const { tonight } =
      require("../components/session/feasts") as typeof import("../components/session/feasts");
    await new Promise((r) => setTimeout(r, 100));
    return { result, feasts: tonight(result), buildingsBefore };
  } finally {
    // resetModules re-installs Expo's lazy globals; resolve them here, inside the test scope (see jest.setup.ts).
    for (const name of [
      "fetch",
      "URL",
      "URLSearchParams",
      "TextDecoder",
      "TextDecoderStream",
      "TextEncoderStream",
      "DOMException",
      "structuredClone",
      "__ExpoImportMetaRegistry",
    ])
      (globalThis as Record<string, unknown>)[name];
    jest.useRealTimers();
    t.close();
  }
}

const kinds = (feasts: { kind: string }[]) => feasts.map((f) => f.kind);
const larges = (feasts: { size: string }[]) => feasts.filter((f) => f.size === "large");

describe("the first victory after the update, for a three-year veteran", () => {
  test("an ordinary session announces no starter building and no tier: the new ranks are in the 'before' too", async () => {
    // "reveal" is shown: a veteran saw it on an earlier version. Nothing else of V-03 was.
    const { result, feasts, buildingsBefore } = await firstNight({ shown: ["reveal"] });

    // Level 34 stands at rank 8 on the new ladder, and that is what the 'before' read says: it is
    // computed from the journal with today's rules, not read from V-02 (ceiling 5).
    const starters = buildingsBefore.filter((b) => b.tier === 1);
    expect(starters.map((b) => [b.code, b.level])).toEqual([
      ["campfire", 8],
      ["tent", 8],
      ["training_dummy", 8],
    ]);

    expect(result.levelUp).toBeNull();
    expect(result.tierUp).toBeNull();
    expect(result.villageGrowth).toEqual([]);
    // Two rows, one big: the village's third anniversary and the rare coat's card. No building line.
    expect(kinds(feasts)).toEqual(["anniversary", "coat"]);
    expect(larges(feasts)).toHaveLength(1);
    expect(feasts).toHaveLength(2);
  });

  test("on a phone that has shown nothing, the night is three rows with a single big feast", async () => {
    const { feasts } = await firstNight({ shown: [] });
    // The reveal takes the screen; the anniversary is demoted to a card, as `rankFeasts` does.
    expect(kinds(feasts)).toEqual(["reveal", "anniversary", "coat"]);
    expect(larges(feasts)).toHaveLength(1);
  });

  test("crossing level 50 lifts the three starters to rank 10: three lines, one Age, seven rows", async () => {
    const { result, feasts, buildingsBefore } = await firstNight({
      shown: ["reveal"],
      levelBefore: 49,
    });

    expect(buildingsBefore.filter((b) => b.tier === 1).map((b) => b.level)).toEqual([9, 9, 9]);
    expect(result.levelUp).toEqual({ oldLevel: 49, newLevel: 50 });
    // 50 is no tier floor (tier 12 begins at 40).
    expect(result.tierUp).toBeNull();
    expect(result.villageGrowth.map((g) => [g.code, g.oldLevel, g.newLevel])).toEqual([
      ["campfire", 9, 10],
      ["tent", 9, 10],
      ["training_dummy", 9, 10],
    ]);
    // Not grouped: one line per building. The Age of 50 is the one big feast.
    expect(kinds(feasts)).toEqual([
      "age",
      "level",
      "growth",
      "growth",
      "growth",
      "anniversary",
      "coat",
    ]);
    expect(larges(feasts)).toHaveLength(1);
    expect(feasts[0]?.kind).toBe("age");
  });
});
