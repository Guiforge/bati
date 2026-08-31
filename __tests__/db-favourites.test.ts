import { clientMock, createTestDb } from "./helpers/testDb";

/**
 * Pinned quests, which is one preference row and therefore one place to get wrong.
 *
 * The value is untrusted text out of SQLite, exactly like `parseQuestConfig`, and the failure
 * that matters is a corrupt one taking the gallery down with it rather than costing the hero
 * their pins.
 */
describe("favourite quests", () => {
  const t = createTestDb();

  beforeAll(() => {
    jest.resetModules();
    jest.doMock("../db/client", () => clientMock(t));
  });

  afterAll(() => t.close());

  beforeEach(() => {
    t.sqlite.exec("DELETE FROM user_preferences WHERE key = 'favourite_quests'");
  });

  const fav = () => require("../db/favourites") as typeof import("../db/favourites");
  const raw = () =>
    (
      t.sqlite.prepare("SELECT value FROM user_preferences WHERE key = 'favourite_quests'").get() as
        | { value: string }
        | undefined
    )?.value ?? null;

  test("nothing is pinned to begin with", async () => {
    expect(await fav().getFavouriteQuestIds()).toEqual(new Set());
  });

  test("a toggle pins, and a second one unpins", async () => {
    const f = fav();

    expect(await f.toggleFavouriteQuest(7)).toEqual(new Set([7]));
    expect(await f.getFavouriteQuestIds()).toEqual(new Set([7]));

    expect(await f.toggleFavouriteQuest(7)).toEqual(new Set());
    expect(await f.getFavouriteQuestIds()).toEqual(new Set());
  });

  test("pins accumulate rather than replacing each other", async () => {
    const f = fav();
    await f.toggleFavouriteQuest(1);
    await f.toggleFavouriteQuest(2);
    await f.toggleFavouriteQuest(3);
    await f.toggleFavouriteQuest(2);

    expect(await f.getFavouriteQuestIds()).toEqual(new Set([1, 3]));
  });

  /**
   * The one thing this must never do is throw. A gallery that cannot render because a preference
   * row holds nonsense is a worse outcome than a hero losing three pins, and every other reader
   * of `user_preferences` in this repo takes the same view.
   */
  test.each([
    ["not JSON at all", "{oh no"],
    ["JSON, but not a list", '{"7":true}'],
    ["a list of things that are not ids", '["7", null, -1, 2.5, 0]'],
  ])("survives a stored value that is %s", async (_why, stored) => {
    t.sqlite
      .prepare("INSERT INTO user_preferences (key, value) VALUES ('favourite_quests', ?)")
      .run(stored);

    expect(await fav().getFavouriteQuestIds()).toEqual(new Set());
  });

  test("a corrupt value is replaced by the next toggle rather than appended to", async () => {
    t.sqlite
      .prepare("INSERT INTO user_preferences (key, value) VALUES ('favourite_quests', ?)")
      .run("{oh no");

    expect(await fav().toggleFavouriteQuest(4)).toEqual(new Set([4]));
    expect(raw()).toBe("[4]");
  });
});
