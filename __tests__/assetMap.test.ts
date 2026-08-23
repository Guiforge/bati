import {
  ADVENTURE_ASSETS,
  EXERCISE_ASSETS,
  getAdventureAsset,
  getExerciseAsset,
  getQuestAsset,
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

  // getQuestAsset/getBossAsset/getAdventureAsset used to do an exact-key lookup instead of
  // stripping the directory + extension, so a real DB imagePath (full bundled path) always
  // missed and fell back to the placeholder.
  test("resolves quest cover assets from full database image paths", () => {
    expect(getQuestAsset("assets/images/quests/escape_collapsing_mine.jpg")).toBe(
      QUEST_ASSETS.escape_collapsing_mine,
    );
  });

  test("resolves adventure cover assets from full database image paths", () => {
    expect(getAdventureAsset("assets/images/adventures/scout_trial.jpg")).toBe(
      ADVENTURE_ASSETS.scout_trial,
    );
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
