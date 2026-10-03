/**
 * @jest-environment ./__tests__/helpers/timezoneEnvironment.js
 * @jest-environment-options {"timezone": "Europe/Paris"}
 */
import fs from "node:fs";
import path from "node:path";

import {
  figuresThatMoved,
  GOLDEN_NOW,
  type HeroNumbers,
  measureHero,
  measureRules,
  pinClock,
} from "./helpers/goldenHero";
import { clientMock, createTestDb } from "./helpers/testDb";

/**
 * The golden hero: three years of training, and every number the app shows about it, frozen.
 *
 * The other tests check that rows survive. None of them checks that the figure a hero reads
 * (their XP, their level, the flame, the records, the village, the boss pool, the achievements)
 * is still the figure it was. A change to the XP formula, a migration that recomputes a column, a
 * streak rule that counts a day differently: all keep every row and move every number.
 *
 * Any difference fails this test and prints each figure that moved as `path: before -> after`.
 * If the change is intended, regenerate with `UPDATE_GOLDEN=1 npx jest golden-hero`, and say in
 * the PR which figures moved and why: a reviewer reads that list, not the JSON.
 *
 * The clock is pinned (GOLDEN_NOW, noon UTC) and the seed ends there: SQLite's own `'now'` is
 * invisible to fake timers, which is why `seedHistory` takes the end of the history as a parameter.
 */
const GOLDEN_FILE = path.join(__dirname, "golden", "hero-3-years.json");

/** A three-year hero on the full schema, measured through the app's own read paths. */
async function threeYearHero(): Promise<{
  rules: ReturnType<typeof measureRules>;
  hero: HeroNumbers;
}> {
  const t = createTestDb();
  try {
    jest.resetModules();
    jest.doMock("../db/client", () => clientMock(t));
    pinClock();

    const { seedHistory } =
      require("../db/devSeedHistory") as typeof import("../db/devSeedHistory");
    await seedHistory(3, Math.floor(GOLDEN_NOW / 1000));

    // The seed unlocks nothing and the achievement list reads what is unlocked, so a hero who
    // has trained for three years is run through the same check a finished session runs.
    const { checkForNewAchievements } =
      require("../db/achievements") as typeof import("../db/achievements");
    await checkForNewAchievements({
      durationSeconds: 1200,
      xpEarned: 80,
      performedAt: new Date(GOLDEN_NOW),
      questId: null,
      outing: null,
    });

    return JSON.parse(JSON.stringify({ rules: measureRules(), hero: await measureHero() }));
  } finally {
    jest.useRealTimers();
    t.close();
  }
}

describe("the golden hero", () => {
  test("every displayed figure is what it was", async () => {
    const now = await threeYearHero();

    if (process.env.UPDATE_GOLDEN === "1") {
      fs.mkdirSync(path.dirname(GOLDEN_FILE), { recursive: true });
      fs.writeFileSync(GOLDEN_FILE, `${JSON.stringify(now, null, 2)}\n`);
    }

    const frozen = JSON.parse(fs.readFileSync(GOLDEN_FILE, "utf8"));
    // Printed as the message, not as a diff of two 400-line objects.
    expect(figuresThatMoved(frozen, now)).toEqual([]);
  });

  test("measuring twice gives the same hero, so a moved figure is never noise", async () => {
    expect(await threeYearHero()).toEqual(await threeYearHero());
  });

  test("the differ names what moved", () => {
    expect(
      figuresThatMoved({ level: { level: 34 }, xs: [1, 2] }, { level: { level: 35 }, xs: [1] }),
    ).toEqual(["level.level: 34 -> 35", "xs[1]: 2 -> undefined"]);
    expect(figuresThatMoved({ a: 1 }, { a: 1 })).toEqual([]);
  });
});
