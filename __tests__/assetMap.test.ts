import assert from "node:assert/strict";

import {
  ADVENTURE_ASSETS,
  BOSS_ASSETS,
  EXERCISE_ASSETS,
  getAdventureAsset,
  getBossAsset,
  getBossKey,
  getExerciseAsset,
  getExerciseThumb,
  getQuestAsset,
  getQuestThumb,
  getVillagerAsset,
  QUEST_ASSETS,
} from "@/constants/assetMap";
import { VILLAGER_IDS, VILLAGER_POSES } from "@/constants/villagers";

describe("assetMap", () => {
  // The seeds still store `.png` paths for the exercises whose art is now `.jpg` (0001/0010 were
  // never rewritten), so stripping the extension is load-bearing, not cosmetic.
  test("resolves exercise assets from database image paths", () => {
    expect(getExerciseAsset("assets/images/exercises/squat.png")).toBe(EXERCISE_ASSETS.squat);
  });

  test("resolves the renamed 0023 exercises from their seeded path", () => {
    expect(getExerciseAsset("assets/images/exercises/hollow_body_hold.jpg")).toBe(
      EXERCISE_ASSETS.hollow_body_hold,
    );
  });

  // A hero-authored movement carries its picture in the row: either a bundled illustration it
  // picked, or a `data:` URI of a photo. Only the detail screen knew how to render a URI, so the
  // warm-up, the session hero and the paused overlay all showed the placeholder for it.
  test("a URI or data URI resolves to itself, not the placeholder", () => {
    const dataUri = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
    expect(getExerciseAsset(dataUri)).toEqual({ uri: dataUri });
    expect(getExerciseThumb(dataUri)).toEqual({ uri: dataUri });

    expect(getExerciseAsset("file:///data/user/0/x.jpg")).toEqual({
      uri: "file:///data/user/0/x.jpg",
    });
    expect(getExerciseAsset("https://example.test/x.jpg")).toEqual({
      uri: "https://example.test/x.jpg",
    });
  });

  test("a bundled path still resolves to the bundled asset", () => {
    expect(getExerciseThumb("assets/images/exercises/squat.png")).toBeDefined();
    expect(getExerciseAsset("assets/images/exercises/squat.png")).toBe(EXERCISE_ASSETS.squat);
  });

  // getQuestAsset/getBossAsset/getAdventureAsset used to do an exact-key lookup instead of
  // stripping the directory + extension, so a real DB imagePath (full bundled path) always
  // missed and fell back to the placeholder.
  test("resolves quest cover assets from full database image paths", () => {
    expect(getQuestAsset("assets/images/quests/escape_collapsing_mine.jpg")).toBe(
      QUEST_ASSETS.escape_collapsing_mine,
    );
  });

  test("a hero's quest cover resolves too, key or photo", () => {
    const dataUri = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
    expect(getQuestAsset(dataUri)).toEqual({ uri: dataUri });
    expect(getQuestAsset("escape_collapsing_mine")).toBe(QUEST_ASSETS.escape_collapsing_mine);
  });

  test("resolves adventure cover assets from full database image paths", () => {
    expect(getAdventureAsset("assets/images/adventures/scout_trial.jpg")).toBe(
      ADVENTURE_ASSETS.scout_trial,
    );
  });
});

// A quest file from someone else's phone names its art, and a plain `MAP[key]` answered
// "constructor" with a function and "__proto__" with `Object.prototype`, which expo-image would
// then hand to native as a source. Every getter must answer only with the map's own entries.
describe("a name the maps inherit is no asset", () => {
  const PLACEHOLDER = getExerciseAsset("no_such_art_anywhere");
  const INHERITED = [
    "constructor",
    "toString",
    "__proto__",
    "hasOwnProperty",
    "valueOf.webp",
    "assets/__proto__.jpg",
    "assets/images/quests/constructor.png",
  ];

  test("the placeholder is a real asset, not one of the inherited values", () => {
    expect(PLACEHOLDER).toBeDefined();
    expect(typeof PLACEHOLDER).not.toBe("function");
    expect(PLACEHOLDER).not.toBe(Object.prototype);
    expect(PLACEHOLDER).not.toBe(EXERCISE_ASSETS.squat);
  });

  test.each(INHERITED)("%s falls back to the placeholder, or to nothing", (name) => {
    expect(getExerciseAsset(name)).toBe(PLACEHOLDER);
    expect(getExerciseThumb(name)).toBe(PLACEHOLDER);
    expect(getQuestAsset(name)).toBe(PLACEHOLDER);
    expect(getAdventureAsset(name)).toBe(PLACEHOLDER);
    expect(getBossAsset(name)).toBe(PLACEHOLDER);
    // Every chain of the boss lookup: defeated, legendary and wounded each read their own map.
    expect(getBossAsset(name, 1)).toBe(PLACEHOLDER);
    expect(getBossAsset(name, 0, "wounded")).toBe(PLACEHOLDER);
    expect(getBossAsset(name, 1, "defeated")).toBe(PLACEHOLDER);
    expect(getQuestThumb(name)).toBeNull();
    expect(getBossKey(name)).toBeNull();
  });

  // The guard must not cost a real name its art.
  test("a real boss still resolves through every chain", () => {
    const [key] = Object.keys(BOSS_ASSETS);
    assert(key);
    expect(getBossKey(`assets/images/bosses/${key}.jpg`)).toBe(key);
    expect(getBossAsset(key)).toBe(BOSS_ASSETS[key as keyof typeof BOSS_ASSETS]);
    expect(getBossAsset(key, 0, "wounded")).not.toBe(PLACEHOLDER);
    expect(getBossAsset(key, 1, "defeated")).not.toBe(PLACEHOLDER);
  });
});

describe("villager assets", () => {
  test("every villager has art for every pose, and no two are the same file", () => {
    const seen = new Set<number>();
    for (const id of VILLAGER_IDS) {
      for (const pose of VILLAGER_POSES) {
        const asset = getVillagerAsset(id, pose);
        expect(asset).toBeDefined();
        // A copy-paste in the 35-entry grid shows up as one villager wearing another's pose,
        // which is invisible until someone spots the smith saluting in the herbalist's coif.
        expect(seen.has(asset)).toBe(false);
        seen.add(asset);
      }
    }
    expect(seen.size).toBe(VILLAGER_IDS.length * VILLAGER_POSES.length);
  });
});
