/**
 * Pins the bulk reader the gallery uses to price its cards with the hero's saved config
 * instead of the pristine template (2026-08 UX audit: "≈ 12 min / +138 XP" in the gallery vs
 * "≈ 10 min / +119 XP" on the same quest's detail sheet). `getAllQuestConfigs` is pure
 * key-parsing over `getAllPreferences` — this tests that seam directly.
 *
 * `@/db/client` is stubbed so `@/db/questConfig`'s transitive imports (`./quests`,
 * `./exercises`, `./preferences`) load for real without hitting expo-sqlite, the way
 * `__tests__/streak-single-source.test.ts` and `__tests__/home-smart-action.test.ts` stub their
 * own db seams instead of mocking the module under test.
 */
jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));

const mockGetAllPreferences = jest.fn();
jest.mock("@/db/preferences", () => ({
  ...jest.requireActual("@/db/preferences"),
  getAllPreferences: () => mockGetAllPreferences(),
}));

import { getAllQuestConfigs } from "@/db/questConfig";

describe("getAllQuestConfigs", () => {
  beforeEach(() => {
    mockGetAllPreferences.mockReset();
  });

  it("collects quest:{id}:config keys and ignores everything else", async () => {
    mockGetAllPreferences.mockResolvedValue({
      "quest:7:config": JSON.stringify({ level: "hard", roundRestSeconds: 10 }),
      "quest:9:config": "not json{{",
      streak_current: "2",
    });
    const configs = await getAllQuestConfigs();
    expect(configs.get(7)?.level).toBe("hard");
    expect(configs.get(7)?.roundRestSeconds).toBe(10);
    expect(configs.has(9)).toBe(false); // corrupt config → run as written, same as parseQuestConfig
    expect(configs.size).toBe(1);
  });
});
