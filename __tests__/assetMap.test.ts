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
  getStepArt,
  getVillagerAsset,
  QUEST_ASSETS,
} from "@/constants/assetMap";
import { VILLAGER_IDS, VILLAGER_POSES } from "@/constants/villagers";
import { JOURNAL_PHOTO_SIDE } from "@/db/sessionPhotos";
import { MAX_RENDER_SIDE } from "@/src/carriedImage";
import { AVATAR_SIZE } from "@/src/customAvatar";
import { MAX_PHOTO_WIDTH } from "@/src/exercisePhoto";
import { pngDataUri } from "./helpers/pngDataUri";

// Only the constants are read from db/sessionPhotos; its database is not opened.
jest.mock("@/db/client", () => ({ db: {}, schema: {} }));

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
    const dataUri = pngDataUri(64, 64);
    expect(getExerciseAsset(dataUri)).toEqual({ uri: dataUri });
    expect(getExerciseThumb(dataUri)).toEqual({ uri: dataUri });

    // A file or a URL is no picture the row can carry: see "carried pictures only".
    const placeholder = require("@/assets/placeholder.webp");
    expect(getExerciseAsset("file:///data/user/0/x.jpg")).toBe(placeholder);
    expect(getExerciseAsset("https://example.test/x.jpg")).toBe(placeholder);
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
    const dataUri = pngDataUri(64, 64);
    expect(getQuestAsset(dataUri)).toEqual({ uri: dataUri });
    expect(getQuestAsset("escape_collapsing_mine")).toBe(QUEST_ASSETS.escape_collapsing_mine);
  });

  test("resolves adventure cover assets from full database image paths", () => {
    expect(getAdventureAsset("assets/images/adventures/scout_trial.jpg")).toBe(
      ADVENTURE_ASSETS.scout_trial,
    );
  });

  test("a step without art of its own shows its quest's cover, and none when the quest has none", () => {
    const photo = pngDataUri(64, 64);
    // Its own art wins.
    expect(getStepArt("assets/images/adventures/scout_trial.jpg", photo)).toBe(
      getQuestAsset("assets/images/adventures/scout_trial.jpg"),
    );
    // A hero's quest with a photo cover: the step shows it.
    expect(getStepArt(null, photo)).toEqual({ uri: photo });
    // A quest with no cover of its own is nothing to draw, not a grey square.
    expect(getStepArt(null, "assets/placeholder.jpg")).toBeNull();
    expect(getStepArt(null, null)).toBeNull();
  });

  test("an adventure cover can be the hero's own photo, as a quest's can", () => {
    const dataUri = pngDataUri(64, 64);
    expect(getAdventureAsset(dataUri)).toEqual({ uri: dataUri });
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

describe("getBossAsset with a hero boss's own pictures", () => {
  const FRESH = pngDataUri(11, 11);
  const WOUNDED = pngDataUri(12, 12);
  const DEFEATED = pngDataUri(13, 13);
  const LEGEND = pngDataUri(14, 14);
  const key = "stone_golem";
  const all = { fresh: FRESH, wounded: WOUNDED, defeated: DEFEATED, legendary: LEGEND };

  test("each form wears its own picture, in the painted chain's order", () => {
    expect(getBossAsset(key, 0, undefined, all)).toEqual({ uri: FRESH });
    expect(getBossAsset(key, 0, "wounded", all)).toEqual({ uri: WOUNDED });
    expect(getBossAsset(key, 0, "defeated", all)).toEqual({ uri: DEFEATED });
    expect(getBossAsset(key, 1, undefined, all)).toEqual({ uri: LEGEND });
    // Defeated wins over legendary, as for the painted ones.
    expect(getBossAsset(key, 1, "defeated", all)).toEqual({ uri: DEFEATED });
  });

  test("a form without a picture of its own wears the normal one", () => {
    const art = { fresh: FRESH };
    expect(getBossAsset(key, 0, "wounded", art)).toEqual({ uri: FRESH });
    expect(getBossAsset(key, 0, "defeated", art)).toEqual({ uri: FRESH });
    expect(getBossAsset(key, 2, undefined, art)).toEqual({ uri: FRESH });
  });

  test("with no normal picture, a form without one is the painted monster's, and none changes a painted boss", () => {
    const art = { defeated: DEFEATED };
    expect(getBossAsset(key, 0, "defeated", art)).toEqual({ uri: DEFEATED });
    expect(getBossAsset(key, 0, undefined, art)).toBe(getBossAsset(key));
    expect(getBossAsset(key, 0, "wounded", art)).toBe(getBossAsset(key, 0, "wounded"));
    expect(getBossAsset(key, 1, undefined, {})).toBe(getBossAsset(key, 1));
  });
});

describe("carried pictures only", () => {
  const placeholder = require("@/assets/placeholder.webp");
  const hostile = [
    "https://attacker.example/p.png",
    "file:///data/user/0/x/bati.v3.db",
    "content://x/y",
    "data:text/html;base64,AAAA",
  ];

  test.each(hostile)("%s is the placeholder at every sink", (value) => {
    expect(getExerciseThumb(value)).toBe(placeholder);
    expect(getExerciseAsset(value)).toBe(placeholder);
    expect(getQuestAsset(value)).toBe(placeholder);
    expect(getAdventureAsset(value)).toBe(placeholder);
    expect(getQuestThumb(value)).toBeNull();
  });

  test("a real small picture passes", () => {
    expect(getExerciseThumb(pngDataUri(64, 64))).toEqual({ uri: pngDataUri(64, 64) });
  });

  test("a JPEG whose SOF sits after an 8 KB ICC profile still passes", () => {
    const icc = new Uint8Array(2 + 8192).fill(0);
    icc.set([0xff, 0xe2, 0x20, 0x00]); // APP2, length 0x2000 counts itself, so the segment is 8194 bytes
    const sof = [0xff, 0xc0, 0, 17, 8, 0, 64, 0, 64, 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1];
    const bytes = Buffer.concat([Buffer.from([0xff, 0xd8]), icc, Buffer.from(sof)]);
    const uri = `data:image/jpeg;base64,${bytes.toString("base64")}`;
    expect(getExerciseThumb(uri)).toEqual({ uri });
  });

  test("a boss form that is a URL is the painted monster", () => {
    expect(getBossAsset("stone_golem", 0, undefined, { fresh: hostile[0] })).toBe(
      getBossAsset("stone_golem", 0),
    );
  });

  test("a header claiming 16000 px is refused, and a zero side too", () => {
    expect(getExerciseThumb(pngDataUri(16000, 16000))).toBe(placeholder);
    expect(getExerciseThumb(pngDataUri(0, 64))).toBe(placeholder);
  });

  test("the render limit leaves room for every size the app writes", () => {
    expect(MAX_RENDER_SIDE).toBeGreaterThanOrEqual(JOURNAL_PHOTO_SIDE);
    expect(MAX_RENDER_SIDE).toBeGreaterThanOrEqual(AVATAR_SIZE);
    expect(MAX_RENDER_SIDE).toBeGreaterThanOrEqual(MAX_PHOTO_WIDTH);
  });
});
